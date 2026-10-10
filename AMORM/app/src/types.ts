export type OpioidKind = 'dose' | 'patch';

export interface Opioid {
  id: string;
  label: string;
  kind: OpioidKind;
  factor: number;
  factorText: string;
}

export interface Freq {
  v: number;
  label: string;
}

export interface ModelCalculationResult {
  ratioLabel: string;
  tdd: number | null;
  tddAdj?: number;
  prn?: { dose: number; freq: string; maxDay: number };
  note: string;
}

export interface ConversionModel {
  id: string;
  name: string;
  calc: (m: number) => ModelCalculationResult;
}

export interface StackRow {
  opioid: string;
  dose: string;
  freq: number;
}
