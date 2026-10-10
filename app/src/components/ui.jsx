import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyText } from '../lib/clipboard.js';

/** Generic field renderer driven by the LCD data definitions. */
export function Field({ field, value, onChange }) {
  const f = field;
  const id = `f-${f.id}`;
  const label = (
    <label htmlFor={id}>{f.label}{f.unit ? <span className="normal-case font-normal"> ({f.unit})</span> : null}{f.required ? <span className="text-danger"> *</span> : null}</label>
  );
  const hint = f.hint ? <p className="hint mb-0 mt-1 text-xs">{f.hint}</p> : null;
  switch (f.type) {
    case 'text':
      return <div className="wb-field">{label}<input id={id} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'textarea':
      return <div className="wb-field">{label}<textarea id={id} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'date':
      return <div className="wb-field">{label}<input id={id} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'number':
      return <div className="wb-field">{label}<input id={id} type="number" step={f.step || 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'select':
      return (
        <div className="wb-field">{label}
          <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">—</option>
            {f.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>{hint}
        </div>
      );
    case 'bool':
      return (
        <fieldset className="wb-field">
          <legend>{f.label}{f.required ? <span className="text-danger"> *</span> : null}</legend>
          <div className="flex gap-2">
            {[['yes', 'Yes'], ['no', 'No']].map(([k, l]) => (
              <label key={k} className="wb-opt"><input type="radio" name={id} checked={value === k} onChange={() => onChange(k)} /><span>{l}</span></label>
            ))}
          </div>{hint}
        </fieldset>
      );
    case 'radio':
      return (
        <fieldset className="wb-field">
          <legend>{f.label}{f.required ? <span className="text-danger"> *</span> : null}</legend>
          {f.options.map(([k, l]) => (
            <label key={k} className="wb-opt"><input type="radio" name={id} checked={value === k} onChange={() => onChange(k)} /><span>{l}</span></label>
          ))}{hint}
        </fieldset>
      );
    case 'checks': {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (k) => onChange(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
      return (
        <fieldset className="wb-field">
          <legend>{f.label}</legend>
          {f.options.map(([k, l]) => (
            <label key={k} className="wb-opt"><input type="checkbox" checked={arr.includes(k)} onChange={() => toggle(k)} /><span>{l}</span></label>
          ))}{hint}
        </fieldset>
      );
    }
    default:
      return null;
  }
}

export function Section({ title, children, right }) {
  return (
    <section className="glass-card p-5 mb-4">
      {title ? <div className="flex items-center justify-between mb-3"><h2 className="text-lg m-0">{title}</h2>{right}</div> : null}
      {children}
    </section>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-primary" onClick={() => copyText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? <Check size={16} /> : <Copy size={16} />} {done ? 'Copied' : label}
    </button>
  );
}

export function RiskList({ risks }) {
  if (!risks || !risks.length) return <p className="text-sm text-success">No documentation risks flagged.</p>;
  return (
    <div>
      {risks.map((r, i) => (
        <div key={i} className={`risk ${r.level === 'warn' ? 'warn' : ''}`}>{r.text}</div>
      ))}
    </div>
  );
}

export function StatusTag({ status }) {
  const map = { met: 'MET', unmet: 'UNMET', na: 'NO DATA', sup: 'SUPPORTS' };
  return <span className={`tag ${status}`}>{map[status] || status}</span>;
}
