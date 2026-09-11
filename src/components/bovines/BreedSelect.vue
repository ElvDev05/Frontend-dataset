<script setup lang="ts">
import { onMounted, ref } from "vue";
import Select from "primevue/select";
import Button from "primevue/button";
import { breedsService } from "../../services/breeds.service";
import { errorMessage } from "../../utils/errors";
import type { Breed } from "../../types/api";
defineProps<{ inputId: string; disabled?: boolean; filterMode?: boolean }>();
const model = defineModel<number | null>();
const options = ref<Breed[]>([]);
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    options.value = await breedsService.list();
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <Select
    v-model="model"
    :input-id="inputId"
    :aria-label="filterMode ? 'Raza predominante' : 'Raza predominante *'"
    :options="options.filter((b) => filterMode || b.isActive || b.id === model)"
    option-label="name"
    option-value="id"
    :option-disabled="(b) => !filterMode && !b.isActive"
    filter
    :show-clear="filterMode"
    :loading="loading"
    :disabled="disabled || loading"
    :placeholder="filterMode ? 'Todas las razas' : 'Selecciona una raza'"
    fluid
  />
  <small v-if="error" class="field-error"
    >{{ error }} <Button label="Reintentar" text size="small" @click="load"
  /></small>
  <small v-else-if="!loading && !options.length" class="muted"
    >No hay razas. Un administrador debe registrar una en Razas.</small
  >
</template>
