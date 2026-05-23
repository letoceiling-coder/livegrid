import { describe, it, expect } from 'vitest';
import {
  resolveChessVisualState,
  isChessCellInteractive,
  CHESS_STATUS_LABEL,
} from './chessboard-status';

describe('chessboard-status', () => {
  it('prioritizes selected over hidden', () => {
    expect(resolveChessVisualState('available', { hidden: true, selected: true })).toBe('selected');
  });

  it('marks hidden when filtered', () => {
    expect(resolveChessVisualState('available', { hidden: true })).toBe('hidden');
  });

  it('sold cannot be selected visually as selected state', () => {
    expect(resolveChessVisualState('sold', { selected: true })).toBe('sold');
  });

  it('interactive only for non-sold visible', () => {
    expect(isChessCellInteractive('available', false)).toBe(true);
    expect(isChessCellInteractive('sold', false)).toBe(false);
    expect(isChessCellInteractive('available', true)).toBe(false);
  });

  it('has Russian labels aligned with apartment page', () => {
    expect(CHESS_STATUS_LABEL.available).toBe('Свободна');
    expect(CHESS_STATUS_LABEL.reserved).toBe('Бронь');
    expect(CHESS_STATUS_LABEL.sold).toBe('Продана');
  });
});
