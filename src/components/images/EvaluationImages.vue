<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, shallowRef, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useToast } from "primevue/usetoast";
import ImageCard from "./ImageCard.vue";
import { imagesService } from "../../services/images.service";
import { evaluationsService } from "../../services/evaluations.service";
import { angles, editable } from "../../utils/format";
import { createSerialQueue } from "../../utils/serialQueue";
import { errorMessage, isConflict } from "../../utils/errors";
import { verifiedImageCount } from "../../utils/captureCoverage";
import type { CaptureAngle, Evaluation } from "../../types/api";
const model = defineModel<Evaluation>({ required: true });
// Model emits are applied by the parent on the next render. Keep the latest server response
// synchronously here so queued mutations never read the preceding version or image list.
const evaluation = shallowRef(model.value);
watch(model, (value) => {
  evaluation.value = value;
});
watch(
  evaluation,
  (value) => {
    model.value = value;
  },
  { flush: "sync" },
);
defineProps<{ disabled: boolean }>();
const emit = defineEmits<{ busy: [value: boolean] }>();
const toast = useToast();
const queue = createSerialQueue();
const jobs = reactive(
  Object.fromEntries(
    angles.map((a) => [
      a.value,
      { busy: false, phase: "", progress: 0, error: "" },
    ]),
  ) as Record<
    CaptureAngle,
    { busy: boolean; phase: string; progress: number; error: string }
  >,
);
const attempts = new Map<
  CaptureAngle,
  { imageIdentifier: string; attemptId: string; file: File }
>();
const controllers = new Set<AbortController>();
const active = computed(() => Object.values(jobs).some((j) => j.busy));
// The API accepts exactly two photographs: rear and one lateral side. New captures use the
// right side; an evaluation that already has a left-side photo keeps it in that slot.
const requestedAngles = computed(() => {
  const images = evaluation.value.images;
  const lateral: CaptureAngle =
    images.some((i) => i.angle === "LeftLateral") &&
    !images.some((i) => i.angle === "RightLateral")
      ? "LeftLateral"
      : "RightLateral";
  return angles.filter((a) => a.value === lateral || a.value === "Rear");
});
// Earlier captures may still hold a top-back or a second lateral photo; list them so they can be removed.
const extraAngles = computed(() =>
  angles.filter(
    (a) =>
      !requestedAngles.value.some((r) => r.value === a.value) &&
      evaluation.value.images.some((i) => i.angle === a.value),
  ),
);
const photoSummary = computed(() => `${verifiedImageCount(evaluation.value.images.filter(image => requestedAngles.value.some(angle => angle.value === image.angle)))} de 2 cargadas`);
let disposed = false;
watch(active, (value) => emit("busy", value));
async function mutate<T>(fn: () => Promise<T>) {
  return queue(async () => {
    if (disposed)
      throw new Error("La carga se canceló al salir de la evaluación.");
    try {
      return await fn();
    } catch (error) {
      // Recover the current version for subsequent independent jobs, without replaying edits.
      if (isConflict(error)) {
        try {
          evaluation.value = await evaluationsService.get(evaluation.value.id);
        } catch {
          /* Preserve original error. */
        }
      }
      throw error;
    }
  });
}
async function upload(angle: CaptureAngle, file: File) {
  const job = jobs[angle];
  if (job.busy) return;
  job.busy = true;
  job.error = "";
  job.progress = 0;
  job.phase = "Preparando fotografía…";
  const controller = new AbortController();
  controllers.add(controller);
  try {
    let attempt = attempts.get(angle);
    if (
      !attempt ||
      attempt.file !== file ||
      !evaluation.value.images.some(
        (i) => i.imageIdentifier === attempt?.imageIdentifier,
      )
    ) {
      const prepared = await mutate(async () => {
        let image = evaluation.value.images.find((i) => i.angle === angle);
        if (!image) {
          evaluation.value = await imagesService.register(
            evaluation.value.id,
            evaluation.value.version,
            angle,
          );
          image = evaluation.value.images.find((i) => i.angle === angle);
        }
        if (!image)
          throw new Error(
            "No se pudo registrar la fotografía. Recarga e inténtalo de nuevo.",
          );
        const ticket = await imagesService.requestUpload(
          evaluation.value.id,
          image.imageIdentifier,
          file,
        );
        // upload-url touches the aggregate but returns only a ticket; GET retrieves its new version.
        evaluation.value = await evaluationsService.get(evaluation.value.id);
        return { imageIdentifier: image.imageIdentifier, ticket };
      });
      job.phase = "Subiendo fotografía…";
      await imagesService.upload(
        prepared.ticket,
        file,
        (value) => {
          job.progress = value;
        },
        controller.signal,
      );
      attempt = {
        imageIdentifier: prepared.imageIdentifier,
        attemptId: prepared.ticket.attemptId,
        file,
      };
      attempts.set(angle, attempt);
    }
    job.phase = "Verificando fotografía…";
    const pending = attempt;
    await mutate(async () => {
      evaluation.value = await imagesService.confirm(
        evaluation.value.id,
        pending.imageIdentifier,
        pending.attemptId,
      );
    });
    attempts.delete(angle);
    toast.add({
      severity: "success",
      summary: "Fotografía cargada",
      detail: angles.find((a) => a.value === angle)?.label,
      life: 3000,
    });
  } catch (error) {
    if (!disposed) job.error = await errorMessage(error);
  } finally {
    job.busy = false;
    controllers.delete(controller);
  }
}
async function remove(angle: CaptureAngle) {
  const job = jobs[angle];
  job.busy = true;
  job.error = "";
  job.phase = "Retirando fotografía…";
  try {
    await mutate(async () => {
      const image = evaluation.value.images.find((i) => i.angle === angle);
      if (image)
        evaluation.value = await imagesService.remove(
          evaluation.value.id,
          image.imageIdentifier,
          evaluation.value.version,
        );
    });
    attempts.delete(angle);
  } catch (error) {
    job.error = await errorMessage(error);
  } finally {
    job.busy = false;
  }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (active.value) {
    event.preventDefault();
    event.returnValue = "";
  }
}
window.addEventListener("beforeunload", beforeUnload);
onBeforeRouteLeave(
  (to) =>
    to.name === "login" ||
    !active.value ||
    window.confirm(
      "Hay fotografías en proceso. Si sales, las cargas se interrumpirán. ¿Quieres salir?",
    ),
);
onBeforeUnmount(() => {
  disposed = true;
  controllers.forEach((controller) => controller.abort());
  window.removeEventListener("beforeunload", beforeUnload);
});
</script>
<template>
  <section class="photos-section">
    <div class="page-header compact">
      <div>
        <h2>Registro fotográfico</h2>
        <p class="muted">
          Carga las vistas {{ requestedAngles[0]?.value === "LeftLateral" ? "lateral izquierda" : "lateral derecha" }} y posterior. JPEG o PNG · Hasta 15 MiB y
          40 megapíxeles por imagen.
        </p>
      </div>
      <span class="count-badge">{{ photoSummary }}</span>
    </div>
    <div v-if="!editable(evaluation.status)" class="evaluation-notice" role="note">
      <i class="pi pi-info-circle" aria-hidden="true" />
      <p>Las fotografías de esta evaluación están disponibles para consulta.</p>
    </div>
    <div class="image-grid">
      <ImageCard
        v-for="(angle, index) in requestedAngles"
        :key="angle.value"
        :position="index + 1"
        :evaluation-id="evaluation.id"
        :angle="angle.value"
        :image="evaluation.images.find((i) => i.angle === angle.value)"
        :locked="!editable(evaluation.status)"
        :disabled="disabled"
        :busy="jobs[angle.value].busy"
        :progress="jobs[angle.value].progress"
        :phase="jobs[angle.value].phase"
        :error="jobs[angle.value].error"
        @upload="(file) => upload(angle.value, file)"
        @remove="remove(angle.value)"
      />
    </div>
    <template v-if="extraAngles.length">
      <div class="evaluation-notice" role="note">
        <i class="pi pi-info-circle" aria-hidden="true" />
        <p>
          Estas fotografías ya no se usan: la evaluación solo admite la vista
          posterior y un lateral. Retíralas para poder completarla.
        </p>
      </div>
      <div class="image-grid">
        <ImageCard
          v-for="(angle, index) in extraAngles"
          :key="angle.value"
          :position="requestedAngles.length + index + 1"
          :evaluation-id="evaluation.id"
          :angle="angle.value"
          :image="evaluation.images.find((i) => i.angle === angle.value)"
          :locked="!editable(evaluation.status)"
          :disabled="disabled"
          :busy="jobs[angle.value].busy"
          :progress="jobs[angle.value].progress"
          :phase="jobs[angle.value].phase"
          :error="jobs[angle.value].error"
          @upload="(file) => upload(angle.value, file)"
          @remove="remove(angle.value)"
        />
      </div>
    </template>
  </section>
</template>
