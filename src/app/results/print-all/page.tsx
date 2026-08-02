import BatchResultPrint from "@/components/BatchResultPrint";

export default async function PrintAllPage({ searchParams }: { searchParams: Promise<{ className?: string }> }) {
  const { className = "" } = await searchParams;
  return <BatchResultPrint className={className} />;
}
