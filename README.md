# Palliative_Tools

- `app/` — **Hospice Certification Workbench**: the product. Offline PWA for LCD eligibility, CTI/recert
  narratives, F2F attestations, decline tracking and goals-of-care notes. Includes the two calculators
  below as routes. See `app/README.md`.
- `AMORM/` — original single-file methadone rotation calculator (`index.html`); `AMORM/app/` is an
  abandoned React rewrite. Canonical copy now lives in `app/src/pages/Amorm.jsx`.
- `TTB_DP/` — original time-to-benefit deprescribing tool (React). Canonical copy now lives in
  `app/src/pages/TtbDp.jsx` + `app/src/components/`.
- `LCDMNCPS/` — original 3-disease LCD narrative tool (`index.html`). Superseded by `app/` (all LCD
  categories, benefit periods, decline tracker). Kept for reference.
