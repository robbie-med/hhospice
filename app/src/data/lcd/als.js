import { num, has, yes, joinAnd } from './_helpers.js';

const PROGRESSION = [
  ['ambulation', 'Independent ambulation → wheelchair or bed-bound'],
  ['speech', 'Normal → barely intelligible or unintelligible speech'],
  ['diet', 'Normal → pureed diet'],
  ['adls', 'Independence in most ADLs → needing major assistance in all ADLs'],
];
const NUTRITION = [
  ['intake', 'Oral intake insufficient to sustain life'],
  ['weight', 'Continuing weight loss'],
  ['dehydration', 'Dehydration or hypovolemia'],
  ['noPEG', 'Absence of artificial feeding methods sufficient to sustain life'],
];
const COMPLICATIONS = [
  ['aspiration', 'Recurrent aspiration pneumonia'],
  ['uti', 'Upper urinary tract infection (pyelonephritis)'],
  ['sepsis', 'Sepsis'],
  ['fever', 'Recurrent fever after antibiotic therapy'],
  ['ulcers', 'Stage 3–4 decubitus ulcers'],
];
const rapid = (d) => (d.progression ? d.progression.length === PROGRESSION.length : false);

export default {
  id: 'als',
  label: 'Amyotrophic lateral sclerosis',
  phrase: 'amyotrophic lateral sclerosis',
  lcdSection: 'Disease-specific II.A',
  appliesTo: 'ALS. Meet one of three pathways, with all findings within the 12 months before certification.',
  fields: [
    { id: 'vc', label: 'Vital capacity, if available', type: 'number', unit: '% predicted', step: 1 },
    { id: 'dyspneaRest', label: 'Significant dyspnea at rest', type: 'bool' },
    { id: 'o2Rest', label: 'Requires supplemental oxygen at rest', type: 'bool' },
    { id: 'declinesVent', label: 'Declines invasive ventilation (non-invasive support for comfort only)', type: 'bool' },
    { id: 'progression', label: 'Rapid progression in the past 12 months (all four for "rapid")', type: 'checks', options: PROGRESSION },
    { id: 'nutrition', label: 'Critical nutritional impairment (all four)', type: 'checks', options: NUTRITION },
    { id: 'complications', label: 'Life-threatening complications in the past 12 months', type: 'checks', options: COMPLICATIONS },
  ],
  rules: [
    {
      id: 'breathing', kind: 'required', group: 'path', label: 'Pathway 1: critically impaired breathing (VC <30% if available, dyspnea at rest, O2 at rest, declines invasive ventilation)',
      test: (d) => {
        const parts = [yes(d.dyspneaRest), yes(d.o2Rest), yes(d.declinesVent)];
        const vc = num(d.vc);
        if (vc != null) parts.push(vc < 30);
        if (parts.every((p) => p == null)) return null;
        return parts.every((p) => p === true);
      },
      text: (d) => `critically impaired breathing: ${joinAnd([num(d.vc) != null ? `vital capacity ${d.vc}% of predicted` : null, 'significant dyspnea at rest', yes(d.o2Rest) ? 'oxygen requirement at rest' : null, 'the patient declines invasive ventilation'])}`,
    },
    {
      id: 'rapid_nutrition', kind: 'required', group: 'path', label: 'Pathway 2: rapid progression plus critical nutritional impairment',
      test: (d) => {
        if (!d.progression && !d.nutrition) return null;
        return rapid(d) && (d.nutrition || []).length === NUTRITION.length;
      },
      text: (d) => `rapid disease progression over the past 12 months (${joinAnd(PROGRESSION.filter(([k]) => has(d.progression, k)).map(([, l]) => l.toLowerCase()))}) with critical nutritional impairment (${joinAnd(NUTRITION.filter(([k]) => has(d.nutrition, k)).map(([, l]) => l.toLowerCase()))})`,
    },
    {
      id: 'rapid_complication', kind: 'required', group: 'path', label: 'Pathway 3: rapid progression plus a life-threatening complication',
      test: (d) => {
        if (!d.progression && !d.complications) return null;
        return rapid(d) && (d.complications || []).length > 0;
      },
      text: (d) => `rapid disease progression over the past 12 months complicated by ${joinAnd(COMPLICATIONS.filter(([k]) => has(d.complications, k)).map(([, l]) => l.toLowerCase()))}`,
    },
  ],
};
