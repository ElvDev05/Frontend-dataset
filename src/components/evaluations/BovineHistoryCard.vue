<script setup lang="ts">
import Button from 'primevue/button';
import { formatDate, formatNumber } from '../../utils/format';
import type { Evaluation } from '../../types/api';
defineProps<{ evaluation: Evaluation }>();
</script>
<template>
  <li class="history-card">
    <div class="history-card-top">
      <div><h3>Evaluación #{{ evaluation.id }}</h3><p>{{ formatDate(evaluation.evaluationDate) }}</p></div>
      <span class="score-tag" :class="{ scored: evaluation.bodyConditionScore != null && evaluation.status !== 'Rejected' }">{{ evaluation.bodyConditionScore == null || evaluation.status === 'Rejected' ? 'Sin puntaje' : 'Con puntaje' }}</span>
    </div>
    <p v-if="evaluation.bodyConditionScore != null && evaluation.status !== 'Rejected'" class="history-card-score">Condición corporal: <strong>{{ formatNumber(evaluation.bodyConditionScore) }} / 5</strong></p>
    <RouterLink :to="`/evaluaciones/${evaluation.id}`"><Button label="Ver evaluación" icon="pi pi-arrow-right" icon-pos="right" outlined severity="secondary" size="small" /></RouterLink>
  </li>
</template>
