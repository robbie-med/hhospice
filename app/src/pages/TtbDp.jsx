import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Chart from '../components/Chart';
import VerdictList from '../components/VerdictList';
import DiscussionGuide from '../components/DiscussionGuide';
import '../data.js'; // Ensure it's imported or used by child components properly

export default function TtbDp() {
  const [prognosisYears, setPrognosisYears] = useState(2.5);
  const [selectedMeds, setSelectedMeds] = useState(new Set(["statin", "glycemic"]));

  const toggleMed = (id) => {
    const newSelected = new Set(selectedMeds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMeds(newSelected);
  };

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl mb-2">Time-to-Benefit Deprescribing</h1>
        <p className="text-text-muted">
          Compare a preventive medication's time-to-benefit (TTB) against the patient's estimated prognosis.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/3">
          <Sidebar 
            prognosisYears={prognosisYears}
            setPrognosisYears={setPrognosisYears}
            selectedMeds={selectedMeds}
            toggleMed={toggleMed}
            setImportMeds={setSelectedMeds}
          />
        </div>

        <div className="w-full md:w-2/3 space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-xl mb-4">Visualization</h2>
            <div className="mb-4 bg-white/50 p-4 rounded-lg">
              <Chart prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
            </div>
            <p className="text-sm text-text-muted">
              The curve is the estimated probability of survival over time. Each horizontal bar is a
              medication's time-to-benefit: the drug must be taken for at least that long before any
              benefit is expected. A bar ending in the shaded region means the patient is statistically
              unlikely to live long enough to receive the benefit — while remaining exposed to side
              effects for the entire bar.
            </p>
          </div>
          
          <VerdictList prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
          <DiscussionGuide prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
        </div>
      </div>
      
      <div className="mt-8 text-xs text-text-muted border-t border-card-border pt-4">
        <p><strong>Clinical decision-support aid only.</strong> Time-to-benefit estimates are population-level
        figures from the cited literature and do not replace clinical judgment, individualized prognostication,
        or patient/family values and goals of care. Survival is modeled as exponential decay from the selected
        median prognosis — a simplification for communication, not a validated prognostic score.<br/>
        TTB references: Lee SJ et al., Holmes HM et al., O'Mahony D et al., Iyer S et al., UKPDS, HYVET.</p>
      </div>
    </div>
  );
}
