import React, { useState } from 'react';
import { useRates } from '../hooks/useRates';
import { useInventory } from '../hooks/useInventory';
import { Rate, MaterialRequirement } from '../types/index';
import { Plus, Search, Edit, Archive, RotateCcw, X, Trash2, Package } from 'lucide-react';

const RatesPage: React.FC = () => {
  const { rates, loading, addRate, updateRate, archiveRate, restoreRate, error } = useRates();
  const { items: inventoryItems } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Archived'>('Active');
  const [editingRate, setEditingRate] = useState<Rate | null>(null);
  const [formData, setFormData] = useState({
    taskName: '',
    pricePerUnit: 0,
    unit: 'pcs',
    currency: 'MMK',
    status: 'Active' as const,
    description: '',
  });

  // BOM (Bill of Materials) state
  const [requiredMaterials, setRequiredMaterials] = useState<MaterialRequirement[]>([]);
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantityPerUnit, setQuantityPerUnit] = useState(0);

  const unitOptions = ['pcs', 'yards', 'kg', 'meter', 'hour', 'box', 'dozen'];
  const currencyOptions = ['MMK', 'USD', 'THB'];

  // Filter rates based on search and status
  const filteredRates = rates.filter(r => {
    const matchesSearch = r.taskName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Group rates by status
  const activeRates = filteredRates.filter(r => r.status === 'Active');
  const archivedRates = filteredRates.filter(r => r.status === 'Archived');

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      taskName: '',
      pricePerUnit: 0,
      unit: 'pcs',
      currency: 'MMK',
      status: 'Active',
      description: '',
    });
    setRequiredMaterials([]);
    setSelectedInventoryId('');
    setQuantityPerUnit(0);
    setEditingRate(null);
  };

  // Add material to BOM
  const handleAddMaterial = () => {
    if (!selectedInventoryId || quantityPerUnit <= 0) {
      alert('Please select an item and enter a valid quantity per unit.');
      return;
    }

    // Check if material already added
    if (requiredMaterials.some(m => m.inventoryItemId === selectedInventoryId)) {
      alert('This material is already added. Remove it first to update.');
      return;
    }

    const selectedItem = inventoryItems.find(item => item.id === selectedInventoryId);
    if (!selectedItem) return;

    const newMaterial: MaterialRequirement = {
      inventoryItemId: selectedInventoryId,
      inventoryItemName: selectedItem.name,
      quantityPerUnit: quantityPerUnit,
    };

    setRequiredMaterials(prev => [...prev, newMaterial]);
    setSelectedInventoryId('');
    setQuantityPerUnit(0);
  };

  // Remove material from BOM
  const handleRemoveMaterial = (inventoryItemId: string) => {
    setRequiredMaterials(prev => prev.filter(m => m.inventoryItemId !== inventoryItemId));
  };

  // Handle add/update rate
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.taskName || formData.pricePerUnit <= 0) {
      alert('Please fill in all required fields. Price must be greater than 0.');
      return;
    }

    try {
      const rateData = {
        ...formData,
        requiredMaterials: requiredMaterials.length > 0 ? requiredMaterials : undefined,
      };

      if (editingRate && editingRate.id) {
        // Update existing rate
        await updateRate(editingRate.id, rateData);
        alert('Rate updated successfully!');
      } else {
        // Add new rate
        await addRate(rateData);
        alert('Rate added successfully!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle edit rate
  const handleEdit = (rate: Rate) => {
    setEditingRate(rate);
    setFormData({
      taskName: rate.taskName,
      pricePerUnit: rate.pricePerUnit,
      unit: rate.unit,
      currency: rate.currency,
      status: rate.status,
      description: rate.description || '',
    });
    setRequiredMaterials(rate.requiredMaterials || []);
    setShowModal(true);
  };

  // Handle archive/restore
  const handleToggleArchive = async (rateId: string, currentStatus: 'Active' | 'Archived') => {
    try {
      if (currentStatus === 'Active') {
        await archiveRate(rateId);
        alert('Rate archived successfully!');
      } else {
        await restoreRate(rateId);
        alert('Rate restored successfully!');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Render rate row
  const RateRow = ({ rate }: { rate: Rate }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
      <td className="px-6 py-4 text-sm font-medium text-gray-900">{rate.taskName}</td>
      <td className="px-6 py-4 text-sm text-gray-600">
        {rate.pricePerUnit.toLocaleString()} {rate.currency}
      </td>
      <td className="px-6 py-4 text-sm text-gray-600">/{rate.unit}</td>
      <td className="px-6 py-4 text-sm">
        {rate.requiredMaterials && rate.requiredMaterials.length > 0 ? (
          <div className="flex items-center gap-1">
            <Package size={14} className="text-blue-500" />
            <span className="text-blue-600 font-medium">{rate.requiredMaterials.length}</span>
            <span className="text-gray-500 text-xs">materials</span>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm">
        {rate.description ? (
          <span className="text-gray-600 truncate max-w-xs inline-block" title={rate.description}>
            {rate.description}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-6 py-4 text-sm">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            rate.status === 'Active'
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {rate.status === 'Active' ? '✓' : '📦'} {rate.status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(rate)}
            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
            title="Edit rate"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleToggleArchive(rate.id!, rate.status)}
            className={`p-1 rounded transition ${
              rate.status === 'Active'
                ? 'text-orange-600 hover:text-orange-800 hover:bg-orange-50'
                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
            }`}
            title={rate.status === 'Active' ? 'Archive rate' : 'Restore rate'}
          >
            {rate.status === 'Active' ? <Archive size={16} /> : <RotateCcw size={16} />}
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production Rates</h1>
            <p className="text-gray-600 text-sm mt-1">Manage task prices and payment rates</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <Plus size={18} />
            Add Rate
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Search & Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by task name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Active' | 'Archived')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="All">All Rates</option>
              <option value="Active">Active Only</option>
              <option value="Archived">Archived Only</option>
            </select>
          </div>
        </div>

        {/* Rates Tables */}
        <div className="space-y-6">
          {/* Active Rates */}
          {!loading && activeRates.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="font-semibold text-gray-900">
                  Active Rates ({activeRates.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Task Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Materials</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRates.map((rate) => (
                      <RateRow key={rate.id} rate={rate} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Archived Rates */}
          {!loading && archivedRates.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-gray-900">
                  Archived Rates ({archivedRates.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Task Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Materials</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedRates.map((rate) => (
                      <RateRow key={rate.id} rate={rate} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">Loading rates...</p>
            </div>
          ) : filteredRates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600 mb-4">No rates found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="text-green-600 hover:text-green-700 font-medium text-sm"
              >
                Add your first rate →
              </button>
            </div>
          ) : null}
        </div>

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Rates</p>
            <p className="text-2xl font-bold text-gray-900">{rates.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Active Rates</p>
            <p className="text-2xl font-bold text-green-600">{activeRates.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Archived Rates</p>
            <p className="text-2xl font-bold text-gray-600">{archivedRates.length}</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Rate Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {editingRate ? 'Edit Rate' : 'Add New Rate'}
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
              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  name="taskName"
                  value={formData.taskName}
                  onChange={handleInputChange}
                  placeholder="e.g., Sewing Grade A, Ironing, Packing"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              {/* Price Per Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Per Unit *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="pricePerUnit"
                    value={formData.pricePerUnit}
                    onChange={handleInputChange}
                    placeholder="e.g., 500"
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {currencyOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {unitOptions.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              {/* Description (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="e.g., High quality sewing with Grade A materials"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* === Raw Material Consumption (BOM) Section === */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package size={18} className="text-blue-600" />
                  <label className="block text-sm font-semibold text-gray-800">
                    Raw Material Consumption (BOM)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Define what raw materials are consumed per unit produced. When production is logged, these materials will be automatically deducted from inventory.
                </p>

                {/* Add Material Row */}
                <div className="flex flex-col sm:flex-row gap-2 mb-3">
                  <select
                    value={selectedInventoryId}
                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">-- Select Inventory Item --</option>
                    {inventoryItems
                      .filter(item => !requiredMaterials.some(m => m.inventoryItemId === item.id))
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.currentStock} {item.unit} available)
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={quantityPerUnit || ''}
                      onChange={(e) => setQuantityPerUnit(parseFloat(e.target.value) || 0)}
                      placeholder="Qty per unit"
                      min="0.01"
                      step="0.01"
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddMaterial}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Materials List */}
                {requiredMaterials.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-800 mb-2">Added Materials:</p>
                    <div className="space-y-2">
                      {requiredMaterials.map((material) => {
                        const item = inventoryItems.find(i => i.id === material.inventoryItemId);
                        return (
                          <div
                            key={material.inventoryItemId}
                            className="flex items-center justify-between bg-white px-3 py-2 rounded border border-blue-100"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {material.inventoryItemName}
                              </span>
                              <span className="text-gray-500 text-sm ml-2">
                                → {material.quantityPerUnit} {item?.unit || ''} per {formData.unit}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(material.inventoryItemId)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title="Remove material"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {requiredMaterials.length === 0 && (
                  <p className="text-xs text-gray-400 italic">
                    No materials added. This task won't deduct from inventory.
                  </p>
                )}
              </div>
              {/* === End BOM Section === */}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition"
                >
                  {editingRate ? 'Update Rate' : 'Add Rate'}
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

export default RatesPage;
