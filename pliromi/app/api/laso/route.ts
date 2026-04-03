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
  const cards = fileCards.length > 0 ? fileCards : (store.lasoCards || []);

  // Check any pending cards in the background (non-blocking)
  const pendingCards = fileCards.filter(
    (c) => c.cardNumber === "Pending" && c.rawResponse
  ) as (LasoCard & { rawResponse?: Record<string, unknown> })[];
  if (pendingCards.length > 0) {
    checkPendingCards(pendingCards).catch(() => {});
  }

  return Response.json({ cards });
}

// Check all pending cards for delivery
async function checkPendingCards(pendingCards: (LasoCard & { rawResponse?: Record<string, unknown> })[]) {
  for (const card of pendingCards) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = card.rawResponse as any;
    if (!raw?.auth?.id_token || !raw?.card?.card_id) continue;

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

      if (res.status === 401 || res.status === 403) {
        // Token expired — try refreshing
        if (raw.auth.refresh_token) {
          try {
            const refreshRes = await fetch(
              "https://securetoken.googleapis.com/v1/token?key=AIzaSyDLkxn8QjCMNsXGLOIb3JH4HMfDq7h4cPs",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grant_type: "refresh_token", refresh_token: raw.auth.refresh_token }),
              }
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.id_token) {
                // Update token in file
                raw.auth.id_token = refreshData.id_token;
                const allCards = readCardsFile();
                const fc = allCards.find((c) => c.id === card.id);
                if (fc) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (fc.rawResponse as any).auth.id_token = refreshData.id_token;
                  fs.writeFileSync(CARDS_FILE, JSON.stringify(allCards, null, 2), "utf-8");
                }

                // Retry with new token
                const retryRes = await fetch(`${callableUrl}/getCardDetails`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${refreshData.id_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ data: { card_id: raw.card.card_id } }),
                });

                if (retryRes.ok) {
                  await processCardResponse(card.id, await retryRes.json());
                }
              }
            }
          } catch { /* refresh failed */ }
        }
        continue;
      }

      if (res.ok) {
        await processCardResponse(card.id, await res.json());
      }
    } catch {
      // Silent fail on individual card check
    }
  }
}

async function processCardResponse(internalId: string, data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (data as any).result || data;
  const cardInfo = result.card || result;
  const cardNumber = cardInfo.card_number || cardInfo.cardNumber || cardInfo.pan || cardInfo.number;

  if (cardNumber && cardNumber !== "Pending") {
    const allCards = readCardsFile();
    const card = allCards.find((c) => c.id === internalId);
    if (card) {
      card.cardNumber = cardNumber;
      card.expiry = cardInfo.expiry || cardInfo.exp || (cardInfo.exp_month && `${cardInfo.exp_month}/${cardInfo.exp_year}`) || card.expiry;
      card.cvv = cardInfo.cvv || cardInfo.cvc || cardInfo.security_code || card.cvv;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (card as any).rawResponse = { ...((card as any).rawResponse || {}), cardDetails: result };
      fs.writeFileSync(CARDS_FILE, JSON.stringify(allCards, null, 2), "utf-8");

      updateStore((store) => {
        const sc = store.lasoCards?.find((c) => c.id === internalId);
        if (sc) {
          sc.cardNumber = cardNumber;
          sc.expiry = card.expiry;
          sc.cvv = card.cvv;
        }
      });

      addAgentLog("System", `Debit card delivered! ****${cardNumber.slice(-4)} is ready to use.`);
    }
  }
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
      const authData = cd.auth || {};
      const callableUrl = cd.callable_base_url || "https://us-central1-kyc-ts.cloudfunctions.net";
      pollForCardDetails(
        card.id,
        cardInfo.card_id,
        callableUrl,
        authData.id_token || "",
        authData.refresh_token || ""
      );
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

// Poll Laso for card details using the auth token from the initial response
async function pollForCardDetails(
  internalId: string,
  lasoCardId: string,
  callableBaseUrl: string,
  idToken: string,
  refreshToken: string
) {
  const maxAttempts = 12;
  const delayMs = 15000; // 15 seconds between polls

  let currentToken = idToken;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    addAgentLog("System", `Polling card ${lasoCardId} (attempt ${attempt + 1}/${maxAttempts})...`);

    try {
      // Call the Laso getCardDetails callable function
      const res = await fetch(`${callableBaseUrl}/getCardDetails`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: { card_id: lasoCardId } }),
      });

      if (res.status === 401 || res.status === 403) {
        // Token expired — try refreshing
        try {
          // Try multiple Firebase API keys for the kyc-ts project
          for (const apiKey of ["AIzaSyDLkxn8QjCMNsXGLOIb3JH4HMfDq7h4cPs", "AIzaSyAVZFnGOASm66KOkGHF7xFREP4rFXaoFgQ"]) {
            const refreshRes = await fetch(
              `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
              }
            );
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.id_token) {
                currentToken = refreshData.id_token;
                break;
              }
            }
          }
        } catch {
          // Can't refresh — continue with current token
        }
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (data as any).result || data;
        const cardInfo = result.card || result;

        // Check if card details are available (not just pending status)
        const cardNumber = cardInfo.card_number || cardInfo.cardNumber || cardInfo.number || cardInfo.pan;
        const cardStatus = cardInfo.status;

        if (cardNumber && cardNumber !== "Pending") {
          const updates: Partial<LasoCard> = {
            cardNumber,
            expiry: cardInfo.expiry || cardInfo.exp || cardInfo.expiration || cardInfo.exp_month && `${cardInfo.exp_month}/${cardInfo.exp_year}`,
            cvv: cardInfo.cvv || cardInfo.cvc || cardInfo.security_code,
          };

          updateCardInFile(internalId, updates);
          updateStore((store) => {
            const card = store.lasoCards?.find((c) => c.id === internalId);
            if (card) Object.assign(card, updates);
          });

          // Also save the full response to the file
          const fileCards = readCardsFile();
          const fc = fileCards.find((c) => c.id === internalId);
          if (fc) {
            fc.rawResponse = { ...((fc.rawResponse as Record<string, unknown>) || {}), cardDetails: result };
            fs.writeFileSync(CARDS_FILE, JSON.stringify(fileCards, null, 2), "utf-8");
          }

          addAgentLog("System", `Debit card ready! Card ****${cardNumber.slice(-4)} ($${cardInfo.usd_amount || "?"}) issued.`);
          return;
        }

        if (cardStatus && cardStatus !== "pending") {
          addAgentLog("System", `Card ${lasoCardId} status: ${cardStatus}`);
        }
      }
    } catch (err) {
      addAgentLog("System", `Card poll error: ${(err as Error).message?.slice(0, 100)}`);
    }
  }

  addAgentLog("System", `Card ${lasoCardId} still pending after ${maxAttempts} polls. It may take longer — check the Debit Cards page for updates.`);
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
