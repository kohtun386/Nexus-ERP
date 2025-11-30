import React, { useState, useMemo } from 'react';
import { usePayroll } from '../hooks/usePayroll';
import { PayrollItem } from '../types/index';
import { Calendar, Download, Save, AlertCircle } from 'lucide-react';

const PayrollPage: React.FC = () => {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // Get first day of current month
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [payrollItems, setPayrollItems] = useState<PayrollItem[]>([]);
  const [step, setStep] = useState<'input' | 'preview' | 'saved'>('input');

  const { loading, error, generatePayroll, savePayroll } = usePayroll();

  // Calculate total payroll amount
  const totalPayroll = useMemo(
    () => payrollItems.reduce((sum, item) => sum + item.netPay, 0),
    [payrollItems]
  );

  // Handle generate preview
  const handleGeneratePreview = async () => {
    try {
      const items = await generatePayroll(startDate, endDate);
      setPayrollItems(items);
      setStep('preview');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle finalize and save
  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize this payroll? This action cannot be undone.')) {
      return;
    }

    try {
      const payrollId = await savePayroll(startDate, endDate, payrollItems);
      setStep('saved');
      alert(`Payroll finalized successfully! ID: ${payrollId}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    const csv = [
      ['Worker Name', 'Production Qty', 'Production Earnings', 'Base Salary', 'Bonus', 'Deductions', 'Net Pay'],
      ...payrollItems.map(item => [
        item.workerName,
        item.totalProductionQty,
        item.productionEarnings.toLocaleString(),
        item.baseSalary.toLocaleString(),
        item.bonus.toLocaleString(),
        item.deductions.toLocaleString(),
        item.netPay.toLocaleString(),
      ]),
      ['TOTAL', '', '', '', '', '', totalPayroll.toLocaleString()],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll_${startDate}_to_${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">Generate and manage monthly payroll for workers</p>
        </div>

        {/* Step 1: Date Range Input */}
        {step === 'input' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Step 1: Select Payroll Period</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period Start Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Period End Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleGeneratePreview}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
            >
              {loading ? 'Generating...' : 'Generate Preview'}
            </button>
          </div>
        )}

        {/* Step 2: Preview & Finalize */}
        {(step === 'preview' || step === 'saved') && payrollItems.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="font-semibold text-gray-900">
                Payroll Preview: {startDate} to {endDate}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {payrollItems.length} workers | Total: {totalPayroll.toLocaleString()} MMK
              </p>
            </div>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Worker Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Prod. Qty</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Prod. Earnings</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Base Salary</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Bonus</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Deductions</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Net Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollItems.map((item, idx) => (
                    <tr
                      key={item.workerId}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                        idx === payrollItems.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">{item.workerName}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{item.totalProductionQty}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{item.productionEarnings.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{item.baseSalary.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-blue-600">{item.bonus.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-red-600">{item.deductions.toLocaleString()}</td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-bold text-green-600">
                        {item.netPay.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={6} className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-semibold text-gray-900 text-right">
                      TOTAL PAYROLL:
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-bold text-blue-600">
                      {totalPayroll.toLocaleString()} MMK
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between">
              <button
                onClick={() => setStep('input')}
                className="bg-gray-200 hover:bg-gray-300 text-gray-900 px-6 py-2 rounded-lg font-medium transition text-sm order-2 sm:order-1"
              >
                ← Back
              </button>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-1 sm:order-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition text-sm"
                >
                  <Download size={16} />
                  Export CSV
                </button>

                {step === 'preview' && (
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition text-sm"
                  >
                    <Save size={16} />
                    {loading ? 'Finalizing...' : 'Finalize & Save'}
                  </button>
                )}

                {step === 'saved' && (
                  <div className="flex items-center justify-center gap-2 bg-green-100 text-green-800 px-6 py-2 rounded-lg font-medium text-sm">
                    ✓ Payroll Saved
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {step === 'input' && payrollItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a date range and generate payroll preview</p>
          </div>
        )}

        {step !== 'input' && payrollItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <AlertCircle size={48} className="text-orange-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No approved logs found for this period</p>
            <button
              onClick={() => setStep('input')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Try different dates
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
