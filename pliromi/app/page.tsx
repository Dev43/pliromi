"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
    title: "Multi-Chain Treasury",
    desc: "Manage USDC across Ethereum, Base, Polygon, Arbitrum, Solana, and more from a single dashboard.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
    title: "Smart Inventory",
    desc: "Track products, stock levels, and pricing with real-time updates and automated restocking alerts.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: "AI Agents",
    desc: "Treasurer agent optimizes yield. Seller agent handles customers, negotiates prices, and closes deals.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    title: "x402 Payments",
    desc: "Native HTTP 402 Payment Required protocol. Customers pay with crypto, inventory updates instantly.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    title: "Team Chat",
    desc: "XMTP-powered decentralized messaging. Humans and AI agents collaborate in real-time group chats.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: "MCP Server",
    desc: "Your store is an MCP server. Any AI agent can browse, search, and purchase from your inventory.",
  },
];

const sponsors = [
  { name: "Open Wallet Standard", url: "https://openwallet.sh", logo: "/ows-logo.svg", invert: false },
  { name: "XMTP", url: "https://xmtp.org", logo: null, invert: false },
  { name: "MoonPay", url: "https://moonpay.com", logo: null, invert: false },
  { name: "Lulo Finance", url: "https://lulo.fi", logo: null, invert: false },
  { name: "Laso Finance", url: "https://www.laso.finance", logo: null, invert: false },
];

function FloatingOrb({ className }: { className: string }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 animate-pulse pointer-events-none ${className}`}
    />
  );
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white overflow-hidden relative">
      {/* Background orbs */}
      <FloatingOrb className="w-96 h-96 bg-emerald-500 top-[-8rem] left-[-6rem]" />
      <FloatingOrb className="w-80 h-80 bg-emerald-400 top-[20rem] right-[-4rem]" />
      <FloatingOrb className="w-64 h-64 bg-teal-500 bottom-[10rem] left-[10%]" />

      {/* Grid background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ───── NAV ───── */}
      <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-emerald-500/25">
            P
          </div>
          <span className="text-xl font-bold tracking-tight">Pliromi</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/store"
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Store
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section
        className={`relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-28 text-center transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Built for the Open Wallet Standard Hackathon
        </div>

        <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
          <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            AI-Powered Store
          </span>
          <br />
          <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
            &amp; Treasury Management
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Pliromi (<span className="text-emerald-400 font-medium">&pi;&lambda;&eta;&rho;&omega;&mu;&eta;</span> &mdash; &ldquo;payment&rdquo; in Greek) unifies
          multi-chain wallets, inventory, AI agents, and decentralized messaging
          into one seamless platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="group relative px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
          >
            Admin Dashboard
            <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">
              &rarr;
            </span>
          </Link>
          <Link
            href="/store"
            className="px-8 py-3.5 border border-gray-700 hover:border-emerald-500/50 text-gray-200 hover:text-white font-semibold rounded-xl transition-all duration-300 hover:bg-emerald-500/5 hover:-translate-y-0.5"
          >
            Visit Store
          </Link>
        </div>
      </section>

      {/* ───── FEATURES ───── */}
      <section
        className={`relative z-10 max-w-6xl mx-auto px-6 pb-28 transition-all duration-1000 delay-300 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Everything you need to run a
            <span className="text-emerald-400"> crypto-native store</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            From treasury optimization to customer haggling, Pliromi handles it all with AI agents and open protocols.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-sm p-6 hover:border-emerald-500/40 hover:bg-gray-800/60 transition-all duration-300 hover:-translate-y-1"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              {/* Glow on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors duration-300">
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-100 group-hover:text-white transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            How it <span className="text-emerald-400">works</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Onboard",
              desc: "Create your org. OWS generates a multi-chain wallet with derived addresses for every supported network.",
            },
            {
              step: "02",
              title: "Sell",
              desc: "Add products. Customers pay via x402 or chat with the AI Seller agent that can negotiate prices.",
            },
            {
              step: "03",
              title: "Grow",
              desc: "The Treasurer agent automatically bridges funds and deploys idle USDC into Lulo yield farming.",
            },
          ].map((s) => (
            <div key={s.step} className="text-center md:text-left">
              <div className="text-5xl font-black text-emerald-500/20 mb-2 font-mono">
                {s.step}
              </div>
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── TECH STACK / SPONSORS ───── */}
      <section
        className={`relative z-10 max-w-4xl mx-auto px-6 pb-28 transition-all duration-1000 delay-500 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Powered by <span className="text-emerald-400">open protocols</span>
          </h2>
          <p className="text-gray-500 max-w-lg mx-auto">
            Built on the best infrastructure in crypto.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6">
          {sponsors.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-6 py-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-emerald-500/40 hover:bg-gray-800/60 transition-all duration-300 hover:-translate-y-0.5"
            >
              {s.logo ? (
                <img
                  src={s.logo}
                  alt={s.name}
                  className="h-7 w-auto opacity-70 group-hover:opacity-100 transition-opacity invert"
                />
              ) : (
                <span className="text-lg font-bold text-gray-400 group-hover:text-emerald-400 transition-colors">
                  {s.name}
                </span>
              )}
              {s.logo && (
                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300 transition-colors">
                  {s.name}
                </span>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900/80 to-emerald-950/30 p-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Set up your multi-chain store in minutes. No seed phrases, no complexity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
            >
              Open Dashboard
              <span className="inline-block ml-2 transition-transform duration-200 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
            <Link
              href="/store"
              className="px-8 py-3.5 border border-gray-700 hover:border-emerald-500/50 text-gray-200 hover:text-white font-semibold rounded-xl transition-all duration-300 hover:bg-emerald-500/5 hover:-translate-y-0.5"
            >
              Browse Store
            </Link>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="relative z-10 border-t border-gray-800/50 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/ows-logo.svg" alt="Open Wallet Standard" className="h-8 w-auto opacity-60 invert" />
            <span className="text-sm text-gray-600">
              Built with the Open Wallet Standard
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Pliromi &mdash; OWS Hackathon 2025
          </div>
        </div>
      </footer>
    </div>
  );
}
