import { num, has, joinAnd } from './_helpers.js';

const NUTRITION = [
  ['wl6', 'Weight loss above 10% in the last 6 months or above 7.5% in the last 3 months'],
  ['albumin', 'Serum albumin below 2.5 g/dL'],
  ['aspiration', 'Current history of pulmonary aspiration not responsive to speech-language pathology interventions'],
  ['calories', 'Sequential calorie counts documenting inadequate intake'],
  ['dysphagia', 'Dysphagia severe enough to prevent adequate intake in a patient who declines artificial nutrition'],
];
const IMAGING = [
  ['infra20', 'Hemorrhagic: infratentorial volume at least 20 mL'],
  ['supra50', 'Hemorrhagic: supratentorial volume at least 50 mL'],
  ['ventricular', 'Hemorrhagic: ventricular extension'],
  ['surface30', 'Hemorrhagic: at least 30% of cerebrum involved'],
  ['shift', 'Hemorrhagic: midline shift at least 1.5 cm'],
  ['hydro', 'Hemorrhagic: obstructive hydrocephalus in a patient declining or not a candidate for shunt'],
  ['anterior', 'Thrombotic/embolic: large anterior infarct with cortical and subcortical involvement'],
  ['bihemi', 'Thrombotic/embolic: large bihemispheric infarcts'],
  ['basilar', 'Thrombotic/embolic: basilar artery occlusion'],
  ['vertebral', 'Thrombotic/embolic: bilateral vertebral artery occlusion'],
];
const COMA = [
  ['brainstem', 'Abnormal brainstem response'], ['verbal', 'Absent verbal response'],
  ['withdrawal', 'Absent withdrawal response to pain'], ['creatinine', 'Serum creatinine above 1.5 mg/dL'],
];
const COMPLICATIONS = [
  ['aspiration', 'Aspiration pneumonia'], ['pyelo', 'Upper urinary tract infection'], ['sepsis', 'Sepsis'],
  ['ulcers', 'Refractory stage 3–4 decubitus ulcers'], ['fever', 'Fever recurrent after antibiotics'],
];

export default {
  id: 'stroke',
  label: 'Stroke and coma',
  phrase: 'stroke/coma',
  lcdSection: 'Disease-specific II.H',
  appliesTo: 'Stroke (acute or chronic phase) and coma of any cause.',
  fields: [
    { id: 'presentation', label: 'Presentation', type: 'radio', required: true, options: [['stroke', 'Stroke'], ['coma', 'Coma (any cause)']] },
    { id: 'strokeType', label: 'Stroke type and date', type: 'text' },
    { id: 'nutrition', label: 'Inability to maintain hydration and caloric intake (one or more)', type: 'checks', options: NUTRITION },
    { id: 'imaging', label: 'Imaging findings supporting poor prognosis', type: 'checks', options: IMAGING },
    { id: 'coma', label: 'Coma: findings present on day 3 (any 3 of 4)', type: 'checks', options: COMA },
    { id: 'complications', label: 'Complications in the past 12 months', type: 'checks', options: COMPLICATIONS },
  ],
  rules: [
    {
      id: 'kps40', kind: 'required', group: 'path', label: 'Stroke: KPS or PPS 40% or less with inability to maintain hydration/caloric intake',
      test: (d, g) => {
        if (d.presentation !== 'stroke') return undefined;
        const k = num(g.kps) ?? num(g.pps);
        if (k == null && !d.nutrition) return null;
        return k != null && k <= 40 && (d.nutrition || []).length > 0;
      },
      text: (d, g) => `${d.strokeType ? d.strokeType + ', ' : ''}functional status ${num(g.kps) != null ? `KPS ${g.kps}%` : `PPS ${g.pps}%`} with inability to maintain hydration and caloric intake (${joinAnd(NUTRITION.filter(([k]) => has(d.nutrition, k)).map(([, l]) => l.toLowerCase()))})`,
    },
    {
      id: 'coma3', kind: 'required', group: 'path', label: 'Coma: any 3 of 4 findings on day 3',
      test: (d) => (d.presentation !== 'coma' ? undefined : d.coma ? d.coma.length >= 3 : null),
      text: (d) => `coma with ${joinAnd(COMA.filter(([k]) => has(d.coma, k)).map(([, l]) => l.toLowerCase()))} on day 3`,
    },
    {
      id: 'imaging', kind: 'supporting', label: 'Imaging findings',
      test: (d) => (d.imaging ? d.imaging.length > 0 : null),
      text: (d) => joinAnd(IMAGING.filter(([k]) => has(d.imaging, k)).map(([, l]) => l.replace(/^[^:]+: /, '').toLowerCase())),
    },
    {
      id: 'complications', kind: 'supporting', label: 'Medical complications in the past 12 months',
      test: (d) => (d.complications ? d.complications.length > 0 : null),
      text: (d) => joinAnd(COMPLICATIONS.filter(([k]) => has(d.complications, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
};
