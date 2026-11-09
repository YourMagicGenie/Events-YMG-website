const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const deck = document.getElementById("concept-deck");
if (deck) {
  const cards = [...deck.querySelectorAll(".concept")];
  const previous = document.getElementById("deck-previous");
  const next = document.getElementById("deck-next");
  const status = document.getElementById("deck-status");
  let statusTimer;

  const updateDeckState = () => {
    const atStart = deck.scrollLeft <= 1;
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
form?.addEventListener("submit", event => {
  event.preventDefault();
  const get = id => document.getElementById(id).value.trim();
  const summary = document.getElementById("summary");
  summary.textContent = `YMG EVENTS — PARTNERSHIP BRIEF\n\nName: ${get("name")}\nBusiness / venue: ${get("business")}\nFormat: ${get("format")}\nGuests: ${get("guests")}\nTiming: ${get("timing") || "To discuss"}\nBudget: ${get("budget") || "To discuss"}\n\nThe idea:\n${get("idea") || "I’d like to discuss an event format."}`;
  document.getElementById("email-brief").href = "mailto:hello@ymgconsultingservices.com?subject=" +
    encodeURIComponent("YMG Events partnership — " + get("business")) + "&body=" + encodeURIComponent(summary.textContent);
  document.getElementById("result").hidden = false;
  document.getElementById("copystatus").textContent = "";
  document.getElementById("result").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "nearest" });
});

document.getElementById("copy")?.addEventListener("click", async () => {
  const summary = document.getElementById("summary");
  const status = document.getElementById("copystatus");
  try {
    await navigator.clipboard.writeText(summary.textContent);
    status.textContent = "Copied to clipboard.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(summary);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = "Select and copy the highlighted brief.";
  }
});
