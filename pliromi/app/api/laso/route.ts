import { readStore, updateStore, addAgentLog } from "@/lib/db";
import type { LasoCard } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);
const CARDS_FILE = path.join(process.cwd(), "..", "data", "laso-cards.json");

// Persist full card data to a dedicated file (card details are sensitive)
function saveCardToFile(card: LasoCard & { rawResponse?: unknown }) {
  let cards: (LasoCard & { rawResponse?: unknown })[] = [];
  try {
    cards = JSON.parse(fs.readFileSync(CARDS_FILE, "utf-8"));
  } catch { /* new file */ }
  cards.push(card);
  fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf-8");
}

function readCardsFile(): (LasoCard & { rawResponse?: unknown })[] {
  try {
    return JSON.parse(fs.readFileSync(CARDS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function updateCardInFile(cardId: string, updates: Partial<LasoCard>) {
  const cards = readCardsFile();
  const card = cards.find((c) => c.id === cardId);
  if (card) {
    Object.assign(card, updates);
    fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf-8");
  }
}

export async function GET() {
  // Return cards from the dedicated file (has full details)
  const fileCards = readCardsFile();
  const store = readStore();
  // Merge: file cards have full details, store cards are the index
  const cards = fileCards.length > 0 ? fileCards : (store.lasoCards || []);
  return Response.json({ cards });
}

export async function POST(request: Request) {
  const { amount, assignedTo } = await request.json();

  if (!amount || amount < 5) {
    return Response.json({ error: "Minimum card amount is $5" }, { status: 400 });
  }

  try {
    addAgentLog("System", `Ordering $${amount} Laso debit card via x402...`);

    const { stdout, stderr } = await execAsync(
      `npx ows pay request --wallet hackathon --no-passphrase "https://laso.finance/get-card?amount=${amount}"`,
      { timeout: 120000 }
    );

    const output = stdout || stderr;
    addAgentLog("System", `Laso raw response: ${output.slice(0, 500)}`);

    // Parse JSON from output (format: "Paid $X on chain via x402\nHTTP 200\n{json}")
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    let cardData: Record<string, unknown> = {};

    if (jsonMatch) {
      try {
        cardData = JSON.parse(jsonMatch[0]);
      } catch {
        cardData = { raw: jsonMatch[0] };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cd = cardData as any;
    const cardInfo = cd.card || cd;

    const card: LasoCard = {
      id: crypto.randomUUID(),
      assignedTo: assignedTo || "Unassigned",
      amount,
      cardNumber: cardInfo.card_number || cardInfo.cardNumber || cardInfo.number || "Pending",
      expiry: cardInfo.expiry || cardInfo.exp || cardInfo.expiration || "Pending",
      cvv: cardInfo.cvv || cardInfo.cvc || "Pending",
      status: cardInfo.status === "pending" ? "active" : "active",
      createdAt: new Date().toISOString(),
    };

    // Save to both store (index) and dedicated file (full details)
    updateStore((store) => {
      if (!store.lasoCards) store.lasoCards = [];
      store.lasoCards.push(card);
    });

    saveCardToFile({ ...card, rawResponse: cardData });

    addAgentLog("System", `Debit card ordered: $${amount} for ${card.assignedTo}. Card ID: ${card.id}`);

    // If card details are pending, start polling in background
    if (card.cardNumber === "Pending" && cardInfo.card_id) {
      pollForCardDetails(card.id, cardInfo.card_id, cardInfo.user_id || cd.user_id);
    }

    return Response.json({ card, rawResponse: cardData });
  } catch (err) {
    const message = (err as Error).message || "Failed to create card";
    const shortMsg = message.includes("stdout:")
      ? message.split("stdout:")[1]?.slice(0, 500) || message.slice(0, 500)
      : message.slice(0, 500);
    addAgentLog("System", `Debit card error: ${shortMsg}`);
    return Response.json({ error: shortMsg }, { status: 500 });
  }
}

// Poll Laso for card details (they may take time to be issued)
async function pollForCardDetails(internalId: string, lasoCardId: string, userId?: string) {
  const maxAttempts = 10;
  const delayMs = 10000; // 10 seconds between polls

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    try {
      // Try fetching card status
      const url = userId
        ? `https://laso.finance/get-card?card_id=${lasoCardId}&user_id=${userId}`
        : `https://laso.finance/get-card?card_id=${lasoCardId}`;

      const { stdout } = await execAsync(
        `npx ows pay request --wallet hackathon --no-passphrase "${url}"`,
        { timeout: 30000 }
      );

      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = JSON.parse(jsonMatch[0]) as any;
        const cardInfo = data.card || data;

        if (cardInfo.card_number || cardInfo.cardNumber || cardInfo.number) {
          const updates: Partial<LasoCard> = {
            cardNumber: cardInfo.card_number || cardInfo.cardNumber || cardInfo.number,
            expiry: cardInfo.expiry || cardInfo.exp || cardInfo.expiration,
            cvv: cardInfo.cvv || cardInfo.cvc,
          };

          // Update in file
          updateCardInFile(internalId, updates);

          // Update in store
          updateStore((store) => {
            const card = store.lasoCards?.find((c) => c.id === internalId);
            if (card) Object.assign(card, updates);
          });

          addAgentLog("System", `Debit card details received for ${internalId}: ****${updates.cardNumber?.slice(-4)}`);
          return;
        }
      }
    } catch {
      // Continue polling
    }
  }

  addAgentLog("System", `Debit card ${internalId}: polling timed out. Check Laso dashboard for details.`);
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

  // Also update in file
  updateCardInFile(id, { status: "revoked" });

  if (!found) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  addAgentLog("System", `Debit card revoked: ${id}`);
  return Response.json({ success: true });
}
