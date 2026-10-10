import React, { useState, useMemo } from 'react';

// MME factors: multiplier converting the drug's TOTAL DAILY dose to oral morphine mg/day.
const OPIOIDS = [
  { id: "mor_po",  label: "Morphine — oral (mg/dose)",              kind: "dose",  factor: 1,    factorText: "× 1 (reference)" },
  { id: "mor_iv",  label: "Morphine — IV/SC (mg/dose)",             kind: "dose",  factor: 3,    factorText: "× 3 (IV→PO)" },
  { id: "oxy_po",  label: "Oxycodone — oral (mg/dose)",             kind: "dose",  factor: 1.5,  factorText: "× 1.5" },
  { id: "hyd_po",  label: "Hydromorphone — oral (mg/dose)",         kind: "dose",  factor: 4,    factorText: "× 4" },
  { id: "hyd_iv",  label: "Hydromorphone — IV/SC (mg/dose)",        kind: "dose",  factor: 20,   factorText: "× 20 (IV→PO)" },
  { id: "cod_po",  label: "Codeine — oral (mg/dose)",               kind: "dose",  factor: 0.15, factorText: "× 0.15" },
  { id: "tra_po",  label: "Tramadol — oral (mg/dose)",              kind: "dose",  factor: 0.1,  factorText: "× 0.1" },
  { id: "tap_po",  label: "Tapentadol — oral (mg/dose)",            kind: "dose",  factor: 0.4,  factorText: "× 0.4" },
  { id: "fen_td",  label: "Fentanyl — transdermal patch (mcg/h)",   kind: "patch", factor: 2.4,  factorText: "mcg/h × 2.4" },
  { id: "fen_iv",  label: "Fentanyl — IV infusion (mcg/h)",         kind: "patch", factor: 7.2,  factorText: "mcg/h × 7.2 (≈100 mcg IV ≈ 30 mg PO morphine)" },
  { id: "bup_td",  label: "Buprenorphine — transdermal (mcg/h)",    kind: "patch", factor: 12.6, factorText: "mcg/h × 12.6" }
];

const FREQS = [
  { v: 6,   label: "q4h (6×/day)" },
  { v: 4,   label: "q6h (4×/day)" },
  { v: 3,   label: "q8h (3×/day)" },
  { v: 2,   label: "q12h (2×/day)" },
  { v: 1,   label: "Once daily" }
];

function fmt(n, dp) {
  if (n == null || isNaN(n)) return "—";
  const d = dp != null ? dp : (n < 10 ? 1 : 0);
  return Number(n.toFixed(d)).toString();
}

function roundMeth(n) {
  return Math.max(0.5, Math.round(n * 2) / 2);
}

const MODELS = [
  {
    id: "edmonton", name: "Edmonton (3-day fixed protocol)",
    calc(m) {
      const perDose = m >= 300 ? 10 : 5;
      return {
        ratioLabel: "Fixed protocol (not ratio-based)",
        tdd: null,
        prn: { dose: perDose, freq: "q4h PRN", maxDay: perDose * 5 },
        note: `Day 1: reduce prior opioid by ⅓; methadone ${perDose} mg q4h PRN (max ${perDose*5} mg/day). Days 2–3 are built from actual day-1 use (see schedule).`
      };
    }
  },
  {
    id: "ripamonti", name: "Ripamonti 1998",
    calc(m) {
      let r;
      if (m < 30)       r = { ratio: 2,  tier: "< 30 mg → 2:1 (extrapolated — model validated only ≥ 30 mg; use great caution)" };
      else if (m < 90)  r = { ratio: 4,  tier: "30–90 mg → 4:1" };
      else if (m < 300) r = { ratio: 6,  tier: "90–300 mg → 6:1" };
      else              r = { ratio: 8,  tier: "> 300 mg → 8:1" };
      return { ratioLabel: r.tier, tdd: m / r.ratio,
        note: "Prospective cancer-pain study; achieved median ratios after switch were 3.7 / 7.75 / 12.25 : 1. Caution near tier cut-points." };
    }
  },
  {
    id: "ayonrinde", name: "Ayonrinde & Bridge 2000",
    calc(m) {
      let ratio, tier;
      if (m <= 100)       { ratio = 3;  tier = "≤ 100 mg → 3:1"; }
      else if (m <= 300)  { ratio = 5;  tier = "101–300 mg → 5:1"; }
      else if (m <= 600)  { ratio = 10; tier = "301–600 mg → 10:1"; }
      else if (m <= 800)  { ratio = 12; tier = "601–800 mg → 12:1"; }
      else if (m <= 1000) { ratio = 15; tier = "801–1000 mg → 15:1"; }
      else                { ratio = 20; tier = "> 1000 mg → 20:1"; }
      return { ratioLabel: tier, tdd: m / ratio,
        note: "Includes optional loading dose of 25–50% of TDD on days 1–2. Most aggressive model at low oMEDD, among the most conservative > 1000 mg." };
    }
  },
  {
    id: "mercadante", name: "Mercadante 2001",
    calc(m) {
      let r;
      if (m < 30)       r = { ratio: 2,  tier: "< 30 mg → 2:1 (extrapolated; caution)" };
      else if (m < 90)  r = { ratio: 4,  tier: "30–90 mg → 4:1" };
      else if (m < 300) r = { ratio: 8,  tier: "90–300 mg → 8:1" };
      else              r = { ratio: 12, tier: "> 300 mg → 12:1" };
      return { ratioLabel: r.tier, tdd: m / r.ratio,
        note: "More conservative than Ripamonti above 90 mg/day." };
    }
  },
  {
    id: "morley", name: "Morley–Makin 1998",
    calc(m) {
      const perDose = Math.min(m * 0.1, 30);
      return {
        ratioLabel: "Fixed PRN: 10% of oMEDD (max 30 mg)",
        tdd: null,
        prn: { dose: perDose, freq: "q3h PRN", maxDay: perDose * 8 },
        note: `Stop prior opioid. Offer ${fmt(perDose)} mg q3h PRN for 5 days; day-6 maintenance = mean of days 4–5 actual use, given BID. Resource-intensive; best suited to inpatient settings.`
      };
    }
  }
];

const RISK_FACTORS = [
  { id: "rfFemale", w: 2, label: "Female sex" },
  { id: "rfAge", w: 2, label: "Age > 65 years" },
  { id: "rfCongenital", w: 2, label: "Known congenital long-QT syndrome or family history of sudden death < 40 y" },
  { id: "rfSyncope", w: 2, label: "Prior syncope / documented torsades or ventricular arrhythmia" },
  { id: "rfStructural", w: 1, label: "Structural heart disease, heart failure, or LVH" },
  { id: "rfElectrolyte", w: 2, label: "Electrolyte disturbance (K⁺ low, Mg²⁺ low, Ca²⁺ low) or active vomiting/diarrhoea" },
  { id: "rfBrady", w: 1, label: "Bradycardia (< 50 bpm)" },
  { id: "rfDrugs", w: 2, label: "Concurrent QTc-prolonging drugs (e.g. haloperidol, ondansetron, TCAs, quetiapine, macrolides, azole antifungals, amiodarone)" },
  { id: "rfCYP", w: 1, label: "CYP3A4 / CYP2B6 inhibitors or inducers (fluconazole, clarithromycin, carbamazepine, some ART) — alters methadone levels" },
  { id: "rfOrgan", w: 1, label: "Hepatic or renal impairment" },
  { id: "rfSedative", w: 1, label: "Concomitant benzodiazepines, gabapentinoids or other sedatives (respiratory risk)" }
];

export default function Amorm() {
  const [gateAck, setGateAck] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [stackRows, setStackRows] = useState([{ id: Date.now(), opioid: "mor_po", dose: "", freq: 3 }]);
  const [selectedModelId, setSelectedModelId] = useState("ripamonti");
  const [safetyCut, setSafetyCut] = useState(0.25);
  const [qtc, setQtc] = useState("");
  const [riskFactors, setRiskFactors] = useState({});
  const [strategy, setStrategy] = useState("gradual");
  const [specialistOverride, setSpecialistOverride] = useState(false);

  // Stack Logic
  const addStackRow = () => {
    setStackRows([...stackRows, { id: Date.now(), opioid: "mor_po", dose: "", freq: 3 }]);
  };

  const removeStackRow = (id) => {
    setStackRows(stackRows.filter(r => r.id !== id));
  };

  const updateStackRow = (id, field, value) => {
    setStackRows(stackRows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const rowMME = (row) => {
    const o = OPIOIDS.find(x => x.id === row.opioid);
    const dose = parseFloat(row.dose);
    if (!o || isNaN(dose) || dose <= 0) return 0;
    return o.kind === "patch" ? dose * o.factor : dose * row.freq * o.factor;
  };

  const totalOMEDD = useMemo(() => {
    return stackRows.reduce((s, r) => s + rowMME(r), 0);
  }, [stackRows]);

  // Model Logic
  const modelResults = useMemo(() => {
    const m = totalOMEDD;
    return MODELS.map(mod => {
      const res = mod.calc(m);
      if (res.tdd != null) res.tddAdj = res.tdd * (1 - safetyCut);
      return { mod, res };
    });
  }, [totalOMEDD, safetyCut]);

  const selectedModelData = modelResults.find(x => x.mod.id === selectedModelId);

  // QTc Logic
  const qtcAssessment = useMemo(() => {
    const plannedTDD = selectedModelData?.res?.tddAdj;
    let pts = 0;
    RISK_FACTORS.forEach(rf => {
      if (riskFactors[rf.id]) pts += rf.w;
    });
    if (plannedTDD != null && plannedTDD > 100) pts += 2;

    const qtcVal = parseFloat(qtc);
    let level, cls, msgs = [];
    
    if (!isNaN(qtcVal) && qtcVal > 500) {
      level = "Contraindicated"; cls = "high";
      msgs.push("Baseline QTc > 500 ms: methadone should generally be avoided or discontinued. Consider alternative opioids; if methadone is truly unavoidable, only under specialist supervision with cardiology input and ECG monitoring.");
    } else if (!isNaN(qtcVal) && qtcVal > 450) {
      pts += 2;
      msgs.push("Baseline QTc 450–500 ms: proceed only with caution, ECG follow-up, and correction of all modifiable factors.");
    }

    if (!level) {
      if (pts >= 5)      { level = "High risk"; cls = "high"; }
      else if (pts >= 2) { level = "Moderate risk"; cls = "mod"; }
      else               { level = "Low risk"; cls = "low"; }
    }

    if (plannedTDD != null && plannedTDD > 100) {
      msgs.push("Planned methadone dose > 100 mg/day is independently associated with torsades risk — Chou 2014 recommends ECG monitoring at this threshold.");
    }
    if (pts > 0 && cls !== "high") {
      msgs.push("Correct modifiable factors first: replete K⁺ > 4.0 mmol/L and Mg²⁺ > 0.85 mmol/L, review the QTc-prolonging medication list, and obtain a baseline ECG if not already done.");
    }
    msgs.push("ECG plan (Chou 2014): baseline ECG for all patients with known risk factors; repeat ~2–4 weeks after initiation and after significant dose escalation; act on QTc > 500 ms.");
    
    return { level, cls, msgs, blocked: (!isNaN(qtcVal) && qtcVal > 500) };
  }, [selectedModelData, riskFactors, qtc]);

  const toggleRiskFactor = (id) => {
    setRiskFactors(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderScheduleContent = () => {
    if (totalOMEDD <= 0) return null;
    
    if (qtcAssessment.blocked && !specialistOverride) {
      return (
        <div className="glass-card mt-4 p-4 text-red-800 bg-red-100 border border-red-300 rounded">
          <strong>Schedule generation blocked: baseline QTc &gt; 500 ms.</strong><br/>
          Methadone initiation above this threshold carries a serious risk of torsades de pointes.
          This tool will not generate a regimen unless you confirm specialist supervision.
          <label className="flex items-start gap-2 mt-4 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={specialistOverride} onChange={(e) => setSpecialistOverride(e.target.checked)} className="mt-1" />
            <span>A palliative care / pain specialist is supervising this rotation and I accept responsibility for proceeding despite QTc &gt; 500 ms.</span>
          </label>
        </div>
      );
    }

    const res = selectedModelData.res;
    
    if (res.prn) return renderFixedProtocol(selectedModelData.mod.id, res.prn);
    if (strategy === "prn") return renderFixedProtocol("morley", MODELS.find(x => x.id === "morley").calc(totalOMEDD).prn);

    const tdd = res.tddAdj;
    const perDose = roundMeth(tdd / 3);
    const btdd = roundMeth(tdd * 0.1);
    const load = strategy === "rapid" && selectedModelId === "ayonrinde" ? roundMeth(tdd * 0.375) : null;

    let rows = [];
    if (strategy === "gradual") {
      rows.push(
        { day: "Day 1", prev: `≈ ⅔ of current regimen (${fmt(totalOMEDD * 2 / 3)} mg oMEDD)`, meth: `${fmt(roundMeth(tdd / 9))} mg q8h (⅓ of target = ${fmt(tdd / 3)} mg/day)`, bt: btdd },
        { day: "Day 2", prev: `≈ ⅓ of current regimen (${fmt(totalOMEDD / 3)} mg oMEDD)`, meth: `${fmt(roundMeth(tdd * 2 / 9))} mg q8h (⅔ of target = ${fmt(tdd * 2 / 3)} mg/day)`, bt: btdd },
        { day: "Day 3", prev: "Stop previous opioid", meth: `${fmt(perDose)} mg q8h (full target ${fmt(tdd)} mg/day)`, bt: btdd },
        { day: "Day 4–7", prev: "—", meth: `Hold at ${fmt(perDose)} mg q8h. Do NOT up-titrate before 72 h — methadone keeps accumulating until steady state (day 5–7).`, bt: btdd },
        { day: "After day 7", prev: "—", meth: `Reassess: titrate in small increments (≤ 5–10 mg/day) no more often than every 5–7 days, guided by pain and breakthrough use.`, bt: btdd }
      );
    } else {
      rows.push(
        { day: "Day 1", prev: "STOP previous opioid completely", meth: <>{fmt(perDose)} mg q8h ({fmt(tdd)} mg/day){load && <><br/>+ loading dose {fmt(load)} mg once (Ayonrinde: 25–50% of TDD on days 1–2)</>}</>, bt: btdd },
        { day: "Day 2", prev: "—", meth: <>{fmt(perDose)} mg q8h{load && <><br/>+ optional second loading dose {fmt(load)} mg</>}</>, bt: btdd },
        { day: "Day 3–7", prev: "—", meth: "Hold. Do NOT up-titrate before 72 h; steady state only at day 5–7.", bt: btdd },
        { day: "After day 7", prev: "—", meth: "Reassess and titrate in small increments (≤ 5–10 mg/day) every 5–7 days as needed.", bt: btdd }
      );
    }

    return (
      <div className="mt-6">
        <div className="glass-card p-4 mb-4 text-orange-800 bg-orange-100 border border-orange-300 rounded text-sm">
          <strong>Verify before prescribing.</strong> Model: {selectedModelData.mod.name} ({res.ratioLabel}). Safety reduction applied: {safetyCut * 100}%. 
          Breakthrough = 10% of methadone TDD. All doses assume oral administration, normal organ function, and q8h scheduling — individualise.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="border border-gray-300 p-2 w-[12%]">Day</th>
                <th className="border border-gray-300 p-2 w-[26%]">Previous opioid</th>
                <th className="border border-gray-300 p-2 w-[34%]">Methadone (scheduled)</th>
                <th className="border border-gray-300 p-2 w-[14%]">Breakthrough</th>
                <th className="border border-gray-300 p-2">Monitoring</th>
              </tr>
            </thead>
            <tbody className="text-sm align-top">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 p-2 font-bold">{r.day}</td>
                  <td className="border border-gray-300 p-2">{r.prev}</td>
                  <td className="border border-gray-300 p-2 font-mono text-[0.9em]">{r.meth}</td>
                  <td className="border border-gray-300 p-2 font-mono text-[0.9em]">{fmt(r.bt)} mg q2–3h PRN</td>
                  <td className="border border-gray-300 p-2 text-gray-500 text-xs">Sedation + RR q4h; pain score; breakthrough count</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 mt-4 text-sm space-y-1">
          <li><strong>Monitoring, all days:</strong> sedation score and respiratory rate at least q4h while awake; methadone's analgesic half-life (6–8 h) is far shorter than its elimination half-life — accumulation sneaks up on days 2–5.</li>
          <li><strong>Never chase day-1 pain with scheduled methadone increases</strong> — use breakthrough doses and reassess at 72 h.</li>
          <li>Hold dose and reassess if: RR &lt; 8/min, difficult to rouse, or new confusion/hallucinations.</li>
          <li>Transdermal fentanyl note: after patch removal, a subcutaneous reservoir continues releasing drug for 12–24 h — overlap is expected; do not mistake it for methadone excess.</li>
          <li>Recheck ECG 2–4 weeks after initiation and after any major dose increase (more often if QTc risk factors present).</li>
        </ul>
      </div>
    );
  };

  const renderFixedProtocol = (modelId, prn) => {
    const perDose = roundMeth(prn.dose);
    
    if (modelId === "edmonton") {
      return (
        <div className="mt-6">
          <div className="glass-card p-4 mb-4 text-orange-800 bg-orange-100 border border-orange-300 rounded text-sm">
            <strong>Edmonton 3-day protocol (Bruera).</strong> Fixed PRN methadone on day 1 with a ⅓ reduction of the previous opioid; the day-1 total taken sets the scheduled dose for days 2–3. Requires meticulous PRN documentation.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-200">
              <thead className="bg-gray-100 text-sm">
                <tr>
                  <th className="border border-gray-300 p-2 w-[12%]">Day</th>
                  <th className="border border-gray-300 p-2 w-[24%]">Previous opioid</th>
                  <th className="border border-gray-300 p-2 w-[36%]">Methadone</th>
                  <th className="border border-gray-300 p-2 w-[12%]">Breakthrough</th>
                  <th className="border border-gray-300 p-2">Monitoring</th>
                </tr>
              </thead>
              <tbody className="text-sm align-top">
                <tr><td className="border border-gray-300 p-2 font-bold">Day 1</td><td className="border border-gray-300 p-2">Reduce by ⅓ (≈ ⅔ of current regimen)</td><td className="border border-gray-300 p-2 font-mono">{fmt(perDose)} mg q4h PRN — no scheduled doses (max {fmt(prn.maxDay)} mg/24 h)</td><td className="border border-gray-300 p-2 font-mono">—</td><td className="border border-gray-300 p-2 text-gray-500 text-xs">Record EVERY dose taken; sedation + RR q4h</td></tr>
                <tr><td className="border border-gray-300 p-2 font-bold">Day 2</td><td className="border border-gray-300 p-2">Reduce by another ⅓ (≈ ⅓ of current regimen)</td><td className="border border-gray-300 p-2 font-mono">Total methadone actually taken on day 1, divided q8h (e.g. 30 mg taken → 10 mg q8h)</td><td className="border border-gray-300 p-2 font-mono">≈ 10% of day-1 total q2–3h PRN</td><td className="border border-gray-300 p-2 text-gray-500 text-xs">Continue dose diary</td></tr>
                <tr><td className="border border-gray-300 p-2 font-bold">Day 3</td><td className="border border-gray-300 p-2">Stop previous opioid</td><td className="border border-gray-300 p-2 font-mono">Continue day-2 schedule; adjust only if clearly under- or over-dosed</td><td className="border border-gray-300 p-2 font-mono">≈ 10% of TDD q2–3h PRN</td><td className="border border-gray-300 p-2 text-gray-500 text-xs">Sedation + RR q4h</td></tr>
                <tr><td className="border border-gray-300 p-2 font-bold">Day 4–7</td><td className="border border-gray-300 p-2">—</td><td className="border border-gray-300 p-2 font-mono">Hold steady. No up-titration before 72 h; steady state at day 5–7</td><td className="border border-gray-300 p-2 font-mono">≈ 10% of TDD q2–3h PRN</td><td className="border border-gray-300 p-2 text-gray-500 text-xs">Then reassess for titration</td></tr>
              </tbody>
            </table>
          </div>
          <ul className="list-disc pl-5 mt-4 text-sm space-y-1">
            <li>The fixed day-1 PRN dose here is tiered by oMEDD: 5 mg q4h PRN below 300 mg/day, 10 mg q4h PRN at or above 300 mg/day (max 5 doses/24 h). Some centres use lower starts in frail or elderly patients — individualise.</li>
            <li>This protocol is deliberately demand-led: it trades precision for safety at high oMEDD where ratio models disagree.</li>
            <li>ECG per Step-3 checklist; recheck 2–4 weeks after stabilisation.</li>
          </ul>
        </div>
      );
    }

    let rows = [];
    for (let d = 1; d <= 5; d++) {
      rows.push(
        <tr key={d}>
          <td className="border border-gray-300 p-2 font-bold">Day {d}</td>
          <td className="border border-gray-300 p-2">{d === 1 ? "STOP previous opioid completely" : "—"}</td>
          <td className="border border-gray-300 p-2 font-mono">{fmt(perDose)} mg {prn.freq} (no scheduled doses; max theoretical {fmt(perDose * 8)} mg/day)</td>
          <td className="border border-gray-300 p-2 font-mono">—</td>
          <td className="border border-gray-300 p-2 text-gray-500 text-xs">Record EVERY administered dose — days 4–5 totals set the maintenance dose</td>
        </tr>
      );
    }
    rows.push(
      <tr key={6}>
        <td className="border border-gray-300 p-2 font-bold">Day 6</td>
        <td className="border border-gray-300 p-2">—</td>
        <td className="border border-gray-300 p-2 font-mono">Maintenance = mean of actual day-4 and day-5 totals, divided BID (q12h)</td>
        <td className="border border-gray-300 p-2 font-mono">10% of new TDD q2–3h PRN</td>
        <td className="border border-gray-300 p-2 text-gray-500 text-xs">Then hold ≥ 72 h before any titration</td>
      </tr>
    );

    return (
      <div className="mt-6">
        <div className="glass-card p-4 mb-4 text-orange-800 bg-orange-100 border border-orange-300 rounded text-sm">
          <strong>Morley–Makin fixed-PRN titration.</strong> Best suited to inpatient use — it depends on meticulous PRN documentation for 5 days. The dose offered each time is 10% of the daily oMEDD, capped at 30 mg.
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-gray-200">
            <thead className="bg-gray-100 text-sm">
              <tr>
                <th className="border border-gray-300 p-2 w-[12%]">Day</th>
                <th className="border border-gray-300 p-2 w-[24%]">Previous opioid</th>
                <th className="border border-gray-300 p-2 w-[36%]">Methadone</th>
                <th className="border border-gray-300 p-2 w-[12%]">Breakthrough</th>
                <th className="border border-gray-300 p-2">Monitoring</th>
              </tr>
            </thead>
            <tbody className="text-sm align-top">
              {rows}
            </tbody>
          </table>
        </div>
        <ul className="list-disc pl-5 mt-4 text-sm space-y-1">
          <li>This method self-titrates to the patient's real requirement, which is why it copes with very high oMEDD where ratio models diverge wildly.</li>
          <li>If few PRN doses are taken on days 1–2, reassess whether the previous opioid was truly stopped and whether pain is being captured.</li>
          <li>Same safety rules: sedation + RR q4h; no up-titration inside 72 h; ECG per checklist.</li>
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 pb-16">
      <header className="bg-[#0b5d6b] text-white p-6 rounded-t-lg mb-6 shadow">
        <h1 className="text-2xl font-bold m-0">AMORM — Assisted Methadone Opioid Rotation Module</h1>
        <p className="mt-2 text-sm opacity-90">Evidence-based methadone rotation: opioid stack → oMEDD → conversion models → cross-taper schedule with QTc screening.</p>
      </header>

      {!unlocked ? (
        <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
          <div className="p-4 mb-4 rounded bg-red-50 border border-red-300 text-red-900 text-sm">
            <strong className="block mb-1">⚠ Clinical decision support — not a prescribing tool</strong>
            Methadone has a long, variable half-life (8–59 h), non-linear equianalgesic ratios, and a real risk of delayed respiratory
            depression and QTc prolongation / torsades de pointes. Published conversion models can diverge by a factor of 3 or more at
            high oMEDD. Every output of this tool must be independently verified and individualised by a prescriber experienced in
            methadone initiation. This tool does not replace specialist palliative care / pain consultation, and says nothing about
            whether methadone is appropriate for a given patient.
          </div>
          <label className="flex items-start gap-2 mb-4 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              checked={gateAck} 
              onChange={(e) => setGateAck(e.target.checked)}
              className="mt-1"
            />
            <span>I am a qualified clinician. I understand the above, and I will independently verify all doses before prescribing.</span>
          </label>
          <button 
            disabled={!gateAck}
            onClick={() => setUnlocked(true)}
            className={`btn-primary px-4 py-2 rounded font-medium text-white ${gateAck ? 'bg-[#0b5d6b] hover:bg-[#0a4b57]' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Unlock calculator
          </button>
        </section>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: OPIOID STACK */}
          <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h2 className="text-[#0b5d6b] text-lg font-semibold mb-2 flex items-center">
              <span className="inline-flex items-center justify-center bg-[#0b5d6b] text-white rounded-full w-6 h-6 text-sm mr-2">1</span>
              Current opioid stack → oral morphine equivalent daily dose (oMEDD)
            </h2>
            <p className="text-gray-600 text-sm mb-4">Add every scheduled opioid the patient currently takes (do not include breakthrough-only use here).
            Conversion factors follow CDC MME / standard equianalgesic tables and are shown per row for transparency.</p>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left border-collapse border border-gray-200">
                <thead className="bg-gray-100 text-sm">
                  <tr>
                    <th className="border border-gray-300 p-2 w-[26%]">Opioid / route</th>
                    <th className="border border-gray-300 p-2 w-[16%]">Dose</th>
                    <th className="border border-gray-300 p-2 w-[18%]">Frequency</th>
                    <th className="border border-gray-300 p-2 w-[22%]">Factor</th>
                    <th className="border border-gray-300 p-2 w-[12%]">MME/day</th>
                    <th className="border border-gray-300 p-2 w-[6%]"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {stackRows.map((row) => {
                    const o = OPIOIDS.find(x => x.id === row.opioid);
                    return (
                      <tr key={row.id}>
                        <td className="border border-gray-300 p-2">
                          <select className="input-field w-full p-1 border rounded" value={row.opioid} onChange={e => updateStackRow(row.id, 'opioid', e.target.value)}>
                            {OPIOIDS.map(op => <option key={op.id} value={op.id}>{op.label}</option>)}
                          </select>
                        </td>
                        <td className="border border-gray-300 p-2">
                          <input type="number" min="0" step="any" className="input-field w-full p-1 border rounded" placeholder={o.kind === "patch" ? "mcg/h" : "mg per dose"} value={row.dose} onChange={e => updateStackRow(row.id, 'dose', e.target.value)} />
                        </td>
                        <td className="border border-gray-300 p-2">
                          {o.kind === "patch" ? (
                            <span className="text-gray-500">continuous</span>
                          ) : (
                            <select className="input-field w-full p-1 border rounded" value={row.freq} onChange={e => updateStackRow(row.id, 'freq', parseInt(e.target.value))}>
                              {FREQS.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="border border-gray-300 p-2 text-gray-500 text-xs">{o.factorText}</td>
                        <td className="border border-gray-300 p-2 font-mono">{fmt(rowMME(row))}</td>
                        <td className="border border-gray-300 p-2 text-center">
                          <button className="text-gray-500 hover:text-red-500 px-2 py-1" onClick={() => removeStackRow(row.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <button className="btn-secondary text-[#0b5d6b] bg-white border border-[#0b5d6b] rounded px-3 py-1 text-sm hover:bg-gray-50 mb-4" onClick={addStackRow}>
              + Add opioid
            </button>
            
            <p className="text-lg">Total <strong>oMEDD</strong>: <span className="font-mono font-bold text-2xl text-[#0b5d6b]">{fmt(totalOMEDD)}</span> mg oral morphine / day</p>
            
            {totalOMEDD > 300 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-300 text-orange-900 rounded text-sm">
                <strong className="block mb-1">High-dose territory (&gt; 300 mg/day)</strong>
                All conversion models become markedly more conservative and diverge widely here. Specialist supervision is strongly advised.
              </div>
            )}
          </section>

          {/* STEP 2: MODEL SELECTION */}
          <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h2 className="text-[#0b5d6b] text-lg font-semibold mb-2 flex items-center">
              <span className="inline-flex items-center justify-center bg-[#0b5d6b] text-white rounded-full w-6 h-6 text-sm mr-2">2</span>
              Conversion model
            </h2>
            <p className="text-gray-600 text-sm mb-4">All models below are applied to the oMEDD from Step 1. The comparison table shows how much the published
            models disagree — at high oMEDD this divergence is itself the key safety information. Choose one model to drive the schedule.</p>
            
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-left border-collapse border border-gray-200">
                <thead className="bg-gray-100 text-sm">
                  <tr>
                    <th className="border border-gray-300 p-2 w-[4%]"></th>
                    <th className="border border-gray-300 p-2 w-[20%]">Model</th>
                    <th className="border border-gray-300 p-2 w-[26%]">Ratio at this oMEDD</th>
                    <th className="border border-gray-300 p-2 w-[16%]">Methadone TDD</th>
                    <th className="border border-gray-300 p-2 w-[34%]">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-sm align-top">
                  {modelResults.map(({ mod, res }) => (
                    <tr key={mod.id}>
                      <td className="border border-gray-300 p-2 text-center">
                        <input type="radio" name="model" value={mod.id} checked={selectedModelId === mod.id} onChange={(e) => setSelectedModelId(e.target.value)} />
                      </td>
                      <td className="border border-gray-300 p-2 font-medium">{mod.name}</td>
                      <td className="border border-gray-300 p-2 text-[0.84rem]">{res.ratioLabel}</td>
                      <td className="border border-gray-300 p-2">
                        {res.tdd != null ? (
                          <>
                            <span className="font-mono">{fmt(res.tddAdj)} mg/day</span>
                            {Math.abs(res.tddAdj - res.tdd) > 0.01 && (
                              <><br/><span className="text-gray-500 text-xs">({fmt(res.tdd)} mg before safety reduction)</span></>
                            )}
                          </>
                        ) : (
                          <span className="font-mono">{fmt(res.prn.dose)} mg {res.prn.freq}</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-gray-500 text-xs">{res.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-700">Additional safety reduction for incomplete cross-tolerance</label>
              <select className="input-field border p-2 rounded w-full max-w-sm" value={safetyCut} onChange={(e) => setSafetyCut(parseFloat(e.target.value))}>
                <option value="0.25">Reduce by 25% (recommended default)</option>
                <option value="0">None — use model output as-is</option>
                <option value="0.5">Reduce by 50% (frail / elderly / high risk)</option>
              </select>
            </div>

            <div className="mt-4">
              {totalOMEDD <= 0 ? (
                <div className="p-3 bg-orange-50 border border-orange-300 text-orange-900 rounded text-sm">
                  <strong>No opioid stack entered</strong> Add the patient's current opioids in Step 1.
                </div>
              ) : selectedModelData.res.tdd != null ? (
                <div className="p-3 bg-green-50 border border-green-300 text-green-900 rounded text-sm">
                  <strong>Selected: {selectedModelData.mod.name}</strong><br/>
                  oMEDD {fmt(totalOMEDD)} mg/day → methadone <strong>{fmt(selectedModelData.res.tddAdj)} mg/day</strong> ({selectedModelData.res.ratioLabel}, after safety reduction). 
                  Given q8h that is ≈ <strong>{fmt(roundMeth(selectedModelData.res.tddAdj / 3))} mg per dose</strong>.
                </div>
              ) : (
                <div className="p-3 bg-green-50 border border-green-300 text-green-900 rounded text-sm">
                  <strong>Selected: {selectedModelData.mod.name}</strong><br/>
                  {selectedModelData.res.note}
                </div>
              )}
            </div>
          </section>

          {/* STEP 3: QTc CHECKLIST */}
          <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h2 className="text-[#0b5d6b] text-lg font-semibold mb-2 flex items-center">
              <span className="inline-flex items-center justify-center bg-[#0b5d6b] text-white rounded-full w-6 h-6 text-sm mr-2">3</span>
              QTc &amp; safety checklist
            </h2>
            <p className="text-gray-600 text-sm mb-4">Based on the Chou et al. 2014 consensus recommendations and standard risk factors for drug-induced
            QT prolongation. This gates the schedule in Step 4.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm mb-1 text-gray-700">Baseline QTc (ms), if ECG available</label>
                  <input type="number" min="0" max="700" className="input-field border p-2 rounded w-full max-w-sm" placeholder="e.g. 440" value={qtc} onChange={(e) => setQtc(e.target.value)} />
                </div>
                {RISK_FACTORS.slice(0, 5).map(rf => (
                  <label key={rf.id} className="flex items-start gap-2 text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={!!riskFactors[rf.id]} onChange={() => toggleRiskFactor(rf.id)} />
                    <span>{rf.label}</span>
                  </label>
                ))}
              </div>
              <div>
                {RISK_FACTORS.slice(5).map(rf => (
                  <label key={rf.id} className="flex items-start gap-2 text-sm mb-2 cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={!!riskFactors[rf.id]} onChange={() => toggleRiskFactor(rf.id)} />
                    <span>{rf.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`p-4 border rounded text-sm ${qtcAssessment.cls === 'high' ? 'bg-red-50 border-red-300 text-red-900' : qtcAssessment.cls === 'mod' ? 'bg-orange-50 border-orange-300 text-orange-900' : 'bg-green-50 border-green-300 text-green-900'}`}>
              <strong className="block mb-2">QTc risk: <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${qtcAssessment.cls === 'high' ? 'bg-red-200 text-red-800' : qtcAssessment.cls === 'mod' ? 'bg-orange-200 text-orange-800' : 'bg-green-200 text-green-800'}`}>{qtcAssessment.level}</span></strong>
              <ul className="list-disc pl-5 space-y-1">
                {qtcAssessment.msgs.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </section>

          {/* STEP 4: SCHEDULE */}
          <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
            <h2 className="text-[#0b5d6b] text-lg font-semibold mb-2 flex items-center">
              <span className="inline-flex items-center justify-center bg-[#0b5d6b] text-white rounded-full w-6 h-6 text-sm mr-2">4</span>
              Cross-taper schedule
            </h2>
            <p className="text-gray-600 text-sm mb-4">Strategy is independent of the conversion model. “3-day gradual” follows the Edmonton-style thirds taper;
            “rapid switch” is the stop-and-go approach; “Morley–Makin PRN” is the fixed-PRN titration method.</p>
            
            <div className="mb-4">
              <label className="block text-sm mb-1 text-gray-700">Switch strategy</label>
              <select className="input-field border p-2 rounded w-full max-w-sm" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                <option value="gradual">3-day gradual cross-taper (Edmonton-style)</option>
                <option value="rapid">Rapid switch (stop-and-go, day 1)</option>
                <option value="prn">Morley–Makin fixed-PRN titration (5-day)</option>
              </select>
            </div>

            {renderScheduleContent()}
          </section>
          
          <section className="glass-card p-6 border border-gray-200 rounded-lg bg-white shadow-sm text-sm text-gray-600">
             <h2 className="text-[#0b5d6b] text-lg font-semibold mb-2">Evidence base &amp; references</h2>
              <ul className="list-disc pl-5 space-y-2 mb-4">
                <li>Ripamonti C, et al. Switching from morphine to oral methadone in treating cancer pain: what is the equianalgesic dose ratio? <em>J Clin Oncol</em> 1998;16:3216–21. (Tiers 30–90 mg → 4:1; 90–300 → 6:1; &gt;300 → 8:1.)</li>
                <li>Ayonrinde OT, Bridge DT. The rediscovery of methadone for cancer pain management. <em>Med J Aust</em> 2000;173:536–40. (Tiers &lt;100 → 3:1; 101–300 → 5:1; 301–600 → 10:1; 601–800 → 12:1; 801–1000 → 15:1; &gt;1000 → 20:1; loading dose 25–50% of TDD on days 1–2.)</li>
                <li>Mercadante S, et al. Switching from morphine to methadone to improve analgesia and tolerability in cancer patients. <em>J Clin Oncol</em> 2001;19:2898–904. (Tiers 30–90 → 4:1; 90–300 → 8:1; &gt;300 → 12:1.)</li>
                <li>Morley J, Makin M. The use of methadone in cancer pain poorly responsive to other opioids. <em>Pain Rev</em> 1998;5:51–8. (Fixed PRN: 10% of daily oMEDD, max 30 mg, q3h PRN ×5 days; day 6 maintenance = mean of days 4–5, given BID.)</li>
                <li>Bruera E, et al. / Edmonton protocol 3-day rotation; summarised in Palat G, et al. Practical guide for using methadone in pain and palliative care practice. <em>Indian J Palliat Care</em> 2018.</li>
                <li>Chou R, et al. Methadone safety: a clinical practice guideline. <em>J Pain</em> 2014;15:321–37. (QTc screening and ECG monitoring recommendations.)</li>
                <li>McPherson ML. <em>Demystifying Opioid Conversion Calculations</em>, 2nd ed. ASHP, 2018.</li>
                <li>Parsons HA, et al. A review of common methods to convert morphine to methadone. <em>Can J Hosp Pharm</em> 2012;65(5):355–61 (PMC3715153) — source of the side-by-side model table used here.</li>
              </ul>
              <p>MME conversion factors: CDC guideline conversion factors (morphine PO 1; oxycodone PO 1.5; hydromorphone PO 4;
              codeine 0.15; tramadol 0.1; tapentadol 0.4; fentanyl patch mcg/h × 2.4; buprenorphine patch mcg/h × 12.6;
              morphine IV/SC × 3; hydromorphone IV/SC × 20; fentanyl IV infusion mcg/h × 7.2). Local formularies (e.g. ANZCA) may differ —
              verify against your own institution's table before prescribing.</p>
          </section>
        </div>
      )}
      <footer className="mt-8 text-center text-xs text-gray-500">
        AMORM is free and open-source clinical decision support. No patient data leaves this page — all computation happens locally in your browser.
        It is not a medical device and is not a substitute for clinical judgement.
      </footer>
    </div>
  );
}
