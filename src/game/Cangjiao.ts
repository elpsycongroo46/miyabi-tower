import { CONFIG } from './types';
import type { Hat } from './Hat';

/**
 * 苍角控制器 — 屏幕上方正弦曲线左右移动，持有/释放帽子。
 * 位置为屏幕空间，不受摄像机影响。
 */
export class Cangjiao {
  holdingHat: Hat | null = null;
  screenY: number;
  private phase = Math.random() * Math.PI * 2;
  private speed: number = CONFIG.cangjiaoBaseSpeed;
  private centerX: number;
  private range: number;

  constructor(screenW: number, screenH: number) {
    this.centerX = screenW / 2;
    this.range = screenW * 0.33;
    this.screenY = screenH * CONFIG.cangjiaoYRatio;
  }

  get screenX(): number {
    return this.centerX + Math.sin(this.phase) * this.range;
  }

  updateSpeed(layers: number): void {
    this.speed = Math.min(
      CONFIG.cangjiaoBaseSpeed + layers * CONFIG.cangjiaoSpeedPerLayer,
      CONFIG.cangjiaoMaxSpeed
    );
  }

  update(dt: number): void {
    this.phase += this.speed * dt * 0.001;
  }

  releaseHat(): Hat | null {
    const hat = this.holdingHat;
    this.holdingHat = null;
    return hat;
  }
}
