"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import WalletBalances from "@/components/WalletBalances";
import Inventory from "@/components/Inventory";
import TreasuryPieChart from "@/components/TreasuryPieChart";
import ActivityLog from "@/components/ActivityLog";

const XmtpChat = dynamic(() => import("@/components/XmtpChat"), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center text-gray-400 py-8">
      Loading XMTP...
    </div>
  ),
});

interface OrgData {
  name: string;
  description: string;
}

export default function DashboardPage() {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/org")
      .then((r) => r.json())
      .then((data) => {
        if (!data.org) {
          router.replace("/onboarding");
        } else {
          setOrg(data.org);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{org?.name}</h1>
        <p className="text-gray-500 text-sm">{org?.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <WalletBalances />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Inventory />
          <TreasuryPieChart />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <XmtpChat />
          <ActivityLog />
        </div>
      </div>
    </div>
  );
}
