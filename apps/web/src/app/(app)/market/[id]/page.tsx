import { ListingDetailClient } from "./ListingDetailClient";

type Params = { id: string };

export default async function ListingDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  return <ListingDetailClient id={id} />;
}
