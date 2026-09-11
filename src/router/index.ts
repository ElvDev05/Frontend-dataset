import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import AppLayout from "../layouts/AppLayout.vue";

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/ingresar",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: { public: true, title: "Iniciar sesión" },
    },
    {
      path: "/",
      component: AppLayout,
      children: [
        { path: "", redirect: "/bovinos" },
        {
          path: "bovinos",
          component: () => import("../views/BovinesView.vue"),
          meta: { title: "Bovinos" },
        },
        {
          path: "bovinos/nuevo",
          component: () => import("../views/BovineFormView.vue"),
          meta: { title: "Registrar bovino" },
        },
        {
          path: "bovinos/:id(\\d+)",
          component: () => import("../views/BovineDetailView.vue"),
          meta: { title: "Detalle del bovino" },
        },
        {
          path: "bovinos/:id(\\d+)/editar",
          component: () => import("../views/BovineFormView.vue"),
          meta: { title: "Editar bovino" },
        },
        {
          path: "bovinos/:bovineId(\\d+)/evaluaciones/nueva",
          component: () => import("../views/EvaluationFormView.vue"),
          meta: { title: "Nueva evaluación" },
        },
        {
          path: "evaluaciones",
          component: () => import("../views/EvaluationsView.vue"),
          meta: { title: "Evaluaciones" },
        },
        {
          path: "evaluaciones/:id(\\d+)",
          component: () => import("../views/EvaluationDetailView.vue"),
          meta: { title: "Detalle de evaluación" },
        },
        {
          path: "evaluaciones/:id(\\d+)/editar",
          component: () => import("../views/EvaluationFormView.vue"),
          meta: { title: "Editar evaluación" },
        },
        {
          path: "razas",
          component: () => import("../views/BreedsView.vue"),
          meta: { title: "Razas" },
        },
        {
          path: "especialistas",
          component: () => import("../views/SpecialistsView.vue"),
          meta: { title: "Especialistas" },
        },
        {
          path: "exportacion",
          component: () => import("../views/ExportView.vue"),
          meta: { title: "Exportar datos" },
        },
        {
          path: ":pathMatch(.*)*",
          component: () => import("../views/NotFoundView.vue"),
          meta: { title: "Página no encontrada" },
        },
      ],
    },
  ],
});
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.restore();
  if (!to.meta.public && (!auth.getToken() || !auth.isAuthenticated))
    return { name: "login", query: { redirect: to.fullPath } };
  if (to.name === "login" && auth.isAuthenticated) return "/bovinos";
});
router.afterEach((to) => {
  document.title = `${String(to.meta.title || "Registro")} · Registro Bovino`;
});
