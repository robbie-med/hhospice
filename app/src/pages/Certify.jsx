import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Save, Plus, Trash2, UserPlus } from 'lucide-react';
import { CATEGORIES, GENERAL_FIELDS, categoryById } from '../data/lcd/index.js';
import { MACS, macById } from '../data/macs.js';
import { evaluate } from '../lib/eligibility.js';
import { evaluatePeriod, fmtDate, periodAt } from '../lib/periods.js';
import { composeInitial, composeRecert, composeF2F } from '../lib/narrative.js';
import { listPatients, getPatient, savePatient, newPatient, newSnapshot, sortedSnapshots } from '../store/patients.js';
import { Field, Section, CopyButton, RiskList, StatusTag } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const STEPS = ['Patient & period', 'Assessment', 'Eligibility & narrative'];

export default function Certify() {
  const [params, setParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [snapId, setSnapId] = useState(null);
  const [baselineId, setBaselineId] = useState('auto');
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState('');
  const saveTimer = useRef(null);

  // Load list + selected patient
  useEffect(() => { listPatients().then(setPatients).catch(() => setPatients([])); }, []);
  useEffect(() => {
    const id = params.get('p');
    if (!id) { if (!patient) startNew(); return; }
    if (patient?.id === id) return;
    getPatient(id).then((p) => { if (p) { setPatient(p); setSnapId(sortedSnapshots(p).at(-1)?.id || null); } else startNew(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function startNew() {
    const p = newPatient({ admissionDate: today() });
    const s = newSnapshot(today());
    p.snapshots = [s];
    setPatient(p); setSnapId(s.id); setStep(0);
    setParams({ p: p.id });
  }

  // Autosave (debounced) once the patient has a label
  useEffect(() => {
    if (!patient || !patient.label) return;
    clearTimeout(saveTimer.current);
    setSaveState('…');
    saveTimer.current = setTimeout(() => {
      savePatient(patient).then(() => { setSaveState('saved'); listPatients().then(setPatients); }).catch(() => setSaveState('not saved'));
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [patient]);

  const update = (patch) => setPatient((p) => ({ ...p, ...patch }));
  const snaps = useMemo(() => (patient ? sortedSnapshots(patient) : []), [patient]);
  const current = snaps.find((s) => s.id === snapId) || snaps.at(-1) || null;
  const priorSnaps = current ? snaps.filter((s) => s.id !== current.id && String(s.general?.date || '') <= String(current.general?.date || '')) : [];
  const baseline = baselineId === 'auto' ? priorSnaps.at(-1) || null : priorSnaps.find((s) => s.id === baselineId) || null;
  const category = categoryById(patient?.category);

  const updateSnap = (part, key, value) => setPatient((p) => ({
    ...p,
    snapshots: p.snapshots.map((s) => (s.id === current.id ? { ...s, [part]: { ...s[part], [key]: value } } : s)),
  }));
  const addSnap = () => { const s = newSnapshot(today()); setPatient((p) => ({ ...p, snapshots: [...p.snapshots, s] })); setSnapId(s.id); setStep(1); };
  const removeSnap = (id) => {
    if (!window.confirm('Delete this assessment?')) return;
    setPatient((p) => ({ ...p, snapshots: p.snapshots.filter((s) => s.id !== id) }));
    if (snapId === id) setSnapId(null);
  };

  const periodNumber = Number(patient?.periodNumber) || (patient?.admissionDate && current?.general?.date ? periodAt(patient.admissionDate, current.general.date) || 1 : 1);
  const evaluation = useMemo(() => (patient && current ? evaluate({ category, current, baseline }) : null), [patient, current, baseline, category]);
  const period = useMemo(() => (patient ? evaluatePeriod({ admissionDate: patient.admissionDate, periodNumber, f2fDate: patient.f2fDate, certSignedDate: patient.certSignedDate, today: today() }) : null), [patient, periodNumber]);

  if (!patient) return <p className="hint">Loading…</p>;

  const isRecert = periodNumber > 1;
  const f2f = { date: patient.f2fDate, clinician: patient.f2fClinician, clinicianIsNP: patient.f2fIsNP === 'yes' };
  let narrative = '', narrativeError = '';
  if (evaluation && current) {
    if (isRecert) { const r = composeRecert({ patient, category, current, baseline, evaluation, period, f2f }); narrative = r.text || ''; narrativeError = r.error || ''; }
    else narrative = composeInitial({ patient, category, current, evaluation, period });
  }
  const f2fText = evaluation && period?.f2f?.required ? composeF2F({ patient, category, current, evaluation, period, f2f }) : '';
  const allRisks = [...(period?.risks || []).map((t) => ({ level: 'risk', text: t })), ...(evaluation?.risks || [])];

  return (
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl m-0">Certification workbench</h1>
          <p className="hint m-0">Eligibility, CTI and recertification narratives, F2F attestation. Nothing leaves this browser.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select className="input-field" style={{ width: 'auto' }} value={patient.id} onChange={(e) => { if (e.target.value === '__new') startNew(); else setParams({ p: e.target.value }); }}>
            <option value={patient.id}>{patient.label || '(unsaved patient)'}</option>
            {patients.filter((p) => p.id !== patient.id).map((p) => <option key={p.id} value={p.id}>{p.label} — {categoryById(p.category).label}</option>)}
            <option value="__new">+ New patient</option>
          </select>
          <button className="btn-secondary" onClick={startNew} title="New patient"><UserPlus size={16} /> New</button>
          <span className="text-text-muted text-xs hidden sm:flex items-center gap-1"><Save size={14} /> {patient.label ? saveState || 'saved' : 'unsaved'}</span>
        </div>
      </div>

      <div className="wb-steps">
        {STEPS.map((s, i) => <button key={s} className={i === step ? 'active' : i < step ? 'done' : ''} onClick={() => setStep(i)}>{i + 1}. {s}</button>)}
      </div>

      {step === 0 && (
        <>
          <Section title="Patient">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field field={{ id: 'label', label: 'Pseudonymous label', type: 'text', required: true, hint: 'Initials + number, never a name or DOB.' }} value={patient.label} onChange={(v) => update({ label: v })} />
              <Field field={{ id: 'age', label: 'Age', type: 'number', step: 1 }} value={patient.age} onChange={(v) => update({ age: v })} />
              <Field field={{ id: 'sex', label: 'Sex', type: 'radio', options: [['female', 'Female'], ['male', 'Male'], ['other', 'Other / unspecified']] }} value={patient.sex} onChange={(v) => update({ sex: v })} />
              <Field field={{ id: 'mac', label: 'Medicare contractor (MAC)', type: 'select', options: MACS.map((m) => [m.id, `${m.name} — ${m.lcd}`]) }} value={patient.mac} onChange={(v) => update({ mac: v })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Field field={{ id: 'category', label: 'LCD disease guideline', type: 'select', required: true, options: CATEGORIES.map((c) => [c.id, c.label]) }} value={patient.category} onChange={(v) => update({ category: v })} />
              <Field field={{ id: 'dxText', label: 'Principal diagnosis as it will appear on the certification', type: 'text', hint: 'e.g., "Alzheimer\'s disease, late onset (G30.1)"' }} value={patient.dxText} onChange={(v) => update({ dxText: v })} />
            </div>
            <p className="hint mt-3 mb-0"><strong>{category.lcdSection}:</strong> {category.appliesTo}</p>
            {macById(patient.mac).notes.map((n, i) => <p key={i} className="hint mb-0 mt-1">{n}</p>)}
          </Section>

          <Section title="Benefit period and certification">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Field field={{ id: 'admissionDate', label: 'Hospice election (admission) date', type: 'date', required: true }} value={patient.admissionDate} onChange={(v) => update({ admissionDate: v })} />
              <Field field={{ id: 'periodNumber', label: 'Benefit period being certified', type: 'select', options: [['', 'Auto from assessment date'], ...Array.from({ length: 12 }, (_, i) => [String(i + 1), `Period ${i + 1}${i < 2 ? ' (90 days)' : ' (60 days)'}`])] }} value={patient.periodNumber || ''} onChange={(v) => update({ periodNumber: v })} />
              <Field field={{ id: 'certSignedDate', label: 'Certification signature date', type: 'date' }} value={patient.certSignedDate} onChange={(v) => update({ certSignedDate: v })} />
              <Field field={{ id: 'hospicePhysician', label: 'Certifying hospice physician', type: 'text' }} value={patient.hospicePhysician} onChange={(v) => update({ hospicePhysician: v })} />
            </div>
            {period?.period && (
              <p className="text-sm mt-3 mb-0">
                Period <strong>{period.period.n}</strong>: {fmtDate(period.period.start)} to {fmtDate(period.period.end)} ({period.period.length} days).
                {period.f2f?.required ? <> Face-to-face required between <strong>{fmtDate(period.f2f.window.from)}</strong> and <strong>{fmtDate(period.f2f.window.to)}</strong>.</> : ' No face-to-face encounter required for this period.'}
              </p>
            )}
            {period?.f2f?.required && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                <Field field={{ id: 'f2fDate', label: 'Face-to-face encounter date', type: 'date', required: true }} value={patient.f2fDate} onChange={(v) => update({ f2fDate: v })} />
                <Field field={{ id: 'f2fClinician', label: 'Performed by', type: 'text' }} value={patient.f2fClinician} onChange={(v) => update({ f2fClinician: v })} />
                <Field field={{ id: 'f2fIsNP', label: 'Performed by a nurse practitioner', type: 'bool' }} value={patient.f2fIsNP} onChange={(v) => update({ f2fIsNP: v })} />
                <Field field={{ id: 'attendingName', label: 'Attending physician (initial cert only)', type: 'text' }} value={patient.attendingName} onChange={(v) => update({ attendingName: v })} />
              </div>
            )}
            {!period?.f2f?.required && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <Field field={{ id: 'attendingName', label: 'Attending physician (co-signs the initial certification)', type: 'text' }} value={patient.attendingName} onChange={(v) => update({ attendingName: v })} />
              </div>
            )}
            {period?.risks?.length ? <div className="mt-3"><RiskList risks={period.risks.map((t) => ({ level: 'risk', text: t }))} /></div> : null}
          </Section>
          <div className="flex justify-end"><button className="btn-primary" onClick={() => setStep(1)}>Next: assessment →</button></div>
        </>
      )}

      {step === 1 && current && (
        <>
          <Section title="Assessments" right={<button className="btn-secondary" onClick={addSnap}><Plus size={16} /> New assessment</button>}>
            <p className="hint">Each dated assessment is a snapshot. The narrative compares the current one with the prior one to show decline; keep adding one per visit or per benefit period.</p>
            <div className="flex flex-wrap gap-2">
              {snaps.map((s) => (
                <span key={s.id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${s.id === current.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                  <button className="bg-transparent border-0 cursor-pointer" onClick={() => setSnapId(s.id)}>{s.general?.date || '(no date)'}{s.general?.pps ? ` · PPS ${s.general.pps}` : ''}</button>
                  {snaps.length > 1 && <button className="bg-transparent border-0 cursor-pointer text-danger" title="Delete" onClick={() => removeSnap(s.id)}><Trash2 size={14} /></button>}
                </span>
              ))}
            </div>
          </Section>

          <Section title={`General decline and function — ${current.general?.date || ''}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GENERAL_FIELDS.filter((f) => !['decline', 'comorbidities', 'comorbidityDetail', 'findings', 'adls'].includes(f.id)).map((f) => (
                <Field key={f.id} field={f} value={current.general?.[f.id]} onChange={(v) => updateSnap('general', f.id, v)} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <Field field={GENERAL_FIELDS.find((f) => f.id === 'adls')} value={current.general?.adls} onChange={(v) => updateSnap('general', 'adls', v)} />
              <Field field={GENERAL_FIELDS.find((f) => f.id === 'decline')} value={current.general?.decline} onChange={(v) => updateSnap('general', 'decline', v)} />
            </div>
          </Section>

          <Section title={`${category.label} — ${category.lcdSection}`}>
            <p className="hint">{category.appliesTo}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.fields.map((f) => <Field key={f.id} field={f} value={current.dx?.[f.id]} onChange={(v) => updateSnap('dx', f.id, v)} />)}
            </div>
            {category.notes?.map((n, i) => <p key={i} className="hint mt-3 mb-0">{n}</p>)}
          </Section>

          <Section title="Comorbidities and patient-specific findings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field field={GENERAL_FIELDS.find((f) => f.id === 'comorbidities')} value={current.general?.comorbidities} onChange={(v) => updateSnap('general', 'comorbidities', v)} />
              <div>
                <Field field={GENERAL_FIELDS.find((f) => f.id === 'comorbidityDetail')} value={current.general?.comorbidityDetail} onChange={(v) => updateSnap('general', 'comorbidityDetail', v)} />
                <div className="mt-3"><Field field={GENERAL_FIELDS.find((f) => f.id === 'findings')} value={current.general?.findings} onChange={(v) => updateSnap('general', 'findings', v)} /></div>
              </div>
            </div>
          </Section>
          <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(0)}>← Patient</button><button className="btn-primary" onClick={() => setStep(2)}>Next: eligibility & narrative →</button></div>
        </>
      )}

      {step === 2 && evaluation && current && (
        <>
          <Section title="Eligibility against the LCD">
            <div className={`verdict ${evaluation.overall}`}>
              {{ meets: 'Documentation supports the LCD guideline', partial: 'Partially supported — see risks', no: 'LCD guideline not supported by the data entered' }[evaluation.overall]}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm uppercase text-text-muted mb-2">{category.label} ({category.lcdSection})</h3>
                <ul className="list-none p-0 m-0 text-sm">
                  {evaluation.disease.required.map((r) => <li key={r.id} className="mb-1"><StatusTag status={r.status} />{r.label}{r.group ? <span className="text-xs text-text-muted"> (any one pathway)</span> : null}</li>)}
                  {evaluation.disease.supporting.map((r) => <li key={r.id} className="mb-1"><StatusTag status={r.status === 'met' ? 'sup' : r.status} />{r.label}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm uppercase text-text-muted mb-2">Part II baseline and Part I decline</h3>
                <ul className="list-none p-0 m-0 text-sm">
                  <li className="mb-1"><StatusTag status={evaluation.partII.fnMet === true ? 'met' : evaluation.partII.fnMet === false ? 'unmet' : 'na'} />{evaluation.partII.scale || 'PPS/KPS'} below 70% {evaluation.partII.score != null ? `(${evaluation.partII.score}%)` : ''}</li>
                  <li className="mb-1"><StatusTag status={evaluation.partII.adlMet === true ? 'met' : evaluation.partII.adlMet === false ? 'unmet' : 'na'} />Dependence in 2+ ADLs ({evaluation.partII.adls.length} of 6)</li>
                  <li className="mb-1"><StatusTag status={evaluation.partI.count ? 'met' : 'unmet'} />Decline documented ({evaluation.partI.items.length} indicators, {evaluation.partI.worsening.length} worsening measures)</li>
                  <li className="mb-1"><StatusTag status={evaluation.partIII.comorbidities.length ? 'sup' : 'na'} />Comorbidities ({evaluation.partIII.comorbidities.length})</li>
                </ul>
                {evaluation.trajectory.length > 0 && (
                  <table className="text-xs mt-3 w-full border-collapse">
                    <thead><tr className="text-left text-text-muted"><th className="py-1">Measure</th><th>{fmtDate(baseline?.general?.date)}</th><th>{fmtDate(current.general?.date)}</th><th></th></tr></thead>
                    <tbody>{evaluation.trajectory.map((t) => <tr key={t.id} className="border-t border-gray-200"><td className="py-1">{t.label}</td><td>{t.baseline.text}</td><td>{t.current.text}</td><td className={t.worse ? 'text-danger' : t.same ? 'text-text-muted' : 'text-success'}>{t.worse ? 'worse' : t.same ? 'same' : 'better'}</td></tr>)}</tbody>
                  </table>
                )}
                {priorSnaps.length > 1 && (
                  <div className="wb-field mt-2"><label>Compare against</label>
                    <select value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                      <option value="auto">Most recent prior assessment</option>
                      {priorSnaps.map((s) => <option key={s.id} value={s.id}>{s.general?.date}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Documentation risks">
            <RiskList risks={allRisks} />
          </Section>

          <Section title={isRecert ? `Recertification narrative — period ${periodNumber}` : 'Certification of terminal illness — narrative'} right={narrative ? <CopyButton text={narrative} label="Copy narrative" /> : null}>
            {narrativeError ? <div className="risk">{narrativeError}</div> : (
              <>
                <p className="hint">Composed only from what you entered. Edit freely before signing; the text is yours, not a template.</p>
                <textarea className="narrative input-field w-full" value={narrative} readOnly rows={18} />
              </>
            )}
          </Section>

          {period?.f2f?.required && (
            <Section title="Face-to-face attestation" right={<CopyButton text={f2fText} label="Copy attestation" />}>
              <textarea className="narrative input-field w-full" value={f2fText} readOnly rows={12} />
            </Section>
          )}
          <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(1)}>← Assessment</button><Link className="btn-secondary no-underline" to="/patients">Patients & export</Link></div>
        </>
      )}
    </div>
  );
}
