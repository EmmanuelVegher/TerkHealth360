# Smart Hospital Modern - Technical Specification

## 1. Executive Summary

This document outlines the technical architecture and implementation plan for modernizing **Smart Hospital** from a PHP/CodeIgniter 3 application to a **React + Node.js + MySQL** system with **FHIR R4 compliance**, **biometric integration**, and support for both **web and desktop deployment**.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌─────────────────────┐          ┌──────────────────────────┐  │
│  │   React SPA (Web)   │          │   Electron Desktop App   │  │
│  │   - Material UI     │          │   - Same React codebase  │  │
│  │   - React Query     │          │   - Native hardware access│  │
│  │   - Zustand         │          │   - Offline-first sync   │  │
│  └─────────┬───────────┘          └───────────┬──────────────┘  │
│            │ HTTPS / WebSocket                │                  │
└────────────┼───────────────────────────────────┼──────────────────┘
             │                                   │
┌────────────┼───────────────────────────────────┼──────────────────┐
│            │     API Gateway / Load Balancer  │                  │
│  ┌─────────▼───────────────────────────────────▼──────────────┐  │
│  │              Node.js + Express API Server                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │  │
│  │  │   REST API  │  │ FHIR R4 API │  │  WebSocket Server  │  │  │
│  │  │   (JWT)     │  │ (HAPI/FHIR) │  │   (Socket.io)     │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │                    MySQL 8 Database                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐  │  │
│  │  │   Prisma    │  │   FHIR      │  │   Audit / Logs    │  │  │
│  │  │   ORM       │  │   Tables    │  │                   │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React + TypeScript | 18+ | UI framework |
| **Build Tool** | Vite | 5+ | Fast dev/build |
| **UI Library** | Material-UI (MUI) | 5+ | Component library |
| **State** | Zustand + React Query | Latest | Client/server state |
| **Routing** | React Router | 6+ | SPA navigation |
| **Forms** | React Hook Form + Zod | Latest | Form handling/validation |
| **Desktop** | Electron | 28+ | Desktop wrapper |
| **Backend** | Node.js + Express | 20+ | API server |
| **ORM** | Prisma | 5+ | Database access |
| **Database** | MySQL | 8+ | Primary datastore |
| **Auth** | JWT + bcrypt + speakeasy | Latest | Authentication/2FA |
| **FHIR** | Custom facade / HAPI FHIR | R4 | Interoperability |
| **Real-time** | Socket.io | 4+ | Chat/notifications |
| **Biometric** | WebUSB + TensorFlow.js | Latest | Fingerprint/face |
| **Offline** | Dexie.js (IndexedDB) | 3+ | Local caching |

---

## 3. FHIR R4 Compliance

### 3.1 Resource Mapping

| Smart Hospital Entity | FHIR Resource | Key Fields |
|----------------------|---------------|------------|
| Patient | `Patient` | identifier, name, gender, birthDate, telecom, address |
| Staff/Doctor | `Practitioner` | identifier, name, qualification, telecom |
| Appointment | `Appointment` | status, start, end, participant, reasonText |
| OPD/IPD Visit | `Encounter` | status, class, type, period, diagnosis |
| Vital Signs | `Observation` | category (vital-signs), code, valueQuantity |
| Lab Results | `Observation` | category (laboratory), code, valueQuantity |
| Radiology | `DiagnosticReport` + `ImagingStudy` | status, conclusion, image |
| Prescription | `MedicationRequest` | status, intent, medicationCode, dosageText |
| Diagnosis | `Condition` | clinicalStatus, code (ICD-10), onsetDateTime |
| Bill/Invoice | `Invoice` | status, lineItem, total |
| Medication | `Medication` | code, form, amount |

### 3.2 FHIR API Endpoints

```
GET    /fhir/Patient
GET    /fhir/Patient/:id
POST   /fhir/Patient
PUT    /fhir/Patient/:id
DELETE /fhir/Patient/:id

GET    /fhir/Practitioner
GET    /fhir/Appointment
POST   /fhir/Appointment
GET    /fhir/Encounter
POST   /fhir/Encounter
GET    /fhir/Observation
POST   /fhir/Observation
GET    /fhir/DiagnosticReport
POST   /fhir/DiagnosticReport
GET    /fhir/MedicationRequest
POST   /fhir/MedicationRequest
GET    /fhir/Condition
POST   /fhir/Condition
GET    /fhir/Medication
POST   /fhir/Medication
```

### 3.3 FHIR Search Parameters

| Resource | Supported Parameters |
|----------|---------------------|
| Patient | `_id`, `identifier`, `name`, `gender`, `birthdate` |
| Appointment | `patient`, `practitioner`, `date`, `status` |
| Observation | `patient`, `category`, `code`, `date` |
| Encounter | `patient`, `date`, `status`, `type` |

---

## 4. Database Schema (Prisma)

### 4.1 Core Models

- **User**: Authentication, roles, 2FA
- **Patient**: FHIR Patient resource + local extensions
- **PatientIdentifier**: MRN, national ID, etc.
- **PatientTelecom**: Phone, email, fax
- **PatientAddress**: Home, work, billing addresses
- **Staff**: Doctors, nurses, admin staff
- **Appointment**: FHIR Appointment
- **Encounter**: OPD/IPD visits
- **Observation**: Vitals, lab results
- **Condition**: Diagnoses
- **MedicationRequest**: Prescriptions
- **AuditLog**: Compliance tracking

### 4.2 FHIR Extensions

Custom extensions stored in JSON fields or extension tables:
- `patient-number`: Hospital-specific MRN
- `blood-group`: Blood type
- `marital-status`: Local extension
- `nationality`: Country code

---

## 5. Authentication & Authorization

### 5.1 JWT Strategy

- **Access Token**: 15 minutes expiry
- **Refresh Token**: 7 days expiry, stored in DB
- **Rotation**: Refresh tokens rotate on each use

### 5.2 Roles & Permissions

| Role | Access |
|------|--------|
| SUPER_ADMIN | Full system access |
| ADMIN | Hospital configuration, user management |
| DOCTOR | Patients, appointments, prescriptions, observations |
| NURSE | Vitals, observations, medication administration |
| PHARMACIST | Medications, dispensing |
| LAB_TECHNICIAN | Lab tests, results |
| RECEPTIONIST | Appointments, patient registration |
| PATIENT | Own records, appointments, prescriptions |
| STAFF | Limited access based on designation |

### 5.3 2FA (TOTP)

- Google Authenticator compatible
- QR code enrollment
- Backup codes (optional)

---

## 6. Biometric Integration

### 6.1 Supported Modalities

| Type | Technology | Use Case |
|------|-----------|----------|
| Fingerprint | WebUSB / Vendor SDK | Patient identification, attendance |
| Facial Recognition | TensorFlow.js / face-api.js | Patient verification, access control |
| Iris | Vendor SDK (IrisGuard) | High-security areas |

### 6.2 Implementation

```typescript
// Biometric service interface
interface BiometricService {
  captureFingerprint(): Promise<Buffer>;
  captureFace(): Promise<Buffer>;
  verifyBiometric(type: 'fingerprint' | 'face', data: Buffer): Promise<boolean>;
  enrollBiometric(type: 'fingerprint' | 'face', patientId: string): Promise<void>;
}
```

### 6.3 Desktop Advantage

Electron can access:
- USB fingerprint scanners via `node-usb`
- Vendor DLLs (ZKTeco, DigitalPersona)
- Local biometric databases for offline matching

---

## 7. Offline-First Strategy

### 7.1 Local Storage (Dexie.js / IndexedDB)

- Cache patient records
- Queue appointments/observations when offline
- Sync when connection restored

### 7.2 Conflict Resolution

- Last-write-wins with timestamps
- Manual conflict resolution UI for critical data
- CRDT for collaborative fields (optional)

---

## 8. Interoperability

### 8.1 HL7 v2 Support

- **ADT** messages: Patient admit/discharge/transfer
- **ORM** messages: Order entry (lab, radiology)
- **ORU** messages: Result delivery

### 8.2 Terminology Services

| Standard | Implementation |
|----------|---------------|
| ICD-10 | Diagnosis coding |
| SNOMED CT | Clinical terminology |
| LOINC | Lab test codes |
| RxNorm | Medication standardization |

### 8.3 SMART on FHIR

- OAuth2 integration for third-party apps
- Embeddable iframes for external clinical tools

---

## 9. Security & Compliance

### 9.1 Security Measures

- HTTPS/TLS 1.3
- JWT with short expiry + refresh rotation
- bcrypt password hashing (cost factor 12)
- CSRF protection
- XSS prevention (React auto-escaping + sanitization)
- Rate limiting
- Input validation (Zod schemas)
- SQL injection prevention (Prisma parameterized queries)

### 9.2 Compliance

| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| HIPAA | Access controls, audit logs | RBAC + AuditLog model |
| GDPR | Data portability, consent | Patient data export, consent tracking |
| ISO 27001 | Security controls | Helmet.js, encryption, logging |

---

## 10. Deployment

### 10.1 Web Deployment

```bash
# Frontend
cd frontend && npm install && npm run build
# Deploy to Vercel / Netlify / S3 + CloudFront

# Backend
cd backend && npm install && npx prisma migrate deploy
# Deploy to AWS ECS / Google Cloud Run / DigitalOcean App Platform
```

### 10.2 Desktop Deployment (Electron)

```bash
cd frontend && npm run electron-build
# Outputs: dist/Smart Hospital Setup.exe / .dmg / .AppImage
```

### 10.3 Docker (Optional)

```dockerfile
# Backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]

# Frontend
FROM nginx:alpine
COPY dist /usr/share/nginx/html
```

---

## 11. Migration Plan

### Phase 1: Foundation (Months 1-3)
- [x] Project scaffolding
- [ ] Auth module (JWT, roles, 2FA)
- [ ] Patient management (FHIR Patient)
- [ ] Basic FHIR API (Patient, Appointment, Observation)
- [ ] Database migration scripts from legacy schema

### Phase 2: Clinical Modules (Months 4-6)
- [ ] OPD/IPD (Encounter)
- [ ] Prescriptions (MedicationRequest)
- [ ] Vitals & Observations
- [ ] Billing & Invoices
- [ ] Reports & Dashboard

### Phase 3: Advanced Features (Months 7-9)
- [ ] Biometric integration
- [ ] Pathology & Radiology
- [ ] Operation Theatre
- [ ] Blood Bank
- [ ] Chat & Video Consultation

### Phase 4: Interoperability & Desktop (Months 10-12)
- [ ] Full FHIR R4 compliance
- [ ] HL7 v2 interface engine
- [ ] Electron desktop wrapper
- [ ] Offline sync
- [ ] SaaS multi-tenancy

---

## 12. Project Structure

```
smart-hospital-modern/
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route pages
│   │   ├── contexts/         # React contexts (Auth, etc.)
│   │   ├── services/         # API clients
│   │   ├── hooks/            # Custom hooks
│   │   ├── utils/            # Helpers
│   │   └── types/            # TypeScript types
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Express middleware
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── utils/            # Helpers
│   │   └── server.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.ts           # Seed data
│   ├── package.json
│   └── tsconfig.json
│
├── database/                 # SQL scripts, migrations
│   ├── migrate.sql           # Legacy to new schema
│   └── seed.sql              # Initial data
│
└── docs/                     # Documentation
    ├── technical-specification.md
    ├── api-documentation.md
    └── deployment-guide.md
```

---

## 13. Getting Started

### Prerequisites
- Node.js 20+
- MySQL 8+
- npm or yarn

### Installation

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- FHIR API: http://localhost:3000/fhir
- Prisma Studio: `npx prisma studio`

---

## 14. Next Steps

1. Install dependencies and run migrations
2. Create initial admin user
3. Test FHIR Patient CRUD
4. Implement biometric capture (fingerprint)
5. Build Electron desktop wrapper
6. Set up CI/CD pipeline

---

*Document Version: 1.0*
*Last Updated: 2024*
