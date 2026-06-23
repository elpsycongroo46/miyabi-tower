/**
 * 星见雅的双耳高塔 — 主控制器
 *
 * 架构：
 *   图片素材（星见雅/苍角/帽子）→ ResourceManager 加载
 *   星见雅底边贴屏幕底，两条不可见耳朵线段用于判定落点
 *   苍角在屏幕上方正弦移动，点击释放帽子
 *   帽子在"世界空间"中匀加速下落，落地检测匹配耳朵线段
 *   摄像机随堆叠高度下移，苍角始终固定在屏幕上方
 *
 * 坐标体系：
 *   屏幕空间：左上角(0,0)，苍角在此空间
 *   世界空间：Y=0 位于屏幕顶部当 cameraY=0 时
 *   渲染：screenY = worldY + cameraY
 */
import { GameState, CONFIG, STORY_TEXTS, type GameOverReason, type EarSide } from './types';
import { Cangjiao } from './Cangjiao';
import { UIManager } from './UIManager';
import { AudioManager } from './AudioManager';
import { Storage } from './Storage';
import { ResourceManager } from './ResourceManager';
import { drawPrefabBackground } from './Prefabs';
import { Hat } from './Hat';

/** 耳朵线段 — 屏幕坐标，用于帽子落点判定 */
interface EarSegment {
  x1: number; // 线段起点 X（屏幕坐标）
  x2: number; // 线段终点 X
  y: number;  // 线段 Y（屏幕坐标）
  side: EarSide;
}

interface MiyabiLayout {
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  leftEar: EarSegment;
  rightEar: EarSegment;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ui: UIManager;
  private audio: AudioManager;
  private resources: ResourceManager;

  private cangjiao!: Cangjiao;
  private hats: Hat[] = [];
  private nextHatId = 1;

  private state: GameState = GameState.MENU;
  private rafId: number | null = null;
  private lastTime: number = 0;

  // 耳朵堆叠计数
  private leftStack = 0;
  private rightStack = 0;
  private currentHeight: number = CONFIG.baseHeight;
  private dropCount = 0;
  private triggeredStories: Set<number> = new Set();

  // 帽子渲染尺寸（根据耳朵宽度 + 图片比例计算）
  private hatRenderW = 60;
  private hatRenderH = 60;

  // 苍角尺寸
  private cangjiaoRenderW = 80;
  private cangjiaoRenderH = 100;

  // 布局
  private layout!: MiyabiLayout;

  // 摄像机 Y 偏移（随堆叠高度上升）
  private cameraY = 0;
  private cameraTargetY = 0;

  constructor(canvas: HTMLCanvasElement, uiLayer: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ui = new UIManager(uiLayer);
    this.audio = new AudioManager();
    this.resources = new ResourceManager();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.bindUICallbacks();
    this.resources.setOnLoaded(() => this.onResourceLoaded());

    this.ui.updateMenuHighScore(Storage.getMaxHeight());
    this.ui.showState(this.state);
  }

  private onResourceLoaded(): void {
    this.computeLayout();
    this.ui.setAssetStatus('miyabi', this.resources.getImage('miyabi') ? '已加载' : '未加载');
    this.ui.setAssetStatus('cangjiao', this.resources.getImage('cangjiao') ? '已加载' : '未加载');
    this.ui.setAssetStatus('maozi', this.resources.getImage('maozi') ? '已加载' : '未加载');
  }

  // ================================================================
  //  布局计算
  // ================================================================
  private computeLayout(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 星见雅：底边贴屏幕底边，水平居中，保持比例
    const miyabiImg = this.resources.getImage('miyabi');
    if (miyabiImg) {
      const maxW = w * 0.9;
      const maxH = h * 0.72;
      const scale = Math.min(maxW / miyabiImg.width, maxH / miyabiImg.height);
      const imgW = miyabiImg.width * scale;
      const imgH = miyabiImg.height * scale;
      const imgX = (w - imgW) / 2;
      const imgY = h - imgH; // 底边贴屏幕底边

      this.layout = {
        imgX, imgY, imgW, imgH,
        leftEar: {
          x1: imgX + CONFIG.leftEarX1 * imgW,
          x2: imgX + CONFIG.leftEarX2 * imgW,
          y: imgY + (1 - CONFIG.earYFromBottom) * imgH,
          side: 'left'
        },
        rightEar: {
          x1: imgX + CONFIG.rightEarX1 * imgW,
          x2: imgX + CONFIG.rightEarX2 * imgW,
          y: imgY + (1 - CONFIG.earYFromBottom) * imgH,
          side: 'right'
        }
      };
    }

    // 帽子：宽度 = 耳朵线段宽度，高度按原图比例
    const hatImg = this.resources.getImage('maozi');
    if (hatImg && this.layout) {
      const earW = this.layout.leftEar.x2 - this.layout.leftEar.x1;
      this.hatRenderW = earW;
      this.hatRenderH = earW * (hatImg.height / hatImg.width);
    }

    // 苍角尺寸
    const cangjiaoImg = this.resources.getImage('cangjiao');
    if (cangjiaoImg) {
      const ch = h * 0.14;
      this.cangjiaoRenderH = ch;
      this.cangjiaoRenderW = ch * (cangjiaoImg.width / cangjiaoImg.height);
    }
  }

  // ================================================================
  //  耳朵堆叠位置
  // ================================================================
  private getStackStep(): number {
    return this.hatRenderH * (1 - CONFIG.hatStackOverlap);
  }

  private getEarScreenY(side: EarSide): number {
    const ear = side === 'left' ? this.layout.leftEar : this.layout.rightEar;
    return ear.y + this.cameraY;
  }

  // 世界空间堆顶（不含摄像机偏移，用于摄像机计算）
  private getWorldStackTopY(side: EarSide): number {
    const ear = side === 'left' ? this.layout.leftEar : this.layout.rightEar;
    const count = side === 'left' ? this.leftStack : this.rightStack;
    return ear.y - count * this.getStackStep();
  }

  // 屏幕空间堆顶（含摄像机偏移，用于落地检测）
  private getStackTopY(side: EarSide): number {
    const count = side === 'left' ? this.leftStack : this.rightStack;
    return this.getEarScreenY(side) - count * this.getStackStep();
  }

  private getEarSegment(side: EarSide): EarSegment {
    return side === 'left' ? this.layout.leftEar : this.layout.rightEar;
  }

  // ================================================================
  //  落点判定
  // ================================================================
  private checkLanding(x5: number): EarSegment | null {
    for (const side of ['left', 'right'] as EarSide[]) {
      const seg = this.getEarSegment(side);
      if (x5 >= seg.x1 && x5 <= seg.x2) {
        return seg;
      }
    }
    return null;
  }

  // === 尺寸调整 ===
  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.computeLayout();
  }

  // ================================================================
  //  UI 回调
  // ================================================================
  private bindUICallbacks(): void {
    this.ui.onStart = () => this.startGame();
    this.ui.onPause = () => this.pauseGame();
    this.ui.onResume = () => this.resumeGame();
    this.ui.onExit = () => this.exitGame();
    this.ui.onRestart = () => this.startGame();
    this.ui.onDrop = () => this.dropHat();
    this.ui.onAssetUpload = (name, file) => this.onAssetUpload(name, file);
    this.ui.onAssetReset = (name) => this.reloadPublicAsset(name);
    this.ui.onAssetAdjust = (name, params) => this.onAssetAdjust(name, params);
    this.ui.onAssetResetAdjust = (name) => this.resources.resetAdjust(name);
    this.ui.onAssetResetAllAdjust = () => this.resources.resetAllAdjust();
  }

  private async onAssetUpload(name: string, file: File): Promise<void> {
    try {
      await this.resources.loadAsset(name, file);
      this.computeLayout();
    } catch (e) {
      console.error('Asset upload failed:', e);
    }
  }

  private reloadPublicAsset(name: string): void {
    this.resources.reloadFromPublic(name);
    setTimeout(() => this.computeLayout(), 200);
  }

  private onAssetAdjust(_name: string, _params: Record<string, unknown>): void {
    this.computeLayout();
  }

  // ================================================================
  //  状态机
  // ================================================================
  private setState(s: GameState): void {
    this.state = s;
    this.ui.showState(s);
  }

  startGame(): void {
    this.audio.resume();
    this.hats = [];
    this.nextHatId = 1;
    this.leftStack = 0;
    this.rightStack = 0;
    this.currentHeight = CONFIG.baseHeight;
    this.dropCount = 0;
    this.triggeredStories.clear();

    this.computeLayout();
    this.cangjiao = new Cangjiao(window.innerWidth, window.innerHeight);
    this.spawnHoldingHat();

    this.setState(GameState.PLAYING);
    this.ui.updateHud(this.currentHeight, 0, 0);

    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.loop();
    }
  }

  private pauseGame(): void {
    if (this.state !== GameState.PLAYING) return;
    this.setState(GameState.PAUSE);
  }

  private resumeGame(): void {
    if (this.state !== GameState.PAUSE) return;
    this.setState(GameState.PLAYING);
  }

  private exitGame(): void {
    const isMax = this.currentHeight > Storage.getMaxHeight();
    if (isMax) Storage.setMaxHeight(this.currentHeight);
    this.audio.playWin();
    this.ui.showWin(this.currentHeight, this.leftStack + this.rightStack, isMax);
    this.ui.updateMenuHighScore(Storage.getMaxHeight());
    this.setState(GameState.GAME_WIN);
  }

  private triggerGameOver(reason: GameOverReason): void {
    if (this.state !== GameState.PLAYING) return;
    this.audio.playFail();
    this.ui.showGameOver(reason, this.currentHeight, this.leftStack + this.rightStack);
    this.setState(GameState.GAME_OVER);
  }

  // ================================================================
  //  帽子生命周期
  // ================================================================
  private spawnHoldingHat(): void {
    const hat = new Hat(
      this.nextHatId++,
      this.cangjiao.screenX,
      this.cangjiao.screenY + this.cangjiaoRenderH * 0.7,
      this.hatRenderW,
      this.hatRenderH
    );
    this.cangjiao.holdingHat = hat;
    this.hats.push(hat);
  }

  private dropHat(): void {
    if (this.state !== GameState.PLAYING) return;
    const hat = this.cangjiao.releaseHat();
    if (!hat) return;

    // 转为世界空间坐标（屏幕Y - cameraY = 世界Y）
    hat.y -= this.cameraY;
    hat.state = 'falling';
    hat.vy = 0;

    setTimeout(() => {
      if (this.state === GameState.PLAYING) this.spawnHoldingHat();
    }, 400);
  }

  private onHatLanded(side: EarSide): void {
    const layers = Math.max(this.leftStack, this.rightStack);
    this.currentHeight = CONFIG.baseHeight + layers * CONFIG.heightPerHat;

    if (STORY_TEXTS[layers] && !this.triggeredStories.has(layers)) {
      this.triggeredStories.add(layers);
      this.ui.showStory(STORY_TEXTS[layers]);
    }

    // 平衡检测
    if (Math.abs(this.leftStack - this.rightStack) > CONFIG.maxBalanceDiff) {
      this.triggerGameOver('balance');
    }
  }

  // ================================================================
  //  主循环
  // ================================================================
  private loop = (): void => {
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    let dt = now - this.lastTime;
    this.lastTime = now;
    if (dt > 50) dt = 50;

    if (this.state === GameState.PLAYING) {
      this.update(dt);
    }
    this.render();
  };

  private update(dt: number): void {
    const layers = Math.max(this.leftStack, this.rightStack);
    this.cangjiao.updateSpeed(layers);
    this.cangjiao.update(dt);

    // 同步持有帽子位置
    if (this.cangjiao.holdingHat) {
      const h = this.cangjiao.holdingHat;
      h.x = this.cangjiao.screenX;
      h.y = this.cangjiao.screenY + this.cangjiaoRenderH * 0.7;
    }

    // 物理下落 + 落地检测
    const dtSec = dt / 1000;
    const h = window.innerHeight;
    for (const hat of this.hats) {
      // falling 和 dropped 的帽子都继续下落（视觉效果）
      if (hat.state === 'falling' || hat.state === 'dropped') {
        hat.vy += CONFIG.hatGravity * dtSec;
        hat.y += hat.vy * dtSec;
      }

      // 仅 falling 状态检测落地（世界空间）
      if (hat.state === 'falling') {
        const leftWorldTop = this.getWorldStackTopY('left');
        const rightWorldTop = this.getWorldStackTopY('right');
        const worldLandY = Math.min(leftWorldTop, rightWorldTop) - this.hatRenderH / 2;

        if (hat.y >= worldLandY) {
          const seg = this.checkLanding(hat.bottomCenterX);
          if (seg) {
            hat.side = seg.side;
            hat.layer = seg.side === 'left' ? this.leftStack + 1 : this.rightStack + 1;
            hat.y = this.getWorldStackTopY(seg.side) - this.hatRenderH / 2;
            hat.vy = 0;
            hat.state = 'settled';

            if (seg.side === 'left') this.leftStack++;
            else this.rightStack++;

            this.audio.playStack();
            this.onHatLanded(seg.side);
          } else {
            hat.state = 'dropped';
            this.dropCount++;
            this.audio.playSlip();
            if (this.dropCount > CONFIG.maxDropCount) {
              this.triggerGameOver('drop');
            }
          }
        }
      }
    }

    // 清理掉出屏幕的帽子
    this.hats = this.hats.filter(hat => {
      if (hat.state === 'dropped' && hat.y > h + 300) return false;
      return true;
    });

    // 摄像机：画面下移，使堆顶始终可见
    const worldTop = Math.min(
      this.getWorldStackTopY('left'),
      this.getWorldStackTopY('right')
    );
    const desiredScreenY = h * 0.65;
    // screenY = worldY + cameraY, 令堆顶出现在 desiredScreenY 处
    this.cameraTargetY = Math.max(0, desiredScreenY - worldTop);
    this.cameraY += (this.cameraTargetY - this.cameraY) * 0.08;

    // 更新 HUD
    this.ui.updateHud(this.currentHeight, this.leftStack, this.rightStack);
  }

  // ================================================================
  //  渲染
  // ================================================================
  private render(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // 背景
    drawPrefabBackground(ctx, w, h);

    // 星见雅
    this.drawMiyabi(ctx);

    // 已落定的帽子
    this.drawSettledHats(ctx);

    // 下落中的帽子（跟随摄像机）
    for (const hat of this.hats) {
      if (hat.state === 'falling' || hat.state === 'dropped') {
        this.drawHatImageAt(ctx, hat, hat.x, hat.y + this.cameraY);
      }
    }

    // 苍角
    this.drawCangjiao(ctx);

    // 苍角持有的帽子（屏幕固定，不加摄像机偏移）
    if (this.cangjiao.holdingHat) {
      const hhat = this.cangjiao.holdingHat;
      this.drawHatImageAt(ctx, hhat, hhat.x, hhat.y);
    }

    // 判定线（调试用，取消注释可查看）
    // this.drawEarDebug(ctx);
  }

  private drawMiyabi(ctx: CanvasRenderingContext2D): void {
    const img = this.resources.getImage('miyabi');
    if (!img || !this.layout) return;
    ctx.drawImage(img, this.layout.imgX, this.layout.imgY + this.cameraY, this.layout.imgW, this.layout.imgH);
  }

  private drawCangjiao(ctx: CanvasRenderingContext2D): void {
    const img = this.resources.getImage('cangjiao');
    if (!img) return;
    const x = this.cangjiao.screenX - this.cangjiaoRenderW / 2;
    const y = this.cangjiao.screenY;
    ctx.drawImage(img, x, y, this.cangjiaoRenderW, this.cangjiaoRenderH);
  }

  private drawHatImage(ctx: CanvasRenderingContext2D, hat: Hat): void {
    this.drawHatImageAt(ctx, hat, hat.x, hat.y + this.cameraY);
  }

  private drawHatImageAt(ctx: CanvasRenderingContext2D, hat: Hat, sx: number, sy: number): void {
    const img = this.resources.getImage('maozi');
    if (!img) return;
    ctx.drawImage(img, sx - hat.width / 2, sy - hat.height / 2, hat.width, hat.height);
  }

  private drawSettledHats(ctx: CanvasRenderingContext2D): void {
    const step = this.getStackStep();
    for (const side of ['left', 'right'] as EarSide[]) {
      const count = side === 'left' ? this.leftStack : this.rightStack;
      if (count === 0) continue;
      const seg = this.getEarSegment(side);
      const centerX = (seg.x1 + seg.x2) / 2;
      const earScreenY = this.getEarScreenY(side);
      for (let i = 0; i < count; i++) {
        const hatY = earScreenY - this.hatRenderH / 2 - i * step;
        const img = this.resources.getImage('maozi');
        if (img) {
          ctx.drawImage(
            img,
            centerX - this.hatRenderW / 2,
            hatY,
            this.hatRenderW,
            this.hatRenderH
          );
        }
      }
    }
  }

  // 调试用：显示当前堆顶判定线位置
  private drawEarDebug(ctx: CanvasRenderingContext2D): void {
    if (!this.layout) return;
    ctx.save();
    for (const side of ['left', 'right'] as EarSide[]) {
      const seg = this.getEarSegment(side);
      const sy = this.getStackTopY(side);
      // 黄线 = 堆顶
      ctx.strokeStyle = '#ff0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(seg.x1, sy);
      ctx.lineTo(seg.x2, sy);
      ctx.stroke();
      // 红点 = 端点
      ctx.fillStyle = '#f00';
      ctx.beginPath();
      ctx.arc(seg.x1, sy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(seg.x2, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  start(): void {
    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.loop();
    }
  }
}
