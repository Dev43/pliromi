import { readStore, updateStore } from "@/lib/db";

export async function GET() {
  const store = readStore();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const xmtpGroupId = (store as any).xmtpGroupId || null;
  return Response.json({ groupId: xmtpGroupId });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { groupId } = body;

  if (!groupId) {
    return Response.json({ error: "groupId is required" }, { status: 400 });
  }

  updateStore((store) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store as any).xmtpGroupId = groupId;
  });

  return Response.json({ success: true, groupId });
}
