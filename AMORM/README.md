# AMORM — Assisted Methadone Opioid Rotation Module

A free, open-source, offline-capable clinical decision support tool for **rotating patients from high-dose opioids (transdermal fentanyl, oral morphine, etc.) to methadone** — the conversion that standard equianalgesic calculators (e.g. the ANZCA Opioid Calculator) explicitly exclude.

Everything runs locally in the browser. No dependencies, no build step, no data leaves the page.

## Use

Open `index.html` in any modern browser. Host it on GitHub Pages or an intranet if you want it shared.

Workflow:

1. **Opioid stack builder** — enter every scheduled opioid (oral, IV/SC, transdermal); the app computes total oral morphine equivalent daily dose (oMEDD) using CDC MME factors shown per-row for auditability.
2. **Conversion model** — Edmonton (3-day fixed protocol), Ripamonti 1998, Ayonrinde & Bridge 2000, Mercadante 2001, and Morley–Makin 1998 are computed **side-by-side**, because their divergence at high oMEDD is itself the key safety information. An optional additional reduction for incomplete cross-tolerance (default 25%) is applied on top.
3. **QTc & safety checklist** — risk factors per Chou et al. 2014 (electrolytes, QTc-prolonging co-medication, cardiac history, baseline QTc, planned dose > 100 mg/day). A baseline QTc > 500 ms **blocks** schedule generation unless specialist supervision is explicitly confirmed.
4. **Cross-taper schedule** — day-by-day regimen: 3-day gradual (Edmonton-style thirds), rapid stop-and-go switch, or Morley–Makin fixed-PRN titration; includes breakthrough dosing (10% TDD), the fentanyl-patch reservoir warning, and monitoring/hold criteria.

## ⚠ Safety

This is **decision support, not a prescribing tool**. Methadone's variable half-life and non-linear conversion ratios mean published models can differ by a factor of 3+ at high oMEDD. All output must be independently verified by a prescriber experienced in methadone initiation. The app enforces an acknowledgment gate and a QTc block, but those are guardrails, not validation.

## Verification

The model implementations are checked against the worked examples in Parsons et al. 2012 (PMC3715153, Tables 3–4): oMEDD 96 mg → Ripamonti 16 mg / Ayonrinde 32 mg / Mercadante 12 mg; oMEDD 1600 mg → 200 / 80 / 133 mg respectively. All tier boundaries and MME factors are unit-tested against the source constants extracted from the shipped file.

## Evidence base

- Ripamonti C, et al. *J Clin Oncol* 1998;16:3216–21 — tiers 30–90 → 4:1; 90–300 → 6:1; >300 → 8:1
- Ayonrinde OT, Bridge DT. *Med J Aust* 2000;173:536–40 — tiers ≤100 → 3:1 … >1000 → 20:1, with 25–50% loading on days 1–2
- Mercadante S, et al. *J Clin Oncol* 2001;19:2898–904 — tiers 30–90 → 4:1; 90–300 → 8:1; >300 → 12:1
- Morley J, Makin M. *Pain Rev* 1998;5:51–8 — fixed PRN: 10% of oMEDD (max 30 mg) q3h PRN ×5 days, then mean of days 4–5 BID
- Chou R, et al. *J Pain* 2014;15:321–37 — methadone safety / QTc guidance
- Parsons HA, et al. *Can J Hosp Pharm* 2012;65(5):355–61 — side-by-side model comparison
- McPherson ML. *Demystifying Opioid Conversion Calculations*, 2nd ed. ASHP 2018

## License

MIT. Clinical parameters live in clearly-commented `OPIOIDS` / `MODELS` blocks at the top of the script in `index.html` — audit them, and adjust to your local formulary before clinical use.
