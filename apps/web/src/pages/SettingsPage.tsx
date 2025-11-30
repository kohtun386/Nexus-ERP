import React, { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase"; 

const SettingsPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [tempPassword, setTempPassword] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setTempPassword("");

    try {
      const inviteSupervisor = httpsCallable(functions, "inviteSupervisor");
      const result = await inviteSupervisor({ email, name });
      const data = result.data as { email: string; temporaryPassword: string };

      setMessage({ type: "success", text: `Successfully invited ${data.email}!` });
      setTempPassword(data.temporaryPassword);
      setEmail("");
      setName("");
    } catch (error: any) {
      console.error(error);
      setMessage({ type: "error", text: error.message || "Failed to invite supervisor." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Factory Settings</h1>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-900">Invite New Supervisor</h2>
        <p className="text-gray-600 mb-6 text-sm">
          Create a new account for a supervisor.
        </p>

        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Supervisor Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., U Ba Maung"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-1 font-medium">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="supervisor@example.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-900 text-white py-2 rounded hover:bg-blue-800 transition disabled:bg-gray-400 font-bold"
          >
            {loading ? "Sending Invitation..." : "Invite Supervisor"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {message.text}
          </div>
        )}

        {tempPassword && (
          <div className="mt-6 p-4 border-2 border-green-500 bg-green-50 rounded-lg text-center">
            <h3 className="font-bold text-green-800">INVITATION SENT!</h3>
            <p className="text-sm text-gray-600 mt-1">Temporary Password:</p>
            <div className="text-2xl font-mono font-bold text-black mt-2 tracking-widest select-all">
              {tempPassword}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;