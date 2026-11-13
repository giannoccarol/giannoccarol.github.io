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
  if (!button) return;
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
})();
