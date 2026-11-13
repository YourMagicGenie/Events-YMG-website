(() => {
  "use strict";
  if (new URLSearchParams(window.location.search).get("layout") !== "1") return;

  const definitions = [
    ["01", "Header", "header"],
    ["01A", "Header wordmark", "header .logo"],
    ["01B", "Header subtitle", "header .logo small"],
    ["01C", "Navigation", "header .primary-nav"],
    ["01D", "Language switch", "header #language-switch"],
    ["01E", "Header inquiry button", "header .header-cta"],
    ["02", "Hero", ".hero"],
    ["02A", "Hero eyebrow", ".hero .eyebrow"],
    ["02B", "Hero headline", ".hero h1"],
    ["02C", "Hero description", ".hero-copy > p"],
    ["02D", "Hero inquiry button", ".hero-actions .btn"],
    ["02E", "Hero audience line", ".hero .geo"],
    ["02F", "Hero photograph", ".hero-atmosphere"],
    ["02G", "Hero photo caption", ".hero .photo-note"],
    ["03", "Highlights band", ".band"],
    ["03A", "Highlights tagline", ".band > span"],
    ["03B", "Highlight: rooftop", ".band > div:nth-of-type(1)"],
    ["03C", "Highlight: music", ".band > div:nth-of-type(2)"],
    ["03D", "Highlight: dining", ".band > div:nth-of-type(3)"],
    ["04", "Our approach", ".intro"],
    ["04A", "Approach eyebrow", ".intro .eyebrow"],
    ["04B", "Approach heading", ".intro h2"],
    ["04C", "Approach description", ".intro > div:nth-child(2)"],
    ["05", "Event concepts", ".concepts"],
    ["05A", "Concepts eyebrow", ".concepts > .eyebrow"],
    ["05B", "Concepts heading", ".concepts h2"],
    ["05C", "Carousel controls", ".deck-toolbar"],
    ["05D", "Carousel track", "#concept-deck"],
    ["05D1", "Concept card 1", "#concept-deck .concept:nth-child(1)"],
    ["05D2", "Concept card 2", "#concept-deck .concept:nth-child(2)"],
    ["05D3", "Concept card 3", "#concept-deck .concept:nth-child(3)"],
    ["05D4", "Concept card 4", "#concept-deck .concept:nth-child(4)"],
    ["05D5", "Concept card 5", "#concept-deck .concept:nth-child(5)"],
    ["05D6", "Concept card 6", "#concept-deck .concept:nth-child(6)"],
    ["06", "Venue partnerships", ".partnerships"],
    ["06A", "Partnership eyebrow", ".partnerships .eyebrow"],
    ["06B", "Partnership heading", ".partnerships h2"],
    ["06C", "Partnership description", ".partnerships > div:first-child > p"],
    ["06D", "Partnership PDF", ".partnership-download"],
    ["06E", "Partnership inquiry button", ".partnership-actions [data-inquiry-intent]"],
    ["06F", "Partnership points", ".partnerships > div:nth-child(2)"],
    ["06F1", "Partnership point 1", ".partnerships .partnership:nth-child(1)"],
    ["06F2", "Partnership point 2", ".partnerships .partnership:nth-child(2)"],
    ["06F3", "Partnership point 3", ".partnerships .partnership:nth-child(3)"],
    ["07", "Founder", ".about"],
    ["07A", "Founder eyebrow", ".about .eyebrow"],
    ["07B", "Founder heading", ".about h2"],
    ["07C", "Founder portrait", ".founder-portrait"],
    ["07D", "Founder biography", ".about > div:nth-child(2) > p"],
    ["07E", "Founder signature", ".about .signature"],
    ["08", "Inquiry section", ".inquiry"],
    ["08A", "Inquiry eyebrow", ".inquiry .eyebrow"],
    ["08B", "Inquiry heading", ".inquiry h2"],
    ["08C", "Inquiry form", "#brief"],
    ["08D", "Inquiry type", "#brief .form-grid > div:nth-child(1)"],
    ["08E", "Name field", "#brief .form-grid > div:nth-child(2)"],
    ["08F", "Email field", "#brief .form-grid > div:nth-child(3)"],
    ["08G", "Business field", "#brief .form-grid > div:nth-child(4)"],
    ["08H", "Event format field", "#brief .form-grid > div:nth-child(5)"],
    ["08I", "Guest count field", "#brief .form-grid > div:nth-child(6)"],
    ["08J", "Timing field", "#brief .form-grid > div:nth-child(7)"],
    ["08K", "Budget field", "#brief .form-grid > div:nth-child(8)"],
    ["08L", "Message field", "#brief .form-grid > div:nth-child(9)"],
    ["08M", "Spam protection", "#turnstile-widget"],
    ["08N", "Form status message", "#form-feedback"],
    ["08O", "Submit inquiry button", "#submit-inquiry"],
    ["09", "Footer", ".site-footer"],
    ["09A", "Footer identity", ".footer-identity"],
    ["09B", "Footer contact", ".footer-contact"],
    ["09C", "Footer inquiry link", ".footer-cta"],
    ["10", "Legal strip", ".site-note"],
    ["10A", "Business details", ".site-note > p"],
    ["10B", "Privacy and related links", ".site-note-links"]
  ];

  const sections = new Set(["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]);
  const entries = definitions.map(([id, label, selector]) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    element.setAttribute("data-ymg-layout-id", id);
    return { id, label, element };
  }).filter(Boolean);
  if (!entries.length) return;

  // Keep measurement mode active when switching between EN and IT pages.
  const languageSwitch = document.querySelector("#language-switch");
  if (languageSwitch) {
    const languageUrl = new URL(languageSwitch.href);
    languageUrl.searchParams.set("layout", "1");
    languageSwitch.href = languageUrl.pathname + languageUrl.search + languageUrl.hash;
  }

  const elementById = new Map(entries.map(entry => [entry.id, entry]));
  const host = document.createElement("div");
  host.id = "ymg-layout-inspector";
  host.setAttribute("aria-label", "YMG layout measurement overlay");
  const shadow = host.attachShadow({ mode: "open" });
  const styles = document.createElement("link");
  styles.rel = "stylesheet";
  styles.href = "/assets/layout-inspector.css";
  const surface = document.createElement("div");
  surface.className = "surface";
  surface.innerHTML = [
    '<div class="grid" aria-hidden="true"></div>',
    '<div class="ruler ruler-horizontal" aria-hidden="true"></div>',
    '<div class="ruler ruler-vertical" aria-hidden="true"></div>',
    '<div class="tags" aria-hidden="true"></div>',
    '<div class="outline" aria-hidden="true"></div>',
    '<aside class="panel" aria-label="Layout Inspector controls">',
    '  <div class="panel-title"><div><strong>YMG Layout Inspector</strong><small>CSS pixels · document coordinates</small></div><button type="button" data-action="close" aria-label="Close layout inspector">✕</button></div>',
    '  <div class="switches">',
    '    <button type="button" data-action="grid" aria-pressed="true">Grid ON</button>',
    '    <button type="button" data-action="labels" aria-pressed="true">IDs: sections</button>',
    '    <button type="button" data-action="inspect" aria-pressed="true">Inspect ON</button>',
    '  </div>',
    '  <label for="ymg-inspector-select">Element reference</label>',
    '  <select id="ymg-inspector-select" aria-label="Select a page element"></select>',
    '  <div class="readout" role="status" aria-live="polite"></div>',
    '  <label for="ymg-inspector-copytext">Copy-ready change request</label>',
    '  <textarea id="ymg-inspector-copytext" readonly rows="3"></textarea>',
    '  <button type="button" class="copy" data-action="copy">Copy element reference</button>',
    '  <p class="help">X + right / − left · Y + down / − up. Use px, not mm. State the screen width when requesting a change. Click a page element while Inspect is ON; turn it OFF to operate the site normally.</p>',
    '</aside>'
  ].join("");
  shadow.append(styles, surface);
  document.body.appendChild(host);

  const grid = shadow.querySelector(".grid");
  const tags = shadow.querySelector(".tags");
  const outline = shadow.querySelector(".outline");
  const horizontalRuler = shadow.querySelector(".ruler-horizontal");
  const verticalRuler = shadow.querySelector(".ruler-vertical");
  const panel = shadow.querySelector(".panel");
  const select = shadow.querySelector("select");
  const readout = shadow.querySelector(".readout");
  const textArea = shadow.querySelector("textarea");
  const gridButton = shadow.querySelector('[data-action="grid"]');
  const labelsButton = shadow.querySelector('[data-action="labels"]');
  const inspectButton = shadow.querySelector('[data-action="inspect"]');
  const copyButton = shadow.querySelector('[data-action="copy"]');

  for (const entry of entries) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.id + " · " + entry.label;
    select.appendChild(option);
  }
  let gridOn = true;
  let labelMode = 1; // 0 off, 1 major sections, 2 all references
  let inspectOn = true;
  let selected = elementById.get("02") || entries[0];
  let hover = null;
  let frameRequested = false;
  let redrawRulers = true;

  const tagsById = new Map();
  for (const entry of entries) {
    const tag = document.createElement("span");
    tag.className = sections.has(entry.id) ? "tag major" : "tag detail";
    tag.textContent = entry.id + " " + entry.label;
    tags.appendChild(tag);
    tagsById.set(entry.id, tag);
  }

  function rectangle(entry) {
    const r = entry.element.getBoundingClientRect();
    return {
      left: r.left, top: r.top, right: r.right, bottom: r.bottom,
      width: r.width, height: r.height,
      docX: r.left + window.scrollX, docY: r.top + window.scrollY
    };
  }
  function round(n) { return Math.round(n); }
  function selectedSection(entry) {
    const section = entries.find(candidate =>
      sections.has(candidate.id) && candidate.element.contains(entry.element));
    return section || entry;
  }

  function updateSelection() {
    if (!selected) return;
    const rect = rectangle(selected);
    const style = window.getComputedStyle(selected.element);
    const parent = selectedSection(selected);
    const language = document.documentElement.lang === "it" ? "Italian" : "English";
    select.value = selected.id;
    readout.textContent =
      selected.id + " · " + selected.label + "\n" +
      "Section: " + parent.id + " " + parent.label + "\n" +
      "Document X " + round(rect.docX) + "px · Y " + round(rect.docY) + "px\n" +
      "Width " + round(rect.width) + "px · Height " + round(rect.height) + "px\n" +
      "Padding top " + round(parseFloat(style.paddingTop) || 0) +
      "px · bottom " + round(parseFloat(style.paddingBottom) || 0) + "px\n" +
      "Viewport " + window.innerWidth + "×" + window.innerHeight +
      "px · " + language + " · DPR " + window.devicePixelRatio;
    textArea.value =
      selected.id + " (" + selected.label + "), " + window.innerWidth +
      "px viewport, " + language + " page:\n" +
      "Change X [+-___]px, Y [+-___]px; OR padding top [___]px / bottom [___]px.\n" +
      "Reference bounds X=" + round(rect.docX) + ", Y=" + round(rect.docY) +
      ", W=" + round(rect.width) + ", H=" + round(rect.height) + " CSS px.";
  }
  function selectEntry(entry, scroll) {
    if (!entry) return;
    selected = entry;
    copyButton.textContent = "Copy element reference";
    if (scroll) entry.element.scrollIntoView({ behavior: "instant", block: "center" });
    updateSelection();
    schedule();
  }
  function nearestEntry(target) {
    if (!(target instanceof Element)) return null;
    const marked = target.closest("[data-ymg-layout-id]");
    return marked ? elementById.get(marked.getAttribute("data-ymg-layout-id")) || null : null;
  }
  function buildRuler(node, horizontal) {
    node.replaceChildren();
    const length = horizontal ? window.innerWidth : window.innerHeight;
    const offset = horizontal ? window.scrollX : window.scrollY;
    const fragment = document.createDocumentFragment();
    const first = Math.ceil(offset / 100) * 100;
    for (let value = first; value <= offset + length; value += 100) {
      const tick = document.createElement("span");
      tick.className = "tick";
      tick.style[horizontal ? "left" : "top"] = (value - offset) + "px";
      tick.textContent = String(value);
      fragment.appendChild(tick);
    }
    node.appendChild(fragment);
  }
  function draw() {
    frameRequested = false;
    grid.style.display = gridOn ? "block" : "none";
    grid.style.setProperty("--grid-x-small", (-window.scrollX % 20) + "px");
    grid.style.setProperty("--grid-y-small", (-window.scrollY % 20) + "px");
    grid.style.setProperty("--grid-x-major", (-window.scrollX % 100) + "px");
    grid.style.setProperty("--grid-y-major", (-window.scrollY % 100) + "px");
    horizontalRuler.style.display = gridOn ? "block" : "none";
    verticalRuler.style.display = gridOn ? "block" : "none";
    if (gridOn && redrawRulers) {
      buildRuler(horizontalRuler, true);
      buildRuler(verticalRuler, false);
    }
    redrawRulers = false;

    for (const entry of entries) {
      const tag = tagsById.get(entry.id);
      const major = sections.has(entry.id);
      const r = rectangle(entry);
      const visible = r.width > 0 && r.height > 0 &&
        r.bottom > 22 && r.top < window.innerHeight - 18 &&
        r.right > 24 && r.left < window.innerWidth;
      const show = labelMode === 2 || (labelMode === 1 && major);
      tag.hidden = !show || !visible;
      if (show && visible) {
        tag.style.left = Math.max(26, Math.min(window.innerWidth - 125, r.left + 3)) + "px";
        tag.style.top = Math.max(28, Math.min(window.innerHeight - 20, r.top + 2)) + "px";
      }
    }
    const entry = inspectOn && hover ? hover : selected;
    if (entry) {
      const r = rectangle(entry);
      const visible = r.width > 0 && r.height > 0 &&
        r.bottom > 0 && r.top < window.innerHeight;
      outline.hidden = !visible;
      if (visible) {
        outline.style.left = Math.max(0, r.left) + "px";
        outline.style.top = Math.max(0, r.top) + "px";
        outline.style.width = Math.max(0, Math.min(window.innerWidth, r.right) - Math.max(0, r.left)) + "px";
        outline.style.height = Math.max(0, Math.min(window.innerHeight, r.bottom) - Math.max(0, r.top)) + "px";
      }
    }
    updateSelection();
  }
  function schedule() {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(draw);
  }
  function setToggle(button, state, label) {
    button.setAttribute("aria-pressed", String(state));
    button.textContent = label;
  }

  gridButton.addEventListener("click", () => {
    gridOn = !gridOn;
    setToggle(gridButton, gridOn, gridOn ? "Grid ON" : "Grid OFF");
    redrawRulers = true;
    schedule();
  });
  labelsButton.addEventListener("click", () => {
    labelMode = (labelMode + 1) % 3;
    setToggle(labelsButton, labelMode !== 0,
      ["IDs: off", "IDs: sections", "IDs: all"][labelMode]);
    schedule();
  });
  inspectButton.addEventListener("click", () => {
    inspectOn = !inspectOn;
    hover = null;
    setToggle(inspectButton, inspectOn, inspectOn ? "Inspect ON" : "Inspect OFF");
    schedule();
  });
  select.addEventListener("change", () => selectEntry(elementById.get(select.value), true));

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(textArea.value);
      copyButton.textContent = "Copied reference";
    } catch {
      textArea.focus();
      textArea.select();
      copyButton.textContent = "Select and copy the highlighted text";
    }
  });
  shadow.querySelector('[data-action="close"]').addEventListener("click", () => {
    host.remove();
    const url = new URL(window.location.href);
    url.searchParams.delete("layout");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  });

  document.addEventListener("pointermove", event => {
    if (!host.isConnected || !inspectOn || event.composedPath().includes(host)) return;
    const next = nearestEntry(event.target);
    if (next !== hover) { hover = next; schedule(); }
  }, { passive: true });
  for (const type of ["pointerdown", "click"]) {
    document.addEventListener(type, event => {
      if (!host.isConnected || !inspectOn || event.composedPath().includes(host)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = nearestEntry(event.target);
      if (next) selectEntry(next, false);
    }, true);
  }
  document.addEventListener("keydown", event => {
    if (!host.isConnected) return;
    if (event.key === "Escape" && inspectOn) {
      inspectButton.click();
      inspectButton.focus();
    }
  });
  window.addEventListener("scroll", () => { redrawRulers = true; schedule(); }, { passive: true });
  window.addEventListener("resize", () => { redrawRulers = true; schedule(); }, { passive: true });
  const resizeObserver = new ResizeObserver(schedule);
  for (const entry of entries) resizeObserver.observe(entry.element);
  updateSelection();
  schedule();
})();