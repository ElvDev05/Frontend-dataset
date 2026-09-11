import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import ToastService from "primevue/toastservice";
import ConfirmationService from "primevue/confirmationservice";
import "primeicons/primeicons.css";
import "./assets/main.css";
import App from "./App.vue";
import { router } from "./router";
import { useAuthStore } from "./stores/auth";
import { configureHttpSession } from "./services/http";
import { primeLocale } from "./utils/primeLocale";

const app = createApp(App);
app.use(createPinia());
const auth = useAuthStore();
function expireSession() {
  auth.logout("Tu sesión venció o dejó de ser válida. Inicia sesión de nuevo.");
  if (router.currentRoute.value.name !== "login")
    void router.replace({
      name: "login",
      query: { redirect: router.currentRoute.value.fullPath },
    });
}
configureHttpSession(auth.getToken, expireSession);
window.addEventListener("session-expired", expireSession);
app.use(PrimeVue, {
  theme: { preset: Aura, options: { darkModeSelector: false } },
  locale: primeLocale,
});
app.use(ToastService).use(ConfirmationService).use(router).mount("#app");
