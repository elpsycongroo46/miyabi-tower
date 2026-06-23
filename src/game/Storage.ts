// 本地存储管理：保存最高纪录与素材调整参数
export class Storage {
  private static readonly KEY = 'miyabi_max_height';
  private static readonly ASSET_KEY = 'miyabi_asset_adjust';

  static getMaxHeight(): number {
    try {
      const v = window.localStorage.getItem(this.KEY);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }

  static setMaxHeight(value: number): void {
    try {
      window.localStorage.setItem(this.KEY, String(Math.floor(value)));
    } catch {
      // 忽略写入失败
    }
  }

  // 读取全部素材调整参数
  static getAssetAdjust(): Record<string, AssetAdjustParams> {
    try {
      const v = window.localStorage.getItem(this.ASSET_KEY);
      return v ? JSON.parse(v) : {};
    } catch {
      return {};
    }
  }

  // 写入全部素材调整参数
  static setAssetAdjust(data: Record<string, AssetAdjustParams>): void {
    try {
      window.localStorage.setItem(this.ASSET_KEY, JSON.stringify(data));
    } catch {
      // 忽略写入失败
    }
  }
}

// 调整参数
export interface AssetAdjustParams {
  // 缩放（1 = 原始像素）
  scaleX: number;
  scaleY: number;
  // 偏移：渲染时叠加到默认位置
  offsetX: number;
  offsetY: number;
  // 旋转（弧度）
  rotation: number;
  // 是否镜像
  flipX: boolean;
  // 显示模式: 'fit'(铺满) | 'cover'(覆盖) | 'original'(原始) | 'fixed'(固定大小)
  mode: 'fit' | 'cover' | 'original' | 'fixed';
  // fixed 模式下的渲染宽度
  fixedWidth: number;
  fixedHeight: number;
  // 锚点（0~1），用于 fixed 模式以图片哪一点对齐默认位置
  anchorX: number;
  anchorY: number;
  opacity: number;
}

export function getDefaultAdjust(): AssetAdjustParams {
  return {
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    flipX: false,
    mode: 'original',
    fixedWidth: 100,
    fixedHeight: 100,
    anchorX: 0.5,
    anchorY: 0.5,
    opacity: 1
  };
}
