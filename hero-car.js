import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const ACCENT = '#C9A24A';
const GROUND_Y = -0.62;
const ROOM = 'assets/studio.jpg';

const DIRT_HEAD = `
uniform float uSplit;
uniform vec2 uRes;
varying vec3 vDirtPos;
float h31(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
float vnoise(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x), mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x), f.y),
    mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x), mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x), f.y),
    f.z);
}
float fbm(vec3 p){ return 0.55*vnoise(p) + 0.3*vnoise(p*2.4) + 0.15*vnoise(p*5.7); }
// vDirtPos is in car-root space after fitting: wheels at y=0, roof near y=1,
// length ~2.6 — so these frequencies mean the same thing for any source model.
float dirtAmount(){
  float sy = gl_FragCoord.y / max(uRes.y, 1.0);
  float line = 1.0 - uSplit;
  float below = 1.0 - smoothstep(line - 0.0035, line + 0.0035, sy);
  // Squashing y stretches the noise into vertical smears — road grime runs down panels.
  vec3 streak = vec3(vDirtPos.x, vDirtPos.y * 0.38, vDirtPos.z);
  float grime = smoothstep(0.30, 0.72, fbm(streak * 3.0));
  float speckle = smoothstep(0.36, 0.70, fbm(vDirtPos * 14.0));
  float low = 1.0 - smoothstep(0.02, 0.62, vDirtPos.y);
  float film = 0.16 + 0.24 * grime;            // dust haze over the whole body
  float heavy = low * (0.45 + 0.55 * grime);   // caked on around the sills
  return below * clamp(film + heavy + 0.12 * speckle * low, 0.0, 1.0);
}
`;

function patchDirt(mat, uniforms) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSplit = uniforms.uSplit;
    shader.uniforms.uRes = uniforms.uRes;
    shader.uniforms.uRootInv = uniforms.uRootInv;
    // `position` is local to each of the model's 468 meshes and in the source file's
    // units. Going through the car root gives every panel one shared, scale-normalised
    // frame, so the grime lines up across seams and stays put while the car spins.
    shader.vertexShader = 'varying vec3 vDirtPos;\nuniform mat4 uRootInv;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vDirtPos = (uRootInv * modelMatrix * vec4(transformed, 1.0)).xyz;'
    );
    let f = DIRT_HEAD + shader.fragmentShader;
    f = f.replace('void main() {', 'void main() {\n  float dA = dirtAmount();');
    f = f.replace('#include <color_fragment>',
      '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.155,0.140,0.118), diffuseColor.rgb*0.45, 0.40), dA*0.9);');
    f = f.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\n  roughnessFactor = mix(roughnessFactor, 0.74, dA);');
    f = f.replace('#include <metalnessmap_fragment>',
      '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, metalnessFactor*0.3, dA);');
    f = f.replace('#include <lights_physical_fragment>',
      '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= (1.0 - dA);\n  material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.55, dA);\n#endif');
    shader.fragmentShader = f;
  };
  mat.customProgramCacheKey = () => 'split-dirt-v2';
  mat.needsUpdate = true;
}

function toPhysical(src) {
  if (src.isMeshPhysicalMaterial) return src;
  const m = new THREE.MeshPhysicalMaterial({
    color: src.color ? src.color.clone() : new THREE.Color(0xbfc6cb),
    map: src.map || null,
    normalMap: src.normalMap || null,
    roughnessMap: src.roughnessMap || null,
    metalnessMap: src.metalnessMap || null,
    roughness: src.roughness !== undefined ? Math.min(src.roughness, 0.22) : 0.12,
    metalness: src.metalness !== undefined ? src.metalness : 0.55,
    transparent: src.transparent, opacity: src.opacity,
    side: src.side, name: src.name
  });
  m.clearcoat = 1.0;
  m.clearcoatRoughness = 0.05;
  m.envMapIntensity = 1.15;
  return m;
}

function placeholderCar() {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x2c3339, metalness: 0.75, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0e1215, metalness: 0.2, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.4 });
  const rubber = new THREE.MeshPhysicalMaterial({ color: 0x0c0e10, metalness: 0.05, roughness: 0.55 });
  const rim = new THREE.MeshPhysicalMaterial({ color: 0xc9d1d6, metalness: 0.95, roughness: 0.14, envMapIntensity: 1.4 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.72, 1.78, 12, 6, 8), paint);
  body.position.y = 0.62; g.add(body);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.34, 1.7, 8, 3, 6), paint);
  lower.position.y = 0.3; g.add(lower);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.62, 1.62, 8, 4, 6), paint);
  cabin.position.set(-0.16, 1.24, 0); g.add(cabin);
  const green = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.44, 1.66, 4, 3, 4), glass);
  green.position.set(-0.16, 1.26, 0); g.add(green);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 1.72, 6, 2, 6), paint);
  hood.position.set(1.42, 0.93, 0); g.add(hood);

  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.3, 28);
  const rimGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.32, 24);
  [[1.28, 0.83], [1.28, -0.83], [-1.32, 0.83], [-1.32, -0.83]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, rubber);
    w.rotation.x = Math.PI / 2; w.position.set(x, 0.44, z); g.add(w);
    const r = new THREE.Mesh(rimGeo, rim);
    r.rotation.x = Math.PI / 2; r.position.set(x, 0.44, z); g.add(r);
  });
  g.userData.placeholder = true;
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
  grd.addColorStop(0, 'rgba(0,0,0,0.72)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function poolTexture(accent) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  grd.addColorStop(0, 'rgba(255,255,255,0.20)');
  grd.addColorStop(0.35, accent + '22');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

class HeroCar extends HTMLElement {
  static get observedAttributes() { return ['src', 'accent', 'spin', 'split']; }

  // ponytail: single-word attributes only — React renders this element through the
  // dc-runtime, which lowercases hyphenated props, so `rotation-seconds` never arrives.
  connectedCallback() {
    if (this._booted) return;
    this._booted = true;
    this.accent = this.getAttribute('accent') || ACCENT;
    this.turnSec = parseFloat(this.getAttribute('spin')) || 38;
    this.split = (parseFloat(this.getAttribute('split')) || 18) / 100;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.rot = 0.35; this.vel = 0; this.lastInput = -9999; this.hovering = false;
    this.axis = null; this.dragging = false;
    this.buildDOM();
    if (!this.hasWebGL()) { this.showFallback(); return; }
    this.initThree();
    this.load();
    this.bind();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.io) this.io.disconnect();
    if (this.renderer) this.renderer.dispose();
  }

  hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  buildDOM() {
    const a = this.accent;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
<style>
  :host { display:block; position:relative; width:100%; height:100%; }
  .stage { position:absolute; inset:0; touch-action:none; cursor:grab; outline:none; }
  .stage[data-grab="1"] { cursor:grabbing; }
  .stage:focus-visible { outline:1px solid ${a}; outline-offset:6px; }
  canvas { display:block; width:100%; height:100%; position:relative; z-index:1; }
  .room { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; border-radius:inherit;
    opacity:0; animation:lampOn 1.4s .2s ease both; }
  .room img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:50% 44%;
    filter:saturate(.55) contrast(1.06) brightness(.62); }
  .room::after { content:''; position:absolute; inset:0;
    background:
      radial-gradient(78% 62% at 50% 46%, rgba(10,10,11,0) 0%, rgba(10,10,11,.55) 72%, rgba(10,10,11,.92) 100%),
      linear-gradient(to bottom, rgba(10,10,11,.55) 0%, rgba(10,10,11,0) 34%, rgba(10,10,11,0) 62%, rgba(10,10,11,.8) 100%); }
  @keyframes lampOn { from { opacity:0 } to { opacity:1 } }
  .line { position:absolute; z-index:2; left:0; right:0; height:0; pointer-events:none;
    border-top:1px solid rgba(237,233,226,0.5); box-shadow:0 0 14px rgba(201,162,74,0.3); transition:border-color .18s, box-shadow .18s; }
  .line[data-live="1"] { border-top-color:${a}; box-shadow:0 0 24px rgba(201,162,74,0.65); }
  .drops { position:absolute; left:8%; right:8%; top:0; height:16px; overflow:visible; opacity:.75; }
  /* Popisky nesou hlavní sdělení sekce (před → po). Na 10 px přes karoserii
     je nikdo nepřečetl: větší, plná krytí, tmavá podložka místo pouhého stínu. */
  .labels { position:absolute; z-index:2; left:14px; right:0; pointer-events:none; font:600 12px/1 Manrope,system-ui,sans-serif;
    letter-spacing:.2em; color:#EDE9E2; text-transform:uppercase; }
  .labels > div { padding:6px 10px; border-radius:3px; background:rgba(10,10,11,.72);
    border:1px solid rgba(237,233,226,.14); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); }
  .lab-po { position:absolute; left:0; bottom:9px; }
  .lab-pred { position:absolute; left:0; top:9px; }
  .handle { position:absolute; z-index:3; right:10px; width:44px; height:44px; margin-top:-22px; border-radius:999px;
    background:#141417; border:1px solid rgba(237,233,226,0.16); display:grid; place-items:center;
    box-shadow:0 0 0 6px rgba(10,10,11,0.6); transition:transform .16s ease, border-color .16s; }
  .handle[data-live="1"] { transform:scale(1.16); border-color:${a}; }
  .handle svg { display:block; }
  input[type=range] { position:absolute; z-index:4; right:10px; width:44px; height:44px; margin-top:-22px; opacity:0; cursor:ns-resize; }
  input[type=range]:focus-visible + .handle { outline:2px solid ${a}; outline-offset:3px; }
  .bar { position:absolute; z-index:3; left:0; bottom:0; height:1px; background:${a}; width:0%; transition:width .25s linear, opacity .4s; }
  .fallback { position:absolute; z-index:2; inset:0; display:grid; place-items:center; text-align:center; padding:24px;
    font:400 13px/1.6 Manrope,system-ui,sans-serif; color:rgba(237,233,226,0.66); }
  .tag { position:absolute; z-index:3; left:0; bottom:0; font:600 10px/1 Manrope,system-ui,sans-serif;
    letter-spacing:.16em; text-transform:uppercase; color:rgba(237,233,226,0.6); }
  @media (prefers-reduced-motion: reduce) { .room { animation:none; opacity:1 } }
</style>
<div class="stage" tabindex="0" role="group" aria-label="Interaktivní model auta – tažením otáčíte, svisle přepínáte před a po">
  <div class="room"><img src="${ROOM}" alt="" decoding="async" fetchpriority="high"></div>
  <canvas></canvas>
  <div class="labels">
    <div class="lab-po">Po</div>
    <div class="lab-pred">Před</div>
  </div>
  <div class="line">
    <svg class="drops" viewBox="0 0 400 16" preserveAspectRatio="none" aria-hidden="true">
      <path d="M40 0 q3 6 0 9 q-3 -3 0 -9z" fill="${a}" opacity=".55"/>
      <path d="M148 0 q2.4 5 0 7.5 q-2.4 -2.5 0 -7.5z" fill="#D6DBDF" opacity=".4"/>
      <path d="M243 0 q3.4 7 0 10.5 q-3.4 -3.5 0 -10.5z" fill="${a}" opacity=".45"/>
      <path d="M330 0 q2.2 4.6 0 7 q-2.2 -2.4 0 -7z" fill="#D6DBDF" opacity=".35"/>
    </svg>
  </div>
  <input type="range" min="0" max="100" step="5" aria-label="Míra vyčištění" />
  <div class="handle" aria-hidden="true">
    <svg width="15" height="19" viewBox="0 0 15 19" fill="none" stroke="${a}" stroke-width="1.3" stroke-linecap="square">
      <path d="M7.5 1.2V7.4M4.4 4.3L7.5 1.2l3.1 3.1"/>
      <path d="M7.5 17.8v-6.2M4.4 14.7l3.1 3.1 3.1-3.1"/>
    </svg>
  </div>
  <div class="bar"></div>
  <div class="tag"></div>
</div>`;
    this.$ = (s) => root.querySelector(s);
    this.stage = this.$('.stage');
    this.canvas = this.$('canvas');
    this.lineEl = this.$('.line');
    this.handleEl = this.$('.handle');
    this.rangeEl = this.$('input[type=range]');
    this.labelsEl = this.$('.labels');
    this.barEl = this.$('.bar');
    this.rangeEl.value = String(Math.round(this.split * 100));
    this.syncSplitUI();
  }

  showFallback() {
    this.canvas.style.display = 'none';
    const f = document.createElement('div');
    f.className = 'fallback';
    f.textContent = 'Váš prohlížeč nepodporuje 3D zobrazení. Fotografie před a po najdete v galerii níže.';
    this.stage.appendChild(f);
  }

  initThree() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    r.setClearAlpha(0);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 0.62, 4.4);
    this.camera.lookAt(0, 0.02, 0);

    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(2.6, 4.2, 2.4);
    const rim = new THREE.DirectionalLight(0x9fd8ea, 1.5);
    rim.position.set(-3.2, 2.1, -2.6);
    const fill = new THREE.HemisphereLight(0xbfd4dd, 0x0b0d0f, 0.55);
    this.scene.add(key, rim, fill);

    this.uniforms = {
      uSplit: { value: this.split },
      uRes: { value: new THREE.Vector2(1, 1) },
      uRootInv: { value: new THREE.Matrix4() }
    };

    // Ground sits with the car, not at world zero — the model is dropped to GROUND_Y to frame it.
    const ground = new THREE.Group();
    ground.position.y = GROUND_Y;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 6.2),
      new THREE.MeshBasicMaterial({ map: poolTexture(this.accent), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004;
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012;
    ground.add(pool, shadow);
    this.scene.add(ground);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this);
    this.visible = true;
    this.io = new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }, { threshold: 0.02 });
    this.io.observe(this);
  }

  fit(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // 2.6 not 2.9 — the car spins, so the broadside pass must still clear the stage edges.
    const s = 2.6 / Math.max(size.x, size.z, 0.001);
    obj.scale.setScalar(s);
    obj.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const wrap = new THREE.Group();
    wrap.add(obj);
    return wrap;
  }

  // A real GLB already ships authored PBR maps — rewriting every material as glossy
  // clearcoat turns tyres and fabric into mirrors. Only the box placeholder needs faking.
  applyMaterials(root, fake) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      const out = mats.map((m) => {
        const p = fake ? toPhysical(m) : m;
        p.envMapIntensity = 1.15;
        patchDirt(p, this.uniforms);
        return p;
      });
      o.material = Array.isArray(o.material) ? out : out[0];
      o.castShadow = false; o.receiveShadow = false;
    });
  }

  setModel(obj) {
    if (this.model) this.pivot.remove(this.model);
    const wrap = this.fit(obj);
    wrap.position.y = GROUND_Y;
    this.applyMaterials(wrap, !!obj.userData.placeholder);
    this.model = wrap;
    this.pivot.add(wrap);
    this.barEl.style.width = '100%';
    setTimeout(() => { this.barEl.style.opacity = '0'; }, 320);
    if (!this.reduced) this.hint();
  }

  load() {
    const src = this.getAttribute('src');
    if (!src) {
      this.$('.tag').textContent = 'placeholder — vložte GLB model';
      this.setModel(placeholderCar());
      return;
    }
    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('./vendor/three/draco/');
    loader.setDRACOLoader(draco);
    loader.load(src,
      (gltf) => this.setModel(gltf.scene),
      (e) => { if (e.total) this.barEl.style.width = Math.round((e.loaded / e.total) * 92) + '%'; },
      () => { this.$('.tag').textContent = 'model se nepodařilo načíst — placeholder'; this.setModel(placeholderCar()); });
  }

  hint() {
    const from = this.split, to = 0.26, dur = 1900, t0 = performance.now();
    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const step = (now) => {
      const t = Math.min((now - t0) / dur, 1);
      const tri = t < 0.5 ? ease(t / 0.5) : ease((1 - t) / 0.5);
      this.setSplit(from + (to - from) * tri, false);
      if (t < 1) this.hintRaf = requestAnimationFrame(step);
    };
    this.hintRaf = requestAnimationFrame(step);
  }

  setSplit(v, fromUser) {
    if (fromUser && this.hintRaf) { cancelAnimationFrame(this.hintRaf); this.hintRaf = null; }
    this.split = Math.max(0, Math.min(1, v));
    if (this.uniforms) this.uniforms.uSplit.value = this.split;
    if (fromUser) this.rangeEl.value = String(Math.round(this.split * 100));
    this.syncSplitUI();
  }

  syncSplitUI() {
    const pct = this.split * 100;
    this.lineEl.style.top = pct + '%';
    this.handleEl.style.top = pct + '%';
    this.rangeEl.style.top = pct + '%';
    this.labelsEl.style.top = pct + '%';
    this.rangeEl.setAttribute('aria-valuetext', Math.round(pct) + ' % vyčištěno');
    this.$('.lab-po').style.opacity = (0.28 + 0.72 * Math.min(1, this.split / 0.5)).toFixed(2);
    this.$('.lab-pred').style.opacity = (0.28 + 0.72 * Math.min(1, (1 - this.split) / 0.5)).toFixed(2);
  }

  bind() {
    const st = this.stage;
    st.addEventListener('pointerenter', () => { this.hovering = true; });
    st.addEventListener('pointerleave', () => { this.hovering = false; });

    st.addEventListener('pointerdown', (e) => {
      st.setPointerCapture(e.pointerId);
      this.dragging = true; this.axis = null;
      this.sx = e.clientX; this.sy = e.clientY;
      this.px = e.clientX; this.py = e.clientY;
      st.dataset.grab = '1';
      this.lastInput = performance.now();
    });

    st.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.px, dy = e.clientY - this.py;
      if (!this.axis) {
        const tx = e.clientX - this.sx, ty = e.clientY - this.sy;
        if (Math.hypot(tx, ty) < 10) { this.px = e.clientX; this.py = e.clientY; return; }
        this.axis = Math.abs(tx) > Math.abs(ty) ? 'x' : 'y';
        if (this.axis === 'y') { this.lineEl.dataset.live = '1'; this.handleEl.dataset.live = '1'; }
      }
      if (e.cancelable) e.preventDefault();
      if (this.axis === 'x') {
        const d = dx * 0.0065;
        this.rot += d; this.vel = d;
      } else {
        this.setSplit(this.split + dy / Math.max(this.clientHeight, 1), true);
      }
      this.px = e.clientX; this.py = e.clientY;
      this.lastInput = performance.now();
    });

    const end = () => {
      this.dragging = false; this.axis = null;
      delete st.dataset.grab;
      delete this.lineEl.dataset.live; delete this.handleEl.dataset.live;
      this.lastInput = performance.now();
    };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);

    st.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { this.rot -= 0.12; this.vel = -0.012; this.lastInput = performance.now(); e.preventDefault(); }
      if (e.key === 'ArrowRight') { this.rot += 0.12; this.vel = 0.012; this.lastInput = performance.now(); e.preventDefault(); }
    });

    this.rangeEl.addEventListener('input', () => {
      this.setSplit(parseFloat(this.rangeEl.value) / 100, true);
      this.lastInput = performance.now();
    });
    this.rangeEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || 1, h = this.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < 640 ? 36 : 30;
    this.camera.updateProjectionMatrix();
    if (this.uniforms) this.uniforms.uRes.value.set(w * dpr, h * dpr);
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || !this.model) return;
    const dt = Math.min((now - (this.prev || now)) / 1000, 0.05);
    this.prev = now;
    if (!this.dragging) {
      this.rot += this.vel;
      this.vel *= 0.94;
      if (Math.abs(this.vel) < 0.00005) this.vel = 0;
      const idle = now - this.lastInput > 2000;
      if (idle && !this.hovering && !this.reduced) this.rot += (Math.PI * 2 / this.turnSec) * dt;
    }
    this.pivot.rotation.y = this.rot;
    this.pivot.updateMatrixWorld(true);
    this.uniforms.uRootInv.value.copy(this.model.matrixWorld).invert();
    this.renderer.render(this.scene, this.camera);
  }
}

if (!customElements.get('hero-car')) customElements.define('hero-car', HeroCar);
