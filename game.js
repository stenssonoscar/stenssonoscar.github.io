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
let menuScreen = "mainMenu"; // "mainMenu", "profileSelect", "scoreboard", "settings", "gameover"

let score = 0;
let currentPlayer = "";
let sessionJumps = 0;
let sessionStartTime = 0;

// Power-up System
let powerUps = [];
const POWERUP_TYPES = {
  SHIELD: { emoji: "🛡️", effect: activateShield, color: "#00AAFF" },
  SLOW: { emoji: "⏱️", effect: activateSlow, color: "#FFFF00" },
  SCORE: { emoji: "💎", effect: activateScoreBoost, color: "#FF00FF" }
};

// Constants for power-up behavior
const POWERUP_SPAWN_CHANCE = 0.08; // Increased to 8% chance per obstacle
const POWERUP_SIZE = 40; // Increased from 30 to 40

// Game modifiers
let gameSpeedMultiplier = 1;
let slowModeEndTime = 0;
let scoreMultiplier = 1;
let scoreBoostEndTime = 0;
let powerUpMessages = [];

// Mission System
const MISSION_TYPES = [
  { type: "SCORE", description: "Reach score {target}", minTarget: 5, maxTarget: 30, reward: 1 },
  { type: "COLLECT", description: "Collect {target} power-ups", minTarget: 1, maxTarget: 5, reward: 2 },
  { type: "SURVIVAL", description: "Survive {target} seconds", minTarget: 30, maxTarget: 120, reward: 1 },
  { type: "JUMPS", description: "Make {target} jumps", minTarget: 10, maxTarget: 50, reward: 1 }
];
let currentMissions = [];
let missionProgress = {
  SCORE: 0,
  COLLECT: 0,
  SURVIVAL: 0,
  JUMPS: 0
};
let completedMissionCount = 0;

/* =======================================================================
 * SECTION 3: STORY SYSTEM
 * ======================================================================= */
// Story events for displaying in-game messages
let storyEvents = [];

// Story system object managing player progression and narrative
const storySystem = {
  // Player progression levels
  progressionLevels: [
    { level: 1, title: "Cadet", minScore: 0, story: "You've just enrolled in the Galactic Defense Academy. Your journey to become an elite space pilot begins now." },
    { level: 2, title: "Trainee", minScore: 10, story: "Your basic training is complete. The Academy has noticed your potential and assigned you to patrol the outer sectors." },
    { level: 3, title: "Junior Pilot", minScore: 25, story: "With several successful patrols under your belt, you've earned your wings. The challenges will only get tougher from here." },
    { level: 4, title: "Pilot", minScore: 50, story: "Your skills are improving. The Galactic Command has assigned you more complex missions in the asteroid belt." },
    { level: 5, title: "Veteran Pilot", minScore: 100, story: "Your reputation spreads across the galaxy. You're now trusted with vital supply runs through dangerous territories." },
    { level: 6, title: "Elite Pilot", minScore: 200, story: "Few pilots reach your level of skill. The Galactic Fleet recognizes your extraordinary abilities." },
    { level: 7, title: "Squadron Leader", minScore: 300, story: "Your leadership qualities shine. You now lead a small squadron on critical missions." },
    { level: 8, title: "Commander", minScore: 500, story: "The Galactic Council has promoted you to Commander. Your decisions impact the safety of entire sectors." },
    { level: 9, title: "Fleet Admiral", minScore: 750, story: "As Fleet Admiral, your strategic brilliance guides the entire Galactic Defense Force." },
    { level: 10, title: "Legendary Pilot", minScore: 1000, story: "Your name will be remembered for generations as the greatest pilot the galaxy has ever known." }
  ],
  
  // Story missions that unlock as player progresses
  storyMissions: [
    { 
      id: "tutorial", 
      title: "First Flight", 
      unlockLevel: 1, 
      description: "Complete your first training flight by reaching a score of 5.",
      completionCriteria: player => player.highScore >= 5,
      reward: "Access to advanced training",
      completed: false
    },
    { 
      id: "debris_field", 
      title: "Navigate the Debris Field", 
      unlockLevel: 2, 
      description: "Successfully navigate through dangerous debris by collecting 5 power-ups in a single run.",
      completionCriteria: player => player.bestPowerUpsInRun >= 5,
      reward: "Enhanced shield technology",
      completed: false
    },
    { 
      id: "endurance", 
      title: "Endurance Test", 
      unlockLevel: 3, 
      description: "Prove your endurance by surviving for at least 60 seconds in a single flight.",
      completionCriteria: player => player.bestSurvivalTime >= 60,
      reward: "Improved ship thrusters",
      completed: false
    },
    { 
      id: "precision", 
      title: "Precision Flying", 
      unlockLevel: 4, 
      description: "Demonstrate precise control by achieving a score of 30 without using any power-ups.",
      completionCriteria: player => player.achievedScoreWithoutPowerups >= 30,
      reward: "Advanced navigation systems",
      completed: false
    },
    { 
      id: "master_pilot", 
      title: "Master Pilot Challenge", 
      unlockLevel: 6, 
      description: "Complete the ultimate test: reach a score of 50 in the fast speed setting.",
      completionCriteria: player => player.fastModeHighScore >= 50,
      reward: "Elite Pilot Wings - Cosmetic upgrade for your ship",
      completed: false
    }
  ],
  
  // Story events that can trigger during gameplay
  randomEvents: [
    {
      id: "meteor_shower",
      title: "Meteor Shower",
      message: "Warning! Meteor shower detected ahead. Increase focus!",
      effect: () => {
        // Temporarily increase obstacle spawn rate
        obstacleInterval = obstacleInterval * 0.7;
        setTimeout(() => {
          obstacleInterval = obstacleInterval / 0.7;
          displayStoryEvent("Meteor shower has passed. Good flying!");
        }, 10000);
      }
    },
    {
      id: "energy_field",
      title: "Energy Field",
      message: "You've entered a mysterious energy field! Your ship's abilities are enhanced.",
      effect: () => {
        // Temporary invincibility
        ship.shieldActive = true;
        ship.shieldTime = Date.now();
        ship.shieldDuration = 8000; // 8 seconds
        setTimeout(() => {
          displayStoryEvent("The energy field's effects are fading.");
        }, 7000);
      }
    },
    {
      id: "distress_signal",
      title: "Distress Signal",
      message: "Receiving distress signal! Bonus rewards for successful navigation!",
      effect: () => {
        // Double score for the next 15 seconds
        scoreMultiplier = 2;
        scoreBoostEndTime = Date.now() + 15000;
        setTimeout(() => {
          displayStoryEvent("Distress mission complete. Returning to normal flight.");
        }, 14000);
      }
    },
    {
      id: "engine_malfunction",
      title: "Engine Malfunction",
      message: "Warning: Engine malfunction detected! Ship control limited!",
      effect: () => {
        // Make ship heavier temporarily
        ship.gravity = ship.gravity * 1.5;
        setTimeout(() => {
          ship.gravity = ship.gravity / 1.5;
          displayStoryEvent("Engine systems restored to normal operation.");
        }, 8000);
      }
    }
  ],
  
  // Get player's current level based on high score
  getPlayerLevel: function(player) {
    // Find the highest level the player qualifies for
    for (let i = this.progressionLevels.length - 1; i >= 0; i--) {
      if (player.highScore >= this.progressionLevels[i].minScore) {
        return this.progressionLevels[i];
      }
    }
    return this.progressionLevels[0]; // Default to first level
  },
  
  // Get available story missions for player's current level
  getAvailableMissions: function(player) {
    const playerLevel = this.getPlayerLevel(player).level;
    return this.storyMissions.filter(mission => 
      mission.unlockLevel <= playerLevel && !mission.completed);
  },
  
  // Check if player has completed any missions
  checkMissionCompletion: function(player) {
    let completedAny = false;
    this.storyMissions.forEach(mission => {
      if (!mission.completed && mission.completionCriteria(player)) {
        mission.completed = true;
        completedAny = true;
        displayStoryEvent(`Mission Complete: ${mission.title}! Reward: ${mission.reward}`);
      }
    });
    return completedAny;
  },
  
  // Trigger a random story event with a certain probability
  triggerRandomEvent: function() {
    if (gameState !== "playing" || Math.random() > 0.001) return; // 0.1% chance per frame
    
    const availableEvents = this.randomEvents;
    if (availableEvents.length === 0) return;
    
    const randomEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
    displayStoryEvent(randomEvent.message);
    randomEvent.effect();
  },
  
  // Save and load story progress
  saveProgress: function(player) {
    player.storyMissions = this.storyMissions.map(m => ({
      id: m.id,
      completed: m.completed
    }));
  },
  
  loadProgress: function(player) {
    if (player.storyMissions) {
      player.storyMissions.forEach(savedMission => {
        const mission = this.storyMissions.find(m => m.id === savedMission.id);
        if (mission) mission.completed = savedMission.completed;
      });
    }
  }
};

/* Helper functions for story events */
function displayStoryEvent(message) {
  storyEvents.push({
    message: message,
    displayTime: Date.now(),
    duration: 5000, // Display for 5 seconds
    alpha: 1
  });
  
  // Play notification sound
  if (settings.sound) {
    const notificationSound = new Audio("assets/notification.mp3");
    notificationSound.volume = 0.5;
    notificationSound.play().catch(err => console.log("Audio play failed:", err));
  }
}

function updateAndDrawStoryEvents() {
  const currentTime = Date.now();
  
  for (let i = storyEvents.length - 1; i >= 0; i--) {
    const event = storyEvents[i];
    
    // Fade out as it approaches the end of its duration
    const elapsedTime = currentTime - event.displayTime;
    if (elapsedTime > event.duration) {
      storyEvents.splice(i, 1);
      continue;
    }
    
    // Calculate fade-in and fade-out
    if (elapsedTime < 500) {
      event.alpha = elapsedTime / 500; // Fade in during first 0.5 seconds
    } else if (elapsedTime > event.duration - 500) {
      event.alpha = (event.duration - elapsedTime) / 500; // Fade out during last 0.5 seconds
    } else {
      event.alpha = 1;
    }
    
    // Draw the event message
    ctx.save();
    ctx.globalAlpha = event.alpha;
    const boxWidth = canvas.width * 0.7;
    const boxHeight = 50;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = canvas.height * 0.2 + i * 60;
    
    // Draw background with glow
    ctx.shadowColor = 'rgba(0, 150, 255, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = 'rgba(0, 20, 60, 0.85)';
    ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Draw text
    ctx.shadowBlur = 0;
    ctx.font = "18px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(event.message, canvas.width / 2, boxY + boxHeight / 2);
    ctx.restore();
  }
}

/* =======================================================================
 * SECTION 4: GAME SETTINGS
 * ======================================================================= */
const settings = {
  speed: "normal", // "slow", "normal", "fast"
  sound: true
};

/* =======================================================================
 * SECTION 5: AUDIO ELEMENTS
 * ======================================================================= */
// Background music
const backgroundMusic = new Audio("assets/Galactic Dreams.mp3");
backgroundMusic.loop = true;

// Sound effects
const jumpSound = new Audio("assets/jump.mp3");
const collisionSound = new Audio("assets/collision.mp3");
const gameOverSound = new Audio("assets/Game Over.mp3");
const powerUpSound = new Audio("assets/powerup.mp3");
const shieldBreakSound = new Audio("assets/shield-break.mp3");
const missionCompleteSound = new Audio("assets/mission-complete.mp3");

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
 * SECTION 6: SPACESHIP SETTINGS
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
  thrusterParticles: [],
  shieldActive: false,
  shieldTime: 0,
  shieldDuration: 5000 // 5 seconds
};

/* =======================================================================
 * SECTION 7: OBSTACLE SETTINGS
 * ======================================================================= */
const obstacleWidth = 80;
let baseObstacleGap = 150;
let baseObstacleSpeed = 6.0;
let obstacleInterval = 2100; // ms between obstacles
let obstacles = [];
let lastObstacleTime = Date.now() - obstacleInterval + 50;

function updateSettingsBasedValues() {
  // Set base values based on speed setting.
  if (settings.speed === "slow") {
    baseObstacleSpeed = 3;
    baseObstacleGap = 200;
    obstacleInterval = 1700;
  } else if (settings.speed === "fast") {
    baseObstacleSpeed = 9;
    baseObstacleGap = 150;
    obstacleInterval = 1200;
  } else {
    baseObstacleSpeed = 5;
    baseObstacleGap = 200;
    obstacleInterval = 1500;
  }

  // Adjust further for mobile devices
  if (window.innerWidth < 600) {
    baseObstacleSpeed *= 0.8;      // Reduce speed by 20%
    baseObstacleGap *= 1.2;        // Increase vertical gap by 20%
    obstacleInterval += 500;       // Increase spawn interval by 500ms
  }
}
updateSettingsBasedValues();

function getDynamicObstacleSpeed() {
  // Check if slow mode should end
  if (Date.now() > slowModeEndTime && gameSpeedMultiplier < 1) {
    gameSpeedMultiplier = 1;
  }
  
  return (baseObstacleSpeed + score * 0.05) * gameSpeedMultiplier;
}

function getDynamicObstacleGap() {
  return Math.max(100, baseObstacleGap - score * 2);
}

/* =======================================================================
 * SECTION 8: BACKGROUND / STARS WITH PARALLAX
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
      star.x -= layer.speed * (getDynamicObstacleSpeed() / baseObstacleSpeed); // Scale with game speed
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
  
  // Add a nebula effect (occasional)
  if (Math.random() < 0.01) { // Occasional nebula
    const nebulaGradient = ctx.createRadialGradient(
      Math.random() * canvas.width, Math.random() * canvas.height, 0,
      Math.random() * canvas.width, Math.random() * canvas.height, 150
    );
    
    // Random nebula colors
    const colors = [
      ["rgba(255, 100, 100, 0)", "rgba(255, 100, 100, 0.1)"], // Red
      ["rgba(100, 100, 255, 0)", "rgba(100, 100, 255, 0.1)"], // Blue
      ["rgba(255, 150, 100, 0)", "rgba(255, 150, 100, 0.1)"]  // Orange
    ];
    
    const selectedColor = colors[Math.floor(Math.random() * colors.length)];
    nebulaGradient.addColorStop(0, selectedColor[1]);
    nebulaGradient.addColorStop(1, selectedColor[0]);
    
    ctx.fillStyle = nebulaGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  updateStarLayers();
  drawStarLayers();
}

// Initialize stars on startup
initStarLayers();

/* =======================================================================
 * SECTION 9: ENHANCED SHIP FUNCTIONS
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
    
    // Update shield
    if (ship.shieldActive && Date.now() > ship.shieldTime + ship.shieldDuration) {
      ship.shieldActive = false;
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
  
  // Draw ship with glow effect
  ctx.save();
  if (ship.shieldActive) {
    // Draw shield
    const pulseSize = Math.sin(Date.now() * 0.01) * 2 + 23;
    const shieldGradient = ctx.createRadialGradient(
      ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width / 2,
      ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width / 2 + pulseSize
    );
    shieldGradient.addColorStop(0, "rgba(100, 200, 255, 0.4)");
    shieldGradient.addColorStop(1, "rgba(100, 200, 255, 0)");
    
    ctx.fillStyle = shieldGradient;
    ctx.beginPath();
    ctx.arc(ship.x + ship.width / 2, ship.y + ship.height / 2, 
            ship.width / 2 + pulseSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw ship glow
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
 * SECTION 10: ENHANCED POWER-UP SYSTEM
 * ======================================================================= */
function spawnPowerUp(x, y) {
  const powerUpTypes = Object.keys(POWERUP_TYPES);
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  
  powerUps.push({
    x,
    y,
    type,
    width: POWERUP_SIZE,
    height: POWERUP_SIZE,
    rotation: 0,
    collected: false,
    pulseSize: 0,
    glowIntensity: 0.7, // Increased base glow intensity
    glowColor: POWERUP_TYPES[type].color // Use type-specific color
  });
}

function updatePowerUps() {
  // Create standalone powerups occasionally (not just near obstacles)
  if (gameState === "playing" && Math.random() < 0.003) { // 0.3% chance per frame
    const randomY = Math.random() * (canvas.height - 100) + 50;
    spawnPowerUp(canvas.width, randomY);
  }
  
  // Remove off-screen power-ups
  powerUps = powerUps.filter(pu => pu.x + pu.width > 0 && !pu.collected);
  
  // Move power-ups
  powerUps.forEach(pu => {
    pu.x -= getDynamicObstacleSpeed() * 0.7; // Move slightly slower than obstacles
    pu.rotation += 0.02; // Rotate for visual effect
    pu.pulseSize = Math.sin(Date.now() * 0.005) * 8; // Increased pulse size
    pu.glowIntensity = 0.7 + Math.sin(Date.now() * 0.01) * 0.3; // Pulsing glow intensity
    
    // Check collision with ship
    if (!pu.collected &&
        ship.x < pu.x + pu.width &&
        ship.x + ship.width > pu.x &&
        ship.y < pu.y + pu.height &&
        ship.y + ship.height > pu.y) {
      
      pu.collected = true;
      playSound(powerUpSound);
      POWERUP_TYPES[pu.type].effect();
      
      // Update mission progress for collecting power-ups
      missionProgress.COLLECT++;
    }
  });
}

function drawPowerUps() {
  powerUps.forEach(pu => {
    ctx.save();
    ctx.translate(pu.x + pu.width/2, pu.y + pu.height/2);
    ctx.rotate(pu.rotation);
    
    // Draw attention-grabbing trail particles behind power-ups
    for (let i = 0; i < 3; i++) {
      const trailX = -Math.random() * 20 - 5;
      const trailY = (Math.random() - 0.5) * 10;
      const trailSize = Math.random() * 5 + 3;
      const trailAlpha = Math.random() * 0.5;
      
      const trailGradient = ctx.createRadialGradient(
        trailX, trailY, 0, 
        trailX, trailY, trailSize
      );
      
      trailGradient.addColorStop(0, `rgba(255, 255, 255, ${trailAlpha})`);
      trailGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      
      ctx.fillStyle = trailGradient;
      ctx.beginPath();
      ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw enhanced glow (larger and more intense)
    const gradient = ctx.createRadialGradient(0, 0, pu.width/4, 0, 0, pu.width + 15 + pu.pulseSize);
    
    // Different colors for different power-ups with increased glow intensity
    if (pu.type === 'SHIELD') {
      gradient.addColorStop(0, `rgba(100, 200, 255, ${pu.glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(100, 200, 255, ${pu.glowIntensity * 0.7})`);
      gradient.addColorStop(1, "rgba(100, 200, 255, 0)");
    } else if (pu.type === 'SLOW') {
      gradient.addColorStop(0, `rgba(255, 255, 100, ${pu.glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 100, ${pu.glowIntensity * 0.7})`);
      gradient.addColorStop(1, "rgba(255, 255, 100, 0)");
    } else {
      gradient.addColorStop(0, `rgba(255, 100, 255, ${pu.glowIntensity})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 255, ${pu.glowIntensity * 0.7})`);
      gradient.addColorStop(1, "rgba(255, 100, 255, 0)");
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, pu.width + 10 + pu.pulseSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw a second inner glow for more visibility
    const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, pu.width/2);
    if (pu.type === 'SHIELD') {
      innerGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      innerGradient.addColorStop(1, "rgba(100, 200, 255, 0.1)");
    } else if (pu.type === 'SLOW') {
      innerGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      innerGradient.addColorStop(1, "rgba(255, 255, 100, 0.1)");
    } else {
      innerGradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      innerGradient.addColorStop(1, "rgba(255, 100, 255, 0.1)");
    }
    
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(0, 0, pu.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw the power-up emoji with slight shadow for better visibility
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.font = `${pu.width}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(POWERUP_TYPES[pu.type].emoji, 0, 0);
    
    // Draw attention "COLLECT ME!" text for very visible guidance
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#FFF";
    ctx.shadowBlur = 3;
    ctx.fillText("COLLECT!", 0, -pu.width/2 - 10);
    
    ctx.restore();
  });
}

// Display power-up activation message
function displayPowerUpMessage(message) {
  powerUpMessages.push({
    text: message,
    x: canvas.width / 2,
    y: canvas.height / 2,
    alpha: 1,
    size: 40
  });
}

function updateAndDrawPowerUpMessages() {
  for (let i = powerUpMessages.length - 1; i >= 0; i--) {
    const msg = powerUpMessages[i];
    
    // Update
    msg.alpha -= 0.02;
    msg.y -= 1;
    msg.size += 0.5;
    
    // Draw
    if (msg.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = msg.alpha;
      ctx.font = `bold ${msg.size}px sans-serif`;
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 10;
      ctx.fillText(msg.text, msg.x, msg.y);
      ctx.restore();
    } else {
      powerUpMessages.splice(i, 1);
    }
  }
}

/* =======================================================================
 * SECTION 11: POWER-UP EFFECTS
 * ======================================================================= */
function activateShield() {
  ship.shieldActive = true;
  ship.shieldTime = Date.now();
  displayPowerUpMessage("Shield Activated!");
}

function activateSlow() {
  gameSpeedMultiplier = 0.5; // 50% speed
  slowModeEndTime = Date.now() + 5000; // 5 seconds of slow mode
  displayPowerUpMessage("Time Warp!");
}

function activateScoreBoost() {
  scoreMultiplier = 2; // Double points
  scoreBoostEndTime = Date.now() + 10000; // 10 seconds
  displayPowerUpMessage("Double Points!");
}

/* =======================================================================
 * SECTION 12: MISSION SYSTEM
 * ======================================================================= */
function generateMission() {
  const missionType = MISSION_TYPES[Math.floor(Math.random() * MISSION_TYPES.length)];
  const target = Math.floor(Math.random() * (missionType.maxTarget - missionType.minTarget + 1)) + missionType.minTarget;
  
  return {
    type: missionType.type,
    description: missionType.description.replace("{target}", target),
    target: target,
    progress: 0,
    completed: false,
    reward: missionType.reward
  };
}

function initMissions() {
  currentMissions = [];
  missionProgress = {
    SCORE: 0,
    COLLECT: 0,
    SURVIVAL: 0,
    JUMPS: 0
  };
  
  // Generate 3 random missions
  for (let i = 0; i < 3; i++) {
    currentMissions.push(generateMission());
  }
}

function updateMissions() {
  if (gameState !== "playing") return;
  
  // Update progress based on game state
  missionProgress.SCORE = score;
  missionProgress.SURVIVAL = (Date.now() - sessionStartTime) / 1000;
  missionProgress.JUMPS = sessionJumps;
  
  // Check for completed missions
  currentMissions.forEach(mission => {
    if (!mission.completed) {
      mission.progress = missionProgress[mission.type];
      
      if (mission.progress >= mission.target) {
        mission.completed = true;
        completedMissionCount++;
        
        // Apply reward (e.g., extra points)
        score += mission.reward;
        
        // Play sound and display message
        playSound(missionCompleteSound);
        displayPowerUpMessage(`Mission Complete! +${mission.reward}`);
      }
    }
  });
}

function drawMissionPanel() {
  // Only show during gameplay
  if (gameState !== "playing") return;
  
  const panelWidth = 200;
  const panelHeight = 120;
  const x = canvas.width - panelWidth - 20;
  const y = 20;
  
  // Draw semi-transparent panel
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(x, y, panelWidth, panelHeight);
  ctx.strokeStyle = "#FFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, panelWidth, panelHeight);
  
  // Draw title
  ctx.fillStyle = "#FFF";
  ctx.font = "16px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("MISSIONS", x + panelWidth/2, y + 20);
  
  // Draw missions
  ctx.textAlign = "left";
  ctx.font = "12px sans-serif";
  
  let missionY = y + 40;
  currentMissions.forEach((mission, index) => {
    // Status icon
    const icon = mission.completed ? "✅" : "🔸";
    ctx.fillText(icon, x + 10, missionY);
    
    // Mission text
    ctx.fillStyle = mission.completed ? "#8F8" : "#FFF";
    ctx.fillText(mission.description, x + 30, missionY);
    
    // Progress bar
    const progressBarX = x + 30;
    const progressBarY = missionY + 5;
    const progressBarWidth = 150;
    const progressBarHeight = 4;

    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // Progress
    const progress = Math.min(1, mission.progress / mission.target);
    ctx.fillStyle = mission.completed ? "#8F8" : "#69bff8";
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight);
    
    missionY += 25;
  });
}

/* =======================================================================
 * SECTION 13: OBSTACLE FUNCTIONS
 * ======================================================================= */
function createObstacle(dynamicGap) {
  const gapY = Math.floor(Math.random() * (canvas.height - dynamicGap - 100)) + 50;
  const topObs = {
    x: canvas.width,
    y: 0,
    width: obstacleWidth,
    height: gapY
  };
  const bottomObs = {
    x: canvas.width,
    y: gapY + dynamicGap,
    width: obstacleWidth,
    height: canvas.height - (gapY + dynamicGap)
  };
  return { topObs, bottomObs, scored: false };
}

function updateObstacles() {
  if (gameState === "playing") {
    const currentSpeed = getDynamicObstacleSpeed();
    obstacles.forEach(obsPair => {
      obsPair.topObs.x -= currentSpeed;
      obsPair.bottomObs.x -= currentSpeed;
    });
    obstacles = obstacles.filter(obsPair => obsPair.topObs.x + obstacleWidth > 0);
    if (Date.now() - lastObstacleTime > obstacleInterval) {
      obstacles.push(createObstacle(getDynamicObstacleGap()));
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
 * SECTION 14: COLLISION & SCORING
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
    // Check if score boost should end
    if (Date.now() > scoreBoostEndTime && scoreMultiplier > 1) {
      scoreMultiplier = 1;
    }
    
    obstacles.forEach(obsPair => {
      if (!obsPair.scored && obsPair.topObs.x + obstacleWidth < ship.x) {
        score += 1 * scoreMultiplier;
        obsPair.scored = true;
        
        // Chance to spawn a power-up in the gap
        if (Math.random() < POWERUP_SPAWN_CHANCE) {
          const gapCenter = obsPair.topObs.height + 
                           (obsPair.bottomObs.y - obsPair.topObs.height) / 2;
          spawnPowerUp(obsPair.topObs.x, gapCenter);
        }
      }
    });
  }
}

/* =======================================================================
 * SECTION 15: SCOREBOARD
 * ======================================================================= */
const scoreboardDiv = document.getElementById("scoreboard");
function updateScoreboard() {
  if (scoreMultiplier > 1) {
    scoreboardDiv.textContent = `Score: ${score} (x${scoreMultiplier})`;
    scoreboardDiv.style.color = "#FFFF00"; // Yellow for multiplier active
    scoreboardDiv.classList.add("boosted");
  } else {
    scoreboardDiv.textContent = "Score: " + score;
    scoreboardDiv.style.color = "#FFFFFF"; // Reset to white
    scoreboardDiv.classList.remove("boosted");
  }
}

/* =======================================================================
 * SECTION 16: PLAYER PROFILES & STORY PROGRESSION
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

function updatePlayerScore(playerName, currentScore, sessionJumps, sessionTime) {
  let players = getPlayers();
  let player = players.find(p => p.name === playerName);
  
  // If player doesn't exist, create a new player profile
  if (!player) {
    player = { 
      name: playerName, 
      highScore: 0,
      gamesPlayed: 0,
      totalScore: 0,
      spaceAdventures: 0,
      totalJumps: 0,
      obstaclesCleared: 0,
      totalTime: 0,
      powerUpsCollected: 0,
      missionsCompleted: 0,
      
      // New story-related stats
      bestPowerUpsInRun: 0,
      bestSurvivalTime: 0,
      achievedScoreWithoutPowerups: currentScore > 0 && missionProgress.COLLECT === 0 ? currentScore : 0,
      fastModeHighScore: settings.speed === "fast" ? currentScore : 0,
      storyProgress: 0,
      currentStoryMission: null,
      storyMissions: [],
      dateJoined: new Date().toISOString(),
      background: "academy" // Default background
    };
    players.push(player);
  }
  
  // Update player stats
  player.gamesPlayed = (player.gamesPlayed || 0) + 1;
  player.totalScore = (player.totalScore || 0) + currentScore;
  player.spaceAdventures = (player.spaceAdventures || 0) + 1;
  player.totalJumps = (player.totalJumps || 0) + sessionJumps;
  player.obstaclesCleared = (player.obstaclesCleared || 0) + currentScore;
  player.totalTime = (player.totalTime || 0) + sessionTime;
  player.powerUpsCollected = (player.powerUpsCollected || 0) + missionProgress.COLLECT;
  player.missionsCompleted = (player.missionsCompleted || 0) + completedMissionCount;
  
  // New story-related stats
  player.bestPowerUpsInRun = Math.max(player.bestPowerUpsInRun || 0, missionProgress.COLLECT);
  player.bestSurvivalTime = Math.max(player.bestSurvivalTime || 0, sessionTime);
  
  if (missionProgress.COLLECT === 0) {
    player.achievedScoreWithoutPowerups = Math.max(player.achievedScoreWithoutPowerups || 0, currentScore);
  }
  
  if (settings.speed === "fast") {
    player.fastModeHighScore = Math.max(player.fastModeHighScore || 0, currentScore);
  }
  
  // Update high score if current score is higher
  if (currentScore > player.highScore) {
    player.highScore = currentScore;
    
    // Check for level progression
    const prevLevel = storySystem.getPlayerLevel({...player, highScore: player.highScore - 1}).level;
    const newLevel = storySystem.getPlayerLevel(player).level;
    
    if (newLevel > prevLevel) {
      const levelInfo = storySystem.progressionLevels.find(l => l.level === newLevel);
      displayStoryEvent(`Promotion: You are now a ${levelInfo.title}!`);
    }
  }
  
  // Save story mission progress
  storySystem.saveProgress(player);
  
  // Save updated player list
  sortPlayersByHighScore(players);
  savePlayers(players);
  
  return player;
}

function deletePlayerProfile(playerName) {
  if (!confirm(`Are you sure you want to delete your space pilot (${playerName})?`)) return;
  let players = getPlayers();
  players = players.filter(p => p.name !== playerName);
  savePlayers(players);
  menuScreen = "mainMenu";
  showMenuScreen();
}

// Character creation backgrounds
const backgrounds = {
  "academy": { 
    title: "Academy Graduate",
    story: "You've graduated at the top of your class from the prestigious Galactic Defense Academy. Your theoretical knowledge is exceptional, but you have limited field experience. The Academy has fast-tracked you into active service due to the growing cosmic threats.",
    specialty: "Technical precision and quick learning"
  },
  "military": {
    title: "Military Transfer",
    story: "After years of service in the Planetary Defense Corps, you've been recruited by the Galactic Defense Force for your combat experience. Your steady hand and cool demeanor under pressure have earned you a reputation as a reliable pilot.",
    specialty: "Combat tactics and stress resistance"
  },
  "explorer": {
    title: "Explorer",
    story: "You've spent years charting uncharted regions of space as an independent explorer. Your unconventional flight patterns and intimate knowledge of space anomalies caught the attention of the Galactic Defense Force recruiters.",
    specialty: "Navigation and anomaly detection"
  },
  "mechanic": {
    title: "Ship Mechanic",
    story: "Your deep understanding of spacecraft systems has given you an edge in piloting. When others see a ship, you see every component working in harmony. The Galactic Defense Force needs pilots who can adapt and repair on the fly.",
    specialty: "Ship systems and in-flight repairs"
  }
};

  /* =======================================================================
 * SECTION 17: MENU SCREENS
 * ======================================================================= */
const menuOverlay = document.getElementById("menuOverlay");
const menuContent = document.getElementById("menuContent");

// 1. Story-enhanced Main Menu
function showMainMenu() {
  menuContent.innerHTML = `
    <h1 class="menuTitle">Space Adventures</h1>
    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
      <p>The year is 3157. The Galactic Defense Force stands as the last line of protection against cosmic threats.</p>
      <p>Skilled pilots are needed to navigate dangerous sectors and secure the future of humanity.</p>
    </div>
    <button class="menuButton" id="playButton">
      <span class="material-icons icon">rocket_launch</span>
      <span>JOIN THE FORCE</span>
    </button>
    <br>
    <button class="menuButton" id="tutorialButton">
      <span class="material-icons icon">help_outline</span>
      <span>Training Manual</span>
    </button>
    <button class="menuButton" id="scoreboardButton">
      <span class="material-icons icon">emoji_events</span>
      <span>Pilot Rankings</span>
    </button>
    <button class="menuButton" id="settingsButton">
      <span class="material-icons icon">settings</span>
      <span>Flight Settings</span>
    </button>
  `;
  menuOverlay.style.display = "flex";

  document.getElementById("playButton").addEventListener("click", () => {
    menuScreen = "profileSelect";
    showMenuScreen();
  });
  document.getElementById("scoreboardButton").addEventListener("click", () => {
    menuScreen = "scoreboard";
    showMenuScreen();
  });
  document.getElementById("settingsButton").addEventListener("click", () => {
    menuScreen = "settings";
    showMenuScreen();
  });
  document.getElementById("tutorialButton").addEventListener("click", () => {
    showTutorialScreen();
  });
}

// 2. Story-enhanced Tutorial Screen
function showTutorialScreen() {
  menuContent.innerHTML = `
    <h2 style="margin-bottom: 20px;">Pilot Training Manual</h2>
    <div style="text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
      <p><strong>Basic Controls:</strong> Tap screen or press spacebar to activate thrusters.</p>
      <p><strong>Mission Objective:</strong> Navigate through cosmic obstacles while collecting valuable resources.</p>
      <p><strong>Resource Types:</strong></p>
      <ul style="margin-left: 20px; list-style-type: disc;">
        <li>🛡️ Shield Generator - Temporary protection field</li>
        <li>⏱️ Temporal Disruptor - Creates localized time dilation</li>
        <li>💎 Quantum Crystal - Boosts scoring systems</li>
      </ul>
      <p><strong>Missions:</strong> The Galactic Defense Force will assign you objectives during flight. Complete them for rank advancement.</p>
      <p><strong>Career Advancement:</strong> As you gain experience and complete missions, you'll rise through the ranks from Cadet to legendary Fleet Admiral.</p>
    </div>
    <button class="menuButton" id="backButton">
      <span class="material-icons icon">arrow_back</span>
      <span>Return to Command</span>
    </button>
  `;
  
  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 3. Enhanced Profile Selection with Character Creation
function showProfileSelection() {
  let players = getPlayers();
  let optionsHTML = "";
  players.forEach(p => {
    // Get player level and title
    const playerLevel = storySystem.getPlayerLevel(p);
    optionsHTML += `<option value="${p.name}">${p.name} - ${playerLevel.title} (Level ${playerLevel.level})</option>`;
  });

  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 40px;">Space Pilots</h1>
    
    <div style="text-align: left; margin: 20px 0; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px;">
      <p>The Galactic Defense Force is recruiting brave pilots to defend our galaxy from cosmic threats.</p>
      <p>Will you answer the call?</p>
    </div>
    
    ${players.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 10px; font-size: 18px;">Choose Existing Pilot:</label>
        <select class="selectField" id="playerSelect">${optionsHTML}</select>
      </div>
    ` : ''}
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 10px; font-size: 18px;">Or Create New Pilot:</label>
      <input type="text" class="inputField" id="newPlayerName" placeholder="Enter pilot name" maxlength="15" />
      
      <div style="margin-top: 10px;">
        <label style="display: block; margin-bottom: 5px;">Choose Your Background:</label>
        <select class="selectField" id="pilotBackground">
          <option value="academy">Academy Graduate - Excellent technical skills</option>
          <option value="military">Military Transfer - Combat hardened and steady</option>
          <option value="explorer">Explorer - Discovered uncharted space sectors</option>
          <option value="mechanic">Ship Mechanic - Expert in spacecraft systems</option>
        </select>
      </div>
    </div>
    
    <button class="menuButton" id="selectButton">
      <span class="material-icons icon">rocket_launch</span>
      <span>Begin Mission</span>
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
      const background = document.getElementById("pilotBackground").value;
      
      let players = getPlayers();
      if (!players.find(p => p.name === currentPlayer)) {
        const newPlayer = {
          name: currentPlayer,
          highScore: 0,
          gamesPlayed: 0,
          totalScore: 0,
          spaceAdventures: 0,
          totalJumps: 0,
          obstaclesCleared: 0,
          totalTime: 0,
          powerUpsCollected: 0,
          missionsCompleted: 0,
          background: background,
          bestPowerUpsInRun: 0,
          bestSurvivalTime: 0,
          achievedScoreWithoutPowerups: 0,
          fastModeHighScore: 0,
          storyProgress: 0,
          storyMissions: [],
          dateJoined: new Date().toISOString()
        };
        players.push(newPlayer);
        savePlayers(players);
        
        // Show new character intro
        showNewPilotIntro(newPlayer);
      } else {
        showProfileScreen(currentPlayer);
      }
    } else if (selectElem && selectElem.value) {
      // Selecting existing player
      currentPlayer = selectElem.value;
      showProfileScreen(currentPlayer);
    } else {
      alert("Please select or enter a name for your pilot.");
    }
  });
  
  document.getElementById("backButton").addEventListener("click", () => {
    menuScreen = "mainMenu";
    showMenuScreen();
  });
}

// 4. New Pilot Introduction Screen
function showNewPilotIntro(player) {
  const background = backgrounds[player.background] || backgrounds.academy;
  
  menuContent.innerHTML = `
    <h1 class="menuTitle" style="font-size: 32px;">Welcome, Cadet ${player.name}</h1>
    
    <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: left;">
      <h3>${background.title}</h3>
      <p>${background.story}</p>
      <p><strong>Specialty:</strong> ${background.specialty}</p>
      <div style="margin-top: 15px; font-style: italic;">
        <p>Your journey begins now. The galaxy awaits.</p>
        <p>Date of Commission: ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
    
    <div style="margin-top: 20px;">
      <button class="menuButton" id="continueButton">
        <span class="material-icons icon">flight_takeoff</span>
        <span>Begin First Mission</span>
      </button>
    </div>
  `;
  
  document.getElementById("continueButton").addEventListener("click", () => {
    hideMenu();
    startGame();
  });
}

// 5. Enhanced Profile Screen
function showProfileScreen(playerName) {
  const players = getPlayers();
  const player = players.find(p => p.name === playerName);
  if (!player) return `<p>Player <strong>${playerName}</strong> not found.</p>`;
  
  // Get player's level and available missions
  const playerLevel = storySystem.getPlayerLevel(player);
  const availableMissions = storySystem.getAvailableMissions(player);
  
  // Calculate experience to next level
  let nextLevel = null;
  let expToNextLevel = null;
  
  for (let i = 0; i < storySystem.progressionLevels.length; i++) {
    if (storySystem.progressionLevels[i].level > playerLevel.level) {
      nextLevel = storySystem.progressionLevels[i];
      expToNextLevel = nextLevel.minScore - player.highScore;
      break;
    }
  }
  
  const nextRankInfo = nextLevel ? 
    `<div class="progressionInfo">
      <p>Next Rank: ${nextLevel.title} (Level ${nextLevel.level})</p>
      <p>Required Score: ${nextLevel.minScore} (${expToNextLevel} more points needed)</p>
      <div class="missionBar">
        <div class="missionProgress" style="width: ${(player.highScore / nextLevel.minScore) * 100}%"></div>
      </div>
    </div>` : 
    `<div class="progressionInfo">
      <p>Congratulations! You have reached the highest rank.</p>
    </div>`;
  
  // Format the date joined
  const joinDate = player.dateJoined ? new Date(player.dateJoined).toLocaleDateString() : "Unknown";
  
  // Create mission list
  let missionsHTML = "";
  if (availableMissions.length > 0) {
    missionsHTML = `
      <div class="missionsList">
        <h3>Active Missions:</h3>
        <ul>
          ${availableMissions.map(mission => `
            <li>
              <strong>${mission.title}</strong> - ${mission.description}
              <div style="font-size: 12px; color: #AAA;">Reward: ${mission.reward}</div>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  } else {
    missionsHTML = `
      <div class="missionsList">
        <p>No active missions. Complete flights to unlock new challenges!</p>
      </div>
    `;
  }
  
  menuContent.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>Pilot Profile</h2>
      <div class="rankBadge">
        <span class="material-icons" style="font-size: 24px; margin-right: 5px;">military_tech</span>
        ${playerLevel.title} (Level ${playerLevel.level})
      </div>
    </div>
    
    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px;">
      <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; text-align: left;">
        <h3>Pilot Information</h3>
        <p><strong>Name:</strong> ${player.name}</p>
        <p><strong>Rank:</strong> ${playerLevel.title}</p>
        <p><strong>Background:</strong> ${backgrounds[player.background]?.title || "Academy Graduate"}</p>
        <p><strong>Date Commissioned:</strong> ${joinDate}</p>
        <p><strong>Highest Achievement:</strong> Score of ${player.highScore}</p>
      </div>
      
      <div style="flex: 1; min-width: 250px; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; text-align: left;">
        <h3>Flight Statistics</h3>
        <p><strong>Total Flights:</strong> ${player.spaceAdventures}</p>
        <p><strong>Total Flight Time:</strong> ${player.totalTime.toFixed(1)} seconds</p>
        <p><strong>Obstacles Navigated:</strong> ${player.obstaclesCleared}</p>
        <p><strong>Resources Collected:</strong> ${player.powerUpsCollected || 0}</p>
        <p><strong>Missions Completed:</strong> ${player.missionsCompleted || 0}</p>
      </div>
    </div>
    
    <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
      <h3>Career Progression</h3>
      ${nextRankInfo}
    </div>
    
    <div style="background: rgba(0,50,100,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
      ${missionsHTML}
    </div>
    
    <div>
      <button class="menuButton" id="startGameButton">
        <span class="material-icons icon">play_arrow</span>
        <span>Begin Mission</span>
      </button>
      <button class="menuButton" id="deletePlayerButton">
        <span class="material-icons icon">delete</span>
        <span>Discharge Pilot</span>
      </button>
      <button class="menuButton" id="backButton">
        <span class="material-icons icon">arrow_back</span>
        <span>Back</span>
      </button>
    </div>
  `;
  menuOverlay.style.display = "flex";

  document.getElementById("startGameButton").addEventListener("click", () => {
    hideMenu();
    startGame();
  });
  document.getElementById("deletePlayerButton").addEventListener("click", () => {
    deletePlayerProfile(playerName);
  });
  document.getElementById("backButton").addEventListener("click", () => {
    showProfileSelection();
  });
}

// 6. Enhanced Scoreboard Screen
function showScoreboardScreen() {
  let players = getPlayers();
  sortPlayersByHighScore(players);
  
  let leaderboardHTML = "";
  if (players.length === 0) {
    leaderboardHTML = "<p>No pilots have been registered yet. Be the first to join the Galactic Defense Force!</p>";
  } else {
    leaderboardHTML = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr>
            <th style="padding: 10px; text-align: center;">Rank</th>
            <th style="padding: 10px; text-align: left;">Pilot Name</th>
            <th style="padding: 10px; text-align: center;">Status</th>
            <th style="padding: 10px; text-align: right;">Top Score</th>
          </tr>
        </thead>
        <tbody>
    `;

    players.forEach((p, index) => {
        const playerLevel = storySystem.getPlayerLevel(p);
        leaderboardHTML += `
          <tr style="background: ${index < 3 ? 'rgba(50, 100, 150, 0.4)' : 'rgba(0, 0, 0, 0.4)'};">
            <td style="padding: 10px; text-align: center;">${index + 1}</td>
            <td style="padding: 10px; text-align: left;">${p.name}</td>
            <td style="padding: 10px; text-align: center;">${playerLevel.title}</td>
            <td style="padding: 10px; text-align: right;">${p.highScore}</td>
          </tr>
        `;
      });
      
      leaderboardHTML += `
          </tbody>
        </table>
      `;
    }
    
    menuContent.innerHTML = `
      <h2>Galactic Defense Force Rankings</h2>
      <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; text-align: left; margin-bottom: 20px;">
        <p>The most skilled pilots in the galaxy are ranked here based on their exceptional performance in the field.</p>
        <p>Only through dedication, training, and courage can one rise to the top of these standings.</p>
      </div>
      
      <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; overflow-y: auto; max-height: 300px;">
        ${leaderboardHTML}
      </div>
      
      <button class="menuButton" id="backButton" style="margin-top: 20px;">
        <span class="material-icons icon">arrow_back</span>
        <span>Return to Command</span>
      </button>
    `;
    menuOverlay.style.display = "flex";
  
    document.getElementById("backButton").addEventListener("click", () => {
      menuScreen = "mainMenu";
      showMenuScreen();
    });
  }
  
  // 7. Enhanced Settings Screen
  function showSettingsScreen() {
    menuContent.innerHTML = `
      <h2>Flight Controls</h2>
      <div style="margin: 20px 0; text-align: left; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px;">
        <p>Adjust your flight parameters to match your piloting style.</p>
        <p>Caution: Higher speeds award more prestige but come with increased danger.</p>
      </div>
      
      <div style="margin: 20px 0; background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px;">
        <div style="margin-bottom: 15px;">
          <label style="font-size:18px; display: block; margin-bottom: 5px; text-align: left;">Propulsion Speed:</label>
          <select class="selectField" id="speedSelect">
            <option value="slow" ${settings.speed === "slow" ? "selected" : ""}>Training Mode (Slow)</option>
            <option value="normal" ${settings.speed === "normal" ? "selected" : ""}>Standard Mission (Normal)</option>
            <option value="fast" ${settings.speed === "fast" ? "selected" : ""}>Elite Challenge (Fast)</option>
          </select>
        </div>
        
        <div style="text-align: left;">
          <label style="font-size:18px; margin-right: 10px;">Communications:</label>
          <label class="toggle-switch">
            <input type="checkbox" id="soundToggle" ${settings.sound ? "checked" : ""}/>
            <span class="toggle-slider"></span>
          </label>
          <span style="margin-left: 10px;">${settings.sound ? "Enabled" : "Disabled"}</span>
        </div>
      </div>
      
      <button class="menuButton" id="saveSettingsButton">
        <span class="material-icons icon">save</span>
        <span>Confirm Settings</span>
      </button>
      <button class="menuButton" id="backButton">
        <span class="material-icons icon">arrow_back</span>
        <span>Cancel</span>
      </button>
    `;
    menuOverlay.style.display = "flex";
    
    const soundToggle = document.getElementById("soundToggle");
    soundToggle.addEventListener("change", () => {
      const label = soundToggle.nextElementSibling.nextElementSibling;
      label.textContent = soundToggle.checked ? "Enabled" : "Disabled";
    });
  
    document.getElementById("saveSettingsButton").addEventListener("click", () => {
      settings.speed = document.getElementById("speedSelect").value;
      settings.sound = document.getElementById("soundToggle").checked;
      updateSettingsBasedValues();
      
      // Show confirmation message
      const confirmMessage = document.createElement("div");
      confirmMessage.style.position = "absolute";
      confirmMessage.style.top = "20px";
      confirmMessage.style.left = "0";
      confirmMessage.style.right = "0";
      confirmMessage.style.textAlign = "center";
      confirmMessage.innerHTML = `
        <div style="display: inline-block; background: rgba(0,100,0,0.7); border-radius: 5px; padding: 10px 20px;">
          <span class="material-icons" style="vertical-align: middle; margin-right: 5px;">check_circle</span>
          Flight parameters updated successfully
        </div>
      `;
      menuContent.appendChild(confirmMessage);
      
      setTimeout(() => {
        confirmMessage.style.opacity = "0";
        confirmMessage.style.transition = "opacity 0.5s";
        setTimeout(() => confirmMessage.remove(), 500);
      }, 2000);
    });
    
    document.getElementById("backButton").addEventListener("click", () => {
      menuScreen = "mainMenu";
      showMenuScreen();
    });
  }
  
  // 8. Enhanced Game Over Screen
  function showGameOverScreen() {
    // Calculate some stats for this session
    const sessionTime = (Date.now() - sessionStartTime) / 1000;
    const missionsCompletedText = completedMissionCount > 0 ? 
      `<p>Missions Completed: ${completedMissionCount}</p>` : '';
    const powerupsCollectedText = missionProgress.COLLECT > 0 ? 
      `<p>Resources Collected: ${missionProgress.COLLECT}</p>` : '';
    
    // Get updated player information
    const players = getPlayers();
    const player = players.find(p => p.name === currentPlayer);
    const playerLevel = storySystem.getPlayerLevel(player);
    
    // Determine mission status message
    let missionStatusMsg = "";
    if (score > 0) {
      missionStatusMsg = "Mission completed. Data logged to your pilot record.";
    } else {
      missionStatusMsg = "Mission failed. Don't worry, every experienced pilot has setbacks.";
    }
    
    // Check if any missions were completed this run
    let missionCompletionHTML = "";
    if (completedMissionCount > 0) {
      missionCompletionHTML = `
        <div style="background: rgba(0,100,0,0.3); padding: 10px; border-radius: 10px; margin-top: 10px;">
          <p><strong>Mission success!</strong> Your accomplishments have been recorded.</p>
        </div>
      `;
    }
    
    menuOverlay.style.display = "flex";
    menuContent.innerHTML = `
      <h1 class="menuTitle" style="font-size: 40px;">Mission ${score > 0 ? 'Complete' : 'Aborted'}</h1>
      
      <div style="background: rgba(0,0,0,0.5); padding: 15px; border-radius: 10px; margin-bottom: 20px; text-align: left;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div><strong>Pilot:</strong> ${player.name}</div>
          <div><strong>Rank:</strong> ${playerLevel.title}</div>
        </div>
        
        <hr style="border-color: #555; margin: 10px 0;">
        
        <p style="font-size: 24px; text-align: center;">Score: ${score}</p>
        <p><strong>Flight Time:</strong> ${sessionTime.toFixed(1)} seconds</p>
        <p><strong>Maneuvers Executed:</strong> ${sessionJumps}</p>
        ${powerupsCollectedText}
        ${missionsCompletedText}
        
        <hr style="border-color: #555; margin: 10px 0;">
        
        <p style="font-style: italic;">${missionStatusMsg}</p>
        ${missionCompletionHTML}
      </div>
      
      <button class="menuButton" id="restartButton">
        <span class="material-icons icon">replay</span>
        <span>New Mission</span>
      </button>
      <button class="menuButton" id="profileButton">
        <span class="material-icons icon">person</span>
        <span>View Pilot Record</span>
      </button>
      <button class="menuButton" id="menuButton">
        <span class="material-icons icon">home</span>
        <span>Return to Command</span>
      </button>
    `;
    
    document.getElementById("restartButton").addEventListener("click", () => {
      hideMenu();
      resetGame();
      if (settings.sound) backgroundMusic.play();
    });
    
    document.getElementById("profileButton").addEventListener("click", () => {
      showProfileScreen(currentPlayer);
    });
    
    document.getElementById("menuButton").addEventListener("click", () => {
      gameState = "main";
      menuScreen = "mainMenu";
      showMenuScreen();
    });
  }
  
  // Master function to display the correct menu screen
  function showMenuScreen() {
    switch (menuScreen) {
      case "mainMenu":      showMainMenu(); break;
      case "profileSelect": showProfileSelection(); break;
      case "scoreboard":    showScoreboardScreen(); break;
      case "settings":      showSettingsScreen(); break;
      case "gameover":      showGameOverScreen(); break;
      default:              showMainMenu(); break;
    }
  }
  
  function hideMenu() {
    menuOverlay.style.display = "none";
  }
  
  /* =======================================================================
   * SECTION 18: INPUT HANDLING
   * ======================================================================= */
  document.addEventListener("keydown", function(event) {
    if (event.code === "Space" && gameState === "playing") {
      ship.velocity = ship.jumpStrength;
      playSound(jumpSound);
      sessionJumps++;
    }
  });
  
  document.addEventListener("click", function(event) {
    // Only handle clicks on the canvas when playing
    if (gameState === "playing" && event.target === canvas) {
      ship.velocity = ship.jumpStrength;
      playSound(jumpSound);
      sessionJumps++;
    }
  });
  
  document.addEventListener("touchstart", function(event) {
    if (gameState === "playing" && event.target === canvas) {
      ship.velocity = ship.jumpStrength;
      playSound(jumpSound);
      sessionJumps++;
      event.preventDefault();
    }
  }, { passive: false });
  
  /* =======================================================================
   * SECTION 19: GAME FLOW FUNCTIONS
   * ======================================================================= */
  function startGame() {
    resetGame();
    
    // Load player's story progress
    let players = getPlayers();
    let player = players.find(p => p.name === currentPlayer);
    if (player) {
      storySystem.loadProgress(player);
      
      // Display introduction based on player level
      const playerLevel = storySystem.getPlayerLevel(player);
      displayStoryEvent(`MISSION BRIEFING: ${playerLevel.title} ${player.name}`);
      
      setTimeout(() => {
        displayStoryEvent(playerLevel.story);
      }, 3000);
      
      // If player has active story missions, remind them
      const missions = storySystem

    }
  
    if (settings.sound) {
      backgroundMusic.play().catch(error => {
        console.log("Audio play failed:", error);
      });
    }
  }
  
  function resetGame() {
    ship.y = canvas.height / 2;
    ship.velocity = 0;
    ship.thrusterParticles = [];
    ship.shieldActive = false;
    
    obstacles = [];
    powerUps = [];
    score = 0;
    scoreMultiplier = 1;
    gameSpeedMultiplier = 1;
    
    lastObstacleTime = Date.now();
    gameState = "playing";
    sessionJumps = 0;
    sessionStartTime = Date.now();
    obstacles.push(createObstacle(getDynamicObstacleGap()));
    
    // Initialize missions
    initMissions();
    completedMissionCount = 0;
    powerUpMessages = [];
    storyEvents = []; // Clear any story events
    
    // Reset game speeds
    updateSettingsBasedValues();
    
    // Show new mission intro
    const players = getPlayers();
    const player = players.find(p => p.name === currentPlayer);
    if (player) {
      const playerLevel = storySystem.getPlayerLevel(player);
      displayStoryEvent(`MISSION BRIEFING: ${playerLevel.title} ${player.name}`);
      
      // Display mission information after a delay
      setTimeout(() => {
        // Show a random mission description
        const missionDescriptions = [
          "Navigate through the asteroid field and collect valuable resources.",
          "Patrol the outer rim and report any unusual activity.",
          "Test your ship's capabilities in this sector's challenging conditions.",
          "Transport critical supplies through this dangerous corridor.",
          "Scout ahead for the fleet and identify safe passage routes."
        ];
        const randomDescription = missionDescriptions[Math.floor(Math.random() * missionDescriptions.length)];
        displayStoryEvent(randomDescription);
      }, 3000);
    }
  }
  
  /* =======================================================================
   * SECTION 20: MAIN GAME LOOP
   * ======================================================================= */
  function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawSpaceBackground();
    
    if (gameState === "playing") {
      updateObstacles();
      updateShipWithEffects();
      updatePowerUps();
      updateScore();
      updateMissions();
      
      // Trigger random story events
      if (Math.random() < 0.001) { // 0.1% chance per frame
        storySystem.triggerRandomEvent();
      }
    }
    
    drawObstacles();
    drawPowerUps();
    drawShipWithEffects();
    updateScoreboard();
    drawMissionPanel();
    updateAndDrawPowerUpMessages();
    
    // Draw story events
    updateAndDrawStoryEvents();
    
    // Additional status indicators
    if (gameState === "playing") {
      // Show power-up status
      if (ship.shieldActive) {
        const timeLeft = Math.max(0, (ship.shieldTime + ship.shieldDuration - Date.now()) / 1000).toFixed(1);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Shield: ${timeLeft}s`, 20, 60);
      }
      
      if (scoreMultiplier > 1) {
        const timeLeft = Math.max(0, (scoreBoostEndTime - Date.now()) / 1000).toFixed(1);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Score Boost: ${timeLeft}s`, 20, 80);
      }
      
      if (gameSpeedMultiplier < 1) {
        const timeLeft = Math.max(0, (slowModeEndTime - Date.now()) / 1000).toFixed(1);
        ctx.fillStyle = "#FFF";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`Time Warp: ${timeLeft}s`, 20, 100);
      }
    }
    
    if (gameState === "playing" && checkCollision()) {
      if (ship.shieldActive) {
        // Shield protects from one collision
        ship.shieldActive = false;
        displayStoryEvent("Shield absorbed impact! Systems nominal.");
        displayPowerUpMessage("Shield Broken!");
        playSound(shieldBreakSound);
      } else {
        gameState = "gameover";
        const sessionTime = (Date.now() - sessionStartTime) / 1000;
        const player = updatePlayerScore(currentPlayer, score, sessionJumps, sessionTime);
        
        // Check for story mission completion
        storySystem.checkMissionCompletion(player);
        
        playSound(collisionSound);
        playSound(gameOverSound);
        backgroundMusic.pause();
        menuScreen = "gameover";
        showGameOverScreen();
      }
    }
    
    requestAnimationFrame(gameLoop);
  }
  
  /* =======================================================================
   * SECTION 21: INITIALIZATION
   * ======================================================================= */
  // Try to preload all audio
  function preloadAudio() {
    const audioFiles = [
      backgroundMusic,
      jumpSound,
      collisionSound,
      gameOverSound,
      powerUpSound,
      shieldBreakSound,
      missionCompleteSound
    ];
    
    audioFiles.forEach(audio => {
      audio.load();
      // Set volume for all files
      audio.volume = 0.7;
    });
    
    // Background music should be quieter
    backgroundMusic.volume = 0.3;
  }
  
  // Make sure resources are loaded
  window.addEventListener('load', () => {
    preloadAudio();
    
    // Start the game loop
    gameLoop();
    
    // Show the main menu
    showMenuScreen();
    
    // Add a first-time tutorial prompt if it's a new user
    if (getPlayers().length === 0) {
      menuContent.innerHTML += `
        <div style="position: absolute; bottom: 10px; left: 0; right: 0; text-align: center;">
          <p>First time? Check out "How to Play" to get started!</p>
        </div>
      `;
    }
  });
  
  // Handle window resize events
  window.addEventListener('resize', () => {
    setCanvasSize();
    initStarLayers();
  });
  
  // Prevent scrolling on mobile when playing
  document.body.addEventListener('touchmove', event => {
    if (gameState === 'playing') {
      event.preventDefault();
    }
  }, { passive: false });
  
  // Handle visibility change to pause background music
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      backgroundMusic.pause();
    } else if (gameState === 'playing' && settings.sound) {
      backgroundMusic.play().catch(() => {});
    }
  });