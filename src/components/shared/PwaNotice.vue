<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import Button from "primevue/button";
import Message from "primevue/message";
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const offline = ref(!navigator.onLine);
const installPrompt = ref<InstallEvent | null>(null);
const { needRefresh, updateServiceWorker } = useRegisterSW();
const updateConnection = () => {
  offline.value = !navigator.onLine;
};
const captureInstall = (event: Event) => {
  event.preventDefault();
  installPrompt.value = event as InstallEvent;
};
const installed = () => {
  installPrompt.value = null;
};
async function install() {
  if (!installPrompt.value) return;
  await installPrompt.value.prompt();
  await installPrompt.value.userChoice;
  installPrompt.value = null;
}
onMounted(() => {
  window.addEventListener("online", updateConnection);
  window.addEventListener("offline", updateConnection);
  window.addEventListener("beforeinstallprompt", captureInstall);
  window.addEventListener("appinstalled", installed);
});
onUnmounted(() => {
  window.removeEventListener("online", updateConnection);
  window.removeEventListener("offline", updateConnection);
  window.removeEventListener("beforeinstallprompt", captureInstall);
  window.removeEventListener("appinstalled", installed);
});
</script>
<template>
  <div class="pwa-notices" aria-live="polite">
    <Message v-if="offline" severity="warn"
      >Sin conexión. Conéctate para consultar o guardar datos; los formularios
      no se guardan sin conexión.</Message
    >
    <Message v-if="needRefresh" severity="info"
      ><div class="error-content">
        <span
          >Hay una nueva versión. Guarda tus cambios antes de actualizar.</span
        ><Button
          label="Actualizar"
          size="small"
          @click="updateServiceWorker(true)"
        /><Button
          label="Más tarde"
          size="small"
          text
          @click="needRefresh = false"
        /></div
    ></Message>
    <div v-if="installPrompt && !offline" class="install-prompt">
      <i class="pi pi-mobile" aria-hidden="true" /><span
        >Registro Bovino en tu pantalla de inicio</span
      ><Button label="Instalar" size="small" @click="install" /><Button
        icon="pi pi-times"
        text
        rounded
        aria-label="Cerrar sugerencia de instalación"
        @click="installPrompt = null"
      />
    </div>
  </div>
</template>
