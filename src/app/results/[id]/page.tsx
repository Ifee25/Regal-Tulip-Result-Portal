import LocalResultDetail from "@/components/LocalResultDetail";

type Props = { params: Promise<{ id: string }> };

export default async function StudentPage({ params }: Props) {
  const { id } = await params;
  return <LocalResultDetail id={id} />;
}
