import { Link } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, Stethoscope, Zap, MessageSquareHeart, Users, Activity, Clock } from 'lucide-react';

const STARTS = [
  {
    to: '/certify?start=initial', icon: ClipboardCheck, primary: true,
    title: 'Initial certification',
    desc: 'New admission. Check the disease guideline, the functional baseline and the election-date math, then draft the certification narrative.',
    need: 'Diagnosis, PPS or KPS, ADLs, disease-specific findings, election date',
  },
  {
    to: '/certify?start=recert', icon: RefreshCw,
    title: 'Recertification',
    desc: 'Benefit period 2 onward. The narrative compares this assessment with the previous one so the decline is explicit, not asserted.',
    need: 'A prior assessment to compare against; F2F date from period 3',
  },
  {
    to: '/certify?start=f2f', icon: Stethoscope,
    title: 'Face-to-face attestation',
    desc: 'Window check for the 30 days before the period starts, and an attestation built from the encounter findings.',
    need: 'Encounter date, who performed it, findings',
  },
  {
    to: '/certify?start=acute', icon: Zap,
    title: 'Sudden catastrophic event',
    desc: 'A large stroke, anoxic injury or catastrophic bleed in someone who was well. Decline is measured from the pre-event baseline, not from serial visits.',
    need: 'Date of the event, function before it, imaging or exam findings, current intake',
  },
  {
    to: '/goc', icon: MessageSquareHeart,
    title: 'Goals-of-care note',
    desc: 'Prompts for the things that get left out: prognosis as communicated, understanding, alignment of decisions with values, time-limited trials, capacity.',
    need: 'Who was present, what was said, what was decided',
  },
];

const TOOLS = [
  { to: '/patients', icon: Users, name: 'Patients and export', desc: 'Stored assessments, decline tracker, JSON export and import' },
  { to: '/amorm', icon: Activity, name: 'Methadone rotation', desc: 'Five conversion models, QTc checklist, switchover schedule' },
  { to: '/ttbdp', icon: Clock, name: 'Time-to-benefit deprescribing', desc: 'Preventive drugs against the patient’s prognosis' },
];

export default function Dashboard() {
  return (
    <div>
      <section className="hero">
        <div className="eyebrow">For hospice and palliative physicians, nurse practitioners and IDG</div>
        <h1>Documentation that survives the audit.</h1>
        <p>
          Eligibility against the Medicare hospice LCDs, certification and recertification narratives composed from your
          own findings, face-to-face attestations and a decline tracker. Offline, in your browser, no login.
        </p>
      </section>

      <h2 className="home-h2">Start with what you are doing today</h2>
      <div className="start-grid">
        {STARTS.map((s) => (
          <Link key={s.to} to={s.to} className={`start-card${s.primary ? ' primary' : ''}`}>
            <span className="ic"><s.icon size={18} /></span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
            <div className="need"><strong>You will need:</strong> {s.need}</div>
          </Link>
        ))}
      </div>

      <h2 className="home-h2">Also here</h2>
      <div className="tool-row">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="tool-link">
            <t.icon size={20} />
            <div><b>{t.name}</b><span>{t.desc}</span></div>
          </Link>
        ))}
      </div>

      <div className="how">
        <div><div className="n">1 · Enter</div><h3>Record what you found</h3><p>PPS, ADLs, weights, labs, the disease-specific items the LCD asks for, and your own exam and caregiver report.</p></div>
        <div><div className="n">2 · Check</div><h3>See each criterion as met, unmet or missing</h3><p>Every LCD rule is evaluated separately, with the benefit-period and face-to-face timing alongside, and denial-pattern flags.</p></div>
        <div><div className="n">3 · Sign</div><h3>Copy a narrative that is yours</h3><p>Composed only from what you entered, phrased differently for every patient. Edit it, then sign it.</p></div>
      </div>
    </div>
  );
}
