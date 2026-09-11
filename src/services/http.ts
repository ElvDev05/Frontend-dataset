import axios from "axios";

export const http = axios.create({
  baseURL: `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:5080").replace(/\/+$/, "")}/api/v1`,
  timeout: 120_000,
  headers: { Accept: "application/json", "Cache-Control": "no-store" },
});

export function configureHttpSession(
  getToken: () => string | null,
  expireSession: () => void,
) {
  http.interceptors.request.use((config) => {
    if (!config.url?.includes("/authentication/sign-in")) {
      const token = getToken();
      if (token) config.headers.set("Authorization", `Bearer ${token}`);
    }
    return config;
  });
  http.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
      if (
        axios.isAxiosError(error) &&
        error.response?.status === 401 &&
        !error.config?.url?.includes("/authentication/sign-in")
      )
        expireSession();
      return Promise.reject(error);
    },
  );
}
