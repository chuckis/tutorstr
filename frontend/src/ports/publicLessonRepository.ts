export type RawNostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export interface PublicLessonRepository {
  subscribeAll(
    onEvent: (event: RawNostrEvent) => void,
    options?: { limit?: number }
  ): () => void;
}
