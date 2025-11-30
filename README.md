# Nexus ERP - Textile Factory Management System

Nexus ERP is a comprehensive SaaS solution designed for textile factories in Myanmar. It streamlines the entire production lifecycle from raw material procurement to finished goods sales and payroll management.

---

## 🚀 Key Features

### 🏭 Module A: Production & Payroll

- **Worker Management**: Track employee profiles, roles, and status.
- **Daily Production Logs**: Record output per worker with live earnings calculation.
- **Snapshot Logic**: Preserves historical rates for accurate record-keeping.
- **Automated Payroll**: One-click salary calculation including bonuses, deductions, and SSB.

### 📦 Module B: Inventory Management

- **Stock Tracking**: Real-time monitoring of raw materials (Fabric, Thread, etc.).
- **BOM Auto-Deduction**: Automatically deducts materials based on production output.
- **Low Stock Alerts**: Visual warnings when items fall below minimum levels.
- **Transaction History**: Complete audit trail of stock in/out events.

### 🛍️ Module C: Sales & POS

- **Point of Sale**: Create invoices for retail and wholesale customers.
- **Credit Management**: Track outstanding balances and customer credit history.
- **Invoicing**: Generate digital invoices with payment status tracking.

### 📊 Module D: Analytics & Reporting

- **Visual Dashboard**: Interactive charts for production trends and top performers.
- **Excel Integration**: Bulk import workers and export payroll data for offline use.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (Vite), TypeScript, Tailwind CSS |
| Backend | Firebase (Authentication, Firestore, Cloud Functions) |
| State Management | React Context API, Custom Hooks |
| Charts | Recharts |
| Security | Role-based Access Control (RBAC) with Firestore Rules |

---

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kohtun386/Nexus-ERP.git
   cd Nexus-ERP
   ```

2. **Install Dependencies**
   ```bash
   cd apps/web
   npm install
   ```

3. **Run Locally**
   ```bash
   npm run dev
   ```

---

## 🔒 Security & Roles

| Role | Access Level |
|------|--------------|
| **Owner** | Full access to all modules, settings, and sensitive data |
| **Supervisor** | Access to daily logs, inventory tracking, and POS |

**Factory Isolation**: Strict data separation ensures users only see their factory's data.

---

## 📁 Project Structure

```
Nexus-ERP/
├── apps/
│   └── web/                    # React frontend
│       ├── src/
│       │   ├── components/     # Reusable UI components
│       │   ├── context/        # React Context providers
│       │   ├── hooks/          # Custom React hooks
│       │   ├── pages/          # Page components
│       │   ├── types/          # TypeScript interfaces
│       │   └── utils/          # Utility functions
│       └── package.json
├── functions/                  # Firebase Cloud Functions
├── firebase/                   # Firestore rules & indexes
└── README.md
```

---

## 📜 License

This project is proprietary software developed for the textile industry.

---

## 👤 Author

Developed by [kohtun386](https://github.com/kohtun386)
