// Pure eligibility evaluator. Input: a category definition, the current snapshot and (optionally)
// a baseline snapshot. Output: a structured, explainable result the UI and narrative both consume.
import { ADL_LABEL, COMORBIDITIES, DECLINE_ITEMS, FAST_RANK } from '../data/scales.js';
import { num } from '../data/lcd/_helpers.js';

const INTAKE_RANK = { normal: 0, reduced: 1, minimal: 2, none: 3 };
const INTAKE_LABEL = { normal: 'adequate', reduced: 'reduced', minimal: 'minimal', none: 'no oral intake' };

// Rule tests return true (met), false (unmet), null (no data entered) or undefined (not applicable).
export function statusOf(v) {
  return v === true ? 'met' : v === false ? 'unmet' : v === undefined ? 'skip' : 'na';
}

function evalRules(category, dx, g) {
  const results = category.rules.map((r) => {
    let v = null;
    try { v = r.test(dx || {}, g || {}); } catch { v = null; }
    let text = '';
    if (v === true) { try { text = r.text(dx || {}, g || {}); } catch { text = ''; } }
    return { id: r.id, kind: r.kind, group: r.group || null, label: r.label, status: statusOf(v), text };
  });
  const required = results.filter((r) => r.kind === 'required' && r.status !== 'skip');
  const supporting = results.filter((r) => r.kind === 'supporting' && r.status !== 'skip');
  // Ungrouped required rules must all be met; grouped ones are OR'ed within the group.
  const ungrouped = required.filter((r) => !r.group);
  const groups = {};
  required.filter((r) => r.group).forEach((r) => { (groups[r.group] ||= []).push(r); });
  let met = true, incomplete = false;
  for (const r of ungrouped) {
    if (r.status === 'unmet') met = false;
    else if (r.status === 'na') incomplete = true;
  }
  for (const grp of Object.values(groups)) {
    if (grp.some((r) => r.status === 'met')) continue;
    if (grp.length && grp.every((r) => r.status === 'unmet')) met = false;
    else incomplete = true;
  }
  const diseaseMet = !met ? false : incomplete ? null : true;
  return { required, supporting, met: diseaseMet, groups: Object.keys(groups) };
}

function evalPartII(g) {
  const pps = num(g.pps), kps = num(g.kps);
  const score = pps ?? kps;
  const scale = pps != null ? 'PPS' : kps != null ? 'KPS' : null;
  const adls = Array.isArray(g.adls) ? g.adls : [];
  const fnMet = score == null ? null : score < 70;
  const adlMet = g.adls == null ? null : adls.length >= 2;
  const met = fnMet === true && adlMet === true ? true : fnMet === false || adlMet === false ? false : null;
  return { scale, score, fnMet, adls, adlLabels: adls.map((a) => ADL_LABEL[a] || a), adlMet, met };
}

const MEASURES = [
  { id: 'pps', label: 'PPS', unit: '%', get: (s) => num(s.general?.pps), worseIf: 'down' },
  { id: 'kps', label: 'KPS', unit: '%', get: (s) => num(s.general?.kps), worseIf: 'down' },
  { id: 'weightKg', label: 'Weight', unit: ' kg', get: (s) => num(s.general?.weightKg), worseIf: 'down' },
  { id: 'macCm', label: 'Mid-arm circumference', unit: ' cm', get: (s) => num(s.general?.macCm), worseIf: 'down' },
  { id: 'albumin', label: 'Albumin', unit: ' g/dL', get: (s) => num(s.general?.albumin), worseIf: 'down' },
  { id: 'adls', label: 'ADLs needing assistance', unit: ' of 6', get: (s) => (Array.isArray(s.general?.adls) ? s.general.adls.length : null), worseIf: 'up' },
  { id: 'hosp6mo', label: 'Hospitalizations/ED visits (6 mo)', unit: '', get: (s) => num(s.general?.hosp6mo), worseIf: 'up' },
  { id: 'ulcerStage', label: 'Pressure ulcer stage', unit: '', get: (s) => num(s.general?.ulcerStage), worseIf: 'up' },
  { id: 'intake', label: 'Oral intake', unit: '', get: (s) => (s.general?.intake in INTAKE_RANK ? INTAKE_RANK[s.general.intake] : null), fmt: (v) => INTAKE_LABEL[Object.keys(INTAKE_RANK).find((k) => INTAKE_RANK[k] === v)], worseIf: 'up' },
  { id: 'fast', label: 'FAST stage', unit: '', get: (s) => (s.dx?.fast in FAST_RANK ? FAST_RANK[s.dx.fast] : null), fmt: (v) => Object.keys(FAST_RANK).find((k) => FAST_RANK[k] === v), worseIf: 'up' },
  { id: 'ef', label: 'Ejection fraction', unit: '%', get: (s) => num(s.dx?.ef), worseIf: 'down' },
  { id: 'fev1', label: 'FEV1', unit: '% predicted', get: (s) => num(s.dx?.fev1), worseIf: 'down' },
  { id: 'cd4', label: 'CD4+', unit: ' cells/µL', get: (s) => num(s.dx?.cd4), worseIf: 'down' },
  { id: 'creatinine', label: 'Creatinine', unit: ' mg/dL', get: (s) => num(s.dx?.creatinine), worseIf: 'up' },
  { id: 'inr', label: 'INR', unit: '', get: (s) => num(s.dx?.inr), worseIf: 'up' },
];

/**
 * For a sudden catastrophic event there is no prior visit to compare with; the pre-event function the
 * clinician recorded becomes the baseline so the drop is documented like any other decline.
 */
export function syntheticBaseline(current) {
  const g = current?.general || {};
  if (g.onset !== 'acute') return null;
  const pps = num(g.preEventPps);
  if (pps == null) return null;
  return { id: 'pre-event', synthetic: true, general: { date: g.eventDate || '', pps }, dx: {} };
}

/** Compare baseline vs current on every measure present in both. */
export function trajectory(baseline, current) {
  if (!baseline || !current) return [];
  const preEvent = !!baseline.synthetic;
  const out = [];
  for (const m of MEASURES) {
    const b = m.get(baseline), c = m.get(current);
    if (b == null || c == null) continue;
    const change = c - b;
    const worse = m.worseIf === 'down' ? change < 0 : change > 0;
    const fmt = m.fmt || ((v) => `${v}${m.unit}`);
    out.push({ id: m.id, label: m.label, baseline: { value: b, text: fmt(b), date: baseline.general?.date }, current: { value: c, text: fmt(c), date: current.general?.date }, change, worse, same: change === 0, preEvent });
  }
  return out;
}

/** Full evaluation. */
export function evaluate({ category, current, baseline }) {
  const g = current?.general || {};
  const dx = current?.dx || {};
  const disease = evalRules(category, dx, g);
  const partII = evalPartII(g);
  const base = baseline || syntheticBaseline(current);
  const acute = g.onset === 'acute';
  const traj = trajectory(base, current);
  const worsening = traj.filter((t) => t.worse);

  // Part I: decline evidence = checked decline items + worsening measures
  const declineItems = (g.decline || []).map((id) => DECLINE_ITEMS.find(([k]) => k === id)?.[1] || id);
  const partI = { items: declineItems, worsening, count: declineItems.length + worsening.length };

  const comorbidities = (g.comorbidities || []).map((id) => COMORBIDITIES.find(([k]) => k === id)?.[1] || id);
  const partIII = { comorbidities, detail: g.comorbidityDetail || '' };

  // Overall verdict
  let overall;
  if (category.id === 'general') {
    overall = partII.met === true && partI.count >= 2 ? 'meets' : partII.met === false ? 'no' : 'partial';
  } else if (disease.met === true) {
    overall = partII.met === false ? 'partial' : 'meets';
  } else if (disease.met === false) {
    overall = partII.met === true && partI.count >= 3 && comorbidities.length >= 1 ? 'partial' : 'no';
  } else {
    overall = 'partial';
  }

  // Risks
  const risks = [];
  const push = (level, text) => risks.push({ level, text });
  if (disease.met === false) push('risk', `The ${category.label} guideline is not met. Eligibility would have to rest on documented decline (Part I), the functional baseline (Part II) and comorbidities, and reviewers may still deny.`);
  if (disease.met == null && category.id !== 'general') push('warn', 'Disease-specific criteria are incomplete: some required items have no data entered.');
  if (partII.fnMet === false) push('risk', `${partII.scale} ${partII.score}% is 70% or above. The non-disease-specific baseline requires below 70%; explain why prognosis is still six months or less.`);
  if (partII.score == null) push('warn', 'No PPS or KPS recorded. Every certification should carry a functional score; it is the first thing a reviewer looks for.');
  if (partII.adlMet === false) push('warn', `Only ${partII.adls.length} ADL dependency recorded. The Part II baseline expects two or more.`);
  if (acute) {
    if (!g.eventDate) push('warn', 'Sudden event: enter the date of the event. The narrative dates the decline from it.');
    if (num(g.preEventPps) == null) push('warn', 'Sudden event: record function before the event (PPS). Without it there is no baseline to show the drop from.');
    if (!g.eventDesc) push('warn', 'Sudden event: name the event with its imaging or exam findings (e.g., infarct territory and volume, GCS, brainstem reflexes).');
  }
  if (partI.count === 0) push('risk', acute
    ? 'No change from the pre-event baseline is documented yet. Even after a sudden event, the reviewer needs to see function before versus now.'
    : 'No decline indicators and no baseline comparison. A narrative without evidence of decline is the most common reason for denial.');
  if (comorbidities.length && !partIII.detail) push('warn', 'Comorbidities are listed without explaining how each worsens the prognosis.');
  if (!g.findings) push('warn', 'No patient-specific findings entered for this visit. Add exam, symptoms or caregiver report so the narrative is not a template.');
  if (typeof category.risks === 'function') {
    try { category.risks(dx, g).forEach((r) => push(r.level || 'warn', r.text)); } catch { /* ignore */ }
  }

  // How many patient-specific data points exist (used to warn about generic narratives)
  let specificity = 0;
  for (const k of ['pps', 'kps', 'weightKg', 'weightLossPct6mo', 'macCm', 'albumin', 'hosp6mo', 'vitals', 'findings', 'comorbidityDetail', 'eventDate', 'eventDesc', 'preEventPps', 'preEventDesc']) if (g[k] != null && g[k] !== '') specificity++;
  for (const k of Object.keys(dx)) { const v = dx[k]; if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) specificity++; }
  specificity += worsening.length;
  if (specificity < 5) push('warn', 'Few patient-specific data points. Expect a reviewer to read the narrative as boilerplate.');

  return {
    category: { id: category.id, label: category.label, lcdSection: category.lcdSection },
    disease, partII, partI, partIII, trajectory: traj, overall, risks, specificity,
    acute, baselineKind: base ? (base.synthetic ? 'pre-event' : 'prior') : null,
  };
}
