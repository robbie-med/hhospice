import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../lib/eligibility.js';
import { categoryById, CATEGORIES } from '../data/lcd/index.js';

const G = { date: '2026-10-01', pps: '40', adls: ['feeding', 'bathing', 'dressing'], albumin: '2.2', findings: 'x', decline: ['weakness'] };
const ok = (id, dx, general = G) => evaluate({ category: categoryById(id), current: { general, dx } });

// One qualifying and one non-qualifying fixture per disease guideline.
const FIXTURES = {
  cancer: [{ site: 'NSCLC', stage: 'progressed', course: ['decline_despite'] }, { site: 'NSCLC', stage: 'locally_advanced', exception: 'none' }],
  heart: [{ etiology: 'ICM', treatment: 'optimal', nyha: 'IV' }, { etiology: 'ICM', treatment: 'optimal', nyha: 'III' }],
  pulmonary: [{ dx: 'COPD', dyspneaRest: 'yes', progression: 'yes', spo2: '86' }, { dx: 'COPD', dyspneaRest: 'yes', progression: 'yes', spo2: '93', po2: '70' }],
  dementia: [{ fast: '7c', descriptors: ['ambulate', 'dress', 'bathe', 'incontinent', 'speech'], complications: ['sepsis'] }, { fast: '6e', descriptors: ['dress'], complications: [] }],
  stroke: [{ presentation: 'stroke', nutrition: ['albumin'] }, { presentation: 'coma', coma: ['verbal'] }],
  als: [{ dyspneaRest: 'yes', o2Rest: 'yes', declinesVent: 'yes', vc: '25' }, { dyspneaRest: 'no', o2Rest: 'no', declinesVent: 'yes', progression: ['ambulation'], complications: [] }],
  liver: [{ etiology: 'EtOH', inr: '1.9', albumin: '2.1', endstage: ['ascites'] }, { etiology: 'EtOH', inr: '1.2', albumin: '3.0', endstage: [] }],
  renal: [{ course: 'chronic', dialysis: 'not_seeking', creatinine: '9.1' }, { course: 'chronic', dialysis: 'continuing', creatinine: '9.1' }],
  hiv: [{ cd4: '12', conditions: ['pml'] }, { cd4: '300', viralLoad: '2000', conditions: [] }],
  general: [{ primaryDx: 'Parkinson disease', whyTerminal: 'Bed-bound with dysphagia.' }, { primaryDx: '', whyTerminal: '' }],
};

for (const c of CATEGORIES) {
  test(`${c.id}: qualifying fixture is met`, () => {
    const r = ok(c.id, FIXTURES[c.id][0], c.id === 'general' ? { ...G, decline: ['weakness', 'inanition'] } : G);
    assert.equal(r.disease.met, true, JSON.stringify(r.disease.required));
    assert.equal(r.overall, 'meets');
  });
  test(`${c.id}: non-qualifying fixture is not met`, () => {
    const r = ok(c.id, FIXTURES[c.id][1]);
    assert.notEqual(r.disease.met, true);
    assert.notEqual(r.overall, 'meets');
  });
}

test('stroke pathway uses general KPS/PPS and the 40% threshold', () => {
  const r = evaluate({ category: categoryById('stroke'), current: { general: { ...G, pps: '50' }, dx: { presentation: 'stroke', nutrition: ['albumin'] } } });
  assert.equal(r.disease.met, false);
});

test('HIV requires KPS/PPS 50 or less', () => {
  const r = evaluate({ category: categoryById('hiv'), current: { general: { ...G, pps: '60' }, dx: { cd4: '12', conditions: ['pml'] } } });
  assert.equal(r.disease.met, false);
});

test('renal thresholds shift for diabetics', () => {
  const nd = ok('renal', { course: 'chronic', dialysis: 'not_seeking', creatinine: '6.5', diabetic: 'no' });
  const dm = ok('renal', { course: 'chronic', dialysis: 'not_seeking', creatinine: '6.5', diabetic: 'yes' });
  assert.equal(nd.disease.met, false);
  assert.equal(dm.disease.met, true);
});

test('Part II baseline: PPS >= 70 or fewer than 2 ADLs is flagged', () => {
  const r = evaluate({ category: categoryById('dementia'), current: { general: { ...G, pps: '70', adls: ['bathing'] }, dx: FIXTURES.dementia[0] } });
  assert.equal(r.partII.met, false);
  assert.equal(r.overall, 'partial');
  assert.ok(r.risks.some((x) => /70% or above/.test(x.text)));
  assert.ok(r.risks.some((x) => /Only 1 ADL/.test(x.text)));
});

test('trajectory compares baseline and current and detects worsening', () => {
  const r = evaluate({
    category: categoryById('dementia'),
    baseline: { general: { date: '2026-07-01', pps: '50', weightKg: '60', albumin: '2.2' }, dx: { fast: '7a' } },
    current: { general: { ...G, weightKg: '54', albumin: '2.2' }, dx: FIXTURES.dementia[0] },
  });
  const byId = Object.fromEntries(r.trajectory.map((t) => [t.id, t]));
  assert.equal(byId.pps.worse, true);
  assert.equal(byId.weightKg.worse, true);
  assert.equal(byId.albumin.same, true);
  assert.equal(byId.fast.worse, true);
  assert.equal(byId.fast.current.text, '7c');
});

test('missing data yields NO DATA, not UNMET, and an incomplete warning', () => {
  const r = ok('heart', { etiology: 'ICM' });
  assert.ok(r.disease.required.every((x) => x.status === 'na'));
  assert.equal(r.disease.met, null);
  assert.ok(r.risks.some((x) => /incomplete/.test(x.text)));
});
