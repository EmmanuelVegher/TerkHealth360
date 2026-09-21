"""
Smart Hospital — Computer Vision & Kinematics FastAPI Microservice
Provides:
- MediaPipe Pose Landmarker
- OpenCV video processing & skeletal overlay rendering
- NumPy temporal kinematic movement analysis
- FFmpeg video export
"""

import os
import io
import time
import shutil
import tempfile
import subprocess
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel

from kinematics import TemporalMovementAnalyzer

app = FastAPI(
    title="Smart Hospital Kinematics & Computer Vision Microservice",
    description="Analyzes full-body pose landmarks, joint angles, phases, and quality metrics using MediaPipe, OpenCV, NumPy, and FFmpeg.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Pose
try:
    import mediapipe as mp
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    mp_drawing_styles = mp.solutions.drawing_styles
    MEDIAPIPE_AVAILABLE = True
except Exception as e:
    MEDIAPIPE_AVAILABLE = False
    mp_pose = None
    mp_drawing = None
    print(f"MediaPipe warning: {e}")


class LandmarkItem(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0


class FrameAnalysisRequest(BaseModel):
    exercise_name: str = "Shoulder Abduction"
    target_rom: float = 120.0
    timestamp_sec: float
    landmarks: List[LandmarkItem]


# Global session cache for active streams
session_analyzers: Dict[str, TemporalMovementAnalyzer] = {}


@app.get("/health")
def health_check():
    ffmpeg_path = shutil.which("ffmpeg")
    return {
        "status": "online",
        "service": "Smart Hospital CV & Kinematic Biofeedback Service",
        "tech_stack": {
            "computer_vision": "MediaPipe Pose Landmarker",
            "numerical_analysis": f"NumPy {np.__version__}",
            "image_processing": f"OpenCV {cv2.__version__}",
            "temporal_analysis": "TemporalMovementAnalyzer (Phase State Machine)",
            "backend": "FastAPI + Uvicorn",
            "video_export": f"FFmpeg ({ffmpeg_path if ffmpeg_path else 'Not found'})"
        },
        "features": [
            "Full-body 33 pose landmarks",
            "Joint angles & Shoulder Range of Motion (0-180 deg)",
            "Torso alignment & Plumb line tracking",
            "Left/Right bilateral symmetry",
            "5-Stage Phase Detection (Ready -> Raising -> Holding -> Lowering -> Completed)",
            "Hold duration timing & enforcement",
            "Clinical repetition quality scoring (0-100)"
        ]
    }


@app.post("/api/cv/analyze-frame")
def analyze_frame(req: FrameAnalysisRequest, session_id: str = "default"):
    """
    Analyzes a single frame's pose landmarks temporally.
    """
    if session_id not in session_analyzers:
        session_analyzers[session_id] = TemporalMovementAnalyzer(
            exercise_name=req.exercise_name,
            target_rom=req.target_rom
        )
    analyzer = session_analyzers[session_id]

    landmarks_dict = [lm.model_dump() for lm in req.landmarks]
    result = analyzer.process_frame(landmarks_dict, req.timestamp_sec)
    return result


@app.post("/api/cv/reset-session")
def reset_session(session_id: str = "default", exercise_name: str = "Shoulder Abduction"):
    session_analyzers[session_id] = TemporalMovementAnalyzer(exercise_name=exercise_name)
    return {"message": f"Session {session_id} reset", "exercise": exercise_name}


@app.post("/api/cv/analyze-video")
async def analyze_video(
    file: UploadFile = File(...),
    exercise_name: str = Form("Shoulder Abduction"),
    target_rom: float = Form(120.0),
    target_hold_sec: float = Form(2.0)
):
    """
    Upload an exercise video (.mp4, .mov, .webm) and run MediaPipe Pose + OpenCV
    to extract temporal movement analysis, phases, repetitions, and clinical metrics.
    """
    if not MEDIAPIPE_AVAILABLE or mp_pose is None:
        raise HTTPException(status_code=500, detail="MediaPipe Pose is not available in environment.")

    # Save uploaded video to temp file
    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        tmp_in_path = tmp_in.name
        content = await file.read()
        tmp_in.write(content)

    try:
        cap = cv2.VideoCapture(tmp_in_path)
        if not cap.isOpened():
            raise HTTPException(status_code=400, detail="Could not open video file.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        analyzer = TemporalMovementAnalyzer(
            exercise_name=exercise_name,
            target_rom=target_rom,
            target_hold_duration_sec=target_hold_sec
        )

        frame_results = []
        frame_idx = 0

        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as pose:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                timestamp_sec = frame_idx / fps
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(frame_rgb)

                if results.pose_landmarks:
                    landmarks_list = [
                        {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                        for lm in results.pose_landmarks.landmark
                    ]
                    analysis = analyzer.process_frame(landmarks_list, timestamp_sec)
                    frame_results.append({
                        "frame": frame_idx,
                        "time": round(timestamp_sec, 2),
                        "phase": analysis["phase"],
                        "left_angle": analysis["left_angle"],
                        "right_angle": analysis["right_angle"],
                        "torso_alignment": analysis["torso_alignment"],
                        "symmetry_score": analysis["symmetry_score"],
                        "feedback": analysis["feedback"]
                    })
                frame_idx += 1

        cap.release()

        recorded_reps = analyzer.recorded_reps
        total_reps = len(recorded_reps)
        avg_score = int(round(np.mean([r["movement_score"] for r in recorded_reps]))) if recorded_reps else 0
        peak_rom = max([max(r["left_joint_angle"], r["right_joint_angle"]) for r in recorded_reps]) if recorded_reps else 0
        avg_torso = int(round(np.mean([r["torso_alignment"] for r in recorded_reps]))) if recorded_reps else 100
        form_warnings = len([r for r in recorded_reps if r["movement_state"] == "IMPROVE_FORM"])

        return {
            "exercise_name": exercise_name,
            "total_frames_analyzed": frame_idx,
            "fps": fps,
            "duration_sec": round(frame_idx / fps, 2),
            "summary": {
                "total_reps": total_reps,
                "overall_score": avg_score,
                "peak_shoulder_angle": peak_rom,
                "average_torso_alignment": avg_torso,
                "form_warnings": form_warnings
            },
            "repetitions": recorded_reps,
            "sample_telemetry": frame_results[::int(max(1, fps // 2))]  # sample 2hz
        }

    finally:
        if os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)


@app.post("/api/cv/render-video")
async def render_video(
    file: UploadFile = File(...),
    exercise_name: str = Form("Shoulder Abduction")
):
    """
    Renders OpenCV skeleton overlay onto video and re-encodes via FFmpeg for high-compatibility MP4 streaming.
    """
    if not MEDIAPIPE_AVAILABLE or mp_pose is None:
        raise HTTPException(status_code=500, detail="MediaPipe Pose is not available.")

    suffix = os.path.splitext(file.filename or "video.mp4")[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_in:
        tmp_in_path = tmp_in.name
        content = await file.read()
        tmp_in.write(content)

    tmp_raw_out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name
    tmp_ffmpeg_out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

    try:
        cap = cv2.VideoCapture(tmp_in_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(tmp_raw_out, fourcc, fps, (width, height))

        analyzer = TemporalMovementAnalyzer(exercise_name=exercise_name)
        frame_idx = 0

        with mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as pose:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break

                timestamp_sec = frame_idx / fps
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(frame_rgb)

                if results.pose_landmarks:
                    mp_drawing.draw_landmarks(
                        frame,
                        results.pose_landmarks,
                        mp_pose.POSE_CONNECTIONS,
                        landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style()
                    )
                    landmarks_list = [
                        {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                        for lm in results.pose_landmarks.landmark
                    ]
                    analysis = analyzer.process_frame(landmarks_list, timestamp_sec)

                    # Draw Biomechanical HUD Overlay using OpenCV
                    cv2.rectangle(frame, (10, 10), (320, 120), (15, 23, 42), -1)
                    cv2.putText(frame, f"EXERCISE: {exercise_name}", (20, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (56, 189, 248), 1)
                    cv2.putText(frame, f"PHASE: {analysis['phase']}", (20, 56), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (34, 211, 238), 2)
                    cv2.putText(frame, f"ROM: L {analysis['left_angle']:.0f} deg | R {analysis['right_angle']:.0f} deg", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1)
                    cv2.putText(frame, f"REPS: {analysis['rep_count']} | SCORE: {analysis['movement_score']}", (20, 104), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (74, 222, 128), 1)

                    # Clinical coaching prompt
                    if analysis['feedback']:
                        cv2.rectangle(frame, (10, height - 50), (width - 10, height - 10), (0, 0, 0), -1)
                        cv2.putText(frame, analysis['feedback'], (25, height - 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 229, 255), 2)

                out.write(frame)
                frame_idx += 1

        cap.release()
        out.release()

        # Re-encode with FFmpeg (H.264 + AAC) for browser streaming compatibility
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", tmp_raw_out,
            "-c:v", "libx264", "-preset", "fast", "-crf", "23",
            "-pix_fmt", "yuv420p", tmp_ffmpeg_out
        ]
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        return FileResponse(tmp_ffmpeg_out, media_type="video/mp4", filename="rehab_pose_analysis.mp4")

    finally:
        if os.path.exists(tmp_in_path):
            os.remove(tmp_in_path)
        if os.path.exists(tmp_raw_out):
            os.remove(tmp_raw_out)
