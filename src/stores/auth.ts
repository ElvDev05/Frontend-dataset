import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { authenticationService } from "../services/authentication.service";
import { errorMessage } from "../utils/errors";
import type { SignIn, User } from "../types/api";

const sessionKey = "bovine-session";
export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(null);
  const expiresAt = ref<string | null>(null);
  const user = ref<User | null>(null);
  const sessionError = ref("");
  let restored = false;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;
  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const isAdministrator = computed(() => user.value?.role === "Administrator");
  function logout(reason = "") {
    token.value = null;
    expiresAt.value = null;
    user.value = null;
    sessionError.value = reason;
    clearTimeout(expiryTimer);
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* Memory-only session in restricted browsers. */
    }
  }
  function getToken() {
    if (expiresAt.value && Date.parse(expiresAt.value) <= Date.now())
      logout("Tu sesión venció. Inicia sesión de nuevo.");
    return token.value;
  }
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    expiryTimer = setTimeout(
      () => {
        logout("Tu sesión venció. Inicia sesión de nuevo.");
        window.dispatchEvent(new Event("session-expired"));
      },
      Math.max(0, Date.parse(expiresAt.value!) - Date.now()),
    );
  }
  async function restore() {
    if (restored) return;
    restored = true;
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return;
      const saved: unknown = JSON.parse(raw);
      if (
        !saved ||
        typeof saved !== "object" ||
        !("accessToken" in saved) ||
        typeof saved.accessToken !== "string" ||
        !("expiresAt" in saved) ||
        typeof saved.expiresAt !== "string" ||
        !Number.isFinite(Date.parse(saved.expiresAt)) ||
        Date.parse(saved.expiresAt) <= Date.now()
      ) {
        logout();
        return;
      }
      token.value = saved.accessToken;
      expiresAt.value = saved.expiresAt;
      user.value = await authenticationService.me();
      scheduleExpiry();
    } catch (error) {
      logout(await errorMessage(error));
    }
  }
  async function signIn(body: SignIn) {
    const result = await authenticationService.signIn(body);
    token.value = result.accessToken;
    expiresAt.value = result.expiresAt;
    try {
      user.value = await authenticationService.me();
      try {
        sessionStorage.setItem(
          sessionKey,
          JSON.stringify({
            accessToken: token.value,
            expiresAt: expiresAt.value,
          }),
        );
      } catch {
        /* Retain memory-only session. */
      }
      sessionError.value = "";
      restored = true;
      scheduleExpiry();
    } catch (error) {
      logout();
      throw error;
    }
  }
  return {
    user,
    token,
    sessionError,
    isAuthenticated,
    isAdministrator,
    getToken,
    signIn,
    logout,
    restore,
  };
});
