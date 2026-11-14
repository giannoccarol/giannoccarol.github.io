// Dot field behind the name on the home page: a grid of small dots that light up in orange and grow near the
// pointer, with a slow wave running across while the mouse is still. Quiet behind the text, livelier on the
// right. It only animates while on screen; with reduced motion it draws one still frame.
(function () {
  const stage = document.getElementById("dots");
  if (!stage) return;
  const canvas = stage.querySelector("canvas");
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  if (!ctx) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const GAP = 24;
  const RADIUS = 170; // how far the pointer reaches, in CSS pixels
  let w = 0, h = 0;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = stage.clientWidth;
    h = stage.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(t) {
    mouse.x += (mouse.tx - mouse.x) * 0.15;
    mouse.y += (mouse.ty - mouse.y) * 0.15;
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const narrow = w < 700;
    ctx.clearRect(0, 0, w, h);
    for (let y = GAP / 2; y < h; y += GAP) {
      for (let x = GAP / 2; x < w; x += GAP) {
        // quiet behind the text on the left; on phones the text spans the width, so everything stays quiet
        const fade = narrow ? 0.45 : Math.min(1, Math.max(0, (x / w - 0.25) / 0.35));
        const near = mouse.on ? Math.max(0, 1 - Math.hypot(x - mouse.x, y - mouse.y) / RADIUS) : 0;
        const wave = reduce ? 0 : ((Math.sin(x * 0.02 + y * 0.015 - t * 0.0016) + 1) / 2) * 0.35;
        const k = Math.max(near, wave * (1 - near));
        const alpha = (0.16 + k * 0.75) * fade;
        if (alpha < 0.02) continue;
        if (near > 0.05) {
          ctx.fillStyle = `rgba(255,${Math.round(90 + (1 - near) * 80)},0,${alpha.toFixed(3)})`;
        } else if (light) {
          ctx.fillStyle = `rgba(20,20,20,${alpha.toFixed(3)})`;
        } else {
          const g = Math.round(130 + (1 - near) * 120);
          ctx.fillStyle = `rgba(${g},${g},${g},${alpha.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(x, y, 1 + k * 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  let raf = 0, visible = true;
  function frame(now) {
    draw(now);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  function start() {
    if (!raf && visible && !reduce) raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  resize();
  let size = `${stage.clientWidth}x${stage.clientHeight}`;
  new ResizeObserver(() => {
    const now = `${stage.clientWidth}x${stage.clientHeight}`;
    if (now === size) return;
    size = now;
    resize();
    if (reduce) draw(0);
  }).observe(stage);
  window.addEventListener("themechange", () => { if (reduce) draw(0); });

  if (reduce) {
    draw(0);
    return;
  }
  if (finePointer) {
    window.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      mouse.tx = e.clientX - r.left;
      mouse.ty = e.clientY - r.top;
      mouse.on = mouse.ty > -RADIUS && mouse.ty < h + RADIUS;
    }, { passive: true });
    document.addEventListener("pointerleave", () => { mouse.on = false; });
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
    if (visible) start(); else stop();
  }).observe(stage);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible) start(); else stop();
  });
  start();
})();
