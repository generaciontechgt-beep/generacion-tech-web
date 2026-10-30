/* ============================================================
   GT AURORA · Fondo interactivo de Generación Tech (WebGL puro)
   ------------------------------------------------------------
   · Cintas de luz tipo aurora (azul eléctrico → violeta → magenta)
     formadas por hebras finas, como las ondas del isotipo de GT.
   · Cerca del cursor las cintas se curvan hacia el puntero, se abren
     y aparece una red de nodos conectados que se ilumina.
   · Nítido en retina: respeta devicePixelRatio dentro de un presupuesto
     de píxeles y baja la resolución sola si el equipo no llega a 60 fps.
   · Se pausa con la pestaña oculta. En touch/mobile corre una versión
     liviana (menos hebras y partículas, responde al toque).
   · Con prefers-reduced-motion dibuja un único cuadro estático.
   · Sin WebGL queda el fondo SVG/CSS que ya está en el HTML.
   ============================================================ */
(() => {
  'use strict';

  const canvas = document.getElementById('gtAurora');
  if (!canvas) return;

  const root = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const LITE = coarse || Math.min(screen.width, screen.height) < 700;

  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, preserveDrawingBuffer: false,
    powerPreference: LITE ? 'low-power' : 'high-performance',
  });
  if (!gl) return; // sin WebGL → queda el fallback del HTML

  /* ---------- Configuración ---------- */
  const CFG = {
    maxDpr: LITE ? 1.5 : 2,          // tope de densidad de píxeles
    budget: LITE ? 1.5e6 : 5.2e6,    // píxeles máximos del canvas
    particles: LITE ? 46 : 150,
    maxLines: LITE ? 90 : 280,
    linkDist: 0.14,                  // distancia máx. entre nodos (en alto de pantalla)
    speed: 1,
    staticTime: 17.5,                // cuadro usado con reduced-motion
  };

  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  const PREC = hp && hp.precision > 0 ? 'highp' : 'mediump';

  /* ---------- Shaders ---------- */
  const VERT_QUAD = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG_AURORA = `
precision ${PREC} float;
#define STRANDS ${LITE ? 4 : 7}
${LITE ? '#define LITE' : ''}
uniform vec2  uRes;
uniform float uTime;
uniform vec3  uMouse;   // xy normalizado (y hacia arriba), z = intensidad
uniform float uScroll;
uniform float uDim;     // atenúa las cintas al bajar por la página
uniform float uPx;      // 1px CSS en unidades de alto
uniform float uDevPx;   // 1px físico en unidades de alto
varying vec2 vUv;

const vec3 BLUE    = vec3(0.020, 0.460, 1.000);
const vec3 SKY     = vec3(0.000, 0.706, 1.000);
const vec3 CYAN    = vec3(0.420, 0.860, 1.000);
const vec3 INDIGO  = vec3(0.369, 0.482, 1.000);
const vec3 VIOLET  = vec3(0.608, 0.188, 1.000);
const vec3 MAGENTA = vec3(0.780, 0.141, 0.694);
const float TAU = 6.2831853;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Una cinta = curva central + varias hebras finas que se abren y cierran.
vec3 ribbon(vec2 p, float asp, float y0, float amp, float fr, float sp, float ph,
            float spread, vec3 c1, vec3 c2, float gain){
  float t = uTime;
  float x = p.x;
  float a1 = fr * TAU * x + t * sp + ph + uScroll;
  float a2 = fr * 1.71 * TAU * x - t * sp * 1.37 + ph * 2.3 - uScroll * 0.6;
  float a3 = fr * 0.53 * TAU * x + t * sp * 0.61 + ph * 0.7;
  float c  = y0 + amp * (sin(a1) + 0.45 * sin(a2) + 0.6 * sin(a3));
  float dc = amp * fr * TAU * (cos(a1) + 0.7695 * cos(a2) + 0.318 * cos(a3));

  // Atracción hacia el cursor
  float dxm  = (x - uMouse.x) * asp;
  float near = exp(-dxm * dxm * 6.0) * uMouse.z;
  float pull = near * 0.38;
  c = mix(c, uMouse.y, pull);

  // Distancia perpendicular (las hebras mantienen el grosor en las curvas)
  float slope = dc * (1.0 - pull) / asp;
  float k  = inversesqrt(1.0 + slope * slope);
  float dy = p.y - c;
  float s  = spread * (0.4 + 0.6 * (0.5 + 0.5 * sin(x * 6.5 + t * 0.27 + ph * 3.1))) * (1.0 + near * 1.3);
  float body = abs(dy) * k;

  vec3 tint = mix(c1, c2, 0.5 + 0.5 * sin(x * 3.2 + ph + t * 0.11));
  float halo = exp(-body * body / (s * s * 10.0 + 0.003));
  float core = exp(-body * body / (s * s * 0.6 + 0.00002));
  vec3 col = tint * (halo * 0.34 + core * 0.22) * gain;

  if (body < s * 1.5 + 0.05) {
    float hot = pow(0.5 + 0.5 * sin(x * 4.6 - t * 0.5 + ph * 1.9), 6.0);
    float w  = max(uPx * 0.85, uDevPx * 0.8);
    float wb = uPx * 7.0;
    float acc = 0.0;
    for (int j = 0; j < STRANDS; j++) {
      float fj  = float(j) / float(STRANDS - 1) - 0.5;
      float sgn = fj < 0.0 ? -1.0 : 1.0;
      float off = sgn * pow(abs(fj) * 2.0, 1.5) * s + 0.0045 * sin(x * 17.0 + float(j) * 1.7 + t * 0.8);
      float d   = abs(dy - off) * k;
      float fade = 1.0 - abs(fj) * 1.15;
      acc += fade * (exp(-d * d / (w * w)) + 0.18 * wb * wb / (d * d + wb * wb));
    }
    col += tint * acc * 0.52 * gain * (1.0 + near * 0.8);
    col += vec3(0.80, 0.93, 1.0) * acc * (0.12 + hot * 0.55) * gain;
  }
  return col;
}

void main(){
  float asp = uRes.x / uRes.y;
  vec2 p = vUv;
  vec2 q = vec2(p.x * asp, p.y);

  // Fondo azul noche con dos focos de color
  vec3 col = mix(vec3(0.010, 0.012, 0.035), vec3(0.014, 0.010, 0.045), p.x);
  vec2 f1 = q - vec2(0.15 * asp, 0.95);
  vec2 f2 = q - vec2(0.90 * asp, 0.05);
  col += BLUE   * 0.045 * exp(-dot(f1, f1) * 2.2);
  col += VIOLET * 0.050 * exp(-dot(f2, f2) * 2.0);

  vec3 r = vec3(0.0);
  r += ribbon(p, asp, 0.31, 0.120, 0.42,  0.10, 0.0, 0.040, BLUE,    SKY,    1.00);
  r += ribbon(p, asp, 0.27, 0.130, 0.36, -0.08, 1.6, 0.052, VIOLET,  INDIGO, 0.90);
#ifndef LITE
  r += ribbon(p, asp, 0.84, 0.060, 0.30,  0.07, 4.2, 0.026, INDIGO,  BLUE,   0.38);
  r += ribbon(p, asp, 0.20, 0.090, 0.62,  0.16, 5.3, 0.020, MAGENTA, VIOLET, 0.55);
#endif
  col += r * uDim;

  // Halo suave del cursor
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float md = dot(q - m, q - m);
  col += mix(BLUE, VIOLET, uMouse.x) * 0.07 * exp(-md * 14.0) * uMouse.z;

  // Tonemap suave + dithering (evita bandas en los degradados oscuros)
  col = 1.0 - exp(-col * 1.25);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

  // Partículas y líneas de la red comparten programa
  const VERT_PTS = `
attribute vec2 aPos;
attribute float aSize;
attribute float aAlpha;
uniform float uDpr;
varying float vA;
varying float vX;
void main(){
  gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
  gl_PointSize = aSize * uDpr;
  vA = aAlpha;
  vX = aPos.x;
}`;

  const FRAG_PTS = `
precision mediump float;
uniform float uPoint;
varying float vA;
varying float vX;
void main(){
  float a = vA;
  if (uPoint > 0.5) {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float soft = clamp(1.0 - r, 0.0, 1.0);
    a *= soft * soft + smoothstep(0.45, 0.0, r) * 0.6;
  }
  vec3 col = mix(vec3(0.45, 0.85, 1.0), vec3(0.78, 0.55, 1.0), vX);
  gl_FragColor = vec4(col * a, 1.0);
}`;

  /* ---------- Utilidades GL ---------- */
  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('[GT Aurora] shader:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
  function program(vs, fs) {
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn('[GT Aurora] link:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  /* ---------- Estado ---------- */
  let progA, progP, quadBuf, ptsBuf, lineBuf, U = {}, UP = {};
  const parts = new Float32Array(CFG.particles * 6); // x, y, vx, vy, size, phase
  const ptsData = new Float32Array(CFG.particles * 4); // x, y, size, alpha
  const nearArr = new Float32Array(CFG.particles);
  const lineData = new Float32Array(CFG.maxLines * 2 * 4);
  const cand = [];
  const mouse = { x: 0.5, y: 0.6, z: 0, tx: 0.5, ty: 0.6, tz: 0 };
  let scale = 1, quality = 1, cssW = 1, cssH = 1;
  let time = 0, last = 0, raf = 0, running = false, ready = false;
  let scrollS = 0, dimS = 1;
  let frames = 0, accDt = 0, checks = 0;

  function seedParticles() {
    for (let i = 0; i < CFG.particles; i++) {
      const o = i * 6;
      parts[o] = Math.random();
      parts[o + 1] = Math.random();
      parts[o + 2] = (Math.random() - 0.5) * 0.008;
      parts[o + 3] = 0.004 + Math.random() * 0.01;
      parts[o + 4] = 1.2 + Math.random() * 1.9;
      parts[o + 5] = Math.random() * Math.PI * 2;
    }
  }

  function setup() {
    progA = program(VERT_QUAD, FRAG_AURORA);
    progP = program(VERT_PTS, FRAG_PTS);
    if (!progA || !progP) return false;

    quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    ptsBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ptsBuf);
    gl.bufferData(gl.ARRAY_BUFFER, ptsData.byteLength, gl.DYNAMIC_DRAW);
    lineBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
    gl.bufferData(gl.ARRAY_BUFFER, lineData.byteLength, gl.DYNAMIC_DRAW);

    ['uRes', 'uTime', 'uMouse', 'uScroll', 'uDim', 'uPx', 'uDevPx'].forEach(n => { U[n] = gl.getUniformLocation(progA, n); });
    U.aPos = gl.getAttribLocation(progA, 'aPos');
    ['uDpr', 'uPoint'].forEach(n => { UP[n] = gl.getUniformLocation(progP, n); });
    UP.aPos = gl.getAttribLocation(progP, 'aPos');
    UP.aSize = gl.getAttribLocation(progP, 'aSize');
    UP.aAlpha = gl.getAttribLocation(progP, 'aAlpha');

    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE, gl.ONE);
    return true;
  }

  /* ---------- Tamaño / densidad ---------- */
  function resize() {
    cssW = Math.max(1, canvas.clientWidth);
    cssH = Math.max(1, canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.maxDpr);
    let s = Math.min(dpr * quality, Math.sqrt(CFG.budget / (cssW * cssH)));
    s = Math.max(s, 0.5);
    const w = Math.round(cssW * s);
    const h = Math.round(cssH * s);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    scale = s;
    gl.viewport(0, 0, w, h);
    if (!running && ready) render(0);
  }

  /* ---------- Simulación de partículas + red ---------- */
  function simulate(dt) {
    const asp = cssW / cssH;
    const mx = mouse.x, my = mouse.y, mz = mouse.z;
    const twinkleT = time * 1.3;
    cand.length = 0;
    for (let i = 0; i < CFG.particles; i++) {
      const o = i * 6;
      let x = parts[o] + parts[o + 2] * dt;
      let y = parts[o + 1] + parts[o + 3] * dt;
      if (x < -0.02) x += 1.04; else if (x > 1.02) x -= 1.04;
      if (y > 1.02) y -= 1.04;
      parts[o] = x;
      parts[o + 1] = y;

      const dx = (x - mx) * asp;
      const dy = y - my;
      const d2 = dx * dx + dy * dy;
      const near = mz * Math.exp(-d2 / 0.035);
      const push = mz * 0.035 * Math.exp(-d2 / 0.01);
      const inv = push / Math.sqrt(d2 + 1e-5);
      const px = x + (dx * inv) / asp;
      const py = y + dy * inv;
      const tw = 0.5 + 0.5 * Math.sin(twinkleT * (0.6 + (i % 7) * 0.15) + parts[o + 5]);

      const p = i * 4;
      ptsData[p] = px;
      ptsData[p + 1] = py;
      ptsData[p + 2] = parts[o + 4] * (1 + near * 1.6);
      ptsData[p + 3] = (0.22 + 0.42 * tw) * (0.55 + 0.45 * dimS) + near * 0.95;
      nearArr[i] = near;
      if (near > 0.05) cand.push(i);
    }

    // Red de nodos: solo entre partículas cercanas al cursor
    let n = 0;
    const maxD = CFG.linkDist;
    for (let a = 0; a < cand.length && n < CFG.maxLines; a++) {
      const ia = cand[a] * 4;
      for (let b = a + 1; b < cand.length && n < CFG.maxLines; b++) {
        const ib = cand[b] * 4;
        const dx = (ptsData[ia] - ptsData[ib]) * asp;
        const dy = ptsData[ia + 1] - ptsData[ib + 1];
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxD) continue;
        const al = (1 - d / maxD) * Math.min(nearArr[cand[a]], nearArr[cand[b]]) * 0.85;
        const o = n * 8;
        lineData[o] = ptsData[ia]; lineData[o + 1] = ptsData[ia + 1]; lineData[o + 2] = 1; lineData[o + 3] = al;
        lineData[o + 4] = ptsData[ib]; lineData[o + 5] = ptsData[ib + 1]; lineData[o + 6] = 1; lineData[o + 7] = al;
        n++;
      }
    }
    // Enlaces tenues del cursor a los nodos más cercanos
    if (mz > 0.05) {
      const sorted = cand.slice().sort((p, q) => nearArr[q] - nearArr[p]).slice(0, 4);
      for (let k = 0; k < sorted.length && n < CFG.maxLines; k++) {
        const ia = sorted[k] * 4;
        const o = n * 8;
        const al = nearArr[sorted[k]] * 0.35;
        lineData[o] = mx; lineData[o + 1] = my; lineData[o + 2] = 1; lineData[o + 3] = al * 0.2;
        lineData[o + 4] = ptsData[ia]; lineData[o + 5] = ptsData[ia + 1]; lineData[o + 6] = 1; lineData[o + 7] = al;
        n++;
      }
    }
    return n;
  }

  function bindPtsAttribs(buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(UP.aPos);
    gl.vertexAttribPointer(UP.aPos, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(UP.aSize);
    gl.vertexAttribPointer(UP.aSize, 1, gl.FLOAT, false, 16, 8);
    gl.enableVertexAttribArray(UP.aAlpha);
    gl.vertexAttribPointer(UP.aAlpha, 1, gl.FLOAT, false, 16, 12);
  }

  /* ---------- Render ---------- */
  function render(dt) {
    const lines = simulate(dt);

    // 1) Aurora a pantalla completa
    gl.disable(gl.BLEND);
    gl.useProgram(progA);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(U.aPos);
    gl.vertexAttribPointer(U.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(U.uRes, canvas.width, canvas.height);
    gl.uniform1f(U.uTime, time);
    gl.uniform3f(U.uMouse, mouse.x, mouse.y, mouse.z);
    gl.uniform1f(U.uScroll, scrollS);
    gl.uniform1f(U.uDim, dimS);
    gl.uniform1f(U.uPx, 1 / cssH);
    gl.uniform1f(U.uDevPx, 1 / (cssH * scale));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2) Red + partículas (suma aditiva)
    gl.enable(gl.BLEND);
    gl.useProgram(progP);
    gl.uniform1f(UP.uDpr, scale);
    if (lines > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData.subarray(0, lines * 8));
      bindPtsAttribs(lineBuf);
      gl.uniform1f(UP.uPoint, 0);
      gl.drawArrays(gl.LINES, 0, lines * 2);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, ptsBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, ptsData);
    bindPtsAttribs(ptsBuf);
    gl.uniform1f(UP.uPoint, 1);
    gl.drawArrays(gl.POINTS, 0, CFG.particles);

    if (!canvas.classList.contains('is-ready')) {
      canvas.classList.add('is-ready');
      root.classList.add('has-aurora');
    }
  }

  function readScroll(k) {
    const vh = window.innerHeight || 1;
    const y = window.scrollY / vh;
    const targetScroll = y * 0.35;
    const t = Math.min(1, Math.max(0, y));
    const targetDim = 1 - 0.4 * (t * t * (3 - 2 * t));
    scrollS += (targetScroll - scrollS) * k;
    dimS += (targetDim - dimS) * k;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    time += dt * CFG.speed;
    if (time > 20000) time = 0;

    const k = 1 - Math.exp(-dt * 3.2);
    mouse.x += (mouse.tx - mouse.x) * k;
    mouse.y += (mouse.ty - mouse.y) * k;
    mouse.z += (mouse.tz - mouse.z) * (1 - Math.exp(-dt * 2.2));
    readScroll(1 - Math.exp(-dt * 4));

    render(dt);
    adapt(dt);
  }

  // Baja la resolución si el equipo no sostiene ~45 fps
  function adapt(dt) {
    frames++;
    if (frames < 45) return;
    accDt += dt;
    if (frames % 90 !== 0) return;
    const avg = accDt / 90;
    accDt = 0;
    if (avg > 1 / 45 && quality > 0.55 && checks < 6) {
      quality *= 0.82;
      checks++;
      resize();
    }
  }

  function start() {
    if (running || !ready) return;
    if (mqReduce.matches) { renderStatic(); return; }
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function renderStatic() {
    time = CFG.staticTime;
    mouse.z = mouse.tz = 0;
    readScroll(1);
    render(0);
  }

  /* ---------- Entrada (mouse / touch) ---------- */
  function onPointer(e) {
    if (mqReduce.matches) return;
    if (e.pointerType === 'mouse') {
      if (LITE) return;
      mouse.tz = 1;
    } else {
      mouse.tz = 0.75; // touch / lápiz: respuesta suave al toque
    }
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = 1 - e.clientY / window.innerHeight;
  }
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  ['pointerup', 'pointercancel'].forEach(ev => window.addEventListener(ev, e => {
    if (e.pointerType !== 'mouse') mouse.tz = 0;
  }, { passive: true }));
  document.documentElement.addEventListener('mouseleave', () => { mouse.tz = 0; });
  window.addEventListener('blur', () => { mouse.tz = 0; });

  /* ---------- Ciclo de vida ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });
  const onReduceChange = () => { stop(); start(); };
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', onReduceChange);

  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); ready = false; });
  canvas.addEventListener('webglcontextrestored', () => { ready = setup(); resize(); start(); });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  seedParticles();
  ready = setup();
  if (!ready) return;
  resize();
  if (mqReduce.matches) renderStatic();
  else if (!document.hidden) start();
})();
