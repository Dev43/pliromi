"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ChatWidget = dynamic(() => import("@/components/ChatWidget"), {
  ssr: false,
});

export default function ChatWidgetLoader() {
  const pathname = usePathname();

  // Hide team chat on public store pages (store has its own seller chat)
  if (pathname?.startsWith("/store")) return null;

  return <ChatWidget />;
}
