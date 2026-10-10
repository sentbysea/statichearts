// 배경 선: 타이포가 왼쪽에 몰려 있으니 오른쪽 가장자리에 가는 실 한 가닥(크게 한 번 부풀고 작은 고리 하나)과
// 왼쪽 아래 모서리를 스치는 호로 균형을 잡는다. 화면 크기에 맞춰 다시 그리고, 처음엔 천천히 그려진다.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('backdrop');

  // 레퍼런스 선(1200×1800)의 중심선을 따라 고르게 찍은 점. 오른쪽 위에서 내려와 왼쪽으로 크게 부풀고,
  // 작은 고리를 감은 뒤 왼쪽 아래로 빠진다. 화면에서는 좌우로 뒤집어 오른쪽 가장자리에 붙인다
  const REF = [
    [1186, 2], [1187, 42], [1184, 82], [1177, 121], [1167, 160], [1152, 197], [1134, 233], [1113, 266], [1088, 298], [1060, 327],
    [1030, 353], [997, 375], [962, 394], [925, 409], [886, 421], [847, 430], [808, 436], [768, 440], [728, 443], [688, 446],
    [648, 447], [608, 449], [568, 451], [529, 455], [489, 460], [450, 467], [411, 477], [373, 490], [336, 506], [301, 525],
    [267, 546], [235, 570], [205, 596], [177, 625], [151, 656], [128, 688], [109, 723], [93, 760], [82, 798], [76, 838],
    [76, 878], [83, 917], [97, 954], [118, 988], [145, 1018], [176, 1043], [210, 1064], [247, 1080], [285, 1091], [325, 1097],
    [365, 1100], [404, 1100], [444, 1096], [484, 1090], [523, 1083], [561, 1071], [594, 1048], [611, 1013], [601, 975], [566, 958],
    [526, 959], [488, 969], [450, 983], [414, 1000], [380, 1021], [347, 1044], [316, 1069], [287, 1096], [258, 1124], [231, 1153],
    [204, 1183], [178, 1214], [153, 1244], [127, 1275], [101, 1305], [74, 1335], [46, 1363], [17, 1391], [-20, 1426],
  ];

  // 점 목록 → 부드러운 곡선 (centripetal Catmull-Rom)
  function smooth(pts) {
    const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const dist = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-6;
    let d = `M${f(pts[0])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i], p2 = pts[i + 1];
      const p0 = pts[i - 1] || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
      const p3 = pts[i + 2] || [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
      const d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
      const c1 = [0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
      const c2 = [0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
      d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
    }
    return d;
  }

  function shapes(w, h) {
    // 오른쪽: 레퍼런스를 찌그러뜨리지 않고 그대로 키우고 줄여 오른쪽 위 모서리에 붙이되,
    // 일부는 화면 밖으로 밀어내 구석에만 걸치게 한다 (크게 부푼 부분은 오른쪽 밖으로 나갔다가 고리로 돌아온다)
    const k = Math.min(h / 1800, (w * (w > h ? 0.5 : 0.55)) / 1200) * 0.85;
    const x0 = w - 1200 * k * 0.8, y0 = -1800 * k * 0.1;
    const right = REF.map(([x, y]) => [x0 + (1200 - x) * k, y0 + y * k]);
    // 왼쪽 아래: 타원의 한 조각 (굽는 방향이 한 번도 바뀌지 않는 호)
    const s = Math.min(w, h), cx = -0.04 * s, cy = h + 0.03 * s, rx = 0.3 * s, ry = 0.15 * s;
    const left = [];
    for (let a = -100; a <= 5; a += 7.5) left.push([cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)]);
    return [right, left];
  }

  const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const lines = [0, 1].map(() => svg.appendChild(document.createElementNS(NS, 'path')));
  let drawn = false;
  function layout() {
    const w = innerWidth, h = innerHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    shapes(w, h).forEach((pts, i) => lines[i].setAttribute('d', smooth(pts)));
    if (drawn || !MOTION) return;
    drawn = true;
    // 인트로의 줄이 자리 잡을 즈음부터 천천히 그려진다
    lines.forEach((p, i) => {
      const L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }],
        { duration: i ? 1800 : 3200, delay: i ? 1500 : 900, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'backwards' })
        .finished.then(() => { p.style.strokeDasharray = ''; });
    });
  }
  layout();
  addEventListener('resize', layout);
})();
