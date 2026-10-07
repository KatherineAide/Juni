import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetail } from "@/components/programs/ProgramDetail";
import { getProgram, programs } from "@/data/programs";

export function generateStaticParams() {
  return programs.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/programs/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = getProgram(id);
  return { title: p?.title.en ?? "Program" };
}

export default async function ProgramPage({ params }: PageProps<"/programs/[id]">) {
  const { id } = await params;
  const program = getProgram(id);
  if (!program) notFound();
  return <ProgramDetail program={program} />;
}
