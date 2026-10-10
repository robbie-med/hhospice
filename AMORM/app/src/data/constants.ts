import type { ConversionModel, Freq, Opioid } from '../types';

export const OPIOIDS: Opioid[] = [
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

export const FREQS: Freq[] = [
  { v: 6,   label: "q4h (6×/day)" },
  { v: 4,   label: "q6h (4×/day)" },
  { v: 3,   label: "q8h (3×/day)" },
  { v: 2,   label: "q12h (2×/day)" },
  { v: 1,   label: "Once daily" }
];

export const MODELS: ConversionModel[] = [
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
      let ratio, tier;
      if (m < 30)       { ratio = 2; tier = "< 30 mg → 2:1 (extrapolated — model validated only ≥ 30 mg; use great caution)"; }
      else if (m < 90)  { ratio = 4; tier = "30–90 mg → 4:1"; }
      else if (m < 300) { ratio = 6; tier = "90–300 mg → 6:1"; }
      else              { ratio = 8; tier = "> 300 mg → 8:1"; }
      return { ratioLabel: tier, tdd: m / ratio,
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
      let ratio, tier;
      if (m < 30)       { ratio = 2; tier = "< 30 mg → 2:1 (extrapolated; caution)"; }
      else if (m < 90)  { ratio = 4; tier = "30–90 mg → 4:1"; }
      else if (m < 300) { ratio = 8; tier = "90–300 mg → 8:1"; }
      else              { ratio = 12; tier = "> 300 mg → 12:1"; }
      return { ratioLabel: tier, tdd: m / ratio,
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
        note: `Stop prior opioid. Offer ${Number(perDose.toFixed(1))} mg q3h PRN for 5 days; day-6 maintenance = mean of days 4–5 actual use, given BID. Resource-intensive; best suited to inpatient settings.`
      };
    }
  }
];

export function fmt(n: number | null | undefined, dp?: number): string {
  if (n == null || isNaN(n)) return "—";
  const d = dp != null ? dp : (n < 10 ? 1 : 0);
  return Number(n.toFixed(d)).toString();
}

export function roundMeth(n: number): number {
  return Math.max(0.5, Math.round(n * 2) / 2);
}

export function isQtcBlocked(qtc: string): boolean {
  const qtcVal = parseFloat(qtc);
  return !isNaN(qtcVal) && qtcVal > 500;
}
