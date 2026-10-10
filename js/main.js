import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildLetter, WORD } from './letters.js';
import { parseSDF, buildLayout, mulberry32 } from './layout.js';

const params = new URLSearchParams(location.search);
const MOBILE = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
const Q = params.get('q') || (MOBILE ? 'low' : 'high'); // 렌더 품질 단계
const CAPTURE = params.has('capture');

// ---------- 조정값 ----------
const TUNE = {
  bg: '#f9fbfc',
  wall: 0.032,              // 유리 벽 두께로 남겨둘 여유 (월드 단위, 하트 폭 2.1)
  gap: 0.011,               // 조각 사이 틈
  fillTopRatio: 0.66,       // 하트 높이 대비 내용물 상단 (정면에서 약 70% 차 보이도록)
  letterHeight: 0.2,
  letterWeight: 0.038,      // 획 반지름 / 글자 높이
  frontLetters: 5,          // 정면에서 발견되는 글자 수 (나머지는 속에 묻힘)
  glassTint: '#f6fbfe',
  glassAttenuation: '#d4ecfa',
  rimColor: '#7f9fb6',
  fitWidth: MOBILE ? 0.84 : 0.8,   // 화면 폭 대비 하트 폭
  fitHeight: 0.6,                  // 화면 높이 대비 하트 높이
  // 움직임
  idleYaw: 0.035, idlePitch: 0.016, idleBob: 0.006,  // 가만히 있을 때 흔들림 폭 (rad, 월드)
  dragYawMax: 0.55, dragPitchMax: 0.28,
  lagMax: 0.07,             // 내용물이 하트보다 늦게 도는 최대 각도 (rad)
};

// ---------- 렌더러 ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q === 'low' ? 1.75 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// 톤매핑을 걸면 유리 너머의 흰 배경만 눌려 회색 막처럼 보이므로 끈다 (배경 클리어 색은 톤매핑되지 않음).
renderer.toneMapping = THREE.NoToneMapping;
if ('transmissionResolutionScale' in renderer) renderer.transmissionResolutionScale = Q === 'low' ? 0.75 : 1;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(TUNE.bg);
const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);

// ---------- 환경광: 차가운 소프트박스가 있는 스튜디오 ----------
// 흰 배경에서 투명 유리가 사라지지 않도록, 반사에 비치는 회청색 면과 또렷한 흰 패널을 만든다.
function studioEnvironment() {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(
    new THREE.SphereGeometry(10, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `varying vec3 vp;
        void main(){
          float h = normalize(vp).y;
          vec3 top = vec3(1.0, 1.0, 1.0);
          vec3 mid = vec3(0.80, 0.86, 0.91);
          vec3 low = vec3(0.30, 0.36, 0.42);
          vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, low, smoothstep(0.0, 0.5, -h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  env.add(room);
  const panel = (w, h, pos, intensity, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.copy(pos); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(5, 2.2, new THREE.Vector3(-4, 5, 4), 6.0);            // 좌상단 키 라이트
  panel(1.2, 6, new THREE.Vector3(6, 1.5, 2), 3.2, 0xeaf4ff);  // 오른쪽 세로 스트립
  panel(3, 1, new THREE.Vector3(0, 6, -3), 3.0);               // 뒤 위 림
  // 정면 아래 반사판은 하트 앞면 곡률을 따라 휘어진 띠로 비쳐 면이 울퉁불퉁해 보이므로 작고 약하게.
  panel(3, 0.6, new THREE.Vector3(0, -2, 7), 0.9, 0xdcecff);
  panel(1.0, 4, new THREE.Vector3(-6, 0, -1), 2.2, 0xd7e9f7);  // 왼쪽 차가운 스트립
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.02);
  pm.dispose();
  return rt.texture;
}
scene.environment = studioEnvironment();

// ---------- 내용물 지연(lag) 공용 유니폼 ----------
// 하트가 기울 때 내용물은 하트 로컬 공간에서 uLag(작은 회전 벡터)만큼 덜 돈 것처럼 보이게 한다.
// 조각마다 aLag(0~1) 가중치: 벽에 닿은 조각은 0이라 유리를 뚫지 않고, 안쪽·윗면 조각일수록 크게 늦는다.
const lagUniforms = { uLag: { value: new THREE.Vector3() }, uPivot: { value: new THREE.Vector3() } };
const withLag = (mat) => {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLag = lagUniforms.uLag;
    shader.uniforms.uPivot = lagUniforms.uPivot;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aLag; uniform vec3 uLag; uniform vec3 uPivot;')
      .replace('#include <project_vertex>', THREE.ShaderChunk.project_vertex.replace(
        'mvPosition = instanceMatrix * mvPosition;',
        'mvPosition = instanceMatrix * mvPosition;\n\tmvPosition.xyz += cross(uLag, instanceMatrix[3].xyz - uPivot) * aLag;',
      ));
  };
  return mat;
};

// ---------- 재질 (공유) ----------
// 밝은 진주빛 흰색이 주, 은색은 일부. 글자는 알갱이보다 한 톤 어두운 새틴 실버.
const pearl = withLag(new THREE.MeshPhysicalMaterial({
  color: '#fbfaf6', roughness: 0.28, metalness: 0,
  clearcoat: 0.8, clearcoatRoughness: 0.1,
  sheen: 0.7, sheenRoughness: 0.4, sheenColor: new THREE.Color('#e6eef8'),
  iridescence: Q === 'low' ? 0 : 0.3, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 420],
}));
const silver = withLag(new THREE.MeshStandardMaterial({ color: '#d4d9df', metalness: 1, roughness: 0.26 }));
const letterMat = new THREE.MeshStandardMaterial({ color: '#97a0ab', metalness: 1, roughness: 0.4 });

// 얇은 벽 유리. 앞면만 그린다: DoubleSide면 뒷벽이 한 번 더 굴절·반사되어 외곽선과 하이라이트가 두 겹으로 보인다.
// 두께는 거의 균일하게 얇게 두고 실루엣 쪽만 살짝 더해, 내부는 맑게 보이되 가장자리에서 조각이 끌려 나오지 않게 한다.
const glass = new THREE.MeshPhysicalMaterial({
  color: TUNE.glassTint,
  metalness: 0, roughness: 0.015,
  transmission: 1, thickness: 0.03, ior: 1.45,
  attenuationColor: new THREE.Color(TUNE.glassAttenuation), attenuationDistance: 2.4,
  specularIntensity: 1, specularColor: new THREE.Color('#ffffff'),
  clearcoat: 1, clearcoatRoughness: 0.02,
  envMapIntensity: 1.2,
  side: THREE.FrontSide,
});
glass.onBeforeCompile = (shader) => {
  shader.uniforms.rimColor = { value: new THREE.Color(TUNE.rimColor) };
  shader.uniforms.rimStrength = { value: 0.55 };
  shader.uniforms.edgeThickness = { value: 0.12 };
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 rimColor; uniform float rimStrength; uniform float edgeThickness;')
    .replace('#include <transmission_fragment>', THREE.ShaderChunk.transmission_fragment.replace(
      'material.thickness = thickness;',
      'float edgeF = pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 3.0);\n\tmaterial.thickness = thickness + edgeThickness * edgeF;',
    ))
    // 가장자리에서만 좁고 진하게 올라오는 회청 림: 흰 배경 위에서 외곽선을 또렷하게 잡는다.
    .replace('#include <opaque_fragment>', `
      float rimF = pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 4.0);
      outgoingLight = mix(outgoingLight, outgoingLight * rimColor * 1.05, rimStrength * rimF);
      #include <opaque_fragment>`);
};

// ---------- 지오메트리 (공유) ----------
const seg = Q === 'low' ? [16, 12] : [22, 16];
const sphereGeo = new THREE.SphereGeometry(1, seg[0], seg[1]);
const smallSphereGeo = new THREE.SphereGeometry(1, 10, 8);
function starGeometry() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.45 : 1;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: Q === 'low' ? 2 : 3, curveSegments: 1 });
  g.center();
  g.computeVertexNormals();
  return g;
}
// 크기가 다른 '조각': 찌그러진 조약돌 모양
function pebbleGeometry() {
  const r = mulberry32(5);
  const g = mergeVertices(new THREE.IcosahedronGeometry(1, Q === 'low' ? 1 : 2).deleteAttribute('normal').deleteAttribute('uv'));
  const p = g.attributes.position, v = new THREE.Vector3();
  const bumps = Array.from({ length: 5 }, () => new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize());
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    let k = 1;
    for (const b of bumps) k -= 0.16 * Math.max(0, v.dot(b)) ** 3;
    v.multiplyScalar(k);
    p.setXYZ(i, v.x * 1.15, v.y * 0.66, v.z * 0.95);
  }
  g.computeVertexNormals();
  return g;
}
const starGeo = starGeometry();
const pebbleGeo = pebbleGeometry();

// ---------- 로드 ----------
const [gltf, sdfBuf] = await Promise.all([
  new GLTFLoader().loadAsync('./models/heart.glb'),
  fetch('./models/heart-sdf.bin').then((r) => r.arrayBuffer()),
]);

const heartRoot = gltf.scene;
let heartMesh;
heartRoot.traverse((o) => { if (o.isMesh) heartMesh = o; });
// 원본 메시 형태는 그대로. 노드의 회전·비균일 스케일을 정점에 구워 단위 변환으로 만들고
// (투과 두께가 모델 스케일에 곱해지기 때문), UV 이음새로 갈라진 노멀만 정점 병합으로 매끈하게 다시 계산한다.
heartRoot.updateMatrixWorld(true);
{
  const g = heartMesh.geometry.clone().applyMatrix4(heartMesh.matrixWorld);
  heartMesh.removeFromParent();
  heartMesh.position.set(0, 0, 0); heartMesh.quaternion.identity(); heartMesh.scale.set(1, 1, 1);
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  heartMesh.geometry = m;
}
heartMesh.material = glass;
// 진단용: ?mat=normal|matte
if (params.get('mat') === 'normal') heartMesh.material = new THREE.MeshNormalMaterial();
if (params.get('mat') === 'matte') heartMesh.material = new THREE.MeshStandardMaterial({ color: '#dde4ea', roughness: 0.6 });
heartMesh.renderOrder = 2;
const box = new THREE.Box3().setFromObject(heartMesh);
const center = box.getCenter(new THREE.Vector3());
const size = box.getSize(new THREE.Vector3());

// 하트 전체(유리+내용물)는 중심을 축으로 기운다.
const pivot = new THREE.Group();
pivot.position.copy(center);
scene.add(pivot);
const body = new THREE.Group();
body.position.copy(center).negate();
pivot.add(body);
body.add(heartMesh);
lagUniforms.uPivot.value.copy(center);

// ---------- 내용물 배치 ----------
const sdf = parseSDF(sdfBuf);
const fillBase = box.min.y + size.y * TUNE.fillTopRatio;
const fillY = (x, z) => fillBase + 0.05 * (1 - Math.min(1, (x * x) / 0.7)) - 0.035 * x + 0.04 * Math.sin(x * 4.1 + z * 3.1 + 0.7) + 0.022 * Math.sin(x * 11.3 - z * 7.2);

const letterDefs = WORD.map((ch) => ({ ch, ...buildLetter(ch, { height: TUNE.letterHeight, weight: TUNE.letterWeight, radial: Q === 'low' ? 8 : 12 }) }));
const KINDS = [
  { name: 'pearl', weight: 40, r: [0.024, 0.072] },
  { name: 'seed', weight: 5, r: [0.013, 0.02] },
  { name: 'pebble', weight: 15, r: [0.028, 0.058] },
  { name: 'starPearl', weight: 14, r: [0.034, 0.058] },
  { name: 'silver', weight: 6, r: [0.016, 0.034] },
  { name: 'starSilver', weight: 2, r: [0.032, 0.048] },
];
const t0 = performance.now();
const layout = buildLayout(sdf, KINDS, letterDefs, {
  seed: Number(params.get('seed') || 7),
  wall: TUNE.wall,
  gap: TUNE.gap,
  fillY,
  letterY: [box.min.y + size.y * 0.2, fillBase],
  frontLetters: TUNE.frontLetters,
  dropY: fillBase + 0.12,
  bounds: box,
  maxItems: 4000,
  maxMisses: 500,
});
const layoutMs = performance.now() - t0;

// 지연 가중치: 벽에서 멀수록, 윗면에 가까울수록 크게
const lagWeight = (x, y, z) => THREE.MathUtils.smoothstep(sdf.depth(x, y, z), TUNE.wall + 0.03, TUNE.wall + 0.22)
  * (0.55 + 0.45 * THREE.MathUtils.smoothstep(y, box.min.y + size.y * 0.25, fillBase));

const rnd = mulberry32(99);
const groups = {};
for (const it of layout.items) (groups[it.kind] ||= []).push(it);
const contents = new THREE.Group();
if (!params.has('nocontents')) body.add(contents);
const M = new THREE.Matrix4(), P = new THREE.Vector3(), R = new THREE.Quaternion(), S = new THREE.Vector3(), E = new THREE.Euler(), C = new THREE.Color();
// 아래·뒤쪽일수록 조금 어둡게 (그림자 맵 대신 인스턴스 색으로 깊이감). 틈 사이로 보이는 안쪽 조각이 가라앉아 보이게 한다.
const shade = (it) => 1
  - 0.24 * THREE.MathUtils.smoothstep(fillBase - it.y, 0.04, 1.2)
  - 0.1 * THREE.MathUtils.smoothstep(-it.z, -0.1, 0.4)
  - 0.05 * rnd();

const spec = {
  pearl: { geo: sphereGeo, mat: pearl, scale: (r) => S.setScalar(r) },
  seed: { geo: smallSphereGeo, mat: pearl, scale: (r) => S.setScalar(r) },
  pebble: { geo: pebbleGeo, mat: pearl, scale: (r) => S.setScalar(r * (0.9 + rnd() * 0.15)) },
  starPearl: { geo: starGeo, mat: pearl, scale: (r) => S.setScalar(r * 1.15) },
  silver: { geo: sphereGeo, mat: silver, scale: (r) => S.setScalar(r) },
  starSilver: { geo: starGeo, mat: silver, scale: (r) => S.setScalar(r * 1.15) },
};
const tris = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;
let instTris = 0;
for (const [kind, list] of Object.entries(groups)) {
  const sp = spec[kind];
  // 같은 지오메트리를 쓰는 인스턴스 묶음마다 aLag 속성이 달라야 하므로 속성만 공유하는 껍데기를 만든다.
  const geo = new THREE.BufferGeometry();
  geo.index = sp.geo.index;
  for (const [k, a] of Object.entries(sp.geo.attributes)) geo.setAttribute(k, a);
  const lag = new Float32Array(list.length);
  const im = new THREE.InstancedMesh(geo, sp.mat, list.length);
  const isStar = sp.geo === starGeo;
  list.forEach((it, i) => {
    // 별은 옆으로 누우면 흰 막대처럼 읽히므로 대체로 앞을 보게 기울인다
    if (isStar) E.set((rnd() - 0.5) * 1.3, (rnd() - 0.5) * 1.3, rnd() * 6.28);
    else E.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
    R.setFromEuler(E);
    sp.scale(it.r);
    M.compose(P.set(it.x, it.y, it.z), R, S);
    im.setMatrixAt(i, M);
    im.setColorAt(i, C.setScalar(shade(it)));
    lag[i] = lagWeight(it.x, it.y, it.z);
  });
  geo.setAttribute('aLag', new THREE.InstancedBufferAttribute(lag, 1));
  im.instanceMatrix.needsUpdate = true;
  im.frustumCulled = false;
  contents.add(im);
  instTris += tris(sp.geo) * list.length;
}
const letterMeshes = layout.letters.map((L) => {
  const m = new THREE.Mesh(letterDefs[L.index].geometry, letterMat);
  m.position.copy(L.position);
  m.quaternion.copy(L.quaternion);
  m.userData.rest = L.position.clone();
  m.userData.lag = lagWeight(L.position.x, L.position.y, L.position.z);
  contents.add(m);
  instTris += tris(m.geometry);
  return m;
});

// ---------- 은은한 바닥 그림자 ----------
const shadow = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(70,98,122,0.30)');
  grd.addColorStop(0.35, 'rgba(90,120,145,0.14)');
  grd.addColorStop(1, 'rgba(120,150,170,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.scale.set(size.x * 0.95, size.z * 0.9, 1);
  sh.position.set(center.x, box.min.y - 0.06, center.z);
  sh.renderOrder = 1;
  scene.add(sh);
  return sh;
})();

// ---------- 카메라: 하트 정면에 고정 ----------
const target = center.clone().add(new THREE.Vector3(0, -0.04, 0));
function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dW = size.x / TUNE.fitWidth / (2 * t * camera.aspect);
  const dH = (size.y + 0.12) / TUNE.fitHeight / (2 * t);
  const dist = Math.max(dW, dH) + size.z * 0.5;
  const pol = Number(params.get('pol') || 0);
  camera.position.copy(target).add(new THREE.Vector3(0, Math.sin(pol) * dist, Math.cos(pol) * dist));
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}
new ResizeObserver(fit).observe(stage);
fit();

// ---------- 움직임 ----------
// 하트: 목표 각도(정지 흔들림 + 드래그)를 임계감쇠 스프링으로 따라간다 → 부드럽게 기울고 튕기지 않는다.
// 내용물: 하트 각도를 약간 덜 감쇠된 느린 스프링으로 따라가, 늦게 반응했다가 한 번 살짝 넘치고 자리를 잡는다.
const baseYaw = Number(params.get('az') || 0);
const drag = { active: false, id: -1, x0: 0, y0: 0, yaw0: 0, pitch0: 0, yaw: 0, pitch: 0 };
const heart = { yaw: baseYaw, pitch: 0, vy: 0, vp: 0 };
const inner = { yaw: baseYaw, pitch: 0, vy: 0, vp: 0 };
const el = renderer.domElement;
el.addEventListener('pointerdown', (e) => {
  if (drag.active) return;
  drag.active = true; drag.id = e.pointerId;
  drag.x0 = e.clientX; drag.y0 = e.clientY; drag.yaw0 = drag.yaw; drag.pitch0 = drag.pitch;
  el.setPointerCapture(e.pointerId);
});
el.addEventListener('pointermove', (e) => {
  if (!drag.active || e.pointerId !== drag.id) return;
  const s = 2.2 / Math.min(stage.clientWidth, 700);
  // 끝으로 갈수록 저항이 생기도록 tanh로 부드럽게 제한
  drag.yaw = TUNE.dragYawMax * Math.tanh((drag.yaw0 + (e.clientX - drag.x0) * s) / TUNE.dragYawMax);
  drag.pitch = TUNE.dragPitchMax * Math.tanh((drag.pitch0 + (e.clientY - drag.y0) * s * 0.6) / TUNE.dragPitchMax);
});
const release = (e) => { if (e.pointerId === drag.id) drag.active = false; };
el.addEventListener('pointerup', release);
el.addEventListener('pointercancel', release);

const spring = (s, key, vkey, goal, w, zeta, dt) => {
  const a = w * w * (goal - s[key]) - 2 * zeta * w * s[vkey];
  s[vkey] += a * dt; s[key] += s[vkey] * dt;
};
const idleOn = !CAPTURE || params.has('idle');
const clock = new THREE.Clock();
let time = 0;
const frameTimes = [];
const lagV = lagUniforms.uLag.value;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 1 / 30);
  time += dt;
  // 손을 떼면 기울기가 천천히 제자리로
  if (!drag.active) { const k = 1 - Math.exp(-dt * 1.6); drag.yaw -= drag.yaw * k; drag.pitch -= drag.pitch * k; }
  const T = Math.PI * 2;
  const idleYaw = idleOn ? TUNE.idleYaw * (0.75 * Math.sin(time * T / 13) + 0.25 * Math.sin(time * T / 7.3 + 1.3)) : 0;
  const idlePitch = idleOn ? TUNE.idlePitch * Math.sin(time * T / 17 + 0.6) : 0;
  // 반 스텝씩 두 번 적분해 낮은 프레임레이트에서도 안정적으로
  for (let i = 0; i < 2; i++) {
    const h = dt / 2;
    spring(heart, 'yaw', 'vy', baseYaw + idleYaw + drag.yaw, 6, 1, h);
    spring(heart, 'pitch', 'vp', idlePitch + drag.pitch, 6, 1, h);
    spring(inner, 'yaw', 'vy', heart.yaw, 4.2, 0.62, h);
    spring(inner, 'pitch', 'vp', heart.pitch, 4.2, 0.62, h);
  }
  pivot.rotation.set(heart.pitch, heart.yaw, 0, 'YXZ');
  pivot.position.y = center.y + (idleOn ? TUNE.idleBob * Math.sin(time * T / 9) : 0);
  // 하트 로컬 기준 '덜 돈 만큼'의 회전 벡터
  lagV.set(inner.pitch - heart.pitch, inner.yaw - heart.yaw, 0);
  if (lagV.length() > TUNE.lagMax) lagV.setLength(TUNE.lagMax);
  for (const m of letterMeshes) {
    P.subVectors(m.userData.rest, center);
    m.position.copy(m.userData.rest).addScaledVector(P.crossVectors(lagV, P), m.userData.lag);
  }

  const a = performance.now();
  renderer.render(scene, camera);
  frameTimes.push(performance.now() - a);
  if (frameTimes.length > 120) frameTimes.shift();
}
loop();

window.__heart = {
  quality: Q,
  layoutMs: Math.round(layoutMs),
  items: layout.items.length,
  removedInFrontOfLetters: layout.removed,
  letters: layout.letters.map((l) => l.ch + (l.front ? '*' : '')).join(''),
  byKind: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])),
  triangles: Math.round(instTris + tris(heartMesh.geometry)),
  drawCallsApprox: Object.keys(groups).length + layout.letters.length + 2,
  frameTimes,
  renderer,
  ready: true,
};
document.documentElement.dataset.ready = '1';
