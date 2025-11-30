import React, { useState } from 'react';
import { setupFactory } from '../services/functions';
import { useAuth } from '../context/AuthContext';

const SetupFactoryPage: React.FC = () => {
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState<'MMK' | 'USD' | 'THB'>('MMK');
    const [defaultCycle, setDefaultCycle] = useState<'weekly' | 'monthly'>('monthly');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            setError('Factory name is required.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            await setupFactory({ name, currency, defaultCycle });
            // On success, the AuthContext will automatically update claims,
            // triggering a re-render and redirection via App.tsx's routing logic.
            // No need to navigate here.
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An unknown error occurred.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Welcome to Nexus ERP</h2>
                <p className="text-center text-gray-600 mb-6">Let's set up your first factory to get started.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="factoryName" className="block text-sm font-medium text-gray-700">Factory Name</label>
                        <input
                            type="text"
                            id="factoryName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                            placeholder="e.g., Mandalay Textiles Co."
                        />
                    </div>
                    <div className="mb-4">
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
                        <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as 'MMK' | 'USD' | 'THB')}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                        >
                            <option value="MMK">Myanmar Kyat (MMK)</option>
                            <option value="USD">US Dollar (USD)</option>
                            <option value="THB">Thai Baht (THB)</option>
                        </select>
                    </div>
                    <div className="mb-6">
                        <label htmlFor="cycle" className="block text-sm font-medium text-gray-700">Default Payroll Cycle</label>
                        <select
                            id="cycle"
                            value={defaultCycle}
                            onChange={(e) => setDefaultCycle(e.target.value as 'weekly' | 'monthly')}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                        >
                            <option value="monthly">Monthly</option>
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:bg-gray-400"
                        >
                            {loading ? 'Creating...' : 'Create Factory'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SetupFactoryPage;
