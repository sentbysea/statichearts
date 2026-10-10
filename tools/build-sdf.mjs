// heart.glb 내부 공간의 부호 있는 거리장(SDF)을 굽는다.
// 원본 메시는 한 겹짜리 솔리드 셸이라 "안쪽 벽"이 없다. 이 SDF가 용기의 안쪽 공간을 정의하고,
// 브라우저의 배치 코드(js/layout.js)가 벽 두께 + 오브젝트 반지름만큼 떨어지도록 내용물을 쌓는다.
//
// 실행: three, three-mesh-bvh가 설치된 폴더에서
//   node build-sdf.mjs <heart.glb> <out.bin>
//
// 출력 형식 (little-endian):
//   Float32 x 7 : minX minY minZ step nx ny nz   (nx..nz는 정수지만 float로 저장)
//   Int8 x (nx*ny*nz) : 안쪽 깊이 / QUANT, 안쪽 +, 바깥 -  (x가 가장 빠르게 변함)
import fs from 'fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';

const [, , src, out] = process.argv;
const STEP = 0.025;
const QUANT = 0.005;
const PAD = 0.05;

const buf = fs.readFileSync(src);
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const gltf = await new Promise((res, rej) => new GLTFLoader().parse(ab, '', res, rej));
let mesh;
gltf.scene.traverse((o) => { if (o.isMesh) mesh = o; });
gltf.scene.updateMatrixWorld(true);
const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
geo.computeBoundingBox();
const bb = geo.boundingBox;
const bvh = new MeshBVH(geo);

const min = bb.min.clone().subScalar(PAD);
const nx = Math.ceil((bb.max.x - bb.min.x + 2 * PAD) / STEP) + 1;
const ny = Math.ceil((bb.max.y - bb.min.y + 2 * PAD) / STEP) + 1;
const nz = Math.ceil((bb.max.z - bb.min.z + 2 * PAD) / STEP) + 1;
const data = new Int8Array(nx * ny * nz);

// 부호: z 방향 기둥마다 앞/뒤 교차점 구간이 하나뿐인 것을 분석으로 확인했으므로 구간 안이면 내부.
const ray = new THREE.Ray();
const p = new THREE.Vector3();
const hit = { point: new THREE.Vector3(), distance: 0 };
for (let j = 0; j < ny; j++) {
  for (let i = 0; i < nx; i++) {
    const x = min.x + i * STEP, y = min.y + j * STEP;
    ray.origin.set(x, y, bb.max.z + 1);
    ray.direction.set(0, 0, -1);
    const hits = bvh.raycast(ray, THREE.DoubleSide).map((h) => h.point.z).sort((a, b) => b - a);
    const zf = hits.length >= 2 ? hits[0] : -Infinity;
    const zb = hits.length >= 2 ? hits[hits.length - 1] : Infinity;
    for (let k = 0; k < nz; k++) {
      const z = min.z + k * STEP;
      p.set(x, y, z);
      bvh.closestPointToPoint(p, hit);
      const inside = z < zf && z > zb;
      const d = (inside ? 1 : -1) * hit.distance;
      data[i + nx * (j + ny * k)] = Math.max(-127, Math.min(127, Math.round(d / QUANT)));
    }
  }
}

const header = new Float32Array([min.x, min.y, min.z, STEP, nx, ny, nz]);
fs.writeFileSync(out, Buffer.concat([Buffer.from(header.buffer), Buffer.from(data.buffer)]));
console.log('sdf', nx, ny, nz, 'bytes', 28 + data.length, 'bbox', bb.min.toArray(), bb.max.toArray());
