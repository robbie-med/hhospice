import { useState, useMemo } from 'react';
import type { StackRow } from '../types';
import { OPIOIDS as OpioidsData, MODELS as ModelsData } from '../data/constants';

export function useAmormState() {
  const [unlocked, setUnlocked] = useState(false);
  const [stackRows, setStackRows] = useState<StackRow[]>([{ opioid: "mor_po", dose: "", freq: 3 }]);
  const [selectedModelId, setSelectedModelId] = useState<string>("ripamonti");
  const [safetyCut, setSafetyCut] = useState<number>(0.25);
  const [qtc, setQtc] = useState<string>("");
  const [riskFactors, setRiskFactors] = useState<Record<string, boolean>>({});
  const [strategy, setStrategy] = useState<string>("gradual");
  const [specialistOverride, setSpecialistOverride] = useState(false);
  const [targetOpioid, setTargetOpioid] = useState<string>("methadone");

  const totalOMEDD = useMemo(() => {
    return stackRows.reduce((sum, row) => {
      const o = OpioidsData.find(x => x.id === row.opioid);
      const dose = parseFloat(row.dose);
      if (!o || isNaN(dose) || dose <= 0) return sum;
      return sum + (o.kind === "patch" ? dose * o.factor : dose * row.freq * o.factor);
    }, 0);
  }, [stackRows]);

  const modelResults = useMemo(() => {
    // Dynamic biological modifiers: frail/elderly or organ impairment increases safety reduction
    let dynamicSafetyCut = safetyCut;
    if (safetyCut > 0 && (riskFactors['rfAge'] || riskFactors['rfOrgan'])) {
      // If they already have some safety cut, bump it to 50% max for high risk
      dynamicSafetyCut = Math.max(safetyCut, 0.5);
    }

    return ModelsData.map(mod => {
      const res = mod.calc(totalOMEDD);
      if (res.tdd != null) res.tddAdj = res.tdd * (1 - dynamicSafetyCut);
      return { mod, res, appliedSafetyCut: dynamicSafetyCut };
    });
  }, [totalOMEDD, safetyCut, riskFactors]);

  const selectedModelResult = useMemo(() => {
    return modelResults.find(m => m.mod.id === selectedModelId);
  }, [modelResults, selectedModelId]);

  return {
    unlocked, setUnlocked,
    stackRows, setStackRows,
    selectedModelId, setSelectedModelId,
    safetyCut, setSafetyCut,
    qtc, setQtc,
    riskFactors, setRiskFactors,
    strategy, setStrategy,
    specialistOverride, setSpecialistOverride,
    targetOpioid, setTargetOpioid,
    totalOMEDD,
    modelResults,
    selectedModelResult
  };
}
