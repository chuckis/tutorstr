export type MuteListEvent = {
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
};

export interface MuteListRepository {
  subscribe(
    pubkey: string,
    onEvent: (event: MuteListEvent) => void,
  ): () => void;

  subscribeAll(
    onEvent: (event: MuteListEvent) => void,
  ): () => void;

  publish(pubkey: string, mutedPubkeys: string[]): Promise<string>;
}
