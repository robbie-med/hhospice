import { yes, has } from './_helpers.js';

export default {
  id: 'cancer',
  label: 'Cancer',
  phrase: 'cancer',
  lcdSection: 'Disease-specific I',
  appliesTo: 'Any malignancy. Metastatic disease at presentation, or progression to metastatic disease with decline despite therapy or a decision to forgo therapy. Small cell lung, brain and pancreatic cancers may qualify without meeting these.',
  fields: [
    { id: 'site', label: 'Primary site and histology', type: 'text', required: true },
    { id: 'stage', label: 'Disease extent', type: 'radio', required: true, options: [
      ['metastatic_presentation', 'Distant metastases at presentation'],
      ['progressed', 'Progressed from an earlier stage to metastatic disease'],
      ['locally_advanced', 'Locally advanced / not metastatic'],
    ] },
    { id: 'course', label: 'Course since metastatic diagnosis', type: 'checks', options: [
      ['decline_despite', 'Continued decline despite disease-directed therapy'],
      ['declines_therapy', 'Patient declines further disease-directed therapy'],
      ['no_further_options', 'Oncology has no further disease-directed options to offer'],
    ] },
    { id: 'exception', label: 'Histology with poor prognosis regardless of stage', type: 'radio', options: [
      ['none', 'None of these'], ['sclc', 'Small cell lung cancer'], ['brain', 'Primary brain tumor'], ['pancreas', 'Pancreatic cancer'],
    ] },
    { id: 'sites', label: 'Sites of metastasis / complications', type: 'text', hint: 'e.g., liver, bone, malignant pleural effusion, hypercalcemia' },
  ],
  rules: [
    {
      id: 'extent', kind: 'required', group: 'path', label: 'Metastatic at presentation, or progression to metastatic disease with decline despite therapy or therapy declined',
      test: (d) => {
        if (!d.stage) return null;
        if (d.stage === 'metastatic_presentation') return true;
        if (d.stage === 'progressed') return (d.course || []).length > 0 ? true : false;
        return false;
      },
      text: (d) => {
        const c = [];
        if (has(d.course, 'decline_despite')) c.push('continued clinical decline despite disease-directed therapy');
        if (has(d.course, 'declines_therapy')) c.push('the patient has declined further disease-directed therapy');
        if (has(d.course, 'no_further_options')) c.push('oncology has no further disease-directed options');
        const base = d.stage === 'metastatic_presentation'
          ? `${d.site} with distant metastases at presentation`
          : `${d.site} which has progressed to metastatic disease`;
        return base + (d.sites ? ` (${d.sites})` : '') + (c.length ? `, with ${c.join(' and ')}` : '');
      },
    },
    {
      id: 'exception', kind: 'required', group: 'path', label: 'Small cell lung, brain or pancreatic cancer (eligible without meeting the metastasis criterion)',
      test: (d) => (d.exception == null || d.exception === '' ? null : d.exception !== 'none'),
      text: (d) => ({ sclc: 'small cell lung cancer', brain: 'a primary brain tumor', pancreas: 'pancreatic cancer' }[d.exception]) + ', a histology the LCD recognizes as hospice-eligible irrespective of the metastasis criterion',
    },
  ],
  notes: ['The LCD applies the Part II functional baseline (PPS/KPS below 70%, two or more ADL dependencies) to cancer as well; document it.'],
};
