declare global {
  interface Window {
    Prism: typeof Prism;
  }
}

class PrismToken {
  type: string;
  content: string;
  alias?: string;
  length: number;
  constructor(type: string, content: string, alias?: string, length?: number) {
    this.type = type;
    this.content = content;
    this.alias = alias;
    this.length = length ?? (typeof content === "string" ? content.length : 0);
  }
}

const Prism = {
  languages: {} as Record<string, unknown>,
  hooks: { all: {} as Record<string, unknown[]>, add() {}, run() {} },
  plugins: {},
  tokenize(text: string) {
    return [text];
  },
  highlight(text: string) {
    return text;
  },
  highlightElement() {},
  Token: PrismToken,
  util: { encode(text: string) { return text; } },
};

if (typeof window !== "undefined") window.Prism = Prism;
if (typeof globalThis !== "undefined") (globalThis as Record<string, unknown>).Prism = Prism;

export default Prism;
