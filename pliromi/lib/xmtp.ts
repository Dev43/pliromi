// XMTP helper utilities for both browser and server-side usage
// Browser: uses window.ethereum signer
// Server/Agent: uses private key signer

export const XMTP_ENV = "dev" as const; // Use dev network for hackathon

// Group chat metadata
export const GROUP_NAME = "Pliromi Team";
export const GROUP_DESCRIPTION = "Organization group chat for agents and team members";

// Store group ID in localStorage (browser) or file (server)
export const XMTP_GROUP_KEY = "pliromi_xmtp_group_id";
