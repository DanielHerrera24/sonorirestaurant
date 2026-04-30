const API_BASE_URL = (import.meta.env.VITE_RENDER_API_URL || "").replace(/\/$/, "");

const buildUrl = (path) => `${API_BASE_URL}${path}`;

async function postJson(path, body, token) {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || "La API de clientes devolvió un error.");
    error.code = data?.code;
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