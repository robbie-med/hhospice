// Deterministic narrative composer. No templates with blanks: every sentence is built from data the
// clinician entered, and phrasing is varied by a seed derived from the patient and date so two
// patients never produce the same text. The physician still edits before signing.
import { fmtDate, periodBounds } from './periods.js';
import { macById } from '../data/macs.js';
import { PPS, KPS } from '../data/scales.js';
import { joinAnd } from '../data/lcd/_helpers.js';

function seedFrom(str) {
  let h = 2166136261;
  for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}
function picker(seed) {
  let s = seed || 1;
  return (arr) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return arr[s % arr.length]; };
}
const an = (age) => (/^(8|11|18)/.test(String(age)) ? 'an' : 'a');
const lc = (s) => String(s || '').split(' ').map((w) => (/^[A-Z0-9%]{2,}/.test(w) ? w : w.toLowerCase())).join(' ');
const dxName = (category, patient) => (category.phrase || category.label) + (patient.dxText ? ` (${patient.dxText})` : '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sentence = (s) => { s = String(s || '').trim(); if (!s) return ''; return /[.!?]$/.test(s) ? s : s + '.'; };
const sexWord = (sex) => ({ male: 'man', female: 'woman' }[sex] || 'patient');
const pronoun = (sex) => ({ male: 'he', female: 'she' }[sex] || 'they');
const Pronoun = (sex) => cap(pronoun(sex));
const verb = (sex, sing, plur) => (pronoun(sex) === 'they' ? plur : sing);

function scaleDesc(scale, value) {
  const table = scale === 'KPS' ? KPS : PPS;
  const row = table.find(([v]) => v === Number(value));
  return row ? row[1].toLowerCase() : '';
}

function functionalSentence(ev, sex, pick) {
  const p = ev.partII;
  if (p.score == null) return '';
  const desc = scaleDesc(p.scale, p.score);
  const adl = p.adls.length
    ? pick([
        `${Pronoun(sex)} ${verb(sex, 'requires', 'require')} assistance with ${p.adls.length} of 6 activities of daily living (${joinAnd(p.adlLabels.map((a) => a.toLowerCase()))})`,
        `Assistance is needed for ${joinAnd(p.adlLabels.map((a) => a.toLowerCase()))}, ${p.adls.length} of 6 ADLs`,
      ])
    : '';
  const fn = pick([
    `Functional status is ${p.scale} ${p.score}%${desc ? ` (${desc})` : ''}`,
    `${p.scale} is ${p.score}%${desc ? `: ${desc}` : ''}`,
  ]);
  return sentence(fn) + (adl ? ' ' + sentence(adl) : '');
}

function trajectorySentences(ev, sex, pick) {
  const t = ev.trajectory;
  if (!t.length) return '';
  const worse = t.filter((x) => x.worse);
  const stable = t.filter((x) => x.same);
  const better = t.filter((x) => !x.worse && !x.same);
  const from = fmtDate(t[0].baseline.date), to = fmtDate(t[0].current.date);
  const parts = [];
  if (worse.length) {
    const items = worse.map((x) => `${lc(x.label)} ${x.baseline.text} to ${x.current.text}`);
    parts.push(pick([
      `Between ${from} and ${to}, ${joinAnd(items)} declined`,
      `Compared with the assessment of ${from}, by ${to} ${joinAnd(items)} had worsened`,
      `Serial measurements document decline from ${from} to ${to}: ${joinAnd(items)}`,
    ]).replace(/declined$/, 'show decline').replace(/had worsened$/, 'had worsened'));
  }
  if (stable.length) parts.push(`${cap(joinAnd(stable.map((x) => `${lc(x.label)} (${x.current.text})`)))} ${stable.length > 1 ? 'were' : 'was'} unchanged over the same interval`);
  if (better.length) parts.push(`${cap(joinAnd(better.map((x) => `${lc(x.label)} ${x.baseline.text} to ${x.current.text}`)))} improved, which does not alter the overall trajectory`);
  return parts.map(sentence).join(' ');
}

function declineSentence(ev, sex, pick) {
  const items = ev.partI.items.map((s) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim());
  if (!items.length) return '';
  return sentence(pick([
    `Clinical decline is further evidenced by ${joinAnd(items)}`,
    `${Pronoun(sex)} also ${verb(sex, 'shows', 'show')} ${joinAnd(items)}`,
    `Additional indicators of decline include ${joinAnd(items)}`,
  ]));
}

function diseaseSentences(ev, patient, category, pick) {
  const sex = patient.sex;
  const met = ev.disease.required.filter((r) => r.status === 'met' && r.text);
  const sup = ev.disease.supporting.filter((r) => r.status === 'met' && r.text);
  const out = [];
  if (met.length) {
    const texts = met.map((r) => r.text.trim());
    if (category.id === 'general') {
      out.push(sentence(cap(texts.join(' '))));
    } else {
      // Rules already phrased as predicates ("has NYHA class IV...", "is at FAST stage 7c") or noun phrases.
      const predicates = texts.filter((t) => /^(is|has|have|are|cannot|shows|show|in the past|requires)\b/i.test(t));
      const nouns = texts.filter((t) => !predicates.includes(t));
      if (predicates.length) out.push(sentence(`${Pronoun(sex)} ${predicates.join(', and ')}`));
      if (nouns.length) out.push(sentence(pick([
        `The record documents ${joinAnd(nouns)}`,
        `Findings include ${joinAnd(nouns)}`,
        `Specifically, ${joinAnd(nouns)}`,
      ])));
    }
  }
  if (sup.length) out.push(sentence(pick([
    `Supporting the prognosis, ${joinAnd(sup.map((r) => r.text.trim()))}`,
    `Prognosis is further supported by ${joinAnd(sup.map((r) => r.text.trim()))}`,
  ])));
  return out.join(' ');
}

function comorbiditySentence(ev, pick) {
  const c = ev.partIII.comorbidities;
  if (!c.length) return '';
  const base = pick([
    `Prognosis is compounded by ${joinAnd(c.map((x) => x.toLowerCase()))}`,
    `Comorbid ${joinAnd(c.map((x) => x.toLowerCase()))} ${c.length > 1 ? 'contribute' : 'contributes'} to the terminal trajectory`,
  ]);
  return sentence(base) + (ev.partIII.detail ? ' ' + ev.partIII.detail.split(/\n+/).map(sentence).join(' ') : '');
}

function visitSentence(current) {
  const g = current?.general || {};
  const parts = [];
  if (g.vitals) parts.push(sentence(`Vital signs: ${g.vitals}`));
  if (g.weightLossPct6mo) parts.push(sentence(`Unintentional weight loss of ${g.weightLossPct6mo}% over six months`));
  if (g.intake && g.intake !== 'normal') parts.push(sentence(`Oral intake is ${{ reduced: 'reduced to less than half of meals', minimal: 'minimal, sips and bites only', none: 'absent' }[g.intake]}`));
  if (g.findings) parts.push(g.findings.split(/\n+/).map(sentence).join(' '));
  return parts.join(' ');
}

function header(patient, category, period, mac) {
  const lines = [];
  const b = period?.period;
  lines.push(`Patient: ${patient.label || '[label]'}, ${patient.age || '[age]'}-year-old ${sexWord(patient.sex)}`);
  lines.push(`Principal hospice diagnosis: ${category.label}${patient.dxText ? ` (${patient.dxText})` : ''}`);
  if (b) lines.push(`Benefit period ${b.n} (${fmtDate(b.start)} to ${fmtDate(b.end)})${patient.admissionDate ? `; election date ${fmtDate(patient.admissionDate)}` : ''}`);
  lines.push(`Guideline: ${mac.name} LCD ${mac.lcd}, ${category.lcdSection}`);
  return lines.join('\n');
}

const ATTESTATION = 'I confirm that I composed this narrative based on my review of the patient\'s medical record and, where indicated, my examination of the patient.';

/** Initial certification narrative. */
export function composeInitial({ patient, category, current, evaluation, period }) {
  const pick = picker(seedFrom(`${patient.label}|${current?.general?.date}|initial`));
  const sex = patient.sex;
  const mac = macById(patient.mac);
  const body = [];
  body.push(sentence(pick([
    `${patient.label || 'The patient'} is ${an(patient.age)} ${patient.age}-year-old ${sexWord(sex)} with ${dxName(category, patient)} who was evaluated for hospice eligibility on ${fmtDate(current.general.date)}`,
    `I evaluated ${patient.label || 'the patient'}, ${an(patient.age)} ${patient.age}-year-old ${sexWord(sex)}, on ${fmtDate(current.general.date)} for hospice certification with a principal diagnosis of ${dxName(category, patient)}`,
    `This ${patient.age}-year-old ${sexWord(sex)} (${patient.label || 'label'}) has ${dxName(category, patient)} and was assessed for hospice eligibility on ${fmtDate(current.general.date)}`,
  ])));
  body.push(diseaseSentences(evaluation, patient, category, pick));
  body.push(functionalSentence(evaluation, sex, pick));
  body.push(trajectorySentences(evaluation, sex, pick));
  body.push(declineSentence(evaluation, sex, pick));
  body.push(visitSentence(current));
  body.push(comorbiditySentence(evaluation, pick));
  body.push(sentence(pick([
    `Taken together, these findings support a life expectancy of six months or less if the disease runs its normal course, and ${patient.label || 'the patient'} is appropriate for the Medicare hospice benefit`,
    `In my clinical judgment the documented disease burden, functional status and trajectory indicate a prognosis of six months or less should the illness follow its expected course`,
    `Based on the disease-specific findings, functional decline and comorbid burden described above, I certify that ${patient.label || 'the patient'} is terminally ill with a prognosis of six months or less if the disease runs its normal course`,
  ])));
  const text = body.filter(Boolean).join(' ');
  return [
    'CERTIFICATION OF TERMINAL ILLNESS — PHYSICIAN NARRATIVE',
    header(patient, category, period, mac),
    '',
    text,
    '',
    ATTESTATION,
    `${patient.hospicePhysician || '[Hospice physician]'}, MD/DO    Date: ${patient.certSignedDate ? fmtDate(patient.certSignedDate) : '____________'}`,
    patient.attendingName ? `Attending physician: ${patient.attendingName}    Date: ____________` : null,
  ].filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

/** Recertification narrative. Returns { text } or { error } when the trajectory cannot be documented. */
export function composeRecert({ patient, category, current, baseline, evaluation, period, f2f }) {
  if (!baseline) {
    return { error: 'A recertification narrative needs at least two assessments (a prior one and the current one) so the decline since the last certification can be described. Add an earlier snapshot, or enter the previous period\'s findings as a dated snapshot.' };
  }
  if (!evaluation.trajectory.length) {
    return { error: 'The prior and current assessments share no comparable measure (PPS, weight, albumin, ADLs, FAST…). Record at least one measure in both so decline can be shown.' };
  }
  const pick = picker(seedFrom(`${patient.label}|${current?.general?.date}|recert`));
  const sex = patient.sex;
  const mac = macById(patient.mac);
  const b = period?.period;
  const worse = evaluation.trajectory.filter((t) => t.worse);
  const body = [];
  body.push(sentence(pick([
    `${patient.label || 'The patient'} is ${an(patient.age)} ${patient.age}-year-old ${sexWord(sex)} with ${dxName(category, patient)}, admitted to hospice on ${fmtDate(patient.admissionDate)}, now being recertified for benefit period ${b?.n || ''}`,
    `I am recertifying ${patient.label || 'the patient'}, ${an(patient.age)} ${patient.age}-year-old ${sexWord(sex)} with ${dxName(category, patient)} under hospice care since ${fmtDate(patient.admissionDate)}, for benefit period ${b?.n || ''}`,
  ])));
  if (f2f?.date) {
    body.push(sentence(`A face-to-face encounter was performed on ${fmtDate(f2f.date)} by ${f2f.clinician || 'the hospice physician/nurse practitioner'}, and the clinical findings of that encounter were used in this recertification`));
  }
  body.push(trajectorySentences(evaluation, sex, pick));
  if (!worse.length) {
    body.push(sentence(pick([
      `Although measured parameters are unchanged since the previous period, ${pronoun(sex)} ${verb(sex, 'remains', 'remain')} at an advanced stage of disease and the overall picture continues to support a terminal prognosis for the reasons below`,
      `Stable measurements over this interval reflect a plateau at an end-stage level of function rather than recovery`,
    ])));
  }
  body.push(diseaseSentences(evaluation, patient, category, pick));
  body.push(functionalSentence(evaluation, sex, pick));
  body.push(declineSentence(evaluation, sex, pick));
  body.push(visitSentence(current));
  body.push(comorbiditySentence(evaluation, pick));
  body.push(sentence(pick([
    `${Pronoun(sex)} ${verb(sex, 'continues', 'continue')} to meet hospice eligibility, and in my judgment ${pronoun(sex)} ${verb(sex, 'has', 'have')} a life expectancy of six months or less if the disease runs its normal course`,
    `The documented trajectory and current status support continued hospice eligibility with a prognosis of six months or less should the illness follow its normal course`,
  ])));
  const text = body.filter(Boolean).join(' ');
  const out = [
    'HOSPICE RECERTIFICATION — PHYSICIAN NARRATIVE',
    header(patient, category, period, mac),
    '',
    text,
    '',
    ATTESTATION,
    `${patient.hospicePhysician || '[Hospice physician]'}, MD/DO    Date: ${patient.certSignedDate ? fmtDate(patient.certSignedDate) : '____________'}`,
  ].join('\n');
  return { text: out };
}

/** Face-to-face attestation. */
export function composeF2F({ patient, category, current, evaluation, period, f2f }) {
  const b = period?.period;
  const findings = [];
  const g = current?.general || {};
  if (evaluation.partII.score != null) findings.push(`${evaluation.partII.scale} ${evaluation.partII.score}%`);
  if (evaluation.partII.adls.length) findings.push(`assistance with ${joinAnd(evaluation.partII.adlLabels.map((a) => a.toLowerCase()))}`);
  if (g.weightKg) findings.push(`weight ${g.weightKg} kg`);
  if (g.vitals) findings.push(g.vitals);
  const dxMet = evaluation.disease.required.filter((r) => r.status === 'met' && r.text).map((r) => r.text);
  const worse = evaluation.trajectory.filter((t) => t.worse).map((t) => `${lc(t.label)} ${t.baseline.text} to ${t.current.text}`);
  const lines = [
    'HOSPICE FACE-TO-FACE ENCOUNTER ATTESTATION',
    `Patient: ${patient.label || '[label]'}, ${patient.age || '[age]'}-year-old ${sexWord(patient.sex)}. Principal diagnosis: ${category.label}.`,
    b ? `For recertification of benefit period ${b.n} beginning ${fmtDate(b.start)}.` : null,
    '',
    `I attest that I had a face-to-face encounter with this patient on ${f2f?.date ? fmtDate(f2f.date) : '____________'}.`,
    '',
    'Clinical findings from the encounter:',
    findings.length ? `- ${findings.join('\n- ')}` : '- [enter findings]',
    dxMet.length ? `- ${dxMet.join('\n- ')}` : null,
    worse.length ? `- Decline since prior assessment: ${joinAnd(worse)}` : null,
    g.findings ? `- ${g.findings.split(/\n+/).join('\n- ')}` : null,
    '',
    'These clinical findings were provided to the certifying physician for use in determining continued eligibility for hospice care.',
    '',
    `${f2f?.clinician || '[Physician or hospice NP]'}    Date: ${f2f?.date ? fmtDate(f2f.date) : '____________'}`,
    f2f?.clinicianIsNP ? 'Encounter performed by a hospice nurse practitioner; the certifying physician has considered these findings in composing the recertification narrative.' : null,
  ];
  return lines.filter((l) => l !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}
