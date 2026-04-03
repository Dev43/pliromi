import { readStore, updateStore } from "@/lib/db";
import { getWalletInfo, createTeamPolicy, createTeamApiKey } from "@/lib/wallet";

export async function GET() {
  const store = readStore();

  // Compute daily spend per member from agent logs and sales
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Sum sales today by agent name (seller handles sales)
  const salesToday = (store.sales || []).filter((s) => s.timestamp >= todayISO);
  const sellerSpent = salesToday.reduce((sum, s) => sum + (s.price || 0), 0);

  // Parse agent logs for dollar amounts in transactions today
  const logsToday = (store.agentLogs || []).filter((l) => l.timestamp >= todayISO);
  const spendByAgent: Record<string, number> = {};

  for (const log of logsToday) {
    // Match patterns like "deposit $X", "bridge $X", "Lulo deposit tx for $X"
    const amountMatch = log.message.match(/\$(\d+(?:\.\d+)?)/);
    if (amountMatch && (log.message.includes("deposit") || log.message.includes("bridge") || log.message.includes("swap") || log.message.includes("Fund"))) {
      const agent = log.agent.charAt(0).toUpperCase() + log.agent.slice(1);
      spendByAgent[agent] = (spendByAgent[agent] || 0) + parseFloat(amountMatch[1]);
    }
  }

  // Seller gets credit for sales
  if (sellerSpent > 0) {
    spendByAgent["Seller"] = (spendByAgent["Seller"] || 0) + sellerSpent;
  }

  const teamWithSpend = store.team.map((m) => ({
    ...m,
    spentToday: spendByAgent[m.name] || 0,
  }));

  return Response.json({ team: teamWithSpend });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, type, role, policyPreset } = body;

  if (!name || !type) {
    return Response.json({ error: "Name and type are required" }, { status: 400 });
  }

  const wallet = getWalletInfo();

  // Create policy based on preset
  const policyConfig = {
    conservative: { maxSpend: 100, dailyLimit: 100 },
    moderate: { maxSpend: 500, dailyLimit: 500 },
    unlimited: { maxSpend: 100000, dailyLimit: 100000 },
  }[policyPreset as string] || { maxSpend: 100, dailyLimit: 500 };

  let apiKeyId: string | undefined;
  let apiToken: string | undefined;

  try {
    // Create policy (returns void, best-effort)
    createTeamPolicy({
      name: `${name}-policy`,
      ...policyConfig,
    });

    // Create API key
    const keyResult = createTeamApiKey(
      name,
      [wallet.id],
      [],
      ""
    ) as { id?: string; token?: string } | undefined;
    apiKeyId = keyResult?.id;
    apiToken = keyResult?.token;
  } catch (e) {
    // Policy/key creation is best-effort for hackathon
    console.error("Policy/key creation error:", e);
  }

  const id = crypto.randomUUID();
  const member = {
    id,
    name,
    type: type as "human" | "agent",
    role: role || (type === "agent" ? "Agent" : "Team Member"),
    apiKeyId,
    policy: {
      maxTransactionAmount: policyConfig.maxSpend,
      dailySpendLimit: policyConfig.dailyLimit,
      allowedChains: ["evm", "solana"],
    },
  };

  updateStore((store) => {
    store.team.push(member);
  });

  return Response.json({ member, apiToken });
}
