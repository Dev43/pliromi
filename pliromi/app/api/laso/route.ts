import { readStore, updateStore, addAgentLog } from "@/lib/db";
import type { LasoCard } from "@/lib/db";
// import { exec } from "child_process";
// import { promisify } from "util";
import fs from "fs";
import path from "path";

// const execAsync = promisify(exec);
const CARDS_FILE = path.join(process.cwd(), "..", "data", "laso-cards.json");

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

// function updateCardInFile(cardId: string, updates: Partial<LasoCard>) {
//   const cards = readCardsFile();
//   const card = cards.find((c) => c.id === cardId);
//   if (card) {
//     Object.assign(card, updates);
//     fs.writeFileSync(CARDS_FILE, JSON.stringify(cards, null, 2), "utf-8");
//   }
// }

export async function GET() {
  const fileCards = readCardsFile();
  const store = readStore();
  const cards = fileCards.length > 0 ? fileCards : (store.lasoCards || []);


  // 
  // --------------------------------------------------------------------------
  // REAL IMPLEMENTATION — polls pending cards for delivery via Laso/Firebase.
  // Commented out because the real x402 flow works and we've verified it,
  // but we've spent enough money ordering debit cards during the hackathon.
  // --------------------------------------------------------------------------
  // const pendingCards = fileCards.filter(
  //   (c) => c.cardNumber === "Pending" && c.rawResponse
  // ) as (LasoCard & { rawResponse?: Record<string, unknown> })[];
  // if (pendingCards.length > 0) {
  //   checkPendingCards(pendingCards).catch(() => {});
  // }

  return Response.json({ cards });
}

// --------------------------------------------------------------------------
// REAL IMPLEMENTATION — Check all pending cards for delivery.
// Uses Firebase callable functions with token refresh to poll Laso for
// card details (number, expiry, CVV) after x402 payment.
// Commented out: works but we've spent enough on cards for the hackathon.
// --------------------------------------------------------------------------
// async function checkPendingCards(pendingCards: (LasoCard & { rawResponse?: Record<string, unknown> })[]) {
//   for (const card of pendingCards) {
//     const raw = card.rawResponse as any;
//     if (!raw?.auth?.id_token || !raw?.card?.card_id) continue;
//
//     const callableUrl = raw.callable_base_url || "https://us-central1-kyc-ts.cloudfunctions.net";
//
//     try {
//       const res = await fetch(`${callableUrl}/getCardDetails`, {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${raw.auth.id_token}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ data: { card_id: raw.card.card_id } }),
//       });
//
//       if (res.status === 401 || res.status === 403) {
//         if (raw.auth.refresh_token) {
//           try {
//             const refreshRes = await fetch(
//               "https://securetoken.googleapis.com/v1/token?key=AIzaSyDLkxn8QjCMNsXGLOIb3JH4HMfDq7h4cPs",
//               {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ grant_type: "refresh_token", refresh_token: raw.auth.refresh_token }),
//               }
//             );
//             if (refreshRes.ok) {
//               const refreshData = await refreshRes.json();
//               if (refreshData.id_token) {
//                 raw.auth.id_token = refreshData.id_token;
//                 const allCards = readCardsFile();
//                 const fc = allCards.find((c) => c.id === card.id);
//                 if (fc) {
//                   (fc.rawResponse as any).auth.id_token = refreshData.id_token;
//                   fs.writeFileSync(CARDS_FILE, JSON.stringify(allCards, null, 2), "utf-8");
//                 }
//
//                 const retryRes = await fetch(`${callableUrl}/getCardDetails`, {
//                   method: "POST",
//                   headers: {
//                     "Authorization": `Bearer ${refreshData.id_token}`,
//                     "Content-Type": "application/json",
//                   },
//                   body: JSON.stringify({ data: { card_id: raw.card.card_id } }),
//                 });
//
//                 if (retryRes.ok) {
//                   await processCardResponse(card.id, await retryRes.json());
//                 }
//               }
//             }
//           } catch { /* refresh failed */ }
//         }
//         continue;
//       }
//
//       if (res.ok) {
//         await processCardResponse(card.id, await res.json());
//       }
//     } catch {
//       // Silent fail on individual card check
//     }
//   }
// }

// async function processCardResponse(internalId: string, data: unknown) {
//   const result = (data as any).result || data;
//   const cardInfo = result.card || result;
//   const cardNumber = cardInfo.card_number || cardInfo.cardNumber || cardInfo.pan || cardInfo.number;
//
//   if (cardNumber && cardNumber !== "Pending") {
//     const allCards = readCardsFile();
//     const card = allCards.find((c) => c.id === internalId);
//     if (card) {
//       card.cardNumber = cardNumber;
//       card.expiry = cardInfo.expiry || cardInfo.exp || (cardInfo.exp_month && `${cardInfo.exp_month}/${cardInfo.exp_year}`) || card.expiry;
//       card.cvv = cardInfo.cvv || cardInfo.cvc || cardInfo.security_code || card.cvv;
//       (card as any).rawResponse = { ...((card as any).rawResponse || {}), cardDetails: result };
//       fs.writeFileSync(CARDS_FILE, JSON.stringify(allCards, null, 2), "utf-8");
//
//       updateStore((store) => {
//         const sc = store.lasoCards?.find((c) => c.id === internalId);
//         if (sc) {
//           sc.cardNumber = cardNumber;
//           sc.expiry = card.expiry;
//           sc.cvv = card.cvv;
//         }
//       });
//
//       addAgentLog("System", `Debit card delivered! ****${cardNumber.slice(-4)} is ready to use.`);
//     }
//   }
// }

export async function POST(request: Request) {
  const { amount, assignedTo } = await request.json();

  if (!amount || amount < 5) {
    return Response.json({ error: "Minimum card amount is $5" }, { status: 400 });
  }

  // --------------------------------------------------------------------------
  // REAL IMPLEMENTATION — orders a Laso prepaid debit card via x402 payment.
  // Uses `ows pay request` to pay USDC to Laso's x402 endpoint, which returns
  // Firebase auth tokens + card_id. Then polls for card details in background.
  // Commented out: works and has been verified, but we've spent enough money
  // ordering debit cards during the hackathon!
  // --------------------------------------------------------------------------
  // try {
  //   addAgentLog("System", `Ordering $${amount} Laso debit card via x402...`);
  //
  //   const { stdout, stderr } = await execAsync(
  //     `npx ows pay request --wallet hackathon --no-passphrase "https://laso.finance/get-card?amount=${amount}"`,
  //     { timeout: 120000 }
  //   );
  //
  //   const output = stdout || stderr;
  //   addAgentLog("System", `Laso raw response: ${output.slice(0, 500)}`);
  //
  //   const jsonMatch = output.match(/\{[\s\S]*\}/);
  //   let cardData: Record<string, unknown> = {};
  //
  //   if (jsonMatch) {
  //     try {
  //       cardData = JSON.parse(jsonMatch[0]);
  //     } catch {
  //       cardData = { raw: jsonMatch[0] };
  //     }
  //   }
  //
  //   const cd = cardData as any;
  //   const cardInfo = cd.card || cd;
  //
  //   const card: LasoCard = {
  //     id: crypto.randomUUID(),
  //     assignedTo: assignedTo || "Unassigned",
  //     amount,
  //     cardNumber: cardInfo.card_number || cardInfo.cardNumber || cardInfo.number || "Pending",
  //     expiry: cardInfo.expiry || cardInfo.exp || cardInfo.expiration || "Pending",
  //     cvv: cardInfo.cvv || cardInfo.cvc || "Pending",
  //     status: "active",
  //     createdAt: new Date().toISOString(),
  //   };
  //
  //   updateStore((store) => {
  //     if (!store.lasoCards) store.lasoCards = [];
  //     store.lasoCards.push(card);
  //   });
  //
  //   saveCardToFile({ ...card, rawResponse: cardData });
  //
  //   addAgentLog("System", `Debit card ordered: $${amount} for ${card.assignedTo}. Card ID: ${card.id}`);
  //
  //   // If card details are pending, start polling in background
  //   if (card.cardNumber === "Pending" && cardInfo.card_id) {
  //     const authData = cd.auth || {};
  //     const callableUrl = cd.callable_base_url || "https://us-central1-kyc-ts.cloudfunctions.net";
  //     pollForCardDetails(
  //       card.id,
  //       cardInfo.card_id,
  //       callableUrl,
  //       authData.id_token || "",
  //       authData.refresh_token || ""
  //     );
  //   }
  //
  //   return Response.json({ card, rawResponse: cardData });
  // } catch (err) {
  //   const message = (err as Error).message || "Failed to create card";
  //   addAgentLog("System", `Debit card error: ${message.slice(0, 500)}`);
  //   return Response.json({ error: message.slice(0, 500) }, { status: 500 });
  // }

  // --------------------------------------------------------------------------
  // STUB for demo — simulates a successful card order
  // --------------------------------------------------------------------------
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const card: LasoCard = {
    id: crypto.randomUUID(),
    assignedTo: assignedTo || "Unassigned",
    amount,
    cardNumber: `4*** **** **** ${Math.floor(1000 + Math.random() * 9000)}`,
    expiry: `${String(Math.floor(1 + Math.random() * 12)).padStart(2, "0")}/${new Date().getFullYear() + 2 - 2000}`,
    cvv: String(Math.floor(100 + Math.random() * 900)),
    status: "active",
    createdAt: new Date().toISOString(),
  };

  updateStore((store) => {
    if (!store.lasoCards) store.lasoCards = [];
    store.lasoCards.push(card);
  });

  saveCardToFile({
    ...card,
    rawResponse: {
      note: "Stubbed for demo — real x402 Laso integration is commented out above",
      card: { card_id: `demo-${card.id.slice(0, 8)}`, usd_amount: amount, status: "active" },
    },
  });

  addAgentLog("System", `Debit card issued: $${amount} USDC prepaid card for ${card.assignedTo} (****${card.cardNumber.slice(-4)})`);

  return Response.json({ card });
}

// --------------------------------------------------------------------------
// REAL IMPLEMENTATION — polls Laso for card details using Firebase auth.
// Commented out: works but we've spent enough on cards for the hackathon.
// --------------------------------------------------------------------------
// async function pollForCardDetails(
//   internalId: string,
//   lasoCardId: string,
//   callableBaseUrl: string,
//   idToken: string,
//   refreshToken: string
// ) {
//   const maxAttempts = 12;
//   const delayMs = 15000;
//
//   let currentToken = idToken;
//
//   for (let attempt = 0; attempt < maxAttempts; attempt++) {
//     await new Promise((resolve) => setTimeout(resolve, delayMs));
//     addAgentLog("System", `Polling card ${lasoCardId} (attempt ${attempt + 1}/${maxAttempts})...`);
//
//     try {
//       const res = await fetch(`${callableBaseUrl}/getCardDetails`, {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${currentToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ data: { card_id: lasoCardId } }),
//       });
//
//       if (res.status === 401 || res.status === 403) {
//         // Token expired — refresh
//         for (const apiKey of ["AIzaSyDLkxn8QjCMNsXGLOIb3JH4HMfDq7h4cPs"]) {
//           const refreshRes = await fetch(
//             `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
//             {
//               method: "POST",
//               headers: { "Content-Type": "application/json" },
//               body: JSON.stringify({ grant_type: "refresh_token", refresh_token: refreshToken }),
//             }
//           );
//           if (refreshRes.ok) {
//             const refreshData = await refreshRes.json();
//             if (refreshData.id_token) {
//               currentToken = refreshData.id_token;
//               break;
//             }
//           }
//         }
//         continue;
//       }
//
//       if (res.ok) {
//         const data = await res.json();
//         const result = (data as any).result || data;
//         const cardInfo = result.card || result;
//         const cardNumber = cardInfo.card_number || cardInfo.cardNumber || cardInfo.pan;
//
//         if (cardNumber && cardNumber !== "Pending") {
//           updateCardInFile(internalId, {
//             cardNumber,
//             expiry: cardInfo.expiry || cardInfo.exp_month && `${cardInfo.exp_month}/${cardInfo.exp_year}`,
//             cvv: cardInfo.cvv || cardInfo.cvc || cardInfo.security_code,
//           });
//           updateStore((store) => {
//             const card = store.lasoCards?.find((c) => c.id === internalId);
//             if (card) {
//               card.cardNumber = cardNumber;
//               card.expiry = cardInfo.expiry;
//               card.cvv = cardInfo.cvv;
//             }
//           });
//           addAgentLog("System", `Debit card ready! Card ****${cardNumber.slice(-4)} issued.`);
//           return;
//         }
//       }
//     } catch (err) {
//       addAgentLog("System", `Card poll error: ${(err as Error).message?.slice(0, 100)}`);
//     }
//   }
//
//   addAgentLog("System", `Card ${lasoCardId} still pending after ${maxAttempts} polls.`);
// }

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

  const fileCards = readCardsFile();
  const fc = fileCards.find((c) => c.id === id);
  if (fc) {
    fc.status = "revoked";
    fs.writeFileSync(CARDS_FILE, JSON.stringify(fileCards, null, 2), "utf-8");
  }

  if (!found && !fc) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }

  addAgentLog("System", `Debit card revoked: ${id}`);
  return Response.json({ success: true });
}
