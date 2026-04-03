"use client";

import { useEffect, useState, useCallback } from "react";

interface WalletInfo {
  name: string;
  addresses?: Record<string, string>;
}

interface ChainBalance {
  native: string;
  nativeSymbol: string;
  usdc: string;
}

const DISPLAY_CHAINS: { key: string; name: string; token: string; icon: string }[] = [
  { key: "base", name: "Base", token: "ETH", icon: "https://assets.coingecko.com/asset_platforms/images/131/small/base.jpeg" },
  { key: "solana", name: "Solana", token: "SOL", icon: "https://assets.coingecko.com/coins/images/4128/small/solana.png" },
  { key: "sui", name: "Sui", token: "SUI", icon: "https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png" },
  { key: "ethereum", name: "Ethereum", token: "ETH", icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png" },
  { key: "polygon", name: "Polygon", token: "MATIC", icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png" },
  { key: "ton", name: "TON", token: "TON", icon: "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png" },
];

// USDC contract addresses per chain for the bridge
const USDC_TOKENS: Record<string, string> = {
  ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  solana: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
};

type Step = "checking" | "login" | "verify" | "wallet-setup" | "connected";

export function FundStoreModal({
  moonpayAddresses,
  onClose,
}: {
  moonpayAddresses: Record<string, string>;
  onClose: () => void;
}) {
  const [fromChain, setFromChain] = useState("base");
  const [toChain, setToChain] = useState("base");
  const [tokenType, setTokenType] = useState<"usdc" | "native">("usdc");
  const [amount, setAmount] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mpBalances, setMpBalances] = useState<Record<string, { usdc: number; native: number; nativeSymbol: string }>>({});

  // Fetch store treasury address + MoonPay balances
  useEffect(() => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((data) => {
        const accounts = data.accounts || [];
        const evmAcc = accounts.find((a: { chainId: string }) => a.chainId === "eip155:1");
        const solAcc = accounts.find((a: { chainId: string }) => a.chainId.includes("solana"));
        if (toChain === "solana" && solAcc) {
          setStoreAddress(solAcc.address);
        } else if (evmAcc) {
          setStoreAddress(evmAcc.address);
        }
      });

    // Fetch MoonPay balances via RPC
    const addressMap: Record<string, string> = {};
    for (const c of DISPLAY_CHAINS) {
      if (moonpayAddresses[c.key]) addressMap[c.key] = moonpayAddresses[c.key];
    }
    if (Object.keys(addressMap).length > 0) {
      fetch("/api/wallet/balances-for", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: addressMap }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (!data.balances) return;
          const bals: Record<string, { usdc: number; native: number; nativeSymbol: string }> = {};
          for (const [chain, bal] of Object.entries(data.balances)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const b = bal as any;
            bals[chain] = {
              usdc: parseFloat(b.usdc || "0"),
              native: parseFloat(b.native || "0"),
              nativeSymbol: b.nativeSymbol || "?",
            };
          }
          setMpBalances(bals);
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toChain]);

  const handleBridge = async () => {
    if (!amount || !storeAddress) return;
    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const fromToken = tokenType === "usdc" ? USDC_TOKENS[fromChain] : undefined;
      const toToken = tokenType === "usdc" ? USDC_TOKENS[toChain] : undefined;

      const res = await fetch("/api/moonpay/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromChain,
          fromToken,
          fromAmount: amount,
          toWallet: storeAddress,
          toChain,
          toToken,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.output || "Transfer submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setExecuting(false);
    }
  };

  const bridgeChains = DISPLAY_CHAINS.filter((c) =>
    ["base", "solana", "ethereum", "polygon"].includes(c.key)
  );

  const fromBal = mpBalances[fromChain];
  const availableBalance = fromBal
    ? tokenType === "usdc" ? fromBal.usdc : fromBal.native
    : 0;
  const availableSymbol = tokenType === "usdc" ? "USDC" : (fromBal?.nativeSymbol || "?");

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Fund Store Treasury</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">&#x2715;</button>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          Transfer from your MoonPay wallet to the Store Treasury via bridge/swap
        </p>

        {result ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-sm text-emerald-700 font-medium">Transfer submitted!</p>
              <p className="text-xs text-emerald-600 mt-1 break-all">{result}</p>
            </div>
            <button onClick={onClose} className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token type */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Send</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTokenType("usdc")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tokenType === "usdc" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                >
                  USDC
                </button>
                <button
                  onClick={() => setTokenType("native")}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${tokenType === "native" ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                >
                  Native (for gas)
                </button>
              </div>
            </div>

            {/* From chain */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">From (MoonPay)</label>
              <div className="flex flex-wrap gap-1.5">
                {bridgeChains.map((c) => {
                  const bal = mpBalances[c.key];
                  const chainUsdc = bal?.usdc || 0;
                  const chainNative = bal?.native || 0;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setFromChain(c.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors text-left ${fromChain === c.key ? "bg-purple-50 border-purple-300 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                    >
                      <span className="block">{c.name}</span>
                      <span className="block text-[10px] opacity-70">
                        {chainUsdc.toFixed(2)} USDC / {chainNative.toFixed(4)} {c.token}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                <p className="text-[10px] text-gray-400">Available to send</p>
                <p className="text-sm font-semibold text-purple-700">
                  {availableBalance.toFixed(tokenType === "usdc" ? 2 : 4)} {availableSymbol}
                </p>
              </div>
            </div>

            {/* To chain */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">To (Store Treasury)</label>
              <div className="flex flex-wrap gap-1.5">
                {bridgeChains.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setToChain(c.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${toChain === c.key ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              {storeAddress && (
                <p className="text-[10px] text-gray-400 font-mono mt-1">{storeAddress}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Amount</label>
              <input
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={tokenType === "usdc" ? "10.00" : "0.01"}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              onClick={handleBridge}
              disabled={executing || !amount}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors"
            >
              {executing ? "Sending..." : `Send ${tokenType === "usdc" ? "USDC" : "Native"} to Store`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MoonPayAccount() {
  const [step, setStep] = useState<Step>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [chainBalances, setChainBalances] = useState<Record<string, ChainBalance>>({});
  const [totalUsdc, setTotalUsdc] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const fetchingRef = { current: false };

  const fetchBalances = useCallback(async (addresses: Record<string, string>) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const addressMap: Record<string, string> = {};
      for (const chain of DISPLAY_CHAINS) {
        if (addresses[chain.key]) {
          addressMap[chain.key] = addresses[chain.key];
        }
      }

      const res = await fetch("/api/wallet/balances-for", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: addressMap }),
      });
      const data = await res.json();
      const bals: Record<string, ChainBalance> = {};
      let usdcTotal = 0;

      if (data.balances) {
        for (const [chain, bal] of Object.entries(data.balances)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const b = bal as any;
          bals[chain] = {
            native: b.native || "0",
            nativeSymbol: b.nativeSymbol || "?",
            usdc: b.usdc || "0",
          };
          usdcTotal += parseFloat(b.usdc || "0");
        }
      }

      setChainBalances(bals);
      setTotalUsdc(usdcTotal);
    } catch {
      // Balances unavailable
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Check for wallets on mount
    (async () => {
      try {
        const res = await fetch("/api/moonpay/wallets");
        const data = await res.json();
        const walletList = Array.isArray(data.wallets) ? data.wallets : [];
        if (walletList.length > 0) {
          setWallets(walletList);
          setStep("connected");
          if (walletList[0]?.addresses) {
            fetchBalances(walletList[0].addresses);
          }
          return;
        }
      } catch { /* no wallets */ }

      if (localStorage.getItem("pliromi_moonpay_email")) {
        setEmail(localStorage.getItem("pliromi_moonpay_email") || "");
      }
      setStep("login");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadWallets = async () => {
    try {
      const res = await fetch("/api/moonpay/wallets");
      const data = await res.json();
      const walletList = Array.isArray(data.wallets) ? data.wallets : [];
      if (walletList.length === 0) {
        setStep("wallet-setup");
        return;
      }
      setWallets(walletList);
      setStep("connected");
      if (walletList[0]?.addresses) {
        await fetchBalances(walletList[0].addresses);
      }
    } catch {
      setStep("wallet-setup");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    localStorage.setItem("pliromi_moonpay_email", email);
    window.open(`https://agents.moonpay.com/login?email=${encodeURIComponent(email)}`, "_blank");
    setStep("verify");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/moonpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/moonpay/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "pliromi" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadWallets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create wallet");
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  // --- Non-connected states ---

  if (step === "checking") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">MoonPay Account</h2>
        </div>
        <div className="text-center text-gray-400 py-4 text-sm">Checking account...</div>
      </div>
    );
  }

  if (step === "login") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">MoonPay Account</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">Connect your MoonPay account to manage funds</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" required />
          <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
            Sign In with MoonPay
          </button>
        </form>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">MoonPay Account</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">Enter the verification code from the MoonPay login page</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <form onSubmit={handleVerify} className="space-y-3">
          <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter verification code"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500" required />
          <button type="submit" disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? "Verifying..." : "Verify Code"}
          </button>
        </form>
      </div>
    );
  }

  if (step === "wallet-setup") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">MoonPay Account</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">No wallet found. Create one to get started.</p>
        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
        <button onClick={handleCreateWallet} disabled={loading}
          className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors">
          {loading ? "Creating..." : "Create MoonPay Wallet"}
        </button>
      </div>
    );
  }

  // --- Connected state ---
  const wallet = wallets[0];
  const addresses = wallet?.addresses || {};

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 text-xs font-bold">M</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">MoonPay Account</h2>
        </div>
        <button
          onClick={() => { if (wallet?.addresses) fetchBalances(wallet.addresses); }}
          className="text-xs text-gray-400 hover:text-purple-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {wallet && (
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 mb-4 text-white">
          <div className="text-xs uppercase tracking-wide font-medium opacity-80">Portfolio Value</div>
          <div className="text-2xl font-bold mt-0.5">${totalUsdc.toFixed(2)}</div>
          <div className="text-xs opacity-70 mt-1">{wallet.name}</div>
        </div>
      )}

      {/* Chain addresses with balances */}
      <div className="space-y-2">
        {DISPLAY_CHAINS.map((chain) => {
          const addr = addresses[chain.key];
          if (!addr) return null;
          const bal = chainBalances[chain.key];

          return (
            <div key={chain.key} className="rounded-xl p-3 border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-colors">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chain.icon} alt={chain.name} className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{chain.name}</span>
                    <span className="text-xs font-medium text-gray-400">{chain.token}</span>
                  </div>
                  <button
                    onClick={() => copyAddress(addr)}
                    className="text-xs text-gray-400 hover:text-purple-600 font-mono transition-colors"
                    title="Click to copy"
                  >
                    {copiedAddr === addr ? <span className="text-purple-600">Copied!</span> : truncateAddress(addr)}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 mt-1.5 ml-11 text-xs">
                {loading && !bal ? (
                  <span className="text-gray-300">Loading...</span>
                ) : (
                  <>
                    <span className={`font-medium ${bal && parseFloat(bal.usdc) > 0 ? "text-purple-600" : "text-gray-300"}`}>
                      {bal ? parseFloat(bal.usdc).toFixed(2) : "0.00"} USDC
                    </span>
                    <span className="text-gray-400">
                      {bal ? parseFloat(bal.native).toFixed(4) : "0.0000"} {chain.token}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
