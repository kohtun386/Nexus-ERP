# Inventory Transactions Module (Block 2) Implementation

## Overview
Complete inventory transaction system for tracking "Stock In" (purchases) and "Stock Out" (usage) events. Uses atomic Firestore operations to automatically update inventory stock levels.

## Files Created/Updated

### 1. **Data Types** (`src/types/index.ts`)
Added InventoryTransaction interface:

```typescript
export interface InventoryTransaction {
  id?: string;
  factoryId: string;
  itemId: string;
  itemName: string;       // Denormalized
  type: 'IN' | 'OUT';     // IN = Purchase, OUT = Usage
  quantity: number;
  reason: string;         // e.g., "Purchase from Supplier A", "Production Lot 101"
  costPerUnit?: number;   // Only for IN transactions
  totalCost?: number;     // Calculated (quantity * costPerUnit)
  date: string;           // YYYY-MM-DD
  performedBy: string;    // User email/name
  timestamp?: any;        // Server timestamp
}
```

### 2. **Custom Hook** (`src/hooks/useInventoryTransactions.ts`)
Implements inventory transaction management with atomic operations:

#### Features:
- **Real-time listeners** using Firestore `onSnapshot`
- **Atomic operations** using `writeBatch` for data consistency
- **Stock validation** for OUT transactions (prevents over-deduction)
- **Auto-calculation** of totalCost for IN transactions
- **Automatic timestamp** management

#### Core Function:

**`addTransaction(transactionData)`** - Atomic Operation:

```
Step 1: Create new document in inventoryTransactions collection
Step 2: Update currentStock in inventory collection
  - For IN: Add quantity to currentStock
  - For OUT: Subtract quantity from currentStock
Step 3: For IN transactions, update costPerUnit (Last Purchase Price)
```

**Validation:**
- Required fields: itemId, itemName, quantity, reason
- Quantity must be > 0
- For OUT transactions: currentStock >= quantity (prevents negative stock)
- Uses Firestore `increment()` for atomic stock updates

#### Flow Example:

**Stock In (Purchase):**
```
User records: +100 Yards of Fabric @ 2000 MMK
- Create transaction document
- Add increment(+100) to inventory.currentStock
- Update inventory.costPerUnit = 2000
- Result: Inventory increased by 100 units
```

**Stock Out (Usage):**
```
User records: -50 Yards for Production Lot 101
- Validate: currentStock (300) >= quantity (50) ✓
- Create transaction document
- Add increment(-50) to inventory.currentStock
- Result: Inventory decreased by 50 units
```

### 3. **UI Page** (`src/pages/InventoryTransactionsPage.tsx`)
Comprehensive transaction management interface:

#### Section 1: Header with Navigation
- Back button (chevron left) linking to `/inventory`
- Page title: "Stock Movement Logs"
- Two action buttons (responsive):
  - **Stock In** (Green button with ↑ icon)
  - **Stock Out** (Red button with ↓ icon)

#### Section 2: Statistics Cards
Four responsive cards showing:
1. **Total Transactions** - Count of all transactions
2. **Stock In (Today)** - Count of today's purchases
3. **Stock Out (Today)** - Count of today's usages
4. **Total IN Cost** - Sum of totalCost for today's IN transactions

**Mobile Layout:**
- Mobile: `grid-cols-1` (stacked)
- Tablet: `grid-cols-2`
- Desktop: `grid-cols-4`

#### Section 3: Transactions Table
Displays all transactions sorted by date (newest first):

**Columns:**
- **Date** - Transaction date (formatted)
- **Item** - Product name (denormalized)
- **Type** - Badge with green "↑ In" or red "↓ Out"
- **Qty** - Quantity moved
- **Reason** - Supplier/Production lot reference
- **By** - User who performed transaction

**Mobile Features:**
- Horizontal scroll: `overflow-x-auto -mx-4 sm:mx-0`
- Responsive padding: `px-3 sm:px-6`
- Responsive text: `text-xs sm:text-sm`

#### Section 4: Stock In Modal (Green)
Form to record purchases:

**Fields:**
1. **Item** (dropdown) - Select inventory item
2. **Quantity** (number) - Amount to add
3. **Cost Per Unit** (number) - Price in MMK
4. **Supplier/Reason** (text) - Supplier name or reference

**Features:**
- Real-time total cost calculation display
- Input validation before submit
- Error messages for validation failures
- Cancel button

**Validation:**
- All fields required
- Quantity must be > 0
- Cost Per Unit must be > 0

#### Section 5: Stock Out Modal (Red)
Form to record usage:

**Fields:**
1. **Item** (dropdown) - Select inventory item with available stock shown
2. **Quantity** (number) - Amount to remove
3. **Usage Reason** (text) - Production lot or usage reason

**Features:**
- Shows current available stock in dropdown
- Validates sufficient stock before submit
- Shows clear error if insufficient stock
- Input validation before submit

**Validation:**
- All fields required
- Quantity must be > 0
- Quantity must be <= currentStock
- Shows exact error: "Available: X, Requested: Y"

### 4. **Updated Files**

#### `src/App.tsx`
- Added import: `InventoryTransactionsPage`
- Added route: `/inventory/transactions` (owner-only)

#### `src/pages/InventoryPage.tsx`
- Added "View History" button linking to `/inventory/transactions`
- Button positioned next to "Add Item" button
- Responsive button layout on mobile

---

## Firestore Collections

### `inventoryTransactions` Collection
```json
{
  "factoryId": "string",
  "itemId": "string",
  "itemName": "string",
  "type": "IN" or "OUT",
  "quantity": "number",
  "reason": "string",
  "costPerUnit": "number" (only for IN),
  "totalCost": "number" (only for IN),
  "date": "string" (YYYY-MM-DD),
  "performedBy": "string" (user email),
  "timestamp": "Timestamp"
}
```

### `inventory` Collection (Updated)
When a transaction is created, the inventory item is updated:

```json
{
  "currentStock": "number" (incremented/decremented),
  "costPerUnit": "number" (updated for IN transactions),
  "lastUpdated": "Timestamp"
}
```

---

## Firebase Security Rules Update

Add to `firebase/firestore.rules`:

```firestore
// Inventory Transactions Collection
match /inventoryTransactions/{transactionId} {
  allow read: if request.auth != null && request.auth.token.factoryId == resource.data.factoryId;
  allow create: if request.auth != null && request.auth.token.role == 'owner' && request.resource.data.factoryId == request.auth.token.factoryId;
  allow update, delete: if false; // Immutable - cannot edit transactions
}
```

**Important:** Transactions should be immutable (audit trail). Users cannot edit or delete transactions after creation.

---

## Mobile Responsiveness

**Implemented patterns:**
- `grid-cols-1 sm:grid-cols-2 md:grid-cols-4` - Stats cards
- `flex gap-2 sm:gap-3 w-full sm:w-auto` - Action buttons
- `flex items-center justify-center` - Button content centers on mobile
- `flex-1 sm:flex-none` - Full-width on mobile, auto on desktop
- `overflow-x-auto -mx-4 sm:mx-0` - Table horizontal scroll
- `px-3 sm:px-6` - Responsive table padding
- `text-xs sm:text-sm` - Responsive table text

---

## Usage Workflow

### Recording Stock In (Purchase):

1. User navigates to `/inventory`
2. Clicks "View History" button
3. Clicks green "Stock In" button
4. Modal opens with form
5. Selects item from dropdown
6. Enters:
   - Quantity (e.g., 100)
   - Cost Per Unit (e.g., 2000 MMK)
   - Supplier name (e.g., "Supplier A")
7. Sees total cost calculated: 200,000 MMK
8. Clicks "Record Stock In"
9. ✅ Transaction created
10. ✅ Inventory stock increased by 100
11. ✅ costPerUnit updated to 2000

### Recording Stock Out (Usage):

1. User navigates to `/inventory`
2. Clicks "View History" button
3. Clicks red "Stock Out" button
4. Modal opens with form
5. Selects item from dropdown (shows: "Fabric (Available: 300 Yards)")
6. Enters:
   - Quantity (e.g., 50)
   - Usage reason (e.g., "Production Lot 101")
7. Clicks "Record Stock Out"
8. ✅ Validation passes (300 >= 50)
9. ✅ Transaction created
10. ✅ Inventory stock decreased by 50 (now 250)

### Validation Examples:

**Insufficient Stock Error:**
```
Available: 30 Yards
Requested: 50 Yards
Error: "Insufficient stock. Available: 30 Yards, Requested: 50 Yards"
```

**Missing Fields Error:**
```
Error: "Please fill in all required fields"
```

**Invalid Quantity:**
```
Error: "Quantity must be greater than 0"
```

---

## Atomic Operation Details

### Why Atomic Operations Matter:

Without atomicity:
1. Transaction created ✓
2. Network fails during stock update ✗
3. Result: Transaction exists but stock not updated (Data inconsistency)

With `writeBatch`:
1. Transaction document prepared
2. Stock update prepared
3. Both operations sent together
4. Both succeed or both fail (No partial updates)

### Firestore writeBatch Process:

```typescript
const batch = writeBatch(db);

// Step 1: Prepare transaction creation
batch.set(transactionRef, transactionData);

// Step 2: Prepare stock update
batch.update(itemRef, {
  currentStock: increment(stockChange),
  lastUpdated: Timestamp.now()
});

// Step 3: Atomic commit - both or nothing
await batch.commit();
```

---

## Calculation Examples

### Stock In Calculation:
```
Previous Stock: 500 Yards
Quantity Added: 100 Yards
Cost Per Unit: 2000 MMK
Total Cost: 100 × 2000 = 200,000 MMK

Result:
- New Stock: 500 + 100 = 600 Yards
- costPerUnit Updated: 2000 MMK
```

### Stock Out Calculation:
```
Previous Stock: 600 Yards
Quantity Removed: 50 Yards
Reason: Production Lot 101

Result:
- New Stock: 600 - 50 = 550 Yards
- Transaction Recorded: -50 on [date]
```

### Daily Total IN Cost:
```
Transaction 1: +100 @ 2000 = 200,000 MMK
Transaction 2: +50 @ 2500 = 125,000 MMK
Daily Total IN Cost: 325,000 MMK (0.325M)
```

---

## Testing Checklist

- [ ] Add Stock In transaction successfully
- [ ] Verify inventory stock increased
- [ ] Verify costPerUnit updated
- [ ] Add Stock Out transaction successfully
- [ ] Verify inventory stock decreased
- [ ] Test insufficient stock error (try to remove more than available)
- [ ] Test form validation (missing fields)
- [ ] Verify transaction appears in table (newest first)
- [ ] Test table date formatting
- [ ] Test badge colors (Green for IN, Red for OUT)
- [ ] Test responsive layout (mobile/tablet/desktop)
- [ ] Verify navigation back to /inventory works
- [ ] Test today's transaction counts in stats cards
- [ ] Test total IN cost calculation
- [ ] Verify performedBy shows user email
- [ ] Test on mobile device (< 640px)
- [ ] Test on tablet (640px - 768px)
- [ ] Test on desktop (> 768px)

---

## Next Steps

1. **Deploy Firebase Rules** (add inventoryTransactions collection rules)
2. **Test all workflows** using checklist above
3. **Monitor Firestore usage** in Firebase Console
4. **Consider adding:**
   - Transaction edit (with audit trail)
   - Bulk import (CSV upload)
   - Transaction reports (monthly/yearly)
   - Supplier management
   - Low stock auto-ordering

---

## Summary

✅ **Inventory Transactions Module Status: COMPLETE**

- Data model: ✅
- Custom hook with atomic operations: ✅
- UI page with modals: ✅
- Routing and navigation: ✅
- Mobile responsive: ✅
- Stock validation: ✅
- Real-time updates: ✅
- Error handling: ✅

Ready for production after Firebase Rules deployment.
