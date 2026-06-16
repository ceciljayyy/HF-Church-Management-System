# ⛪ Church Management System

<div align="center">

# **Modern Multi-Branch Church Management System**

A clean, scalable, and powerful Church Management System built with  
**Next.js**, **TypeScript**, **PostgreSQL**, **Prisma**, **Tailwind CSS**, and a structured frontend/backend architecture.

Manage members, departments, attendance, finances, expenses, branches, activities, and church operations from one premium dashboard.

<br />

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-2563EB?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-0F766E?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-111827?style=for-the-badge&logo=prisma&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

</div>

---

## ✨ Overview

The **Church Management System** is designed to help churches manage their daily operations digitally with speed, structure, and simplicity.

It supports a modern multi-branch church setup where administrators can manage members, departments, finance records, expenses, attendance, reports, and activities using a clean dashboard interface.

The system follows a professional architecture where the frontend and backend are separated clearly for better security, maintainability, and scalability.

---

## 🎨 Design Style

The user interface follows a premium church dashboard theme:

<div align="center">

| Theme | Description |
|---|---|
| 🖤 **Dark Charcoal** | Professional dashboard background |
| 💚 **Emerald Green** | Primary action and success color |
| 🟢 **Lime Accent** | Highlights, active states, and modern UI glow |
| ⚪ **Clean Cards** | Soft rounded cards with clear spacing |
| 📊 **Dashboard Feel** | Modern admin layout with statistics and activity panels |

</div>

---

## 🚀 Features

### 👥 Member Management
- Add, edit, and manage church members
- View member profiles
- Track personal and church-related details
- Import member data from external sources

### 🏛️ Department Management
- Create and manage departments
- Assign leaders and members
- View department members and positions
- Track ministry structure clearly

### 📅 Attendance Management
- Record attendance for services and meetings
- View attendance trends
- Track member participation

### 💰 Finance Management
- Manage income and church financial records
- Track giving, donations, and payments
- View financial summaries

### 🧾 Expense Management
- Add and manage church expenses
- Filter expenses by category, date, status, and payment type
- Track pending and paid expenses

### 🌍 Multi-Branch Support
- Manage different church branches
- Keep branch records organized
- Support scalable church growth

### 🔐 Role-Based Access
- Shared permissions structure
- Controlled access for different users
- Secure backend business rules

### 📊 Dashboard
- Overview statistics
- Recent activity panel
- Quick access to major modules
- Clean admin experience

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Backend | Next.js API App |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Styling | Tailwind CSS |
| Architecture | Monorepo Workspace |

---

## 📁 Project Structure

```bash
church-management-system/
│
├── apps/
│   ├── web/              # Frontend Next.js app
│   └── api/              # Backend Next.js API app
│
├── packages/
│   └── shared/           # Shared schemas, permissions, and constants
│
├── docs/                 # Product, database, API, UI, and developer docs
│
├── .env.example          # Example environment variables
├── package.json
└── README.md
