export interface NEWS2Params {
  respRate?: number;       // breaths/min
  spo2?: number;           // %
  systolicBp?: number;     // mmHg
  heartRate?: number;      // bpm
  temp?: number;           // °C
  consciousnessAlert?: boolean; // true = Alert, false = Confused/Voice/Pain/Unresponsive
}

export const calculateNEWS2 = (params: NEWS2Params): { score: number; risk: 'LOW' | 'MEDIUM' | 'HIGH'; color: string } => {
  let score = 0;
  let count = 0;

  // 1. Respiration Rate
  if (params.respRate !== undefined) {
    count++;
    const rr = params.respRate;
    if (rr <= 8) score += 3;
    else if (rr >= 9 && rr <= 11) score += 1;
    else if (rr >= 12 && rr <= 20) score += 0;
    else if (rr >= 21 && rr <= 24) score += 2;
    else if (rr >= 25) score += 3;
  }

  // 2. SpO2
  if (params.spo2 !== undefined) {
    count++;
    const s = params.spo2;
    if (s <= 91) score += 3;
    else if (s >= 92 && s <= 93) score += 2;
    else if (s >= 94 && s <= 95) score += 1;
    else if (s >= 96) score += 0;
  }

  // 3. Systolic BP
  if (params.systolicBp !== undefined) {
    count++;
    const bp = params.systolicBp;
    if (bp <= 90) score += 3;
    else if (bp >= 91 && bp <= 100) score += 2;
    else if (bp >= 101 && bp <= 110) score += 1;
    else if (bp >= 111 && bp <= 219) score += 0;
    else if (bp >= 220) score += 3;
  }

  // 4. Heart Rate
  if (params.heartRate !== undefined) {
    count++;
    const hr = params.heartRate;
    if (hr <= 40) score += 3;
    else if (hr >= 41 && hr <= 50) score += 1;
    else if (hr >= 51 && hr <= 90) score += 0;
    else if (hr >= 91 && hr <= 110) score += 1;
    else if (hr >= 111 && hr <= 130) score += 2;
    else if (hr >= 131) score += 3;
  }

  // 5. Temperature
  if (params.temp !== undefined) {
    count++;
    const t = params.temp;
    if (t <= 35.0) score += 3;
    else if (t >= 35.1 && t <= 36.0) score += 1;
    else if (t >= 36.1 && t <= 38.0) score += 0;
    else if (t >= 38.1 && t <= 39.0) score += 1;
    else if (t >= 39.1) score += 3;
  }

  // 6. Consciousness
  if (params.consciousnessAlert !== undefined) {
    count++;
    if (!params.consciousnessAlert) {
      score += 3; // Confused, Voice, Pain, or Unresponsive triggers a score of 3
    }
  }

  let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  let color = '#2b8a3e'; // green

  if (score >= 5 || count === 6 && score >= 5) {
    risk = 'MEDIUM';
    color = '#e67e22'; // orange
  }
  // Any single parameter scoring 3 triggers an urgent review or high score >= 7
  const hasSingleThree = 
    (params.respRate !== undefined && (params.respRate <= 8 || params.respRate >= 25)) ||
    (params.spo2 !== undefined && params.spo2 <= 91) ||
    (params.systolicBp !== undefined && (params.systolicBp <= 90 || params.systolicBp >= 220)) ||
    (params.heartRate !== undefined && (params.heartRate <= 40 || params.heartRate >= 131)) ||
    (params.temp !== undefined && (params.temp <= 35.0 || params.temp >= 39.1)) ||
    (params.consciousnessAlert !== undefined && !params.consciousnessAlert);

  if (score >= 7 || hasSingleThree) {
    risk = 'HIGH';
    color = '#c92a2a'; // red
  }

  return { score, risk, color };
};
