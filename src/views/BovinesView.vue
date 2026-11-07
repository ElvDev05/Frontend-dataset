<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from 'primevue/button';
import Paginator from 'primevue/paginator';
import PageHeader from '../components/shared/PageHeader.vue';
import LoadState from '../components/shared/LoadState.vue';
import { bovinesService } from '../services/bovines.service';
import { evaluationsService } from '../services/evaluations.service';
import { breedsService } from '../services/breeds.service';
import { errorMessage } from '../utils/errors';
import { formatAgeRange, formatDate, formatSex } from '../utils/format';
import { allPages, hasScore, latestByBovine } from '../utils/scoring';
import type { Bovine, Breed, Evaluation } from '../types/api';
type Filter = 'all' | 'scored' | 'pending';
const bovines = ref<Bovine[]>([]);
const breeds = ref<Breed[]>([]);
const latest = ref(new Map<number, Evaluation>());
const loading = ref(true);
const error = ref('');
const filter = ref<Filter>('all');
const page = ref(0);
const evaluated = computed(() => bovines.value.filter(bovine => hasScore(latest.value.get(bovine.id))).length);
const filtered = computed(() => bovines.value.filter(bovine =>
  filter.value === 'all' || hasScore(latest.value.get(bovine.id)) === (filter.value === 'scored')));
const visible = computed(() => filtered.value.slice(page.value * 20, (page.value + 1) * 20));
watch(filter, () => page.value = 0);
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [animals, visits, catalog] = await Promise.all([
      allPages(page => bovinesService.list({ page, pageSize: 100 })),
      allPages(page => evaluationsService.list({ page, pageSize: 100 })),
      breedsService.list(),
    ]);
    bovines.value = animals;
    latest.value = latestByBovine(visits);
    breeds.value = catalog;
    page.value = 0;
  } catch (e) { error.value = await errorMessage(e); }
  finally { loading.value = false; }
}
onMounted(load);
</script>
<template>
  <PageHeader title="Bovinos" description="Consulta el registro y el avance de las evaluaciones.">
    <RouterLink to="/bovinos/nuevo"><Button label="Registrar bovino" icon="pi pi-plus" /></RouterLink>
  </PageHeader>
  <section class="panel bovines-panel">
    <div class="panel-heading">
      <h2>Registro de bovinos <span v-if="!loading && !error" class="count-badge">{{ bovines.length }}</span></h2>
      <Button icon="pi pi-refresh" text severity="secondary" aria-label="Actualizar bovinos" :disabled="loading" @click="load" />
    </div>
    <LoadState :loading="loading" :error="error" @retry="load">
      <div class="bovine-filters" role="group" aria-label="Filtrar bovinos por evaluación">
        <button v-for="option in [
          { value: 'all', label: 'Todos', count: bovines.length },
          { value: 'scored', label: 'Evaluados', count: evaluated },
          { value: 'pending', label: 'No evaluados', count: bovines.length - evaluated },
        ]" :key="option.value" type="button" :aria-pressed="filter === option.value" @click="filter = option.value as Filter">
          {{ option.label }} <span>{{ option.count }}</span>
        </button>
      </div>
      <p v-if="!filtered.length" class="bovine-list-empty" role="status">{{ !bovines.length ? 'Todavía no hay bovinos registrados.' : 'No hay bovinos en este filtro.' }}</p>
      <ul v-else class="bovine-card-list">
        <li v-for="bovine in visible" :key="bovine.id" class="bovine-card">
          <div class="bovine-card-top">
            <h3>{{ bovine.identificationCode }}</h3>
            <span class="score-tag" :class="{ scored: hasScore(latest.get(bovine.id)) }">{{ hasScore(latest.get(bovine.id)) ? 'Evaluado' : 'No evaluado' }}</span>
          </div>
          <dl class="bovine-card-data">
            <div><dt>Sexo:</dt><dd>{{ formatSex(bovine.sex) }}</dd></div>
            <div><dt>Raza:</dt><dd>{{ bovine.predominantBreedId == null ? 'Sin raza registrada' : breeds.find(b => b.id === bovine.predominantBreedId)?.name || `Raza #${bovine.predominantBreedId}` }}</dd></div>
            <div><dt>Edad:</dt><dd>{{ formatAgeRange(bovine.ageRange) }}</dd></div>
            <div v-if="latest.get(bovine.id)"><dt>Última evaluación:</dt><dd>{{ formatDate(latest.get(bovine.id)?.evaluationDate) }}</dd></div>
          </dl>
          <RouterLink :to="`/bovinos/${bovine.id}`" class="bovine-card-action">Ver ficha del animal <i class="pi pi-arrow-right" aria-hidden="true" /></RouterLink>
        </li>
      </ul>
      <Paginator v-if="filtered.length > 20" :first="page * 20" :rows="20" :total-records="filtered.length" template="PrevPageLink CurrentPageReport NextPageLink" current-page-report-template="{first}–{last} de {totalRecords}" @page="page = $event.page" />
    </LoadState>
  </section>
</template>
