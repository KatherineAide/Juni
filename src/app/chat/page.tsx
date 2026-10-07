import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatDeepLinks, ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: "Talk to Juni" };

export default function ChatPage() {
  return (
    <>
      <ChatView />
      <Suspense fallback={null}>
        <ChatDeepLinks />
      </Suspense>
    </>
  );
}
