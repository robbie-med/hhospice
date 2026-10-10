// Medicare Administrative Contractors and their hospice "Determining Terminal Status" LCDs.
// The disease criteria are materially identical across MACs (all derive from the 1996 NHPCO
// guidelines). Differences that matter for documentation are listed per MAC so the narrative
// can cite the right LCD and the reviewer can see what to verify.
export const MACS = [
  {
    id: 'cgs', name: 'CGS Administrators', lcd: 'L34538',
    title: 'Hospice - Determining Terminal Status', revision: 'rev. effective 2025-08-07',
    states: 'KY, OH; HHH Jurisdiction 15',
    notes: ['Parts I–III + disease appendices. Lab values "not required" wording for Part I.'],
  },
  {
    id: 'ngs', name: 'National Government Services', lcd: 'L33393',
    title: 'Hospice Determining Terminal Status', revision: 'last revised 2019-11-14',
    states: 'CT, IL, MA, ME, MN, NH, NY, RI, VT, WI; HHH Jurisdiction 6 and K',
    notes: ['Same structure as CGS. Verify current revision on the Medicare Coverage Database before citing.'],
  },
  {
    id: 'palmetto', name: 'Palmetto GBA', lcd: 'L34558',
    title: 'Hospice - Determining Terminal Status', revision: 'see MCD for current revision',
    states: 'AL, AR, FL, GA, IL (part), IN, LA, MS, NC, NM, OH (part), OK, SC, TN, TX, VA, WV; HHH Jurisdiction M and J',
    notes: [
      'Palmetto also publishes separate disease LCDs (e.g., L34548 Cardiopulmonary Conditions, L34566 Neurological Conditions, L34567 Alzheimer\'s/Related Disorders, L34559 HIV, L34570 Liver Disease, L34571 Renal Disease, L34560 Cancer Diagnoses). Cite the disease LCD in addition to L34558.',
    ],
  },
  {
    id: 'other', name: 'Other / unsure', lcd: '(verify)',
    title: 'Hospice - Determining Terminal Status', revision: '',
    states: '',
    notes: ['Criteria below follow the CGS/NGS text. Confirm your MAC\'s LCD number before signing.'],
  },
];
export const macById = (id) => MACS.find((m) => m.id === id) || MACS[MACS.length - 1];
