const ALLOWED_SECTIONS = new Set(["approach", "concepts", "partners", "venue-offer", "inquire"]);
const ALLOWED_INTENTS = new Set(["venue_partnership", "corporate_event", "private_celebration"]);
const ALLOWED_FORMATS = new Set([
  "Let’s explore a partnership",
  "Rooftop evenings",
  "Live music & DJs",
  "Private celebrations",
  "A recurring nightlife series",
  "Supper Club",
  "Wine pairing",
  "Corporate Social",
]);

export async function startEventsMetrics({
  documentRef = document,
  windowRef = window,
  fetcher = fetch,
  observerFactory = callback => new IntersectionObserver(callback, { threshold: 0.25 }),
} = {}) {
  const locale = documentRef.documentElement.lang === "it" ? "it" : "en";
  let enabled = false;
  try {
    const response = await fetcher("/api/events/metrics/config", {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json" },
    });
    const config = await response.json();
    enabled = response.ok && config?.enabled === true;
  } catch {
    return false;
  }
  if (!enabled) return false;

  const send = payload => {
    try {
      const body = JSON.stringify(payload);
      void fetcher("/api/events/metrics", {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    } catch {
      // A measurement failure must never interfere with site navigation or inquiries.
    }
  };

  send({ event: "page_view", locale });

  if (typeof windowRef.IntersectionObserver === "function") {
    const seenSections = new Set();
    let observer;
    try {
      observer = observerFactory(entries => {
        for (const entry of entries) {
          const section = entry.target?.id;
          if (!entry.isIntersecting || !ALLOWED_SECTIONS.has(section) || seenSections.has(section)) continue;
          seenSections.add(section);
          send({ event: "section_view", locale, section });
          observer?.unobserve(entry.target);
        }
      });
      for (const section of documentRef.querySelectorAll("main section[id]")) {
        if (ALLOWED_SECTIONS.has(section.id)) observer.observe(section);
      }
    } catch {
      // Section reach is optional on browsers without a working observer.
    }
  }

  for (const button of documentRef.querySelectorAll("[data-concept]")) {
    button.addEventListener("click", () => {
      const intent = button.dataset.intent;
      const format = button.dataset.concept;
      if (!ALLOWED_INTENTS.has(intent) || !ALLOWED_FORMATS.has(format)) return;
      send({ event: "concept_interest", locale, intent, format });
    });
  }
  return true;
}
