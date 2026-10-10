// 가운데 사진 아래의 재생바: 타이포와 같은 굵기의 실 한 줄(= 진행 막대), 손으로 그은 듯한 낙서 아이콘들, 타자기 문구.
// 실은 가만히 놓인 한 줄이고, 그 위를 까만 점이 곡의 진행에 맞춰 지나간다. 꽂기 전엔 "no signal.", 꽂으면 "now playing — …".
// 보이기/숨기기는 intro.js의 static:shown / static:hidden, 재생 상태는 sound.js의 static:sound 이벤트로 받는다.
(() => {
  const IDLE = 'no signal.';
  const sound = window.StaticSound;
  const MOTION = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  const box = document.getElementById('signal');
  const photo = document.getElementById('photo');   // 가운데 사진도 글자가 자리 잡은 뒤 함께 나타난다
  const ytbox = document.getElementById('ytbox');   // 유튜브 곡일 때 사진 자리에 덮이는 영상 창

  // ---------- 낙서 선 ----------
  // 고정 씨앗 난수: 새로고침해도 같은 삐뚤빼뚤함
  const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  // 점 목록 → 부드러운 곡선 (centripetal Catmull-Rom). closed면 처음으로 돌아와 닫는다
  function smooth(pts, closed = false) {
    const f = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    const dist = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])) || 1e-6;
    const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : pts;
    const s = closed ? 1 : 0, e = closed ? P.length - 2 : P.length - 1;
    let d = `M${f(P[s])}`;
    for (let i = s; i < e; i++) {
      const p1 = P[i], p2 = P[i + 1];
      const p0 = P[i - 1] || [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];
      const p3 = P[i + 2] || [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
      const d1 = dist(p0, p1), d2 = dist(p1, p2), d3 = dist(p2, p3);
      const c1 = [0, 1].map((k) => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
      const c2 = [0, 1].map((k) => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
      d += ` C${f(c1)} ${f(c2)} ${f(p2)}`;
    }
    return d;
  }
  // 꼭짓점들을 잇는 손그림 선: 변마다 점을 몇 개 찍고 살짝 흔든 뒤 부드럽게 잇는다 (모서리는 펜처럼 살짝 둥글게)
  function scribble(verts, { closed = false, wob = 0.7, seed = 1, per = 4 } = {}) {
    const r = rng(seed), pts = [];
    const n = closed ? verts.length : verts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = verts[i], b = verts[(i + 1) % verts.length];
      for (let k = 0; k < per; k++) pts.push([a[0] + (b[0] - a[0]) * (k / per), a[1] + (b[1] - a[1]) * (k / per)]);
    }
    if (!closed) pts.push(verts[verts.length - 1]);
    return smooth(pts.map(([x, y], i) => (i === 0 && !closed ? [x, y] : [x + (r() - 0.5) * wob * 2, y + (r() - 0.5) * wob * 2])), closed);
  }
  // 손으로 돌린 동그라미: 반지름이 조금씩 출렁이고, 끝이 시작을 살짝 지나쳐 겹친다
  function loop(cx, cy, rad, seed = 3) {
    const r = rng(seed), pts = [], ph = r() * 6;
    for (let a = -100; a <= 275; a += 15) {
      const t = (a * Math.PI) / 180, rr = rad * (1 + 0.035 * Math.sin(t * 2 + ph)) + (r() - 0.5) * 0.5;
      pts.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
    return smooth(pts);
  }
  // 화살촉: 끝점 p에서 방향 a(도)를 향하는 짧은 두 획
  const arrow = ([x, y], a, len = 4, seed = 9) => {
    const t = (a * Math.PI) / 180, s = 0.62;
    return scribble([[x - Math.cos(t - s) * len, y - Math.sin(t - s) * len], [x, y], [x - Math.cos(t + s) * len, y - Math.sin(t + s) * len]], { wob: 0.25, seed, per: 2 });
  };

  // 아이콘 (40×40 칸 기준)
  const ICON = {
    play: () => loop(20, 20, 17, 4) + scribble([[16, 12.5], [28.5, 20], [16, 27.5]], { closed: true, seed: 5, wob: 0.45 }),
    pause: () => loop(20, 20, 17, 4) + scribble([[14.8, 13], [17.6, 13], [17.6, 27], [14.8, 27]], { closed: true, seed: 6, wob: 0.3, per: 3 })
      + scribble([[22.4, 13], [25.2, 13], [25.2, 27], [22.4, 27]], { closed: true, seed: 7, wob: 0.3, per: 3 }),
    prev: () => scribble([[12, 11], [12, 29]], { seed: 8, wob: 0.4 }) + scribble([[28, 11], [14.5, 20], [28, 29]], { closed: true, seed: 9, wob: 0.5 }),
    next: () => scribble([[28, 11], [28, 29]], { seed: 10, wob: 0.4 }) + scribble([[12, 11], [25.5, 20], [12, 29]], { closed: true, seed: 11, wob: 0.5 }),
    shuffle: () => scribble([[8, 13], [15, 13.5], [24, 26], [31, 26.5]], { seed: 12, wob: 0.5, per: 3 }) + arrow([31.5, 26.5], 0, 4, 13)
      + scribble([[8, 27], [15, 26.5], [24, 14], [31, 13.5]], { seed: 14, wob: 0.5, per: 3 }) + arrow([31.5, 13.5], 0, 4, 15),
    repeat: () => scribble([[11, 24], [10, 16], [14, 13.5], [29, 13.5]], { seed: 16, wob: 0.5, per: 3 }) + arrow([30, 13.5], 0, 4, 17)
      + scribble([[29, 16], [30, 24], [26, 26.5], [11, 26.5]], { seed: 18, wob: 0.5, per: 3 }) + arrow([10, 26.5], 180, 4, 19),
    one: () => scribble([[18.5, 18], [20.5, 16.5], [20.5, 23.5]], { seed: 20, wob: 0.2, per: 2 }),
    inf: () => {
      const pts = [];
      for (let k = 0; k < 40; k++) {
        const t = (k / 40) * Math.PI * 2, d = 1 + Math.sin(t) ** 2;
        pts.push([20 + (15 * Math.cos(t)) / d, 20 + (13 * Math.sin(t) * Math.cos(t)) / d]);
      }
      const r = rng(21);
      return smooth(pts.map(([x, y]) => [x + (r() - 0.5) * 0.7, y + (r() - 0.5) * 0.7]), true);
    },
  };
  const icon = (name, extra = '') => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${ICON[name]()}"/>${extra}</svg>`;
  const dots = '<circle cx="10" cy="20" r="2.6"/><circle cx="20" cy="20.6" r="2.6"/><circle cx="30" cy="20" r="2.6"/>';

  // 사진 테두리: 네 변을 따로 그은 살짝 찌글한 정사각형. 모서리에서 선이 조금씩 삐져나간다 (100×100 칸, 사진보다 조금 크게)
  if (photo) {
    const frame = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    frame.setAttribute('class', 'frame');
    frame.setAttribute('viewBox', '0 0 100 100');
    frame.setAttribute('preserveAspectRatio', 'none');
    frame.setAttribute('aria-hidden', 'true');
    const side = (a, b, seed) => scribble([a, b], { seed, wob: 0.35, per: 6 });
    frame.innerHTML = `<path d="${side([-1.8, 1.1], [101.2, -0.5], 31) + side([99.3, -2.2], [100.7, 101.6], 32)
      + side([102, 99.2], [-1.2, 100.6], 33) + side([0.5, 102.2], [-0.7, -1.6], 34)}"/>`;
    photo.after(frame);
  }

  // ---------- 틀 ----------
  box.innerHTML = `
    <div class="meta">
      <span class="time">0.00</span>
      <span class="end">
        <button type="button" class="more" aria-label="곡 목록" aria-expanded="false"><svg viewBox="0 0 40 40" aria-hidden="true">${dots}</svg></button>
        <span class="len"><span class="dur"></span><span class="inf">${icon('inf')}</span></span>
      </span>
    </div>
    <svg class="wire" aria-label="재생 위치"><path></path><circle class="head"></circle></svg>
    <div class="controls">
      <button type="button" class="ctl shuffle" aria-label="섞어 듣기" aria-pressed="false">${icon('shuffle')}</button>
      <button type="button" class="ctl prev" aria-label="이전 곡">${icon('prev')}</button>
      <button type="button" class="ctl play" aria-label="재생">${icon('play')}</button>
      <button type="button" class="ctl next" aria-label="다음 곡">${icon('next')}</button>
      <button type="button" class="ctl repeat" aria-label="반복: 전체">${icon('repeat', `<path class="one-mark" d="${ICON.one()}"/>`)}</button>
    </div>
    <div class="foot">
      <p class="caption" aria-live="polite"><span class="typed"></span><span class="caret" aria-hidden="true"></span></p>
      <ol class="tracks" hidden></ol>
    </div>`;
  const $ = (q) => box.querySelector(q);
  const svg = $('.wire'), wire = $('.wire path'), head = $('.wire .head');
  const timeEl = $('.time'), durEl = $('.dur'), infEl = $('.inf');
  const typed = $('.typed'), ctl = $('.controls'), list = $('.tracks'), more = $('.more');
  const btn = { shuffle: $('.shuffle'), prev: $('.prev'), play: $('.play'), next: $('.next'), repeat: $('.repeat') };

  // ---------- 실 ----------
  // 실은 가만히 놓인 한 줄(손으로 그은 듯 아주 살짝만 삐뚤다). 그 위를 까만 점이 곡의 진행에 맞춰 지나간다
  const N = 24;                          // 실 위의 점 개수
  let w = 0, h = 0, raf = 0, ys = [];
  let visible = false;
  let st = sound.info();

  function size() {
    w = svg.clientWidth;
    h = svg.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const r = rng(41), tp = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--thread-px')) || 2.4;
    ys = Array.from({ length: N }, (_, i) => h / 2 + (i && i < N - 1 ? (r() - 0.5) * tp * 0.5 : 0));
    wire.setAttribute('d', smooth(ys.map((y, i) => [(w * i) / (N - 1), y])));
    head.setAttribute('r', tp * 2);
  }

  // 시간: 1분 55초 → "1.55"
  const clockText = (s) => `${Math.floor(s / 60)}.${String(Math.floor(s % 60)).padStart(2, '0')}`;

  function frame() {
    raf = 0;
    const info = sound.info();
    timeEl.textContent = clockText(info.t);
    // 끝이 있는 곡은 진행만큼, 끝없는 곡은 실 왼쪽 끝에 머문다
    const f = Number.isFinite(info.dur) && info.dur > 0 ? Math.max(0, Math.min(1, info.t / info.dur)) : 0;
    const fi = f * (N - 1), i0 = Math.floor(fi), i1 = Math.min(N - 1, i0 + 1);
    head.setAttribute('cx', (w * f).toFixed(1));
    head.setAttribute('cy', ((ys[i0] || h / 2) + ((ys[i1] || h / 2) - (ys[i0] || h / 2)) * (fi - i0)).toFixed(1));
    if (visible && st.playing) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  // ---------- 타자기 문구 ----------
  let typing = 0, goal = '';
  function type(text) {
    if (text === goal) return;
    goal = text;
    clearTimeout(typing);
    if (!MOTION) { typed.textContent = text; return; }
    const step = () => {
      const cur = typed.textContent;
      if (cur === goal) return;
      if (!goal.startsWith(cur)) {                       // 다른 문구가 남아 있으면 한 글자씩 지우고
        typed.textContent = cur.slice(0, -1);
        typing = setTimeout(step, 22);
        return;
      }
      typed.textContent = goal.slice(0, cur.length + 1);  // 새 문구를 한 글자씩 친다
      const ch = goal[cur.length];
      typing = setTimeout(step, 55 + Math.random() * 45 + (ch === ' ' ? 40 : 0) + (ch === '—' ? 160 : 0));
    };
    typing = setTimeout(step, 160);
  }
  const caption = () => (!st.plugged ? IDLE : `${st.playing ? 'now playing' : 'paused'} — ${st.title}`);

  // ---------- 앨범 자켓 ----------
  // 곡마다 cover가 있으면 가운데 사진을 그 이미지로 바꾼다. 다 받은 뒤에 바꾸고, 보이는 중이면 살짝 겹쳐 나타나게
  const photoSrc = photo ? photo.getAttribute('src') : '', photoAlt = photo ? photo.alt : '';
  let coverWant = photoSrc;
  function setCover(src, alt) {
    if (!photo || src === coverWant) return;
    coverWant = src;
    const img = new Image();
    img.onload = () => {
      if (coverWant !== src) return;   // 그사이 다른 곡으로 넘어갔으면 버린다
      photo.src = src;
      photo.alt = alt;
      if (MOTION && photo.classList.contains('on')) photo.animate([{ opacity: 0.15 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
    };
    img.src = src;
  }

  // ---------- 상태 → 화면 ----------
  function sync() {
    st = sound.info();
    const finite = Number.isFinite(st.dur) && st.dur > 0;
    ctl.classList.toggle('off', !st.plugged);
    if (photo) photo.classList.toggle('live', st.plugged);   // 연결되기 전엔 사진이 살짝 바랜 채로 있다
    setCover(st.cover || photoSrc, st.cover ? st.coverAlt : photoAlt);
    if (ytbox) ytbox.classList.toggle('on', visible && st.yt);
    btn.play.innerHTML = icon(st.playing ? 'pause' : 'play');
    btn.play.setAttribute('aria-label', st.playing ? '일시정지' : '재생');
    btn.shuffle.classList.toggle('on', st.shuffle);
    btn.shuffle.setAttribute('aria-pressed', String(st.shuffle));
    btn.repeat.dataset.mode = st.repeat;
    btn.repeat.setAttribute('aria-label', `반복: ${{ all: '전체', one: '한 곡', off: '끔' }[st.repeat]}`);
    durEl.textContent = finite ? clockText(st.dur) : '';
    infEl.hidden = finite;
    svg.classList.toggle('seekable', finite && st.plugged);
    list.innerHTML = st.titles.map((t, i) => `<li><button type="button" data-i="${i}"${i === st.index ? ' aria-current="true"' : ''}>${String(i + 1).padStart(2, '0')}  ${t}</button></li>`).join('');
    if (visible) type(caption());
    kick();
  }

  // ---------- 조작 ----------
  btn.play.addEventListener('click', () => {
    sound.ensure();
    if (!st.plugged) { if (window.StaticPlug) window.StaticPlug.connect(); return; }   // 빠져 있으면 플러그부터 꽂는다
    if (st.playing) sound.pause(); else sound.play();
  });
  btn.prev.addEventListener('click', () => sound.prev());
  btn.next.addEventListener('click', () => sound.next());
  btn.shuffle.addEventListener('click', () => sound.toggleShuffle());
  btn.repeat.addEventListener('click', () => sound.cycleRepeat());
  more.addEventListener('click', () => {
    list.hidden = !list.hidden;
    more.setAttribute('aria-expanded', String(!list.hidden));
  });
  list.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]');
    if (b) sound.pick(+b.dataset.i);
  });
  // 실을 눌러 원하는 위치로 (끝이 있는 곡을 듣는 중일 때)
  svg.addEventListener('pointerdown', (e) => {
    if (!svg.classList.contains('seekable')) return;
    const r = svg.getBoundingClientRect();
    sound.seek((e.clientX - r.left) / r.width);
    kick();
  });

  // ---------- 이벤트 ----------
  addEventListener('static:sound', sync);
  addEventListener('static:shown', () => {
    visible = true;
    box.classList.add('on');
    if (photo) photo.classList.add('on');
    size();
    goal = '';
    sync();
    kick();
  });
  addEventListener('static:hidden', () => {
    visible = false;
    box.classList.remove('on');
    if (photo) photo.classList.remove('on');
    if (ytbox) ytbox.classList.remove('on');
    clearTimeout(typing);
    typed.textContent = '';
    goal = '';
    list.hidden = true;
    more.setAttribute('aria-expanded', 'false');
  });
  addEventListener('static:plugged', sync);
  addEventListener('static:unplugged', sync);
  addEventListener('resize', () => {
    size();
    kick();
  });
  size();
  sync();
})();
