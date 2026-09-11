<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import SpecialistSelect from "../components/evaluations/SpecialistSelect.vue";
import { evaluationsService } from "../services/evaluations.service";
import { bovinesService } from "../services/bovines.service";
import { editable, formatSex, utcToday } from "../utils/format";
import { errorMessage, isConflict } from "../utils/errors";
import type { Bovine, EvaluationInput } from "../types/api";
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = Number(route.params.id);
const bovine = ref<Bovine>();
const version = ref("");
const locked = ref(false);
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);
const error = ref("");
const conflict = ref(false);
const form = reactive<EvaluationInput>({
  evaluationDate: utcToday(),
  weightKg: null,
  bodyConditionScore: null,
  specialistId: null,
  notes: "",
});
const scores = Array.from({ length: 17 }, (_, index) => ({
  label: (1 + index * 0.25).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
  }),
  value: 1 + index * 0.25,
}));
async function load() {
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  try {
    if (id) {
      const e = await evaluationsService.get(id);
      form.evaluationDate = e.evaluationDate;
      form.weightKg = e.weightKg;
      form.bodyConditionScore = e.bodyConditionScore;
      form.specialistId = e.specialistId;
      form.notes = e.notes;
      version.value = e.version;
      locked.value = !editable(e.status);
      bovine.value = await bovinesService.get(e.bovineId);
    } else
      bovine.value = await bovinesService.get(Number(route.params.bovineId));
  } catch (e) {
    loadError.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (!bovine.value || locked.value || conflict.value) return;
  saving.value = true;
  error.value = "";
  const payload = { ...form, notes: form.notes?.trim() || null };
  try {
    const e = id
      ? await evaluationsService.update(id, {
          ...payload,
          version: version.value,
        })
      : await evaluationsService.create(bovine.value.id, payload);
    toast.add({
      severity: "success",
      summary: "Evaluación guardada",
      detail: "Continúa con el registro de las fotografías.",
      life: 3500,
    });
    await router.push(`/evaluaciones/${e.id}`);
  } catch (e) {
    error.value = await errorMessage(e);
    conflict.value = isConflict(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <RouterLink
    :to="id ? `/evaluaciones/${id}` : `/bovinos/${route.params.bovineId}`"
    class="back-link"
    ><i class="pi pi-arrow-left" /> Volver al detalle</RouterLink
  ><PageHeader
    :title="id ? 'Editar evaluación' : 'Nueva evaluación'"
    :description="
      bovine
        ? `Bovino ${bovine.identificationCode} · ${formatSex(bovine.sex)} · Registra las mediciones de esta visita.`
        : 'Registra las mediciones de esta visita.'
    "
  /><LoadState :loading="loading" :error="loadError" @retry="load"
    ><form class="panel form-panel" @submit.prevent="save">
      <Message v-if="locked" severity="warn"
        >Esta evaluación está bloqueada. Un administrador debe rechazarla y
        reabrirla para permitir cambios.</Message
      ><Message v-if="error" severity="error"
        >{{ error
        }}<Button
          v-if="conflict"
          label="Descartar cambios y recargar"
          text
          severity="danger"
          @click="load" /></Message
      ><Message severity="info"
        >Puedes guardar un borrador. Para completar necesitarás peso, condición
        corporal, un especialista activo y al menos tres fotografías: un
        lateral, la vista superior del lomo y la posterior.</Message
      >
      <fieldset :disabled="saving || locked || conflict">
        <h2>Datos de la evaluación</h2>
        <div class="form-grid">
          <div class="field">
            <label for="evaluation-date">Fecha de evaluación *</label
            ><InputText
              id="evaluation-date"
              v-model="form.evaluationDate"
              type="date"
              required
              :max="utcToday()"
              :min="bovine?.birthDate || bovine?.ageReferenceDate || undefined"
              fluid
            />
          </div>
          <div class="field">
            <label for="weight">Peso (kg)</label
            ><InputNumber
              v-model="form.weightKg"
              input-id="weight"
              locale="es-PE"
              :min="0.01"
              :max="99999.99"
              :max-fraction-digits="2"
              :disabled="saving || locked || conflict"
              fluid
              placeholder="Ej. 420,50"
            />
          </div>
          <div class="field">
            <label for="score">Condición corporal</label
            ><Select
              v-model="form.bodyConditionScore"
                input-id="score"
                aria-label="Condición corporal"
              :options="scores"
              option-label="label"
              option-value="value"
              show-clear
              :disabled="saving || locked || conflict"
              fluid
              placeholder="Selecciona una puntuación"
            /><small class="muted"
              >Escala de 1 a 5, en incrementos de 0,25.</small
            >
          </div>
          <div class="field">
            <label for="evaluation-specialist">Especialista</label
            ><SpecialistSelect
              v-model="form.specialistId"
              input-id="evaluation-specialist"
              :disabled="saving || locked || conflict"
            />
          </div>
        </div>
        <hr />
        <div class="field">
          <label for="evaluation-notes"
            >Notas <span class="optional">Opcional</span></label
          ><Textarea
            id="evaluation-notes"
            v-model="form.notes"
            rows="4"
            :maxlength="4000"
            auto-resize
            fluid
            placeholder="Observaciones de esta evaluación…"
          />
        </div>
      </fieldset>
      <div class="form-actions">
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="saving"
          @click="
            router.push(id ? `/evaluaciones/${id}` : `/bovinos/${bovine?.id}`)
          "
        /><Button
          type="submit"
          label="Guardar evaluación"
          icon="pi pi-check"
          :loading="saving"
          :disabled="locked || conflict"
        />
      </div></form
  ></LoadState>
</template>
