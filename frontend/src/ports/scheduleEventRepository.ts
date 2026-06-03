export type RawNostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

export interface ScheduleEventRepository {
  subscribe(
    pubkey: string,
    onEvent: (event: RawNostrEvent) => void
  ): () => void;
  subscribeAll(
    onEvent: (event: RawNostrEvent) => void,
    options?: { limit?: number }
  ): () => void;
  publish(pubkey: string, content: string, tags: string[][]): Promise<string>;
}
