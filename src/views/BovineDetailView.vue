<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Paginator from "primevue/paginator";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import BovineHistoryCard from "../components/evaluations/BovineHistoryCard.vue";
import { bovinesService } from "../services/bovines.service";
import { breedsService } from "../services/breeds.service";
import { evaluationsService } from "../services/evaluations.service";
import { useAuthStore } from "../stores/auth";
import { errorMessage, isReferenceConflict } from "../utils/errors";
import { formatAgeRange, formatSex } from "../utils/format";
import type { Bovine, Evaluation } from "../types/api";
const id = Number(useRoute().params.id);
const router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const auth = useAuthStore();
const bovine = ref<Bovine>();
const breedName = ref("");
const loading = ref(true);
const error = ref("");
const history = ref<Evaluation[]>([]);
const historyLoading = ref(false);
const historyError = ref("");
const page = ref(1);
const total = ref(0);
const deleting = ref(false);
const deleteError = ref("");
function requestDelete() {
  if (!bovine.value || deleting.value) return;
  deleteError.value = "";
  if (total.value > 0) {
    deleteError.value = "Este bovino tiene evaluaciones. Elimínalas desde su historial antes de borrar la ficha.";
    return;
  }
  confirm.require({
    header: "Eliminar bovino",
    message: `Se eliminará la ficha de ${bovine.value.identificationCode}. Esta acción no se puede deshacer.`,
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Eliminar bovino",
    acceptProps: { severity: "danger" },
    accept: () => { void deleteBovine(); },
  });
}
async function deleteBovine() {
  if (!bovine.value) return;
  deleting.value = true;
  deleteError.value = "";
  try {
    await bovinesService.remove(id, bovine.value.version);
    toast.add({ severity: "success", summary: "Bovino eliminado", life: 3000 });
    await router.replace("/bovinos");
  } catch (cause) {
    deleteError.value = isReferenceConflict(cause)
      ? "Este bovino aún tiene evaluaciones. Elimínalas antes de borrar su ficha."
      : await errorMessage(cause);
  } finally { deleting.value = false; }
}
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
  deleteError.value = "";
  try {
    const [b, breeds] = await Promise.all([
      bovinesService.get(id),
      breedsService.list(),
    ]);
    bovine.value = b;
    breedName.value =
      b.predominantBreedId == null
        ? "Sin raza registrada"
        : breeds.find((r) => r.id === b.predominantBreedId)?.name ||
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
        ><Button v-if="auth.isAdministrator" label="Eliminar bovino" icon="pi pi-trash" severity="danger" outlined :loading="deleting" @click="requestDelete" />
      </PageHeader>
      <Message v-if="deleteError" severity="error" class="record-delete-message">{{ deleteError }} <Button label="Recargar ficha" text severity="danger" @click="load" /></Message>
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
          <div>
            <dt>Rango de edad</dt>
            <dd>{{ formatAgeRange(bovine.ageRange) }}</dd>
          </div>
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
          ><ul class="history-card-list"><BovineHistoryCard v-for="item in history" :key="item.id" :evaluation="item" /></ul></LoadState
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
