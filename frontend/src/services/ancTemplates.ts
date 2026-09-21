export interface AncField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'checkbox-group' | 'date';
  section?: 'general' | 'pmh' | 'risk_factors' | 'present_pregnancy' | 'previous_pregnancy';
  options?: string[];
  defaultValue?: any;
}

export interface AncTemplate {
  id: string;
  name: string;
  description: string;
  profileFields: AncField[];
  pregnancyFields: AncField[];
}

export const ANC_TEMPLATES: AncTemplate[] = [
  {
    id: 'anc_faith_foundation_replica',
    name: 'Faith Foundation Replica Template',
    description: 'Exact replica of the Faith Foundation Mission Hospital Nsukka Antenal Card',
    profileFields: [
      { name: 'husbandName', label: 'Husband Name', type: 'text', section: 'general' },
      { name: 'husbandOccupation', label: 'Husband Occupation', type: 'text', section: 'general' },
      { name: 'husbandPhone', label: 'Husband Phone', type: 'text', section: 'general' },
      { name: 'husbandOfficeAddress', label: 'Husband Office Address', type: 'text', section: 'general' },
      { name: 'occupation', label: 'Patient Occupation', type: 'text', section: 'general' },
      { name: 'speakingEnglish', label: 'Speaking English', type: 'select', options: ['Yes', 'No'], section: 'general' },
      { name: 'tribe', label: 'Tribe', type: 'select', options: ['Igbo', 'Hausa', 'Yoruba', 'Others'], section: 'general' },
      { name: 'religion', label: 'Religion', type: 'select', options: ['Anglican', 'Others', 'Pagan'], section: 'general' },
      { name: 'fsh', label: 'FSH', type: 'text', section: 'general' },
      { name: 'yearOfMarriage', label: 'Year of Marriage', type: 'number', section: 'general' },
      { name: 'educationLevel', label: 'Level of Education', type: 'select', options: ['Primary', 'Secondary', 'Tertiary'], section: 'general' },
      { name: 'operations', label: 'Operations', type: 'text', section: 'general' },

      // PMH Section
      { name: 'heartDisease', label: 'Heart Disease', type: 'boolean', section: 'pmh' },
      { name: 'chestDisease', label: 'Chest Disease', type: 'boolean', section: 'pmh' },
      { name: 'kidneyDisease', label: 'Kidney Disease', type: 'boolean', section: 'pmh' },

      // Risk Factors
      { name: 'lifestyleRiskFactors', label: 'Social & Risk Factors', type: 'checkbox-group', options: ['Smoking', 'Alcohol', 'Hypertension', 'Blood transfusion', 'Diabetes', 'Mellitus', 'Sickle Cell', 'Twinning', 'Asthma', 'Epilepsy'], section: 'risk_factors' },
      
      // Present Pregnancy booking symptoms
      { name: 'bleeding', label: 'Bleeding', type: 'boolean', section: 'present_pregnancy' },
      { name: 'discharge', label: 'Discharge', type: 'boolean', section: 'present_pregnancy' },
      { name: 'urinarySymptoms', label: 'Urinary Symptoms', type: 'boolean', section: 'present_pregnancy' },
      { name: 'swellingOfAnkles', label: 'Swelling of Ankles', type: 'boolean', section: 'present_pregnancy' },
      { name: 'otherSymptoms', label: 'Other Symptoms', type: 'boolean', section: 'present_pregnancy' },
      { name: 'otherSymptomsDesc', label: 'Describe Other Symptoms', type: 'text', section: 'present_pregnancy' },

      // Previous Pregnancy table
      { name: 'prevGravida1', label: 'Pregnancy Gravida', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevParity1', label: 'Pregnancy Parity', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevLivingMale1', label: 'Pregnancy No of Living Children (Male)', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevLivingFemale1', label: 'Pregnancy No of Living Children (Female)', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevDob1', label: 'Pregnancy Date of Birth', type: 'date', section: 'previous_pregnancy' },
      { name: 'prevPob1', label: 'Pregnancy Place of Birth', type: 'text', section: 'previous_pregnancy' },
      { name: 'prevDuration1', label: 'Pregnancy Duration (Weeks)', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevComps1', label: 'Pregnancy, Labour and Puerperium', type: 'select', options: ['Normal', 'SVD', 'C/S', 'Pre-eclampsia/Eclampsia', 'PPH', 'Sepsis', 'Other'], section: 'previous_pregnancy' },
      { name: 'prevWeight1', label: 'Pregnancy Birth Weight (kg)', type: 'number', section: 'previous_pregnancy' },
      { name: 'prevOutcome1', label: 'Outcome (Baby A/SB/NND/D)', type: 'select', options: ['A', 'SB', 'NND', 'D'], section: 'previous_pregnancy' }
    ],
    pregnancyFields: [
      { name: 'consultant', label: 'Consultant', type: 'select', options: [] },
      { name: 'indicationForBooking', label: 'Indication for Booking', type: 'select', options: ['Routine', 'Previous C/S', 'Multiple Pregnancy', 'Hypertension', 'Diabetes', 'Advanced Maternal Age', 'Bad Obstetric History', 'Other'] },
      { name: 'specialPoints', label: 'Special Points', type: 'text' }
    ]
  },
  {
    id: 'anc_who_standard',
    name: 'WHO Standard ANC Template',
    description: 'World Health Organization standard antenatal care layout focusing on universal metrics',
    profileFields: [
      { name: 'nutritionalStatus', label: 'Nutritional Status', type: 'select', options: ['Normal', 'Undernourished', 'Overweight', 'Obese'] },
      { name: 'midUpperArmCircumference', label: 'MUAC (cm)', type: 'number' },
      { name: 'dailyCalorieIntake', label: 'Estimated Daily Calories', type: 'number' },
      { name: 'tetanusImmunizationStatus', label: 'Tetanus Immunization Status', type: 'select', options: ['Complete', 'Incomplete', 'None'] },
      { name: 'deWormingDone', label: 'Deworming Completed', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'plannedDeliveryFacility', label: 'Planned Delivery Facility', type: 'text' },
      { name: 'birthCompanionName', label: 'Birth Companion Name', type: 'text' },
      { name: 'transportationPlan', label: 'Transportation Plan Available', type: 'boolean' },
      { name: 'emergencyFundsPrepared', label: 'Emergency Funds Prepared', type: 'boolean' }
    ]
  },
  {
    id: 'anc_fmoh_nigeria',
    name: 'FMOH Nigeria Standard ANC Template',
    description: 'Federal Ministry of Health Nigeria official template featuring malaria prevention and PMTCT details',
    profileFields: [
      { name: 'llinDistributed', label: 'LLIN (Insecticide Net) Distributed', type: 'boolean' },
      { name: 'iptspDoses', label: 'IPTp-SP Doses Received', type: 'select', options: ['None', '1 Dose', '2 Doses', '3+ Doses'] },
      { name: 'ironSupplementationStatus', label: 'Iron/Folate Compliance', type: 'select', options: ['Good', 'Partial', 'Non-compliant'] }
    ],
    pregnancyFields: [
      { name: 'tdapDose', label: 'Tdap Vaccine Dose', type: 'text' },
      { name: 'hivPartnerStatus', label: 'Partner HIV Status', type: 'select', options: ['Positive', 'Negative', 'Unknown'] },
      { name: 'vdrPartnerStatus', label: 'Partner Syphilis Status', type: 'select', options: ['Reactive', 'Non-Reactive', 'Unknown'] }
    ]
  },
  {
    id: 'anc_lagos_state',
    name: 'Lagos State General ANC Template',
    description: 'Lagos State Ministry of Health general clinical assessment card',
    profileFields: [
      { name: 'lasrraId', label: 'LASRRA registration ID', type: 'text' },
      { name: 'nhisNumber', label: 'NHIS Insurance Number', type: 'text' },
      { name: 'familyIncomeRange', label: 'Family Income Bracket', type: 'select', options: ['Under 50k', '50k - 150k', '150k - 500k', 'Above 500k'] }
    ],
    pregnancyFields: [
      { name: 'preferredDeliveryMode', label: 'Preferred Delivery Mode', type: 'select', options: ['Spontaneous Vaginal Delivery', 'Elective Caesarean Section'] },
      { name: 'bloodDonorDetails', label: 'Assigned Blood Donor details', type: 'text' }
    ]
  },
  {
    id: 'anc_rural_community',
    name: 'Rural Community ANC Template',
    description: 'Tailored for primary health centers and rural outreach tracking',
    profileFields: [
      { name: 'distanceToFacility', label: 'Distance to Clinic (km)', type: 'number' },
      { name: 'waterSourceType', label: 'Primary Water Source', type: 'select', options: ['Borehole', 'Well', 'Stream', 'Tap Water'] },
      { name: 'cookingFuelType', label: 'Primary Cooking Fuel', type: 'select', options: ['Firewood', 'Kerosene', 'Gas', 'Coal'] }
    ],
    pregnancyFields: [
      { name: 'tbaContact', label: 'TBA Name & Contact (if any)', type: 'text' },
      { name: 'communityHealthWorkerName', label: 'Assigned Health Worker', type: 'text' }
    ]
  },
  {
    id: 'anc_high_risk',
    name: 'High-Risk Maternal Alert Template',
    description: 'Specialized card highlighting warning signs, previous losses, and specialist referrals',
    profileFields: [
      { name: 'previousPreeclampsia', label: 'History of Preeclampsia', type: 'boolean' },
      { name: 'previousHaemorrhage', label: 'History of Postpartum Haemorrhage', type: 'boolean' },
      { name: 'uterineAnomalies', label: 'Known Uterine Anomalies', type: 'text' }
    ],
    pregnancyFields: [
      { name: 'frequentKickCounts', label: 'Daily Kick Counts Logged', type: 'boolean' },
      { name: 'monitoredBpHome', label: 'BP Monitored at Home', type: 'boolean' }
    ]
  },
  {
    id: 'anc_hmo_premium',
    name: 'HMO Premium ANC Template',
    description: 'Premium healthcare metrics containing ancillary services and birth plans',
    profileFields: [
      { name: 'dieticianReferred', label: 'Dietician Referral Offered', type: 'boolean' },
      { name: 'physiotherapyReferred', label: 'Pelvic Floor Physio Offered', type: 'boolean' },
      { name: 'mentalHealthScreening', label: 'Perinatal Mental Health Screening', type: 'select', options: ['Done - Low Risk', 'Done - High Risk', 'Not Done'] }
    ],
    pregnancyFields: [
      { name: 'cordBloodBanking', label: 'Cord Blood Banking Enrolled', type: 'boolean' },
      { name: 'privateRoomPreference', label: 'Private Room Requested', type: 'boolean' }
    ]
  },
  {
    id: 'anc_private_exec',
    name: 'Private Practice Executive Template',
    description: 'Bespoke clinical card for private obstetrics clinic workflows',
    profileFields: [
      { name: 'supplementBrands', label: 'Pre-natal Supplement Brand', type: 'text' },
      { name: 'exerciseRoutine', label: 'Prenatal Exercise Regime', type: 'text' },
      { name: 'travelFrequency', label: 'Frequent Air Travel', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'doulaName', label: 'Doula / Birth Coach Name', type: 'text' },
      { name: 'birthPlanDocument', label: 'Written Birth Plan Uploaded', type: 'boolean' }
    ]
  },
  {
    id: 'anc_midwifery_basic',
    name: 'Basic Midwifery ANC Template',
    description: 'Simplified midwives assessment card for low-risk centers',
    profileFields: [
      { name: 'fundalHeightTrend', label: 'Fundal Height Growth Trend', type: 'select', options: ['Adequate', 'Inadequate', 'Excessive'] },
      { name: 'fetalMovementPerceived', label: 'Fetal Movements felt daily', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'breastfeedingPreparation', label: 'Breastfeeding Education completed', type: 'boolean' },
      { name: 'contraceptionDiscussed', label: 'Post-delivery Contraception discussed', type: 'boolean' }
    ]
  },
  {
    id: 'anc_teen_support',
    name: 'Teenage Pregnancy Support Template',
    description: 'Youth-focused template incorporating social support, guardians and schooling',
    profileFields: [
      { name: 'guardianConsent', label: 'Guardian Name & Consent', type: 'text' },
      { name: 'schoolStatus', label: 'School Status / Plan', type: 'select', options: ['Currently Attending', 'On Hold', 'Completed'] },
      { name: 'socialWorkerSupport', label: 'Social Services Officer Assigned', type: 'text' }
    ],
    pregnancyFields: [
      { name: 'counselingAttended', label: 'Maternal Youth Counseling attended', type: 'boolean' },
      { name: 'peerGroupAssigned', label: 'Peer Support Group Assigned', type: 'boolean' }
    ]
  },
  {
    id: 'anc_twin_gestation',
    name: 'Multiple Gestation (Twinning) Template',
    description: 'Multi-fetal pregnancy monitoring card tracking multiple heartbeats and positions',
    profileFields: [
      { name: 'chorionicity', label: 'Chorionicity (Ultrasound)', type: 'select', options: ['Monochorionic', 'Dichorionic', 'Unsure'] },
      { name: 'amnionicity', label: 'Amnionicity (Ultrasound)', type: 'select', options: ['Monoamniotic', 'Diamniotic', 'Unsure'] },
      { name: 'previousTwinningHistory', label: 'Family History of Twins', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'twinAFetalMovement', label: 'Twin A Movement Status', type: 'select', options: ['Active', 'Reduced'] },
      { name: 'twinBFetalMovement', label: 'Twin B Movement Status', type: 'select', options: ['Active', 'Reduced'] }
    ]
  },
  {
    id: 'anc_gest_diabetes',
    name: 'Gestational Diabetes Monitoring Template',
    description: 'Strict sugar profiling and insulin tracking template',
    profileFields: [
      { name: 'familyDiabetesHistory', label: 'Family History of Diabetes', type: 'boolean' },
      { name: 'prePregnancyBmi', label: 'Pre-pregnancy BMI', type: 'number' },
      { name: 'gctResult', label: 'Glucose Challenge Test (mg/dL)', type: 'number' }
    ],
    pregnancyFields: [
      { name: 'insulinDose', label: 'Current Insulin / Metformin Dose', type: 'text' },
      { name: 'fastingGlucoseTarget', label: 'Fasting Blood Sugar target (<95)', type: 'boolean' },
      { name: 'postPrandialTarget', label: '2-hour Post Prandial target (<120)', type: 'boolean' }
    ]
  },
  {
    id: 'anc_hypertensive',
    name: 'Hypertensive Disorders Focused Template',
    description: 'Preeclampsia prevention card tracking proteinuria, blood pressure trends, and aspirin therapy',
    profileFields: [
      { name: 'chronicHypertension', label: 'Pre-existing Hypertension', type: 'boolean' },
      { name: 'firstTrimesterBp', label: 'First Trimester Base BP', type: 'text' },
      { name: 'lowDoseAspirinStarted', label: 'Low Dose Aspirin started by Week 12', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'proteinuriaSelfTest', label: 'Proteinuria Self-Test (Home)', type: 'text' },
      { name: 'headacheOrVisionBlur', label: 'Severe Headaches or Blurred Vision', type: 'boolean' }
    ]
  },
  {
    id: 'anc_cardiac_renal',
    name: 'Cardiac / Renal ANC Special Template',
    description: 'Complicated maternal monitoring card tracking renal clearance and cardiac output',
    profileFields: [
      { name: 'cardiacClassification', label: 'NYHA Cardiac Class', type: 'select', options: ['Class I', 'Class II', 'Class III', 'Class IV'] },
      { name: 'renalFunctionCreatinine', label: 'Baseline Creatinine (mg/dL)', type: 'number' },
      { name: 'nephrologistReferred', label: 'Nephrologist Consult Scheduled', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'fluidRestrictionAmount', label: 'Fluid Restriction limit (ml/day)', type: 'number' },
      { name: 'dailyWeightMonitoring', label: 'Daily Weight Logged', type: 'boolean' }
    ]
  },
  {
    id: 'anc_art_pmtct',
    name: 'ART (HIV PMTCT) ANC Template',
    description: 'HIV care integration and transmission prevention registry',
    profileFields: [
      { name: 'artStartDate', label: 'ART Initiation Date', type: 'text' },
      { name: 'viralLoadCopies', label: 'Latest Viral Load (copies/mL)', type: 'number' },
      { name: 'partnerHivStatus', label: 'Partner HIV Status', type: 'select', options: ['Positive', 'Negative', 'Unknown'] }
    ],
    pregnancyFields: [
      { name: 'infantArvProphylaxisPlan', label: 'Infant ARV Prophylaxis Plan confirmed', type: 'boolean' },
      { name: 'exclusiveFeedingChoice', label: 'Infant Feeding Choice', type: 'select', options: ['Exclusive Breastfeeding', 'Exclusive Formula'] }
    ]
  },
  {
    id: 'anc_vbac_trial',
    name: 'Post-Cesarean Vaginal Birth (VBAC) Template',
    description: 'Assesses suitability for TOLAC (Trial of Labour After Cesarean)',
    profileFields: [
      { name: 'previousCsIndication', label: 'Reason for previous C-Section', type: 'text' },
      { name: 'interdeliveryIntervalMonths', label: 'Interdelivery Interval (Months)', type: 'number' },
      { name: 'scarThicknessMm', label: 'Lower Segment Scar Thickness (mm)', type: 'number' }
    ],
    pregnancyFields: [
      { name: 'vbacTrialConsent', label: 'Consent Form for TOLAC Signed', type: 'boolean' },
      { name: 'emergencyPlanConfirmed', label: 'Emergency Operating Room plan active', type: 'boolean' }
    ]
  },
  {
    id: 'anc_advanced_age',
    name: 'Advanced Maternal Age (35+) Template',
    description: 'Chromosomal abnormality screening and age-specific safety protocols',
    profileFields: [
      { name: 'geneticCounselingOffered', label: 'Genetic Counseling Offered', type: 'boolean' },
      { name: 'niptResult', label: 'NIPT / Quad Screen Result', type: 'text' },
      { name: 'prePregnancyHypertension', label: 'Pre-existing Hypertension', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'growthScanFrequency', label: 'Fetal Growth Scan frequency', type: 'select', options: ['Every 4 weeks', 'Every 2 weeks', 'As Needed'] },
      { name: 'plannedInductionWeek', label: 'Planned Induction Week', type: 'number' }
    ]
  },
  {
    id: 'anc_tba_companion',
    name: 'Traditional Birth Attendant (TBA) Support Template',
    description: 'Integrated midwifery tracking collaborating with community birth attendants',
    profileFields: [
      { name: 'tbaRegisteredWithState', label: 'Attendant registered with Ministry of Health', type: 'boolean' },
      { name: 'tbaReferralSlipReceived', label: 'Referral slip submitted by TBA', type: 'boolean' }
    ],
    pregnancyFields: [
      { name: 'trainedTbaCompanion', label: 'TBA Companion trained in danger signs', type: 'boolean' },
      { name: 'safeDeliveryKitProvided', label: 'Clean Safe Delivery Kit distributed', type: 'boolean' }
    ]
  },
  {
    id: 'anc_mobile_outreach',
    name: 'Mobile Outreach Clinic ANC Template',
    description: 'Rapid field deployment template with minimal required data entry',
    profileFields: [
      { name: 'outreachSiteLocation', label: 'Outreach Site Code/Location', type: 'text' },
      { name: 'outreachVoucherCode', label: 'Subsidized Voucher Code', type: 'text' },
      { name: 'geographicZone', label: 'Geographical Zone', type: 'text' }
    ],
    pregnancyFields: [
      { name: 'immunizationPackGiven', label: 'Maternal Immunization pack given', type: 'boolean' },
      { name: 'nutritionFlourDistributed', label: 'High Protein Flour pack given', type: 'boolean' }
    ]
  },
  {
    id: 'anc_pac_care',
    name: 'Post-Abortion Care (PAC) ANC Template',
    description: 'Monitors complication resolutions and family planning counselling',
    profileFields: [
      { name: 'complicationType', label: 'Complication treated at admission', type: 'select', options: ['Sepsis', 'Haemorrhage', 'Trauma', 'None'] },
      { name: 'contraceptionSelected', label: 'Contraception method chosen', type: 'text' },
      { name: 'counselingDate', label: 'Post-abortion Counseling date', type: 'text' }
    ],
    pregnancyFields: [
      { name: 'followUpVisitPlanned', label: 'Follow up visit in 2 weeks confirmed', type: 'boolean' },
      { name: 'infectionSignsMonitored', label: 'Patient educated on fever/pain warning signs', type: 'boolean' }
    ]
  }
];
