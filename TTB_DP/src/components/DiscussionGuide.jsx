import React from 'react';
import { MEDS } from '../data';
import './DiscussionGuide.css';

const DiscussionGuide = ({ prognosisYears, selectedMeds }) => {
  const activeMeds = MEDS.filter(m => selectedMeds.has(m.id));
  const stoppedMeds = activeMeds.filter(m => m.ttbMax > prognosisYears);

  if (stoppedMeds.length === 0) {
    return null; // Only show guide if there are meds to stop
  }

  return (
    <div className="discussion-guide card mt-4">
      <div className="guide-header">
        <h3>Family Discussion Guide</h3>
        <p className="guide-subtitle">Plain-language talking points for goals-of-care conversations.</p>
      </div>
      
      <div className="guide-content">
        <p><strong>Opening the conversation:</strong></p>
        <p className="script-text">
          "As we focus our care on comfort and quality of life, we want to make sure every treatment is truly helping. Sometimes, interventions that were very important in the past take years to show a benefit. If they won't help right now, they might just be adding unnecessary side effects or discomfort."
        </p>

        <p><strong>Specific recommendations:</strong></p>
        <ul className="script-list">
          {stoppedMeds.map(m => (
            <li key={m.id} className="script-text">
              "For example, the <strong>{m.name.split(' (')[0]}</strong>. This {m.interventionType || 'medication'} is usually recommended to {m.purpose || 'prevent long-term issues'}, and it typically takes <strong>{m.ttbMin === m.ttbMax ? `${m.ttbMin} years` : `${m.ttbMin} to ${m.ttbMax} years`}</strong> to see that benefit. Right now, it's more likely to cause issues (like {m.sideEffects[0].toLowerCase()}) than to help. We recommend stopping it to reduce the {m.burdenType || 'daily burden'}."
            </li>
          ))}
        </ul>

        <p><strong>Closing:</strong></p>
        <p className="script-text">
          "Our goal isn't to take away care, but to take away the burden of treatments that aren't improving comfort today. We can always reconsider them if your situation changes. How does that sound to you?"
        </p>
      </div>
    </div>
  );
};

export default DiscussionGuide;
