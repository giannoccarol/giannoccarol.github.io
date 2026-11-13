// Code rain behind the name on the home page: columns of web-app code falling like in The Matrix, in the
// token colours of VS Code (Dark+ in the dark theme, Light+ in the light one), on three planes at different
// depths that tilt a little towards the pointer. About 30 steps a second whatever the screen refresh; it
// stops when off screen or in a hidden tab, and draws a single still frame if the system asks for reduced
// motion.
(function () {
  const rain = document.getElementById("rain");
  if (!rain) return;
  const canvases = [...rain.querySelectorAll("canvas")];
  if (!canvases.length || !canvases[0].getContext) return;

  const THEMES = {
    dark: {
      storage: "#569cd6", control: "#c586c0", fn: "#dcdcaa", variable: "#9cdcfe",
      type: "#4ec9b0", string: "#ce9178", number: "#b5cea8", comment: "#6a9955", punct: "#d4d4d4",
      head: "#ffffff",
    },
    light: {
      storage: "#0000ff", control: "#af00db", fn: "#795e26", variable: "#001080",
      type: "#267f99", string: "#a31515", number: "#098658", comment: "#008000", punct: "#3b3b3b",
      head: "#000000",
    },
  };
  const TOKENS = [
    ["storage", "const"], ["storage", "let"], ["storage", "function"], ["storage", "async"], ["storage", "class"],
    ["storage", "interface"], ["storage", "export"],
    ["control", "import"], ["control", "return"], ["control", "await"], ["control", "if"], ["control", "from"],
    ["fn", "useState()"], ["fn", "useEffect()"], ["fn", "fetch()"], ["fn", "map()"], ["fn", "json()"],
    ["fn", "render()"], ["fn", "filter()"], ["fn", "listen()"],
    ["variable", "items"], ["variable", "query"], ["variable", "user"], ["variable", "req"], ["variable", "res"],
    ["variable", "props"], ["variable", "data"], ["variable", "state"],
    ["type", "Promise"], ["type", "Props"], ["type", "Item[]"], ["type", "string"], ["type", "Response"],
    ["string", '"/api/items"'], ["string", '"react"'], ["string", "'utf-8'"], ["string", "`${id}`"],
    ["number", "200"], ["number", "404"], ["number", "3000"], ["number", "0.5"],
    ["punct", "=>"], ["punct", "{ }"], ["punct", "( )"], ["punct", "[ ]"], ["punct", "</>"], ["punct", ";"],
    ["comment", "// TODO"], ["comment", "/* ok */"],
  ];
  const LAYERS = {
    far: { size: 11, speed: [0.3, 0.5], density: 0.85 },
    mid: { size: 15, speed: [0.4, 0.7], density: 0.7 },
    near: { size: 21, speed: [0.5, 0.9], density: 0.5 },
  };
  const FONT = 'ui-monospace, "Cascadia Mono", "JetBrains Mono", Menlo, Consolas, monospace';
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const theme = () => (document.documentElement.getAttribute("data-theme") === "light" ? THEMES.light : THEMES.dark);

  const layers = canvases.map((canvas) => ({ canvas, ctx: canvas.getContext("2d"), cfg: LAYERS[canvas.dataset.depth], cols: [] }));

  function newStream(L, startAbove) {
    const s = {
      y: startAbove ? -Math.random() * L.rows : Math.random() * L.rows,
      speed: L.cfg.speed[0] + Math.random() * (L.cfg.speed[1] - L.cfg.speed[0]),
      active: Math.random() < L.cfg.density,
      last: -1, prevChar: "", prevType: "punct",
    };
    nextToken(s);
    return s;
  }
  function nextToken(s) {
    const [type, text] = TOKENS[(Math.random() * TOKENS.length) | 0];
    s.type = type;
    s.text = text + " ";
    s.i = 0;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const L of layers) {
      const w = L.canvas.clientWidth, h = L.canvas.clientHeight;
      L.canvas.width = Math.round(w * dpr);
      L.canvas.height = Math.round(h * dpr);
      L.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      L.w = w; L.h = h;
      L.cw = L.cfg.size * 0.62; L.ch = L.cfg.size * 1.15;
      L.rows = Math.ceil(h / L.ch);
      L.cols = Array.from({ length: Math.ceil(w / L.cw) }, () => newStream(L, false));
      L.ctx.clearRect(0, 0, w, h);
    }
  }

  function step(L, colors) {
    const ctx = L.ctx;
    // fade what is already drawn; destination-out keeps the canvas transparent
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.globalCompositeOperation = "source-over";
    ctx.font = `${L.cfg.size}px ${FONT}`;
    ctx.textBaseline = "top";
    L.cols.forEach((s, x) => {
      if (!s.active) {
        if (Math.random() < 0.002) s.active = true;
        return;
      }
      s.y += s.speed;
      const row = Math.floor(s.y);
      if (row !== s.last && row >= 0) {
        if (s.last >= 0 && s.prevChar) {
          // the previous head goes back to its token colour
          ctx.clearRect(x * L.cw, s.last * L.ch, L.cw, L.ch);
          ctx.fillStyle = colors[s.prevType];
          ctx.fillText(s.prevChar, x * L.cw, s.last * L.ch);
        }
        if (s.i >= s.text.length) nextToken(s);
        const ch = s.text[s.i++];
        ctx.fillStyle = colors.head;
        ctx.fillText(ch, x * L.cw, row * L.ch);
        s.prevChar = ch;
        s.prevType = s.type;
        s.last = row;
      }
      if (row > L.rows + 4) L.cols[x] = newStream(L, true);
    });
  }

  let raf = 0, visible = true, acc = 0, last = 0;
  function frame(now) {
    acc += now - last;
    last = now;
    if (acc >= 33) {
      const colors = theme();
      for (const L of layers) step(L, colors);
      acc = 0;
    }
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  function start() {
    if (!raf && visible && !reduce) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function still() {
    const colors = theme();
    for (let k = 0; k < 160; k++) for (const L of layers) step(L, colors);
  }

  resize();
  let width = rain.clientWidth;
  new ResizeObserver(() => {
    if (rain.clientWidth === width) return;
    width = rain.clientWidth;
    resize();
    if (reduce) still();
  }).observe(rain);

  window.addEventListener("themechange", () => {
    for (const L of layers) L.ctx.clearRect(0, 0, L.w, L.h);
    if (reduce) still();
  });

  if (reduce) {
    still();
    return;
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
    if (visible) start(); else stop();
  }).observe(rain);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible) start(); else stop();
  });
  window.addEventListener("pointermove", (e) => {
    const r = rain.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width * 0.65)) / (r.width / 2)));
    const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
    rain.style.setProperty("--tx", (x * 9).toFixed(2) + "deg");
    rain.style.setProperty("--ty", (-y * 6).toFixed(2) + "deg");
  }, { passive: true });
  start();
})();
