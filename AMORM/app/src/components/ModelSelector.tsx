import React from 'react';
import { fmt, roundMeth } from '../data/constants';
import { Alert } from './Alert';

interface Props {
  totalOMEDD: number;
  modelResults: any[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  safetyCut: number;
  setSafetyCut: (val: number) => void;
  selectedModelResult: any;
}

export const ModelSelector: React.FC<Props> = ({ 
  totalOMEDD, 
  modelResults, 
  selectedModelId, 
  setSelectedModelId, 
  safetyCut, 
  setSafetyCut,
  selectedModelResult
}) => {
  return (
    <section className="card">
      <h2><span className="step-badge">2</span> Conversion model</h2>
      <p className="text-muted">
        All models below are applied to the oMEDD from Step 1. The comparison table shows how much the published
        models disagree — at high oMEDD this divergence is itself the key safety information. Choose one model to drive the schedule.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '4%' }}></th>
              <th style={{ width: '20%' }}>Model</th>
              <th style={{ width: '26%' }}>Ratio at this oMEDD</th>
              <th style={{ width: '16%' }}>Methadone TDD</th>
              <th style={{ width: '34%' }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {modelResults.map(({ mod, res }) => (
              <tr key={mod.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedModelId(mod.id)}>
                <td>
                  <input 
                    type="radio" 
                    name="model" 
                    value={mod.id} 
                    checked={mod.id === selectedModelId} 
                    onChange={() => setSelectedModelId(mod.id)} 
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td><strong>{mod.name}</strong></td>
                <td style={{ fontSize: '0.84rem' }}>{res.ratioLabel}</td>
                <td>
                  {res.tdd != null ? (
                    <>
                      <span className="text-mono">{fmt(res.tddAdj)} mg/day</span>
                      {Math.abs(res.tddAdj - res.tdd) > 0.01 && (
                        <>
                          <br />
                          <span className="text-muted" style={{ fontSize: '0.78rem' }}>({fmt(res.tdd)} mg before safety reduction)</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-mono">{fmt(res.prn.dose)} mg {res.prn.freq}</span>
                  )}
                </td>
                <td className="text-muted" style={{ fontSize: '0.82rem' }}>{res.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="field" style={{ maxWidth: '340px', marginTop: '1rem' }}>
        <span>Additional safety reduction for incomplete cross-tolerance</span>
        <select value={safetyCut} onChange={e => setSafetyCut(parseFloat(e.target.value))}>
          <option value={0.25}>Reduce by 25% (recommended default)</option>
          <option value={0}>None — use model output as-is</option>
          <option value={0.5}>Reduce by 50% (frail / elderly / high risk)</option>
        </select>
      </label>

      <div style={{ marginTop: '1rem' }}>
        {totalOMEDD <= 0 ? (
          <Alert type="warning" title="No opioid stack entered">
            Add the patient's current opioids in Step 1.
          </Alert>
        ) : selectedModelResult?.res.tdd != null ? (
          <Alert type="success" title={`Selected: ${selectedModelResult.mod.name}`}>
            oMEDD {fmt(totalOMEDD)} mg/day → methadone <strong>{fmt(selectedModelResult.res.tddAdj)} mg/day</strong> ({selectedModelResult.res.ratioLabel}, after {(selectedModelResult.appliedSafetyCut * 100).toFixed(0)}% safety reduction). 
            Given q8h that is ≈ <strong>{fmt(roundMeth(selectedModelResult.res.tddAdj / 3))} mg per dose</strong>.
          </Alert>
        ) : (
          <Alert type="success" title={`Selected: ${selectedModelResult?.mod.name}`}>
            {selectedModelResult?.res.note}
          </Alert>
        )}
      </div>
    </section>
  );
};
