// How ==highlight== pairs up. Both places that read it - the note page (remarkHighlight.ts)
// and the visual editor (richEditor/markdownToTiptap.ts) - walk the text of one paragraph the
// same way and ask this for the role of every "==" they meet, so they always agree.
//
// A highlight holds ordinary Markdown, so it can start in one piece of text and end in
// another: ==a **b** c== is one highlight around three pieces.

export type EqualsRole = "open" | "close" | "literal";

export const EQUALS_TOKEN = "==";

// `texts` are the text values of one paragraph (or heading, table cell) in reading order.
// Returns, for every text, the role of each "==" in it. Pairs are made left to right; a "==" with
// no partner, and an empty pair ("===="), stay as the literal characters.
export function equalsRoles(texts: string[]): EqualsRole[][] {
  const roles = texts.map((text) => new Array<EqualsRole>(text.split(EQUALS_TOKEN).length - 1).fill("literal"));
  const tokens: { text: number; token: number; end: number }[] = [];
  texts.forEach((text, textIndex) => {
    let from = 0;
    for (let token = 0; token < roles[textIndex].length; token++) {
      const at = text.indexOf(EQUALS_TOKEN, from);
      tokens.push({ text: textIndex, token, end: at + EQUALS_TOKEN.length });
      from = at + EQUALS_TOKEN.length;
    }
  });

  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const first = tokens[i];
    const second = tokens[i + 1];
    const empty = first.text === second.text && texts[first.text].slice(first.end, second.end - EQUALS_TOKEN.length) === "";
    if (empty) continue;
    roles[first.text][first.token] = "open";
    roles[second.text][second.token] = "close";
  }
  return roles;
}

// The text nodes of an inline container in reading order. Both readers visit nodes in exactly
// this order, descending into every node that has children (bold, italic, links, wrappers).
export function collectTexts(nodes: any[], into: any[] = []): any[] {
  for (const node of nodes) {
    if (node.type === "text") into.push(node);
    else if (Array.isArray(node.children)) collectTexts(node.children, into);
  }
  return into;
}
