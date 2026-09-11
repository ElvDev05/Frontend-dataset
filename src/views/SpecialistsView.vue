<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import ToggleSwitch from "primevue/toggleswitch";
import Dialog from "primevue/dialog";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import { specialistsService } from "../services/specialists.service";
import { useAuthStore } from "../stores/auth";
import { errorMessage, isConflict } from "../utils/errors";
import type { Specialist } from "../types/api";
const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();
const items = ref<Specialist[]>([]);
const loading = ref(true);
const error = ref("");
const visible = ref(false);
const current = ref<Specialist>();
const fullName = ref("");
const active = ref(true);
const saving = ref(false);
const formError = ref("");
const conflict = ref(false);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    items.value = await specialistsService.list();
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function open(s?: Specialist) {
  current.value = s;
  fullName.value = s?.fullName || "";
  active.value = s?.isActive ?? true;
  formError.value = "";
  conflict.value = false;
  visible.value = true;
}
async function save() {
  saving.value = true;
  formError.value = "";
  try {
    if (current.value)
      await specialistsService.update(current.value.id, {
        version: current.value.version,
        fullName: fullName.value.trim(),
        isActive: active.value,
      });
    else await specialistsService.create(fullName.value.trim());
    visible.value = false;
    toast.add({
      severity: "success",
      summary: "Especialista guardado",
      life: 3000,
    });
    await load();
  } catch (e) {
    formError.value = await errorMessage(e);
    conflict.value = isConflict(e);
  } finally {
    saving.value = false;
  }
}
function submit() {
  if (!fullName.value.trim()) {
    formError.value = "Escribe el nombre completo del especialista.";
    return;
  }
  if (current.value?.isActive && !active.value)
    confirm.require({
      header: "Desactivar especialista",
      message:
        "Dejará de estar disponible para nuevas evaluaciones y no se podrán completar evaluaciones que lo tengan asignado.",
      icon: "pi pi-exclamation-triangle",
      rejectLabel: "Cancelar",
      acceptLabel: "Desactivar",
      acceptProps: { severity: "danger" },
      accept: () => {
        void save();
      },
    });
  else void save();
}
async function reloadForm() {
  await load();
  if (!error.value && current.value) {
    const fresh = items.value.find((s) => s.id === current.value?.id);
    if (fresh) open(fresh);
    else visible.value = false;
  }
}
onMounted(load);
</script>
<template>
  <PageHeader
    title="Especialistas"
    eyebrow="EQUIPO DE CAMPO"
    description="Profesionales responsables de las evaluaciones."
    ><Button label="Registrar especialista" icon="pi pi-plus" @click="open()"
  /></PageHeader>
  <section class="panel">
    <div class="panel-heading">
      <h2>Especialistas registrados</h2>
      <Button
        icon="pi pi-refresh"
        text
        aria-label="Actualizar especialistas"
        :disabled="loading"
        @click="load"
      />
    </div>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-title="Registra a tu primer especialista"
      empty-description="Podrás asignarlo a las evaluaciones del ganado."
      @retry="load"
      ><DataTable
        :value="items"
        data-key="id"
        striped-rows
        table-style="min-width: 440px"
        ><Column field="fullName" header="Nombre completo" /><Column
          header="Estado"
          ><template #body="{ data }"
            ><Tag
              :value="data.isActive ? 'Activo' : 'Inactivo'"
              :severity="
                data.isActive ? 'success' : 'secondary'
              " /></template></Column
        ><Column v-if="auth.isAdministrator" header="Acciones"
          ><template #body="{ data }"
            ><Button
              label="Editar"
              icon="pi pi-pencil"
              text
              size="small"
              @click="open(data)" /></template></Column></DataTable
    ></LoadState>
  </section>
  <Dialog
    v-model:visible="visible"
    modal
    :header="current ? 'Editar especialista' : 'Registrar especialista'"
    :closable="!saving"
    :close-on-escape="!saving"
    :style="{ width: '32rem', maxWidth: 'calc(100vw - 2rem)' }"
    ><form class="form-stack" @submit.prevent="submit">
      <Message v-if="formError" severity="error"
        >{{ formError
        }}<Button
          v-if="conflict"
          label="Descartar cambios y recargar"
          text
          severity="danger"
          @click="reloadForm"
      /></Message>
      <div class="field">
        <label for="specialist-name">Nombre completo *</label
        ><InputText
          id="specialist-name"
          v-model="fullName"
          :maxlength="160"
          :disabled="saving || conflict"
          required
          fluid
          autofocus
        />
      </div>
      <div v-if="current" class="toggle-field">
        <ToggleSwitch
          v-model="active"
          input-id="specialist-active"
          :disabled="saving || conflict"
        /><label for="specialist-active">Especialista activo</label>
      </div>
      <div class="form-actions">
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="saving"
          @click="visible = false"
        /><Button
          type="submit"
          label="Guardar especialista"
          :loading="saving"
          :disabled="conflict"
        />
      </div></form
  ></Dialog>
</template>
