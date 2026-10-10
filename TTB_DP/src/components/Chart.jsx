import React from 'react';
import { MEDS } from '../data';
import './Chart.css';

const Chart = ({ prognosisYears, selectedMeds }) => {
  const W = 700;
  const H = 430;
  const M = { top: 30, right: 30, bottom: 55, left: 55 };
  const PLOT_W = W - M.left - M.right;
  const PLOT_H = H - M.top - M.bottom;
  const X_MAX = 12; // years

  const sx = (t) => M.left + (t / X_MAX) * PLOT_W;
  const sy = (p) => M.top + (1 - p) * PLOT_H;

  const survival = (t, median) => Math.pow(0.5, t / median);

  // Generate grid lines
  const xTicks = [];
  for (let t = 0; t <= X_MAX; t += 2) xTicks.push(t);
  
  const yTicks = [];
  for (let p = 0; p <= 1.0001; p += 0.25) yTicks.push(p);

  // Survival curve path
  const steps = 240;
  let curvePath = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * X_MAX;
    const x = sx(t).toFixed(1);
    const y = sy(survival(t, prognosisYears)).toFixed(1);
    curvePath += (i === 0 ? "M" : "L") + `${x} ${y} `;
  }

  // Selected meds for TTB bars
  const activeMeds = MEDS.filter(m => selectedMeds.has(m.id));

  // Shaded region beyond median
  const shadeX = sx(Math.min(prognosisYears, X_MAX));
  const shadeWidth = M.left + PLOT_W - shadeX;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Time-to-benefit versus survival curve chart" className="ttb-chart">
      {/* Shaded region */}
      {shadeWidth > 0 && (
        <rect 
          x={shadeX} y={M.top} 
          width={shadeWidth} height={PLOT_H} 
          fill="#FDEFEF" opacity="0.8" 
        />
      )}

      {/* Grid and Axes */}
      {xTicks.map(t => (
        <g key={`x-${t}`}>
          <line x1={sx(t)} y1={M.top} x2={sx(t)} y2={M.top + PLOT_H} stroke="var(--line)" />
          <text x={sx(t)} y={M.top + PLOT_H + 20} textAnchor="middle" fontSize="12" fill="var(--muted)">{t} y</text>
        </g>
      ))}
      
      {yTicks.map(p => (
        <g key={`y-${p}`}>
          <line x1={M.left} y1={sy(p)} x2={M.left + PLOT_W} y2={sy(p)} stroke="var(--line)" />
          <text x={M.left - 10} y={sy(p) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{Math.round(p * 100)}%</text>
        </g>
      ))}

      <rect x={M.left} y={M.top} width={PLOT_W} height={PLOT_H} fill="none" stroke="var(--muted)" />
      
      {/* Axis Labels */}
      <text x={M.left + PLOT_W / 2} y={H - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)">Time (years)</text>
      <text 
        x={16} y={M.top + PLOT_H / 2} 
        textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)"
        transform={`rotate(-90 16 ${M.top + PLOT_H / 2})`}
      >
        Probability of survival
      </text>

      {/* Median prognosis line */}
      {prognosisYears <= X_MAX && (
        <g>
          <line 
            x1={sx(prognosisYears)} y1={M.top} 
            x2={sx(prognosisYears)} y2={M.top + PLOT_H} 
            stroke="var(--danger)" strokeWidth="2" strokeDasharray="6 4" 
          />
          <text 
            x={sx(prognosisYears)} y={M.top - 10} 
            textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--danger)"
          >
            Median prognosis ({prognosisYears < 1 ? Math.round(prognosisYears * 12) + " mo" : prognosisYears.toFixed(1) + " y"})
          </text>
        </g>
      )}

      {/* Survival curve */}
      <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth="3" className="survival-curve" />

      {/* TTB bars */}
      {activeMeds.length === 0 ? (
        <text x={M.left + 20} y={M.top + 40} fontSize="14" fill="var(--muted)" fontStyle="italic">
          Select at least one medication to view TTB bars.
        </text>
      ) : (
        activeMeds.map((m, i) => {
          const y = M.top + 25 + i * 28;
          
          // Use max TTB for color coding logic to be conservative (worst case scenario)
          const beyond = m.ttbMax > prognosisYears;
          const marginal = !beyond && m.ttbMax > prognosisYears * 0.6;
          const color = beyond ? "var(--danger)" : marginal ? "var(--warn)" : "var(--ok)";
          
          const startX = M.left;
          const endMinX = sx(Math.min(m.ttbMin, X_MAX));
          const endMaxX = sx(Math.min(m.ttbMax, X_MAX));
          
          const isRange = m.ttbMin !== m.ttbMax;
          const ttbLabel = m.name + " — TTB " + (isRange ? `${m.ttbMin}-${m.ttbMax} y` : (m.ttbMin < 1 ? Math.round(m.ttbMin * 12) + " mo" : m.ttbMin + " y"));
          
          const tx = Math.min(endMaxX + 10, M.left + PLOT_W - 5);
          const isRightAligned = tx >= M.left + PLOT_W - 5;

          return (
            <g key={m.id} className="ttb-bar-group">
              {/* Solid bar to minimum TTB */}
              <line x1={startX} y1={y} x2={endMinX} y2={y} stroke={color} strokeWidth="6" strokeLinecap="round" opacity="0.9" />
              
              {/* Range bar (error bar / gradient representation) to maximum TTB */}
              {isRange && (
                <>
                  <line x1={endMinX} y1={y} x2={endMaxX} y2={y} stroke={color} strokeWidth="6" strokeDasharray="2 4" strokeLinecap="round" opacity="0.6" />
                  <circle cx={endMaxX} cy={y} r="3" fill={color} opacity="0.6" />
                </>
              )}
              
              {!isRange && <circle cx={endMinX} cy={y} r="5" fill={color} />}
              
              <text 
                x={tx} y={y + 4} 
                fontSize="11" fontWeight="600" fill={color}
                textAnchor={isRightAligned ? "end" : "start"}
              >
                {ttbLabel}
              </text>
            </g>
          );
        })
      )}
    </svg>
  );
};

export default Chart;
