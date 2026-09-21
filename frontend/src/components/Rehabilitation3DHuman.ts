import * as THREE from 'three';

export interface SimJointData {
  lSh: { x: number; y: number };
  rSh: { x: number; y: number };
  lEl: { x: number; y: number };
  rEl: { x: number; y: number };
  lWr: { x: number; y: number };
  rWr: { x: number; y: number };
  lHip: { x: number; y: number };
  rHip: { x: number; y: number };
  lKnee: { x: number; y: number };
  rKnee: { x: number; y: number };
  lAnkle: { x: number; y: number };
  rAnkle: { x: number; y: number };
  lA?: number;
  rA?: number;
  torso?: number;
  sym?: number;
  status?: string;
  score?: number;
  cTilt?: number;
  cRot?: number;
  headX?: number;
  headY?: number;
}

export class Rehabilitation3DScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLCanvasElement;

  // 3D Human Joint Hierarchy
  private humanRoot: THREE.Group;
  private headGroup: THREE.Group;
  private torsoGroup: THREE.Group;
  private leftShoulderGroup: THREE.Group;
  private rightShoulderGroup: THREE.Group;
  private leftElbowGroup: THREE.Group;
  private rightElbowGroup: THREE.Group;
  private leftHipGroup: THREE.Group;
  private rightHipGroup: THREE.Group;
  private leftKneeGroup: THREE.Group;
  private rightKneeGroup: THREE.Group;
  private leftAnkleGroup: THREE.Group;
  private rightAnkleGroup: THREE.Group;

  // Joint Tracker Markers
  private jointMarkers: THREE.Mesh[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.container = canvas;
    const width = canvas.width || 1000;
    const height = canvas.height || 560;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1128);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    this.camera.position.set(0, 1.35, 4.3);
    this.camera.lookAt(0, 1.15, 0);

    // 3. Renderer with soft shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.container,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting & Environment
    this.setupLighting();
    this.setupGymEnvironment();

    // 5. Build 3D Human
    this.humanRoot = new THREE.Group();
    this.headGroup = new THREE.Group();
    this.torsoGroup = new THREE.Group();
    this.leftShoulderGroup = new THREE.Group();
    this.rightShoulderGroup = new THREE.Group();
    this.leftElbowGroup = new THREE.Group();
    this.rightElbowGroup = new THREE.Group();
    this.leftHipGroup = new THREE.Group();
    this.rightHipGroup = new THREE.Group();
    this.leftKneeGroup = new THREE.Group();
    this.rightKneeGroup = new THREE.Group();
    this.leftAnkleGroup = new THREE.Group();
    this.rightAnkleGroup = new THREE.Group();

    this.build3DHumanModel();
    this.scene.add(this.humanRoot);
  }

  private facingMode: 'FRONT' | 'BACK' = 'FRONT';

  public setFacingMode(mode: 'FRONT' | 'BACK') {
    this.facingMode = mode;
    if (mode === 'BACK') {
      this.humanRoot.rotation.y = Math.PI;
    } else {
      this.humanRoot.rotation.y = 0;
    }
  }

  public getFacingMode(): 'FRONT' | 'BACK' {
    return this.facingMode;
  }

  public setCameraPosition(x: number, y: number, z: number, targetY = 1.15) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, targetY, 0);
    this.camera.updateProjectionMatrix();
  }

  private setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    // Key Light (Warm Clinic Lighting)
    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.4);
    keyLight.position.set(2.5, 4, 3.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.bias = -0.001;
    this.scene.add(keyLight);

    // Fill Light (Cool Cyan Studio Accent)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
    fillLight.position.set(-3, 2.5, 2);
    this.scene.add(fillLight);

    // Rim Light (Backlight for 3D depth)
    const rimLight = new THREE.DirectionalLight(0x818cf8, 0.8);
    rimLight.position.set(0, 3, -3);
    this.scene.add(rimLight);
  }

  private setupGymEnvironment() {
    // 1. Polished Hardwood Parquet Gym Floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x27170a, // Rich Oak Wood
      roughness: 0.25,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 2. Cyan Rehabilitation Mat
    const matGeo = new THREE.BoxGeometry(2.8, 0.02, 2.0);
    const matMaterial = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Medical Cyan
      roughness: 0.7,
      metalness: 0.1,
    });
    const rehabMat = new THREE.Mesh(matGeo, matMaterial);
    rehabMat.position.set(0, 0.01, 0);
    rehabMat.receiveShadow = true;
    this.scene.add(rehabMat);

    // 3. Modern Clinic Studio Wall
    const wallGeo = new THREE.PlaneGeometry(14, 8);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Slate Studio Wall
      roughness: 0.8,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 4, -4);
    wall.receiveShadow = true;
    this.scene.add(wall);
  }

  private build3DHumanModel() {
    // ── Material Palette (Realistic Human & High-Tech Clinic Physical Therapy) ──
    // Natural Lifelike Warm Melanin Skin
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xba7f4d, // Natural Warm Human Skin Tone
      roughness: 0.58,
      metalness: 0.02,
    });

    // Subtle skin highlight for joint accents
    const skinAccentMat = new THREE.MeshStandardMaterial({
      color: 0xa66d3e,
      roughness: 0.65,
    });

    // Athletic Clinical Compression Top (Deep Navy + Cyan Accent Piping)
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x0f2942, // Deep Performance Navy
      roughness: 0.45,
      metalness: 0.12,
    });

    const shirtAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Medical Sky Blue
      roughness: 0.35,
      metalness: 0.2,
    });

    // Athletic Compression Shorts (Charcoal Slate)
    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.55,
      metalness: 0.08,
    });

    // Athletic Rehabilitation Performance Trainers
    const shoeUpperMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
    });

    const shoeTrimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.3,
    });

    const shoeMidsoleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.25,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Natural Dark Brown/Black Hair
      roughness: 0.85,
    });

    // Detailed Eye & Facial Materials
    const scleraMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.2 }); // Warm Deep Hazel/Brown
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.05 });
    const corneaHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const browMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x9b4b47, roughness: 0.45 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

    const glowJointMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: false,
    });

    // ── Helper to create joint glowing sphere marker ──────────────────────
    const addJointMarker = (parent: THREE.Object3D, x: number, y: number, z: number) => {
      const geo = new THREE.SphereGeometry(0.038, 16, 16);
      const marker = new THREE.Mesh(geo, glowJointMat);
      marker.position.set(x, y, z);
      parent.add(marker);
      this.jointMarkers.push(marker);
      return marker;
    };

    // ── 1. PELVIS & TORSO ─────────────────────────────────────────────────
    this.humanRoot.position.set(0, 0, 0);

    // Anatomical Pelvis & Glutes (Athletic Compression Shorts)
    const pelvisGeo = new THREE.CylinderGeometry(0.19, 0.165, 0.22, 24);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, shortsMat);
    pelvisMesh.position.set(0, 1.05, 0);
    pelvisMesh.castShadow = true;
    this.humanRoot.add(pelvisMesh);

    // Gluteal definition
    const gluteGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const gluteL = new THREE.Mesh(gluteGeo, shortsMat);
    gluteL.position.set(-0.075, 1.04, -0.065);
    this.humanRoot.add(gluteL);

    const gluteR = new THREE.Mesh(gluteGeo, shortsMat);
    gluteR.position.set(0.075, 1.04, -0.065);
    this.humanRoot.add(gluteR);

    // Torso / Chest / Abdomen (Tapered athletic V-shape)
    this.torsoGroup.position.set(0, 1.15, 0);
    
    // Lower Abdomen / Waist
    const waistGeo = new THREE.CylinderGeometry(0.20, 0.175, 0.18, 24);
    const waistMesh = new THREE.Mesh(waistGeo, shirtMat);
    waistMesh.position.set(0, 0.09, 0);
    waistMesh.castShadow = true;
    this.torsoGroup.add(waistMesh);

    // Upper Ribcage & Pectorals
    const chestGeo = new THREE.CylinderGeometry(0.235, 0.20, 0.28, 24);
    const chestMesh = new THREE.Mesh(chestGeo, shirtMat);
    chestMesh.position.set(0, 0.28, 0);
    chestMesh.castShadow = true;
    this.torsoGroup.add(chestMesh);

    // Defined Pectoralis Major muscle plates
    const pecGeo = new THREE.BoxGeometry(0.12, 0.11, 0.05);
    const leftPec = new THREE.Mesh(pecGeo, shirtMat);
    leftPec.position.set(-0.075, 0.30, 0.155);
    leftPec.rotation.y = -0.12;
    this.torsoGroup.add(leftPec);

    const rightPec = new THREE.Mesh(pecGeo, shirtMat);
    rightPec.position.set(0.075, 0.30, 0.155);
    rightPec.rotation.y = 0.12;
    this.torsoGroup.add(rightPec);

    // Lateral Athletic Trim Stripes
    const lateralStripeGeo = new THREE.BoxGeometry(0.015, 0.38, 0.04);
    const latStripeL = new THREE.Mesh(lateralStripeGeo, shirtAccentMat);
    latStripeL.position.set(-0.215, 0.22, 0);
    this.torsoGroup.add(latStripeL);

    const latStripeR = new THREE.Mesh(lateralStripeGeo, shirtAccentMat);
    latStripeR.position.set(0.215, 0.22, 0);
    this.torsoGroup.add(latStripeR);

    this.humanRoot.add(this.torsoGroup);

    // ── 2. NECK & ANATOMICAL HEAD ─────────────────────────────────────────
    // Trapezius Slope & Neck
    const trapGeo = new THREE.CylinderGeometry(0.12, 0.22, 0.12, 24);
    const trapMesh = new THREE.Mesh(trapGeo, skinMat);
    trapMesh.position.set(0, 0.44, 0);
    trapMesh.castShadow = true;
    this.torsoGroup.add(trapMesh);

    const neckGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.12, 24);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.set(0, 0.52, 0);
    neckMesh.castShadow = true;
    this.torsoGroup.add(neckMesh);

    // Anatomical Sculpted Head (Cranium + Jaw + Chin)
    this.headGroup.position.set(0, 0.69, 0.01);

    // Cranium
    const headGeo = new THREE.SphereGeometry(0.125, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Jaw / Chin Sculpt
    const jawGeo = new THREE.ConeGeometry(0.09, 0.13, 24);
    const jawMesh = new THREE.Mesh(jawGeo, skinMat);
    jawMesh.position.set(0, -0.065, 0.02);
    jawMesh.rotation.x = Math.PI;
    this.headGroup.add(jawMesh);

    const chinGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const chinMesh = new THREE.Mesh(chinGeo, skinMat);
    chinMesh.position.set(0, -0.11, 0.045);
    this.headGroup.add(chinMesh);

    // Cheekbones
    const cheekGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const cheekL = new THREE.Mesh(cheekGeo, skinMat);
    cheekL.position.set(-0.07, -0.02, 0.075);
    this.headGroup.add(cheekL);

    const cheekR = new THREE.Mesh(cheekGeo, skinMat);
    cheekR.position.set(0.07, -0.02, 0.075);
    this.headGroup.add(cheekR);

    // Sculpted Athletic Fade Hair (Modern Textured Cut)
    const hairGeo = new THREE.SphereGeometry(0.132, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, 0.02, -0.01);
    this.headGroup.add(hairMesh);

    const hairTopGeo = new THREE.SphereGeometry(0.128, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.38);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.set(0, 0.045, 0.01);
    this.headGroup.add(hairTop);

    // Anatomical Ears with Concha / Helix
    const earGeo = new THREE.SphereGeometry(0.032, 16, 16);
    const earL = new THREE.Mesh(earGeo, skinAccentMat);
    earL.position.set(-0.128, -0.01, -0.005);
    earL.scale.set(0.45, 1.25, 0.7);
    this.headGroup.add(earL);

    const earR = new THREE.Mesh(earGeo, skinAccentMat);
    earR.position.set(0.128, -0.01, -0.005);
    earR.scale.set(0.45, 1.25, 0.7);
    this.headGroup.add(earR);

    // ── Detailed Eyes, Nose, Eyebrows & Lips ──────────────────────────────
    // Left Eye
    const eyeGeo = new THREE.SphereGeometry(0.019, 16, 16);
    const leftEyeSclera = new THREE.Mesh(eyeGeo, scleraMat);
    leftEyeSclera.position.set(-0.042, 0.008, 0.114);
    this.headGroup.add(leftEyeSclera);

    const irisGeo = new THREE.SphereGeometry(0.011, 16, 16);
    const leftIris = new THREE.Mesh(irisGeo, irisMat);
    leftIris.position.set(-0.042, 0.008, 0.128);
    this.headGroup.add(leftIris);

    const pupilGeo = new THREE.SphereGeometry(0.006, 16, 16);
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.042, 0.008, 0.136);
    this.headGroup.add(leftPupil);

    const sparkGeo = new THREE.SphereGeometry(0.0025, 8, 8);
    const leftSpark = new THREE.Mesh(sparkGeo, corneaHighlightMat);
    leftSpark.position.set(-0.039, 0.011, 0.138);
    this.headGroup.add(leftSpark);

    // Right Eye
    const rightEyeSclera = new THREE.Mesh(eyeGeo, scleraMat);
    rightEyeSclera.position.set(0.042, 0.008, 0.114);
    this.headGroup.add(rightEyeSclera);

    const rightIris = new THREE.Mesh(irisGeo, irisMat);
    rightIris.position.set(0.042, 0.008, 0.128);
    this.headGroup.add(rightIris);

    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.042, 0.008, 0.136);
    this.headGroup.add(rightPupil);

    const rightSpark = new THREE.Mesh(sparkGeo, corneaHighlightMat);
    rightSpark.position.set(0.045, 0.011, 0.138);
    this.headGroup.add(rightSpark);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.038, 0.007, 0.014);
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.042, 0.034, 0.122);
    leftBrow.rotation.z = 0.08;
    this.headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.042, 0.034, 0.122);
    rightBrow.rotation.z = -0.08;
    this.headGroup.add(rightBrow);

    // Nose (Bridge + Tip + Nostril Flares)
    const noseBridgeGeo = new THREE.BoxGeometry(0.018, 0.042, 0.024);
    const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMat);
    noseBridge.position.set(0, -0.008, 0.126);
    this.headGroup.add(noseBridge);

    const noseTipGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const noseTip = new THREE.Mesh(noseTipGeo, skinMat);
    noseTip.position.set(0, -0.028, 0.136);
    this.headGroup.add(noseTip);

    // Anatomical Lips
    const upperLipGeo = new THREE.BoxGeometry(0.038, 0.008, 0.012);
    const upperLip = new THREE.Mesh(upperLipGeo, lipMat);
    upperLip.position.set(0, -0.058, 0.118);
    this.headGroup.add(upperLip);

    const lowerLipGeo = new THREE.SphereGeometry(0.016, 16, 16);
    const lowerLip = new THREE.Mesh(lowerLipGeo, lipMat);
    lowerLip.position.set(0, -0.068, 0.116);
    lowerLip.scale.set(1.4, 0.6, 0.8);
    this.headGroup.add(lowerLip);

    // ── Chest Emblem (Physical Therapy Suite) ─────────────────────────────
    const crestRingGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.01, 24);
    const crestRing = new THREE.Mesh(crestRingGeo, shirtAccentMat);
    crestRing.rotation.x = Math.PI / 2;
    crestRing.position.set(-0.08, 0.32, 0.205);
    this.torsoGroup.add(crestRing);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.009, 0.012), whiteMat);
    crossH.position.set(-0.08, 0.32, 0.214);
    this.torsoGroup.add(crossH);

    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.034, 0.012), whiteMat);
    crossV.position.set(-0.08, 0.32, 0.214);
    this.torsoGroup.add(crossV);

    // ── Back Jersey Identification (-Z) ────────────────────────────────────
    const numMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2 });
    const digitOne = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.15, 0.012), numMat);
    digitOne.position.set(-0.045, 0.24, -0.212);
    this.torsoGroup.add(digitOne);

    const digitZeroL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.012), numMat);
    digitZeroL.position.set(0.022, 0.24, -0.212);
    this.torsoGroup.add(digitZeroL);

    const digitZeroR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.012), numMat);
    digitZeroR.position.set(0.065, 0.24, -0.212);
    this.torsoGroup.add(digitZeroR);

    const digitZeroTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.012), numMat);
    digitZeroTop.position.set(0.043, 0.305, -0.212);
    this.torsoGroup.add(digitZeroTop);

    const digitZeroBot = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, 0.012), numMat);
    digitZeroBot.position.set(0.043, 0.175, -0.212);
    this.torsoGroup.add(digitZeroBot);

    this.torsoGroup.add(this.headGroup);

    // ── 3. LEFT UPPER LIMB (Deltoid -> Bicep -> Elbow -> Forearm -> Hand) ─
    this.leftShoulderGroup.position.set(-0.25, 0.38, 0);
    addJointMarker(this.leftShoulderGroup, 0, 0, 0);

    // Rounded Deltoid Cap
    const deltoidGeo = new THREE.SphereGeometry(0.08, 20, 20);
    const leftDeltoid = new THREE.Mesh(deltoidGeo, shirtMat);
    leftDeltoid.position.set(0, 0, 0);
    leftDeltoid.scale.set(1.1, 1.25, 1.0);
    leftDeltoid.castShadow = true;
    this.leftShoulderGroup.add(leftDeltoid);

    // Upper Arm Bicep / Tricep
    const upperArmGeo = new THREE.CylinderGeometry(0.062, 0.052, 0.30, 20);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
    leftUpperArm.position.set(0, -0.16, 0);
    leftUpperArm.castShadow = true;
    this.leftShoulderGroup.add(leftUpperArm);

    // Left Elbow Joint
    this.leftElbowGroup.position.set(0, -0.31, 0);
    addJointMarker(this.leftElbowGroup, 0, 0, 0);

    const elbowJointGeo = new THREE.SphereGeometry(0.048, 16, 16);
    const leftElbowJoint = new THREE.Mesh(elbowJointGeo, skinAccentMat);
    leftElbowJoint.position.set(0, 0, 0);
    this.leftElbowGroup.add(leftElbowJoint);

    // Left Forearm (Brachioradialis Taper)
    const forearmGeo = new THREE.CylinderGeometry(0.050, 0.038, 0.28, 20);
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.position.set(0, -0.15, 0);
    leftForearm.castShadow = true;
    this.leftElbowGroup.add(leftForearm);

    // Anatomical Hand (Palm + Thumb + Natural Relaxed Fingers)
    const handGroupL = new THREE.Group();
    handGroupL.position.set(0, -0.30, 0);

    const palmGeo = new THREE.BoxGeometry(0.068, 0.082, 0.026);
    const leftPalm = new THREE.Mesh(palmGeo, skinMat);
    leftPalm.position.set(0, -0.04, 0);
    leftPalm.castShadow = true;
    handGroupL.add(leftPalm);

    const thumbGeo = new THREE.CylinderGeometry(0.012, 0.010, 0.045, 12);
    const leftThumb = new THREE.Mesh(thumbGeo, skinMat);
    leftThumb.position.set(0.034, -0.03, 0.015);
    leftThumb.rotation.z = -0.4;
    leftThumb.rotation.y = 0.3;
    handGroupL.add(leftThumb);

    const fingerGeo = new THREE.BoxGeometry(0.058, 0.04, 0.022);
    const leftFingers = new THREE.Mesh(fingerGeo, skinMat);
    leftFingers.position.set(0, -0.095, 0.005);
    handGroupL.add(leftFingers);

    this.leftElbowGroup.add(handGroupL);
    this.leftShoulderGroup.add(this.leftElbowGroup);
    this.torsoGroup.add(this.leftShoulderGroup);

    // ── 4. RIGHT UPPER LIMB ───────────────────────────────────────────────
    this.rightShoulderGroup.position.set(0.25, 0.38, 0);
    addJointMarker(this.rightShoulderGroup, 0, 0, 0);

    const rightDeltoid = new THREE.Mesh(deltoidGeo, shirtMat);
    rightDeltoid.position.set(0, 0, 0);
    rightDeltoid.scale.set(1.1, 1.25, 1.0);
    rightDeltoid.castShadow = true;
    this.rightShoulderGroup.add(rightDeltoid);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, skinMat);
    rightUpperArm.position.set(0, -0.16, 0);
    rightUpperArm.castShadow = true;
    this.rightShoulderGroup.add(rightUpperArm);

    // Right Elbow Joint
    this.rightElbowGroup.position.set(0, -0.31, 0);
    addJointMarker(this.rightElbowGroup, 0, 0, 0);

    const rightElbowJoint = new THREE.Mesh(elbowJointGeo, skinAccentMat);
    rightElbowJoint.position.set(0, 0, 0);
    this.rightElbowGroup.add(rightElbowJoint);

    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.position.set(0, -0.15, 0);
    rightForearm.castShadow = true;
    this.rightElbowGroup.add(rightForearm);

    // Right Hand
    const handGroupR = new THREE.Group();
    handGroupR.position.set(0, -0.30, 0);

    const rightPalm = new THREE.Mesh(palmGeo, skinMat);
    rightPalm.position.set(0, -0.04, 0);
    rightPalm.castShadow = true;
    handGroupR.add(rightPalm);

    const rightThumb = new THREE.Mesh(thumbGeo, skinMat);
    rightThumb.position.set(-0.034, -0.03, 0.015);
    rightThumb.rotation.z = 0.4;
    rightThumb.rotation.y = -0.3;
    handGroupR.add(rightThumb);

    const rightFingers = new THREE.Mesh(fingerGeo, skinMat);
    rightFingers.position.set(0, -0.095, 0.005);
    handGroupR.add(rightFingers);

    this.rightElbowGroup.add(handGroupR);
    this.rightShoulderGroup.add(this.rightElbowGroup);
    this.torsoGroup.add(this.rightShoulderGroup);

    // ── 5. LEFT LOWER LIMB (Thigh -> Knee -> Calf -> Athletic Trainer) ────
    this.leftHipGroup.position.set(-0.12, 0.98, 0);
    addJointMarker(this.leftHipGroup, 0, 0, 0);

    // Left Thigh (Quadriceps Femoris)
    const thighGeo = new THREE.CylinderGeometry(0.092, 0.075, 0.42, 20);
    const leftThigh = new THREE.Mesh(thighGeo, shortsMat);
    leftThigh.position.set(0, -0.22, 0);
    leftThigh.castShadow = true;
    this.leftHipGroup.add(leftThigh);

    // Left Knee & Patella
    this.leftKneeGroup.position.set(0, -0.44, 0);
    addJointMarker(this.leftKneeGroup, 0, 0, 0);

    const patellaGeo = new THREE.SphereGeometry(0.052, 16, 16);
    const leftPatella = new THREE.Mesh(patellaGeo, skinAccentMat);
    leftPatella.position.set(0, 0, 0.03);
    this.leftKneeGroup.add(leftPatella);

    // Left Calf (Gastrocnemius Muscle Belly)
    const calfGeo = new THREE.CylinderGeometry(0.072, 0.046, 0.40, 20);
    const leftCalf = new THREE.Mesh(calfGeo, skinMat);
    leftCalf.position.set(0, -0.21, 0);
    leftCalf.castShadow = true;
    this.leftKneeGroup.add(leftCalf);

    // Left Ankle & Athletic Performance Trainer
    this.leftAnkleGroup.position.set(0, -0.42, 0);
    addJointMarker(this.leftAnkleGroup, 0, 0, 0);

    // Athletic Shoe Body
    const shoeBodyGeo = new THREE.BoxGeometry(0.105, 0.08, 0.23);
    const leftShoe = new THREE.Mesh(shoeBodyGeo, shoeUpperMat);
    leftShoe.position.set(0, -0.02, 0.04);
    leftShoe.castShadow = true;
    this.leftAnkleGroup.add(leftShoe);

    // Toe Spring Curvature
    const toeGeo = new THREE.CylinderGeometry(0.05, 0.052, 0.098, 16);
    const leftToe = new THREE.Mesh(toeGeo, shoeUpperMat);
    leftToe.rotation.z = Math.PI / 2;
    leftToe.position.set(0, -0.02, 0.135);
    this.leftAnkleGroup.add(leftToe);

    // Cyan Trim Accent
    const shoeTrimGeo = new THREE.BoxGeometry(0.108, 0.018, 0.16);
    const leftTrim = new THREE.Mesh(shoeTrimGeo, shoeTrimMat);
    leftTrim.position.set(0, 0.01, 0.03);
    this.leftAnkleGroup.add(leftTrim);

    // Cushioned White Midsole & Grip Tread
    const soleGeo = new THREE.BoxGeometry(0.116, 0.036, 0.255);
    const leftSole = new THREE.Mesh(soleGeo, shoeMidsoleMat);
    leftSole.position.set(0, -0.065, 0.045);
    this.leftAnkleGroup.add(leftSole);

    this.leftKneeGroup.add(this.leftAnkleGroup);
    this.leftHipGroup.add(this.leftKneeGroup);
    this.humanRoot.add(this.leftHipGroup);

    // ── 6. RIGHT LOWER LIMB ───────────────────────────────────────────────
    this.rightHipGroup.position.set(0.12, 0.98, 0);
    addJointMarker(this.rightHipGroup, 0, 0, 0);

    const rightThigh = new THREE.Mesh(thighGeo, shortsMat);
    rightThigh.position.set(0, -0.22, 0);
    rightThigh.castShadow = true;
    this.rightHipGroup.add(rightThigh);

    // Right Knee & Patella
    this.rightKneeGroup.position.set(0, -0.44, 0);
    addJointMarker(this.rightKneeGroup, 0, 0, 0);

    const rightPatella = new THREE.Mesh(patellaGeo, skinAccentMat);
    rightPatella.position.set(0, 0, 0.03);
    this.rightKneeGroup.add(rightPatella);

    const rightCalf = new THREE.Mesh(calfGeo, skinMat);
    rightCalf.position.set(0, -0.21, 0);
    rightCalf.castShadow = true;
    this.rightKneeGroup.add(rightCalf);

    // Right Ankle & Athletic Performance Trainer
    this.rightAnkleGroup.position.set(0, -0.42, 0);
    addJointMarker(this.rightAnkleGroup, 0, 0, 0);

    const rightShoe = new THREE.Mesh(shoeBodyGeo, shoeUpperMat);
    rightShoe.position.set(0, -0.02, 0.04);
    rightShoe.castShadow = true;
    this.rightAnkleGroup.add(rightShoe);

    const rightToe = new THREE.Mesh(toeGeo, shoeUpperMat);
    rightToe.rotation.z = Math.PI / 2;
    rightToe.position.set(0, -0.02, 0.135);
    this.rightAnkleGroup.add(rightToe);

    const rightTrim = new THREE.Mesh(shoeTrimGeo, shoeTrimMat);
    rightTrim.position.set(0, 0.01, 0.03);
    this.rightAnkleGroup.add(rightTrim);

    const rightSole = new THREE.Mesh(soleGeo, shoeMidsoleMat);
    rightSole.position.set(0, -0.065, 0.045);
    this.rightAnkleGroup.add(rightSole);

    this.rightKneeGroup.add(this.rightAnkleGroup);
    this.rightHipGroup.add(this.rightKneeGroup);
    this.humanRoot.add(this.rightHipGroup);
  }

  // ── Apply 100% Anatomical Joint Synchronization from Exercise Simulator ──
  public updateFromSim(sim: SimJointData, _w: number, _h: number, exerciseName?: string) {
    if (!sim || !sim.lSh || !sim.rSh) return;

    const isBack = this.facingMode === 'BACK';
    const targetLeftSh = isBack ? this.rightShoulderGroup : this.leftShoulderGroup;
    const targetRightSh = isBack ? this.leftShoulderGroup : this.rightShoulderGroup;
    const targetLeftEl = isBack ? this.rightElbowGroup : this.leftElbowGroup;
    const targetRightEl = isBack ? this.leftElbowGroup : this.rightElbowGroup;
    const targetLeftHip = isBack ? this.rightHipGroup : this.leftHipGroup;
    const targetRightHip = isBack ? this.leftHipGroup : this.rightHipGroup;
    const targetLeftKnee = isBack ? this.rightKneeGroup : this.leftKneeGroup;
    const targetRightKnee = isBack ? this.leftKneeGroup : this.rightKneeGroup;
    const targetLeftAnkle = isBack ? this.rightAnkleGroup : this.leftAnkleGroup;
    const targetRightAnkle = isBack ? this.leftAnkleGroup : this.rightAnkleGroup;

    // 1. Torso lean & rotation from simulated shoulders and hips
    const midShX = (sim.lSh.x + sim.rSh.x) / 2;
    const midShY = (sim.lSh.y + sim.rSh.y) / 2;
    const midHipX = (sim.lHip.x + sim.rHip.x) / 2;
    const midHipY = (sim.lHip.y + sim.rHip.y) / 2;

    const dxTorso = midShX - midHipX;
    const dyTorso = midHipY - midShY;
    const rawTorsoZ = Math.atan2(dxTorso, Math.max(1, dyTorso));
    const torsoAngleZ = Math.max(-0.45, Math.min(0.45, isBack ? -rawTorsoZ : rawTorsoZ));
    this.torsoGroup.rotation.z = torsoAngleZ;

    // 1b. Head & Cervical Spine 3D Kinematics (Multi-Planar Neck Mobility, Lateral Flexion & Rotation)
    const isCervical = (exerciseName && (exerciseName.includes('Cervical') || exerciseName.includes('Neck') || exerciseName.includes('Chin Tuck') || exerciseName.includes('Spine ROM'))) ||
      (sim.status && (sim.status.includes('CERVICAL') || sim.status.includes('NECK') || sim.status.includes('STRETCH') || sim.status.includes('ARC')));

    if (isCervical) {
      // Direct high-fidelity anatomical cervical motion:
      // Lateral Flexion (Ear to Shoulder):
      const tiltAngleDeg = sim.cTilt !== undefined
        ? sim.cTilt
        : (sim.rA ? (sim.status?.includes('LEFT') ? -sim.rA : sim.rA) : 0);

      // Axial Cervical Rotation (Looking over shoulder):
      const rotAngleDeg = sim.cRot !== undefined
        ? sim.cRot
        : (sim.lA ? (sim.status?.includes('LEFT') ? -sim.lA : sim.lA) : 0);

      const radTiltZ = (tiltAngleDeg / 180) * Math.PI * 0.95;
      const radRotY = (rotAngleDeg / 180) * Math.PI * 0.95;
      const radFlexX = 0.08; // Physiological chin-tuck neutral alignment

      this.headGroup.rotation.z = isBack ? -radTiltZ : radTiltZ;
      this.headGroup.rotation.y = isBack ? -radRotY : radRotY;
      this.headGroup.rotation.x = radFlexX;
    } else {
      // Natural subtle head gaze stabilization during body movements
      this.headGroup.rotation.z = -torsoAngleZ * 0.45;
      this.headGroup.rotation.y = 0;
      this.headGroup.rotation.x = 0;
    }

    // 2. Upper Limbs Animation
    const isElbowFlexion = (exerciseName && (exerciseName.includes('Elbow') || exerciseName.includes('Bicep'))) ||
      (sim.status && (sim.status.includes('ELBOW') || sim.status.includes('FLEXION')));

    const isLymphoedema = (exerciseName && (exerciseName.includes('Lymphoedema') || exerciseName.includes('Drainage'))) ||
      (sim.status && (sim.status.includes('PUMP') || sim.status.includes('COMPRESSION') || sim.status.includes('DRAINAGE')));

    const isShoulderForwardFlexion = exerciseName && (exerciseName.includes('Forward Flexion') || exerciseName.includes('Anterior Reach'));

    const isShoulderAbduction = exerciseName && (exerciseName.includes('Shoulder Abduction') || exerciseName.includes('Coronal Elevation'));

    const isPostMastectomy = exerciseName && (exerciseName.includes('Mastectomy') || exerciseName.includes('Axillary Web'));

    const isAntenatal = exerciseName && (exerciseName.includes('Antenatal') || exerciseName.includes('Prenatal') || exerciseName.includes('Pelvic Rocking'));

    if (isCervical) {
      // Relaxed, anchored shoulder posture during cervical mobility
      targetLeftSh.rotation.x = 0;
      targetLeftSh.rotation.z = isBack ? 0.06 : -0.06;
      targetLeftEl.rotation.x = -0.12;
      targetLeftEl.rotation.z = 0;

      targetRightSh.rotation.x = 0;
      targetRightSh.rotation.z = isBack ? -0.06 : 0.06;
      targetRightEl.rotation.x = -0.12;
      targetRightEl.rotation.z = 0;
    } else if (isLymphoedema) {
      // Lymphoedema Manual Drainage & Active Pump: Affected limb elevated above heart level in the anterior scapular plane
      const elevDeg = Math.min(105, Math.max(30, sim.rA ?? 80));
      const elevRad = (elevDeg / 180) * Math.PI;

      // Elevated Left Arm: Raised up into the air, tilted slightly forward in front of the body (scapular plane)
      targetLeftSh.rotation.z = isBack ? elevRad * 0.95 : -elevRad * 0.95;
      targetLeftSh.rotation.x = -0.28; // Forward scaption angle ensures arm is in FRONT, never behind head or neck
      targetLeftEl.rotation.x = -0.35; // Gentle upright elevation flex for muscle pumping
      targetLeftEl.rotation.z = 0;

      // Inactive Right Arm: Straight and resting naturally at side
      targetRightSh.rotation.x = 0;
      targetRightSh.rotation.z = isBack ? -0.06 : 0.06;
      targetRightEl.rotation.x = 0;
      targetRightEl.rotation.z = 0;
    } else if (isPostMastectomy) {
      // Post-Mastectomy Shoulder Mobility: Gradual active-assisted abduction up to 140°
      const lElevRad = (((sim.lA ?? 30)) / 180) * Math.PI;
      const rElevRad = (((sim.rA ?? 30)) / 180) * Math.PI;

      // Operated arm elevates outward and upward in the scapular plane, strictly in front of body
      targetLeftSh.rotation.z = isBack ? lElevRad * 0.95 : -lElevRad * 0.95;
      targetLeftSh.rotation.x = -0.16; // Subtle anterior scaption angle keeps arm in FRONT
      targetLeftEl.rotation.x = 0;
      targetLeftEl.rotation.z = 0;

      // Contralateral active assisted support
      targetRightSh.rotation.z = isBack ? -rElevRad * 0.35 : rElevRad * 0.35;
      targetRightSh.rotation.x = 0;
      targetRightEl.rotation.x = 0;
      targetRightEl.rotation.z = 0;
    } else if (isShoulderForwardFlexion) {
      // Shoulder Forward Flexion (Sagittal anterior reach 0°–180°)
      const lFlexRad = ((sim.lA ?? 0) / 180) * Math.PI;
      const rFlexRad = ((sim.rA ?? 0) / 180) * Math.PI;

      targetLeftSh.rotation.x = -lFlexRad * 0.95;
      targetLeftSh.rotation.z = isBack ? 0.05 : -0.05;
      targetRightSh.rotation.x = -rFlexRad * 0.95;
      targetRightSh.rotation.z = isBack ? -0.05 : 0.05;
      targetLeftEl.rotation.x = 0;
      targetLeftEl.rotation.z = 0;
      targetRightEl.rotation.x = 0;
      targetRightEl.rotation.z = 0;
    } else if (isShoulderAbduction) {
      // Shoulder Abduction & Coronal Elevation (0°–180° Range): Raising both arms outward, keeping elbows straight
      const lAbductRad = (((sim.lA ?? 30)) / 180) * Math.PI;
      const rAbductRad = (((sim.rA ?? 30)) / 180) * Math.PI;

      // Left arm raises outward in coronal plane, strictly keeping elbows straight and arms in front
      targetLeftSh.rotation.z = isBack ? lAbductRad * 0.95 : -lAbductRad * 0.95;
      targetLeftSh.rotation.x = -0.12; // Slight anterior scaption angle keeps arms in FRONT, never behind head
      targetLeftEl.rotation.x = 0; // Elbows strictly straight
      targetLeftEl.rotation.z = 0;

      // Right arm raises outward in coronal plane
      targetRightSh.rotation.z = isBack ? -rAbductRad * 0.95 : rAbductRad * 0.95;
      targetRightSh.rotation.x = -0.12;
      targetRightEl.rotation.x = 0;
      targetRightEl.rotation.z = 0;
    } else if (isElbowFlexion) {
      const lFlexDeg = Math.min(145, Math.max(0, sim.lA ?? 0));
      const rFlexDeg = Math.min(145, Math.max(0, sim.rA ?? 0));
      const isLeftArmActive = (sim.lA !== undefined && sim.lA > 15) || (!sim.rA || (sim.lA ?? 0) >= (sim.rA ?? 0));

      if (isLeftArmActive) {
        const lFlexRad = (lFlexDeg / 180) * Math.PI;
        // Upper arm anchored comfortably at side with slight anterior angle
        targetLeftSh.rotation.x = -0.14;
        targetLeftSh.rotation.z = isBack ? 0.08 : -0.08;
        // Forearm flexes strictly FORWARD into the sagittal plane towards the front chest/shoulder
        targetLeftEl.rotation.x = -lFlexRad * 0.95;
        targetLeftEl.rotation.z = 0;

        // Inactive arm rests naturally straight
        targetRightSh.rotation.x = 0;
        targetRightSh.rotation.z = isBack ? -0.06 : 0.06;
        targetRightEl.rotation.x = 0;
        targetRightEl.rotation.z = 0;
      } else {
        const rFlexRad = (rFlexDeg / 180) * Math.PI;
        targetRightSh.rotation.x = -0.14;
        targetRightSh.rotation.z = isBack ? -0.08 : 0.08;
        targetRightEl.rotation.x = -rFlexRad * 0.95;
        targetRightEl.rotation.z = 0;

        targetLeftSh.rotation.x = 0;
        targetLeftSh.rotation.z = isBack ? 0.06 : -0.06;
        targetLeftEl.rotation.x = 0;
        targetLeftEl.rotation.z = 0;
      }
    } else if (isAntenatal) {
      // Antenatal Safe Exercise: Bilateral chest opening & shoulder rolls (0°–90°)
      const openAngle = 0.22 + (((sim.rA ?? 45)) / 180) * Math.PI * 0.45; // ~15° to ~45° open
      targetLeftSh.rotation.z = isBack ? openAngle : -openAngle;
      targetLeftSh.rotation.x = -0.16; // Gentle anterior scaption keeps arms strictly in FRONT
      targetLeftEl.rotation.x = -0.28; // Soft relaxed elbows
      targetLeftEl.rotation.z = 0;

      targetRightSh.rotation.z = isBack ? -openAngle : openAngle;
      targetRightSh.rotation.x = -0.16;
      targetRightEl.rotation.x = -0.28;
      targetRightEl.rotation.z = 0;
    } else {
      // 2. Left Upper Arm (Shoulder -> Elbow direction)
      const lDxArm = sim.lEl.x - sim.lSh.x;
      const lDyArm = sim.lEl.y - sim.lSh.y; // positive downward
      const lArmAngleWorld = Math.atan2(-lDxArm, lDyArm);
      targetLeftSh.rotation.z = (isBack ? -lArmAngleWorld : lArmAngleWorld) - torsoAngleZ;
      targetLeftSh.rotation.x = 0;

      // 3. Left Forearm (Elbow -> Wrist direction)
      const lDxFore = sim.lWr.x - sim.lEl.x;
      const lDyFore = sim.lWr.y - sim.lEl.y;
      const lForeAngleWorld = Math.atan2(-lDxFore, lDyFore);
      targetLeftEl.rotation.z = isBack ? -(lForeAngleWorld - lArmAngleWorld) : (lForeAngleWorld - lArmAngleWorld);
      targetLeftEl.rotation.x = 0;

      // 4. Right Upper Arm (Shoulder -> Elbow direction)
      const rDxArm = sim.rEl.x - sim.rSh.x;
      const rDyArm = sim.rEl.y - sim.rSh.y;
      const rArmAngleWorld = Math.atan2(-rDxArm, rDyArm);
      targetRightSh.rotation.z = (isBack ? -rArmAngleWorld : rArmAngleWorld) - torsoAngleZ;
      targetRightSh.rotation.x = 0;

      // 5. Right Forearm (Elbow -> Wrist direction)
      const rDxFore = sim.rWr.x - sim.rEl.x;
      const rDyFore = sim.rWr.y - sim.rEl.y;
      const rForeAngleWorld = Math.atan2(-rDxFore, rDyFore);
      targetRightEl.rotation.z = isBack ? -(rForeAngleWorld - rArmAngleWorld) : (rForeAngleWorld - rArmAngleWorld);
      targetRightEl.rotation.x = 0;
    }

    // 6 & 7. Lower Limbs (Hip -> Thigh -> Knee -> Calf -> Foot)
    const isMarching = (exerciseName && (exerciseName.includes('March') || exerciseName.includes('High-Knee') || exerciseName.includes('Gait'))) ||
      (sim.status && sim.status.includes('MARCH'));

    if (isMarching) {
      const isRightLift = (sim.status && sim.status.includes('RIGHT')) || ((sim.rA || 0) > (sim.lA || 0) && (sim.rA || 0) > 15);
      if (isRightLift) {
        const rDeg = Math.min(85, sim.rA || 0);
        const rLiftRad = (rDeg / 180) * Math.PI;

        // Active right thigh drives FORWARD (negative rotation.x lifts leg anteriorly towards camera)
        targetRightHip.rotation.x = -rLiftRad * 0.95;
        targetRightHip.rotation.z = 0;
        // Right knee flexes naturally so shin hangs downward
        targetRightKnee.rotation.x = rLiftRad * 0.95;
        targetRightKnee.rotation.z = 0;

        // Ground support left leg stays straight
        targetLeftHip.rotation.x = 0;
        targetLeftHip.rotation.z = 0;
        targetLeftKnee.rotation.x = 0;
        targetLeftKnee.rotation.z = 0;

        // Reciprocal Arm Swing: Left arm swings forward, Right arm back
        targetLeftSh.rotation.x = -rLiftRad * 0.65;
        targetLeftSh.rotation.z = isBack ? 0.12 : -0.12;
        targetLeftEl.rotation.z = isBack ? Math.PI * 0.35 : -Math.PI * 0.35;

        targetRightSh.rotation.x = rLiftRad * 0.35;
        targetRightSh.rotation.z = isBack ? -0.12 : 0.12;
        targetRightEl.rotation.z = isBack ? -Math.PI * 0.25 : Math.PI * 0.25;
      } else {
        const lDeg = Math.min(85, sim.lA || 0);
        const lLiftRad = (lDeg / 180) * Math.PI;

        // Active left thigh drives FORWARD
        targetLeftHip.rotation.x = -lLiftRad * 0.95;
        targetLeftHip.rotation.z = 0;
        targetLeftKnee.rotation.x = lLiftRad * 0.95;
        targetLeftKnee.rotation.z = 0;

        // Ground support right leg stays straight
        targetRightHip.rotation.x = 0;
        targetRightHip.rotation.z = 0;
        targetRightKnee.rotation.x = 0;
        targetRightKnee.rotation.z = 0;

        // Reciprocal Arm Swing: Right arm swings forward, Left arm back
        targetRightSh.rotation.x = -lLiftRad * 0.65;
        targetRightSh.rotation.z = isBack ? -0.12 : 0.12;
        targetRightEl.rotation.z = isBack ? -Math.PI * 0.35 : Math.PI * 0.35;

        targetLeftSh.rotation.x = lLiftRad * 0.35;
        targetLeftSh.rotation.z = isBack ? 0.12 : -0.12;
        targetLeftEl.rotation.z = isBack ? Math.PI * 0.25 : -Math.PI * 0.25;
      }
      targetLeftAnkle.rotation.x = 0;
      targetRightAnkle.rotation.x = 0;
    } else if (isAntenatal) {
      // Wide, stable stance for pregnancy balance (Step 1)
      targetLeftHip.rotation.z = isBack ? 0.14 : -0.14;
      targetRightHip.rotation.z = isBack ? -0.14 : 0.14;
      targetLeftKnee.rotation.z = 0;
      targetRightKnee.rotation.z = 0;
      targetLeftAnkle.rotation.x = 0;
      targetRightAnkle.rotation.x = 0;
    } else {
      const lDxThigh = sim.lKnee.x - sim.lHip.x;
      const lDyThigh = sim.lKnee.y - sim.lHip.y;
      const lThighAngleWorld = Math.atan2(-lDxThigh, Math.max(1, lDyThigh));
      targetLeftHip.rotation.z = isBack ? -lThighAngleWorld : lThighAngleWorld;

      const lDxCalf = sim.lAnkle.x - sim.lKnee.x;
      const lDyCalf = sim.lAnkle.y - sim.lKnee.y;
      const lCalfAngleWorld = Math.atan2(-lDxCalf, Math.max(1, lDyCalf));
      targetLeftKnee.rotation.z = isBack ? -(lCalfAngleWorld - lThighAngleWorld) : (lCalfAngleWorld - lThighAngleWorld);

      const rDxThigh = sim.rKnee.x - sim.rHip.x;
      const rDyThigh = sim.rKnee.y - sim.rHip.y;
      const rThighAngleWorld = Math.atan2(-rDxThigh, Math.max(1, rDyThigh));
      targetRightHip.rotation.z = isBack ? -rThighAngleWorld : rThighAngleWorld;

      const rDxCalf = sim.rAnkle.x - sim.rKnee.x;
      const rDyCalf = sim.rAnkle.y - sim.rKnee.y;
      const rCalfAngleWorld = Math.atan2(-rDxCalf, Math.max(1, rDyCalf));
      targetRightKnee.rotation.z = isBack ? -(rCalfAngleWorld - rThighAngleWorld) : (rCalfAngleWorld - rThighAngleWorld);
    }

    // 8. Squat / Calf Raise / Vertical Base Elevation shift
    this.humanRoot.position.x = 0;
    this.humanRoot.position.z = 0;
    if (this.facingMode === 'BACK') {
      this.humanRoot.rotation.y = Math.PI;
    } else {
      this.humanRoot.rotation.y = 0;
    }

    const baseHipYRatio = 0.52;
    const currentHipYRatio = (midHipY) / _h;

    const isCalfRaise = (exerciseName && (exerciseName.includes('Calf') || exerciseName.includes('Plantarflexion'))) ||
      (sim.status && (sim.status.includes('TOES') || sim.status.includes('PLANTAR'))) ||
      (currentHipYRatio < baseHipYRatio - 0.015 && (((sim.lA ?? 0) > 8) || ((sim.rA ?? 0) > 8)));

    if (currentHipYRatio > baseHipYRatio + 0.03) {
      // SQUAT (dropping down)
      const drop = Math.min(0.25, currentHipYRatio - baseHipYRatio);
      this.humanRoot.position.y = -drop * 2.0;
      targetLeftHip.rotation.x = -drop * 2.0;
      targetRightHip.rotation.x = -drop * 2.0;
      targetLeftKnee.rotation.x = drop * 2.2;
      targetRightKnee.rotation.x = drop * 2.2;
      this.torsoGroup.rotation.x = drop * 0.5;
      targetLeftSh.rotation.x = -drop * 1.5;
      targetRightSh.rotation.x = -drop * 1.5;
      targetLeftAnkle.rotation.x = 0;
      targetRightAnkle.rotation.x = 0;
    } else if (isCalfRaise) {
      // STANDING CALF RAISE (Rise onto toes / plantarflexion)
      const lPlantDeg = Math.max(0, Math.min(45, sim.lA || 0));
      const rPlantDeg = Math.max(0, Math.min(45, sim.rA || 0));
      const maxPlantDeg = Math.max(lPlantDeg, rPlantDeg);

      const lPlantRad = (lPlantDeg / 180) * Math.PI;
      const rPlantRad = (rPlantDeg / 180) * Math.PI;

      // Ankle joint tilts the foot: heel lifts UP (-z in local space rotates +y, so rotation.x < 0)
      targetLeftAnkle.rotation.x = -lPlantRad * 0.95;
      targetRightAnkle.rotation.x = -rPlantRad * 0.95;

      // Whole body rises vertically onto the balls of the feet
      const bodyRise = Math.sin((maxPlantDeg / 180) * Math.PI) * 0.20;
      this.humanRoot.position.y = bodyRise;

      // Terminal knee extension & clinical plumb line stabilization
      targetLeftHip.rotation.x = 0;
      targetRightHip.rotation.x = 0;
      targetLeftKnee.rotation.x = 0;
      targetRightKnee.rotation.x = 0;
      this.torsoGroup.rotation.x = 0;

      // Subtle dynamic arm balance stabilization
      const balanceAngle = (maxPlantDeg / 40) * 0.12;
      targetLeftSh.rotation.z = isBack ? balanceAngle : -balanceAngle;
      targetRightSh.rotation.z = isBack ? -balanceAngle : balanceAngle;
    } else if (isAntenatal) {
      this.humanRoot.position.y = 0;
      // Pelvic Rocking ±15° & Lumbar Mobility (Step 2)
      const tiltDeg = (sim.status && sim.status.includes('POSTERIOR')) ? -(sim.lA ?? 10) : (sim.lA ?? 10);
      const tiltRad = (tiltDeg / 180) * Math.PI;
      this.torsoGroup.rotation.x = tiltRad * 0.55;
      targetLeftHip.rotation.x = -tiltRad * 0.4;
      targetRightHip.rotation.x = -tiltRad * 0.4;
      targetLeftKnee.rotation.x = 0;
      targetRightKnee.rotation.x = 0;
      targetLeftAnkle.rotation.x = 0;
      targetRightAnkle.rotation.x = 0;
    } else {
      this.humanRoot.position.y = 0;
      if (!isMarching && !isAntenatal) {
        targetLeftHip.rotation.x = 0;
        targetRightHip.rotation.x = 0;
        targetLeftKnee.rotation.x = 0;
        targetRightKnee.rotation.x = 0;
        targetLeftSh.rotation.x = 0;
        targetRightSh.rotation.x = 0;
      }
      this.torsoGroup.rotation.x = 0;
      targetLeftAnkle.rotation.x = 0;
      targetRightAnkle.rotation.x = 0;
    }

    // Render 3D Frame
    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    this.renderer.dispose();
  }
}
