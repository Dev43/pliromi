import { readStore, updateStore, addAgentLog } from "@/lib/db";
import type { LasoCard } from "@/lib/db";

export async function GET() {
  const store = readStore();
  return Response.json({ cards: store.lasoCards || [] });
}

export async function POST(request: Request) {
  const { amount, assignedTo } = await request.json();

  if (!amount || amount <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://laso.finance/get-card?amount=${amount}`);

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Laso API error: ${text}` }, { status: res.status });
    }

    const data = await res.json();

    const card: LasoCard = {
      id: crypto.randomUUID(),
      assignedTo: assignedTo || "Unassigned",
      amount,
      cardNumber: data.cardNumber || data.card_number || data.number || "****",
      expiry: data.expiry || data.exp || data.expiration || "**/**",
      cvv: data.cvv || data.cvc || "***",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    updateStore((store) => {
      if (!store.lasoCards) store.lasoCards = [];
      store.lasoCards.push(card);
    });

    addAgentLog("System", `Debit card ordered: $${amount} assigned to ${card.assignedTo}`);

    return Response.json({ card });
  } catch (err) {
    const message = (err as Error).message || "Failed to create card";
    addAgentLog("System", `Debit card error: ${message.slice(0, 200)}`);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  let found = false;
  updateStore((store) => {
    if (!store.lasoCards) return;
    const card = store.lasoCards.find((c) => c.id === id);
    if (card) {
      card.status = "revoked";
      found = true;
    }
  });

  if (!found) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  addAgentLog("System", `Debit card revoked: ${id}`);
  return Response.json({ success: true });
}
