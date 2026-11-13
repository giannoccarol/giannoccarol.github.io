// Extra motion on the home page: the name rises letter by letter, words fade in, blocks and tiles reveal as
// they scroll into view (tiles with a turnstile, like a Windows Phone Start screen), a progress bar, a masthead
// that hides while scrolling down, parallax on the hero, and, with a mouse, a light that follows the pointer,
// tilting tiles and magnetic buttons. Nothing runs if the system asks for reduced motion.
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const root = document.documentElement;
  root.classList.add("anim");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // ---------- name: one span per letter, one line per <br> ----------
  const name = document.querySelector(".hero-name");
  if (name) {
    const lines = name.innerHTML.split(/<br\s*\/?>/i).map((l) => l.replace(/<[^>]+>/g, "").trim());
    const label = lines.join(" ");
    let i = 0;
    name.setAttribute("aria-label", label);
    name.innerHTML = lines
      .map((line) => `<span class="line" aria-hidden="true">${[...line].map((c) => `<span class="char" style="--i:${i++}">${c === " " ? "&nbsp;" : c}</span>`).join("")}</span>`)
      .join("");
  }

  // ---------- line under the name: one span per word ----------
  const lede = document.querySelector(".hero .lede");
  if (lede) {
    const words = lede.textContent.trim().split(/\s+/);
    lede.setAttribute("aria-label", lede.textContent.trim());
    lede.innerHTML = words.map((w, k) => `<span class="word" aria-hidden="true" style="--i:${k}">${w}</span>`).join(" ");
  }

  // ---------- reveal on scroll ----------
  const reveal = (sel, step = 0) =>
    document.querySelectorAll(sel).forEach((el, k) => {
      el.classList.add("reveal");
      if (step) el.style.setProperty("--d", `${k * step}s`);
    });
  reveal(".home-section > .section-title");
  reveal(".work__intro");
  reveal(".about p, .about .contact", 0.08);
  reveal(".more");
  reveal(".footer p", 0.06);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  document.querySelectorAll(".reveal, .work").forEach((el) => io.observe(el));

  // tiles: numbered per block so each block's turnstile starts from its first tile
  document.querySelectorAll(".tiles").forEach((list) => {
    [...list.children].forEach((tile, k) => tile.style.setProperty("--i", k));
    const tio = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      list.querySelectorAll(".tile").forEach((t) => t.classList.add("in"));
      tio.disconnect();
    }, { threshold: 0, rootMargin: "0px 0px -12% 0px" });
    tio.observe(list);
  });

  // printing shows everything, whatever has scrolled into view
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll(".reveal, .work, .tile").forEach((el) => el.classList.add("in"));
  });

  // ---------- progress bar, masthead, parallax ----------
  const bar = document.createElement("div");
  bar.className = "progress";
  document.body.prepend(bar);
  const mast = document.querySelector(".masthead");
  const heroText = document.querySelector(".hero__text");
  const rain = document.getElementById("rain");
  let lastY = window.scrollY, ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    if (mast) mast.classList.toggle("is-hidden", y > lastY && y > 140);
    lastY = y;
    if (heroText && y < 900) {
      heroText.style.transform = `translateY(${(-y * 0.25).toFixed(1)}px)`;
      heroText.style.opacity = Math.max(0, 1 - y / 520).toFixed(3);
    }
    if (rain && y < 900) rain.style.transform = `translateY(${(y * 0.35).toFixed(1)}px)`;
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (!finePointer) return;

  // ---------- cursor light ----------
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.prepend(glow);
  const target = { x: window.innerWidth * 0.6, y: window.innerHeight * 0.3 }, pos = { ...target };
  window.addEventListener("pointermove", (e) => { target.x = e.clientX; target.y = e.clientY; }, { passive: true });
  (function follow() {
    pos.x += (target.x - pos.x) * 0.12;
    pos.y += (target.y - pos.y) * 0.12;
    glow.style.transform = `translate(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px)`;
    requestAnimationFrame(follow);
  })();

  // ---------- tile tilt ----------
  document.querySelectorAll(".tile").forEach((tile) => {
    tile.addEventListener("pointermove", (e) => {
      const r = tile.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      tile.classList.add("tilting");
      tile.style.setProperty("--ry", `${((x - 0.5) * 14).toFixed(2)}deg`);
      tile.style.setProperty("--rx", `${((0.5 - y) * 14).toFixed(2)}deg`);
      tile.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      tile.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
    });
    tile.addEventListener("pointerleave", () => {
      tile.classList.remove("tilting");
      tile.style.removeProperty("--rx");
      tile.style.removeProperty("--ry");
    });
  });

  // ---------- magnetic buttons ----------
  document.querySelectorAll(".button").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", `${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px`);
      btn.style.setProperty("--my", `${((e.clientY - (r.top + r.height / 2)) * 0.25).toFixed(1)}px`);
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.removeProperty("--mx");
      btn.style.removeProperty("--my");
    });
  });
})();
