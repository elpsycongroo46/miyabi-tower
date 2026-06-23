import { Storage, getDefaultAdjust, type AssetAdjustParams } from './Storage';

export interface Asset {
  name: string;
  url: string;
  image: HTMLImageElement | null;
  loaded: boolean;
}

// 全部素材 key（只使用三张图片）
export const ASSET_KEYS = [
  'miyabi',
  'cangjiao',
  'maozi'
] as const;

export type AssetKey = typeof ASSET_KEYS[number];

// 公开素材文件夹路径（public/assets/）
const ASSET_BASE = 'assets/';

export class ResourceManager {
  private assets: Map<string, Asset> = new Map();
  private adjustMap: Record<string, AssetAdjustParams> = Storage.getAssetAdjust();
  private onLoaded?: () => void;
  private onAdjustChange?: () => void;

  constructor() {
    this.initDefaultAssets();
    this.tryLoadFromPublic();
    // 同步补全缺失的调整参数
    for (const key of ASSET_KEYS) {
      if (!this.adjustMap[key]) {
        this.adjustMap[key] = getDefaultAdjust();
      }
    }
  }

  private initDefaultAssets(): void {
    for (const key of ASSET_KEYS) {
      this.assets.set(key, {
        name: key,
        url: ASSET_BASE + key + '.png',
        image: null,
        loaded: false
      });
    }
  }

  private tryLoadFromPublic(): void {
    for (const key of ASSET_KEYS) {
      this.loadFromUrl(key, ASSET_BASE + key + '.png').catch(() => {
        // 加载失败：忽略，保留默认 Canvas 绘制
      });
    }
  }

  private loadFromUrl(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.assets.set(name, { name, url, image: img, loaded: true });
        this.onLoaded?.();
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load ${url}`));
      };
      img.src = url;
    });
  }

  async loadAsset(name: string, file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    await this.loadFromUrl(name, url);
  }

  reloadFromPublic(name: string): void {
    this.assets.set(name, {
      name,
      url: ASSET_BASE + name + '.png',
      image: null,
      loaded: false
    });
    this.loadFromUrl(name, ASSET_BASE + name + '.png').catch(() => {});
  }

  getAsset(name: string): Asset | undefined {
    return this.assets.get(name);
  }

  isLoaded(name: string): boolean {
    return this.assets.get(name)?.loaded ?? false;
  }

  getImage(name: string): HTMLImageElement | null {
    return this.assets.get(name)?.image ?? null;
  }

  setOnLoaded(callback: () => void): void {
    this.onLoaded = callback;
  }

  getAllAssetNames(): string[] {
    return Array.from(this.assets.keys());
  }

  // ===== 调整参数 =====
  getAdjust(name: string): AssetAdjustParams {
    return this.adjustMap[name] || (this.adjustMap[name] = getDefaultAdjust());
  }

  setAdjust(name: string, params: Partial<AssetAdjustParams>): void {
    const cur = this.getAdjust(name);
    this.adjustMap[name] = { ...cur, ...params };
    Storage.setAssetAdjust(this.adjustMap);
    this.onAdjustChange?.();
  }

  resetAdjust(name: string): void {
    this.adjustMap[name] = getDefaultAdjust();
    Storage.setAssetAdjust(this.adjustMap);
    this.onAdjustChange?.();
  }

  resetAllAdjust(): void {
    for (const key of ASSET_KEYS) {
      this.adjustMap[key] = getDefaultAdjust();
    }
    Storage.setAssetAdjust(this.adjustMap);
    this.onAdjustChange?.();
  }

  setOnAdjustChange(callback: () => void): void {
    this.onAdjustChange = callback;
  }
}
