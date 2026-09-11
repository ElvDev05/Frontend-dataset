<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import SelectButton from "primevue/selectbutton";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import BreedSelect from "../components/bovines/BreedSelect.vue";
import { bovinesService } from "../services/bovines.service";
import { errorMessage, isConflict } from "../utils/errors";
import { bovineSexOptions, utcToday } from "../utils/format";
import type { BovineInput, BovineSex } from "../types/api";
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
const ageMode = ref("birth");
const modes = [
  { label: "Fecha de nacimiento", value: "birth" },
  { label: "Edad estimada", value: "estimated" },
];
const form = reactive({
  identificationCode: "",
  sex: null as BovineSex | null,
  predominantBreedId: null as number | null,
  birthDate: "",
  estimatedAgeMonths: null as number | null,
  ageReferenceDate: "",
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
      birthDate: b.birthDate || "",
      ageReferenceDate: b.ageReferenceDate || "",
    });
    version.value = b.version;
    ageMode.value = b.birthDate ? "birth" : "estimated";
  } catch (e) {
    loadError.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
async function save() {
  if (
    !form.identificationCode.trim() ||
    (form.sex !== "Male" && form.sex !== "Female") ||
    !form.predominantBreedId
  ) {
    error.value = "Completa el código, selecciona el sexo y elige una raza.";
    return;
  }
  if (
    ageMode.value === "birth"
      ? !form.birthDate
      : form.estimatedAgeMonths == null || !form.ageReferenceDate
  ) {
    error.value = "Completa la información de edad seleccionada.";
    return;
  }
  const payload: BovineInput = {
    identificationCode: form.identificationCode.trim(),
    sex: form.sex,
    predominantBreedId: form.predominantBreedId,
    birthDate: ageMode.value === "birth" ? form.birthDate : null,
    estimatedAgeMonths:
      ageMode.value === "estimated" ? form.estimatedAgeMonths : null,
    ageReferenceDate:
      ageMode.value === "estimated" ? form.ageReferenceDate : null,
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
    description="Completa su identificación, sexo y la información disponible sobre su edad."
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
            <label for="bovine-breed">Raza predominante *</label
            ><BreedSelect
              v-model="form.predominantBreedId"
              input-id="bovine-breed"
              :disabled="saving || conflict"
            />
          </div>
        </div>
        <hr />
        <h2>Edad del bovino</h2>
        <p class="muted">
          Elige una de las dos opciones. La edad de cada evaluación la calcula
          el servidor.
        </p>
        <SelectButton
          v-model="ageMode"
          :options="modes"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          aria-label="Forma de registrar la edad"
          :disabled="saving || conflict"
        />
        <div class="form-grid spaced">
          <div v-if="ageMode === 'birth'" class="field">
            <label for="birth-date">Fecha de nacimiento *</label
            ><InputText
              id="birth-date"
              v-model="form.birthDate"
              type="date"
              required
              :max="utcToday()"
              fluid
            />
          </div>
          <template v-else
            ><div class="field">
              <label for="estimated-age">Edad estimada en meses *</label
              ><InputNumber
                v-model="form.estimatedAgeMonths"
                input-id="estimated-age"
                :min="0"
                :max="600"
                :max-fraction-digits="0"
                :use-grouping="false"
                :input-props="{ required: true }"
                fluid
              /><small class="muted">Entre 0 y 600 meses.</small>
            </div>
            <div class="field">
              <label for="reference-date"
                >Fecha de referencia de la edad *</label
              ><InputText
                id="reference-date"
                v-model="form.ageReferenceDate"
                type="date"
                required
                :max="utcToday()"
                fluid
              /><small class="muted"
                >Fecha en la que tenía la edad indicada.</small
              >
            </div></template
          >
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
