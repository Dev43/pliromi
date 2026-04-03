import { updateStore } from "@/lib/db";
import { revokeTeamApiKey, removePolicy } from "@/lib/wallet";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let removed = false;
  updateStore((store) => {
    const idx = store.team.findIndex((m) => m.id === id);
    if (idx !== -1) {
      const member = store.team[idx];
      // Revoke API key and policy
      try {
        if (member.apiKeyId) revokeTeamApiKey(member.apiKeyId);
        if (member.policyId) removePolicy(member.policyId);
      } catch (e) {
        console.error("Cleanup error:", e);
      }
      store.team.splice(idx, 1);
      removed = true;
    }
  });

  if (!removed) {
    return Response.json({ error: "Team member not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  let found = false;
  updateStore((store) => {
    const member = store.team.find((m) => m.id === id);
    if (member) {
      if (body.role) member.role = body.role;
      if (body.name) member.name = body.name;
      if (body.policy) member.policy = body.policy;
      found = true;
    }
  });

  if (!found) {
    return Response.json({ error: "Team member not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
