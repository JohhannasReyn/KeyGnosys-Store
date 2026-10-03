// @ts-nocheck
import { AmbientLight, BoxGeometry, CanvasTexture, CircleGeometry, CylinderGeometry, DirectionalLight, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, TorusGeometry, WebGLRenderer } from 'three';

export function start(): boolean {
  "use strict";

  // Each page is a plain card skin; its text lives only in the HTML overlay (#overlays), shown at rest.
  var PAGES = [
    { accent:"#F2B441" },
    { accent:"#F2B441" },
    { accent:"#4FD1C5" },
    { accent:"#F2B441" }
  ];
  var N = PAGES.length;
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- page texture skins (canvas): card surface and accent-tinted border, no text ---------- */
  function makeTexture(page) {
    var W = 1024, H = 1024;
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d");
    x.fillStyle = "#101116"; x.fillRect(0, 0, W, H);
    x.fillStyle = "#16171d"; roundRect(x, 70, 70, W-140, H-140, 44); x.fill();
    /* accent-tinted border carries the page colour now that the text lives in the overlay */
    x.strokeStyle = page.accent; x.globalAlpha = 0.35; x.lineWidth = 3; roundRect(x, 70, 70, W-140, H-140, 44); x.stroke(); x.globalAlpha = 1;
    var tex = new CanvasTexture(c);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }

  /* ---------- three.js scene ---------- */
  var canvas = document.getElementById("gl");
  var renderer, scene, camera, mesh, geo, planeArr, sphereArr, textures = [];
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  try {
    renderer = new WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) { return false; }
  renderer.setPixelRatio(DPR);
  scene = new Scene();
  camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3;

  var SEG = 96;
  geo = new PlaneGeometry(2, 2, SEG, SEG);
  var posAttr = geo.attributes.position, uvAttr = geo.attributes.uv;
  var vcount = posAttr.count;
  planeArr = new Float32Array(posAttr.array);           // flat targets (z=0)
  sphereArr = new Float32Array(vcount * 3);              // ball targets
  var RS = 0.72;                                         // sphere radius (base units)
  for (var i = 0; i < vcount; i++) {
    var u = uvAttr.array[i*2], v = uvAttr.array[i*2+1];
    var lon = (u - 0.5) * Math.PI * 2.0;
    var lat = (v - 0.5) * Math.PI;
    sphereArr[i*3]   = RS * Math.cos(lat) * Math.sin(lon);
    sphereArr[i*3+1] = RS * Math.sin(lat);
    sphereArr[i*3+2] = RS * Math.cos(lat) * Math.cos(lon);
  }

  for (var p = 0; p < N; p++) textures.push(makeTexture(PAGES[p]));

  // everything lives in `world`, which carries the uniform stage scale
  var world = new Group();
  scene.add(world);

  // the page: a plane that morphs to a sphere, textured with the page headline
  var mat = new MeshBasicMaterial({ map: textures[0], side: DoubleSide, transparent: true });
  mesh = new Mesh(geo, mat);
  world.add(mesh);
  var tmp = geo.attributes.position.array;

  // lights for the metal key & lock (the text sphere is unlit and ignores these)
  // r128 intensities x Math.PI: lighting has been physically correct by default since r155.
  scene.add(new AmbientLight(0xffffff, 0.55 * Math.PI * 0.12));
  var dl1 = new DirectionalLight(0xffffff, 1.15 * Math.PI * 0.7); dl1.position.set(-1.3, 1.7, 2.3); scene.add(dl1);
  var dl2 = new DirectionalLight(0xF2B441, 0.55 * Math.PI * 0.6); dl2.position.set(1.6, -0.7, 1.0); scene.add(dl2);

  // --- procedural key (stylized gold) ---
  var GOLD = new MeshStandardMaterial({ color: 0xF2B441, metalness: 0.9, roughness: 0.26 });
  var keyGroup = new Group();
  (function () {
    var shaftR = 0.07;
    var shaft = new Mesh(new CylinderGeometry(shaftR, shaftR, 0.9, 24), GOLD);
    shaft.rotation.z = Math.PI / 2; shaft.position.x = 0.1; keyGroup.add(shaft);
    var collar = new Mesh(new CylinderGeometry(shaftR * 1.6, shaftR * 1.6, 0.07, 24), GOLD);
    collar.rotation.z = Math.PI / 2; collar.position.x = -0.3; keyGroup.add(collar);
    var bow = new Mesh(new TorusGeometry(0.24, 0.062, 20, 36), GOLD);
    bow.position.x = -0.56; keyGroup.add(bow);
    [[0.36, 0.12], [0.48, 0.17], [0.60, 0.10]].forEach(function (tt) {
      var th = new Mesh(new BoxGeometry(0.07, tt[1], 0.12), GOLD);
      th.position.set(tt[0], -(shaftR + tt[1] / 2 - 0.02), 0); keyGroup.add(th);
    });
  })();
  keyGroup.scale.setScalar(0.0001); world.add(keyGroup);

  // --- procedural padlock (stylized steel), keyhole on its left face ---
  var STEEL = new MeshStandardMaterial({ color: 0xC9CDD7, metalness: 0.85, roughness: 0.3 });
  var DARK = new MeshBasicMaterial({ color: 0x0a0b0e });
  var lockGroup = new Group(), shackle;
  (function () {
    lockGroup.add(new Mesh(new BoxGeometry(0.66, 0.58, 0.34), STEEL));
    shackle = new Mesh(new TorusGeometry(0.19, 0.05, 16, 32, Math.PI), STEEL);
    shackle.position.y = 0.29; lockGroup.add(shackle);
    var hole = new Mesh(new CircleGeometry(0.085, 24), DARK);
    hole.rotation.y = -Math.PI / 2; hole.position.set(-0.331, 0.03, 0); lockGroup.add(hole);
    var slot = new Mesh(new PlaneGeometry(0.055, 0.15), DARK);
    slot.rotation.y = -Math.PI / 2; slot.position.set(-0.331, -0.06, 0); lockGroup.add(slot);
    var ring = new Mesh(new TorusGeometry(0.10, 0.011, 12, 28), new MeshBasicMaterial({ color: 0xF2B441 }));
    ring.rotation.y = -Math.PI / 2; ring.position.set(-0.330, 0.03, 0); lockGroup.add(ring);
  })();
  lockGroup.scale.setScalar(0.0001); world.add(lockGroup);
  var shackleRestY = 0.29;

  /* ---------- state: discrete wheel "tics" step through each cutscene ---------- */
  var gaps = ["key", "ball", "key"];     // transition type per page-gap (edit freely)
  var STAGES = { key: 6, ball: 3 };      // meaningful stages per transition type
  var SUB = 4;                            // wheel tics per stage (higher = smoother, more scrolling)
  var TICS = { key: STAGES.key * SUB, ball: STAGES.ball * SUB };
  var cum = [0];
  for (var gg = 0; gg < N - 1; gg++) cum.push(cum[gg] + TICS[gaps[gg] || "ball"]);
  var total = cum[N - 1];
  var giTarget = 0, visGi = 0, wAccum = 0, page = 0, curPageTex = 0;
  var THRESH = 100;                       // scroll distance that counts as one tic
  var flashEl = document.getElementById("flash");

  // map a (fractional) global tic index to { page-gap, local 0..1, type }
  function mapGi(x) {
    if (x < 0) x = 0; if (x > total) x = total;
    for (var g = 0; g < N - 1; g++) {
      if (x <= cum[g + 1] || g === N - 2) {
        var lt = (x - cum[g]) / TICS[gaps[g] || "ball"];
        if (lt < 0) lt = 0; if (lt > 1) lt = 1;
        return { base: g, lt: lt, type: gaps[g] || "ball" };
      }
    }
    return { base: 0, lt: 0, type: "ball" };
  }

  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var dist = camera.position.z;
    var vh = 2 * dist * Math.tan((camera.fov * Math.PI/180) / 2);
    var vw = vh * camera.aspect;
    var s = Math.min(vw, vh) / 2; // uniform scale: round ball, and no text distortion when flat
    world.scale.set(s, s, s);
  }
  window.addEventListener("resize", fit); fit();

  /* ---------- hud ---------- */
  var dotsWrap = document.getElementById("dots");
  for (var d = 0; d < N; d++) (function (idx) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "tab"); btn.setAttribute("aria-label", "Page " + (idx + 1));
    btn.addEventListener("click", function () { giTarget = cum[idx]; });
    dotsWrap.appendChild(btn);
  })(d);
  var dotBtns = Array.prototype.slice.call(dotsWrap.children);
  var pgCur = document.getElementById("pgCur");
  var hint = document.getElementById("hint");
  function updateHud() {
    dotBtns.forEach(function (b, i) {
      b.setAttribute("aria-current", String(i === page));
      b.setAttribute("aria-selected", String(i === page));
    });
    pgCur.textContent = String(page + 1);
  }

  /* ---------- overlays: the current page's real content is shown (and reachable) only at rest ---------- */
  var ovs = Array.prototype.slice.call(document.querySelectorAll("#overlays .ov"));
  var shown = null; // index of the overlay currently shown, -1 for none
  function showOverlay(idx) {
    if (idx === shown) return;
    shown = idx;
    ovs.forEach(function (ov, i) {
      ov.classList.toggle("show", i === idx);
      if (i === idx) ov.removeAttribute("inert"); else ov.setAttribute("inert", "");
    });
  }

  /* ---------- input: each tic advances the cutscene one stage ---------- */
  function step(n) { giTarget = Math.max(0, Math.min(total, giTarget + n)); }
  function accumulate(dy) {
    wAccum += dy;
    var steps = wAccum > 0 ? Math.floor(wAccum / THRESH) : Math.ceil(wAccum / THRESH);
    if (steps !== 0) { step(steps); wAccum -= steps * THRESH; }
    if (hint) hint.style.opacity = "0";
  }
  window.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var dy = ev.deltaY;
    if (ev.deltaMode === 1) dy *= 16; else if (ev.deltaMode === 2) dy *= window.innerHeight;
    accumulate(dy);
  }, { passive: false });
  var touchY = null;
  window.addEventListener("touchstart", function (e) { if (e.touches[0]) touchY = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchmove", function (e) {
    if (touchY === null || !e.touches[0]) return;
    var dy = (touchY - e.touches[0].clientY) * 2.4; touchY = e.touches[0].clientY;
    accumulate(dy);
  }, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { step(SUB); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { step(-SUB); }
  });

  /* ---------- helpers ---------- */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ss(a, b, t) { t = (t - a) / (b - a); if (t < 0) t = 0; else if (t > 1) t = 1; return t * t * (3 - 2 * t); }
  function morph(c) {
    if (c < 0.0005) c = 0;
    for (var i = 0; i < vcount; i++) {
      var i3 = i * 3;
      tmp[i3]     = planeArr[i3]     + (sphereArr[i3]     - planeArr[i3])     * c;
      tmp[i3 + 1] = planeArr[i3 + 1] + (sphereArr[i3 + 1] - planeArr[i3 + 1]) * c;
      tmp[i3 + 2] = planeArr[i3 + 2] + (sphereArr[i3 + 2] - planeArr[i3 + 2]) * c;
    }
    geo.attributes.position.needsUpdate = true;
  }

  /* ---------- render: the eased tic position drives the cutscene ---------- */
  function draw() {
    visGi += (giTarget - visGi) * 0.16;
    if (Math.abs(giTarget - visGi) < 0.0015) visGi = giTarget;
    var moving = Math.min(1, Math.abs(giTarget - visGi) * 2.5); // 0 at rest, 1 while scrolling

    var m = mapGi(visGi), base = m.base, lt = m.lt, type = m.type;
    if (reduce) lt = lt < 0.5 ? 0 : 1;

    var pg = lt < 0.5 ? base : Math.min(base + 1, N - 1);
    if (pg !== page) { page = pg; updateHud(); }
    showOverlay(visGi === giTarget && visGi === cum[page] ? page : -1);

    var swapAt = (type === "key") ? 0.6 : 0.5;
    var wantTex = lt < swapAt ? base : Math.min(base + 1, N - 1);
    if (curPageTex !== wantTex) { mat.map = textures[wantTex]; mat.map.needsUpdate = true; curPageTex = wantTex; }

    if (type === "ball") {
      // 3 tics: page -> ball (0..1/3) -> ball rotates (1/3..2/3) -> ball -> page (2/3..1)
      var curlB = (lt < 0.5) ? ss(0.0, 0.33, lt) : 1 - ss(0.66, 1.0, lt);
      mesh.visible = true;
      mesh.scale.setScalar(1);
      mesh.rotation.set(0, lt * Math.PI * 2, 0);   // exactly one turn: lands face-on
      morph(curlB);
      keyGroup.visible = false; lockGroup.visible = false;
      if (flashEl) flashEl.style.opacity = "0";
    } else {
      // 6 tics: ball(1/6) -> key(2/6) -> insert(3/6) -> turn+open(4/6) -> next-page ball(5/6) -> page(6/6)
      var curlUp   = ss(0.02, 0.167, lt);
      var condense = ss(0.20, 0.333, lt);
      var keyIn    = ss(0.20, 0.333, lt);
      var lockIn   = ss(0.38, 0.50, lt);   // lock arrives with the insert
      var insert   = ss(0.40, 0.50, lt);
      var turn     = ss(0.55, 0.667, lt);
      var pop      = ss(0.57, 0.667, lt);
      var away     = ss(0.68, 0.80, lt);   // key & lock recede after the unlock
      var revealB  = ss(0.70, 0.833, lt);  // next page grows back into a ball (tic 5)
      var unfurl   = ss(0.86, 1.00, lt);   // ...then the ball flattens to the page (tic 6)

      var sScale, cNow, spin;
      if (lt < 0.667) { cNow = curlUp; sScale = 1 - condense; spin = curlUp * Math.PI * 2; }
      else { cNow = 1 - unfurl; sScale = revealB; spin = (1 - ss(0.667, 0.833, lt)) * Math.PI * 0.5; }
      mesh.visible = sScale > 0.002;
      mesh.scale.setScalar(Math.max(0.0001, sScale));
      mesh.rotation.set(spin, spin * 0.5, 0);
      morph(cNow);

      var kS = keyIn * (1 - away);
      keyGroup.visible = kS > 0.002;
      keyGroup.scale.setScalar(Math.max(0.0001, kS));
      keyGroup.position.x = lerp(-0.15, 0.34, insert);
      keyGroup.rotation.x = turn * Math.PI / 2;
      keyGroup.rotation.z = (1 - keyIn) * -0.7;

      var lS = lockIn * (1 - away);
      lockGroup.visible = lS > 0.002;
      lockGroup.scale.setScalar(Math.max(0.0001, lS));
      lockGroup.position.x = lerp(1.7, 0.86, lockIn);
      shackle.position.y = shackleRestY + pop * 0.16;
      shackle.rotation.z = pop * 0.5;

      if (flashEl) {
        // burst during the turn — gated on motion so it never lingers on a rest stop
        var fl = 1 - Math.abs(lt - 0.6) / 0.06; if (fl < 0) fl = 0;
        flashEl.style.opacity = String(fl * moving * 0.85);
      }
    }

    renderer.render(scene, camera);
  }
  function frame() {
    draw();
    requestAnimationFrame(frame);
  }

  updateHud();
  draw();
  document.body.classList.add("immersive");
  requestAnimationFrame(frame);
  setTimeout(function () { if (hint && giTarget === 0) hint.style.opacity = "1"; }, 4000);
  return true;
}
