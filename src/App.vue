<script setup lang="ts">
import Toast from "primevue/toast";
import ConfirmDialog from "primevue/confirmdialog";
import PwaNotice from "./components/shared/PwaNotice.vue";
</script>
<template>
  <RouterView />
  <Toast
    position="top-right"
    :breakpoints="{ '640px': { width: 'calc(100% - 2rem)', right: '1rem' } }"
  />
  <ConfirmDialog :style="{ width: '28rem', maxWidth: 'calc(100vw - 2rem)' }" />
  <PwaNotice />
</template>
