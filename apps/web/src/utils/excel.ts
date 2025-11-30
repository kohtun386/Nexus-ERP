import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

/**
 * Export JSON data to Excel file and trigger download
 * @param data - Array of objects to export
 * @param fileName - Name of the file (without extension)
 * @param sheetName - Name of the worksheet (default: 'Sheet1')
 */
export const exportToExcel = (
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Sheet1'
): void => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert JSON to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns based on content
  const columnWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    ) + 2
  }));
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

  // Create blob and save
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  saveAs(blob, `${fileName}.xlsx`);
};

/**
 * Parse an Excel file and return JSON data
 * @param file - File object from input
 * @returns Promise<any[]> - Parsed data as array of objects
 */
export const parseExcel = (file: File): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '', // Default value for empty cells
          raw: false, // Return formatted strings
        });

        resolve(jsonData as Record<string, any>[]);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please ensure the file is valid.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * Download a template Excel file for worker import
 */
export const downloadWorkerTemplate = (): void => {
  const templateData = [
    {
      Name: 'Ko Aung',
      Phone: '09123456789',
      Role: 'Weaver',
      SalaryType: 'PieceRate',
      BaseSalary: 0,
      JoinedDate: '2025-01-15',
      IsSSB: 'No',
    },
    {
      Name: 'Ma Yin',
      Phone: '09987654321',
      Role: 'Helper',
      SalaryType: 'Monthly',
      BaseSalary: 300000,
      JoinedDate: '2025-02-01',
      IsSSB: 'Yes',
    },
  ];

  exportToExcel(templateData, 'Worker_Import_Template', 'Workers');
};

/**
 * Validate imported worker data
 * @param data - Parsed Excel data
 * @returns Object with valid rows, invalid rows, and errors
 */
export const validateWorkerImport = (data: Record<string, any>[]): {
  validRows: Record<string, any>[];
  invalidRows: { row: number; data: Record<string, any>; errors: string[] }[];
  summary: string;
} => {
  const validRows: Record<string, any>[] = [];
  const invalidRows: { row: number; data: Record<string, any>; errors: string[] }[] = [];

  const validRoles = ['Weaver', 'Helper', 'Supervisor'];
  const validSalaryTypes = ['PieceRate', 'Monthly', 'Daily'];

  data.forEach((row, index) => {
    const errors: string[] = [];
    const rowNum = index + 2; // Excel row number (1-indexed + header)

    // Normalize field names (handle different cases)
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.toLowerCase().trim()] = row[key];
    });

    // Extract values with flexible field names
    const name = normalizedRow['name'] || normalizedRow['worker name'] || normalizedRow['workername'] || '';
    const phone = normalizedRow['phone'] || normalizedRow['phone number'] || normalizedRow['phonenumber'] || '';
    const role = normalizedRow['role'] || normalizedRow['position'] || '';
    const salaryType = normalizedRow['salarytype'] || normalizedRow['salary type'] || normalizedRow['salary_type'] || 'PieceRate';
    const baseSalary = parseFloat(normalizedRow['basesalary'] || normalizedRow['base salary'] || normalizedRow['base_salary'] || '0') || 0;
    const joinedDate = normalizedRow['joineddate'] || normalizedRow['joined date'] || normalizedRow['joined_date'] || new Date().toISOString().split('T')[0];
    const isSSB = String(normalizedRow['isssb'] || normalizedRow['is ssb'] || normalizedRow['ssb'] || 'No').toLowerCase();

    // Validate required fields
    if (!name || String(name).trim() === '') {
      errors.push('Name is required');
    }

    if (!phone || String(phone).trim() === '') {
      errors.push('Phone is required');
    }

    // Validate role
    const normalizedRole = validRoles.find(r => r.toLowerCase() === String(role).toLowerCase().trim());
    if (!normalizedRole) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Validate salary type
    const normalizedSalaryType = validSalaryTypes.find(s => s.toLowerCase() === String(salaryType).toLowerCase().trim());
    if (!normalizedSalaryType) {
      errors.push(`Invalid salary type. Must be one of: ${validSalaryTypes.join(', ')}`);
    }

    if (errors.length === 0) {
      validRows.push({
        name: String(name).trim(),
        phone: String(phone).trim(),
        role: normalizedRole,
        salaryType: normalizedSalaryType,
        baseSalary: baseSalary,
        joinedDate: joinedDate,
        isSSB: isSSB === 'yes' || isSSB === 'true' || isSSB === '1',
        status: 'Active',
      });
    } else {
      invalidRows.push({
        row: rowNum,
        data: row,
        errors,
      });
    }
  });

  const summary = `Valid: ${validRows.length}, Invalid: ${invalidRows.length}`;

  return { validRows, invalidRows, summary };
};

/**
 * Export workers data with formatted columns
 * @param workers - Array of worker objects from Firestore
 * @param fileName - Optional custom file name
 */
export const exportWorkers = (workers: any[], fileName?: string): void => {
  const exportData = workers.map(worker => ({
    Name: worker.name,
    Phone: worker.phone,
    Role: worker.role,
    'Salary Type': worker.salaryType,
    'Base Salary': worker.baseSalary,
    'Joined Date': worker.joinedDate,
    Status: worker.status,
    'SSB Enrolled': worker.isSSB ? 'Yes' : 'No',
  }));

  const date = new Date().toISOString().split('T')[0];
  exportToExcel(exportData, fileName || `Workers_Export_${date}`, 'Workers');
};

/**
 * Export production logs
 */
export const exportProductionLogs = (logs: any[], fileName?: string): void => {
  const exportData = logs.map(log => ({
    Date: log.date,
    Worker: log.workerName,
    Task: log.taskName,
    Quantity: log.quantity,
    'Defect Qty': log.defectQty,
    'Price/Unit': log.pricePerUnit,
    'Total Pay': log.totalPay,
    Status: log.status,
    Shift: log.shift || 'Day',
  }));

  const date = new Date().toISOString().split('T')[0];
  exportToExcel(exportData, fileName || `Production_Logs_${date}`, 'Logs');
};

/**
 * Export invoices
 */
export const exportInvoices = (invoices: any[], fileName?: string): void => {
  const exportData = invoices.map(inv => ({
    Date: inv.date,
    Customer: inv.customerName,
    'Total Amount': inv.totalAmount,
    'Paid Amount': inv.paidAmount,
    'Credit': inv.totalAmount - inv.paidAmount,
    'Payment Method': inv.paymentMethod,
    Status: inv.status,
  }));

  const date = new Date().toISOString().split('T')[0];
  exportToExcel(exportData, fileName || `Invoices_${date}`, 'Invoices');
};

/**
 * Export inventory items
 */
export const exportInventory = (items: any[], fileName?: string): void => {
  const exportData = items.map(item => ({
    Name: item.name,
    Category: item.category,
    'Current Stock': item.currentStock,
    Unit: item.unit,
    'Min Stock Level': item.minStockLevel,
    'Cost/Unit': item.costPerUnit,
    'Total Value': item.currentStock * item.costPerUnit,
  }));

  const date = new Date().toISOString().split('T')[0];
  exportToExcel(exportData, fileName || `Inventory_${date}`, 'Inventory');
};
