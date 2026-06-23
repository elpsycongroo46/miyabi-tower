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
  baseHeight: 100,
  heightPerHat: 5,

  // === 失败条件 ===
  maxBalanceDiff: 5,
  maxDropCount: 5,

  // === 剧情文案触发层数 ===
  storyThresholds: [5, 10, 15, 20, 30, 50],
} as const;

export const STORY_TEXTS: Record<number, string> = {
  5: '星见雅：嗯……还算稳当。',
  10: '星见雅：帽子越叠越高了，专注。',
  15: '苍角：雅大人，小心左边！',
  20: '星见雅：这修行比想象中费神……',
  30: '月城柳：哦？这边好像很热闹？',
  50: '星见雅：……你居然能叠到这种高度。'
};
