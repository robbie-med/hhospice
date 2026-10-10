import React, { useState } from 'react';
import { fmt, roundMeth } from '../data/constants';
import { Alert } from './Alert';

interface Props {
  scheduledTDD: number | null;
  strategy: string;
}

export const TitrationDashboard: React.FC<Props> = ({ scheduledTDD, strategy }) => {
  const [prnDoses, setPrnDoses] = useState<number[]>([0, 0, 0, 0, 0]);

  const updatePrn = (dayIndex: number, val: string) => {
    const newVal = parseFloat(val) || 0;
    const newArr = [...prnDoses];
    newArr[dayIndex] = newVal;
    setPrnDoses(newArr);
  };

  const calculateDay6Maintenance = () => {
    // If it's a fixed PRN protocol like Morley-Makin (where scheduled is 0),
    // the day 6 maintenance is strictly the mean of day 4 and 5 actual total doses.
    // If it's a gradual protocol with scheduled doses, it's Scheduled + Mean(Day4 PRN, Day5 PRN).
    
    const day4 = prnDoses[3];
    const day5 = prnDoses[4];
    const meanPrn = (day4 + day5) / 2;
    
    if (strategy === "prn" || scheduledTDD == null) {
      return roundMeth(meanPrn);
    }
    
    return roundMeth(scheduledTDD + meanPrn);
  };

  const day6TDD = calculateDay6Maintenance();

  return (
    <section className="card">
      <h2><span className="step-badge">5</span> Titration &amp; Monitoring Dashboard</h2>
      <p className="text-muted">
        Methadone has a long half-life and achieves steady state around day 5. Use this dashboard to log the actual breakthrough (PRN) doses taken to calculate the true maintenance requirement on day 6.
      </p>

      <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Day 1 PRN (mg)</th>
              <th>Day 2 PRN (mg)</th>
              <th>Day 3 PRN (mg)</th>
              <th>Day 4 PRN (mg)</th>
              <th>Day 5 PRN (mg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {[0, 1, 2, 3, 4].map(day => (
                <td key={day}>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.5" 
                    placeholder="0"
                    value={prnDoses[day] || ''} 
                    onChange={e => updatePrn(day, e.target.value)} 
                  />
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <Alert type="success" title="Suggested Day 6 Maintenance Dose">
        Based on the steady-state PRN usage (Days 4–5), the suggested new Total Daily Dose (TDD) for Day 6 is <strong>{fmt(day6TDD)} mg/day</strong>.
        <br/><br/>
        Given BID (q12h), this is <strong>{fmt(roundMeth(day6TDD / 2))} mg per dose</strong>.
        <br/>
        Given TID (q8h), this is <strong>{fmt(roundMeth(day6TDD / 3))} mg per dose</strong>.
      </Alert>
    </section>
  );
};
