import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "..", "data", "store.json");

export interface OrgData {
  name: string;
  description: string;
  walletName: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  minPrice: number;
  maxPrice: number;
  quantity: number;
  imageUrl?: string;
}

export interface PolicyRules {
  maxTransactionAmount: number;
  dailySpendLimit: number;
  allowedChains: string[];
}

export interface TeamMember {
  id: string;
  name: string;
  type: "human" | "agent";
  apiKeyId?: string;
  policyId?: string;
  role: string;
  policy?: PolicyRules;
}

export interface Sale {
  id: string;
  productId: string;
  price: number;
  chain: string;
  txHash: string;
  timestamp: string;
}

export interface AgentLog {
  agent: string;
  message: string;
  timestamp: string;
}

export interface LuloPosition {
  balance: number;
  apy: number;
  lastUpdated: string;
}

export interface LasoCard {
  id: string;
  assignedTo: string;
  amount: number;
  cardNumber: string;
  expiry: string;
  cvv: string;
  status: "active" | "depleted" | "revoked";
  createdAt: string;
}

export interface StoreData {
  org: OrgData | null;
  inventory: InventoryItem[];
  team: TeamMember[];
  sales: Sale[];
  agentLogs: AgentLog[];
  lulo?: LuloPosition;
  lasoCards?: LasoCard[];
}

const DEFAULT_DATA: StoreData = {
  org: null,
  inventory: [],
  team: [],
  sales: [],
  agentLogs: [],
};

// In-memory cache — reads are instant, writes are async
let memoryStore: StoreData | null = null;
let writeScheduled = false;

function loadFromDisk(): StoreData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function scheduleDiskWrite(): void {
  if (writeScheduled) return;
  writeScheduled = true;
  // Batch writes — flush to disk on next tick
  setImmediate(() => {
    writeScheduled = false;
    if (memoryStore) {
      try {
        fs.writeFile(DATA_PATH, JSON.stringify(memoryStore, null, 2), "utf-8", () => {});
      } catch {
        // Ignore write errors
      }
    }
  });
}

export function readStore(): StoreData {
  if (!memoryStore) {
    memoryStore = loadFromDisk();
  }
  return memoryStore;
}

export function writeStore(data: StoreData): void {
  memoryStore = data;
  scheduleDiskWrite();
}

export function updateStore(updater: (data: StoreData) => void): StoreData {
  const data = readStore();
  updater(data);
  writeStore(data);
  return data;
}

export function addAgentLog(agent: string, message: string): void {
  updateStore((data) => {
    data.agentLogs.push({
      agent,
      message,
      timestamp: new Date().toISOString(),
    });
    if (data.agentLogs.length > 200) {
      data.agentLogs = data.agentLogs.slice(-200);
    }
  });
}
