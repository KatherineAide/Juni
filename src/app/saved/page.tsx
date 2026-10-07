import type { Metadata } from "next";
import { SavedView } from "@/components/misc/SavedView";

export const metadata: Metadata = { title: "Saved" };

export default function Page() {
  return <SavedView />;
}
