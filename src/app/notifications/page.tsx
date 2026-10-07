import type { Metadata } from "next";
import { NotificationsView } from "@/components/misc/NotificationsView";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsView />;
}
