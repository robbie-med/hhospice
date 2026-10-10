import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, Trash2 } from 'lucide-react';
import { listPatients, deletePatient, exportAll, importAll, sortedSnapshots } from '../store/patients.js';
import { categoryById } from '../data/lcd/index.js';
import { Section } from '../components/ui.jsx';

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
    <div className="py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><h1 className="text-2xl m-0">Patients</h1><p className="hint m-0">Stored in this browser only (IndexedDB). Export before switching devices or clearing site data.</p></div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={doExport}><Download size={16} /> Export JSON</button>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
          <Link to="/certify" className="btn-primary no-underline">+ New patient</Link>
        </div>
      </div>
      {msg && <p className="text-sm mb-3">{msg}</p>}
      <Section>
        {patients.length === 0 ? <p className="hint m-0">No patients yet. Start one from the certification workbench.</p> : (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-left text-text-muted"><th className="py-2">Label</th><th>Guideline</th><th>Election</th><th>Assessments</th><th>Latest PPS</th><th>Updated</th><th></th></tr></thead>
            <tbody>
              {patients.map((p) => { const s = sortedSnapshots(p); const last = s.at(-1); return (
                <tr key={p.id} className="border-t border-gray-200">
                  <td className="py-2"><Link to={`/certify?p=${p.id}`}>{p.label || '(no label)'}</Link></td>
                  <td>{categoryById(p.category).label}</td>
                  <td>{p.admissionDate || ''}</td>
                  <td>{s.length}{last ? ` (last ${last.general?.date || ''})` : ''}</td>
                  <td>{last?.general?.pps ? `${last.general.pps}%` : ''}</td>
                  <td>{String(p.updatedAt || '').slice(0, 10)}</td>
                  <td className="text-right"><button className="bg-transparent border-0 cursor-pointer text-danger" title="Delete" onClick={() => remove(p)}><Trash2 size={16} /></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
