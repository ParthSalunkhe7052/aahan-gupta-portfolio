/** Thin client for the site API (see docs/SPEC.md section 6). */
import type { Content, MediaAsset } from '@shared/schema';

const CSRF = { 'X-Requested-With': 'aahan' } as const;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function messageOf(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return fallback;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') Object.assign(headers, CSRF);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      credentials: 'same-origin',
      cache: method === 'GET' ? 'no-store' : undefined,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'The server could not be reached.', null);
  }
  const data = await parse(res);
  if (!res.ok) throw new ApiError(res.status, messageOf(data, 'The request failed.'), data);
  return data as T;
}

/** multipart upload through XHR so the editor can show progress. */
function upload<T>(url: string, file: File, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-Requested-With', CSRF['X-Requested-With']);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onerror = () => reject(new ApiError(0, 'The upload could not reach the server.', null));
    xhr.onload = () => {
      let data: unknown = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* no body */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, messageOf(data, 'The upload failed.'), data));
    };
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

export const api = {
  content: () => request<Content>('GET', '/api/content'),
  session: () => request<{ admin: boolean }>('GET', '/api/auth/session'),
  login: (password: string) => request<null>('POST', '/api/auth/login', { password }),
  logout: () => request<null>('POST', '/api/auth/logout'),
  saveContent: (doc: Content) => request<Content>('PUT', '/api/content', doc),
  changePassword: (current: string, next: string) => request<null>('POST', '/api/auth/password', { current, next }),
  uploadMedia: (file: File, onProgress?: (fraction: number) => void) =>
    upload<MediaAsset>('/api/media', file, onProgress),
  uploadFile: (file: File, kind: 'pdf' | 'audio', onProgress?: (fraction: number) => void) =>
    upload<{ url: string }>(`/api/files?kind=${kind}`, file, onProgress),
};
