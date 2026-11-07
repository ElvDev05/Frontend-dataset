<script setup lang="ts">
import { onMounted, ref } from "vue";
import Select from "primevue/select";
import Button from "primevue/button";
import { breedsService } from "../../services/breeds.service";
import { errorMessage } from "../../utils/errors";
import type { Breed } from "../../types/api";
// `optional`: the field may be left empty (the API accepts a bovine without breed).
defineProps<{
  inputId: string;
  disabled?: boolean;
  filterMode?: boolean;
  optional?: boolean;
}>();
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
    :aria-label="filterMode || optional ? 'Raza predominante' : 'Raza predominante *'"
    :options="options.filter((b) => filterMode || b.isActive || b.id === model)"
    option-label="name"
    option-value="id"
    :option-disabled="(b) => !filterMode && !b.isActive"
    filter
    :show-clear="filterMode || optional"
    :loading="loading"
    :disabled="disabled || loading"
    :placeholder="
      filterMode
        ? 'Todas las razas'
        : optional
          ? 'Sin raza registrada'
          : 'Selecciona una raza'
    "
    fluid
  />
  <small v-if="error" class="field-error"
    >{{ error }} <Button label="Reintentar" text size="small" @click="load"
  /></small>
  <small v-else-if="!loading && !options.length" class="muted"
    >No hay razas. Un administrador debe registrar una en Razas.</small
  >
</template>
