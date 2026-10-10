// 플러그를 꽂으면 '치직' 하고 음악이 들어오고, 빼면 페이드아웃된다.
// 재생목록(TRACKS)을 돌며 재생·일시정지·이전·다음·셔플·반복·위치 이동을 한다.
// AudioContext는 첫 사용자 동작(pointerdown) 안에서만 만들고 깨운다.
// 각 곡은 src의 mp3를 쓰고, 파일이 없거나 못 읽으면 그 곡의 synth 번호로 즉석 합성한 잔잔한 루프(끝 없음)를 쓴다.
// src 대신 yt에 유튜브 링크(또는 영상 ID)를 넣으면 그 곡은 유튜브 플레이어(#yt)로 튼다. 영상 창은 사진 자리에 뜬다.
// 유튜브 소리는 다른 사이트에서 읽을 수 없어 실의 출렁임은 흉내 낸 것이고, 볼륨 페이드만 플레이어 볼륨으로 한다.
// 상태가 바뀔 때마다 window에 'static:sound' 이벤트를 보낸다 (화면은 info()로 읽는다).

window.StaticSound = (() => {
  // 곡 이름과 파일은 임시. audio/ 폴더에 파일을 넣거나 유튜브 링크를 넣고 여기만 고치면 된다
  // cover: 그 곡을 들을 때 가운데 사진 자리에 나오는 앨범 자켓 (없으면 기본 사진). alt를 함께 주면 그 설명을 쓴다
  const TRACKS = [
    { title: 'static hearts, side a', src: './audio/track.mp3', synth: 0, cover: './img/cover1.png', alt: '파란 띠에 SUMMER EPISODES라고 적힌 앨범 자켓' },
    { title: 'paper moon', src: './audio/track2.mp3', synth: 1, cover: './img/cover2.png', alt: '꽃과 얼굴 사진을 찢어 붙인 콜라주에 Ghost Notes라고 쓴 앨범 자켓' },
    { title: 'blue hour', src: './audio/track3.mp3', synth: 2, cover: './img/cover3.png', alt: '크레파스로 그린 토마토 그림 앨범 자켓' },
    // { title: '곡 제목', yt: 'https://www.youtube.com/watch?v=XXXXXXXXXXX', cover: './img/자켓.jpg' },
  ];
  const LEVEL = 0.85;   // 음악 최종 볼륨

  let ctx = null, out, music, tone, scope;
  let bus = null, src = null, timer = 0, stopTimer = 0, token = 0;
  let idx = 0, plugged = false, playing = true, shuffle = false, repeat = 'all';   // repeat: 'off' | 'all' | 'one'
  let offset = 0, startedAt = 0, running = false, curBuf = null;
  const buffers = new Map();   // 곡 번호 → AudioBuffer(있으면) / null(없음)

  const emit = () => window.dispatchEvent(new CustomEvent('static:sound'));

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      out = ctx.createDynamicsCompressor();
      out.connect(ctx.destination);
      // 음악은 music(볼륨) → tone(로우패스, '들어오는' 느낌) → scope(세기 읽기) → out
      scope = ctx.createAnalyser();
      scope.fftSize = 2048;
      scope.connect(out);
      tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 300;
      tone.Q.value = 0.6;
      tone.connect(scope);
      music = ctx.createGain();
      music.gain.value = 0;
      music.connect(tone);
      // 옛 iOS: 제스처 안에서 소리를 한 번 내야 잠금이 풀린다
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      s.connect(ctx.destination);
      s.start();
      load(idx);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // 곡 파일을 한 번만 받아 둔다. 없으면 null
  const pending = new Map();
  function load(i) {
    if (isYt(i)) return Promise.resolve(null);   // 유튜브 곡은 받을 파일이 없다
    if (buffers.has(i)) return Promise.resolve(buffers.get(i));
    if (!pending.has(i)) {
      pending.set(i, fetch(TRACKS[i].src).then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((b) => (b ? ctx.decodeAudioData(b) : null)).catch(() => null)
        .then((b) => { buffers.set(i, b || null); pending.delete(i); return b || null; }));
    }
    return pending.get(i);
  }

  // ---------- 유튜브 곡 ----------
  // 링크 모양(watch?v=, youtu.be/, shorts/, embed/)이든 영상 ID든 11자리 ID만 뽑는다
  const ytId = (s) => (String(s).match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/) || [])[1] || (/^[\w-]{11}$/.test(s) ? s : '');
  const isYt = (i) => !!TRACKS[i].yt;
  let yt = null, ytReady = false, ytCur = '', ytWant = null, ytVol = 0, ytFadeT = 0, ytErrs = 0;

  // 플레이어는 페이지가 열릴 때 미리 만들어 둔다 (첫 클릭에서 바로 재생되도록)
  if (TRACKS.some((x) => x.yt) && document.getElementById('yt')) {
    window.onYouTubeIframeAPIReady = () => {
      yt = new YT.Player('yt', {
        width: '100%', height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: { onReady: ytOnReady, onStateChange: ytOnState, onError: ytOnError },
      });
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
  function ytOnReady() {
    ytReady = true;
    if (ytWant !== null && running && isYt(idx)) { const o = ytWant; ytWant = null; ytStart(o); }
    else ytCue(idx);
  }
  // 고른 곡이 유튜브면 영상만 걸어 둔다 (창에 첫 화면이 보이게)
  function ytCue(i) {
    if (!ytReady || !isYt(i)) return;
    const id = ytId(TRACKS[i].yt);
    if (id && id !== ytCur) { ytCur = id; yt.cueVideoById(id); }
  }
  // 지금 곡을 off초부터 튼다. 소리는 0에서 천천히 올린다
  function ytStart(off) {
    ytVol = 0;
    if (!ytReady) { ytWant = off; return; }   // 플레이어가 준비되는 대로
    const id = ytId(TRACKS[idx].yt);
    yt.setVolume(0);
    if (id !== ytCur) { ytCur = id; yt.loadVideoById({ videoId: id, startSeconds: off }); }
    else { yt.seekTo(off, true); yt.playVideo(); }
    ytFade(LEVEL * 100, 1200);
  }
  function ytFade(to, ms) {
    clearInterval(ytFadeT);
    const from = ytVol, t0 = performance.now();
    ytFadeT = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      ytVol = from + (to - from) * k;
      if (ytReady) yt.setVolume(Math.round(ytVol));
      if (k >= 1) clearInterval(ytFadeT);
    }, 30);
  }
  const ytOn = () => running && isYt(idx) && ytReady && ytId(TRACKS[idx].yt) === ytCur;
  const ytDur = () => (ytReady && isYt(idx) && ytId(TRACKS[idx].yt) === ytCur ? yt.getDuration() || 0 : 0);
  function ytOnState(e) {
    const S = YT.PlayerState;
    if (e.data === S.PLAYING) {
      ytErrs = 0;
      if (!(plugged && playing && running)) {
        // 영상 창에서 직접 재생을 눌렀을 때: 꽂혀 있으면 따라가고, 빠져 있으면 다시 멈춘다
        if (plugged && isYt(idx)) { playing = true; running = true; clearTimeout(stopTimer); ytFade(LEVEL * 100, 400); }
        else yt.pauseVideo();
      }
    } else if (e.data === S.PAUSED && plugged && playing && running && isYt(idx)) {
      // 영상 창에서 직접 멈췄을 때
      offset = elapsed();
      playing = false;
      running = false;
    } else if (e.data === S.ENDED && running && isYt(idx)) {
      if (repeat === 'one') { yt.seekTo(0, true); yt.playVideo(); }
      else { running = false; ended(); }
    }
    emit();
  }
  // 못 트는 영상(삭제됨, 퍼가기 금지 등)은 건너뛴다. 전부 안 되면 멈춘다
  function ytOnError() {
    if (!running || !isYt(idx)) return;
    if (++ytErrs < TRACKS.length) go(1, true);
    else { ytErrs = 0; playing = false; stopNow(); emit(); }
  }

  // ---------- 효과음 ----------
  function burst(t, dur, level, build, hp = 700) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    build(b.getChannelData(0), n);
    const s = ctx.createBufferSource();
    s.buffer = b;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = level;
    s.connect(f).connect(g).connect(out);
    s.start(t);
  }
  // 치직: 옅은 잡음 위에 불규칙한 튐
  const crackle = (t, dur, level) => burst(t, dur, level, (d, n) => {
    let pop = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, env = (1 - k) ** 1.4;
      if (Math.random() < 0.0016 + 0.01 * (1 - k)) pop = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
      pop *= 0.86;
      d[i] = ((Math.random() * 2 - 1) * 0.16 + pop) * env;
    }
  });
  // 딸깍: 짧은 금속성 틱
  const click = (t, level) => burst(t, 0.03, level, (d, n) => {
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (n * 0.12));
  }, 1800);

  // ---------- 합성 음악 (곡 파일이 없을 때) ----------
  // arp: 8분음표마다 화음의 몇 번째 음 (-1은 쉼)
  const SYNTHS = [
    { bpm: 78, chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 59]], arp: [0, -1, 2, 1, -1, 3, 2, -1] },   // Fmaj7 · Em7 · Dm9 · Cmaj7
    { bpm: 66, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]], arp: [0, 2, -1, 3, 1, -1, 2, -1] },     // Am7 · Fmaj7 · Cmaj7 · G7
    { bpm: 88, chords: [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 49, 52, 55]], arp: [0, -1, 1, 3, -1, 2, -1, 1] },     // Dmaj7 · Bm7 · Gmaj7 · A7
  ];
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  let step = 0, stepAt = 0, synth = SYNTHS[0];

  function voice(type, f, t, a, peak, rel, dest, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + rel);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + a + rel + 0.05);
  }
  function schedule(i, t) {
    const beat = 60 / synth.bpm;
    const chord = synth.chords[Math.floor(i / 8) % synth.chords.length];
    if (i % 8 === 0) {
      const pad = ctx.createBiquadFilter();
      pad.type = 'lowpass';
      pad.frequency.value = 1300;
      pad.connect(bus);
      for (const m of chord) for (const dt of [-7, 7]) voice('triangle', hz(m), t, 0.9, 0.022, beat * 4.6, pad, dt);
      voice('sine', hz(chord[0] - 12), t, 0.05, 0.16, beat * 3.6, bus);
    }
    const k = synth.arp[i % 8];
    if (k >= 0) {
      const f = hz(chord[k % chord.length] + 12);
      voice('sine', f, t, 0.006, 0.07, 1.4, bus);
      voice('sine', f * 4, t, 0.002, 0.012, 0.25, bus);   // 로즈 피아노 같은 타인 소리
    }
  }
  function tick() {
    if (!bus) return;
    while (stepAt < ctx.currentTime + 0.3) {
      schedule(step++, stepAt);
      stepAt += 60 / synth.bpm / 2;
    }
  }

  // 지금 곡을 offset초부터 t에 시작한다 (파일을 아직 못 받았으면 받는 대로)
  function begin(t) {
    stopNow();
    if (isYt(idx)) {
      ++token;
      if (!plugged || !playing) return;
      curBuf = null;
      running = true;
      ytStart(offset);
      emit();
      return;
    }
    const my = ++token, i = idx;
    load(i).then((buf) => {
      if (my !== token || !plugged || !playing) return;
      t = Math.max(t, ctx.currentTime + 0.02);
      bus = ctx.createGain();
      bus.connect(music);
      curBuf = buf;
      running = true;
      startedAt = t - offset;
      if (buf) {
        src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = repeat === 'one';
        src.connect(bus);
        src.start(t, offset % buf.duration);
        const mine = src;
        src.onended = () => { if (mine === src && running) ended(); };
      } else {
        synth = SYNTHS[TRACKS[i].synth % SYNTHS.length];
        // 아주 옅은 정전기 잡음을 바닥에 깐다
        const n = ctx.sampleRate * 2, nb = ctx.createBuffer(1, n, ctx.sampleRate), d = nb.getChannelData(0);
        for (let j = 0; j < n; j++) d[j] = (Math.random() * 2 - 1) * (Math.random() < 0.0006 ? 3 : 1);
        src = ctx.createBufferSource();
        src.buffer = nb;
        src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3200;
        bp.Q.value = 0.4;
        const hg = ctx.createGain();
        hg.gain.value = 0.01;
        src.connect(bp).connect(hg).connect(bus);
        src.start(t);
        step = 0;
        stepAt = t;
        tick();
        timer = setInterval(tick, 60);
      }
      emit();
    });
  }
  function stopNow() {
    running = false;
    clearInterval(timer);
    if (src) { try { src.stop(); } catch (e) {} src = null; }
    if (bus) { bus.disconnect(); bus = null; }
    ytWant = null;
    if (ytReady) { clearInterval(ytFadeT); yt.pauseVideo(); }
  }
  const hold = (p, t) => {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
    else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); }
  };
  // 지금까지 들은 위치(초)
  const elapsed = () => {
    if (!running) return offset;
    if (isYt(idx)) return ytOn() ? yt.getCurrentTime() || 0 : offset;
    return ctx ? Math.max(0, ctx.currentTime - startedAt) : offset;
  };

  // 곡이 끝났을 때: 반복 설정에 따라 다음 곡으로 넘어가거나 멈춘다
  function ended() {
    offset = 0;
    if (repeat === 'off' && !shuffle && idx === TRACKS.length - 1) {
      playing = false;
      stopNow();
      idx = 0;
      emit();
      return;
    }
    go(1, true);
  }

  // 꽂힘: 딸깍 → 치직 → 끊길 듯 한 번 흔들리다 음악이 열린다
  function plugIn() {
    if (!ensure()) return;
    plugged = true;
    playing = true;
    const t = ctx.currentTime + 0.01;
    click(t, 0.5);
    crackle(t + 0.015, 0.34, 0.55);
    begin(t + 0.12);
    const g = music.gain, f = tone.frequency;
    hold(g, t);
    g.setValueAtTime(0, t + 0.1);
    g.linearRampToValueAtTime(LEVEL * 0.6, t + 0.32);
    g.linearRampToValueAtTime(LEVEL * 0.18, t + 0.4);
    g.linearRampToValueAtTime(LEVEL, t + 1.5);
    hold(f, t);
    f.setValueAtTime(320, t + 0.1);
    f.exponentialRampToValueAtTime(9000, t + 1.8);
    emit();
  }
  // 빠짐: 짧은 치직, 음이 먹먹해지며 사라진다. 들던 자리는 기억해 두었다가 다시 꽂으면 이어서
  function unplug() {
    if (!ctx || !plugged) return;
    plugged = false;
    if (running) offset = elapsed();
    const t = ctx.currentTime;
    crackle(t, 0.12, 0.3);
    hold(music.gain, t);
    music.gain.linearRampToValueAtTime(0, t + 0.85);
    hold(tone.frequency, t);
    tone.frequency.exponentialRampToValueAtTime(260, t + 0.85);
    if (isYt(idx)) ytFade(0, 850);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (!plugged) stopNow(); emit(); }, 950);
    token++;
    emit();
  }

  // 일시정지 / 다시 재생 (꽂혀 있을 때만)
  function pause() {
    if (!ctx || !plugged || !playing) return;
    playing = false;
    if (running) offset = elapsed();
    const t = ctx.currentTime;
    hold(music.gain, t);
    music.gain.linearRampToValueAtTime(0, t + 0.25);
    if (isYt(idx)) ytFade(0, 250);
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { if (!playing) stopNow(); }, 300);
    token++;
    emit();
  }
  function play() {
    if (!ensure() || !plugged || playing) return;
    playing = true;
    clearTimeout(stopTimer);
    const t = ctx.currentTime;
    begin(t + 0.03);
    hold(music.gain, t);
    music.gain.linearRampToValueAtTime(LEVEL, t + 0.35);
    emit();
  }

  // 곡 넘기기: 앞(+1)/뒤(-1). 뒤로는 3초 넘게 들었으면 지금 곡 처음으로
  function go(dir, auto = false) {
    if (dir < 0 && elapsed() > 3) offset = 0;
    else {
      if (shuffle && TRACKS.length > 1) {
        let n = idx;
        while (n === idx) n = Math.floor(Math.random() * TRACKS.length);
        idx = n;
      } else idx = (idx + dir + TRACKS.length) % TRACKS.length;
      offset = 0;
    }
    if (ctx) load(idx);
    if (ctx && plugged && playing) {
      const t = ctx.currentTime;
      if (!auto) crackle(t, 0.08, 0.18);   // 넘길 때 짧게 치직
      begin(t + 0.06);
    } else { stopNow(); ytCue(idx); }
    emit();
  }

  // 위치 이동(0~1): 곡 파일이 있거나 유튜브 곡 길이를 알 때만
  function seek(frac) {
    if (isYt(idx)) {
      const d = ytDur();
      if (!d) return;
      offset = Math.max(0, Math.min(0.999, frac)) * d;
      if (ytOn()) yt.seekTo(offset, true);
      emit();
      return;
    }
    const buf = running ? curBuf : buffers.get(idx);
    if (!buf) return;
    offset = Math.max(0, Math.min(0.999, frac)) * buf.duration;
    if (ctx && plugged && playing) begin(ctx.currentTime + 0.02);
    emit();
  }

  function toggleShuffle() { shuffle = !shuffle; emit(); }
  function cycleRepeat() {
    repeat = repeat === 'all' ? 'one' : repeat === 'one' ? 'off' : 'all';
    if (src && curBuf) src.loop = repeat === 'one';
    emit();
  }

  // 화면이 읽는 지금 상태. dur이 Infinity면 끝없는 합성 루프 (유튜브 곡은 길이를 알기 전까지). yt면 영상 창을 띄운다
  function info() {
    const buf = running ? curBuf : buffers.get(idx);
    const dur = isYt(idx) ? ytDur() || Infinity : buf ? buf.duration : Infinity;
    return {
      index: idx, count: TRACKS.length, title: TRACKS[idx].title, titles: TRACKS.map((x) => x.title),
      plugged, playing: plugged && playing, shuffle, repeat, yt: isYt(idx),
      cover: TRACKS[idx].cover || '', coverAlt: TRACKS[idx].alt || (TRACKS[idx].cover ? `${TRACKS[idx].title} 앨범 자켓` : ''),
      t: elapsed(), dur,
    };
  }
  // 곡 고르기 (목록에서)
  function pick(i) {
    if (i === idx) return;
    idx = (i + TRACKS.length) % TRACKS.length;
    offset = 0;
    if (ctx && plugged && playing) { crackle(ctx.currentTime, 0.08, 0.18); begin(ctx.currentTime + 0.06); } else { stopNow(); ytCue(idx); }
    emit();
  }

  // 지금 나가는 음악의 주파수별 세기(0~255)를 buf(Uint8Array, 1024칸)에 채운다. 아직 소리가 없으면 false
  // 유튜브 곡은 소리를 읽을 수 없어서, 저음 쪽이 센 잔잔한 가짜 세기로 실을 출렁이게 한다
  function spectrum(buf) {
    if (isYt(idx) && running) {
      const t = performance.now() / 1000;
      for (let k = 0; k < buf.length; k++) {
        const v = Math.exp(-k / 90) * (0.45 + 0.3 * Math.sin(t * 1.3 + k * 0.07) + 0.25 * Math.sin(t * 3.1 + k * 0.21));
        buf[k] = Math.max(0, Math.min(255, v * 230 * (ytVol / 100 / LEVEL)));
      }
      return true;
    }
    if (!scope) return false;
    scope.getByteFrequencyData(buf);
    return true;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (plugged) ctx.resume();
  });

  return {
    ensure, plugIn, unplug, play, pause, next: () => go(1), prev: () => go(-1), seek, pick,
    toggleShuffle, cycleRepeat, info, spectrum,
    debug: () => ({ state: ctx && ctx.state, plugged, playing, running, gain: music ? +music.gain.value.toFixed(3) : 0 }),
  };
})();
