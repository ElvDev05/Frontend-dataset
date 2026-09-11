<script setup lang="ts">
import Button from "primevue/button";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
defineProps<{
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <div v-if="loading" class="empty-state" role="status">
    <ProgressSpinner
      style="width: 36px; height: 36px"
      aria-label="Cargando datos"
    />
    <p>Cargando datos…</p>
  </div>
  <Message v-else-if="error" severity="error" :closable="false"
    ><div class="error-content">
      <span>{{ error }}</span
      ><Button
        label="Reintentar"
        icon="pi pi-refresh"
        severity="danger"
        text
        @click="$emit('retry')"
      /></div
  ></Message>
  <div v-else-if="empty" class="empty-state">
    <i class="pi pi-inbox empty-icon" aria-hidden="true" />
    <h3>{{ emptyTitle || "Todavía no hay registros" }}</h3>
    <p class="muted">
      {{
        emptyDescription || "Los registros aparecerán aquí cuando los agregues."
      }}
    </p>
    <slot name="empty" />
  </div>
  <slot v-else />
</template>
