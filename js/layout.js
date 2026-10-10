// 하트 안 내용물의 정지 배치를 만든다. (시뮬레이션 아님: 한 번 계산하고 끝)
// 위에서 하나씩 떨어뜨려 벽(SDF)과 이미 놓인 조각에 닿을 때까지 내리고, 옆으로 굴러 낮은 자리를 찾는다.
// 조각끼리는 opt.gap 만큼 떨어뜨려 쌓아, 빽빽하게 압축된 덩어리가 아니라 사이사이 틈과 깊이가 보이게 한다.
import * as THREE from 'three';

export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function parseSDF(buffer) {
  const h = new Float32Array(buffer, 0, 7);
  const [minX, minY, minZ, step] = h;
  const nx = h[4] | 0, ny = h[5] | 0, nz = h[6] | 0;
  const d = new Int8Array(buffer, 28, nx * ny * nz);
  const Q = 0.005;
  const at = (i, j, k) => d[i + nx * (j + ny * k)];
  // 안쪽 깊이(벽까지 거리, 안 +, 밖 -)를 삼선형 보간
  const depth = (x, y, z) => {
    const fx = (x - minX) / step, fy = (y - minY) / step, fz = (z - minZ) / step;
    if (fx < 0 || fy < 0 || fz < 0 || fx >= nx - 1 || fy >= ny - 1 || fz >= nz - 1) return -1;
    const i = fx | 0, j = fy | 0, k = fz | 0;
    const tx = fx - i, ty = fy - j, tz = fz - k;
    const c00 = at(i, j, k) * (1 - tx) + at(i + 1, j, k) * tx;
    const c10 = at(i, j + 1, k) * (1 - tx) + at(i + 1, j + 1, k) * tx;
    const c01 = at(i, j, k + 1) * (1 - tx) + at(i + 1, j, k + 1) * tx;
    const c11 = at(i, j + 1, k + 1) * (1 - tx) + at(i + 1, j + 1, k + 1) * tx;
    return ((c00 * (1 - ty) + c10 * ty) * (1 - tz) + (c01 * (1 - ty) + c11 * ty) * tz) * Q;
  };
  return { depth };
}

class Grid {
  constructor(cell) { this.cell = cell; this.map = new Map(); }
  key(i, j, k) { return (i + 512) * 1048576 + (j + 512) * 1024 + (k + 512); }
  add(s) {
    const c = this.cell;
    const kk = this.key(Math.floor(s.x / c), Math.floor(s.y / c), Math.floor(s.z / c));
    let a = this.map.get(kk); if (!a) this.map.set(kk, (a = []));
    a.push(s);
  }
  // 구(x,y,z,r)가 기존 구들과 겹치는지
  hits(x, y, z, r) {
    const c = this.cell;
    const i0 = Math.floor(x / c), j0 = Math.floor(y / c), k0 = Math.floor(z / c);
    for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) for (let k = k0 - 1; k <= k0 + 1; k++) {
      const a = this.map.get(this.key(i, j, k)); if (!a) continue;
      for (const s of a) {
        const dx = s.x - x, dy = s.y - y, dz = s.z - z, rr = s.r + r;
        if (dx * dx + dy * dy + dz * dz < rr * rr) return true;
      }
    }
    return false;
  }
}

/**
 * @param sdf      parseSDF 결과
 * @param kinds    [{ name, weight, r: [min,max] }]  (r = 충돌 반지름)
 * @param letters  [{ ch, colliders: Vector3[], radius, width, height }]
 * @param opt      { seed, wall, gap, fillY(x,z), letterY, frontLetters, bounds, dropY, maxItems, maxMisses }
 */
export function buildLayout(sdf, kinds, letters, opt) {
  const rnd = mulberry32(opt.seed);
  const W = opt.wall;
  const G = opt.gap * 0.5; // 각 조각이 자기 둘레에 갖는 여백
  const grid = new Grid(0.18);
  const { depth } = sdf;
  const fits = (x, y, z, r) => depth(x, y, z) >= W + r;
  const free = (x, y, z, r) => fits(x, y, z, r) && !grid.hits(x, y, z, r + G);

  const tmpV = new THREE.Vector3();
  const placedLetters = [];
  const clear = (L, x, y, z, q, pad) => L.colliders.every((c) => {
    tmpV.copy(c).applyQuaternion(q);
    return free(x + tmpV.x, y + tmpV.y, z + tmpV.z, L.radius + pad);
  });
  const commit = (idx, L, pos, q, front) => {
    for (const c of L.colliders) {
      tmpV.copy(c).applyQuaternion(q).add(pos);
      grid.add({ x: tmpV.x, y: tmpV.y, z: tmpV.z, r: L.radius * 1.5 + G });
    }
    placedLetters.push({ index: idx, ch: L.ch, position: pos, quaternion: q, front });
  };

  // ---- 1) 글자 ----
  // 몇 글자만 앞벽 가까이에 정면을 대충 보도록 놓고(발견되는 글자), 나머지는 알갱이 속 여기저기에 아무 방향으로 묻는다.
  // 앞 글자는 행을 이루지 않도록 높이·좌우를 넓게 흩고, 서로 일정 거리 이상 떨어뜨린다.
  const order = letters.map((_, i) => i).sort(() => rnd() - 0.5);
  const frontSet = new Set(order.slice(0, opt.frontLetters));
  const anchors = [];
  const tmpE = new THREE.Euler();
  for (const idx of order) {
    const L = letters[idx];
    const front = frontSet.has(idx);
    let done = false;
    for (let tries = 0; tries < 4000 && !done; tries++) {
      const relax = Math.max(0.6, 1 - Math.floor(tries / 400) * 0.08);
      const x = (rnd() * 2 - 1) * 0.72;
      const y = opt.letterY[0] + rnd() * (opt.letterY[1] - opt.letterY[0]);
      if (y > opt.fillY(x, 0.3) - (front ? 0.1 : 0.04)) continue;
      if (front) {
        // 서로 떨어뜨리고, 비슷한 높이에 둘이 나란히 서면 줄처럼 읽히므로 높이 차를 강제한다.
        if (anchors.some((a) => Math.hypot(a.x - x, a.y - y) < 0.34 * relax || (Math.abs(a.y - y) < 0.09 * relax && Math.abs(a.x - x) < 0.75))) continue;
        if (depth(x, y, 0) < 0.18 || depth(x - 0.14, y, 0) < 0.1 || depth(x + 0.14, y, 0) < 0.1) continue; // 실루엣 가장자리는 피한다
        tmpE.set(-0.05 + rnd() * 0.25, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.5);
        const q = new THREE.Quaternion().setFromEuler(tmpE);
        // 앞벽에 붙는 가장 앞쪽 z를 찾고, 조금 안쪽으로 물린다
        let z = null;
        for (let zz = 0.6; zz > -0.3; zz -= 0.006) if (clear(L, x, y, zz, q, L.radius * 0.6)) { z = zz; break; }
        if (z === null) continue;
        z -= 0.01 + rnd() * 0.04;
        anchors.push({ x, y });
        commit(idx, L, new THREE.Vector3(x, y, z), q, true);
      } else {
        const z = opt.bounds.min.z + rnd() * (opt.bounds.max.z - opt.bounds.min.z);
        tmpE.set(rnd() * 6.28, rnd() * 6.28, rnd() * 6.28);
        const q = new THREE.Quaternion().setFromEuler(tmpE);
        // 유리에 눌어붙어 파편처럼 보이지 않도록 벽에서 조금 띄운다
        if (!clear(L, x, y, z, q, 0.07)) continue;
        commit(idx, L, new THREE.Vector3(x, y, z), q, false);
      }
      done = true;
    }
  }

  // ---- 2) 알갱이: 떨어뜨려 쌓기 ----
  const total = kinds.reduce((s, k) => s + k.weight, 0);
  const pickKind = () => { let t = rnd() * total; for (const k of kinds) { if ((t -= k.weight) <= 0) return k; } return kinds[0]; };
  const items = [];
  const STEP = 0.008;
  let misses = 0;
  const b = opt.bounds;
  while (misses < opt.maxMisses && items.length < opt.maxItems) {
    const kind = pickKind();
    const r = kind.r[0] + Math.pow(rnd(), 1.4) * (kind.r[1] - kind.r[0]);
    let x = b.min.x + rnd() * (b.max.x - b.min.x);
    let z = b.min.z + rnd() * (b.max.z - b.min.z);
    let y = opt.dropY;
    if (!free(x, y, z, r)) { misses++; continue; }
    for (let it = 0; it < 400; it++) {
      if (free(x, y - STEP, z, r)) { y -= STEP; continue; }
      // 막히면 옆으로 굴러 내려갈 자리를 찾는다
      let best = null;
      for (let s = 0; s < 8; s++) {
        const a = rnd() * Math.PI * 2, m = r * (0.35 + rnd() * 0.5);
        const nx = x + Math.cos(a) * m, nz = z + Math.sin(a) * m, ny = y - STEP * (0.5 + rnd());
        if (free(nx, ny, nz, r) && (!best || ny < best[1])) best = [nx, ny, nz];
      }
      if (!best) break;
      [x, y, z] = best;
    }
    if (y + r * 0.35 > opt.fillY(x, z) + (rnd() < 0.08 ? 0.035 : 0)) { misses++; continue; }
    misses = 0;
    grid.add({ x, y, z, r: r + G });
    items.push({ kind: kind.name, x, y, z, r });
  }

  // ---- 3) 앞 글자 바로 앞을 가리는 알갱이는 걷어낸다 (가장자리는 일부 남겨 묻혀 있는 느낌) ----
  const keep = items.filter((it) => !placedLetters.some((L) => {
    if (!L.front) return false;
    const src = letters[L.index];
    // 글자 로컬 좌표로 옮겨 기울어진 글자 면 앞을 판정한다
    tmpV.set(it.x, it.y, it.z).sub(L.position).applyQuaternion(L.quaternion.clone().invert());
    const dx = tmpV.x / (src.width * 0.5 + it.r * 0.6);
    const dy = tmpV.y / (src.height * 0.5 + it.r * 0.6);
    const d2 = dx * dx + dy * dy;
    const inFront = tmpV.z > -it.r * 0.8;
    return d2 < 1.15 && inFront && !(d2 > 0.85 && rnd() < 0.35);
  }));

  return { items: keep, letters: placedLetters, removed: items.length - keep.length };
}
