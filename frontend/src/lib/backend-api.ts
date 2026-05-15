export const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function createBackendHeaders(
  accessToken: string,
  headers: HeadersInit = {},
) {
  const next = new Headers(headers);

  if (accessToken) {
    next.set("Authorization", `Bearer ${accessToken}`);
  }

  return next;
}

export async function readBackendError(
  res: Response,
  fallback = `Request failed with status ${res.status}`,
) {
  const body = await res.json().catch(() => null);

  if (body && typeof body === "object") {
    if ("error" in body && typeof body.error === "string") return body.error;
    if ("message" in body && typeof body.message === "string") {
      return body.message;
    }
  }

  return fallback;
}

export async function fetchBackendJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    cache: init.cache ?? "no-store",
    headers: createBackendHeaders(accessToken, init.headers),
  });

  if (!res.ok) {
    throw new Error(await readBackendError(res));
  }

  return (await res.json()) as T;
}
