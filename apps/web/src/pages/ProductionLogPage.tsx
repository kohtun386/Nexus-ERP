import React, { useState, useMemo } from 'react';
import { useProductionLogs } from '../hooks/useProductionLogs';
import { useWorkers } from '../hooks/useWorkers';
import { useRates } from '../hooks/useRates';
import { WorkerLog } from '../types/index';
import { Plus, Trash2, CheckCircle, X, Calendar, Clock, Package, AlertTriangle } from 'lucide-react';

const ProductionLogPage: React.FC = () => {
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState<'Day' | 'Night'>('Day');
  const [showModal, setShowModal] = useState(false);

  // Hooks
  const { logs, loading: logsLoading, addLog, deleteLog, approveLog, calculateStats } = useProductionLogs(selectedDate);
  const { workers, loading: workersLoading } = useWorkers();
  const { rates, loading: ratesLoading } = useRates();

  // Filter active workers and rates
  const activeWorkers = workers.filter(w => w.status === 'Active');
  const activeRates = rates.filter(r => r.status === 'Active');

  // Calculate stats
  const stats = useMemo(() => calculateStats(), [logs]);

  // Modal state
  const [formData, setFormData] = useState({
    workerId: '',
    rateId: '',
    quantity: 0,
    defectQty: 0,
  });
  const [estimatedPay, setEstimatedPay] = useState(0);

  // Handle form input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: name === 'quantity' || name === 'defectQty' ? parseFloat(value) || 0 : value };
    setFormData(updatedData);

    // Calculate estimated pay in real-time
    if (updatedData.rateId && updatedData.quantity > 0) {
      const selectedRate = activeRates.find(r => r.id === updatedData.rateId);
      if (selectedRate) {
        const netQty = Math.max(0, updatedData.quantity - updatedData.defectQty);
        setEstimatedPay(netQty * selectedRate.pricePerUnit);
      }
    } else {
      setEstimatedPay(0);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({ workerId: '', rateId: '', quantity: 0, defectQty: 0 });
    setEstimatedPay(0);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.workerId || !formData.rateId || formData.quantity <= 0) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.defectQty > formData.quantity) {
      alert('Defect quantity cannot exceed total quantity');
      return;
    }

    try {
      const selectedWorker = activeWorkers.find(w => w.id === formData.workerId);
      const selectedRate = activeRates.find(r => r.id === formData.rateId);

      if (!selectedWorker || !selectedRate) {
        alert('Invalid worker or rate selected');
        return;
      }

      const result = await addLog({
        workerId: formData.workerId,
        workerName: selectedWorker.name,
        rateId: formData.rateId,
        taskName: selectedRate.taskName,
        pricePerUnit: selectedRate.pricePerUnit,
        quantity: formData.quantity,
        defectQty: formData.defectQty,
        shift: selectedShift,
        requiredMaterials: selectedRate.requiredMaterials, // Pass BOM for auto-deduction
      });

      // Show success message with inventory info
      let successMsg = 'Production log added successfully!';
      if (result.materialsDeducted && result.materialsDeducted > 0) {
        successMsg += ` (${result.materialsDeducted} material(s) deducted from inventory)`;
      }
      if (result.stockWarnings && result.stockWarnings.length > 0) {
        successMsg += '\n\n⚠️ Low Stock Warning:\n' + result.stockWarnings.join('\n');
      }
      alert(successMsg);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (logId: string) => {
    if (confirm('Delete this production log?')) {
      try {
        await deleteLog(logId);
        alert('Log deleted successfully!');
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  // Handle approve
  const handleApprove = async (logId: string) => {
    try {
      await approveLog(logId);
      alert('Log approved!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Filter logs by shift if needed
  const filteredLogs = selectedShift ? logs.filter(l => l.shift === selectedShift) : logs;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Logs</h1>
            <p className="text-gray-600 text-sm mt-1">Track daily worker output and earnings</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <Plus size={18} />
            Add Log Entry
          </button>
        </div>

        {/* Date & Shift Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Shift</label>
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-400" />
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value as 'Day' | 'Night')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Day">Day Shift</option>
                <option value="Night">Night Shift</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Output</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOutput.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">units</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Wages</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalWages.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">MMK</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Defects</p>
            <p className="text-2xl font-bold text-orange-600">{stats.totalDefects.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">units</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Approved Logs</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalApproved}/{stats.logCount}</p>
            <p className="text-xs text-gray-500 mt-1">entries</p>
          </div>
        </div>

        {/* Production Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="font-semibold text-gray-900">
              {selectedShift} Shift Logs - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h2>
          </div>

          {logsLoading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No logs for this shift</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Add your first log →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Worker</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Task</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Defect</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Earned</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition ${idx === filteredLogs.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.workerName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.taskName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{log.quantity}</td>
                      <td className="px-6 py-4 text-sm text-orange-600 font-medium">{log.defectQty > 0 ? log.defectQty : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{log.pricePerUnit} MMK</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">{log.totalPay.toLocaleString()} MMK</td>
                      <td className="px-6 py-4 text-sm">
                        {log.status === 'Approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {log.status === 'Pending' && (
                            <button
                              onClick={() => handleApprove(log.id!)}
                              className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition"
                              title="Approve log"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(log.id!)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                            title="Delete log"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Log Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add Production Log</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Worker Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Worker *
                </label>
                <select
                  name="workerId"
                  value={formData.workerId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={workersLoading}
                >
                  <option value="">{workersLoading ? 'Loading workers...' : 'Select a worker'}</option>
                  {activeWorkers.map(worker => (
                    <option key={worker.id} value={worker.id!}>
                      {worker.name} ({worker.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rate/Task Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Task/Rate *
                </label>
                <select
                  name="rateId"
                  value={formData.rateId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={ratesLoading}
                >
                  <option value="">{ratesLoading ? 'Loading rates...' : 'Select a task'}</option>
                  {activeRates.map(rate => (
                    <option key={rate.id} value={rate.id!}>
                      {rate.taskName} ({rate.pricePerUnit} {rate.currency}/{rate.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity Completed *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 120"
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Defect Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Defective Units (Optional)
                </label>
                <input
                  type="number"
                  name="defectQty"
                  value={formData.defectQty || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., 5"
                  min="0"
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Live Calculation Display */}
              {formData.rateId && formData.quantity > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Estimated Earnings:</p>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-500">({formData.quantity} - {formData.defectQty}) × {activeRates.find(r => r.id === formData.rateId)?.pricePerUnit} MMK</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {estimatedPay.toLocaleString()} MMK
                    </p>
                  </div>
                </div>
              )}

              {/* Material Deduction Preview */}
              {formData.rateId && formData.quantity > 0 && (() => {
                const selectedRate = activeRates.find(r => r.id === formData.rateId);
                if (!selectedRate?.requiredMaterials || selectedRate.requiredMaterials.length === 0) return null;
                
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={16} className="text-orange-600" />
                      <p className="text-sm font-medium text-orange-800">Materials to be Deducted:</p>
                    </div>
                    <div className="space-y-1">
                      {selectedRate.requiredMaterials.map((material) => (
                        <div key={material.inventoryItemId} className="flex justify-between text-sm">
                          <span className="text-gray-700">{material.inventoryItemName}</span>
                          <span className="text-orange-700 font-medium">
                            -{(formData.quantity * material.quantityPerUnit).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                >
                  Add Log Entry
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionLogPage;
