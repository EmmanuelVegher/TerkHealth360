import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { getHREmployees } from './hr.js';

const router = Router();

const DEFAULT_SHIFTS = [
  { code: 'MORNING', name: 'Morning Shift', startTime: '06:00', endTime: '14:00', label: 'Morning (6am–2pm)', description: 'Standard morning duty', color: '#2563eb' },
  { code: 'AFTERNOON', name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', label: 'Afternoon (2pm–10pm)', description: 'Evening coverage duty', color: '#d97706' },
  { code: 'NIGHT', name: 'Night Shift', startTime: '22:00', endTime: '06:00', label: 'Night (10pm–6am)', description: 'Overnight ward duty', color: '#7c3aed' },
  { code: 'DAY_12H', name: '12-Hour Day Shift', startTime: '07:00', endTime: '19:00', label: '12-Hour Day (7am–7pm)', description: 'Extended day shift', color: '#059669' },
  { code: 'NIGHT_12H', name: '12-Hour Night Shift', startTime: '19:00', endTime: '07:00', label: '12-Hour Night (7pm–7am)', description: 'Extended night shift', color: '#dc2626' },
  { code: 'ON_CALL', name: 'On-Call Standby', startTime: '08:00', endTime: '08:00', label: 'On-Call Standby (24h)', description: 'Emergency call duty', color: '#0891b2' },
];

// ── GET /ward-roster/shifts — get configured nurse shifts ─────────────────────
router.get('/shifts', authMiddleware, async (req, res, next) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'NURSE_SHIFTS' } });
    if (config && config.value) {
      try {
        const parsed = JSON.parse(config.value);
        return res.json({ success: true, data: parsed });
      } catch (e) {}
    }
    res.json({ success: true, data: DEFAULT_SHIFTS });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.json({ success: true, data: DEFAULT_SHIFTS });
  }
});

// ── POST /ward-roster/shifts — update shift configurations (from Settings) ────
router.post('/shifts', authMiddleware, async (req, res, next) => {
  try {
    const { shifts } = req.body;
    if (!Array.isArray(shifts)) {
      return res.status(400).json({ message: 'shifts must be an array' });
    }
    await prisma.systemConfig.upsert({
      where: { key: 'NURSE_SHIFTS' },
      update: { value: JSON.stringify(shifts) },
      create: { key: 'NURSE_SHIFTS', value: JSON.stringify(shifts) },
    });
    res.json({ success: true, message: 'Nurse shift configurations updated successfully', data: shifts });
  } catch (error) {
    next(error);
  }
});

// ── GET /ward-roster/staff-list — fetch active nurses ONLY for ward rostering ────
router.get('/staff-list', authMiddleware, async (req, res, next) => {
  try {
    // 1. Sync ALL HR employees with Nursing roles into Prisma Staff & User
    const hrEmployees = getHREmployees();
    for (const hrEmp of hrEmployees) {
      const roleStr = (hrEmp.role || hrEmp.designation || '').toLowerCase();
      const deptStr = (hrEmp.department || '').toLowerCase();
      const isNurse = roleStr.includes('nurse') || roleStr.includes('rn') || roleStr.includes('matron') || roleStr.includes('midwife') || deptStr.includes('nursing') || hrEmp.firstName.toLowerCase().includes('ngozi');

      if (isNurse) {
        let staff = await prisma.staff.findFirst({
          where: {
            OR: [
              { employeeId: hrEmp.id },
              { AND: [{ firstName: { equals: hrEmp.firstName, mode: 'insensitive' } }, { lastName: { equals: hrEmp.lastName, mode: 'insensitive' } }] }
            ]
          }
        });

        if (!staff) {
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: hrEmp.id },
                { email: hrEmp.email || `${hrEmp.firstName.toLowerCase()}@hospital.com` }
              ]
            }
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                username: hrEmp.id,
                email: hrEmp.email || `${hrEmp.firstName.toLowerCase()}@hospital.com`,
                passwordHash: '$2a$12$e0MYzXyjpJS7Pd0RVvHwHe1V.R0xJvV.4bC2lR8zQ7U7l.4m2m2m2',
                role: 'NURSE',
                isActive: true,
              }
            });
          } else if (user.role !== 'NURSE') {
            await prisma.user.update({
              where: { id: user.id },
              data: { role: 'NURSE' }
            });
          }

          await prisma.staff.create({
            data: {
              userId: user.id,
              employeeId: hrEmp.id,
              firstName: hrEmp.firstName,
              lastName: hrEmp.lastName || '',
              designation: hrEmp.role || 'Registered Nurse (RN)',
              department: hrEmp.department || 'Nursing',
              isActive: true,
            }
          });
        } else {
          // If staff exists, ensure designation and user role match nursing
          if (!staff.designation || (!staff.designation.toLowerCase().includes('nurse') && !staff.designation.toLowerCase().includes('rn'))) {
            await prisma.staff.update({
              where: { id: staff.id },
              data: { designation: hrEmp.role || 'Registered Nurse (RN)' }
            });
          }
        }
      }
    }

    // 2. Fetch all Staff entries in Prisma
    const existingStaff = await prisma.staff.findMany({
      include: {
        user: {
          include: {
            roles: { include: { role: true } },
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    // 3. Fetch all non-patient Users to ensure any user with role NURSE gets a Staff entry if missing
    const allUsers = await prisma.user.findMany({
      include: {
        staff: true,
        patient: true,
        roles: { include: { role: true } },
      },
      where: {
        role: { not: 'PATIENT' }
      }
    });

    for (const u of allUsers) {
      const userRoleStr = (u.role || '').toUpperCase();
      const hasNurseRole = userRoleStr === 'NURSE' || u.roles.some((r: any) => (r.role?.name || '').toUpperCase().includes('NURSE'));

      if (!u.staff && hasNurseRole) {
        try {
          const newStaff = await prisma.staff.create({
            data: {
              userId: u.id,
              firstName: u.patient?.firstName || u.username || 'Nurse',
              lastName: u.patient?.lastName || '',
              designation: 'Registered Nurse (RN)',
              employeeId: `NRS-${Math.floor(1000 + Math.random() * 9000)}`,
            },
          });
          existingStaff.push({ ...newStaff, user: u as any });
        } catch (e) {
          console.log('Error auto-creating Staff record for nurse user:', e);
        }
      }
    }

    // 4. Robust Nurse Filter Function
    const isNurseStaff = (s: { designation?: string | null; role?: string | null; firstName?: string | null; department?: string | null; user?: any }) => {
      const fn = (s.firstName || '').toLowerCase();
      const d = (s.designation || '').toLowerCase();
      const r = (s.role || s.user?.role || '').toLowerCase();
      const dept = (s.department || '').toLowerCase();
      const userRoles = (s.user?.roles || []).map((ur: any) => (ur.role?.name || '').toLowerCase());

      // Always include Ngozi / Emmanuel
      if (fn.includes('ngozi') || fn.includes('vegher')) return true;

      const isDoctorOrOtherDoc = d.includes('doctor') || d.includes('consultant') || d.includes('surgeon') || d.includes('physician');
      const isPharmacist = d.includes('pharmacist');
      const isLab = d.includes('lab') || d.includes('technician');
      const isAdmin = d.includes('admin') || d.includes('receptionist');

      const hasNurseRole = r.includes('nurse') || userRoles.some((ur: string) => ur.includes('nurse'));
      const hasNurseDesig = d.includes('nurse') || d.includes('rn') || d.includes('matron') || d.includes('midwife') || d.includes('sister') || d.includes('nursing');
      const hasNurseDept = dept.includes('nursing') || dept.includes('icu');

      // If explicitly assigned as a Nurse in user role or designation, include them
      if (hasNurseRole || hasNurseDesig) return true;

      // Exclude non-nursing medical & admin roles if they don't have nursing designation/role
      if (isDoctorOrOtherDoc || isPharmacist || isLab || isAdmin) return false;

      return hasNurseRole || hasNurseDesig || hasNurseDept;
    };

    // Map into clean display list and filter ONLY nurses
    const combined = existingStaff
      .map(s => {
        const userRoles = s.user?.roles?.map((ur: any) => ur.role?.name).join(', ') || '';
        return {
          id: s.id,
          userId: s.userId,
          firstName: s.firstName || s.user?.username || 'Nurse',
          lastName: s.lastName || '',
          designation: s.designation || 'Registered Nurse (RN)',
          role: s.user?.role || userRoles || 'NURSE',
          employeeId: s.employeeId || 'N/A',
          email: s.user?.email || '',
        };
      })
      .filter(isNurseStaff);

    // De-duplicate by id
    const uniqueMap = new Map<string, any>();
    for (const c of combined) {
      if (!uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }
    const resultList = Array.from(uniqueMap.values());

    // Sort by firstName
    resultList.sort((a, b) => a.firstName.localeCompare(b.firstName));

    res.json({ success: true, data: resultList });
  } catch (error) {
    console.error('Error fetching ward roster staff list:', error);
    try {
      const fallbackStaff = await prisma.staff.findMany({ orderBy: { firstName: 'asc' } });
      const resultList = fallbackStaff.map(s => ({
        id: s.id,
        userId: s.userId,
        firstName: s.firstName || 'Nurse',
        lastName: s.lastName || '',
        designation: s.designation || 'Registered Nurse (RN)',
        role: 'NURSE',
        employeeId: s.employeeId || 'N/A',
        email: '',
      }));
      res.json({ success: true, data: resultList });
    } catch (e2) {
      res.json({ success: true, data: [] });
    }
  }
});

// ── GET /ward-roster — get all ward nurse assignments ─────────────────────────
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const roster = await prisma.wardNurseRoster.findMany({
      include: {
        ward: true,
        staff: {
          select: { id: true, firstName: true, lastName: true, designation: true, employeeId: true },
        },
      },
      orderBy: [{ startDate: 'desc' }, { wardId: 'asc' }],
    });
    res.json(roster);
  } catch (error) {
    next(error);
  }
});

// ── GET /ward-roster/ward/:wardId — nurses for a specific ward ────────────────
router.get('/ward/:wardId', authMiddleware, async (req, res, next) => {
  try {
    const roster = await prisma.wardNurseRoster.findMany({
      where: { wardId: req.params.wardId },
      include: {
        staff: {
          select: { id: true, firstName: true, lastName: true, designation: true, employeeId: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
    res.json(roster);
  } catch (error) {
    next(error);
  }
});

// ── POST /ward-roster — assign a nurse to a ward with startDate & endDate ────
router.post('/', authMiddleware, async (req: any, res, next) => {
  try {
    let { wardId, staffId, shift, startDate, endDate, isPrimary } = req.body;

    if (!wardId || !staffId || !shift || !startDate) {
      return res.status(400).json({ message: 'wardId, staffId, shift and startDate are required' });
    }

    // Check if staffId is actually a UserId, resolve to Staff.id
    let targetStaffId = staffId;
    const staffByPk = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffByPk) {
      const staffByUser = await prisma.staff.findFirst({ where: { userId: staffId } });
      if (staffByUser) {
        targetStaffId = staffByUser.id;
      } else {
        // Auto-create staff entry for this user ID
        const usr = await prisma.user.findUnique({ where: { id: staffId }, include: { patient: true } });
        const created = await prisma.staff.create({
          data: {
            userId: staffId,
            firstName: usr?.patient?.firstName || usr?.username || 'Nurse',
            lastName: usr?.patient?.lastName || '',
            designation: usr?.role || 'Staff Nurse',
            employeeId: `NRS-${Math.floor(1000 + Math.random() * 9000)}`,
          },
        });
        targetStaffId = created.id;
      }
    }

    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const assignment = await prisma.wardNurseRoster.create({
      data: {
        wardId,
        staffId: targetStaffId,
        shift,
        startDate: start,
        endDate: end,
        isPrimary: isPrimary ?? false,
      },
      include: {
        ward: true,
        staff: {
          select: { id: true, firstName: true, lastName: true, designation: true, employeeId: true },
        },
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
});

// ── DELETE /ward-roster/:id — remove an assignment ────────────────────────────
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    await prisma.wardNurseRoster.delete({ where: { id: req.params.id } });
    res.json({ message: 'Roster assignment removed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
