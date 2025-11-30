import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { useInventoryTransactions } from '../hooks/useInventoryTransactions';
import { InventoryTransaction } from '../types/index';
import { ArrowUp, ArrowDown, X, AlertCircle, ChevronLeft } from 'lucide-react';

const InventoryTransactionsPage: React.FC = () => {
  const { items } = useInventory();
  const { transactions, loading, error, addTransaction } = useInventoryTransactions();

  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);

  // Stock In form
  const [stockInForm, setStockInForm] = useState({
    itemId: '',
    quantity: 0,
    costPerUnit: 0,
    reason: '',
  });

  // Stock Out form
  const [stockOutForm, setStockOutForm] = useState({
    itemId: '',
    quantity: 0,
    reason: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Handle Stock In input change
  const handleStockInChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStockInForm(prev => ({
      ...prev,
      [name]: name === 'itemId' || name === 'reason' ? value : parseFloat(value) || 0,
    }));
    setFormError(null);
  };

  // Handle Stock Out input change
  const handleStockOutChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStockOutForm(prev => ({
      ...prev,
      [name]: name === 'itemId' || name === 'reason' ? value : parseFloat(value) || 0,
    }));
    setFormError(null);
  };

  // Reset forms
  const resetForms = () => {
    setStockInForm({ itemId: '', quantity: 0, costPerUnit: 0, reason: '' });
    setStockOutForm({ itemId: '', quantity: 0, reason: '' });
    setFormError(null);
  };

  // Handle Stock In submit
  const handleStockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!stockInForm.itemId || stockInForm.quantity <= 0 || !stockInForm.reason) {
      setFormError('Please fill in all required fields');
      return;
    }

    if (stockInForm.costPerUnit <= 0) {
      setFormError('Cost per unit must be greater than 0');
      return;
    }

    try {
      const selectedItem = items.find(i => i.id === stockInForm.itemId);
      if (!selectedItem) {
        setFormError('Item not found');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      await addTransaction({
        itemId: stockInForm.itemId,
        itemName: selectedItem.name,
        type: 'IN',
        quantity: stockInForm.quantity,
        reason: stockInForm.reason,
        costPerUnit: stockInForm.costPerUnit,
        totalCost: stockInForm.quantity * stockInForm.costPerUnit,
        date: today,
      });

      alert('Stock In recorded successfully!');
      setShowStockInModal(false);
      resetForms();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record Stock In');
    }
  };

  // Handle Stock Out submit
  const handleStockOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!stockOutForm.itemId || stockOutForm.quantity <= 0 || !stockOutForm.reason) {
      setFormError('Please fill in all required fields');
      return;
    }

    try {
      const selectedItem = items.find(i => i.id === stockOutForm.itemId);
      if (!selectedItem) {
        setFormError('Item not found');
        return;
      }

      if (selectedItem.currentStock < stockOutForm.quantity) {
        setFormError(
          `Insufficient stock. Available: ${selectedItem.currentStock} ${selectedItem.unit}, Requested: ${stockOutForm.quantity}`
        );
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      await addTransaction({
        itemId: stockOutForm.itemId,
        itemName: selectedItem.name,
        type: 'OUT',
        quantity: stockOutForm.quantity,
        reason: stockOutForm.reason,
        date: today,
      });

      alert('Stock Out recorded successfully!');
      setShowStockOutModal(false);
      resetForms();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record Stock Out');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const recentTransactions = useMemo(
    () => transactions.filter(t => t.date === today),
    [transactions]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2">
            <Link
              to="/inventory"
              className="text-gray-600 hover:text-gray-900 transition"
              title="Back to Inventory"
            >
              <ChevronLeft size={24} />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Stock Movement Logs</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">Track inventory purchases and usage</p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                resetForms();
                setShowStockInModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
            >
              <ArrowUp size={18} />
              Stock In
            </button>
            <button
              onClick={() => {
                resetForms();
                setShowStockOutModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-medium text-sm"
            >
              <ArrowDown size={18} />
              Stock Out
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

        {/* Stats - Today's Transactions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-gray-600 text-sm font-medium">Total Transactions</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">{transactions.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-gray-600 text-sm font-medium">Stock In (Today)</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2">
              {recentTransactions.filter(t => t.type === 'IN').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-gray-600 text-sm font-medium">Stock Out (Today)</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-2">
              {recentTransactions.filter(t => t.type === 'OUT').length}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <p className="text-gray-600 text-sm font-medium">Total IN Cost</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-2">
              {(recentTransactions
                .filter(t => t.type === 'IN')
                .reduce((sum, t) => sum + (t.totalCost || 0), 0) / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="font-semibold text-gray-900 text-sm sm:text-base">
              Stock Movements ({transactions.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No transactions recorded yet</p>
              <p className="text-sm text-gray-500">Use the buttons above to record Stock In or Stock Out</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Item</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Qty</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">Reason</th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700">By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((trans, idx) => (
                    <tr
                      key={trans.id}
                      className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                        idx === transactions.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {new Date(trans.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {trans.itemName}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          trans.type === 'IN'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trans.type === 'IN' ? '↑ In' : '↓ Out'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm font-medium text-gray-900">
                        {trans.quantity}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                        {trans.reason}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                        {trans.performedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stock In Modal */}
      {showStockInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowUp size={20} className="text-green-600" />
                Stock In (Purchase)
              </h2>
              <button
                onClick={() => {
                  setShowStockInModal(false);
                  resetForms();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              {/* Select Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item *
                </label>
                <select
                  name="itemId"
                  value={stockInForm.itemId}
                  onChange={handleStockInChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                >
                  <option value="">Select item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id!}>
                      {item.name} ({item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={stockInForm.quantity || ''}
                  onChange={handleStockInChange}
                  placeholder="e.g., 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  min="0"
                  step="1"
                  required
                />
              </div>

              {/* Cost Per Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Per Unit (MMK) *
                </label>
                <input
                  type="number"
                  name="costPerUnit"
                  value={stockInForm.costPerUnit || ''}
                  onChange={handleStockInChange}
                  placeholder="e.g., 2000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  min="0"
                  step="100"
                  required
                />
              </div>

              {/* Reason/Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier/Reason *
                </label>
                <input
                  type="text"
                  name="reason"
                  value={stockInForm.reason}
                  onChange={handleStockInChange}
                  placeholder="e.g., Purchase from Supplier A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  required
                />
              </div>

              {/* Total Cost Display */}
              {stockInForm.quantity > 0 && stockInForm.costPerUnit > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total Cost:</p>
                  <p className="text-lg font-bold text-green-600 mt-1">
                    {(stockInForm.quantity * stockInForm.costPerUnit).toLocaleString()} MMK
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium transition text-sm"
                >
                  Record Stock In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockInModal(false);
                    resetForms();
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

      {/* Stock Out Modal */}
      {showStockOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowDown size={20} className="text-red-600" />
                Stock Out (Usage)
              </h2>
              <button
                onClick={() => {
                  setShowStockOutModal(false);
                  resetForms();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStockOutSubmit} className="p-4 sm:p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              {/* Select Item */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item *
                </label>
                <select
                  name="itemId"
                  value={stockOutForm.itemId}
                  onChange={handleStockOutChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                >
                  <option value="">Select item</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id!}>
                      {item.name} (Available: {item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={stockOutForm.quantity || ''}
                  onChange={handleStockOutChange}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  min="0"
                  step="1"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Reason *
                </label>
                <input
                  type="text"
                  name="reason"
                  value={stockOutForm.reason}
                  onChange={handleStockOutChange}
                  placeholder="e.g., Production Lot 101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition text-sm"
                >
                  Record Stock Out
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStockOutModal(false);
                    resetForms();
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

export default InventoryTransactionsPage;
