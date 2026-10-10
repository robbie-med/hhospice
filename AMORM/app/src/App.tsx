
import { useAmormState } from './hooks/useAmormState';
import { OpioidStackBuilder } from './components/OpioidStackBuilder';
import { ModelSelector } from './components/ModelSelector';
import { QtcChecklist } from './components/QtcChecklist';
import { ScheduleOutput } from './components/ScheduleOutput';
import { TitrationDashboard } from './components/TitrationDashboard';
import { Alert } from './components/Alert';
import { pullPatientDataMock } from './services/fhir';
import { useState } from 'react';
import './App.css';

function App() {
  const state = useAmormState();
  const [loadingEHR, setLoadingEHR] = useState(false);

  const handleEHRPull = async () => {
    setLoadingEHR(true);
    try {
      const data = await pullPatientDataMock();
      state.setStackRows(data.stackRows);
      state.setQtc(data.qtc);
      state.setRiskFactors(prev => ({ ...prev, ...data.riskFactors }));
    } finally {
      setLoadingEHR(false);
    }
  };

  return (
    <>
      <header>
        <h1>AMORM — Assisted Methadone Opioid Rotation Module</h1>
        <p>Evidence-based methadone rotation: opioid stack → oMEDD → conversion models → cross-taper schedule with QTc screening.</p>
      </header>
      
      <main>
        {!state.unlocked ? (
          <section className="card" id="gate">
            <Alert type="danger" title="⚠ Clinical decision support — not a prescribing tool">
              Methadone has a long, variable half-life (8–59 h), non-linear equianalgesic ratios, and a real risk of delayed respiratory
              depression and QTc prolongation / torsades de pointes. Published conversion models can diverge by a factor of 3 or more at
              high oMEDD. Every output of this tool must be independently verified and individualised by a prescriber experienced in
              methadone initiation. This tool does not replace specialist palliative care / pain consultation, and says nothing about
              whether methadone is appropriate for a given patient.
            </Alert>
            <label className="check">
              <input type="checkbox" onChange={(e) => {
                const btn = document.getElementById('unlock-btn') as HTMLButtonElement;
                if (btn) btn.disabled = !e.target.checked;
              }} />
              <span>I am a qualified clinician. I understand the above, and I will independently verify all doses before prescribing.</span>
            </label>
            <button id="unlock-btn" disabled onClick={() => state.setUnlocked(true)} style={{ marginTop: '1rem' }}>
              Unlock calculator
            </button>
          </section>
        ) : (
          <div id="app">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} className="noprint">
              <button 
                onClick={handleEHRPull} 
                disabled={loadingEHR}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {loadingEHR ? 'Pulling...' : '📥 Simulate EHR Pull (SMART on FHIR)'}
              </button>
            </div>
            <OpioidStackBuilder 
              stackRows={state.stackRows} 
              setStackRows={state.setStackRows} 
              totalOMEDD={state.totalOMEDD} 
              targetOpioid={state.targetOpioid}
              setTargetOpioid={state.setTargetOpioid}
            />
            <ModelSelector 
              totalOMEDD={state.totalOMEDD} 
              modelResults={state.modelResults} 
              selectedModelId={state.selectedModelId} 
              setSelectedModelId={state.setSelectedModelId} 
              safetyCut={state.safetyCut} 
              setSafetyCut={state.setSafetyCut} 
              selectedModelResult={state.selectedModelResult} 
            />
            <QtcChecklist 
              qtc={state.qtc} 
              setQtc={state.setQtc} 
              riskFactors={state.riskFactors} 
              setRiskFactors={state.setRiskFactors} 
              plannedTDD={state.selectedModelResult?.res.tddAdj ?? null} 
            />
            <ScheduleOutput 
              totalOMEDD={state.totalOMEDD}
              strategy={state.strategy}
              setStrategy={state.setStrategy}
              qtc={state.qtc}
              specialistOverride={state.specialistOverride}
              setSpecialistOverride={state.setSpecialistOverride}
              selectedModelResult={state.selectedModelResult}
            />
            
            <TitrationDashboard 
              scheduledTDD={state.selectedModelResult?.res.tddAdj ?? null} 
              strategy={state.strategy} 
            />

            <section className="card refs noprint">
              <h2>Evidence base &amp; references</h2>
              <ul>
                <li>Ripamonti C, et al. Switching from morphine to oral methadone in treating cancer pain: what is the equianalgesic dose ratio? <em>J Clin Oncol</em> 1998;16:3216–21.</li>
                <li>Ayonrinde OT, Bridge DT. The rediscovery of methadone for cancer pain management. <em>Med J Aust</em> 2000;173:536–40.</li>
                <li>Mercadante S, et al. Switching from morphine to methadone to improve analgesia and tolerability in cancer patients. <em>J Clin Oncol</em> 2001;19:2898–904.</li>
                <li>Morley J, Makin M. The use of methadone in cancer pain poorly responsive to other opioids. <em>Pain Rev</em> 1998;5:51–8.</li>
                <li>Bruera E, et al. / Edmonton protocol 3-day rotation; summarised in Palat G, et al. Practical guide for using methadone in pain and palliative care practice. <em>Indian J Palliat Care</em> 2018.</li>
                <li>Chou R, et al. Methadone safety: a clinical practice guideline. <em>J Pain</em> 2014;15:321–37.</li>
                <li>McPherson ML. <em>Demystifying Opioid Conversion Calculations</em>, 2nd ed. ASHP, 2018.</li>
                <li>Parsons HA, et al. A review of common methods to convert morphine to methadone. <em>Can J Hosp Pharm</em> 2012;65(5):355–61 (PMC3715153).</li>
              </ul>
              <p className="text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                MME conversion factors: CDC guideline conversion factors (morphine PO 1; oxycodone PO 1.5; hydromorphone PO 4;
                codeine 0.15; tramadol 0.1; tapentadol 0.4; fentanyl patch mcg/h × 2.4; buprenorphine patch mcg/h × 12.6;
                morphine IV/SC × 3; hydromorphone IV/SC × 20; fentanyl IV infusion mcg/h × 7.2). Local formularies (e.g. ANZCA) may differ —
                verify against your own institution's table before prescribing.
              </p>
            </section>
          </div>
        )}
      </main>

      <footer className="noprint" style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--ink-tertiary)', fontSize: '0.75rem' }}>
        AMORM is free and open-source clinical decision support. No patient data leaves this page — all computation happens locally in your browser.
        It is not a medical device and is not a substitute for clinical judgement.
      </footer>
    </>
  );
}

export default App;
