<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { evaluationsService } from '../../services/evaluations.service';
import { canScore, hasRequiredScorePhotos, validScore } from '../../utils/scoring';
import { errorMessage, isConflict } from '../../utils/errors';
import { formatNumber } from '../../utils/format';
import type { Evaluation } from '../../types/api';
const model = defineModel<Evaluation>({ required: true });
const props = defineProps<{ disabled: boolean; removing?: boolean }>();
const emit = defineEmits<{ reload: [] }>();
const score = ref<number | null>(model.value.bodyConditionScore);
const busy = ref(false);
const error = ref('');
const conflict = ref(false);
const saved = ref(false);
const options = Array.from({ length: 17 }, (_, index) => 1 + index * .25);
const dirty = computed(() => score.value !== model.value.bodyConditionScore);
watch(() => model.value.bodyConditionScore, value => { if (!busy.value) score.value = value; });
async function save() {
  const evaluation = model.value;
  if (!canScore(evaluation) || !validScore(score.value) || props.disabled || busy.value || conflict.value || !dirty.value) return;
  busy.value = true;
  error.value = '';
  try {
    model.value = await evaluationsService.update(evaluation.id, {
      evaluationDate: evaluation.evaluationDate, weightKg: evaluation.weightKg,
      specialistId: evaluation.specialistId, notes: evaluation.notes,
      bodyConditionScore: score.value, version: evaluation.version,
    });
    score.value = model.value.bodyConditionScore;
    saved.value = true;
  } catch (e) { error.value = await errorMessage(e); conflict.value = isConflict(e); }
  finally { busy.value = false; }
}
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; } }
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(to => to.name === 'login' || props.removing || (!busy.value && (!dirty.value || window.confirm('El puntaje todavía no se guardó. ¿Quieres salir?'))));
</script>
<template>
  <section class="panel score-panel" aria-labelledby="score-title">
    <div class="score-panel-head"><h2 id="score-title">Condición corporal</h2><strong v-if="model.bodyConditionScore != null">{{ formatNumber(model.bodyConditionScore) }} / 5</strong></div>
    <div v-if="model.status === 'Complete'" class="score-guidance"><i class="pi pi-lock" aria-hidden="true" /><p>Evaluación cerrada. El puntaje ya no puede modificarse.</p></div>
    <div v-else-if="model.status === 'Rejected'" class="score-guidance"><i class="pi pi-lock" aria-hidden="true" /><p>Evaluación rechazada. Solicita su reapertura para modificarla.</p></div>
    <div v-else-if="!hasRequiredScorePhotos(model)" class="score-guidance"><i class="pi pi-images" aria-hidden="true" /><p>Carga la vista lateral derecha y la posterior para asignar el puntaje.</p></div>
    <template v-if="canScore(model)">
      <p class="muted">Elige el puntaje tras revisar las fotografías.</p>
      <fieldset class="score-choices" :disabled="disabled || busy || conflict">
        <legend class="sr-only">Seleccionar puntaje de condición corporal</legend>
        <label v-for="option in options" :key="option" :class="{ selected: score === option }">
          <input v-model="score" type="radio" name="body-condition-score" :value="option" @change="saved = false" />
          {{ formatNumber(option) }}
        </label>
      </fieldset>
      <Message v-if="error" severity="error">{{ error }} <Button v-if="conflict" label="Recargar" text @click="emit('reload')" /></Message>
      <p v-if="saved" class="score-saved" role="status"><i class="pi pi-check-circle" aria-hidden="true" /> Puntaje guardado.</p>
      <Button label="Guardar puntaje" icon="pi pi-check" :loading="busy" :disabled="disabled || conflict || !validScore(score) || !dirty" @click="save" />
    </template>
  </section>
</template>
