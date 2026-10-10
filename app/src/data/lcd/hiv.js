import { num, has, joinAnd } from './_helpers.js';

const CONDITIONS = [
  ['cns_lymphoma', 'CNS lymphoma'],
  ['wasting', 'Untreated, or persistent despite treatment, wasting (loss of at least 10% lean body mass)'],
  ['mac', 'Mycobacterium avium complex bacteremia, untreated, unresponsive or refused'],
  ['pml', 'Progressive multifocal leukoencephalopathy'],
  ['lymphoma', 'Systemic lymphoma with advanced HIV disease and partial response to chemotherapy'],
  ['ks', 'Visceral Kaposi\'s sarcoma unresponsive to therapy'],
  ['renal', 'Renal failure in the absence of dialysis'],
  ['crypto', 'Cryptosporidium infection'],
  ['toxo', 'Toxoplasmosis, unresponsive to therapy'],
];
const SUPPORT = [
  ['diarrhea', 'Chronic persistent diarrhea for one year'],
  ['albumin', 'Persistent serum albumin below 2.5 g/dL'],
  ['substance', 'Concomitant active substance abuse'],
  ['age50', 'Age over 50'],
  ['noart', 'Absence of, or resistance to, effective antiretroviral, chemotherapeutic and prophylactic therapy'],
  ['adc', 'Advanced AIDS dementia complex'],
  ['toxo', 'Toxoplasmosis'],
  ['chf', 'Congestive heart failure, symptomatic at rest'],
  ['liver', 'Advanced liver disease'],
];

export default {
  id: 'hiv',
  label: 'HIV disease',
  phrase: 'advanced HIV disease',
  lcdSection: 'Disease-specific II.D',
  appliesTo: 'Advanced HIV/AIDS.',
  fields: [
    { id: 'cd4', label: 'CD4+ count', type: 'number', unit: 'cells/µL', step: 1 },
    { id: 'viralLoad', label: 'Persistent HIV RNA viral load', type: 'number', unit: 'copies/mL', step: 1 },
    { id: 'conditions', label: 'Qualifying conditions (one or more)', type: 'checks', options: CONDITIONS },
    { id: 'support', label: 'Supporting factors', type: 'checks', options: SUPPORT },
  ],
  rules: [
    {
      id: 'labs', kind: 'required', label: 'CD4+ below 25 cells/µL or persistent viral load above 100,000 copies/mL',
      test: (d) => {
        const cd4 = num(d.cd4), vl = num(d.viralLoad);
        if (cd4 == null && vl == null) return null;
        return (cd4 != null && cd4 < 25) || (vl != null && vl > 100000);
      },
      text: (d) => joinAnd([num(d.cd4) != null ? `CD4+ count ${d.cd4} cells/µL` : null, num(d.viralLoad) != null ? `persistent viral load ${Number(d.viralLoad).toLocaleString()} copies/mL` : null]),
    },
    {
      id: 'condition', kind: 'required', label: 'At least one qualifying opportunistic condition or complication',
      test: (d) => (d.conditions ? d.conditions.length > 0 : null),
      text: (d) => joinAnd(CONDITIONS.filter(([k]) => has(d.conditions, k)).map(([, l]) => l.toLowerCase())),
    },
    {
      id: 'kps50', kind: 'required', label: 'KPS (or PPS) 50% or less',
      test: (d, g) => { const k = num(g.kps) ?? num(g.pps); return k == null ? null : k <= 50; },
      text: (d, g) => `functional status ${num(g.kps) != null ? `KPS ${g.kps}%` : `PPS ${g.pps}%`}`,
    },
    {
      id: 'support', kind: 'supporting', label: 'Supporting factors',
      test: (d) => (d.support ? d.support.length > 0 : null),
      text: (d) => joinAnd(SUPPORT.filter(([k]) => has(d.support, k)).map(([, l]) => l.toLowerCase())),
    },
  ],
};
