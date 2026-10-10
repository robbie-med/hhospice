import { num, has, joinAnd } from './_helpers.js';

const ENDSTAGE = [
  ['ascites', 'Ascites refractory to treatment, or patient non-adherent'],
  ['sbp', 'Spontaneous bacterial peritonitis'],
  ['hrs', 'Hepatorenal syndrome (elevated creatinine and BUN with oliguria and urine sodium below 10 mEq/L)'],
  ['he', 'Hepatic encephalopathy refractory to treatment, or patient non-adherent'],
  ['varices', 'Recurrent variceal bleeding despite intensive therapy'],
];
const SUPPORT = [
  ['malnutrition', 'Progressive malnutrition'],
  ['wasting', 'Muscle wasting with reduced strength and endurance'],
  ['alcohol', 'Continued active alcoholism (over 80 g ethanol/day)'],
  ['hcc', 'Hepatocellular carcinoma'],
  ['hbv', 'HBsAg positivity'],
  ['hcv', 'Hepatitis C refractory to treatment'],
];

export default {
  id: 'liver',
  label: 'Liver disease',
  phrase: 'end-stage liver disease',
  lcdSection: 'Disease-specific II.E',
  appliesTo: 'End-stage liver disease. Both lab criteria plus at least one end-stage complication.',
  fields: [
    { id: 'etiology', label: 'Etiology of cirrhosis', type: 'text', required: true },
    { id: 'inr', label: 'INR', type: 'number', step: 0.1 },
    { id: 'ptOver', label: 'Prothrombin time prolonged over control', type: 'number', unit: 'seconds', step: 0.1 },
    { id: 'albumin', label: 'Serum albumin', type: 'number', unit: 'g/dL', step: 0.1, hint: 'Also entered in the general snapshot; this copy is for the liver rule.' },
    { id: 'endstage', label: 'End-stage complications (one or more)', type: 'checks', options: ENDSTAGE },
    { id: 'support', label: 'Supporting factors', type: 'checks', options: SUPPORT },
    { id: 'transplant', label: 'Transplant status', type: 'radio', options: [['not_candidate', 'Not a transplant candidate'], ['declined', 'Declined evaluation'], ['listed', 'Listed / awaiting organ']] },
  ],
  rules: [
    {
      id: 'coag', kind: 'required', label: 'PT more than 5 seconds over control or INR above 1.5',
      test: (d) => { const i = num(d.inr), p = num(d.ptOver); if (i == null && p == null) return null; return (i != null && i > 1.5) || (p != null && p > 5); },
      text: (d) => joinAnd([num(d.inr) != null ? `INR ${d.inr}` : null, num(d.ptOver) != null ? `prothrombin time ${d.ptOver} seconds over control` : null]),
    },
    {
      id: 'albumin', kind: 'required', label: 'Serum albumin below 2.5 g/dL',
      test: (d, g) => { const a = num(d.albumin) ?? num(g.albumin); return a == null ? null : a < 2.5; },
      text: (d, g) => `serum albumin ${num(d.albumin) ?? g.albumin} g/dL`,
    },
    {
      id: 'endstage', kind: 'required', label: 'At least one end-stage complication',
      test: (d) => (d.endstage ? d.endstage.length > 0 : null),
      text: (d) => joinAnd(ENDSTAGE.filter(([k]) => has(d.endstage, k)).map(([, l]) => l.toLowerCase())),
    },
    {
      id: 'support', kind: 'supporting', label: 'Supporting factors',
      test: (d) => (d.support ? d.support.length > 0 : null),
      text: (d) => joinAnd(SUPPORT.filter(([k]) => has(d.support, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
  risks: (d) => (d.transplant === 'listed' ? [{ level: 'warn', text: 'Patient is awaiting transplant. The LCD allows certification, but the patient must be discharged from hospice if a donor organ is procured. Say so in the narrative.' }] : []),
};
