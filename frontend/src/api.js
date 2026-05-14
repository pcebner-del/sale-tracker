const BASE = process.env.VITE_API_URL || "https://sale-tracker-production-7059.up.railway.app";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const fetchItems = (category) =>
  request(category && category !== "all" ? `/items?category=${category}` : "/items");

export const addItem = (data) =>
  request("/items", { method: "POST", body: JSON.stringify(data) });

export const deleteItem = (id) =>
  request(`/items/${id}`, { method: "DELETE" });

export const updateItem = (id, data) =>
  request(`/items/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const checkItemNow = (id) =>
  request(`/items/${id}/check`, { method: "POST" });

export const checkAll = () =>
  request("/check-all", { method: "POST" });

export const fetchSettings = () =>
  request("/settings");

export const saveSettings = (data) =>
  request("/settings", { method: "PUT", body: JSON.stringify(data) });

export const testEmail = () =>
  request("/settings/test-email", { method: "POST" });
