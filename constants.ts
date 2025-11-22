
import { Customer, InventoryItem, Task, WorkerLog, Order, Deduction, PayrollRun, User } from "./types";

export const MOCK_FACTORY_ID = "FAC-001";

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    factoryId: MOCK_FACTORY_ID,
    itemId: "YARN-001",
    name: "Cotton Yarn Grade A",
    type: "raw_material",
    currentStock: 500,
    unit: "kg",
    reorderLevel: 100
  },
  {
    factoryId: MOCK_FACTORY_ID,
    itemId: "FABRIC-A",
    name: "Cotton Fabric White",
    type: "finished_good",
    currentStock: 50,
    unit: "yards",
    reorderLevel: 200
  },
  {
    factoryId: MOCK_FACTORY_ID,
    itemId: "FABRIC-B",
    name: "Silk Blend Red",
    type: "finished_good",
    currentStock: 120,
    unit: "yards",
    reorderLevel: 50
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    factoryId: MOCK_FACTORY_ID,
    id: "CUST-001",
    name: "Daw Mya Garment",
    phone: "09123456789",
    totalPurchases: 1500000,
    lastOrderDate: "2023-10-15T10:00:00Z"
  },
  {
    factoryId: MOCK_FACTORY_ID,
    id: "CUST-002",
    name: "Shwe Mandalay Textiles",
    phone: "09987654321",
    totalPurchases: 500000,
    lastOrderDate: "2023-10-20T14:30:00Z"
  }
];

// The "Tasks" connecting production to inventory
export const MASTER_TASKS: Task[] = [
  {
    id: "TASK-001",
    taskName: "Spinning (Yarn Production)",
    pricePerUnit: 500,
    outputInventoryId: "YARN-001" 
  },
  {
    id: "TASK-002",
    taskName: "Weaving Task A (Fabric A)",
    pricePerUnit: 1200,
    outputInventoryId: "FABRIC-A" // THE CRITICAL LINK
  },
  {
    id: "TASK-003",
    taskName: "Weaving Task B (Fabric B)",
    pricePerUnit: 1500,
    outputInventoryId: "FABRIC-B" // THE CRITICAL LINK
  },
  {
    id: "TASK-004",
    taskName: "Machine Maintenance",
    pricePerUnit: 5000,
    outputInventoryId: null // Does not produce physical stock
  }
];

export const INITIAL_LOGS: WorkerLog[] = [
  {
    id: "LOG-001",
    date: "2023-10-26",
    workerName: "Mg Ba",
    taskId: "TASK-002",
    quantityCompleted: 10,
    totalPay: 12000,
    status: 'pending'
  }
];

export const INITIAL_ORDERS: Order[] = [];

export const INITIAL_DEDUCTIONS: Deduction[] = [
  {
    id: "DED-001",
    workerName: "Mg Ba",
    type: "advance",
    amount: 5000,
    date: "2023-10-25",
    reason: "Emergency Advance",
    isRecurring: false
  }
];

export const INITIAL_PAYROLL_RUNS: PayrollRun[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: "USR-001",
    name: "U Kyaw (Owner)",
    email: "owner@factory.com",
    role: 'Owner',
    status: 'Active',
    lastActive: "2023-10-27T09:00:00Z"
  },
  {
    id: "USR-002",
    name: "Daw Hla (Supervisor)",
    email: "hla@factory.com",
    role: 'Supervisor',
    status: 'Active',
    lastActive: "2023-10-27T08:30:00Z"
  }
];
