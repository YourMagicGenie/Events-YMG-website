import { messages } from "./i18n.js";

export async function sendEventsInquiry(formData, turnstileToken, fetcher = fetch, timeoutMs = 30000) {
  if (!turnstileToken) throw new Error(messages.spamRequired);
  const body = new URLSearchParams(formData);
  body.set("cf-turnstile-response", turnstileToken);
  const response = await fetcher("/api/events/inquiry", {
    signal: AbortSignal.timeout(timeoutMs),
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: body.toString(),
  });
  let result;
  try { result = await response.json(); } catch { result = null; }
  if (!response.ok || result?.ok !== true) {
    throw new Error(messages.requestRejected);
  }
  return result;
}
