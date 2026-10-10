import React from 'react';
import { MEDS } from '../data';
import './VerdictList.css';

const VerdictList = ({ prognosisYears, selectedMeds }) => {
  const survival = (t, median) => Math.pow(0.5, t / median);
  const activeMeds = MEDS.filter(m => selectedMeds.has(m.id));

  if (activeMeds.length === 0) {
    return null;
  }

  // Calculate Burden Reduced (Item 4)
  const stoppedMeds = activeMeds.filter(m => m.ttbMax > prognosisYears);
  const totalPillsAvoided = stoppedMeds.reduce((sum, m) => sum + (m.pillCount * 30), 0); // monthly
  const avoidedRisks = new Set();
  stoppedMeds.forEach(m => m.sideEffects.forEach(se => avoidedRisks.add(se)));

  return (
    <div className="verdict-section">
      {stoppedMeds.length > 0 && (
        <div className="burden-summary card">
          <h3>Potential Burden Reduction</h3>
          <p>If all "stop" medications are deprescribed:</p>
          <ul>
            <li><strong>Pills Avoided:</strong> ~{Math.round(totalPillsAvoided)} pills per month</li>
            {avoidedRisks.size > 0 && (
              <li><strong>Risks Eliminated:</strong> {Array.from(avoidedRisks).join(', ')}</li>
            )}
          </ul>
        </div>
      )}

      <div className="verdict-list">
        {activeMeds.map(m => {
          const beyond = m.ttbMax > prognosisYears;
          const marginal = !beyond && m.ttbMax > prognosisYears * 0.6;
          
          // Use max TTB for the survival probability to be safe
          const pAtTtb = survival(m.ttbMax, prognosisYears);
          
          let cls, verdictText;
          if (beyond) {
            cls = "v-stop";
            verdictText = "Consider deprescribing";
          } else if (marginal) {
            cls = "v-reconsider";
            verdictText = "Discuss — marginal benefit";
          } else {
            cls = "v-continue";
            verdictText = "Benefit plausible — continue";
          }

          const isRange = m.ttbMin !== m.ttbMax;
          const ttbLabel = isRange ? `${m.ttbMin}-${m.ttbMax}` : m.ttbMin;

          return (
            <div key={m.id} className={`verdict-row ${cls}`}>
              <div className="verdict-info">
                <strong>{m.name}</strong>
                <div className="verdict-stats">
                  TTB {ttbLabel} y vs median prognosis {prognosisYears < 1 ? Math.round(prognosisYears * 12) + " mo" : prognosisYears.toFixed(1) + " y"} &middot; 
                  ≈{Math.round(pAtTtb * 100)}% chance of surviving to point of max benefit
                </div>
                <div className="citation">{m.ref}</div>
              </div>
              <div className="verdict-badge">
                <span className="badge">{verdictText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerdictList;
