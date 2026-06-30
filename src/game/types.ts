/**
 * 星见雅的双耳高塔 — 类型定义与游戏配置
 *
 * 核心机制：苍角在屏幕上方左右移动，点击屏幕释放帽子。
 * 帽子直线下落，落在星见雅狐耳线段范围内则堆叠成功，否则掉落。
 */

export enum GameState { MENU = 'MENU', PLAYING = 'PLAYING', PAUSE = 'PAUSE', GAME_OVER = 'GAME_OVER', GAME_WIN = 'GAME_WIN' }
export type GameOverReason = 'balance' | 'drop';
export type EarSide = 'left' | 'right';
export type HatState = 'holding' | 'falling' | 'settled' | 'dropped';

export const CONFIG = {
  // === 星见雅耳朵线段（相对图片尺寸的比例 0~1） ===
  leftEarX1: 0.31,
  leftEarX2: 0.47,
  rightEarX1: 0.53,
  rightEarX2: 0.69,
  earYFromBottom: 0.90,

  // === 帽子 ===
  hatGravity: 900,
  hatStackOverlap: 0.55,

  // === 苍角 ===
  cangjiaoYRatio: 0.13,
  cangjiaoBaseSpeed: 1.5,
  cangjiaoSpeedPerLayer: 0.12,
  cangjiaoMaxSpeed: 5.5,

  // === 计分 ===
  baseHeight: 130,
  heightPerHat: 5,

  // === 失败条件 ===
  maxBalanceDiff: 5,
  maxDropCount: 5,

  // === 剧情文案触发层数 ===
  storyThresholds: [5, 10, 15, 20, 30, 50],
} as const;

export const STORY_TEXTS: Record<number, string> = {
  5: '远看高课长，近看课长高，课长真是高，真是高课长',
  10: '叠帽修行第几天？课长抬头问苍天。帽子越高心越静，秩序之道在心间',
  15: '一顶两顶三四顶，顶上云端摘蜜瓜',
  20: '今日称高人，明日还高人。高人是真高，真高是高人',
  25: '罗斯凯利好风光，生日修行最在行。一测身高惊四座，原来耳朵又加长',
  30: '修行修身高，蜜瓜不能抛。吃蜜瓜长高，越吃越长高'
};
