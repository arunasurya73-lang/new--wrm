import { getAQIInfo } from './stationData.js';

export class AQIGauge {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.currentAQI = 0;
    this.targetAQI = 0;
    this.animationFrame = null;
    this.setupCanvas();
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width || 280;
    this.height = rect.height || 220;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  setAQI(targetValue) {
    this.targetAQI = Math.min(500, Math.max(0, targetValue));
    this.animate();
  }

  animate() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

    const step = () => {
      const diff = this.targetAQI - this.currentAQI;
      if (Math.abs(diff) < 0.5) {
        this.currentAQI = this.targetAQI;
        this.draw();
        return;
      }

      this.currentAQI += diff * 0.08;
      this.draw();
      this.animationFrame = requestAnimationFrame(step);
    };

    this.animationFrame = requestAnimationFrame(step);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const centerX = w / 2;
    const centerY = h - 25;
    const radius = Math.min(centerX - 24, centerY - 20);

    ctx.clearRect(0, 0, w, h);

    const startAngle = Math.PI * 0.82;
    const endAngle = Math.PI * 2.18;
    const totalAngle = endAngle - startAngle;

    // Background track
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 14;
    ctx.strokeStyle = document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Progress percentage
    const progress = Math.min(1, Math.max(0, this.currentAQI / 500));
    const currentAngle = startAngle + (totalAngle * progress);

    if (progress > 0.01) {
      // Glow effect
      const aqiInfo = getAQIInfo(this.currentAQI);
      ctx.save();
      ctx.shadowColor = aqiInfo.color;
      ctx.shadowBlur = 18;

      // Dynamic Gradient Arc
      const gradient = ctx.createConicGradient(startAngle, centerX, centerY);
      gradient.addColorStop(0.0, '#10B981');
      gradient.addColorStop(0.2, '#84CC16');
      gradient.addColorStop(0.4, '#F59E0B');
      gradient.addColorStop(0.6, '#F97316');
      gradient.addColorStop(0.8, '#EF4444');
      gradient.addColorStop(1.0, '#A855F7');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
      ctx.lineWidth = 14;
      ctx.strokeStyle = aqiInfo.color;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // Scale tick marks
    const ticks = [0, 100, 200, 300, 400, 500];
    ticks.forEach(tick => {
      const tickProgress = tick / 500;
      const angle = startAngle + (totalAngle * tickProgress);
      const innerR = radius - 16;
      const outerR = radius - 9;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)';
      ctx.stroke();
    });

    // Needle indicator
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngle);

    // Needle shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(radius - 12, 0);
    ctx.lineTo(0, 3);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Center pivot circle
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = getAQIInfo(this.currentAQI).color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();
  }
}
