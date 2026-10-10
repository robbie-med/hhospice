import type { StackRow } from '../types';

export interface PatientData {
  stackRows: StackRow[];
  qtc: string;
  riskFactors: Record<string, boolean>;
}

export async function pullPatientDataMock(): Promise<PatientData> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    stackRows: [
      { opioid: 'oxy_po', dose: '40', freq: 2 },
      { opioid: 'fen_td', dose: '50', freq: 1 }
    ],
    qtc: '460',
    riskFactors: {
      rfAge: true, // e.g. age > 65
      rfOrgan: true // e.g. renal impairment
    }
  };
}
