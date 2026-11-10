import { sendEventsEnquiry } from "./enquiry-client.js";

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const deck = document.getElementById("concept-deck");
if (deck) {
  const cards = [...deck.querySelectorAll(".concept")];
  const previous = document.getElementById("deck-previous");
  const next = document.getElementById("deck-next");
  const status = document.getElementById("deck-status");
  let statusTimer;

  const updateDeckState = () => {
    const atStart = deck.scrollLeft <= 4;
    const atEnd = deck.scrollLeft + deck.clientWidth >= deck.scrollWidth - 2;
    previous.setAttribute("aria-disabled", String(atStart));
    next.setAttribute("aria-disabled", String(atEnd));
    const deckLeft = deck.getBoundingClientRect().left;
    const firstVisible = cards.findIndex(card => card.getBoundingClientRect().right > deckLeft + 2);
    status.textContent = `Format ${Math.max(firstVisible, 0) + 1} of ${cards.length}`;
  };

  const moveDeck = direction => {
    const currentCard = document.activeElement.closest?.(".concept");
    if (currentCard) {
      const currentIndex = cards.indexOf(currentCard);
      const target = cards[currentIndex + direction];
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest", inline: "start" });
      target.querySelector("[data-concept]").focus({ preventScroll: true });
      return;
    }

    const cardWidth = cards[0]?.getBoundingClientRect().width || deck.clientWidth * 0.8;
    const gap = Number.parseFloat(getComputedStyle(deck).columnGap) || 0;
    deck.scrollBy({ left: direction * (cardWidth + gap), behavior: reduceMotion() ? "auto" : "smooth" });
  };

  previous.addEventListener("click", () => {
    if (previous.getAttribute("aria-disabled") !== "true") moveDeck(-1);
  });
  next.addEventListener("click", () => {
    if (next.getAttribute("aria-disabled") !== "true") moveDeck(1);
  });
  deck.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveDeck(event.key === "ArrowRight" ? 1 : -1);
  });
  deck.addEventListener("scroll", () => {
    window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(updateDeckState, 120);
  }, { passive: true });
  window.addEventListener("resize", updateDeckState);
  updateDeckState();
}

document.querySelectorAll("[data-concept]").forEach(button => {
  button.addEventListener("click", () => {
    document.getElementById("format").value = button.dataset.concept;
    document.getElementById("enquire").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });
    document.getElementById("format").focus({ preventScroll: true });
  });
});

const form = document.getElementById("brief");
if (form) {
  const feedback = document.getElementById("form-feedback");
  const submit = document.getElementById("submit-enquiry");
  const submitLabel = submit.querySelector(".submit-label");
  let challengeReady = false;
  let turnstileToken = "";
  let widgetId = null;
  let submitting = false;

  const setFeedback = (message, state = "") => {
    feedback.textContent = message;
    feedback.dataset.state = state;
  };

  const loadTurnstile = () => new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const callbackName = "ymgEventsTurnstileLoaded";
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.turnstile);
    };
    const script = document.createElement("script");
    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error("Spam protection could not load."));
    };
    document.head.appendChild(script);
  });

  const configureForm = async () => {
    try {
      const response = await fetch("/api/events/config", {
        method: "GET", credentials: "same-origin", cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const config = await response.json();
      if (!response.ok || config.ready !== true || !config.siteKey) throw new Error("Service unavailable");
      const turnstile = await loadTurnstile();
      setFeedback("Complete the spam-protection check to send your enquiry.");
      widgetId = turnstile.render("#turnstile-widget", {
        sitekey: config.siteKey,
        action: "events_enquiry",
        callback: token => {
          turnstileToken = token;
          challengeReady = true;
          submit.disabled = false;
          if (feedback.dataset.state !== "success") setFeedback("Spam protection is ready. You can send your enquiry.");
        },
        "expired-callback": () => {
          turnstileToken = "";
          challengeReady = false;
          submit.disabled = true;
          setFeedback("Verification expired. Please complete the check again.", "error");
        },
        "error-callback": () => {
          turnstileToken = "";
          challengeReady = false;
          submit.disabled = true;
          setFeedback("Spam protection could not verify this request. Please use the direct email link.", "error");
        },
      });
    } catch {
      challengeReady = false;
      submit.disabled = true;
      setFeedback("Online enquiries are temporarily unavailable. Please email us directly using the address shown here.", "error");
    }
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    if (!turnstileToken) {
      setFeedback("Please complete the spam-protection check before sending.", "error");
      return;
    }

    submitting = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    submitLabel.textContent = "Sending your enquiry…";
    setFeedback("Sending your enquiry…");
    try {
      await sendEventsEnquiry(new FormData(form), turnstileToken);
      setFeedback("Your enquiry has been accepted for processing. We’ll follow up at the email address you provided.", "success");
    } catch {
      setFeedback("We couldn’t send your enquiry. Please try again or email us directly.", "error");
    } finally {
      submitting = false;
      form.removeAttribute("aria-busy");
      submitLabel.textContent = "Send my inquiry email";
      turnstileToken = "";
      challengeReady = false;
      submit.disabled = true;
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }
  });

  configureForm();
}
