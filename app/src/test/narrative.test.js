import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../lib/eligibility.js';
import { categoryById } from '../data/lcd/index.js';
import { composeInitial, composeRecert, composeF2F } from '../lib/narrative.js';
import { evaluatePeriod } from '../lib/periods.js';

const cat = categoryById('heart');
const dx = { etiology: 'ischemic cardiomyopathy', treatment: 'optimal', meds: 'furosemide 80 mg bid, sacubitril-valsartan', nyha: 'IV', rest: ['dyspnea'], ef: '18' };
const mk = (label, extra = {}) => ({
  patient: { label, age: 79, sex: 'male', mac: 'ngs', admissionDate: '2026-03-01', hospicePhysician: 'Dr X', ...extra },
  category: cat,
});

test('initial narrative contains only entered facts and the required attestation', () => {
  const { patient, category } = mk('AB-1');
  const current = { general: { date: '2026-03-02', pps: '40', adls: ['bathing', 'dressing'], findings: 'Orthopneic, sleeping in recliner.' }, dx };
  const ev = evaluate({ category, current });
  const text = composeInitial({ patient, category, current, evaluation: ev, period: evaluatePeriod({ admissionDate: '2026-03-01', periodNumber: 1, certSignedDate: '2026-03-02' }) });
  assert.match(text, /NYHA class IV/);
  assert.match(text, /furosemide 80 mg bid/);
  assert.match(text, /ejection fraction of 18%/);
  assert.match(text, /PPS .*40%/);
  assert.match(text, /Orthopneic, sleeping in recliner\./);
  assert.match(text, /six months or less/);
  assert.match(text, /I confirm that I composed this narrative/);
  assert.match(text, /LCD L33393/);
  assert.doesNotMatch(text, /\[enter/);
});

test('two patients with identical findings get different wording', () => {
  const current = { general: { date: '2026-03-02', pps: '40', adls: ['bathing', 'dressing'], findings: 'x' }, dx };
  const a = mk('AB-1'), b = mk('CD-2');
  const ta = composeInitial({ ...a, current, evaluation: evaluate({ category: cat, current }), period: null });
  const tb = composeInitial({ ...b, current, evaluation: evaluate({ category: cat, current }), period: null });
  const strip = (t) => t.replace(/AB-1|CD-2/g, 'X');
  assert.notEqual(strip(ta), strip(tb));
});

test('same patient and date is reproducible', () => {
  const current = { general: { date: '2026-03-02', pps: '40', findings: 'x' }, dx };
  const a = mk('AB-1');
  const t1 = composeInitial({ ...a, current, evaluation: evaluate({ category: cat, current }), period: null });
  const t2 = composeInitial({ ...a, current, evaluation: evaluate({ category: cat, current }), period: null });
  assert.equal(t1, t2);
});

test('recert without a baseline refuses with an explanation', () => {
  const current = { general: { date: '2026-09-15', pps: '30' }, dx };
  const { patient, category } = mk('AB-1');
  const r = composeRecert({ patient, category, current, baseline: null, evaluation: evaluate({ category, current }), period: null });
  assert.ok(r.error);
  assert.equal(r.text, undefined);
});

test('recert with baseline describes the trajectory and the F2F', () => {
  const baseline = { general: { date: '2026-03-02', pps: '50', weightKg: '80' }, dx };
  const current = { general: { date: '2026-09-15', pps: '30', weightKg: '71', findings: 'Now bed-bound.' }, dx };
  const { patient, category } = mk('AB-1', { periodNumber: 3 });
  const ev = evaluate({ category, current, baseline });
  const period = evaluatePeriod({ admissionDate: '2026-03-01', periodNumber: 3, f2fDate: '2026-08-20', certSignedDate: '2026-08-25' });
  const r = composeRecert({ patient, category, current, baseline, evaluation: ev, period, f2f: { date: '2026-08-20', clinician: 'J Doe NP', clinicianIsNP: true } });
  assert.ok(r.text);
  assert.match(r.text, /PPS 50% to 30%/);
  assert.match(r.text, /weight 80 kg to 71 kg/);
  assert.match(r.text, /face-to-face encounter was performed on August 20, 2026 by J Doe NP/);
  assert.match(r.text, /benefit period 3/);
  const f2f = composeF2F({ patient, category, current, evaluation: ev, period, f2f: { date: '2026-08-20', clinician: 'J Doe NP', clinicianIsNP: true } });
  assert.match(f2f, /I attest that I had a face-to-face encounter with this patient on August 20, 2026/);
  assert.match(f2f, /provided to the certifying physician/);
  assert.match(f2f, /nurse practitioner/);
});
