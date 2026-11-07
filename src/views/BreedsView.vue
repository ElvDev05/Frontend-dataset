<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useToast } from "primevue/usetoast";
import { useConfirm } from "primevue/useconfirm";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Tag from "primevue/tag";
import Message from "primevue/message";
import PageHeader from "../components/shared/PageHeader.vue";
import LoadState from "../components/shared/LoadState.vue";
import { breedsService } from "../services/breeds.service";
import { useAuthStore } from "../stores/auth";
import { errorMessage, isReferenceConflict } from "../utils/errors";
import type { Breed } from "../types/api";
const auth = useAuthStore();
const toast = useToast();
const confirm = useConfirm();
const items = ref<Breed[]>([]);
const loading = ref(true);
const error = ref("");
const visible = ref(false);
const name = ref("");
const saving = ref(false);
const formError = ref("");
const deletingId = ref<number | null>(null);
const deleteError = ref("");
async function load() {
  loading.value = true;
  error.value = "";
  deleteError.value = "";
  try {
    items.value = await breedsService.list();
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    loading.value = false;
  }
}
function confirmDelete(breed: Breed) {
  if (deletingId.value != null) return;
  deleteError.value = "";
  confirm.require({
    header: "Eliminar raza",
    message: `Se eliminará la raza ${breed.name}. Si está asignada a algún bovino, primero tendrás que cambiar esa ficha. Esta acción no se puede deshacer.`,
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Cancelar",
    acceptLabel: "Eliminar raza",
    acceptProps: { severity: "danger" },
    accept: () => { void deleteBreed(breed); },
  });
}
async function deleteBreed(breed: Breed) {
  deletingId.value = breed.id;
  deleteError.value = "";
  try {
    await breedsService.remove(breed.id, breed.version);
    items.value = items.value.filter(item => item.id !== breed.id);
    toast.add({ severity: "success", summary: "Raza eliminada", life: 3000 });
  } catch (cause) {
    deleteError.value = isReferenceConflict(cause)
      ? `La raza ${breed.name} está asignada a bovinos. Cambia esas fichas antes de eliminarla.`
      : await errorMessage(cause);
  } finally { deletingId.value = null; }
}
async function save() {
  if (!name.value.trim()) {
    formError.value = "Escribe el nombre de la raza.";
    return;
  }
  saving.value = true;
  formError.value = "";
  try {
    await breedsService.create(name.value.trim());
    visible.value = false;
    toast.add({ severity: "success", summary: "Raza registrada", life: 3000 });
    await load();
  } catch (e) {
    formError.value = await errorMessage(e);
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <PageHeader
    title="Razas"
    eyebrow="CATÁLOGO"
    description="Razas disponibles para identificar a los bovinos."
    ><Button
      v-if="auth.isAdministrator"
      label="Registrar raza"
      icon="pi pi-plus"
      @click="
        name = '';
        formError = '';
        visible = true;
      "
  /></PageHeader>
  <section class="panel">
    <div class="panel-heading">
      <h2>Catálogo de razas</h2>
      <Button
        icon="pi pi-refresh"
        text
        aria-label="Actualizar razas"
        :disabled="loading"
        @click="load"
      />
    </div>
    <Message v-if="deleteError" severity="error" class="record-delete-message">{{ deleteError }} <Button label="Recargar razas" text severity="danger" @click="load" /></Message>
    <LoadState
      :loading="loading"
      :error="error"
      :empty="!items.length"
      empty-title="Aún no hay razas registradas"
      :empty-description="
        auth.isAdministrator
          ? 'Agrega la primera raza para comenzar a registrar bovinos.'
          : 'Solicita al administrador que registre las razas disponibles.'
      "
      @retry="load"
      ><DataTable :value="items" data-key="id" striped-rows
        ><Column field="name" header="Nombre de la raza" /><Column
          header="Estado"
          ><template #body="{ data }"
            ><Tag
              :value="data.isActive ? 'Activa' : 'Inactiva'"
              :severity="
                data.isActive ? 'success' : 'secondary'
              " /></template></Column><Column v-if="auth.isAdministrator" header="Acciones"><template #body="{ data }"><Button label="Eliminar" icon="pi pi-trash" severity="danger" text size="small" :loading="deletingId === data.id" :disabled="deletingId != null && deletingId !== data.id" :aria-label="`Eliminar raza ${data.name}`" @click="confirmDelete(data)" /></template></Column></DataTable
    ></LoadState>
  </section>
  <Dialog
    v-model:visible="visible"
    modal
    header="Registrar raza"
    :closable="!saving"
    :close-on-escape="!saving"
    :style="{ width: '30rem', maxWidth: 'calc(100vw - 2rem)' }"
    ><form class="form-stack" @submit.prevent="save">
      <Message v-if="formError" severity="error">{{ formError }}</Message>
      <div class="field">
        <label for="breed-name">Nombre de la raza *</label
        ><InputText
          id="breed-name"
          v-model="name"
          :maxlength="120"
          :disabled="saving"
          required
          fluid
          autofocus
        /><small class="muted">Máximo 120 caracteres.</small>
      </div>
      <div class="form-actions">
        <Button
          label="Cancelar"
          text
          severity="secondary"
          :disabled="saving"
          @click="visible = false"
        /><Button type="submit" label="Guardar raza" :loading="saving" />
      </div></form
  ></Dialog>
</template>
