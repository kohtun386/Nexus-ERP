import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase'; // သင့် firebase.ts မှ functions instance ကို import လုပ်ပါ။

const auth = getAuth();
const setUserRoleCloudFunction = httpsCallable(functions, 'setUserRole');

async function assignUserRoleToNewUser(uid: string, role: string) {
  if (!auth.currentUser) {
    console.error("No authenticated user to perform this action.");
    return;
  }
  try {
    // Assume the current user (caller) is an Admin/Owner to set roles
    const result = await setUserRoleCloudFunction({ uid, role });
    console.log(result.data.message);

    // အရေးကြီး: Custom Claims အသစ်ရဖို့အတွက် User ရဲ့ ID Token ကို refresh လုပ်ရန်။
    // ဒါမှ Firestore Rules တွေမှာ အဲဒီ role ကို စစ်လို့ရပါလိမ့်မယ်။
    await auth.currentUser.getIdToken(true);
    console.log("User ID Token refreshed with new custom claims.");

    // UI ကို update လုပ်ရန် (လိုအပ်ပါက)
  } catch (error) {
    console.error("Error assigning role:", error);
    // Error handling
  }
}

// ဥပမာအားဖြင့်၊ User Signup ပြီးစီးပြီးနောက်:
// const userCredential = await createUserWithEmailAndPassword(auth, email, password);
// if (userCredential.user) {
//    // Default role ကို 'Employee' လို့ သတ်မှတ်
//    await assignUserRoleToNewUser(userCredential.user.uid, 'Employee');
//    // User Profile Data ကို Firestore မှာ သိမ်းဆည်းခြင်း (optional)
//    await setDoc(doc(db, "users", userCredential.user.uid), {
//        email: userCredential.user.email,
//        role: 'Employee', // Firestore မှာလည်း သိမ်းဆည်းထားနိုင်သည်
//        // ... other profile info
//    });
// }


import React, { useState } from 'react';
import { Factory, Mail, Lock, ArrowRight, MapPin, Phone, CreditCard, CheckCircle, Upload, ArrowLeft, KeyRound } from 'lucide-react';
import { AuthView, FactoryProfile, PayrollCycle, Currency } from '../types';

interface AuthProps {
  currentView: AuthView;
  setView: (view: AuthView) => void;
  onLogin: (email: string) => void;
  onSignup: (email: string, factoryName: string) => void;
  onSetupComplete: (profile: FactoryProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ currentView, setView, onLogin, onSignup, onSetupComplete }) => {
  // Local State for Forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [payrollCycle, setPayrollCycle] = useState<PayrollCycle>('Weekly');
  const [currency, setCurrency] = useState<Currency>('MMK');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  // Validation & Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    // Simulate simple validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    onLogin(email);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !factoryName) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    onSignup(email, factoryName);
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !phone) {
      setError("Please complete your factory profile.");
      return;
    }

    // Calculate Trial Date (30 Days from now)
    const today = new Date();
    const trialEndDate = new Date(today);
    trialEndDate.setDate(today.getDate() + 30);

    const profile: FactoryProfile = {
      name: factoryName || "My Factory",
      email,
      address,
      phone,
      payrollCycle,
      currency,
      subscription: {
        plan: 'Trial',
        status: 'Active',
        startDate: today.toISOString(),
        endDate: trialEndDate.toISOString(),
        amount: 0
      }
    };
    onSetupComplete(profile);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    // Simulate API call
    setError(null);
    setResetSent(true);
  };

  // Render Login Screen
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md animate-in fade-in duration-500">
          <div className="text-center mb-8">
            <div className="bg-blue-900/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Factory className="w-8 h-8 text-[#1E3A8A]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Textile Factory ERP</h1>
            <p className="text-slate-500 mt-1">Sign in to manage production</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                  placeholder="manager@factory.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-3 rounded-lg font-bold transition shadow-md shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              Login <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <p className="text-sm text-slate-600">
              Don't have an account?{' '}
              <button onClick={() => { setError(null); setView('signup'); }} className="text-[#1E3A8A] font-bold hover:underline">Sign Up</button>
            </p>
            <button 
              onClick={() => { setError(null); setView('forgot-password'); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Sign Up Screen
  if (currentView === 'signup') {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md animate-in slide-in-from-right duration-500">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Create Factory Account</h1>
            <p className="text-slate-500 mt-1">Start with a <span className="text-green-600 font-bold">30-Day Free Trial</span></p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Factory Name</label>
              <div className="relative">
                <Factory className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={factoryName}
                  onChange={(e) => setFactoryName(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                  placeholder="e.g., Golden Thread Textiles"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                  placeholder="manager@factory.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                  placeholder="••••••••"
                />
              </div>
              {password && password.length < 6 && (
                 <p className="text-xs text-red-500 mt-1">Password is too weak.</p>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-3 rounded-lg font-bold transition shadow-md shadow-blue-900/20"
            >
              Sign Up & Start Trial
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-600">
              Already have an account?{' '}
              <button onClick={() => { setError(null); setView('login'); }} className="text-[#1E3A8A] font-bold hover:underline">Login</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render Forgot Password Screen (Unchanged)
  if (currentView === 'forgot-password') {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md animate-in slide-in-from-bottom duration-500">
          <div className="text-center mb-8">
             <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-8 h-8 text-[#1E3A8A]" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
            <p className="text-slate-500 mt-1">Enter your email to receive reset instructions.</p>
          </div>

          {!resetSent ? (
             <form onSubmit={handleForgotPassword} className="space-y-5">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                    placeholder="manager@factory.com"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-3 rounded-lg font-bold transition shadow-md shadow-blue-900/20"
              >
                Send Reset Link
              </button>
            </form>
          ) : (
            <div className="text-center bg-green-50 p-6 rounded-xl border border-green-100 mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-green-800">Check your email</h3>
                <p className="text-sm text-green-700 mt-1">We've sent password reset instructions to {email}</p>
            </div>
          )}

          <div className="mt-6 text-center">
            <button 
              onClick={() => { setError(null); setResetSent(false); setView('login'); }} 
              className="text-slate-500 hover:text-[#1E3A8A] font-medium flex items-center justify-center gap-2 w-full"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Setup Screen (Updated)
  if (currentView === 'setup') {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-xl animate-in slide-in-from-right duration-500">
          <div className="text-center mb-8 border-b border-slate-100 pb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome to Nexus ERP</h1>
            <p className="text-slate-500 mt-1">Let's set up your factory profile for <strong>{factoryName}</strong></p>
            <p className="text-xs text-blue-600 mt-2 font-medium bg-blue-50 inline-block px-3 py-1 rounded-full">
                Your 1-Month Free Trial is Active!
            </p>
          </div>

          <form onSubmit={handleSetup} className="space-y-6">
             {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

             {/* Logo Upload Mock */}
             <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-slate-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-slate-300 text-slate-400 cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition">
                    <Upload className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Logo</span>
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Factory Address</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <textarea 
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition resize-none h-20"
                            placeholder="e.g., No. 123, Industrial Zone, Yangon"
                        />
                    </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="tel" 
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none transition"
                            placeholder="09..."
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Factory Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="email" 
                            value={email}
                            disabled
                            className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                        />
                    </div>
                </div>
             </div>

             <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-500" /> Payroll Defaults
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Payment Cycle</label>
                        <select 
                            value={payrollCycle}
                            onChange={(e) => setPayrollCycle(e.target.value as PayrollCycle)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none bg-white"
                        >
                            <option value="Weekly">Weekly</option>
                            <option value="Bi-Weekly">Bi-Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">Currency</label>
                        <select 
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as Currency)}
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] outline-none bg-white"
                        >
                            <option value="MMK">MMK (Myanmar Kyat)</option>
                            <option value="USD">USD (US Dollar)</option>
                            <option value="THB">THB (Thai Baht)</option>
                        </select>
                    </div>
                </div>
             </div>

             <button 
              type="submit" 
              className="w-full bg-[#1E3A8A] hover:bg-blue-900 text-white py-3 rounded-lg font-bold transition shadow-md shadow-blue-900/20"
            >
              Save & Continue to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default Auth;
