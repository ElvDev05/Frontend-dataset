<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Drawer from "primevue/drawer";
import { useAuthStore } from "../stores/auth";
import { roleLabels } from "../utils/format";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const navigation = [
  { to: "/bovinos", label: "Bovinos", icon: "pi pi-th-large" },
  { to: "/evaluaciones", label: "Evaluaciones", icon: "pi pi-clipboard" },
  { to: "/razas", label: "Razas", icon: "pi pi-tags" },
  { to: "/especialistas", label: "Especialistas", icon: "pi pi-users" },
  { to: "/exportacion", label: "Exportar datos", icon: "pi pi-download" },
];
watch(
  () => route.path,
  () => {
    menuOpen.value = false;
  },
);
async function logout() {
  auth.logout();
  await router.replace("/ingresar");
}
</script>
<template>
  <a href="#contenido" class="skip-link">Saltar al contenido</a>
  <div class="app-shell">
    <aside class="sidebar">
      <RouterLink to="/bovinos" class="brand"
        ><img src="/favicon.svg" alt="" /><span
          >Registro Bovino<small>CAPTURA DE DATOS</small></span
        ></RouterLink
      >
      <div class="nav-label">ESPACIO DE TRABAJO</div>
      <nav aria-label="Navegación principal">
        <RouterLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="{ active: route.path.startsWith(item.to) }"
          ><i :class="item.icon" aria-hidden="true" />{{ item.label
          }}<i class="pi pi-angle-right nav-arrow" aria-hidden="true"
        /></RouterLink>
      </nav>
      <div class="field-note">
        <i class="pi pi-camera" aria-hidden="true" /><strong
          >Un registro, cobertura confiable</strong
        >
        <p>Lateral derecha y posterior para evaluar.</p>
      </div>
      <div class="sidebar-footer">
        <span class="status-dot" /> Aplicación de campo <small>v1.0</small>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <Button
          class="mobile-menu"
          icon="pi pi-bars"
          text
          aria-label="Abrir menú de navegación"
          @click="menuOpen = true"
        />
        <div class="breadcrumb">
          Conjunto de datos
          <i class="pi pi-angle-right" aria-hidden="true" /><span>{{
            route.meta.title
          }}</span>
        </div>
        <div class="user-menu">
          <div class="avatar">
            {{ auth.user?.displayName.charAt(0).toUpperCase() }}
          </div>
          <div class="user-copy">
            <strong>{{ auth.user?.displayName }}</strong
            ><small>{{ auth.user ? roleLabels[auth.user.role] : "" }}</small>
          </div>
          <Button
            icon="pi pi-sign-out"
            text
            severity="secondary"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            @click="logout"
          />
        </div>
      </header>
      <main id="contenido" class="main-content">
        <RouterView :key="route.path" />
      </main>
      <footer class="workspace-footer">
        Registro Bovino <span>Datos consistentes. Mejores evaluaciones.</span>
      </footer>
    </div>
  </div>
  <Drawer v-model:visible="menuOpen" header="Registro Bovino"
    ><nav class="drawer-nav" aria-label="Navegación móvil">
      <RouterLink v-for="item in navigation" :key="item.to" :to="item.to"
        ><i :class="item.icon" aria-hidden="true" />{{ item.label }}</RouterLink
      >
    </nav></Drawer
  >
</template>
