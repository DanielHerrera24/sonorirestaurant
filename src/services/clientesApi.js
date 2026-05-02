const API_BASE_URL = (import.meta.env.VITE_RENDER_API_URL || "").replace(/\/$/, "");

const buildUrl = (path) => `${API_BASE_URL}${path}`;

async function postJson(path, body, token) {
  if (!API_BASE_URL) {
    const error = new Error(
      "Falta VITE_RENDER_API_URL en tu entorno local. Configura la URL del backend de Render."
    );
    error.code = "missing-api-base-url";
    throw error;
  }

  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    const error = new Error(
      data?.error ||
        (contentType.includes("text/html")
          ? "La URL de la API apunta a una página HTML y no al backend de Render."
          : "La API de clientes devolvió un error.")
    );
    error.code = data?.code;
    error.status = response.status;
    throw error;
  }

  if (!data) {
    const error = new Error(
      "La API respondió sin JSON. Revisa que VITE_RENDER_API_URL apunte al backend correcto."
    );
    error.code = "invalid-api-response";
    error.status = response.status;
    throw error;
  }

  return data;
}

export function checkPhoneStatus(phone) {
  return postJson("/api/clientes/phone-status", { phone: phone.trim() });
}

export function linkPhoneClient({ phone, nombre, token }) {
  return postJson(
    "/api/clientes/link-by-phone",
    { phone: phone.trim(), nombre: nombre?.trim() || "" },
    token
  );
}

export function linkGoogleClient({ nombre, correo, token }) {
  return postJson(
    "/api/clientes/link-google",
    { nombre: nombre?.trim() || "", correo: correo?.trim() || "" },
    token
  );
}