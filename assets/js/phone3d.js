// The phone in the header of each phone page, and in its tile on the home page, as a 3D model that turns
// slowly by itself; in the page header it also follows a drag. Hand-written WebGL, no library. The phone's
// photo is the back of the model, a picture or a drawing is the front (screen off, glass, earpiece, front
// camera), and the sides take the colour of the body. The sizes come from the phones' published dimensions.
// Without WebGL the photo simply stays where it is.
(function () {
  // Millimetres: body width, height, depth; corner radius; rounding of the back and front edges; screen
  // borders (top, bottom, sides). Colours are 0-1 sRGB. "metal" sides reflect like aluminium; tone:
  // exposure, contrast and contrast pivot of the final colour.
  const PHONES = {
    "lumia-950-xl": {
      body: [78.4, 151.9, 8.1], corner: 4.4,
      // measured on the side view of the sheet: a flatter back curve than the 1520, a thin front edge
      edge: {
        back: [[7.2, 0], [5.5, 0.29], [4.2, 0.5], [3.2, 0.75], [2.3, 0.95], [1.5, 1.16], [0.85, 1.45], [0.3, 1.74],
          [0, 2.0]],
        front: [[0, 0.9], [0.29, 0.58], [0.6, 0.35], [1.0, 0.2], [1.5, 0.07], [2.0, 0]],
        glass: 2.0
      },
      screen: [15.0, 10.7, 3.7], side: [0.13, 0.135, 0.145], metal: false, gloss: 0.08, iris: true,
      tone: [0.85, 1.3, 0.3], // a little darker and more contrast: deep black, brighter logo and camera ring
      front: "lumia-950-xl-front.webp",
      camera: { u: 0.5014, v: 0.1518, r: 0.1518, height: 1.7 },
      // volume up, power, volume down, camera; keyBand: centre below the front face and height, in mm
      keys: [[0.348, 0.386], [0.403, 0.478], [0.495, 0.533], [0.777, 0.836]], keyColor: [0.72, 0.73, 0.75],
      keyBand: [3.6, 1.4]
    },
    // front: picture of the front in 3d/ (tools/phone-textures.py); camera: raised disc on the back, centre
    // and radius as fractions of the back photo, height in mm; keys: on the right side, top and bottom as
    // fractions of the height
    "lumia-1520": {
      body: [85.4, 162.8, 8.7], corner: 2.6,
      // measured on the side view of the sheet: the back rises towards the edge, the front glass is flat
      // inside a 2.6 mm rim, so the edge itself is thin and rounded
      edge: {
        back: [[9.8, 0], [7.9, 0.32], [6.6, 0.62], [5.5, 1.08], [4.5, 1.37], [3.5, 1.77], [2.6, 2.17],
          [1.9, 2.6], [1.3, 3.15], [0.64, 3.95], [0.32, 4.5], [0, 5.1]],
        front: [[0, 2.2], [0.32, 1.2], [0.64, 0.92], [0.96, 0.52], [1.3, 0.3], [1.6, 0.1], [1.93, 0]],
        glass: 2.6
      },
      screen: [16.6, 15.7, 5.9], side: [0.86, 0.84, 0.3], metal: false, gloss: 0.6, iris: false,
      front: "lumia-1520-front.webp",
      camera: { u: 0.4962, v: 0.2428, r: 0.103, height: 1.6 },
      keys: [[0.2428, 0.3840], [0.4679, 0.5390], [0.7532, 0.8243]], keyColor: [0.73, 0.71, 0.65]
    },
    "lumia-930": {
      body: [71, 137, 9.8], corner: 3.1,
      // measured on the side view: the orange cover curves away over about 23 mm, the aluminium frame is
      // straight for 6.9 mm below the front (frame: where the cover begins, in mm from the front face)
      edge: {
        back: [[23.1, 0], [17.2, 0.25], [11.9, 0.49], [9.8, 0.74], [8.2, 0.98], [6.4, 1.22], [4.8, 1.47], [3.7, 1.72],
          [2.65, 1.96], [1.6, 2.2], [1.06, 2.45], [0.53, 2.7], [0, 2.94]],
        front: [[0, 0.74], [0.27, 0.49], [0.8, 0.2], [1.25, 0]],
        glass: 1.25,
        frame: 6.9
      },
      screen: [8.9, 16.0, 5.2], side: [0.72, 0.72, 0.73], metal: true, gloss: 0.5, iris: false,
      cover: [0.93, 0.39, 0.18],
      front: "lumia-930-front.webp",
      // volume, power, camera
      keys: [[0.209, 0.360], [0.442, 0.500], [0.686, 0.756]], keyColor: [0.85, 0.85, 0.86], keyBand: [3.1, 2.2]
    }
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- small matrix helpers (column-major, as WebGL wants) ----------
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++)
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  }
  function rotateY(t) { const c = Math.cos(t), s = Math.sin(t); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }
  function rotateX(t) { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
  function translate(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }

  // ---------- geometry: a rounded slab swept around the outline of the photo ----------
  // The body is 2 units tall and as wide as the photo's proportions; depth and radii scale with it.
  function buildMesh(cfg, aspect) {
    const H = 2, W = H * aspect, mm = H / cfg.body[1];
    const T = cfg.body[2] * mm, R = cfg.corner * mm;
    const outline = []; // [x, y, normal x, normal y, corner centre x, centre y, corner quadrant x, y]
    const cornerSteps = 12, ax = W / 2 - R, ay = H / 2 - R;
    [[ax, ay, 1, 1], [-ax, ay, -1, 1], [-ax, -ay, -1, -1], [ax, -ay, 1, -1]].forEach(function (c, k) {
      for (let i = 0; i <= cornerSteps; i++) {
        const t = (k + i / cornerSteps) * Math.PI / 2;
        outline.push([c[0] + R * Math.cos(t), c[1] + R * Math.sin(t), Math.cos(t), Math.sin(t), c[0], c[1], c[2], c[3]]);
      }
    });
    outline.push(outline[0]); // close the loop
    // a point d inside the outline; deeper than the corner radius the corner becomes a sharp one
    function inset(p, d) {
      if (d <= R) return [p[4] + (R - d) * p[2], p[5] + (R - d) * p[3]];
      return [p[4] + (R - d) * p[6], p[5] + (R - d) * p[7]];
    }

    // edge profile from the back face to the front face, as [inset, z]. A measured profile (cfg.edge: back
    // rise and front drop in mm, by inset from the outline) when the phone has one, two round edges otherwise.
    const pts = [];
    let backInset, frontInset;
    if (cfg.edge) {
      cfg.edge.back.forEach(function (q) { pts.push([q[0] * mm, -T / 2 + q[1] * mm]); });
      cfg.edge.front.forEach(function (q) { pts.push([q[0] * mm, T / 2 - q[1] * mm]); });
      pts.push([cfg.edge.glass * mm, T / 2]);
      backInset = cfg.edge.back[0][0] * mm;
      frontInset = cfg.edge.glass * mm;
    } else {
      const rb = Math.min(cfg.backEdge * mm, R * 0.9, T * 0.45);
      const rf = Math.min(cfg.frontEdge * mm, R * 0.9, T * 0.45);
      for (let i = 0; i <= 6; i++) {
        const t = -Math.PI / 2 + (Math.PI / 2) * i / 6;
        pts.push([rb - rb * Math.cos(t), -T / 2 + rb + rb * Math.sin(t)]);
      }
      for (let i = 0; i <= 6; i++) {
        const t = (Math.PI / 2) * i / 6;
        pts.push([rf - rf * Math.cos(t), T / 2 - rf + rf * Math.sin(t)]);
      }
      backInset = rb;
      frontInset = rf;
    }
    // normals from the neighbouring segments (outwards, z); the path runs back to front around the edge
    function segNormal(a, b) {
      const to = -(b[0] - a[0]), tz = b[1] - a[1], l = Math.hypot(to, tz) || 1;
      return [tz / l, -to / l];
    }
    const profile = pts.map(function (q, i) {
      const n1 = i > 0 ? segNormal(pts[i - 1], q) : null, n2 = i < pts.length - 1 ? segNormal(q, pts[i + 1]) : null;
      let no = (n1 ? n1[0] : 0) + (n2 ? n2[0] : 0), nz = (n1 ? n1[1] : 0) + (n2 ? n2[1] : 0);
      const l = Math.hypot(no, nz) || 1;
      return [q[0], q[1], no / l, nz / l];
    });

    const verts = [], index = [];
    // 0 = back (photo), 1 = sides, 2 = front (screen), 3 = keys, 4 = back cover beside the photo
    function vertex(x, y, z, nx, ny, nz, mat) {
      const u = mat === 2 ? 0.5 + x / W : 0.5 - x / W; // the back is seen from behind
      verts.push(x, y, z, nx, ny, nz, u, 0.5 - y / H, mat);
      return verts.length / 9 - 1;
    }
    // The sides, one quad at a time so each can take its own material: where the surface faces backwards
    // it shows the back photo projected straight on (the photo is a view from behind), elsewhere the body colour.
    for (let i = 0; i < outline.length - 1; i++)
      for (let j = 0; j < profile.length - 1; j++) {
        const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
        const facing = (profile[j][3] + profile[j + 1][3]) / 2;
        // below the metal frame (cfg.edge.frame) the steep part of the back cover keeps the cover colour
        const onCover = cfg.edge && cfg.edge.frame !== undefined &&
          (profile[j][1] + profile[j + 1][1]) / 2 < T / 2 - cfg.edge.frame * mm;
        const mat = facing < -0.45 ? 0 : onCover ? 4 : 1;
        const first = verts.length / 9;
        corners.forEach(function (c) {
          const p = outline[c[0]], q = profile[c[1]], xy = inset(p, q[0]);
          vertex(xy[0], xy[1], q[1], p[2] * q[2], p[3] * q[2], q[3], mat);
        });
        index.push(first, first + 1, first + 2, first, first + 2, first + 3);
      }
    [[backInset, -T / 2, -1, 0], [frontInset, T / 2, 1, 2]].forEach(function (cap) {
      const center = vertex(0, 0, cap[1], 0, 0, cap[2], cap[3]);
      const first = verts.length / 9;
      outline.forEach(function (p) {
        const xy = inset(p, cap[0]);
        vertex(xy[0], xy[1], cap[1], 0, 0, cap[2], cap[3]);
      });
      for (let i = 0; i < outline.length - 1; i++) index.push(center, first + i, first + i + 1);
    });

    // the outermost band of the side, where keys sit: the z range around the widest point
    let keyZ = [-T / 4, T / 4];
    {
      let lo = 0, hi = 0;
      profile.forEach(function (q, i) { if (q[0] < profile[lo][0] || (q[0] === profile[lo][0] && i < lo)) lo = i; });
      hi = lo;
      while (hi + 1 < profile.length && profile[hi + 1][0] <= profile[lo][0] + 0.15 * mm) hi++;
      const mid = (profile[lo][1] + profile[hi][1]) / 2, half = Math.max(0.8 * mm, Math.abs(profile[hi][1] - profile[lo][1]) / 2);
      keyZ = [mid - half, mid + half];
    }
    if (cfg.keyBand) keyZ = [T / 2 - (cfg.keyBand[0] + cfg.keyBand[1] / 2) * mm, T / 2 - (cfg.keyBand[0] - cfg.keyBand[1] / 2) * mm];

    // the camera as a raised disc: its top and rounded rim show the photo, its wall the body colour
    if (cfg.camera) {
      const cx = (0.5 - cfg.camera.u) * W, cy = (0.5 - cfg.camera.v) * H;
      const r = cfg.camera.r * W, hgt = cfg.camera.height * mm, bev = Math.min(hgt * 0.6, r * 0.12);
      const base = -T / 2, top = base - hgt, steps = 48;
      // rings: [radius, z, normal outwards, normal z, material]
      // the third ring repeats the second with the other material, so the two never blend
      const rings = [[r - bev, top, 0, -1, 0], [r - bev * 0.3, top + bev * 0.3, 0.6, -0.8, 0],
        [r - bev * 0.3, top + bev * 0.3, 0.6, -0.8, 1], [r, top + bev, 1, 0, 1], [r, base, 1, 0, 1]];
      const firstRing = verts.length / 9;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        rings.forEach(function (g) {
          vertex(cx + c * g[0], cy + s * g[0], g[1], c * g[2], s * g[2], g[3], g[4]);
        });
      }
      for (let i = 0; i < steps; i++)
        for (let j = 0; j < rings.length - 1; j++) {
          const a = firstRing + i * rings.length + j, b = a + rings.length;
          index.push(a, b, a + 1, a + 1, b, b + 1);
        }
      const disc = vertex(cx, cy, top, 0, 0, -1, 0);
      for (let i = 0; i < steps; i++)
        index.push(disc, firstRing + i * rings.length, firstRing + (i + 1) * rings.length);
    }

    // side keys: small blocks standing out of the right side (material 3)
    (cfg.keys || []).forEach(function (k) {
      const x0 = W / 2 - 0.8 * mm, x1 = W / 2 + 0.5 * mm, z0 = keyZ[0], z1 = keyZ[1];
      const y0 = (0.5 - k[1]) * H, y1 = (0.5 - k[0]) * H;
      [
        [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]],
        [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0]],
        [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
        [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]],
        [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1]]
      ].forEach(function (f) {
        const n = f[4];
        const a = vertex(f[0][0], f[0][1], f[0][2], n[0], n[1], n[2], 3);
        vertex(f[1][0], f[1][1], f[1][2], n[0], n[1], n[2], 3);
        vertex(f[2][0], f[2][1], f[2][2], n[0], n[1], n[2], 3);
        vertex(f[3][0], f[3][1], f[3][2], n[0], n[1], n[2], 3);
        index.push(a, a + 1, a + 2, a, a + 2, a + 3);
      });
    });

    return { verts: verts, index: index };
  }

  // ---------- shaders ----------
  const VS = [
    "attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUv; attribute float aMat;",
    "uniform mat4 uModel; uniform mat4 uViewProj;",
    "varying vec3 vPos; varying vec3 vNor; varying vec2 vUv; varying float vMat;",
    "void main() {",
    "  vec4 wp = uModel * vec4(aPos, 1.0);",
    "  vPos = wp.xyz; vNor = (uModel * vec4(aNor, 0.0)).xyz; vUv = aUv; vMat = aMat;", // rotation only
    "  gl_Position = uViewProj * wp;",
    "}"
  ].join("\n");
  const FS = [
    "precision mediump float;",
    "varying vec3 vPos; varying vec3 vNor; varying vec2 vUv; varying float vMat;",
    "uniform sampler2D uBack; uniform sampler2D uFront;",
    "uniform vec3 uSide; uniform vec3 uKey; uniform vec3 uEye; uniform vec3 uAccent; uniform float uMetal; uniform float uGloss;",
    "uniform vec3 uTone;", // exposure, contrast, contrast pivot
    "uniform vec3 uCover;",
    "vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }",
    // a studio around the phone: dark floor, a soft box above, two tall strips at the sides
    "vec3 studio(vec3 r) {",
    "  float up = r.y * 0.5 + 0.5;",
    "  vec3 c = mix(vec3(0.015), vec3(0.12), smoothstep(0.25, 1.0, up));",
    "  c += vec3(0.9) * smoothstep(0.78, 0.97, up);",
    "  c += vec3(0.55) * smoothstep(0.6, 0.92, abs(r.x)) * smoothstep(0.35, 0.65, up);",
    "  return c;",
    "}",
    "void main() {",
    "  vec3 N = normalize(vNor);",
    "  vec3 V = normalize(uEye - vPos);",
    "  vec3 base; float spec; float shine; float refl; float metal = 0.0;",
    "  if (vMat < 0.5) {",
    "    vec4 t = texture2D(uBack, vUv);",
    "    base = mix(lin(uSide), lin(t.rgb), t.a);",
    "    spec = uGloss * uGloss + 0.02; shine = mix(8.0, 70.0, uGloss); refl = uGloss * 0.6;", // matte stays dark
    "  } else if (vMat < 1.5) {",
    "    base = lin(uSide); metal = uMetal;",
    "    spec = mix(uGloss * uGloss + 0.02, 0.9, uMetal); shine = mix(mix(8.0, 70.0, uGloss), 45.0, uMetal); refl = mix(uGloss * 0.6, 0.9, uMetal);",
    "  } else if (vMat < 2.5) {",
    "    base = lin(texture2D(uFront, vUv).rgb);",
    "    spec = 0.9; shine = 180.0; refl = 1.0;",
    "  } else if (vMat < 3.5) {",
    "    base = lin(uKey); metal = 0.7;",
    "    spec = 0.8; shine = 40.0; refl = 0.7;",
    "  } else {",
    "    base = lin(uCover);",
    "    spec = uGloss * uGloss + 0.02; shine = mix(8.0, 70.0, uGloss); refl = uGloss * 0.6;",
    "  }",
    "  float glass = step(1.5, vMat) * step(vMat, 2.5);",
    "  vec3 L1 = normalize(vec3(-0.55, 0.75, 0.9));",
    "  vec3 L2 = normalize(vec3(0.9, 0.15, 0.45));",
    "  vec3 L3 = normalize(vec3(0.35, 0.3, -1.0));",
    "  float d1 = max(dot(N, L1), 0.0), d2 = max(dot(N, L2), 0.0), d3 = max(dot(N, L3), 0.0);",
    "  float ndv = max(dot(N, V), 0.0);",
    "  float s = pow(max(dot(N, normalize(L1 + V)), 0.0), shine) + 0.5 * pow(max(dot(N, normalize(L2 + V)), 0.0), shine);",
    "  float f0 = mix(0.05, 0.04, glass);",
    "  float fres = f0 + (1.0 - f0) * pow(1.0 - ndv, 5.0);",
    "  vec3 env = studio(reflect(-V, N));",
    "  vec3 diffuse = base * (0.16 + 0.8 * d1 + 0.32 * d2 + 0.22 * d3);",
    "  vec3 tint = mix(vec3(1.0), base, metal);",
    // glass keeps a little reflection even head-on, like a real screen
    "  float mirror = mix(mix(fres, 0.6, metal), 0.12 + 0.88 * fres, glass);",
    // brushed metal keeps some light of its own, so it reads as silver also where the studio reflects dark
    "  vec3 col = diffuse * (1.0 - 0.45 * metal) + tint * s * spec + env * tint * refl * mirror;",
    "  col += uAccent * pow(1.0 - ndv, 3.0) * d3 * 0.35;",
    "  vec3 c = pow(col * uTone.x, vec3(1.0 / 2.2));",
    "  c = clamp((c - uTone.z) * uTone.y + uTone.z, 0.0, 1.0);",
    "  gl_FragColor = vec4(c, 1.0);",
    "}"
  ].join("\n");

  // wait for the file only: decode() can stay pending in a background tab
  function load(image) {
    return new Promise(function (resolve, reject) {
      if (image.complete && image.naturalWidth) return resolve();
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
  }

  // ---------- textures: the photo for the back, a picture or a drawing for the front ----------
  function pot(n) { return Math.min(2048, Math.pow(2, Math.ceil(Math.log2(n)))); }
  function texture(gl, source, unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function backCanvas(photo) {
    const c = document.createElement("canvas");
    c.width = pot(photo.naturalWidth * 2);
    c.height = pot(photo.naturalHeight * 2);
    c.getContext("2d").drawImage(photo, 0, 0, c.width, c.height);
    return c;
  }
  // picture: the front cut from a product sheet, when the phone has one; otherwise a drawing
  function frontCanvas(cfg, picture) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 2048;
    const g = c.getContext("2d");
    const sx = c.width / cfg.body[0], sy = c.height / cfg.body[1]; // pixels per mm, per axis
    const top = cfg.screen[0], bottom = cfg.screen[1], side = cfg.screen[2];
    const screenRect = [side * sx, top * sy, (cfg.body[0] - 2 * side) * sx, (cfg.body[1] - top - bottom) * sy];
    if (picture) {
      g.drawImage(picture, 0, 0, c.width, c.height);
    } else {
      g.fillStyle = "#151519";
      g.fillRect(0, 0, c.width, c.height);
      const screen = g.createLinearGradient(0, 0, 0, c.height);
      screen.addColorStop(0, "#0a0b10");
      screen.addColorStop(1, "#030304");
      g.fillStyle = screen;
      g.fillRect(screenRect[0], screenRect[1], screenRect[2], screenRect[3]);
    }
    // a soft diagonal sheen on the glass, so the screen never reads as a flat black block
    const sheen = g.createLinearGradient(0, c.height * 0.15, c.width, c.height * 0.55);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.05)");
    sheen.addColorStop(0.5, "rgba(255,255,255,0.09)");
    sheen.addColorStop(0.62, "rgba(255,255,255,0)");
    g.fillStyle = sheen;
    g.fillRect(screenRect[0], screenRect[1], screenRect[2], screenRect[3]);
    if (picture) return c;
    function dot(x, y, r, color) {
      g.fillStyle = color;
      g.beginPath();
      g.ellipse(x * sx, y * sy, r * sx, r * sy, 0, 0, Math.PI * 2);
      g.fill();
    }
    const mid = cfg.body[0] / 2, ear = top * 0.48;
    g.fillStyle = "#34353b";
    g.beginPath();
    if (g.roundRect) g.roundRect((mid - 6) * sx, (ear - 0.6) * sy, 12 * sx, 1.2 * sy, 0.6 * sx);
    else g.rect((mid - 6) * sx, (ear - 0.6) * sy, 12 * sx, 1.2 * sy);
    g.fill();
    dot(mid + 13, ear, 1.5, "#2a2b31");
    dot(mid + 13, ear, 0.75, "#0b1020");
    dot(mid + 12.75, ear - 0.25, 0.22, "#5a6a90");
    if (cfg.iris) {
      dot(mid - 13, ear, 1.5, "#2a2b31");
      dot(mid - 13, ear, 0.75, "#1c0a0d");
      dot(mid - 19, ear, 0.9, "#26262b");
    }
    return c;
  }

  // ---------- one viewer per photo marked with data-phone (data-phone-mode="tile" on the home page) ----------
  function viewer(img) {
    const cfg = PHONES[img.dataset.phone];
    if (!cfg) return;
    const tile = img.dataset.phoneMode === "tile";
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl) return;

    // the back is always the full-size photo, also where the page shows a smaller copy
    const base = img.currentSrc || img.src;
    const photoSrc = new URL(img.dataset.phone + ".webp", base).href;
    let photo = img;
    if (photoSrc !== base) {
      photo = new Image();
      photo.src = photoSrc;
    }
    let picture = null;
    if (cfg.front) {
      picture = new Image();
      picture.src = new URL("3d/" + cfg.front, base).href;
    }
    Promise.all([load(photo), picture ? load(picture).catch(function () { picture = null; }) : null]).then(run, function () {});

    function run() {
      const mesh = buildMesh(cfg, photo.naturalWidth / photo.naturalHeight);
      function shader(type, src) {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
      }
      const vs = shader(gl.VERTEX_SHADER, VS), fs = shader(gl.FRAGMENT_SHADER, FS);
      if (!vs || !fs) return;
      const prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.verts), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.index), gl.STATIC_DRAW);
      [["aPos", 3, 0], ["aNor", 3, 3], ["aUv", 2, 6], ["aMat", 1, 8]].forEach(function (a) {
        const loc = gl.getAttribLocation(prog, a[0]);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, a[1], gl.FLOAT, false, 36, a[2] * 4);
      });
      const u = {};
      ["uModel", "uViewProj", "uBack", "uFront", "uSide", "uKey", "uEye", "uAccent", "uMetal", "uGloss", "uTone", "uCover"].forEach(function (n) {
        u[n] = gl.getUniformLocation(prog, n);
      });
      texture(gl, backCanvas(photo), 0);
      texture(gl, frontCanvas(cfg, picture), 1);
      gl.uniform1i(u.uBack, 0);
      gl.uniform1i(u.uFront, 1);
      gl.uniform3fv(u.uSide, cfg.side);
      gl.uniform3fv(u.uKey, cfg.keyColor || cfg.side);
      gl.uniform3fv(u.uAccent, [1.0, 0.35, 0.0]);
      gl.uniform1f(u.uMetal, cfg.metal ? 1 : 0);
      gl.uniform1f(u.uGloss, cfg.gloss);
      gl.uniform3fv(u.uTone, cfg.tone || [1, 1, 0.5]);
      gl.uniform3fv(u.uCover, cfg.cover || cfg.side);
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0, 0, 0, 0);

      // ---------- view ----------
      const camDist = tile ? 4.3 : 4.6, fov = 30 * Math.PI / 180, pitch = 0.12;
      let viewProj = null, ready = false;
      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, w, h);
        viewProj = multiply(perspective(fov, w / h, 0.1, 20), translate(0, 0, -camDist));
        gl.uniform3fv(u.uEye, [0, 0, camDist]);
      }
      let yaw = reduced ? -0.6 : -0.35; // start showing the back, a little turned
      function draw() {
        if (!ready) return;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // face the back first: yaw 0 shows the front, so turn half a circle
        gl.uniformMatrix4fv(u.uModel, false, multiply(rotateX(pitch), rotateY(yaw + Math.PI)));
        gl.uniformMatrix4fv(u.uViewProj, false, viewProj);
        gl.drawElements(gl.TRIANGLES, mesh.index.length, gl.UNSIGNED_SHORT, 0);
      }

      canvas.className = tile ? "tile__3d" : "device-hero__3d";
      if (tile) {
        canvas.setAttribute("aria-hidden", "true"); // the tile's text already names the phone
      } else {
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", img.alt);
        canvas.tabIndex = 0;
      }
      img.after(canvas);
      resize();
      ready = true;
      draw();
      img.classList.add("is-replaced");

      // ---------- motion: a slow turn; in the header a drag spins it, and the spin settles back ----------
      const cruise = reduced ? 0 : tile ? 0.35 : 0.42; // radians per second
      let speed = cruise, dragging = false, lastX = 0, lastMove = 0, raf = 0, last = 0, visible = true;
      function frame(now) {
        raf = 0;
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        if (!dragging) {
          speed += (cruise - speed) * (1 - Math.exp(-dt * 1.6));
          yaw += speed * dt;
        }
        draw();
        if (visible && (dragging || Math.abs(speed) > 0.002)) raf = requestAnimationFrame(frame);
        else last = 0;
      }
      function start() {
        if (!raf && visible) raf = requestAnimationFrame(frame);
      }

      if (!tile) {
        canvas.addEventListener("pointerdown", function (e) {
          dragging = true;
          lastX = e.clientX;
          lastMove = performance.now();
          speed = 0;
          canvas.setPointerCapture(e.pointerId);
          canvas.classList.add("is-dragging");
          start();
        });
        canvas.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          const now = performance.now(), dx = e.clientX - lastX;
          const step = dx * 0.011;
          yaw += step;
          speed = step / Math.max(0.008, (now - lastMove) / 1000);
          lastX = e.clientX;
          lastMove = now;
        });
        const release = function () {
          if (!dragging) return;
          dragging = false;
          if (performance.now() - lastMove > 80) speed = 0; // held still before letting go
          speed = Math.max(-12, Math.min(12, speed));
          canvas.classList.remove("is-dragging");
          start();
        };
        canvas.addEventListener("pointerup", release);
        canvas.addEventListener("pointercancel", release);
        canvas.addEventListener("keydown", function (e) {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          speed += e.key === "ArrowLeft" ? -2.5 : 2.5;
          start();
        });
      }

      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting && !document.hidden;
          start();
        }).observe(canvas);
      }
      document.addEventListener("visibilitychange", function () {
        visible = !document.hidden;
        start();
      });
      if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); draw(); }).observe(canvas);
      canvas.addEventListener("webglcontextlost", function () {
        ready = false;
        canvas.remove();
        img.classList.remove("is-replaced");
      });
      start();
    }
  }

  document.querySelectorAll("img[data-phone]").forEach(viewer);
})();
