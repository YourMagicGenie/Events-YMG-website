(() => {
  const root = document.documentElement;
  root.classList.add("js");

  const toggle = document.querySelector(".menu-toggle");
  const navigation = document.getElementById("primary-navigation");
  if (!toggle || !navigation) return;

  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
  const setOpen = (open, restoreFocus = false) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    navigation.classList.toggle("is-open", open);
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));

  navigation.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;

    setOpen(false);
    const target = document.getElementById(link.hash.slice(1));
    if (target) requestAnimationFrame(() => target.focus({ preventScroll: true }));
  });

  document.addEventListener("click", event => {
    if (isOpen() && !navigation.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isOpen()) setOpen(false, true);
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 851px)").matches) setOpen(false);
  });
})();
