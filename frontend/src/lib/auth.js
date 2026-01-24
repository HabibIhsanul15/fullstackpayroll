const TOKEN_KEY = "payroll_token";
const USER_KEY  = "payroll_user";

// ✅ pakai sessionStorage (hilang kalau tab ditutup)
const storage = window.sessionStorage;

function notifyAuthChanged() {
  window.dispatchEvent(new Event("auth:changed"));
}

export function saveAuth(token, user) {
  if (token) storage.setItem(TOKEN_KEY, token);
  else storage.removeItem(TOKEN_KEY);

  if (user) storage.setItem(USER_KEY, JSON.stringify(user));
  else storage.removeItem(USER_KEY);

  notifyAuthChanged();
}

export function updateAuthUser(patch) {
  const raw = storage.getItem(USER_KEY);
  if (!raw || raw === "undefined" || raw === "null") return;

  let u = null;
  try { u = JSON.parse(raw); } catch { return; }
  if (!u) return;

  const next = { ...u, ...patch };
  storage.setItem(USER_KEY, JSON.stringify(next));

  notifyAuthChanged();
}

export function getToken() {
  return storage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = storage.getItem(USER_KEY);
  if (!raw || raw === "undefined" || raw === "null") return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Invalid payroll_user in storage:", raw);
    storage.removeItem(USER_KEY);
    return null;
  }
}

export function clearAuth() {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  notifyAuthChanged();
}

export function isAuthed() {
  return !!getToken();
}
