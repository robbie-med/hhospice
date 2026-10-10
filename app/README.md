# Hospice Certification Workbench

Offline, physician-facing PWA for the documentation that hospice audits actually deny on:
eligibility against the Medicare "Hospice – Determining Terminal Status" LCDs, certification and
recertification narratives, face-to-face attestations, and a decline tracker so recerts describe the
trajectory. Plus a goals-of-care note builder and the two earlier calculators (methadone rotation,
time-to-benefit deprescribing).

Nothing leaves the browser. Patient records are pseudonymous labels stored in IndexedDB; export/import is JSON.

## Why this and not another calculator hub

- OIG audit A-06-22-09003: 45 of 100 initial certification periods failed Medicare documentation
  requirements; 24 of those failed on documentation alone, not clinical eligibility.
- Narratives must be the physician's own, patient-specific account; cloned/templated narratives are
  the leading denial pattern. The composer here only emits findings you entered, varies phrasing per
  patient, and refuses to write a recert without a prior assessment to compare against.
- Reference/calculator needs are already served (Fast Facts, ePrognosis, MDCalc, opioid converters).

## Modules

| Route | What it does |
|---|---|
| `#/certify` | Patient + benefit period (90/90/60-day math, F2F 30-day window, signature timing), dated assessments (general decline, Part II baseline, disease-specific LCD fields), eligibility verdict with MET/UNMET/NO DATA per criterion, denial-risk flags, CTI or recert narrative, F2F attestation. |
| `#/patients` | Stored patients, export/import JSON, delete. |
| `#/goc` | Goals-of-care note ("template plus"): prognosis communicated, understanding, values, decisions, alignment, time-limited trial, capacity, code status. ASCII block for the EMR. |
| `#/amorm` | Methadone rotation (five models, QTc checklist, switchover schedule). |
| `#/ttbdp` | Time-to-benefit vs prognosis for preventive drugs. |

LCD disease guidelines covered: cancer, heart disease, pulmonary disease, Alzheimer's/related dementia,
stroke and coma, ALS, liver disease, renal disease, HIV disease, and the non-disease-specific pathway
(Parts I–III). Criteria live in `src/data/lcd/*.js` as data; each rule has a `test` and a `text` so the
evaluator and the narrative stay in sync. MAC selector cites CGS L34538 / NGS L33393 / Palmetto L34558.

## Develop

```
npm install
npm run dev      # 127.0.0.1:3111 (port registered in ~/Projects/PORTS.md)
npm test         # node --test, no extra deps
npm run build    # dist/ with service worker (vite-plugin-pwa)
npm run preview  # serve dist/ on 3111
```

Stack: React 19, Vite 8, Tailwind 4, react-router (HashRouter so it deploys to any static path),
vite-plugin-pwa. `base: './'` so GitHub Pages works from a subfolder.

Deploys automatically: `.github/workflows/pages.yml` runs tests, builds and publishes `dist/` to GitHub
Pages (https://robbie-med.github.io/hhospice/) on every push to `main` that touches `app/`.

## Disclaimer

Organizes public LCD criteria into a documentation aid. Does not determine eligibility or guarantee
coverage; not medical advice. The signing physician must read and edit every narrative. Verify
thresholds against your MAC's current LCD text before relying on them.

MIT.
