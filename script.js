(() => {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayHint = document.getElementById("overlayHint");
  const startBtn = document.getElementById("startBtn");

  const CELLS = 20;
  const CELL = canvas.width / CELLS;
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  let snake, dir, queue, food, score, timer;
  let state = "idle"; // idle | playing | paused | over
  let best = 0;

  try { best = Number(localStorage.getItem("cobrinha-recorde")) || 0; } catch (e) {}
  bestEl.textContent = best;

  function reset() {
    snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dir = DIRS.right;
    queue = [];
    score = 0;
    scoreEl.textContent = 0;
    placeFood();
  }

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * CELLS),
        y: Math.floor(Math.random() * CELLS),
      };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function speed() {
    return Math.max(65, 140 - score * 3);
  }

  function turn(name) {
    const next = DIRS[name];
    const last = queue.length ? queue[queue.length - 1] : dir;
    if (next.x === -last.x && next.y === -last.y) return;
    if (next === last) return;
    if (queue.length < 2) queue.push(next);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS;
    const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) return gameOver();

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = score;
      if (score === CELLS * CELLS - 3) return gameOver(true);
      placeFood();
    } else {
      snake.pop();
    }
    draw();
    timer = setTimeout(step, speed());
  }

  function gameOver(won) {
    state = "over";
    clearTimeout(timer);
    draw();
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("cobrinha-recorde", best); } catch (e) {}
    }
    showOverlay(
      won ? "Você venceu!" : "Fim de jogo",
      `Você fez ${score} ponto${score === 1 ? "" : "s"}.`,
      "Jogar de novo"
    );
  }

  function showOverlay(title, hint, btn) {
    overlayTitle.textContent = title;
    overlayHint.textContent = hint;
    startBtn.textContent = btn;
    overlay.classList.remove("hidden");
  }

  function start() {
    clearTimeout(timer);
    reset();
    state = "playing";
    overlay.classList.add("hidden");
    draw();
    timer = setTimeout(step, speed());
  }

  function togglePause() {
    if (state === "playing") {
      state = "paused";
      clearTimeout(timer);
      showOverlay("Pausado", "Aperte espaço para continuar.", "Continuar");
    } else if (state === "paused") {
      state = "playing";
      overlay.classList.add("hidden");
      timer = setTimeout(step, speed());
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function mix(a, b, t) {
    return a.map((v, i) => Math.round(v + (b[i] - v) * t));
  }

  function draw() {
    ctx.fillStyle = "#121a33";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.035)";
    for (let x = 0; x < CELLS; x++) {
      for (let y = 0; y < CELLS; y++) {
        if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // comida
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.34, 0, Math.PI * 2);
    ctx.fill();

    // cobra: do roxo (cabeça) ao azul (cauda)
    const head = [167, 139, 250];
    const tail = [59, 130, 246];
    for (let i = snake.length - 1; i >= 0; i--) {
      const t = snake.length > 1 ? i / (snake.length - 1) : 0;
      const [r, g, b] = mix(head, tail, t);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = i === 0 ? 1 : 2;
      roundRect(snake[i].x * CELL + pad, snake[i].y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 6);
    }

    // olhos
    const h = snake[0];
    ctx.fillStyle = "#0b1020";
    const cx = h.x * CELL + CELL / 2;
    const cy = h.y * CELL + CELL / 2;
    const px = dir.y !== 0 ? 5 : 0;
    const py = dir.x !== 0 ? 5 : 0;
    const fx = dir.x * 4;
    const fy = dir.y * 4;
    [-1, 1].forEach((s) => {
      ctx.beginPath();
      ctx.arc(cx + fx + px * s, cy + fy + py * s, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // teclado
  const KEYS = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
  };
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (state === "idle" || state === "over") start();
      else togglePause();
      return;
    }
    const name = KEYS[e.key];
    if (name) {
      e.preventDefault();
      if (state === "idle" || state === "over") start();
      if (state === "playing") turn(name);
    }
  });

  // botões na tela
  document.querySelectorAll(".pad button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state === "playing") turn(btn.dataset.dir);
    });
  });

  // deslizar o dedo no tabuleiro
  let touch = null;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    if (!touch || state !== "playing") return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x;
    const dy = t.clientY - touch.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? "right" : "left");
    else turn(dy > 0 ? "down" : "up");
    touch = null;
  }, { passive: true });

  startBtn.addEventListener("click", () => {
    if (state === "paused") togglePause();
    else start();
  });

  reset();
  draw();
})();
