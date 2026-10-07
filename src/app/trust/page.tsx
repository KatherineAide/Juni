import type { Metadata } from "next";
import { TrustView } from "@/components/misc/TrustView";

export const metadata: Metadata = { title: "Trust & Safety" };

export default function Page() {
  return <TrustView />;
}
