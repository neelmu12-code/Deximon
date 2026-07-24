import { ReviewClient } from "./ReviewClient";

type Params = { listingId: string };

export default async function ReviewPage({ params }: { params: Promise<Params> }) {
  const { listingId } = await params;

  return <ReviewClient listingId={listingId} />;
}
