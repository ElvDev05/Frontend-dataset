<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Paginator from "primevue/paginator";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import EvaluationTable from "../components/evaluations/EvaluationTable.vue";
import SpecialistSelect from "../components/evaluations/SpecialistSelect.vue";
import { evaluationsService } from "../services/evaluations.service";
import { statusLabels } from "../utils/format";
import { errorMessage } from "../utils/errors";
import type { Evaluation, EvaluationStatus } from "../types/api";
const items = ref<Evaluation[]>([]);
const loading = ref(true);
const error = ref("");
const status = ref<EvaluationStatus | null>(null);
const specialistId = ref<number | null>(null);
const from = ref("");
const to = ref("");
const page = ref(1);
const pageSize = ref(25);
const total = ref(0);
const statuses = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
}));
async function load() {
  if (from.value && to.value && from.value > to.value) {
    error.value = "La fecha inicial no puede ser posterior a la final.";
    return;
  }
  loading.value = true;
  error.value = "";
  try {
    const result = await evaluationsService.list({
      status: status.value ?? undefined,
      specialistId: specialistId.value ?? undefined,
      from: from.value || undefined,
      to: to.value || undefined,
      page: page.value,
      pageSize: pageSize.value,
    });
    items.value = result.items;
    total.value = result.total;
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <PageHeader
    title="Evaluaciones"
    eyebrow="SEGUIMIENTO"
    description="Consulta las mediciones y el avance del registro fotográfico."
    ><RouterLink to="/bovinos"
      ><Button label="Seleccionar bovino" icon="pi pi-plus" /></RouterLink
  ></PageHeader>
  <section class="panel">
    <form
      class="filter-bar wrap"
      @submit.prevent="
        page = 1;
        load();
      "
    >
      <div class="field">
        <label for="status-filter">Estado</label
        ><Select
          v-model="status"
              input-id="status-filter"
              aria-label="Estado"
          :options="statuses"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="Todos los estados"
          fluid
        />
      </div>
      <div class="field">
        <label for="specialist-filter">Especialista</label
        ><SpecialistSelect
          v-model="specialistId"
          input-id="specialist-filter"
          filter-mode
        />
      </div>
      <div class="field date-filter">
        <label for="from">Desde</label
        ><InputText id="from" v-model="from" type="date" fluid />
      </div>
      <div class="field date-filter">
        <label for="to">Hasta</label
        ><InputText
          id="to"
          v-model="to"
          type="date"
          :min="from || undefined"
          fluid
        />
      </div>
      <Button
        type="submit"
        label="Filtrar"
        icon="pi pi-filter"
        :disabled="loading"
      />
    </form>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-title="No hay evaluaciones para mostrar"
      empty-description="Ajusta los filtros o selecciona un bovino para registrar una evaluación."
      @retry="load"
      ><EvaluationTable :items="items" show-bovine /></LoadState
    ><Paginator
      v-if="total > 0 && !error"
      :rows="pageSize"
      :first="(page - 1) * pageSize"
      :total-records="total"
      :rows-per-page-options="[10, 25, 50, 100]"
      template="PrevPageLink CurrentPageReport NextPageLink RowsPerPageDropdown"
      current-page-report-template="{first}–{last} de {totalRecords}"
      @page="
        (event) => {
          page = event.page + 1;
          pageSize = event.rows;
          load();
        }
      "
    />
  </section>
</template>
