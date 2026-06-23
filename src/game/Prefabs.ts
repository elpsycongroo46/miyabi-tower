/**
 * 预制体绘制 — 仅背景为纯代码生成。
 * 星见雅、苍角、帽子均使用 PNG 素材渲染。
 */

export function drawPrefabBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // 深蓝紫渐变
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#1a1040');
  grad.addColorStop(0.35, '#2d1b69');
  grad.addColorStop(0.7, '#4a2d8f');
  grad.addColorStop(1, '#1a1040');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 随机星点
  ctx.save();
  const colors = ['#ffffff', '#ffe9c0', '#c8d6ff', '#ffd4e8'];
  for (let i = 0; i < 60; i++) {
    const sx = (i * 173 + 37) % w;
    const sy = (i * 89 + 13) % (h * 0.6);
    ctx.fillStyle = colors[i % 4];
    ctx.globalAlpha = 0.35 + (i % 5) * 0.12;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.6 + (i % 3) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 底部光晕
  const glow = ctx.createRadialGradient(w / 2, h, 0, w / 2, h, h * 0.7);
  glow.addColorStop(0, 'rgba(140, 100, 220, 0.25)');
  glow.addColorStop(1, 'rgba(140, 100, 220, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, h * 0.3, w, h * 0.7);
}
