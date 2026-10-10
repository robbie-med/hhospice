import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Save, Plus, Trash2, UserPlus, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { CATEGORIES, GENERAL_FIELDS, categoryById } from '../data/lcd/index.js';
import { MACS, macById } from '../data/macs.js';
import { evaluate, syntheticBaseline } from '../lib/eligibility.js';
import { evaluatePeriod, fmtDate, periodAt } from '../lib/periods.js';
import { composeInitial, composeRecert, composeF2F } from '../lib/narrative.js';
import { listPatients, getPatient, savePatient, newPatient, newSnapshot, sortedSnapshots } from '../store/patients.js';
import { Field, Section, CopyButton, RiskList, StatusTag, Stepper, Tip, TipsToggle } from '../components/ui.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const STEPS = ['Patient and period', 'Assessment', 'Eligibility and narrative'];
const SCENARIOS = ['initial', 'recert', 'f2f', 'acute'];
const gf = (id) => GENERAL_FIELDS.find((f) => f.id === id);
const ONSET_IDS = ['onset', 'eventDate', 'eventDesc', 'preEventPps', 'preEventDesc'];
const GRID_EXCLUDE = new Set(['date', 'decline', 'comorbidities', 'comorbidityDetail', 'findings', 'adls', ...ONSET_IDS]);

/* Scenario-specific guidance. Short, factual, and hideable. */
function ScenarioTip({ scenario, step, category, onset, periodNumber }) {
  const acute = scenario === 'acute' || onset === 'acute';
  if (step === 0) {
    if (scenario === 'recert') return <Tip><p><strong>Recertification.</strong> Enter the original election date, not today; the period and face-to-face window are computed from it. The narrative must describe change since the last period, so step 2 needs the previous assessment as well as this one. From period 3 a face-to-face encounter is required in the 30 days before the period starts.</p></Tip>;
    if (scenario === 'f2f') return <Tip><p><strong>Face-to-face encounter.</strong> Required for period 3 and every period after, performed by a hospice physician or hospice nurse practitioner within 30 days before the period starts. Enter the encounter date below; put the findings in step 2 and the attestation is drafted in step 3. Choose the period being certified if the automatic one is wrong.</p></Tip>;
    if (acute) return <Tip><p><strong>Sudden catastrophic event.</strong> Choose the guideline that fits the event (stroke and coma for a large stroke, anoxic injury or coma; otherwise the disease, or the non-disease-specific pathway). The election date is the hospice admission, which may be days after the event. Step 2 asks for function before the event.</p></Tip>;
    return <Tip><p><strong>Initial certification.</strong> Both the hospice physician and the attending (if there is one) certify the first period. The narrative is the hospice physician's own synthesis of the findings; the attestation line is added for you. Signature may be up to 15 days before the period starts, or a verbal certification within 2 days of election.</p></Tip>;
  }
  if (step === 1) {
    if (acute) return (
      <Tip accent>
        <p><strong>A sudden event has no months-long decline curve, and reviewers know that.</strong> They look for three things: function before the event, the event itself with imaging or exam findings, and current function with intake. Record all three here; the narrative then dates the drop from the event.</p>
        {category?.id === 'stroke' ? <p>The stroke and coma guideline is met with PPS or KPS 40% or below plus inability to maintain hydration and calories, or with the coma findings on day 3. Imaging findings support it.</p> : null}
      </Tip>
    );
    if (scenario === 'recert' || Number(periodNumber) > 1) return <Tip><p>Add the previous period's findings as a dated assessment if they are not here yet, then enter today's. The narrative compares the two. Record at least one measure in both (PPS, weight, albumin, ADLs, FAST…).</p></Tip>;
    return <Tip><p>Each dated assessment is a snapshot. Enter numbers where you have them; the narrative uses only what you enter, and <em>Other patient-specific findings</em> is what keeps it from reading as a template.</p></Tip>;
  }
  return <Tip><p><strong>NO DATA</strong> means the field is empty, not that the criterion failed. Risks are the patterns reviewers deny on. The narrative is composed from your entries and phrased differently for each patient; read it, edit it, then sign it.</p></Tip>;
}

const VERDICT = {
  meets: ['Documentation supports the LCD guideline', CheckCircle2],
  partial: ['Partially supported. See the risks below', AlertTriangle],
  no: ['LCD guideline not supported by the data entered', XCircle],
};

export default function Certify() {
  const [params, setParams] = useSearchParams();
  const [patients, setPatients] = useState([]);
  const [patient, setPatient] = useState(null);
  const [snapId, setSnapId] = useState(null);
  const [baselineId, setBaselineId] = useState('auto');
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState('');
  const saveTimer = useRef(null);
  const start = SCENARIOS.includes(params.get('start')) ? params.get('start') : null;

  useEffect(() => { listPatients().then(setPatients).catch(() => setPatients([])); }, []);
  useEffect(() => {
    const id = params.get('p');
    if (!id) { if (!patient) startNew(start); return; }
    if (patient?.id === id) return;
    getPatient(id).then((p) => { if (p) { setPatient(p); setSnapId(sortedSnapshots(p).at(-1)?.id || null); setStep(0); } else startNew(start); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function startNew(scenario) {
    const p = newPatient({ admissionDate: scenario === 'recert' ? '' : today(), scenario: scenario || 'initial' });
    if (scenario === 'acute') p.category = 'stroke';
    const s = newSnapshot(today());
    if (scenario === 'acute') s.general.onset = 'acute';
    p.snapshots = [s];
    setPatient(p); setSnapId(s.id); setStep(0);
    setParams(scenario ? { p: p.id, start: scenario } : { p: p.id });
  }

  useEffect(() => {
    if (!patient || !patient.label) return;
    clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveTimer.current = setTimeout(() => {
      savePatient(patient).then(() => { setSaveState('saved'); listPatients().then(setPatients); }).catch(() => setSaveState('not saved'));
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [patient]);

  const update = (patch) => setPatient((p) => ({ ...p, ...patch }));
  const snaps = useMemo(() => (patient ? sortedSnapshots(patient) : []), [patient]);
  const current = snaps.find((s) => s.id === snapId) || snaps.at(-1) || null;
  const priorSnaps = current ? snaps.filter((s) => s.id !== current.id && String(s.general?.date || '') <= String(current.general?.date || '')) : [];
  const priorBaseline = baselineId === 'auto' ? priorSnaps.at(-1) || null : priorSnaps.find((s) => s.id === baselineId) || null;
  const baseline = priorBaseline || (current ? syntheticBaseline(current) : null);
  const category = categoryById(patient?.category);
  const scenario = patient?.scenario || start || 'initial';
  const onset = current?.general?.onset;

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
  const [verdictText, VerdictIcon] = VERDICT[evaluation?.overall] || VERDICT.partial;
  const baselineLabel = evaluation?.baselineKind === 'pre-event' ? 'Before event' : fmtDate(baseline?.general?.date);

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="eyebrow">{{ initial: 'Initial certification', recert: 'Recertification', f2f: 'Face-to-face attestation', acute: 'Sudden catastrophic event' }[scenario]}</div>
          <h1>{patient.label ? patient.label : 'New patient'}{patient.label ? <span className="text-muted font-normal"> · {category.label}</span> : null}</h1>
          <p className="lede">Eligibility against the LCD, certification and recertification narratives, face-to-face attestation.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="input-field" style={{ width: 'auto', minWidth: '12rem' }} value={patient.id} onChange={(e) => { if (e.target.value === '__new') startNew(null); else setParams({ p: e.target.value }); }} aria-label="Switch patient">
            <option value={patient.id}>{patient.label || '(unsaved patient)'}</option>
            {patients.filter((p) => p.id !== patient.id).map((p) => <option key={p.id} value={p.id}>{p.label} · {categoryById(p.category).label}</option>)}
            <option value="__new">+ New patient</option>
          </select>
          <button className="btn-secondary" onClick={() => startNew(null)} title="New patient"><UserPlus size={15} /> New</button>
          <span className="text-muted text-xs inline-flex items-center gap-1" style={{ minWidth: '4.5rem' }}><Save size={13} /> {patient.label ? ({ saving: 'Saving…', saved: 'Saved', 'not saved': 'Not saved' }[saveState] || 'Saved') : 'Unsaved'}</span>
          <TipsToggle />
        </div>
      </div>

      <Stepper steps={STEPS} step={step} onChange={setStep} />
      <ScenarioTip scenario={scenario} step={step} category={category} onset={onset} periodNumber={periodNumber} />

      {step === 0 && (
        <>
          <Section title="Patient" sub="Pseudonymous. Never a name or date of birth.">
            <div className="form-grid" style={{ '--cols': 4 }}>
              <Field field={{ id: 'label', label: 'Label', type: 'text', required: true, placeholder: 'e.g., JD-07', hint: 'Initials plus a number is enough.' }} value={patient.label} onChange={(v) => update({ label: v })} />
              <Field field={{ id: 'age', label: 'Age', type: 'number', step: 1 }} value={patient.age} onChange={(v) => update({ age: v })} />
              <Field field={{ id: 'sex', label: 'Sex', type: 'radio', options: [['female', 'Female'], ['male', 'Male'], ['other', 'Other']] }} value={patient.sex} onChange={(v) => update({ sex: v })} />
              <Field field={{ id: 'mac', label: 'Medicare contractor (MAC)', type: 'select', options: MACS.map((m) => [m.id, `${m.name} · ${m.lcd}`]) }} value={patient.mac} onChange={(v) => update({ mac: v })} />
            </div>
            <div className="form-grid mt-3" style={{ '--cols': 2 }}>
              <Field field={{ id: 'category', label: 'LCD disease guideline', type: 'select', required: true, options: CATEGORIES.map((c) => [c.id, c.label]) }} value={patient.category} onChange={(v) => update({ category: v })} />
              <Field field={{ id: 'dxText', label: 'Principal diagnosis as it will appear on the certification', type: 'text', placeholder: 'e.g., Alzheimer’s disease, late onset (G30.1)' }} value={patient.dxText} onChange={(v) => update({ dxText: v })} />
            </div>
            <p className="hint mt-3 mb-0"><strong>{category.lcdSection}.</strong> {category.appliesTo}</p>
            {macById(patient.mac).notes.map((n, i) => <p key={i} className="hint mb-0 mt-1">{n}</p>)}
          </Section>

          <Section title="Benefit period and certification">
            <div className="form-grid" style={{ '--cols': 4 }}>
              <Field field={{ id: 'admissionDate', label: 'Hospice election (admission) date', type: 'date', required: true }} value={patient.admissionDate} onChange={(v) => update({ admissionDate: v })} />
              <Field field={{ id: 'periodNumber', label: 'Benefit period being certified', type: 'select', placeholder: 'Automatic from assessment date', options: Array.from({ length: 12 }, (_, i) => [String(i + 1), `Period ${i + 1}${i < 2 ? ' (90 days)' : ' (60 days)'}`]) }} value={patient.periodNumber || ''} onChange={(v) => update({ periodNumber: v })} />
              <Field field={{ id: 'certSignedDate', label: 'Certification signature date', type: 'date' }} value={patient.certSignedDate} onChange={(v) => update({ certSignedDate: v })} />
              <Field field={{ id: 'hospicePhysician', label: 'Certifying hospice physician', type: 'text' }} value={patient.hospicePhysician} onChange={(v) => update({ hospicePhysician: v })} />
            </div>
            {period?.period && (
              <p className="text-sm mt-3 mb-0">
                Period <strong>{period.period.n}</strong>: {fmtDate(period.period.start)} to {fmtDate(period.period.end)} ({period.period.length} days).
                {period.f2f?.required ? <> Face-to-face required between <strong>{fmtDate(period.f2f.window.from)}</strong> and <strong>{fmtDate(period.f2f.window.to)}</strong>.</> : ' No face-to-face encounter is required for this period.'}
              </p>
            )}
            {period?.f2f?.required ? (
              <div className="form-grid mt-3" style={{ '--cols': 4 }}>
                <Field field={{ id: 'f2fDate', label: 'Face-to-face encounter date', type: 'date', required: true }} value={patient.f2fDate} onChange={(v) => update({ f2fDate: v })} />
                <Field field={{ id: 'f2fClinician', label: 'Performed by', type: 'text' }} value={patient.f2fClinician} onChange={(v) => update({ f2fClinician: v })} />
                <Field field={{ id: 'f2fIsNP', label: 'Performed by a nurse practitioner', type: 'bool' }} value={patient.f2fIsNP} onChange={(v) => update({ f2fIsNP: v })} />
                <Field field={{ id: 'attendingName', label: 'Attending physician', type: 'text' }} value={patient.attendingName} onChange={(v) => update({ attendingName: v })} />
              </div>
            ) : (
              <div className="form-grid mt-3" style={{ '--cols': 2 }}>
                <Field field={{ id: 'attendingName', label: 'Attending physician (co-signs the initial certification)', type: 'text' }} value={patient.attendingName} onChange={(v) => update({ attendingName: v })} />
              </div>
            )}
            {period?.risks?.length ? <div className="mt-4"><RiskList risks={period.risks.map((t) => ({ level: 'risk', text: t }))} /></div> : null}
          </Section>
          <div className="flex justify-end"><button className="btn-primary" onClick={() => setStep(1)}>Next: assessment</button></div>
        </>
      )}

      {step === 1 && current && (
        <>
          <Section title="Assessments" sub="One dated snapshot per visit or per benefit period. The narrative compares the current one with the prior one." right={<button className="btn-secondary btn-sm" onClick={addSnap}><Plus size={14} /> New assessment</button>}>
            <div className="flex flex-wrap gap-2">
              {snaps.map((s) => (
                <span key={s.id} className={`snap${s.id === current.id ? ' active' : ''}`}>
                  <button type="button" onClick={() => setSnapId(s.id)}>{fmtDate(s.general?.date) || '(no date)'}{s.general?.pps ? ` · PPS ${s.general.pps}%` : ''}</button>
                  {snaps.length > 1 && <button type="button" className="del" title="Delete" onClick={() => removeSnap(s.id)}><Trash2 size={13} /></button>}
                </span>
              ))}
            </div>
          </Section>

          <Section title="Course of illness and function" sub={fmtDate(current.general?.date)}>
            <div className="form-grid" style={{ '--cols': 3 }}>
              <Field field={gf('date')} value={current.general?.date} onChange={(v) => updateSnap('general', 'date', v)} />
              <div style={{ gridColumn: 'span 2' }}><Field field={gf('onset')} value={current.general?.onset} onChange={(v) => updateSnap('general', 'onset', v)} /></div>
            </div>
            {onset === 'acute' && (
              <div className="form-grid mt-3" style={{ '--cols': 4 }}>
                <Field field={gf('eventDate')} value={current.general?.eventDate} onChange={(v) => updateSnap('general', 'eventDate', v)} />
                <Field field={gf('eventDesc')} value={current.general?.eventDesc} onChange={(v) => updateSnap('general', 'eventDesc', v)} />
                <Field field={gf('preEventPps')} value={current.general?.preEventPps} onChange={(v) => updateSnap('general', 'preEventPps', v)} />
                <Field field={gf('preEventDesc')} value={current.general?.preEventDesc} onChange={(v) => updateSnap('general', 'preEventDesc', v)} />
              </div>
            )}
            <hr className="my-4 border-0 border-t" style={{ borderColor: 'var(--line)' }} />
            <div className="form-grid" style={{ '--cols': 3 }}>
              {GENERAL_FIELDS.filter((f) => !GRID_EXCLUDE.has(f.id)).map((f) => (
                <Field key={f.id} field={f} value={current.general?.[f.id]} onChange={(v) => updateSnap('general', f.id, v)} />
              ))}
            </div>
            <div className="form-grid mt-4" style={{ '--cols': 2 }}>
              <Field field={gf('adls')} value={current.general?.adls} onChange={(v) => updateSnap('general', 'adls', v)} />
              <Field field={gf('decline')} value={current.general?.decline} onChange={(v) => updateSnap('general', 'decline', v)} />
            </div>
          </Section>

          <Section title={category.label} sub={`${category.lcdSection}. ${category.appliesTo}`}>
            <div className="form-grid" style={{ '--cols': 2 }}>
              {category.fields.map((f) => <Field key={f.id} field={f} value={current.dx?.[f.id]} onChange={(v) => updateSnap('dx', f.id, v)} />)}
            </div>
            {category.notes?.map((n, i) => <p key={i} className="hint mt-3 mb-0">{n}</p>)}
          </Section>

          <Section title="Comorbidities and patient-specific findings">
            <div className="form-grid" style={{ '--cols': 2 }}>
              <Field field={gf('comorbidities')} value={current.general?.comorbidities} onChange={(v) => updateSnap('general', 'comorbidities', v)} />
              <div className="flex flex-col gap-4">
                <Field field={gf('comorbidityDetail')} value={current.general?.comorbidityDetail} onChange={(v) => updateSnap('general', 'comorbidityDetail', v)} />
                <Field field={gf('findings')} value={current.general?.findings} onChange={(v) => updateSnap('general', 'findings', v)} />
              </div>
            </div>
          </Section>
          <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(0)}>Back</button><button className="btn-primary" onClick={() => setStep(2)}>Next: eligibility and narrative</button></div>
        </>
      )}

      {step === 2 && evaluation && current && (
        <>
          <Section title="Eligibility against the LCD">
            <div className={`verdict ${evaluation.overall}`}><VerdictIcon size={18} /> {verdictText}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm text-muted mb-2">{category.label} ({category.lcdSection})</h3>
                <ul className="criteria">
                  {evaluation.disease.required.map((r) => <li key={r.id}><StatusTag status={r.status} /><span>{r.label}{r.group ? <span className="text-xs text-muted"> (any one pathway)</span> : null}</span></li>)}
                  {evaluation.disease.supporting.map((r) => <li key={r.id}><StatusTag status={r.status === 'met' ? 'sup' : r.status} /><span>{r.label}</span></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm text-muted mb-2">Functional baseline (Part II) and decline (Part I)</h3>
                <ul className="criteria">
                  <li><StatusTag status={evaluation.partII.fnMet === true ? 'met' : evaluation.partII.fnMet === false ? 'unmet' : 'na'} /><span>{evaluation.partII.scale || 'PPS/KPS'} below 70% {evaluation.partII.score != null ? `(${evaluation.partII.score}%)` : ''}</span></li>
                  <li><StatusTag status={evaluation.partII.adlMet === true ? 'met' : evaluation.partII.adlMet === false ? 'unmet' : 'na'} /><span>Dependence in 2 or more ADLs ({evaluation.partII.adls.length} of 6)</span></li>
                  <li><StatusTag status={evaluation.partI.count ? 'met' : 'unmet'} /><span>Decline documented ({evaluation.partI.items.length} indicators, {evaluation.partI.worsening.length} worsening measures)</span></li>
                  <li><StatusTag status={evaluation.partIII.comorbidities.length ? 'sup' : 'na'} /><span>Comorbidities ({evaluation.partIII.comorbidities.length})</span></li>
                </ul>
                {evaluation.trajectory.length > 0 && (
                  <table className="table mt-4">
                    <thead><tr><th>Measure</th><th>{baselineLabel}</th><th>{fmtDate(current.general?.date)}</th><th></th></tr></thead>
                    <tbody>{evaluation.trajectory.map((t) => <tr key={t.id}><td>{t.label}</td><td>{t.baseline.text}</td><td>{t.current.text}</td><td className={t.worse ? 'text-danger' : t.same ? 'text-muted' : 'text-success'}>{t.worse ? 'worse' : t.same ? 'same' : 'better'}</td></tr>)}</tbody>
                  </table>
                )}
                {priorSnaps.length > 1 && (
                  <div className="wb-field mt-3"><label htmlFor="baseline-pick">Compare against</label>
                    <select id="baseline-pick" value={baselineId} onChange={(e) => setBaselineId(e.target.value)}>
                      <option value="auto">Most recent prior assessment</option>
                      {priorSnaps.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.general?.date)}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Documentation risks" sub="The patterns reviewers deny on, in order of weight.">
            <RiskList risks={allRisks} />
          </Section>

          <Section title={isRecert ? `Recertification narrative · period ${periodNumber}` : 'Certification of terminal illness · narrative'} sub="Composed only from what you entered. Edit freely before signing; the text is yours, not a template." right={narrative ? <CopyButton text={narrative} label="Copy narrative" /> : null}>
            {narrativeError ? <div className="risk">{narrativeError}</div> : <textarea className="narrative input-field w-full" value={narrative} readOnly rows={18} aria-label="Narrative" />}
          </Section>

          {period?.f2f?.required && (
            <Section title="Face-to-face attestation" right={<CopyButton text={f2fText} label="Copy attestation" />}>
              <textarea className="narrative input-field w-full" value={f2fText} readOnly rows={12} aria-label="Face-to-face attestation" />
            </Section>
          )}
          <div className="flex justify-between"><button className="btn-secondary" onClick={() => setStep(1)}>Back</button><Link className="btn-secondary" to="/patients">Patients and export</Link></div>
        </>
      )}
    </div>
  );
}
