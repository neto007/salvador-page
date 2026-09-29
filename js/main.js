(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };
  $$('.year').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ================= 8-bit SFX (WebAudio, off by default) ================= */
  let audio = null, sfxOn = store.get('sfx') === '1';
  const sfxBtn = $('#sfx');
  const syncSfx = () => { sfxBtn.textContent = 'SFX: ' + (sfxOn ? 'ON' : 'OFF'); sfxBtn.setAttribute('aria-pressed', sfxOn); };
  syncSfx();
  sfxBtn.addEventListener('click', () => { sfxOn = !sfxOn; store.set('sfx', sfxOn ? '1' : '0'); syncSfx(); beep('coin'); });
  function beep(kind) {
    if (!sfxOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      const presets = {
        coin: [['square', 988, 0], ['square', 1319, .07]],
        jump: [['square', 440, 0], ['square', 660, .05]],
        hit: [['sawtooth', 200, 0], ['sawtooth', 90, .12]],
        start: [['square', 523, 0], ['square', 659, .08], ['square', 784, .16], ['square', 1047, .24]],
        blip: [['square', 1200, 0]],
      }[kind] || [['square', 800, 0]];
      o.type = presets[0][0];
      presets.forEach(([, f, d]) => o.frequency.setValueAtTime(f, t + d));
      const end = t + presets[presets.length - 1][2] + .1;
      g.gain.setValueAtTime(.06, t);
      g.gain.exponentialRampToValueAtTime(.001, end);
      o.connect(g).connect(audio.destination);
      o.start(t); o.stop(end);
    } catch (e) {}
  }

  /* ================= PRESS START ================= */
  const start = $('#start');
  function pressStart() {
    if (start.classList.contains('gone')) return;
    start.classList.add('gone');
    document.body.classList.remove('locked');
    document.body.classList.add('started');
    try { sessionStorage.setItem('started', '1'); } catch (e) {}
    beep('start');
    startDialog();
  }
  let seen = false;
  try { seen = sessionStorage.getItem('started') === '1'; } catch (e) {}
  if (seen || reduceMotion) { start.classList.add('gone'); document.body.classList.add('started'); }
  else {
    document.body.classList.add('locked');
    start.addEventListener('click', pressStart);
    addEventListener('keydown', function once(e) { if (!start.classList.contains('gone')) { e.preventDefault(); pressStart(); } removeEventListener('keydown', once); });
  }

  /* ================= NAV ================= */
  const nav = $('.nav');
  const toggle = $('.nav-toggle'), links = $('.nav-links');
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', links.classList.toggle('open')));
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));

  /* ================= Reveal + counters ================= */
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    en.target.classList.add('in');
    io.unobserve(en.target);
  }), { threshold: 0.12 });
  $$('.reveal').forEach(el => io.observe(el));

  function countUp(el) {
    const target = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1);
      const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = target >= 9999 && p === 1 ? '9999+' : v;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  setTimeout(() => $$('[data-count]').forEach(countUp), seen ? 200 : 900);

  /* ================= RPG dialog ================= */
  const lines = [
    'Olá, viajante! Eu sou o Salvador — DevSecOps e Application Security há mais de 8 anos.',
    'Minha missão: colocar segurança dentro do fluxo de engenharia, sem virar gargalo. Shift-left de verdade.',
    'Pipelines com gates inteligentes, automação de plataforma, cloud com guardrails e muito compartilhamento de conhecimento.',
    'Role a página para explorar meu loadout, as quests que completei… e se aguentar, encare o Bug Hunt. ▶',
  ];
  const dText = $('#dialog-text'), dNext = $('#dialog-next');
  let li = 0, typing = null;
  function typeLine() {
    clearInterval(typing);
    const s = lines[li]; let i = 0;
    if (reduceMotion) { dText.textContent = s; return; }
    dText.textContent = '';
    typing = setInterval(() => {
      dText.textContent = s.slice(0, ++i);
      if (i % 3 === 0) beep('blip');
      if (i >= s.length) { clearInterval(typing); typing = null; }
    }, 28);
  }
  function nextLine() {
    if (typing) { clearInterval(typing); typing = null; dText.textContent = lines[li]; return; }
    li = (li + 1) % lines.length; typeLine();
  }
  dNext.addEventListener('click', nextLine);
  $('.dialog-box').addEventListener('click', e => { if (e.target !== dNext) nextLine(); });
  let dialogStarted = false;
  function startDialog() {
    if (dialogStarted) return;
    new IntersectionObserver(([en], obs) => { if (en.isIntersecting) { dialogStarted = true; typeLine(); obs.disconnect(); } }, { threshold: .5 }).observe($('.dialog'));
  }
  if (seen || reduceMotion) startDialog();

  /* ================= Loadout ================= */
  const items = [
    { name: 'Escudo AppSec', rarity: 'LENDÁRIO', desc: 'Secure code review, OWASP Top 10, ASVS e programa de AppSec de ponta a ponta.', tags: ['OWASP', 'ASVS', 'Secure SDLC'] },
    { name: 'Pipeline Gate', rarity: 'LENDÁRIO', desc: 'Gates de segurança em CI/CD que rodam a cada commit e só param o build no que é crítico.', tags: ['GitHub Actions', 'GitLab CI', 'Policy-as-code'] },
    { name: 'Lupa de Bugs', rarity: 'ÉPICO', desc: 'SAST, DAST e SCA integrados, com triagem e redução de falso positivo.', tags: ['Semgrep', 'SonarQube', 'OWASP ZAP'] },
    { name: 'Container Crate', rarity: 'ÉPICO', desc: 'Hardening de imagens, scan de containers e segurança de clusters Kubernetes.', tags: ['Docker', 'Kubernetes', 'Trivy'] },
    { name: 'Chave Mestra', rarity: 'RARO', desc: 'Gestão de segredos: detecção de vazamentos, cofres e rotação automatizada.', tags: ['Vault', 'Gitleaks', 'KMS'] },
    { name: 'Nuvem Blindada', rarity: 'ÉPICO', desc: 'Cloud security com IAM de menor privilégio, guardrails e IaC auditável.', tags: ['AWS', 'Terraform', 'CSPM'] },
    { name: 'Terminal +5', rarity: 'RARO', desc: 'Automação de plataforma e ferramentas internas para escalar segurança como serviço.', tags: ['Python', 'Bash', 'IaC'] },
    { name: 'Radar de Ameaças', rarity: 'ÉPICO', desc: 'Threat modeling desde o design, priorização por risco e monitoramento contínuo.', tags: ['STRIDE', 'Risk', 'Detection'] },
  ];
  const invBtns = $$('#inventory button');
  function showItem(i) {
    const it = items[i];
    invBtns.forEach(b => b.classList.toggle('on', +b.dataset.item === i));
    $('#item-icon').style.setProperty('--i', i);
    $('#item-rarity').textContent = '★ ' + it.rarity;
    $('#item-name').textContent = it.name;
    $('#item-desc').textContent = it.desc;
    $('#item-tags').innerHTML = it.tags.map(t => `<li>${t}</li>`).join('');
  }
  invBtns.forEach(b => {
    const i = +b.dataset.item;
    b.setAttribute('aria-label', items[i].name);
    b.addEventListener('mouseenter', () => { showItem(i); beep('blip'); });
    b.addEventListener('focus', () => showItem(i));
    b.addEventListener('click', () => { showItem(i); beep('coin'); });
  });
  showItem(0);

  /* ================= Quest filters ================= */
  $$('.filters button').forEach(btn => btn.addEventListener('click', () => {
    $$('.filters button').forEach(b => b.classList.toggle('on', b === btn));
    const f = btn.dataset.f;
    $$('.quest').forEach(q => q.classList.toggle('hide', f !== 'all' && q.dataset.cat !== f));
    beep('blip');
  }));

  /* ================= Scroll HUD — o personagem anda com o scroll ================= */
  const track = $('#hud-track'), player = $('#hud-player'), stageEl = $('#hud-stage'), xpEl = $('#hud-xp');
  const toastEl = $('#toast');
  const checkpoints = $$('[data-checkpoint]').slice(1).map(sec => {
    const flag = document.createElement('span'); flag.className = 'hud-flag'; track.appendChild(flag);
    const bug = document.createElement('span'); bug.className = 'hud-bug sprite'; track.appendChild(bug);
    return { sec, flag, bug, name: sec.dataset.checkpoint, hit: false };
  });
  let lastY = scrollY, walkTimer, toastTimer;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }
  function layoutHud() {
    const max = document.documentElement.scrollHeight - innerHeight;
    checkpoints.forEach(cp => {
      const p = Math.min(Math.max((cp.sec.offsetTop - innerHeight * .4) / max, 0), 1);
      cp.p = p;
      cp.flag.style.left = (p * 100) + '%';
      cp.bug.style.left = `calc(${p * 100}% - 26px)`;
    });
    updateHud();
  }
  function updateHud() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
    const w = track.clientWidth;
    player.style.left = (24 + p * (w - 48)) + 'px';
    xpEl.textContent = Math.round(p * 100);
    let stage = 'START';
    checkpoints.forEach(cp => {
      const reached = p >= cp.p - 0.002;
      if (reached) stage = cp.name;
      cp.flag.classList.toggle('hit', reached);
      if (reached && !cp.hit) {
        cp.hit = true; cp.bug.classList.add('dead');
        toast('CHECKPOINT · ' + cp.name); beep('coin');
      }
    });
    stageEl.textContent = stage;
  }
  addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', scrollY > 30);
    const dy = scrollY - lastY; lastY = scrollY;
    if (dy !== 0) player.classList.toggle('left', dy < 0);
    player.classList.add('walking');
    clearTimeout(walkTimer); walkTimer = setTimeout(() => player.classList.remove('walking'), 160);
    updateHud();
  }, { passive: true });
  addEventListener('resize', layoutHud);
  addEventListener('load', layoutHud);
  layoutHud();

  /* ================= Konami code → GOD MODE ================= */
  const konami = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;
  addEventListener('keydown', e => {
    kIdx = e.key.toLowerCase() === konami[kIdx].toLowerCase() ? kIdx + 1 : (e.key === konami[0] ? 1 : 0);
    if (kIdx === konami.length) {
      kIdx = 0; document.body.classList.toggle('god');
      toast(document.body.classList.contains('god') ? 'GOD MODE: ON · +30 LIVES' : 'GOD MODE: OFF'); beep('start');
    }
  });

  /* ================= BUG HUNT (mini game) ================= */
  const cv = $('#game'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, GROUND = H - 40;
  const overlay = $('#g-overlay'), msg = $('#g-msg'), scoreEl = $('#g-score'), hiEl = $('#g-hi');
  const load = src => { const im = new Image(); im.src = src; return im; };
  const img = { player: load('assets/game/player-walk.png'), bug: load('assets/game/bug-walk.png'), coin: load('assets/game/coin.png'), level: load('assets/game/level.webp') };
  const FR = { player: 4, bug: 4, coin: 6 };
  let hi = +store.get('bughunt-hi') || 0; hiEl.textContent = hi;
  let state = 'idle', g;

  function reset() {
    g = { t: 0, speed: 6, score: 0, y: GROUND, vy: 0, bugs: [], coins: [], spawn: 60, coinSpawn: 90, bgX: 0, pops: [] };
  }
  reset();

  const ok = im => im.complete && im.naturalWidth > 0;
  function drawSprite(im, frames, frame, x, y, w, h) {
    if (ok(im)) {
      const fw = im.naturalWidth / frames;
      ctx.drawImage(im, (frame % frames) * fw, 0, fw, im.naturalHeight, x, y, w, h);
    } else { ctx.fillStyle = '#00ff88'; ctx.fillRect(x + w * .2, y + h * .2, w * .6, h * .8); }
  }

  function jump() {
    if (state !== 'play') return;
    if (g.y >= GROUND - 0.5) { g.vy = -15.5; beep('jump'); }
  }

  function tick() {
    if (state !== 'play') return;
    g.t++;
    g.speed = 6 + Math.min(g.t / 600, 6);
    // physics
    g.vy += 0.9; g.y = Math.min(g.y + g.vy, GROUND);
    if (g.y === GROUND) g.vy = 0;
    // spawn bugs
    if (--g.spawn <= 0) {
      g.bugs.push({ x: W + 20 });
      g.spawn = 55 + Math.random() * 70 - Math.min(g.t / 50, 30);
    }
    if (--g.coinSpawn <= 0) {
      g.coins.push({ x: W + 20, y: GROUND - 90 - Math.random() * 70 });
      g.coinSpawn = 80 + Math.random() * 80;
    }
    g.bugs.forEach(b => (b.x -= g.speed));
    g.coins.forEach(c => (c.x -= g.speed));
    g.bugs = g.bugs.filter(b => b.x > -60);
    g.coins = g.coins.filter(c => c.x > -60 && !c.got);
    g.score += 1;

    // collisions (player box)
    const px = 90, pw = 30, ph = 62, py = g.y - ph;
    for (const b of g.bugs) {
      if (b.x < px + pw - 8 && b.x + 36 > px + 8 && GROUND - 30 < py + ph - 6) { return gameOver(); }
    }
    for (const c of g.coins) {
      if (c.x < px + pw && c.x + 30 > px && c.y < py + ph && c.y + 30 > py) {
        c.got = true; g.score += 150; g.pops.push({ x: c.x, y: c.y, t: 30 }); beep('coin');
      }
    }
    draw();
    requestAnimationFrame(tick);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    // parallax level
    if (ok(img.level)) {
      const lh = H, lw = img.level.naturalWidth * (lh / img.level.naturalHeight);
      g.bgX = (g.bgX - g.speed * .35) % lw;
      ctx.globalAlpha = .45;
      for (let x = g.bgX; x < W; x += lw) ctx.drawImage(img.level, x, 0, lw, lh);
      ctx.globalAlpha = 1;
    }
    // ground
    ctx.fillStyle = '#0f5f35'; ctx.fillRect(0, GROUND, W, 4);
    ctx.fillStyle = '#031a0c';
    for (let x = -((g.t * g.speed) % 32); x < W; x += 32) ctx.fillRect(x, GROUND + 8, 16, 8);
    // coins
    g.coins.forEach(c => drawSprite(img.coin, FR.coin, Math.floor(g.t / 5), c.x, c.y, 30, 30));
    // bugs
    g.bugs.forEach(b => drawSprite(img.bug, FR.bug, Math.floor(g.t / 6), b.x, GROUND - 34, 46, 34));
    // player
    const air = g.y < GROUND;
    drawSprite(img.player, FR.player, air ? 1 : Math.floor(g.t / 5), 86, g.y - 70, 38, 70);
    // pops
    ctx.fillStyle = '#c8ffe0'; ctx.font = '12px "Press Start 2P", monospace';
    g.pops.forEach(p => { ctx.fillText('+150', p.x, p.y - (30 - p.t)); p.t--; });
    g.pops = g.pops.filter(p => p.t > 0);
    scoreEl.textContent = g.score;
  }

  function gameOver() {
    state = 'over'; beep('hit');
    if (g.score > hi) { hi = g.score; store.set('bughunt-hi', hi); hiEl.textContent = hi; }
    msg.innerHTML = `GAME OVER<br><span style="font-size:.7em;color:#6f9c80">um bug passou pelo pipeline… SCORE ${g.score}</span>`;
    $('#g-start span').textContent = '↻ Tentar de novo';
    overlay.classList.remove('hidden');
  }
  function play() {
    reset(); state = 'play'; overlay.classList.add('hidden'); beep('start');
    requestAnimationFrame(tick);
  }
  $('#g-start').addEventListener('click', play);
  cv.addEventListener('pointerdown', jump);
  addEventListener('keydown', e => {
    if (state === 'play' && (e.code === 'Space' || e.key === 'ArrowUp')) { e.preventDefault(); jump(); }
  });
  // idle frame
  const idle = () => { if (state === 'idle') draw(); };
  Object.values(img).forEach(im => im.addEventListener('load', idle));
  idle();
})();
