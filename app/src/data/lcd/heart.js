import { NYHA } from '../scales.js';
import { num, has, joinAnd } from './_helpers.js';

const SUPPORT = [
  ['arrhythmia', 'Treatment-resistant symptomatic supraventricular or ventricular arrhythmias'],
  ['arrest', 'History of cardiac arrest or resuscitation'],
  ['syncope', 'History of unexplained syncope'],
  ['embolism', 'Brain embolism of cardiac origin'],
  ['hiv', 'Concomitant HIV disease'],
];
const REST = [['dyspnea', 'Dyspnea at rest'], ['angina', 'Angina at rest'], ['orthopnea', 'Orthopnea / PND'], ['edema', 'Refractory edema']];

export default {
  id: 'heart',
  label: 'Heart disease',
  phrase: 'end-stage heart disease',
  lcdSection: 'Disease-specific II.C',
  appliesTo: 'Heart failure and other end-stage cardiac disease.',
  fields: [
    { id: 'etiology', label: 'Cardiac diagnosis', type: 'text', required: true, hint: 'e.g., ischemic cardiomyopathy with HFrEF; severe aortic stenosis, not a TAVR candidate' },
    { id: 'treatment', label: 'Treatment status', type: 'radio', required: true, options: [
      ['optimal', 'Optimally treated with diuretics and vasodilators (ACEi/ARB/ARNI, hydralazine/nitrates) at maximally tolerated doses'],
      ['contraindicated', 'Guideline therapy limited by hypotension, renal failure or intolerance'],
      ['not_candidate', 'Not a candidate for, or has declined, surgical or device intervention'],
      ['declined', 'Patient has declined further disease-directed therapy'],
    ] },
    { id: 'meds', label: 'Current cardiac regimen (free text)', type: 'text' },
    { id: 'nyha', label: 'NYHA functional class', type: 'radio', required: true, options: NYHA },
    { id: 'rest', label: 'Symptoms at rest', type: 'checks', options: REST },
    { id: 'ef', label: 'Ejection fraction', type: 'number', unit: '%', step: 1 },
    { id: 'support', label: 'Supporting factors', type: 'checks', options: SUPPORT },
    { id: 'events', label: 'Recent decompensations (dates)', type: 'text', hint: 'e.g., admitted 2026-07-02 and 2026-08-19 for acute decompensated HF' },
  ],
  rules: [
    {
      id: 'treatment', kind: 'required', label: 'Optimally treated, or not a candidate for / declined surgical intervention',
      test: (d) => (d.treatment ? true : null),
      text: (d) => ({
        optimal: `is optimally treated with diuretics and vasodilators${d.meds ? ` (${d.meds})` : ''} without further benefit`,
        contraindicated: `cannot tolerate further guideline-directed therapy${d.meds ? ` (current regimen: ${d.meds})` : ''}`,
        not_candidate: 'is not a candidate for surgical or device intervention',
        declined: 'has declined further disease-directed therapy',
      }[d.treatment]),
    },
    {
      id: 'nyha4', kind: 'required', label: 'NYHA class IV (symptoms at rest)',
      test: (d) => (d.nyha ? d.nyha === 'IV' : null),
      text: (d) => `has NYHA class ${d.nyha} heart failure${d.rest && d.rest.length ? ` with ${joinAnd(REST.filter(([k]) => has(d.rest, k)).map(([, l]) => l.toLowerCase()))}` : ''}`,
    },
    {
      id: 'ef', kind: 'supporting', label: 'Ejection fraction 20% or less',
      test: (d) => (num(d.ef) != null ? num(d.ef) <= 20 : null),
      text: (d) => `ejection fraction of ${d.ef}%`,
    },
    {
      id: 'support', kind: 'supporting', label: 'Supporting factors (arrhythmia, arrest, syncope, cardiac embolism, HIV)',
      test: (d) => (d.support ? d.support.length > 0 : null),
      text: (d) => joinAnd(SUPPORT.filter(([k]) => has(d.support, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
  risks: (d) => {
    const r = [];
    if (d.nyha === 'IV' && !d.meds && d.treatment === 'optimal') r.push({ level: 'warn', text: 'NYHA IV with "optimally treated" but no regimen listed. Reviewers check that diuretics and vasodilators were actually tried; name the drugs and doses.' });
    if (d.nyha && d.nyha !== 'IV') r.push({ level: 'risk', text: `NYHA class ${d.nyha} does not meet the heart-disease guideline (class IV). Eligibility would have to rest on Part I decline plus comorbidities.` });
    return r;
  },
};
