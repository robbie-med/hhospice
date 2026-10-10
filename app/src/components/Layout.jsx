import { Outlet, NavLink, Link } from 'react-router-dom';
import { ClipboardCheck, Users, MessageSquareHeart, Activity, Clock, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const KEY = 'hcw-notice-dismissed';
function readDismissed() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }

const NAV = [
  ['/certify', 'Certify', ClipboardCheck],
  ['/patients', 'Patients', Users],
  ['/goc', 'Goals of care', MessageSquareHeart],
  ['/amorm', 'Methadone', Activity],
  ['/ttbdp', 'Time-to-benefit', Clock],
];

export default function Layout() {
  const [dismissed, setDismissed] = useState(readDismissed);
  const dismiss = () => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setDismissed(true); };
  const reopen = () => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setDismissed(false); window.scrollTo({ top: 0 }); };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark"><ClipboardCheck size={16} /></span>
            <span className="brand-long">Hospice Certification Workbench</span>
            <span className="brand-short">Hospice Workbench</span>
          </Link>
          <nav className="app-nav" aria-label="Primary">
            {NAV.map(([to, label, Icon]) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon size={15} /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main animate-fade-in">
        {!dismissed && (
          <div className="notice" role="note">
            <ShieldCheck size={18} />
            <p>
              Everything stays in this browser; nothing is transmitted. Use pseudonymous labels, never names or dates of birth.
              The workbench organises LCD criteria and drafts text from what you enter. It does not determine eligibility,
              and every narrative must be read and edited by the physician who signs it.
            </p>
            <div className="notice-actions"><button className="btn-secondary btn-sm" onClick={dismiss}>Got it</button></div>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>Runs entirely in your browser. Criteria follow the CGS / NGS / Palmetto “Hospice – Determining Terminal Status” LCDs; verify against your MAC before signing.</span>
          <span><button onClick={reopen}>Privacy and scope</button> · <a href="https://github.com/robbie-med/hhospice" target="_blank" rel="noreferrer">Source</a></span>
        </div>
      </footer>
    </div>
  );
}
