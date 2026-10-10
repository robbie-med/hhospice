import React from 'react';
import { fmt, roundMeth } from '../data/constants';
import { Alert } from './Alert';
import { isQtcBlocked, MODELS } from '../data/constants';

interface Props {
  totalOMEDD: number;
  strategy: string;
  setStrategy: (val: string) => void;
  qtc: string;
  specialistOverride: boolean;
  setSpecialistOverride: (val: boolean) => void;
  selectedModelResult: any;
}

export const ScheduleOutput: React.FC<Props> = ({
  totalOMEDD,
  strategy,
  setStrategy,
  qtc,
  specialistOverride,
  setSpecialistOverride,
  selectedModelResult
}) => {

  const renderSchedule = () => {
    if (totalOMEDD <= 0) {
      return (
        <Alert type="warning">
          <strong>Enter the opioid stack in Step 1 first.</strong>
        </Alert>
      );
    }

    if (isQtcBlocked(qtc) && !specialistOverride) {
      return (
        <>
          <Alert type="danger" title="Schedule generation blocked: baseline QTc > 500 ms.">
            Methadone initiation above this threshold carries a serious risk of torsades de pointes.
            This tool will not generate a regimen unless you confirm specialist supervision.
          </Alert>
          <label className="check noprint">
            <input 
              type="checkbox" 
              checked={specialistOverride} 
              onChange={e => setSpecialistOverride(e.target.checked)} 
            />
            <span>A palliative care / pain specialist is supervising this rotation and I accept responsibility for proceeding despite QTc &gt; 500 ms.</span>
          </label>
        </>
      );
    }

    const sel = selectedModelResult;
    if (!sel) return null;
    const { mod, res } = sel;

    // Fixed PRN models
    if (res.prn) {
      return renderFixedProtocol(mod.id, res.prn);
    }
    
    // Fallback to Morley PRN if selected strategy is PRN but a ratio model was chosen
    if (strategy === "prn") {
      const morleyModel = MODELS.find(x => x.id === "morley")!;
      return renderFixedProtocol("morley", morleyModel.calc(totalOMEDD).prn!);
    }

    const tdd = res.tddAdj!;
    const perDose = roundMeth(tdd / 3);
    const btdd = roundMeth(tdd * 0.1);
    const load = strategy === "rapid" && mod.id === "ayonrinde" ? roundMeth(tdd * 0.375) : null;

    let rows: React.ReactNode;
    if (strategy === "gradual") {
      rows = (
        <>
          <SchedRow day="Day 1" prev={`≈ ⅔ of current regimen (${fmt(totalOMEDD * 2 / 3)} mg oMEDD)`} meth={`${fmt(roundMeth(tdd / 9))} mg q8h (⅓ of target = ${fmt(tdd / 3)} mg/day)`} bt={btdd} />
          <SchedRow day="Day 2" prev={`≈ ⅓ of current regimen (${fmt(totalOMEDD / 3)} mg oMEDD)`} meth={`${fmt(roundMeth(tdd * 2 / 9))} mg q8h (⅔ of target = ${fmt(tdd * 2 / 3)} mg/day)`} bt={btdd} />
          <SchedRow day="Day 3" prev="Stop previous opioid" meth={`${fmt(perDose)} mg q8h (full target ${fmt(tdd)} mg/day)`} bt={btdd} />
          <SchedRow day="Day 4–7" prev="—" meth={`Hold at ${fmt(perDose)} mg q8h. Do NOT up-titrate before 72 h — methadone keeps accumulating until steady state (day 5–7).`} bt={btdd} />
          <SchedRow day="After day 7" prev="—" meth="Reassess: titrate in small increments (≤ 5–10 mg/day) no more often than every 5–7 days, guided by pain and breakthrough use." bt={btdd} />
        </>
      );
    } else {
      rows = (
        <>
          <SchedRow day="Day 1" prev="STOP previous opioid completely" meth={<>{fmt(perDose)} mg q8h ({fmt(tdd)} mg/day){load ? <br/> : null}{load ? `+ loading dose ${fmt(load)} mg once (Ayonrinde: 25–50% of TDD on days 1–2)` : ""}</>} bt={btdd} />
          <SchedRow day="Day 2" prev="—" meth={<>{fmt(perDose)} mg q8h{load ? <br/> : null}{load ? `+ optional second loading dose ${fmt(load)} mg` : ""}</>} bt={btdd} />
          <SchedRow day="Day 3–7" prev="—" meth="Hold. Do NOT up-titrate before 72 h; steady state only at day 5–7." bt={btdd} />
          <SchedRow day="After day 7" prev="—" meth="Reassess and titrate in small increments (≤ 5–10 mg/day) every 5–7 days as needed." bt={btdd} />
        </>
      );
    }

    return (
      <>
        <Alert type="warning">
          <strong>Verify before prescribing.</strong> Model: {mod.name} ({res.ratioLabel}). 
          Breakthrough = 10% of methadone TDD. All doses assume oral administration, normal organ function, and q8h scheduling — individualise.
        </Alert>
        
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Day</th>
                <th style={{ width: '26%' }}>Previous opioid</th>
                <th style={{ width: '34%' }}>Methadone (scheduled)</th>
                <th style={{ width: '14%' }}>Breakthrough</th>
                <th>Monitoring</th>
              </tr>
            </thead>
            <tbody>
              {rows}
            </tbody>
          </table>
        </div>

        <ul className="text-muted" style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.25rem' }}><strong>Monitoring, all days:</strong> sedation score and respiratory rate at least q4h while awake; methadone's analgesic half-life (6–8 h) is far shorter than its elimination half-life — accumulation sneaks up on days 2–5.</li>
          <li style={{ marginBottom: '0.25rem' }}><strong>Never chase day-1 pain with scheduled methadone increases</strong> — use breakthrough doses and reassess at 72 h.</li>
          <li style={{ marginBottom: '0.25rem' }}>Hold dose and reassess if: RR &lt; 8/min, difficult to rouse, or new confusion/hallucinations.</li>
          <li style={{ marginBottom: '0.25rem' }}>Transdermal fentanyl note: after patch removal, a subcutaneous reservoir continues releasing drug for 12–24 h — overlap is expected; do not mistake it for methadone excess.</li>
          <li style={{ marginBottom: '0.25rem' }}>Recheck ECG 2–4 weeks after initiation and after any major dose increase (more often if QTc risk factors present).</li>
        </ul>
      </>
    );
  };

  const renderFixedProtocol = (modelId: string, prn: any) => {
    const perDose = roundMeth(prn.dose);
    
    if (modelId === "edmonton") {
      return (
        <>
          <Alert type="warning" title="Edmonton 3-day protocol (Bruera).">
            Fixed PRN methadone on day 1 with a ⅓ reduction of the previous opioid; the day-1 total taken sets the scheduled dose for days 2–3. Requires meticulous PRN documentation.
          </Alert>
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Day</th>
                  <th style={{ width: '24%' }}>Previous opioid</th>
                  <th style={{ width: '36%' }}>Methadone</th>
                  <th style={{ width: '12%' }}>Breakthrough</th>
                  <th>Monitoring</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Day 1</strong></td>
                  <td>Reduce by ⅓ (≈ ⅔ of current regimen)</td>
                  <td className="text-mono">{fmt(perDose)} mg q4h PRN — no scheduled doses (max {fmt(prn.maxDay)} mg/24 h)</td>
                  <td className="text-mono">—</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>Record EVERY dose taken; sedation + RR q4h</td>
                </tr>
                <tr>
                  <td><strong>Day 2</strong></td>
                  <td>Reduce by another ⅓ (≈ ⅓ of current regimen)</td>
                  <td className="text-mono">Total methadone actually taken on day 1, divided q8h (e.g. 30 mg taken → 10 mg q8h)</td>
                  <td className="text-mono">≈ 10% of day-1 total q2–3h PRN</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>Continue dose diary</td>
                </tr>
                <tr>
                  <td><strong>Day 3</strong></td>
                  <td>Stop previous opioid</td>
                  <td className="text-mono">Continue day-2 schedule; adjust only if clearly under- or over-dosed</td>
                  <td className="text-mono">≈ 10% of TDD q2–3h PRN</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>Sedation + RR q4h</td>
                </tr>
                <tr>
                  <td><strong>Day 4–7</strong></td>
                  <td>—</td>
                  <td className="text-mono">Hold steady. No up-titration before 72 h; steady state at day 5–7</td>
                  <td className="text-mono">≈ 10% of TDD q2–3h PRN</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>Then reassess for titration</td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="text-muted" style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.25rem' }}>The fixed day-1 PRN dose here is tiered by oMEDD: 5 mg q4h PRN below 300 mg/day, 10 mg q4h PRN at or above 300 mg/day (max 5 doses/24 h). Some centres use lower starts in frail or elderly patients — individualise.</li>
            <li style={{ marginBottom: '0.25rem' }}>This protocol is deliberately demand-led: it trades precision for safety at high oMEDD where ratio models disagree.</li>
            <li style={{ marginBottom: '0.25rem' }}>ECG per Step-3 checklist; recheck 2–4 weeks after stabilisation.</li>
          </ul>
        </>
      );
    }

    return (
      <>
        <Alert type="warning" title="Morley–Makin fixed-PRN titration.">
          Best suited to inpatient use — it depends on meticulous PRN documentation for 5 days. The dose offered each time is 10% of the daily oMEDD, capped at 30 mg.
        </Alert>
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Day</th>
                <th style={{ width: '24%' }}>Previous opioid</th>
                <th style={{ width: '36%' }}>Methadone</th>
                <th style={{ width: '12%' }}>Breakthrough</th>
                <th>Monitoring</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map(d => (
                <tr key={d}>
                  <td><strong>Day {d}</strong></td>
                  <td>{d === 1 ? "STOP previous opioid completely" : "—"}</td>
                  <td className="text-mono">{fmt(perDose)} mg {prn.freq} (no scheduled doses; max theoretical {fmt(perDose * 8)} mg/day)</td>
                  <td className="text-mono">—</td>
                  <td className="text-muted" style={{ fontSize: '0.8rem' }}>Record EVERY administered dose — days 4–5 totals set the maintenance dose</td>
                </tr>
              ))}
              <tr>
                <td><strong>Day 6</strong></td>
                <td>—</td>
                <td className="text-mono">Maintenance = mean of actual day-4 and day-5 totals, divided BID (q12h)</td>
                <td className="text-mono">10% of new TDD q2–3h PRN</td>
                <td className="text-muted" style={{ fontSize: '0.8rem' }}>Then hold ≥ 72 h before any titration</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="text-muted" style={{ marginTop: '1rem', paddingLeft: '1.25rem' }}>
          <li style={{ marginBottom: '0.25rem' }}>This method self-titrates to the patient's real requirement, which is why it copes with very high oMEDD where ratio models diverge wildly.</li>
          <li style={{ marginBottom: '0.25rem' }}>If few PRN doses are taken on days 1–2, reassess whether the previous opioid was truly stopped and whether pain is being captured.</li>
          <li style={{ marginBottom: '0.25rem' }}>Same safety rules: sedation + RR q4h; no up-titration inside 72 h; ECG per checklist.</li>
        </ul>
      </>
    );
  };

  return (
    <section className="card">
      <h2><span className="step-badge">4</span> Cross-taper schedule</h2>
      <p className="text-muted">
        Strategy is independent of the conversion model. "3-day gradual" follows the Edmonton-style thirds taper;
        "rapid switch" is the stop-and-go approach; "Morley–Makin PRN" is the fixed-PRN titration method.
      </p>

      <label className="field" style={{ maxWidth: '340px' }}>
        <span>Switch strategy</span>
        <select value={strategy} onChange={e => setStrategy(e.target.value)}>
          <option value="gradual">3-day gradual cross-taper (Edmonton-style)</option>
          <option value="rapid">Rapid switch (stop-and-go, day 1)</option>
          <option value="prn">Morley–Makin fixed-PRN titration (5-day)</option>
        </select>
      </label>

      {renderSchedule()}

      <p className="noprint" style={{ marginTop: '1.5rem' }}>
        <button onClick={() => window.print()} className="secondary">🖨 Print schedule</button>
      </p>
    </section>
  );
};

const SchedRow = ({ day, prev, meth, bt }: { day: string, prev: string, meth: React.ReactNode, bt: number }) => (
  <tr>
    <td><strong>{day}</strong></td>
    <td>{prev}</td>
    <td className="text-mono">{meth}</td>
    <td className="text-mono">{fmt(bt)} mg q2–3h PRN</td>
    <td className="text-muted" style={{ fontSize: '0.8rem' }}>Sedation + RR q4h; pain score; breakthrough count</td>
  </tr>
);
