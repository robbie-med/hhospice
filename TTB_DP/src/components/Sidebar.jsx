import React, { useState } from 'react';
import { MEDS, PROGNOSIS_OPTIONS, PPS_LEVELS } from '../data';
import './Sidebar.css';

const Sidebar = ({ prognosisYears, setPrognosisYears, selectedMeds, toggleMed, setImportMeds }) => {
  const [calcMode, setCalcMode] = useState('manual'); // 'manual' or 'pps'
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const handlePpsChange = (e) => {
    const level = parseInt(e.target.value);
    const ppsData = PPS_LEVELS.find(p => p.level === level);
    if (ppsData) {
      const years = ppsData.survivalDays / 365.25;
      setPrognosisYears(years);
    }
  };

  const handleImport = () => {
    const text = importText.toLowerCase();
    const newSelected = new Set(selectedMeds);
    let importedCount = 0;

    MEDS.forEach(m => {
      // Basic fuzzy match: split name by space/parenthesis and check if parts exist in text
      const keywords = m.name.toLowerCase().split(/[\s()]+/);
      const isMatch = keywords.some(k => k.length > 3 && text.includes(k)) || text.includes(m.id);
      
      if (isMatch) {
        newSelected.add(m.id);
        importedCount++;
      }
    });

    setImportMeds(newSelected);
    setShowImport(false);
    setImportText('');
    alert(`Imported ${importedCount} medications.`);
  };

  return (
    <aside className="card sidebar noprint">
      <div className="card-header">
        <h2>Patient Inputs</h2>
      </div>

      <div className="input-group">
        <div className="mode-toggle">
          <label>Prognosis Source:</label>
          <div className="toggle-btns">
            <button 
              className={calcMode === 'manual' ? 'active' : ''} 
              onClick={() => setCalcMode('manual')}
            >
              Manual
            </button>
            <button 
              className={calcMode === 'pps' ? 'active' : ''} 
              onClick={() => setCalcMode('pps')}
            >
              PPS Calculator
            </button>
          </div>
        </div>

        {calcMode === 'manual' ? (
          <select 
            id="prognosis" 
            value={prognosisYears} 
            onChange={(e) => setPrognosisYears(parseFloat(e.target.value))}
            className="matte-select"
          >
            {PROGNOSIS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            <option value={prognosisYears} disabled hidden>Custom: {prognosisYears.toFixed(2)} yrs</option>
          </select>
        ) : (
          <div className="pps-calculator">
            <label>Select Palliative Performance Scale (PPS):</label>
            <select onChange={handlePpsChange} defaultValue="" className="matte-select">
              <option value="" disabled>-- Select PPS Level --</option>
              {PPS_LEVELS.map(p => (
                <option key={p.level} value={p.level}>
                  {p.level}% - {p.label}
                </option>
              ))}
            </select>
            <div className="pps-result">
              Median survival estimate: <strong>{prognosisYears < 1 ? Math.round(prognosisYears * 12) + " mo" : prognosisYears.toFixed(1) + " y"}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="input-group">
        <div className="meds-header">
          <label>Current Preventive Medications</label>
          <button className="btn-text" onClick={() => setShowImport(true)}>Import EHR List</button>
        </div>
        
        {showImport && (
          <div className="import-box">
            <textarea 
              placeholder="Paste medication list from Epic/Cerner here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="import-actions">
              <button onClick={() => setShowImport(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleImport}>Import</button>
            </div>
          </div>
        )}

        <div className="med-list">
          {MEDS.map(m => (
            <label key={m.id} className="med-item">
              <input 
                type="checkbox" 
                checked={selectedMeds.has(m.id)}
                onChange={() => toggleMed(m.id)}
                className="matte-checkbox"
              />
              <div className="med-details">
                <span className="med-name">{m.name}</span>
                <span className="med-ttb">
                  TTB ≈ {m.ttbMin === m.ttbMax ? (m.ttbMin < 1 ? Math.round(m.ttbMin * 12) + " mo" : m.ttbMin + " y") : 
                         `${m.ttbMin}-${m.ttbMax} y`}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="btn-secondary" onClick={() => window.print()}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          Print / Save PDF
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
