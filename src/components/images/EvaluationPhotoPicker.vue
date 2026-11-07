<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import Button from 'primevue/button';
import ImageZoomDialog from './ImageZoomDialog.vue';
import { validateImage } from '../../utils/imageValidation';
import { errorMessage } from '../../utils/errors';
import { angles } from '../../utils/format';
import type { CaptureAngle } from '../../types/api';

const props = defineProps<{ angle: CaptureAngle; position: number; disabled: boolean; uploaded: boolean }>();
const model = defineModel<File | null>({ required: true });
const emit = defineEmits<{ validating: [value: boolean] }>();
const info = angles.find(angle => angle.value === props.angle)!;
const input = ref<HTMLInputElement>();
const preview = ref('');
const error = ref('');
const validating = ref(false);
const enlarged = ref(false);

watch(model, file => {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = file ? URL.createObjectURL(file) : '';
}, { immediate: true });

async function select(event: Event) {
  const selected = (event.target as HTMLInputElement).files?.[0];
  if (!selected) return;
  validating.value = true;
  emit('validating', true);
  error.value = '';
  try {
    await validateImage(selected);
    model.value = selected;
  } catch (cause) {
    error.value = await errorMessage(cause);
  } finally {
    validating.value = false;
    emit('validating', false);
    if (input.value) input.value.value = '';
  }
}

onBeforeUnmount(() => { if (preview.value) URL.revokeObjectURL(preview.value); });
</script>

<template>
  <article class="draft-photo-picker">
    <div class="draft-photo-heading"><span class="angle-number">{{ position }}</span><div><h3>{{ info.label }}</h3><p>{{ info.hint }}</p></div><span v-if="uploaded" class="score-tag scored">Cargada</span></div>
    <button v-if="preview" type="button" class="draft-photo-preview" :aria-label="`Ampliar fotografía: ${info.label}`" @click="enlarged = true"><img :src="preview" :alt="`Vista previa: ${info.label}`" /><span><i class="pi pi-search-plus" aria-hidden="true" /> Ver en grande</span></button>
    <div v-else class="draft-photo-placeholder" aria-hidden="true"><i class="pi pi-image" /></div>
    <p v-if="model" class="draft-photo-name">{{ model.name }}</p>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <div class="actions">
      <input ref="input" type="file" accept="image/jpeg,image/png" class="sr-only" :aria-label="`Seleccionar fotografía: ${info.label}`" :disabled="disabled || uploaded || validating" @change="select" />
      <Button v-if="!uploaded" :label="model ? 'Cambiar foto' : 'Seleccionar foto'" icon="pi pi-camera" outlined severity="secondary" size="small" :disabled="disabled || validating" :loading="validating" @click="input?.click()" />
      <Button v-if="model && !uploaded" label="Quitar" icon="pi pi-times" text severity="secondary" size="small" :disabled="disabled || validating" @click="model = null" />
    </div>
  </article>
  <ImageZoomDialog
    v-if="preview"
    v-model:visible="enlarged"
    :src="preview"
    :alt="info.label"
    :title="info.label"
  />
</template>
