import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"; 
import { functions, auth } from "../firebase";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [factoryName, setFactoryName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Update Profile
      if (user) {
          await updateProfile(user, { displayName: name });
      }

      // 3. Setup Factory (sets custom claims via Cloud Function)
      const setupFactoryFn = httpsCallable(functions, "setupFactory");
      const result = await setupFactoryFn({
        name: factoryName,
        currency: "MMK",
        defaultCycle: "Monthly"
      });
      console.log("Factory setup result:", result);

      // 4. CRITICAL: Force token refresh to get new custom claims
      if (user) {
          const newToken = await user.getIdToken(true);
          console.log("Token refreshed, new token obtained");
      }

      // 5. Small delay to ensure Firebase replicates claims and AuthContext picks them up
      await new Promise(resolve => setTimeout(resolve, 1000));

      navigate("/dashboard");
      
    } catch (err: any) {
      console.error("Sign up error:", err);
      setError(err.message || "Failed to create account. Make sure email is not already registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">Create New Factory</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Factory Name</label>
            <input type="text" required className="w-full p-2 border border-gray-300 rounded mt-1" value={factoryName} onChange={e => setFactoryName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner Name</label>
            <input type="text" required className="w-full p-2 border border-gray-300 rounded mt-1" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" required className="w-full p-2 border border-gray-300 rounded mt-1" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input type="password" required className="w-full p-2 border border-gray-300 rounded mt-1" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-900 text-white py-2 rounded font-bold hover:bg-blue-800 transition disabled:opacity-50">
            {loading ? "Setting up..." : "Register & Setup"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUpPage;