<script setup lang="ts">
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import StatusTag from "./StatusTag.vue";
import { formatDate, formatNumber } from "../../utils/format";
import type { Evaluation } from "../../types/api";
defineProps<{ items: Evaluation[]; showBovine?: boolean }>();
</script>
<template>
  <DataTable
    :value="items"
    data-key="id"
    striped-rows
    table-style="min-width: 620px"
  >
    <Column header="Evaluación"
      ><template #body="{ data }"
        ><RouterLink :to="`/evaluaciones/${data.id}`" class="table-link"
          >Evaluación #{{ data.id }}
          <i
            class="pi pi-arrow-up-right"
            aria-hidden="true" /></RouterLink></template
    ></Column>
    <Column v-if="showBovine" header="Bovino"
      ><template #body="{ data }"
        ><RouterLink :to="`/bovinos/${data.bovineId}`"
          >Bovino #{{ data.bovineId }}</RouterLink
        ></template
      ></Column
    >
    <Column header="Fecha"
      ><template #body="{ data }">{{
        formatDate(data.evaluationDate)
      }}</template></Column
    >
    <Column header="Peso (kg)"
      ><template #body="{ data }">{{
        formatNumber(data.weightKg)
      }}</template></Column
    >
    <Column header="Fotografías"
      ><template #body="{ data }"
        ><span class="photo-count"
          ><i class="pi pi-camera" aria-hidden="true" />
          {{
            (data as Evaluation).images.filter(
              (i) => i.uploadStatus === "Verified",
            ).length
          }}
          / 4</span
        ></template
      ></Column
    >
    <Column header="Estado"
      ><template #body="{ data }"><StatusTag :status="data.status" /></template
    ></Column>
  </DataTable>
</template>
