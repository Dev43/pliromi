"use client";

import { useEffect, useState, useCallback } from "react";

interface WalletAccount {
  chainId: string;
  chainName: string;
  nativeToken: string;
  address: string;
}

interface DepositInfo {
  depositUrl: string;
  addresses: Record<string, string>;
  chain: string;
}

export default function FundPage() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deposit, setDeposit] = useState<DepositInfo | null>(null);
  const [creatingDeposit, setCreatingDeposit] = useState(false);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const selectedAccount = accounts.find(
    (a) => a.chainId === selectedChain
  );

  const qrUrl = selectedAccount
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedAccount.address)}`
    : null;

  const createMoonPayDeposit = async () => {
    setCreatingDeposit(true);
    try {
      const chainName = selectedAccount?.chainName.toLowerCase() || "base";
      const res = await fetch("/api/wallet/fund-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: chainName }),
      });
      const data = await res.json();
      if (data.success) {
        setDeposit(data);
      }
    } catch (err) {
      console.error("Failed to create deposit:", err);
    } finally {
      setCreatingDeposit(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fund Addresses</h1>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
        <p className="text-sm text-amber-800">
          Only send USDC to these addresses. Sending other tokens may result in loss of funds.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Select Blockchain</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {accounts.map((acc) => (
                <button
                  key={acc.chainId}
                  onClick={() => { setSelectedChain(acc.chainId); setDeposit(null); }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedChain === acc.chainId
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {acc.chainName}
                </button>
              ))}
            </div>
          </div>

          {selectedAccount && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center">
              <h2 className="text-lg font-medium text-gray-800 mb-4">
                Send USDC on {selectedAccount.chainName}
              </h2>

              {qrUrl && (
                <div className="inline-block p-3 bg-gray-50 rounded-xl mb-4 border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR Code" width={200} height={200} />
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-4">
                <p className="text-xs text-gray-500 mb-1">Direct Deposit Address</p>
                <p className="text-sm text-gray-800 font-mono break-all">
                  {selectedAccount.address}
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => navigator.clipboard.writeText(selectedAccount.address)}
                  className="px-4 py-1.5 bg-emerald-50 text-emerald-700 text-sm rounded-lg hover:bg-emerald-100 font-medium transition-colors"
                >
                  Copy Address
                </button>
                <button
                  onClick={createMoonPayDeposit}
                  disabled={creatingDeposit}
                  className="px-4 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 font-medium transition-colors disabled:opacity-50"
                >
                  {creatingDeposit ? "Creating..." : "Create MoonPay Deposit"}
                </button>
              </div>

              {deposit && (
                <div className="mt-6 text-left">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-3">
                      MoonPay Multi-Chain Deposit
                    </h3>
                    <p className="text-xs text-blue-600 mb-3">
                      Send any token from these chains. Funds auto-convert to USDC on {deposit.chain}.
                    </p>
                    <div className="space-y-2">
                      {Object.entries(deposit.addresses).map(([chain, addr]) => (
                        <div key={chain} className="flex items-center gap-2">
                          <span className="text-xs text-blue-700 font-medium w-20 text-right capitalize">{chain}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(addr)}
                            className="text-xs text-blue-600 font-mono truncate hover:text-blue-800 flex-1 text-left"
                            title={addr}
                          >
                            {addr.slice(0, 20)}...{addr.slice(-6)}
                          </button>
                        </div>
                      ))}
                    </div>
                    {deposit.depositUrl && (
                      <a
                        href={deposit.depositUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-3 text-center text-sm text-blue-700 hover:text-blue-900 font-medium underline"
                      >
                        Open MoonPay Deposit Page &rarr;
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
