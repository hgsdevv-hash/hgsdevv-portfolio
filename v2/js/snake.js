// =========================================================
// hgsDevv | Pixel, a cobrinha (inspirada no jogo Snake)
// Anda sozinha pela faixa, persegue a maçã, come e cresce.
// Clicar na faixa solta uma maçã nova naquele ponto.
// =========================================================

(() => {
  const canvas = document.getElementById("snake");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("snakeScore");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const CELL = 8;          // tamanho de cada "pixel" do jogo (antes do zoom)
  const ZOOM = 1.25;       // aumenta o desenho todo mantendo o visual pixelado
  const STEP_MS = 110;     // velocidade: um passo a cada 110ms
  const MAX_LENGTH = 22;   // ao chegar aqui, a cobrinha "zera" e volta pequena
  const START_LENGTH = 5;

  let cols = 0;
  let rows = 0;
  let snake = [];
  let dir = { x: 1, y: 0 };
  let apple = null;
  let score = 0;
  let popups = [];          // textos "+1" que sobem e somem
  let flashUntil = 0;       // piscar quando a cobrinha "passa de fase"
  let running = false;
  let colors = {};

  // ---------- Cores vindas do CSS (respeita tema claro/escuro) ----------
  function readColors() {
    const s = getComputedStyle(document.documentElement);
    colors = {
      body: s.getPropertyValue("--snes-y").trim(),
      apple: s.getPropertyValue("--snes-a").trim(),
      leaf: s.getPropertyValue("--snes-y").trim(),
      eye: s.getPropertyValue("--bg").trim(),
      text: s.getPropertyValue("--accent").trim(),
    };
  }

  // ---------- Tamanho do canvas (nítido em telas retina) ----------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr * ZOOM, 0, 0, dpr * ZOOM, 0, 0);
    ctx.imageSmoothingEnabled = false;

    cols = Math.max(10, Math.floor(rect.width / ZOOM / CELL));
    rows = Math.max(3, Math.floor(rect.height / ZOOM / CELL));

    // mantém tudo dentro da área nova
    snake.forEach((p) => { p.x = Math.min(p.x, cols - 1); p.y = Math.min(p.y, rows - 1); });
    if (apple) { apple.x = Math.min(apple.x, cols - 1); apple.y = Math.min(apple.y, rows - 1); }
  }

  // ---------- Estado inicial ----------
  function reset() {
    const y = Math.floor(rows / 2);
    snake = Array.from({ length: START_LENGTH }, (_, i) => ({ x: START_LENGTH - i, y }));
    dir = { x: 1, y: 0 };
    spawnApple();
  }

  const onSnake = (x, y, skipTail = false) =>
    snake.some((p, i) => p.x === x && p.y === y && !(skipTail && i === snake.length - 1));

  function spawnApple(x, y) {
    if (x === undefined) {
      let tries = 0;
      do {
        x = Math.floor(Math.random() * cols);
        y = Math.floor(Math.random() * rows);
        tries++;
      } while ((onSnake(x, y) || Math.abs(x - snake[0].x) < 6) && tries < 60);
    }
    apple = { x, y, born: performance.now() };
  }

  // ---------- Inteligência simples: ir em direção à maçã ----------
  function chooseDirection() {
    const head = snake[0];
    const dx = Math.sign(apple.x - head.x);
    const dy = Math.sign(apple.y - head.y);

    const options = [];
    const horizontalFirst = Math.abs(apple.x - head.x) >= Math.abs(apple.y - head.y) || Math.random() < 0.15;
    if (horizontalFirst) {
      if (dx) options.push({ x: dx, y: 0 });
      if (dy) options.push({ x: 0, y: dy });
    } else {
      if (dy) options.push({ x: 0, y: dy });
      if (dx) options.push({ x: dx, y: 0 });
    }
    // alternativas para desviar do próprio corpo
    options.push(dir, { x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 });

    const valid = (d) => {
      if (d.x === -dir.x && d.y === -dir.y) return false;           // não pode dar ré
      const nx = head.x + d.x, ny = head.y + d.y;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return false; // não sai da faixa
      return !onSnake(nx, ny, true);
    };

    dir = options.find(valid) || options.find((d) => !(d.x === -dir.x && d.y === -dir.y)) || dir;
  }

  function step(now) {
    chooseDirection();
    const head = snake[0];
    const next = {
      x: Math.min(Math.max(head.x + dir.x, 0), cols - 1),
      y: Math.min(Math.max(head.y + dir.y, 0), rows - 1),
    };
    snake.unshift(next);

    if (next.x === apple.x && next.y === apple.y) {
      score++;
      scoreEl.textContent = score;
      popups.push({ x: next.x, y: next.y, born: now });

      if (snake.length >= MAX_LENGTH) {          // "passou de fase"
        snake.length = START_LENGTH;
        flashUntil = now + 600;
      }
      spawnApple();
    } else {
      snake.pop();
    }
  }

  // ---------- Desenho em pixel art ----------
  function drawApple(now) {
    const bounce = Math.max(0, 1 - (now - apple.born) / 300); // pulinho ao nascer
    const px = apple.x * CELL;
    const py = apple.y * CELL - Math.round(bounce * 4);

    ctx.fillStyle = colors.apple;
    ctx.fillRect(px + 1, py + 2, 6, 5);
    ctx.fillRect(px + 2, py + 1, 4, 7);
    ctx.fillStyle = "rgba(255,255,255,.55)";      // brilho
    ctx.fillRect(px + 2, py + 3, 1, 1);
    ctx.fillStyle = colors.leaf;                   // folhinha
    ctx.fillRect(px + 4, py, 2, 1);
  }

  function drawSnake(now) {
    const flashing = now < flashUntil && Math.floor(now / 100) % 2 === 0;
    if (flashing) return;

    snake.forEach((p, i) => {
      const px = p.x * CELL;
      const py = p.y * CELL;
      ctx.globalAlpha = i === 0 ? 1 : Math.max(0.45, 1 - i / (snake.length * 1.4));
      ctx.fillStyle = colors.body;
      ctx.fillRect(px, py, CELL - 1, CELL - 1);
    });
    ctx.globalAlpha = 1;

    // olhinho na cabeça, virado para onde ela anda
    const head = snake[0];
    const ex = head.x * CELL + (dir.x > 0 ? 4 : dir.x < 0 ? 1 : 2);
    const ey = head.y * CELL + (dir.y > 0 ? 4 : dir.y < 0 ? 1 : 2);
    ctx.fillStyle = colors.eye;
    ctx.fillRect(ex, ey, 2, 2);

    // linguinha de vez em quando
    if (Math.floor(now / 700) % 3 === 0) {
      ctx.fillStyle = colors.apple;
      ctx.fillRect(head.x * CELL + 3 + dir.x * 7, head.y * CELL + 3 + dir.y * 7, 1 + Math.abs(dir.x), 1 + Math.abs(dir.y));
    }
  }

  function drawPopups(now) {
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    popups = popups.filter((p) => now - p.born < 700);
    popups.forEach((p) => {
      const t = (now - p.born) / 700;
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = colors.text;
      ctx.fillText("+1", p.x * CELL + CELL / 2, Math.max(9, p.y * CELL - t * 14));
    });
    ctx.globalAlpha = 1;
  }

  function render(now) {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width / ZOOM, rect.height / ZOOM);
    drawApple(now);
    drawSnake(now);
    drawPopups(now);
  }

  // ---------- Loop em passos fixos, como no Snake clássico ----------
  // (pausa quando a faixa sai da tela)
  let timer = null;

  function tick() {
    const now = performance.now();
    step(now);
    render(now);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    timer = setInterval(tick, STEP_MS);
  }

  function stop() {
    running = false;
    clearInterval(timer);
  }

  // ---------- Interação: clique solta uma maçã ----------
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(cols - 1, Math.max(0, Math.floor((e.clientX - rect.left) / ZOOM / CELL)));
    const y = Math.min(rows - 1, Math.max(0, Math.floor((e.clientY - rect.top) / ZOOM / CELL)));
    if (!onSnake(x, y)) spawnApple(x, y);
    if (reduceMotion) render(performance.now());
  });

  // ---------- Início ----------
  readColors();
  resize();
  reset();
  render(performance.now());

  new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) start();
    else stop();
  }).observe(canvas);

  window.addEventListener("resize", () => { resize(); render(performance.now()); });

  // atualiza as cores quando o tema muda
  new MutationObserver(() => { readColors(); render(performance.now()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
})();
