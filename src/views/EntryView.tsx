import { WordDetail } from "../components/WordDetail";

export function EntryView({ entryId, senseId }: { entryId: string; senseId?: string }) {
  return <WordDetail entryId={entryId} senseId={senseId} />;
}
