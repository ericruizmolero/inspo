/* Tino, la mascota de Criterio: un peluche en 3D (three.js) con orejas que se mueven, un visor que cambia con cada gesto y pelo
 por capas. Lo monta <Tino /> (components/Tino.tsx); este módulo solo se carga en el navegador y en un paquete aparte.
 Viene de la landing (criterio-landing/mascota/peluche.js); los modelos son de Blender (tino.py) y viven en public/tino/.
 create(canvas, opciones) → api (ver engine.d.ts) o null si el navegador no tiene WebGL2. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const RAD = Math.PI / 180;
// los estados son los del sombreador: orejas en grados desde la vertical (positivo = hacia atrás), visor y giro
// (v50) las caras de la hoja de copy: ear cuenta desde el reposo de cada oreja ([26, 5], el hueso 0 es la de la derecha); tilt, cada oreja
// hacia fuera en grados (negativo, hacia la otra); eyes, dos ojos dentro de la banda, [medio ancho, medio alto] en medios altos de la
// banda. tilt y eyes van izquierda y derecha según los ve quien mira
const POSES = {
  reposo: { ear: [26, 5], open: 1, scan: 1 },   // (v39) en reposo el visor está revisando: el barrido de luz va y viene
  dormida: { ear: [50, 29], tilt: [36, 36], open: 1, eyes: [[0.42, 0.05], [0.42, 0.05]] },
  esceptica: { ear: [26, 5], tilt: [0, 30], open: 1, eyes: [[0.24, 0.2], [0.42, 0.42]] },
  sospechosa: { ear: [22, 1], tilt: [0, 14], open: 1, eyes: [[0.42, 0.42], [0.42, 0.42]] },
  satisfecha: { ear: [26, 5], tilt: [-8, -8], open: 1, eyes: [[0.4, 0.11], [0.4, 0.11]] },
  admirada: { ear: [20, -1], tilt: [-32, -32], open: 1, eyes: [[0.36, 0.26], [0.36, 0.26]] },
  curiosa: { ear: [9, -7], open: 1, split: 1, rot: [70, 0] },
  leyendo: { ear: [22, 3], open: 1, scan: 1 },
  aprueba: { ear: [24, -24], open: 0.78, smile: 1, rot: [62, -4] },
  pensando: { ear: [30, 8], open: 1, seg: 1 },
  descarta: { ear: [60, 50], open: 0.1, shake: 1 },
  senala: { ear: [-14, -30], open: 1, rot: [24, 10] },
  error: { ear: [78, -16], open: 1, seg: 1, flicker: 1 },
  pulsa: { ear: [-8, -34], open: 0.8, smile: 0.7, sq: [1.08, 0.84] },
  caricia: { ear: [34, 14], open: 1 },   // (v40) sin sonrisa: la reacción va dentro del visor (petFx)
};
// capas de pelo: menos en móviles y equipos modestos (la tarjeta gráfica pinta cada capa entera)
const LITE = matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const ONCE = { aprueba: 2.1, descarta: 2 }, REST = [26, 5], YAW = 36, N = LITE ? 22 : 32, CREAM = "#F7F5F0";   // blanco de peluche (antes crema #EADCC6)
const EARFX = 1.9;   // (v38) cuánto arrastra el movimiento del cuerpo a las orejas (antes 1)
// (v43) la oreja se dobla a lo largo y no desde la base: la base hacía arrugas en la cabeza. __earMix/__earPhys solo los usa el banco de pruebas (prueba-peluche/medir.html)
const EARMIX = [0.2, 0.45, 0.35], EARPHYS = [0.35, 1.25, 1.25];
const MATS = ["flocado", "arcilla", "cromo", "irisado", "perla", "cristal", "plastico", "casco"];

// (v46) diagnóstico: qué pasó si el 3D no sale en un móvil
// diagnóstico: por qué no salió el 3D (lo lee <Tino /> con api.diag y lo escribe en la consola)
const DIAG = { estado: "cargando", fallos: [] };
const fail = (motivo, error) => { DIAG.estado = "fallo"; const txt = motivo + (error ? ": " + String((error && error.message) || error).slice(0, 200) : ""); if (!DIAG.fallos.includes(txt)) DIAG.fallos.push(txt); console.warn("tino:", txt); };
const lib = () => Promise.resolve({ THREE, GLTFLoader, MeshoptDecoder, RoomEnvironment, SkeletonUtils });
const GLB = {};
const glb = (url) => GLB[url] || (GLB[url] = lib().then(({ GLTFLoader, MeshoptDecoder }) => new Promise((ok, ko) => { const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder); l.load(url, ok, undefined, ko); })));

// la forma del visor en cada gesto (positivo fuera, en medios altos de la banda abierta). La usan el cristal y los párpados de pelo
// (v38) seis tipos de visor (uKind): 0 banda · 1 dos lentes · 2 ojo único · 3 ranura · 4 pantalla · 5 píxeles.
// Centro en VY (antes .42: un poco más arriba) y la banda de 4,2 medios altos a cada lado (antes 4,9: más estrecha)
const SHAPE = /* glsl */`
  uniform float uKind;
  const float VY = .485, VX = 3.6;   // (v40) otra vez más arriba (antes .455) y más estrecho (antes 4.2)
  float vseg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
  vec2 visorP(vec3 o, float smile) { vec2 p = vec2(atan(-o.z, o.x) * .58, o.y - VY) / .075; float u = p.x / VX; return vec2(p.x, p.y - smile * (-.45 + 1.05 * u * u)); }
  float visorHH(float open) { return mix(.11, uKind < .5 ? .74 : uKind < 1.5 ? 1.2 : uKind < 2.5 ? 1.5 : uKind < 3.5 ? .3 : uKind < 4.5 ? 1.35 : .42, open); }
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
  float visorD(vec3 o, float open, float split, float smile) {
    vec2 c = visorP(o, smile); float hh = visorHH(open), one, tri;
    if (uKind < .5) {          // banda
      one = vseg(c, vec2(-VX, 0.), vec2(VX, 0.)) - hh;
      tri = min(min(vseg(c, vec2(-VX, 0.), vec2(-2.05, 0.)), vseg(c, vec2(-.62, 0.), vec2(.62, 0.))), vseg(c, vec2(2.05, 0.), vec2(VX, 0.))) - hh * 1.1;
    } else if (uKind < 1.5) {  // dos lentes
      one = min(vseg(c, vec2(-2.7, 0.), vec2(-1.7, 0.)), vseg(c, vec2(1.7, 0.), vec2(2.7, 0.))) - hh;
      tri = min(min(length(c - vec2(-3., 0.)), length(c)), length(c - vec2(3., 0.))) - hh * .9;
    } else if (uKind < 2.5) {  // ojo único
      one = vseg(c, vec2(-.35, 0.), vec2(.35, 0.)) - hh;
      tri = min(min(length(c - vec2(-2.4, 0.)), length(c)), length(c - vec2(2.4, 0.))) - hh * .55;
    } else if (uKind < 3.5) {  // ranura fina y larga
      one = vseg(c, vec2(-4.8, 0.), vec2(4.8, 0.)) - hh;
      tri = min(min(vseg(c, vec2(-4.8, 0.), vec2(-2.2, 0.)), vseg(c, vec2(-.9, 0.), vec2(.9, 0.))), vseg(c, vec2(2.2, 0.), vec2(4.8, 0.))) - hh * 1.4;
    } else if (uKind < 4.5) {  // pantalla: rectángulo de esquinas redondas
      one = rbox(c, vec2(3., hh), min(.85, hh));
      tri = min(min(rbox(c - vec2(-2.5, 0.), vec2(.8, hh * .8), min(.6, hh * .8)), rbox(c, vec2(.8, hh * .8), min(.6, hh * .8))), rbox(c - vec2(2.5, 0.), vec2(.8, hh * .8), min(.6, hh * .8)));
    } else {                   // píxeles: siete puntos; al cerrar, rayitas
      float cx = c.x - clamp(floor(c.x / 1.4 + .5), -3., 3.) * 1.4;
      one = vseg(vec2(cx, c.y), vec2(-.16, 0.), vec2(.16, 0.)) - hh;
      float cx3 = c.x - clamp(floor(c.x / 2.5 + .5), -1., 1.) * 2.5;
      tri = vseg(vec2(cx3, c.y), vec2(-.3, 0.), vec2(.3, 0.)) - hh * 1.35;
    }
    return mix(one, tri, split);
  }`;
const SHOWS = ["barrido", "mirada", "ecualizador", "texto", "lluvia", "latido", "onda"], PETS = ["felices", "corazones", "chispas", "sorpresa"];
const STYLES = ["cristal", "crt", "lcd", "led", "oro", "holo"];   // (v39) el acabado del visor, aparte de su forma
// (v49) el poro del plástico mate: hoyitos de ruido celular (la altura baja en el centro de cada poro)
const PORE = /* glsl */`
  float poreHash(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  float poreH(vec3 p) { vec3 i = floor(p), f = fract(p); float d = 1.;
    for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) { vec3 g = vec3(x, y, z), o = vec3(poreHash(i + g), poreHash(i + g + 7.1), poreHash(i + g + 13.7));
      d = min(d, length(g + o - f)); }
    return smoothstep(0., .45, d); }`;
const KINDS = ["banda", "lentes", "ojo", "ranura", "pantalla", "pixeles"];
const BOTTOMS = ["redonda", "media", "plana"];
const EARS = ["hoja", "capsula", "punta", "corta", "caida", "antena"];
const FUR_V = /* glsl */`
  #include <common>
  #include <skinning_pars_vertex>
  uniform float uLen, uBase, uH; uniform vec3 uGrav, uComb, uCombAt;
  varying vec3 vObj, vN, vON; varying float vH, vClump, vMott, vAO;
  float hash(vec3 p) { p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.x + p.y) * p.z); }
  float vnoise(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
  void main() {
    vON = normal; vClump = vnoise(position * 6.); vMott = vnoise(position * 24.);   // el ruido suave, por vértice
    #ifdef USE_COLOR
    vAO = color.r;   // (v48) oclusión cocinada en Blender
    #else
    vAO = 1.;
    #endif
    float h = uBase > .5 ? 0. : uH;
    vec3 objectNormal = normal, transformed = position;
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <skinning_vertex>
    vec3 normal = normalize(objectNormal);
    vec3 p = transformed + normal * uLen * h;
    float near = exp(-pow(length((modelMatrix * vec4(position, 1.)).xyz - uCombAt) / .22, 2.));
    p += (uGrav + uComb * near) * uLen * h * h;              // la punta cede: gravedad, giro y el peine del cursor
    vObj = position; vH = h;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
  }`;
const FUR_F = /* glsl */`
  uniform vec3 uTint, uL, uGlow; uniform float uD, uBase, uLid, uOpen, uSplit, uSmile, uDark; uniform sampler2D uStr;
  varying vec3 vObj, vN, vON; varying float vH, vClump, vMott, vAO;
  ${SHAPE}
  void main() {
    float strand = .5, crease = 1.;
    // el hueco del visor es la forma del gesto: el pelo crece hasta su borde (más corto pegado a él) y ahí hace un pliegue.
    // Cuando el visor se cierra, se curva o se parte, el pelo lo sigue: hueco y visor van a la vez
    float d = vObj.x > .05 ? visorD(vObj, uOpen, uSplit, uSmile) : 9.;
    float allow = smoothstep(-.3, .45, d), dv = d * .075;   // hebras cortas montan sobre el canto: el cristal queda cosido dentro
    crease = mix(.38, 1., smoothstep(.0, 1.6, d));   // (v48) más hondo: el visor queda metido entre el pelo
    if (uBase < .5) {
      if (vH > allow) discard;
      vec3 w = abs(normalize(vON));                                   // cada texel es una hebra; se proyecta por el eje que más mira a la superficie
      vec2 uv = w.x > w.y && w.x > w.z ? vObj.yz : w.y > w.z ? vObj.xz : vObj.xy;
      float r = texture2D(uStr, uv * uD / 512.).r * (.82 + .36 * vClump);
      if (r < vH) discard;
      strand = r;
    }
    vec3 N = normalize(vN);
    float wrap = clamp((dot(N, uL) + .8) / 1.8, 0., 1.), rim = pow(1. - max(N.z, 0.), 1.7);
    // (v42) en modo oscuro es una habitación a oscuras: luz de luna fría y tenue, sombras hondas; la luz cálida la pone el visor
    vec3 shadeC = mix(vec3(.80, .66, .58), vec3(.30, .30, .36), uDark), keyC = mix(vec3(1.), vec3(.74, .76, .84), uDark);
    vec3 col = mix(uTint * shadeC, uTint * keyC, smoothstep(0., 1., wrap));
    col *= mix(.70, 1.02, vH) * (.94 + .12 * strand) * (.95 + .08 * vMott) * crease;
    col *= mix(mix(.45, 1., vAO), 1., vH * .55);   // (v48) la sombra de contacto: honda en la base del pelo, suave en las puntas
    if (vObj.x > .05) { vec2 cp = vec2(atan(-vObj.z, vObj.x) * .58, vObj.y - VY) / .075;
      float blush = exp(-pow(length(vec2(abs(cp.x) - 3.4, cp.y + 2.3) / vec2(1.5, 1.)), 2.)) * (.35 + .5 * uSmile);
      col = mix(col, col * vec3(1.06, .80, .74), blush); }   // en el pliegue del párpado, algo de sombra
    col += mix(vec3(1., .96, .90), vec3(.50, .58, .74) * .7, uDark) * rim * (.08 + .26 * vH) * (.6 + .4 * wrap);   // el contraluz: cálido en claro, frío y suave en oscuro (lo separa del fondo)
    // (v40) la luz del visor ilumina el pelo de alrededor según su color: en un peluche oscuro se ve poca y cálida, no una mancha;
    // las puntas (vH alto) la cogen más y hay un filo fino pegado al cristal, como luz que se cuela entre las hebras
    float near = exp(-max(dv, 0.) * mix(34., 15., uDark)), edge = exp(-max(dv, 0.) * 90.);   // a oscuras la luz del visor llega más lejos
    vec3 alb = mix(vec3(.10), uTint, .9);
    col += uGlow * step(.1, vObj.x) * (alb * near * (.35 + .65 * vH) * mix(1.25, 2.8, uDark) + vec3(.9, .55, .2) * edge * mix(.24, .5, uDark) * vH);
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
// el visor: cristal oscuro con su pantalla debajo. Lo que se ve en ella cuenta el estado (como el sombreador, pero dibujado en la pantalla)
const VISOR_V = /* glsl */`
  uniform float uOpen, uSplit, uSmile;
  varying vec3 vObj, vN, vV, vT, vU;
  ${SHAPE}
  void main() {
    vObj = position;
    float a = atan(-position.z, position.x), d = visorD(position, uOpen, uSplit, uSmile);
    // (v47) la normal sale de la forma exacta de la cúpula (la superelipse de tino.py), no de la malla simplificada: así el reflejo
    // no hace bandas ni líneas. Y todo el visor se separa un poco más de la cabeza, para que en el borde no asome la piel por debajo
    vec3 q = vec3(position.x / .63, (position.y - .26) / .50, position.z / .50);
    vec3 an = normalize(sign(q) * pow(abs(q) + 1e-4, vec3(1.25)) / vec3(.63, .50, .50));
    vec3 p = position + an * (.0012 + .007 * sqrt(clamp(-d / 1.1, 0., 1.)));  // (v48) casi a ras de la cara: abombada solo un poco (antes 3,5 + 22 mm: flotaba)
    vN = normalize(normalMatrix * an); vT = normalize(normalMatrix * vec3(-sin(a), 0., -cos(a))); vU = normalize(normalMatrix * vec3(0., 1., 0.));
    vec4 mv = modelViewMatrix * vec4(p, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv;
  }`;
const VISOR_F = /* glsl */`
  // el visor de antes: una banda de cristal negro que rodea la cara. Cada gesto deforma la banda (se cierra en una raya, se curva
  // en sonrisa, se parte en tres lentes) y lo que queda fuera se pinta del pelo, como un párpado.
  uniform float uTime, uOpen, uSplit, uSmile, uSeg, uScan, uScanOn, uBeam, uFur, uGaze, uStyle, uShow, uShowOn, uPet, uPetKind, uDark, uEyesOn; uniform vec3 uL, uLit, uTint; uniform vec4 uEyes; uniform sampler2D uText;
  varying vec3 vObj, vN, vV, vT, vU;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float seg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
  ${SHAPE}
  // (v40) lo que pasa dentro del visor en reposo: 1 mirada · 2 ecualizador · 3 texto · 4 lluvia · 5 latido · 6 onda (0 = el barrido, aparte)
  float showFx(vec2 c, float H, float t, float k) {
    H = max(H, .2);
    if (k < .5) return 0.;
    if (k < 1.5) { vec2 q = (c - vec2(uGaze * 2., 0.)) / vec2(.8, H * .8); float r = dot(q, q); return exp(-r * 1.8) * 1.2 + exp(-r * .2) * .12; }
    if (k < 2.5) { float w = .55, i = floor(c.x / w), f = abs(fract(c.x / w) - .5);
      float h = (.2 + .8 * abs(sin(t * 2.7 + i * 1.7) * sin(t * 1.15 + i * .83))) * H;
      return step(f, .3) * smoothstep(h + .04, h - .04, abs(c.y)); }
    if (k < 3.5) { float W = 2. * H * 8.4, v = .5 - c.y / (2. * H) * .95; if (v < 0. || v > 1.) return 0.; return texture2D(uText, vec2(fract((c.x + t * 1.7) / W), v)).a; }
    if (k < 4.5) { float w = .4, i = floor(c.x / w), f = abs(fract(c.x / w) - .5), sp = .5 + hash(vec2(i, 7.));
      float y = fract(c.y / (2.6 * H) + t * sp * .7 + hash(vec2(i, 2.)));
      return step(f, .28) * pow(y, 6.) * step(.25, hash(vec2(i, 5.))) * 1.4; }
    if (k < 5.5) { float x = fract(c.x / 7.2 - t * .42);
      float yl = (exp(-pow((x - .5) / .016, 2.)) - .55 * exp(-pow((x - .53) / .014, 2.)) + .22 * exp(-pow((x - .72) / .05, 2.))) * H * .95;
      return exp(-abs(c.y - yl) * 10.) * (.25 + .75 * x * x); }
    return exp(-abs(c.y - sin(c.x * 1.3 - t * 3.) * H * .55) * 9.);
  }
  // (v40) al pasar la mano no se curva: dentro aparecen dos ojos. 0 felices · 1 corazones · 2 chispas · 3 sorpresa
  float petFx(vec2 c, float H, float t, float k) {
    H = max(H, .35); vec2 a = vec2(abs(c.x) - VX * .42, c.y);
    if (k < .5) { float s = H * .62; return smoothstep(.2, .08, min(seg(a, vec2(-s, -s * .4), vec2(0., s * .45)), seg(a, vec2(0., s * .45), vec2(s, -s * .4)))); }
    if (k < 1.5) { vec2 q = a / (H * .62) * (1. - .07 * sin(t * 9.)); q.y += .15; float f = pow(dot(q, q) - 1., 3.) - q.x * q.x * q.y * q.y * q.y; return smoothstep(.03, -.03, f); }
    if (k < 2.5) { vec2 g = c * vec2(1.5, 2.4), i = floor(g), f = fract(g) - .5; float h = hash(i), tw = pow(max(0., sin(t * 5. + h * 40.)), 6.);
      float st = max(smoothstep(.07, 0., abs(f.x)) * smoothstep(.38, 0., abs(f.y)), smoothstep(.07, 0., abs(f.y)) * smoothstep(.38, 0., abs(f.x)));
      return st * tw * step(.3, h) * 2.; }
    return smoothstep(.17, .06, abs(length(a) - H * .5));
  }
  // (v50) los dos ojos de las caras: uEyes.xy el medio ancho y medio alto del de la izquierda, .zw el de la derecha
  float eyesFx(vec2 c) {
    c.x -= uGaze * .35;                                   // miran un poco hacia el puntero
    vec2 e = c.x < 0. ? uEyes.xy : uEyes.zw;
    float d = rbox(c - vec2(sign(c.x) * 1.55, 0.), e, min(e.x, e.y) * .45);
    return smoothstep(.06, -.06, d) * (.85 + .15 * smoothstep(0., -.2, d)) + exp(-max(d, 0.) * 9.) * .18;   // núcleo y un halo corto
  }
  void main() {
    vec3 N = normalize(vN), ember = vec3(1., .62, .20);
    float ang = atan(-vObj.z, vObj.x);
    vec2 p = vec2(ang * .58, vObj.y - VY) / .075;                  // en unidades de medio alto de la banda abierta
    vec2 c = visorP(vObj, uSmile);                                    // sonrisa: el centro baja y los extremos suben
    float hh = visorHH(uOpen);
    // la pantalla está debajo del cristal: al girar se desplaza un poco respecto al reflejo (paralaje), como en un visor de verdad
    vec2 off = -vec2(dot(vV, normalize(vT)), dot(vV, normalize(vU))) * .55;
    vec2 cg = c, pg = p; c += off; p += off;
    float d = visorD(vObj, uOpen, uSplit, uSmile);
    float inside = smoothstep(.08, -.08, d);
    // la pantalla, bajo el cristal
    float vy = c.y / max(hh, .12);
    float idle = (1. - uSplit) * (1. - uSeg) * (1. - uScanOn) * smoothstep(.5, .9, uOpen) * (1. - uShowOn * step(.5, uShow)) * (1. - uPet) * (1. - uEyesOn);   // (v40) con otro contenido elegido, las rayitas se apagan
    vec3 scr = vec3(.012, .012, .014);
    float run = (p.x + uTime * 1.4) / .55, cell = floor(run);
    scr += ember * step(.42, hash(vec2(cell, 3.))) * step(abs(fract(run) - .5), .30) * smoothstep(.5, .2, abs(vy)) * (.5 + .35 * sin(uTime * 3. + cell * .7)) * idle;
    scr += ember * exp(-abs(p.x - (fract(uTime * .17) * 12. - 6.)) * 1.6) * .18 * idle;
    scr += mix(ember, vec3(1., .9, .7), .4) * exp(-pow((p.x - uGaze * 2.5) / 1.0, 2.)) * smoothstep(.9, .1, abs(vy)) * .75 * idle;   // la mirada
    for (int i = 0; i < 3; i++) {
      float x0 = i == 0 ? -VX : i == 1 ? -.62 : 2.05, x1 = i == 0 ? -2.05 : i == 1 ? .62 : VX, lit = i == 0 ? uLit.x : i == 1 ? uLit.y : uLit.z;
      float ds = seg(c, vec2(x0, 0.), vec2(x1, 0.)) - hh * .55;
      scr = mix(scr, mix(vec3(.09, .085, .08), ember * 1.7, lit), smoothstep(.06, -.06, ds) * uSeg);
    }
    scr += ember * 1.9 * exp(-abs(p.x - uScan * 3.2) * .9) * smoothstep(1., .2, abs(vy)) * uScanOn;
    scr += ember * uBeam * (.9 + .6 * smoothstep(1., 0., abs(vy)));
    scr += ember * 1.6 * showFx(c, hh, uTime, uShow) * uShowOn;
    scr = mix(scr, vec3(.012, .012, .014) + mix(ember, vec3(1., .82, .5), .35) * 1.8 * eyesFx(c), uEyesOn * (1. - uPet));
    scr = mix(scr, vec3(.012, .012, .014) + ember * 1.8 * petFx(c, hh, uTime, uPetKind), uPet);
    scr *= .55 + .45 * smoothstep(1., .25, abs(vy));                 // más oscuro hacia el borde, como un tubo
    // (v39) estilos: la misma imagen de la pantalla, mostrada con otra tecnología
    float lum = clamp(dot(scr - vec3(.012, .012, .014), vec3(.35, .5, .15)) * 1.6, 0., 2.);
    if (uStyle > .5 && uStyle < 1.5) {          // CRT ámbar: fósforo, líneas de barrido y viñeta de tubo
      float sl = .5 + .5 * sin(c.y * 7. - uTime * 3.);
      vec2 q = c / vec2(VX + 1., max(hh, .3) * 1.4);
      scr = (vec3(.24, .11, .02) + vec3(1., .56, .12) * lum * 1.3 + vec3(1., .85, .55) * pow(lum, 3.) * .5) * sl * clamp(1. - dot(q, q) * .4, 0., 1.);
    } else if (uStyle > 1.5 && uStyle < 2.5) {  // LCD de los noventa: fondo oliva sin luz propia y píxeles de tinta
      vec2 g = abs(fract(c * 3.) - .5); float grid = smoothstep(.5, .4, max(g.x, g.y));
      scr = mix(vec3(.45, .49, .30), vec3(.09, .11, .06), clamp(lum * 1.5, 0., 1.) * grid) * (.86 + .14 * grid);
    } else if (uStyle > 2.5 && uStyle < 3.5) {  // matriz de LED: cada punto se enciende o se queda apagado
      vec2 cc = fract(c * 1.9) - .5; float dm = smoothstep(.36, .27, length(cc));
      scr = (vec3(.07, .03, .015) + vec3(1., .5, .12) * lum * 1.8) * dm + vec3(.008) * (1. - dm);
    }
    c = cg; p = pg; vy = c.y / max(hh, .12);
    // relieve: la normal se inclina hacia fuera cerca del borde (gradiente de la forma), como una lente abombada con su canto
    float e = .03, gx = visorD(vObj + vec3(0.) , uOpen, uSplit, uSmile);
    vec2 gr = vec2(visorD(vObj + e * vec3(-sin(ang), 0., -cos(ang)), uOpen, uSplit, uSmile) - gx, visorD(vObj + vec3(0., e, 0.), uOpen, uSplit, uSmile) - gx);
    float tilt = smoothstep(-.9, 0., d);
    N = normalize(N * (1. - tilt * .6) + (normalize(vT) * gr.x + normalize(vU) * gr.y) / max(length(gr), 1e-4) * tilt);
    // el cristal: reflejo del estudio, un brillo largo arriba (la banda es curva) y el canto que se ilumina
    float fres = pow(1. - max(dot(N, vV), 0.), 3.), spec = pow(max(dot(N, normalize(uL + vV)), 0.), 60.);
    vec3 refl = mix(vec3(.04, .04, .045), vec3(.9, .88, .85) * mix(1., .3, uDark), smoothstep(.15, .7, reflect(-vV, N).y));
    float streak = smoothstep(.3, .1, abs(vy - .55)) * smoothstep(.0, .3, -d) * .16;   // la franja de luz sobre la banda
    vec3 glass = scr + refl * (.015 + .32 * fres) + vec3(1.) * (spec * .8 + streak);   // cristal negro: casi no refleja de frente
    glass += vec3(1., .97, .92) * pow(max(dot(N, normalize(uL + vV)), 0.), 18.) * .35 * tilt;   // el canto abombado coge la luz
    if (uStyle > 1.5 && uStyle < 2.5) glass = scr + refl * .04 + vec3(1.) * spec * .15;          // LCD: plástico mate, casi sin brillo
    else if (uStyle > .5 && uStyle < 1.5) glass += refl * .06 * (1. - fres);                     // CRT: cristal curvo que refleja más
    else if (uStyle > 3.5 && uStyle < 4.5) {    // espejo dorado de astronauta: refleja el estudio y apenas deja ver la pantalla
      vec3 env = mix(vec3(.12, .08, .03), vec3(1., .94, .82), smoothstep(-.3, .8, reflect(-vV, N).y));
      glass = vec3(1., .72, .30) * env * (.5 + .5 * fres) + vec3(1.) * spec * 1.2 + scr * .22;
    } else if (uStyle > 4.5) {                  // holográfico: película irisada sobre cristal oscuro
      float th = dot(N, vV); vec3 film = .5 + .5 * cos(6.2831 * (vec3(0., .33, .67) + th * 1.7 + c.x * .06 + uTime * .05));
      glass = scr + film * (.12 + .6 * fres) + vec3(1.) * spec + streak * .5;
    }
    // hundido: el borde de arriba hace sombra sobre el cristal y un labio de goma lo rodea
    glass *= 1. - .55 * smoothstep(-.45, 0., d) * smoothstep(-.2, .6, vy);
    glass *= .5 + .5 * smoothstep(0., -.35, d);                       // oclusión: donde el pelo toca el cristal, sombra suave
    float lip = smoothstep(-.2, -.05, d);
    glass = mix(glass, vec3(.025, .024, .022), lip * .85);
    // (v47) el borde se recorta con antialiasing (alpha to coverage) y no a cuchillo: sin dientes de sierra
    float aa = max(fwidth(d), 1e-3), cover = clamp(.5 - d / aa, 0., 1.);
    if (cover <= 0.) discard;                                          // fuera de la forma no hay visor: se ve el pelo (o el material)
    gl_FragColor = vec4(glass, cover);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
// (v40) el texto que corre por el visor: letras de píxel en blanco sobre transparente (el sombreador lo tiñe de ascua)
let TXT = null;
function textTex(THREE) {
  if (TXT) return TXT;
  const c = document.createElement("canvas"); c.width = 1024; c.height = 64; const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.textBaseline = "middle"; x.font = "700 50px ui-monospace, Menlo, monospace";
  const msg = "CRITERIO · TINO · ", w = x.measureText(msg).width; x.setTransform(1024 / w, 0, 0, 1, 0, 0); x.fillText(msg, 0, 34);
  TXT = new THREE.CanvasTexture(c); TXT.wrapS = THREE.RepeatWrapping; TXT.minFilter = THREE.LinearFilter; return TXT;
}
// la etiqueta de tela: cinta ámbar con su nombre bordado en crema, una costura de puntadas y el trozo que entra en la costura
let TAG = null;
function tagMat(THREE) {
  if (!TAG) {
    // u (ancho del lienzo) va a lo largo de la cinta, de la costura hacia abajo; v, de lado a lado. El texto se escribe girado para leerse en horizontal
    const c = document.createElement("canvas"); c.width = 400; c.height = 500; const x = c.getContext("2d");
    x.fillStyle = "#E07F25"; x.fillRect(0, 0, 400, 500);
    for (let i = 0; i < 400; i += 3) { x.fillStyle = i % 6 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.05)"; x.fillRect(i, 0, 1.5, 500); }   // el tejido
    x.fillStyle = "rgba(60,25,5,.5)"; x.fillRect(0, 0, 52, 500);                                                                               // la parte cosida, en sombra
    x.strokeStyle = "rgba(255,240,215,.8)"; x.lineWidth = 5; x.setLineDash([16, 11]); x.strokeRect(78, 26, 296, 448);                         // la costura
    x.setLineDash([]); x.save(); x.translate(226, 250); x.rotate(-Math.PI / 2); x.scale(-1, 1);   // la cinta se ve por su cara exterior: el texto va en espejo en la textura
    x.fillStyle = "#FBF1C7"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "700 132px Switzer, Archivo, system-ui, sans-serif"; x.fillText("Tino", 0, -12);
    x.font = "600 40px Archivo, system-ui, sans-serif"; x.fillText("de criterio", 0, 82);
    x.restore();
    TAG = new THREE.CanvasTexture(c); TAG.colorSpace = THREE.SRGBColorSpace; TAG.anisotropy = 4;
  }
  return new THREE.MeshStandardMaterial({ map: TAG, roughness: 0.85, side: THREE.DoubleSide });
}
function create(canvas, opts = {}) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: true });
  DIAG.webgl2 = !!gl;
  if (!gl) { fail("sin WebGL2 (three.js r170 lo necesita)"); return null; }
  try { const ext = gl.getExtension("WEBGL_debug_renderer_info"); DIAG.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch (_error) { /* sin datos de la GPU */ }
  // si algo falla, la página enseña la marca plana (y la página de Tino, su aviso)
  const fallback = () => canvas.dispatchEvent(new Event("tino:fallo"));
  const slow = setTimeout(() => { if (!T) { fail("tiempo agotado: el 3D no cargó en 15 s"); fallback(); } }, 15000);
  const base = opts.base || "/tino/";
  // (v42) en toda la web Tino es de peluche y blanco: ya no se leen las preferencias guardadas; solo cambia si una página lo pide
  let tintHex = opts.tint || CREAM,
    matName = opts.material || "flocado", visorKind = opts.visor || "banda", visorStyle = opts.visorStyle || "cristal", showKind = opts.show || "barrido", petKind = opts.pet || "felices", earKind = opts.ears || "corta", bottomKind = opts.bottom || "redonda";
  const S = { pet: 0, showOn: 0, ear: [...REST], vEar: [0, 0], tilt: [0, 0], vTilt: [0, 0], eyes: [0, 0, 0, 0], eyesOn: 0, seat: 0, open: 1, split: 0, smile: 0, seg: 0, scan: 0, beam: 0, sx: 1, sy: 1, hop: 0, vHop: 0, yaw: YAW, vYaw: 0, pitch: 0, vPitch: 0 };
  let pose = POSES.reposo, state = "reposo", basePose = "reposo", pressed = false, onceTimer = 0, blink = 0, t0 = performance.now(), last = 0, raf = 0;
  let visible = true, faceLeft = false, lookAt = null, seatOn = 0, bodyOn = 1, beamOn = 0, petting = 0, lastBox = null, vel = [0, 0], lastDraw = 0, viewId = "";
  let T = null;   // three.js y la escena, cuando estén cargados
  let zoom = opts.zoom || 1;
  let dark = !!opts.dark;
  let dead = false;   // tras destroy(): nada vuelve a pintar ni a escuchar
  const ears = [0, 1].map(() => ({ a: [0, 0, 0], v: [0, 0, 0], b: [0, 0, 0], w: [0, 0, 0] }));
  const combAt = [9, 9, 9], combDir = [0, 0, 0];

  const api = {
    get state() { return state; }, get viewId() { return viewId; },
    set(name, options = {}) {
      if (!POSES[name]) name = "reposo";
      clearTimeout(onceTimer);
      if (ONCE[name]) onceTimer = setTimeout(() => api.set(basePose), ONCE[name] * 1000); else if (name !== "pulsa") basePose = name;
      if (name !== state && name !== "pulsa") ears.forEach((e, i) => { e.v[2] += (i ? -1 : 1) * 1.1; e.w[2] += 0.7; });   // (v50) al cambiar de cara, las orejas dan un respingo
      state = name; pose = POSES[name]; api.dir = options.dir || ""; canvas.dataset.state = name; t0 = performance.now(); wake();
    },
    view(id) { viewId = id; },
    mirror(on) { faceLeft = !!on; wake(); },
    look(yaw, pitch = 0) { lookAt = yaw == null ? null : [yaw, pitch]; wake(); },
    beam(on) { beamOn = on ? 1 : 0; wake(); },
    kick(n) { ears.forEach((e, i) => { e.v[0] -= n * 0.05 * (i ? 0.8 : 1); e.v[2] -= n * 0.03; }); wake(); },
    jump(n = 40) { S.vHop = -n * 9; wake(); },
    press(on) { pressed = !!on; wake(); },
    seat(on, instant) { seatOn = on ? 1 : 0; if (on && T) T.loadChair(); if (instant) S.seat = seatOn; wake(); },
    body(on) { bodyOn = on ? 1 : 0; wake(); },
    material(name) { if (!MATS.includes(name)) return; matName = name; if (T) T.applyMat(); wake(); },
    // (v38) para valorar: tipo de visor y de orejas (las orejas cambian el modelo)
    visor(kind) { if (!KINDS.includes(kind)) return; visorKind = kind; if (T) T.visorU.uKind.value = KINDS.indexOf(kind); wake(); },
    bottom(kind) { if (!BOTTOMS.includes(kind) || kind === bottomKind) return; bottomKind = kind; if (T && T.build) T.build(); },
    ears(kind) { if (!EARS.includes(kind) || kind === earKind) return; earKind = kind; if (T && T.build) T.build(); },
    show(name) { if (!SHOWS.includes(name)) return; showKind = name; if (T) T.visorU.uShow.value = SHOWS.indexOf(name); wake(); },
    pet(name) { if (!PETS.includes(name)) return; petKind = name; if (T) T.visorU.uPetKind.value = PETS.indexOf(name); wake(); },
    // (v42) modo oscuro: lo pide la página o, por defecto, sigue a html[data-theme="dark"]
    zoom(z) { zoom = Math.max(0.02, Math.min(4, z)); fit(); wake(); },
    get zoomLevel() { return zoom; },
    theme(on) { dark = !!on; if (T) T.applyTheme(); wake(); },
    visorStyle(name) { if (!STYLES.includes(name)) return; visorStyle = name; if (T) T.visorU.uStyle.value = STYLES.indexOf(name); wake(); },
    get kinds() { return { bottom: bottomKind, visor: visorKind, ears: earKind, style: visorStyle, show: showKind, pet: petKind }; },
    tint(color) { tintHex = color; if (T) { T.tint.set(color); T.applyMat(); } wake(); },
    stroke(x, y) {
      petting = performance.now(); wake();
      if (!T) return;
      const r = canvas.getBoundingClientRect();
      T.ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); T.ray.setFromCamera(T.ndc, T.camera);
      const hit = T.ray.intersectObject(T.skin, false)[0];
      if (hit) { if (T.lastHit) { const d = hit.point.clone().sub(T.lastHit).multiplyScalar(30).clampLength(0, 1.6); combDir.forEach((c, k) => (combDir[k] = c + (d.getComponent(k) - c) * 0.5)); } combAt[0] = hit.point.x; combAt[1] = hit.point.y; combAt[2] = hit.point.z; T.lastHit = hit.point.clone(); } else T.lastHit = null;
    },
    // dónde está el visor en la pantalla (para el haz de rayos X)
    visorPoint() {
      const r = canvas.getBoundingClientRect();
      if (!T) return { x: r.left + r.width / 2, y: r.top + r.width * 0.62 };
      const p = T.content.localToWorld(new T.THREE.Vector3(0.6, 0.485, 0)).project(T.camera);
      return { x: r.left + (p.x + 1) / 2 * r.width, y: r.top + (1 - p.y) / 2 * r.height };
    },
    draw() { render(); },
    debug: () => T,   // para las pruebas
    edge() {
      if (!T) return 0;
      render(); const w = canvas.width, h = canvas.height; let max = 0;
      for (const [x, y, ww, hh] of [[0, h - 1, w, 1], [0, 0, w, 1], [0, 0, 1, h], [w - 1, 0, 1, h]]) { const px = new Uint8Array(ww * hh * 4); gl.readPixels(x, y, ww, hh, gl.RGBA, gl.UNSIGNED_BYTE, px); for (let i = 3; i < px.length; i += 4) max = Math.max(max, px[i]); }
      return max;
    },
  };

  // ── la escena ──
  lib().then(async ({ THREE, RoomEnvironment, SkeletonUtils }) => {
    if (dead) return;
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true, alpha: true });
    renderer.debug.onShaderError = (g, program) => { fail("sombreador", g.getProgramInfoLog(program) || "no compila"); fallback(); };
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.05;   // (v48) curva tonal: los brillos ya no se queman y las sombras tienen fondo
    const scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    const L = new THREE.Vector3(-0.45, 0.70, 0.55).normalize();
    const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.copy(L); const hemi = new THREE.HemisphereLight(0xfffaf0, 0x8a7f70, 0.9); scene.add(key, hemi);
    const camera = new THREE.OrthographicCamera(-1.26, 1.26, 2.42, -0.1, 0.1, 20); camera.position.set(0, 0, 5);
    // cabeceo alrededor de un eje de la pantalla (algo por encima de la barriga) y, dentro, el giro
    const pitchG = new THREE.Group(), yawG = new THREE.Group(), content = new THREE.Group();
    pitchG.position.y = 0.06; yawG.position.y = -0.06; scene.add(pitchG); pitchG.add(yawG); yawG.add(content);
    const tint = new THREE.Color(tintHex);
    const strands = (() => { const SZ = 512, d = new Uint8Array(SZ * SZ); for (let i = 0; i < d.length; i++) d[i] = Math.random() ** 0.7 * 255;
      const t = new THREE.DataTexture(d, SZ, SZ, THREE.RedFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t; })();
    const grav = new THREE.Vector3(), comb = new THREE.Vector3(), combAtV = new THREE.Vector3(9, 9, 9), glow = new THREE.Color(0, 0, 0);
    const furMat = (h, isBase, lid) => new THREE.ShaderMaterial({ vertexColors: HASAO, vertexShader: FUR_V, fragmentShader: FUR_F,
      uniforms: { uDark: visorU.uDark, uKind: visorU.uKind, uLid: { value: lid ? 1 : 0 }, uOpen: visorU.uOpen, uSplit: visorU.uSplit, uSmile: visorU.uSmile, uGlow: { value: glow }, uH: { value: h }, uBase: { value: isBase ? 1 : 0 }, uStr: { value: strands }, uTint: { value: tint }, uL: { value: L }, uLen: { value: 0.04 }, uD: { value: 270 }, uGrav: { value: grav }, uComb: { value: comb }, uCombAt: { value: combAtV } } });
    const visorU = { uDark: { value: 0 }, uShow: { value: Math.max(0, SHOWS.indexOf(showKind)) }, uShowOn: { value: 0 }, uPet: { value: 0 }, uPetKind: { value: Math.max(0, PETS.indexOf(petKind)) }, uText: { value: textTex(THREE) }, uStyle: { value: Math.max(0, STYLES.indexOf(visorStyle)) }, uKind: { value: Math.max(0, KINDS.indexOf(visorKind)) }, uGaze: { value: 0 }, uFur: { value: 1 }, uTint: { value: tint }, uTime: { value: 0 }, uOpen: { value: 1 }, uSplit: { value: 0 }, uSmile: { value: 0 }, uSeg: { value: 0 }, uScan: { value: 0 }, uScanOn: { value: 0 }, uBeam: { value: 0 }, uEyes: { value: new THREE.Vector4() }, uEyesOn: { value: 0 }, uL: { value: L }, uLit: { value: new THREE.Vector3() } };
    const visorMat = new THREE.ShaderMaterial({ vertexShader: VISOR_V, fragmentShader: VISOR_F, uniforms: visorU, alphaToCoverage: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });   // a ras: el desfase de profundidad evita que asome la piel

    const modelUrl = () => base + `tino-${earKind}${bottomKind !== "redonda" ? "-" + bottomKind : ""}.glb`;   // (v48) todos con oclusión; tino.glb queda para las versiones congeladas   // (v45) la base: redonda, media o plana (como el isotipo)   // (v42) por defecto, cápsulas; tino.glb (hoja) se queda para las versiones congeladas
    const tino = new THREE.Group(), chair = new THREE.Group(), bones = {}, T0 = {};
    let skin = null, shells = [], furBase = null, HASAO = false;   // HASAO: el modelo trae la oclusión cocinada (los antiguos no: con ella activada saldrían negros)
    // el cuerpo: se monta de nuevo al cambiar de orejas (cada tipo es su propio modelo, con los mismos huesos)
    const build = async () => {
      const want = earKind + bottomKind, tg = opts.body === false ? null : await glb(modelUrl());   // la silla se carga solo si alguien la pide (seat)
      if (want !== earKind + bottomKind || !tg) return;
      tino.clear(); shells.forEach((sh) => sh.material.dispose()); if (furBase) furBase.dispose(); if (skin && skin.material !== furBase && skin.material.dispose) skin.material.dispose();
      shells = []; skin = null; Object.keys(bones).forEach((k) => delete bones[k]); delete T0.visor; delete T0.tag;
      const g = SkeletonUtils.clone(tg.scene);   // cada instancia, su copia (con su propio esqueleto)
      g.traverse((o) => { if (o.isBone) bones[o.name] = o; if (!o.isMesh) return; if (o.name.startsWith("visor")) { o.material = visorMat; T0.visor = o; } else if (o.name.startsWith("etiqueta")) T0.tag = o; else if (o.isSkinnedMesh) skin = o; });
      // el archivo va comprimido (meshopt) con las posiciones cuantizadas: el pelo y el visor necesitan las medidas reales,
      // así que se devuelven a su escala (la del visor está en su nodo; la del cuerpo, en el esqueleto) y se vuelve a atar el esqueleto
      g.updateMatrixWorld(true);
      const real = (mesh, M) => { const geo = mesh.geometry; if (geo.userData.real) return; geo.userData.real = true;   // las copias comparten geometría: una sola vez
        const p = geo.attributes.position, n = geo.attributes.normal, v = new THREE.Vector3(), nm = new THREE.Matrix3().getNormalMatrix(M);
        const P = new Float32Array(p.count * 3), Nn = n && new Float32Array(n.count * 3);
        for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(M).toArray(P, i * 3); if (n) v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize().toArray(Nn, i * 3); }
        geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); if (n) geo.setAttribute("normal", new THREE.BufferAttribute(Nn, 3)); geo.computeBoundingSphere(); geo.computeBoundingBox(); };
      for (const o of [T0.visor, T0.tag]) if (o) { real(o, o.matrix.clone()); o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1); o.updateMatrix(); }
      if (T0.tag) T0.tag.material = tagMat(THREE);
      const sk = skin.skeleton, M = skin.bindMatrixInverse.clone().multiply(sk.bones[0].matrixWorld.clone().multiply(sk.boneInverses[0])).multiply(skin.bindMatrix);
      real(skin, M); g.updateMatrixWorld(true); skin.bind(sk); HASAO = !!skin.geometry.attributes.color;
      skin.material = furBase = furMat(0, true); skin.renderOrder = N + 1; skin.frustumCulled = false;
      for (let i = 1; i <= N; i++) { const sh = new THREE.SkinnedMesh(skin.geometry, furMat(i / N)); sh.bind(skin.skeleton, skin.bindMatrix); sh.frustumCulled = false; sh.renderOrder = N - i; skin.parent.add(sh); shells.push(sh); }
      tino.add(g);
      if (!T) return;
      T.skin = skin; T.ears = ["oreja_i", "oreja_d"].map((n) => [1, 2, 3].map((k) => bones[n + "_" + k]).filter(Boolean));
      T.rest = T.ears.map((list) => list.map((b) => b.quaternion.clone()));
      // para cada hueso, los ejes del mundo (hacia atrás = giro alrededor de z; de lado = alrededor de x) vistos desde el propio hueso
      T.scene.updateMatrixWorld(true);
      const wq = new THREE.Quaternion();
      T.axes = T.ears.map((list) => list.map((b) => { b.getWorldQuaternion(wq); const inv = wq.clone().invert(); return { back: new THREE.Vector3(0, 0, 1).applyQuaternion(inv), side: new THREE.Vector3(1, 0, 0).applyQuaternion(inv) }; }));
      T.applyMat(); ears.forEach((e) => e.v[1] += 0.6); wake(); render();
      canvas.dispatchEvent(new Event("tino:orejas"));
    };
    const pivot = new THREE.Group(); pivot.position.y = -0.33; chair.add(pivot);
    const loadChair = () => { if (loadChair.p) return loadChair.p; return (loadChair.p = glb(base + "silla.glb").then((cg) => {
      const c = cg.scene.clone(true);
      c.traverse((o) => { if (!o.isMesh) return; const n = o.material.name;
        o.material = n === "laca" ? new THREE.MeshPhysicalMaterial({ color: 0xf2efe8, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12 })
          : n === "nogal" ? new THREE.MeshStandardMaterial({ color: 0x5a341c, roughness: 0.5 }) : new THREE.MeshStandardMaterial({ color: 0xd8d8dc, roughness: 0.22, metalness: 1 }); });
      // la silla crece y encoge en su sitio, alrededor de su centro
      c.position.y = 0.33; pivot.add(c); wake();
    })); };
    if (seatOn || opts.body === false) loadChair();
    content.add(tino, chair);
    T = { key, hemi, build, loadChair, glow, THREE, renderer, scene, camera, content, pitchG, yawG, tino, chair: pivot, skin: null, bones, tint, grav, comb, combAtV, visorU, ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), lastHit: null, ears: [], rest: [], axes: [] };
    // (v47) «casco»: cromo espejo como el casco de Daft Punk. Un estudio propio de reflejos de mucho contraste (sala casi negra con
    // tiras de luz) da ese negro profundo con bandas blancas; con el estudio suave de siempre el cromo quedaba gris
    let HELMET = null;
    const helmetEnv = () => {
      if (HELMET) return HELMET;
      const st = new THREE.Scene();
      // el entorno es una esfera: un estudio oscuro que se aclara poco hacia arriba, un horizonte marcado y abajo casi negro.
      // Las luces son las que dibujan el casco: una caja grande arriba, una línea fina que lo cruza y dos tiras a los lados
      const sky = new THREE.SphereGeometry(10, 64, 32), col = [], pos = sky.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10, up = THREE.MathUtils.smoothstep(y, -0.03, 0.05);
        const v = THREE.MathUtils.lerp(0.09 + 0.12 * Math.pow(Math.max(-y, 0), 0.7), 0.06 + 1.1 * Math.pow(Math.max(y, 0), 1.3), up); col.push(v, v, v * 1.03); }   // (v49) abajo, un rebote gris (antes casi negro: la parte de abajo del casco se perdía)
      sky.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      st.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
      const strip = (w, h, x, y, z, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); st.add(m); };
      strip(8, 4, 1.5, 6, 3.5, 3);        // la caja de luz grande, arriba y delante
      strip(12, 0.22, 0, 1.1, 6, 4);      // la línea fina que cruza (la del casco de la foto)
      strip(0.5, 5, -5.5, 1.2, 1.5, 2.2); // tiras verticales a los lados
      strip(0.5, 5, 5.5, 1.2, -1, 1.6);
      strip(6, 2, 0, 0.6, -7, 0.9);       // el fondo gris claro de detrás, que asoma en los bordes
      strip(9, 4, 0, -5, 2.5, 0.7);       // (v49) el suelo claro delante, que se refleja abajo
      HELMET = new THREE.PMREMGenerator(renderer).fromScene(st, 0.02).texture; return HELMET;
    };
    // los materiales del brandbook: el peluche es el pelo por capas; el resto, un material físico sobre la misma malla
    // (v48) en los materiales lisos la cara se talla alrededor del visor, píxel a píxel y con la misma forma que el gesto: un bisel que
    // cae hacia el hueco (coge luz y sombra) y la sombra del fondo del hueco. Así el visor está metido en la cabeza, no pegado encima
    const carve = (mat) => {
      mat.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, { uOpen: visorU.uOpen, uSplit: visorU.uSplit, uSmile: visorU.uSmile, uKind: visorU.uKind, uPore: { value: mat.userData.pore || 0 }, uAOmin: { value: mat.userData.aoMin ?? 0.3 } });
        sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vVisO, vAxX, vAxY, vAxZ;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvVisO = position; vAxX = normalMatrix * vec3(1., 0., 0.); vAxY = normalMatrix * vec3(0., 1., 0.); vAxZ = normalMatrix * vec3(0., 0., 1.);");
        sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform float uOpen, uSplit, uSmile, uPore, uAOmin; varying vec3 vVisO, vAxX, vAxY, vAxZ;\n" + SHAPE + PORE)
          .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
            float vd = vVisO.x > .05 ? visorD(vVisO, uOpen, uSplit, uSmile) : 9.;
            float bev = smoothstep(.8, .0, vd) * step(-.05, vd);
            vec2 gd = vec2(dFdx(vd), dFdy(vd)); float gn = length(gd);
            if (gn > 1e-6) normal = normalize(normal - vec3(gd / gn, 0.) * bev * .7);
            // (v49) poro: un relieve muy fino que se apaga cuando el poro mide menos de un píxel (si no, parpadea)
            // el gradiente del poro se calcula en la superficie (no con derivadas de pantalla, que lo pixelaban en bloques de 2×2)
            if (uPore > 0.) { vec3 pp = vVisO * 150.; float fade = 1. - smoothstep(.55, 1.3, length(fwidth(pp))), e = .06, h0 = poreH(pp);
              vec3 g = vec3(poreH(pp + vec3(e, 0., 0.)) - h0, poreH(pp + vec3(0., e, 0.)) - h0, poreH(pp + vec3(0., 0., e)) - h0) / e;
              vec3 gv = g.x * vAxX + g.y * vAxY + g.z * vAxZ; gv -= dot(gv, normal) * normal;
              normal = normalize(normal - gv * .11 * uPore * fade); }`)
          .replace("#include <color_fragment>", "")   // la oclusión no tiñe el color base: se aplica abajo a toda la luz (también al reflejo de los metales)
          .replace("#include <opaque_fragment>", "#include <opaque_fragment>\n gl_FragColor.rgb *= mix(1., .28, smoothstep(.5, .0, vd) * step(-.05, vd));\n #ifdef USE_COLOR\n gl_FragColor.rgb *= mix(uAOmin, 1., vColor.r);\n #endif");
      };
      mat.vertexColors = HASAO; mat.customProgramCacheKey = () => "visor-tallado" + (HASAO ? "-ao" : "") + (mat.userData.pore ? "-poro" : ""); return mat;
    };
    const solid = (name) => { const m = solidRaw(name); if (name === "plastico" || name === "arcilla") m.userData.pore = name === "arcilla" ? 1.6 : 1; if (m.metalness > 0.5) m.userData.aoMin = 0.62; return carve(m); };   // en los metales la oclusión se suaviza: oscurecía demasiado el reflejo de abajo
    const solidRaw = (name) => {
      const c = tint.clone(), P = (o) => new THREE.MeshPhysicalMaterial(o);
      if (name === "arcilla") return new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
      if (name === "casco") return P({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.62), metalness: 1, roughness: 0.045, envMap: helmetEnv(), envMapIntensity: 1, clearcoat: 0.5, clearcoatRoughness: 0.04 });
      if (name === "cromo") return P({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.7), metalness: 1, roughness: 0.08 });
      if (name === "irisado") return P({ color: c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), metalness: 0.85, roughness: 0.14, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [200, 900] });
      if (name === "perla") return P({ color: c, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.35, sheen: 0.6, sheenColor: new THREE.Color(1, 0.92, 0.85) });
      if (name === "cristal") return P({ color: c, transmission: 1, thickness: 0.6, roughness: 0.05, ior: 1.45, attenuationColor: c, attenuationDistance: 0.8 });
      return P({ color: c, roughness: 0.82, specularIntensity: 0.35, sheen: 0.15, sheenRoughness: 0.9, sheenColor: c });   // (v49) plástico mate y poroso: antes 0,5 de rugosidad + laca, parecía cromado
    };
    T.visorLight = new THREE.PointLight(0xffffff, 0, 0.55, 2); T.visorLight.position.set(0.78, 0.485, 0); content.add(T.visorLight);
    T.applyMat = () => {
      if (!skin) return;
      const fur = matName === "flocado"; T.solid = !fur;
      shells.forEach((sh) => (sh.visible = fur));
      if (skin.material !== furBase && skin.material.dispose) skin.material.dispose();
      skin.material = fur ? furBase : solid(matName);
      visorU.uFur.value = fur ? 1 : 0;
    };
    T.applyTheme = () => {
      T.visorU.uDark.value = dark ? 1 : 0;
      T.key.intensity = dark ? 0.9 : 1.5; T.key.color.set(dark ? 0xc4cce0 : 0xffffff);   // a oscuras, una luz de luna fría y baja
      T.hemi.intensity = dark ? 0.18 : 0.4; T.scene.environmentIntensity = dark ? 0.28 : 1;   // (v48) antes 2,2 y 0,9: el blanco liso se quemaba y perdía todo el volumen
    };
    T.applyTheme();
    await build();
    if (dead) { renderer.dispose(); return; }
    fit(); if (reduced || opts.still) settle(); else wake();
    clearTimeout(slow); if (DIAG.estado !== "fallo") DIAG.estado = "ok";
    canvas.dispatchEvent(new Event("tino:listo"));   // si llegó tarde (tras los 15 s), <Tino /> vuelve a enseñar el 3D
  }).catch((error) => { clearTimeout(slow); fail("carga (three.js o el modelo)", error); fallback(); });

  function fit() {
    const r = { width: canvas.clientWidth, height: canvas.clientHeight }; if (!r.width) return;   // la medida de diseño: sin las escalas de las animaciones
    lastBox = null;
    if (!T) return;
    // (v48) a la densidad real de la pantalla (antes como mucho ×1,5 y 760 px de ancho: en retina se dibujaba a la mitad y se veía blando).
    // El techo es de píxeles totales, para que el pelo por capas no se coma la tarjeta gráfica en lienzos grandes
    const MAXPX = LITE ? 1e6 : 3.2e6, dpr = Math.min(devicePixelRatio || 1, LITE ? 2 : 3, Math.sqrt(MAXPX / Math.max(1, r.width * r.height))), w = Math.round(r.width * dpr);   // en móvil, ×2 como mucho
    T.renderer.setPixelRatio(1); T.renderer.setSize(w, Math.round(w * (r.height / r.width)), false);
    const c = T.camera, k = r.height / r.width;
    if (opts.frame === "center") {   // encuadre centrado en Tino, quepa como quepa el lienzo (brandbook)
      let w = Math.max(1.75, 1.95 / k), h = w * k; if (h < 1.95) { h = 1.95; w = h / k; }
      w /= zoom; h /= zoom;   // (v44) zoom: >1 acerca, <1 aleja
      const cy = 0.72; c.left = -w / 2; c.right = w / 2; c.top = cy + h / 2; c.bottom = cy - h / 2;
    } else { c.left = -1.26; c.right = 1.26; c.top = 2.42; c.bottom = 2.42 - 2.52 * k; }
    c.updateProjectionMatrix();
    render();
  }
  const targets = (P) => {
    const rot = lookAt || P.rot || [YAW, 0], el = (performance.now() - t0) / 1000, shake = P.shake && el < 1.2 ? Math.sin(el * 16) * 14 * (1 - el / 1.2) : 0;
    return { yaw: (faceLeft ? 180 - rot[0] : rot[0]) + shake, pitch: rot[1], shake };
  };
  function render() {
    if (!T || canvas.width < 24) return;   // hasta que el lienzo tenga su tamaño, no se pinta
    const { THREE } = T, now = performance.now(), time = (now - t0) / 1000;
    const P = pressed ? POSES.pulsa : pose;
    T.yawG.rotation.y = -S.yaw * RAD;
    T.pitchG.rotation.x = S.pitch * RAD; T.pitchG.position.y = 0.06 + 0.64 * Math.abs(Math.sin(S.pitch * RAD)) * 0.5;
    T.content.scale.set(S.sx, S.sy, S.sx);
    T.tino.visible = !!bodyOn;
    const k = Math.max(0.001, S.seat * S.seat * (3 - 2 * S.seat)); T.chair.scale.setScalar(k); T.chair.visible = S.seat > 0.01;
    // el visor
    const U = T.visorU; U.uTime.value = now / 1000; U.uOpen.value = Math.max(0.02, S.open * (1 - blink * (1 - S.eyesOn))); U.uSplit.value = S.split; U.uSmile.value = S.smile; U.uSeg.value = S.seg; U.uScan.value = Math.sin(time * 2.4); U.uScanOn.value = S.scan; U.uBeam.value = S.beam;
    const lid = 1 - blink * S.eyesOn * 0.88;   // (v50) con ojos, parpadean los ojos y la banda se queda abierta
    U.uEyes.value.set(S.eyes[0], S.eyes[1] * lid, S.eyes[2], S.eyes[3] * lid); U.uEyesOn.value = S.eyesOn;
    const f = Math.floor(time / 0.3) % 5, lit = P.flicker ? [0, 1, 2].map((i) => (Math.floor(time / 0.11 + i * 1.7) % 3 ? 0 : 1)) : [f > 0 ? 1 : 0, f > 1 ? 1 : 0, f > 2 ? 1 : 0];
    U.uLit.value.set(...lit);
    // cuánto alumbra el visor según lo que hace
    const litN = (lit[0] + lit[1] + lit[2]) / 3, op = Math.max(0.02, S.open * (1 - blink * (1 - S.eyesOn)));
    const em = 0.10 * op + 0.35 * S.scan + 0.9 * S.beam + 0.45 * S.seg * litN + (showKind === "barrido" ? 0 : 0.28 * S.showOn) + 0.3 * S.pet + 0.12 * S.eyesOn, cr = 0.32 * S.split + 0.28 * S.smile;
    U.uShowOn.value = S.showOn; U.uPet.value = S.pet;
    T.glow.setRGB((em + cr) * 1.0, em * 0.62 + cr * 0.94, em * 0.2 + cr * 0.8);
    if (T.visorLight) { T.visorLight.color.copy(T.glow); T.visorLight.intensity = T.solid ? (dark ? 3.5 : 1.1) : 0; }   // (v48) más corta y suave: en el plástico blanco dejaba una mancha naranja   // en los materiales lisos, una luz de verdad delante del visor
    // las orejas: postura del estado + física de tres tramos
    const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
    T.ears.forEach((list, i) => list.forEach((b, j) => {
      const e = ears[i], ax = T.axes[i][j], back = (S.ear[i] - REST[i]) * RAD * EARMIX[j] + e.b[j] * EARPHYS[j];   // postura del estado + física
      const side = S.tilt[1 - i] * (i ? -1 : 1) * RAD * EARMIX[j] + e.a[j] * EARPHYS[j];   // el hueso 0 es la oreja que se ve a la derecha
      b.quaternion.copy(T.rest[i][j]).multiply(qb.setFromAxisAngle(ax.back, back)).multiply(qa.setFromAxisAngle(ax.side, side));
    }));
    // el pelo: gravedad hacia abajo (en ejes del objeto) y el peine
    const inv = new THREE.Matrix4().copy(T.content.matrixWorld).invert();
    T.grav.set(0, -0.21, 0).transformDirection(inv).multiplyScalar(0.21);
    T.comb.set(...combDir).transformDirection(inv).multiplyScalar(Math.hypot(...combDir)); T.combAtV.set(...combAt);
    T.renderer.render(T.scene, T.camera);
  }
  function step(now) {
    raf = 0;
    const dt = Math.min(0.033, (now - (last || now)) / 1000) || 0.016; last = now;
    const stroked = now - petting < 700 && petting > 0;
    const P = pressed ? POSES.pulsa : stroked && (state === "reposo" || state === "curiosa") ? POSES.caricia : pose;
    const tg = targets(P), asleep = P === POSES.dormida && !pressed, breath = asleep ? Math.sin(now / 1000 * 1.9) : 0;
    const sq = asleep ? [1 - breath * 0.012, 1 + breath * 0.034] : P.sq || [1, 1];
    const yawAcc = (tg.yaw - S.yaw) * 60 - S.vYaw * 13; S.vYaw += yawAcc * dt; S.yaw += S.vYaw * dt;
    S.vPitch += ((tg.pitch - S.pitch) * 70 - S.vPitch * 13) * dt; S.pitch += S.vPitch * dt;
    S.vHop += (-S.hop * 220 - S.vHop * 15) * dt; S.hop += S.vHop * dt;
    // cuánto acelera en pantalla (el dock que se mueve, el salto): las orejas se quedan atrás
    const box = canvas.getBoundingClientRect(), half = box.width / 2 || 1, cx = box.left + half, cy = box.top + box.height / 2;
    let acc = [0, 0];
    if (lastBox) { const v = [(cx - lastBox[0]) / half / dt, -(cy - lastBox[1]) / half / dt]; acc = [(v[0] - vel[0]) / dt, (v[1] - vel[1]) / dt]; vel = v; }
    lastBox = [cx, cy];
    const lim = (n, m) => Math.max(-m, Math.min(m, n)), ax = lim(acc[0], 60), ay = lim(acc[1], 60);
    let moving = Math.abs(S.vYaw) > 0.5 || Math.abs(tg.yaw - S.yaw) > 0.2 || Math.abs(S.vPitch) > 0.5 || Math.abs(tg.pitch - S.pitch) > 0.2 || Math.abs(S.vHop) > 2 || Math.abs(S.hop) > 0.3 || Math.hypot(ax, ay) > 0.5;
    const t = now / 1000, side = (-S.vYaw * 0.014 - yawAcc * 0.0009 - ax * 0.02 * Math.sin(S.yaw * RAD)) * EARFX, back = (Math.abs(S.vYaw) * 0.004 + ay * 0.012 - S.vHop * 0.0016) * EARFX;
    ears.forEach((e, i) => {
      const breeze = reduced ? 0 : Math.sin(t * 1.3 + i * 2.1) * 0.5;
      for (let j = 0; j < 3; j++) {
        const soft = [62, 40, 26][j], damp = [4.6, 3.4, 2.6][j], gain = j ? 0.75 : 1;
        e.v[j] += (-(e.a[j] - (j ? e.a[j - 1] * 0.9 : 0)) * soft - e.v[j] * damp + (side + breeze) * gain) * dt; e.a[j] = lim(e.a[j] + e.v[j] * dt, 0.7);
        e.w[j] += (-(e.b[j] - (j ? e.b[j - 1] * 0.9 : 0)) * soft - e.w[j] * damp + back * gain) * dt; e.b[j] = lim(e.b[j] + e.w[j] * dt, 0.55);
        if (Math.abs(e.v[j]) + Math.abs(e.w[j]) > 0.05) moving = true;
      }
    });
    const ease = 1 - Math.exp(-dt * 13);
    const follow = (key, to, rate = ease) => { if (Math.abs(to - S[key]) > 0.004) moving = true; S[key] += (to - S[key]) * rate; };
    follow("open", P.open, 1 - Math.exp(-dt * 18)); follow("split", P.split || 0); follow("smile", P.smile || 0); follow("seg", P.seg || 0); follow("scan", (P.scan || 0) * (P === POSES.reposo && showKind !== "barrido" ? 0 : 1)); follow("pet", stroked && !pressed ? 1 : 0, 1 - Math.exp(-dt * 8)); follow("showOn", P === POSES.reposo && !pressed ? 1 : 0, 1 - Math.exp(-dt * 6)); follow("beam", beamOn);
    // (v50) orejas con muelle: llegan, se pasan un poco y se asientan (antes un acercamiento sin rebote). Dormido respiran con el cuerpo
    const spring = (key, vKey, to) => { S[key] = S[key].map((x, i) => { const v = S[vKey][i] + ((to[i] - x) * 95 - S[vKey][i] * 11.5) * dt; S[vKey][i] = v; if (Math.abs(to[i] - x) > 0.2 || Math.abs(v) > 0.5) moving = true; return x + v * dt; }); };
    spring("ear", "vEar", P.ear.map((a) => a + breath * 2.5)); spring("tilt", "vTilt", P.tilt || [0, 0]);
    const eyes = P.eyes ? P.eyes.flat() : S.eyes; follow("eyesOn", P.eyes ? 1 : 0);
    S.eyes = S.eyes.map((x, k) => { if (Math.abs(eyes[k] - x) > 0.002) moving = true; return x + (eyes[k] - x) * (1 - Math.exp(-dt * 16)); });
    follow("sx", sq[0]); follow("sy", sq[1]); follow("seat", seatOn, 1 - Math.exp(-dt * 7));
    combDir.forEach((c, k) => (combDir[k] = c * Math.exp(-dt * 3))); if (Math.hypot(...combDir) > 0.01) moving = true;
    if (api.gazeStep && api.gazeStep(dt)) moving = true;
    const purr = asleep && breath < 0 ? Math.sin(now / 1000 * 150) * 0.45 * -breath : 0;
    canvas.style.transform = Math.abs(S.hop) > 0.3 ? `translateY(${Math.min(0, S.hop).toFixed(1)}px)` : purr ? `translateX(${purr.toFixed(2)}px)` : "";
    if (asleep) moving = true;
    // en calma, la pantalla del visor y la brisa bastan a ~25 imágenes por segundo
    if (moving || blink > 0 || tg.shake || now - lastDraw > 40) { render(); lastDraw = now; }
    if (visible && !document.hidden && !opts.still) wake(); else if (opts.still && moving) wake();
  }
  function wake() { if (dead) return; if (reduced || opts.still) { settle(); if (!opts.still || reduced) return; } if (!raf && visible) raf = requestAnimationFrame(step); }
  function settle() {
    const P = pressed ? POSES.pulsa : pose, tg = targets(P), sq = P.sq || [1, 1];
    Object.assign(S, { pet: 0, showOn: P === POSES.reposo ? 1 : 0, ear: [...P.ear], vEar: [0, 0], tilt: [...(P.tilt || [0, 0])], vTilt: [0, 0], eyes: P.eyes ? P.eyes.flat() : S.eyes, eyesOn: P.eyes ? 1 : 0, seat: seatOn, open: P.open, split: P.split || 0, smile: P.smile || 0, seg: P.seg || 0, scan: (P.scan || 0) * (P === POSES.reposo && showKind !== "barrido" ? 0 : 1), beam: beamOn, sx: sq[0], sy: sq[1], yaw: tg.yaw, pitch: tg.pitch, vYaw: 0, vPitch: 0 });
    t0 = performance.now() - 1000; render();
  }
  let gaze = 0, gazeTo = 0;
  const onMove = (event) => { const r = canvas.getBoundingClientRect(); gazeTo = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / (innerWidth * 0.35))) * (faceLeft ? -1 : 1); wake(); };
  addEventListener("pointermove", onMove, { passive: true });
  api.gazeStep = (dt) => { gaze += (gazeTo - gaze) * (1 - Math.exp(-dt * 6)); if (T) T.visorU.uGaze.value = gaze; return Math.abs(gazeTo - gaze) > 0.01; };
  const ro = new ResizeObserver(fit); ro.observe(canvas);
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { last = 0; lastBox = null; wake(); } }); io.observe(canvas);
  const onVis = () => { if (!document.hidden) { last = 0; lastBox = null; wake(); } };
  document.addEventListener("visibilitychange", onVis);
  const onLost = () => { if (!dead) { fail("contexto WebGL perdido (memoria de la GPU)"); fallback(); } };
  canvas.addEventListener("webglcontextlost", onLost);
  // vida en reposo: de vez en cuando parpadea o se le mueve una oreja
  const idle = !reduced && !opts.still && opts.idle !== false && setInterval(() => {
    if (!visible || document.hidden || pressed || !(state === "reposo" || (pose.eyes && state !== "dormida"))) return;
    if (Math.random() < 0.55) { blink = 0.9; wake(); setTimeout(() => { blink = 0; wake(); }, 120); } else { const e = ears[Math.random() < 0.5 ? 0 : 1]; e.v[2] += (Math.random() - 0.5) * 6; e.w[2] += Math.random() * 3; wake(); }
  }, 2600);
  // para React: al desmontar, se para todo y se suelta la tarjeta gráfica
  api.destroy = () => {
    if (dead) return; dead = true;
    cancelAnimationFrame(raf); clearTimeout(slow); clearTimeout(onceTimer); if (idle) clearInterval(idle);
    ro.disconnect(); io.disconnect(); removeEventListener("pointermove", onMove); document.removeEventListener("visibilitychange", onVis); canvas.removeEventListener("webglcontextlost", onLost);
    if (T) { T.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => m.dispose()); }); T.renderer.dispose(); }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  api.diag = DIAG;
  api.set(opts.state || "reposo"); if (opts.look) lookAt = opts.look;
  return api;
}
export { create, POSES, MATS, KINDS, EARS, BOTTOMS, STYLES, SHOWS, PETS };
