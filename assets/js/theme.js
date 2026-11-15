// Theme switch. Dark is the default for everyone; the light theme is a choice remembered in this browser
// only (localStorage, no cookie). A one-line script in each page's <head> applies a saved choice before
// the page is drawn, so there is no flash of the dark theme.
(function () {
  const root = document.documentElement;
  const button = document.querySelector(".theme-toggle");
  const meta = document.querySelector('meta[name="theme-color"]');

  function current() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function apply(theme) {
    if (theme === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    if (meta) meta.setAttribute("content", theme === "light" ? "#ffffff" : "#000000");
  }

  apply(current());
  if (button) {
    button.hidden = false;
    button.addEventListener("click", function () {
      const next = current() === "light" ? "dark" : "light";
      apply(next);
      try {
        if (next === "light") localStorage.setItem("theme", "light");
        else localStorage.removeItem("theme");
      } catch (err) {
        // Storage blocked (private mode, site data off): the theme still changes for this page.
      }
      window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
    });
  }
})();

// Small-screen menu. On narrow windows the site links fold behind a menu button, while the language link and
// the theme switch stay in the bar. The links are wrapped here, not in the HTML, so without JavaScript the
// menu simply wraps onto two lines as before.
(function () {
  const mast = document.querySelector(".masthead");
  const nav = mast && mast.querySelector(".sitenav");
  if (!nav) return;

  const links = document.createElement("div");
  links.className = "sitenav-links";
  links.id = "site-menu";
  nav.querySelectorAll(":scope > a:not(.lang)").forEach(function (a) {
    links.appendChild(a);
  });
  nav.insertBefore(links, nav.firstChild);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "menu-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "site-menu");
  toggle.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path class="menu-icon-open" d="M4 7h16M4 12h16M4 17h16"/><path class="menu-icon-close" d="M6 6l12 12M18 6 6 18"/></svg>' +
    '<span class="visually-hidden">Menu</span>';
  nav.appendChild(toggle);
  document.documentElement.classList.add("has-menu");

  let openedAt = 0;
  function setOpen(open) {
    mast.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    openedAt = window.scrollY;
  }
  const isOpen = function () { return mast.classList.contains("is-open"); };

  toggle.addEventListener("click", function () { setOpen(!isOpen()); });
  links.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener("click", function (e) {
    if (isOpen() && !mast.contains(e.target)) setOpen(false);
  });
  // the bar hides while scrolling down, so an open menu would hang half out of view
  window.addEventListener("scroll", function () {
    if (isOpen() && Math.abs(window.scrollY - openedAt) > 40) setOpen(false);
  }, { passive: true });
  const wide = window.matchMedia("(min-width: 52.01rem)");
  const onWide = function () { if (wide.matches) setOpen(false); };
  if (wide.addEventListener) wide.addEventListener("change", onWide);
})();
