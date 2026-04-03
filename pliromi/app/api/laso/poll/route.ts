import fs from "fs";
import path from "path";
import { addAgentLog, updateStore } from "@/lib/db";
import type { LasoCard } from "@/lib/db";

const CARDS_FILE = path.join(process.cwd(), "..", "data", "laso-cards.json");

export async function POST(request: Request) {
  const { cardId } = await request.json();

  let cards: (LasoCard & { rawResponse?: Record<string, unknown> })[] = [];
  try {
    cards = JSON.parse(fs.readFileSync(CARDS_FILE, "utf-8"));
  } catch {
    return Response.json({ error: "No cards found" }, { status: 404 });
  }

  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = card.rawResponse as any;
  if (!raw?.auth?.id_token || !raw?.card?.card_id) {
    return Response.json({ error: "No auth data to poll with" }, { status: 400 });
  }

  const callableUrl = raw.callable_base_url || "https://us-central1-kyc-ts.cloudfunctions.net";

  try {
    const res = await fetch(`${callableUrl}/getCardDetails`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${raw.auth.id_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { card_id: raw.card.card_id } }),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Laso API ${res.status}: ${text.slice(0, 200)}`, status: card.status });
    }

    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = (data as any).result || data;
    const cardInfo = result.card || result;
    const cardNumber = cardInfo.card_number || cardInfo.cardNumber || cardInfo.pan;

    if (cardNumber) {
      card.cardNumber = cardNumber;
      card.expiry = cardInfo.expiry || cardInfo.exp_month && `${cardInfo.exp_month}/${cardInfo.exp_year}` || card.expiry;
      card.cvv = cardInfo.cvv || cardInfo.cvc || cardInfo.security_code || card.cvv;
      card.rawResponse = { ...raw, cardDetails: result };

      fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf-8");

      updateStore((store) => {
        const sc = store.lasoCards?.find((c) => c.id === cardId);
        if (sc) {
          sc.cardNumber = card.cardNumber;
          sc.expiry = card.expiry;
          sc.cvv = card.cvv;
        }
      });

      addAgentLog("System", `Card details updated: ****${cardNumber.slice(-4)}`);
    }

    return Response.json({ card, details: result });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
