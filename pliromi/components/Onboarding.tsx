"use client";

import { useState } from "react";

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, description }),
      });

      const agents = [
        { name: "Treasurer", type: "agent", role: "Treasury Management", policyPreset: "moderate" },
        { name: "Seller", type: "agent", role: "Sales & Haggling", policyPreset: "conservative" },
      ];

      for (const agent of agents) {
        await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(agent),
        });
      }

      onComplete();
    } catch (error) {
      console.error("Onboarding error:", error);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600 mb-2">
              Welcome to Pliromi
            </h1>
            <p className="text-gray-500">
              Set up your store and treasury management system
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="My Store"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Store Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="A brief description of what your store sells..."
                rows={3}
              />
            </div>

            <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
              <h3 className="text-sm font-medium text-emerald-800 mb-2">
                Default Agents (auto-created)
              </h3>
              <div className="space-y-2 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    <strong>Treasurer</strong> &mdash; Manages treasury float, ensures 30% in Lulo yield
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>
                    <strong>Seller</strong> &mdash; Handles sales, price haggling, payment instructions
                  </span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !orgName}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {submitting ? "Setting up..." : "Create Organization"}
            </button>
          </form>

          <div className="flex flex-col items-center gap-1.5 mt-6 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">Powered by</span>
            <a href="https://openwallet.sh" target="_blank" rel="noopener noreferrer">
              <img src="/ows-logo.svg" alt="Open Wallet Standard" className="h-6 opacity-60 hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
