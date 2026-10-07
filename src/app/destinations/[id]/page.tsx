import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DestinationDetail } from "@/components/destinations/DestinationDetail";
import { destinations, getDestination } from "@/data/destinations";

export function generateStaticParams() {
  return destinations.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/destinations/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: getDestination(id)?.name ?? "Destination" };
}

export default async function DestinationPage({ params }: PageProps<"/destinations/[id]">) {
  const { id } = await params;
  const destination = getDestination(id);
  if (!destination) notFound();
  return <DestinationDetail destination={destination} />;
}
