import React, { useState, useMemo } from 'react';
import { useCustomers, useInvoices } from '../hooks/useSales';
import { Customer, Invoice, InvoiceItem } from '../types/index';
import { 
  Plus, Search, X, Users, FileText, ShoppingCart, 
  Trash2, Edit, CreditCard, Phone, MapPin, DollarSign,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

type TabType = 'invoices' | 'customers';

const SalesPage: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  
  // Modals
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Hooks
  const { customers, loading: customersLoading, addCustomer, updateCustomer, deleteCustomer, getTotalCredit } = useCustomers();
  const { invoices, loading: invoicesLoading, createInvoice, calculateStats } = useInvoices();

  // Stats
  const stats = useMemo(() => calculateStats(), [invoices]);

  // Filter invoices by date
  const filteredInvoices = invoices.filter(inv => inv.date === selectedDate);

  // Filter customers by search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  // POS Modal State
  const [posData, setPosData] = useState({
    customerId: '',
    customerName: '',
    items: [{ itemName: '', quantity: 1, price: 0, total: 0 }] as InvoiceItem[],
    paidAmount: 0,
    paymentMethod: 'Cash' as 'Cash' | 'Kpay' | 'Wave',
  });

  // Customer Modal State
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
  });

  // Calculate POS totals
  const posTotal = posData.items.reduce((sum, item) => sum + item.total, 0);

  // Handle POS item change
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...posData.items];
    if (field === 'itemName') {
      newItems[index].itemName = value as string;
    } else if (field === 'quantity') {
      newItems[index].quantity = Number(value) || 0;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    } else if (field === 'price') {
      newItems[index].price = Number(value) || 0;
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    setPosData({ ...posData, items: newItems });
  };

  // Add new item row
  const addItemRow = () => {
    setPosData({
      ...posData,
      items: [...posData.items, { itemName: '', quantity: 1, price: 0, total: 0 }],
    });
  };

  // Remove item row
  const removeItemRow = (index: number) => {
    if (posData.items.length > 1) {
      const newItems = posData.items.filter((_, i) => i !== index);
      setPosData({ ...posData, items: newItems });
    }
  };

  // Handle customer selection in POS
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setPosData({
      ...posData,
      customerId,
      customerName: customer?.name || '',
    });
  };

  // Reset POS form
  const resetPOSForm = () => {
    setPosData({
      customerId: '',
      customerName: '',
      items: [{ itemName: '', quantity: 1, price: 0, total: 0 }],
      paidAmount: 0,
      paymentMethod: 'Cash',
    });
  };

  // Submit POS sale
  const handleCompleteSale = async () => {
    // Validate
    const validItems = posData.items.filter(item => item.itemName && item.quantity > 0 && item.price > 0);
    if (!posData.customerId || validItems.length === 0) {
      alert('Please select a customer and add at least one valid item.');
      return;
    }

    try {
      const result = await createInvoice({
        customerId: posData.customerId,
        customerName: posData.customerName,
        items: validItems,
        totalAmount: posTotal,
        paidAmount: posData.paidAmount,
        paymentMethod: posData.paymentMethod,
        date: today,
      });

      let msg = 'Sale completed successfully!';
      if (result.creditAmount > 0) {
        msg += ` Credit: ${result.creditAmount.toLocaleString()} MMK`;
      }
      alert(msg);
      setShowPOSModal(false);
      resetPOSForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Reset customer form
  const resetCustomerForm = () => {
    setCustomerForm({ name: '', phone: '', address: '' });
    setEditingCustomer(null);
  };

  // Handle customer form submit
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerForm.name || !customerForm.phone) {
      alert('Please fill in name and phone.');
      return;
    }

    try {
      if (editingCustomer && editingCustomer.id) {
        await updateCustomer(editingCustomer.id, customerForm);
        alert('Customer updated successfully!');
      } else {
        await addCustomer(customerForm);
        alert('Customer added successfully!');
      }
      setShowCustomerModal(false);
      resetCustomerForm();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Handle edit customer
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address || '',
    });
    setShowCustomerModal(true);
  };

  // Handle delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(customerId);
        alert('Customer deleted successfully!');
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales & POS</h1>
              <p className="text-gray-600 text-sm mt-1">Manage customers and create invoices</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetPOSForm();
              setShowPOSModal(true);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <ShoppingCart size={18} />
            New Sale
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900">{stats.invoiceCount}</p>
            <p className="text-xs text-gray-500 mt-1">invoices</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Amount</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalSales.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">MMK</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Collected</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalCollected.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">MMK</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm">Total Credit</p>
            <p className="text-2xl font-bold text-orange-600">{getTotalCredit().toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">MMK owed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'invoices'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={18} />
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition ${
              activeTab === 'customers'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={18} />
            Customers ({customers.length})
          </button>
        </div>

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div>
            {/* Date Filter */}
            <div className="mb-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                <h2 className="font-semibold text-gray-900">
                  Invoices - {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </h2>
              </div>

              {invoicesLoading ? (
                <div className="p-8 text-center text-gray-600">Loading invoices...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  No invoices for this date.
                  <button
                    onClick={() => setShowPOSModal(true)}
                    className="block mx-auto mt-4 text-green-600 hover:text-green-700 font-medium"
                  >
                    Create your first sale →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Items</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Method</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.customerName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{invoice.items.length} items</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.totalAmount.toLocaleString()} MMK</td>
                          <td className="px-6 py-4 text-sm text-green-600 font-medium">{invoice.paidAmount.toLocaleString()} MMK</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{invoice.paymentMethod}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              invoice.status === 'Paid' 
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'Partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {invoice.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div>
            {/* Search & Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                onClick={() => {
                  resetCustomerForm();
                  setShowCustomerModal(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
              >
                <Plus size={18} />
                Add Customer
              </button>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {customersLoading ? (
                <div className="p-8 text-center text-gray-600">Loading customers...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  No customers found.
                  <button
                    onClick={() => setShowCustomerModal(true)}
                    className="block mx-auto mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Add your first customer →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Address</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Credit Owed</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              {customer.phone}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {customer.address ? (
                              <div className="flex items-center gap-1">
                                <MapPin size={14} />
                                {customer.address}
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {customer.totalCredit > 0 ? (
                              <span className="text-orange-600 font-medium">{customer.totalCredit.toLocaleString()} MMK</span>
                            ) : (
                              <span className="text-green-600 font-medium">No credit</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCustomer(customer)}
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(customer.id!)}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition"
                                title="Delete"
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
        )}
      </div>

      {/* ==================== POS Modal ==================== */}
      {showPOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart size={24} className="text-green-600" />
                New Sale
              </h2>
              <button
                onClick={() => {
                  setShowPOSModal(false);
                  resetPOSForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Customer *
                </label>
                <select
                  value={posData.customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.phone})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  + Add New Customer
                </button>
              </div>

              {/* Items List */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Items *
                </label>
                <div className="space-y-3">
                  {posData.items.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={item.itemName}
                        onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        min="1"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        min="0"
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 w-24 text-right">
                          {item.total.toLocaleString()} MMK
                        </span>
                        {posData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="mt-3 flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              {/* Total Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-700">Total Amount:</span>
                  <span className="text-green-700">{posTotal.toLocaleString()} MMK</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="number"
                      value={posData.paidAmount || ''}
                      onChange={(e) => setPosData({ ...posData, paidAmount: Number(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  {posTotal > 0 && posData.paidAmount < posTotal && (
                    <p className="mt-1 text-sm text-orange-600">
                      Credit: {(posTotal - posData.paidAmount).toLocaleString()} MMK
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <div className="flex gap-2">
                    {(['Cash', 'Kpay', 'Wave'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPosData({ ...posData, paymentMethod: method })}
                        className={`flex-1 py-2 px-3 rounded-lg border transition font-medium text-sm ${
                          posData.paymentMethod === method
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <CreditCard size={18} />
                  Complete Sale
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPOSModal(false);
                    resetPOSForm();
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 py-3 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== Customer Modal ==================== */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  resetCustomerForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="Customer name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="09xxxxxxxxx"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address (Optional)</label>
                <textarea
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Customer address"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
                >
                  {editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    resetCustomerForm();
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

export default SalesPage;
