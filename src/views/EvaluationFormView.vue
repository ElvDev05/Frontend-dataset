<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import SpecialistSelect from "../components/evaluations/SpecialistSelect.vue";
import EvaluationPhotoPicker from "../components/images/EvaluationPhotoPicker.vue";
import { evaluationsService } from "../services/evaluations.service";
import { bovinesService } from "../services/bovines.service";
import { imagesService } from "../services/images.service";
import { editable, formatSex, utcToday } from "../utils/format";
import { errorMessage, isConflict } from "../utils/errors";
import { validScore } from "../utils/scoring";
import type { Bovine, CaptureAngle, Evaluation, EvaluationInput } from "../types/api";
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = Number(route.params.id);
const bovine = ref<Bovine>();
const version = ref("");
const locked = ref(false);
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);
const error = ref("");
const conflict = ref(false);
const phase = ref("");
const navigating = ref(false);
const created = ref<Evaluation>();
const photos = reactive<{ RightLateral: File | null; Rear: File | null }>({ RightLateral: null, Rear: null });
const validating = reactive<{ RightLateral: boolean; Rear: boolean }>({ RightLateral: false, Rear: false });
const photoAngles = ["RightLateral", "Rear"] as const;
const scoreOptions = Array.from({ length: 17 }, (_, index) => 1 + index * .25);
const attempts = new Map<CaptureAngle, { imageIdentifier: string; attemptId: string; file: File }>();
let savedMetadata = "";
const form = reactive<EvaluationInput>({
  evaluationDate: utcToday(),
  weightKg: null,
  bodyConditionScore: null,
  specialistId: null,
  notes: "",
});
const scorePhotosMissing = computed(() => !id && form.bodyConditionScore != null && (!photos.RightLateral || !photos.Rear));
async function load() {
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  try {
    if (id) {
      const e = await evaluationsService.get(id);
      form.evaluationDate = e.evaluationDate;
      form.weightKg = e.weightKg;
      form.bodyConditionScore = e.bodyConditionScore;
      form.specialistId = e.specialistId;
      form.notes = e.notes;
      version.value = e.version;
      locked.value = !editable(e.status);
      bovine.value = await bovinesService.get(e.bovineId);
    } else
      bovine.value = await bovinesService.get(Number(route.params.bovineId));
  } catch (e) {
    loadError.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (!bovine.value || locked.value || conflict.value || saving.value || validating.RightLateral || validating.Rear) return;
  if (scorePhotosMissing.value) return;
  if (form.bodyConditionScore != null && !validScore(form.bodyConditionScore)) return;
  saving.value = true;
  error.value = "";
  const payload = { ...form, notes: form.notes?.trim() || null };
  try {
    let e: Evaluation;
    if (id) {
      e = await evaluationsService.update(id, { ...payload, version: version.value });
    } else {
      const metadata = { ...payload, bodyConditionScore: null };
      const metadataKey = JSON.stringify(metadata);
      if (!created.value) {
        phase.value = "Guardando datos de la evaluación…";
        created.value = await evaluationsService.create(bovine.value.id, metadata);
        savedMetadata = metadataKey;
      } else if (metadataKey !== savedMetadata) {
        phase.value = "Actualizando datos de la evaluación…";
        created.value = await evaluationsService.update(created.value.id, { ...metadata, version: created.value.version });
        savedMetadata = metadataKey;
      }
      for (const angle of photoAngles) {
        const file = photos[angle];
        if (!file || created.value.images.some(image => image.angle === angle && image.uploadStatus === "Verified")) continue;
        let attempt = attempts.get(angle);
        if (!attempt || attempt.file !== file || !created.value.images.some(image => image.imageIdentifier === attempt?.imageIdentifier)) {
          let image = created.value.images.find(image => image.angle === angle);
          if (!image) {
            phase.value = `Preparando ${angle === "RightLateral" ? "lateral derecha" : "posterior"}…`;
            created.value = await imagesService.register(created.value.id, created.value.version, angle);
            image = created.value.images.find(item => item.angle === angle);
          }
          if (!image) throw new Error("No se pudo registrar la fotografía. Reintenta el guardado.");
          const ticket = await imagesService.requestUpload(created.value.id, image.imageIdentifier, file);
          created.value = await evaluationsService.get(created.value.id);
          phase.value = `Subiendo ${angle === "RightLateral" ? "lateral derecha" : "posterior"}…`;
          await imagesService.upload(ticket, file, progress => { phase.value = `Subiendo ${angle === "RightLateral" ? "lateral derecha" : "posterior"} · ${progress}%`; });
          attempt = { imageIdentifier: image.imageIdentifier, attemptId: ticket.attemptId, file };
          attempts.set(angle, attempt);
        }
        phase.value = "Verificando fotografía…";
        created.value = await imagesService.confirm(created.value.id, attempt.imageIdentifier, attempt.attemptId);
        attempts.delete(angle);
      }
      if (payload.bodyConditionScore !== created.value.bodyConditionScore) {
        phase.value = "Guardando condición corporal…";
        created.value = await evaluationsService.update(created.value.id, { ...payload, version: created.value.version });
      }
      e = created.value;
    }
    toast.add({
      severity: "success",
      summary: "Evaluación guardada",
      detail: "Los datos y las fotografías seleccionadas quedaron guardados.",
      life: 3500,
    });
    navigating.value = true;
    await router.push(`/evaluaciones/${e.id}`);
  } catch (e) {
    error.value = await errorMessage(e);
    if (isConflict(e) && created.value) {
      try { created.value = await evaluationsService.get(created.value.id); }
      catch { conflict.value = true; }
    } else conflict.value = isConflict(e);
  } finally {
    saving.value = false;
    phase.value = "";
  }
}
function beforeUnload(event: BeforeUnloadEvent) { if (saving.value) { event.preventDefault(); event.returnValue = ""; } }
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(to => to.name === 'login' || navigating.value || !saving.value || window.confirm('La evaluación se está guardando. ¿Quieres salir?'));
onMounted(load);
</script>
<template>
  <RouterLink
    :to="id ? `/evaluaciones/${id}` : created ? `/evaluaciones/${created.id}` : `/bovinos/${route.params.bovineId}`"
    class="back-link"
    ><i class="pi pi-arrow-left" /> Volver al detalle</RouterLink
  ><PageHeader
    :title="id ? 'Editar evaluación' : 'Nueva evaluación'"
    :description="
      bovine
        ? `Bovino ${bovine.identificationCode} · ${formatSex(bovine.sex)}`
        : 'Registra las mediciones de esta visita.'
    "
  /><LoadState :loading="loading" :error="loadError" @retry="load"
    ><form class="panel form-panel" @submit.prevent="save">
      <Message v-if="locked" severity="warn"
        >Esta evaluación está bloqueada. Un administrador debe rechazarla y
        reabrirla para permitir cambios.</Message
      ><Message v-if="error" severity="error"
        >{{ error
        }} <RouterLink v-if="created" :to="`/evaluaciones/${created.id}`">Abrir evaluación creada</RouterLink><Button
          v-if="conflict"
          label="Descartar cambios y recargar"
          text
          severity="danger"
          @click="load" /></Message
      ><p v-if="saving && phase" class="evaluation-save-progress" role="status"><i class="pi pi-spin pi-spinner" aria-hidden="true" /> {{ phase }}</p>
      <fieldset :disabled="saving || locked || conflict">
        <h2>Datos de la evaluación</h2>
        <div class="form-grid">
          <div class="field">
            <label for="evaluation-date">Fecha de evaluación *</label
            ><InputText
              id="evaluation-date"
              v-model="form.evaluationDate"
              type="date"
              required
              :max="utcToday()"
              fluid
            />
          </div>
          <div class="field">
            <label for="weight">Peso (kg)</label
            ><InputNumber
              v-model="form.weightKg"
              input-id="weight"
              locale="es-PE"
              :min="0.01"
              :max="99999.99"
              :max-fraction-digits="2"
              :disabled="saving || locked || conflict"
              fluid
              placeholder="Ej. 420,50"
            />
          </div>
          <div class="field">
            <label for="evaluation-specialist">Especialista</label
            ><SpecialistSelect
              v-model="form.specialistId"
              input-id="evaluation-specialist"
              :disabled="saving || locked || conflict"
            />
          </div>
        </div>
        <hr />
        <div class="field">
          <label for="evaluation-notes"
            >Notas <span class="optional">Opcional</span></label
          ><Textarea
            id="evaluation-notes"
            v-model="form.notes"
            rows="4"
            :maxlength="4000"
            auto-resize
            fluid
            placeholder="Observaciones de esta evaluación…"
          />
        </div>
        <template v-if="!id">
          <section class="evaluation-form-section" aria-labelledby="new-photos-title">
            <h2 id="new-photos-title">Fotografías <span class="optional">JPEG o PNG · Hasta 15 MiB cada una</span></h2>
            <p class="muted">Selecciona la vista lateral derecha y la posterior. Puedes ampliar cada fotografía antes de guardar.</p>
            <div class="draft-photo-grid">
              <EvaluationPhotoPicker v-model="photos.RightLateral" angle="RightLateral" :position="1" :disabled="saving || locked || conflict" :uploaded="!!created?.images.some(image => image.angle === 'RightLateral' && image.uploadStatus === 'Verified')" @validating="validating.RightLateral = $event" />
              <EvaluationPhotoPicker v-model="photos.Rear" angle="Rear" :position="2" :disabled="saving || locked || conflict" :uploaded="!!created?.images.some(image => image.angle === 'Rear' && image.uploadStatus === 'Verified')" @validating="validating.Rear = $event" />
            </div>
          </section>
          <section class="evaluation-form-section" aria-labelledby="new-score-title">
            <h2 id="new-score-title">Condición corporal <span class="optional">Opcional</span></h2>
            <p class="muted">Puedes asignar el BCS ahora o dejarlo para quien evalúe las fotografías después.</p>
            <fieldset class="score-choices" aria-label="Seleccionar condición corporal">
              <label v-for="option in scoreOptions" :key="option" :class="{ selected: form.bodyConditionScore === option }"><input v-model="form.bodyConditionScore" type="radio" name="new-body-condition-score" :value="option" />{{ option.toLocaleString('es-PE', { maximumFractionDigits: 2 }) }}</label>
            </fieldset>
            <p v-if="scorePhotosMissing" class="field-error">Para guardar el BCS, selecciona las fotografías lateral derecha y posterior.</p>
            <Button v-if="form.bodyConditionScore != null" label="Dejar sin puntaje" text severity="secondary" size="small" @click="form.bodyConditionScore = null" />
          </section>
        </template>
      </fieldset>
      <div class="form-actions">
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="saving"
          @click="
            router.push(id ? `/evaluaciones/${id}` : created ? `/evaluaciones/${created.id}` : `/bovinos/${bovine?.id}`)
          "
        /><Button
          type="submit"
          :label="id ? 'Guardar evaluación' : created ? 'Reintentar guardado' : 'Crear evaluación'"
          icon="pi pi-check"
          :loading="saving"
          :disabled="locked || conflict || validating.RightLateral || validating.Rear || scorePhotosMissing"
        />
      </div></form
  ></LoadState>
</template>
