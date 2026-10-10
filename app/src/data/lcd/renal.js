import { num, has, yes, joinAnd } from './_helpers.js';

const ACUTE_SUPPORT = [
  ['vent', 'Mechanical ventilation'], ['malignancy', 'Malignancy (other organ system)'], ['lung', 'Chronic lung disease'],
  ['cardiac', 'Advanced cardiac disease'], ['liver', 'Advanced liver disease'], ['sepsis', 'Sepsis'],
  ['immuno', 'Immunosuppression / AIDS'], ['albumin', 'Albumin below 3.5 g/dL'], ['platelets', 'Platelet count below 25,000'],
  ['dic', 'Disseminated intravascular coagulation'], ['gib', 'Gastrointestinal bleeding'],
];
const CHRONIC_SIGNS = [
  ['uremia', 'Uremia (confusion, nausea and vomiting, pruritus, restlessness)'], ['oliguria', 'Oliguria (below 400 mL/24 h)'],
  ['hyperk', 'Intractable hyperkalemia above 7.0 unresponsive to treatment'], ['pericarditis', 'Uremic pericarditis'],
  ['hrs', 'Hepatorenal syndrome'], ['overload', 'Intractable fluid overload unresponsive to treatment'],
];

export default {
  id: 'renal',
  label: 'Renal disease',
  phrase: 'end-stage renal disease',
  lcdSection: 'Disease-specific II.G',
  appliesTo: 'Acute or chronic renal failure in a patient not pursuing, or discontinuing, dialysis.',
  fields: [
    { id: 'course', label: 'Course', type: 'radio', required: true, options: [['chronic', 'Chronic renal failure'], ['acute', 'Acute renal failure']] },
    { id: 'dialysis', label: 'Dialysis / transplant', type: 'radio', required: true, options: [
      ['not_seeking', 'Not seeking dialysis or transplant'], ['discontinuing', 'Discontinuing dialysis'], ['continuing', 'Continuing dialysis'],
    ] },
    { id: 'dialysisDetail', label: 'Context (why declined / stop date)', type: 'text' },
    { id: 'diabetic', label: 'Diabetic', type: 'bool' },
    { id: 'crcl', label: 'Creatinine clearance / eGFR', type: 'number', unit: 'mL/min', step: 1 },
    { id: 'creatinine', label: 'Serum creatinine', type: 'number', unit: 'mg/dL', step: 0.1 },
    { id: 'signs', label: 'Signs and symptoms of renal failure (chronic)', type: 'checks', options: CHRONIC_SIGNS },
    { id: 'acuteSupport', label: 'Comorbid conditions (acute renal failure)', type: 'checks', options: ACUTE_SUPPORT },
  ],
  rules: [
    {
      id: 'dialysis', kind: 'required', label: 'Not seeking dialysis or transplant, or discontinuing dialysis',
      test: (d) => (d.dialysis ? d.dialysis !== 'continuing' : null),
      text: (d) => (d.dialysis === 'discontinuing' ? 'is discontinuing dialysis' : 'is not seeking dialysis or renal transplantation') + (d.dialysisDetail ? ` (${d.dialysisDetail})` : ''),
    },
    {
      id: 'labs', kind: 'required', label: 'Creatinine clearance below 10 mL/min (below 15 if diabetic) or serum creatinine above 8.0 mg/dL (above 6.0 if diabetic)',
      test: (d) => {
        const dm = yes(d.diabetic) === true;
        const cc = num(d.crcl), cr = num(d.creatinine);
        if (cc == null && cr == null) return null;
        return (cc != null && cc < (dm ? 15 : 10)) || (cr != null && cr > (dm ? 6 : 8));
      },
      text: (d) => joinAnd([num(d.crcl) != null ? `creatinine clearance ${d.crcl} mL/min` : null, num(d.creatinine) != null ? `serum creatinine ${d.creatinine} mg/dL` : null]) + (yes(d.diabetic) ? ' in a diabetic patient' : ''),
    },
    {
      id: 'signs', kind: 'supporting', label: 'Signs/symptoms of renal failure',
      test: (d) => (d.signs ? d.signs.length > 0 : null),
      text: (d) => joinAnd(CHRONIC_SIGNS.filter(([k]) => has(d.signs, k)).map(([, l]) => l.toLowerCase())),
    },
    {
      id: 'acuteSupport', kind: 'supporting', label: 'Comorbid conditions supporting a poor prognosis in acute renal failure',
      test: (d) => (d.acuteSupport ? d.acuteSupport.length > 0 : null),
      text: (d) => joinAnd(ACUTE_SUPPORT.filter(([k]) => has(d.acuteSupport, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
  risks: (d) => (d.dialysis === 'continuing' ? [{ level: 'risk', text: 'Patient continues dialysis. The renal guideline requires not seeking or discontinuing dialysis; a dialysis patient can only be hospice-eligible under a different terminal diagnosis (with dialysis unrelated) or the non-disease-specific pathway.' }] : []),
  notes: ['Threshold wording differs slightly between LCD revisions (some cite GFR below 15 for all). Verify against your MAC\'s current text.'],
};
