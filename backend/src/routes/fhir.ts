import { Router } from 'express';


const router = Router();
import { prisma } from '../prisma.js';

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
          identifier: p.identifiers.map((i) => ({
            system: i.system,
            value: i.value,
            type: { coding: [{ code: i.typeCode, display: i.typeDisplay }] },
          })),
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
      identifier: patient.identifiers.map((i) => ({
        system: i.system,
        value: i.value,
        type: { coding: [{ code: i.typeCode, display: i.typeDisplay }] },
      })),
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

export default router;
