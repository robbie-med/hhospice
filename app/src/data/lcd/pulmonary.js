import { num, has, yes, joinAnd } from './_helpers.js';

const FUNCTION = [['bedchair', 'Bed-to-chair existence'], ['fatigue', 'Fatigue'], ['cough', 'Chronic cough']];
const SUPPORT = [
  ['corpulmonale', 'Right heart failure (cor pulmonale) secondary to pulmonary disease'],
  ['weightloss', 'Unintentional progressive weight loss above 10% over the preceding six months'],
  ['tachycardia', 'Resting tachycardia above 100/min'],
];

export default {
  id: 'pulmonary',
  label: 'Pulmonary disease',
  phrase: 'end-stage pulmonary disease',
  lcdSection: 'Disease-specific II.F',
  appliesTo: 'COPD, pulmonary fibrosis and other end-stage lung disease.',
  fields: [
    { id: 'dx', label: 'Pulmonary diagnosis', type: 'text', required: true },
    { id: 'dyspneaRest', label: 'Disabling dyspnea at rest, poorly or unresponsive to bronchodilators', type: 'bool', required: true },
    { id: 'function', label: 'Decreased functional capacity', type: 'checks', options: FUNCTION },
    { id: 'fev1', label: 'Post-bronchodilator FEV1 (supportive if below 30%)', type: 'number', unit: '% predicted', step: 1 },
    { id: 'fev1Decline', label: 'FEV1 decline (supportive if above 40 mL/year)', type: 'number', unit: 'mL/year', step: 1 },
    { id: 'progression', label: 'Progression: increasing ED visits, hospitalizations or home physician visits for pulmonary infection or respiratory failure', type: 'bool', required: true },
    { id: 'progressionDetail', label: 'Dates of those visits', type: 'text' },
    { id: 'po2', label: 'Resting pO2 on room air', type: 'number', unit: 'mmHg', step: 1 },
    { id: 'spo2', label: 'Resting SpO2 on room air', type: 'number', unit: '%', step: 1 },
    { id: 'pco2', label: 'pCO2 (within 3 months)', type: 'number', unit: 'mmHg', step: 1 },
    { id: 'o2', label: 'Home oxygen', type: 'text', hint: 'e.g., 4 L/min continuous' },
    { id: 'support', label: 'Supporting factors', type: 'checks', options: SUPPORT },
  ],
  rules: [
    {
      id: 'dyspnea', kind: 'required', label: 'Disabling dyspnea at rest, poorly responsive to bronchodilators, with decreased functional capacity',
      test: (d) => yes(d.dyspneaRest),
      text: (d) => `has disabling dyspnea at rest that responds poorly to bronchodilators${d.function && d.function.length ? `, with ${joinAnd(FUNCTION.filter(([k]) => has(d.function, k)).map(([, l]) => l.toLowerCase()))}` : ''}${d.o2 ? `, on home oxygen ${d.o2}` : ''}`,
    },
    {
      id: 'progression', kind: 'required', label: 'Progression evidenced by increasing ED visits, hospitalizations or physician home visits',
      test: (d) => yes(d.progression),
      text: (d) => `shows disease progression with increasing acute-care use${d.progressionDetail ? ` (${d.progressionDetail})` : ''}`,
    },
    {
      id: 'gas', kind: 'required', label: 'Hypoxemia at rest on room air (pO2 ≤ 55 or SpO2 ≤ 88%) or hypercapnia (pCO2 ≥ 50)',
      test: (d) => {
        const po2 = num(d.po2), spo2 = num(d.spo2), pco2 = num(d.pco2);
        if (po2 == null && spo2 == null && pco2 == null) return null;
        return (po2 != null && po2 <= 55) || (spo2 != null && spo2 <= 88) || (pco2 != null && pco2 >= 50);
      },
      text: (d) => joinAnd([num(d.po2) != null ? `resting pO2 ${d.po2} mmHg on room air` : null, num(d.spo2) != null ? `resting SpO2 ${d.spo2}% on room air` : null, num(d.pco2) != null ? `pCO2 ${d.pco2} mmHg` : null]),
    },
    {
      id: 'fev1', kind: 'supporting', label: 'FEV1 below 30% predicted after bronchodilator',
      test: (d) => (num(d.fev1) != null ? num(d.fev1) < 30 : null),
      text: (d) => `post-bronchodilator FEV1 ${d.fev1}% of predicted`,
    },
    {
      id: 'fev1decline', kind: 'supporting', label: 'FEV1 decline above 40 mL/year',
      test: (d) => (num(d.fev1Decline) != null ? num(d.fev1Decline) > 40 : null),
      text: (d) => `FEV1 declining ${d.fev1Decline} mL/year`,
    },
    {
      id: 'support', kind: 'supporting', label: 'Supporting factors',
      test: (d) => (d.support ? d.support.length > 0 : null),
      text: (d) => joinAnd(SUPPORT.filter(([k]) => has(d.support, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
  risks: (d) => {
    const r = [];
    if (yes(d.progression) && !d.progressionDetail) r.push({ level: 'warn', text: 'Progression is claimed without dates of ED visits or hospitalizations. Add them.' });
    if (num(d.spo2) != null && num(d.spo2) <= 88 && !d.o2) r.push({ level: 'warn', text: 'SpO2 ≤ 88% recorded but no oxygen prescription noted. State whether the reading was on room air and what oxygen the patient uses.' });
    return r;
  },
};
