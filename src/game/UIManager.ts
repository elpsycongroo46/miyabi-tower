import type { GameState, GameOverReason } from './types';

// UI 管理器：管理所有 DOM 界面与按钮事件
export class UIManager {
  private layer: HTMLElement;
  private screens: Map<string, HTMLElement> = new Map();

  // 回调
  onStart: (() => void) | null = null;
  onPause: (() => void) | null = null;
  onResume: (() => void) | null = null;
  onExit: (() => void) | null = null;
  onRestart: (() => void) | null = null;
  onDrop: (() => void) | null = null; // 点击/触摸释放帽子
  onAssetUpload: ((name: string, file: File) => void) | null = null;
  onAssetReset: ((name: string) => void) | null = null;
  onAssetAdjust: ((name: string, params: Record<string, unknown>) => void) | null = null;
  onAssetResetAdjust: ((name: string) => void) | null = null;
  onAssetResetAllAdjust: (() => void) | null = null;

  // HUD 元素
  private scoreBoard: HTMLElement | null = null;
  private balanceBoard: HTMLElement | null = null;
  private leftCountEl: HTMLElement | null = null;
  private rightCountEl: HTMLElement | null = null;
  private diffEl: HTMLElement | null = null;
  private heightEl: HTMLElement | null = null;
  private storyToast: HTMLElement | null = null;
  private storyTimer: number | null = null;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    this.buildAll();
  }

  private buildAll(): void {
    this.buildMenu();
    this.buildHud();
    this.buildPause();
    this.buildGameOver();
    this.buildWin();
    this.buildStoryToast();
    this.attachGlobalInput();
  }

  // ===== 主菜单 =====
  private buildMenu(): void {
    const el = document.createElement('div');
    el.id = 'screen-menu';
    el.className = 'ui-screen';
    el.innerHTML = `
      <div class="game-title">星见雅的双耳高塔</div>
      <div class="subtitle">物理叠叠乐 · 保持平衡，叠向天空</div>
      <div class="high-score" id="menu-highscore">历史最高身高：0 cm</div>
      <button class="btn" id="btn-start">开始游戏</button>
    `;
    this.layer.appendChild(el);
    this.screens.set('menu', el);
    el.querySelector('#btn-start')!.addEventListener('click', () => {
      this.onStart?.();
    });
  }

  updateMenuHighScore(cm: number): void {
    const node = this.screens.get('menu')?.querySelector('#menu-highscore');
    if (node) node.textContent = `历史最高身高：${Math.floor(cm)} cm`;
  }

  // ===== 游戏 HUD =====
  private buildHud(): void {
    const el = document.createElement('div');
    el.id = 'screen-hud';
    el.className = 'ui-screen';
    el.innerHTML = `
      <button id="btn-pause" title="暂停">❚❚</button>
      <div id="score-board">
        <div class="label">星见雅当前身高</div>
        <div><span id="hud-height">100</span> cm</div>
      </div>
      <div id="balance-board">
        <div class="side"><span class="dot left"></span>左 <span id="hud-left">0</span></div>
        <div class="side"><span class="dot right"></span>右 <span id="hud-right">0</span></div>
        <div>差值 <span class="diff" id="hud-diff">0</span></div>
      </div>
    `;
    this.layer.appendChild(el);
    this.screens.set('hud', el);
    el.querySelector('#btn-pause')!.addEventListener('click', () => this.onPause?.());
    this.scoreBoard = el.querySelector('#score-board');
    this.balanceBoard = el.querySelector('#balance-board');
    this.leftCountEl = el.querySelector('#hud-left');
    this.rightCountEl = el.querySelector('#hud-right');
    this.diffEl = el.querySelector('#hud-diff');
    this.heightEl = el.querySelector('#hud-height');
  }

  updateHud(heightCm: number, left: number, right: number): void {
    if (this.heightEl) this.heightEl.textContent = String(Math.floor(heightCm));
    if (this.leftCountEl) this.leftCountEl.textContent = String(left);
    if (this.rightCountEl) this.rightCountEl.textContent = String(right);
    const diff = Math.abs(left - right);
    if (this.diffEl) {
      this.diffEl.textContent = String(diff);
      this.diffEl.classList.toggle('danger', diff >= CONFIG_maxDiff - 1);
    }
  }

  // ===== 暂停界面 =====
  private buildPause(): void {
    const el = document.createElement('div');
    el.id = 'screen-pause';
    el.className = 'overlay ui-screen hidden';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-title">暂停</div>
        <div class="btn-group">
          <button class="btn" id="btn-resume">继续游戏</button>
          <button class="btn secondary" id="btn-exit">退出游戏</button>
        </div>
        <div style="font-size:11px;color:#888;margin-top:10px;text-align:center">本作品为粉丝自制同人小游戏，仅供娱乐，所有素材版权归米哈游（HoYoverse）所有。</div>
      </div>
    `;
    this.layer.appendChild(el);
    this.screens.set('pause', el);
    el.querySelector('#btn-resume')!.addEventListener('click', () => this.onResume?.());
    el.querySelector('#btn-exit')!.addEventListener('click', () => this.onExit?.());
  }

  // ===== 失败界面 =====
  private buildGameOver(): void {
    const el = document.createElement('div');
    el.id = 'screen-gameover';
    el.className = 'overlay ui-screen hidden';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-title" id="go-title">游戏结束</div>
        <div class="panel-msg" id="go-msg"></div>
        <div class="panel-stats" id="go-stats"></div>
        <button class="btn" id="btn-restart-go">重新开始</button>
        <div style="font-size:11px;color:#888;margin-top:10px;text-align:center">本作品为粉丝自制同人小游戏，仅供娱乐，所有素材版权归米哈游（HoYoverse）所有。</div>
      </div>
    `;
    this.layer.appendChild(el);
    this.screens.set('gameover', el);
    el.querySelector('#btn-restart-go')!.addEventListener('click', () => this.onRestart?.());
  }

  showGameOver(reason: GameOverReason, heightCm: number, hatCount: number): void {
    const el = this.screens.get('gameover')!;
    const title = el.querySelector('#go-title') as HTMLElement;
    const msg = el.querySelector('#go-msg') as HTMLElement;
    const stats = el.querySelector('#go-stats') as HTMLElement;
    if (reason === 'balance') {
      title.textContent = '失衡失败';
      msg.textContent = '帽子无法平衡了。';
    } else {
      title.textContent = '掉落失败';
      msg.textContent = '掉落帽子太多，月城柳被引过来了！';
    }
    stats.innerHTML = `当前身高：${Math.floor(heightCm)} cm<br>已叠帽子：${hatCount} 顶`;
    el.classList.remove('hidden');
  }

  // ===== 成功界面 =====
  private buildWin(): void {
    const el = document.createElement('div');
    el.id = 'screen-win';
    el.className = 'overlay ui-screen hidden';
    el.innerHTML = `
      <div class="panel">
        <div class="panel-title">恭喜完成修行！</div>
        <div class="panel-stats" id="win-stats"></div>
        <button class="btn" id="btn-restart-win">重新开始</button>
        <div style="font-size:11px;color:#888;margin-top:10px;text-align:center">本作品为粉丝自制同人小游戏，仅供娱乐，所有素材版权归米哈游（HoYoverse）所有。</div>
      </div>
    `;
    this.layer.appendChild(el);
    this.screens.set('win', el);
    el.querySelector('#btn-restart-win')!.addEventListener('click', () => this.onRestart?.());
  }

  showWin(heightCm: number, hatCount: number, isMax: boolean): void {
    const el = this.screens.get('win')!;
    const stats = el.querySelector('#win-stats') as HTMLElement;
    stats.innerHTML =
      `最终身高：${Math.floor(heightCm)} cm<br>` +
      `帽子总数：${hatCount} 顶` +
      (isMax ? '<br><span style="color:#ffd966">★ 新纪录！</span>' : '');
    el.classList.remove('hidden');
  }

  // ===== 文案闪现 =====
  private buildStoryToast(): void {
    const el = document.createElement('div');
    el.id = 'story-toast';
    this.layer.appendChild(el);
    this.storyToast = el;
  }

  showStory(text: string, duration = 2200): void {
    if (!this.storyToast) return;
    this.storyToast.textContent = text;
    this.storyToast.classList.add('show');
    if (this.storyTimer !== null) window.clearTimeout(this.storyTimer);
    this.storyTimer = window.setTimeout(() => {
      this.storyToast?.classList.remove('show');
    }, duration);
  }

  // ===== 全局输入（释放帽子）=====
  private attachGlobalInput(): void {
    const handler = (e: Event) => {
      // 只在 PLAYING 状态响应
      this.onDrop?.();
    };
    document.addEventListener('click', (e) => {
      // 排除按钮点击
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      handler(e);
    });
    document.addEventListener('touchstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      e.preventDefault();
      handler(e);
    }, { passive: false });
  }

  // ===== 素材面板 =====
  private assetPanel: HTMLElement | null = null;
  private editorTarget: string = 'hat';

  private buildAssetPanel(): void {
    if (this.assetPanel) return;
    const el = document.createElement('div');
    el.id = 'screen-assets';
    el.className = 'overlay ui-screen hidden';
    const assets = [
      { key: 'miyabi', label: '星见雅' },
      { key: 'cangjiao', label: '苍角' },
      { key: 'maozi', label: '帽子' }
    ];
    el.innerHTML = `
      <div class="panel" style="max-height: 85vh; overflow-y: auto; min-width: 320px; max-width: 720px; width: 90%;">
        <div class="panel-title">素材编辑器</div>
        <div style="font-size: 12px; color: #c7c9ff; text-align: center; margin-bottom: 10px;">
          将 PNG 放入 <code>public/assets/</code> 即可自动加载。下方面板可调整位置、缩放、旋转。
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 14px;">
          ${assets.map(a => `
            <button data-key="${a.key}" class="asset-tab" style="padding: 6px 14px; font-size: 13px; background: rgba(0,0,0,0.4); color: #c7c9ff; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; cursor: pointer;">${a.label}</button>
          `).join('')}
        </div>

        <div id="editor-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: left;">
          <div>
            <div style="font-size: 12px; color: #c7c9ff; margin-bottom: 6px;">缩放 / 位置</div>
            ${this.makeSliderRow('scaleX', '缩放 X', 0.1, 5, 0.1, 1)}
            ${this.makeSliderRow('scaleY', '缩放 Y', 0.1, 5, 0.1, 1)}
            ${this.makeSliderRow('offsetX', '位置 X', -400, 400, 1, 0)}
            ${this.makeSliderRow('offsetY', '位置 Y', -400, 400, 1, 0)}
            ${this.makeSliderRow('rotation', '旋转 (度)', -180, 180, 1, 0)}
            ${this.makeSliderRow('opacity', '透明度', 0, 1, 0.05, 1)}
          </div>
          <div>
            <div style="font-size: 12px; color: #c7c9ff; margin-bottom: 6px;">显示模式 / 锚点</div>
            <div style="margin-bottom: 8px;">
              <label style="font-size: 12px; color: #aaa; margin-right: 6px;">模式</label>
              <select class="adjust-input" data-key="mode" style="padding: 4px 8px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; font-size: 12px;">
                <option value="original">原始像素</option>
                <option value="fixed">固定大小</option>
                <option value="fit">铺满</option>
                <option value="cover">覆盖</option>
              </select>
            </div>
            ${this.makeSliderRow('fixedWidth', '固定宽', 10, 1200, 1, 100)}
            ${this.makeSliderRow('fixedHeight', '固定高', 10, 1200, 1, 100)}
            ${this.makeSliderRow('anchorX', '锚点 X', 0, 1, 0.05, 0.5)}
            ${this.makeSliderRow('anchorY', '锚点 Y', 0, 1, 0.05, 0.5)}
            <div style="margin-top: 6px;">
              <label style="font-size: 12px; color: #aaa; display: inline-flex; align-items: center; gap: 6px;">
                <input type="checkbox" class="adjust-input" data-key="flipX" /> 水平翻转
              </label>
            </div>
            <div style="font-size: 12px; color: #c7c9ff; margin: 10px 0 6px;">本地图片</div>
            <label style="display: inline-block; padding: 5px 12px; background: rgba(109,93,252,0.3); border: 1px dashed rgba(167,139,250,0.5); border-radius: 6px; cursor: pointer; font-size: 12px;">
              <input type="file" accept="image/*" class="asset-input" style="display: none;">
              临时上传 PNG
            </label>
            <button class="asset-restore" style="display: inline-block; margin-left: 6px; padding: 5px 12px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #aaa; border-radius: 6px; cursor: pointer; font-size: 12px;">恢复默认 PNG</button>
          </div>
        </div>

        <div style="margin-top: 14px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button class="asset-reset-adjust" style="padding: 8px 16px; background: rgba(255,180,40,0.3); color: #ffd966; border: 1px solid rgba(255,180,40,0.4); border-radius: 6px; cursor: pointer; font-size: 12px;">重置此素材调整</button>
          <button class="btn secondary" id="btn-close-assets">完成</button>
          <button class="btn" id="btn-reset-all" style="background: linear-gradient(135deg, #d44a4a 0%, #8a2828 100%);">重置全部调整</button>
        </div>
      </div>
    `;
    this.layer.appendChild(el);
    this.assetPanel = el;

    // 切换标签
    el.querySelectorAll('.asset-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.editorTarget = (e.currentTarget as HTMLElement).dataset.key!;
        this.refreshEditor();
      });
    });

    // 上传图片
    el.querySelector('.asset-input')!.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.onAssetUpload?.(this.editorTarget, file);
        this.setAssetStatus(this.editorTarget, '已加载 (临时)');
      }
    });

    // 恢复默认 PNG（重新加载 public 下的资源）
    el.querySelector('.asset-restore')!.addEventListener('click', () => {
      this.onAssetReset?.(this.editorTarget);
      this.setAssetStatus(this.editorTarget, '默认');
    });

    // 重置当前素材的调整参数
    const resetOneBtn = el.querySelector('.asset-reset-adjust');
    if (resetOneBtn) {
      resetOneBtn.addEventListener('click', () => {
        this.onAssetResetAdjust?.(this.editorTarget);
        this.refreshEditor();
      });
    }

    // 重置全部
    el.querySelector('#btn-reset-all')!.addEventListener('click', () => {
      if (confirm('确认重置所有素材的位置/缩放参数？')) {
        this.onAssetResetAllAdjust?.();
        this.refreshEditor();
      }
    });

    // 调整参数变化
    el.querySelectorAll('.adjust-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const key = target.dataset.key!;
        const params: Record<string, unknown> = {};
        if (target.type === 'checkbox') {
          params[key] = target.checked;
        } else if (target.type === 'range') {
          params[key] = parseFloat(target.value);
        } else if (target.tagName === 'SELECT') {
          params[key] = target.value;
        }
        this.onAssetAdjust?.(this.editorTarget, params);
      });
    });

    el.querySelector('#btn-close-assets')!.addEventListener('click', () => {
      el.classList.add('hidden');
    });
  }

  // 生成一个带数值显示的滑块行
  private makeSliderRow(key: string, label: string, min: number, max: number, step: number, def: number): string {
    return `
      <div style="margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #aaa; margin-bottom: 2px;">
          <span>${label}</span>
          <span class="adjust-val" data-key="${key}">${def}</span>
        </div>
        <input type="range" class="adjust-input" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${def}" style="width: 100%;">
      </div>
    `;
  }

  setAssetStatus(name: string, text: string): void {
    if (!this.assetPanel) return;
    const el = this.assetPanel.querySelector(`.asset-status[data-key="${name}"]`);
    if (el) el.textContent = text;
  }

  // 刷新当前选中标签的编辑器
  refreshEditor(): void {
    if (!this.assetPanel) return;
    // 切换 tab 高亮
    this.assetPanel.querySelectorAll('.asset-tab').forEach(btn => {
      const k = (btn as HTMLElement).dataset.key;
      (btn as HTMLElement).style.background = k === this.editorTarget
        ? 'rgba(109,93,252,0.6)'
        : 'rgba(0,0,0,0.4)';
    });
    // 触发回调，传入当前 target，让外部 push 当前 adjust
    this.onAssetAdjust?.(this.editorTarget, { __refresh: true });
  }

  // 外部推入当前选中素材的 adjust
  setCurrentAdjust(adjust: Record<string, unknown>): void {
    if (!this.assetPanel) return;
    this.assetPanel.querySelectorAll('.adjust-input').forEach(input => {
      const k = (input as HTMLElement).dataset.key!;
      const val = (adjust as any)[k];
      if (val === undefined) return;
      if ((input as HTMLInputElement).type === 'checkbox') {
        (input as HTMLInputElement).checked = !!val;
      } else if ((input as HTMLInputElement).type === 'range') {
        (input as HTMLInputElement).value = String(val);
        const valEl = this.assetPanel!.querySelector(`.adjust-val[data-key="${k}"]`);
        if (valEl) valEl.textContent = typeof val === 'number' ? val.toFixed(2).replace(/\.?0+$/, '') : String(val);
      } else {
        (input as HTMLInputElement).value = String(val);
      }
    });
  }

  showAssetPanel(): void {
    this.buildAssetPanel();
    this.assetPanel!.classList.remove('hidden');
    this.refreshEditor();
  }

  // ===== 状态切换 =====
  showState(state: GameState): void {
    // 隐藏所有弹窗类
    this.screens.get('pause')?.classList.add('hidden');
    this.screens.get('gameover')?.classList.add('hidden');
    this.screens.get('win')?.classList.add('hidden');
    this.assetPanel?.classList.add('hidden');

    switch (state) {
      case 'MENU':
        this.screens.get('menu')?.classList.remove('hidden');
        this.screens.get('hud')?.classList.add('hidden');
        break;
      case 'PLAYING':
        this.screens.get('menu')?.classList.add('hidden');
        this.screens.get('hud')?.classList.remove('hidden');
        break;
      case 'PAUSE':
        this.screens.get('pause')?.classList.remove('hidden');
        break;
      case 'GAME_OVER':
        this.screens.get('gameover')?.classList.remove('hidden');
        break;
      case 'GAME_WIN':
        this.screens.get('win')?.classList.remove('hidden');
        break;
    }
  }
}

// 避免循环依赖，内联常量
const CONFIG_maxDiff = 5;
