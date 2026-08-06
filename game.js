/* =======================================================================
 * SPACE ADVENTURES - GAME.JS
 * Main javascript implementation for the Space Adventures game
 * ======================================================================= */

/* =======================================================================
 * SECTION 1: CANVAS SETUP
 * ======================================================================= */
const canvas = document.getElementById("gameCanvas");
const gameContainer = document.getElementById("gameContainer");

function setCanvasSize() {
  canvas.width = gameContainer.clientWidth;
  canvas.height = gameContainer.clientHeight;
}
setCanvasSize();
window.addEventListener("resize", () => {
  setCanvasSize();
  initStarLayers();
});

const ctx = canvas.getContext("2d");

/* =======================================================================
 * SECTION 2: GAME STATE VARIABLES
 * ======================================================================= */
let gameState = "main"; // "main", "playing", "gameover"
let score = 0;
let currentPlayer = "";
let lastGameOverPlayer = null;
let newlyUnlockedThisRun = [];

/* =======================================================================
 * SECTION 3: GAME SETTINGS
 * ======================================================================= */
const settings = {
  sound: true
};

/* =======================================================================
 * SECTION 4: AUDIO ELEMENTS
 * ======================================================================= */
// Background music
const backgroundMusic = new Audio("assets/Galactic Dreams.mp3");
backgroundMusic.loop = true;

// Sound effects
const jumpSound = new Audio("assets/jump.mp3");
const collisionSound = new Audio("assets/collision.mp3");
const gameOverSound = new Audio("assets/Game Over.mp3");

function playSound(sound) {
  if (settings.sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.log("Audio play failed:", error);
      // Often due to user not interacting with page yet
    });
  }
}

/* =======================================================================
 * SECTION 5: SPACESHIP SETTINGS
 * ======================================================================= */
const ship = {
  x: 50,
  y: 0,
  width: 40,
  height: 40,
  velocity: 0,
  gravity: 0.5,
  jumpStrength: -8,
  thrusterParticles: [],
  shielded: false,
  invulnerableUntil: 0
};

/* =======================================================================
 * SECTION 6: OBSTACLE SETTINGS
 * ======================================================================= */
const obstacleWidth = 80;
const obstacleGap = 200; // Fixed gap for consistent difficulty
const obstacleSpeed = 5; // Base speed (modified by slow-mo power-up)
const obstacleInterval = 1700; // ms between obstacles - consistent
let obstacles = [];
let lastObstacleTime = Date.now() - obstacleInterval + 50;

/* Returns the current effective scroll speed, accounting for the
   slow-mo power-up. Used by obstacles, stars, and power-ups so the
   whole scene slows down together. */
function currentSpeed() {
  return activeEffects.slowmoUntil > Date.now() ? obstacleSpeed * 0.45 : obstacleSpeed;
}

/* =======================================================================
 * SECTION 7: GAMIFICATION - COMBO / SCORE MULTIPLIER
 * ======================================================================= */
const PERFECT_ZONE_RATIO = 0.2; // ship must be within 20% of the gap height from center
const COMBO_STEP = 5;           // every N perfect passes in a row bumps the multiplier
const COMBO_MULTIPLIER_STEP = 0.5;
const COMBO_MULTIPLIER_MAX = 3;

let comboStreak = 0;
let comboMultiplier = 1;
let runStats = { perfectBestStreak: 0, powerupsCollected: 0, shieldSaves: 0 };

/* =======================================================================
 * SECTION 8: GAMIFICATION - POWER-UPS
 * ======================================================================= */
const POWERUP_RADIUS = 18;
const POWERUP_SPAWN_MIN = 7000;
const POWERUP_SPAWN_MAX = 12000;
const POWERUP_TYPES = {
  shield: { icon: "🛡️", color: "#38bdf8", label: "Shield" },
  slowmo: { icon: "⏳", color: "#a78bfa", label: "Slow-Mo", duration: 4500 },
  boost:  { icon: "✨", color: "#facc15", label: "Score x2", duration: 8000 }
};

let powerups = [];
let lastPowerupTime = Date.now();
let nextPowerupDelay = randomPowerupDelay();
const activeEffects = { slowmoUntil: 0, boostUntil: 0 };

function randomPowerupDelay() {
  return POWERUP_SPAWN_MIN + Math.random() * (POWERUP_SPAWN_MAX - POWERUP_SPAWN_MIN);
}

function maybeSpawnPowerup() {
  if (Date.now() - lastPowerupTime > nextPowerupDelay) {
    spawnPowerup();
    lastPowerupTime = Date.now();
    nextPowerupDelay = randomPowerupDelay();
  }
}

function spawnPowerup() {
  const types = Object.keys(POWERUP_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const margin = 90;
  const y = margin + Math.random() * (canvas.height - margin * 2);
  powerups.push({ x: canvas.width + 40, y, type, collected: false });
}

function updatePowerups() {
  if (gameState !== "playing") return;
  const speed = currentSpeed();

  powerups.forEach(p => { p.x -= speed; });

  const shipCenterX = ship.x + ship.width / 2;
  const shipCenterY = ship.y + ship.height / 2;
  powerups.forEach(p => {
    if (p.collected) return;
    const dx = shipCenterX - p.x;
    const dy = shipCenterY - p.y;
    if (Math.sqrt(dx * dx + dy * dy) < POWERUP_RADIUS + ship.width / 2.5) {
      p.collected = true;
      collectPowerup(p.type);
    }
  });

  powerups = powerups.filter(p => !p.collected && p.x + POWERUP_RADIUS > 0);

  maybeSpawnPowerup();
}

function collectPowerup(type) {
  const def = POWERUP_TYPES[type];
  playSound(jumpSound);

  if (type === "shield") {
    ship.shielded = true;
    pushToast("Shield Ready", def.icon, def.color, 2200, "Power-Up!");
  } else if (type === "slowmo") {
    activeEffects.slowmoUntil = Date.now() + def.duration;
    pushToast("Slow-Mo", def.icon, def.color, 2200, "Power-Up!");
  } else if (type === "boost") {
    activeEffects.boostUntil = Date.now() + def.duration;
    pushToast("Score x2", def.icon, def.color, 2200, "Power-Up!");
  }

  runStats.powerupsCollected++;
  const total = incrementPlayerStat("powerupsCollected");
  if (total >= 15) unlockAchievement("powerup_collector");
}

function drawPowerups() {
  powerups.forEach(p => {
    if (p.collected) return;
    const def = POWERUP_TYPES[p.type];
    const pulse = Math.sin(Date.now() * 0.005) * 3;

    ctx.save();
    const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, POWERUP_RADIUS + 10 + pulse);
    glow.addColorStop(0, def.color + "55");
    glow.addColorStop(1, def.color + "00");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, POWERUP_RADIUS + 10 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 15, 40, 0.85)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, POWERUP_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.icon, p.x, p.y + 1);
    ctx.restore();
  });
}

/* =======================================================================
 * SECTION 9: GAMIFICATION - ACHIEVEMENTS
 * ======================================================================= */
const ACHIEVEMENTS = [
  { id: "first_flight",      icon: "🚀", name: "First Flight",         desc: "Play your very first game." },
  { id: "score_10",          icon: "🎯", name: "Getting Started",      desc: "Score 10 points in one run." },
  { id: "score_25",          icon: "🔥", name: "On Fire",              desc: "Score 25 points in one run." },
  { id: "score_50",          icon: "🌟", name: "Space Ace",            desc: "Score 50 points in one run." },
  { id: "score_100",         icon: "👑", name: "Legend",               desc: "Score 100 points in one run." },
  { id: "combo_5",           icon: "⚡", name: "In The Zone",          desc: "Reach a 5x perfect-pass streak." },
  { id: "combo_10",          icon: "💫", name: "Untouchable",          desc: "Reach a 10x perfect-pass streak." },
  { id: "shield_save",       icon: "🛡️", name: "Saved By The Shield",  desc: "Survive a hit using a shield power-up." },
  { id: "powerup_collector", icon: "🧲", name: "Collector",            desc: "Collect 15 power-ups (lifetime)." },
  { id: "veteran",           icon: "🕹️", name: "Veteran Pilot",        desc: "Play 10 games." },
  { id: "century_club",      icon: "💯", name: "Century Club",         desc: "Reach 100 lifetime total score." }
];

function unlockAchievement(id) {
  if (!currentPlayer) return;
  const players = getPlayers();
  const player = players.find(p => p.name === currentPlayer);
  if (!player) return;
  if (!player.unlockedAchievements) player.unlockedAchievements = [];
  if (player.unlockedAchievements.includes(id)) return;

  player.unlockedAchievements.push(id);
  savePlayers(players);

  const def = ACHIEVEMENTS.find(a => a.id === id);
  if (def) {
    newlyUnlockedThisRun.push(def);
    pushToast(def.name, def.icon, "#ffd700", 3200, "Achievement Unlocked!");
  }
}

function checkScoreAchievements() {
  if (score >= 10) unlockAchievement("score_10");
  if (score >= 25) unlockAchievement("score_25");
  if (score >= 50) unlockAchievement("score_50");
  if (score >= 100) unlockAchievement("score_100");
}

function checkComboAchievements() {
  if (comboStreak >= 5) unlockAchievement("combo_5");
  if (comboStreak >= 10) unlockAchievement("combo_10");
}

/* =======================================================================
 * SECTION 10: TOAST NOTIFICATIONS
 * ======================================================================= */
const toastContainer = document.getElementById("toastContainer");

function pushToast(title, icon, color, duration = 2600, subtitle = null) {
  if (!toastContainer) return;
  const el = document.createElement("div");
  el.className = "game-toast";
  el.style.setProperty("--accent", color);
  el.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">
      ${subtitle ? `<span class="toast-subtitle">${subtitle}</span>` : ""}
      <span class="toast-title">${title}</span>
    </span>
  `;
  toastContainer.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hide");
    setTimeout(() => el.remove(), 400);
  }, duration);
}

/* =======================================================================
 * SECTION 11: FLOATING SCORE POPUPS
 * ======================================================================= */
let floatingTexts = [];

function spawnFloatingText(x, y, text, color = "#fff") {
  floatingTexts.push({ x, y, text, color, life: 45, maxLife: 45 });
}

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y -= 0.8;
    t.life--;
    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  floatingTexts.forEach(t => {
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  });
}

/* =======================================================================
 * SECTION 12: BACKGROUND / STARS WITH PARALLAX
 * ======================================================================= */
let starLayers = [
  { stars: [], speed: 0.1, count: 80, minRadius: 0.2, maxRadius: 0.8 }, // Distant stars
  { stars: [], speed: 0.3, count: 50, minRadius: 0.5, maxRadius: 1.5 }, // Medium stars
  { stars: [], speed: 0.8, count: 20, minRadius: 1.0, maxRadius: 2.5 }  // Close stars
];

function initStarLayers() {
  starLayers.forEach(layer => {
    layer.stars = [];
    for (let i = 0; i < layer.count; i++) {
      layer.stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * (layer.maxRadius - layer.minRadius) + layer.minRadius,
        brightness: Math.random() * 0.5 + 0.5 // Randomize star brightness
      });
    }
  });
}

function updateStarLayers() {
  const speed = currentSpeed();
  starLayers.forEach(layer => {
    layer.stars.forEach(star => {
      star.x -= layer.speed * speed;
      if (star.x < 0) {
        star.x = canvas.width;
        star.y = Math.random() * canvas.height;
      }
    });
  });
}

function drawStarLayers() {
  starLayers.forEach(layer => {
    layer.stars.forEach(star => {
      // Oscillating brightness for twinkling effect
      const twinkle = Math.sin(Date.now() * 0.001 + star.brightness * 10) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function drawSpaceBackground() {
  // Create a deeper space gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#000933");
  gradient.addColorStop(0.5, "#001255");
  gradient.addColorStop(1, "#000933");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updateStarLayers();
  drawStarLayers();
}

// Initialize stars on startup
initStarLayers();

/* =======================================================================
 * SECTION 13: SHIP FUNCTIONS
 * ======================================================================= */
function spawnExplosion(x, y) {
  for (let i = 0; i < 24; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    ship.thrusterParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: Math.random() * 3 + 2
    });
  }
}

function updateShipWithEffects() {
  if (gameState === "playing") {
    ship.velocity += ship.gravity;
    ship.y += ship.velocity;

    // Spawn new thruster particles
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.7) {
        ship.thrusterParticles.push({
          x: ship.x,
          y: ship.y + ship.height / 2,
          vx: -Math.random() * 3 - 1,
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          maxLife: 20,
          size: Math.random() * 3 + 1
        });
      }
    }
  }

  // Always age existing particles (so explosion bursts finish after game over)
  for (let i = ship.thrusterParticles.length - 1; i >= 0; i--) {
    const p = ship.thrusterParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) ship.thrusterParticles.splice(i, 1);
  }
}

function drawShipWithEffects() {
  // Draw thruster / explosion particles
  ship.thrusterParticles.forEach(p => {
    const alpha = p.life / p.maxLife;
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha})`);
    gradient.addColorStop(1, `rgba(255, 100, 0, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });

  if (gameState !== "playing") return;

  // Draw ship glow
  ctx.save();
  const glowSize = 15;
  const glowGradient = ctx.createRadialGradient(
    ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width / 3,
    ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width / 2 + glowSize
  );
  glowGradient.addColorStop(0, "rgba(100, 150, 255, 0.2)");
  glowGradient.addColorStop(1, "rgba(100, 150, 255, 0)");

  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(ship.x + ship.width / 2, ship.y + ship.height / 2,
          ship.width / 2 + glowSize, 0, Math.PI * 2);
  ctx.fill();

  // Draw shield ring while active
  if (ship.shielded) {
    const t = Date.now() * 0.006;
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 + Math.sin(t) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width / 2 + 10, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw actual ship
  ctx.translate(ship.x + ship.width / 2, ship.y + ship.height / 2);

  // Add slight tilt based on velocity
  const tiltAngle = Math.max(-0.2, Math.min(0.2, ship.velocity * 0.02));
  ctx.rotate(Math.PI / 4 + tiltAngle);

  // Draw ship emoji with shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 255, 0.8)';
  ctx.shadowBlur = 10;
  ctx.font = "40px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🚀", 0, 0);
  ctx.restore();
}

/* =======================================================================
 * SECTION 14: OBSTACLE FUNCTIONS
 * ======================================================================= */
function createObstacle() {
  const gapY = Math.floor(Math.random() * (canvas.height - obstacleGap - 100)) + 50;
  const topObs = {
    x: canvas.width,
    y: 0,
    width: obstacleWidth,
    height: gapY
  };
  const bottomObs = {
    x: canvas.width,
    y: gapY + obstacleGap,
    width: obstacleWidth,
    height: canvas.height - (gapY + obstacleGap)
  };
  return { topObs, bottomObs, scored: false };
}

function updateObstacles() {
  if (gameState === "playing") {
    const speed = currentSpeed();
    obstacles.forEach(obsPair => {
      obsPair.topObs.x -= speed;
      obsPair.bottomObs.x -= speed;
    });

    obstacles = obstacles.filter(obsPair => obsPair.topObs.x + obstacleWidth > 0);

    if (Date.now() - lastObstacleTime > obstacleInterval) {
      obstacles.push(createObstacle());
      lastObstacleTime = Date.now();
    }
  }
}

function drawObstacles() {
  obstacles.forEach(obsPair => {
    const gradTop = ctx.createLinearGradient(
      obsPair.topObs.x, 0,
      obsPair.topObs.x + obstacleWidth, 0
    );
    gradTop.addColorStop(0, "#8a2be2");
    gradTop.addColorStop(1, "#da70d6");
    ctx.fillStyle = gradTop;
    ctx.fillRect(obsPair.topObs.x, obsPair.topObs.y, obsPair.topObs.width, obsPair.topObs.height);

    const gradBottom = ctx.createLinearGradient(
      obsPair.bottomObs.x, 0,
      obsPair.bottomObs.x + obstacleWidth, 0
    );
    gradBottom.addColorStop(0, "#8a2be2");
    gradBottom.addColorStop(1, "#da70d6");
    ctx.fillStyle = gradBottom;
    ctx.fillRect(obsPair.bottomObs.x, obsPair.bottomObs.y, obsPair.bottomObs.width, obsPair.bottomObs.height);
  });
}

/* =======================================================================
 * SECTION 15: COLLISION HANDLING (with shield support)
 * ======================================================================= */
function flashScreen(color = "rgba(56, 189, 248, 0.35)") {
  gameContainer.style.boxShadow = `inset 0 0 60px 20px ${color}`;
  setTimeout(() => { gameContainer.style.boxShadow = ""; }, 250);
}

function handleCollision() {
  if (gameState !== "playing") return "none";
  if (Date.now() < ship.invulnerableUntil) return "none";

  const hitBounds = ship.y < 0 || ship.y + ship.height > canvas.height;
  let hitObstacle = false;

  if (!hitBounds) {
    for (const obsPair of obstacles) {
      if (
        ship.x < obsPair.topObs.x + obsPair.topObs.width &&
        ship.x + ship.width > obsPair.topObs.x &&
        ship.y < obsPair.topObs.y + obsPair.topObs.height
      ) { hitObstacle = true; break; }
      if (
        ship.x < obsPair.bottomObs.x + obsPair.bottomObs.width &&
        ship.x + ship.width > obsPair.bottomObs.x &&
        ship.y + ship.height > obsPair.bottomObs.y
      ) { hitObstacle = true; break; }
    }
  }

  if (!hitBounds && !hitObstacle) return "none";

  // Shields absorb obstacle hits, but not flying off the top/bottom of the screen
  if (ship.shielded && hitObstacle && !hitBounds) {
    ship.shielded = false;
    ship.invulnerableUntil = Date.now() + 700;
    runStats.shieldSaves++;
    unlockAchievement("shield_save");
    pushToast("Shield Absorbed Hit!", "🛡️", "#38bdf8", 2400);
    flashScreen();
    return "shielded";
  }

  return "fatal";
}

/* =======================================================================
 * SECTION 16: SCORING WITH COMBO MULTIPLIER
 * ======================================================================= */
function updateScore() {
  if (gameState !== "playing") return;

  obstacles.forEach(obsPair => {
    if (obsPair.scored) return;
    if (obsPair.topObs.x + obstacleWidth >= ship.x) return;

    obsPair.scored = true;

    const gapCenterY = obsPair.topObs.height + obstacleGap / 2;
    const shipCenterY = ship.y + ship.height / 2;
    const isPerfect = Math.abs(shipCenterY - gapCenterY) < obstacleGap * PERFECT_ZONE_RATIO;

    const boostActive = activeEffects.boostUntil > Date.now();
    const points = Math.round(1 * comboMultiplier * (boostActive ? 2 : 1));
    score += points;

    spawnFloatingText(
      ship.x + ship.width / 2, ship.y - 6,
      (isPerfect ? "PERFECT +" : "+") + points,
      isPerfect ? "#4ade80" : "#ffffff"
    );

    if (isPerfect) {
      comboStreak++;
      if (comboStreak > runStats.perfectBestStreak) runStats.perfectBestStreak = comboStreak;
      if (comboStreak % COMBO_STEP === 0) {
        comboMultiplier = Math.min(COMBO_MULTIPLIER_MAX, 1 + (comboStreak / COMBO_STEP) * COMBO_MULTIPLIER_STEP);
        pushToast(`Combo x${comboMultiplier.toFixed(1)}!`, "🔥", "#fb923c", 1800);
      }
    } else {
      comboStreak = 0;
      comboMultiplier = 1;
    }

    checkComboAchievements();
    checkScoreAchievements();
  });
}

/* =======================================================================
 * SECTION 17: HUD (scoreboard, combo, power-ups)
 * ======================================================================= */
const scoreboardDiv = document.getElementById("scoreboard");
const comboDisplay = document.getElementById("comboDisplay");
const powerupHud = document.getElementById("powerupHud");

function updateScoreboard() {
  scoreboardDiv.textContent = "Score: " + score;
}

function updateComboDisplay() {
  if (!comboDisplay) return;
  if (gameState === "playing" && comboStreak > 0) {
    const multText = comboMultiplier > 1 ? ` · x${comboMultiplier.toFixed(1)}` : "";
    comboDisplay.style.display = "flex";
    comboDisplay.innerHTML = `<span class="combo-flame">🔥</span> Streak ${comboStreak}${multText}`;
  } else {
    comboDisplay.style.display = "none";
  }
}

function updatePowerupHud() {
  if (!powerupHud) return;
  if (gameState !== "playing") {
    powerupHud.style.display = "none";
    return;
  }

  const now = Date.now();
  let html = "";

  if (ship.shielded) {
    html += `<div class="powerup-badge shield"><span>🛡️</span></div>`;
  }
  if (activeEffects.slowmoUntil > now) {
    const pct = Math.max(0, (activeEffects.slowmoUntil - now) / POWERUP_TYPES.slowmo.duration) * 100;
    html += `<div class="powerup-badge slowmo"><span>⏳</span><div class="powerup-timer"><div style="width:${pct}%"></div></div></div>`;
  }
  if (activeEffects.boostUntil > now) {
    const pct = Math.max(0, (activeEffects.boostUntil - now) / POWERUP_TYPES.boost.duration) * 100;
    html += `<div class="powerup-badge boost"><span>✨ x2</span><div class="powerup-timer"><div style="width:${pct}%"></div></div></div>`;
  }

  powerupHud.style.display = html ? "flex" : "none";
  powerupHud.innerHTML = html;
}

/* =======================================================================
 * SECTION 18: PLAYER PROFILES
 * ======================================================================= */
function getPlayers() {
  const players = localStorage.getItem("players");
  return players ? JSON.parse(players) : [];
}

function savePlayers(players) {
  localStorage.setItem("players", JSON.stringify(players));
}

function sortPlayersByHighScore(players) {
  players.sort((a, b) => b.highScore - a.highScore);
}

function incrementPlayerStat(key, amount = 1) {
  if (!currentPlayer) return 0;
  const players = getPlayers();
  const player = players.find(p => p.name === currentPlayer);
  if (!player) return 0;
  player[key] = (player[key] || 0) + amount;
  savePlayers(players);
  return player[key];
}

function updatePlayerScore(playerName, currentScore) {
  let players = getPlayers();
  let player = players.find(p => p.name === playerName);

  // If player doesn't exist, create a new player profile
  if (!player) {
    player = {
      name: playerName,
      highScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
      unlockedAchievements: [],
      powerupsCollected: 0,
      dateJoined: new Date().toISOString()
    };
    players.push(player);
  }
  if (!player.unlockedAchievements) player.unlockedAchievements = [];

  // Update player stats
  player.gamesPlayed = (player.gamesPlayed || 0) + 1;
  player.totalScore = (player.totalScore || 0) + currentScore;

  // Update high score if current score is higher
  if (currentScore > player.highScore) {
    player.highScore = currentScore;
  }

  // Save updated player list
  sortPlayersByHighScore(players);
  savePlayers(players);

  return player;
}

function deletePlayerProfile(playerName) {
  if (!confirm(`Are you sure you want to delete player "${playerName}"?`)) return;
  let players = getPlayers();
  players = players.filter(p => p.name !== playerName);
  savePlayers(players);
  menuScreen = "mainMenu";
  showMenuScreen();
}

/* =======================================================================
 * SECTION 19: MENU SCREENS
 * ======================================================================= */
const menuOverlay = document.getElementById("menuOverlay");
const menuContent = document.getElementById("menuContent");

// 1. Main Menu
function showMainMenu() {
  menuContent.innerHTML = `
    <h1 class="menuTitle">Space Adventures</h1>
    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
      <p>Fly your spaceship through the asteroid field!</p>
      <p>Tap or press space to fly. Fly through the center of the gap for a PERFECT bonus.</p>
    </div>
    <button class="menuButton" id="playButton">
      <span class="material-icons icon">play_arrow</span>
      <span>PLAY</span>
    </button>
    <button class="menuButton" id="highScoresButton">
      <span class="material-icons icon">emoji_events</span>
      <span>HIGH SCORES</span>
    </button>
    <button class="menuButton" id="achievementsButton">
      <span class="material-icons icon">military_tech</span>
      <span>ACHIEVEMENTS</span>
    </button>
    <button class="menuButton" id="settingsButton">
      <span class="material-icons icon">settings</span>
      <span>SETTINGS</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  document.getElementById("playButton").addEventListener("click", () => {
    menuScreen = "profileSelect";
    showMenuScreen();
  });
  document.getElementById("highScoresButton").addEventListener("click", () => {
    menuScreen = "highScores";
    showMenuScreen();
  });
  document.getElementById("achievementsButton").addEventListener("click", () => {
    menuScreen = "achievements";
    showMenuScreen();
  });
  document.getElementById("settingsButton").addEventListener("click", () => {
    menuScreen = "settings";
    showMenuScreen();
  });
}

// 2. Player Profile Selection
function showProfileSelection() {
  let players = getPlayers();
  let optionsHTML = "";
  players.forEach(p => {
    optionsHTML += `<option value="${p.name}">${p.name} - High Score: ${p.highScore}</option>`;
  });

  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 40px;">Select Player</h1>

    ${players.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; font-size: 18px;">Choose Existing Player:</label>
        <select class="selectField" id="playerSelect">${optionsHTML}</select>
      </div>
    ` : ''}

    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 10px; font-size: 18px;">Or Create New Player:</label>
      <input type="text" class="inputField" id="newPlayerName" placeholder="Enter player name" maxlength="15" />
    </div>

    <button class="menuButton" id="selectButton">
      <span class="material-icons icon">rocket_launch</span>
      <span>Start Game</span>
    </button>
    <button class="menuButton" id="backButton">
      <span class="material-icons icon">arrow_back</span>
      <span>Back</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  document.getElementById("selectButton").addEventListener("click", () => {
    const selectElem = document.getElementById("playerSelect");
    const newName = document.getElementById("newPlayerName").value.trim();

    // Get the selected player or create a new one
    if (newName) {
      // Creating a new player
      currentPlayer = newName;

      let players = getPlayers();
      if (!players.find(p => p.name === currentPlayer)) {
        const newPlayer = {
          name: currentPlayer,
          highScore: 0,
          gamesPlayed: 0,
          totalScore: 0,
          unlockedAchievements: [],
          powerupsCollected: 0,
          dateJoined: new Date().toISOString()
        };
        players.push(newPlayer);
        savePlayers(players);
      }
      hideMenu();
      startGame();
    } else if (selectElem && selectElem.value) {
      // Selecting existing player
      currentPlayer = selectElem.value;
      hideMenu();
      startGame();
    } else {
      alert("Please select or enter a name for your player.");
    }
  });

  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 3. High Scores Screen
function showHighScoresScreen() {
  let players = getPlayers();
  sortPlayersByHighScore(players);

  let leaderboardHTML = "";
  if (players.length === 0) {
    leaderboardHTML = "<p>No players have played yet. Be the first!</p>";
  } else {
    leaderboardHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="padding: 10px; text-align: center;">Rank</th>
            <th style="padding: 10px; text-align: left;">Player</th>
            <th style="padding: 10px; text-align: right;">High Score</th>
            <th style="padding: 10px; text-align: center;">🏆</th>
            <th style="padding: 10px; text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    players.forEach((p, index) => {
      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : (index + 1);
      leaderboardHTML += `
        <tr style="background: ${index < 3 ? 'rgba(50, 100, 150, 0.4)' : 'rgba(0, 0, 0, 0.4)'};">
          <td style="padding: 10px; text-align: center;">${medal}</td>
          <td style="padding: 10px; text-align: left;">${p.name}</td>
          <td style="padding: 10px; text-align: right;">${p.highScore}</td>
          <td style="padding: 10px; text-align: center;">${(p.unlockedAchievements || []).length}/${ACHIEVEMENTS.length}</td>
          <td style="padding: 10px; text-align: center;">
            <button class="deletePlayerBtn" data-player="${p.name}" style="background: rgba(255,0,0,0.4); border: none; color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
              <span class="material-icons" style="font-size: 16px; vertical-align: middle;">delete</span>
            </button>
          </td>
        </tr>
      `;
    });

    leaderboardHTML += `
        </tbody>
      </table>
    `;
  }

  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 32px;">High Scores</h1>

    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; overflow-y: auto; max-height: 300px;">
      ${leaderboardHTML}
    </div>

    <button class="menuButton" id="backButton" style="margin-top: 20px;">
      <span class="material-icons icon">arrow_back</span>
      <span>Back</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  // Add event listeners for delete buttons
  document.querySelectorAll('.deletePlayerBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playerName = btn.getAttribute('data-player');
      deletePlayerProfile(playerName);
      showHighScoresScreen(); // Refresh the screen
    });
  });

  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 4. Achievements Screen
function showAchievementsScreen() {
  const players = getPlayers();
  const player = players.find(p => p.name === currentPlayer);
  const unlocked = (player && player.unlockedAchievements) || [];

  const badgesHTML = ACHIEVEMENTS.map(a => {
    const isUnlocked = unlocked.includes(a.id);
    return `
      <div class="achv-badge ${isUnlocked ? "unlocked" : "locked"}" title="${a.desc}">
        <div class="achv-icon">${isUnlocked ? a.icon : "🔒"}</div>
        <div class="achv-name">${a.name}</div>
        <div class="achv-desc">${a.desc}</div>
      </div>
    `;
  }).join("");

  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 32px;">Achievements</h1>
    ${!currentPlayer ? `<p style="margin-bottom:20px;">Play a game to start earning achievements!</p>` : `
      <p style="margin-bottom: 15px;">${currentPlayer} — ${unlocked.length}/${ACHIEVEMENTS.length} unlocked</p>
    `}
    <div class="achv-grid">${badgesHTML}</div>
    <button class="menuButton" id="backButton" style="margin-top: 20px;">
      <span class="material-icons icon">arrow_back</span>
      <span>Back</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 5. Settings Screen
function showSettingsScreen() {
  menuContent.innerHTML = `
    <h2>Settings</h2>
    <div style="margin: 20px 0; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px;">
      <div style="text-align: left;">
        <label style="font-size:18px; margin-right: 10px;">Sound:</label>
        <label class="toggle-switch">
          <input type="checkbox" id="soundToggle" ${settings.sound ? "checked" : ""}/>
          <span class="toggle-slider"></span>
        </label>
        <span style="margin-left: 10px;">${settings.sound ? "ON" : "OFF"}</span>
      </div>
    </div>

    <button class="menuButton" id="saveSettingsButton">
      <span class="material-icons icon">save</span>
      <span>Save</span>
    </button>
    <button class="menuButton" id="backButton">
      <span class="material-icons icon">arrow_back</span>
      <span>Back</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  const soundToggle = document.getElementById("soundToggle");
  soundToggle.addEventListener("change", () => {
    const label = soundToggle.nextElementSibling.nextElementSibling;
    label.textContent = soundToggle.checked ? "ON" : "OFF";
  });

  document.getElementById("saveSettingsButton").addEventListener("click", () => {
    settings.sound = document.getElementById("soundToggle").checked;
    menuScreen = "mainMenu";
    showMenuScreen();
  });

  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 6. Game Over Screen
function showGameOverScreen() {
  const player = lastGameOverPlayer || updatePlayerScore(currentPlayer, score);

  const newAchvHTML = newlyUnlockedThisRun.length > 0 ? `
    <div style="background: rgba(255,215,0,0.15); border: 1px solid rgba(255,215,0,0.4); padding: 12px; border-radius: 10px; margin-bottom: 15px;">
      <p style="font-weight:bold; margin-bottom:8px;">🏆 New Achievements!</p>
      <div class="achv-grid" style="grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));">
        ${newlyUnlockedThisRun.map(a => `
          <div class="achv-badge unlocked" title="${a.desc}">
            <div class="achv-icon">${a.icon}</div>
            <div class="achv-name">${a.name}</div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 40px;">Game Over</h1>

    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
      <p style="font-size: 24px;">Player: ${player.name}</p>
      <p style="font-size: 24px;">Score: ${score}</p>
      <p style="font-size: 18px;">Your High Score: ${player.highScore}</p>
      <p style="font-size: 14px;">Best Streak This Run: ${runStats.perfectBestStreak} perfect passes</p>
      <p style="font-size: 14px;">Games Played: ${player.gamesPlayed}</p>
    </div>

    ${newAchvHTML}

    <button class="menuButton" id="restartButton">
      <span class="material-icons icon">replay</span>
      <span>Play Again</span>
    </button>
    <button class="menuButton" id="changePlayerButton">
      <span class="material-icons icon">person</span>
      <span>Change Player</span>
    </button>
    <button class="menuButton" id="menuButton">
      <span class="material-icons icon">home</span>
      <span>Main Menu</span>
    </button>
  `;
  menuOverlay.style.display = "flex";
  newlyUnlockedThisRun = [];

  document.getElementById("restartButton").addEventListener("click", () => {
    hideMenu();
    resetGame();
  });

  document.getElementById("changePlayerButton").addEventListener("click", () => {
    menuScreen = "profileSelect";
    showMenuScreen();
  });

  document.getElementById("menuButton").addEventListener("click", () => {
    gameState = "main";
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// Master function to display the correct menu screen
let menuScreen = "mainMenu";
function showMenuScreen() {
  switch (menuScreen) {
    case "mainMenu":      showMainMenu(); break;
    case "profileSelect": showProfileSelection(); break;
    case "highScores":    showHighScoresScreen(); break;
    case "achievements":  showAchievementsScreen(); break;
    case "settings":      showSettingsScreen(); break;
    case "gameover":      showGameOverScreen(); break;
    default:              showMainMenu(); break;
  }
}

function hideMenu() {
  menuOverlay.style.display = "none";
}

/* =======================================================================
 * SECTION 20: INPUT HANDLING
 * ======================================================================= */
document.addEventListener("keydown", function(event) {
  if (event.code === "Space" && gameState === "playing") {
    ship.velocity = ship.jumpStrength;
    playSound(jumpSound);
  }
});

document.addEventListener("touchstart", function(event) {
  if (gameState === "playing" && event.target === canvas) {
    ship.velocity = ship.jumpStrength;
    playSound(jumpSound);
    event.preventDefault();
  }
}, { passive: false });

document.addEventListener("mousedown", function(event) {
  if (gameState === "playing" && event.target === canvas) {
    ship.velocity = ship.jumpStrength;
    playSound(jumpSound);
  }
});

/* =======================================================================
 * SECTION 21: GAME FLOW FUNCTIONS
 * ======================================================================= */
function startGame() {
  resetGame();

  // Start background music
  if (settings.sound) {
    backgroundMusic.play().catch(error => {
      console.log("Audio play failed:", error);
      // Often due to user not interacting with page yet
    });
  }
}

function resetGame() {
  ship.y = canvas.height / 2;
  ship.velocity = 0;
  ship.thrusterParticles = [];
  ship.shielded = false;
  ship.invulnerableUntil = 0;

  obstacles = [];
  powerups = [];
  floatingTexts = [];
  score = 0;

  comboStreak = 0;
  comboMultiplier = 1;
  runStats = { perfectBestStreak: 0, powerupsCollected: 0, shieldSaves: 0 };
  activeEffects.slowmoUntil = 0;
  activeEffects.boostUntil = 0;
  newlyUnlockedThisRun = [];
  lastGameOverPlayer = null;

  lastObstacleTime = Date.now();
  lastPowerupTime = Date.now() + 2000; // small grace period before the first power-up
  nextPowerupDelay = randomPowerupDelay();

  gameState = "playing";

  // Add first obstacle
  obstacles.push(createObstacle());
}

function finalizeGameOver() {
  const player = updatePlayerScore(currentPlayer, score);

  unlockAchievement("first_flight");
  if (player.gamesPlayed >= 10) unlockAchievement("veteran");
  if (player.totalScore >= 100) unlockAchievement("century_club");

  lastGameOverPlayer = player;
  menuScreen = "gameover";
  showMenuScreen();
}

/* =======================================================================
 * SECTION 22: MOBILE OPTIMIZATION
 * ======================================================================= */
// Prevent scrolling on mobile when playing
document.body.addEventListener('touchmove', event => {
  if (gameState === 'playing') {
    event.preventDefault();
  }
}, { passive: false });

// Make the game responsive with a larger tap/click area
function optimizeForMobile() {
  // Increase ship size slightly on small screens for better visibility
  if (window.innerWidth < 600) {
    ship.width = 45;
    ship.height = 45;
  } else {
    ship.width = 40;
    ship.height = 40;
  }

  // Make sure the canvas is fully visible
  if (window.innerHeight < 500) {
    gameContainer.style.border = "5px solid #fff";
  } else {
    gameContainer.style.border = "15px solid #fff";
  }
}

// Call this function on resize and at startup
window.addEventListener('resize', optimizeForMobile);
optimizeForMobile();

// Handle visibility change to pause background music
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    backgroundMusic.pause();
  } else if (gameState === 'playing' && settings.sound) {
    backgroundMusic.play().catch(() => {});
  }
});

/* =======================================================================
 * SECTION 23: MAIN GAME LOOP
 * ======================================================================= */
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSpaceBackground();

  if (gameState === "playing") {
    updateObstacles();
    updatePowerups();
    updateShipWithEffects();
    updateScore();
    updateFloatingTexts();
  } else {
    updateShipWithEffects(); // keeps explosion particles animating after game over
  }

  drawObstacles();
  drawPowerups();
  drawShipWithEffects();
  drawFloatingTexts();
  updateScoreboard();
  updateComboDisplay();
  updatePowerupHud();

  // Show player's high score if available
  if (currentPlayer) {
    const players = getPlayers();
    const player = players.find(p => p.name === currentPlayer);
    if (player && player.highScore > 0) {
      ctx.fillStyle = "#FFF";
      ctx.font = "18px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`High Score: ${player.highScore}`, 20, 40);
    }
  }

  const collisionResult = handleCollision();
  if (collisionResult === "fatal") {
    spawnExplosion(ship.x + ship.width / 2, ship.y + ship.height / 2);
    gameState = "gameover";
    playSound(collisionSound);
    playSound(gameOverSound);
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    finalizeGameOver();
  }

  requestAnimationFrame(gameLoop);
}

// Start the game
showMenuScreen();
gameLoop();
