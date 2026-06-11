import { describe, it, expect } from 'vitest';
import { rundeAuf5Rappen, formatCHF, berechneRabattUndMwst } from '@/lib/kosten-helpers';

// Lockt die Rundungs-/MwSt-Logik. Refactor #9 (Dedup) muss bit-identisch bleiben.

describe('rundeAuf5Rappen', () => {
  it('rundet auf 5 Rappen', () => {
    expect(rundeAuf5Rappen(1.234)).toBe(1.25);
    expect(rundeAuf5Rappen(1.21)).toBe(1.2);
    expect(rundeAuf5Rappen(1.225)).toBe(1.25);
    expect(rundeAuf5Rappen(0)).toBe(0);
    expect(rundeAuf5Rappen(100)).toBe(100);
  });
});

describe('formatCHF', () => {
  it('formatiert mit Apostroph-Tausendertrenner und 2 Dezimalen', () => {
    expect(formatCHF(1234.5)).toBe("1'234.50");
    expect(formatCHF(1000000)).toBe("1'000'000.00");
    expect(formatCHF(0)).toBe('0.00');
    expect(formatCHF(99.9)).toBe('99.90');
  });
});

describe('berechneRabattUndMwst', () => {
  it('berechnet Rabatt, Zwischentotal, MwSt (8.1%) und Total', () => {
    expect(berechneRabattUndMwst(1000, 10)).toEqual({
      rabattBetrag: 100,
      zwischentotal: 900,
      mwstBetrag: 72.9,
      total: 972.9,
    });
  });

  it('ohne Rabatt', () => {
    const r = berechneRabattUndMwst(1000, 0);
    expect(r.rabattBetrag).toBe(0);
    expect(r.zwischentotal).toBe(1000);
    expect(r.mwstBetrag).toBe(81);
    expect(r.total).toBe(1081);
  });
});
