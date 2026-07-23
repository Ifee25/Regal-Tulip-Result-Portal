import LocalResultDetail from "@/components/LocalResultDetail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function StudentPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { edit } = await searchParams;
  return <LocalResultDetail id={id} startInEditMode={edit === "1"} />;
}
