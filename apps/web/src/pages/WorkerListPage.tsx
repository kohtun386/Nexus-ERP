import React, { useState, useRef } from 'react';
import { useWorkers } from '../hooks/useWorkers';
import { Worker } from '../types/index';
import { Plus, Search, Edit, Trash2, X, Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { exportWorkers, parseExcel, validateWorkerImport, downloadWorkerTemplate } from '../utils/excel';

const WorkerListPage: React.FC = () => {
  const { workers, loading, addWorker, updateWorker, toggleWorkerStatus, error } = useWorkers();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'Helper' as const,
    salaryType: 'PieceRate' as const,
    baseSalary: 0,
    joinedDate: '',
    status: 'Active' as const,
    isSSB: false,
  });

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<{
    validRows: Record<string, any>[];
    invalidRows: { row: number; data: Record<string, any>; errors: string[] }[];
    summary: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const roleOptions = ['Weaver', 'Helper', 'Supervisor'];
  const salaryTypes = ['PieceRate', 'Monthly', 'Daily'];

  // Filter workers based on search
  const filteredWorkers = workers.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.phone.includes(searchTerm)
  );

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      ...(name === 'baseSalary' && { baseSalary: parseFloat(value) || 0 })
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      role: 'Helper',
      salaryType: 'PieceRate',
      baseSalary: 0,
      joinedDate: '',
      status: 'Active',
      isSSB: false,
    });
    setEditingWorker(null);
  };

  // Handle add/update worker
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.joinedDate) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingWorker && editingWorker.id) {
        await updateWorker(editingWorker.id, formData);
        alert('Worker updated successfully!');
      } else {
        await addWorker(formData);
        alert('Worker added successfully!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle edit worker
  const handleEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      phone: worker.phone,
      role: worker.role,
      salaryType: worker.salaryType,
      baseSalary: worker.baseSalary,
      joinedDate: worker.joinedDate,
      status: worker.status,
      isSSB: worker.isSSB,
    });
    setShowModal(true);
  };

  // Handle toggle status
  const handleToggleStatus = async (workerId: string, currentStatus: 'Active' | 'Inactive') => {
    try {
      await toggleWorkerStatus(workerId, currentStatus);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // === EXPORT FUNCTIONALITY ===
  const handleExport = () => {
    if (workers.length === 0) {
      alert('No workers to export');
      return;
    }
    try {
      exportWorkers(workers);
      alert('Workers exported successfully!');
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // === IMPORT FUNCTIONALITY ===
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcel(file);
      if (data.length === 0) {
        alert('The Excel file is empty');
        return;
      }

      const result = validateWorkerImport(data);
      setImportData(result);
      setShowImportModal(true);
      setImportResult(null);
    } catch (err: any) {
      alert(`Failed to parse file: ${err.message}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
    if (!importData || importData.validRows.length === 0) {
      alert('No valid rows to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const row of importData.validRows) {
        try {
          await addWorker({
            name: row.name,
            phone: row.phone,
            role: row.role as 'Weaver' | 'Helper' | 'Supervisor',
            salaryType: row.salaryType as 'PieceRate' | 'Monthly' | 'Daily',
            baseSalary: row.baseSalary || 0,
            joinedDate: row.joinedDate,
            status: 'Active',
            isSSB: row.isSSB || false,
          });
          successCount++;
        } catch (err) {
          console.error('Failed to import worker:', row.name, err);
          failCount++;
        }
      }

      setImportResult({ success: successCount, failed: failCount });
      
      if (successCount > 0) {
        alert(`Successfully imported ${successCount} workers!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      }
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadWorkerTemplate();
      alert('Template downloaded! Fill it out and import.');
    } catch (err: any) {
      alert(`Failed to download template: ${err.message}`);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportData(null);
    setImportResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Worker Management</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Manage your factory workforce</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition font-medium text-sm"
              title="Export to Excel"
            >
              <Download size={16} />
              Export
            </button>

            {/* Import Button */}
            <label className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg transition font-medium text-sm cursor-pointer">
              <Upload size={16} />
              Import
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {/* Template Button */}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg transition font-medium text-sm"
              title="Download import template"
            >
              <FileSpreadsheet size={16} />
              Template
            </button>

            {/* Add Worker Button */}
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition font-medium text-sm"
            >
              <Plus size={16} />
              Add Worker
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Workers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading workers...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No workers found</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Add your first worker →
                </button>
                <span className="text-gray-400">or</span>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                >
                  Import from Excel →
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Salary Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Base Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((worker, idx) => (
                    <tr key={worker.id} className={`border-b border-gray-100 hover:bg-gray-50 transition ${idx === filteredWorkers.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{worker.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{worker.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{worker.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{worker.salaryType}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                        {worker.salaryType === 'PieceRate' ? '—' : `${worker.baseSalary.toLocaleString()} MMK`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(worker.joinedDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleToggleStatus(worker.id!, worker.status)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer ${
                            worker.status === 'Active'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {worker.status === 'Active' ? '✓' : '✕'} {worker.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(worker)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                            title="Edit worker"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${worker.name}?`)) {
                                alert('Delete functionality coming soon!');
                              }
                            }}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                            title="Delete worker"
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

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Workers</p>
            <p className="text-2xl font-bold text-gray-900">{workers.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Active Workers</p>
            <p className="text-2xl font-bold text-green-600">{workers.filter(w => w.status === 'Active').length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Inactive Workers</p>
            <p className="text-2xl font-bold text-red-600">{workers.filter(w => w.status === 'Inactive').length}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingWorker ? 'Edit Worker' : 'Add New Worker'}
              </h2>
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
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Ko Aung"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g., 09xxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Joined Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Joined Date *</label>
                <input
                  type="date"
                  name="joinedDate"
                  value={formData.joinedDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Role & Salary Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roleOptions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type *</label>
                  <select
                    name="salaryType"
                    value={formData.salaryType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {salaryTypes.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Base Salary */}
              {formData.salaryType !== 'PieceRate' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary (MMK) *</label>
                  <input
                    type="number"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleInputChange}
                    placeholder="e.g., 50000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              )}

              {/* Status & SSB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isSSB"
                      checked={formData.isSSB}
                      onChange={handleInputChange}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Apply 2% SSB Deduction</span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                >
                  {editingWorker ? 'Update Worker' : 'Add Worker'}
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

      {/* Import Preview Modal */}
      {showImportModal && importData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileSpreadsheet size={24} className="text-orange-600" />
                Import Preview
              </h2>
              <button onClick={closeImportModal} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={20} className="text-green-600" />
                    <span className="font-medium text-green-800">Valid Rows</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mt-2">{importData.validRows.length}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-600" />
                    <span className="font-medium text-red-800">Invalid Rows</span>
                  </div>
                  <p className="text-3xl font-bold text-red-600 mt-2">{importData.invalidRows.length}</p>
                </div>
              </div>

              {/* Valid Rows Preview */}
              {importData.validRows.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Workers to Import:</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                          <th className="px-3 py-2 text-left">Role</th>
                          <th className="px-3 py-2 text-left">Salary Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.validRows.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-t border-gray-200">
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2">{row.phone}</td>
                            <td className="px-3 py-2">{row.role}</td>
                            <td className="px-3 py-2">{row.salaryType}</td>
                          </tr>
                        ))}
                        {importData.validRows.length > 10 && (
                          <tr className="border-t border-gray-200 bg-gray-50">
                            <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                              ... and {importData.validRows.length - 10} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invalid Rows */}
              {importData.invalidRows.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-medium text-red-800 mb-2">Errors (will be skipped):</h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {importData.invalidRows.map((item, idx) => (
                      <div key={idx} className="text-sm text-red-700 mb-2">
                        <span className="font-medium">Row {item.row}:</span> {item.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Result */}
              {importResult && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    <span className="font-medium">Import Complete:</span> {importResult.success} succeeded, {importResult.failed} failed
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleImportConfirm}
                  disabled={importing || importData.validRows.length === 0 || importResult !== null}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-2 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>Importing...</>
                  ) : importResult ? (
                    <>Import Complete</>
                  ) : (
                    <>
                      <Upload size={18} />
                      Import {importData.validRows.length} Workers
                    </>
                  )}
                </button>
                <button
                  onClick={closeImportModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition"
                >
                  {importResult ? 'Close' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerListPage;
