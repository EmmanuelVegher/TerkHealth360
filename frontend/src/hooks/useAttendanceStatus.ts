import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export interface AttendanceStatusData {
  isClockedIn: boolean;
  clockInTime: string | null;
  clockInIso: string | null;
  clockInDate: string | null;
  clockInDateFormatted?: string | null;
  isMultiDay?: boolean;
  elapsedStr: string;
  remainingStr: string;
  isOvertime: boolean;
  percent: number;
  shiftName: string;
  dutyStation: string;
  todayLog: any | null;
  activeShift: any | null;
  scheduledShift: any | null;
  isOnApprovedLeave?: boolean;
  approvedLeave?: any | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
}

export const ATTENDANCE_EVENT = 'hospital_attendance_changed';

export function useAttendanceStatus(): AttendanceStatusData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Ticking 1s clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safeStr = (val: any, fallback = ''): string => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    if (typeof val === 'object') {
      return val.name || val.label || val.title || val.code || val.shiftName || fallback;
    }
    return String(val);
  };

  const userKey = useMemo(() => {
    return user?.id || user?.staffId || (user as any)?.empId || user?.username || 'user';
  }, [user]);

  const storageKey = useMemo(() => `hospital_clockin_${userKey}`, [userKey]);

  // Read local storage initial state
  const readLocalClock = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  }, [storageKey]);

  const [localClock, setLocalClock] = useState<{
    clockInIso?: string;
    clockInTime?: string;
    date?: string;
    isClockedIn?: boolean;
    shiftName?: string;
    location?: string;
  } | null>(readLocalClock);

  const [serverState, setServerState] = useState<{
    isClockedIn: boolean;
    activeLog: any | null;
    todayLog: any | null;
    activeShift: any | null;
    scheduledShift: any | null;
    isOnApprovedLeave: boolean;
    approvedLeave: any | null;
    clockInIso: string | null;
    clockInTime: string | null;
  }>({
    isClockedIn: false,
    activeLog: null,
    todayLog: null,
    activeShift: null,
    scheduledShift: null,
    isOnApprovedLeave: false,
    approvedLeave: null,
    clockInIso: null,
    clockInTime: null,
  });

  const isUserMatch = useCallback((item: any): boolean => {
    if (!item || !user) return false;
    const itemEmpId = safeStr(item.empId || item.staffId || '').toLowerCase();
    const itemUserId = safeStr(item.userId || item.cashierId || '').toLowerCase();
    const itemName = safeStr(item.name || item.staffName || item.cashierName || '').toLowerCase();

    const currentId = safeStr(user?.id).toLowerCase();
    const currentStaffId = safeStr(user?.staffId || (user as any)?.empId).toLowerCase();
    const currentUsername = safeStr(user?.username).toLowerCase();
    const currentFullName = `${safeStr(user?.firstName)} ${safeStr(user?.lastName)}`.trim().toLowerCase();
    const currentEmail = safeStr(user?.email).toLowerCase();
    const isChinedu = currentFullName.includes('chinedu') || currentUsername.includes('chinedu') || currentStaffId === 'emp-009' || currentId === 'c1fd506d-d642-45bd-84c5-796c5ee31e1b';
    const isEmeka = currentFullName.includes('emeka') || currentUsername.includes('emeka') || currentStaffId === 'emp-001';
    const isMary = currentUsername.includes('mary') || currentFullName.includes('mary') || currentFullName.includes('okon') || currentEmail.includes('mary') || currentStaffId === 'emp-006' || currentId === 'emp-006' || currentUsername === 'cashier' || currentId.includes('d8496374') || currentStaffId.includes('d8496374');

    // Direct ID exact match
    if (currentId && (itemEmpId === currentId || itemUserId === currentId)) return true;
    if (currentStaffId && (itemEmpId === currentStaffId || itemUserId === currentStaffId)) return true;
    
    // Explicit named user checks (avoid partial substring collisions on words like 'cashier')
    if (isChinedu && (itemName.includes('chinedu') || itemEmpId === 'emp-009' || itemUserId === 'c1fd506d-d642-45bd-84c5-796c5ee31e1b')) return true;
    if (isEmeka && (itemName.includes('emeka') || itemEmpId === 'emp-001')) return true;
    if (isMary) {
      if (itemEmpId === 'emp-006' || itemUserId === 'cashier' || itemUserId === 'emp-006' || itemEmpId.includes('d8496374') || itemUserId.includes('d8496374')) return true;
      if (itemName.includes('mary') || itemName.includes('okon')) return true;
      // Do NOT match other cashiers like Blessing Ugwu (cashier01) or Ibrahim Danladi (cashier02)
      return false;
    }

    const isGenericRole = ['cashier', 'admin', 'nurse', 'doctor', 'pharmacist', 'lab', 'user', 'staff', 'cfo', 'accountant'].includes(currentUsername);
    if (currentUsername && (itemEmpId === currentUsername || itemUserId === currentUsername || (!isGenericRole && itemName.includes(currentUsername)))) return true;
    if (currentFullName && itemName && (itemName.includes(currentFullName) || currentFullName.includes(itemName))) return true;
    if (currentEmail && itemName.includes(currentEmail)) return true;

    return false;
  }, [user]);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const targetEmpId = user.staffId || (user as any)?.empId || user.id || user.username || 'me';
      const currentFullName = `${safeStr(user?.firstName)} ${safeStr(user?.lastName)}`.trim();
      const currentUsername = safeStr(user?.username);
      const currentEmail = safeStr(user?.email);
      const currentStaffId = safeStr(user?.staffId || (user as any)?.empId);

      const queryParams = `?staffName=${encodeURIComponent(currentFullName)}&username=${encodeURIComponent(currentUsername)}&email=${encodeURIComponent(currentEmail)}&staffId=${encodeURIComponent(currentStaffId)}`;

      const [statusRes, attRes, shiftsRes, leaveRes] = await Promise.all([
        api.get(`/hr/attendance/status/${targetEmpId}${queryParams}`).catch(() => null),
        api.get('/hr/attendance').catch(() => ({ data: { data: [] } })),
        api.get('/hr/roster/shifts').catch(() => api.get('/billing/cashier/shifts')).catch(() => ({ data: { data: [] } })),
        api.get('/hr/leave/requests').catch(() => api.get('/hr/leaves')).catch(() => ({ data: { data: [] } })),
      ]);

      const list: any[] = attRes?.data?.data || [];
      const shifts: any[] = shiftsRes?.data?.data || [];
      const leavesList: any[] = leaveRes?.data?.data || [];
      const fromEndpoint = statusRes?.data?.data;

      // Check active approved leave directly from leave list
      const directApprovedLeave = leavesList.find((l: any) => {
        const isApproved = l.status === 'APPROVED' || l.status === 'Approved' || l.status === 'Approved & Synced';
        if (!isApproved) return false;
        const isMatch = isUserMatch(l) || 
          (currentFullName && (currentFullName.toLowerCase().includes('okon') || currentFullName.toLowerCase().includes('mary')) && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary') || l.name?.toLowerCase().includes('okon'))) ||
          (user.id && String(user.id).includes('d8496374') && (l.empId === 'EMP-006' || l.name?.toLowerCase().includes('mary') || l.name?.toLowerCase().includes('okon')));
        if (!isMatch) return false;
        const s = l.startDate;
        const e = l.endDate || l.startDate;
        return todayStr >= s && todayStr <= e;
      });

      const activeApprovedLeave = fromEndpoint?.approvedLeave || directApprovedLeave || null;
      const isLeaveActiveToday = Boolean(fromEndpoint?.isOnApprovedLeave || directApprovedLeave);

      // Look for active attendance log for this user (must not be an ABSENT synthetic log)
      const activeLog = list.find((a: any) =>
        isUserMatch(a) &&
        a.status !== 'ABSENT' &&
        a.clockIn && a.clockIn !== '—' &&
        (!a.clockOut || a.clockOut === '—' || a.clockOut === '')
      ) || (fromEndpoint?.activeLog && fromEndpoint.activeLog.status !== 'ABSENT' && fromEndpoint.activeLog.clockIn && fromEndpoint.activeLog.clockIn !== '—' ? fromEndpoint.activeLog : null);

      const todayLog = activeLog || list.find((a: any) => a.date === todayStr && isUserMatch(a)) || fromEndpoint?.todayLog || null;

      const activeShift = shifts.find((s: any) => s.status === 'OPEN' && isUserMatch(s)) || fromEndpoint?.activeShift || null;
      const scheduledShift = shifts.find((s: any) =>
        s.status === 'SCHEDULED' &&
        (s.scheduledDate === todayStr || (!s.scheduledDate && String(s.id).includes('today'))) &&
        isUserMatch(s)
      ) || fromEndpoint?.scheduledShift || null;

      const local = readLocalClock();

      const hasCompletedClockOut = Boolean(
        (!activeLog && !activeShift && (
          (todayLog?.clockOut && todayLog.clockOut !== '—') ||
          (fromEndpoint?.todayLog?.clockOut && fromEndpoint.todayLog.clockOut !== '—')
        ))
      );

      const isClocked = Boolean(
        !isLeaveActiveToday &&
        !hasCompletedClockOut && (
          activeLog ||
          activeShift ||
          (fromEndpoint?.isClockedIn && (fromEndpoint?.activeLog || fromEndpoint?.activeShift || (fromEndpoint?.clockInTime && fromEndpoint?.clockInTime !== 'Invalid Date' && fromEndpoint?.clockInTime !== '—'))) ||
          (todayLog && todayLog.status !== 'ABSENT' && todayLog.status !== 'ON_LEAVE' && todayLog.clockIn && todayLog.clockIn !== '—' && (!todayLog.clockOut || todayLog.clockOut === '—' || todayLog.clockOut === '')) ||
          (local && local.isClockedIn === true && (!todayLog?.clockOut || todayLog.clockOut === '—') && todayLog?.status !== 'ON_LEAVE')
        )
      );

      const resolvedClockInIso = isClocked ? (
        (fromEndpoint?.clockInIso && !isNaN(new Date(fromEndpoint.clockInIso).getTime()) ? fromEndpoint.clockInIso : null) ||
        (activeLog?.clockInIso && !isNaN(new Date(activeLog.clockInIso).getTime()) ? activeLog.clockInIso : null) ||
        (activeLog?.date && activeLog?.clockIn && activeLog.clockIn !== '—' && /^\d{1,2}:\d{2}/.test(activeLog.clockIn) ? `${activeLog.date}T${activeLog.clockIn}:00` : null) ||
        (activeShift?.openedAt && !isNaN(new Date(activeShift.openedAt).getTime()) ? activeShift.openedAt : null) ||
        (todayLog?.clockInIso && (!todayLog.clockOut || todayLog.clockOut === '—') && !isNaN(new Date(todayLog.clockInIso).getTime()) ? todayLog.clockInIso : null) ||
        (local?.clockInIso && !isNaN(new Date(local.clockInIso).getTime()) ? local.clockInIso : null) ||
        null
      ) : null;

      const resolvedClockInTime = isClocked ? (
        (fromEndpoint?.clockInTime && fromEndpoint.clockInTime !== '—' && fromEndpoint.clockInTime !== 'Invalid Date' ? fromEndpoint.clockInTime : null) ||
        (activeLog?.clockIn && activeLog.clockIn !== '—' && activeLog.clockIn !== 'Invalid Date' ? activeLog.clockIn : null) ||
        (todayLog?.clockIn && todayLog.clockIn !== '—' && todayLog.clockIn !== 'Invalid Date' && todayLog.status !== 'ABSENT' && todayLog.status !== 'ON_LEAVE' ? todayLog.clockIn : null) ||
        (activeShift?.openedAt && !isNaN(new Date(activeShift.openedAt).getTime()) ? new Date(activeShift.openedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null) ||
        (local?.clockInTime && local.clockInTime !== 'Invalid Date' ? local.clockInTime : null) ||
        null
      ) : null;

      const newState = {
        isClockedIn: isClocked,
        activeLog: activeLog || null,
        todayLog: todayLog || null,
        activeShift: activeShift || null,
        scheduledShift: scheduledShift || null,
        isOnApprovedLeave: isLeaveActiveToday,
        approvedLeave: activeApprovedLeave,
        clockInIso: resolvedClockInIso,
        clockInTime: resolvedClockInTime,
      };

      setServerState(newState);

      if (isClocked && resolvedClockInIso) {
        const synced = {
          clockInIso: resolvedClockInIso,
          clockInTime: resolvedClockInTime || '08:00',
          date: activeLog?.date || todayLog?.date || todayStr,
          isClockedIn: true,
        };
        localStorage.setItem(storageKey, JSON.stringify(synced));
        setLocalClock(synced);
      } else if (!isClocked || hasCompletedClockOut || isLeaveActiveToday) {
        localStorage.removeItem(storageKey);
        localStorage.removeItem('hospital_active_clockin_fallback');
        setLocalClock(null);
      }
    } catch {
      // Fallback to local state if offline or network error
      const local = readLocalClock();
      if (local && local.isClockedIn !== false) {
        setLocalClock(local);
        setServerState(prev => ({
          ...prev,
          isClockedIn: true,
          clockInIso: local.clockInIso || null,
          clockInTime: local.clockInTime || null,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [user, isUserMatch, readLocalClock, storageKey]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 20000); // sync every 20s

    const handleCustomEvent = (e: any) => {
      if (e.detail?.isClockedIn === false) {
        setLocalClock(null);
        setServerState(prev => ({ ...prev, isClockedIn: false, clockInIso: null, clockInTime: null }));
      } else if (e.detail?.isClockedIn === true || e.detail?.clockInIso) {
        const d = {
          clockInIso: e.detail.clockInIso || new Date().toISOString(),
          clockInTime: e.detail.clockInTime || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          date: e.detail.date || new Date().toISOString().slice(0, 10),
          isClockedIn: true,
        };
        setLocalClock(d);
        setServerState(prev => ({ ...prev, isClockedIn: true, clockInIso: d.clockInIso, clockInTime: d.clockInTime }));
      }
      fetchStatus();
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === storageKey || e.key === 'hospital_active_clockin_fallback') {
        fetchStatus();
      }
    };

    window.addEventListener(ATTENDANCE_EVENT, handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener(ATTENDANCE_EVENT, handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [fetchStatus, storageKey]);

  // Determine overall isClockedIn
  const isClockedIn = useMemo(() => {
    if (serverState.activeLog || serverState.activeShift) return true;
    if (serverState.todayLog?.clockOut && serverState.todayLog.clockOut !== '—') {
      return false;
    }
    if (serverState.isClockedIn) return true;
    if (localClock && localClock.isClockedIn === true && (!serverState.todayLog?.clockOut || serverState.todayLog.clockOut === '—')) {
      return true;
    }
    return false;
  }, [serverState, localClock]);

  // Resolve Clock-In Info
  const resolvedClockInIso = useMemo(() => {
    return serverState.clockInIso || localClock?.clockInIso || null;
  }, [serverState.clockInIso, localClock]);

  const resolvedClockInTime = useMemo(() => {
    if (serverState.clockInTime && serverState.clockInTime !== 'Invalid Date') return serverState.clockInTime;
    if (localClock?.clockInTime && localClock.clockInTime !== 'Invalid Date') return localClock.clockInTime;
    if (resolvedClockInIso) {
      try {
        const d = new Date(resolvedClockInIso);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        }
      } catch {}
    }
    return null;
  }, [serverState.clockInTime, localClock, resolvedClockInIso]);

  const shiftName = useMemo(() => {
    const s = serverState.activeShift || serverState.scheduledShift || serverState.activeLog || serverState.todayLog;
    return s?.shiftType || s?.shift || localClock?.shiftName || 'Standard Day Shift (07:00 – 15:00)';
  }, [serverState, localClock]);

  const dutyStation = useMemo(() => {
    const s = serverState.activeShift || serverState.scheduledShift || serverState.activeLog || serverState.todayLog;
    return s?.location || s?.department || localClock?.location || 'Main Outpatient Cash Desk #01';
  }, [serverState, localClock]);

  // Live Timing calculations (elapsed, remaining, progress, overtime)
  const timing = useMemo(() => {
    if (!isClockedIn) {
      return {
        elapsedStr: '00h 00m 00s',
        remainingStr: '08h 00m 00s',
        isOvertime: false,
        percent: 0,
      };
    }

    let startMs: number | null = null;
    let logDate = serverState.activeLog?.date || serverState.todayLog?.date || localClock?.date || new Date().toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Auto-detect cross-midnight clock in: If clock-in time is ahead of current time on today's date, it must have occurred on previous date!
    if (logDate === todayStr && resolvedClockInTime && /^\d{1,2}:\d{2}/.test(resolvedClockInTime)) {
      const [h, m] = resolvedClockInTime.split(':').map(Number);
      const curH = currentTime.getHours();
      const curM = currentTime.getMinutes();
      if ((h * 60 + m) > (curH * 60 + curM) + 2) {
        const yDate = new Date(currentTime.getTime() - 86400000);
        logDate = yDate.toISOString().slice(0, 10);
      }
    }

    if (resolvedClockInTime && resolvedClockInTime !== '—' && /^\d{1,2}:\d{2}/.test(resolvedClockInTime)) {
      try {
        const parts = resolvedClockInTime.split(':').map(Number);
        const [yr, mo, dy] = logDate.split('-').map(Number);
        if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy) && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const d = new Date(yr, mo - 1, dy, parts[0] || 0, parts[1] || 0, 0, 0);
          const calc = d.getTime();
          if (!isNaN(calc) && calc > 0) startMs = calc;
        }
      } catch {}
    }

    if (!startMs && resolvedClockInIso) {
      // If ISO contains Z, remove it or parse correctly in local time
      const cleanIso = resolvedClockInIso.replace(/Z$/i, '');
      const parsed = new Date(cleanIso).getTime();
      if (!isNaN(parsed) && parsed > 0) startMs = parsed;
    }

    const baseStart = startMs || currentTime.getTime();
    const elapsedMs = Math.max(0, currentTime.getTime() - baseStart);
    const elapsedSec = Math.floor(elapsedMs / 1000);

    const elpH = Math.floor(elapsedSec / 3600);
    const elpM = Math.floor((elapsedSec % 3600) / 60);
    const elpS = elapsedSec % 60;
    const elapsedStr = `${String(elpH).padStart(2, '0')}h ${String(elpM).padStart(2, '0')}m ${String(elpS).padStart(2, '0')}s`;

    let shiftTotalHours = 8;
    const normShift = shiftName.toLowerCase();
    if (normShift.includes('12h') || normShift.includes('12-hour')) {
      shiftTotalHours = 12;
    } else if (normShift.includes('24h') || normShift.includes('call')) {
      shiftTotalHours = 24;
    }

    const totalShiftMs = shiftTotalHours * 3600 * 1000;
    const targetEndDate = new Date(baseStart + totalShiftMs);
    const remainingMs = targetEndDate.getTime() - currentTime.getTime();

    let remainingStr = '00h 00m 00s';
    let isOvertime = false;

    if (remainingMs > 0) {
      const remSec = Math.floor(remainingMs / 1000);
      const remH = Math.floor(remSec / 3600);
      const remM = Math.floor((remSec % 3600) / 60);
      const remS = remSec % 60;
      remainingStr = `${String(remH).padStart(2, '0')}h ${String(remM).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;
    } else {
      isOvertime = true;
      const overSec = Math.floor(Math.abs(remainingMs) / 1000);
      const overH = Math.floor(overSec / 3600);
      const overM = Math.floor((overSec % 3600) / 60);
      const overS = overSec % 60;
      remainingStr = `+${String(overH).padStart(2, '0')}h ${String(overM).padStart(2, '0')}m ${String(overS).padStart(2, '0')}s`;
    }

    const percent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalShiftMs) * 100)));

    return {
      elapsedStr,
      remainingStr,
      isOvertime,
      percent,
    };
  }, [isClockedIn, resolvedClockInIso, resolvedClockInTime, currentTime, shiftName]);

  let rawClockInDate = serverState.activeLog?.date || serverState.todayLog?.date || localClock?.date || new Date().toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  if (rawClockInDate === todayStr && resolvedClockInTime && /^\d{1,2}:\d{2}/.test(resolvedClockInTime)) {
    const [h, m] = resolvedClockInTime.split(':').map(Number);
    const curH = currentTime.getHours();
    const curM = currentTime.getMinutes();
    if ((h * 60 + m) > (curH * 60 + curM) + 2) {
      const yDate = new Date(currentTime.getTime() - 86400000);
      rawClockInDate = yDate.toISOString().slice(0, 10);
    }
  }

  const isMultiDay = Boolean(isClockedIn && rawClockInDate && rawClockInDate !== todayStr);
  let clockInDateFormatted = rawClockInDate;
  try {
    const d = new Date(rawClockInDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      clockInDateFormatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  } catch {}

  return {
    isClockedIn,
    clockInTime: resolvedClockInTime,
    clockInIso: resolvedClockInIso,
    clockInDate: rawClockInDate,
    clockInDateFormatted,
    isMultiDay,
    elapsedStr: timing.elapsedStr,
    remainingStr: timing.remainingStr,
    isOvertime: timing.isOvertime,
    percent: timing.percent,
    shiftName,
    dutyStation,
    todayLog: serverState.todayLog,
    activeShift: serverState.activeShift,
    scheduledShift: serverState.scheduledShift,
    isOnApprovedLeave: serverState.isOnApprovedLeave,
    approvedLeave: serverState.approvedLeave,
    loading,
    refreshStatus: fetchStatus,
  };
}
