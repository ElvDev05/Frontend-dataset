<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import SelectButton from "primevue/selectbutton";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import BreedSelect from "../components/bovines/BreedSelect.vue";
import { bovinesService } from "../services/bovines.service";
import { errorMessage, isConflict } from "../utils/errors";
import { ageRangeOptions, bovineSexOptions } from "../utils/format";
import type { AgeRange, BovineInput, BovineSex } from "../types/api";
const route = useRoute();
const router = useRouter();
const toast = useToast();
const id = Number(route.params.id);
const editing = computed(() => !!id);
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);
const error = ref("");
const conflict = ref(false);
const version = ref("");
const form = reactive({
  identificationCode: "",
  sex: null as BovineSex | null,
  predominantBreedId: null as number | null,
  ageRange: null as AgeRange | null,
  notes: "",
});
async function load() {
  if (!id) return;
  loading.value = true;
  loadError.value = "";
  error.value = "";
  conflict.value = false;
  try {
    const b = await bovinesService.get(id);
    Object.assign(form, b, {
      // Records migrated without an age must choose a range before saving.
      ageRange: b.ageRange === "Unspecified" ? null : b.ageRange,
    });
    version.value = b.version;
  } catch (e) {
    loadError.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (
    !form.identificationCode.trim() ||
    (form.sex !== "Male" && form.sex !== "Female")
  ) {
    error.value = "Completa el código y selecciona el sexo.";
    return;
  }
  if (!form.ageRange || form.ageRange === "Unspecified") {
    error.value = "Selecciona el rango de edad del bovino.";
    return;
  }
  const payload: BovineInput = {
    identificationCode: form.identificationCode.trim(),
    sex: form.sex,
    predominantBreedId: form.predominantBreedId ?? null,
    ageRange: form.ageRange,
    notes: form.notes.trim() || null,
  };
  saving.value = true;
  error.value = "";
  try {
    const result = id
      ? await bovinesService.update(id, { ...payload, version: version.value })
      : await bovinesService.create(payload);
    toast.add({
      severity: "success",
      summary: "Bovino guardado",
      detail: "El registro se guardó correctamente.",
      life: 3500,
    });
    await router.push(`/bovinos/${result.id}`);
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
  <RouterLink :to="id ? `/bovinos/${id}` : '/bovinos'" class="back-link"
    ><i class="pi pi-arrow-left" /> Volver a
    {{ id ? "detalle" : "bovinos" }}</RouterLink
  >
  <PageHeader
    :title="editing ? 'Editar bovino' : 'Registrar bovino'"
    description="Completa su identificación, sexo y rango de edad."
  />
  <LoadState :loading="loading" :error="loadError" @retry="load"
    ><form class="panel form-panel" @submit.prevent="save">
      <Message v-if="error" severity="error"
        >{{ error
        }}<Button
          v-if="conflict"
          label="Descartar cambios y recargar"
          text
          severity="danger"
          @click="load"
      /></Message>
      <fieldset :disabled="saving || conflict">
        <h2>Identificación</h2>
        <div class="form-grid">
          <div class="field">
            <label for="bovine-code">Código de identificación *</label
            ><InputText
              id="bovine-code"
              v-model="form.identificationCode"
              required
              :maxlength="80"
              fluid
              placeholder="Código único del bovino"
            /><small class="muted">Máximo 80 caracteres.</small>
          </div>
          <div class="field">
            <span id="bovine-sex-label">Sexo *</span>
            <SelectButton
              v-model="form.sex"
              :options="bovineSexOptions"
              option-label="label"
              option-value="value"
              :allow-empty="false"
              aria-labelledby="bovine-sex-label"
              aria-required="true"
              :disabled="saving || conflict"
            />
            <small
              v-if="
                editing && form.sex !== 'Male' && form.sex !== 'Female'
              "
              class="field-error"
              >Este registro anterior necesita que indiques su sexo.</small
            >
          </div>
          <div class="field">
            <label for="bovine-breed"
              >Raza predominante <span class="optional">Opcional</span></label
            ><BreedSelect
              v-model="form.predominantBreedId"
              input-id="bovine-breed"
              optional
              :disabled="saving || conflict"
            />
          </div>
        </div>
        <hr />
        <h2>Edad del bovino</h2>
        <div class="form-grid">
          <div class="field">
            <label for="bovine-age-range">Rango de edad *</label
            ><Select
              v-model="form.ageRange"
              input-id="bovine-age-range"
              :options="ageRangeOptions"
              option-label="label"
              option-value="value"
              placeholder="Selecciona un rango"
              aria-label="Rango de edad *"
              :disabled="saving || conflict"
              fluid
            /><small
              v-if="editing && !form.ageRange"
              class="field-error"
              >Este registro anterior necesita que indiques su rango de
              edad.</small
            ><small v-else class="muted"
              >Cada evaluación nueva guarda el rango vigente del bovino.</small
            >
          </div>
        </div>
        <hr />
        <div class="field">
          <label for="bovine-notes"
            >Notas <span class="optional">Opcional</span></label
          ><Textarea
            id="bovine-notes"
            v-model="form.notes"
            :maxlength="4000"
            rows="4"
            auto-resize
            fluid
            placeholder="Información relevante sobre el bovino…"
          /><small class="muted"
            >{{ form.notes.length }} / 4000 caracteres</small
          >
        </div>
      </fieldset>
      <div class="form-actions">
        <Button
          label="Cancelar"
          severity="secondary"
          text
          :disabled="saving"
          @click="router.push(id ? `/bovinos/${id}` : '/bovinos')"
        /><Button
          type="submit"
          label="Guardar bovino"
          icon="pi pi-check"
          :loading="saving"
          :disabled="conflict"
        />
      </div></form
  ></LoadState>
</template>
