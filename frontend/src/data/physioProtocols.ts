export interface PhysioProtocolConfig {
  id: string;
  category: 'Orthopedic & Post-Surgical' | 'Spine, Neck & Posture' | 'Neurological & Balance' | 'Cardiopulmonary & Functional' | 'Sports & Performance' | 'Paediatric Rehabilitation' | 'Geriatric & Fall Prevention' | 'Hand & Upper Limb' | 'Women\'s Health & Pelvic' | 'Oncology & Lymphoedema';
  icon: string;
  shortName: string;
  title: string;
  targetRom: string;
  indication: string;
  landmarks: string;
  steps: string[];
  formTips: string[];
  getHud: (lA: number, rA: number, torso: number, sym: number) => [string, string][];
  getSim: (
    w: number,
    h: number,
    cycle: number,
    simStep: number,
    isBadForm: boolean,
    headX: number,
    headY: number
  ) => {
    lA: number;
    rA: number;
    torso: number;
    sym: number;
    status: string;
    score: number;
    lSh: { x: number; y: number };
    rSh: { x: number; y: number };
    lHip: { x: number; y: number };
    rHip: { x: number; y: number };
    lKnee: { x: number; y: number };
    rKnee: { x: number; y: number };
    lAnkle: { x: number; y: number };
    rAnkle: { x: number; y: number };
    lEl: { x: number; y: number };
    rEl: { x: number; y: number };
    lWr: { x: number; y: number };
    rWr: { x: number; y: number };
  };
}

export const PHYSIO_CATEGORIES = [
  'Orthopedic & Post-Surgical',
  'Spine, Neck & Posture',
  'Neurological & Balance',
  'Cardiopulmonary & Functional',
  'Sports & Performance',
  'Paediatric Rehabilitation',
  'Geriatric & Fall Prevention',
  'Hand & Upper Limb',
  'Women\'s Health & Pelvic',
  'Oncology & Lymphoedema'
] as const;

export const PHYSIO_PROTOCOLS: Record<string, PhysioProtocolConfig> = {
  // ── 1. SHOULDER ABDUCTION (CORONAL PLANE 0-180°) ───────────────────────────
  'Shoulder Abduction': {
    id: 'Shoulder Abduction',
    category: 'Orthopedic & Post-Surgical',
    icon: '🦾',
    shortName: 'Shoulder Abduction & Coronal Elevation (0°–180°)',
    title: 'Shoulder Abduction & Coronal Elevation (0°–180° Range)',
    targetRom: '0° to 180° (Functional: 120°–150°)',
    indication: 'Rotator cuff repair, adhesive capsulitis (frozen shoulder), subacromial impingement, shoulder bursitis.',
    landmarks: 'Left/Right Shoulder (5, 6), Left/Right Elbow (7, 8), Wrists (9, 10), Torso midline.',
    steps: [
      '1. Stand or sit upright with spine neutral and arms resting naturally at your sides.',
      '2. Slowly raise both arms outward to the sides in the coronal plane, keeping elbows straight.',
      '3. Elevate arms smoothly up to shoulder level (90°) or overhead (120°-180°).',
      '4. Hold at peak elevation for 2 seconds to engage deltoid and supraspinatus stabilizers.',
      '5. Controlled descent: Slowly lower arms back to resting position over 3 seconds.'
    ],
    formTips: [
      '⚠️ Avoid hiking or shrugging shoulders toward ears (upper trapezius compensation).',
      '⚠️ Do not lean your torso sideways to swing the injured arm up (keep torso alignment >90%).',
      '⚠️ Ensure symmetrical bilateral elevation speed and height.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Left Shoulder:', `${lA}°`],
      ['Right Shoulder:', `${rA}°`],
      ['Torso Alignment:', `${torso}%`],
      ['Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const cur = Math.round(15 + cycle * 130);
      const lA = isBadForm ? Math.min(160, cur + 25) : cur;
      const rA = cur;
      const torso = isBadForm ? 55 : 100;
      const sym = isBadForm ? 65 : 99;
      const score = isBadForm ? 71 : Math.round(85 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING (2s)' : (Math.cos(simStep) > 0 ? 'RAISING ARMS' : 'LOWERING'));

      const lSh = { x: w / 2 - 108, y: h * 0.30 };
      const rSh = { x: w / 2 + 108, y: h * 0.30 };
      const lHip = { x: w / 2 - 57, y: h * 0.53 };
      const rHip = { x: w / 2 + 57, y: h * 0.53 };
      const lKnee = { x: w / 2 - 62, y: h * 0.735 };
      const rKnee = { x: w / 2 + 62, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 66, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 66, y: h * 0.915 };

      const aL = (lA * Math.PI) / 180;
      const aR = (rA * Math.PI) / 180;
      const lEl = { x: lSh.x - Math.sin(aL) * 95, y: lSh.y + Math.cos(aL) * 95 };
      const lWr = { x: lEl.x - Math.sin(aL) * 85, y: lEl.y + Math.cos(aL) * 85 };
      const rEl = { x: rSh.x + Math.sin(aR) * 95, y: rSh.y + Math.cos(aR) * 95 };
      const rWr = { x: rEl.x + Math.sin(aR) * 85, y: rEl.y + Math.cos(aR) * 85 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 2. SHOULDER FORWARD FLEXION (SAGITTAL 0-180°) ───────────────────────────
  'Shoulder Forward Flexion': {
    id: 'Shoulder Forward Flexion',
    category: 'Orthopedic & Post-Surgical',
    icon: '🧗',
    shortName: 'Shoulder Forward Flexion & Anterior Reach (0°–180°)',
    title: 'Shoulder Forward Flexion & Sagittal Anterior Reach (0°–180°)',
    targetRom: '0° to 180° (Functional: 135°–160°)',
    indication: 'Bicipital tendinitis, anterior capsulitis, post-clavicular/humeral fracture stiffness.',
    landmarks: 'Anterior Deltoid, Bicipital Groove, Elbows, Wrists, Vertical Thoracic Spine.',
    steps: [
      '1. Stand tall with thumbs pointing upward (neutral glenohumeral rotation).',
      '2. Elevate arms forward in the sagittal plane directly in front of the chest.',
      '3. Reach upward smoothly until arms are alongside ears (150°-180°).',
      '4. Hold at maximum pain-free overhead reach for 2 seconds.',
      '5. Guide arms down slowly in a controlled sagittal descent.'
    ],
    formTips: [
      '⚠️ Guard against excessive lumbar lordosis (arching back) to gain overhead reach.',
      '⚠️ Avoid elbows flaring outward into abduction during sagittal ascent.',
      '⚠️ Maintain steady diaphragmatic breathing; do not hold breath during peak reach.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Left Forward Flex:', `${lA}°`],
      ['Right Forward Flex:', `${rA}°`],
      ['Spine Plumb Line:', `${torso}%`],
      ['Reach Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const cur = Math.round(30 + cycle * 70);
      const lA = cur;
      const rA = isBadForm ? cur - 20 : cur;
      const torso = isBadForm ? 60 : 100;
      const sym = isBadForm ? 70 : 98;
      const score = isBadForm ? 74 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING OVERHEAD (2s)' : (Math.cos(simStep) > 0 ? 'FORWARD REACHING' : 'LOWERING'));

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.53 };
      const rHip = { x: w / 2 + 55, y: h * 0.53 };
      const lKnee = { x: w / 2 - 60, y: h * 0.735 };
      const rKnee = { x: w / 2 + 60, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 65, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 65, y: h * 0.915 };

      const reachY = (h * 0.48) - cycle * (h * 0.38);
      const lEl = { x: lSh.x + 25 - cycle * 15, y: lSh.y + 60 - cycle * 85 };
      const rEl = { x: rSh.x - 25 + cycle * 15, y: rSh.y + 60 - cycle * 85 };
      const lWr = { x: w / 2 - 35, y: reachY };
      const rWr = { x: w / 2 + 35, y: reachY + (isBadForm ? 25 : 0) };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 3. POST-OP KNEE FLEXION & EXTENSION ────────────────────────────────────
  'Knee Flexion Extension': {
    id: 'Knee Flexion Extension',
    category: 'Orthopedic & Post-Surgical',
    icon: '🦵',
    shortName: 'Post-OP Knee Flexion & Terminal Extension',
    title: 'Post-OP Knee Flexion & Active Terminal Extension (0°–120°)',
    targetRom: 'Flexion: 0° to 120° | Extension: Full 0° Terminal Extension',
    indication: 'Total Knee Arthroplasty (TKA), ACL/PCL reconstruction, meniscal repair, patellar fracture.',
    landmarks: 'Hips (11, 12), Operated Knee (14), Contralateral Knee (13), Ankle Joint (16).',
    steps: [
      '1. Sit upright on a treatment bench or firm chair with legs hanging naturally.',
      '2. Flexion: Slide the operated heel backward under the chair to maximum comfortable flexion.',
      '3. Hold end-range knee flexion for 3 seconds to stretch periarticular capsular tissues.',
      '4. Extension: Straighten operated leg horizontally outward into full terminal extension (0°).',
      '5. Squeeze the quadriceps muscle tightly at peak extension for 2 seconds before lowering.'
    ],
    formTips: [
      '⚠️ Do not lift the pelvic hip off the seat during flexion (pelvic tilt compensation).',
      '⚠️ Avoid abrupt leg dropping; maintain eccentric hamstring/quadriceps control.',
      '⚠️ Ensure full terminal extension (0°) without residual knee extensor lag.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Operated Knee Flex:', `${rA}°`],
      ['Terminal Extension:', `${Math.max(0, 110 - rA)}°`],
      ['Pelvic Alignment:', `${torso}%`],
      ['Quadriceps Control:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const flexDeg = Math.round(10 + cycle * 100);
      const rA = flexDeg;
      const lA = 10;
      const torso = isBadForm ? 65 : 100;
      const sym = isBadForm ? 60 : 96;
      const score = isBadForm ? 70 : Math.round(86 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING FLEXION (3s)' : (Math.cos(simStep) > 0 ? 'FLEXING UNDER CHAIR' : 'TERMINAL EXTENSION (0°)'));

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.50 };
      const rHip = { x: w / 2 + 55, y: h * 0.50 };
      const lKnee = { x: w / 2 - 65, y: h * 0.65 };
      const rKnee = { x: w / 2 + 65, y: h * 0.65 };
      const lAnkle = { x: w / 2 - 65, y: h * 0.88 };

      const lEl = { x: lSh.x - 20, y: lSh.y + 65 }; const lWr = { x: lKnee.x - 5, y: lKnee.y - 12 };
      const rEl = { x: rSh.x + 20, y: rSh.y + 65 }; const rWr = { x: rKnee.x + 5, y: rKnee.y - 12 };

      const kAngleRad = (flexDeg * Math.PI) / 180;
      const rAnkle = {
        x: rKnee.x + Math.sin(kAngleRad) * 75,
        y: rKnee.y + Math.cos(kAngleRad) * 75
      };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 4. FUNCTIONAL SQUAT & HIP KINEMATICS ──────────────────────────────────
  'Functional Squat': {
    id: 'Functional Squat',
    category: 'Orthopedic & Post-Surgical',
    icon: '🏋️',
    shortName: 'Functional Bilateral Squat & Hip Mechanics',
    title: 'Functional Bilateral Squat & Lower Kinetic Chain Kinematics (0°–90°)',
    targetRom: 'Hip/Knee Flexion: 0° to 90° (Parallel Thigh Depth)',
    indication: 'Patellofemoral pain syndrome, Total Hip Arthroplasty recovery, gluteal neuromuscular strengthening.',
    landmarks: 'Hips, Bilateral Knees, Ankles, Lumbar Spine Angle.',
    steps: [
      '1. Stand with feet shoulder-width apart, toes slightly turned outward (5°-10°).',
      '2. Hinge at hips and bend knees simultaneously, extending arms forward for counter-balance.',
      '3. Lower hips smoothly until thighs are parallel with the floor (80°-90° knee flexion).',
      '4. Keep chest proud, weight distributed evenly across midfoot and heels.',
      '5. Drive through heels to return to full upright standing position.'
    ],
    formTips: [
      '⚠️ Prevent knee valgus collapse (knees caving inward toward each other).',
      '⚠️ Do not allow heels to lift off the ground (excessive anterior knee shear).',
      '⚠️ Guard against excessive trunk forward lean (maintain upright thoracic posture).'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Squat Knee Depth:', `${rA}°`],
      ['Hip Hinge Angle:', `${lA}°`],
      ['Torso Uprightness:', `${torso}%`],
      ['Bilateral Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const kneeDepth = Math.round(15 + cycle * 70); // 15° to 85°
      const rA = kneeDepth;
      const lA = Math.round(kneeDepth * 0.9);
      const torso = isBadForm ? 50 : 98;
      const sym = isBadForm ? 62 : 98;
      const score = isBadForm ? 68 : Math.round(87 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING AT DEPTH (2s)' : (Math.cos(simStep) > 0 ? 'DESCENDING SQUAT' : 'DRIVING UP'));

      const squatDrop = cycle * (h * 0.15);
      const lSh = { x: w / 2 - 100, y: h * 0.30 + squatDrop };
      const rSh = { x: w / 2 + 100, y: h * 0.30 + squatDrop };
      const lHip = { x: w / 2 - 65, y: h * 0.53 + squatDrop };
      const rHip = { x: w / 2 + 65, y: h * 0.53 + squatDrop };
      const lKnee = { x: w / 2 - 80, y: h * 0.735 + squatDrop * 0.5 };
      const rKnee = { x: w / 2 + 80, y: h * 0.735 + squatDrop * 0.5 };
      const lAnkle = { x: w / 2 - 75, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 75, y: h * 0.915 };

      const lEl = { x: lSh.x - 30, y: lSh.y + 20 }; const lWr = { x: lSh.x - 70, y: lSh.y + 10 };
      const rEl = { x: rSh.x + 30, y: rSh.y + 20 }; const rWr = { x: rSh.x + 70, y: rSh.y + 10 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 5. STANDING HIP ABDUCTION & GLUTEUS MEDIUS ─────────────────────────────
  'Standing Hip Abduction': {
    id: 'Standing Hip Abduction',
    category: 'Orthopedic & Post-Surgical',
    icon: '🦿',
    shortName: 'Standing Hip Abduction & Gluteus Medius',
    title: 'Standing Hip Abduction & Pelvic Stabilizer Strengthening (0°–45°)',
    targetRom: '0° to 45° Lateral Abduction',
    indication: 'Greater trochanteric pain syndrome (GTPS), IT band friction, Trendelenburg gait correction.',
    landmarks: 'Stance Hip, Abducting Hip, Knee, Ankle, ASIS Pelvic Line.',
    steps: [
      '1. Stand upright holding a support or wall with stance leg firmly grounded.',
      '2. Keep operated leg straight with toes pointing forward (avoid external hip rotation).',
      '3. Lift the leg laterally outward to the side (30°-45°).',
      '4. Hold at peak abduction for 2 seconds to isolate the gluteus medius.',
      '5. Slowly lower leg back to midline without touching the floor between reps.'
    ],
    formTips: [
      '⚠️ Avoid lateral trunk tilting away from the moving leg (Trendelenburg compensation).',
      '⚠️ Do not rotate toes outward (shifts recruitment to tensor fasciae latae).',
      '⚠️ Maintain level pelvis throughout the entire abduction excursion.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Operated Hip Abduction:', `${rA}°`],
      ['Stance Hip Stability:', `${lA}°`],
      ['Pelvic Levelness:', `${torso}%`],
      ['Gluteal Activation:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const abdDeg = Math.round(5 + cycle * 38);
      const rA = abdDeg;
      const lA = 5;
      const torso = isBadForm ? 58 : 99;
      const sym = isBadForm ? 65 : 97;
      const score = isBadForm ? 72 : Math.round(89 + cycle * 9);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING ABDUCTION (2s)' : (Math.cos(simStep) > 0 ? 'ABDUCTING OUTWARD' : 'LOWERING'));

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.53 };
      const rHip = { x: w / 2 + 55, y: h * 0.53 };
      const lKnee = { x: w / 2 - 58, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 60, y: h * 0.915 };

      const lEl = { x: lSh.x - 35, y: lSh.y + 55 }; const lWr = { x: lHip.x - 5, y: lHip.y };
      const rEl = { x: rSh.x + 35, y: rSh.y + 55 }; const rWr = { x: rHip.x + 5, y: rHip.y };

      const rRad = (abdDeg * Math.PI) / 180;
      const rKnee = { x: rHip.x + Math.sin(rRad) * 90, y: rHip.y + Math.cos(rRad) * 90 };
      const rAnkle = { x: rKnee.x + Math.sin(rRad) * 90, y: rKnee.y + Math.cos(rRad) * 90 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 6. STANDING CALF RAISE & ANKLE PLANTARFLEXION ──────────────────────────
  'Standing Calf Raise': {
    id: 'Standing Calf Raise',
    category: 'Orthopedic & Post-Surgical',
    icon: '🦶',
    shortName: 'Standing Calf Raise & Ankle Plantarflexion',
    title: 'Standing Calf Raise & Gastrocnemius-Soleus Power (0°–40°)',
    targetRom: '0° to 40° Ankle Plantarflexion',
    indication: 'Achilles tendinopathy, post-ankle fracture, chronic ankle instability, gastrocnemius strain.',
    landmarks: 'Bilateral Lateral Malleoli, Calcaneus, Knee, 1st Metatarsophalangeal Joint.',
    steps: [
      '1. Stand with feet hip-width apart and knees fully straight.',
      '2. Elevate both heels off the floor, pressing evenly through the balls of both feet.',
      '3. Rise onto full plantarflexion height (35°-40°).',
      '4. Pause at the top for 2 seconds for peak concentric contraction.',
      '5. Lower heels slowly over 3 seconds for eccentric tendon loading.'
    ],
    formTips: [
      '⚠️ Avoid ankle eversion/inversion (sickling); push straight through the 1st and 2nd toes.',
      '⚠️ Do not bend knees to bounce up (keep knees locked in terminal extension).',
      '⚠️ Control the lowering phase without dropping heels abruptly.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Left Plantarflexion:', `${lA}°`],
      ['Right Plantarflexion:', `${rA}°`],
      ['Vertical Plumb Line:', `${torso}%`],
      ['Bilateral Balance:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const plantDeg = Math.round(5 + cycle * 35);
      const lA = plantDeg;
      const rA = isBadForm ? plantDeg - 12 : plantDeg;
      const torso = isBadForm ? 65 : 100;
      const sym = isBadForm ? 70 : 99;
      const score = isBadForm ? 73 : Math.round(90 + cycle * 8);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING ON TOES (2s)' : (Math.cos(simStep) > 0 ? 'RISING ONTO TOES' : 'ECCENTRIC LOWERING'));

      const calfLift = cycle * 28;
      const lSh = { x: w / 2 - 100, y: h * 0.30 - calfLift };
      const rSh = { x: w / 2 + 100, y: h * 0.30 - calfLift };
      const lHip = { x: w / 2 - 55, y: h * 0.53 - calfLift };
      const rHip = { x: w / 2 + 55, y: h * 0.53 - calfLift };
      const lKnee = { x: w / 2 - 58, y: h * 0.735 - calfLift };
      const rKnee = { x: w / 2 + 58, y: h * 0.735 - calfLift };
      const lAnkle = { x: w / 2 - 60, y: h * 0.915 - calfLift };
      const rAnkle = { x: w / 2 + 60, y: h * 0.915 - calfLift + (isBadForm ? 8 : 0) };

      const lEl = { x: lSh.x - 20, y: lSh.y + 70 }; const lWr = { x: lSh.x - 20, y: lSh.y + 140 };
      const rEl = { x: rSh.x + 20, y: rSh.y + 70 }; const rWr = { x: rSh.x + 20, y: rSh.y + 140 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 7. LUMBAR SPINE CORE STABILIZATION & PELVIC TILT ───────────────────────
  'Lumbar Spine Core Tilt': {
    id: 'Lumbar Spine Core Tilt',
    category: 'Spine, Neck & Posture',
    icon: '🦴',
    shortName: 'Lumbar Spine Core Stabilization & Pelvic Tilt',
    title: 'Lumbar Spine Core Stabilization & Dynamic Pelvic Tilt (±25°)',
    targetRom: 'Controlled Pelvic & Lumbar Excursion: ±25°',
    indication: 'Lumbar disc herniation (L4-S1), chronic mechanical low back pain, spondylolisthesis, facet syndrome.',
    landmarks: 'Shoulders (5, 6), Pelvis / Iliac Crests (11, 12), Spine Midline.',
    steps: [
      '1. Stand with feet hip-width apart and hands placed lightly on your iliac crests (hips).',
      '2. Engage transversus abdominis by gently drawing navel toward spine.',
      '3. Perform a controlled lateral pelvic tilt without twisting the lumbar vertebrae.',
      '4. Hold stabilized position for 3 seconds while breathing smoothly.',
      '5. Alternate sides with controlled core stabilization.'
    ],
    formTips: [
      '⚠️ Avoid hyperextending (arching) lower back into excessive lumbar lordosis.',
      '⚠️ Do not shift ribcage away from the pelvic center line.',
      '⚠️ Maintain equal weight distribution between both feet.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Lumbar Lateral Tilt:', `${rA}°`],
      ['Spine Centerline:', `${lA}°`],
      ['Torso Alignment:', `${torso}%`],
      ['Core Stability:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const tiltDeg = Math.round(Math.sin(simStep) * 25);
      const rA = Math.abs(tiltDeg);
      const lA = Math.round(Math.abs(tiltDeg) * 0.6);
      const torso = isBadForm ? 55 : 100;
      const sym = isBadForm ? 65 : 98;
      const score = isBadForm ? 71 : Math.round(87 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (Math.abs(tiltDeg) > 18 ? 'HOLDING TILT (3s)' : 'CORE STABILIZING');

      const dX = Math.sin(simStep) * 45;
      const lSh = { x: w / 2 - 108 + dX, y: h * 0.30 - dX * 0.1 };
      const rSh = { x: w / 2 + 108 + dX, y: h * 0.30 + dX * 0.1 };
      const lHip = { x: w / 2 - 57, y: h * 0.53 };
      const rHip = { x: w / 2 + 57, y: h * 0.53 };
      const lKnee = { x: w / 2 - 62, y: h * 0.735 };
      const rKnee = { x: w / 2 + 62, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 66, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 66, y: h * 0.915 };

      const lEl = { x: lSh.x - 45, y: lSh.y + 55 }; const lWr = { x: lHip.x, y: lHip.y };
      const rEl = { x: rSh.x + 45, y: rSh.y + 55 }; const rWr = { x: rHip.x, y: rHip.y };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 8. CERVICAL SPINE ACTIVE RANGE OF MOTION ──────────────────────────────
  'Cervical Spine ROM': {
    id: 'Cervical Spine ROM',
    category: 'Spine, Neck & Posture',
    icon: '🧘',
    shortName: 'Cervical Spine Active Range of Motion',
    title: 'Cervical Spine Active Mobility & Multi-Planar Range of Motion (0°–45°)',
    targetRom: 'Lateral Flexion: 0° to 45° | Rotation: 0° to 70°',
    indication: 'Cervical radiculopathy, mechanical neck pain, whiplash injury, postural cervicogenic headache.',
    landmarks: 'Nose (0), Ears (3, 4), Shoulders (5, 6), Sternoclavicular Joint.',
    steps: [
      '1. Sit upright with shoulders relaxed and scapulae gently retracted.',
      '2. Slowly tilt ear toward the shoulder, maintaining gaze straight ahead.',
      '3. Hold gentle lateral stretch for 3 seconds at end-range.',
      '4. Return to center and slowly rotate head smoothly to look over shoulder.',
      '5. Perform all movements smoothly without forcing into sharp pain.'
    ],
    formTips: [
      '⚠️ Do not elevate or shrug shoulder up to meet ear (keep shoulders anchored).',
      '⚠️ Avoid poking chin forward (excessive upper cervical extension).',
      '⚠️ Stop before provoking radiating paresthesia or dizziness.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Cervical Lateral Tilt:', `${rA}°`],
      ['Cervical Rotation:', `${lA}°`],
      ['Shoulder Depression:', `${torso}%`],
      ['Range Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      // Smooth sinusoidal multi-planar cervical kinematics:
      // Lateral tilt (-35° to +35°) and axial rotation (-55° to +55°)
      const cTilt = Math.sin(simStep * 0.9) * 35;
      const cRot = Math.sin(simStep * 0.65) * 50;
      const rA = Math.round(Math.abs(cTilt));
      const lA = Math.round(Math.abs(cRot));
      const torso = isBadForm ? 65 : 100;
      const sym = isBadForm ? 68 : 98;
      const score = isBadForm ? 73 : Math.min(99, Math.round(92 + (cycle % 3) * 3.5));
      const status = isBadForm
        ? 'IMPROVE FORM • AVOID SHOULDER SHRUG'
        : (Math.abs(cTilt) > 24
          ? (cTilt > 0 ? 'HOLDING RIGHT LATERAL STRETCH (3s)' : 'HOLDING LEFT LATERAL STRETCH (3s)')
          : (Math.abs(cRot) > 35 ? 'CERVICAL ROTATION ARC' : 'ACTIVE CERVICAL MOBILIZATION'));

      const hX = (headX ?? w / 2) + cTilt * 0.7;
      const hY = (headY ?? h * 0.19) + Math.abs(cTilt) * 0.12;

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.53 };
      const rHip = { x: w / 2 + 55, y: h * 0.53 };
      const lKnee = { x: w / 2 - 60, y: h * 0.735 };
      const rKnee = { x: w / 2 + 60, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 65, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 65, y: h * 0.915 };

      const lEl = { x: lSh.x - 18, y: lSh.y + 65 }; const lWr = { x: lHip.x - 10, y: lHip.y + 25 };
      const rEl = { x: rSh.x + 18, y: rSh.y + 65 }; const rWr = { x: rHip.x + 10, y: rHip.y + 25 };

      return {
        lA, rA, torso, sym, status, score,
        cTilt, cRot, headX: hX, headY: hY,
        lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr
      };
    }
  },

  // ── 9. SCAPULAR RETRACTION & POSTURAL RESET ────────────────────────────────
  'Scapular Retraction': {
    id: 'Scapular Retraction',
    category: 'Spine, Neck & Posture',
    icon: '🧍',
    shortName: 'Scapular Retraction & Posture Reset',
    title: 'Scapular Retraction, Rhomboid Activation & Postural Reset',
    targetRom: 'Retraction Depth: Full Glenohumeral Posterior Adduction',
    indication: 'Upper crossed syndrome, thoracic kyphosis, forward head posture, thoracic outlet syndrome.',
    landmarks: 'Acromion (5, 6), Medial Scapular Borders, Elbows (7, 8), Mid-Thoracic Axis.',
    steps: [
      '1. Stand tall with elbows bent at 90° and tucked close to your ribs.',
      '2. Slowly squeeze shoulder blades together behind your back (pinch mid-spine).',
      '3. Rotate forearms outward into external rotation while keeping elbows pinned.',
      '4. Hold peak rhomboid contraction for 3 seconds while expanding chest.',
      '5. Slowly release back to neutral starting position.'
    ],
    formTips: [
      '⚠️ Guard against shrugging shoulders up toward ears; pull shoulder blades down and back.',
      '⚠️ Do not push ribcage and abdomen forward into spinal hyperextension.',
      '⚠️ Keep chin gently tucked in cervical neutral.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Scapular Pinch Angle:', `${rA}°`],
      ['External Rotation:', `${lA}°`],
      ['Thoracic Posture:', `${torso}%`],
      ['Rhomboid Balance:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const pinchDeg = Math.round(20 + cycle * 45);
      const rA = pinchDeg;
      const lA = pinchDeg;
      const torso = isBadForm ? 62 : 100;
      const sym = isBadForm ? 65 : 99;
      const score = isBadForm ? 72 : Math.round(90 + cycle * 8);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING RETRACTION (3s)' : (Math.cos(simStep) > 0 ? 'PINCHING SCAPULAE' : 'RELEASING'));

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.53 };
      const rHip = { x: w / 2 + 55, y: h * 0.53 };
      const lKnee = { x: w / 2 - 60, y: h * 0.735 };
      const rKnee = { x: w / 2 + 60, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 65, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 65, y: h * 0.915 };

      const lEl = { x: lSh.x - 20 - cycle * 18, y: lSh.y + 70 };
      const rEl = { x: rSh.x + 20 + cycle * 18, y: rSh.y + 70 };
      const lWr = { x: lEl.x - 45 - cycle * 35, y: lEl.y - 10 };
      const rWr = { x: rEl.x + 45 + cycle * 35, y: rEl.y - 10 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 10. POST-STROKE HEMIPARETIC NEURO-MOTOR ARM ELEVATION ──────────────────
  'Hemiparetic Arm Elevation': {
    id: 'Hemiparetic Arm Elevation',
    category: 'Neurological & Balance',
    icon: '💪',
    shortName: 'Post-Stroke Hemiparetic Neuro-Motor Arm Elevation',
    title: 'Post-Stroke Hemiparetic Neuro-Motor Arm Elevation (Active-Assisted 45°–90°)',
    targetRom: 'Active Assisted Elevation: 45° to 90° Range',
    indication: 'Cerebrovascular accident (CVA) / stroke neuro-rehabilitation, upper limb hemiparesis/hemiplegia.',
    landmarks: 'Hemiparetic Shoulder, Elbow, Wrist vs Contralateral Sound Limb.',
    steps: [
      '1. Sit upright in a supportive chair directly facing the Biofeedback mirror.',
      '2. Focus mental attention on the affected (paretic) limb; clasp hands together if active-assisted elevation is prescribed.',
      '3. Slowly elevate the affected arm forward and upward toward eye level (45°-90°).',
      '4. Hold at maximum comfortable height for 2 seconds to facilitate neuro-plastic motor recruitment.',
      '5. Slowly and deliberately guide the arm back to resting position on your lap.'
    ],
    formTips: [
      '⚠️ Prevent trunk flexion (leaning forward) to push the arm up.',
      '⚠️ Guard against scapular winging and excessive internal shoulder rotation.',
      '⚠️ Move within a pain-free range of motion (VAS < 4/10).'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Paretic Arm Elev:', `${lA}°`],
      ['Sound Arm Assist:', `${rA}°`],
      ['Torso Alignment:', `${torso}%`],
      ['Motor Control:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const elevDeg = Math.round(45 + cycle * 45);
      const lA = elevDeg;
      const rA = elevDeg;
      const torso = isBadForm ? 62 : 100;
      const sym = isBadForm ? 60 : 98;
      const score = isBadForm ? 70 : Math.round(86 + cycle * 12);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'HOLDING (2s) — EYE LEVEL' : (Math.cos(simStep) > 0 ? 'ELEVATING TO EYE LEVEL' : 'LOWERING TO LAP'));

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.50 };
      const rHip = { x: w / 2 + 55, y: h * 0.50 };
      const lKnee = { x: w / 2 - 75, y: h * 0.65 };
      const rKnee = { x: w / 2 + 75, y: h * 0.65 };
      const lAnkle = { x: w / 2 - 75, y: h * 0.88 };
      const rAnkle = { x: w / 2 + 75, y: h * 0.88 };

      const lapY = h * 0.54;
      const eyeY = headY + 15;
      const currentHandY = lapY - cycle * (lapY - eyeY);

      const lWr = { x: w / 2 - 12, y: currentHandY };
      const rWr = { x: w / 2 + 12, y: currentHandY };
      const lEl = { x: lSh.x - 22 + cycle * 12, y: lSh.y + 68 - cycle * 50 };
      const rEl = { x: rSh.x + 22 - cycle * 12, y: rSh.y + 68 - cycle * 50 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 11. SINGLE-LEG STANCE & NEUROMUSCULAR PROPRIOCEPTION ────────────────────
  'Single Leg Stance': {
    id: 'Single Leg Stance',
    category: 'Neurological & Balance',
    icon: '⚖️',
    shortName: 'Single-Leg Stance & Neuromuscular Balance',
    title: 'Single-Leg Stance, Ankle Strategy & Proprioception (0–30s)',
    targetRom: '0 to 30 Seconds Timed Equilibrium',
    indication: 'Fall risk in elderly, vestibular balance deficit, post-concussion ataxia, chronic ankle instability.',
    landmarks: 'Stance Foot, Stance Knee, Pelvis Level, Center of Pressure Plumb Line.',
    steps: [
      '1. Stand near a sturdy countertop or chair for safety, gaze fixed on eye-level target.',
      '2. Transfer weight completely onto the stance foot.',
      '3. Lift the non-stance foot off the ground (hip and knee flexed to 90°).',
      '4. Maintain upright equilibrium for target duration (10 to 30 seconds).',
      '5. Lower foot smoothly and alternate to the opposite leg.'
    ],
    formTips: [
      '⚠️ Do not let the pelvis drop on the unsupported side (Trendelenburg sign).',
      '⚠️ Avoid bracing the lifted foot against the stance calf or knee.',
      '⚠️ Guard against excessive trunk swaying; recruit ankle and hip strategies.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Stance Stability:', `${lA}%`],
      ['Lifted Knee Height:', `${rA}°`],
      ['Pelvic Equilibrium:', `${torso}%`],
      ['Postural Sway Index:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const lA = isBadForm ? 65 : 98;
      const rA = 90;
      const torso = isBadForm ? 55 : 99;
      const sym = isBadForm ? 62 : 98;
      const score = isBadForm ? 70 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'BALANCING (STEADY)' : (Math.cos(simStep) > 0 ? 'LIFTING LEG' : 'RETURNING'));

      const sway = Math.sin(simStep * 2) * (isBadForm ? 16 : 4);
      const lSh = { x: w / 2 - 100 + sway, y: h * 0.30 };
      const rSh = { x: w / 2 + 100 + sway, y: h * 0.30 };
      const lHip = { x: w / 2 - 55 + sway, y: h * 0.53 };
      const rHip = { x: w / 2 + 55 + sway, y: h * 0.53 };

      const lKnee = { x: w / 2 - 55, y: h * 0.735 };
      const lAnkle = { x: w / 2 - 55, y: h * 0.915 };

      const rKnee = { x: w / 2 + 65, y: h * 0.55 };
      const rAnkle = { x: w / 2 + 65, y: h * 0.75 };

      const lEl = { x: lSh.x - 45, y: lSh.y + 35 }; const lWr = { x: lSh.x - 85, y: lSh.y + 45 };
      const rEl = { x: rSh.x + 45, y: rSh.y + 35 }; const rWr = { x: rSh.x + 85, y: rSh.y + 45 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 12. DYNAMIC HIGH-KNEE MARCHING & GAIT TRAINING ─────────────────────────
  'High Knee Marching': {
    id: 'High Knee Marching',
    category: 'Neurological & Balance',
    icon: '🚶',
    shortName: 'Dynamic High-Knee Marching & Gait Training',
    title: 'Dynamic High-Knee Marching & Reciprocal Gait Retraining (70°–90°)',
    targetRom: 'Hip Flexion: 70° to 90° Rhythmic Alternation',
    indication: 'Parkinsonian shuffling gait, post-stroke circumduction correction, drop-foot, general gait hypokinesia.',
    landmarks: 'Bilateral Hip Joints, Knees, Ankles, Reciprocal Arm Swing Axes.',
    steps: [
      '1. Stand tall with feet hip-width apart and arms bent at 90° ready to swing.',
      '2. Drive right knee upward until thigh is parallel with floor (80°-90°).',
      '3. Simultaneously swing left arm forward in natural reciprocal motion.',
      '4. Lower right foot softly and immediately drive left knee upward with right arm swing.',
      '5. Maintain a steady, rhythmic cadence without losing upright posture.'
    ],
    formTips: [
      '⚠️ Avoid backward trunk leaning when driving knee upward.',
      '⚠️ Ensure feet land softly on balls of feet rather than heavy heel strike.',
      '⚠️ Maintain active reciprocal arm swing to facilitate central pattern generators.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Marching Knee Lift:', `${rA}°`],
      ['Reciprocal Arm Swing:', `${lA}°`],
      ['Torso Uprightness:', `${torso}%`],
      ['Cadence Rhythm:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const legPhase = Math.sin(simStep * 1.5);
      const isRightLift = legPhase > 0;
      const liftDeg = Math.round(Math.abs(legPhase) * 85);
      const rA = isRightLift ? liftDeg : 10;
      const lA = isRightLift ? 10 : liftDeg;
      const torso = isBadForm ? 60 : 98;
      const sym = isBadForm ? 65 : 98;
      const score = isBadForm ? 71 : Math.round(89 + Math.abs(legPhase) * 9);
      const status = isBadForm ? 'IMPROVE FORM' : (isRightLift ? 'RIGHT KNEE MARCH' : 'LEFT KNEE MARCH');

      const lSh = { x: w / 2 - 100, y: h * 0.30 };
      const rSh = { x: w / 2 + 100, y: h * 0.30 };
      const lHip = { x: w / 2 - 55, y: h * 0.53 };
      const rHip = { x: w / 2 + 55, y: h * 0.53 };

      let lKnee = { x: w / 2 - 58, y: h * 0.735 };
      let lAnkle = { x: w / 2 - 58, y: h * 0.915 };
      let rKnee = { x: w / 2 + 58, y: h * 0.735 };
      let rAnkle = { x: w / 2 + 58, y: h * 0.915 };

      if (isRightLift) {
        rKnee = { x: w / 2 + 65, y: h * 0.54 };
        rAnkle = { x: w / 2 + 65, y: h * 0.74 };
      } else {
        lKnee = { x: w / 2 - 65, y: h * 0.54 };
        lAnkle = { x: w / 2 - 65, y: h * 0.74 };
      }

      const lEl = { x: lSh.x - 20, y: lSh.y + 60 - legPhase * 25 };
      const lWr = { x: lSh.x - 25, y: lEl.y + 40 - legPhase * 30 };
      const rEl = { x: rSh.x + 20, y: rSh.y + 60 + legPhase * 25 };
      const rWr = { x: rSh.x + 25, y: rEl.y + 40 + legPhase * 30 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 13. SIT-TO-STAND FUNCTIONAL TRANSFER ──────────────────────────────────
  'Sit to Stand Transfer': {
    id: 'Sit to Stand Transfer',
    category: 'Cardiopulmonary & Functional',
    icon: '🪑',
    shortName: 'Sit-to-Stand Functional Transfer & Power',
    title: 'Sit-to-Stand Functional Transfer & Lower Extremity Power Training',
    targetRom: 'Transition: 90° Seated Flexion ➔ 0° Full Standing Extension',
    indication: 'Sarcopenia, geriatric frailty, deconditioning post-hospitalization, independent transfer training.',
    landmarks: 'Trunk Lean Axis, Hip Extension, Knee Extension, Ground Reaction Center.',
    steps: [
      '1. Sit on front third of chair with feet placed flat and pulled slightly back under knees.',
      '2. Cross arms across chest or reach forward for balance.',
      '3. Lean trunk forward from hips ("nose over toes" phase).',
      '4. Powerfully drive through heels and extend hips and knees to full standing posture.',
      '5. Slowly control the descent back into the chair without plopping down.'
    ],
    formTips: [
      '⚠️ Do not use momentum or push off knees with hands unless prescribed as assisted.',
      '⚠️ Ensure both knees remain aligned over 2nd toes; avoid knee valgus touching.',
      '⚠️ Control the eccentric seated descent over 3 full seconds.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Extension Power:', `${rA}°`],
      ['Forward Lean Angle:', `${lA}°`],
      ['Postural Symmetry:', `${torso}%`],
      ['Transfer Efficiency:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const extDeg = Math.round(cycle * 90);
      const rA = extDeg;
      const lA = Math.round((1 - cycle) * 35);
      const torso = isBadForm ? 58 : 99;
      const sym = isBadForm ? 65 : 98;
      const score = isBadForm ? 71 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'STANDING FULL EXTENSION' : (Math.cos(simStep) > 0 ? 'POWER ASCENT (STAND)' : 'ECCENTRIC DESCENT'));

      const standProgress = cycle;
      const hipsY = (h * 0.50) + standProgress * (h * 0.03);
      const kneeY = (h * 0.65) + standProgress * (h * 0.085);
      const shY = (h * 0.35) - standProgress * (h * 0.05);

      const lSh = { x: w / 2 - 100, y: shY };
      const rSh = { x: w / 2 + 100, y: shY };
      const lHip = { x: w / 2 - 55, y: hipsY };
      const rHip = { x: w / 2 + 55, y: hipsY };
      const lKnee = { x: w / 2 - 65, y: kneeY };
      const rKnee = { x: w / 2 + 65, y: kneeY };
      const lAnkle = { x: w / 2 - 65, y: h * 0.915 };
      const rAnkle = { x: w / 2 + 65, y: h * 0.915 };

      const lEl = { x: lSh.x + 25, y: lSh.y + 60 }; const lWr = { x: w / 2 + 25, y: lSh.y + 45 };
      const rEl = { x: rSh.x - 25, y: rSh.y + 60 }; const rWr = { x: w / 2 - 25, y: rSh.y + 45 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ── 14. THORACIC EXPANSION & DIAPHRAGMATIC BREATHING ──────────────────────
  'Diaphragmatic Breathing': {
    id: 'Diaphragmatic Breathing',
    category: 'Cardiopulmonary & Functional',
    icon: '🫁',
    shortName: 'Thoracic Expansion & Diaphragmatic Breathing',
    title: 'Thoracic Expansion, Diaphragmatic Pacing & Respiratory Mechanics',
    targetRom: 'Thoracic Excursion: Full Bilateral Ribcage Mobilization',
    indication: 'COPD, post-COVID-19 pulmonary rehabilitation, post-thoracic surgery, atelectasis prevention.',
    landmarks: 'Ribcage Expansion, Shoulder Clavicular Axes, Diaphragmatic Excursion.',
    steps: [
      '1. Sit comfortably with back supported and shoulders relaxed.',
      '2. Place one hand on upper chest and one hand on abdomen below ribcage.',
      '3. Inhale deeply through nose over 4 seconds, expanding abdomen outward and opening arms.',
      '4. Hold breath gently for 2 seconds at peak lung capacity.',
      '5. Exhale slowly through pursed lips over 6 seconds as arms gently return to lap.'
    ],
    formTips: [
      '⚠️ Avoid clavicular breathing (excessive shoulder elevation during inhalation).',
      '⚠️ Ensure exhalation phase is longer than inhalation (1:2 ratio) to empty dead space.',
      '⚠️ Keep neck and accessory respiratory muscles completely relaxed.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Thoracic Expansion:', `${rA}%`],
      ['Inspiratory Volume:', `${lA}%`],
      ['Chest Elevation:', `${torso}%`],
      ['Breathing Rhythm:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm) => {
      const expVal = Math.round(30 + cycle * 70);
      const rA = expVal;
      const lA = Math.round(25 + cycle * 75);
      const torso = isBadForm ? 60 : 100;
      const sym = isBadForm ? 68 : 99;
      const score = isBadForm ? 74 : Math.round(92 + cycle * 7);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.88 ? 'PEAK CAPACITY HOLD (2s)' : (Math.cos(simStep) > 0 ? 'DEEP INHALATION (NOSE)' : 'PURSED-LIP EXHALATION'));

      const lSh = { x: w / 2 - 100 - cycle * 8, y: h * 0.30 - cycle * 6 };
      const rSh = { x: w / 2 + 100 + cycle * 8, y: h * 0.30 - cycle * 6 };
      const lHip = { x: w / 2 - 55, y: h * 0.50 };
      const rHip = { x: w / 2 + 55, y: h * 0.50 };
      const lKnee = { x: w / 2 - 70, y: h * 0.65 };
      const rKnee = { x: w / 2 + 70, y: h * 0.65 };
      const lAnkle = { x: w / 2 - 70, y: h * 0.88 };
      const rAnkle = { x: w / 2 + 70, y: h * 0.88 };

      const openW = cycle * 75;
      const lEl = { x: lSh.x - 25 - openW, y: lSh.y + 60 };
      const rEl = { x: rSh.x + 25 + openW, y: rSh.y + 60 };
      const lWr = { x: lEl.x - 20 - openW * 0.5, y: lEl.y + 35 };
      const rWr = { x: rEl.x + 20 + openW * 0.5, y: rEl.y + 35 };

      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SPORTS & PERFORMANCE
  // ══════════════════════════════════════════════════════════════════════════

  'Nordic Hamstring Curl': {
    id: 'Nordic Hamstring Curl',
    category: 'Sports & Performance',
    icon: '🏃',
    shortName: 'Nordic Hamstring Curl & Eccentric Loading',
    title: 'Nordic Hamstring Curl — Eccentric Hamstring Loading Protocol',
    targetRom: 'Knee: 0° to 130° Eccentric Lowering Phase',
    indication: 'Hamstring strain prevention, ACL rehabilitation, sprint speed deficits, posterior chain weakness.',
    landmarks: 'Hip (11,12), Knee (13,14), Ankle (15,16), Torso plumb line.',
    steps: [
      '1. Kneel upright on a padded surface with ankles secured; align hips directly over knees.',
      '2. With core braced and glutes engaged, slowly lower your torso forward under full eccentric hamstring control.',
      '3. Lower as far as possible before hip flexion occurs — target 45°–90° forward lean.',
      '4. Use hands to arrest the fall at the lowest controllable point.',
      '5. Push back explosively to the upright kneeling position and repeat.'
    ],
    formTips: [
      '⚠️ Avoid early hip flexion — the hinge must occur only at the knee.',
      '⚠️ Keep a rigid plank alignment from knee to crown throughout the lowering phase.',
      '⚠️ Prevent lumbar hyperextension at the start position.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Eccentric Knee Angle:', `${rA}°`],
      ['Forward Lean:', `${lA}°`],
      ['Spine Alignment:', `${torso}%`],
      ['Bilateral Load Sym:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const leanDeg = Math.round(15 + cycle * 70);
      const lA = leanDeg;
      const rA = Math.round(10 + cycle * 120);
      const torso = isBadForm ? 55 : 96;
      const sym = isBadForm ? 68 : 97;
      const score = isBadForm ? 69 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.85 ? 'HOLD — MAX ECCENTRIC' : (Math.cos(simStep) > 0 ? 'ECCENTRIC LOWERING' : 'CONCENTRIC RETURN'));
      const lSh = { x: w/2 - 70, y: headY + 40 + cycle * 180 };
      const rSh = { x: w/2 + 70, y: headY + 40 + cycle * 180 };
      const lHip = { x: w/2 - 55, y: h * 0.62 };
      const rHip = { x: w/2 + 55, y: h * 0.62 };
      const lKnee = { x: w/2 - 60, y: h * 0.75 };
      const rKnee = { x: w/2 + 60, y: h * 0.75 };
      const lAnkle = { x: w/2 - 60, y: h * 0.91 };
      const rAnkle = { x: w/2 + 60, y: h * 0.91 };
      const lEl = { x: lSh.x - 30, y: lSh.y + 55 };
      const rEl = { x: rSh.x + 30, y: rSh.y + 55 };
      const lWr = { x: lEl.x - 15, y: lEl.y + 50 };
      const rWr = { x: rEl.x + 15, y: rEl.y + 50 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Plyometric Box Jump': {
    id: 'Plyometric Box Jump',
    category: 'Sports & Performance',
    icon: '⚡',
    shortName: 'Plyometric Box Jump & Landing Mechanics',
    title: 'Plyometric Box Jump — Explosive Power & Landing Biomechanics',
    targetRom: 'Hip/Knee Flexion: 90°–110° Load; Full Extension at Takeoff',
    indication: 'Anterior cruciate ligament (ACL) return-to-sport, patellofemoral rehabilitation, athletic explosive power training.',
    landmarks: 'Hip (11,12), Knee (13,14), Ankle (15,16), Shoulder axis (5,6).',
    steps: [
      '1. Stand 30 cm behind a box or platform; feet hip-width, arms relaxed at sides.',
      '2. Perform a countermovement — simultaneously swing arms back and bend hips/knees to ~60°.',
      '3. Explosively extend hips, knees, and ankles (triple extension) driving arms forward and upward.',
      '4. Land softly on the box with toes first, immediately absorbing into a 90° athletic squat.',
      '5. Step down, reset stance, and repeat with 30-second rest intervals.'
    ],
    formTips: [
      '⚠️ Avoid valgus knee collapse on landing — cue "knees over second toe".',
      '⚠️ Do not land with a stiff straight knee — poor landing mechanics increase ACL injury risk.',
      '⚠️ Ensure symmetric bilateral takeoff and landing forces.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Jump Height:', `${rA}°`],
      ['Landing Knee Flex:', `${lA}°`],
      ['Takeoff Symmetry:', `${sym}%`],
      ['Torso Control:', `${torso}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const jumpH = cycle * 120;
      const lA = Math.round(20 + cycle * 70);
      const rA = Math.round(jumpH);
      const torso = isBadForm ? 60 : 98;
      const sym = isBadForm ? 72 : 99;
      const score = isBadForm ? 72 : Math.round(90 + cycle * 8);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.85 ? 'PEAK HEIGHT — LAND SOFT' : (Math.cos(simStep) > 0 ? 'EXPLOSIVE TAKEOFF' : 'SOFT LANDING ABSORB'));
      const offY = -jumpH;
      const lSh = { x: w/2 - 95, y: h * 0.28 + offY };
      const rSh = { x: w/2 + 95, y: h * 0.28 + offY };
      const lHip = { x: w/2 - 55, y: h * 0.46 + offY };
      const rHip = { x: w/2 + 55, y: h * 0.46 + offY };
      const lKnee = { x: w/2 - 60, y: h * 0.63 + offY };
      const rKnee = { x: w/2 + 60, y: h * 0.63 + offY };
      const lAnkle = { x: w/2 - 62, y: h * 0.82 + offY * 0.5 };
      const rAnkle = { x: w/2 + 62, y: h * 0.82 + offY * 0.5 };
      const lEl = { x: lSh.x - 30 - cycle * 30, y: lSh.y + 60 - cycle * 20 };
      const rEl = { x: rSh.x + 30 + cycle * 30, y: rSh.y + 60 - cycle * 20 };
      const lWr = { x: lEl.x - 20, y: lEl.y + 45 };
      const rWr = { x: rEl.x + 20, y: rEl.y + 45 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Shoulder Rotator Cuff Strengthening': {
    id: 'Shoulder Rotator Cuff Strengthening',
    category: 'Sports & Performance',
    icon: '🔄',
    shortName: 'Shoulder External Rotation & Rotator Cuff Strengthening',
    title: 'Shoulder External Rotation — Rotator Cuff & Glenohumeral Stability',
    targetRom: 'External Rotation: 0° to 90° | Internal Rotation: 0° to 70°',
    indication: 'Rotator cuff impingement, SLAP tears, throwing athlete rehabilitation, shoulder instability.',
    landmarks: 'Shoulder (5,6), Elbow (7,8), Wrist (9,10), Torso axis.',
    steps: [
      '1. Sit or stand with elbow at 90° flexion and forearm parallel to floor.',
      '2. Keeping the elbow pinned to your side as a pivot point.',
      '3. Slowly rotate the forearm outward (external rotation) to maximum comfortable range.',
      '4. Hold for 2 seconds at end-range to fully engage infraspinatus and teres minor.',
      '5. Slowly return to neutral and repeat; perform on both sides.'
    ],
    formTips: [
      '⚠️ Do not let the elbow drift away from the torso during rotation.',
      '⚠️ Avoid compensatory trunk rotation or shoulder elevation.',
      '⚠️ Maintain a neutral wrist — no wrist flexion or extension.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Left Ext. Rotation:', `${lA}°`],
      ['Right Ext. Rotation:', `${rA}°`],
      ['Elbow Pivot Control:', `${torso}%`],
      ['Bilateral Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const rotDeg = Math.round(10 + cycle * 80);
      const lA = isBadForm ? rotDeg + 20 : rotDeg;
      const rA = rotDeg;
      const torso = isBadForm ? 60 : 97;
      const sym = isBadForm ? 65 : 98;
      const score = isBadForm ? 70 : Math.round(87 + cycle * 11);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.87 ? 'HOLD END-RANGE (2s)' : (Math.cos(simStep) > 0 ? 'EXTERNAL ROTATING' : 'RETURNING TO NEUTRAL'));
      const lSh = { x: w/2 - 105, y: h * 0.30 };
      const rSh = { x: w/2 + 105, y: h * 0.30 };
      const lHip = { x: w/2 - 55, y: h * 0.53 };
      const rHip = { x: w/2 + 55, y: h * 0.53 };
      const lKnee = { x: w/2 - 60, y: h * 0.72 };
      const rKnee = { x: w/2 + 60, y: h * 0.72 };
      const lAnkle = { x: w/2 - 63, y: h * 0.91 };
      const rAnkle = { x: w/2 + 63, y: h * 0.91 };
      const rad = (rotDeg * Math.PI) / 180;
      const lEl = { x: lSh.x - 5, y: lSh.y + 80 };
      const rEl = { x: rSh.x + 5, y: rSh.y + 80 };
      const lWr = { x: lEl.x - Math.cos(rad) * 90, y: lEl.y - Math.sin(rad) * 45 };
      const rWr = { x: rEl.x + Math.cos(rad) * 90, y: rEl.y - Math.sin(rad) * 45 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PAEDIATRIC REHABILITATION
  // ══════════════════════════════════════════════════════════════════════════

  'Paediatric Gait Training': {
    id: 'Paediatric Gait Training',
    category: 'Paediatric Rehabilitation',
    icon: '👶',
    shortName: 'Paediatric Gait Retraining & Developmental Walking',
    title: 'Paediatric Gait Retraining — Developmental Walking & Coordination',
    targetRom: 'Hip Flexion: 30°–45° Step Cycle | Knee: 0°–60° Swing Phase',
    indication: 'Cerebral palsy (diplegic/hemiplegic), developmental coordination disorder, toe walking, in-toeing gait.',
    landmarks: 'Hip (11,12), Knee (13,14), Ankle (15,16), Pelvis symmetry.',
    steps: [
      '1. Position child in front of mirror with parent or guardian for support if needed.',
      '2. Cue the child to stand tall — "head up, shoulders back, look straight ahead".',
      '3. Instruct slow march-style walking: lift alternate knees to hip height, place heel first.',
      '4. Practice 5 slow steps forward then 5 steps backward maintaining upright posture.',
      '5. Reward correct heel-toe pattern and symmetric arm swing with positive reinforcement.'
    ],
    formTips: [
      '⚠️ Watch for Trendelenburg gait — pelvic drop toward the swing leg indicates gluteal weakness.',
      '⚠️ Avoid toe-walking compensation — cue "push heel down first".',
      '⚠️ Monitor for scissor gait pattern common in spastic diplegia.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Step Cycle Hip:', `${lA}°`],
      ['Knee Swing Phase:', `${rA}°`],
      ['Pelvic Symmetry:', `${torso}%`],
      ['Gait Rhythm Score:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const stepPhase = cycle;
      const lA = Math.round(10 + stepPhase * 40);
      const rA = Math.round(5 + (1 - stepPhase) * 55);
      const torso = isBadForm ? 58 : 94;
      const sym = isBadForm ? 65 : 96;
      const score = isBadForm ? 68 : Math.round(86 + cycle * 12);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.85 ? 'HEEL STRIKE — GOOD!' : (Math.cos(simStep) > 0 ? 'RIGHT STEP FORWARD' : 'LEFT STEP FORWARD'));
      const lSh = { x: w/2 - 75, y: h * 0.28 };
      const rSh = { x: w/2 + 75, y: h * 0.28 };
      const lHip = { x: w/2 - 40, y: h * 0.48 };
      const rHip = { x: w/2 + 40, y: h * 0.48 };
      const lKnee = { x: w/2 - 42 - stepPhase * 15, y: h * 0.65 - stepPhase * 35 };
      const rKnee = { x: w/2 + 42 + (1 - stepPhase) * 15, y: h * 0.65 - (1 - stepPhase) * 35 };
      const lAnkle = { x: w/2 - 45 + stepPhase * 40, y: h * 0.85 };
      const rAnkle = { x: w/2 + 45 - (1 - stepPhase) * 40, y: h * 0.85 };
      const lEl = { x: lSh.x - 30 + stepPhase * 20, y: lSh.y + 55 };
      const rEl = { x: rSh.x + 30 - stepPhase * 20, y: rSh.y + 55 };
      const lWr = { x: lEl.x - 15, y: lEl.y + 45 };
      const rWr = { x: rEl.x + 15, y: rEl.y + 45 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Developmental Reach & Grasp': {
    id: 'Developmental Reach & Grasp',
    category: 'Paediatric Rehabilitation',
    icon: '🤲',
    shortName: 'Paediatric Reaching, Grasping & Fine Motor Development',
    title: 'Paediatric Reach & Grasp — Fine Motor Developmental Protocol',
    targetRom: 'Shoulder Reach: 0°–90° | Elbow Extension: Full 0°',
    indication: 'Congenital hemiplegia, Erb\'s palsy (brachial plexus birth injury), developmental delay, DCD fine motor.',
    landmarks: 'Shoulder (5,6), Elbow (7,8), Wrist (9,10), Hand midpoint.',
    steps: [
      '1. Seat child comfortably at a table with target toy placed just beyond comfortable reach.',
      '2. Encourage the child to reach forward with the affected limb toward the target object.',
      '3. Facilitate elbow extension and wrist supination as the hand approaches the target.',
      '4. Allow grasp contact with the object for 3–5 seconds — reward the achievement.',
      '5. Assist return of the arm to neutral and repeat 10 times per side.'
    ],
    formTips: [
      '⚠️ Watch for compensatory trunk lean — the movement must originate at the shoulder.',
      '⚠️ Facilitate forearm supination (palm-up) to normalize grasp approach angle.',
      '⚠️ Avoid letting the shoulder elevate (hike) as a compensatory reach pattern.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Affected Reach:', `${lA}°`],
      ['Elbow Extension:', `${rA}°`],
      ['Trunk Stability:', `${torso}%`],
      ['Motor Control:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const reach = Math.round(15 + cycle * 75);
      const lA = reach;
      const rA = Math.round(cycle * 90);
      const torso = isBadForm ? 58 : 95;
      const sym = isBadForm ? 62 : 95;
      const score = isBadForm ? 66 : Math.round(85 + cycle * 13);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.87 ? 'GRASP CONTACT (3s)' : (Math.cos(simStep) > 0 ? 'REACHING FORWARD' : 'RETURNING TO REST'));
      const lSh = { x: w/2 - 80, y: h * 0.38 };
      const rSh = { x: w/2 + 80, y: h * 0.38 };
      const lHip = { x: w/2 - 50, y: h * 0.58 };
      const rHip = { x: w/2 + 50, y: h * 0.58 };
      const lKnee = { x: w/2 - 55, y: h * 0.75 };
      const rKnee = { x: w/2 + 55, y: h * 0.75 };
      const lAnkle = { x: w/2 - 58, y: h * 0.92 };
      const rAnkle = { x: w/2 + 58, y: h * 0.92 };
      const lEl = { x: lSh.x + cycle * 50, y: lSh.y + 40 - cycle * 10 };
      const lWr = { x: lEl.x + cycle * 55, y: lEl.y + 10 };
      const rEl = { x: rSh.x + 15, y: rSh.y + 60 };
      const rWr = { x: rEl.x + 10, y: rEl.y + 50 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GERIATRIC & FALL PREVENTION
  // ══════════════════════════════════════════════════════════════════════════

  'Timed Up and Go': {
    id: 'Timed Up and Go',
    category: 'Geriatric & Fall Prevention',
    icon: '⏱️',
    shortName: 'Timed Up & Go (TUG) — Geriatric Mobility & Fall Risk',
    title: 'Timed Up & Go (TUG) — Functional Mobility & Fall Risk Assessment',
    targetRom: 'Sit-to-Stand: 90°→0° Hip Extension | Gait: Normal 1.0–1.4 m/s',
    indication: 'Geriatric fall risk screening, Parkinson\'s disease, frailty, post-hip arthroplasty, dementia gait assessment.',
    landmarks: 'Hip (11,12), Knee (13,14), Ankle (15,16), Torso vertical alignment.',
    steps: [
      '1. Patient sits in a standard chair (seat height ~46 cm); arms resting on lap.',
      '2. On "Go" command, patient rises to full standing WITHOUT arm support if possible.',
      '3. Walks at comfortable pace to a marker 3 metres away.',
      '4. Turns around, walks back to the chair and sits down fully.',
      '5. Clinician records total time: <12 seconds = low risk; 12–20 s = moderate; >20 s = high fall risk.'
    ],
    formTips: [
      '⚠️ Observe for festination (accelerating small steps) — indicates Parkinsonian gait.',
      '⚠️ Watch for wide-based gait or staggering on the turn — indicates vestibular/cerebellar deficit.',
      '⚠️ Repeat 3 times; use mean time for clinical documentation.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Transfer Speed:', `${rA}°`],
      ['Gait Cadence:', `${lA}°`],
      ['Postural Control:', `${torso}%`],
      ['Fall Risk Score:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const phase = Math.sin(simStep);
      const lA = Math.round(20 + Math.abs(phase) * 50);
      const rA = Math.round(15 + cycle * 45);
      const torso = isBadForm ? 55 : 91;
      const sym = isBadForm ? 62 : 93;
      const score = isBadForm ? 65 : Math.round(83 + cycle * 14);
      const status = isBadForm ? 'GAIT RISK FLAGGED' : (cycle > 0.85 ? 'TURNING — BALANCE POINT' : (Math.cos(simStep) > 0 ? 'RISING FROM CHAIR' : 'WALKING FORWARD'));
      const lSh = { x: w/2 - 85, y: h * 0.29 };
      const rSh = { x: w/2 + 85, y: h * 0.29 };
      const lHip = { x: w/2 - 48, y: h * 0.50 };
      const rHip = { x: w/2 + 48, y: h * 0.50 };
      const stepOff = Math.sin(simStep * 2) * 30;
      const lKnee = { x: w/2 - 52 + stepOff, y: h * 0.68 - Math.abs(stepOff) * 0.3 };
      const rKnee = { x: w/2 + 52 - stepOff, y: h * 0.68 - Math.abs(stepOff) * 0.3 };
      const lAnkle = { x: w/2 - 54 + stepOff * 1.2, y: h * 0.88 };
      const rAnkle = { x: w/2 + 54 - stepOff * 1.2, y: h * 0.88 };
      const lEl = { x: lSh.x - 35, y: lSh.y + 65 };
      const rEl = { x: rSh.x + 35, y: rSh.y + 65 };
      const lWr = { x: lEl.x - 15, y: lEl.y + 50 };
      const rWr = { x: rEl.x + 15, y: rEl.y + 50 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Berg Balance Scale Exercise': {
    id: 'Berg Balance Scale Exercise',
    category: 'Geriatric & Fall Prevention',
    icon: '⚖️',
    shortName: 'Berg Balance Tandem Stance & Static Equilibrium',
    title: 'Berg Balance Tandem Stance — Static Equilibrium & Postural Control',
    targetRom: 'Eyes Open: ≥30s | Eyes Closed: ≥10s Tandem Stance',
    indication: 'Elderly fall prevention, post-stroke balance rehabilitation, bilateral vestibular hypofunction, Parkinson\'s disease.',
    landmarks: 'Ankle (15,16), Hip (11,12), Shoulder (5,6), Vertical plumb line.',
    steps: [
      '1. Place one foot directly in front of the other in tandem (heel-to-toe) stance.',
      '2. Distribute weight equally between both feet with arms at sides.',
      '3. Maintain balance for a minimum of 30 seconds with eyes open.',
      '4. If successful, progress to eyes-closed challenge for 10 seconds.',
      '5. Clinician scores 2 (>30s open) / 1 (10–30s) / 0 (<10s) per Berg Balance Scale.'
    ],
    formTips: [
      '⚠️ Position therapist lateral and posterior to patient — ready to assist if balance lost.',
      '⚠️ Do not allow arms to abduct or patient to widen stance for compensation.',
      '⚠️ Record sway amplitude and direction for vestibular laterality assessment.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Postural Sway:', `${lA}°`],
      ['Balance Duration:', `${rA}s`],
      ['Centre of Gravity:', `${torso}%`],
      ['Equilibrium Score:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const sway = Math.sin(simStep * 1.5) * (isBadForm ? 22 : 8);
      const lA = Math.round(Math.abs(sway));
      const rA = Math.round(15 + cycle * 25);
      const torso = isBadForm ? 52 : 94;
      const sym = isBadForm ? 60 : 95;
      const score = isBadForm ? 63 : Math.round(87 + cycle * 10);
      const status = isBadForm ? 'BALANCE RISK — SWAY EXCESS' : (cycle > 0.85 ? 'STABLE HOLD' : 'TANDEM STANCE ACTIVE');
      const lSh = { x: w/2 - 90 + sway, y: h * 0.29 };
      const rSh = { x: w/2 + 90 + sway, y: h * 0.29 };
      const lHip = { x: w/2 - 45 + sway * 0.7, y: h * 0.50 };
      const rHip = { x: w/2 + 45 + sway * 0.7, y: h * 0.50 };
      const lKnee = { x: w/2 - 18 + sway * 0.4, y: h * 0.68 };
      const rKnee = { x: w/2 + 18 + sway * 0.4, y: h * 0.73 };
      const lAnkle = { x: w/2 - 10 + sway * 0.2, y: h * 0.88 };
      const rAnkle = { x: w/2 + 10 + sway * 0.2, y: h * 0.91 };
      const lEl = { x: lSh.x - 5, y: lSh.y + 70 };
      const rEl = { x: rSh.x + 5, y: rSh.y + 70 };
      const lWr = { x: lEl.x - 5, y: lEl.y + 55 };
      const rWr = { x: rEl.x + 5, y: rEl.y + 55 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HAND & UPPER LIMB
  // ══════════════════════════════════════════════════════════════════════════

  'Wrist Flexion Extension ROM': {
    id: 'Wrist Flexion Extension ROM',
    category: 'Hand & Upper Limb',
    icon: '🖐️',
    shortName: 'Wrist Flexion/Extension Active ROM & Tendon Gliding',
    title: 'Wrist Active ROM — Flexion, Extension & Tendon Gliding Protocol',
    targetRom: 'Flexion: 0°–80° | Extension: 0°–70° | Deviation: 0°–20°',
    indication: 'Distal radius fracture (Colles/Smith), carpal tunnel decompression, TFCC tear, wrist arthritis.',
    landmarks: 'Elbow (7,8), Wrist (9,10), Hand and finger midpoints.',
    steps: [
      '1. Sit with forearm resting on a table, palm facing down; elbow at 90° flexion.',
      '2. Slowly flex the wrist downward (palmar flexion) to maximum comfortable range — hold 3s.',
      '3. Return to neutral and extend the wrist upward (dorsiflexion) to maximum range — hold 3s.',
      '4. Perform radial deviation (thumb side) and ulnar deviation (little finger side) — 10° each.',
      '5. Complete tendon gliding sequence: straight, hook, fist, tabletop, and full fist positions.'
    ],
    formTips: [
      '⚠️ Do NOT perform through acute pain — stay within a pain-free range (VAS < 3/10).',
      '⚠️ Stabilise the forearm on the table — avoid forearm rotation as compensation.',
      '⚠️ Watch for compensatory elbow flexion/extension during wrist movement.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Wrist Flexion:', `${lA}°`],
      ['Wrist Extension:', `${rA}°`],
      ['Forearm Stability:', `${torso}%`],
      ['Bilateral Symmetry:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const flex = Math.round(Math.sin(simStep) * 75);
      const lA = Math.max(0, flex);
      const rA = Math.max(0, -flex);
      const torso = isBadForm ? 62 : 97;
      const sym = isBadForm ? 66 : 98;
      const score = isBadForm ? 71 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'IMPROVE FORM' : (flex > 40 ? 'PALMAR FLEXION HOLD' : (flex < -40 ? 'DORSIFLEXION HOLD' : 'NEUTRAL — TRANSITIONING'));
      const lSh = { x: w/2 - 105, y: h * 0.29 };
      const rSh = { x: w/2 + 105, y: h * 0.29 };
      const lHip = { x: w/2 - 55, y: h * 0.52 };
      const rHip = { x: w/2 + 55, y: h * 0.52 };
      const lKnee = { x: w/2 - 60, y: h * 0.70 };
      const rKnee = { x: w/2 + 60, y: h * 0.70 };
      const lAnkle = { x: w/2 - 63, y: h * 0.90 };
      const rAnkle = { x: w/2 + 63, y: h * 0.90 };
      const lEl = { x: lSh.x + 60, y: lSh.y + 35 };
      const rEl = { x: rSh.x - 60, y: rSh.y + 35 };
      const wristBend = (flex / 75) * 40;
      const lWr = { x: lEl.x + 75, y: lEl.y + wristBend };
      const rWr = { x: rEl.x - 75, y: rEl.y + wristBend };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Elbow Flexion Extension Post-Fracture': {
    id: 'Elbow Flexion Extension Post-Fracture',
    category: 'Hand & Upper Limb',
    icon: '💪',
    shortName: 'Elbow Flexion/Extension & Pronation/Supination ROM',
    title: 'Elbow Active ROM — Post-Fracture Flexion, Extension & Forearm Rotation',
    targetRom: 'Flexion: 0°–145° | Extension: Full 0° | Pronation/Supination: 90° each',
    indication: 'Radial head fracture, olecranon fracture, humeral shaft fracture, post-elbow dislocation stiffness.',
    landmarks: 'Shoulder (5,6), Elbow (7,8), Wrist (9,10).',
    steps: [
      '1. Stand or sit with upper arm resting at side, palm facing forward (supinated starting position).',
      '2. Slowly flex the elbow, bringing hand to shoulder — target 145° of flexion, hold 2s.',
      '3. Slowly extend the elbow to full 0° terminal extension — avoid hyperextension.',
      '4. Perform forearm pronation (palm down) then supination (palm up) — 10 reps each.',
      '5. Complete 3 sets of 10 repetitions with 60s rest between sets.'
    ],
    formTips: [
      '⚠️ Avoid compensatory shoulder abduction or elevation to achieve apparent elbow range.',
      '⚠️ Do not force terminal extension if there is a hard capsular end-feel — respect tissue healing.',
      '⚠️ Supination ROM is often more limited than pronation following radial head fractures.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Elbow Flexion:', `${lA}°`],
      ['Terminal Extension:', `${rA}°`],
      ['Shoulder Stability:', `${torso}%`],
      ['Forearm Control:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const flexDeg = Math.round(10 + cycle * 135);
      const lA = flexDeg;
      const rA = Math.round(145 - flexDeg);
      const torso = isBadForm ? 63 : 96;
      const sym = isBadForm ? 67 : 97;
      const score = isBadForm ? 72 : Math.round(89 + cycle * 9);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.87 ? 'HOLD FULL FLEXION (2s)' : (Math.cos(simStep) > 0 ? 'ELBOW FLEXING' : 'EXTENDING TO 0°'));
      const lSh = { x: w/2 - 105, y: h * 0.28 };
      const rSh = { x: w/2 + 105, y: h * 0.28 };
      const lHip = { x: w/2 - 55, y: h * 0.52 };
      const rHip = { x: w/2 + 55, y: h * 0.52 };
      const lKnee = { x: w/2 - 60, y: h * 0.70 };
      const rKnee = { x: w/2 + 60, y: h * 0.70 };
      const lAnkle = { x: w/2 - 62, y: h * 0.90 };
      const rAnkle = { x: w/2 + 62, y: h * 0.90 };
      const rad = ((180 - flexDeg) * Math.PI) / 180;
      const lEl = { x: lSh.x - 5, y: lSh.y + 85 };
      const lWr = { x: lEl.x + Math.cos(rad) * 95, y: lEl.y - Math.sin(rad) * 95 };
      const rEl = { x: rSh.x + 5, y: rSh.y + 85 };
      const rWr = { x: rEl.x - 35, y: rEl.y + 80 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WOMEN'S HEALTH & PELVIC FLOOR
  // ══════════════════════════════════════════════════════════════════════════

  'Pelvic Floor Activation': {
    id: 'Pelvic Floor Activation',
    category: "Women's Health & Pelvic",
    icon: '🌸',
    shortName: 'Pelvic Floor Activation & Kegel Strengthening Protocol',
    title: 'Pelvic Floor Muscle Activation — Kegel Exercise & Core Coordination',
    targetRom: 'Pelvic Floor Contraction: 3–10s Hold | Relaxation: 10s Complete',
    indication: 'Stress/urge urinary incontinence, post-natal pelvic floor weakness, pelvic organ prolapse, post-prostatectomy.',
    landmarks: 'Pelvis/Hip (11,12), Lumbar spine, Abdominal wall, Shoulder plumb line.',
    steps: [
      '1. Lie supine with knees bent, feet flat; or sit comfortably upright in a chair.',
      '2. Identify pelvic floor muscles — imagine stopping mid-flow of urine.',
      '3. Gently contract (lift and squeeze) pelvic floor muscles — avoid buttock or thigh activation.',
      '4. Hold the contraction for 3–10 seconds while breathing normally — do NOT hold breath.',
      '5. Fully relax for 10 seconds before next repetition; complete 10–15 contractions per set.'
    ],
    formTips: [
      '⚠️ Avoid bearing down (Valsalva) — the activation should be subtle, internal, and upward.',
      '⚠️ Do not tighten buttocks, thighs, or abdomen during isolated pelvic floor contraction.',
      '⚠️ Ensure complete, conscious relaxation between contractions to prevent overtraining.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Contraction Hold:', `${rA}s`],
      ['Core Activation:', `${lA}%`],
      ['Lumbar Neutrality:', `${torso}%`],
      ['Relaxation Phase:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const contractPct = Math.round(20 + cycle * 80);
      const lA = contractPct;
      const rA = Math.round(cycle * 10);
      const torso = isBadForm ? 58 : 96;
      const sym = isBadForm ? 62 : 97;
      const score = isBadForm ? 68 : Math.round(89 + cycle * 9);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.87 ? 'PELVIC HOLD — BREATHE!' : (Math.cos(simStep) > 0 ? 'CONTRACTING — LIFT UP' : 'FULL RELAXATION PHASE'));
      const lSh = { x: w/2 - 95, y: h * 0.30 - cycle * 4 };
      const rSh = { x: w/2 + 95, y: h * 0.30 - cycle * 4 };
      const lHip = { x: w/2 - 50, y: h * 0.52 - cycle * 6 };
      const rHip = { x: w/2 + 50, y: h * 0.52 - cycle * 6 };
      const lKnee = { x: w/2 - 55, y: h * 0.70 };
      const rKnee = { x: w/2 + 55, y: h * 0.70 };
      const lAnkle = { x: w/2 - 57, y: h * 0.89 };
      const rAnkle = { x: w/2 + 57, y: h * 0.89 };
      const lEl = { x: lSh.x - 30, y: lSh.y + 65 };
      const rEl = { x: rSh.x + 30, y: rSh.y + 65 };
      const lWr = { x: lEl.x - 20, y: lEl.y + 50 };
      const rWr = { x: rEl.x + 20, y: rEl.y + 50 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Antenatal Prenatal Exercise': {
    id: 'Antenatal Prenatal Exercise',
    category: "Women's Health & Pelvic",
    icon: '🤰',
    shortName: 'Antenatal Safe Exercise & Prenatal Posture Correction',
    title: 'Antenatal Safe Exercise — Prenatal Posture, Breathing & Gentle Mobility',
    targetRom: 'Gentle Lumbar Mobility: ±15° | Shoulder Opening: 0°–90°',
    indication: 'Pregnancy (2nd/3rd trimester) back pain, pelvic girdle pain (PGP), pregnancy-related postural dysfunction.',
    landmarks: 'Shoulder (5,6), Pelvis/Hip (11,12), Lumbar spine curvature.',
    steps: [
      '1. Stand in a wide, stable stance or sit upright on a birthing ball for comfort.',
      '2. Perform gentle pelvic rocking: anterior pelvic tilt (arch) then posterior tilt (flatten) × 10.',
      '3. Open chest with slow bilateral shoulder rolls — backward × 10.',
      '4. Practice diaphragmatic breathing: 4-count inhale, 6-count slow exhale × 5.',
      '5. Perform cat-cow spinal mobility only if comfortable in all-fours position × 8.'
    ],
    formTips: [
      '⚠️ Avoid supine positions beyond 20 weeks due to vena cava compression risk.',
      '⚠️ Stop immediately if experiencing shortness of breath, dizziness, or pelvic pain.',
      '⚠️ Maintain separation less than 2-finger width for diastasis recti precautions.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Pelvic Mobility:', `${lA}°`],
      ['Shoulder Opening:', `${rA}°`],
      ['Postural Alignment:', `${torso}%`],
      ['Breathing Control:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const tilt = Math.round(Math.sin(simStep) * 15);
      const lA = Math.abs(tilt);
      const rA = Math.round(20 + cycle * 70);
      const torso = isBadForm ? 60 : 94;
      const sym = isBadForm ? 65 : 96;
      const score = isBadForm ? 70 : Math.round(88 + cycle * 10);
      const status = isBadForm ? 'ADJUST POSTURE' : (tilt > 8 ? 'ANTERIOR PELVIC TILT' : (tilt < -8 ? 'POSTERIOR TILT — FLAT' : 'SHOULDER OPENING PHASE'));
      const lSh = { x: w/2 - 95, y: h * 0.29 };
      const rSh = { x: w/2 + 95, y: h * 0.29 };
      const lHip = { x: w/2 - 60, y: h * 0.52 };
      const rHip = { x: w/2 + 60, y: h * 0.52 };
      const lKnee = { x: w/2 - 68, y: h * 0.70 };
      const rKnee = { x: w/2 + 68, y: h * 0.70 };
      const lAnkle = { x: w/2 - 72, y: h * 0.90 };
      const rAnkle = { x: w/2 + 72, y: h * 0.90 };
      const openW = cycle * 45;
      const lEl = { x: lSh.x - 35 - openW, y: lSh.y + 65 };
      const rEl = { x: rSh.x + 35 + openW, y: rSh.y + 65 };
      const lWr = { x: lEl.x - 20, y: lEl.y + 50 };
      const rWr = { x: rEl.x + 20, y: rEl.y + 50 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ONCOLOGY & LYMPHOEDEMA
  // ══════════════════════════════════════════════════════════════════════════

  'Post-Mastectomy Shoulder Mobility': {
    id: 'Post-Mastectomy Shoulder Mobility',
    category: 'Oncology & Lymphoedema',
    icon: '🎗️',
    shortName: 'Post-Mastectomy Shoulder Mobility & Axillary Web Release',
    title: 'Post-Mastectomy Shoulder Mobility — Axillary Web Syndrome & Scar Tissue Release',
    targetRom: 'Shoulder Flexion: 0°–150° | Abduction: 0°–140° (progressive targets)',
    indication: 'Post-mastectomy / lumpectomy, axillary lymph node dissection (ALND), axillary web syndrome (cording), radiation fibrosis.',
    landmarks: 'Operated Shoulder (5 or 6), Elbow (7 or 8), Wrist (9 or 10), Torso neutral axis.',
    steps: [
      '1. Begin 24–48 hours post-surgery — early gentle active assisted movements prevent adhesions.',
      '2. Pendulum exercise: lean forward, let operated arm hang freely and make small circles.',
      '3. Wall walk: stand facing wall, walk fingers up the wall to maximum comfortable height — mark progress daily.',
      '4. Pullback stretch: clasp hands behind head and gently retract elbows backward.',
      '5. Progress weekly — document ROM in degrees against discharge target of ≥140° abduction.'
    ],
    formTips: [
      '⚠️ Stop immediately if drain output increases acutely — report to breast care nurse.',
      '⚠️ Avoid lifting >0.5 kg with the operated arm until drain is removed.',
      '⚠️ Watch for axillary cording (feels like a guitar string under arm) — apply sustained stretch.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Operated Shoulder:', `${lA}°`],
      ['Contralateral ROM:', `${rA}°`],
      ['Torso Symmetry:', `${torso}%`],
      ['Mobility Progress:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const elevDeg = Math.round(20 + cycle * 120);
      const lA = elevDeg;
      const rA = Math.round(30 + cycle * 110);
      const torso = isBadForm ? 58 : 94;
      const sym = isBadForm ? 60 : 92;
      const score = isBadForm ? 66 : Math.round(85 + cycle * 12);
      const status = isBadForm ? 'IMPROVE FORM' : (cycle > 0.85 ? 'HOLD AT MAX RANGE (3s)' : (Math.cos(simStep) > 0 ? 'SLOW ELEVATION' : 'GENTLE LOWERING'));
      const lSh = { x: w/2 - 105, y: h * 0.29 };
      const rSh = { x: w/2 + 105, y: h * 0.29 };
      const lHip = { x: w/2 - 55, y: h * 0.52 };
      const rHip = { x: w/2 + 55, y: h * 0.52 };
      const lKnee = { x: w/2 - 60, y: h * 0.70 };
      const rKnee = { x: w/2 + 60, y: h * 0.70 };
      const lAnkle = { x: w/2 - 62, y: h * 0.90 };
      const rAnkle = { x: w/2 + 62, y: h * 0.90 };
      const aL = (elevDeg * Math.PI) / 180;
      const lEl = { x: lSh.x - Math.sin(aL) * 90, y: lSh.y + Math.cos(aL) * 90 };
      const lWr = { x: lEl.x - Math.sin(aL) * 80, y: lEl.y + Math.cos(aL) * 80 };
      const rEl = { x: rSh.x + 20, y: rSh.y + 70 };
      const rWr = { x: rEl.x + 10, y: rEl.y + 60 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  },

  'Lymphoedema Manual Drainage': {
    id: 'Lymphoedema Manual Drainage',
    category: 'Oncology & Lymphoedema',
    icon: '💧',
    shortName: 'Lymphoedema Active Exercise & Manual Drainage Pump',
    title: 'Lymphoedema Reduction — Active Pump Exercise & Graduated Compression Protocol',
    targetRom: 'Full Limb Active ROM | Pump: 30 Contractions/Minute Target',
    indication: 'Cancer-related lymphoedema (breast, head/neck, gynaecological, melanoma), filariasis, primary lymphoedema.',
    landmarks: 'Arm: Shoulder (5,6), Elbow (7,8), Wrist (9,10). Leg: Hip (11,12), Knee (13,14), Ankle (15,16).',
    steps: [
      '1. Elevate the affected limb above heart level for 5 minutes prior to exercise.',
      '2. Perform slow rhythmic muscle pump contractions: fist squeeze → release × 30 for arm lymphoedema.',
      '3. Complete full active ROM exercises: shoulder circles, elbow flexion/extension, wrist circles.',
      '4. Apply gentle proximal-to-distal skin stretching movements to stimulate lymphatic flow.',
      '5. After exercise, apply prescribed compression garment immediately and maintain elevation.'
    ],
    formTips: [
      '⚠️ Never perform vigorous high-intensity exercise without compression garment in place.',
      '⚠️ Avoid any exercise that causes skin redness, heat, or acute swelling increase.',
      '⚠️ Do not apply heat (hot packs, saunas) to the affected limb — lymph vessels are heat-sensitive.'
    ],
    getHud: (lA, rA, torso, sym) => [
      ['Pump Contractions:', `${lA}/min`],
      ['Limb Elevation:', `${rA}°`],
      ['Lymph Flow Index:', `${torso}%`],
      ['Compression Effect:', `${sym}%`]
    ],
    getSim: (w, h, cycle, simStep, isBadForm, headX, headY) => {
      const pumpRate = Math.round(10 + cycle * 25);
      const lA = pumpRate;
      const rA = Math.round(30 + cycle * 60);
      const torso = isBadForm ? 55 : 92;
      const sym = isBadForm ? 60 : 93;
      const score = isBadForm ? 67 : Math.round(87 + cycle * 11);
      const status = isBadForm ? 'COMPRESSION NEEDED' : (cycle > 0.85 ? 'PUMP HOLD — ELEVATE' : (Math.cos(simStep) > 0 ? 'ACTIVE PUMP PHASE' : 'RELAXATION PHASE'));
      const elevH = cycle * 80;
      const lSh = { x: w/2 - 100, y: h * 0.30 };
      const rSh = { x: w/2 + 100, y: h * 0.30 };
      const lHip = { x: w/2 - 52, y: h * 0.52 };
      const rHip = { x: w/2 + 52, y: h * 0.52 };
      const lKnee = { x: w/2 - 57, y: h * 0.70 };
      const rKnee = { x: w/2 + 57, y: h * 0.70 };
      const lAnkle = { x: w/2 - 60, y: h * 0.90 };
      const rAnkle = { x: w/2 + 60, y: h * 0.90 };
      const lEl = { x: lSh.x - 20, y: lSh.y + 30 - elevH * 0.5 };
      const lWr = { x: lEl.x - 15, y: lEl.y - elevH * 0.8 };
      const rEl = { x: rSh.x + 15, y: rSh.y + 70 };
      const rWr = { x: rEl.x + 10, y: rEl.y + 55 };
      return { lA, rA, torso, sym, status, score, lSh, rSh, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle, lEl, rEl, lWr, rWr };
    }
  }
};

export interface PhysioRoutineGroup {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  defaultDurationSec: number;
  exercises: string[];
}

export const PHYSIO_ROUTINES: PhysioRoutineGroup[] = [
  {
    id: 'upper-limb-rotator',
    name: 'Upper Extremity & Rotator Cuff Routine',
    category: 'Orthopedic & Post-Surgical',
    icon: '💪',
    description: 'Coronal abduction, sagittal flexion, internal/external rotation, and scapular stabilization.',
    defaultDurationSec: 45,
    exercises: ['Shoulder Abduction', 'Shoulder Forward Flexion', 'Elbow Flexion Extension Post-Fracture', 'Shoulder Rotator Cuff Strengthening']
  },
  {
    id: 'lower-limb-knee-tka',
    name: 'Lower Extremity & Knee Post-Op Routine',
    category: 'Orthopedic & Post-Surgical',
    icon: '🦵',
    description: 'Quadriceps activation, knee flexion-extension, heel slides, and functional squats.',
    defaultDurationSec: 45,
    exercises: ['Knee Flexion Extension', 'Functional Squat', 'Single Leg Stance', 'Standing Hip Abduction']
  },
  {
    id: 'stroke-neuro-rehab',
    name: 'Stroke Neuro-Rehab & Hemiparesis Routine',
    category: 'Neurological & Balance',
    icon: '🧠',
    description: 'Post-stroke hemiparetic elevation, trunk rotation, and sit-to-stand weight shift.',
    defaultDurationSec: 60,
    exercises: ['Hemiparetic Arm Elevation', 'Lumbar Spine Core Tilt', 'Single Leg Stance', 'Sit to Stand Transfer']
  },
  {
    id: 'geriatric-fall-prevention',
    name: 'Geriatric Balance & Fall Prevention Routine',
    category: 'Geriatric & Fall Prevention',
    icon: '👴',
    description: 'Tandem stance, sit-to-stand posture, and ankle stability for senior mobility.',
    defaultDurationSec: 45,
    exercises: ['Berg Balance Scale Exercise', 'Timed Up and Go', 'Sit to Stand Transfer', 'Knee Flexion Extension']
  },
  {
    id: 'spine-core-posture',
    name: 'Spine, Cervical & Posture Alignment Routine',
    category: 'Spine, Neck & Posture',
    icon: '🧘',
    description: 'Cervical retraction, thoracic expansion, and core spine de-loading.',
    defaultDurationSec: 45,
    exercises: ['Cervical Spine ROM', 'Lumbar Spine Core Tilt', 'Scapular Retraction', 'Diaphragmatic Breathing']
  },
  {
    id: 'hand-fine-motor',
    name: 'Hand, Wrist & Upper Limb Dexterity Routine',
    category: 'Hand & Upper Limb',
    icon: '✋',
    description: 'Fine motor finger taps, wrist extension/flexion, and grip strengthening.',
    defaultDurationSec: 40,
    exercises: ['Wrist Flexion Extension ROM', 'Developmental Reach & Grasp', 'Elbow Flexion Extension Post-Fracture']
  },
  {
    id: 'cardiopulmonary-endurance',
    name: 'Cardiopulmonary & Functional Capacity Routine',
    category: 'Cardiopulmonary & Functional',
    icon: '🫁',
    description: 'Deep diaphragmatic breathing, thoracic cage expansion, and paced standing.',
    defaultDurationSec: 50,
    exercises: ['Diaphragmatic Breathing', 'High Knee Marching', 'Sit to Stand Transfer']
  },
  {
    id: 'sports-agility-plyo',
    name: 'Sports Conditioning & Agility Routine',
    category: 'Sports & Performance',
    icon: '🏃',
    description: 'Rotational power, lateral lunges, and dynamic lower limb mobility.',
    defaultDurationSec: 40,
    exercises: ['Plyometric Box Jump', 'Nordic Hamstring Curl', 'Standing Hip Abduction', 'Functional Squat']
  },
  {
    id: 'womens-pelvic-core',
    name: 'Women\'s Health & Pelvic Posture Routine',
    category: 'Women\'s Health & Pelvic',
    icon: '🌸',
    description: 'Pelvic tilt activation, gluteal bridging, and diaphragmatic posture.',
    defaultDurationSec: 45,
    exercises: ['Pelvic Floor Activation', 'Antenatal Prenatal Exercise', 'Lumbar Spine Core Tilt']
  },
  {
    id: 'oncology-lymph-flow',
    name: 'Oncology & Lymphoedema De-Congestive Routine',
    category: 'Oncology & Lymphoedema',
    icon: '🎗️',
    description: 'Muscle pump decongestive lymphatic drainage and post-mastectomy elevation.',
    defaultDurationSec: 50,
    exercises: ['Lymphoedema Manual Drainage', 'Post-Mastectomy Shoulder Mobility', 'Diaphragmatic Breathing']
  }
];

export const PROTOCOL_ALIASES: Record<string, string> = {
  'Shoulder Flexion': 'Shoulder Forward Flexion',
  'Knee Extension Flexion': 'Knee Flexion Extension',
  'Post-Stroke Hemiparetic Elevation': 'Hemiparetic Arm Elevation',
  'Hemiparetic Elevation': 'Hemiparetic Arm Elevation',
  'Geriatric Tandem Balance': 'Berg Balance Scale Exercise',
  'Trunk Rotation & Core Alignment': 'Lumbar Spine Core Tilt',
  'Cervical Retraction Chin Tuck': 'Cervical Spine ROM',
  'Thoracic Extension Deep Breathing': 'Diaphragmatic Breathing',
  'Lateral Side Lunge': 'Standing Hip Abduction',
  'Single Leg Balance Stance': 'Single Leg Stance',
  'Hand & Wrist Fine Motor': 'Wrist Flexion Extension ROM',
  'Elbow Flexion Extension': 'Elbow Flexion Extension Post-Fracture',
  'Wall Climbing Reach': 'Shoulder Forward Flexion',
  'Dynamic Torso Rotation': 'Lumbar Spine Core Tilt',
  'Pelvic Tilt Core Activation': 'Pelvic Floor Activation',
  'Lymphoedema Muscle Pump': 'Lymphoedema Manual Drainage',
};

export function getPhysioProtocol(name: string): PhysioProtocolConfig {
  if (!name) return PHYSIO_PROTOCOLS['Shoulder Abduction'];
  if (PHYSIO_PROTOCOLS[name]) return PHYSIO_PROTOCOLS[name];
  if (PROTOCOL_ALIASES[name] && PHYSIO_PROTOCOLS[PROTOCOL_ALIASES[name]]) {
    return PHYSIO_PROTOCOLS[PROTOCOL_ALIASES[name]];
  }
  const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, proto] of Object.entries(PHYSIO_PROTOCOLS)) {
    const kClean = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (kClean === clean || kClean.includes(clean) || clean.includes(kClean)) {
      return proto;
    }
  }
  return PHYSIO_PROTOCOLS['Shoulder Abduction'];
}

