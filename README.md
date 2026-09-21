# Smart Hospital Modern

A modern, FHIR-compliant Hospital Management System built with **React**, **Node.js**, **Express**, and **MySQL**. Supports both **web** and **desktop (Electron)** deployment with **biometric integration** and **EMR interoperability**.

## Features

- **FHIR R4 Compliant**: Full interoperability with other EMR systems
- **React + TypeScript**: Modern, type-safe frontend
- **Node.js + Express**: Fast, scalable backend API
- **Prisma ORM**: Type-safe database access
- **JWT Authentication**: Secure login with refresh tokens
- **2FA Support**: TOTP-based two-factor authentication
- **Biometric Ready**: Fingerprint and facial recognition support
- **Offline-First**: IndexedDB caching for local hospital deployments
- **Real-time**: Socket.io for chat and notifications
- **Multi-tenant SaaS**: Ready for hosting multiple hospitals

## Quick Start

### Prerequisites

- Node.js 20+
- MySQL 8+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd smart-hospital-modern

# Backend setup
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Frontend setup (new terminal)
cd frontend
npm install
npm run dev
```

### Access

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- FHIR API: http://localhost:3000/fhir
- Prisma Studio: `npx prisma studio`

## Project Structure

```
smart-hospital-modern/
├── frontend/          # React + Vite + TypeScript
├── backend/           # Node.js + Express + TypeScript
├── database/          # SQL migrations and seeds
└── docs/              # Documentation
```

## Documentation

- [Technical Specification](docs/technical-specification.md)
- [API Documentation](docs/api-documentation.md) *(coming soon)*
- [Deployment Guide](docs/deployment-guide.md) *(coming soon)*

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, MUI |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8, Prisma ORM |
| Auth | JWT, bcrypt, speakeasy (2FA) |
| FHIR | Custom R4-compliant API |
| Desktop | Electron |
| Real-time | Socket.io |
| Offline | Dexie.js (IndexedDB) |

## License

GPL-3.0

## Support

For support, contact support@qdocs.net or visit https://smart-hospital.in
