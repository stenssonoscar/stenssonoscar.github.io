/* =======================================================================
 * SIMPLIFIED SPACE ADVENTURES - GAME.JS
 * Main javascript implementation for the simplified Space Adventures game
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
  // Enhanced ship properties
  thrusterParticles: []
};

/* =======================================================================
 * SECTION 6: OBSTACLE SETTINGS
 * ======================================================================= */
const obstacleWidth = 80;
const obstacleGap = 200; // Fixed gap for consistent difficulty
const obstacleSpeed = 5; // Fixed speed for consistent difficulty
const obstacleInterval = 1700; // ms between obstacles - consistent
let obstacles = [];
let lastObstacleTime = Date.now() - obstacleInterval + 50;

/* =======================================================================
 * SECTION 7: BACKGROUND / STARS WITH PARALLAX
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
  starLayers.forEach(layer => {
    layer.stars.forEach(star => {
      star.x -= layer.speed * obstacleSpeed;
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
 * SECTION 8: ENHANCED SHIP FUNCTIONS
 * ======================================================================= */
function updateShipWithEffects() {
  if (gameState === "playing") {
    ship.velocity += ship.gravity;
    ship.y += ship.velocity;
    
    // Update ship thruster particles
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
    
    // Update existing particles
    for (let i = ship.thrusterParticles.length - 1; i >= 0; i--) {
      const p = ship.thrusterParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      
      if (p.life <= 0) {
        ship.thrusterParticles.splice(i, 1);
      }
    }
  }
}

function drawShipWithEffects() {
  // Draw thruster particles
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
 * SECTION 9: OBSTACLE FUNCTIONS
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
    obstacles.forEach(obsPair => {
      obsPair.topObs.x -= obstacleSpeed;
      obsPair.bottomObs.x -= obstacleSpeed;
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
 * SECTION 10: COLLISION & SCORING
 * ======================================================================= */
function checkCollision() {
  if (ship.y < 0 || ship.y + ship.height > canvas.height) {
    return true;
  }
  for (let obsPair of obstacles) {
    if (
      ship.x < obsPair.topObs.x + obsPair.topObs.width &&
      ship.x + ship.width > obsPair.topObs.x &&
      ship.y < obsPair.topObs.y + obsPair.topObs.height
    ) {
      return true;
    }
    if (
      ship.x < obsPair.bottomObs.x + obsPair.bottomObs.width &&
      ship.x + ship.width > obsPair.bottomObs.x &&
      ship.y + ship.height > obsPair.bottomObs.y
    ) {
      return true;
    }
  }
  return false;
}

function updateScore() {
  if (gameState === "playing") {
    obstacles.forEach(obsPair => {
      if (!obsPair.scored && obsPair.topObs.x + obstacleWidth < ship.x) {
        score += 1;
        obsPair.scored = true;
      }
    });
  }
}

/* =======================================================================
 * SECTION 11: SCOREBOARD
 * ======================================================================= */
const scoreboardDiv = document.getElementById("scoreboard");
function updateScoreboard() {
  scoreboardDiv.textContent = "Score: " + score;
}

/* =======================================================================
 * SECTION 12: PLAYER PROFILES
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
      dateJoined: new Date().toISOString()
    };
    players.push(player);
  }
  
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
 * SECTION 13: MENU SCREENS
 * ======================================================================= */
const menuOverlay = document.getElementById("menuOverlay");
const menuContent = document.getElementById("menuContent");

// 1. Main Menu
function showMainMenu() {
  menuContent.innerHTML = `
    <h1 class="menuTitle">Space Adventures</h1>
    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
      <p>Fly your spaceship through the asteroid field!</p>
      <p>Tap or press space to fly.</p>
    </div>
    <button class="menuButton" id="playButton">
      <span class="material-icons icon">play_arrow</span>
      <span>PLAY</span>
    </button>
    <button class="menuButton" id="highScoresButton">
      <span class="material-icons icon">emoji_events</span>
      <span>HIGH SCORES</span>
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
            <th style="padding: 10px; text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    players.forEach((p, index) => {
      leaderboardHTML += `
        <tr style="background: ${index < 3 ? 'rgba(50, 100, 150, 0.4)' : 'rgba(0, 0, 0, 0.4)'};">
          <td style="padding: 10px; text-align: center;">${index + 1}</td>
          <td style="padding: 10px; text-align: left;">${p.name}</td>
          <td style="padding: 10px; text-align: right;">${p.highScore}</td>
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

// 4. Settings Screen
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

// 5. Game Over Screen
function showGameOverScreen() {
  const player = updatePlayerScore(currentPlayer, score);
  
  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 40px;">Game Over</h1>
    
    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px;">
      <p style="font-size: 24px;">Player: ${player.name}</p>
      <p style="font-size: 24px;">Score: ${score}</p>
      <p style="font-size: 18px;">Your High Score: ${player.highScore}</p>
      <p style="font-size: 14px;">Games Played: ${player.gamesPlayed}</p>
    </div>
    
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
    case "mainMenu":     showMainMenu(); break;
    case "profileSelect": showProfileSelection(); break;
    case "highScores":   showHighScoresScreen(); break;
    case "settings":     showSettingsScreen(); break;
    case "gameover":     showGameOverScreen(); break;
    default:             showMainMenu(); break;
  }
}

function hideMenu() {
  menuOverlay.style.display = "none";
}

/* =======================================================================
 * SECTION 14: INPUT HANDLING
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
 * SECTION 15: GAME FLOW FUNCTIONS
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
  
  obstacles = [];
  score = 0;
  
  lastObstacleTime = Date.now();
  gameState = "playing";
  
  // Add first obstacle
  obstacles.push(createObstacle());
}

/* =======================================================================
 * SECTION 16: MOBILE OPTIMIZATION
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
 * SECTION 17: MAIN GAME LOOP
 * ======================================================================= */
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSpaceBackground();
  
  if (gameState === "playing") {
    updateObstacles();
    updateShipWithEffects();
    updateScore();
  }
  
  drawObstacles();
  drawShipWithEffects();
  updateScoreboard();
  
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
  
  if (gameState === "playing" && checkCollision()) {
    gameState = "gameover";
    playSound(collisionSound);
    playSound(gameOverSound);
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    menuScreen = "gameover";
    showGameOverScreen();
  }
  
  requestAnimationFrame(gameLoop);
}

// Start the game
showMenuScreen();
gameLoop();