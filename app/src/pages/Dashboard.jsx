import { Link } from 'react-router-dom';
import { ClipboardCheck, Users, MessageSquareHeart, Activity, Clock, ArrowRight } from 'lucide-react';

const TOOLS = [
  { path: '/certify', name: 'Certify', title: 'Eligibility, CTI and recertification narratives, F2F attestation', desc: 'All LCD disease guidelines plus the non-disease-specific pathway. Benefit-period and face-to-face timing checks. Narratives composed only from what you enter, with denial-risk flags.', icon: ClipboardCheck, primary: true },
  { path: '/patients', name: 'Patients', title: 'Decline tracker', desc: 'Dated assessments per pseudonymous patient so recertifications describe the trajectory (PPS, weight, albumin, ADLs, FAST…) automatically. Export/import JSON.', icon: Users },
  { path: '/goc', name: 'GOC note', title: 'Goals-of-care note (template plus)', desc: 'Prompts for prognosis communicated, understanding, decision alignment, time-limited trials and capacity. Copy-paste block for the EMR.', icon: MessageSquareHeart },
  { path: '/amorm', name: 'Methadone', title: 'Methadone rotation (AMORM)', desc: 'Five published conversion models side by side, QTc checklist, day-by-day switchover schedule.', icon: Activity },
  { path: '/ttbdp', name: 'Time-to-benefit', title: 'Deprescribing by time-to-benefit (TTB-DP)', desc: 'Compare each preventive drug\'s time-to-benefit with the patient\'s prognosis.', icon: Clock },
];

export default function Dashboard() {
  return (
    <div className="py-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl mb-3">Hospice Certification Workbench</h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto">Offline, physician-facing, no login. Documentation that survives an audit, written from your findings.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TOOLS.map((t) => (
          <div key={t.path} className={`glass-card p-6 flex flex-col ${t.primary ? 'md:col-span-2 lg:col-span-1 border-blue-400' : ''}`}>
            <div className="flex items-center gap-3 mb-2"><t.icon size={28} className="text-primary-color" /><h2 className="text-xl m-0">{t.name}</h2></div>
            <h3 className="text-base font-medium mb-2">{t.title}</h3>
            <p className="text-text-muted text-sm mb-6 flex-grow">{t.desc}</p>
            <Link to={t.path} className="btn-primary mt-auto justify-between no-underline">Open <ArrowRight size={18} /></Link>
          </div>
        ))}
      </div>
    </div>
  );
}
