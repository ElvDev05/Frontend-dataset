<script setup lang="ts">
import { onMounted, ref } from "vue";
import Select from "primevue/select";
import Button from "primevue/button";
import { specialistsService } from "../../services/specialists.service";
import { errorMessage } from "../../utils/errors";
import type { Specialist } from "../../types/api";
defineProps<{ inputId: string; disabled?: boolean; filterMode?: boolean }>();
const model = defineModel<number | null>();
const options = ref<Specialist[]>([]);
const loading = ref(true);
const error = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  try {
    options.value = await specialistsService.list();
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
    aria-label="Especialista"
    :options="options.filter((s) => filterMode || s.isActive || s.id === model)"
    option-label="fullName"
    option-value="id"
    :option-disabled="(s) => !filterMode && !s.isActive"
    filter
    show-clear
    :loading="loading"
    :disabled="disabled || loading"
    :placeholder="
      filterMode ? 'Todos los especialistas' : 'Selecciona un especialista'
    "
    fluid
  />
  <small v-if="error" class="field-error"
    >{{ error }} <Button label="Reintentar" text size="small" @click="load"
  /></small>
  <small v-else-if="!loading && !options.length" class="muted"
    >Registra un especialista en la sección Especialistas.</small
  >
</template>
