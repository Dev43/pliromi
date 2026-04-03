"use client";

import { useState } from "react";

const POLICY_PRESETS = [
  { label: "Conservative ($100/day)", value: "conservative" },
  { label: "Moderate ($500/day)", value: "moderate" },
  { label: "Unlimited", value: "unlimited" },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [treasurerPolicy, setTreasurerPolicy] = useState("moderate");
  const [sellerPolicy, setSellerPolicy] = useState("conservative");
  const [extraMembers, setExtraMembers] = useState<{ name: string; type: "human" | "agent"; role: string; policyPreset: string }[]>([]);

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
        { name: "Treasurer", type: "agent", role: "Treasury Management", policyPreset: treasurerPolicy },
        { name: "Seller", type: "agent", role: "Sales & Haggling", policyPreset: sellerPolicy },
      ];

      const allMembers = [...agents, ...extraMembers.filter((m) => m.name.trim())];

      for (const member of allMembers) {
        await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(member),
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
              <h3 className="text-sm font-medium text-emerald-800 mb-3">
                Default Agents (auto-created)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 48 48" className="w-10 h-10 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="24" y1="4" x2="24" y2="10" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="24" cy="3" r="2" fill="#F59E0B" />
                    <rect x="10" y="10" width="28" height="18" rx="5" fill="#8B5CF6" />
                    <rect x="14" y="15" width="20" height="7" rx="3" fill="#1E1B4B" />
                    <circle cx="19" cy="18.5" r="2.5" fill="#34D399" />
                    <circle cx="29" cy="18.5" r="2.5" fill="#34D399" />
                    <circle cx="19.7" cy="17.8" r="0.8" fill="#fff" />
                    <circle cx="29.7" cy="17.8" r="0.8" fill="#fff" />
                    <text x="24" y="14" textAnchor="middle" fontSize="5" fill="#F59E0B" fontWeight="bold">$</text>
                    <rect x="14" y="30" width="20" height="12" rx="3" fill="#7C3AED" />
                    <rect x="21" y="33" width="6" height="1.5" rx="0.75" fill="#F59E0B" />
                    <rect x="18" y="36" width="12" height="3" rx="1" fill="#1E1B4B" />
                    <rect x="6" y="31" width="6" height="3" rx="1.5" fill="#8B5CF6" />
                    <rect x="36" y="31" width="6" height="3" rx="1.5" fill="#8B5CF6" />
                    <circle cx="41" cy="36" r="3" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
                    <text x="41" y="37.5" textAnchor="middle" fontSize="4" fill="#92400E" fontWeight="bold">$</text>
                    <rect x="15" y="43" width="6" height="3" rx="1.5" fill="#6D28D9" />
                    <rect x="27" y="43" width="6" height="3" rx="1.5" fill="#6D28D9" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm text-emerald-700">
                      <strong>Treasurer</strong> &mdash; Manages treasury float, ensures {process.env.NEXT_PUBLIC_LULO_PCT || "5"}% is earning yield in Lulo
                    </div>
                    <select
                      value={treasurerPolicy}
                      onChange={(e) => setTreasurerPolicy(e.target.value)}
                      className="mt-1.5 w-full px-2 py-1 bg-white border border-emerald-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {POLICY_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 48 48" className="w-10 h-10 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="24" y1="4" x2="24" y2="10" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="24" cy="3" r="2" fill="#F472B6" />
                    <rect x="10" y="10" width="28" height="18" rx="5" fill="#3B82F6" />
                    <rect x="14" y="15" width="20" height="7" rx="3" fill="#1E293B" />
                    <circle cx="19" cy="18.5" r="2.5" fill="#FCD34D" />
                    <circle cx="19.7" cy="17.8" r="0.8" fill="#fff" />
                    <line x1="27" y1="18.5" x2="31" y2="18.5" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M18 24 Q24 27 30 24" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <rect x="14" y="30" width="20" height="12" rx="3" fill="#2563EB" />
                    <path d="M20 34 L20 37 Q20 39 22 39 L26 39 Q28 39 28 37 L28 34" stroke="#FCD34D" strokeWidth="1" fill="none" />
                    <line x1="20" y1="34" x2="28" y2="34" stroke="#FCD34D" strokeWidth="1" />
                    <rect x="6" y="31" width="6" height="3" rx="1.5" fill="#3B82F6" />
                    <rect x="36" y="31" width="6" height="3" rx="1.5" fill="#3B82F6" />
                    <polygon points="4,30 2,28 2,35 4,33" fill="#F472B6" />
                    <rect x="4" y="30" width="3" height="3" rx="0.5" fill="#EC4899" />
                    <rect x="15" y="43" width="6" height="3" rx="1.5" fill="#1D4ED8" />
                    <rect x="27" y="43" width="6" height="3" rx="1.5" fill="#1D4ED8" />
                  </svg>
                  <div className="flex-1">
                    <div className="text-sm text-emerald-700">
                      <strong>Seller</strong> &mdash; Handles sales, price haggling, and x402 payment instructions
                    </div>
                    <select
                      value={sellerPolicy}
                      onChange={(e) => setSellerPolicy(e.target.value)}
                      className="mt-1.5 w-full px-2 py-1 bg-white border border-emerald-200 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {POLICY_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional team members */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Additional Team Members</h3>
                <button
                  type="button"
                  onClick={() => setExtraMembers([...extraMembers, { name: "", type: "human", role: "", policyPreset: "moderate" }])}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md font-medium transition-colors"
                >
                  + Add
                </button>
              </div>

              {extraMembers.length === 0 ? (
                <p className="text-xs text-gray-400">No extra members yet. You can add humans or custom agents.</p>
              ) : (
                <div className="space-y-3">
                  {extraMembers.map((member, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Name"
                          value={member.name}
                          onChange={(e) => {
                            const updated = [...extraMembers];
                            updated[idx].name = e.target.value;
                            setExtraMembers(updated);
                          }}
                          className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <select
                          value={member.type}
                          onChange={(e) => {
                            const updated = [...extraMembers];
                            updated[idx].type = e.target.value as "human" | "agent";
                            setExtraMembers(updated);
                          }}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="human">Human</option>
                          <option value="agent">Agent</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setExtraMembers(extraMembers.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 text-xs px-1"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Role"
                          value={member.role}
                          onChange={(e) => {
                            const updated = [...extraMembers];
                            updated[idx].role = e.target.value;
                            setExtraMembers(updated);
                          }}
                          className="flex-1 px-2 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <select
                          value={member.policyPreset}
                          onChange={(e) => {
                            const updated = [...extraMembers];
                            updated[idx].policyPreset = e.target.value;
                            setExtraMembers(updated);
                          }}
                          className="px-2 py-1.5 bg-white border border-gray-300 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {POLICY_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
