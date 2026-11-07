<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import { downloadDataset } from "../services/exports.service";
import { errorMessage } from "../utils/errors";
import type { CaptureSet } from "../types/api";
const toast = useToast();
const from = ref("");
const to = ref("");
const bovineId = ref<number | null>(null);
const captureSet = ref<CaptureSet>("All");
// New evaluations close with two photographs; 3 and 4 remain for earlier records.
const captureSets: { value: CaptureSet; label: string }[] = [
  { value: "All", label: "Todas" },
  { value: "TwoImages", label: "2 fotografías (posterior y lateral)" },
  { value: "ThreeImages", label: "3 fotografías (registros anteriores)" },
  { value: "FourImages", label: "4 fotografías (registros anteriores)" },
];
const busy = ref(false);
const error = ref("");
async function download() {
  if (from.value && to.value && from.value > to.value) {
    error.value = "La fecha inicial no puede ser posterior a la final.";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    await downloadDataset({
      from: from.value || undefined,
      to: to.value || undefined,
      bovineId: bovineId.value ?? undefined,
      captureSet: captureSet.value,
    });
    toast.add({
      severity: "success",
      summary: "Descarga iniciada",
      detail: "El archivo CSV está listo.",
      life: 3500,
    });
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <PageHeader
    title="Exportar datos"
    eyebrow="CONJUNTO DE DATOS"
    description="Descarga los metadatos de las evaluaciones completadas."
  />
  <form class="panel form-panel" @submit.prevent="download">
    <div class="export-intro">
      <div class="intro-icon"><i class="pi pi-file-excel" /></div>
      <div>
        <h2>Archivo CSV</h2>
        <p class="muted">
          Una fila por fotografía verificada de una evaluación completada.
          Incluye identificación, sexo, raza, edad, peso, condición corporal y
          especialista. Las evaluaciones nuevas se completan con dos
          fotografías; puedes filtrar también los registros anteriores con
          tres o cuatro.
        </p>
      </div>
    </div>
    <Message severity="info"
      >El archivo contiene metadatos y referencias de imagen, incluidas las
      columnas de cobertura y cantidad de fotografías. Las fotografías y sus
      enlaces temporales no se incluyen.</Message
    ><Message v-if="error" severity="error">{{ error }}</Message>
    <fieldset :disabled="busy">
      <div class="form-grid">
        <div class="field">
          <label for="export-capture-set">Cobertura fotográfica *</label
          ><Select
            v-model="captureSet"
            input-id="export-capture-set"
            :options="captureSets"
            option-label="label"
            option-value="value"
            aria-label="Cobertura fotográfica"
            fluid
          /><small class="muted"
            >Elige cobertura mínima, completa o ambas en un mismo archivo.</small
          >
        </div>
        <div class="field">
          <label for="export-from"
            >Desde <span class="optional">Opcional</span></label
          ><InputText id="export-from" v-model="from" type="date" fluid />
        </div>
        <div class="field">
          <label for="export-to"
            >Hasta <span class="optional">Opcional</span></label
          ><InputText
            id="export-to"
            v-model="to"
            type="date"
            :min="from || undefined"
            fluid
          />
        </div>
        <div class="field">
          <label for="export-bovine"
            >Número de registro del bovino
            <span class="optional">Opcional</span></label
          ><InputNumber
            v-model="bovineId"
            input-id="export-bovine"
            :min="1"
            :max="2147483647"
            :use-grouping="false"
            :max-fraction-digits="0"
            fluid
          /><small class="muted"
            >Es el número de la dirección de su ficha. Vacío: todos los
            bovinos.</small
          >
        </div>
      </div>
    </fieldset>
    <div class="form-actions">
      <Button
        type="submit"
        label="Descargar CSV"
        icon="pi pi-download"
        :loading="busy"
      />
    </div>
  </form>
</template>
