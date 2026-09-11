<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Password from "primevue/password";
import Message from "primevue/message";
import { useAuthStore } from "../stores/auth";
import { errorMessage } from "../utils/errors";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const username = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");
async function submit() {
  if (!username.value.trim() || !password.value) {
    error.value = "Completa el usuario y la contraseña.";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    await auth.signIn({
      username: username.value.trim(),
      password: password.value,
    });
    password.value = "";
    const redirect =
      typeof route.query.redirect === "string" ? route.query.redirect : "";
    await router.replace(
      redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.includes("\\") &&
        !redirect.startsWith("/ingresar")
        ? redirect
        : "/bovinos",
    );
  } catch (e) {
    error.value = await errorMessage(e);
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="login-page">
    <section class="login-intro">
      <div class="brand">
        <img src="/favicon.svg" alt="" /><span
          >Registro Bovino<small>CAPTURA DE DATOS</small></span
        >
      </div>
      <div class="login-story">
        <span class="eyebrow">DEL CAMPO AL CONOCIMIENTO</span>
        <h1>
          Cada bovino.<br />Cada detalle.<br /><span>Un mejor registro.</span>
        </h1>
        <p>
          Reúne identificación, evaluaciones y fotografías en un solo lugar,
          desde donde trabajas.
        </p>
        <div class="login-steps">
          <span><i class="pi pi-tag" /> Identifica</span
          ><span><i class="pi pi-clipboard" /> Evalúa</span
          ><span><i class="pi pi-camera" /> Captura</span>
        </div>
      </div>
      <small>Una herramienta para construir datos de calidad.</small>
    </section>
    <section class="login-form-panel">
      <div class="login-form-wrap">
        <span class="eyebrow">BIENVENIDO A TU ESPACIO</span>
        <h2>Iniciar sesión</h2>
        <p class="muted">Ingresa con tu cuenta para continuar el registro.</p>
        <form class="form-stack" @submit.prevent="submit">
          <Message v-if="error || auth.sessionError" severity="error">{{
            error || auth.sessionError
          }}</Message>
          <div class="field">
            <label for="username">Usuario</label
            ><InputText
              id="username"
              v-model="username"
              autocomplete="username"
              :maxlength="100"
              required
              :disabled="busy"
              fluid
              placeholder="Tu nombre de usuario"
            />
          </div>
          <div class="field">
            <label for="password">Contraseña</label
            ><Password
              v-model="password"
              input-id="password"
              :feedback="false"
              toggle-mask
              :input-props="{ required: true, maxlength: 128, autocomplete: 'current-password' }"
              :disabled="busy"
              fluid
            />
          </div>
          <Button
            type="submit"
            label="Ingresar"
            icon="pi pi-arrow-right"
            icon-pos="right"
            :loading="busy"
            fluid
          />
        </form>
        <p class="login-help">
          <i class="pi pi-lock" aria-hidden="true" /> ¿Necesitas una cuenta?
          Contacta al administrador.
        </p>
      </div>
      <small class="muted"
        >Necesitas conexión para consultar y guardar datos.</small
      >
    </section>
  </main>
</template>
