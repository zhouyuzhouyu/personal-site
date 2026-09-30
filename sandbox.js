(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d', { alpha: false });

  const gravityEl = document.getElementById('gravity');
  const dragEl = document.getElementById('drag');
  const hueEl = document.getElementById('hue');
  const lifeEl = document.getElementById('life');
  const gVal = document.getElementById('gVal');
  const dVal = document.getElementById('dVal');
  const hVal = document.getElementById('hVal');
  const lVal = document.getElementById('lVal');
  const modeBtn = document.getElementById('mode');
  const hint = document.getElementById('hint');
  const help = document.getElementById('help');

  const modes = ['well', 'repel', 'vortex'];
  const modeNames = { well: '引力井', repel: '排斥源', vortex: '漩涡' };
  let mode = 'well';
  let particles = [];
  let pointer = { x: 0, y: 0, down: false, spray: false, id: null };
  let well = { x: 0, y: 0 };
  let hueBase = 210;
  let last = performance.now();
  let w = 0, h = 0, dpr = 1;

  const MAX = 2200;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!well.x && !well.y) {
      well.x = w * 0.5;
      well.y = h * 0.48;
    }
  }

  function syncLabels() {
    gVal.textContent = gravityEl.value;
    dVal.textContent = dragEl.value;
    hVal.textContent = hueEl.value;
    lVal.textContent = lifeEl.value;
  }

  function spawn(x, y, count = 1, boost = 0) {
    for (let i = 0; i < count; i++) {
      if (particles.length >= MAX) particles.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = (0.4 + Math.random() * 2.2) * (1 + boost);
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.55 + Math.random() * 0.45,
        age: 0,
        size: 0.8 + Math.random() * 2.4,
        hue: (hueBase + Math.random() * 40 - 20 + Number(hueEl.value)) % 360,
      });
    }
  }

  function burst(n = 180) {
    const cx = well.x, cy = well.y;
    for (let i = 0; i < n; i++) {
      if (particles.length >= MAX) particles.shift();
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.05;
      const sp = 2 + Math.random() * 5.5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.3,
        age: 0,
        size: 1 + Math.random() * 2.8,
        hue: (hueBase + i * 1.7 + Number(hueEl.value)) % 360,
      });
    }
  }

  function step(dt) {
    const g = Number(gravityEl.value) / 100;
    const drag = 1 - (Number(dragEl.value) / 100) * 0.08;
    const lifeMul = Number(lifeEl.value) / 70;
    const hueDrift = Number(hueEl.value) / 100;
    hueBase = (hueBase + hueDrift * 18 * dt) % 360;

    if (pointer.spray) spawn(pointer.x, pointer.y, 6);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const dx = well.x - p.x;
      const dy = well.y - p.y;
      const dist2 = dx * dx + dy * dy + 40;
      const dist = Math.sqrt(dist2);
      const force = (180 * g) / dist2;

      if (mode === 'well') {
        p.vx += (dx / dist) * force * dt * 60;
        p.vy += (dy / dist) * force * dt * 60;
      } else if (mode === 'repel') {
        p.vx -= (dx / dist) * force * 1.25 * dt * 60;
        p.vy -= (dy / dist) * force * 1.25 * dt * 60;
      } else {
        // vortex: tangential + mild attraction
        p.vx += (-dy / dist) * force * 1.4 * dt * 60 + (dx / dist) * force * 0.35 * dt * 60;
        p.vy += (dx / dist) * force * 1.4 * dt * 60 + (dy / dist) * force * 0.35 * dt * 60;
      }

      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx;
      p.y += p.vy;
      p.age += dt / (p.life * 4.5 * lifeMul);
      p.hue = (p.hue + hueDrift * 30 * dt) % 360;

      // soft wrap
      if (p.x < -40) p.x = w + 40;
      if (p.x > w + 40) p.x = -40;
      if (p.y < -40) p.y = h + 40;
      if (p.y > h + 40) p.y = -40;

      if (p.age >= 1) particles.splice(i, 1);
    }
  }

  function draw() {
    // fade trails
    ctx.fillStyle = 'rgba(5, 7, 15, 0.18)';
    ctx.fillRect(0, 0, w, h);

    // well glow
    const grd = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, 140);
    const glow = mode === 'repel' ? '255,120,140' : mode === 'vortex' ? '180,140,255' : '120,170,255';
    grd.addColorStop(0, `rgba(${glow},0.28)`);
    grd.addColorStop(1, 'rgba(5,7,15,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(well.x, well.y, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(${glow},0.55)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(well.x, well.y, 10 + Math.sin(performance.now() / 400) * 2, 0, Math.PI * 2);
    ctx.stroke();

    for (const p of particles) {
      const a = Math.max(0, 1 - p.age);
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 85%, ${55 + a * 20}%, ${0.15 + a * 0.75})`;
      ctx.arc(p.x, p.y, p.size * (0.6 + a), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function setPointer(e, down) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX ?? e.touches?.[0]?.clientX) - rect.left;
    pointer.y = (e.clientY ?? e.touches?.[0]?.clientY) - rect.top;
    if (down !== undefined) pointer.down = down;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    setPointer(e, true);
    pointer.id = e.pointerId;
    if (e.button === 2 || e.altKey) {
      pointer.spray = true;
      spawn(pointer.x, pointer.y, 20, 0.5);
    } else {
      well.x = pointer.x;
      well.y = pointer.y;
      spawn(pointer.x, pointer.y, 12);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    setPointer(e);
    if (!pointer.down || pointer.id !== e.pointerId) return;
    if (pointer.spray || e.buttons === 2) {
      pointer.spray = true;
      spawn(pointer.x, pointer.y, 8);
    } else {
      well.x = pointer.x;
      well.y = pointer.y;
      if (Math.random() < 0.35) spawn(pointer.x, pointer.y, 2);
    }
  });

  canvas.addEventListener('pointerup', () => {
    pointer.down = false;
    pointer.spray = false;
    pointer.id = null;
  });
  canvas.addEventListener('pointercancel', () => {
    pointer.down = false;
    pointer.spray = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // long-press spray on touch
  let pressTimer = null;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    setPointer(t, true);
    pressTimer = setTimeout(() => { pointer.spray = true; }, 280);
  }, { passive: true });
  canvas.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
    pointer.spray = false;
    pointer.down = false;
  });

  document.getElementById('burst').onclick = () => burst();
  document.getElementById('clear').onclick = () => { particles = []; };
  modeBtn.onclick = () => {
    mode = modes[(modes.indexOf(mode) + 1) % modes.length];
    modeBtn.textContent = `模式：${modeNames[mode]}`;
    hint.textContent = mode === 'vortex'
      ? '漩涡会把星尘卷成银河臂 · 空格爆发'
      : mode === 'repel'
        ? '排斥源把粒子推开 · 试试画一圈墙'
        : '左键拖拽移动 · 右键 / 长按喷粒子 · 空格爆发';
  };

  [gravityEl, dragEl, hueEl, lifeEl].forEach((el) => el.addEventListener('input', syncLabels));
  document.getElementById('helpBtn').onclick = () => help.classList.remove('hidden');
  document.getElementById('closeHelp').onclick = () => help.classList.add('hidden');
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); burst(); }
    if (e.key === 'c' || e.key === 'C') particles = [];
    if (e.key === 'm' || e.key === 'M') modeBtn.click();
  });

  window.addEventListener('resize', resize);
  resize();
  syncLabels();
  // seed sky
  for (let i = 0; i < 120; i++) {
    spawn(Math.random() * w, Math.random() * h, 1, 0.2);
  }
  burst(90);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, w, h);
  requestAnimationFrame(frame);
})();
