import { PPS, KPS, ADLS, ADL_LABEL, DECLINE_ITEMS, COMORBIDITIES } from '../scales.js';

// Fields captured at EVERY assessment (snapshot), regardless of disease. Parts I–III of the LCD.
export const GENERAL_FIELDS = [
  { id: 'date', label: 'Assessment date', type: 'date', required: true },
  { id: 'pps', label: 'Palliative Performance Scale (PPS)', type: 'select', options: PPS.map(([v, l]) => [String(v), `${v}% — ${l}`]), unit: '%' },
  { id: 'kps', label: 'Karnofsky (KPS), if used instead of PPS', type: 'select', options: KPS.map(([v, l]) => [String(v), `${v}% — ${l}`]), unit: '%' },
  { id: 'adls', label: 'ADLs requiring assistance', type: 'checks', options: ADLS.map((a) => [a, ADL_LABEL[a]]), hint: 'Part II baseline needs dependence in 2 or more.' },
  { id: 'weightKg', label: 'Weight', type: 'number', unit: 'kg', step: 0.1 },
  { id: 'weightLossPct6mo', label: 'Unintentional weight loss over 6 months', type: 'number', unit: '%', step: 0.1 },
  { id: 'macCm', label: 'Mid-arm circumference', type: 'number', unit: 'cm', step: 0.1 },
  { id: 'albumin', label: 'Serum albumin', type: 'number', unit: 'g/dL', step: 0.1 },
  { id: 'intake', label: 'Oral intake', type: 'radio', options: [['normal', 'Adequate'], ['reduced', 'Reduced (eating less than half of meals)'], ['minimal', 'Minimal (sips/bites only)'], ['none', 'None']] },
  { id: 'hosp6mo', label: 'Hospitalizations or ED visits in past 6 months', type: 'number', unit: 'visits', step: 1 },
  { id: 'ulcerStage', label: 'Highest pressure-ulcer stage', type: 'radio', options: [['0', 'None'], ['1', 'Stage 1'], ['2', 'Stage 2'], ['3', 'Stage 3'], ['4', 'Stage 4']] },
  { id: 'decline', label: 'Decline indicators present (LCD Part I)', type: 'checks', options: DECLINE_ITEMS },
  { id: 'comorbidities', label: 'Comorbidities contributing to prognosis (LCD Part III)', type: 'checks', options: COMORBIDITIES },
  { id: 'comorbidityDetail', label: 'How the comorbidities worsen prognosis (one line each)', type: 'textarea', hint: 'Audit reviewers look for the link between each comorbidity and the six-month prognosis, not just a list.' },
  { id: 'vitals', label: 'Vitals of note (free text, e.g., RR 28, SBP 84, SpO2 86% RA)', type: 'text' },
  { id: 'findings', label: 'Other patient-specific findings at this visit', type: 'textarea', hint: 'Exam, symptoms, caregiver report. This is what makes the narrative yours and not a template.' },
];

// The non-disease-specific pathway: no disease appendix applies; eligibility rests on Parts I and II.
export default {
  id: 'general',
  label: 'Non-disease-specific decline (no disease appendix applies)',
  phrase: 'a terminal condition without a disease-specific guideline',
  lcdSection: 'Parts I–III',
  appliesTo: 'Use when the terminal diagnosis has no disease-specific guideline (e.g., adult failure to thrive is no longer an accepted principal diagnosis; name the actual terminal condition), or when the disease appendix is not met but the overall picture supports a six-month prognosis. Eligibility then rests entirely on documented decline (Part I) plus the functional baseline (Part II).',
  fields: [
    { id: 'primaryDx', label: 'Principal terminal diagnosis (ICD-10 wording)', type: 'text', required: true, hint: 'Debility and adult failure to thrive are not accepted as principal hospice diagnoses.' },
    { id: 'whyTerminal', label: 'Why this condition is terminal for this patient', type: 'textarea', required: true },
  ],
  rules: [
    {
      id: 'dx', kind: 'required', label: 'Principal diagnosis named and explained',
      test: (d) => (d.primaryDx && d.whyTerminal ? true : d.primaryDx || d.whyTerminal ? false : null),
      text: (d) => `the principal terminal diagnosis is ${d.primaryDx}. ${d.whyTerminal}`,
    },
  ],
};
