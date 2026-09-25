import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Patients     from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import AppointmentCalendar from './pages/AppointmentCalendar';
import OPD          from './pages/OPD';
import IPD          from './pages/IPD';
import Pathology    from './pages/Pathology';
import Radiology    from './pages/Radiology';
import Lab          from './pages/Lab';
import Pharmacy     from './pages/Pharmacy';
import BloodBank    from './pages/BloodBank';
import Ambulance    from './pages/Ambulance';
import Billing      from './pages/Billing';
import Theatre      from './pages/Theatre';
import ICU          from './pages/ICU';
import Emergency    from './pages/Emergency';
import Maternity    from './pages/Maternity';
import LabourWard   from './pages/LabourWard';
import AncWorkspace from './pages/AncWorkspace';
import FamilyPlanning from './pages/FamilyPlanning';
import Reports      from './pages/Reports';
import Events       from './pages/Events';
import Addons       from './pages/Addons';
import Settings     from './pages/Settings';
import WorkflowConfig from './pages/WorkflowConfig';
import Messages     from './pages/Messages';
import Layout       from './components/Layout';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import AuditLogs from './pages/AuditLogs';
import ResetPassword from './pages/ResetPassword';
import PatientRegistration from './pages/PatientRegistration';
import MergeRecords from './pages/MergeRecords';
import InsurancePortal from './pages/InsurancePortal';
import InventorySCM from './pages/InventorySCM';
import Finance from './pages/Finance';
import WorkforceHR from './pages/WorkforceHR';
import SupervisorMappingOrganogram from './pages/SupervisorMappingOrganogram';
import BishopsDashboard from './pages/BishopsDashboard';
import AssetsBiomedical from './pages/AssetsBiomedical';
import PatientCRM from './pages/PatientCRM';
import DocumentDMS from './pages/DocumentDMS';
import SecurityIAM from './pages/SecurityIAM';
import EnterpriseAnalytics from './pages/EnterpriseAnalytics';
import MortuaryFuneral from './pages/MortuaryFuneral';
import RehabilitationPhysio from './pages/RehabilitationPhysio';
import TechnicalArchitecture from './pages/TechnicalArchitecture';
import { DataDictionary } from './pages/DataDictionary';
import Visits from './pages/Visits';
import EMRDashboard from './pages/EMRDashboard';
import QueueManagement from './pages/QueueManagement';
import PatientPortal from './pages/PatientPortal';
import QueueBoard from './pages/QueueBoard';
import NursingDashboard from './pages/NursingDashboard';
import Telemedicine from './pages/Telemedicine';
import LIMS from './pages/LIMS';
import MyProfile from './pages/MyProfile';
import TimesheetPage from './pages/TimesheetPage';
import { GlobalCallDialog } from './components/GlobalCallDialog';
import { VerifyLabResult } from './pages/VerifyLabResult';
import FinancialAudit from './pages/FinancialAudit';
import Attendance from './pages/Attendance';
import StaffRequisitions from './pages/StaffRequisitions';
import AdminDesk from './pages/AdminDesk';
import InternalMemos from './pages/InternalMemos';
import LeaveManagementPage from './pages/LeaveManagementPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0d1550 0%, #1e2a78 100%)',
      color: '#fff', fontSize: '1rem', fontFamily: 'Inter, sans-serif',
    }}>
      Loading…
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/queue-board" element={<QueueBoard />} />
        
      {/* Public Verification Route */}
      <Route path="/verify/lab/:id" element={<VerifyLabResult />} />

      {/* Private Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Main */}
        <Route index               element={<Dashboard />} />
        <Route path="patients"     element={<Patients />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="register-patient" element={<PatientRegistration />} />
        <Route path="merge-records" element={<MergeRecords />} />
        <Route path="visits"       element={<Visits />} />
        <Route path="emr-workspace" element={<EMRDashboard />} />
        <Route path="appointments" element={<AppointmentCalendar />} />
        <Route path="queues"       element={<QueueManagement />} />
        <Route path="patient-portal" element={<PatientPortal />} />
        <Route path="nursing/roster" element={<Navigate to="/staff/attendance-roster/schedules?role=Nurse" replace />} />
        <Route path="nursing"      element={<NursingDashboard />} />
        <Route path="nursing/*"    element={<NursingDashboard />} />
        <Route path="telemedicine" element={<Telemedicine />} />
        {/* Clinical */}
        <Route path="opd"          element={<OPD />} />
        <Route path="ipd"          element={<IPD />} />
        <Route path="ipd/emergency" element={<Emergency />} />
        <Route path="ipd/emergency/*" element={<Navigate to="/ipd/emergency" replace />} />
        <Route path="ipd/icu"      element={<ICU />} />
        <Route path="ipd/icu/*"    element={<ICU />} />
        <Route path="ipd/:wardSlug" element={<IPD />} />
        <Route path="ipd/:wardSlug/*" element={<IPD />} />
        <Route path="pathology"    element={<Pathology />} />
        <Route path="pathology/*"  element={<Pathology />} />
        <Route path="radiology"    element={<Radiology />} />
        <Route path="radiology/*"  element={<Radiology />} />
        <Route path="lab"          element={<Navigate to="/lims" replace />} />
        <Route path="lims"         element={<LIMS />} />
        <Route path="lims/*"       element={<LIMS />} />
        <Route path="pharmacy"     element={<Pharmacy />} />
        <Route path="pharmacy/queue" element={<Pharmacy />} />
        <Route path="pharmacy/catalog" element={<Pharmacy />} />
        <Route path="pharmacy/safety" element={<Pharmacy />} />
        <Route path="pharmacy/narcotics" element={<Pharmacy />} />
        <Route path="pharmacy/operations" element={<Pharmacy />} />
        <Route path="pharmacy/finance" element={<Pharmacy />} />
        <Route path="pharmacy/integrations" element={<Pharmacy />} />
        <Route path="pharmacy/*"   element={<Pharmacy />} />
        <Route path="blood-bank"   element={<BloodBank />} />
        <Route path="blood-bank/*" element={<BloodBank />} />
        <Route path="theatre"      element={<Theatre />} />
        <Route path="theatre/*"    element={<Theatre />} />
        <Route path="icu"          element={<Navigate to="/ipd/icu" replace />} />
        <Route path="icu/*"        element={<Navigate to="/ipd/icu" replace />} />
        <Route path="emergency"    element={<Navigate to="/ipd/emergency" replace />} />
        <Route path="emergency/*"  element={<Navigate to="/ipd/emergency" replace />} />
        <Route path="family-planning" element={<FamilyPlanning />} />
        <Route path="anc"          element={<AncWorkspace />} />
        {/* <Route path="maternity"    element={<Maternity />} /> */}
        <Route path="maternity"    element={<Navigate to="/ipd/maternity" replace />} />
        <Route path="maternity/*"  element={<Navigate to="/ipd/maternity" replace />} />
        <Route path="labour-ward"  element={<LabourWard />} />
        <Route path="ambulance"    element={<Ambulance />} />
        {/* Finance & HR */}
        <Route path="billing"      element={<Billing />} />
        <Route path="billing/*"    element={<Billing />} />
        <Route path="insurance-portal" element={<InsurancePortal />} />
        <Route path="insurance-portal/*" element={<InsurancePortal />} />
        {/* Pharmacy Inventory SCM Sub-Routes */}
        <Route path="inventory"                       element={<InventorySCM />} />
        <Route path="inventory/master"                element={<InventorySCM />} />
        <Route path="inventory/master/catalogue"      element={<InventorySCM />} />
        <Route path="inventory/master/locations"      element={<InventorySCM />} />
        <Route path="inventory/master/stock-balance"  element={<InventorySCM />} />
        <Route path="inventory/master/expiry-tracker" element={<InventorySCM />} />
        <Route path="inventory/procurement"                   element={<InventorySCM />} />
        <Route path="inventory/procurement/requisitions"      element={<InventorySCM />} />
        <Route path="inventory/procurement/suppliers"         element={<InventorySCM />} />
        <Route path="inventory/procurement/purchase-orders"   element={<InventorySCM />} />
        <Route path="inventory/procurement/goods-receipt"     element={<InventorySCM />} />
        <Route path="inventory/logistics"             element={<InventorySCM />} />
        <Route path="inventory/logistics/transfers"   element={<InventorySCM />} />
        <Route path="inventory/logistics/cold-chain"  element={<InventorySCM />} />
        <Route path="inventory/governance"                element={<InventorySCM />} />
        <Route path="inventory/governance/bi"             element={<InventorySCM />} />
        <Route path="inventory/governance/risk-register"  element={<InventorySCM />} />
        <Route path="inventory/governance/fraud-alerts"   element={<InventorySCM />} />
        <Route path="inventory/*"                     element={<InventorySCM />} />
        <Route path="finance"                     element={<Finance />} />
        {/* Financial Ledger & Periods */}
        <Route path="finance/ledger"              element={<Finance defaultTab={0} defaultSubTab={0} />} />
        <Route path="finance/ledger/coa"          element={<Finance defaultTab={0} defaultSubTab={0} />} />
        <Route path="finance/ledger/bank-accounts" element={<Finance defaultTab={0} defaultSubTab={1} />} />
        <Route path="finance/bank-accounts"       element={<Finance defaultTab={0} defaultSubTab={1} />} />
        <Route path="finance/ledger/journals"     element={<Finance defaultTab={0} defaultSubTab={2} />} />
        <Route path="finance/ledger/periods"      element={<Finance defaultTab={0} defaultSubTab={3} />} />
        <Route path="finance/ledger/statements"   element={<Finance defaultTab={0} defaultSubTab={4} />} />
        {/* Budgets & Cost Centres */}
        <Route path="finance/budgets"             element={<Finance defaultTab={1} defaultSubTab={0} />} />
        <Route path="finance/budgets/control"     element={<Finance defaultTab={1} defaultSubTab={0} />} />
        <Route path="finance/budgets/reconciliations" element={<Finance defaultTab={1} defaultSubTab={1} />} />
        <Route path="finance/budgets/trends"      element={<Finance defaultTab={1} defaultSubTab={2} />} />
        <Route path="finance/budgets/payables"    element={<Finance defaultTab={1} defaultSubTab={3} />} />
        {/* Assets, Grants & Taxes */}
        <Route path="finance/assets"              element={<Finance defaultTab={2} defaultSubTab={0} />} />
        <Route path="finance/assets/register"     element={<Finance defaultTab={2} defaultSubTab={0} />} />
        <Route path="finance/assets/grants"       element={<Finance defaultTab={2} defaultSubTab={1} />} />
        <Route path="finance/assets/taxes"        element={<Finance defaultTab={2} defaultSubTab={2} />} />
        {/* Gateways & Governance (Commented Out)
        <Route path="finance/gateways"            element={<Finance defaultTab={3} defaultSubTab={0} />} />
        <Route path="finance/gateways/simulator"  element={<Finance defaultTab={3} defaultSubTab={0} />} />
        <Route path="finance/gateways/settlements" element={<Finance defaultTab={3} defaultSubTab={1} />} />
        <Route path="finance/gateways/risks"      element={<Finance defaultTab={3} defaultSubTab={2} />} />
        <Route path="finance/gateways/fraud"      element={<Finance defaultTab={3} defaultSubTab={3} />} />
        */}
        {/* Backward Compatibility */}
        <Route path="finance/payable"             element={<Finance defaultTab={1} defaultSubTab={3} />} />
        <Route path="finance/reports"             element={<Finance defaultTab={0} defaultSubTab={3} />} />
        <Route path="finance/*"                   element={<Finance />} />
        <Route path="budgets"                     element={<Finance defaultTab={1} defaultSubTab={0} />} />
        <Route path="financial-audit" element={<FinancialAudit />} />
        {/* Assets & Biomedical (Commented Out)
        <Route path="assets"       element={<AssetsBiomedical />} />
        <Route path="assets/*"     element={<AssetsBiomedical />} /> */}
        <Route path="crm"          element={<PatientCRM />} />
        <Route path="dms"          element={<DocumentDMS />} />
        <Route path="payroll"      element={<WorkforceHR defaultTab={2} viewType="hr" />} />
        <Route path="staff/hierarchy" element={<SupervisorMappingOrganogram />} />
        <Route path="staff/hierarchy/*" element={<SupervisorMappingOrganogram />} />
        <Route path="staff/organogram" element={<SupervisorMappingOrganogram />} />
        <Route path="staff/organogram/*" element={<SupervisorMappingOrganogram />} />
        <Route path="staff"        element={<WorkforceHR defaultTab={0} viewType="hr" />} />
        <Route path="staff/*"      element={<WorkforceHR defaultTab={0} viewType="hr" />} />
        <Route path="attendance"   element={<Attendance />} />
        <Route path="leave"        element={<LeaveManagementPage />} />
        <Route path="leave/*"      element={<LeaveManagementPage />} />
        <Route path="staff/attendance-roster/leave" element={<LeaveManagementPage />} />
        <Route path="bishop-desk"  element={<BishopsDashboard />} />
        <Route path="staff-attendance" element={<WorkforceHR defaultTab={1} viewType="hr" />} />
        <Route path="timesheets"   element={<TimesheetPage />} />
        <Route path="timesheets/*" element={<TimesheetPage />} />
        <Route path="timesheet"    element={<TimesheetPage />} />
        <Route path="timesheet/*"  element={<TimesheetPage />} />
        <Route path="staff/attendance-roster/timesheets" element={<TimesheetPage />} />
        <Route path="internal-requests" element={<StaffRequisitions />} />
        <Route path="admin-interactive" element={<AdminDesk />} />
        <Route path="internal-memos" element={<InternalMemos />} />
        {/* Admin */}
        {/*
        <Route path="reports"      element={<Reports />} />
        <Route path="reports/*"    element={<Reports />} />
        */}
        <Route path="events"       element={<Events />} />
        <Route path="messages"     element={<Messages />} />
        <Route path="messages/*"   element={<Messages />} />
        <Route path="addons"       element={<Addons />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="workflow-config" element={<WorkflowConfig />} />
        <Route path="my-profile"   element={<MyProfile />} />
        {/* Management */}
        <Route path="users"        element={<UserManagement />} />
        <Route path="roles"        element={<RoleManagement />} />
        <Route path="departments"  element={<DepartmentManagement />} />
        <Route path="audit-logs"   element={<AuditLogs />} />
        <Route path="security-iam" element={<SecurityIAM />} />
        <Route path="security-iam/*" element={<SecurityIAM />} />
        <Route path="analytics"    element={<EnterpriseAnalytics />} />
        <Route path="analytics/*"  element={<EnterpriseAnalytics />} />
        <Route path="mortuary"     element={<MortuaryFuneral />} />
        <Route path="mortuary/*"   element={<MortuaryFuneral />} />
        <Route path="rehabilitation" element={<RehabilitationPhysio />} />
        <Route path="rehabilitation/*" element={<RehabilitationPhysio />} />
        <Route path="physiotherapy" element={<Navigate to="/rehabilitation" replace />} />
        <Route path="physiotherapy/*" element={<Navigate to="/rehabilitation" replace />} />
        <Route path="architecture"  element={<TechnicalArchitecture />} />
        <Route path="architecture/*" element={<TechnicalArchitecture />} />
        <Route path="data-dictionary" element={<DataDictionary />} />
        {/* Catch-all */}
        <Route path="*"            element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
    <GlobalCallDialog />
    </>
  );
}

export default App;
