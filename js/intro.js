// 인트로: 화면 위에서 줄 한 가닥이 일자로 툭 떨어지고, 끝까지 펴지는 순간의 반동으로 위로 튕기며
// Statichearts 필기체 모양으로 감겨 자리 잡는다(글씨는 위에서 아래로 읽히게 눕혀 놓았다). 실의 끝은 오디오 플러그다.
// 좌표는 1942×809 원본 필기체를 시계 방향으로 90° 돌린 것(x = 760 - 원본 y, y = 원본 x - 3).
// 실은 하나의 연속 경로(점 목록을 부드러운 곡선으로 잇는다)이고, 펜을 떼고 쓰는 짧은 획(t 가로획, S 삐침,
// a 안쪽, 하트 왼쪽 옆선)은 실에서 갈라져 나오는 것처럼 실 위에 따로 얹는다. i의 점은 구슬.
// 플러그를 끌어다(또는 플러그 탭 → 소켓 탭) 소켓에 꽂으면 음악이 나온다.
// 이전 글씨(Vibe ♡ Echo)는 archive/vibe-echo/ 에 보관.

const NS = 'http://www.w3.org/2000/svg';

const fmt = (p) => `${+p[0].toFixed(1)},${+p[1].toFixed(1)}`;
// 점 목록 → 부드러운 곡선 (centripetal Catmull-Rom: 점 간격이 고르지 않아도 넘치거나 꼬이지 않는다)
// 시작점의 M은 붙이지 않는다
function smooth(pts) {
  let d = '';
  const dist = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-6;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i], p2 = pts[i + 1];
    const p0 = pts[i - 1] || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
    const p3 = pts[i + 2] || [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
    const d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
    const c1 = [0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
    const c2 = [0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
    d += ` C${fmt(c1)} ${fmt(c2)} ${fmt(p2)}`;
  }
  return d;
}

// 실 경로: 원본 필기체의 획 중심선을 따라 뽑아 매끈하게 다듬은 점들
// (펜이 꺾이는 곳마다 구간을 나눈다, 구간끼리는 끝점을 공유. t 꼭대기·c 갈고리·하트 끝은 같은 길을 되짚어 내려온다)
const RUNS = [
  // S → t → a 바깥 고리
  [
    [339, 237], [337.3, 224.1], [334.8, 211.4], [331.7, 198.7], [328, 186.3], [323.9, 174], [319.3, 161.8], [314, 149.9],
    [308.4, 138.2], [302.2, 126.8], [295.5, 115.6], [287.8, 105.2], [278.8, 95.8], [269.1, 87.1], [257.6, 81.2], [244.8, 80.9],
    [234.8, 88.8], [229.7, 100.6], [228, 113.5], [227.9, 126.5], [228.5, 139.5], [230.2, 152.4], [232.7, 165.1], [235.9, 177.7],
    [239.7, 190.2], [243.9, 202.5], [248.6, 214.6], [253.8, 226.5], [259.4, 238.2], [265.4, 249.8], [272, 261], [279.2, 271.8],
    [287.2, 282], [296.4, 291.2], [306.8, 299], [318.6, 304.3], [331.4, 306.1], [344.3, 304.5], [355.9, 298.8], [365.7, 290.3],
    [374.1, 280.4], [381.7, 269.8], [388.5, 258.8], [395.3, 247.7], [403.2, 237.4], [414.6, 231.7], [427.2, 234.1], [438.4, 240.7],
    [448.6, 248.8], [457.9, 257.9], [467, 267.2], [475.6, 276.9], [483.8, 287], [491.6, 297.4], [499.2, 307.9], [506.5, 318.7],
    [513.4, 329.7], [519.9, 341], [526, 352.5], [531.7, 364.1], [536.9, 376], [541.4, 388.2], [545.2, 400.7], [547.9, 413.4],
    [549.9, 426.2], [550.4, 439.2], [548.2, 452], [541.4, 462.8], [529.1, 465.9], [516.6, 462.5], [505.2, 456.4], [494.2, 449.4],
    [483.4, 442.2], [472.7, 434.8], [461.9, 427.6], [451.2, 420.2], [440.4, 412.9], [429.7, 405.6], [418.9, 398.4], [408, 391.3],
    [397, 384.4], [386, 377.4], [375, 370.5], [363.9, 363.7], [352.9, 356.8], [341.1, 351.2], [329.3, 345.9], [317.4, 340.6],
    [305.2, 336], [292.9, 332], [280.2, 329.2], [267.3, 329], [255.6, 334.3], [251.4, 346.2], [255.1, 358.5], [261.4, 369.9],
    [269.1, 380.4], [277.2, 390.5], [285.6, 400.5], [293.8, 410.6], [302.5, 420.2], [311.9, 429.2], [320.6, 438.8], [328.8, 449],
    [335.5, 460], [339.8, 472.3], [339.8, 485.2], [339, 494],
  ],
  // a 기둥 → t 올라감
  [
    [339, 494], [327.1, 488.8], [314.7, 484.8], [302.1, 481.8], [289.2, 481.9], [279.4, 489.7], [278.5, 502.5], [282.7, 514.8],
    [289, 526.1], [296.5, 536.8], [304.5, 547], [313, 556.8], [321.9, 566.3], [331.3, 575.3], [340.2, 584.8], [348.5, 594.7],
    [358.5, 603], [369.2, 610.4], [380.3, 617.2], [391.5, 623.8], [402.7, 630.3], [414, 636.8], [425.1, 643.5], [436.2, 650.3],
    [447.4, 657], [458.6, 663.5], [469.9, 669.9], [481.1, 676.5], [492.3, 683.2], [499, 688],
  ],
  // t 내려옴 → i 올라감
  [
    [499, 688], [488.1, 680.9], [477, 674.2], [465.8, 667.5], [454.5, 661.1], [443.2, 654.7], [431.9, 648.3], [420.8, 641.5],
    [409.7, 634.8], [398.5, 628.2], [387.4, 621.5], [376.2, 614.7], [365.2, 607.9], [354.4, 600.7], [342.5, 595.6], [330, 591.8],
    [317.9, 587.2], [305.6, 582.9], [293.2, 579], [280.5, 576.4], [267.5, 576.6], [256.3, 582.6], [252.5, 594.7], [256, 607.1],
    [262.2, 618.6], [269.5, 629.3], [277.7, 639.4], [286.3, 649.2], [295.4, 658.4], [304.6, 667.6], [313.7, 676.8], [322.7, 686.2],
    [332.1, 695.2], [344, 704],
  ],
  // i 내려옴 → c 위 갈고리 끝
  [
    [344, 704], [333.3, 696.6], [321.6, 691], [309.4, 686.4], [296.9, 683], [284.2, 684.2], [275, 693], [273.4, 705.8],
    [276.3, 718.4], [281.4, 730.3], [287.3, 741.9], [293.9, 753.1], [300.9, 764.1], [308.2, 774.9], [315.6, 785.5], [323.8, 795.6],
    [333.5, 804.2], [343, 813.1], [352, 822.5], [359.5, 833.1], [364.4, 845.1], [363.6, 857.7], [352.5, 863.5], [336, 859],
  ],
  // c 갈고리 되돌아 → c → h 고리 꼭대기
  [
    [336, 859], [348.3, 863.2], [360.7, 860.9], [365.2, 849.4], [361.5, 837], [354.7, 825.9], [346.1, 816.2], [336.8, 807.2],
    [326.7, 798.9], [316.1, 791.4], [304.7, 785.2], [292.7, 780.1], [280.3, 776.4], [267.4, 775.4], [255, 779.1], [245.8, 788.1],
    [242.2, 800.4], [242.9, 813.3], [246.7, 825.8], [251.7, 837.8], [257.8, 849.2], [264.6, 860.3], [271.8, 871.1], [279.4, 881.7],
    [287.3, 892], [295.4, 902.1], [303.8, 912.1], [312.3, 922], [320.9, 931.7], [329.5, 941.5], [338.1, 951.2], [347.3, 960.3],
    [357.9, 967.9], [366.4, 977.7], [374.8, 987.6], [384.3, 996.4], [393.6, 1005.6], [402.8, 1014.8], [412, 1023.9], [421.6, 1032.6],
    [431.4, 1041.2], [441.3, 1049.6], [451.3, 1057.9], [461.4, 1066.1], [471.9, 1073.8], [482.5, 1081.4], [493.3, 1088.5], [504.3, 1095.5],
    [515.6, 1101.9], [527.2, 1107.7], [539.3, 1112.4], [553, 1115],
  ],
  // h 고리 → h 기둥 끝
  [
    [553, 1115], [564.9, 1112], [564.9, 1099.6], [558, 1088.6], [549.1, 1079.1], [539.5, 1070.4], [529.6, 1061.9], [519.4, 1053.9],
    [508.8, 1046.3], [498, 1039], [487.2, 1031.9], [476.1, 1025.1], [464.9, 1018.5], [453.6, 1012.1], [442.2, 1005.9], [430.6, 1000],
    [419.1, 993.9], [407.3, 988.4], [395.6, 982.8], [383.7, 977.6], [371.6, 972.8], [359.6, 967.9], [348.2, 961.5], [336.4, 956.1],
    [324.4, 951.3], [312.4, 946.3], [300.2, 941.6], [288, 937.2], [275.4, 933.9], [263, 930.1], [251.2, 924.6], [246, 923],
  ],
  // h 어깨 → e → 하트 들어가는 곳
  [
    [246, 923], [258, 927.7], [268.7, 935], [278.7, 943.4], [288.9, 951.5], [299.2, 959.4], [309, 967.9], [318.5, 976.8],
    [327.2, 986.5], [335.2, 996.7], [341, 1008.3], [339.5, 1020.5], [327.3, 1023.9], [314.3, 1023.2], [301.3, 1023.2], [288.6, 1026],
    [278.2, 1033.4], [272.7, 1045.1], [272.1, 1058], [274.2, 1070.8], [278.4, 1083.1], [283.4, 1095.1], [289.3, 1106.7], [296, 1117.9],
    [302.7, 1129], [309.5, 1140], [317.3, 1150.5], [325.7, 1160.4], [334.9, 1169.5], [345.2, 1177.5], [357.3, 1180.9], [361, 1170.1],
    [354.5, 1158.9], [345.5, 1149.5], [335.9, 1140.8], [325.2, 1133.4], [313.4, 1127.9], [300.9, 1124.7], [288.2, 1121.7], [275.5, 1122.4],
    [266.6, 1131.6], [264.5, 1144.3], [266.2, 1157.2], [270.5, 1169.5], [275.9, 1181.3], [282.2, 1192.7], [288.8, 1203.8], [295.7, 1214.9],
    [302.7, 1225.8], [310, 1239],
  ],
  // 하트 왼쪽 볼록 → 골
  [
    [310, 1239], [322.9, 1240.4], [335.9, 1240.4], [348.3, 1244.2], [357.5, 1253.1], [358, 1265.7], [349.7, 1275.5], [337.7, 1280.3],
    [331, 1282],
  ],
  // 하트 골 → 오른쪽 볼록 → 하트 끝
  [
    [331, 1282], [341, 1290.3], [350.8, 1298.8], [359.6, 1308.4], [367, 1319], [372.3, 1330.9], [373.1, 1343.7], [364.2, 1352.2],
    [351.4, 1351.3], [339.7, 1345.7], [328.9, 1338.5], [318.6, 1330.5], [308.8, 1322], [299.2, 1313.2], [290, 1304], [280.6, 1295],
    [271.2, 1286.1], [262.1, 1276.8], [253, 1267],
  ],
  // 하트 끝 → 오른쪽 옆선 되짚기
  [
    [253, 1267], [261.9, 1276.5], [271.1, 1285.6], [279, 1296],
  ],
  // 하트에서 나와 → r 꼭대기
  [
    [279, 1296], [273.7, 1307.8], [272.1, 1320.7], [272.2, 1333.7], [274.1, 1346.5], [278, 1358.9], [283.4, 1370.8], [289.8, 1382.1],
    [297.1, 1392.8], [305.3, 1402.9], [314.3, 1412.3], [323.7, 1421.3], [333.6, 1429.6], [344.7, 1436.4], [360, 1445],
  ],
  // r → t 꼭대기
  [
    [360, 1445], [347.8, 1447.6], [336.8, 1454.4], [324.5, 1457.9], [311.8, 1455.5], [299.9, 1450.3], [287.8, 1445.4], [275.1, 1443.2],
    [262.8, 1446.6], [258.2, 1458.3], [260.6, 1471], [266.3, 1482.6], [273.4, 1493.5], [281.1, 1504], [289.7, 1513.7], [298.9, 1522.9],
    [308.2, 1532], [318.1, 1540.5], [328.2, 1548.6], [338.2, 1557], [347.8, 1565.7], [358.6, 1572.9], [369.8, 1579.4], [381.3, 1585.6],
    [392.8, 1591.6], [404.2, 1597.9], [415.5, 1604.2], [426.8, 1610.7], [438, 1617.2], [449.3, 1623.7], [460.7, 1630], [472, 1636.4],
    [483.3, 1642.9], [494.5, 1649.4], [507, 1657],
  ],
  // t 내려옴 → s 꼭대기
  [
    [507, 1657], [495.8, 1650.4], [484.7, 1643.7], [473.4, 1637.2], [462.1, 1630.8], [450.7, 1624.5], [439.5, 1618], [428.1, 1611.6],
    [416.8, 1605.3], [405.4, 1599], [394, 1592.7], [382.6, 1586.5], [371.2, 1580.3], [359.9, 1573.9], [348.3, 1568], [335.8, 1564.6],
    [323.3, 1561], [310.7, 1557.6], [298, 1555.1], [285, 1554.1], [272.2, 1556.1], [262, 1563.6], [259.1, 1576.1], [261.7, 1588.8],
    [267.4, 1600.4], [274.2, 1611.6], [281.7, 1622.2], [289.7, 1632.4], [298, 1642.4], [306.6, 1652.1], [315.5, 1661.6], [324.2, 1671.3],
    [332.9, 1680.9], [342, 1690.2], [350.8, 1699.8], [359.4, 1709.5], [367.9, 1719.4], [373, 1725],
  ],
  // s → 끝
  [
    [373, 1725], [360.6, 1721.2], [347.8, 1720.5], [335.7, 1725.3], [323.5, 1729.6], [310.6, 1731.2], [297.6, 1732.4], [284.7, 1731.9],
    [272, 1729.1], [260.3, 1723.6], [249.8, 1715.9], [241.1, 1706.2], [234.2, 1695.2], [231.4, 1682.7], [238.2, 1672.4], [250.9, 1673],
    [262.2, 1679.3], [271.9, 1687.9], [281.1, 1697.1], [289.8, 1706.8], [297.5, 1717.2], [304.4, 1728.2], [311.2, 1739.3], [317.7, 1750.6],
    [323.4, 1762.2], [328.7, 1774.1], [333.6, 1786.2], [337.8, 1798.5], [341.8, 1810.8], [345.1, 1823.4], [347.5, 1836.2], [349, 1851],
  ],
];
const START = RUNS[0][0];
const LAST = RUNS[RUNS.length - 1];
const END = LAST[LAST.length - 1];
const END_DIR = (() => {
  const p = LAST[LAST.length - 2], n = Math.hypot(END[0] - p[0], END[1] - p[1]);
  return [(END[0] - p[0]) / n, (END[1] - p[1]) / n];
})();

// 실에서 갈라져 나오는 짧은 획 (첫 점이 실 위에 있다)
const ACCENTS = [
  // S 아래 짧은 삐침
  [
    [359, 361], [350.1, 351.5], [342.4, 341.1], [333.9, 331.2], [329, 326],
  ],
  // a 안쪽 획 (고리 닫기)
  [
    [339, 494], [327.2, 488.5], [317, 480.5], [307.5, 471.6], [297.9, 462.9], [288.7, 453.7], [279.8, 444.2], [271.8, 434],
    [265.5, 422.6], [267.4, 410.5], [275, 408],
  ],
  // 첫 t 가로획 왼쪽
  [
    [427, 402], [425.2, 389.1], [423.1, 376.3], [420.5, 363.6], [417.8, 350.8], [414.9, 338.2], [413, 329],
  ],
  // 첫 t 가로획 오른쪽
  [
    [427, 402], [429.6, 414.7], [431.8, 427.5], [433.9, 440.4], [435.7, 453.3], [437.3, 466.2], [438.6, 479.1], [439.7, 492],
    [440.2, 505], [440, 511],
  ],
  // 둘째 t 가로획 왼쪽
  [
    [432, 646], [431, 633], [429, 620.2], [426.7, 607.4], [424.3, 594.6], [421.6, 581.9], [420, 575],
  ],
  // 둘째 t 가로획 오른쪽
  [
    [432, 646], [434.8, 658.7], [436.8, 671.5], [438.4, 684.4], [439.8, 697.4], [441, 710.3], [442.1, 723.3], [443.2, 736.2],
    [444.2, 749.2], [445, 762.1], [445.8, 775.1], [445, 785],
  ],
  // 마지막 t 가로획 왼쪽
  [
    [441, 1618], [439.8, 1605.1], [437.8, 1592.2], [435.5, 1579.4], [433.1, 1566.6], [430.4, 1553.9], [428, 1544],
  ],
  // 마지막 t 가로획 오른쪽
  [
    [441, 1618], [443.3, 1630.8], [445.1, 1643.7], [446.6, 1656.6], [448.1, 1669.5], [449.3, 1682.4], [450.4, 1695.4], [451.4, 1708.4],
    [452.3, 1721.3], [453, 1734.3], [453, 1745],
  ],
  // 하트 왼쪽 옆선
  [
    [253, 1267], [265.9, 1265.1], [278, 1260.6], [289.3, 1254.2], [300.5, 1247.5], [310, 1239],
  ],
];
const BEAD = { x: 400, y: 730, rx: 11, ry: 1, rot: 39 };   // i의 점: 짧게 비스듬한 획 모양의 구슬

// 버튼으로 쓰는 색 덩어리: 고리 안쪽을 수채화처럼 칠하되, 선과 살짝 어긋나게 안으로 줄이고 비껴 놓는다.
// pts: 고리를 이루는 실의 점들(닫힌 모양), colors: 그러데이션 [시작, 끝]. 누르면 옆에 미니 탭이 열린다
const BLOBS = [
  { // a의 고리: 바깥 획 + 안쪽 획
    pts: [...RUNS[0].slice(98), ...ACCENTS[1].slice(1)],
    colors: ['#b3c2cb', '#e3e9ed'], title: 'ABOUT', body: '여기에 소개 내용을 넣어주세요.',
  },
  { // 하트: 왼쪽 볼록 + 오른쪽 볼록 + 왼쪽 옆선
    pts: [...RUNS[7], ...RUNS[8].slice(1), ...ACCENTS[8].slice(1)],
    colors: ['#b3c2cb', '#e3e9ed'], title: 'HEART', body: '여기에 내용을 넣어주세요.',
  },
  { // s의 아래 고리: 꼬리가 자기 몸을 지나는 곳에서 한 바퀴
    pts: RUNS[13].slice(5, 23),
    colors: ['#b3c2cb', '#e3e9ed'], title: 'CONTACT', body: '여기에 연락처를 넣어주세요.',
  },
];
const BLOB_SHRINK = 0.84, BLOB_SHIFT = [-5, -7];   // 고리보다 얼마나 작게, 어느 쪽으로 비껴 칠할지

// 플러그: 케이블이 들어가는 쪽이 원점, a는 핀이 향하는 방향(도, 0=오른쪽 90=아래)
const PS = 2.5;                                     // 플러그·소켓 그림 배율 (선 굵기에 맞춤)
const PLUG_LEN = 44 * PS;                         // 원점에서 핀 끝까지
const REST = { x: 330, y: 2062, a: 90 };          // 실 끝에서 아래로 매달린 자리         // 케이블이 한 번 늘어졌다가 바닥에 누운 자리
const SOCKET = { x: 330, y: 2382, r: 11 * PS, a: 90 };   // a: 플러그가 들어가는 방향 (매달린 플러그 바로 아래에서 위로 받는다)
const SEAT = 42 * PS;                             // 꽂혔을 때 소켓 중심에서 플러그 원점까지

// 그림이 차지하는 영역 (여백 포함, 플러그와 소켓까지)
const BOX = { x: 130, y: 40, w: 520, h: 2400 };
const SIZE = 0.7;        // 화면에 꽉 맞춘 크기 대비 실제 크기
const anchorX = () => 0.2;   // 그림 중심을 화면 폭의 어디에 둘지 (작을수록 왼쪽)
const ANCHOR_Y = 0.45;        // 그림 중심을 화면 높이의 어디에 둘지 (작을수록 위)
// 일자로 떨어짐 → 중력대로 몇 번 튕기며 잦아듦 → 그동안 위에서부터 차례로 풀리며 글자가 됨 (ms)
const FALL = 620, SETTLE = 1200;
const TOTAL = FALL + SETTLE;

const root = document.getElementById('intro');
const svg = document.createElementNS(NS, 'svg');
root.appendChild(svg);

const el = (tag, attrs, parent = svg) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent.appendChild(n);
  return n;
};

const defs = el('defs', {});
const metal = el('linearGradient', { id: 'plug-metal', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
[[0, '#7d858d'], [0.38, '#eef1f3'], [0.62, '#c3c9ce'], [1, '#6a7178']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, metal));
// 공간감: 왼쪽 위에서 빛이 드는 것처럼 선 오른쪽 아래로 작고 부드러운 그림자
// (일자 줄처럼 가는 모양에서도 잘리지 않게 그림자 영역은 화면 좌표로 넉넉히)
const shadow = el('filter', { id: 'soft-shadow', filterUnits: 'userSpaceOnUse', x: -3000, y: -6000, width: 7000, height: 14000 }, defs);
el('feDropShadow', { dx: 7, dy: 12, stdDeviation: 5, 'flood-color': '#1d2126', 'flood-opacity': 0.17 }, shadow);
const SHADOW = { filter: 'url(#soft-shadow)' };

// 색 덩어리: 고리의 점들을 중심 쪽으로 줄이고 비껴서 닫힌 곡선으로 칠한다 (글자 뒤에 깐다)
BLOBS.forEach((bl, i) => {
  const n = bl.pts.length;
  const c = bl.pts.reduce((m, q) => [m[0] + q[0] / n, m[1] + q[1] / n], [0, 0]);
  const pts = bl.pts.map(([x, y]) => [c[0] + (x - c[0]) * BLOB_SHRINK + BLOB_SHIFT[0], c[1] + (y - c[1]) * BLOB_SHRINK + BLOB_SHIFT[1]]);
  const g = el('linearGradient', { id: `blob-${i}`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  bl.colors.forEach((col, k) => el('stop', { offset: k, 'stop-color': col }, g));
  const loop = [...pts.slice(-2), ...pts, ...pts.slice(0, 2)];   // 닫힌 곡선: 앞뒤로 점을 겹쳐 이음매를 매끈하게
  const d = `M${fmt(pts[0])}${smooth(loop).split(' C').slice(3, n + 3).map((seg) => ` C${seg}`).join('')}Z`;
  bl.node = el('path', { class: 'blob', d, fill: `url(#blob-${i})`, role: 'button', 'aria-label': bl.title, 'aria-expanded': 'false' });
});
const SPOTS = BLOBS;
const lead = el('path', { class: 'thread', ...SHADOW });     // 화면 위에서 내려오는 줄
const art = el('g', { ...SHADOW });                          // 글자 전체 (실·되돌림 획·구슬)
const thread = el('path', { class: 'thread' }, art);
const accents = ACCENTS.map((pts) => ({
  node: el('path', { class: 'accent', d: `M${fmt(pts[0])}${smooth(pts)}` }, art),
  at: pts[0],
  len: 0,
}));
// 회전은 바깥 그룹에 둔다 (구슬 자체의 CSS 확대 기준점과 섞이지 않게)
const bead = {
  node: el('ellipse', { class: 'bead', cx: BEAD.x, cy: BEAD.y, rx: BEAD.rx, ry: BEAD.ry },
    el('g', { transform: `rotate(${BEAD.rot} ${BEAD.x} ${BEAD.y})` }, art)),
  len: 0,
};
const pulse = el('path', { class: 'pulse' }, art);
const cable = el('path', { class: 'cable', ...SHADOW });

// 소켓: 절제된 원 하나와 구멍
const socket = el('g', { class: 'socket', transform: `translate(${SOCKET.x} ${SOCKET.y}) scale(${PS})`, 'aria-label': '소켓' });
el('circle', { class: 'ring', r: 11 }, socket);
el('circle', { class: 'hole', r: 3.4 }, socket);

// 플러그 (아래쪽을 향하게 그리고 transform으로 돌린다)
const plug = el('g', { class: 'plug', ...SHADOW, role: 'button', tabindex: '0', 'aria-label': '플러그를 소켓에 꽂기', 'aria-pressed': 'false' });
el('path', { class: 'boot', d: 'M-2.7,0 L2.7,0 L3.7,13.5 L-3.7,13.5 Z' }, plug);
el('path', { class: 'groove', d: 'M-3,4.5 L3,4.5 M-3.3,9 L3.3,9' }, plug);
el('rect', { class: 'metal', x: -4.2, y: 13.5, width: 8.4, height: 16.5, rx: 1.1 }, plug);
el('rect', { class: 'band', x: -4.2, y: 13.5, width: 8.4, height: 2 }, plug);
el('path', { class: 'metal', d: 'M-1.8,30 L1.8,30 L1.8,41.6 Q1.8,44 0,44 Q-1.8,44 -1.8,41.6 Z' }, plug);
el('rect', { class: 'band', x: -1.85, y: 34.4, width: 3.7, height: 0.9 }, plug);
el('rect', { class: 'band', x: -1.85, y: 38.6, width: 3.7, height: 0.9 }, plug);

let threadLen = 1, ppu = 1;
const pose = { ...REST, s: 1 };
const BODY = `M${fmt(START)}${RUNS.map(smooth).join('')}`;
thread.setAttribute('d', BODY);
pulse.setAttribute('d', BODY);
let hang = [0, 0], leadLen = 1, drop = 0;   // 줄이 매달린 화면 위 지점, 팽팽할 때 줄 길이, 떨어지는 거리
let strands = [];          // 일자 줄 ↔ 글자로 바뀌는 선들: 원래 경로, 그 위의 점, 각 점이 일자 줄에서 놓일 자리(0~1)
let beadAt = 0;            // i 구슬이 일자 줄에서 놓일 자리
const LINE = REST.y - START[1];   // 일자 줄의 길이 (실 시작 ~ 플러그 자리)

// 화면비에 맞춰 viewBox를 정한다(그림은 중앙보다 왼쪽). 줄은 화면 위 가장자리 바깥에 매달려 있다.
function layout() {
  const W = innerWidth, H = innerHeight;
  const s = Math.min((W * 0.86) / BOX.w, (H * 0.9) / BOX.h) * SIZE;
  ppu = s;
  // 배경 선(js/backdrop.js)이 실과 같은 굵기로 보이도록 화면 기준 굵기를 알려 준다
  document.documentElement.style.setProperty('--thread-px', `${(9 * s).toFixed(2)}px`);
  const vw = W / s, vh = H / s;
  const vx = BOX.x + BOX.w / 2 - vw * anchorX();
  // 오른쪽 신호 패널이 좁은 화면에서 글자와 겹치지 않게 글자 오른쪽 끝(화면 px)을 알려 준다
  document.documentElement.style.setProperty('--type-right', `${((TYPE_RIGHT - vx) * s).toFixed(1)}px`);
  const vy = BOX.y + BOX.h / 2 - vh * ANCHOR_Y;
  svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  hang = [START[0] - 70, vy - 30];
  leadLen = Math.hypot(START[0] - hang[0], START[1] - hang[1]);
  drop = REST.y - vy + 260;   // 처음엔 일자 줄 전체가 화면 위에 숨어 있도록
  threadLen = thread.getTotalLength();

  // 실을 촘촘히 점으로 바꾸고, 각 점이 실 전체 길이의 어디쯤인지(= 일자 줄에서의 자리)를 잰다
  const sample = (node) => {
    const L = node.getTotalLength(), k = Math.max(6, Math.ceil(L / 5)), pts = [];
    for (let i = 0; i <= k; i++) { const q = node.getPointAtLength((L * i) / k); pts.push([q.x, q.y]); }
    return { L, pts };
  };
  thread.setAttribute('d', BODY);   // 애니메이션 도중에 다시 재도 원래 모양에서 잰다
  const body = sample(thread);
  const at = ([x, y]) => {
    let best = Infinity, j = 0;
    body.pts.forEach(([px, py], i) => { const d = (px - x) ** 2 + (py - y) ** 2; if (d < best) { best = d; j = i; } });
    return j / (body.pts.length - 1);
  };
  strands = [{ node: thread, d: BODY, pts: body.pts, fs: body.pts.map((_, i) => i / (body.pts.length - 1)) }];
  for (const a of accents) {
    const d = a.node.dataset.d || a.node.getAttribute('d');
    a.node.dataset.d = d;
    a.node.setAttribute('d', d);
    const sm = sample(a.node), f0 = at(sm.pts[0]);
    // 되돌림 획은 일자 줄 위, 자기가 갈라져 나오는 자리 근처에 포개져 있다가 펼쳐진다
    strands.push({ node: a.node, d, pts: sm.pts, fs: sm.pts.map((_, i) => f0 + (i / (sm.pts.length - 1)) * (sm.L / body.L) * 0.3) });
  }
  beadAt = at([BEAD.x, BEAD.y]);
}

// 줄: 끝이 향하는 방향(dir)으로 들어간다. 팽팽하지 않으면 남는 길이만큼 옆으로 휘어 늘어진다
const START_DIR = (() => {
  const nx = RUNS[0][1][0] - START[0], ny = RUNS[0][1][1] - START[1], n = Math.hypot(nx, ny);
  return [nx / n, ny / n];
})();
function leadPath(a, dir = START_DIR) {
  const d = Math.hypot(a[0] - hang[0], a[1] - hang[1]);
  const bulge = Math.min(140, Math.sqrt(Math.max(0, leadLen - d) * leadLen) * 0.45);
  const k = Math.min(70, d * 0.4);
  return `M${fmt(hang)} C${fmt([hang[0] - 6 + bulge, hang[1] + (a[1] - hang[1]) * 0.45])} ${fmt([a[0] - dir[0] * k - bulge * 0.4, a[1] - dir[1] * k])} ${fmt(a)}`;
}

// 실 끝에서 플러그까지의 케이블: 실이 나가는 방향으로 내려가다가 플러그 뒤쪽으로 부드럽게 들어간다
function cablePath(p, from = END, dir = END_DIR) {
  const r = (p.a * Math.PI) / 180, dx = Math.cos(r), dy = Math.sin(r);
  const dist = Math.hypot(p.x - from[0], p.y - from[1]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const k1 = clamp(dist * 0.45, 20, 170), k2 = clamp(dist * 0.45, 20, 170), sag = clamp(dist * 0.12, 0, 50);
  return `M${fmt(from)} C${fmt([from[0] + dir[0] * k1, from[1] + dir[1] * k1 + sag])} ` +
    `${fmt([p.x - dx * k2, p.y - dy * k2 + sag * 0.5])} ${fmt([p.x, p.y])}`;
}

// 시각 t(ms)에서, 일자 줄 위 자리 f의 점이
//   off(f): 원래 자리에서 얼마나 밀려나 있는지 [dx, dy]
//   u(f):   글자로 얼마나 감겼는지 (0 일자 → 1 글자)
const LAG = 60;   // 튕기는 움직임이 실 위쪽에서 맨 아래까지 전해지는 데 걸리는 시간 (ms)
function motion(t) {
  if (t < FALL) {
    const k = t / FALL, dy = -drop * (1 - k * k);       // 중력: 등가속으로 떨어진다
    return { off: () => [0, dy], u: () => 0 };
  }
  const x = (t - FALL) / 1000;
  const fade = Math.exp(-x / 0.3);                      // 흔들림은 튕김과 함께 잦아든다
  const clamp01 = (f) => Math.min(1, Math.max(0, f));
  return {
    // 위쪽이 먼저 튕기고 아래쪽은 조금 늦게 따라와서, 튕길 때마다 글자가 위아래로 늘었다 줄었다 한다.
    // 충격에 매달린 줄 전체가 좌우로도 살짝 흔들린다 (매달린 위쪽은 덜, 아래쪽은 더)
    off: (f) => {
      f = clamp01(f);
      const dx = 16 * fade * Math.sin((2 * Math.PI * x) / 0.46 - f * 1.4) * (0.25 + f);
      return [dx, bounce(Math.max(0, t - FALL - f * LAG))];
    },
    // 첫 번째로 튕겨 오르는 동안 위쪽부터 아래로 차례로 감겨 글자가 된다.
    // 다 감긴 뒤에도 흔들리는 동안엔 곳곳이 조금씩 풀렸다 조였다 하다가 마지막에 제 모양으로 굳는다
    u: (f) => {
      const s = x - clamp01(f) * 0.15;
      if (s <= 0) return 0;
      const base = 1 - (1 + 13 * s) * Math.exp(-13 * s);
      return base * (1 - 0.1 * fade * (0.5 + 0.5 * Math.sin((2 * Math.PI * x) / 0.3 + f * 5)));
    },
  };
}
// 떨어진 속도 그대로 튕겨 올랐다가 같은 중력으로 포물선을 그리며 내려온다. 부딪칠 때마다 속도를 잃어 점점 낮게, 짧게.
// 줄은 탄성이 있어서 부딪치는 순간 꺾여 튀지 않고, 잠깐 아래로 늘어났다가 그 힘으로 되튀어 오른다.
const BOUNCE = 0.3;   // 반발 계수: 튕겨 오르는 속도 / 떨어지는 속도
const STRETCH = 32;   // 줄이 늘어났다 되돌아오는 시간의 기준 (ms)
const HOPS = 2;       // 튕겨 오르는 횟수. 마지막으로 떨어질 땐 늘어났다가 튀지 않고 그대로 자리 잡는다
function bounce(x) {
  const g = (2 * drop) / (FALL * FALL);
  let v = g * FALL;
  for (let hop = 0; ; hop++) {
    const A = (v * STRETCH) / Math.PI;                       // 들어온 속도만큼 늘어난다
    const down = STRETCH / 2, up = STRETCH / (2 * BOUNCE);   // 되돌아올 땐 잃은 속도만큼 천천히
    if (x < down) return A * Math.sin((Math.PI / 2) * (x / down));
    x -= down;
    if (hop === HOPS) return x < STRETCH * 2.5 ? A * 0.5 * (1 + Math.cos((Math.PI * x) / (STRETCH * 2.5))) : 0;
    if (x < up) return A * Math.cos((Math.PI / 2) * (x / up));
    x -= up;
    v *= BOUNCE;
    const dur = (2 * v) / g;
    if (x < dur) return -(v * x - 0.5 * g * x * x);
    x -= dur;
  }
}
// 일자 줄 위 자리 f(0~1)의 점
const lineAt = (f, dy) => [hang[0], START[1] + f * LINE + dy];
const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

let t0 = 0, done = false, shown = false, landed = false;

let cur = 0;
function draw(p) {
  cur = p;
  if (p >= 1) {
    for (const st of strands) st.node.setAttribute('d', st.d);
    bead.node.setAttribute('cx', BEAD.x);
    bead.node.setAttribute('cy', BEAD.y);
    bead.node.parentNode.setAttribute('transform', `rotate(${BEAD.rot} ${BEAD.x} ${BEAD.y})`);
    lead.setAttribute('d', leadPath(START));
    render();
    showPlug();
    return;
  }
  if (shown) signal('hidden');
  shown = false;
  socket.classList.remove('on');
  setSpots(false);
  const t = p * TOTAL, m = motion(t);
  // 일자 줄 위 자리 f의 점: 일자 줄 자리와 글자 자리(to) 사이 + 흔들림
  const at = (f, to) => {
    const [ox, oy] = m.off(f), l = lineAt(f, 0);
    return mix([l[0] + ox, l[1] + oy], [to[0] + ox, to[1] + oy], m.u(f));
  };
  for (const st of strands) {
    let d = '';
    for (let i = 0; i < st.pts.length; i++) d += (i ? 'L' : 'M') + fmt(at(st.fs[i], st.pts[i]));
    st.node.setAttribute('d', d);
  }
  const ub = m.u(beadAt), b = at(beadAt, [BEAD.x, BEAD.y]);
  bead.node.setAttribute('cx', b[0]);
  bead.node.setAttribute('cy', b[1]);
  bead.node.parentNode.setAttribute('transform', `rotate(${BEAD.rot * ub} ${b[0]} ${b[1]})`);
  // 줄 꼬리: 일자일 땐 수직으로, 감기면서 V의 첫 획 방향으로
  const s0 = at(0, START);
  const dir0 = mix([0, 1], START_DIR, m.u(0));
  lead.setAttribute('d', leadPath(s0, dir0));
  // 플러그는 실 끝에 매달려 함께 움직인다
  const u1 = m.u(1), e = at(1, END);
  const q = at(1, [REST.x, REST.y]).map((v, i) => v + (i ? 26 * (1 - u1) : 0));
  const dir = mix([0, 1], END_DIR, u1);
  Object.assign(pose, { x: q[0], y: q[1], a: REST.a, s: 1 });
  plug.setAttribute('transform', `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${(pose.a - 90).toFixed(2)}) scale(${PS})`);
  cable.setAttribute('d', cablePath(pose, e, dir));
  if (t >= FALL && !landed) { landed = true; if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) navigator.vibrate(8); }
  if (t < FALL) landed = false;
}

function introFrame(now) {
  if (done) return;
  if (!t0) t0 = now;
  const t = Math.min(1, (now - t0) / TOTAL);
  draw(t);
  if (t < 1) requestAnimationFrame(introFrame);
  else done = true;
}

// ---------- 플러그 ----------
const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;
const sound = window.StaticSound;
// 손가락 기준(px). 그림은 작아도 잡히는 영역과 스냅 거리는 넉넉하게
const R = {
  touch: { hit: 34, socket: 40, snap: 56, magnet: 88, spot: 24 },
  mouse: { hit: 18, socket: 22, snap: 44, magnet: 60, spot: 12 },
};

let state = 'rest';   // rest | armed | drag | moving | plugged
let press = null;     // 누르고 있는 포인터
let anim = null;      // 진행 중인 트윈
let socketTop = false;

const rad = (a) => (a * Math.PI) / 180;
const angDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;
const tipOf = (p) => [p.x + Math.cos(rad(p.a)) * PLUG_LEN, p.y + Math.sin(rad(p.a)) * PLUG_LEN];
const seatPose = (out = 0) => ({   // out: 입구에서 떨어진 거리 (플러그 그림 단위)
  x: SOCKET.x - Math.cos(rad(SOCKET.a)) * (SEAT + out * PS),
  y: SOCKET.y - Math.sin(rad(SOCKET.a)) * (SEAT + out * PS),
  a: SOCKET.a,
});
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t;
const easeBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
// 툭 떨어져 두 번 작게 튀고 멈춘다
const easeBounce = (t) => {
  if (t < 0.6) return (t / 0.6) ** 2;
  if (t < 0.85) { const u = (t - 0.725) / 0.125; return 1 - 0.07 * (1 - u * u); }
  const u = (t - 0.925) / 0.075;
  return 1 - 0.018 * (1 - u * u);
};
// 느긋한 스프링: 한 번 지나쳤다가 작게 되돌아오며 멈춘다
const easeSpring = (t) => (t >= 1 ? 1 : 1 - Math.exp(-5.2 * t) * Math.cos(8.5 * t));
// 놓았을 때: 처음엔 천천히 출발해(속도 0에서 시작) 제자리를 한 번 지나쳤다 돌아온다
const easeReturn = (t) => (t >= 1 ? 1 : 1 - Math.exp(-4.2 * t) * (Math.cos(6 * t) + 0.7 * Math.sin(6 * t)));
// 멀리 당겼을수록 더 오래 걸려 돌아온다
const returnMs = () => dur(Math.min(2600, 1300 + Math.hypot(pose.x - REST.x, pose.y - REST.y) * ppu * 4));
const dur = (ms) => (MOTION ? ms : Math.min(ms, 80));

function render() {
  plug.setAttribute('transform', `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) rotate(${(pose.a - 90).toFixed(2)}) scale(${(pose.s * PS).toFixed(3)})`);
  if (cur >= 1) cable.setAttribute('d', cablePath(pose));
}

// 꽂혀 있을 땐 소켓을 플러그 위에 그려 핀이 구멍 속으로 사라지게 한다
function setSocketTop(top) {
  if (top === socketTop) return;
  socketTop = top;
  svg.insertBefore(top ? plug : socket, top ? socket : plug);
}

// keys: [{ to: {x,y,a,s 중 일부}, ms, ease, then }]
function animate(keys) {
  anim = { keys, i: 0, start: 0, from: { ...pose } };
  kick();
}
function stepAnim(now) {
  const a = anim, k = a.keys[a.i];
  if (!a.start) a.start = now;
  const f = Math.min(1, (now - a.start) / k.ms);
  const e = k.ease(f);
  for (const key of ['x', 'y', 's']) if (key in k.to) pose[key] = a.from[key] + (k.to[key] - a.from[key]) * e;
  if ('a' in k.to) pose.a = a.from.a + angDiff(k.to.a, a.from.a) * e;
  if (f < 1) return;
  a.i++;
  a.from = { ...pose };
  a.start = now;
  if (a.i >= a.keys.length) anim = null;
  if (k.then) k.then();
}

let raf = 0, last = 0, clock = 0;
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
function loop(now) {
  raf = 0;
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
  last = now;
  clock += dt;
  let busy = true;
  if (anim) stepAnim(now);
  else if (state === 'drag') follow(dt);
  else if (state === 'armed' && MOTION) pose.y = armedPose().y + Math.sin(clock * 4.2) * 1.4 * PS;
  else busy = false;
  // 끌어서 뺄 때: 핀이 구멍에서 나오는 순간 플러그를 다시 위로
  if (socketTop && state === 'drag') {
    const [tx, ty] = tipOf(pose);
    if (Math.hypot(tx - SOCKET.x, ty - SOCKET.y) > SOCKET.r + 3 * PS) setSocketTop(false);
  }
  render();
  if (busy || anim) kick();
  else last = 0;
}

// 드래그: 포인터를 바짝 따라가고, 소켓 근처에서는 방향과 위치가 소켓 쪽으로 끌려간다
function dragTarget(pr = press) {
  let x = pr.px + pr.ox, y = pr.py + pr.oy;
  // 매달린 느낌: 케이블 반대쪽과 아래쪽 사이를 향한다
  let vx = x - END[0], vy = y - END[1];
  const n = Math.hypot(vx, vy) || 1;
  vx = vx / n * 0.35;
  vy = vy / n * 0.35 + 0.65;
  let a = (Math.atan2(vy, vx) * 180) / Math.PI;
  const [tx, ty] = tipOf({ x, y, a });
  const d = Math.hypot(tx - SOCKET.x, ty - SOCKET.y) * ppu;
  const r = R[pr.type];
  if (d < r.magnet) {
    const w = 1 - d / r.magnet, pre = seatPose(6);
    a += angDiff(SOCKET.a, a) * Math.min(1, w * 1.6);
    x += (pre.x - x) * w * w * 0.7;
    y += (pre.y - y) * w * w * 0.7;
  }
  return { x, y, a, d };
}
function follow(dt) {
  const t = dragTarget();
  const k = 1 - Math.exp(-dt * 30);
  pose.x += (t.x - pose.x) * k;
  pose.y += (t.y - pose.y) * k;
  pose.a += angDiff(t.a, pose.a) * (1 - Math.exp(-dt * 14));
}

const armedPose = () => ({ x: REST.x, y: REST.y + 8 * PS, a: REST.a });   // 아래 소켓 쪽으로 살짝 내려가 기다린다

// 오른쪽 신호 패널(js/signal.js)에 상태를 알린다: shown/hidden(인트로 끝남/다시 시작), plugged/unplugged
const signal = (type) => window.dispatchEvent(new CustomEvent(`static:${type}`));
function showPlug() {
  if (shown) return;
  shown = true;
  socket.classList.add('on');
  signal('shown');
  setSpots(true);
  Object.assign(pose, REST, { s: 1 });
  render();
}

function arm() {
  state = 'armed';
  socket.classList.add('ready');
  animate([{ to: armedPose(), ms: dur(220), ease: easeOut }]);
}
function disarm() {
  socket.classList.remove('ready');
  state = 'moving';
  animate([{ to: REST, ms: dur(700), ease: easeSpring, then: () => { state = 'rest'; } }]);
}

// 소켓으로: 입구에 맞춰 정렬 → 쏙 밀어 넣기 → 살짝 눌렸다 자리 잡기
function seat() {
  socket.classList.remove('ready');
  state = 'moving';
  const far = Math.hypot(pose.x - seatPose(14).x, pose.y - seatPose(14).y);
  animate([
    { to: seatPose(14), ms: dur(Math.min(360, 160 + far * 1.2)), ease: easeOut, then: () => setSocketTop(true) },
    { to: seatPose(-1.5), ms: dur(130), ease: easeIn, then: connected },
    { to: seatPose(0), ms: dur(110), ease: easeOut },
  ]);
}
function connected() {
  state = 'plugged';
  signal('plugged');
  plug.setAttribute('aria-pressed', 'true');
  plug.setAttribute('aria-label', '플러그 빼기');
  sound.plugIn();
  ping(true);
  if (navigator.vibrate) navigator.vibrate(12);
}
function released() {
  signal('unplugged');
  plug.setAttribute('aria-pressed', 'false');
  plug.setAttribute('aria-label', '플러그를 소켓에 꽂기');
  sound.unplug();
  ping(false);
}
// 탭으로 빼기: 쑥 뽑았다가 제자리로
function unplug() {
  released();
  state = 'moving';
  animate([
    { to: seatPose(16), ms: dur(150), ease: easeOut, then: () => setSocketTop(false) },
    { to: REST, ms: returnMs(), ease: easeReturn, then: () => { state = 'rest'; } },
  ]);
}
function goRest() {
  state = 'moving';
  animate([{ to: REST, ms: returnMs(), ease: easeReturn, then: () => { state = 'rest'; } }]);
}

// 연결 상태가 바뀔 때만 아주 잠깐 반응한다: 꽂으면 신호가 실을 타고 위로 올라가고 i의 구슬이 톡, 빼면 구슬만 톡
function ping(flow) {
  if (!MOTION) return;
  if (flow) {
    const seg = 90;
    pulse.style.strokeDasharray = `${seg} ${threadLen + seg}`;
    pulse.animate(
      [{ strokeDashoffset: -threadLen, opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.8 }, { strokeDashoffset: seg, opacity: 0 }],
      { duration: 1100, easing: 'cubic-bezier(.4,.1,.4,1)' },
    );
  }
  bead.node.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
    { duration: 360, delay: flow ? 640 : 0, easing: 'ease-out' },
  );
}

// ---------- 미니 탭 ----------
const tab = document.getElementById('tab');
const tabTitle = tab.querySelector('.tab-title'), tabBody = tab.querySelector('.tab-body');
let openSpot = null;
const TYPE_RIGHT = 575;   // 글자들의 오른쪽 끝 (원본 좌표)
// live: 글자가 자리 잡은 뒤 나타남, hover/open: 진하게
function mark(sp, cls, on) {
  sp.node.classList.toggle(cls, on);
}
function placeTab() {
  // 글자 오른쪽 바깥, 동그라미와 같은 높이에 띄우고 화면 밖으로 나가지 않게 붙잡는다
  const r = openSpot.node.getBoundingClientRect(), w = tab.offsetWidth, h = tab.offsetHeight;
  const edge = new DOMPoint(TYPE_RIGHT, 0).matrixTransform(svg.getScreenCTM()).x;
  const left = Math.max(16, Math.min(innerWidth - w - 16, Math.max(r.right, edge) + 18));
  const top = Math.max(16, Math.min(innerHeight - h - 16, r.top + r.height / 2 - h / 2));
  tab.style.left = `${left}px`;
  tab.style.top = `${top}px`;
}
function openTab(sp) {
  if (openSpot === sp) { closeTab(); return; }
  closeTab();
  openSpot = sp;
  tabTitle.textContent = sp.title;
  tabBody.textContent = sp.body;
  mark(sp, 'open', true);
  sp.node.setAttribute('aria-expanded', 'true');
  placeTab();
  tab.classList.add('on');
}
function closeTab() {
  if (!openSpot) return;
  mark(openSpot, 'open', false);
  openSpot.node.setAttribute('aria-expanded', 'false');
  openSpot = null;
  tab.classList.remove('on');
}
// 동그라미는 인트로가 끝나 글자가 자리 잡은 뒤에만 누를 수 있다
function setSpots(on) {
  for (const sp of SPOTS) {
    if (on) sp.node.setAttribute('tabindex', '0');
    else { sp.node.removeAttribute('tabindex'); mark(sp, 'hover', false); }
    mark(sp, 'live', on);
  }
  if (!on) closeTab();
}
tab.querySelector('.tab-close').addEventListener('click', closeTab);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTab(); });
for (const sp of SPOTS) {
  sp.node.addEventListener('focus', () => mark(sp, 'hover', true));
  sp.node.addEventListener('blur', () => mark(sp, 'hover', false));
  sp.node.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    openTab(sp);
  });
}

// ---------- 입력 ----------
function toSvg(e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  return [p.x, p.y];
}
function onPlug([x, y], r) {
  // 플러그 축(원점~핀 끝) 선분까지의 거리
  const [tx, ty] = tipOf(pose), ex = tx - pose.x, ey = ty - pose.y;
  const k = Math.max(0, Math.min(1, ((x - pose.x) * ex + (y - pose.y) * ey) / (ex * ex + ey * ey)));
  return Math.hypot(x - pose.x - ex * k, y - pose.y - ey * k) * ppu < r.hit;
}
const onSocket = ([x, y], r) => Math.hypot(x - SOCKET.x, y - SOCKET.y) * ppu < r.socket;
// 색 덩어리 안이거나, 손가락으로 누르기 쉽게 가장자리에서 조금 벗어난 곳까지
const onSpot = ([x, y], r) => {
  const m = r.spot / ppu;
  return SPOTS.find((sp) => [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]].some(([dx, dy]) => sp.node.isPointInFill(new DOMPoint(x + dx, y + dy))));
};

function onDown(e) {
  sound.ensure();   // 소리는 사용자 동작 안에서만 깨운다
  if (!shown || state === 'moving' || press) return;
  const r = R[e.pointerType === 'mouse' ? 'mouse' : 'touch'];
  const p = toSvg(e);
  if (onPlug(p, r)) {
    press = { id: e.pointerId, type: e.pointerType === 'mouse' ? 'mouse' : 'touch', cx: e.clientX, cy: e.clientY,
      px: p[0], py: p[1], ox: pose.x - p[0], oy: pose.y - p[1], drag: false };
    root.setPointerCapture(e.pointerId);
    e.preventDefault();
    return;
  }
  const sp = onSpot(p, r);
  if (sp) { openTab(sp); return; }
  closeTab();
  if (state === 'armed') onSocket(p, r) ? seat() : disarm();
}
function onMove(e) {
  if (!press) {
    if (e.pointerType === 'mouse' && shown) {
      const p = toSvg(e), sp = onPlug(p, R.mouse) ? null : onSpot(p, R.mouse);
      root.style.cursor = sp ? 'pointer' : onPlug(p, R.mouse) ? 'grab' : '';
      for (const s of SPOTS) mark(s, 'hover', s === sp);
    }
    return;
  }
  if (e.pointerId !== press.id) return;
  [press.px, press.py] = toSvg(e);
  if (!press.drag && Math.hypot(e.clientX - press.cx, e.clientY - press.cy) > 7) {
    press.drag = true;
    if (state === 'plugged') released();
    socket.classList.remove('ready');
    state = 'drag';
    anim = null;
    root.style.cursor = 'grabbing';
    kick();
  }
}
function onUp(e) {
  if (!press || e.pointerId !== press.id) return;
  const p = press;
  press = null;
  root.style.cursor = '';
  if (p.drag) {
    // 손가락에 가려도 되도록: 놓은 지점이든 플러그 위치든 소켓 근처면 꽂는다
    const [tx, ty] = tipOf(pose);
    const near = Math.min(Math.hypot(tx - SOCKET.x, ty - SOCKET.y) * ppu, dragTarget(p).d);
    if (e.type !== 'pointercancel' && near < R[p.type].snap) seat();
    else goRest();
    return;
  }
  // 탭
  if (state === 'plugged') unplug();
  else if (state === 'armed') disarm();
  else arm();
}

root.addEventListener('pointerdown', (e) => {
  if (!done) { skip(); return; }
  onDown(e);
});
root.addEventListener('pointermove', onMove);
root.addEventListener('pointerleave', () => { for (const s of SPOTS) mark(s, 'hover', false); });
root.addEventListener('pointerup', onUp);
root.addEventListener('pointercancel', onUp);

// 키보드: 플러그에서 Enter/Space로 꽂고 빼기
plug.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  sound.ensure();
  if (!shown || state === 'moving' || state === 'drag') return;
  state === 'plugged' ? unplug() : seat();
});

layout();
addEventListener('resize', () => {
  layout();
  draw(cur);
  if (openSpot) placeTab();
});

// ?intro=0.4 처럼 주면 그 진행도에서 멈춘다 (확인용)
const freeze = new URLSearchParams(location.search).get('intro');

if (freeze !== null || !MOTION) {
  draw(freeze !== null ? Math.max(0, Math.min(1, +freeze)) : 1);
  done = true;
} else {
  draw(0);
  requestAnimationFrame(introFrame);
}

// 탭/클릭/키 입력으로 바로 완성
function skip() {
  if (done) return;
  done = true;
  draw(1);
}
addEventListener('keydown', (e) => { if (!done && e.target === document.body) skip(); });

// 다시 보기: 플러그를 빼고 처음부터 다시 떨어뜨린다
document.getElementById('replay').addEventListener('click', () => {
  if (state === 'plugged') released();
  anim = null;
  press = null;
  state = 'rest';
  Object.assign(pose, REST);
  setSocketTop(false);
  socket.classList.remove('on', 'ready');
  draw(0);
  t0 = 0;
  if (done) {
    done = false;
    requestAnimationFrame(introFrame);
  }
});

// 재생바(js/signal.js)에서: 플러그가 빠져 있을 때 재생을 누르면 플러그가 스스로 소켓에 꽂힌다
window.StaticPlug = {
  connect() {
    sound.ensure();
    if (shown && (state === 'rest' || state === 'armed')) seat();
  },
};

// 확인용
window.__plug = { get state() { return state; }, pose, SOCKET, sound: () => sound.debug() };
