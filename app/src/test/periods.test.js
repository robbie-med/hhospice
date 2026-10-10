import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodBounds, periodAt, f2fWindow, evaluatePeriod } from '../lib/periods.js';

test('benefit periods are 90, 90, then 60 days', () => {
  assert.deepEqual(periodBounds('2026-01-01', 1), { n: 1, start: '2026-01-01', end: '2026-03-31', length: 90 });
  assert.deepEqual(periodBounds('2026-01-01', 2), { n: 2, start: '2026-04-01', end: '2026-06-29', length: 90 });
  assert.deepEqual(periodBounds('2026-01-01', 3), { n: 3, start: '2026-06-30', end: '2026-08-28', length: 60 });
  assert.deepEqual(periodBounds('2026-01-01', 4), { n: 4, start: '2026-08-29', end: '2026-10-27', length: 60 });
});

test('periodAt maps dates to periods including boundaries', () => {
  assert.equal(periodAt('2026-01-01', '2026-01-01'), 1);
  assert.equal(periodAt('2026-01-01', '2026-03-31'), 1);
  assert.equal(periodAt('2026-01-01', '2026-04-01'), 2);
  assert.equal(periodAt('2026-01-01', '2026-06-30'), 3);
  assert.equal(periodAt('2026-01-01', '2026-08-29'), 4);
  assert.equal(periodAt('2026-01-01', '2025-12-31'), null);
});

test('F2F window is the 30 days before a 3rd+ period', () => {
  assert.deepEqual(f2fWindow('2026-01-01', 3), { from: '2026-05-31', to: '2026-06-29', periodStart: '2026-06-30' });
  const ok = evaluatePeriod({ admissionDate: '2026-01-01', periodNumber: 3, f2fDate: '2026-06-15', certSignedDate: '2026-06-20' });
  assert.equal(ok.f2f.required, true);
  assert.equal(ok.f2f.inWindow, true);
  assert.equal(ok.risks.length, 0);
  const early = evaluatePeriod({ admissionDate: '2026-01-01', periodNumber: 3, f2fDate: '2026-05-01', certSignedDate: '2026-06-20' });
  assert.equal(early.f2f.inWindow, false);
  assert.match(early.risks[0], /outside the required window/);
  const none = evaluatePeriod({ admissionDate: '2026-01-01', periodNumber: 3, certSignedDate: '2026-06-20' });
  assert.match(none.risks[0], /No F2F date/);
});

test('no F2F needed for periods 1 and 2; signature timing flagged', () => {
  const p1 = evaluatePeriod({ admissionDate: '2026-01-01', periodNumber: 1, certSignedDate: '2025-12-10' });
  assert.equal(p1.f2f.required, false);
  assert.ok(p1.risks.some((r) => /more than 15 days before/.test(r)));
  const p2 = evaluatePeriod({ admissionDate: '2026-01-01', periodNumber: 2 });
  assert.ok(p2.risks.some((r) => /No recertification signature/.test(r)));
});
