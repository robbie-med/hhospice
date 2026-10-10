// Clinical scales used across the workbench. Pure data.

export const PPS = [
  [100, 'Full ambulation, normal activity, no evidence of disease'],
  [90, 'Full ambulation, normal activity, some evidence of disease'],
  [80, 'Full ambulation, normal activity with effort'],
  [70, 'Reduced ambulation, unable to do normal job or work'],
  [60, 'Reduced ambulation, unable to do hobbies or housework, occasional assistance'],
  [50, 'Mainly sits or lies, considerable assistance required'],
  [40, 'Mainly in bed, unable to do most activity, mainly assistance'],
  [30, 'Totally bed bound, unable to do any activity, total care'],
  [20, 'Totally bed bound, minimal intake (sips), total care'],
  [10, 'Totally bed bound, mouth care only, drowsy or coma'],
];

export const KPS = [
  [100, 'Normal, no complaints'],
  [90, 'Able to carry on normal activity, minor symptoms'],
  [80, 'Normal activity with effort, some symptoms'],
  [70, 'Cares for self, unable to carry on normal activity or work'],
  [60, 'Requires occasional assistance, cares for most needs'],
  [50, 'Requires considerable assistance and frequent medical care'],
  [40, 'Disabled, requires special care and assistance'],
  [30, 'Severely disabled, hospitalization indicated'],
  [20, 'Very sick, active supportive treatment necessary'],
  [10, 'Moribund'],
];

export const FAST = [
  ['4', '4 — Decreased ability to perform complex tasks (finances, travel)'],
  ['5', '5 — Requires assistance choosing proper clothing'],
  ['6a', '6a — Difficulty putting on clothing properly'],
  ['6b', '6b — Unable to bathe properly'],
  ['6c', '6c — Inability to handle mechanics of toileting'],
  ['6d', '6d — Urinary incontinence'],
  ['6e', '6e — Fecal incontinence'],
  ['7a', '7a — Speech limited to about 6 intelligible words per day'],
  ['7b', '7b — Speech limited to a single intelligible word'],
  ['7c', '7c — Unable to ambulate without assistance'],
  ['7d', '7d — Unable to sit up without assistance'],
  ['7e', '7e — Loss of ability to smile'],
  ['7f', '7f — Unable to hold head up independently'],
];
export const FAST_RANK = Object.fromEntries(FAST.map(([k], i) => [k, i]));
export const fastAtLeast = (stage, threshold) =>
  stage in FAST_RANK && FAST_RANK[stage] >= FAST_RANK[threshold];

export const NYHA = [
  ['I', 'Class I — no limitation of physical activity'],
  ['II', 'Class II — slight limitation, comfortable at rest'],
  ['III', 'Class III — marked limitation, comfortable only at rest'],
  ['IV', 'Class IV — symptoms at rest, any activity increases discomfort'],
];

export const ADLS = ['feeding', 'ambulation', 'continence', 'transfer', 'bathing', 'dressing'];
export const ADL_LABEL = {
  feeding: 'Feeding', ambulation: 'Ambulation', continence: 'Continence',
  transfer: 'Transfer', bathing: 'Bathing', dressing: 'Dressing',
};

// Part III comorbidities (LCD "Comorbidities" list)
export const COMORBIDITIES = [
  ['copd', 'Chronic obstructive pulmonary disease'],
  ['chf', 'Congestive heart failure'],
  ['ihd', 'Ischemic heart disease'],
  ['dm', 'Diabetes mellitus'],
  ['neuro', 'Neurologic disease (CVA, ALS, MS, Parkinson\'s)'],
  ['renal', 'Renal failure'],
  ['liver', 'Liver disease'],
  ['neoplasia', 'Neoplasia'],
  ['aids', 'Acquired immune deficiency syndrome'],
  ['dementia', 'Dementia'],
];

// Part I decline-in-clinical-status items (most to least predictive, per LCD)
export const DECLINE_ITEMS = [
  ['infections', 'Recurrent or intractable infections (pneumonia, sepsis, upper UTI)'],
  ['inanition', 'Progressive inanition: unintentional weight loss, falling albumin or cholesterol, shrinking mid-arm circumference'],
  ['dysphagia', 'Dysphagia with aspiration and/or declining oral intake'],
  ['dyspnea', 'Dyspnea with increasing respiratory rate'],
  ['cough', 'Intractable cough'],
  ['nausea', 'Nausea/vomiting poorly responsive to treatment'],
  ['diarrhea', 'Intractable diarrhea'],
  ['pain', 'Pain requiring increasing doses of major analgesics'],
  ['hypotension', 'Systolic BP below 90 or progressive postural hypotension'],
  ['ascites', 'Ascites'],
  ['obstruction', 'Venous, arterial or lymphatic obstruction'],
  ['edema', 'Edema'],
  ['effusion', 'Pleural or pericardial effusion'],
  ['weakness', 'Progressive weakness'],
  ['consciousness', 'Change in level of consciousness'],
  ['labs', 'Worsening labs (rising pCO2, falling pO2/SaO2, rising Ca/Cr/LFTs, tumor markers, abnormal Na, rising K)'],
  ['ulcers', 'Progressive stage 3–4 pressure ulcers despite optimal care'],
];
