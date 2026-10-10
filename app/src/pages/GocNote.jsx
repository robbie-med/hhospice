import { useEffect, useMemo, useState } from 'react';
import { Field, Section, CopyButton } from '../components/ui.jsx';
import { listPatients, getPatient, savePatient } from '../store/patients.js';
import { fmtDate } from '../lib/periods.js';

// "Template plus": every prompt the evidence says gets omitted (prognosis, understanding, decision
// alignment, time-limited trial, capacity) is a field, and every field is free text.
const FIELDS = [
  { id: 'date', label: 'Date of conversation', type: 'date', required: true },
  { id: 'setting', label: 'Setting', type: 'radio', options: [['inpatient', 'Inpatient'], ['clinic', 'Clinic'], ['home', 'Home / facility'], ['phone', 'Phone / video']] },
  { id: 'present', label: 'Who was present (roles, not names)', type: 'text', hint: 'e.g., patient, daughter (HCPOA), bedside RN, palliative NP' },
  { id: 'capacity', label: 'Decision-making capacity', type: 'radio', options: [['yes', 'Patient has capacity for these decisions'], ['partial', 'Capacity limited; patient participated, surrogate confirmed'], ['no', 'Patient lacks capacity; surrogate decision-maker']] },
  { id: 'surrogate', label: 'Surrogate / HCPOA and basis (document on file?)', type: 'text' },
  { id: 'illness', label: 'Illness understanding (patient/family, in their words)', type: 'textarea', required: true },
  { id: 'prognosisShared', label: 'Prognosis communicated and how it was framed', type: 'textarea', required: true, hint: 'e.g., "weeks to short months"; "hoping for the best, preparing for the worst"; whether they wanted to hear it.' },
  { id: 'values', label: 'What matters most / goals', type: 'textarea', required: true },
  { id: 'fears', label: 'Fears, worries, trade-offs they would not accept', type: 'textarea' },
  { id: 'decisions', label: 'Decisions made', type: 'textarea', required: true },
  { id: 'alignment', label: 'How the decisions align with the stated goals', type: 'textarea', required: true, hint: 'One or two sentences linking plan to values. This is what later clinicians (and auditors) look for and rarely find.' },
  { id: 'tltIntervention', label: 'Time-limited trial: intervention', type: 'text', hint: 'Leave blank if none.' },
  { id: 'tltEndpoint', label: 'Time-limited trial: what success and failure look like', type: 'text' },
  { id: 'tltReview', label: 'Time-limited trial: review date', type: 'date' },
  { id: 'code', label: 'Code status', type: 'radio', options: [['full', 'Full code'], ['dnr', 'DNR'], ['dnr_dni', 'DNR/DNI'], ['comfort', 'Comfort-focused care'], ['undecided', 'Not decided today']] },
  { id: 'documents', label: 'Documents completed / to complete (POLST, advance directive, HCPOA)', type: 'text' },
  { id: 'followup', label: 'Next conversation: when and what to revisit', type: 'text' },
  { id: 'author', label: 'Author (role)', type: 'text' },
];

function wrap(text, width) {
  const words = String(text || '').split(/\s+/);
  const lines = []; let line = '';
  for (const w of words) { if ((line + ' ' + w).trim().length > width) { lines.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) lines.push(line);
  return lines;
}
function box(title, rows, width = 72) {
  const bar = '+' + '-'.repeat(width - 2) + '+';
  const pad = (s) => '| ' + s.padEnd(width - 4) + ' |';
  const out = [bar, pad(title.toUpperCase()), bar];
  for (const [k, v] of rows) {
    if (!v) continue;
    const lines = wrap(v, width - 6 - k.length - 2);
    out.push(pad(`${k}: ${lines[0] || ''}`));
    for (const l of lines.slice(1)) out.push(pad(' '.repeat(k.length + 2) + l));
  }
  out.push(bar);
  return out.join('\n');
}

export function composeGoc(d) {
  const cap = { yes: 'Patient has decision-making capacity for these decisions', partial: 'Capacity limited; patient participated and surrogate confirmed', no: 'Patient lacks capacity; decisions made by surrogate' }[d.capacity] || '';
  const code = { full: 'Full code', dnr: 'DNR', dnr_dni: 'DNR/DNI', comfort: 'Comfort-focused care', undecided: 'Not decided today; revisit' }[d.code] || '';
  const tlt = d.tltIntervention ? `${d.tltIntervention}. Success/failure: ${d.tltEndpoint || '[define]'}. Review ${d.tltReview ? fmtDate(d.tltReview) : '[date]'}.` : '';
  const header = box('Goals of care conversation', [
    ['Date', d.date ? fmtDate(d.date) : ''], ['Setting', { inpatient: 'Inpatient', clinic: 'Clinic', home: 'Home / facility', phone: 'Phone / video' }[d.setting] || ''],
    ['Present', d.present], ['Capacity', cap], ['Surrogate', d.surrogate],
  ]);
  const body = box('Conversation', [
    ['Understanding', d.illness], ['Prognosis', d.prognosisShared], ['What matters', d.values], ['Worries', d.fears],
  ]);
  const plan = box('Decisions and plan', [
    ['Decisions', d.decisions], ['Alignment', d.alignment], ['Time-limited trial', tlt], ['Code status', code], ['Documents', d.documents], ['Follow-up', d.followup],
  ]);
  return [header, body, plan, d.author ? `\n${d.author}` : ''].filter(Boolean).join('\n');
}

export default function GocNote() {
  const [d, setD] = useState({ date: new Date().toISOString().slice(0, 10) });
  const [patients, setPatients] = useState([]);
  const [attachTo, setAttachTo] = useState('');
  const [saved, setSaved] = useState('');
  useEffect(() => { listPatients().then(setPatients).catch(() => {}); }, []);
  const note = useMemo(() => composeGoc(d), [d]);
  const missing = FIELDS.filter((f) => f.required && !d[f.id]).map((f) => f.label);

  const attach = async () => {
    const p = await getPatient(attachTo);
    if (!p) return;
    p.gocNotes = [...(p.gocNotes || []), { id: `${Date.now()}`, date: d.date, data: d, text: note }];
    await savePatient(p); setSaved(`Saved to ${p.label}.`);
  };

  return (
    <div className="py-4">
      <h1 className="text-2xl m-0">Goals-of-care note</h1>
      <p className="hint">Template-plus: prompts for the things that get left out (prognosis, understanding, alignment, time-limited trials, capacity), all free text. Copy the block into the EMR.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Section title="Conversation">
            <div className="grid grid-cols-1 gap-3">
              {FIELDS.map((f) => <Field key={f.id} field={f} value={d[f.id]} onChange={(v) => setD((x) => ({ ...x, [f.id]: v }))} />)}
            </div>
          </Section>
        </div>
        <div>
          <Section title="Note" right={<CopyButton text={note} label="Copy note" />}>
            {missing.length ? <p className="risk warn text-sm">Still empty: {missing.join('; ')}.</p> : null}
            <pre className="note">{note}</pre>
            {patients.length > 0 && (
              <div className="flex items-end gap-2 mt-3">
                <div className="wb-field flex-grow"><label>Attach to a stored patient (optional)</label>
                  <select value={attachTo} onChange={(e) => setAttachTo(e.target.value)}><option value="">—</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
                </div>
                <button className="btn-secondary" disabled={!attachTo} onClick={attach}>Save</button>
              </div>
            )}
            {saved && <p className="text-sm mt-2">{saved}</p>}
          </Section>
        </div>
      </div>
    </div>
  );
}
