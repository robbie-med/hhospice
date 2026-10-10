import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, Trash2, Users } from 'lucide-react';
import { listPatients, deletePatient, exportAll, importAll, sortedSnapshots } from '../store/patients.js';
import { categoryById } from '../data/lcd/index.js';
import { fmtDate } from '../lib/periods.js';
import { Section, Tip } from '../components/ui.jsx';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const refresh = () => listPatients().then(setPatients).catch(() => setPatients([]));
  useEffect(() => { refresh(); }, []);

  const doExport = async () => {
    const json = await exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hospice-workbench-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const doImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const n = await importAll(await f.text(), { replace: false });
      setMsg(`Imported ${n} patient record${n === 1 ? '' : 's'}.`);
      refresh();
    } catch (err) { setMsg(`Import failed: ${err.message}`); }
    e.target.value = '';
  };
  const remove = async (p) => {
    if (!window.confirm(`Delete ${p.label || 'this patient'} and all assessments? This cannot be undone.`)) return;
    await deletePatient(p.id); refresh();
  };

  return (
    <div>
      <div className="page-head">
        <div><h1>Patients</h1><p className="lede">Stored in this browser only. Export before switching devices or clearing site data.</p></div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={doExport} disabled={!patients.length}><Download size={15} /> Export JSON</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
          <Link to="/certify" className="btn-primary">New patient</Link>
        </div>
      </div>
      {msg && <p className="text-sm mb-3">{msg}</p>}
      {patients.length > 0 && <Tip>Each row is a patient with dated assessments. Open one to add this period's assessment; the recertification narrative compares it with the last.</Tip>}
      <Section>
        {patients.length === 0 ? (
          <div className="empty">
            <Users size={32} />
            <h3>No patients yet</h3>
            <p>Start a certification and the patient appears here once it has a label.</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Link to="/certify?start=initial" className="btn-primary">Initial certification</Link>
              <Link to="/certify?start=recert" className="btn-secondary">Recertification</Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Label</th><th>Guideline</th><th>Election</th><th>Assessments</th><th>Latest PPS</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                {patients.map((p) => { const s = sortedSnapshots(p); const last = s.at(-1); return (
                  <tr key={p.id}>
                    <td><Link to={`/certify?p=${p.id}`} className="font-medium">{p.label || '(no label)'}</Link></td>
                    <td>{categoryById(p.category).label}</td>
                    <td>{fmtDate(p.admissionDate)}</td>
                    <td>{s.length}{last ? <span className="text-muted"> · last {fmtDate(last.general?.date)}</span> : ''}</td>
                    <td>{last?.general?.pps ? `${last.general.pps}%` : <span className="text-muted">—</span>}</td>
                    <td>{fmtDate(String(p.updatedAt || '').slice(0, 10))}</td>
                    <td className="text-right"><button className="btn-ghost btn-sm btn-danger-ghost" title="Delete" onClick={() => remove(p)}><Trash2 size={15} /></button></td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
