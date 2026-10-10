// STATICHEARTS 글자 오브젝트.
// 폰트 대신 단선(모노라인) 중심선을 직접 정의해 가는 은선 참(charm)처럼 만든다.
// 높이 1 기준 좌표. 가로는 WIDE 배로 넓히고, 단면은 앞뒤로 눌러 얇은 판처럼 보이게 한다
// (둥근 관 단면이면 휘어진 금속 파이프처럼 읽힌다).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const WIDE = 1.16;
const DEPTH = 0.55; // 단면 앞뒤 두께 / 획 폭

const arc = (cx, cy, rx, ry, a0, a1, n = 28) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = THREE.MathUtils.degToRad(a0 + (a1 - a0) * (i / n));
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
  }
  return pts;
};

// 각 글자: { w: 가로폭, strokes: [{ pts, smooth }] }
const GLYPHS = {
  S: {
    w: 0.7,
    strokes: [{
      smooth: true,
      pts: [...arc(0.35, 0.748, 0.315, 0.252, 28, 270, 24), ...arc(0.35, 0.252, 0.35, 0.252, 90, -152, 26).slice(1)],
    }],
  },
  T: { w: 0.8, strokes: [{ pts: [[0, 1], [0.8, 1]] }, { pts: [[0.4, 1], [0.4, 0]] }] },
  A: {
    w: 0.9,
    strokes: [{ pts: [[0, 0], [0.45, 1], [0.9, 0]] }, { pts: [[0.15, 0.333], [0.75, 0.333]] }],
  },
  I: { w: 0, strokes: [{ pts: [[0, 0], [0, 1]] }] },
  C: { w: 0.9, strokes: [{ smooth: true, pts: arc(0.5, 0.5, 0.5, 0.5, 42, 318, 40) }] },
  H: { w: 0.78, strokes: [{ pts: [[0, 0], [0, 1]] }, { pts: [[0.78, 0], [0.78, 1]] }, { pts: [[0, 0.5], [0.78, 0.5]] }] },
  E: {
    w: 0.62,
    strokes: [{ pts: [[0.62, 1], [0, 1], [0, 0], [0.62, 0]] }, { pts: [[0, 0.5], [0.56, 0.5]] }],
  },
  R: {
    w: 0.72,
    strokes: [
      { pts: [[0, 0], [0, 1], [0.44, 1]] },
      { smooth: true, pts: arc(0.44, 0.75, 0.25, 0.25, 90, -90, 20) },
      { pts: [[0.44, 0.5], [0, 0.5]] },
      { pts: [[0.42, 0.5], [0.72, 0]] },
    ],
  },
};

export const WORD = 'STATICHEARTS'.split('');

// 글자 하나의 지오메트리와 충돌용 구 목록(글자 로컬, 중심 원점)을 만든다.
// height: 월드 높이, weight: 획 반지름(높이 대비 비율)
export function buildLetter(ch, { height = 0.2, weight = 0.034, radial = 10 } = {}) {
  const g = GLYPHS[ch];
  const r = weight; // 높이 1 기준
  const parts = [];
  const colliders = [];
  const w = g.w * WIDE;
  const ox = w / 2, oy = 0.5;
  const v3 = ([x, y]) => new THREE.Vector3(x * WIDE - ox, y - oy, 0);
  const sphere = (p) => {
    const s = new THREE.SphereGeometry(r, radial, Math.max(6, radial * 0.6 | 0));
    s.translate(p.x, p.y, p.z);
    parts.push(s);
  };

  for (const st of g.strokes) {
    const pts = st.pts.map(v3);
    if (st.smooth) {
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      parts.push(new THREE.TubeGeometry(curve, pts.length * 2, r, radial, false));
    } else {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const len = a.distanceTo(b);
        const cyl = new THREE.CylinderGeometry(r, r, len, radial, 1, true);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        cyl.applyQuaternion(q);
        const m = a.clone().add(b).multiplyScalar(0.5);
        cyl.translate(m.x, m.y, m.z);
        parts.push(cyl);
      }
      pts.forEach(sphere);
    }
    if (st.smooth) { sphere(pts[0]); sphere(pts[pts.length - 1]); }
    // 충돌 구: 획을 따라 촘촘히
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const n = Math.max(1, Math.ceil(a.distanceTo(b) / 0.06));
      for (let k = 0; k < n; k++) colliders.push(a.clone().lerp(b, k / n));
    }
    colliders.push(pts[pts.length - 1].clone());
  }

  // 병합을 위해 공통 속성만 남긴다.
  const merged = mergeGeometries(parts.map((p) => {
    for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'uv'].includes(k)) p.deleteAttribute(k);
    return p;
  }));
  merged.scale(height, height, height * DEPTH);
  return {
    geometry: merged,
    width: (w + 2 * r) * height,
    height: (1 + 2 * r) * height,
    radius: r * height,
    colliders: colliders.map((p) => p.multiplyScalar(height)),
  };
}
