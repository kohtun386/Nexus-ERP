import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { InventoryItem } from '../types/index';
import { Plus, Edit, Trash2, X, AlertCircle, Box, History } from 'lucide-react';

const InventoryPage: React.FC = () => {
  const { items, loading, error, addItem, updateItem, deleteItem, getLowStockItems, getTotalValue } = useInventory();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    currentStock: 0,
    unit: '',
    minStockLevel: 0,
    costPerUnit: 0,
  });

  const categories = ['Fabric', 'Accessories', 'Packaging', 'Tools', 'Other'];
  const units = ['Yards', 'Rolls', 'Pcs', 'Kg', 'Meters', 'Boxes', 'Sets'];

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const lowStockItems = useMemo(() => getLowStockItems(), [items]);
  const totalValue = useMemo(() => getTotalValue(), [items]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' || name === 'category' || name === 'unit' 
        ? value 
        : parseFloat(value) || 0,
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      currentStock: 0,
      unit: '',
      minStockLevel: 0,
      costPerUnit: 0,
    });
    setEditingItem(null);
  };

  // Handle add/update item
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.unit) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.currentStock < 0 || formData.minStockLevel < 0 || formData.costPerUnit < 0) {
      alert('Stock levels and cost must be positive values');
      return;
    }

    try {
      if (editingItem && editingItem.id) {
        await updateItem(editingItem.id, formData);
        alert('Item updated successfully!');
      } else {
        await addItem(formData);
        alert('Item added successfully!');
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle edit item
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      unit: item.unit,
      minStockLevel: item.minStockLevel,
      costPerUnit: item.costPerUnit,
    });
    setShowModal(true);
  };

  // Handle delete item
  const handleDelete = async (itemId: string, itemName: string) => {
    if (window.confirm(`Delete "${itemName}"? This action cannot be undone.`)) {
      try {
        await deleteItem(itemId);
        alert('Item deleted successfully!');
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Track raw materials and stock levels</p>
          </div>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              to="/inventory/transactions"
              className="flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm flex-1 sm:flex-none"
            >
              <History size={18} />
              View History
            </Link>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm flex-1 sm:flex-none"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Items */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Items</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{items.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Box className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Low Stock Alerts</p>
                <p className={`text-2xl sm:text-3xl font-bold mt-2 ${
                  lowStockItems.length > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {lowStockItems.length}
                </p>
              </div>
              <div className={`${lowStockItems.length > 0 ? 'bg-red-100' : 'bg-green-100'} p-3 rounded-lg`}>
                <AlertCircle className={lowStockItems.length > 0 ? 'text-red-600' : 'text-green-600'} size={24} />
              </div>
            </div>
          </div>

          {/* Total Value */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Value</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
                  {(totalValue / 1000000).toFixed(2)}M
                </p>
                <p className="text-xs text-gray-500 mt-1">MMK</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Box className="text-green-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by item name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
              Inventory Items ({filteredItems.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading inventory...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Box className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 mb-4">No inventory items found</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Add your first item →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Item Name</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Stock</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Unit</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Cost</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const isLowStock = item.currentStock < item.minStockLevel;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                          idx === filteredItems.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                          {item.category}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                          {item.currentStock}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                          {item.unit}
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">
                          {item.costPerUnit.toLocaleString()} MMK
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isLowStock
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isLowStock ? '⚠ Low Stock' : '✓ Good'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                              title="Edit item"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id!, item.name)}
                              className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                              title="Delete item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Item' : 'Add New Item'}
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

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              {/* Item Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., White Cotton Fabric"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Current Stock & Unit (Two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock *
                  </label>
                  <input
                    type="number"
                    name="currentStock"
                    value={formData.currentStock}
                    onChange={handleInputChange}
                    placeholder="e.g., 500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    required
                  >
                    <option value="">Select unit</option>
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Stock Level & Cost (Two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level *
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleInputChange}
                    placeholder="e.g., 50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert if stock goes below this</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cost Per Unit (MMK) *
                  </label>
                  <input
                    type="number"
                    name="costPerUnit"
                    value={formData.costPerUnit}
                    onChange={handleInputChange}
                    placeholder="e.g., 2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    min="0"
                    step="100"
                    required
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition text-sm"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium transition text-sm"
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

export default InventoryPage;
