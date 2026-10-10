import { useState, useSyncExternalStore } from 'react';
import { Copy, Check, Lightbulb, EyeOff, Eye } from 'lucide-react';
import { copyText } from '../lib/clipboard.js';

/* ------------------------------------------------------------------ */
/* Tips preference (shared across pages, persisted)                     */
/* ------------------------------------------------------------------ */
const TIPS_KEY = 'hcw-tips';
const listeners = new Set();
function readTips() { try { return localStorage.getItem(TIPS_KEY) !== '0'; } catch { return true; } }
let tipsOn = readTips();
function setTips(v) { tipsOn = v; try { localStorage.setItem(TIPS_KEY, v ? '1' : '0'); } catch { /* ignore */ } listeners.forEach((l) => l()); }
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
export function useTips() { return useSyncExternalStore(subscribe, () => tipsOn, () => true); }

/** Quiet inline guidance. Hidden entirely when the user turns tips off. */
export function Tip({ children, accent }) {
  const on = useTips();
  if (!on) return null;
  return (
    <div className={`tip${accent ? ' accent' : ''}`}>
      <Lightbulb size={15} />
      <div>{typeof children === 'string' ? <p>{children}</p> : children}</div>
    </div>
  );
}

export function TipsToggle() {
  const on = useTips();
  return (
    <button type="button" className="tip-toggle" onClick={() => setTips(!on)} title={on ? 'Hide guidance' : 'Show guidance'}>
      {on ? <EyeOff size={13} /> : <Eye size={13} />} {on ? 'Hide tips' : 'Show tips'}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Fields                                                               */
/* ------------------------------------------------------------------ */
const CheckMark = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
const Dot = () => <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>;

function Label({ f, id, as: Tag = 'label' }) {
  return (
    <Tag htmlFor={Tag === 'label' ? id : undefined}>
      {f.label}
      {f.unit ? <span className="unit"> ({f.unit})</span> : null}
      {f.required ? <span className="req"> *</span> : null}
    </Tag>
  );
}

/** Generic field renderer driven by the LCD data definitions. */
export function Field({ field, value, onChange }) {
  const f = field;
  const id = `f-${f.id}`;
  const hint = f.hint ? <p className="hint">{f.hint}</p> : null;
  const stack = (opts) => opts.some(([, l]) => String(l).length > 42) || opts.length > 6;
  switch (f.type) {
    case 'text':
      return <div className="wb-field"><Label f={f} id={id} /><input id={id} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder || ''} />{hint}</div>;
    case 'textarea':
      return <div className="wb-field"><Label f={f} id={id} /><textarea id={id} rows={f.rows || 3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder || ''} />{hint}</div>;
    case 'date':
      return <div className="wb-field"><Label f={f} id={id} /><input id={id} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'number':
      return <div className="wb-field"><Label f={f} id={id} /><input id={id} type="number" inputMode="decimal" step={f.step || 'any'} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />{hint}</div>;
    case 'select':
      return (
        <div className="wb-field"><Label f={f} id={id} />
          <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
            <option value="">{f.placeholder || 'Select…'}</option>
            {f.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>{hint}
        </div>
      );
    case 'bool':
    case 'radio': {
      const opts = f.type === 'bool' ? [['yes', 'Yes'], ['no', 'No']] : f.options;
      return (
        <fieldset className="wb-field"><Label f={f} id={id} as="legend" />
          <div className={`wb-choices${stack(opts) ? ' stack' : ''}`}>
            {opts.map(([k, l, sub]) => (
              <label key={k} className="wb-opt">
                <input type="radio" name={id} checked={value === k} onChange={() => onChange(k)} />
                <span className="box round"><Dot /></span>
                <span>{l}{sub ? <span className="sub">{sub}</span> : null}</span>
              </label>
            ))}
          </div>{hint}
        </fieldset>
      );
    }
    case 'checks': {
      const arr = Array.isArray(value) ? value : [];
      const toggle = (k) => onChange(arr.includes(k) ? arr.filter((x) => x !== k) : [...arr, k]);
      return (
        <fieldset className="wb-field"><Label f={f} id={id} as="legend" />
          <div className={`wb-choices${stack(f.options) ? ' stack' : ''}`}>
            {f.options.map(([k, l]) => (
              <label key={k} className="wb-opt">
                <input type="checkbox" checked={arr.includes(k)} onChange={() => toggle(k)} />
                <span className="box"><CheckMark /></span>
                <span>{l}</span>
              </label>
            ))}
          </div>{hint}
        </fieldset>
      );
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                        */
/* ------------------------------------------------------------------ */
export function Section({ title, sub, children, right, id }) {
  return (
    <section className="section" id={id}>
      {title ? (
        <div className="section-head">
          <div><h2>{title}</h2>{sub ? <p className="sub">{sub}</p> : null}</div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stepper({ steps, step, onChange }) {
  return (
    <div className="stepper" role="tablist">
      {steps.map((s, i) => (
        <button key={s} type="button" role="tab" aria-selected={i === step} className={i === step ? 'active' : i < step ? 'done' : ''} onClick={() => onChange(i)}>
          <span className="n">{i < step ? <CheckMark /> : i + 1}</span>
          <span className="lbl">{s}</span>
        </button>
      ))}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy', className = 'btn-primary' }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className={className} disabled={!text} onClick={() => copyText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? <Check size={15} /> : <Copy size={15} />} {done ? 'Copied' : label}
    </button>
  );
}

export function RiskList({ risks }) {
  if (!risks || !risks.length) return <p className="text-sm text-success m-0">No documentation risks flagged.</p>;
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
