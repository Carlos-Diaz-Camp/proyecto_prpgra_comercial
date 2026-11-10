let token = null;
let refreshing = null;
export function setToken(value) {
  token = value;
}
export async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const csrf = document.cookie
        .split("; ")
        .find((v) => v.startsWith("csrf_token="))
        ?.split("=")[1];
      if (!csrf) throw new Error("Inicia sesión.");
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "X-CSRF-Token": decodeURIComponent(csrf) },
        credentials: "same-origin",
      });
      if (!response.ok) {
        token = null;
        throw new Error("Inicia sesión de nuevo.");
      }
      const data = await response.json();
      token = data.access_token;
      return data;
    })().finally(() => {
      refreshing = null;
    });
  return refreshing;
}
export async function api(path, options = {}, retry = true) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (
    response.status === 401 &&
    retry &&
    !["/auth/login", "/auth/refresh"].includes(path)
  ) {
    try {
      await refreshSession();
    } catch {
      window.dispatchEvent(new Event("session-expired"));
      throw new Error("Tu sesión venció. Inicia sesión de nuevo.");
    }
    return api(path, options, false);
  }
  const value = await response.json();
  if (!response.ok) {
    const detail = value.detail;
    const error = new Error(
      typeof detail === "string"
        ? detail
        : detail?.message ||
            (Array.isArray(detail)
              ? "Revisa los campos del formulario."
              : "No se pudo completar la operación."),
    );
    error.detail = detail;
    throw error;
  }
  return value;
}
