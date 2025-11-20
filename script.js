// =============================================================
//            PAJI FLAPPY GAME — FINAL PROFESSIONAL VERSION
// =============================================================

// CANVAS ------------------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = true;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", () => location.reload());

let W = canvas.width;
let H = canvas.height;
let base = Math.min(W, H);

// GAME CONFIG -------------------------------------
let gap = base * 0.50;
let pipeWidth = base * 0.12;
let gravity = base * 0.0018;
let jumpPower = -base * 0.022;
let pipeSpeed = base * 0.004;
let bgScroll = base * 0.0014;

let pipes = [];
let score = 0;
let bestScore = 0;

let gameState = "ready";

let bgX1 = 0;
let bgX2 = W;

// ASSETS -------------------------------------------
const bgImg = new Image();
bgImg.src = "assets/background.png";

const playerImg = new Image();
playerImg.src = "assets/player.png";

function safeAudio(path) {
  let a = new Audio();
  a.src = path;
  a.onerror = () => console.warn("Missing:", path);
  return a;
}

let bgm = safeAudio("assets/bgm.mp3");
let flap = safeAudio("assets/flap.wav");
let hit = safeAudio("assets/hit.wav");
let point = safeAudio("assets/point.wav");

bgm.loop = true;
bgm.volume = 0.45;

// PLAYER -------------------------------------------
let player = {
  x: W * 0.28,
  y: H * 0.45,
  width: base * 0.12,
  height: base * 0.15,
  vy: 0,
  angle: 0
};

// AUTO CROP PNG ------------------------------------
function autoCrop(img, done) {
  let t = document.createElement("canvas");
  let tctx = t.getContext("2d");

  t.width = img.width;
  t.height = img.height;
  tctx.drawImage(img, 0, 0);

  let d = tctx.getImageData(0, 0, img.width, img.height).data;
  let minX = img.width, minY = img.height, maxX = 0, maxY = 0;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 10) {
      let idx = i / 4;
      let x = idx % img.width;
      let y = Math.floor(idx / img.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  let w = maxX - minX;
  let h = maxY - minY;

  let c = document.createElement("canvas");
  let cctx = c.getContext("2d");
  c.width = w;
  c.height = h;

  cctx.drawImage(img, minX, minY, w, h, 0, 0, w, h);

  let newImg = new Image();
  newImg.onload = () => done(newImg);
  newImg.src = c.toDataURL();
}

// LOAD IMAGES ---------------------------------------
let loaded = 0;
function checkLoad() {
  loaded++;
  if (loaded === 2) {
    autoCrop(playerImg, clean => playerImg.src = clean.src);
  }
}

bgImg.onload = checkLoad;
playerImg.onload = checkLoad;

// RESET GAME -----------------------------------------
function resetGame() {
  pipes = [];
  score = 0;

  player.y = H * 0.45;
  player.vy = 0;
  player.angle = 0;

  bgX1 = 0;
  bgX2 = W;

  document.getElementById("gameOverMenu").style.display = "none";
  document.getElementById("shareNote").style.display = "none";

  gameState = "ready";
}function gameOver() {
  if (gameState !== "gameover") {

    // Stop background music
    bgm.pause();
    bgm.currentTime = 0;

    // Play ouch.mp4 from 0:06 to 0:09
    ouchSfx.pause();
    ouchSfx.currentTime = 6;
    ouchSfx.play();

    // Stop ouch at exactly 9 seconds
    setTimeout(() => {
      ouchSfx.pause();
    }, 3000); // plays 3 seconds (6 → 9)

    // Optional hit sound
    hit.play();

    gameState = "gameover";

    if (score > bestScore) bestScore = score;
    document.getElementById("bestScoreUI").innerText = "Best: " + bestScore;

    document.getElementById("finalScore").innerText = "Your Score: " + score;

    document.getElementById("gameOverMenu").style.display = "block";
    document.getElementById("shareNote").style.display = "block";
  }
}


// SPAWN PIPE ------------------------------------------
function spawnPipe() {
  let minTop = base * 0.15;
  let maxTop = H - gap - base * 0.15;

  let topHeight = Math.random() * (maxTop - minTop) + minTop;

  pipes.push({
    x: W,
    top: topHeight,
    passed: false
  });
}

// COLLISION -------------------------------------------
function circleVsRect(cx, cy, r, rx, ry, rw, rh) {
  let x = Math.max(rx, Math.min(cx, rx + rw));
  let y = Math.max(ry, Math.min(cy, ry + rh));
  let dx = cx - x;
  let dy = cy - y;
  return dx * dx + dy * dy < r * r;
}

// INPUT -----------------------------------------------
function flapNow() {
  if (gameState === "ready") {
    gameState = "playing";
    bgm.currentTime = 35;
    bgm.play();
  }

  if (gameState === "playing") {
    player.vy = jumpPower;
    flap.play();
  }
}

document.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp") flapNow();
});

canvas.addEventListener("mousedown", flapNow);
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  flapNow();
}, { passive: false });

// UPDATE ----------------------------------------------
let lastTime = performance.now();
let pipeTimer = 0;

function update(dt) {
  let d = dt / 16.67;

  if (gameState === "playing") {
    player.vy += gravity * d;
    player.y += player.vy * d;

    player.angle = Math.max(-0.6, Math.min(1.2, player.vy * 0.04));

    if (player.y + player.height > H) gameOver();
    if (player.y < 0) player.y = 0;

    pipeTimer += dt;
    if (pipeTimer > 1350) {
      spawnPipe();
      pipeTimer = 0;
    }

    let cx = player.x + player.width / 2;
    let cy = player.y + player.height / 2;
    let r = player.width * 0.30;

    pipes = pipes.filter(p => {
      p.x -= pipeSpeed * d;

      if (circleVsRect(cx, cy, r, p.x, 0, pipeWidth, p.top)) gameOver();
      if (circleVsRect(cx, cy, r, p.x, p.top + gap, pipeWidth, H)) gameOver();

      if (!p.passed && p.x + pipeWidth < player.x) {
        p.passed = true;
        score++;
        point.play();
      }

      return p.x + pipeWidth > 0;
    });
  }

  bgX1 -= bgScroll * d;
  bgX2 -= bgScroll * d;

  if (bgX1 + W < 0) bgX1 = bgX2 + W;
  if (bgX2 + W < 0) bgX2 = bgX1 + W;
}

// DRAW PIPES ------------------------------------------
function drawPipes() {
  pipes.forEach(p => {
    let green = "#7ED957";
    let dark = "#5CAA34";
    let light = "#C9FFB2";

    ctx.fillStyle = green;
    ctx.fillRect(p.x, 0, pipeWidth, p.top);

    ctx.fillStyle = dark;
    ctx.fillRect(p.x, 0, pipeWidth * 0.12, p.top);

    ctx.fillStyle = light;
    ctx.fillRect(p.x + pipeWidth * 0.88, 0, pipeWidth * 0.12, p.top);

    ctx.fillStyle = dark;
    ctx.fillRect(p.x - 4, p.top - 18, pipeWidth + 8, 18);

    let bottomY = p.top + gap;
    ctx.fillStyle = green;
    ctx.fillRect(p.x, bottomY, pipeWidth, H);

    ctx.fillStyle = dark;
    ctx.fillRect(p.x, bottomY, pipeWidth * 0.12, H);

    ctx.fillStyle = light;
    ctx.fillRect(p.x + pipeWidth * 0.88, bottomY, pipeWidth * 0.12, H);

    ctx.fillStyle = dark;
    ctx.fillRect(p.x - 4, bottomY, pipeWidth + 8, 18);
  });
}

// DRAW -------------------------------------------------
function draw() {
  ctx.clearRect(0, 0, W, H);

  ctx.drawImage(bgImg, bgX1, 0, W, H);
  ctx.drawImage(bgImg, bgX2, 0, W, H);

  drawPipes();

  ctx.save();
  ctx.translate(player.x + player.width/2, player.y + player.height/2);
  ctx.rotate(player.angle);
  ctx.drawImage(playerImg, -player.width/2, -player.height/2, player.width, player.height);
  ctx.restore();

  if (gameState === "ready") {
    ctx.fillStyle = "white";
    ctx.font = `${base * 0.07}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("Tap to Start", W/2, H * 0.45);
  }

  if (gameState === "playing") {
    ctx.fillStyle = "white";
    ctx.font = `${base * 0.09}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(score, W/2, H * 0.12);
  }
}

// SHARE BUTTONS ---------------------------------------
document.getElementById("restartBtn").onclick = resetGame;



document.getElementById("shareLinkBtn").onclick = () => {
  const url = window.location.href;

  const shareMsg =
    `🔥 I scored ${score} in Paji Flappy Game!\n` +
    `Can you beat my score? 😈🔥\n\n` +
    `Play here 👉 ${url}\n\n` +
    `Don't forget to tag @aukay25 ❤️🔥`;

  navigator.clipboard.writeText(shareMsg)
    .then(() => {
      showToast("Link copied ✔");
    })
    .catch(() => {
      showToast("Copy failed ❌");
    });
};


// LOOP -------------------------------------------------
function loop(now) {
  let dt = now - lastTime;
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
// SAVE STORY IMAGE WITH SCORE
document.getElementById("saveStoryBtn").onclick = () => {

  setTimeout(() => {
    const shot = canvas.toDataURL("image/png");

    let a = document.createElement("a");
    a.download = `paji-story-score-${score}.png`;
    a.href = shot;
    a.click();

    // SHOW SIMPLE SUCCESS POPUP
    showToast("Image saved successfully ✔");

  }, 120);
};


function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}
let ouchSfx = safeAudio("assets/ouch.mp3");
ouchSfx.volume = 1.0;
