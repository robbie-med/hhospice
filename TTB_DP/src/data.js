export const MEDS = [
  { 
    id: "statin",      
    name: "Statin (primary prevention)",   
    ttbMin: 2.5, ttbMax: 5.0,  
    ref: "TTB ≈ 2–5 y to prevent one MACE/mortality (Lee et al.; Holmes et al.)",
    pillCount: 1,
    sideEffects: ["Muscle aches", "Liver enzyme elevation", "Drug interactions"],
    interventionType: "medication",
    purpose: "prevent issues like heart attacks or strokes down the road",
    burdenType: "daily pill burden"
  },
  { 
    id: "bisphos",     
    name: "Bisphosphonate (osteoporosis)", 
    ttbMin: 0.8, ttbMax: 1.5,  
    ref: "TTB ≈ 8–18 mo to prevent one nonvertebral fracture (Iyer et al., meta-analysis)",
    pillCount: 0.14, // weekly usually, so ~0.14 pills/day
    sideEffects: ["Esophageal irritation", "Bone/joint pain", "Atypical fractures"],
    interventionType: "medication",
    purpose: "prevent bone fractures",
    burdenType: "pill burden and strict dosing routine"
  },
  { 
    id: "glycemic",    
    name: "Tight glycemic control (HbA1c <7%)", 
    ttbMin: 8.0, ttbMax: 10.0, 
    ref: "Microvascular benefit emerges over ~8–10 y (UKPDS legacy effect)",
    pillCount: 2,
    sideEffects: ["Hypoglycemia (severe risk in frail elderly)", "Weight gain"],
    interventionType: "medication regimen",
    purpose: "prevent long-term diabetic complications like kidney or eye disease",
    burdenType: "daily pill burden and strict dietary constraints"
  },
  { 
    id: "bp",          
    name: "Antihypertensive (primary)", 
    ttbMin: 1.0, ttbMax: 2.0, 
    ref: "TTB ≈ 1–2 y for mortality/stroke benefit in frail elderly (HYVET)",
    pillCount: 1,
    sideEffects: ["Orthostatic hypotension", "Falls", "Electrolyte imbalance"],
    interventionType: "medication",
    purpose: "prevent issues like heart attacks or strokes down the road",
    burdenType: "daily pill burden"
  },
  { 
    id: "aspirin",     
    name: "Aspirin (primary prevention)",  
    ttbMin: 2.5, ttbMax: 5.0,  
    ref: "TTB ≈ 2.5–5 y for CV benefit; bleeding risk immediate",
    pillCount: 1,
    sideEffects: ["GI bleeding", "Bruising", "Ulcers"],
    interventionType: "medication",
    purpose: "prevent issues like heart attacks or strokes down the road",
    burdenType: "daily pill burden"
  },
  { 
    id: "anticoag",    
    name: "Anticoagulant (AF, stroke prevention)", 
    ttbMin: 0.5, ttbMax: 1.0, 
    ref: "Short TTB (~6 mo); benefit may persist even with limited prognosis",
    pillCount: 1,
    sideEffects: ["Major hemorrhage", "Frequent lab monitoring (warfarin)"],
    interventionType: "medication",
    purpose: "prevent blood clots and strokes",
    burdenType: "daily pill burden and lab monitoring"
  },
  { 
    id: "osteopor_den",
    name: "Denosumab (osteoporosis)",      
    ttbMin: 1.0, ttbMax: 1.5,  
    ref: "Similar TTB to bisphosphonates; note rebound risk on discontinuation",
    pillCount: 0, // Injection
    sideEffects: ["Hypocalcemia", "Infection risk", "Rebound fractures if stopped abruptly"],
    interventionType: "injection",
    purpose: "prevent bone fractures",
    burdenType: "injection burden and clinic visits"
  },
  { 
    id: "colorectal",  
    name: "Colorectal cancer screening",   
    ttbMin: 10.0, ttbMax: 10.0, 
    ref: "TTB ≈ 10 y before mortality benefit (Lee et al. 2013)",
    pillCount: 0,
    sideEffects: ["Bowel prep burden", "Procedural risk (perforation)"],
    interventionType: "screening",
    purpose: "detect early signs of cancer before symptoms appear",
    burdenType: "procedural burden and discomfort"
  },
  { 
    id: "breast",      
    name: "Breast cancer screening",       
    ttbMin: 10.0, ttbMax: 10.7, 
    ref: "TTB ≈ 10.7 y to prevent one breast cancer death (Lee et al. 2013)",
    pillCount: 0,
    sideEffects: ["False positives", "Overdiagnosis", "Anxiety"],
    interventionType: "screening",
    purpose: "detect early signs of cancer before symptoms appear",
    burdenType: "procedural burden and hospital visits"
  }
];

export const PROGNOSIS_OPTIONS = [
  { value: 0.25, label: "< 6 months" },
  { value: 0.75, label: "6 – 12 months" },
  { value: 1.5,  label: "1 – 2 years" },
  { value: 2.5,  label: "2 – 3 years" },
  { value: 4,    label: "3 – 5 years" },
  { value: 7.5,  label: "5 – 10 years" },
  { value: 12,   label: "> 10 years" }
];

// Palliative Performance Scale (PPS) simplified mapping to median survival in days
// (Rough estimates based on general oncology/palliative cohorts)
export const PPS_LEVELS = [
  { level: 10, survivalDays: 3, label: "Total bed bound, unconscious" },
  { level: 20, survivalDays: 7, label: "Total bed bound, totally dependent" },
  { level: 30, survivalDays: 14, label: "Total bed bound, normal/reduced intake" },
  { level: 40, survivalDays: 30, label: "Mainly in bed, needs major assist" },
  { level: 50, survivalDays: 60, label: "Sit/stand, extensive assist" },
  { level: 60, survivalDays: 120, label: "Reduced ambulation, assist with ADLs" },
  { level: 70, survivalDays: 200, label: "Reduced ambulation, fully self-care" },
  { level: 80, survivalDays: 365, label: "Full ambulation, some disease evidence" },
  { level: 90, survivalDays: 730, label: "Full ambulation, normal activity" },
  { level: 100, survivalDays: 1500, label: "Full ambulation, no disease evidence" }
];
