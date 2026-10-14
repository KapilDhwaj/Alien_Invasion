/**
 * Alien Invasion - Enhanced Web Edition
 * Fully playable, balanced speeds with Delta-Time, and arcade visual animations:
 * - Parallax moving space starfield
 * - Explosive particle bursts on alien destruction
 * - Ship thruster exhaust flames & smoke trail
 * - Floating score text popups
 * - Screen shake impact feedback
 * - Level clear announcement banner
 * - Pulsing play button glow
 */

// Synthesized sound effects using Web Audio API
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
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.audioCtx.currentTime;
      const bufferSize = this.audioCtx.sampleRate * 0.3;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.exponentialRampToValueAtTime(40, now + 0.3);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      noise.start(now);
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
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
      gain.gain.setValueAtTime(0.35, now);
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
      const notes = [293.66, 369.99, 440.00, 587.33];
      notes.forEach((freq, index) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.09);
        gain.gain.setValueAtTime(0.18, now + index * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (index + 1) * 0.15);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + index * 0.09);
        osc.stop(now + (index + 1) * 0.15);
      });
    } catch (e) {}
  }
}

class AlienInvasionGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundEffects();

    // Fixed canvas internal resolution
    this.screenWidth = 1200;
    this.screenHeight = 800;

    // Rules
    this.shipLimit = 3;
    this.speedupScale = 1.08;
    this.scoreScale = 1.5;

    // State
    this.gameActive = false;
    this.isPausedForHit = false;
    this.shipsLeft = this.shipLimit;
    this.score = 0;
    this.level = 1;
    this.highScore = parseInt(localStorage.getItem('alien_invasion_high_score') || '0', 10);

    // Initial dynamic speeds (tuned for smooth, enjoyable Level 1 gameplay)
    this.initDynamicSettings();

    // Ship definition
    this.ship = {
      width: 60,
      height: 48,
      x: (this.screenWidth - 60) / 2,
      y: this.screenHeight - 65,
      movingRight: false,
      movingLeft: false
    };

    this.bullets = [];
    this.aliens = [];

    // Visual Animation Systems
    this.particles = [];
    this.floatingTexts = [];
    this.stars = [];
    this.initStars(90);

    // Screen Shake effect
    this.screenShakeTime = 0;
    this.screenShakeMagnitude = 0;

    // Wave Banner effect
    this.bannerText = '';
    this.bannerAlpha = 0;
    this.bannerScale = 1;

    // Sprites
    this.shipImg = new Image();
    this.shipImg.src = 'images/ship.png';

    this.alienImg = new Image();
    this.alienImg.src = 'images/alien.png';

    // Play Button Rect
    this.button = {
      width: 220,
      height: 56,
      x: (this.screenWidth - 220) / 2,
      y: (this.screenHeight - 56) / 2,
      color: '#008700',
      hoverColor: '#00a300',
      isHovered: false
    };

    this.setupEventListeners();

    // Delta-time setup
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  initStars(count) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.screenWidth,
        y: Math.random() * this.screenHeight,
        radius: Math.random() * 1.6 + 0.4,
        speed: Math.random() * 25 + 10,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 2 + 1
      });
    }
  }

  initDynamicSettings() {
    // Speeds in PIXELS PER SECOND (normalized via dt)
    // Level 1: Aliens move gently so the player has time to aim and strategize!
    this.alienSpeed = 70;       // was 150+ in original conversion; now balanced & steady
    this.fleetDropSpeed = 18;   // drop distance per edge hit
    this.fleetDirection = 1;    // 1 = right, -1 = left

    this.shipSpeed = 440;       // swift, responsive player movement
    this.bulletSpeed = 680;     // crisp, fast laser velocity
    this.bulletWidth = 3;
    this.bulletHeight = 16;
    this.bulletColor = '#ff2a5f';

    this.alienPoints = 50;
  }

  increaseSpeed() {
    this.alienSpeed = Math.min(this.alienSpeed * this.speedupScale, 260);
    this.shipSpeed = Math.min(this.shipSpeed * 1.03, 580);
    this.bulletSpeed = Math.min(this.bulletSpeed * 1.04, 900);
    this.alienPoints = Math.floor(this.alienPoints * this.scoreScale);
  }

  startGame() {
    this.sound.init();
    this.initDynamicSettings();
    this.shipsLeft = this.shipLimit;
    this.score = 0;
    this.level = 1;
    this.bullets = [];
    this.particles = [];
    this.floatingTexts = [];
    this.createFleet();
    this.centerShip();
    this.gameActive = true;
    this.isPausedForHit = false;

    this.triggerBanner(`WAVE 1`);
  }

  centerShip() {
    this.ship.x = (this.screenWidth - this.ship.width) / 2;
    this.ship.y = this.screenHeight - 65;
    this.ship.movingRight = false;
    this.ship.movingLeft = false;
  }

  fireBullet() {
    if (!this.gameActive || this.isPausedForHit) return;
    if (this.bullets.length < 5) {
      this.bullets.push({
        x: this.ship.x + (this.ship.width - this.bulletWidth) / 2,
        y: this.ship.y,
        width: this.bulletWidth,
        height: this.bulletHeight
      });
      this.sound.playLaser();

      // Muzzle spark
      this.spawnSparks(this.ship.x + this.ship.width / 2, this.ship.y, 4, '#ff5588');
    }
  }

  createFleet() {
    this.aliens = [];
    const alienWidth = 60;
    const alienHeight = 58;

    let currentY = alienHeight + 20;
    let rowIndex = 0;
    while (currentY < (this.screenHeight - 3.2 * alienHeight)) {
      let currentX = alienWidth + 10;
      let colIndex = 0;
      while (currentX < (this.screenWidth - 2 * alienWidth)) {
        this.aliens.push({
          x: currentX,
          y: currentY,
          baseY: currentY,
          width: alienWidth,
          height: alienHeight,
          row: rowIndex,
          col: colIndex,
          bobOffset: (rowIndex + colIndex) * 0.4
        });
        currentX += 2 * alienWidth;
        colIndex++;
      }
      currentY += 2 * alienHeight;
      rowIndex++;
    }
  }

  checkFleetEdges() {
    for (const alien of this.aliens) {
      if ((alien.x + alien.width >= this.screenWidth - 10 && this.fleetDirection > 0) ||
          (alien.x <= 10 && this.fleetDirection < 0)) {
        this.changeFleetDirection();
        break;
      }
    }
  }

  changeFleetDirection() {
    for (const alien of this.aliens) {
      alien.y += this.fleetDropSpeed;
      alien.baseY += this.fleetDropSpeed;
    }
    this.fleetDirection *= -1;
  }

  // Visual Effects: Spawn explosion particles
  spawnExplosion(x, y, count = 18, colorTheme = 'alien') {
    const colors = colorTheme === 'alien'
      ? ['#00ff88', '#38bdf8', '#a7f3d0', '#ffffff', '#22c55e']
      : ['#ff4444', '#f97316', '#fbbf24', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 180 + 30;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1.0,
        decay: Math.random() * 1.5 + 1.2
      });
    }
  }

  spawnSparks(x, y, count = 5, color = '#ff5588') {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = Math.random() * 90 + 20;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2 + 1.5,
        color: color,
        alpha: 0.9,
        decay: 3.5
      });
    }
  }

  addFloatingText(text, x, y, color = '#facc15') {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      alpha: 1.0,
      vy: -50,
      color: color
    });
  }

  triggerScreenShake(duration = 0.25, magnitude = 8) {
    this.screenShakeTime = duration;
    this.screenShakeMagnitude = magnitude;
  }

  triggerBanner(text) {
    this.bannerText = text;
    this.bannerAlpha = 1.0;
    this.bannerScale = 0.5;
  }

  shipHit() {
    if (this.isPausedForHit) return;
    this.sound.playHit();
    this.triggerScreenShake(0.35, 12);
    this.spawnExplosion(this.ship.x + this.ship.width / 2, this.ship.y + this.ship.height / 2, 24, 'ship');

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
      this.triggerBanner('GAME OVER');
    }
  }

  update(dt, totalTime) {
    // 1. Update background starfield
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.screenHeight) {
        star.y = 0;
        star.x = Math.random() * this.screenWidth;
      }
    }

    // 2. Update screen shake
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
      if (this.screenShakeTime <= 0) {
        this.screenShakeMagnitude = 0;
      }
    }

    // 3. Update banner animation
    if (this.bannerAlpha > 0) {
      this.bannerAlpha = Math.max(0, this.bannerAlpha - dt * 0.6);
      this.bannerScale = Math.min(1.2, this.bannerScale + dt * 0.8);
    }

    // 4. Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Update floating score text popups
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.alpha -= 1.2 * dt;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    if (!this.gameActive || this.isPausedForHit) return;

    // 6. Update ship position
    if (this.ship.movingRight && (this.ship.x + this.ship.width < this.screenWidth - 10)) {
      this.ship.x += this.shipSpeed * dt;
    }
    if (this.ship.movingLeft && (this.ship.x > 10)) {
      this.ship.x -= this.shipSpeed * dt;
    }

    // Thruster engine particles
    if (Math.random() < 0.7) {
      const thrusterX = this.ship.x + this.ship.width / 2 + (Math.random() - 0.5) * 14;
      const thrusterY = this.ship.y + this.ship.height;
      this.particles.push({
        x: thrusterX,
        y: thrusterY,
        vx: (Math.random() - 0.5) * 20,
        vy: Math.random() * 80 + 60,
        size: Math.random() * 3 + 1.5,
        color: Math.random() < 0.6 ? '#38bdf8' : '#f97316',
        alpha: 0.8,
        decay: 3.0
      });
    }

    // 7. Update bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      this.bullets[i].y -= this.bulletSpeed * dt;
      if (this.bullets[i].y + this.bullets[i].height <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // 8. Update alien fleet
    this.checkFleetEdges();
    const moveStep = this.alienSpeed * this.fleetDirection * dt;
    for (const alien of this.aliens) {
      alien.x += moveStep;
      // Gentle floating animation
      alien.y = alien.baseY + Math.sin(totalTime * 0.003 + alien.bobOffset) * 3;

      // Alien collision with ship
      if (this.checkCollision(this.ship, alien)) {
        this.shipHit();
        return;
      }

      // Aliens reaching bottom
      if (alien.y + alien.height >= this.screenHeight - 20) {
        this.shipHit();
        return;
      }
    }

    // 9. Bullet-Alien Collisions
    for (let bIndex = this.bullets.length - 1; bIndex >= 0; bIndex--) {
      const bullet = this.bullets[bIndex];
      for (let aIndex = this.aliens.length - 1; aIndex >= 0; aIndex--) {
        const alien = this.aliens[aIndex];
        if (this.checkCollision(bullet, alien)) {
          // Spawn explosion & text
          this.spawnExplosion(alien.x + alien.width / 2, alien.y + alien.height / 2, 16, 'alien');
          this.addFloatingText(`+${this.alienPoints}`, alien.x + alien.width / 2, alien.y);

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

    // 10. Fleet cleared: Next Wave
    if (this.aliens.length === 0 && this.gameActive && !this.isPausedForHit) {
      this.bullets = [];
      this.createFleet();
      this.increaseSpeed();
      this.level += 1;
      this.sound.playLevelUp();
      this.triggerBanner(`WAVE ${this.level}`);
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

  draw(totalTime) {
    this.ctx.save();

    // Apply screen shake if active
    if (this.screenShakeTime > 0) {
      const offsetX = (Math.random() - 0.5) * this.screenShakeMagnitude;
      const offsetY = (Math.random() - 0.5) * this.screenShakeMagnitude;
      this.ctx.translate(offsetX, offsetY);
    }

    // Background gradient
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.screenHeight);
    bgGradient.addColorStop(0, '#0c0f1d');
    bgGradient.addColorStop(1, '#181b2e');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // Draw space stars
    for (const star of this.stars) {
      const twinkle = Math.sin(totalTime * 0.002 * star.twinkleSpeed) * 0.3 + 0.7;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Draw Ship
    if (this.gameActive && !this.isPausedForHit) {
      if (this.shipImg.complete && this.shipImg.naturalWidth > 0) {
        this.ctx.drawImage(this.shipImg, this.ship.x, this.ship.y, this.ship.width, this.ship.height);
      } else {
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.beginPath();
        this.ctx.moveTo(this.ship.x + this.ship.width / 2, this.ship.y);
        this.ctx.lineTo(this.ship.x + this.ship.width, this.ship.y + this.ship.height);
        this.ctx.lineTo(this.ship.x, this.ship.y + this.ship.height);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    // Draw Aliens with neon glow
    for (const alien of this.aliens) {
      if (this.alienImg.complete && this.alienImg.naturalWidth > 0) {
        this.ctx.drawImage(this.alienImg, alien.x, alien.y, alien.width, alien.height);
      } else {
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(alien.x + 5, alien.y + 5, alien.width - 10, alien.height - 10);
      }
    }

    // Draw Laser Bullets with glow
    for (const b of this.bullets) {
      this.ctx.save();
      this.ctx.fillStyle = '#ff2a5f';
      this.ctx.shadowColor = '#ff2a5f';
      this.ctx.shadowBlur = 8;
      this.ctx.fillRect(b.x, b.y, b.width, b.height);
      // Bright white core
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(b.x + 1, b.y + 2, b.width - 2, b.height - 4);
      this.ctx.restore();
    }

    // Draw Floating Score Text Popups
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.color;
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    // Draw Scoreboard HUD
    this.drawScoreboard();

    // Draw Wave Announcement Banner
    if (this.bannerAlpha > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = this.bannerAlpha;
      this.ctx.translate(this.screenWidth / 2, this.screenHeight / 2 - 80);
      this.ctx.scale(this.bannerScale, this.bannerScale);

      this.ctx.font = '900 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = '#00ff88';
      this.ctx.shadowColor = '#00ff88';
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(this.bannerText, 0, 0);
      this.ctx.restore();
    }

    // Draw Play Button when inactive
    if (!this.gameActive) {
      this.drawPlayButton(totalTime);
    }

    this.ctx.restore();
  }

  drawScoreboard() {
    this.ctx.save();
    this.ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textBaseline = 'top';

    // Score (Top Right)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'right';
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    this.ctx.shadowBlur = 4;
    const roundedScore = Math.round(this.score / 10) * 10;
    this.ctx.fillText(`SCORE  ${roundedScore.toLocaleString()}`, this.screenWidth - 30, 24);

    // Level (Below Score)
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText(`WAVE  ${this.level}`, this.screenWidth - 30, 58);

    // High Score (Top Center)
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#facc15';
    this.ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const roundedHighScore = Math.round(this.highScore / 10) * 10;
    this.ctx.fillText(`HIGH SCORE  ${roundedHighScore.toLocaleString()}`, this.screenWidth / 2, 24);

    // Remaining Ships (Top Left Icons)
    for (let i = 0; i < this.shipsLeft; i++) {
      const iconX = 30 + i * 46;
      const iconY = 22;
      if (this.shipImg.complete && this.shipImg.naturalWidth > 0) {
        this.ctx.drawImage(this.shipImg, iconX, iconY, 34, 27);
      } else {
        this.ctx.fillStyle = '#38bdf8';
        this.ctx.fillRect(iconX, iconY, 28, 22);
      }
    }
    this.ctx.restore();
  }

  drawPlayButton(totalTime) {
    this.ctx.save();

    // Pulsing glow animation
    const pulse = Math.sin(totalTime * 0.005) * 0.3 + 0.7;
    const btnColor = this.button.isHovered ? this.button.hoverColor : this.button.color;

    this.ctx.shadowColor = '#00ff88';
    this.ctx.shadowBlur = 12 * pulse;
    this.ctx.fillStyle = btnColor;

    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(this.button.x, this.button.y, this.button.width, this.button.height, 8);
    } else {
      this.ctx.fillRect(this.button.x, this.button.y, this.button.width, this.button.height);
    }
    this.ctx.fill();

    // Button border
    this.ctx.strokeStyle = '#22c55e';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Button text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('PLAY', this.button.x + this.button.width / 2, this.button.y + this.button.height / 2);

    // Subtle prompt below button
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    this.ctx.fillText('Click Play or Press SPACE', this.screenWidth / 2, this.button.y + this.button.height + 34);

    this.ctx.restore();
  }

  gameLoop(currentTime) {
    // Delta time calculation (clamped to max 0.1s to avoid huge jumps if tab was backgrounded)
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt, currentTime);
    this.draw(currentTime);

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  setupEventListeners() {
    // Keyboard Controls
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
        const isMuted = this.sound.toggleMute();
        this.addFloatingText(isMuted ? 'MUTE ON' : 'SOUND ON', this.screenWidth / 2, 90, '#38bdf8');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        this.ship.movingRight = false;
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        this.ship.movingLeft = false;
      }
    });

    // Mouse hover detection for button
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      if (!this.gameActive) {
        this.button.isHovered = (
          mouseX >= this.button.x &&
          mouseX <= this.button.x + this.button.width &&
          mouseY >= this.button.y &&
          mouseY <= this.button.y + this.button.height
        );
      }
    });

    // Canvas click
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

    // Touch controls for mobile / tablet
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

// Start game instance on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  window.alienGame = new AlienInvasionGame(canvas);
});
