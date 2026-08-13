// Markdown -> block list for build.js.
// V03
//
// Supported:
//   ---            frontmatter (out, version, title)
//   #  Heading     Part heading      -> h1
//   ## Heading     Section heading   -> h2
//   > text         grey italic note  -> note
//   **text**       (whole paragraph) -> bold lead line
//   - item         bullet list       -> b
//   1. item        numbered list     -> n
//   ```            fenced code block -> code
//   ![alt](file)   image, own line   -> image
//   ![[file]]      image, own line   -> image  (Obsidian's embed)
//   | a | b |      table             -> table
//   text           paragraph         -> p
//
// Placeholders {{SAVE}}, {{PARTA}}, {{GRADING}} are substituted before parsing.
// Inline `backticks` and links are left alone; build.js turns backticks into
// monospace runs and reduces each link to its label.

function frontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return [{}, src];
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return [meta, src.slice(m[0].length)];
}

function parse(src, vars = {}) {
  for (const [k, v] of Object.entries(vars)) {
    src = src.split("{{" + k + "}}").join(v);
  }
  const [meta, body] = frontmatter(src);
  const lines = body.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  const flushList = (marker, kind) => {
    const items = [];
    while (i < lines.length && marker.test(lines[i])) {
      items.push(lines[i].replace(marker, "").trim());
      i++;
    }
    blocks.push([kind, items]);
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.startsWith("```")) {              // fenced code
      i++;
      const buf = [];
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;                                      // skip closing fence
      blocks.push(["code", buf.join("\n")]);
      continue;
    }
    if (/^##\s+/.test(line)) { blocks.push(["h2", line.replace(/^##\s+/, "").trim()]); i++; continue; }
    if (/^#\s+/.test(line))  { blocks.push(["h1", line.replace(/^#\s+/, "").trim()]);  i++; continue; }
    if (/^>\s?/.test(line))  { blocks.push(["note", line.replace(/^>\s?/, "").trim()]); i++; continue; }
    if (/^-\s+/.test(line))  { flushList(/^-\s+/, "b"); continue; }
    if (/^\d+\.\s+/.test(line)) { flushList(/^\d+\.\s+/, "n"); continue; }

    // An image on a line of its own: ![alt text](images/thing.png)
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (img) { blocks.push(["image", {alt: img[1], src: img[2]}]); i++; continue; }

    // The same thing as Obsidian writes it when you drag a picture in:
    // ![[thing.png]], or ![[thing.png|caption]]. build.js resolves the bare
    // name against images/.
    const wimg = line.trim().match(/^!\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]$/);
    if (wimg) { blocks.push(["image", {alt: wimg[2] || "", src: wimg[1]}]); i++; continue; }

    // A table: a row of cells, a separator row, then the body. This is the
    // shape Obsidian writes and the shape the Google Docs importer produces.
    //
    //   | Part                | Picture         |
    //   | ------------------- | --------------- |
    //   | Arduino UNO         | ![[e01_05.png]] |
    //   | 1000Ω (1k) Resistor |                 |
    //
    // A cell may be empty -- the resistor row is deliberately missing its
    // picture -- and a cell holding nothing but an image embed becomes a
    // picture, sized to the column. The separator row sets alignment per
    // column: ---, :---, ---:, or :---:.
    //
    // The row before the separator is the header, as markdown says. A table
    // whose first row is really data needs a header written for it; the
    // importer leaves them without one because markdown has nowhere else to
    // put a first row.
    if (line.trim().startsWith("|") && i + 1 < lines.length &&
        /^\|?[\s:|-]*-[\s:|-]*\|?$/.test(lines[i + 1].trim()) &&
        lines[i + 1].includes("-")) {
      const cut = s => s.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(c => c.trim());
      const head = cut(line);
      const align = cut(lines[i + 1]).map(spec =>
        /^:-+:$/.test(spec) ? "center" : /-+:$/.test(spec) ? "right" : "left");
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { body.push(cut(lines[i])); i++; }
      blocks.push(["table", {head, align, body}]);
      continue;
    }

    // A paragraph that is entirely bold is the lead line.
    const bold = line.trim().match(/^\*\*(.+)\*\*$/);
    if (bold) { blocks.push(["lead", bold[1]]); i++; continue; }

    blocks.push(["p", line.trim()]);
    i++;
  }

  if (meta.title) blocks.unshift(["title", meta.title]);
  return [meta, blocks];
}

module.exports = {parse};
