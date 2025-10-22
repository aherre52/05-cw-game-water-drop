// Variables to control game state
let gameRunning = false; // Keeps track of whether game is active or not
let dropMaker; // Will store our timer that creates drops regularly
let dropInterval = 1000; // ms between drops (can be adjusted)
let drops = []; // track current drops in DOM
let score = 0;
let health = 5;
let player = null;
let playerEnabled = true;

// Wait for button click to start the game
// wire bottom controls (unique ids)
const startEl = document.getElementById('start-bottom') || document.getElementById('start-btn');
const resetEl = document.getElementById('reset-bottom') || document.getElementById('reset-btn');
if (startEl) startEl.addEventListener('click', startGame);
if (resetEl) resetEl.addEventListener('click', resetGame);

// create player jerry can if missing
function ensurePlayer() {
  const container = document.getElementById('game-container');
  player = document.getElementById('player');
  if (!player) {
    player = document.createElement('div');
    player.id = 'player';
    player.className = 'jerry-can';
    // start centered at bottom
    player.style.position = 'absolute';
    player.style.bottom = '8px';
  // reduce player size by 10% (from 240x144 -> 216x130)
  player.style.width = '216px';
  player.style.height = '130px';
    // will compute left to center reliably using container width
    container.appendChild(player);
    
    // Add touch and mouse event listeners
    player.addEventListener('mousedown', handleDragStart);
    player.addEventListener('touchstart', handleDragStart);
  }
  // Ensure player is centered after creation (or if already exists)
  repositionPlayer();

  // Use the jerry can image as the player's background (no fallback)
  const imgPath = 'img/jerry-can.png';
  player.classList.add('with-image');
  player.style.backgroundImage = `url('${imgPath}')`;
  player.style.backgroundSize = 'contain';
  player.style.backgroundRepeat = 'no-repeat';
  player.style.backgroundPosition = 'center bottom';
}

function repositionPlayer() {
  const container = document.getElementById('game-container');
  if (!container) return;
  player = document.getElementById('player');
  if (!player) return;
  // determine computed player width
  const styleWidth = player.offsetWidth || parseInt(player.style.width, 10) || 80;
  const left = Math.max(0, Math.round((container.clientWidth - styleWidth) / 2));
  player.style.left = left + 'px';
  // ensure visible above drops
  player.style.zIndex = '60';
}

// keep player centered on resize/orientation changes
window.addEventListener('resize', () => {
  repositionPlayer();
});
window.addEventListener('orientationchange', () => {
  setTimeout(repositionPlayer, 100);
});

function startGame() {
  // Prevent multiple games from running at once
  if (gameRunning) return;

  gameRunning = true;

  // reset state values if starting fresh
  score = 0;
  health = 5;
  updateUI();

  playerEnabled = true;
  ensurePlayer();

  // Create new drops regularly
  dropMaker = setInterval(createDrop, dropInterval);
}

function createDrop() {
  // Create a new div element that will be our water drop
  const drop = document.createElement("div");
  drop.classList.add('drop');

  // Decide drop type randomly: clean (good) or dirty (bad)
  const isClean = Math.random() < 0.75; // 75% clean, 25% dirty
  drop.classList.add(isClean ? 'clean' : 'dirty');
  drop.dataset.type = isClean ? 'clean' : 'dirty';

  // Make drops different sizes for visual variety
  const initialSize = 40;
  const sizeMultiplier = Math.random() * 0.8 + 0.6;
  const size = Math.round(initialSize * sizeMultiplier);
  drop.style.width = drop.style.height = `${size}px`;

  // Position the drop randomly across the game width
  const container = document.getElementById('game-container');
  const gameWidth = container.offsetWidth;
  const xPosition = Math.random() * Math.max(0, (gameWidth - size));
  drop.style.left = xPosition + "px";

  // Make drops fall for a variable duration based on size
  const fallDuration = 3 + Math.random() * 2; // 3s - 5s
  drop.style.animationDuration = fallDuration + "s";

  // Add the new drop to the game screen
  container.appendChild(drop);
  drops.push(drop);

  // Remove drops that reach the bottom (weren't clicked)
  drop.addEventListener('animationend', () => {
    // when animation finishes treat as missed drop
    // if it's a clean drop (good water) the player missed it -> decrease score
    if (drop.dataset.type === 'clean') {
      score = Math.max(0, score - 1);
      updateUI();
    }
    removeDrop(drop);
  });

  // check collisions periodically for this drop
  const collisionCheck = setInterval(() => {
    if (!player || !playerEnabled) return;
    if (checkCollision(player, drop)) {
      // collision happened
      handleCollision(drop);
      clearInterval(collisionCheck);
    }
    // if drop removed, stop checking
    if (!document.body.contains(drop)) {
      clearInterval(collisionCheck);
    }
  }, 50);
}

function removeDrop(drop) {
  const idx = drops.indexOf(drop);
  if (idx !== -1) drops.splice(idx, 1);
  if (drop && drop.parentNode) drop.parentNode.removeChild(drop);
}

function handleCollision(drop) {
  const type = drop.dataset.type || 'clean';
  if (type === 'clean') {
    score += 1;
    // extra credit: confetti when threshold reached
    if (score >= 20) {
      // Player reached the winning score
      showWin();
      return;
    }
  } else {
    health -= 1;
  }
  updateUI();
  removeDrop(drop);

  if (health <= 0) {
    endGame();
  }
}

function updateUI() {
  const scoreEl = document.querySelector('#score');
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  const healthEl = document.querySelector('#health');
  if (healthEl) healthEl.textContent = `Health: ${health}`;
}

function endGame() {
  // stop spawning and disable player
  if (dropMaker) clearInterval(dropMaker);
  gameRunning = false;
  playerEnabled = false;
  showGameOver();
}

function resetGame() {
  // stop intervals
  if (dropMaker) clearInterval(dropMaker);
  gameRunning = false;
  playerEnabled = false;

  // clear existing drops
  drops.slice().forEach(removeDrop);

  // reset values
  score = 0;
  health = 5;
  updateUI();

  // remove game over overlay if any
  const overlay = document.getElementById('game-over-overlay');
  if (overlay) overlay.remove();

  // remove win overlay and any celebration elements
  const winOverlay = document.getElementById('win-overlay');
  if (winOverlay) winOverlay.remove();
  
  // clean up any lingering celebration banners
  const celebrations = document.querySelectorAll('.celebration');
  celebrations.forEach(el => el.remove());

  // allow starting again
  playerEnabled = true;
  ensurePlayer();
}

// simple celebration effect (text overlay), lightweight confetti could be added later
function showCelebration() {
  const container = document.getElementById('game-container');
  const el = document.createElement('div');
  el.className = 'celebration';
  el.textContent = 'You helped supply water!';
  container.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

// Show win overlay and stop the game
function showWin() {
  // stop spawning drops and disable player
  if (dropMaker) clearInterval(dropMaker);
  gameRunning = false;
  playerEnabled = false;

  const container = document.getElementById('game-container');
  // create a persistent winning overlay
  let win = document.getElementById('win-overlay');
  if (!win) {
    win = document.createElement('div');
    win.id = 'win-overlay';
    win.innerHTML = '<div class="win-inner">You Win! 🎉<div class="win-sub">Thanks — 20 drops collected</div></div>';
    container.appendChild(win);
  }

  // optional celebration animation: briefly show the celebration banner too
  const conf = document.createElement('div');
  conf.className = 'celebration';
  conf.textContent = 'Celebration!';
  container.appendChild(conf);
  setTimeout(() => conf.remove(), 2200);
}

function showGameOver() {
  const container = document.getElementById('game-container');
  let overlay = document.getElementById('game-over-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'game-over-overlay';
    overlay.innerHTML = '<div class="game-over-inner">Game Over</div>';
    container.appendChild(overlay);
  }
}

// Basic AABB collision detection between player and drop
function checkCollision(a, b) {
  if (!a || !b) return false;
  const rectA = a.getBoundingClientRect();
  const rectB = b.getBoundingClientRect();
  // Use a distance-based radius from the player's center to determine catches.
  const aCx = rectA.left + rectA.width / 2;
  const aCy = rectA.top + rectA.height / 2;
  const bCx = rectB.left + rectB.width / 2;
  const bCy = rectB.top + rectB.height / 2;
  const dx = aCx - bCx;
  const dy = aCy - bCy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  // increase catch radius to roughly match visible sprite size
  const catchRadius = Math.max(18, rectA.width * 0.45);
  return dist <= catchRadius;
}

// Touch and mouse drag controls
let isDragging = false;
let dragStartX = 0;
let playerStartX = 0;

function handleDragStart(e) {
    if (!playerEnabled || !player) return;
    
    // Only allow dragging if clicking/touching the player
    const playerRect = player.getBoundingClientRect();
    const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    
    if (clientY >= playerRect.top && clientY <= playerRect.bottom &&
        clientX >= playerRect.left && clientX <= playerRect.right) {
        isDragging = true;
        dragStartX = clientX;
        playerStartX = parseInt(player.style.left || '0', 10);
        
        // Prevent text selection while dragging
        e.preventDefault();
    }
}

function handleDragMove(e) {
    if (!isDragging || !playerEnabled) return;
    
    const container = document.getElementById('game-container');
    const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const deltaX = clientX - dragStartX;
    const newLeft = playerStartX + deltaX;
    
  // Keep player within container bounds (allow flush-to-edge placement)
  const maxLeft = Math.max(0, container.clientWidth - player.offsetWidth);
  player.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
    
    e.preventDefault();
}

function handleDragEnd() {
    isDragging = false;
}

// Add window-level event listeners once
window.addEventListener('mousemove', handleDragMove);
window.addEventListener('touchmove', handleDragMove, { passive: false });

window.addEventListener('mouseup', handleDragEnd);
window.addEventListener('touchend', handleDragEnd);
window.addEventListener('touchcancel', handleDragEnd);
