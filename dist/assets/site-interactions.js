import { sendEventsInquiry } from "./inquiry-client.js";
import { messages } from "./i18n.js";
import { startEventsMetrics } from "./metrics-client.js";

void startEventsMetrics();

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
    status.textContent = messages.formatStatus(Math.max(firstVisible, 0) + 1, cards.length);
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

const intent = document.getElementById("intent");
const business = document.getElementById("business");
const businessLabel = document.getElementById("business-label");
const businessHelp = document.getElementById("business-help");
const ideaLabel = document.getElementById("idea-label");
const idea = document.getElementById("idea");
const format = document.getElementById("format");
const formatContext = document.getElementById("format-context");
const formatContextStatus = document.getElementById("format-context-status");
const clearFormat = document.getElementById("clear-format");
const pathCopy = messages.turnstileLanguage === "it" ? {
  businessInitial: "Seleziona prima il tipo di richiesta",
  businessPlaceholder: "Scegli il tipo di richiesta per adattare questo campo",
  businessHelpInitial: "Scegli il tipo di richiesta: ti chiederemo solo i dettagli che servono.",
  venueLabel: "Locale o location *",
  venuePlaceholder: "Nome del locale o della location",
  venueHelp: "Indica il locale o la location per cui vorresti collaborare.",
  companyLabel: "Azienda o gruppo *",
  companyPlaceholder: "Nome dell’azienda o del gruppo",
  companyHelp: "Indica l’azienda o il gruppo per cui stai organizzando l’evento.",
  privateLabel: "Location preferita (facoltativa)",
  privatePlaceholder: "Aggiungila solo se l’hai già scelta",
  privateHelp: "Non serve avere già scelto una location per inviare la richiesta.",
  ideaInitialLabel: "Raccontaci cosa hai in mente",
  ideaInitialPlaceholder: "Dopo aver scelto il tipo di richiesta, puoi aggiungere qualche dettaglio…",
  venueIdeaLabel: "Raccontaci della location e dell’evento che vorresti creare",
  venueIdeaPlaceholder: "Spazio, ospitalità, musica e ospiti che vorresti accogliere…",
  companyIdeaLabel: "Cosa vorresti offrire al tuo team o ai tuoi ospiti?",
  companyIdeaPlaceholder: "Obiettivo dell’incontro, partecipanti, atmosfera o programma…",
  privateIdeaLabel: "Cosa festeggi e che tipo di serata immagini?",
  privateIdeaPlaceholder: "Occasione, ospiti, atmosfera o dettagli che vorresti condividere…",
  defaults: {
    venue_partnership: "Let’s explore a partnership",
    corporate_event: "Corporate Social",
    private_celebration: "Private celebrations",
  },
} : {
  businessInitial: "Choose an inquiry type",
  businessPlaceholder: "Choose an inquiry type",
  businessHelpInitial: "",
  venueLabel: "Venue or hospitality business *",
  venuePlaceholder: "Name of your venue or hospitality business",
  venueHelp: "Tell us which venue you would like to work with.",
  companyLabel: "Company or team *",
  companyPlaceholder: "Name of your company or group",
  companyHelp: "Tell us which company or group you are planning for.",
  privateLabel: "Preferred venue or location (optional)",
  privatePlaceholder: "If you already know...",
  privateHelp: "You do not need to have chosen a venue before getting in touch.",
  ideaInitialLabel: "Tell us what you have in mind",
  ideaInitialPlaceholder: "Choose an inquiry type, then add any details that would help…",
  venueIdeaLabel: "Tell us about your venue and the event you want to create",
  venueIdeaPlaceholder: "Your setting, hospitality, music and the guests you would like to welcome…",
  companyIdeaLabel: "What would you like your team or guests to experience?",
  companyIdeaPlaceholder: "The purpose of the gathering, attendees, atmosphere or programme…",
  privateIdeaLabel: "What are you celebrating, and what kind of evening do you have in mind?",
  privateIdeaPlaceholder: "The occasion, guests, atmosphere or any details you would like to share…",
  defaults: {
    venue_partnership: "Let’s explore a partnership",
    corporate_event: "Corporate Social",
    private_celebration: "Private celebrations",
  },
};

let previousIntent = "";
let selectedFromConcept = false;
const updateInquiryPath = () => {
  const selected = intent?.value || "";
  if (previousIntent && previousIntent !== selected) business.value = "";
  business.disabled = !selected;
  business.required = selected === "venue_partnership" || selected === "corporate_event";
  if (!selected) {
    businessLabel.textContent = pathCopy.businessInitial;
    business.placeholder = pathCopy.businessPlaceholder;
    businessHelp.textContent = pathCopy.businessHelpInitial;
    ideaLabel.textContent = pathCopy.ideaInitialLabel;
    idea.placeholder = pathCopy.ideaInitialPlaceholder;
  } else if (selected === "venue_partnership") {
    businessLabel.textContent = pathCopy.venueLabel;
    business.placeholder = pathCopy.venuePlaceholder;
    businessHelp.textContent = pathCopy.venueHelp;
    ideaLabel.textContent = pathCopy.venueIdeaLabel;
    idea.placeholder = pathCopy.venueIdeaPlaceholder;
  } else if (selected === "corporate_event") {
    businessLabel.textContent = pathCopy.companyLabel;
    business.placeholder = pathCopy.companyPlaceholder;
    businessHelp.textContent = pathCopy.companyHelp;
    ideaLabel.textContent = pathCopy.companyIdeaLabel;
    idea.placeholder = pathCopy.companyIdeaPlaceholder;
  } else {
    businessLabel.textContent = pathCopy.privateLabel;
    business.placeholder = pathCopy.privatePlaceholder;
    businessHelp.textContent = pathCopy.privateHelp;
    ideaLabel.textContent = pathCopy.privateIdeaLabel;
    idea.placeholder = pathCopy.privateIdeaPlaceholder;
  }
  if (selected && (!previousIntent || format.value === pathCopy.defaults[previousIntent])) {
    format.value = pathCopy.defaults[selected];
  }
  previousIntent = selected;
};

const renderFormatContext = () => {
  const selectedFormat = format?.value || "";
  const defaultFormat = pathCopy.defaults[intent?.value] || pathCopy.defaults.venue_partnership;
  const isSpecificChoice = selectedFormat && selectedFormat !== defaultFormat;
  const showContext = Boolean(selectedFormat) && (selectedFromConcept || isSpecificChoice);
  formatContext.hidden = !showContext;
  if (showContext) {
    const optionLabel = format.selectedOptions[0]?.textContent.trim() || selectedFormat;
    formatContextStatus.textContent = `${messages.selectedFormatPrefix} ${optionLabel}`;
  }
};

intent?.addEventListener("change", () => {
  updateInquiryPath();
  selectedFromConcept = false;
  renderFormatContext();
});
updateInquiryPath();
renderFormatContext();
if (clearFormat) clearFormat.textContent = messages.clearFormat;

format?.addEventListener("change", () => {
  selectedFromConcept = false;
  renderFormatContext();
});
clearFormat?.addEventListener("click", () => {
  selectedFromConcept = false;
  format.value = "";
  format.dispatchEvent(new Event("change", { bubbles: true }));
  format.focus({ preventScroll: true });
});

document.querySelectorAll("[data-concept]").forEach(button => {
  button.addEventListener("click", () => {
    if (button.dataset.intent) {
      intent.value = button.dataset.intent;
      intent.dispatchEvent(new Event("change", { bubbles: true }));
    }
    format.value = button.dataset.concept;
    selectedFromConcept = true;
    renderFormatContext();
    document.getElementById("inquire").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth" });
    format.focus({ preventScroll: true });
  });
});

document.querySelectorAll("[data-inquiry-intent]").forEach(link => {
  link.addEventListener("click", () => {
    intent.value = link.dataset.inquiryIntent;
    intent.dispatchEvent(new Event("change", { bubbles: true }));
  });
});

const form = document.getElementById("brief");
if (form) {
  const feedback = document.getElementById("form-feedback");
  const verificationFrame = document.getElementById("turnstile-widget");
  const showVerification = needsVerification => {
    verificationFrame.dataset.verified = String(!needsVerification);
  };
  showVerification(true);
  const submit = document.getElementById("submit-inquiry");
  const submitLabel = submit.querySelector(".submit-label");
  let challengeReady = false;
  let turnstileToken = "";
  let widgetId = null;
  let submitting = false;
  let validationFeedback = null;

  const hasInvalidFields = () => Boolean(form.querySelector('[aria-invalid="true"]:not(:disabled)'));
  const setFeedback = (message, state = "") => {
    if (validationFeedback) {
      validationFeedback = { message, state };
      if (hasInvalidFields()) return;
    }
    feedback.textContent = message;
    feedback.dataset.state = state;
  };
  const showInvalidFields = () => {
    if (!validationFeedback) validationFeedback = { message: feedback.textContent, state: feedback.dataset.state || "" };
    feedback.textContent = messages.invalidFields;
    feedback.dataset.state = "error";
  };
  const restoreFeedbackIfValid = () => {
    if (hasInvalidFields() || !validationFeedback) return;
    const previous = validationFeedback;
    validationFeedback = null;
    setFeedback(previous.message, previous.state);
  };
  const updateFieldValidity = event => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    if (!control.disabled && control.validity.valid) control.removeAttribute("aria-invalid");
    restoreFeedbackIfValid();
  };

  form.addEventListener("invalid", event => {
    const control = event.target;
    if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) return;
    control.setAttribute("aria-invalid", "true");
    showInvalidFields();
  }, true);
  form.addEventListener("input", updateFieldValidity);
  form.addEventListener("change", updateFieldValidity);
  intent?.addEventListener("change", () => {
    if (business.disabled || !business.required || business.validity.valid) business.removeAttribute("aria-invalid");
    restoreFeedbackIfValid();
  });

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
      reject(new Error(messages.turnstileLoadError));
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
      if (!response.ok || config.ready !== true || !config.siteKey) throw new Error(messages.serviceUnavailable);
      const turnstile = await loadTurnstile();
      setFeedback(messages.turnstileCheck);
      widgetId = turnstile.render("#turnstile-widget", {
        sitekey: config.siteKey,
        action: config.action === "assessment" ? "assessment" : "events_inquiry",
        language: messages.turnstileLanguage,
        callback: token => {
          turnstileToken = token;
          challengeReady = true;
          showVerification(false);
          submit.disabled = false;
          if (feedback.dataset.state !== "success") setFeedback(messages.turnstileReady);
        },
        "expired-callback": () => {
          turnstileToken = "";
          showVerification(true);
          challengeReady = false;
          submit.disabled = true;
          setFeedback(messages.turnstileExpired, "error");
        },
        "error-callback": () => {
          turnstileToken = "";
          showVerification(true);
          challengeReady = false;
          submit.disabled = true;
          setFeedback(messages.turnstileError, "error");
        },
      });
    } catch {
      challengeReady = false;
      submit.disabled = true;
      setFeedback(messages.formUnavailable, "error");
    }
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    if (!turnstileToken) {
      setFeedback(messages.turnstileRequired, "error");
      return;
    }

    submitting = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    submitLabel.textContent = messages.sending;
    setFeedback(messages.sending);
    try {
      await sendEventsInquiry(new FormData(form), turnstileToken);
      setFeedback(messages.accepted, "success");
    } catch {
      setFeedback(messages.failed, "error");
    } finally {
      submitting = false;
      form.removeAttribute("aria-busy");
      submitLabel.textContent = messages.submit;
      turnstileToken = "";
      challengeReady = false;
      showVerification(true);
      submit.disabled = true;
      if (window.turnstile && widgetId !== null) window.turnstile.reset(widgetId);
    }
  });

  configureForm();
}
