[![Madison88 ITSM Platform](https://m88itsm.netlify.app/logo.png)](https://m88itsm.netlify.app)

# Madison88 ITSM Platform

A comprehensive IT Service Management (ITSM) solution to automate, centralize, and optimize IT support operations across global regions. Built for scale, security, and ease of use.

---

## 🚀 Project Overview

- **Automated ticketing system** for 500+ users, 10,000+ tickets/year
- **Global coverage:** Philippines, US, Indonesia
- **Backend:** Node.js (Express), PostgreSQL, Redis, Socket.io
- **Frontend:** React.js, Tailwind CSS, Material-UI
- **Features:**
  - User authentication (JWT)
  - Ticket CRUD & auto-classification
  - SLA tracking & escalation
  - Intelligent routing
  - Email notifications
  - Real-time updates
  - Knowledge base, change management, asset tracking
  - Audit logging & dashboards

---

## 🗂️ Folder Structure

- backend/ — Node.js API, Express, PostgreSQL, Redis
- frontend/ — React SPA, Tailwind CSS, Material-UI
- database/ — Schema, migrations, seed scripts
- documentation/ — Guides, API docs, ERD, troubleshooting

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, PostgreSQL, Redis, Socket.io
- **Frontend:** React.js, Tailwind CSS, Material-UI, Zustand
- **Dev Tools:** ESLint, Prettier, Jest, Cypress, Nodemon
- **Deployment:** Docker, Render (backend), Netlify (frontend)

---

## 📦 Setup & Installation

### Backend
```bash
cd backend
npm install
npm run migrate   # Run DB migrations
npm run seed      # Seed initial data
npm start         # Start server
```

### Frontend
```bash
cd frontend
npm install
npm start         # Start React app
```

### Environment Variables
- See backend/.env.example and FINAL_DEPLOYMENT_CONFIG.md for required variables
- Configure Netlify and Render as per FINAL_DEPLOYMENT_CONFIG.md

---

## 🚢 Deployment

- **Backend:** Deploy to Render, set env vars as per FINAL_DEPLOYMENT_CONFIG.md
- **Frontend:** Deploy to Netlify, set VITE_API_URL to backend endpoint
- Full steps: See QUICK_DEPLOYMENT.md and FINAL_DEPLOYMENT_CONFIG.md

---

## 📝 Documentation

- DOCUMENTATION_INDEX.md — All docs
- documentation/API_DOCUMENTATION.md — API reference
- documentation/SYSTEM_ARCHITECTURE.md — Architecture
- documentation/DATABASE_ERD.md — Database design
- documentation/USER_MANUAL.md — User guide
- documentation/ADMIN_GUIDE.md — Admin guide
- documentation/TROUBLESHOOTING.md — Troubleshooting

---

## 👥 Contributors

- Madison88 IT Team

---

## 📄 License

Proprietary — All rights reserved.

---

## 🔗 Live Demo

- Frontend: https://m88itsm.netlify.app
- Backend: https://madison88-itsm-platform.onrender.com

---

## 💡 Quick Start

See documentation/QUICK_START_GUIDE.md for user onboarding.
