import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Chart from './components/Chart';
import VerdictList from './components/VerdictList';
import DiscussionGuide from './components/DiscussionGuide';
import './App.css';

function App() {
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
    <div className="app-container">
      <header className="app-header noprint">
        <div className="header-content">
          <h1>Time-to-Benefit Deprescribing Visualizer</h1>
          <p>Compares a preventive medication's time-to-benefit (TTB) against the patient's estimated prognosis.</p>
        </div>
      </header>

      <main className="app-main">
        <Sidebar 
          prognosisYears={prognosisYears}
          setPrognosisYears={setPrognosisYears}
          selectedMeds={selectedMeds}
          toggleMed={toggleMed}
          setImportMeds={setSelectedMeds}
        />

        <section className="chart-section">
          <div className="card chart-card">
            <div className="card-header noprint">
              <h2>Visualization</h2>
            </div>
            <div className="chart-wrapper">
              <Chart prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
            </div>
            <p className="legend-note noprint">
              The curve is the estimated probability of survival over time. Each horizontal bar is a
              medication's time-to-benefit: the drug must be taken for at least that long before any
              benefit is expected. A bar ending in the shaded region means the patient is statistically
              unlikely to live long enough to receive the benefit — while remaining exposed to side
              effects for the entire bar.
            </p>
            <VerdictList prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
            <DiscussionGuide prognosisYears={prognosisYears} selectedMeds={selectedMeds} />
          </div>
        </section>
      </main>

      <div className="disclaimer noprint">
        <p><strong>Clinical decision-support aid only.</strong> Time-to-benefit estimates are population-level
        figures from the cited literature and do not replace clinical judgment, individualized prognostication,
        or patient/family values and goals of care. Survival is modeled as exponential decay from the selected
        median prognosis — a simplification for communication, not a validated prognostic score.<br/>
        TTB references: Lee SJ et al. (estimating TTB for preventive therapies in older adults),
        Holmes HM et al. (statins in limited life expectancy), O'Mahony D et al. STOPPFrail criteria,
        Iyer S et al. (bisphosphonate TTB, systematic review), UKPDS legacy data (glycemic control),
        HYVET (antihypertensives ≥80 y).</p>
      </div>
    </div>
  );
}

export default App;
