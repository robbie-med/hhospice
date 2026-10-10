# LCD-Mapped Non-Cancer Prognostic Synthesizer

A free, open-source clinical documentation aid that walks a clinician through Medicare Local Coverage Determination (LCD) criteria for the three major non-cancer hospice diagnoses — **Congestive Heart Failure, COPD, and Dementia/Alzheimer's** — and synthesizes the answers into a ready-to-paste certification narrative.

## The Problem

Medicare LCDs (e.g., **L34538 – Hospice: Determining Terminal Status**) dictate whether a patient qualifies for the hospice benefit, but the criteria for non-cancer diagnoses are scattered and rigid. Certifying a patient with Alzheimer's, for example, requires piecing together the FAST scale (7c or worse), the Palliative Performance Scale, albumin levels, and qualifying comorbidities. Existing references list the criteria; this tool **performs the clinical logic** and writes the paragraph.

## What It Does

- **Diagnosis-branched wizard**
  - **Dementia**: FAST staging (with the 7c LCD threshold marked), stage 7c descriptors, and the six qualifying comorbid conditions from the past 12 months
  - **CHF**: NYHA class, symptoms at rest, optimal-treatment status, surgical candidacy, ejection fraction (≤ 20% flagged), LCD supportive factors (treatment-resistant arrhythmias, cardiac arrest, unexplained syncope, cardiac embolism, concomitant HIV)
  - **COPD**: disabling dyspnea at rest, functional capacity, post-bronchodilator FEV1 (< 30% flagged), supportive factors (hypoxemia pO2 ≤ 55 mmHg / SpO2 ≤ 88%, hypercapnia, cor pulmonale, resting tachycardia > 100), plus an optional **BODE index calculator** with mortality-quartile interpretation
- **General decline indicators** — PPS score, unintentional weight loss, serum albumin, ED visits/hospitalizations
- **Eligibility synthesis** — each criterion tagged MET/UNMET with an overall assessment
- **Narrative generation** — a copy-ready paragraph written in LCD keyword language ("optimally treated with diuretics and vasodilators," "FAST stage 7c or beyond," "poorly responsive to bronchodilator therapy") for the certification of terminal illness (CTI)

## Usage

No build step, no dependencies, no server:

```
Open index.html in any modern browser.
```

Or host it as a static site (GitHub Pages, Netlify, an intranet share) — it is a single self-contained file.

**Privacy:** everything runs locally in the browser. No data is transmitted, stored, or logged. The patient field accepts initials only.

## Clinical Disclaimer

This tool organizes publicly available Medicare LCD criteria into a documentation aid. It **does not determine eligibility** and is **not medical advice**. Certification of terminal status — a life expectancy of six months or less if the illness runs its normal course — rests solely with the certifying physician and the hospice medical director. LCD criteria support but do not guarantee Medicare coverage.

## Criteria Reference

The wizard implements the non-cancer disease-specific guidelines from **LCD L34538 (Hospice – Determining Terminal Status)**. Regional MACs (CGS, NGS, Palmetto, etc.) publish materially identical criteria; verify the LCD number applicable to your jurisdiction.

## Contributing

Issues and pull requests are welcome — especially:

- Additional non-cancer diagnoses (ESRD, liver disease, HIV/AIDS, stroke/coma, ALS/neurological disease)
- LCD wording updates as CMS/MAC revisions are published
- Translations and accessibility improvements

Please include the LCD section reference for any criteria change.

## License

[MIT](LICENSE)
