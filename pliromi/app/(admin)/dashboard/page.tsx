"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MoonPayAccount from "@/components/MoonPayAccount";
import WalletBalances from "@/components/WalletBalances";
import Inventory from "@/components/Inventory";
import TreasuryPieChart from "@/components/TreasuryPieChart";
import ActivityLog from "@/components/ActivityLog";
import SalesChart from "@/components/SalesChart";

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
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{org?.name}</h1>
        <p className="text-gray-500 text-sm">{org?.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Col 1: MoonPay Account */}
        <div className="lg:col-span-1">
          <MoonPayAccount />
        </div>

        {/* Col 2: Store Treasury */}
        <div className="lg:col-span-1">
          <WalletBalances />
        </div>

        {/* Col 3: Inventory + Allocation */}
        <div className="lg:col-span-1 space-y-5">
          <Inventory />
          <TreasuryPieChart />
        </div>

        {/* Col 4: Sales + Activity */}
        <div className="lg:col-span-1 space-y-5">
          <SalesChart />
          <ActivityLog />
        </div>
      </div>
    </div>
  );
}
