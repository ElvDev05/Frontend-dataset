<script setup lang="ts">
import Button from "primevue/button";
</script>
<template>
  <div class="empty-state">
    <span class="eyebrow">404</span>
    <h1>Página no encontrada</h1>
    <p class="muted">
      La dirección no corresponde a una página de la aplicación.
    </p>
    <RouterLink to="/bovinos"
      ><Button label="Ir a Bovinos" icon="pi pi-arrow-left"
    /></RouterLink>
  </div>
</template>
