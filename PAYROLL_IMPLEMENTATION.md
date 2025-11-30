# Payroll System Implementation

## Overview
Complete payroll module that aggregates daily production logs, adds base salary/bonuses, and generates finalized payslips for workers.

## Files Created/Updated

### 1. **Data Types** (`src/types/index.ts`)
Added two new interfaces:

```typescript
export interface Payroll {
  id?: string;
  factoryId: string;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string;   // YYYY-MM-DD
  totalAmount: number;
  status: 'Draft' | 'Finalized';
  createdAt?: any;
}

export interface PayrollItem {
  id?: string;
  payrollId: string;
  workerId: string;
  workerName: string;
  totalProductionQty: number; // Sum of logs
  productionEarnings: number; // Sum of log earnings
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number; // The final amount
}
```

### 2. **Custom Hook** (`src/hooks/usePayroll.ts`)
Implements two main functions:

#### `generatePayroll(startDate, endDate)`
- Queries approved WorkerLogs between dates
- Groups logs by workerId
- Sums production earnings per worker
- Fetches Worker data for baseSalary
- Calculates deductions (2% SSB if applicable)
- Returns PayrollItem array (preview, no DB save)

#### `savePayroll(startDate, endDate, payrollItems)`
- Creates Payroll document in Firestore
- Creates PayrollItem documents for each worker
- Uses batch write for atomicity
- Returns payrollId

**Features:**
- Loading and error states
- Factory-scoped queries
- Supports SSB (Super Savings Bank) 2% deductions
- Flexible bonus structure (currently 0, can be enhanced)

### 3. **UI Page** (`src/pages/PayrollPage.tsx`)
Multi-step interface:

**Step 1: Date Range Input**
- Calendar pickers for period start/end
- Defaults to current month
- "Generate Preview" button

**Step 2: Preview & Finalize**
- Table showing all workers with detailed breakdown:
  - Worker Name
  - Production Qty
  - Production Earnings
  - Base Salary
  - Bonus
  - Deductions
  - Net Pay
- Total payroll amount (MMK)
- Export to CSV button
- "Finalize & Save" button

**Features:**
- Real-time total calculations
- CSV export functionality
- Responsive table design
- Error handling and alerts
- Confirmation dialog before finalizing

### 4. **Routing** (`src/App.tsx`)
- Route already configured: `/payroll`
- Protected with `requiredRole="owner"`
- Accessible only to factory owners

## Calculation Logic

```
Net Pay = Production Earnings + Base Salary + Bonus - Deductions

Where:
- Production Earnings = Sum of (quantity - defect) × pricePerUnit for approved logs
- Base Salary = Worker's monthly/daily salary
- Bonus = Configurable bonus (currently 0)
- Deductions = 2% of Production Earnings if worker.isSSB == true
```

## Firestore Collections

### `payrolls` Collection
```
{
  factoryId: string,
  periodStart: string,
  periodEnd: string,
  totalAmount: number,
  status: 'Finalized',
  createdAt: Timestamp
}
```

### `payrollItems` Collection
```
{
  payrollId: string (reference to payrolls),
  workerId: string,
  workerName: string,
  totalProductionQty: number,
  productionEarnings: number,
  baseSalary: number,
  bonus: number,
  deductions: number,
  netPay: number
}
```

## Usage Workflow

1. **Owner navigates to `/payroll`**
2. **Selects date range** (defaults to current month)
3. **Clicks "Generate Preview"**
   - System queries all approved logs in that period
   - Groups by worker
   - Calculates totals and deductions
   - Shows preview table
4. **Reviews the breakdown**
5. **Clicks "Finalize & Save"**
   - Confirms action (irreversible)
   - Writes Payroll + PayrollItems to Firestore
   - Shows success message
6. **Optional: Exports to CSV** for external processing

## Firebase Security Rules Update Needed

Add to `firebase/firestore.rules`:

```firestore
// Payroll Collection
match /payrolls/{payrollId} {
  allow read: if request.auth != null && request.auth.token.factoryId == resource.data.factoryId;
  allow create: if request.auth != null && request.auth.token.role == 'owner' && request.resource.data.factoryId == request.auth.token.factoryId;
  allow update, delete: if false; // Immutable
}

// Payroll Items Collection
match /payrollItems/{itemId} {
  allow read: if request.auth != null && (resource.data.payrollId != null);
  allow write: if false; // Only server/function writes
}
```

## Environment & Dependencies

**Already imported:**
- Firebase Firestore (collection, query, where, getDocs, addDoc, writeBatch, Timestamp)
- React hooks (useState, useMemo)
- Tailwind CSS for styling
- Lucide icons (Calendar, Download, Save, AlertCircle)

**No additional npm packages required**

## Next Steps

1. Deploy updated Firebase Rules (if needed)
2. Test payroll generation with sample data
3. Consider adding:
   - Payroll history view
   - Worker-specific payslips
   - Approval workflow
   - Bonus configuration UI
   - Custom deduction management

## Testing Checklist

- [ ] Generate payroll with no logs (should show empty state)
- [ ] Generate payroll with multiple workers and logs
- [ ] Verify calculations (production earnings, deductions, net pay)
- [ ] Test SSB deduction (2%) for workers with isSSB=true
- [ ] Export CSV and verify formatting
- [ ] Finalize payroll and verify Firestore entries
- [ ] Verify immutability (cannot edit after finalized)
- [ ] Test with different date ranges
