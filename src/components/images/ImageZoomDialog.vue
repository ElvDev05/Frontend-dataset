<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";

const props = defineProps<{
  src: string;
  alt: string;
  title: string;
}>();

const visible = defineModel<boolean>("visible", { required: true });
const viewport = ref<HTMLDivElement>();
const zoom = ref(1);
const minimumZoom = 1;
const maximumZoom = 5;
const zoomStep = 0.5;
const zoomPercentage = computed(() => Math.round(zoom.value * 100));

async function setZoom(value: number) {
  const element = viewport.value;
  const centerX = element
    ? (element.scrollLeft + element.clientWidth / 2) /
      Math.max(element.scrollWidth, 1)
    : 0.5;
  const centerY = element
    ? (element.scrollTop + element.clientHeight / 2) /
      Math.max(element.scrollHeight, 1)
    : 0.5;

  zoom.value = Math.min(maximumZoom, Math.max(minimumZoom, value));
  await nextTick();

  if (!element) return;
  element.scrollLeft = centerX * element.scrollWidth - element.clientWidth / 2;
  element.scrollTop = centerY * element.scrollHeight - element.clientHeight / 2;
}

async function resetZoom() {
  zoom.value = minimumZoom;
  await nextTick();
  viewport.value?.scrollTo({ top: 0, left: 0 });
}

function handleKeyboard(event: KeyboardEvent) {
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    void setZoom(zoom.value + zoomStep);
  } else if (event.key === "-") {
    event.preventDefault();
    void setZoom(zoom.value - zoomStep);
  } else if (event.key === "0") {
    event.preventDefault();
    void resetZoom();
  }
}

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  void setZoom(zoom.value + (event.deltaY < 0 ? zoomStep : -zoomStep));
}

watch(() => props.src, resetZoom);
watch(visible, (isVisible) => {
  if (!isVisible) void resetZoom();
});
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="title"
    class="photo-gallery-dialog"
    :style="{ width: 'min(calc(100vw - 24px), 1040px)' }"
    @hide="resetZoom"
  >
    <div
      ref="viewport"
      class="photo-gallery-viewport"
      tabindex="0"
      aria-label="Fotografía ampliada. Usa los controles para acercar o alejar y desplázate para examinar los detalles."
      @keydown="handleKeyboard"
      @wheel="handleWheel"
      @dblclick="setZoom(zoom < maximumZoom ? zoom + zoomStep : minimumZoom)"
    >
      <div
        class="photo-zoom-canvas"
        :style="{ '--photo-zoom': zoom }"
      >
        <img :src="src" :alt="alt" draggable="false" />
      </div>
    </div>

    <div class="photo-gallery-controls" role="group" aria-label="Controles de zoom">
      <Button
        label="Alejar"
        icon="pi pi-search-minus"
        outlined
        :disabled="zoom <= minimumZoom"
        @click="setZoom(zoom - zoomStep)"
      />
      <button
        type="button"
        class="photo-zoom-level"
        :disabled="zoom <= minimumZoom"
        aria-label="Restablecer imagen completa"
        aria-live="polite"
        title="Restablecer imagen completa"
        @click="resetZoom"
      >
        {{ zoomPercentage }}%
      </button>
      <Button
        label="Acercar"
        icon="pi pi-search-plus"
        outlined
        :disabled="zoom >= maximumZoom"
        @click="setZoom(zoom + zoomStep)"
      />
    </div>
    <p class="photo-gallery-help">
      Amplía hasta 500%. Desplázate sobre la imagen para revisar cada detalle.
    </p>
  </Dialog>
</template>
