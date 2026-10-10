import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, syntheticBaseline } from '../lib/eligibility.js';
import { categoryById } from '../data/lcd/index.js';
import { composeInitial, composeF2F } from '../lib/narrative.js';
import { evaluatePeriod } from '../lib/periods.js';

const stroke = categoryById('stroke');
const current = {
  id: 'c', general: {
    date: '2026-10-09', onset: 'acute', eventDate: '2026-10-01', eventDesc: 'a large left MCA infarct with hemorrhagic conversion',
    preEventPps: '90', preEventDesc: 'independent in all ADLs and living alone', pps: '30', adls: ['feeding', 'transfer', 'bathing', 'dressing'],
    intake: 'minimal', findings: 'Dense right hemiplegia, aphasic, failed swallow evaluation.',
  },
  dx: { presentation: 'stroke', strokeType: 'left MCA infarct 2026-10-01', nutrition: ['dysphagia'], imaging: ['anterior'] },
};
const patient = { label: 'AB-3', age: '78', sex: 'male', category: 'stroke', mac: 'cgs', admissionDate: '2026-10-08', hospicePhysician: 'Dr X' };

test('acute onset yields a synthetic pre-event baseline', () => {
  const b = syntheticBaseline(current);
  assert.equal(b.synthetic, true);
  assert.equal(b.general.pps, 90);
  assert.equal(b.general.date, '2026-10-01');
  assert.equal(syntheticBaseline({ general: { onset: 'progressive', preEventPps: '90' } }), null);
  assert.equal(syntheticBaseline({ general: { onset: 'acute' } }), null);
});

test('evaluation uses the pre-event baseline when no prior snapshot exists', () => {
  const ev = evaluate({ category: stroke, current, baseline: null });
  assert.equal(ev.acute, true);
  assert.equal(ev.baselineKind, 'pre-event');
  const pps = ev.trajectory.find((t) => t.id === 'pps');
  assert.ok(pps && pps.worse && pps.preEvent);
  assert.equal(pps.baseline.value, 90);
  assert.ok(ev.partI.count >= 1);
  assert.ok(!ev.risks.some((r) => /No decline indicators/.test(r.text)));
  assert.equal(ev.disease.met, true);
  assert.equal(ev.overall, 'meets');
});

test('a real prior snapshot takes precedence over the synthetic one', () => {
  const prior = { id: 'p', general: { date: '2026-10-05', pps: '40' }, dx: {} };
  const ev = evaluate({ category: stroke, current, baseline: prior });
  assert.equal(ev.baselineKind, 'prior');
  assert.equal(ev.trajectory.find((t) => t.id === 'pps').baseline.value, 40);
});

test('missing pre-event data is flagged, not silently ignored', () => {
  const ev = evaluate({ category: stroke, current: { ...current, general: { ...current.general, preEventPps: '', eventDate: '', eventDesc: '' } }, baseline: null });
  assert.equal(ev.baselineKind, null);
  assert.ok(ev.risks.some((r) => /function before the event/.test(r.text)));
  assert.ok(ev.risks.some((r) => /date of the event/.test(r.text)));
  assert.ok(ev.risks.some((r) => /pre-event baseline/.test(r.text)));
});

test('initial narrative states the pre-event function, the event, and the abrupt drop', () => {
  const ev = evaluate({ category: stroke, current, baseline: null });
  const period = evaluatePeriod({ admissionDate: patient.admissionDate, periodNumber: 1 });
  const text = composeInitial({ patient, category: stroke, current, evaluation: ev, period });
  assert.match(text, /Before October 1, 2026, AB-3 was independent in all ADLs and living alone \(PPS 90%\)\./);
  assert.match(text, /On that date he sustained a large left MCA infarct with hemorrhagic conversion\./);
  assert.match(text, /PPS 90% to 30%/);
  assert.match(text, /days rather than months|abrupt/);
});

test('F2F attestation labels decline from the pre-event function', () => {
  const ev = evaluate({ category: stroke, current, baseline: null });
  const period = evaluatePeriod({ admissionDate: '2026-04-01', periodNumber: 3, f2fDate: '2026-09-20' });
  const text = composeF2F({ patient, category: stroke, current, evaluation: ev, period, f2f: { date: '2026-09-20', clinician: 'NP Y', clinicianIsNP: true } });
  assert.match(text, /Decline from pre-event function: PPS 90% to 30%/);
});
