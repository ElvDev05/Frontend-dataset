<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import Message from "primevue/message";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import StatusTag from "../components/evaluations/StatusTag.vue";
import EvaluationImages from "../components/images/EvaluationImages.vue";
import { evaluationsService } from "../services/evaluations.service";
import { bovinesService } from "../services/bovines.service";
import { specialistsService } from "../services/specialists.service";
import { useAuthStore } from "../stores/auth";
import { errorMessage, isConflict } from "../utils/errors";
import {
  captureCoverage,
  captureRequirementMessages,
} from "../utils/captureCoverage";
import {
  ageLabels,
  editable,
  formatDate,
  formatNumber,
  formatSex,
} from "../utils/format";
import type { Bovine, Evaluation, Specialist } from "../types/api";
const id = Number(useRoute().params.id);
const auth = useAuthStore();
const confirm = useConfirm();
const toast = useToast();
const evaluation = ref<Evaluation>();
const bovine = ref<Bovine>();
const specialists = ref<Specialist[]>([]);
const loading = ref(true);
const loadError = ref("");
const error = ref("");
const busy = ref(false);
const uploading = ref(false);
const conflict = ref(false);
const rejectVisible = ref(false);
const reason = ref("");
const selectedSpecialist = computed(() =>
  specialists.value.find((s) => s.id === evaluation.value?.specialistId),
);
const coverage = computed(() =>
  evaluation.value
    ? captureCoverage(evaluation.value.images)
    : "Incomplete",
);
const coverageDescription = computed(() =>
  coverage.value === "FourImages"
    ? "cobertura completa de cuatro fotografías"
    : "cobertura mínima de tres fotografías",
);
const missing = computed(() => {
  const e = evaluation.value;
  if (!e) return [];
  const messages: string[] = [];
  if (e.weightKg == null) messages.push("Registrar el peso.");
  if (e.bodyConditionScore == null)
    messages.push("Registrar la condición corporal.");
  if (!selectedSpecialist.value?.isActive)
    messages.push("Asignar un especialista activo.");
  messages.push(...captureRequirementMessages(e.images));
  return messages;
});
async function load() {
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  try {
    const [e, s] = await Promise.all([
      evaluationsService.get(id),
      specialistsService.list(),
    ]);
    evaluation.value = e;
    specialists.value = s;
    bovine.value = await bovinesService.get(e.bovineId);
  } catch (e) {
    loadError.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function act(action: "complete" | "reject" | "reopen") {
  if (!evaluation.value) return;
  busy.value = true;
  error.value = "";
  try {
    const version = evaluation.value.version;
    evaluation.value =
      action === "reject"
        ? await evaluationsService.reject(id, version, reason.value.trim())
        : action === "complete"
          ? await evaluationsService.complete(id, version)
          : await evaluationsService.reopen(id, version);
    rejectVisible.value = false;
    toast.add({
      severity: "success",
      summary:
        action === "complete"
          ? "Evaluación completada"
          : action === "reject"
            ? "Evaluación rechazada"
            : "Evaluación reabierta",
      life: 3500,
    });
  } catch (e) {
    error.value = await errorMessage(e);
    conflict.value = isConflict(e);
    rejectVisible.value = false;
  } finally {
    busy.value = false;
  }
}
function confirmAction(action: "complete" | "reopen") {
  confirm.require({
    header:
      action === "complete" ? "Completar evaluación" : "Reabrir evaluación",
    message:
      action === "complete"
        ? `Se completará con ${coverageDescription.value}. Las mediciones y fotografías se bloquearán y la evaluación se incluirá en la exportación CSV.`
        : "La evaluación volverá a estar disponible para editar sus datos y fotografías.",
    icon: "pi pi-exclamation-circle",
    acceptLabel: action === "complete" ? "Completar" : "Reabrir",
    rejectLabel: "Cancelar",
    accept: () => {
      void act(action);
    },
  });
}
onMounted(load);
</script>
<template>
  <RouterLink
    :to="evaluation ? `/bovinos/${evaluation.bovineId}` : '/evaluaciones'"
    class="back-link"
    ><i class="pi pi-arrow-left" />
    {{
      bovine ? `Volver a ${bovine.identificationCode}` : "Volver al registro"
    }}</RouterLink
  >
  <LoadState :loading="loading" :error="loadError" @retry="load"
    ><template v-if="evaluation"
      ><PageHeader
        :title="`Evaluación #${evaluation.id}`"
        :eyebrow="bovine?.identificationCode || 'EVALUACIÓN'"
        :description="
          bovine
            ? `${formatDate(evaluation.evaluationDate)} · ${formatSex(bovine.sex)}`
            : formatDate(evaluation.evaluationDate)
        "
        ><StatusTag :status="evaluation.status" /><Button
          icon="pi pi-refresh"
          outlined
          severity="secondary"
          aria-label="Recargar evaluación"
          :disabled="busy || uploading"
          @click="load" /><RouterLink
          v-if="editable(evaluation.status) && !busy && !uploading && !conflict"
          :to="`/evaluaciones/${id}/editar`"
          ><Button
            label="Editar datos"
            icon="pi pi-pencil"
            severity="secondary"
            outlined /></RouterLink></PageHeader
      ><Message v-if="error" severity="error"
        >{{ error
        }}<Button
          v-if="conflict"
          label="Recargar evaluación"
          text
          severity="danger"
          :disabled="uploading"
          @click="load"
      /></Message>
      <section class="panel detail-panel">
        <h2>Mediciones y evaluación</h2>
        <dl class="detail-grid">
          <div>
            <dt>Edad en esta evaluación</dt>
            <dd>
              {{ evaluation.ageMonths }} meses<small>{{
                ageLabels[evaluation.ageSource]
              }}</small>
            </dd>
          </div>
          <div>
            <dt>Peso</dt>
            <dd>
              {{ formatNumber(evaluation.weightKg)
              }}<small v-if="evaluation.weightKg != null">kilogramos</small>
            </dd>
          </div>
          <div>
            <dt>Condición corporal</dt>
            <dd>
              {{ formatNumber(evaluation.bodyConditionScore)
              }}<small v-if="evaluation.bodyConditionScore != null"
                >de 5 puntos</small
              >
            </dd>
          </div>
          <div>
            <dt>Especialista</dt>
            <dd>
              {{ selectedSpecialist?.fullName || "Sin asignar"
              }}<small
                v-if="selectedSpecialist && !selectedSpecialist.isActive"
                class="field-error"
                >Inactivo</small
              >
            </dd>
          </div>
        </dl>
        <div v-if="evaluation.notes" class="notes-block">
          <h3>Notas</h3>
          <p>{{ evaluation.notes }}</p>
        </div>
        <Message
          v-if="evaluation.rejectionReason"
          :severity="evaluation.status === 'Rejected' ? 'error' : 'info'"
          >{{
            evaluation.status === "Rejected"
              ? "Motivo del rechazo"
              : "Último motivo de rechazo"
          }}: {{ evaluation.rejectionReason }}</Message
        >
        <p v-if="evaluation.completedAt" class="muted">
          Completada el {{ formatDate(evaluation.completedAt) }}.
        </p>
      </section>
      <EvaluationImages
        v-model="evaluation"
        :disabled="busy || conflict"
        @busy="uploading = $event" />
      <section class="panel detail-panel completion-panel">
        <div>
          <h2>
            {{
              evaluation.status === "Complete"
                ? "Evaluación completada"
                : evaluation.status === "Rejected"
                  ? "Evaluación rechazada"
                  : "Finalizar evaluación"
            }}
          </h2>
          <template v-if="editable(evaluation.status)"
            ><p v-if="!missing.length" class="muted">
              Los datos y la {{ coverageDescription }} están listos para
              completar.
            </p>
            <template v-else
              ><p class="muted">Antes de completar, falta:</p>
              <ul class="requirements">
                <li v-for="item in missing" :key="item">{{ item }}</li>
              </ul></template
            ></template
          >
          <p v-else class="muted">
            {{
              evaluation.status === "Complete"
                ? `Este registro está listo para exportarse con ${coverageDescription}.`
                : "Un administrador puede reabrirla para corregir el registro."
            }}
          </p>
        </div>
        <div class="actions">
          <Button
            v-if="editable(evaluation.status)"
            label="Completar evaluación"
            icon="pi pi-check-circle"
            :loading="busy"
            :disabled="!!missing.length || uploading || conflict"
            @click="confirmAction('complete')"
          /><Button
            v-if="auth.isAdministrator && evaluation.status !== 'Rejected'"
            label="Rechazar"
            severity="danger"
            outlined
            :disabled="busy || uploading || conflict"
            @click="
              reason = '';
              rejectVisible = true;
            "
          /><Button
            v-if="auth.isAdministrator && evaluation.status === 'Rejected'"
            label="Reabrir evaluación"
            icon="pi pi-lock-open"
            :loading="busy"
            :disabled="uploading || conflict"
            @click="confirmAction('reopen')"
          />
        </div></section></template
  ></LoadState>
  <Dialog
    v-model:visible="rejectVisible"
    modal
    header="Rechazar evaluación"
    :closable="!busy"
    :close-on-escape="!busy"
    :style="{ width: '32rem', maxWidth: 'calc(100vw - 2rem)' }"
    ><form class="form-stack" @submit.prevent="act('reject')">
      <p class="muted">
        La evaluación quedará bloqueada y se excluirá del CSV. Indica el motivo
        para que pueda corregirse.
      </p>
      <div class="field">
        <label for="reject-reason">Motivo del rechazo *</label
        ><Textarea
          id="reject-reason"
          v-model="reason"
          required
          :maxlength="1000"
          rows="4"
          :disabled="busy"
          fluid
        />
      </div>
      <div class="form-actions">
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="busy"
          @click="rejectVisible = false"
        /><Button
          type="submit"
          label="Confirmar rechazo"
          severity="danger"
          :loading="busy"
          :disabled="!reason.trim()"
        />
      </div></form
  ></Dialog>
</template>
