import { FAST, fastAtLeast } from '../scales.js';
import { has, num, joinAnd } from './_helpers.js';

const DESCRIPTORS = [
  ['ambulate', 'Unable to ambulate without assistance'],
  ['dress', 'Unable to dress without assistance'],
  ['bathe', 'Unable to bathe without assistance'],
  ['incontinent', 'Urinary and fecal incontinence (intermittent or constant)'],
  ['speech', 'No consistently meaningful verbal communication (stereotypical phrases or 6 or fewer intelligible words)'],
];
const COMPLICATIONS = [
  ['aspiration', 'Aspiration pneumonia'],
  ['pyelo', 'Pyelonephritis or other upper urinary tract infection'],
  ['sepsis', 'Septicemia'],
  ['ulcers', 'Decubitus ulcers, multiple, stage 3–4'],
  ['fever', 'Fever, recurrent after antibiotics'],
  ['intake', 'Inability to maintain sufficient fluid and calorie intake with 10% weight loss over 6 months or albumin below 2.5 g/dL'],
];

export default {
  id: 'dementia',
  label: "Alzheimer's disease and related disorders",
  phrase: "Alzheimer's disease",
  lcdSection: 'Disease-specific II.B',
  appliesTo: 'Alzheimer-type dementia staged with FAST. The LCD says this section does not apply to other dementias (e.g., multi-infarct); for those, document under the non-disease-specific pathway and name the dementia type.',
  fields: [
    { id: 'type', label: 'Dementia type', type: 'radio', options: [['alzheimer', "Alzheimer's disease"], ['mixed', 'Mixed Alzheimer/vascular'], ['other', 'Other (vascular, Lewy body, frontotemporal)']] },
    { id: 'fast', label: 'FAST stage (highest consecutive stage reached)', type: 'select', options: FAST, required: true, hint: 'Score the highest stage reached in order; skipped stages do not count.' },
    { id: 'descriptors', label: 'Stage 7 descriptors present', type: 'checks', options: DESCRIPTORS },
    { id: 'complications', label: 'Complications in the past 12 months (one or more)', type: 'checks', options: COMPLICATIONS },
    { id: 'complicationDetail', label: 'Dates/details of the complications', type: 'text', hint: 'e.g., aspiration pneumonia 2026-08-14 treated at home with amoxicillin-clavulanate' },
  ],
  rules: [
    {
      id: 'fast7', kind: 'required', label: 'FAST stage 7 or beyond',
      test: (d) => (d.fast ? fastAtLeast(d.fast, '7a') : null),
      text: (d) => `is at FAST stage ${d.fast}`,
    },
    {
      id: 'descriptors', kind: 'required', label: 'Unable to ambulate, dress and bathe without assistance; urinary and fecal incontinence; no meaningful verbal communication',
      test: (d) => (d.descriptors ? d.descriptors.length === DESCRIPTORS.length : null),
      text: (d) => `is unable to ambulate, dress or bathe without assistance, has urinary and fecal incontinence, and has no consistently meaningful verbal communication`,
    },
    {
      id: 'complication', kind: 'required', label: 'At least one qualifying complication within the past 12 months',
      test: (d) => (d.complications ? d.complications.length > 0 : null),
      text: (d) => `in the past 12 months has had ${joinAnd(COMPLICATIONS.filter(([k]) => has(d.complications, k)).map(([, l]) => l.toLowerCase()))}${d.complicationDetail ? ` (${d.complicationDetail})` : ''}`,
    },
    {
      id: 'type', kind: 'supporting', label: 'Alzheimer-type dementia (section applies as written)',
      test: (d) => (d.type ? d.type !== 'other' : null),
      text: () => '',
    },
  ],
  risks: (d) => {
    const r = [];
    if (d.fast && fastAtLeast(d.fast, '7a') && !fastAtLeast(d.fast, '7c')) {
      r.push({ level: 'warn', text: 'FAST 7a/7b: many MAC reviewers expect 7c (unable to ambulate) before accepting dementia as the terminal diagnosis. If the patient cannot ambulate, stage 7c applies; if they can, lean on Part I decline and comorbidities.' });
    }
    if (d.type === 'other') r.push({ level: 'warn', text: 'Non-Alzheimer dementia: the LCD states the dementia guideline does not apply. Document the dementia type and use the non-disease-specific decline pathway with the FAST findings as supporting evidence.' });
    if (d.complications && d.complications.length && !d.complicationDetail) r.push({ level: 'warn', text: 'Complications are checked but undated. Reviewers want dates and treatment for each.' });
    return r;
  },
};
