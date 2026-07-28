import BatchResultPrint from "@/components/BatchResultPrint";

type Props = {
  searchParams: Promise<{ class?: string }>;
};

export default async function PrintAllResultsPage({ searchParams }: Props) {
  const { class: className = "" } = await searchParams;
  return <BatchResultPrint className={className} />;
}
