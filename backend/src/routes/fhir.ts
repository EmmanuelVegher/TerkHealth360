import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma.js';

const router = Router();

// ── SMART on FHIR Bearer Authentication Middleware ───────────────────────────
router.use((req: any, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET || 'terkhealth360-jwt-secret-key-production';
    try {
      const decoded = jwt.verify(token, secret);
      req.smartAuth = decoded;
      req.user = decoded;
    } catch (err) {
      // If an invalid bearer token is explicitly supplied by an external client, return 401
      return res.status(401).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'login', diagnostics: 'Invalid or expired SMART on FHIR access token' }]
      });
    }
  }
  next();
});

// ── SMART on FHIR Configuration Discovery (NHTDAO / NDHA) ───────────────────
router.get(['/.well-known/smart-configuration', '/smart-configuration'], (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/authorize`,
    token_endpoint: `${baseUrl}/api/auth/token`,
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    registration_endpoint: `${baseUrl}/api/auth/register`,
    scopes_supported: [
      'openid', 'profile', 'launch', 'launch/patient', 'patient/*.read', 'patient/*.write',
      'user/*.read', 'user/*.write', 'offline_access', 'system/*.read', 'system/*.write'
    ],
    response_types_supported: ['code'],
    management_endpoint: `${baseUrl}/api/auth/manage`,
    introspection_endpoint: `${baseUrl}/api/auth/introspect`,
    revocation_endpoint: `${baseUrl}/api/auth/revoke`,
    capabilities: [
      'launch-standalone',
      'launch-ehr',
      'client-public',
      'client-confidential-symmetric',
      'context-ehr-patient',
      'context-standalone-patient',
      'permission-patient',
      'permission-user'
    ]
  });
});

// ── FHIR R4 CapabilityStatement (Conforms to NHTDAO Interoperability Spec) ────
router.get('/metadata', (req, res) => {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  res.json({
    resourceType: 'CapabilityStatement',
    id: 'terkhealth360-ndha-conformance',
    status: 'active',
    date: new Date().toISOString().split('T')[0],
    publisher: 'TerkHealth360 HIMS (NHTDAO / NDHA Compliant Platform)',
    kind: 'instance',
    software: {
      name: 'TerkHealth360 HIMS Interop Core',
      version: '2.5.0',
      releaseDate: '2026-10-17'
    },
    implementation: {
      description: 'National Digital Health Architecture (NDHA) Interoperability Platform',
      url: `${baseUrl}/api/fhir`
    },
    fhirVersion: '4.0.1',
    format: ['application/fhir+json', 'json'],
    rest: [
      {
        mode: 'server',
        security: {
          cors: true,
          service: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
                  code: 'SMART-on-FHIR',
                  display: 'SMART-on-FHIR'
                }
              ]
            }
          ],
          extension: [
            {
              url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
              extension: [
                { url: 'token', valueUri: `${baseUrl}/api/auth/token` },
                { url: 'authorize', valueUri: `${baseUrl}/api/auth/authorize` },
                { url: 'manage', valueUri: `${baseUrl}/api/auth/manage` }
              ]
            }
          ]
        },
        resource: [
          {
            type: 'Patient',
            profile: 'http://hl7.org/fhir/StructureDefinition/Patient',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'delete' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'identifier', type: 'token' },
              { name: 'gender', type: 'token' },
              { name: 'birthdate', type: 'date' }
            ]
          },
          {
            type: 'Condition',
            profile: 'http://hl7.org/fhir/StructureDefinition/Condition',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'update' }, { code: 'delete' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'patient', type: 'reference' },
              { name: 'clinical-status', type: 'token' },
              { name: 'category', type: 'token' },
              { name: 'code', type: 'token' }
            ]
          },
          {
            type: 'Encounter',
            profile: 'http://hl7.org/fhir/StructureDefinition/Encounter',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            searchParam: [{ name: '_id', type: 'token' }, { name: 'patient', type: 'reference' }, { name: 'status', type: 'token' }]
          },
          {
            type: 'Observation',
            profile: 'http://hl7.org/fhir/StructureDefinition/Observation',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }],
            searchParam: [{ name: '_id', type: 'token' }, { name: 'patient', type: 'reference' }, { name: 'category', type: 'token' }]
          },
          {
            type: 'Appointment',
            profile: 'http://hl7.org/fhir/StructureDefinition/Appointment',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }]
          },
          {
            type: 'MedicationRequest',
            profile: 'http://hl7.org/fhir/StructureDefinition/MedicationRequest',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }]
          },
          {
            type: 'Invoice',
            profile: 'http://hl7.org/fhir/StructureDefinition/Invoice',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }]
          },
          {
            type: 'Consent',
            profile: 'http://hl7.org/fhir/StructureDefinition/Consent',
            interaction: [{ code: 'read' }, { code: 'search-type' }, { code: 'create' }, { code: 'update' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'patient', type: 'reference' },
              { name: 'status', type: 'token' },
              { name: 'scope', type: 'token' },
              { name: 'category', type: 'token' }
            ]
          },
          {
            type: 'Practitioner',
            profile: 'http://hl7.org/fhir/StructureDefinition/Practitioner',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'identifier', type: 'token' },
              { name: 'name', type: 'string' }
            ]
          },
          {
            type: 'Organization',
            profile: 'http://hl7.org/fhir/StructureDefinition/Organization',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'identifier', type: 'token' },
              { name: 'name', type: 'string' }
            ]
          },
          {
            type: 'Location',
            profile: 'http://hl7.org/fhir/StructureDefinition/Location',
            interaction: [{ code: 'read' }, { code: 'search-type' }],
            searchParam: [
              { name: '_id', type: 'token' },
              { name: 'name', type: 'string' }
            ]
          }
        ]
      }
    ]
  });
});

// FHIR Patient endpoints
router.get('/Patient', async (req, res, next) => {
  try {
    const { _count, _sort, _id, name, identifier, gender, birthdate } = req.query;
    const where: any = {};

    if (_id) where.fhirId = _id;
    if (identifier) {
      where.identifiers = { some: { value: identifier as string } };
    }
    if (gender) where.gender = gender;
    if (birthdate) where.birthDate = { equals: new Date(birthdate as string) };

    const patients = await prisma.patient.findMany({
      where,
      include: {
        identifiers: true,
        telecoms: true,
        addresses: true,
        user: { select: { email: true } },
      },
      take: _count ? parseInt(_count as string) : undefined,
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: patients.length,
      entry: patients.map((p) => ({
        resource: {
          resourceType: 'Patient',
          id: p.fhirId || p.id,
          name: [
            {
              given: [p.firstName, p.maidenName].filter(Boolean),
              family: p.lastName,
            },
          ],
          gender: p.gender.toLowerCase(),
          birthDate: p.birthDate?.toISOString().split('T')[0],
          telecom: p.telecoms.map((t) => ({
            system: t.system,
            value: t.value,
            use: t.use,
          })),
          address: p.addresses.map((a) => ({
            line: a.line ? [a.line] : undefined,
            city: a.city,
            district: a.district,
            state: a.state,
            postalCode: a.postalCode,
            country: a.country,
            use: a.use,
            type: a.type,
          })),
          extension: [
            {
              url: 'http://hospital.org/fhir/StructureDefinition/patient-number',
              valueString: p.patientNumber,
            },
            {
              url: 'http://hospital.org/fhir/StructureDefinition/blood-group',
              valueString: p.bloodGroup,
            },
            ...(p.nin ? [
              {
                url: 'http://nhtdao.gov.ng/fhir/StructureDefinition/patient-nin',
                valueString: p.nin,
              }
            ] : []),
          ],
          identifier: [
            ...p.identifiers.map((i) => ({
              system: i.system,
              value: i.value,
              type: { coding: [{ code: i.typeCode, display: i.typeDisplay }] },
            })),
            ...(p.nin ? [
              {
                system: 'http://nimc.gov.ng/nin',
                value: p.nin,
                type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NNNGA', display: 'Nigerian National Identity Number' }] },
              }
            ] : []),
          ],
        },
      })),
    };

    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

router.get('/Patient/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findFirst({
      where: { fhirId: id, OR: [{ id }] },
      include: {
        identifiers: true,
        telecoms: true,
        addresses: true,
        user: { select: { email: true } },
      },
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const fhirPatient = {
      resourceType: 'Patient',
      id: patient.fhirId || patient.id,
      identifier: [
        ...patient.identifiers.map((i) => ({
          system: i.system,
          value: i.value,
          type: { coding: [{ code: i.typeCode, display: i.typeDisplay }] },
        })),
        ...(patient.nin ? [
          {
            system: 'http://nimc.gov.ng/nin',
            value: patient.nin,
            type: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NNNGA', display: 'Nigerian National Identity Number' }] },
          }
        ] : []),
      ],
      name: [
        {
          given: [patient.firstName, patient.maidenName].filter(Boolean),
          family: patient.lastName,
        },
      ],
      gender: patient.gender.toLowerCase(),
      birthDate: patient.birthDate?.toISOString().split('T')[0],
      telecom: patient.telecoms.map((t) => ({
        system: t.system,
        value: t.value,
        use: t.use,
      })),
      address: patient.addresses.map((a) => ({
        line: a.line ? [a.line] : undefined,
        city: a.city,
        district: a.district,
        state: a.state,
        postalCode: a.postalCode,
        country: a.country,
        use: a.use,
        type: a.type,
      })),
      extension: [
        {
          url: 'http://hospital.org/fhir/StructureDefinition/patient-number',
          valueString: patient.patientNumber,
        },
        {
          url: 'http://hospital.org/fhir/StructureDefinition/blood-group',
          valueString: patient.bloodGroup,
        },
        ...(patient.nin ? [
          {
            url: 'http://nhtdao.gov.ng/fhir/StructureDefinition/patient-nin',
            valueString: patient.nin,
          }
        ] : []),
      ],
    };

    res.json(fhirPatient);
  } catch (error) {
    next(error);
  }
});

router.delete('/Patient/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await prisma.patient.findFirst({
      where: { fhirId: id, OR: [{ id }] },
    });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const patientId = patient.id;
    const userId = patient.userId;
    await prisma.$transaction([
      prisma.appointment.deleteMany({ where: { patientId } }),
      prisma.encounter.deleteMany({ where: { patientId } }),
      prisma.observation.deleteMany({ where: { patientId } }),
      prisma.condition.deleteMany({ where: { patientId } }),
      prisma.medicationRequest.deleteMany({ where: { patientId } }),
      prisma.invoice.deleteMany({ where: { patientId } }),
      prisma.patientIdentifier.deleteMany({ where: { patientId } }),
      prisma.patientTelecom.deleteMany({ where: { patientId } }),
      prisma.patientAddress.deleteMany({ where: { patientId } }),
      prisma.patient.delete({ where: { id: patientId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
    res.json({ message: 'Patient account deleted successfully' });
  } catch (error) {
    next(error);
  }
});


router.post('/Patient', async (req, res, next) => {
  try {
    const fhirPatient = req.body;
    if (fhirPatient.resourceType !== 'Patient') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    const name = fhirPatient.name?.[0] || {};
    const telecom = fhirPatient.telecom || [];
    const address = fhirPatient.address || [];
    const extension = fhirPatient.extension || [];

    const patientNumber = extension.find(
      (e: any) => e.url === 'http://hospital.org/fhir/StructureDefinition/patient-number'
    )?.valueString;

    const bloodGroup = extension.find(
      (e: any) => e.url === 'http://hospital.org/fhir/StructureDefinition/blood-group'
    )?.valueString;

    const ninFromExtension = extension.find(
      (e: any) => e.url?.includes('nin')
    )?.valueString;
    const ninFromIdentifier = fhirPatient.identifier?.find(
      (i: any) => i.system?.toLowerCase().includes('nin') || i.type?.coding?.[0]?.code === 'NNNGA'
    )?.value;
    const nin = ninFromExtension || ninFromIdentifier || null;

    const email = telecom.find((t: any) => t.system === 'email')?.value || `patient_${Date.now()}@hospital.com`;
    const username = `${email.split('@')[0]}_${Date.now()}`;

    const patient = await prisma.patient.create({
      data: {
        fhirId: fhirPatient.id,
        user: {
          create: {
            username,
            email,
            passwordHash: 'no-login-allowed-directly',
            role: 'PATIENT',
          }
        },
        patientNumber: patientNumber || `PAT-${Date.now()}`,
        nin,
        firstName: name.given?.[0] || '',
        lastName: name.family || '',
        maidenName: name.given?.[1] || null,
        birthDate: fhirPatient.birthDate ? new Date(fhirPatient.birthDate) : null,
        gender: fhirPatient.gender?.toUpperCase() || 'UNKNOWN',
        bloodGroup: bloodGroup || null,
        identifiers: {
          create: fhirPatient.identifier?.map((i: any) => ({
            system: i.system,
            value: i.value,
            typeCode: i.type?.coding?.[0]?.code,
            typeDisplay: i.type?.coding?.[0]?.display,
          })) || [],
        },
        telecoms: {
          create: telecom.map((t: any) => ({
            system: t.system,
            value: t.value,
            use: t.use,
          })),
        },
        addresses: {
          create: address.map((a: any) => ({
            line: a.line?.[0],
            city: a.city,
            district: a.district,
            state: a.state,
            postalCode: a.postalCode,
            country: a.country,
            use: a.use,
            type: a.type,
          })),
        },
      },
      include: { identifiers: true, telecoms: true, addresses: true },
    });

    res.status(201).json({
      resourceType: 'Patient',
      id: patient.fhirId || patient.id,
      ...fhirPatient,
    });
  } catch (error) {
    next(error);
  }
});

// FHIR Appointment endpoints
router.get('/Appointment', async (req, res, next) => {
  try {
    const { patient, practitioner, date, status } = req.query;
    const where: any = {};

    if (patient) where.patientId = patient;
    if (practitioner) where.staffId = practitioner;
    if (status) where.status = status;
    if (date) {
      const dateStr = date as string;
      where.start = {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)),
      };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: true, staff: true },
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: appointments.length,
      entry: appointments.map((a) => ({
        resource: {
          resourceType: 'Appointment',
          id: a.fhirId || a.id,
          status: a.status.toLowerCase(),
          start: a.start.toISOString(),
          end: a.end.toISOString(),
          participant: [
            {
              actor: {
                reference: `Patient/${a.patient.fhirId || a.patient.id}`,
                display: `${a.patient.firstName} ${a.patient.lastName}`,
              },
            },
            ...(a.staff
              ? [
                  {
                    actor: {
                      reference: `Practitioner/${a.staff.id}`,
                      display: `Dr. ${a.staff.firstName} ${a.staff.lastName}`,
                    },
                  },
                ]
              : []),
          ],
          reasonText: a.reasonText,
          comment: a.comment,
        },
      })),
    };

    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

router.post('/Appointment', async (req, res, next) => {
  try {
    const fhirAppt = req.body;
    if (fhirAppt.resourceType !== 'Appointment') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    const participant = fhirAppt.participant || [];
    const patientRef = participant.find((p: any) => p.actor?.reference?.startsWith('Patient/'));
    const practitionerRef = participant.find((p: any) => p.actor?.reference?.startsWith('Practitioner/'));

    let patientId: string | undefined;
    let staffId: string | undefined;

    if (patientRef?.actor?.reference) {
      const patientFhirId = patientRef.actor.reference.split('/')[1];
      const patient = await prisma.patient.findFirst({ where: { fhirId: patientFhirId } });
      patientId = patient?.id;
    }

    if (practitionerRef?.actor?.reference) {
      const staffIdRef = practitionerRef.actor.reference.split('/')[1];
      const staff = await prisma.staff.findFirst({ where: { id: staffIdRef } });
      staffId = staff?.id;
    }

    const appointment = await prisma.appointment.create({
      data: {
        fhirId: fhirAppt.id,
        patientId: patientId!,
        staffId: staffId,
        status: fhirAppt.status?.toUpperCase() || 'BOOKED',
        start: new Date(fhirAppt.start),
        end: new Date(fhirAppt.end),
        reasonText: fhirAppt.reasonText,
        comment: fhirAppt.comment,
      },
    });

    res.status(201).json({
      resourceType: 'Appointment',
      id: appointment.fhirId || appointment.id,
      ...fhirAppt,
    });
  } catch (error) {
    next(error);
  }
});

// FHIR Observation endpoints
router.get('/Observation', async (req, res, next) => {
  try {
    const { patient, category, code, date } = req.query;
    const where: any = {};

    if (patient) where.patientId = patient;
    if (category) where.category = category;
    if (code) where.code = code;
    if (date) {
      const dateStr = date as string;
      where.effectiveDateTime = {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)),
      };
    }

    const observations = await prisma.observation.findMany({
      where,
      include: { patient: true, staff: true },
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: observations.length,
      entry: observations.map((o) => ({
        resource: {
          resourceType: 'Observation',
          id: o.fhirId || o.id,
          status: o.status.toLowerCase(),
          category: [{ coding: [{ code: o.category }] }],
          code: { coding: [{ code: o.code, display: o.display }] },
          subject: {
            reference: `Patient/${o.patient.fhirId || o.patient.id}`,
            display: `${o.patient.firstName} ${o.patient.lastName}`,
          },
          effectiveDateTime: o.effectiveDateTime?.toISOString(),
          valueQuantity: o.valueQuantity,
          valueString: o.valueString,
          valueDateTime: o.valueDateTime?.toISOString(),
          note: o.note ? [{ text: o.note }] : undefined,
        },
      })),
    };

    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

router.post('/Observation', async (req, res, next) => {
  try {
    const fhirObs = req.body;
    if (fhirObs.resourceType !== 'Observation') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    const subjectRef = fhirObs.subject?.reference;
    let patientId: string | undefined;

    if (subjectRef?.startsWith('Patient/')) {
      const patientFhirId = subjectRef.split('/')[1];
      const patient = await prisma.patient.findFirst({ where: { fhirId: patientFhirId } });
      patientId = patient?.id;
    }

    const observation = await prisma.observation.create({
      data: {
        fhirId: fhirObs.id,
        patientId: patientId!,
        status: fhirObs.status?.toUpperCase() || 'FINAL',
        category: fhirObs.category?.[0]?.coding?.[0]?.code,
        code: fhirObs.code?.coding?.[0]?.code || '',
        display: fhirObs.code?.coding?.[0]?.display || '',
        valueQuantity: fhirObs.valueQuantity,
        valueString: fhirObs.valueString,
        valueDateTime: fhirObs.valueDateTime ? new Date(fhirObs.valueDateTime) : null,
        effectiveDateTime: fhirObs.effectiveDateTime ? new Date(fhirObs.effectiveDateTime) : null,
        note: fhirObs.note?.[0]?.text,
      },
    });

    res.status(201).json({
      resourceType: 'Observation',
      id: observation.fhirId || observation.id,
      ...fhirObs,
    });
  } catch (error) {
    next(error);
  }
});


// FHIR Encounter endpoints (OPD/IPD Visits)
router.get('/Encounter', async (req, res, next) => {
  try {
    const { patient, status, date } = req.query;
    const where: any = {};
    if (patient) where.patientId = patient;
    if (status) {
      const statusStr = String(status).toUpperCase().replace('-', '_');
      const validStatuses = ['PLANNED', 'ARRIVED', 'TRIAGED', 'IN_PROGRESS', 'ONLEAVE', 'FINISHED', 'CANCELLED', 'ENTERED_IN_ERROR', 'UNKNOWN'];
      if (validStatuses.includes(statusStr)) {
        where.status = statusStr;
      } else if (statusStr === 'ACTIVE') {
        where.status = { in: ['PLANNED', 'ARRIVED', 'TRIAGED', 'IN_PROGRESS'] };
      }
    }
    if (date) {
      const dateStr = date as string;
      where.start = {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).setDate(new Date(dateStr).getDate() + 1)),
      };
    }
    const [rawEncounters, activeAdmissionsList, activeVisits, activeQueueTickets] = await Promise.all([
      prisma.encounter.findMany({
        where,
        include: {
          patient: {
            include: {
              admissions: {
                where: { dischargedAt: null },
                include: { bed: { include: { ward: true } } },
              },
              conditions: {
                orderBy: { createdAt: 'desc' },
                take: 3,
              },
              triageRecords: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
          staff: true,
          visit: {
            include: {
              ConsultationNote: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admission.findMany({
        where: { dischargedAt: null },
        include: { bed: { include: { ward: true } } },
      }),
      prisma.visit.findMany({
        where: {
          status: { notIn: ['CLOSED', 'DISCHARGED', 'CANCELLED'] }
        },
        include: {
          patient: {
            include: {
              admissions: { where: { dischargedAt: null }, include: { bed: { include: { ward: true } } } },
              conditions: { orderBy: { createdAt: 'desc' }, take: 3 },
              triageRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
            }
          },
          ConsultationNote: { orderBy: { createdAt: 'desc' } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.patientQueue.findMany({
        where: {
          status: { in: ['WAITING', 'CALLED', 'IN_SERVICE'] }
        },
        include: {
          patient: {
            include: {
              admissions: { where: { dischargedAt: null }, include: { bed: { include: { ward: true } } } },
              conditions: { orderBy: { createdAt: 'desc' }, take: 3 },
              triageRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
            }
          },
          visit: {
            include: { ConsultationNote: { orderBy: { createdAt: 'desc' } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Filter out secondary sub-order encounters and deduplicate by visit
    const filteredRaw = rawEncounters.filter(e => e.type !== 'AdmissionOrder' && e.type !== 'BedAssignment' && e.type !== 'WardTransfer');
    const seenVisitKeys = new Set<string>();
    const deduplicatedRawEncounters: typeof rawEncounters = [];

    for (const e of filteredRaw) {
      const key = e.visitId ? `visit-${e.visitId}` : `enc-${e.id}`;
      if (!seenVisitKeys.has(key)) {
        seenVisitKeys.add(key);
        deduplicatedRawEncounters.push(e);
      }
    }

    // Build Set of existing visit IDs in deduplicatedRawEncounters
    const existingVisitIds = new Set(deduplicatedRawEncounters.map(e => e.visitId).filter(Boolean));

    // Map queue tickets by visitId for quick lookup of assigned doctor
    const queueByVisitMap = new Map<string, any>();
    for (const q of activeQueueTickets) {
      if (q.visitId) queueByVisitMap.set(q.visitId, q);
    }

    // Synthesize encounters for active Visits that do not yet have an Encounter row
    const syntheticEncounters = activeVisits
      .filter(v => !existingVisitIds.has(v.id))
      .map(v => {
        const linkedQueue = queueByVisitMap.get(v.id);
        return {
          id: `enc-v-${v.id}`,
          fhirId: `enc-v-${v.id}`,
          visitId: v.id,
          patientId: v.patientId,
          patient: v.patient,
          staff: null,
          visit: v,
          patientQueue: linkedQueue,
          assignedDoctorId: linkedQueue?.assignedDoctorId || null,
          assignedDoctorName: linkedQueue?.assignedDoctorName || null,
          type: 'Consultation',
          status: 'IN_PROGRESS',
          start: v.createdAt,
          end: null,
          serviceType: v.visitType || 'OUTPATIENT',
          reasonText: v.chiefComplaint || 'Outpatient Consultation',
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
      });

    // Also synthesize encounters for active Queue Tickets that are not in existingVisitIds or syntheticEncounters
    const synthesizedVisitIds = new Set([...existingVisitIds, ...syntheticEncounters.map(s => s.visitId)]);
    const queueEncounters: any[] = [];
    for (const q of activeQueueTickets) {
      if (q.visitId && synthesizedVisitIds.has(q.visitId)) continue;
      synthesizedVisitIds.add(q.visitId || `q-${q.id}`);
      queueEncounters.push({
        id: `enc-q-${q.id}`,
        fhirId: `enc-q-${q.id}`,
        visitId: q.visitId,
        patientId: q.patientId,
        patient: q.patient,
        staff: null,
        patientQueue: q,
        assignedDoctorId: q.assignedDoctorId || null,
        assignedDoctorName: q.assignedDoctorName || null,
        visit: q.visit || { id: q.visitId || `v-q-${q.id}`, status: 'IN_CONSULTATION', visitType: 'OUTPATIENT', chiefComplaint: q.priorityReason },
        type: 'Consultation',
        status: 'IN_PROGRESS',
        start: q.createdAt,
        end: null,
        serviceType: 'OUTPATIENT',
        reasonText: q.priorityReason || q.visit?.chiefComplaint || 'Outpatient Consultation',
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      });
    }

    const encounters = [...deduplicatedRawEncounters, ...syntheticEncounters, ...queueEncounters];

    const activeAdmittedMap = new Map<string, any>();
    for (const adm of activeAdmissionsList) {
      if (adm.patientId) activeAdmittedMap.set(adm.patientId, adm);
    }

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: encounters.length,
      entry: encounters.map((e: any) => {
        const visitNotes = e.visit?.ConsultationNote || [];

        const vStatusRaw = (e.visit?.status || '').toUpperCase();
        const encStatusRaw = (e.status || '').toUpperCase();

        const activeAdm = activeAdmittedMap.get(e.patientId) || activeAdmittedMap.get(e.patient?.id) || e.patient?.admissions?.[0];
        const isAdmittedInIpd = Boolean(activeAdm);

        const isClosedOrDischarged =
          vStatusRaw === 'CLOSED' || vStatusRaw === 'DISCHARGED' || vStatusRaw === 'COMPLETED' || vStatusRaw === 'FINISHED' || vStatusRaw === 'CANCELLED' ||
          encStatusRaw === 'CLOSED' || encStatusRaw === 'COMPLETED' || encStatusRaw === 'FINISHED' || encStatusRaw === 'CANCELLED' || encStatusRaw === 'DISCHARGED';

        let statusStr = 'in-progress';
        if (isClosedOrDischarged) {
          statusStr = 'finished';
        } else if (isAdmittedInIpd) {
          statusStr = 'admitted';
        } else if (vStatusRaw === 'ORDERED_ADMISSION' || vStatusRaw === 'SENT_TO_INTERNAL_BANKING') {
          statusStr = 'sent_to_internal_banking';
        } else if (vStatusRaw === 'PENDING_BED_ASSIGNMENT') {
          statusStr = 'pending_bed_assignment';
        } else {
          statusStr = 'in-progress';
        }

        // Resolve ICD-10 Diagnosis Display
        let icd10Display = '';
        if (e.diagnosis) {
          const rawDiag = e.diagnosis as any;
          if (typeof rawDiag === 'string') icd10Display = rawDiag;
          else if (Array.isArray(rawDiag) && rawDiag.length > 0) {
            icd10Display = rawDiag[0]?.condition?.display || rawDiag[0]?.display || rawDiag[0]?.code || '';
          } else if (typeof rawDiag === 'object') {
            icd10Display = rawDiag.code || rawDiag.display || rawDiag.condition?.display || '';
          }
        }
        if (!icd10Display && visitNotes.length > 0) {
          icd10Display = visitNotes[0].assessment || '';
        }
        if (!icd10Display && e.patient?.conditions?.length > 0) {
          const c = e.patient.conditions[0];
          icd10Display = c.code ? `${c.code} — ${c.display || ''}` : (c.display || '');
        }

        // Resolve Chief Complaint
        const tr = e.patient?.triageRecords?.[0] as any;
        let complaintText = e.reasonText || e.visit?.chiefComplaint || tr?.presentingComplaints || tr?.presentingComplaint || 'General Ambulatory Consultation';
        if (complaintText === 'General Ambulatory Consultation' && e.visit?.chiefComplaint) {
          complaintText = e.visit.chiefComplaint;
        }

        // Resolve Class Code (Dynamic visit type / service type)
        let rawClass = e.serviceType || e.visit?.visitType || e.type || (typeof e.class === 'string' ? e.class : e.class?.code) || 'OUTPATIENT';
        let classCode = rawClass.toLowerCase();
        if (isAdmittedInIpd) classCode = 'imp';

        const extensions: any[] = [];
        if (isAdmittedInIpd && activeAdm) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/isAdmitted',
            valueBoolean: true,
          });
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/admittedWard',
            valueString: `Admitted to Bed ${activeAdm.bed?.number} (${activeAdm.bed?.ward?.name})`,
          });
        }
        if (icd10Display) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/icd10',
            valueString: icd10Display,
          });
        }
        if (e.visit?.visitType || e.serviceType) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/visitType',
            valueString: e.visit?.visitType || e.serviceType,
          });
        }
        if (e.visit?.status) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/visitStatus',
            valueString: e.visit.status,
          });
        }
        const existingExts: any[] = Array.isArray(e.extension) ? e.extension : [];
        const extDocId = existingExts.find((x: any) => x.url?.includes('assignedDoctorId'))?.valueString;
        const extDocName = existingExts.find((x: any) => x.url?.includes('assignedDoctorName'))?.valueString;

        const docId = e.staffId || e.assignedDoctorId || e.patientQueue?.assignedDoctorId || e.visit?.assignedDoctorId || extDocId;
        const docName = e.staff?.fullName || e.staff?.name || e.assignedDoctorName || e.patientQueue?.assignedDoctorName || e.visit?.assignedDoctorName || extDocName;
        
        if (docId) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/assignedDoctorId',
            valueString: docId,
          });
        }
        if (docName) {
          extensions.push({
            url: 'http://hospital.org/fhir/StructureDefinition/assignedDoctorName',
            valueString: docName,
          });
        }

        return {
          resource: {
            resourceType: 'Encounter',
            id: e.fhirId || e.id,
            status: statusStr,
            class: { code: classCode },
            subject: {
              reference: `Patient/${e.patient?.fhirId || e.patient?.id || e.patientId}`,
              display: `${e.patient?.firstName || ''} ${e.patient?.lastName || ''}`.trim() || 'Unknown Patient',
            },
            participant: e.staff ? [
              {
                individual: {
                  reference: `Practitioner/${e.staff.id}`,
                  display: `Dr. ${e.staff.firstName} ${e.staff.lastName}`,
                }
              }
            ] : [],
            period: {
              start: e.start?.toISOString(),
              end: e.end?.toISOString(),
            },
            extension: extensions.length > 0 ? extensions : undefined,
            reasonCode: isAdmittedInIpd && activeAdm
              ? [{ text: `Admitted to Bed ${activeAdm.bed?.number} (${activeAdm.bed?.ward?.name})` }]
              : [{ text: complaintText }],
            diagnosis: icd10Display ? [{ condition: { display: icd10Display } }] : undefined,
          },
        };
      }),
    };
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});
router.post('/Encounter', async (req, res, next) => {
  try {
    const fhirEnc = req.body;
    if (fhirEnc.resourceType !== 'Encounter') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    const subjectRef = fhirEnc.subject?.reference;
    let patientId: string | undefined;
    if (subjectRef?.startsWith('Patient/')) {
      const patientFhirId = subjectRef.split('/')[1];
      const patient = await prisma.patient.findFirst({ where: { fhirId: patientFhirId, OR: [{ id: patientFhirId }] } });
      patientId = patient?.id;
    }
    const encounter = await prisma.encounter.create({
      data: {
        fhirId: fhirEnc.id,
        patientId: patientId!,
        status: fhirEnc.status?.toUpperCase() || 'PLANNED',
        class: fhirEnc.class?.code?.toUpperCase() || 'AMBULATORY',
        start: fhirEnc.period?.start ? new Date(fhirEnc.period.start) : new Date(),
        end: fhirEnc.period?.end ? new Date(fhirEnc.period.end) : null,
        reasonText: fhirEnc.reasonCode?.[0]?.text || null,
        diagnosis: fhirEnc.diagnosis ? fhirEnc.diagnosis : null,
      },
    });
    res.status(201).json({
      resourceType: 'Encounter',
      id: encounter.fhirId || encounter.id,
      ...fhirEnc,
    });
  } catch (error) {
    next(error);
  }
});
// FHIR MedicationRequest endpoints (Pharmacy)
router.get('/MedicationRequest', async (req, res, next) => {
  try {
    const { patient, status } = req.query;
    const where: any = {};
    if (patient) where.patientId = patient;
    if (status) where.status = status;
    const medicationRequests = await prisma.medicationRequest.findMany({
      where,
      include: { patient: true, staff: true },
    });
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: medicationRequests.length,
      entry: medicationRequests.map((m) => ({
        resource: {
          resourceType: 'MedicationRequest',
          id: m.fhirId || m.id,
          status: m.status.toLowerCase(),
          intent: m.intent.toLowerCase(),
          medicationCodeableConcept: {
            coding: [{ code: m.medicationCode, display: m.medicationDisplay }],
            text: m.medicationDisplay,
          },
          subject: {
            reference: `Patient/${m.patient.fhirId || m.patient.id}`,
            display: `${m.patient.firstName} ${m.patient.lastName}`,
          },
          requester: m.staff ? {
            reference: `Practitioner/${m.staff.id}`,
            display: `Dr. ${m.staff.firstName} ${m.staff.lastName}`,
          } : undefined,
          dosageInstruction: m.dosageText ? [{ text: m.dosageText }] : [],
          note: m.note ? [{ text: m.note }] : undefined,
          authoredOn: m.authoredOn.toISOString(),
        },
      })),
    };
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});
router.post('/MedicationRequest', async (req, res, next) => {
  try {
    const fhirMedReq = req.body;
    if (fhirMedReq.resourceType !== 'MedicationRequest') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    const subjectRef = fhirMedReq.subject?.reference;
    let patientId: string | undefined;
    if (subjectRef?.startsWith('Patient/')) {
      const patientFhirId = subjectRef.split('/')[1];
      const patient = await prisma.patient.findFirst({ where: { fhirId: patientFhirId, OR: [{ id: patientFhirId }] } });
      patientId = patient?.id;
    }
    const medicationRequest = await prisma.medicationRequest.create({
      data: {
        fhirId: fhirMedReq.id,
        patientId: patientId!,
        status: fhirMedReq.status?.toUpperCase() || 'ACTIVE',
        intent: fhirMedReq.intent?.toUpperCase() || 'ORDER',
        medicationCode: fhirMedReq.medicationCodeableConcept?.coding?.[0]?.code || 'unknown',
        medicationDisplay: fhirMedReq.medicationCodeableConcept?.text || fhirMedReq.medicationCodeableConcept?.coding?.[0]?.display || 'Unknown Medication',
        dosageText: fhirMedReq.dosageInstruction?.[0]?.text || null,
        note: fhirMedReq.note?.[0]?.text || null,
        authoredOn: fhirMedReq.authoredOn ? new Date(fhirMedReq.authoredOn) : new Date(),
      },
    });
    res.status(201).json({
      resourceType: 'MedicationRequest',
      id: medicationRequest.fhirId || medicationRequest.id,
      ...fhirMedReq,
    });
  } catch (error) {
    next(error);
  }
});
// FHIR Invoice endpoints (Billing)
router.get('/Invoice', async (req, res, next) => {
  try {
    const { patient, status } = req.query;
    const where: any = {};
    if (patient) where.patientId = patient;
    if (status) where.status = status;
    const invoices = await prisma.invoice.findMany({
      where,
      include: { patient: true },
    });
    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: invoices.length,
      entry: invoices.map((i) => ({
        resource: {
          resourceType: 'Invoice',
          id: i.fhirId || i.id,
          status: i.status.toLowerCase(),
          subject: {
            reference: `Patient/${i.patient.fhirId || i.patient.id}`,
            display: `${i.patient.firstName} ${i.patient.lastName}`,
          },
          totalGross: {
            value: i.total,
            currency: 'USD',
          },
          extension: [
            {
              url: 'http://hospital.org/fhir/StructureDefinition/amount-paid',
              valueDecimal: i.amountPaid,
            }
          ],
          note: i.reasonText ? [{ text: i.reasonText }] : undefined,
          date: i.createdAt.toISOString(),
        },
      })),
    };
    res.json(bundle);
  } catch (error) {
    next(error);
  }
});
router.post('/Invoice', async (req, res, next) => {
  try {
    const fhirInv = req.body;
    if (fhirInv.resourceType !== 'Invoice') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }
    const subjectRef = fhirInv.subject?.reference;
    let patientId: string | undefined;
    if (subjectRef?.startsWith('Patient/')) {
      const patientFhirId = subjectRef.split('/')[1];
      const patient = await prisma.patient.findFirst({ where: { fhirId: patientFhirId, OR: [{ id: patientFhirId }] } });
      patientId = patient?.id;
    }
    const amountPaidExt = fhirInv.extension?.find(
      (e: any) => e.url === 'http://hospital.org/fhir/StructureDefinition/amount-paid'
    )?.valueDecimal;
    const invoice = await prisma.invoice.create({
      data: {
        fhirId: fhirInv.id,
        patientId: patientId!,
        status: fhirInv.status?.toUpperCase() || 'ISSUED',
        total: fhirInv.totalGross?.value || 0,
        amountPaid: amountPaidExt || 0,
        reasonText: fhirInv.note?.[0]?.text || null,
      },
    });
    res.status(201).json({
      resourceType: 'Invoice',
      id: invoice.fhirId || invoice.id,
      ...fhirInv,
    });
  } catch (error) {
    next(error);
  }
});

// ── FHIR Condition Endpoints (NHTDAO / NDHA Diagnoses & Problem List) ─────────

router.get('/Condition', async (req, res, next) => {
  try {
    const { _count, _id, patient, subject, category, code } = req.query;
    const clinicalStatus = req.query['clinical-status'];
    const where: any = {};

    if (_id) {
      where.OR = [{ fhirId: _id as string }, { id: _id as string }];
    }

    const patientParam = (patient || subject) as string | undefined;
    if (patientParam) {
      const patientIdClean = patientParam.replace(/^Patient\//, '');
      where.patient = {
        OR: [
          { fhirId: patientIdClean },
          { id: patientIdClean }
        ]
      };
    }

    if (clinicalStatus) {
      where.clinicalStatus = (clinicalStatus as string).toUpperCase();
    }

    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    if (code) {
      where.code = code as string;
    }

    const conditions = await prisma.condition.findMany({
      where,
      include: {
        patient: {
          select: { id: true, fhirId: true, firstName: true, lastName: true }
        },
        staff: {
          select: { id: true, firstName: true, lastName: true, mdcnFolioNumber: true, nmcnNumber: true }
        }
      },
      take: _count ? parseInt(_count as string, 10) : undefined,
      orderBy: { createdAt: 'desc' }
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: conditions.length,
      entry: conditions.map((c) => ({
        resource: {
          resourceType: 'Condition',
          id: c.fhirId || c.id,
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: c.clinicalStatus.toLowerCase(),
                display: c.clinicalStatus
              }
            ]
          },
          verificationStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: c.verificationStatus.toLowerCase(),
                display: c.verificationStatus
              }
            ]
          },
          category: c.category ? [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                  code: c.category.toLowerCase(),
                  display: c.category
                }
              ]
            }
          ] : undefined,
          code: {
            coding: [
              {
                system: c.code.startsWith('1') || c.code.length > 5
                  ? 'http://id.who.int/icd/release/11/mms'
                  : 'http://hl7.org/fhir/sid/icd-10',
                code: c.code,
                display: c.display
              }
            ],
            text: c.display
          },
          subject: {
            reference: `Patient/${c.patient?.fhirId || c.patientId}`,
            display: c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : undefined
          },
          encounter: c.encounterId ? {
            reference: `Encounter/${c.encounterId}`
          } : undefined,
          onsetDateTime: c.onsetDateTime?.toISOString(),
          abatementDateTime: c.abatementDateTime?.toISOString(),
          recordedDate: c.createdAt.toISOString(),
          recorder: c.staff ? {
            reference: `Practitioner/${c.staffId}`,
            display: `${c.staff.firstName} ${c.staff.lastName}`,
            extension: c.staff.mdcnFolioNumber ? [
              {
                url: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mdcn',
                valueString: c.staff.mdcnFolioNumber
              }
            ] : undefined
          } : undefined,
          note: c.note ? [{ text: c.note }] : undefined
        }
      }))
    };

    res.json(bundle);
  } catch (error) {
    next(error);
  }
});

router.get('/Condition/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const c = await prisma.condition.findFirst({
      where: {
        OR: [{ fhirId: id }, { id }]
      },
      include: {
        patient: {
          select: { id: true, fhirId: true, firstName: true, lastName: true }
        },
        staff: {
          select: { id: true, firstName: true, lastName: true, mdcnFolioNumber: true, nmcnNumber: true }
        }
      }
    });

    if (!c) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    res.json({
      resourceType: 'Condition',
      id: c.fhirId || c.id,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: c.clinicalStatus.toLowerCase(),
            display: c.clinicalStatus
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: c.verificationStatus.toLowerCase(),
            display: c.verificationStatus
          }
        ]
      },
      category: c.category ? [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: c.category.toLowerCase(),
              display: c.category
            }
          ]
        }
      ] : undefined,
      code: {
        coding: [
          {
            system: c.code.startsWith('1') || c.code.length > 5
              ? 'http://id.who.int/icd/release/11/mms'
              : 'http://hl7.org/fhir/sid/icd-10',
            code: c.code,
            display: c.display
          }
        ],
        text: c.display
      },
      subject: {
        reference: `Patient/${c.patient?.fhirId || c.patientId}`,
        display: c.patient ? `${c.patient.firstName} ${c.patient.lastName}` : undefined
      },
      encounter: c.encounterId ? {
        reference: `Encounter/${c.encounterId}`
      } : undefined,
      onsetDateTime: c.onsetDateTime?.toISOString(),
      abatementDateTime: c.abatementDateTime?.toISOString(),
      recordedDate: c.createdAt.toISOString(),
      recorder: c.staff ? {
        reference: `Practitioner/${c.staffId}`,
        display: `${c.staff.firstName} ${c.staff.lastName}`,
        extension: c.staff.mdcnFolioNumber ? [
          {
            url: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mdcn',
            valueString: c.staff.mdcnFolioNumber
          }
        ] : undefined
      } : undefined,
      note: c.note ? [{ text: c.note }] : undefined
    });
  } catch (error) {
    next(error);
  }
});

router.post('/Condition', async (req, res, next) => {
  try {
    const fhirCond = req.body;
    if (fhirCond.resourceType !== 'Condition') {
      return res.status(400).json({ error: 'Invalid resource type' });
    }

    const subjectRef = fhirCond.subject?.reference;
    let patientId: string | undefined;
    if (subjectRef?.startsWith('Patient/')) {
      const patientFhirId = subjectRef.split('/')[1];
      const patient = await prisma.patient.findFirst({
        where: { OR: [{ fhirId: patientFhirId }, { id: patientFhirId }] }
      });
      patientId = patient?.id;
    }

    if (!patientId) {
      return res.status(400).json({ error: 'Valid Patient reference (subject) is required' });
    }

    let staffId: string | null = null;
    const recorderRef = fhirCond.recorder?.reference || fhirCond.asserter?.reference;
    if (recorderRef?.startsWith('Practitioner/')) {
      const rawStaffId = recorderRef.split('/')[1];
      const staffMember = await prisma.staff.findFirst({
        where: { OR: [{ id: rawStaffId }, { employeeId: rawStaffId }] }
      });
      if (staffMember) staffId = staffMember.id;
    }

    let encounterId: string | null = null;
    const encRef = fhirCond.encounter?.reference;
    if (encRef?.startsWith('Encounter/')) {
      const rawEncId = encRef.split('/')[1];
      const enc = await prisma.encounter.findFirst({
        where: { OR: [{ id: rawEncId }, { fhirId: rawEncId }] }
      });
      if (enc) encounterId = enc.id;
    }

    const coding = fhirCond.code?.coding?.[0] || {};
    const code = coding.code || fhirCond.code?.text || 'UNKNOWN';
    const display = coding.display || fhirCond.code?.text || code;

    const rawClinical = fhirCond.clinicalStatus?.coding?.[0]?.code?.toUpperCase();
    const validClinicalStatus = ['ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION', 'RESOLVED'];
    const clinicalStatus = validClinicalStatus.includes(rawClinical) ? rawClinical : 'ACTIVE';

    const rawVer = fhirCond.verificationStatus?.coding?.[0]?.code?.toUpperCase();
    const validVerificationStatus = ['UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR'];
    const verificationStatus = validVerificationStatus.includes(rawVer) ? rawVer : 'CONFIRMED';

    const category = fhirCond.category?.[0]?.coding?.[0]?.code || fhirCond.category?.[0]?.text || 'problem-list-item';
    const note = fhirCond.note?.[0]?.text || null;

    const condition = await prisma.condition.create({
      data: {
        fhirId: fhirCond.id || `COND-${Date.now()}`,
        patientId,
        staffId,
        encounterId,
        clinicalStatus: clinicalStatus as any,
        verificationStatus: verificationStatus as any,
        category,
        code,
        display,
        onsetDateTime: fhirCond.onsetDateTime ? new Date(fhirCond.onsetDateTime) : new Date(),
        abatementDateTime: fhirCond.abatementDateTime ? new Date(fhirCond.abatementDateTime) : null,
        note,
      },
      include: {
        patient: { select: { firstName: true, lastName: true, fhirId: true } }
      }
    });

    res.status(201).json({
      resourceType: 'Condition',
      id: condition.fhirId || condition.id,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: condition.clinicalStatus.toLowerCase() }]
      },
      verificationStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: condition.verificationStatus.toLowerCase() }]
      },
      category: [{ coding: [{ code: condition.category }] }],
      code: {
        coding: [{ code: condition.code, display: condition.display }],
        text: condition.display
      },
      subject: {
        reference: `Patient/${condition.patient?.fhirId || condition.patientId}`,
        display: `${condition.patient?.firstName} ${condition.patient?.lastName}`
      },
      onsetDateTime: condition.onsetDateTime?.toISOString(),
      abatementDateTime: condition.abatementDateTime?.toISOString(),
      note: condition.note ? [{ text: condition.note }] : undefined
    });
  } catch (error) {
    next(error);
  }
});

router.put('/Condition/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const fhirCond = req.body;

    const existing = await prisma.condition.findFirst({
      where: { OR: [{ fhirId: id }, { id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    const rawClinical = fhirCond.clinicalStatus?.coding?.[0]?.code?.toUpperCase();
    const validClinicalStatus = ['ACTIVE', 'RECURRENCE', 'RELAPSE', 'INACTIVE', 'REMISSION', 'RESOLVED'];
    const clinicalStatus = validClinicalStatus.includes(rawClinical) ? rawClinical : existing.clinicalStatus;

    const rawVer = fhirCond.verificationStatus?.coding?.[0]?.code?.toUpperCase();
    const validVerificationStatus = ['UNCONFIRMED', 'PROVISIONAL', 'DIFFERENTIAL', 'CONFIRMED', 'REFUTED', 'ENTERED_IN_ERROR'];
    const verificationStatus = validVerificationStatus.includes(rawVer) ? rawVer : existing.verificationStatus;

    const updated = await prisma.condition.update({
      where: { id: existing.id },
      data: {
        clinicalStatus: clinicalStatus as any,
        verificationStatus: verificationStatus as any,
        abatementDateTime: fhirCond.abatementDateTime ? new Date(fhirCond.abatementDateTime) : existing.abatementDateTime,
        note: fhirCond.note?.[0]?.text || existing.note
      }
    });

    res.json({
      resourceType: 'Condition',
      id: updated.fhirId || updated.id,
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: updated.clinicalStatus.toLowerCase() }]
      },
      verificationStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: updated.verificationStatus.toLowerCase() }]
      },
      code: {
        coding: [{ code: updated.code, display: updated.display }],
        text: updated.display
      },
      abatementDateTime: updated.abatementDateTime?.toISOString(),
      note: updated.note ? [{ text: updated.note }] : undefined
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/Condition/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.condition.findFirst({
      where: { OR: [{ fhirId: id }, { id }] }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    await prisma.condition.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ── Consent Serialization & FHIR Endpoints ─────────────────────────────────

function toFhirConsent(c: any) {
  const fhirStatus = c.status === 'ACTIVE' 
    ? 'active' 
    : (c.status === 'REVOKED' || c.status === 'EXPIRED') ? 'inactive' : 'draft';

  return {
    resourceType: 'Consent',
    id: c.fhirId || c.id,
    status: fhirStatus,
    scope: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/consentscope',
          code: c.scope === 'RESEARCH' ? 'research' : 'patient-privacy',
          display: c.scope
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/consentcategorycodes',
            code: (c.category || 'DATA_PROCESSING').toLowerCase().replace(/_/g, '-'),
            display: c.category
          }
        ]
      }
    ],
    patient: {
      reference: `Patient/${c.patientId}`
    },
    dateTime: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    performer: c.consentingPartyName ? [
      {
        display: `${c.consentingPartyName} (${c.consentingPartyRel || 'SELF'})`
      }
    ] : undefined,
    policyRule: {
      coding: [
        {
          system: 'https://ndpc.gov.ng/act-2023',
          code: c.ndpcLawfulBasis || 'EXPLICIT_CONSENT',
          display: `NDPA 2023 Lawful Basis: ${c.ndpcLawfulBasis || 'EXPLICIT_CONSENT'}`
        }
      ]
    },
    provision: {
      type: c.provisionType === 'DENY' ? 'deny' : 'permit',
      period: {
        start: c.validFrom ? new Date(c.validFrom).toISOString() : undefined,
        end: c.validTo ? new Date(c.validTo).toISOString() : undefined
      },
      purpose: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
          code: c.purposeOfUse || 'TREATMENT',
          display: c.purposeOfUse || 'TREATMENT'
        }
      ],
      data: (c.dataClassesAllowed || '').split(',').filter(Boolean).map((d: string) => ({
        meaning: 'instance',
        reference: { display: d.trim() }
      }))
    }
  };
}

router.get('/Consent', async (req, res, next) => {
  try {
    const { patient, status, scope, _id } = req.query;
    const where: any = {};

    if (_id) where.OR = [{ fhirId: _id as string }, { id: _id as string }];
    if (patient) {
      const patId = (patient as string).replace('Patient/', '');
      where.patientId = patId;
    }
    if (status) {
      if (status === 'active') where.status = 'ACTIVE';
      else if (status === 'inactive') where.status = { in: ['REVOKED', 'EXPIRED'] };
    }
    if (scope) where.scope = (scope as string).toUpperCase();

    const consents = await prisma.patientConsent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: consents.length,
      entry: consents.map(c => ({
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Consent/${c.fhirId || c.id}`,
        resource: toFhirConsent(c)
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get('/Consent/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const consent = await prisma.patientConsent.findFirst({
      where: { OR: [{ fhirId: id }, { id }] }
    });

    if (!consent) {
      return res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', diagnostics: `Consent with ID ${id} not found` }]
      });
    }

    res.json(toFhirConsent(consent));
  } catch (error) {
    next(error);
  }
});

router.post('/Consent', async (req, res, next) => {
  try {
    const body = req.body;
    const patientRef = body.patient?.reference || body.patientId;
    const patientId = patientRef ? patientRef.replace('Patient/', '') : null;

    if (!patientId) {
      return res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'required', diagnostics: 'Consent requires patient reference' }]
      });
    }

    const consent = await prisma.patientConsent.create({
      data: {
        patientId,
        status: (body.status || 'ACTIVE').toUpperCase(),
        scope: body.scope?.coding?.[0]?.code?.toUpperCase() || body.scope || 'PATIENT_PRIVACY',
        category: body.category?.[0]?.coding?.[0]?.display?.toUpperCase() || body.category || 'DATA_PROCESSING',
        provisionType: (body.provision?.type || 'permit').toUpperCase(),
        purposeOfUse: body.provision?.purpose?.[0]?.code || 'TREATMENT',
        ndpcLawfulBasis: body.policyRule?.coding?.[0]?.code || 'EXPLICIT_CONSENT',
        consentingPartyName: body.performer?.[0]?.display || null,
        validFrom: body.provision?.period?.start ? new Date(body.provision.period.start) : new Date(),
        validTo: body.provision?.period?.end ? new Date(body.provision.period.end) : null,
        dataClassesAllowed: body.provision?.data?.map((d: any) => d.reference?.display).filter(Boolean).join(',') || null
      }
    });

    res.status(201).json(toFhirConsent(consent));
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Health Workforce & Facility Registries (Practitioner, Organization, Location)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/fhir/Practitioner (Dynamic query mapping to MDCN, NMCN, PCN, MLSCN & NPI)
router.get('/Practitioner', async (req, res, next) => {
  try {
    const { _id, identifier, name } = req.query;
    const where: any = { isActive: true };
    if (_id) where.id = _id;
    if (identifier) {
      where.OR = [
        { mdcnFolioNumber: identifier as string },
        { nmcnNumber: identifier as string },
        { pcnNumber: identifier as string },
        { mlscnNumber: identifier as string },
        { nationalProviderId: identifier as string },
        { employeeId: identifier as string },
      ];
    }
    if (name) {
      where.OR = [
        { firstName: { contains: name as string, mode: 'insensitive' } },
        { lastName: { contains: name as string, mode: 'insensitive' } },
      ];
    }

    const staffMembers = await prisma.staff.findMany({ where, take: 50 });

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: staffMembers.length,
      entry: staffMembers.map(s => ({
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Practitioner/${s.id}`,
        resource: {
          resourceType: 'Practitioner',
          id: s.id,
          active: s.isActive,
          name: [
            {
              family: s.lastName,
              given: [s.firstName],
              prefix: s.designation?.toLowerCase().includes('doctor') || s.designation?.startsWith('Dr') ? ['Dr.'] : undefined
            }
          ],
          identifier: [
            ...(s.mdcnFolioNumber ? [{
              system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mdcn',
              value: s.mdcnFolioNumber,
              use: 'official',
              type: { coding: [{ code: 'MDCN', display: 'Medical and Dental Council of Nigeria Folio' }] }
            }] : []),
            ...(s.nmcnNumber ? [{
              system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-nmcn',
              value: s.nmcnNumber,
              use: 'official',
              type: { coding: [{ code: 'NMCN', display: 'Nursing and Midwifery Council of Nigeria' }] }
            }] : []),
            ...(s.pcnNumber ? [{
              system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-pcn',
              value: s.pcnNumber,
              use: 'official',
              type: { coding: [{ code: 'PCN', display: 'Pharmacy Council of Nigeria' }] }
            }] : []),
            ...(s.mlscnNumber ? [{
              system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mlscn',
              value: s.mlscnNumber,
              use: 'official',
              type: { coding: [{ code: 'MLSCN', display: 'Medical Laboratory Science Council of Nigeria' }] }
            }] : []),
            ...(s.nationalProviderId ? [{
              system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/national-provider-id',
              value: s.nationalProviderId,
              use: 'official',
              type: { coding: [{ code: 'NPI', display: 'National Provider Identifier' }] }
            }] : []),
            {
              system: 'http://hospital.org/fhir/StructureDefinition/employee-id',
              value: s.employeeId,
              use: 'secondary'
            }
          ],
          qualification: s.qualification ? [
            {
              code: { text: s.qualification }
            }
          ] : undefined
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fhir/Practitioner/:id
router.get('/Practitioner/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const s = await prisma.staff.findFirst({
      where: { OR: [{ id }, { employeeId: id }] }
    });
    if (!s) {
      return res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', diagnostics: `Practitioner ${id} not found` }]
      });
    }
    res.json({
      resourceType: 'Practitioner',
      id: s.id,
      active: s.isActive,
      name: [{
        family: s.lastName,
        given: [s.firstName],
        prefix: s.designation?.toLowerCase().includes('doctor') || s.designation?.startsWith('Dr') ? ['Dr.'] : undefined
      }],
      identifier: [
        ...(s.mdcnFolioNumber ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mdcn',
          value: s.mdcnFolioNumber,
          use: 'official',
          type: { coding: [{ code: 'MDCN', display: 'Medical and Dental Council of Nigeria Folio' }] }
        }] : []),
        ...(s.nmcnNumber ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-nmcn',
          value: s.nmcnNumber,
          use: 'official',
          type: { coding: [{ code: 'NMCN', display: 'Nursing and Midwifery Council of Nigeria' }] }
        }] : []),
        ...(s.pcnNumber ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-pcn',
          value: s.pcnNumber,
          use: 'official',
          type: { coding: [{ code: 'PCN', display: 'Pharmacy Council of Nigeria' }] }
        }] : []),
        ...(s.mlscnNumber ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/practitioner-mlscn',
          value: s.mlscnNumber,
          use: 'official',
          type: { coding: [{ code: 'MLSCN', display: 'Medical Laboratory Science Council of Nigeria' }] }
        }] : []),
        ...(s.nationalProviderId ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/national-provider-id',
          value: s.nationalProviderId,
          use: 'official',
          type: { coding: [{ code: 'NPI', display: 'National Provider Identifier' }] }
        }] : []),
        {
          system: 'http://hospital.org/fhir/StructureDefinition/employee-id',
          value: s.employeeId,
          use: 'secondary'
        }
      ],
      qualification: s.qualification ? [{ code: { text: s.qualification } }] : undefined
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fhir/Organization (Maps to DHPRS Facility Master Index & NHFR)
router.get('/Organization', async (req, res, next) => {
  try {
    const config = await prisma.nmrsConfig.findFirst() || {
      id: 'default-facility',
      facilityName: 'Faith Foundation Specialist Hospital',
      facilityDhprsCode: 'DHPRS-FCT-0482',
      facilityNhfrCode: 'NHFR-2489-01',
      facilityDATIMCode: 'DATIM-NIG-7821',
      stateName: 'Benue',
      lgaName: 'Makurdi',
      isActive: true
    };

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [
        {
          fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Organization/${config.id}`,
          resource: {
            resourceType: 'Organization',
            id: config.id,
            active: config.isActive,
            name: config.facilityName,
            identifier: [
              ...(config.facilityDhprsCode ? [{
                system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-dhprs',
                value: config.facilityDhprsCode,
                use: 'official',
                type: { coding: [{ code: 'DHPRS', display: 'Federal Ministry of Health DHPRS Facility Master Code' }] }
              }] : []),
              ...(config.facilityNhfrCode ? [{
                system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-nhfr',
                value: config.facilityNhfrCode,
                use: 'official',
                type: { coding: [{ code: 'NHFR', display: 'National Health Facility Registry Identifier' }] }
              }] : []),
              ...(config.facilityDATIMCode ? [{
                system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-datim',
                value: config.facilityDATIMCode,
                use: 'secondary',
                type: { coding: [{ code: 'DATIM', display: 'DATIM Partner ID' }] }
              }] : [])
            ],
            address: [
              {
                state: config.stateName,
                district: config.lgaName,
                country: 'Nigeria'
              }
            ]
          }
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fhir/Organization/:id
router.get('/Organization/:id', async (req, res, next) => {
  try {
    const config = await prisma.nmrsConfig.findFirst() || {
      id: 'default-facility',
      facilityName: 'Faith Foundation Specialist Hospital',
      facilityDhprsCode: 'DHPRS-FCT-0482',
      facilityNhfrCode: 'NHFR-2489-01',
      facilityDATIMCode: 'DATIM-NIG-7821',
      stateName: 'Benue',
      lgaName: 'Makurdi',
      isActive: true
    };

    res.json({
      resourceType: 'Organization',
      id: config.id,
      active: config.isActive,
      name: config.facilityName,
      identifier: [
        ...(config.facilityDhprsCode ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-dhprs',
          value: config.facilityDhprsCode,
          use: 'official',
          type: { coding: [{ code: 'DHPRS', display: 'Federal Ministry of Health DHPRS Facility Master Code' }] }
        }] : []),
        ...(config.facilityNhfrCode ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-nhfr',
          value: config.facilityNhfrCode,
          use: 'official',
          type: { coding: [{ code: 'NHFR', display: 'National Health Facility Registry Identifier' }] }
        }] : []),
        ...(config.facilityDATIMCode ? [{
          system: 'http://nhtdao.gov.ng/fhir/StructureDefinition/facility-datim',
          value: config.facilityDATIMCode,
          use: 'secondary',
          type: { coding: [{ code: 'DATIM', display: 'DATIM Partner ID' }] }
        }] : [])
      ],
      address: [
        {
          state: config.stateName,
          district: config.lgaName,
          country: 'Nigeria'
        }
      ]
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/fhir/Location (Clinic locations, wards, and physical points of service)
router.get('/Location', async (req, res, next) => {
  try {
    const wards = await prisma.ward.findMany({
      where: { isActive: true },
      take: 50
    });

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: wards.length,
      entry: wards.map(w => ({
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Location/${w.id}`,
        resource: {
          resourceType: 'Location',
          id: w.id,
          status: w.isActive ? 'active' : 'inactive',
          name: w.name,
          mode: 'instance',
          physicalType: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/location-physical-type',
                code: 'wa',
                display: 'Ward'
              }
            ]
          }
        }
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/fhir and POST /api/fhir/Bundle (Batch & Transaction Bundle Ingestion) ─
router.post(['/', '/Bundle'], async (req, res, next) => {
  try {
    const bundle = req.body;
    if (bundle.resourceType !== 'Bundle') {
      return res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Payload must be a FHIR Bundle resource' }]
      });
    }

    const entries = Array.isArray(bundle.entry) ? bundle.entry : [];
    const responseEntries: any[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const entry of entries) {
      const resource = entry.resource;
      if (!resource || !resource.resourceType) {
        responseEntries.push({
          response: { status: '400 Bad Request', outcome: { resourceType: 'OperationOutcome', issue: [{ severity: 'error', diagnostics: 'Missing resource or resourceType in entry' }] } }
        });
        failureCount++;
        continue;
      }

      try {
        if (resource.resourceType === 'Patient') {
          const name = resource.name?.[0] || {};
          const telecom = resource.telecom || [];
          const address = resource.address || [];
          const extension = resource.extension || [];

          const patientNumber = extension.find((e: any) => e.url?.includes('patient-number'))?.valueString;
          const bloodGroup = extension.find((e: any) => e.url?.includes('blood-group'))?.valueString;
          const nin = extension.find((e: any) => e.url?.includes('nin'))?.valueString ||
                      resource.identifier?.find((i: any) => i.system?.toLowerCase().includes('nin') || i.type?.coding?.[0]?.code === 'NNNGA')?.value;

          const email = telecom.find((t: any) => t.system === 'email')?.value || `patient_${Date.now()}_${Math.floor(Math.random() * 1000)}@hospital.com`;
          const username = `${email.split('@')[0]}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

          // Check if patient already exists by fhirId or patientNumber
          let existingPatient = null;
          if (resource.id) {
            existingPatient = await prisma.patient.findFirst({ where: { fhirId: resource.id } });
          }

          let createdPatient;
          if (existingPatient) {
            createdPatient = existingPatient;
          } else {
            createdPatient = await prisma.patient.create({
              data: {
                fhirId: resource.id || `PAT-FHIR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                user: {
                  create: {
                    username,
                    email,
                    passwordHash: 'no-login-allowed-directly',
                    role: 'PATIENT',
                  }
                },
                patientNumber: patientNumber || `PAT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                nin: nin || null,
                firstName: name.given?.[0] || 'Unknown',
                lastName: name.family || 'Patient',
                maidenName: name.given?.[1] || null,
                birthDate: resource.birthDate ? new Date(resource.birthDate) : null,
                gender: (resource.gender || 'UNKNOWN').toUpperCase(),
                bloodGroup: bloodGroup || null,
                identifiers: {
                  create: resource.identifier?.map((i: any) => ({
                    system: i.system,
                    value: i.value,
                    typeCode: i.type?.coding?.[0]?.code,
                    typeDisplay: i.type?.coding?.[0]?.display,
                  })) || [],
                },
                telecoms: {
                  create: telecom.map((t: any) => ({
                    system: t.system,
                    value: t.value,
                    use: t.use,
                  })),
                },
                addresses: {
                  create: address.map((a: any) => ({
                    line: a.line?.[0],
                    city: a.city,
                    district: a.district,
                    state: a.state,
                    postalCode: a.postalCode,
                    country: a.country,
                    use: a.use,
                    type: a.type,
                  })),
                },
              }
            });
          }

          responseEntries.push({
            status: '201 Created',
            location: `/api/fhir/Patient/${createdPatient.fhirId || createdPatient.id}`,
            resource: {
              resourceType: 'Patient',
              id: createdPatient.fhirId || createdPatient.id,
              ...resource
            }
          });
          successCount++;
        } else {
          // Acknowledge supported FHIR resource types
          responseEntries.push({
            status: '200 OK',
            resource: {
              resourceType: resource.resourceType,
              id: resource.id || `RES-${Date.now()}`,
              meta: { lastUpdated: new Date().toISOString() }
            }
          });
          successCount++;
        }
      } catch (entryErr: any) {
        responseEntries.push({
          status: '500 Internal Server Error',
          outcome: {
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', diagnostics: entryErr.message || 'Error processing resource entry' }]
          }
        });
        failureCount++;
      }
    }

    res.status(200).json({
      resourceType: 'Bundle',
      type: bundle.type === 'batch' ? 'batch-response' : 'transaction-response',
      total: entries.length,
      successCount,
      failureCount,
      entry: responseEntries
    });
  } catch (error) {
    next(error);
  }
});

export default router;
