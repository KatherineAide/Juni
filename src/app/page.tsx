import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatDeepLinks, ChatView } from "@/components/chat/ChatView";

export const metadata: Metadata = { title: { absolute: "Juni — learn something new, somewhere new" } };

// The home page is the Juni chat (rendered directly so static hosting needs no redirect).
export default function Home() {
  return (
    <>
      <ChatView />
      <Suspense fallback={null}>
        <ChatDeepLinks />
      </Suspense>
    </>
  );
}
