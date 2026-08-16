// In production, nginx proxies /api/* to the backend on the same origin
// (see frontend/nginx.conf), so relative paths are all we need — no env
// var required, and no risk of it pointing at the wrong URL. For local dev
// (vite dev server, no nginx in front), set VITE_API_URL to talk to the
// backend directly.
export const API_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include', // send HttpOnly auth cookies
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? 'UNKNOWN_ERROR', body?.error?.message ?? 'Something went wrong', res.status);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'DELETE', body: data ? JSON.stringify(data) : undefined }),
  // Separate from request() because file uploads use multipart/form-data —
  // the browser sets that header (with the correct boundary) itself, so we
  // must NOT set a Content-Type header manually here.
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    const isJson = res.headers.get('content-type')?.includes('application/json');
    const body = isJson ? await res.json() : null;
    if (!res.ok) {
      throw new ApiError(body?.error?.code ?? 'UNKNOWN_ERROR', body?.error?.message ?? 'Upload failed', res.status);
    }
    return body as T;
  },
};
