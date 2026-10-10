import React from 'react';
import { Alert } from './Alert';

interface Props {
  qtc: string;
  setQtc: (val: string) => void;
  riskFactors: Record<string, boolean>;
  setRiskFactors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  plannedTDD: number | null;
}

const RISK_FACTORS_COL1 = [
  { id: 'rfFemale', label: 'Female sex', weight: 2 },
  { id: 'rfAge', label: 'Age > 65 years', weight: 2 },
  { id: 'rfCongenital', label: 'Known congenital long-QT syndrome or family history of sudden death < 40 y', weight: 2 },
  { id: 'rfSyncope', label: 'Prior syncope / documented torsades or ventricular arrhythmia', weight: 2 },
  { id: 'rfHeart', label: 'Structural heart disease, heart failure, or LVH', weight: 1 }
];

const RISK_FACTORS_COL2 = [
  { id: 'rfLytes', label: 'Electrolyte disturbance (K⁺ low, Mg²⁺ low, Ca²⁺ low) or active vomiting/diarrhoea', weight: 2 },
  { id: 'rfBrady', label: 'Bradycardia (< 50 bpm)', weight: 1 },
  { id: 'rfMeds', label: 'Concurrent QTc-prolonging drugs (e.g. haloperidol, ondansetron, TCAs, quetiapine, macrolides, azole antifungals, amiodarone)', weight: 2 },
  { id: 'rfCYP', label: 'CYP3A4 / CYP2B6 inhibitors or inducers (fluconazole, clarithromycin, carbamazepine, some ART) — alters methadone levels', weight: 1 },
  { id: 'rfOrgan', label: 'Hepatic or renal impairment', weight: 1 },
  { id: 'rfSedative', label: 'Concomitant benzodiazepines, gabapentinoids or other sedatives (respiratory risk)', weight: 1 }
];

export const QtcChecklist: React.FC<Props> = ({ qtc, setQtc, riskFactors, setRiskFactors, plannedTDD }) => {
  const toggleRf = (id: string) => {
    setRiskFactors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getAssessment = () => {
    let pts = 0;
    RISK_FACTORS_COL1.concat(RISK_FACTORS_COL2).forEach(rf => {
      if (riskFactors[rf.id]) pts += rf.weight;
    });
    if (plannedTDD != null && plannedTDD > 100) pts += 2;

    const qtcVal = parseFloat(qtc);
    let level, type: 'danger' | 'warning' | 'success' = 'success', msgs: string[] = [];
    
    if (!isNaN(qtcVal) && qtcVal > 500) {
      level = "Contraindicated"; 
      type = "danger";
      msgs.push("Baseline QTc > 500 ms: methadone should generally be avoided or discontinued. Consider alternative opioids; if methadone is truly unavoidable, only under specialist supervision with cardiology input and ECG monitoring.");
    } else if (!isNaN(qtcVal) && qtcVal > 450) {
      pts += 2;
      msgs.push("Baseline QTc 450–500 ms: proceed only with caution, ECG follow-up, and correction of all modifiable factors.");
    }

    if (!level) {
      if (pts >= 5)      { level = "High risk"; type = "danger"; }
      else if (pts >= 2) { level = "Moderate risk"; type = "warning"; }
      else               { level = "Low risk"; type = "success"; }
    }

    if (plannedTDD != null && plannedTDD > 100)
      msgs.push("Planned methadone dose > 100 mg/day is independently associated with torsades risk — Chou 2014 recommends ECG monitoring at this threshold.");
    
    if (pts > 0 && type! !== "danger")
      msgs.push("Correct modifiable factors first: replete K⁺ > 4.0 mmol/L and Mg²⁺ > 0.85 mmol/L, review the QTc-prolonging medication list, and obtain a baseline ECG if not already done.");
    
    msgs.push("ECG plan (Chou 2014): baseline ECG for all patients with known risk factors; repeat ~2–4 weeks after initiation and after significant dose escalation; act on QTc > 500 ms.");
    
    return { level, type, msgs, blocked: (!isNaN(qtcVal) && qtcVal > 500) };
  };

  const assessment = getAssessment();

  return (
    <section className="card">
      <h2><span className="step-badge">3</span> QTc &amp; safety checklist</h2>
      <p className="text-muted">
        Based on the Chou et al. 2014 consensus recommendations and standard risk factors for drug-induced
        QT prolongation. This gates the schedule in Step 4.
      </p>

      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <div>
          <label className="field">
            <span>Baseline QTc (ms), if ECG available</span>
            <input 
              type="number" 
              min="0" 
              max="700" 
              placeholder="e.g. 440" 
              value={qtc} 
              onChange={e => setQtc(e.target.value)} 
            />
          </label>
          {RISK_FACTORS_COL1.map(rf => (
            <label key={rf.id} className="check">
              <input type="checkbox" checked={!!riskFactors[rf.id]} onChange={() => toggleRf(rf.id)} />
              <span>{rf.label}</span>
            </label>
          ))}
        </div>
        <div>
          {RISK_FACTORS_COL2.map(rf => (
            <label key={rf.id} className="check">
              <input type="checkbox" checked={!!riskFactors[rf.id]} onChange={() => toggleRf(rf.id)} />
              <span>{rf.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Alert type={assessment.type!} title={`QTc risk: ${assessment.level}`}>
        <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
          {assessment.msgs.map((msg, i) => (
            <li key={i} style={{ marginBottom: '0.25rem' }}>{msg}</li>
          ))}
        </ul>
      </Alert>
    </section>
  );
};

