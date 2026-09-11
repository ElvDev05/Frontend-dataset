<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Paginator from "primevue/paginator";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import BreedSelect from "../components/bovines/BreedSelect.vue";
import { bovinesService } from "../services/bovines.service";
import { breedsService } from "../services/breeds.service";
import { errorMessage } from "../utils/errors";
import { bovineSexOptions, formatDate, formatSex } from "../utils/format";
import type { Bovine, Breed, RegistrableBovineSex } from "../types/api";
const items = ref<Bovine[]>([]);
const breeds = ref<Breed[]>([]);
const loading = ref(true);
const error = ref("");
const code = ref("");
const breedId = ref<number | null>(null);
const sex = ref<RegistrableBovineSex | null>(null);
const page = ref(1);
const pageSize = ref(25);
const total = ref(0);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [result, catalog] = await Promise.all([
      bovinesService.list({
        code: code.value.trim() || undefined,
        breedId: breedId.value ?? undefined,
        sex: sex.value ?? undefined,
        page: page.value,
        pageSize: pageSize.value,
      }),
      breedsService.list(),
    ]);
    items.value = result.items;
    total.value = result.total;
    breeds.value = catalog;
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function search() {
  page.value = 1;
  void load();
}
onMounted(load);
</script>
<template>
  <PageHeader
    title="Bovinos"
    eyebrow="REGISTRO DE CAMPO"
    description="Identifica tus bovinos y sigue el historial de cada evaluación."
    ><RouterLink to="/bovinos/nuevo"
      ><Button label="Registrar bovino" icon="pi pi-plus" /></RouterLink
  ></PageHeader>
  <section class="intro-strip">
    <div class="intro-icon">
      <i class="pi pi-th-large" aria-hidden="true" />
    </div>
    <div>
      <strong>El punto de partida de una buena captura</strong>
      <p>
        Selecciona un bovino para registrar su evaluación y la cobertura
        fotográfica necesaria.
      </p>
    </div>
    <span class="strip-badge">Identificación → Evaluación → Fotografías</span>
  </section>
  <section class="panel">
    <div class="panel-heading">
      <h2>
        Registro de bovinos
        <span v-if="!loading && !error" class="count-badge">{{ total }}</span>
      </h2>
      <Button
        icon="pi pi-refresh"
        text
        severity="secondary"
        aria-label="Actualizar bovinos"
        :disabled="loading"
        @click="load"
      />
    </div>
    <form class="filter-bar" @submit.prevent="search">
      <div class="field search-field">
        <label for="code-search">Código de identificación</label
        ><InputText
          id="code-search"
          v-model="code"
          placeholder="Buscar por código…"
          :maxlength="80"
          fluid
        />
      </div>
      <div class="field">
        <label for="breed-filter">Raza predominante</label
        ><BreedSelect v-model="breedId" input-id="breed-filter" filter-mode />
      </div>
      <div class="field">
        <label for="sex-filter">Sexo</label
        ><Select
          v-model="sex"
          input-id="sex-filter"
          :options="bovineSexOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos"
          aria-label="Sexo"
          show-clear
          fluid
        />
      </div>
      <Button
        type="submit"
        label="Buscar"
        icon="pi pi-search"
        :disabled="loading"
      />
    </form>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-title="No se encontraron bovinos"
      empty-description="Registra tu primer bovino o ajusta los filtros de búsqueda."
      @retry="load"
    >
      <DataTable
        :value="items"
        data-key="id"
        striped-rows
        table-style="min-width: 740px"
        ><Column header="Identificación"
          ><template #body="{ data }"
            ><RouterLink :to="`/bovinos/${data.id}`" class="table-link"
              ><span class="record-icon"
                ><i class="pi pi-tag" aria-hidden="true" /></span
              >{{ data.identificationCode
              }}<i
                class="pi pi-arrow-up-right"
                aria-hidden="true" /></RouterLink></template></Column
        ><Column header="Sexo"
          ><template #body="{ data }">{{
            formatSex((data as Bovine).sex)
          }}</template></Column
        ><Column header="Raza predominante"
          ><template #body="{ data }">{{
            breeds.find((b) => b.id === data.predominantBreedId)?.name ||
            `Raza #${data.predominantBreedId}`
          }}</template></Column
        ><Column header="Registro de edad"
          ><template #body="{ data }"
            ><span v-if="data.birthDate"
              >{{ formatDate(data.birthDate)
              }}<small class="cell-help">Fecha de nacimiento</small></span
            ><span v-else
              >{{ data.estimatedAgeMonths }} meses<small class="cell-help"
                >Estimados al {{ formatDate(data.ageReferenceDate) }}</small
              ></span
            ></template
          ></Column
        ><Column header="Detalle"
          ><template #body="{ data }"
            ><RouterLink :to="`/bovinos/${data.id}`"
              ><Button
                label="Ver bovino"
                icon="pi pi-angle-right"
                icon-pos="right"
                text
                size="small" /></RouterLink></template></Column
      ></DataTable> </LoadState
    ><Paginator
      v-if="!error && total > 0"
      :first="(page - 1) * pageSize"
      :rows="pageSize"
      :total-records="total"
      :rows-per-page-options="[10, 25, 50, 100]"
      template="PrevPageLink CurrentPageReport NextPageLink RowsPerPageDropdown"
      current-page-report-template="{first}–{last} de {totalRecords}"
      :always-show="true"
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
