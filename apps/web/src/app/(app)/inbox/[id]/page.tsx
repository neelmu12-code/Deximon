import { ConversationClient } from "./ConversationClient";

type Params = { id: string };

export default async function ConversationPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  return <ConversationClient id={id} />;
}
