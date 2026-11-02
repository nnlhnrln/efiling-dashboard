const TOKEN_KEY = 'efiling_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.json !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : opts.form,
  });
  if (res.status === 401 && !path.startsWith('/login')) {
    setToken('');
    window.dispatchEvent(new Event('efiling:logout'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Permintaan gagal.');
    err.status = res.status;
    err.errors = data.errors;
    err.dup = data.dup;
    throw err;
  }
  return data;
}

export const fileUrl = (idArsip, mode) =>
  `/api/dokumen/${idArsip}/berkas?t=${encodeURIComponent(getToken())}${mode ? `&mode=${mode}` : ''}`;
