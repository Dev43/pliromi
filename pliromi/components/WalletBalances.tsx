"use client";

import { useEffect, useState, useCallback } from "react";
import { FundStoreModal } from "./MoonPayAccount";

interface WalletAccount {
  chainId: string;
  chainName: string;
  nativeToken: string;
  address: string;
  nativeBalance?: string;
  usdcBalance?: string;
}

// Chain icon URLs (official logos via token-icons CDN)
const CHAIN_ICONS: Record<string, string> = {
  Ethereum: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  Base: "https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg",
  Polygon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  Arbitrum: "https://assets.coingecko.com/coins/images/16547/small/arb.jpg",
  Solana: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  Bitcoin: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  Cosmos: "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png",
  Tron: "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png",
  TON: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  Filecoin: "https://assets.coingecko.com/coins/images/12817/small/filecoin.png",
  Sui: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png",
};

// Destination chains supported by MoonPay deposits (settle to USDC)
const DEPOSIT_CHAINS = ["solana", "ethereum", "base", "polygon", "arbitrum"] as const;

// Source chains: senders can deposit from these chains (auto-converted to USDC)
const SOURCE_CHAINS = ["Solana", "Ethereum", "Bitcoin", "Tron"] as const;

interface DepositWallet {
  address: string;
  chain: string;
  qrCode: string;
}

interface DepositResult {
  depositUrl?: string;
  wallets?: DepositWallet[];
  instructions?: string;
}

function FundModal({
  account,
  onClose,
}: {
  account: WalletAccount;
  onClose: () => void;
}) {
  // Pick the best settlement chain based on the account
  const chainNameLower = account.chainName.toLowerCase();
  const defaultSettleChain = DEPOSIT_CHAINS.find((c) => chainNameLower.includes(c)) || "solana";

  const [tab, setTab] = useState<"deposit" | "bridge">("deposit");
  const [settleChain, setSettleChain] = useState(defaultSettleChain);
  const [executing, setExecuting] = useState(false);
  const [deposit, setDeposit] = useState<DepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  // Bridge state
  const [bridgeFrom, setBridgeFrom] = useState("ethereum");
  const [bridgeTo, setBridgeTo] = useState(chainNameLower.includes("solana") ? "solana" : "base");
  const [bridgeToken, setBridgeToken] = useState<"usdc" | "native">("usdc");
  const [bridgeAmount, setBridgeAmount] = useState("");
  const [bridgeResult, setBridgeResult] = useState<string | null>(null);

  const copyAddr = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  const handleCreate = async () => {
    setExecuting(true);
    setError(null);
    setDeposit(null);

    try {
      const res = await fetch("/api/wallet/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Fund ${account.chainName}`,
          walletAddress: account.address,
          chain: settleChain,
          token: "USDC",
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setDeposit(data.deposit || { raw: data.message });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            Fund {account.chainName}
          </h3>
          <div className="flex gap-1 mt-2 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setTab("deposit")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "deposit" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              MoonPay Deposit
            </button>
            <button
              onClick={() => setTab("bridge")}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === "bridge" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              Relay Bridge
            </button>
          </div>
        </div>

        {tab === "bridge" ? (
          <div className="px-5 py-4 space-y-4">
            <p className="text-xs text-gray-400">
              Bridge tokens between chains using Relay protocol
            </p>

            {/* Token type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Token</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBridgeToken("usdc")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${bridgeToken === "usdc" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setBridgeToken("native")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${bridgeToken === "native" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                >
                  Native (ETH/SOL)
                </button>
              </div>
            </div>

            {/* From chain */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">From</label>
              <div className="flex flex-wrap gap-1.5">
                {["base", "ethereum", "polygon", "arbitrum", "solana"].map((c) => (
                  <button key={c} onClick={() => setBridgeFrom(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize transition-colors ${bridgeFrom === c ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* To chain */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">To</label>
              <div className="flex flex-wrap gap-1.5">
                {["base", "ethereum", "polygon", "arbitrum", "solana"].map((c) => (
                  <button key={c} onClick={() => setBridgeTo(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize transition-colors ${bridgeTo === c ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount</label>
              <input type="number" step="0.000001" value={bridgeAmount} onChange={(e) => setBridgeAmount(e.target.value)}
                placeholder={bridgeToken === "usdc" ? "10.00" : "0.01"}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {bridgeResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs text-emerald-700 break-all">{bridgeResult}</p>
              </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
              <button
                onClick={async () => {
                  if (!bridgeAmount || bridgeFrom === bridgeTo) return;
                  setExecuting(true);
                  setError(null);
                  setBridgeResult(null);
                  try {
                    const res = await fetch("/api/relay/quote", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user: account.address,
                        fromChain: bridgeFrom,
                        toChain: bridgeTo,
                        token: bridgeToken,
                        amount: bridgeAmount,
                        recipient: account.address,
                      }),
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    const steps = data.quote?.steps?.length || 0;
                    setBridgeResult(`Relay quote received: ${steps} step(s). Sign the transaction in your wallet to execute the bridge.`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Bridge quote failed");
                  } finally {
                    setExecuting(false);
                  }
                }}
                disabled={executing || !bridgeAmount || bridgeFrom === bridgeTo}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {executing ? "Getting quote..." : "Get Bridge Quote"}
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="px-5 py-4 space-y-4">
          {/* Settle chain */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Settle USDC on</label>
            <div className="flex flex-wrap gap-2">
              {DEPOSIT_CHAINS.map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSettleChain(chain)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    settleChain === chain
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>
          </div>

          {/* Source info */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium mb-1">Accepted source chains</p>
            <div className="flex gap-2">
              {SOURCE_CHAINS.map((chain) => (
                <span key={chain} className="text-[11px] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {chain}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-blue-500 mt-1.5">
              Send any token from these chains — it will be auto-converted to USDC
            </p>
          </div>

          {/* Deposit result */}
          {deposit && (
            <div className="space-y-3">
              {/* Deposit link */}
              {deposit.depositUrl && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-[10px] font-medium text-emerald-600 mb-1">Deposit Link</p>
                  <a
                    href={deposit.depositUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 underline break-all"
                  >
                    {deposit.depositUrl}
                  </a>
                </div>
              )}

              {/* Per-chain deposit addresses */}
              {deposit.wallets && deposit.wallets.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">Send to these addresses</p>
                    <p className="text-[10px] text-gray-400">Any token on these chains will auto-convert to USDC</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {deposit.wallets.map((w) => {
                      const icon = CHAIN_ICONS[w.chain.charAt(0).toUpperCase() + w.chain.slice(1)];
                      return (
                        <div key={w.chain} className="px-3 py-2.5 flex items-center gap-3">
                          {icon ? (
                            <img src={icon} alt={w.chain} className="w-6 h-6 rounded-full" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 capitalize">
                              {w.chain.slice(0, 2)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-gray-700 capitalize">{w.chain}</span>
                            <button
                              onClick={() => copyAddr(w.address)}
                              className="block text-[11px] font-mono text-gray-500 hover:text-emerald-600 transition-colors truncate w-full text-left"
                              title={w.address}
                            >
                              {copiedAddr === w.address ? (
                                <span className="text-emerald-600 font-sans">Copied!</span>
                              ) : (
                                w.address
                              )}
                            </button>
                          </div>
                          <a
                            href={w.qrCode}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-300 hover:text-emerald-600 transition-colors flex-shrink-0"
                            title="View QR code"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 0v3h1V4H5zM3 12a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 0v3h1v-3H5zM12 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm0 1h3v3h-3V4zM11 12a1 1 0 011-1h1v1h-1v1h1v-1h1v1h1v-1h1v1h-1v1h1v1h-1v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1z" clipRule="evenodd" />
                            </svg>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs p-2.5 rounded-lg bg-red-50 text-red-600 break-all">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {deposit ? "Done" : "Cancel"}
          </button>
          {!deposit && (
            <button
              onClick={handleCreate}
              disabled={executing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {executing ? "Creating..." : "Create Deposit Address"}
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function QrModal({ address, chainName, onClose }: { address: string; chainName: string; onClose: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-6 shadow-xl max-w-xs w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 text-center mb-1">{chainName}</h3>
        <p className="text-xs text-gray-400 text-center font-mono mb-4 break-all">{address}</p>
        <div className="flex justify-center mb-4">
          <img src={qrUrl} alt="QR Code" className="rounded-lg" width={200} height={200} />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function SendModal({ account, onClose }: { account: WalletAccount; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState<"usdc" | "native">("usdc");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chainKey = account.chainName.toLowerCase();

  const handleSend = async () => {
    if (!to || !amount) return;
    setSending(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: chainKey, to, amount, token }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.txHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Send from {account.chainName}</h3>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{account.address}</p>
        </div>

        <div className="px-5 py-4 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm text-emerald-700 font-medium">Sent successfully!</p>
                <p className="text-xs text-emerald-600 mt-1 font-mono break-all">{result}</p>
              </div>
              <button onClick={onClose} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Token type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Token</label>
                <div className="flex gap-2">
                  <button onClick={() => setToken("usdc")}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${token === "usdc" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    USDC
                  </button>
                  <button onClick={() => setToken("native")}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${token === "native" ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    {account.nativeToken} (native)
                  </button>
                </div>
              </div>

              {/* Available balance */}
              <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                <p className="text-[10px] text-gray-400">Available</p>
                <p className="text-sm font-semibold text-emerald-700">
                  {token === "usdc"
                    ? `${parseFloat(account.usdcBalance || "0").toFixed(2)} USDC`
                    : `${parseFloat(account.nativeBalance || "0").toFixed(4)} ${account.nativeToken}`
                  }
                </p>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Recipient Address</label>
                <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount</label>
                <input type="number" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={token === "usdc" ? "10.00" : "0.01"}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex items-center justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleSend} disabled={sending || !to || !amount}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors">
                  {sending ? "Sending..." : `Send ${token === "usdc" ? "USDC" : account.nativeToken}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface LuloPosition {
  balance: number;
  apy: number;
  lastUpdated: string;
}

export default function WalletBalances() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [totalUsdc, setTotalUsdc] = useState("0.00");
  const [loading, setLoading] = useState(true);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [qrAccount, setQrAccount] = useState<WalletAccount | null>(null);
  const [fundAccount, setFundAccount] = useState<WalletAccount | null>(null);
  const [lulo, setLulo] = useState<LuloPosition | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [moonpayAddresses, setMoonpayAddresses] = useState<Record<string, string>>({});
  const [sendAccount, setSendAccount] = useState<WalletAccount | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      const [balRes, luloRes] = await Promise.all([
        fetch("/api/wallet/balances"),
        fetch("/api/lulo"),
      ]);
      const data = await balRes.json();
      setAccounts(data.accounts || []);
      setTotalUsdc(data.totalUsdc || "0.00");
      try {
        const luloData = await luloRes.json();
        if (luloData.lulo) setLulo(luloData.lulo);
      } catch { /* no lulo data yet */ }
    } catch (err) {
      console.error("Failed to fetch balances:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const truncateAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Store Treasury</h2>
        <button
          onClick={() => { setLoading(true); fetchBalances(); }}
          className="text-xs text-gray-400 hover:text-emerald-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 mb-4 text-white">
        <div className="text-xs uppercase tracking-wide font-medium opacity-80">Total USDC</div>
        <div className="text-3xl font-bold mt-0.5">${totalUsdc}</div>
      </div>

      <button
        onClick={async () => {
          try {
            const res = await fetch("/api/moonpay/wallets");
            const data = await res.json();
            const w = Array.isArray(data.wallets) && data.wallets[0];
            if (w?.addresses) {
              setMoonpayAddresses(w.addresses);
              setShowFundModal(true);
            }
          } catch { /* no moonpay wallet */ }
        }}
        className="w-full py-2 mb-4 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium rounded-lg border border-purple-200 transition-colors"
      >
        Fund Store Treasury with MoonPay
      </button>

      {/* Lulo Protected Vault */}
      <div className="rounded-xl p-3 border border-emerald-200 bg-emerald-50/50 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-800">Lulo Protected Vault</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                {lulo ? `${lulo.apy.toFixed(1)}% APY` : "8.2% APY"}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-emerald-500">Solana &middot; USDC</span>
            </div>
          </div>
        </div>
        <div className="mt-2 ml-11 text-xs">
          <span className="font-semibold text-emerald-700">
            {lulo ? `$${lulo.balance.toFixed(2)}` : "$0.00"} USDC
          </span>
          <span className="text-emerald-500 ml-2">protected</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading balances...</div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc, idx) => {
            const icon = CHAIN_ICONS[acc.chainName];
            const usdcVal = parseFloat(acc.usdcBalance || "0");
            const nativeVal = parseFloat(acc.nativeBalance || "0");

            return (
              <div
                key={idx}
                className="rounded-xl p-3 border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {icon ? (
                    <img
                      src={icon}
                      alt={acc.chainName}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
                      {acc.chainName.slice(0, 2)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {acc.chainName}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                        {acc.nativeToken}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                      <button
                        onClick={() => copyAddress(acc.address)}
                        className="text-xs text-gray-400 hover:text-emerald-600 font-mono transition-colors cursor-pointer"
                        title="Click to copy address"
                      >
                        {copiedAddr === acc.address ? (
                          <span className="text-emerald-600">Copied!</span>
                        ) : (
                          truncateAddress(acc.address)
                        )}
                      </button>
                      <button
                        onClick={() => setQrAccount(acc)}
                        className="text-gray-300 hover:text-emerald-600 transition-colors"
                        title="Show QR code"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 0v3h1V4H5zM3 12a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 0v3h1v-3H5zM12 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm0 1h3v3h-3V4zM11 12a1 1 0 011-1h1v1h-1v1h1v-1h1v1h1v-1h1v1h-1v1h1v1h-1v-1h-1v1h-1v-1h-1v-1h1v-1h-1v-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setFundAccount(acc)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 font-semibold transition-colors shadow-sm"
                        title="Fund this wallet"
                      >
                        Fund
                      </button>
                      <button
                        onClick={() => setSendAccount(acc)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-semibold transition-colors shadow-sm"
                        title="Send from this wallet"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-2 ml-11 text-xs">
                  <span className={`font-medium ${usdcVal > 0 ? "text-emerald-600" : "text-gray-300"}`}>
                    {usdcVal.toFixed(2)} USDC
                  </span>
                  <span className="text-gray-400">
                    {nativeVal.toFixed(4)} {acc.nativeToken}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrAccount && (
        <QrModal
          address={qrAccount.address}
          chainName={qrAccount.chainName}
          onClose={() => setQrAccount(null)}
        />
      )}

      {fundAccount && (
        <FundModal
          account={fundAccount}
          onClose={() => setFundAccount(null)}
        />
      )}

      {showFundModal && (
        <FundStoreModal
          moonpayAddresses={moonpayAddresses}
          onClose={() => setShowFundModal(false)}
        />
      )}
    </div>
  );
}
