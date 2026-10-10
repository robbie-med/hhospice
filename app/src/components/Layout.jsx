import { Outlet, NavLink, Link } from 'react-router-dom';
import { ClipboardCheck, Users, MessageSquareHeart, Activity, Clock, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const KEY = 'hcw-disclaimer-accepted';
function readAccepted() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }

const NAV = [
  ['/certify', 'Certify', ClipboardCheck],
  ['/patients', 'Patients', Users],
  ['/goc', 'GOC note', MessageSquareHeart],
  ['/amorm', 'Methadone', Activity],
  ['/ttbdp', 'Time-to-benefit', Clock],
];

export default function Layout() {
  const [accepted, setAccepted] = useState(readAccepted);
  const accept = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setAccepted(true); };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="glass-panel sticky top-0 z-50 rounded-none border-t-0 border-l-0 border-r-0 px-4 md:px-6 py-3 flex flex-wrap justify-between items-center gap-2">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <ClipboardCheck size={24} className="text-primary-color" />
          <span className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>Hospice Certification Workbench</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm">
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `no-underline flex items-center gap-1 px-3 py-1 rounded-full transition ${isActive ? 'bg-blue-600 text-white' : 'text-text-muted hover:text-primary-color'}`}>
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-grow container animate-fade-in">
        {!accepted ? (
          <div className="glass-panel p-8 max-w-2xl mx-auto mt-10">
            <h2 className="text-warning flex items-center gap-2"><ShieldAlert /> Before you use this</h2>
            <p className="mb-3">This workbench organizes Medicare hospice LCD criteria and drafts documentation from what <strong>you</strong> enter. It does not determine eligibility, does not guarantee coverage, and is not medical advice. Certification rests solely with the certifying physician.</p>
            <p className="mb-3">Use pseudonymous labels only. Everything is stored in this browser (IndexedDB) and nothing is transmitted anywhere. Clearing site data deletes it; export regularly.</p>
            <p className="mb-6">Every narrative must be reviewed and edited by the signing physician. Do not sign text you have not read.</p>
            <button className="btn-primary w-full justify-center" onClick={accept}>I understand</button>
          </div>
        ) : <Outlet />}
      </main>

      <footer className="mt-auto py-4 text-center text-text-muted border-t border-card-border glass-panel rounded-none border-b-0 border-l-0 border-r-0">
        <p className="text-xs">Runs entirely in your browser. No data leaves your device. Criteria follow the CGS/NGS “Hospice – Determining Terminal Status” LCDs; verify against your MAC before signing.</p>
      </footer>
    </div>
  );
}
