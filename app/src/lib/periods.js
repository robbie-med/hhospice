// Medicare hospice benefit-period arithmetic. Pure functions; dates are ISO strings (YYYY-MM-DD).
// Periods: two 90-day periods, then unlimited 60-day periods. Face-to-face (F2F) encounter is
// required for the 3rd period and every one after, within 30 calendar days before the period starts.

const DAY = 86400000;

export function parseISO(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}
export function toISO(d) {
  return d.toISOString().slice(0, 10);
}
export function addDays(d, n) {
  return new Date(d.getTime() + n * DAY);
}
export function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}
export function fmtDate(iso) {
  const d = parseISO(iso);
  if (!d) return iso || '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Length in days of benefit period n (1-based). */
export function periodLength(n) {
  return n <= 2 ? 90 : 60;
}

/** Start/end (inclusive) of benefit period n given the election (admission) date. */
export function periodBounds(admissionISO, n) {
  const adm = parseISO(admissionISO);
  if (!adm || n < 1) return null;
  let offset = 0;
  for (let i = 1; i < n; i++) offset += periodLength(i);
  const start = addDays(adm, offset);
  const end = addDays(start, periodLength(n) - 1);
  return { n, start: toISO(start), end: toISO(end), length: periodLength(n) };
}

/** Which benefit period contains a date. */
export function periodAt(admissionISO, dateISO) {
  const adm = parseISO(admissionISO);
  const d = parseISO(dateISO);
  if (!adm || !d) return null;
  const days = daysBetween(adm, d);
  if (days < 0) return null;
  if (days < 90) return 1;
  if (days < 180) return 2;
  return 3 + Math.floor((days - 180) / 60);
}

export function f2fRequired(n) {
  return n >= 3;
}

/** F2F window for period n: the 30 calendar days before the period starts (start-30 .. start-1). */
export function f2fWindow(admissionISO, n) {
  const b = periodBounds(admissionISO, n);
  if (!b) return null;
  const start = parseISO(b.start);
  return { from: toISO(addDays(start, -30)), to: toISO(addDays(start, -1)), periodStart: b.start };
}

/**
 * Evaluate certification timing for a period.
 * Returns { period, f2f: {required, inWindow, window, status}, cert: {...}, risks: [] }
 */
export function evaluatePeriod({ admissionDate, periodNumber, f2fDate, certSignedDate, today }) {
  const risks = [];
  const n = Number(periodNumber) || 1;
  const bounds = periodBounds(admissionDate, n);
  if (!bounds) {
    return { period: null, risks: ['Admission (election) date is missing or invalid, so benefit-period dates cannot be computed.'] };
  }
  const result = { period: bounds, risks };
  const kind = n === 1 ? 'initial' : 'recert';
  result.kind = kind;

  // F2F
  const required = f2fRequired(n);
  const win = required ? f2fWindow(admissionDate, n) : null;
  let inWindow = null;
  if (required) {
    if (!f2fDate) {
      risks.push(`Period ${n} requires a face-to-face encounter in the 30 days before ${fmtDate(bounds.start)} (${fmtDate(win.from)} to ${fmtDate(win.to)}). No F2F date entered.`);
    } else {
      const f = parseISO(f2fDate);
      const from = parseISO(win.from), to = parseISO(win.to);
      inWindow = f && f >= from && f <= to;
      if (!inWindow) {
        const pStart = parseISO(bounds.start);
        const within2After = f && f > pStart && daysBetween(pStart, f) <= 2;
        if (within2After) {
          risks.push(`F2F on ${fmtDate(f2fDate)} falls after the period start. CMS allows an F2F up to 2 days after admission only for a NEW admission in a 3rd-or-later period (exceptional circumstances). Document why.`);
        } else {
          risks.push(`F2F on ${fmtDate(f2fDate)} is outside the required window ${fmtDate(win.from)} to ${fmtDate(win.to)}. The recertification is not valid and days are not billable until a compliant F2F is done.`);
        }
      }
    }
  }
  result.f2f = { required, window: win, inWindow };

  // Certification signature timing
  const start = parseISO(bounds.start);
  if (certSignedDate) {
    const s = parseISO(certSignedDate);
    const lead = daysBetween(s, start);
    if (lead > 15) {
      risks.push(`Certification signed ${fmtDate(certSignedDate)} is more than 15 days before the period starts (${fmtDate(bounds.start)}). CMS permits signing up to 15 days before the start of the period.`);
    }
    if (s > start && daysBetween(start, s) > 2 && kind === 'initial') {
      risks.push(`Initial certification signed ${daysBetween(start, s)} days after election. A verbal certification must be obtained within 2 calendar days of the period start if the written certification is not yet on file; document the verbal cert date.`);
    }
  } else {
    risks.push(kind === 'initial'
      ? 'No certification signature date entered. Written certification must be on file before the claim is submitted; if not obtained at election, a verbal certification within 2 calendar days must be documented.'
      : 'No recertification signature date entered. Written recertification must be on file before the claim for this period is submitted.');
  }
  result.cert = { signed: certSignedDate || null };

  if (today) {
    const t = parseISO(today);
    if (t && t < start) result.upcoming = daysBetween(t, start);
  }
  return result;
}
