export const EVENTS_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src https://challenges.cloudflare.com",
  "script-src 'self' https://challenges.cloudflare.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://images.unsplash.com",
  "font-src 'self'",
  "connect-src 'self' https://challenges.cloudflare.com https://images.unsplash.com",
  "form-action 'self'",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const RESPONSE_HEADERS = {
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
};

export function withEventsSecurityHeaders(request, response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(RESPONSE_HEADERS)) headers.set(name, value);

  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000");
  } else {
    headers.delete("strict-transport-security");
  }

  if ((headers.get("content-type") || "").toLowerCase().startsWith("text/html")) {
    headers.set("content-security-policy", EVENTS_CONTENT_SECURITY_POLICY);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
