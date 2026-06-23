/** 音效管理 — Web Audio API 合成简单提示音，无需外部音频文件 */
export class AudioManager {
  private ctx: AudioContext | null = null;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    return this.ctx;
  }

  // 简单提示音合成
  private beep(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // 叠帽成功
  playStack(): void {
    this.beep(660, 0.12, 'triangle', 0.18);
    setTimeout(() => this.beep(880, 0.1, 'triangle', 0.14), 60);
  }

  // 帽子滑落
  playSlip(): void {
    this.beep(300, 0.18, 'sawtooth', 0.1);
  }

  // 游戏失败
  playFail(): void {
    this.beep(220, 0.3, 'sawtooth', 0.18);
    setTimeout(() => this.beep(160, 0.4, 'sawtooth', 0.18), 150);
  }

  // 游戏胜利
  playWin(): void {
    this.beep(523, 0.12, 'triangle', 0.18);
    setTimeout(() => this.beep(659, 0.12, 'triangle', 0.18), 120);
    setTimeout(() => this.beep(784, 0.2, 'triangle', 0.18), 240);
  }

  // 解锁音频（首次用户交互后调用）
  resume(): void {
    this.ensureCtx();
  }
}
