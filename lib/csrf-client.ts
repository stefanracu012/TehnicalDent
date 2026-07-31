"use client";

let csrfToken: string | null = null;
let fetching = false;
let fetchPromise: Promise<string> | null = null;

/**
 * Fetches a CSRF token from the server and caches it.
 * Automatically deduplicates concurrent calls.
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  if (fetching && fetchPromise) return fetchPromise;

  fetching = true;
  fetchPromise = fetch("/api/auth/csrf")
    .then((res) => res.json())
    .then((data) => {
      csrfToken = data.csrfToken;
      fetching = false;
      return csrfToken!;
    })
    .catch((err) => {
      fetching = false;
      throw err;
    });

  return fetchPromise;
}

/**
 * A drop-in replacement for fetch() that automatically
 * attaches the CSRF token to mutating requests.
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method || "GET").toUpperCase();

  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const token = await getCsrfToken();
    const headers = new Headers(options.headers);
    headers.set("x-csrf-token", token);
    options.headers = headers;
  }

  const response = await fetch(url, options);

  // If we get a 403 CSRF error, refresh the token and retry once
  if (response.status === 403) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.error?.includes("CSRF")) {
      csrfToken = null;
      const token = await getCsrfToken();
      const headers = new Headers(options.headers);
      headers.set("x-csrf-token", token);
      options.headers = headers;
      return fetch(url, options);
    }
  }

  return response;
}

/**
 * Invalidate the cached CSRF token (call after logout).
 */
export function clearCsrfToken() {
  csrfToken = null;
}
