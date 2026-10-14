/**
 * Alien Invasion - HTML5 Canvas Web Port
 * Faithful recreation of the Pygame game by Kapil Dhwaj
 */

// Sound effects generator using Web Audio API
class SoundEffects {
  constructor() {
    this.audioCtx = null;
    this.muted = false;
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playLaser() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.audioCtx.sampleRate * 0.25;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(50, this.audioCtx.currentTime + 0.25);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start();
    } catch (e) {}
  }

  playHit() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.4);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  playLevelUp() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.audioCtx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25];
      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);
        gain.gain.setValueAtTime(0.2, now + index * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (index + 1) * 0.12);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + index * 0.08);
        osc.stop(now + (index + 1) * 0.12);
      });
    } catch (e) {}
  }
}

class AlienInvasionGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundEffects();

    // Dimensions
    this.screenWidth = 1200;
    this.screenHeight = 800;
    this.bgColor = '#e6e6e6';

    // Game Settings
    this.shipLimit = 3;
    this.speedupScale = 1.1;
    this.scoreScale = 1.5;

    // Dynamic settings
    this.initDynamicSettings();

    // Stats
    this.shipsLeft = this.shipLimit;
    this.score = 0;
    this.level = 1;
    this.highScore = parseInt(localStorage.getItem('alien_invasion_high_score') || '0', 10);

    // State
    this.gameActive = false;
    this.isPausedForHit = false;

    // Sprites
    this.ship = {
      width: 60,
      height: 48,
      x: (this.screenWidth - 60) / 2,
      y: this.screenHeight - 48,
      movingRight: false,
      movingLeft: false
    };

    this.bullets = [];
    this.aliens = [];

    // Assets
    this.shipImg = new Image();
    this.shipImg.src = 'images/ship.png';

    this.alienImg = new Image();
    this.alienImg.src = 'images/alien.png';

    // Play Button Rect
    this.button = {
      width: 200,
      height: 50,
      x: (this.screenWidth - 200) / 2,
      y: (this.screenHeight - 50) / 2,
      color: '#008700',
      textColor: '#ffffff'
    };

    this.setupEventListeners();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initDynamicSettings() {
    this.shipSpeed = 1.5 * 3; // scaled for 60fps web delta
    this.bulletSpeed = 2.5 * 3;
    this.bulletWidth = 3;
    this.bulletHeight = 15;
    this.bulletColor = '#3c3c3c';
    this.alienSpeed = 1.0 * 2.5;
    this.fleetDropSpeed = 15;
    this.fleetDirection = 1; // 1 = right, -1 = left
    this.alienPoints = 50;
  }

  increaseSpeed() {
    this.shipSpeed *= this.speedupScale;
    this.bulletSpeed *= this.speedupScale;
    this.alienSpeed *= this.speedupScale;
    this.alienPoints = Math.floor(this.alienPoints * this.scoreScale);
  }

  startGame() {
    this.sound.init();
    this.initDynamicSettings();
    this.shipsLeft = this.shipLimit;
    this.score = 0;
    this.level = 1;
    this.bullets = [];
    this.aliens = [];
    this.createFleet();
    this.centerShip();
    this.gameActive = true;
    this.isPausedForHit = false;
  }

  centerShip() {
    this.ship.x = (this.screenWidth - this.ship.width) / 2;
    this.ship.y = this.screenHeight - this.ship.height;
    this.ship.movingRight = false;
    this.ship.movingLeft = false;
  }

  fireBullet() {
    if (!this.gameActive || this.isPausedForHit) return;
    // Allow up to 5 simultaneous bullets on screen for smoother gameplay
    if (this.bullets.length < 5) {
      this.bullets.push({
        x: this.ship.x + (this.ship.width - this.bulletWidth) / 2,
        y: this.ship.y,
        width: this.bulletWidth,
        height: this.bulletHeight
      });
      this.sound.playLaser();
    }
  }

  createFleet() {
    this.aliens = [];
    const alienWidth = 60;
    const alienHeight = 58;

    let currentY = alienHeight;
    while (currentY < (this.screenHeight - 3 * alienHeight)) {
      let currentX = alienWidth;
      while (currentX < (this.screenWidth - 2 * alienWidth)) {
        this.aliens.push({
          x: currentX,
          y: currentY,
          width: alienWidth,
          height: alienHeight
        });
        currentX += 2 * alienWidth;
      }
      currentY += 2 * alienHeight;
    }
  }

  checkFleetEdges() {
    for (const alien of this.aliens) {
      if (alien.x + alien.width >= this.screenWidth || alien.x <= 0) {
        this.changeFleetDirection();
        break;
      }
    }
  }

  changeFleetDirection() {
    for (const alien of this.aliens) {
      alien.y += this.fleetDropSpeed;
    }
    this.fleetDirection *= -1;
  }

  updateAliens() {
    this.checkFleetEdges();
    for (const alien of this.aliens) {
      alien.x += this.alienSpeed * this.fleetDirection;

      // Check collision with ship
      if (this.checkCollision(this.ship, alien)) {
        this.shipHit();
        return;
      }

      // Check aliens reaching bottom
      if (alien.y + alien.height >= this.screenHeight) {
        this.shipHit();
        return;
      }
    }
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y -= this.bulletSpeed;
      if (this.bullets[i].y + this.bullets[i].height <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Check bullet-alien collisions
    for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
      const bullet = this.bullets[bIndex];
      for (let aIndex = this.aliens.length - 1; aIndex >= 0; aIndex--) {
        const alien = this.aliens[aIndex];
        if (this.checkCollision(bullet, alien)) {
          this.bullets.splice(bIndex, 1);
          this.aliens.splice(aIndex, 1);
          this.score += this.alienPoints;
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('alien_invasion_high_score', this.highScore.toString());
          }
          this.sound.playExplosion();
          break;
        }
      }
    }

    // Fleet cleared - Next wave
    if (this.aliens.length === 0 && this.gameActive && !this.isPausedForHit) {
      this.bullets = [];
      this.createFleet();
      this.increaseSpeed();
      this.level += 1;
      this.sound.playLevelUp();
    }
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  shipHit() {
    if (this.isPausedForHit) return;
    this.sound.playHit();

    if (this.shipsLeft > 1) {
      this.shipsLeft -= 1;
      this.isPausedForHit = true;
      this.bullets = [];
      this.aliens = [];

      setTimeout(() => {
        this.createFleet();
        this.centerShip();
        this.isPausedForHit = false;
      }, 800);
    } else {
      this.shipsLeft = 0;
      this.gameActive = false;
    }
  }

  update() {
    if (!this.gameActive || this.isPausedForHit) return;

    if (this.ship.movingRight && (this.ship.x + this.ship.width < this.screenWidth)) {
      this.ship.x += this.shipSpeed;
    }
    if (this.ship.movingLeft && (this.ship.x > 0)) {
      this.ship.x -= this.shipSpeed;
    }

    this.updateBullets();
    this.updateAliens();
  }

  draw() {
    // Clear / background
    this.ctx.fillStyle = this.bgColor;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // Draw Ship
    if (this.shipImg.complete && this.shipImg.naturalWidth > 0) {
      this.ctx.drawImage(this.shipImg, this.ship.x, this.ship.y, this.ship.width, this.ship.height);
    } else {
      // Fallback ship vector
      this.ctx.fillStyle = '#2563eb';
      this.ctx.beginPath();
      this.ctx.moveTo(this.ship.x + this.ship.width / 2, this.ship.y);
      this.ctx.lineTo(this.ship.x + this.ship.width, this.ship.y + this.ship.height);
      this.ctx.lineTo(this.ship.x, this.ship.y + this.ship.height);
      this.ctx.closePath();
      this.ctx.fill();
    }

    // Draw Aliens
    for (const alien of this.aliens) {
      if (this.alienImg.complete && this.alienImg.naturalWidth > 0) {
        this.ctx.drawImage(this.alienImg, alien.x, alien.y, alien.width, alien.height);
      } else {
        // Fallback alien vector
        this.ctx.fillStyle = '#16a34a';
        this.ctx.fillRect(alien.x + 5, alien.y + 5, alien.width - 10, alien.height - 10);
      }
    }

    // Draw Bullets
    this.ctx.fillStyle = this.bulletColor;
    for (const b of this.bullets) {
      this.ctx.fillRect(b.x, b.y, b.width, b.height);
    }

    // Draw Scoreboard
    this.drawScoreboard();

    // Draw Play Button when inactive
    if (!this.gameActive) {
      this.drawPlayButton();
    }
  }

  drawScoreboard() {
    this.ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textBaseline = 'top';

    // Score (Top Right)
    this.ctx.fillStyle = '#1e1e1e';
    this.ctx.textAlign = 'right';
    const roundedScore = Math.round(this.score / 10) * 10;
    this.ctx.fillText(`SCORE  ${roundedScore.toLocaleString()}`, this.screenWidth - 25, 20);

    // High Score (Top Center)
    this.ctx.textAlign = 'center';
    const roundedHighScore = Math.round(this.highScore / 10) * 10;
    this.ctx.fillText(`HIGH SCORE  ${roundedHighScore.toLocaleString()}`, this.screenWidth / 2, 20);

    // Level (Below Score)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`LEVEL  ${this.level}`, this.screenWidth - 25, 60);

    // Remaining Ships (Top Left Icons)
    for (let i = 0; i < this.shipsLeft; i++) {
      const iconX = 20 + i * 45;
      const iconY = 15;
      if (this.shipImg.complete && this.shipImg.naturalWidth > 0) {
        this.ctx.drawImage(this.shipImg, iconX, iconY, 36, 29);
      } else {
        this.ctx.fillStyle = '#2563eb';
        this.ctx.fillRect(iconX, iconY, 30, 24);
      }
    }
  }

  drawPlayButton() {
    // Button background
    this.ctx.fillStyle = this.button.color;
    this.ctx.beginPath();
    this.ctx.roundRect ? this.ctx.roundRect(this.button.x, this.button.y, this.button.width, this.button.height, 6)
                       : this.ctx.fillRect(this.button.x, this.button.y, this.button.width, this.button.height);
    this.ctx.fill();

    // Button text
    this.ctx.fillStyle = this.button.textColor;
    this.ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Play', this.button.x + this.button.width / 2, this.button.y + this.button.height / 2);
  }

  gameLoop(currentTime) {
    this.update();
    this.draw();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupEventListeners() {
    // Keyboard
    window.addEventListener('keydown', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.ship.movingRight = true;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.ship.movingLeft = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (!this.gameActive) {
          this.startGame();
        } else {
          this.fireBullet();
        }
      } else if (e.code === 'KeyP') {
        if (!this.gameActive) this.startGame();
      } else if (e.code === 'KeyM') {
        this.sound.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.ship.movingRight = false;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.ship.movingLeft = false;
      }
    });

    // Canvas click (Play Button)
    const handleCanvasClick = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (clientX - rect.left) * scaleX;
      const mouseY = (clientY - rect.top) * scaleY;

      if (!this.gameActive) {
        if (
          mouseX >= this.button.x &&
          mouseX <= this.button.x + this.button.width &&
          mouseY >= this.button.y &&
          mouseY <= this.button.y + this.button.height
        ) {
          this.startGame();
        }
      }
    };

    this.canvas.addEventListener('click', (e) => handleCanvasClick(e.clientX, e.clientY));

    // Touch Support for mobile controls
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnFire = document.getElementById('btnFire');

    const bindTouch = (elem, onPress, onRelease) => {
      if (!elem) return;
      elem.addEventListener('touchstart', (e) => {
        e.preventDefault();
        onPress();
      });
      elem.addEventListener('touchend', (e) => {
        e.preventDefault();
        onRelease();
      });
      elem.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onPress();
      });
      elem.addEventListener('mouseup', (e) => {
        e.preventDefault();
        onRelease();
      });
      elem.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        onRelease();
      });
    };

    bindTouch(btnLeft, () => { this.ship.movingLeft = true; }, () => { this.ship.movingLeft = false; });
    bindTouch(btnRight, () => { this.ship.movingRight = true; }, () => { this.ship.movingRight = false; });
    bindTouch(btnFire, () => {
      if (!this.gameActive) {
        this.startGame();
      } else {
        this.fireBullet();
      }
    }, () => {});
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  window.alienGame = new AlienInvasionGame(canvas);
});
