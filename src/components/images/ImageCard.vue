<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import Button from "primevue/button";
import ProgressBar from "primevue/progressbar";
import Tag from "primevue/tag";
import Message from "primevue/message";
import { useConfirm } from "primevue/useconfirm";
import ImageZoomDialog from "./ImageZoomDialog.vue";
import { imagesService } from "../../services/images.service";
import { errorMessage } from "../../utils/errors";
import { validateImage } from "../../utils/imageValidation";
import { angles } from "../../utils/format";
import type {
  CaptureAngle,
  DownloadTicket,
  EvaluationImage,
} from "../../types/api";
const props = defineProps<{
  evaluationId: number;
  angle: CaptureAngle;
  position: number;
  image?: EvaluationImage;
  locked: boolean;
  disabled: boolean;
  busy: boolean;
  progress: number;
  phase: string;
  error: string;
}>();
const emit = defineEmits<{
  upload: [file: File];
  remove: [];
}>();
const confirm = useConfirm();
const file = ref<File>();
const preview = ref("");
const validationError = ref("");
const validating = ref(false);
const download = ref<DownloadTicket>();
const downloadError = ref("");
const downloading = ref(false);
const input = ref<HTMLInputElement>();
const enlarged = ref(false);
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
const info = angles.find((a) => a.value === props.angle)!;
async function select(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0];
  if (!selected) return;
  validating.value = true;
  validationError.value = "";
  try {
    await validateImage(selected);
    if (preview.value) URL.revokeObjectURL(preview.value);
    file.value = selected;
    preview.value = URL.createObjectURL(selected);
  } catch (e) {
    validationError.value = await errorMessage(e);
    file.value = undefined;
    if (preview.value) URL.revokeObjectURL(preview.value);
    preview.value = "";
  } finally {
    validating.value = false;
    if (input.value) input.value.value = "";
  }
}
async function loadDownload() {
  if (props.image?.uploadStatus !== "Verified" || downloading.value) return;
  downloading.value = true;
  downloadError.value = "";
  clearTimeout(refreshTimer);
  try {
    const result = await imagesService.download(
      props.evaluationId,
      props.image.imageIdentifier,
    );
    if (disposed) return;
    download.value = result;
    refreshTimer = setTimeout(
      () => {
        void loadDownload();
      },
      Math.max(5000, Date.parse(result.expiresAt) - Date.now() - 30_000),
    );
  } catch (e) {
    downloadError.value = await errorMessage(e);
  } finally {
    downloading.value = false;
  }
}
watch(
  () => `${props.image?.imageIdentifier}:${props.image?.uploadStatus}`,
  () => {
    download.value = undefined;
    downloadError.value = "";
    clearTimeout(refreshTimer);
    if (props.image?.uploadStatus === "Verified") {
      file.value = undefined;
      if (preview.value) URL.revokeObjectURL(preview.value);
      preview.value = "";
      void loadDownload();
    }
  },
  { immediate: true },
);
function remove() {
  confirm.require({
    header: "Retirar fotografía",
    message: `Se retirará la fotografía de la vista ${info.label.toLowerCase()}. Podrás seleccionar una nueva después.`,
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Retirar",
    rejectLabel: "Cancelar",
    acceptProps: { severity: "danger" },
    accept: () => emit("remove"),
  });
}
onBeforeUnmount(() => {
  disposed = true;
  clearTimeout(refreshTimer);
  if (preview.value) URL.revokeObjectURL(preview.value);
});
</script>
<template>
  <article
    class="image-card"
    :class="{ verified: image?.uploadStatus === 'Verified' }"
  >
    <div class="image-card-title">
      <span class="angle-number">{{ position }}</span>
      <h3>{{ info.label }}</h3>
      <Tag
        v-if="image?.uploadStatus === 'Verified'"
        value="Cargada"
        severity="success"
      /><Tag v-else-if="image" value="Pendiente" severity="warn" />
    </div>
    <div class="image-preview">
      <img
        v-if="preview || download?.url"
        :src="preview || download?.url"
        :alt="`Fotografía: ${info.label.toLowerCase()}`"
        @error="
          downloadError =
            'No se pudo mostrar la fotografía. Actualiza su vista.'
        "
      />
      <div v-else class="angle-placeholder">
        <i :class="info.icon" aria-hidden="true" /><svg
          viewBox="0 0 120 75"
          aria-hidden="true"
        >
          <g
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linejoin="round"
          >
            <path
              v-if="angle === 'LeftLateral' || angle === 'RightLateral'"
              :transform="
                angle === 'RightLateral'
                  ? 'translate(120 0) scale(-1 1)'
                  : undefined
              "
              d="M28 25h61l8 8-2 26h-7V44H48v15h-7V36L26 42l-8-8 3-18 11 2 4 7m-7-8-8-7m75 18 8 13"
            />
            <path
              v-else-if="angle === 'TopBack'"
              d="M49 13h22l9 14-2 30-10 9H52L42 57l-2-30 9-14Zm11 0v53M48 13l-7-5m31 5 7-5"
            />
            <path
              v-else
              d="M37 19q23-10 46 0l-4 24v20H68V43H52v20H41V43Zm23-4v33l6 8"
            />
          </g></svg
        ><span>{{
          locked ? "Sin fotografía" : "Selecciona una fotografía"
        }}</span>
      </div>
    </div>
    <div class="image-card-body">
      <p class="muted">{{ info.hint }}</p>
      <Button
        v-if="preview || download?.url"
        label="Ampliar fotografía"
        icon="pi pi-search-plus"
        text
        size="small"
        class="image-expand-action"
        @click="enlarged = true"
      />
      <small v-if="file" class="file-name"
        >{{ file.name }} · {{ (file.size / 1024 / 1024).toFixed(2) }} MiB</small
      ><Message
        v-if="validationError || error"
        severity="error"
        class="compact-message"
        >{{ validationError || error }}</Message
      ><Message v-if="downloadError" severity="warn" class="compact-message">{{
        downloadError
      }}</Message>
      <div v-if="busy" role="status" class="upload-progress">
        <span>{{ phase }}</span
        ><ProgressBar
          :value="progress"
          :mode="
            phase === 'Subiendo fotografía…' ? 'determinate' : 'indeterminate'
          "
          :show-value="false"
          style="height: 6px"
        />
      </div>
      <div v-if="image?.uploadStatus === 'Verified'" class="actions">
        <Button
          label="Actualizar vista"
          icon="pi pi-refresh"
          text
          size="small"
          :loading="downloading"
          @click="loadDownload"
        /><Button
          v-if="!locked"
          label="Retirar"
          icon="pi pi-trash"
          text
          severity="danger"
          size="small"
          :disabled="disabled || busy"
          @click="remove"
        />
      </div>
      <div v-else-if="!locked" class="actions">
        <input
          ref="input"
          type="file"
          accept="image/jpeg,image/png"
          class="sr-only"
          :aria-label="`Seleccionar fotografía: ${info.label}`"
          :disabled="disabled || busy || validating"
          @change="select"
        /><Button
          :label="file ? 'Cambiar archivo' : 'Seleccionar'"
          icon="pi pi-camera"
          outlined
          severity="secondary"
          size="small"
          :disabled="disabled || busy"
          :loading="validating"
          @click="input?.click()"
        /><Button
          v-if="file"
          :label="error ? 'Reintentar' : 'Subir'"
          icon="pi pi-upload"
          size="small"
          :disabled="disabled || busy || validating"
          @click="emit('upload', file)"
        />
      </div>
    </div>
  </article>
  <ImageZoomDialog
    v-if="preview || download?.url"
    v-model:visible="enlarged"
    :src="preview || download?.url || ''"
    :alt="`Fotografía: ${info.label.toLowerCase()}`"
    :title="info.label"
  />
</template>
