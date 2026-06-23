import type { EarSide, HatState } from './types';

/**
 * 帽子实体 — 纯数据，无外部依赖。
 *
 * 坐标体系：
 *   holding 状态在屏幕空间（跟随苍角），dropHat 时转为世界空间。
 *   世界空间中 Y=0 为屏幕顶部，Y 增大方向为屏幕下方。
 *   渲染时 worldY + cameraY = screenY。
 */
export class Hat {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  state: HatState = 'holding';
  side: EarSide | null = null;
  layer = 0;
  vy = 0; // 下落速度 px/s（世界空间）

  constructor(id: number, x: number, y: number, w: number, h: number) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;
  }

  get bottomCenterX(): number { return this.x; }
  get bottomY(): number { return this.y + this.height / 2; }
}
