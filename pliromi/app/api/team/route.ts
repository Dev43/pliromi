import { readStore, updateStore } from "@/lib/db";
import { getWalletInfo, createTeamPolicy, createTeamApiKey } from "@/lib/wallet";

export async function GET() {
  const store = readStore();
  return Response.json({ team: store.team });
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
