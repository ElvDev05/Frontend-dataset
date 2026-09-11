<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import Paginator from "primevue/paginator";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import EvaluationTable from "../components/evaluations/EvaluationTable.vue";
import { bovinesService } from "../services/bovines.service";
import { breedsService } from "../services/breeds.service";
import { evaluationsService } from "../services/evaluations.service";
import { errorMessage } from "../utils/errors";
import { formatDate, formatSex } from "../utils/format";
import type { Bovine, Evaluation } from "../types/api";
const id = Number(useRoute().params.id);
const bovine = ref<Bovine>();
const breedName = ref("");
const loading = ref(true);
const error = ref("");
const history = ref<Evaluation[]>([]);
const historyLoading = ref(false);
const historyError = ref("");
const page = ref(1);
const total = ref(0);
async function loadHistory() {
  historyLoading.value = true;
  historyError.value = "";
  try {
    const result = await evaluationsService.history(id, page.value);
    history.value = result.items;
    total.value = result.total;
  } catch (e) {
    historyError.value = await errorMessage(e);
  } finally {
    historyLoading.value = false;
  }
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [b, breeds] = await Promise.all([
      bovinesService.get(id),
      breedsService.list(),
    ]);
    bovine.value = b;
    breedName.value =
      breeds.find((r) => r.id === b.predominantBreedId)?.name ||
      `Raza #${b.predominantBreedId}`;
    await loadHistory();
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<template>
  <RouterLink to="/bovinos" class="back-link"
    ><i class="pi pi-arrow-left" /> Volver a bovinos</RouterLink
  ><LoadState :loading="loading" :error="error" @retry="load"
    ><template v-if="bovine"
      ><PageHeader
        :title="bovine.identificationCode"
        eyebrow="FICHA DEL BOVINO"
        :description="`${formatSex(bovine.sex)} · ${breedName}`"
        ><RouterLink :to="`/bovinos/${id}/editar`"
          ><Button
            label="Editar"
            icon="pi pi-pencil"
            severity="secondary"
            outlined /></RouterLink
        ><RouterLink :to="`/bovinos/${id}/evaluaciones/nueva`"
          ><Button label="Nueva evaluación" icon="pi pi-plus" /></RouterLink
      ></PageHeader>
      <section class="panel detail-panel">
        <h2>Información del bovino</h2>
        <dl class="detail-grid">
          <div>
            <dt>Sexo</dt>
            <dd>{{ formatSex(bovine.sex) }}</dd>
          </div>
          <div>
            <dt>Raza predominante</dt>
            <dd>{{ breedName }}</dd>
          </div>
          <div v-if="bovine.birthDate">
            <dt>Fecha de nacimiento</dt>
            <dd>{{ formatDate(bovine.birthDate) }}</dd>
          </div>
          <template v-else
            ><div>
              <dt>Edad estimada de referencia</dt>
              <dd>{{ bovine.estimatedAgeMonths }} meses</dd>
            </div>
            <div>
              <dt>Fecha de referencia</dt>
              <dd>{{ formatDate(bovine.ageReferenceDate) }}</dd>
            </div></template
          >
        </dl>
        <div v-if="bovine.notes" class="notes-block">
          <h3>Notas</h3>
          <p>{{ bovine.notes }}</p>
        </div>
      </section>
      <section class="panel">
        <div class="panel-heading">
          <h2>
            Historial de evaluaciones
            <span class="count-badge">{{ total }}</span>
          </h2>
          <Button
            icon="pi pi-refresh"
            text
            aria-label="Actualizar historial"
            :disabled="historyLoading"
            @click="loadHistory"
          />
        </div>
        <LoadState
          :loading="historyLoading"
          :error="historyError"
          :empty="!history.length"
          empty-title="Este bovino aún no tiene evaluaciones"
          empty-description="Registra su primera evaluación para comenzar el historial."
          @retry="loadHistory"
          ><EvaluationTable :items="history" /></LoadState
        ><Paginator
          v-if="total > 25 && !historyError"
          :rows="25"
          :first="(page - 1) * 25"
          :total-records="total"
          @page="
            (event) => {
              page = event.page + 1;
              loadHistory();
            }
          "
        /></section></template
  ></LoadState>
</template>
