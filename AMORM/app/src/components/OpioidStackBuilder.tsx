import React from 'react';
import type { StackRow } from '../types';
import { OPIOIDS, FREQS, fmt } from '../data/constants';
import { Alert } from './Alert';

interface Props {
  stackRows: StackRow[];
  setStackRows: React.Dispatch<React.SetStateAction<StackRow[]>>;
  totalOMEDD: number;
  targetOpioid: string;
  setTargetOpioid: (val: string) => void;
}

export const OpioidStackBuilder: React.FC<Props> = ({ stackRows, setStackRows, totalOMEDD, targetOpioid, setTargetOpioid }) => {
  const addRow = () => {
    setStackRows([...stackRows, { opioid: "mor_po", dose: "", freq: 3 }]);
  };

  const removeRow = (index: number) => {
    const newRows = [...stackRows];
    newRows.splice(index, 1);
    setStackRows(newRows);
  };

  const updateRow = (index: number, key: keyof StackRow, value: any) => {
    const newRows = [...stackRows];
    newRows[index] = { ...newRows[index], [key]: value };
    setStackRows(newRows);
  };

  const getRowMME = (row: StackRow) => {
    const o = OPIOIDS.find(x => x.id === row.opioid);
    const dose = parseFloat(row.dose);
    if (!o || isNaN(dose) || dose <= 0) return 0;
    return o.kind === "patch" ? dose * o.factor : dose * row.freq * o.factor;
  };

  return (
    <section className="card">
      <h2><span className="step-badge">1</span> Current opioid stack → oral morphine equivalent daily dose (oMEDD)</h2>
      <p className="text-muted">
        Add every scheduled opioid the patient currently takes (do not include breakthrough-only use here).
        Conversion factors follow CDC MME / standard equianalgesic tables and are shown per row for transparency.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Opioid / route</th>
              <th style={{ width: '16%' }}>Dose</th>
              <th style={{ width: '18%' }}>Frequency</th>
              <th style={{ width: '22%' }}>Factor</th>
              <th style={{ width: '12%' }}>MME/day</th>
              <th className="noprint" style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {stackRows.map((row, i) => {
              const o = OPIOIDS.find(x => x.id === row.opioid)!;
              return (
                <tr key={i}>
                  <td>
                    <select value={row.opioid} onChange={e => updateRow(i, 'opioid', e.target.value)}>
                      {OPIOIDS.map(op => (
                        <option key={op.id} value={op.id}>{op.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input 
                      type="number" 
                      min="0" 
                      step="any" 
                      value={row.dose} 
                      onChange={e => updateRow(i, 'dose', e.target.value)}
                      placeholder={o.kind === "patch" ? "mcg/h" : "mg per dose"}
                    />
                  </td>
                  <td>
                    {o.kind === "patch" ? (
                      <span className="text-muted">continuous</span>
                    ) : (
                      <select value={row.freq} onChange={e => updateRow(i, 'freq', parseInt(e.target.value, 10))}>
                        {FREQS.map(f => (
                          <option key={f.v} value={f.v}>{f.label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.82rem' }}>{o.factorText}</td>
                  <td className="text-mono">{fmt(getRowMME(row))}</td>
                  <td className="noprint">
                    <button className="secondary small danger" onClick={() => removeRow(i)} aria-label="Remove row">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="noprint">
        <button className="secondary small" onClick={addRow}>+ Add opioid</button>
      </p>
      
      <p style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
        Total <strong>oMEDD</strong>: <span className="result-big text-mono">{fmt(totalOMEDD)}</span> mg oral morphine / day
      </p>

      <label className="field" style={{ maxWidth: '340px', marginTop: '1.5rem', marginBottom: 0 }}>
        <span>Target Opioid for Rotation</span>
        <select value={targetOpioid} onChange={e => setTargetOpioid(e.target.value)}>
          <option value="methadone">Methadone (Complex Non-linear)</option>
          <option value="buprenorphine" disabled>Buprenorphine (Coming Soon)</option>
          <option value="fentanyl" disabled>Fentanyl (Coming Soon)</option>
          <option value="morphine" disabled>Morphine PO (Coming Soon)</option>
        </select>
      </label>

      {totalOMEDD > 300 && targetOpioid === 'methadone' && (
        <Alert type="warning" title="High-dose territory (> 300 mg/day)">
          All conversion models become markedly more conservative and diverge widely here. Specialist supervision is strongly advised.
        </Alert>
      )}
    </section>
  );
};
