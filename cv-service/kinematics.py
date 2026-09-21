"""
Kinematic Movement Engine — Biomechanical Analysis & Temporal Assessment
Utilizes NumPy, MediaPipe Pose 33 3D Landmarks, and Temporal Phase State Machine.
"""

import numpy as np
from typing import Dict, List, Any, Optional, Tuple

class TemporalMovementAnalyzer:
    """
    Analyzes physical therapy movements across temporal frames.
    Tracks 5-phase movement states:
      READY -> RAISING -> HOLDING -> LOWERING -> COMPLETED
    Detects posture, ROM, left/right symmetry, hold duration, and control.
    """

    def __init__(
        self,
        exercise_name: str = "Shoulder Abduction",
        target_rom: float = 120.0,
        min_rom_threshold: float = 85.0,
        target_hold_duration_sec: float = 2.0,
        smoothing_window_size: int = 5
    ):
        self.exercise_name = exercise_name
        self.target_rom = target_rom
        self.min_rom_threshold = min_rom_threshold
        self.target_hold_duration_sec = target_hold_duration_sec
        self.smoothing_window_size = smoothing_window_size

        # Temporal angle buffers for moving average smoothing
        self.left_angle_history: List[float] = []
        self.right_angle_history: List[float] = []
        self.torso_history: List[float] = []
        self.symmetry_history: List[float] = []

        # State Machine
        self.current_phase: str = "READY"  # READY, RAISING, HOLDING, LOWERING, COMPLETED
        self.rep_count: int = 0
        self.hold_start_timestamp: Optional[float] = None
        self.phase_start_timestamp: Optional[float] = None
        self.current_rep_hold_duration: float = 0.0

        # Repetition Aggregations (per rep)
        self.rep_peak_left: float = 0.0
        self.rep_peak_right: float = 0.0
        self.rep_symmetries: List[float] = []
        self.rep_torso_alignments: List[float] = []
        self.rep_form_faults: List[str] = []

        # Sustained fault tracker (avoids 1-frame false alarms)
        self.consecutive_lean_frames: int = 0
        self.consecutive_asymmetry_frames: int = 0

        # Completed repetition audit history
        self.recorded_reps: List[Dict[str, Any]] = []

    @staticmethod
    def calculate_angle(p1: np.ndarray, p2: np.ndarray, p3: np.ndarray) -> float:
        """
        Calculates the angle between 3 points: p1 - p2 (vertex) - p3
        using vector dot product: cos(theta) = (u . v) / (|u| * |v|)
        Returns angle in degrees [0, 180].
        """
        v1 = p1 - p2
        v2 = p3 - p2
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        cosine_angle = np.dot(v1, v2) / (norm1 * norm2)
        cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
        return float(np.degrees(np.arccos(cosine_angle)))

    @staticmethod
    def calculate_elevation_angle(shoulder: np.ndarray, elbow: np.ndarray) -> float:
        """
        Calculates coronal abduction or sagittal elevation from resting hanging position.
        0 degrees = arm straight down at side.
        90 degrees = arm horizontal.
        180 degrees = arm straight overhead.
        """
        vx = elbow[0] - shoulder[0]
        vy = elbow[1] - shoulder[1]  # In image coords, y increases downwards
        # Vector straight down is (0, 1)
        angle = np.degrees(np.arctan2(np.abs(vx), vy))
        return float(np.clip(angle, 0.0, 180.0))

    def process_frame(
        self,
        landmarks: List[Dict[str, float]],
        timestamp_sec: float
    ) -> Dict[str, Any]:
        """
        Process MediaPipe 33 pose landmarks for a single frame.
        Landmark indices (MediaPipe Pose):
          11: left_shoulder, 12: right_shoulder
          13: left_elbow,    14: right_elbow
          15: left_wrist,    16: right_wrist
          23: left_hip,      24: right_hip
          25: left_knee,     26: right_knee
          27: left_ankle,    28: right_ankle
        """
        if not landmarks or len(landmarks) < 33:
            return {
                "phase": self.current_phase,
                "feedback": "Step fully into camera view",
                "left_angle": 0.0,
                "right_angle": 0.0,
                "torso_alignment": 100.0,
                "symmetry_score": 100.0,
                "movement_score": 90,
                "rep_count": self.rep_count
            }

        def to_vec(idx: int) -> np.ndarray:
            lm = landmarks[idx]
            return np.array([lm.get("x", 0.0), lm.get("y", 0.0), lm.get("z", 0.0)])

        l_sh, r_sh = to_vec(11), to_vec(12)
        l_el, r_el = to_vec(13), to_vec(14)
        l_wr, r_wr = to_vec(15), to_vec(16)
        l_hip, r_hip = to_vec(23), to_vec(24)

        # 1. Joint Angles & Range of Motion
        raw_l_angle = self.calculate_elevation_angle(l_sh, l_el)
        raw_r_angle = self.calculate_elevation_angle(r_sh, r_el)

        # Temporal smoothing filter (rolling window)
        self.left_angle_history.append(raw_l_angle)
        self.right_angle_history.append(raw_r_angle)
        if len(self.left_angle_history) > self.smoothing_window_size:
            self.left_angle_history.pop(0)
            self.right_angle_history.pop(0)

        l_angle = float(np.mean(self.left_angle_history))
        r_angle = float(np.mean(self.right_angle_history))
        max_angle = max(l_angle, r_angle)

        # 2. Torso Alignment (Spine vertical plumb line & shoulder-hip level)
        sh_diff_y = abs(l_sh[1] - r_sh[1])
        hip_diff_y = abs(l_hip[1] - r_hip[1])
        torso_slant = (sh_diff_y * 220) + (hip_diff_y * 110)
        raw_torso = float(np.clip(100.0 - torso_slant, 20.0, 100.0))

        self.torso_history.append(raw_torso)
        if len(self.torso_history) > self.smoothing_window_size:
            self.torso_history.pop(0)
        torso_alignment = float(np.mean(self.torso_history))

        # 3. Left / Right Symmetry Score
        angle_diff = abs(l_angle - r_angle)
        # Percentage difference relative to current elevation
        denom = max(max_angle, 45.0)
        raw_symmetry = float(np.clip(100.0 - (angle_diff / denom) * 100.0, 10.0, 100.0))

        self.symmetry_history.append(raw_symmetry)
        if len(self.symmetry_history) > self.smoothing_window_size:
            self.symmetry_history.pop(0)
        symmetry_score = float(np.mean(self.symmetry_history))

        # 4. Sustained Form Fault Analysis (requires persistence across >8 frames ~ 250ms)
        if torso_alignment < 70.0:
            self.consecutive_lean_frames += 1
        else:
            self.consecutive_lean_frames = max(0, self.consecutive_lean_frames - 1)

        if max_angle > 40.0 and angle_diff > 25.0:
            self.consecutive_asymmetry_frames += 1
        else:
            self.consecutive_asymmetry_frames = max(0, self.consecutive_asymmetry_frames - 1)

        is_sustained_lean = self.consecutive_lean_frames >= 8
        is_sustained_asymmetry = self.consecutive_asymmetry_frames >= 8

        # 5. Temporal Phase State Machine
        # Stages: READY -> RAISING -> HOLDING -> LOWERING -> COMPLETED
        feedback = ""
        just_completed_rep = False

        if self.current_phase == "READY":
            if max_angle < 30.0:
                feedback = "Ready — Begin raising arms outward smoothly"
            else:
                self.current_phase = "RAISING"
                self.phase_start_timestamp = timestamp_sec
                self.rep_peak_left = l_angle
                self.rep_peak_right = r_angle
                self.rep_symmetries = [symmetry_score]
                self.rep_torso_alignments = [torso_alignment]
                self.rep_form_faults = []
                self.current_rep_hold_duration = 0.0

        elif self.current_phase == "RAISING":
            self.rep_peak_left = max(self.rep_peak_left, l_angle)
            self.rep_peak_right = max(self.rep_peak_right, r_angle)
            self.rep_symmetries.append(symmetry_score)
            self.rep_torso_alignments.append(torso_alignment)

            if is_sustained_lean:
                feedback = "Keep your torso straight"
                if "Torso Lean" not in self.rep_form_faults:
                    self.rep_form_faults.append("Torso Lean")
            elif is_sustained_asymmetry:
                feedback = "Lift both arms evenly"
                if "Asymmetric Elevation" not in self.rep_form_faults:
                    self.rep_form_faults.append("Asymmetric Elevation")
            elif max_angle < self.min_rom_threshold and max_angle > 60.0:
                feedback = "Raise your arm higher towards target ROM"
            else:
                feedback = "Raising arms outward smoothly"

            # Transition to HOLDING when target ROM reached
            if max_angle >= self.target_rom * 0.85:  # e.g. 102 deg for 120 deg target
                self.current_phase = "HOLDING"
                self.hold_start_timestamp = timestamp_sec

        elif self.current_phase == "HOLDING":
            self.rep_peak_left = max(self.rep_peak_left, l_angle)
            self.rep_peak_right = max(self.rep_peak_right, r_angle)
            self.rep_symmetries.append(symmetry_score)
            self.rep_torso_alignments.append(torso_alignment)

            if self.hold_start_timestamp is not None:
                self.current_rep_hold_duration = timestamp_sec - self.hold_start_timestamp

            remaining_hold = max(0.0, self.target_hold_duration_sec - self.current_rep_hold_duration)

            if is_sustained_lean:
                feedback = "Keep your torso straight"
                if "Torso Lean" not in self.rep_form_faults:
                    self.rep_form_faults.append("Torso Lean")
            elif remaining_hold > 0:
                feedback = f"Hold position ({remaining_hold:.1f}s remaining)"
            else:
                feedback = "Hold complete! Now lower arms with control"

            # Transition to LOWERING when arm descends below hold band
            if max_angle < (self.target_rom * 0.70):
                self.current_phase = "LOWERING"
                if self.current_rep_hold_duration < (self.target_hold_duration_sec * 0.75):
                    self.rep_form_faults.append("Missing hold duration")

        elif self.current_phase == "LOWERING":
            self.rep_symmetries.append(symmetry_score)
            self.rep_torso_alignments.append(torso_alignment)

            if is_sustained_lean:
                feedback = "Keep your torso straight"
            else:
                feedback = "Lower arms with slow eccentric control"

            # Transition to COMPLETED when returned to bottom rest position (<28 deg)
            if max_angle <= 28.0:
                self.current_phase = "READY"
                self.rep_count += 1
                just_completed_rep = True

                # Evaluate Repetition Quality
                avg_symmetry = float(np.mean(self.rep_symmetries)) if self.rep_symmetries else symmetry_score
                avg_torso = float(np.mean(self.rep_torso_alignments)) if self.rep_torso_alignments else torso_alignment
                peak_rom = max(self.rep_peak_left, self.rep_peak_right)

                hold_satisfied = self.current_rep_hold_duration >= (self.target_hold_duration_sec * 0.8)
                rom_satisfied = peak_rom >= self.min_rom_threshold
                posture_satisfied = avg_torso >= 75.0
                symmetry_satisfied = avg_symmetry >= 80.0

                is_quality_rep = rom_satisfied and posture_satisfied and symmetry_satisfied and hold_satisfied

                # Composite score calculation (0-100)
                rom_score = min(35.0, (peak_rom / self.target_rom) * 35.0)
                posture_score = (avg_torso / 100.0) * 25.0
                sym_score = (avg_symmetry / 100.0) * 25.0
                hold_score = 15.0 if hold_satisfied else min(15.0, (self.current_rep_hold_duration / self.target_hold_duration_sec) * 15.0)
                calc_score = int(round(rom_score + posture_score + sym_score + hold_score))

                if is_quality_rep:
                    movement_state = "COMPLETED"
                    form_quality = "Optimal Form"
                    feedback = "Good repetition"
                else:
                    movement_state = "IMPROVE_FORM"
                    if not rom_satisfied:
                        form_quality = "Limited Range of Motion"
                        feedback = "Raise your arm higher on next rep"
                    elif not hold_satisfied:
                        form_quality = "Missing Hold Duration"
                        feedback = f"Hold position for full {self.target_hold_duration_sec:.0f}s"
                    elif not posture_satisfied:
                        form_quality = "Torso Lean Detected"
                        feedback = "Keep your torso straight"
                    else:
                        form_quality = "Asymmetry Detected"
                        feedback = "Lift both arms evenly"

                rep_record = {
                    "rep_number": self.rep_count,
                    "timestamp": timestamp_sec,
                    "movement_state": movement_state,
                    "left_joint_angle": round(self.rep_peak_left, 1),
                    "right_joint_angle": round(self.rep_peak_right, 1),
                    "symmetry_score": round(avg_symmetry, 1),
                    "torso_alignment": round(avg_torso, 1),
                    "hold_duration_sec": round(self.current_rep_hold_duration, 2),
                    "movement_score": calc_score,
                    "form_quality": form_quality
                }
                self.recorded_reps.append(rep_record)

        # Real-time Movement Score
        live_score = int(np.clip(
            (torso_alignment * 0.35) +
            (symmetry_score * 0.35) +
            (min(30.0, (max_angle / max(self.target_rom, 1.0)) * 30.0)),
            30, 100
        ))

        return {
            "phase": self.current_phase,
            "feedback": feedback,
            "left_angle": round(l_angle, 1),
            "right_angle": round(r_angle, 1),
            "torso_alignment": round(torso_alignment, 1),
            "symmetry_score": round(symmetry_score, 1),
            "movement_score": live_score,
            "rep_count": self.rep_count,
            "hold_duration_sec": round(self.current_rep_hold_duration, 2),
            "just_completed_rep": just_completed_rep,
            "latest_rep": self.recorded_reps[-1] if just_completed_rep and self.recorded_reps else None
        }
