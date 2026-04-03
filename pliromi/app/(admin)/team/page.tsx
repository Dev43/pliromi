"use client";

import { useEffect, useState, useCallback } from "react";

const ALL_CHAINS = ["evm", "solana", "bitcoin", "cosmos", "tron", "ton", "sui", "filecoin"];

interface PolicyRules {
  maxTransactionAmount: number;
  dailySpendLimit: number;
  allowedChains: string[];
}

interface TeamMember {
  id: string;
  name: string;
  type: "human" | "agent";
  role: string;
  apiKeyId?: string;
  policy?: PolicyRules;
}

const DEFAULT_POLICY: PolicyRules = {
  maxTransactionAmount: 100,
  dailySpendLimit: 500,
  allowedChains: ["evm", "solana"],
};

function TreasurerRobot() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="24" y1="4" x2="24" y2="10" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2" fill="#F59E0B" />
      {/* Head */}
      <rect x="10" y="10" width="28" height="18" rx="5" fill="#8B5CF6" />
      {/* Visor */}
      <rect x="14" y="15" width="20" height="7" rx="3" fill="#1E1B4B" />
      {/* Eyes */}
      <circle cx="19" cy="18.5" r="2.5" fill="#34D399" />
      <circle cx="29" cy="18.5" r="2.5" fill="#34D399" />
      <circle cx="19.7" cy="17.8" r="0.8" fill="#fff" />
      <circle cx="29.7" cy="17.8" r="0.8" fill="#fff" />
      {/* Dollar sign on forehead */}
      <text x="24" y="14" textAnchor="middle" fontSize="5" fill="#F59E0B" fontWeight="bold">$</text>
      {/* Body */}
      <rect x="14" y="30" width="20" height="12" rx="3" fill="#7C3AED" />
      {/* Coin slot */}
      <rect x="21" y="33" width="6" height="1.5" rx="0.75" fill="#F59E0B" />
      {/* Chest display */}
      <rect x="18" y="36" width="12" height="3" rx="1" fill="#1E1B4B" />
      <rect x="19" y="37" width="3" height="1" rx="0.5" fill="#34D399" />
      <rect x="23" y="37" width="2" height="1" rx="0.5" fill="#34D399" />
      <rect x="26" y="37" width="3" height="1" rx="0.5" fill="#F59E0B" />
      {/* Arms */}
      <rect x="6" y="31" width="6" height="3" rx="1.5" fill="#8B5CF6" />
      <rect x="36" y="31" width="6" height="3" rx="1.5" fill="#8B5CF6" />
      {/* Hands holding coin */}
      <circle cx="41" cy="36" r="3" fill="#F59E0B" stroke="#D97706" strokeWidth="0.5" />
      <text x="41" y="37.5" textAnchor="middle" fontSize="4" fill="#92400E" fontWeight="bold">$</text>
      {/* Feet */}
      <rect x="15" y="43" width="6" height="3" rx="1.5" fill="#6D28D9" />
      <rect x="27" y="43" width="6" height="3" rx="1.5" fill="#6D28D9" />
    </svg>
  );
}

function SellerRobot() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Antenna */}
      <line x1="24" y1="4" x2="24" y2="10" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2" fill="#F472B6" />
      {/* Head */}
      <rect x="10" y="10" width="28" height="18" rx="5" fill="#3B82F6" />
      {/* Visor */}
      <rect x="14" y="15" width="20" height="7" rx="3" fill="#1E293B" />
      {/* Eyes - winking */}
      <circle cx="19" cy="18.5" r="2.5" fill="#FCD34D" />
      <circle cx="19.7" cy="17.8" r="0.8" fill="#fff" />
      {/* Wink eye */}
      <line x1="27" y1="18.5" x2="31" y2="18.5" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
      {/* Smile */}
      <path d="M18 24 Q24 27 30 24" stroke="#60A5FA" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Body */}
      <rect x="14" y="30" width="20" height="12" rx="3" fill="#2563EB" />
      {/* Shopping bag icon */}
      <path d="M20 34 L20 37 Q20 39 22 39 L26 39 Q28 39 28 37 L28 34" stroke="#FCD34D" strokeWidth="1" fill="none" />
      <line x1="20" y1="34" x2="28" y2="34" stroke="#FCD34D" strokeWidth="1" />
      <path d="M22 34 L22 33 Q22 31.5 24 31.5 Q26 31.5 26 33 L26 34" stroke="#FCD34D" strokeWidth="0.8" fill="none" />
      {/* Arms */}
      <rect x="6" y="31" width="6" height="3" rx="1.5" fill="#3B82F6" />
      <rect x="36" y="31" width="6" height="3" rx="1.5" fill="#3B82F6" />
      {/* Megaphone in hand */}
      <polygon points="4,30 2,28 2,35 4,33" fill="#F472B6" />
      <rect x="4" y="30" width="3" height="3" rx="0.5" fill="#EC4899" />
      {/* Feet */}
      <rect x="15" y="43" width="6" height="3" rx="1.5" fill="#1D4ED8" />
      <rect x="27" y="43" width="6" height="3" rx="1.5" fill="#1D4ED8" />
    </svg>
  );
}

function AgentAvatar({ member }: { member: TeamMember }) {
  if (member.type !== "agent") {
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-600">
        {member.name.charAt(0)}
      </div>
    );
  }

  const name = member.name.toLowerCase();
  if (name.includes("treasurer")) return <TreasurerRobot />;
  if (name.includes("seller")) return <SellerRobot />;

  // Generic agent robot
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="24" y1="4" x2="24" y2="10" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2" fill="#9CA3AF" />
      <rect x="10" y="10" width="28" height="18" rx="5" fill="#6B7280" />
      <rect x="14" y="15" width="20" height="7" rx="3" fill="#1F2937" />
      <circle cx="19" cy="18.5" r="2.5" fill="#34D399" />
      <circle cx="29" cy="18.5" r="2.5" fill="#34D399" />
      <rect x="14" y="30" width="20" height="12" rx="3" fill="#4B5563" />
      <rect x="6" y="31" width="6" height="3" rx="1.5" fill="#6B7280" />
      <rect x="36" y="31" width="6" height="3" rx="1.5" fill="#6B7280" />
      <rect x="15" y="43" width="6" height="3" rx="1.5" fill="#374151" />
      <rect x="27" y="43" width="6" height="3" rx="1.5" fill="#374151" />
    </svg>
  );
}

function PolicyBadge({ policy }: { policy: PolicyRules }) {
  const daily = policy.dailySpendLimit;
  let tier = "Custom";
  let color = "bg-gray-100 text-gray-600";
  if (daily <= 100) { tier = "Conservative"; color = "bg-amber-50 text-amber-700"; }
  else if (daily <= 500) { tier = "Moderate"; color = "bg-blue-50 text-blue-700"; }
  else if (daily >= 100000) { tier = "Unlimited"; color = "bg-red-50 text-red-600"; }
  else { tier = "Custom"; color = "bg-purple-50 text-purple-700"; }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {tier}
    </span>
  );
}

function PolicyDisplay({ policy }: { policy: PolicyRules }) {
  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      <div>
        <span className="text-gray-400 block">Max/Tx</span>
        <span className="text-gray-700 font-medium">${policy.maxTransactionAmount.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-gray-400 block">Daily Limit</span>
        <span className="text-gray-700 font-medium">${policy.dailySpendLimit.toLocaleString()}</span>
      </div>
      <div>
        <span className="text-gray-400 block">Chains</span>
        <span className="text-gray-700 font-medium">{policy.allowedChains.join(", ")}</span>
      </div>
    </div>
  );
}

function PolicyEditorModal({
  member,
  onClose,
  onSave,
}: {
  member: TeamMember;
  onClose: () => void;
  onSave: (id: string, policy: PolicyRules) => Promise<void>;
}) {
  const initial = member.policy || DEFAULT_POLICY;
  const [maxTx, setMaxTx] = useState(initial.maxTransactionAmount);
  const [dailyLimit, setDailyLimit] = useState(initial.dailySpendLimit);
  const [chains, setChains] = useState<string[]>(initial.allowedChains);
  const [saving, setSaving] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const buildPolicy = (): PolicyRules => ({
    maxTransactionAmount: maxTx,
    dailySpendLimit: dailyLimit,
    allowedChains: chains,
  });

  const toggleChain = (chain: string) => {
    setChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    );
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case "conservative":
        setMaxTx(100); setDailyLimit(100); setChains(["evm", "solana"]);
        break;
      case "moderate":
        setMaxTx(500); setDailyLimit(500); setChains(["evm", "solana"]);
        break;
      case "unlimited":
        setMaxTx(100000); setDailyLimit(100000); setChains([...ALL_CHAINS]);
        break;
    }
  };

  const switchToJson = () => {
    setJsonText(JSON.stringify(buildPolicy(), null, 2));
    setJsonError(null);
    setJsonMode(true);
  };

  const switchToForm = () => {
    try {
      const parsed = JSON.parse(jsonText) as PolicyRules;
      if (typeof parsed.maxTransactionAmount !== "number" || typeof parsed.dailySpendLimit !== "number" || !Array.isArray(parsed.allowedChains)) {
        throw new Error("Invalid policy structure");
      }
      setMaxTx(parsed.maxTransactionAmount);
      setDailyLimit(parsed.dailySpendLimit);
      setChains(parsed.allowedChains);
      setJsonMode(false);
      setJsonError(null);
    } catch (e) {
      setJsonError((e as Error).message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    let policy: PolicyRules;
    if (jsonMode) {
      try {
        const parsed = JSON.parse(jsonText) as PolicyRules;
        if (typeof parsed.maxTransactionAmount !== "number" || typeof parsed.dailySpendLimit !== "number" || !Array.isArray(parsed.allowedChains)) {
          throw new Error("Invalid policy structure");
        }
        policy = parsed;
      } catch (e) {
        setJsonError((e as Error).message);
        setSaving(false);
        return;
      }
    } else {
      policy = buildPolicy();
    }
    await onSave(member.id, policy);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Edit Policy &mdash; {member.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{member.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={jsonMode ? switchToForm : switchToJson}
              className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            >
              {jsonMode ? "Form View" : "JSON Editor"}
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {!jsonMode ? (
            <div className="space-y-5">
              {/* Presets */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Quick Presets</label>
                <div className="flex gap-2">
                  {[
                    { id: "conservative", label: "Conservative", desc: "$100/day" },
                    { id: "moderate", label: "Moderate", desc: "$500/day" },
                    { id: "unlimited", label: "Unlimited", desc: "$100k/day" },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors text-center"
                    >
                      <span className="block text-xs font-medium text-gray-700">{preset.label}</span>
                      <span className="block text-[10px] text-gray-400">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Max Per Transaction ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxTx}
                    onChange={(e) => setMaxTx(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Daily Spend Limit ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Chains */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Allowed Chains</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHAINS.map((chain) => {
                    const active = chains.includes(chain);
                    return (
                      <button
                        key={chain}
                        onClick={() => toggleChain(chain)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300"
                        }`}
                      >
                        {chain}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={jsonText}
                onChange={(e) => { setJsonText(e.target.value); setJsonError(null); }}
                spellCheck={false}
                className="w-full h-52 px-4 py-3 bg-gray-900 text-emerald-400 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              {jsonError && (
                <p className="text-xs text-red-500 mt-2">Error: {jsonError}</p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                Edit the JSON policy document directly. Fields: maxTransactionAmount, dailySpendLimit, allowedChains.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Saving..." : "Save Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: "",
    type: "human" as "human" | "agent",
    role: "",
    policyPreset: "moderate",
  });
  const [apiToken, setApiToken] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      setTeam(data.team || []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      const data = await res.json();
      if (data.apiToken) {
        setApiToken(data.apiToken);
      }
      setNewMember({ name: "", type: "human", role: "", policyPreset: "moderate" });
      setShowAdd(false);
      fetchTeam();
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const removeMember = async (id: string) => {
    try {
      await fetch(`/api/team/${id}`, { method: "DELETE" });
      fetchTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const savePolicy = async (id: string, policy: PolicyRules) => {
    await fetch(`/api/team/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy }),
    });
    fetchTeam();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {showAdd ? "Cancel" : "+ Add Member"}
        </button>
      </div>

      {apiToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-amber-800 mb-1">
            API Key Created (save this - shown only once!)
          </h3>
          <code className="text-xs text-amber-700 break-all">{apiToken}</code>
          <button
            onClick={() => setApiToken(null)}
            className="block mt-2 text-xs text-amber-600 hover:text-amber-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={addMember} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <select
              value={newMember.type}
              onChange={(e) => setNewMember({ ...newMember, type: e.target.value as "human" | "agent" })}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="human">Human</option>
              <option value="agent">Agent</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Role"
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              value={newMember.policyPreset}
              onChange={(e) => setNewMember({ ...newMember, policyPreset: e.target.value })}
              className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="conservative">Conservative ($100/day)</option>
              <option value="moderate">Moderate ($500/day)</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add Team Member
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : team.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          No team members yet. Add humans or agents to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {team.map((member) => {
            const policy = member.policy || DEFAULT_POLICY;
            return (
              <div
                key={member.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AgentAvatar member={member} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{member.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            member.type === "agent"
                              ? "bg-purple-50 text-purple-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {member.type}
                        </span>
                        <PolicyBadge policy={policy} />
                      </div>
                      <span className="text-xs text-gray-400">{member.role}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                    <button
                      onClick={() => setEditingMember(member)}
                      className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                    >
                      Edit Policy
                    </button>
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                  <PolicyDisplay policy={policy} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingMember && (
        <PolicyEditorModal
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onSave={savePolicy}
        />
      )}
    </div>
  );
}
