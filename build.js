// Guide generator V04.
// Inline markup in any text: `code`, **bold**, *italic*, and links, which print
// as their label only.
const d = require('docx');
const fs = require('fs');
const path = require('path');
const {Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
       TableCell, WidthType, ShadingType, LevelFormat, AlignmentType,
       Footer, PageNumber, BorderStyle, PageBreak, ImageRun, VerticalAlign} = d;

const CODE_BORDER = "9A9A9A";
const PAGE_W = 9360;

// The monospace face used for code blocks and inline backticks. Guides are read
// and printed through Google Drive, so this must be a font Drive's viewer has.
// Override for a one-off test with CODE_FONT="Courier New" ./build-all.sh ...
const CODE_FONT = process.env.CODE_FONT || "Roboto Mono";

// A rebuild of unchanged markdown produces an identical document, but not an
// identical FILE: Word's docProps carries a creation time, and the zip stamps
// each entry with the clock. So `git status` shows a rebuilt guide as modified
// even when not a word moved. That is why build-all.sh skips guides that are
// already current -- it is cheaper and it keeps the diff honest. Rewriting the
// package to strip the clock was considered and rejected: the .docx is what a
// student is handed, and it is not worth reaching into for a tidier diff.

// Inline markup, matched in one pass so order is preserved:
//   `code` -> monospace   **bold** -> bold   *italic* -> italic
//   [label](target) and [[target|label]] -> the label, as ordinary text
// "Use `x` **now**" -> [normal "Use ", mono "x", normal " ", bold "now"]
// Code spans are matched first, so asterisks and brackets inside backticks stay
// literal.
//
// A link prints as its label and nothing else. Guides are read on paper, where
// a clickable target is worthless and a filename is noise. So the vault can be
// fully linked and the handout still reads as plain English.
//
// A bare [[target]] prints the target, which is right whenever the name is the
// thing the student needs: "you will find it in [[robot_setup]]". The one case
// it is wrong is a link to another guide, [[p07]], because "p07" is a name no
// student has ever seen -- and that is the one Obsidian's autocomplete offers.
// make.js refuses that link, and only that link.
//
// `base` supplies the paragraph's own styling (a lead line is bold, a note is
// grey italic); the inline flag is applied after it so it always wins.
const INLINE = /`([^`]+)`|(?<!!)\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

function runs(text, base = {}) {
  const out = [];
  const plain = (s) => {
    if (s) out.push(new TextRun({text: s, size: 22, ...base}));
  };

  INLINE.lastIndex = 0;
  let last = 0;
  let m;
  while ((m = INLINE.exec(text)) !== null) {
    plain(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(new TextRun({text: m[1], size: 19, ...base, font: CODE_FONT}));
    } else if (m[2] !== undefined) {
      plain(m[3] ?? m[2]);                // [[target|label]] -> label, [[target]] -> target
    } else if (m[4] !== undefined) {
      plain(m[4]);                        // [label](target)  -> label
    } else if (m[6] !== undefined) {
      out.push(new TextRun({text: m[6], size: 22, ...base, bold: true}));
    } else {
      out.push(new TextRun({text: m[7], size: 22, ...base, italics: true}));
    }
    last = INLINE.lastIndex;
  }
  plain(text.slice(last));
  return out;
}

function para(text, o = {}) {
  return new Paragraph({children: runs(text, o.base || {}),
                        spacing: {after: o.after ?? 120, line: 276}});
}
function bulletP(text) {
  return new Paragraph({children: runs(text),
                        numbering: {reference: "gb", level: 0},
                        spacing: {after: 80, line: 276}});
}
function numP(text) {
  return new Paragraph({children: runs(text),
                        numbering: {reference: "gn", level: 0},
                        spacing: {after: 80, line: 276}});
}
function codeBlock(src) {
  const lines = src.split("\n").map(l => new Paragraph({
    children: [new TextRun({text: l === "" ? " " : l, font: CODE_FONT, size: 19})],
    spacing: {after: 0, line: 240},
  }));
  return new Table({
    columnWidths: [PAGE_W],
    width: {size: PAGE_W, type: WidthType.DXA},
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        width: {size: PAGE_W, type: WidthType.DXA},
        borders: {
          top:    {style: BorderStyle.SINGLE, size: 4, color: CODE_BORDER},
          bottom: {style: BorderStyle.SINGLE, size: 4, color: CODE_BORDER},
          left:   {style: BorderStyle.SINGLE, size: 4, color: CODE_BORDER},
          right:  {style: BorderStyle.SINGLE, size: 4, color: CODE_BORDER},
        },
        margins: {top: 120, bottom: 120, left: 180, right: 180},
        children: lines,
      })],
    })],
  });
}

// Pictures are placed by markdown: ![alt](images/thing.png), on its own line.
// The file is read relative to this folder. Width and height are both capped
// and the picture keeps its proportions, so nothing is ever squashed.
const TEXT_COLUMN_PX = 624;          // 6.5in of usable width at 96 dpi
// A picture is also capped in height. Without this a tall screenshot renders
// several inches high, and one of them owns a whole sheet. 4.5in leaves room for
// the text that explains it, and lets two pictures share a page.
const TEXT_ROW_PX = 432;             // 4.5in at 96 dpi

function pngSize(buf) {
  // PNG: 8-byte signature, then the IHDR chunk with width and height.
  if (buf.length > 24 && buf.readUInt32BE(12) === 0x49484452) {
    return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
  }
  return null;
}

function imageBlock(spec, contentDir, o = {}) {
  const capW = o.maxWidth || TEXT_COLUMN_PX;
  const capH = o.maxHeight || TEXT_ROW_PX;
  // Obsidian's ![[thing.png]] carries a bare filename, because the vault finds
  // pictures by name. The builder needs a path, so a bare name falls back to
  // images/ -- which is where every guide picture lives anyway.
  //
  // Resolved against the guide's own folder, NEVER against __dirname. The
  // builder is on its way to being a submodule shared with nhsrobotics, and a
  // shared builder does not have anybody's pictures inside it.
  const tried = [spec.src, path.join("images", path.basename(spec.src))];
  const file = tried.map(p => path.resolve(contentDir, p)).find(fs.existsSync);
  if (!file) {
    throw new Error("image not found: " + spec.src + "\n  looked in " +
                    tried.map(p => path.resolve(contentDir, p)).join("\n  and   "));
  }
  const data = fs.readFileSync(file);
  const size = pngSize(data);
  if (!size) {
    throw new Error("not a readable PNG: " + spec.src);
  }
  const scale = Math.min(1, capW / size.width, capH / size.height);
  return new Paragraph({
    alignment: o.align || AlignmentType.CENTER,
    ...(o.keepNext === false ? {} : {keepNext: true}),
    spacing: {before: 80, after: 160},
    children: [new ImageRun({
      data: data,
      type: "png",
      altText: spec.alt ? {name: spec.alt, description: spec.alt, title: spec.alt}
                        : undefined,
      transformation: {
        width: Math.round(size.width * scale),
        height: Math.round(size.height * scale),
      },
    })],
  });
}

// A table. Columns share the text width evenly, because the tables in these
// guides are parts lists -- a name and a picture -- and nothing has asked for
// more control than that yet.
//
// A cell holding nothing but a picture becomes that picture, scaled to fit its
// column. A cell may also be empty: the resistor row in a parts table has no
// picture on purpose, and an empty cell has to stay empty rather than collapse.
const TABLE_BORDER = "808080";

function tableBlock(spec, contentDir) {
  const cols = Math.max(spec.head.length, ...spec.body.map(r => r.length));
  const width = Math.floor(PAGE_W / cols);
  const widths = Array(cols).fill(width);
  widths[cols - 1] += PAGE_W - width * cols;        // absorb the rounding

  const line = {style: BorderStyle.SINGLE, size: 4, color: TABLE_BORDER};
  const ALIGN = {left: AlignmentType.LEFT, right: AlignmentType.RIGHT,
                 center: AlignmentType.CENTER};

  const cellOf = (text, at, o = {}) => {
    const align = ALIGN[spec.align[at] || "left"] || AlignmentType.LEFT;
    // The picture gets the column minus the cell's own margins. 15 dxa to the
    // pixel at 96 dpi, which is the unit ImageRun wants. Height is capped much
    // harder than width: a parts list wants a thumbnail you can match against
    // a bin, and letting a portrait photo run the full column width makes a
    // three-inch-tall row that pushes the table onto another sheet.
    const room = Math.floor((widths[at] - 220) / 15);
    const tall = 150;                                 // 1.56in
    const embed = text.match(/^!\[\[([^\]|]+?)(?:\|[^\]]*)?\]\]$/) ||
                  text.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    let children;
    if (embed) {
      children = [imageBlock({alt: "", src: embed[1]}, contentDir,
                             {keepNext: false, maxWidth: room, maxHeight: tall,
                              align})];
    } else if (!text) {
      children = [new Paragraph({children: [], spacing: {before: 20, after: 20}})];
    } else {
      children = [new Paragraph({
        alignment: align,
        spacing: {before: 20, after: 20},
        children: runs(text, o.bold ? {bold: true} : {}),
      })];
    }
    return new TableCell({
      width: {size: widths[at], type: WidthType.DXA},
      verticalAlign: VerticalAlign.CENTER,
      margins: {top: 60, bottom: 60, left: 110, right: 110},
      borders: {top: line, bottom: line, left: line, right: line},
      ...(o.bold ? {shading: {type: ShadingType.CLEAR, fill: "EFEFEF"}} : {}),
      children,
    });
  };

  const pad = row => row.concat(Array(cols - row.length).fill(""));
  const rows = [new TableRow({
    tableHeader: true,
    children: pad(spec.head).map((c, at) => cellOf(c, at, {bold: true})),
  })];
  for (const row of spec.body) {
    rows.push(new TableRow({children: pad(row).map((c, at) => cellOf(c, at))}));
  }

  return new Table({
    columnWidths: widths,
    width: {size: PAGE_W, type: WidthType.DXA},
    borders: {top: line, bottom: line, left: line, right: line,
              insideHorizontal: line, insideVertical: line},
    rows,
  });
}

// keepNext glues a paragraph to the one after it. A picture carries it so it is
// not stranded at the bottom of a page away from the text that explains it --
// EXCEPT when the next block is another picture, or a heading.
//
// Another picture: chaining a run of pictures makes one unbreakable block, and a
// block taller than a page shunts the whole run to the next sheet and leaves the
// current one empty.
//
// A heading: same failure, reached the long way round. A heading always keeps
// with what follows it, so picture -> heading -> picture -> heading -> picture
// is one unbreakable chain however many steps long, and a guide written as
// "## Step n" with a screenshot under each -- which is every guide here -- is
// exactly that shape. A heading opens a new section anyway, so the picture above
// it belongs to the text it illustrates, not to the heading underneath.
function render(blocks, contentDir) {
  const out = [];
  for (let at = 0; at < blocks.length; at++) {
    const [kind, payload] = blocks[at];
    const next = at + 1 < blocks.length ? blocks[at + 1][0] : null;
    const nextIsImage = next === "image";
    const nextStartsSection = next === "h1" || next === "h2" || next === "title";
    if (kind === "title") {
      out.push(new Paragraph({text: payload, heading: HeadingLevel.TITLE,
                              keepNext: true, spacing: {after: 120}}));
    } else if (kind === "h1") {
      out.push(new Paragraph({text: payload, heading: HeadingLevel.HEADING_1,
                              keepNext: true, spacing: {before: 340, after: 160}}));
    } else if (kind === "h2") {
      out.push(new Paragraph({text: payload, heading: HeadingLevel.HEADING_2,
                              keepNext: true, spacing: {before: 260, after: 120}}));
    } else if (kind === "lead") {
      out.push(new Paragraph({children: runs(payload, {bold: true}),
                              spacing: {after: 180, line: 276}}));
    } else if (kind === "note") {
      out.push(new Paragraph({children: runs(payload, {italics: true, color: "595959"}),
                              spacing: {after: 180, line: 276}}));
    } else if (kind === "p") {
      out.push(para(payload));
    } else if (kind === "b") {
      payload.forEach(t => out.push(bulletP(t)));
      out.push(new Paragraph({children: [], spacing: {after: 60}}));
    } else if (kind === "n") {
      payload.forEach(t => out.push(numP(t)));
      out.push(new Paragraph({children: [], spacing: {after: 60}}));
    } else if (kind === "image") {
      out.push(imageBlock(payload, contentDir,
                          {keepNext: !(nextIsImage || nextStartsSection)}));
    } else if (kind === "table") {
      out.push(tableBlock(payload, contentDir));
      // Same reason as the code block below: Word butts the next text straight
      // against a table.
      out.push(new Paragraph({children: [new TextRun({text: "", size: 8})],
                              spacing: {after: 60, line: 120}}));
    } else if (kind === "code") {
      out.push(codeBlock(payload));
      // Word butts text straight against a table, so a spacer is needed. Keep
      // it short: a full-height empty paragraph reads as two blank lines and
      // costs real pages across fourteen printed guides.
      out.push(new Paragraph({children: [new TextRun({text: "", size: 8})],
                              spacing: {after: 60, line: 120}}));
    }
  }
  return out;
}

// The version is not printed in the body. It rides in the footer of every page,
// so a trailing stamp is a duplicate -- and a lone paragraph at the end of a
// full page pushes the guide onto a whole extra sheet.

function makeFooter(label) {
  const half = PAGE_W / 2;
  const none = {style: BorderStyle.NONE, size: 0, color: "FFFFFF"};
  const cellOf = (kids, align) => new TableCell({
    width: {size: half, type: WidthType.DXA},
    borders: {top: none, bottom: none, left: none, right: none},
    margins: {top: 0, bottom: 0, left: 0, right: 0},
    children: [new Paragraph({children: kids, alignment: align,
                              spacing: {after: 0}})],
  });
  return new Footer({children: [new Table({
    columnWidths: [half, half],
    width: {size: PAGE_W, type: WidthType.DXA},
    borders: {top: none, bottom: none, left: none, right: none,
              insideHorizontal: none, insideVertical: none},
    rows: [new TableRow({children: [
      cellOf([new TextRun({text: label, size: 17, color: "595959"})],
             AlignmentType.LEFT),
      cellOf([new TextRun({text: "Page ", size: 17, color: "595959"}),
              new TextRun({children: [PageNumber.CURRENT], size: 17, color: "595959"}),
              new TextRun({text: " of ", size: 17, color: "595959"}),
              new TextRun({children: [PageNumber.TOTAL_PAGES], size: 17, color: "595959"})],
             AlignmentType.RIGHT),
    ]})],
  })]});
}

// contentDir is the folder the guide's markdown lives in, and it is where its
// pictures are looked up. It is passed in rather than inferred, because the
// builder must not assume it sits beside the guides -- see imageBlock.
async function build(outPath, ver, blocks, contentDir) {
  if (!contentDir) {
    throw new Error("build() needs the guide's folder to find its pictures");
  }
  const titleBlock = blocks.find(b => b[0] === "title");
  const label = titleBlock ? titleBlock[1] : "";
  // Duplex printing: pad to an even page count so the next guide starts clean.
  const pad = process.env.PAD_EVEN === "1"
    ? [new Paragraph({children: [new PageBreak()]}),
       new Paragraph({children: [new TextRun({
         text: "This page left blank.", size: 18, italics: true, color: "A6A6A6"})]})]
    : [];
  const doc = new Document({
    styles: {default: {
      document: {run: {font: "Calibri", size: 22}},
      title: {run: {font: "Calibri", size: 36, bold: true, color: "000000"}},
      heading1: {run: {font: "Calibri", size: 30, bold: true, color: "000000"}},
      heading2: {run: {font: "Calibri", size: 25, bold: true, color: "000000"}},
    }},
    numbering: {config: [
      {reference: "gb", levels: [{level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT,
        style: {paragraph: {indent: {left: 460, hanging: 260}}}}]},
      {reference: "gn", levels: [{level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: {paragraph: {indent: {left: 460, hanging: 260}}}}]},
    ]},
    sections: [{
      properties: {page: {size: {width: 12240, height: 15840},
                          margin: {top: 1440, bottom: 1440, left: 1440, right: 1440}}},
      footers: {default: makeFooter(label + "  ·  " + ver)},
      children: [...render(blocks, contentDir), ...pad],
    }],
  });
  fs.writeFileSync(outPath, await Packer.toBuffer(doc));
  console.log("wrote", outPath, ver);
}

// Shared text, same in every guide.
const SIMREAL =
  "Every lab has two halves. Build the circuit in the Tinkercad simulator first and " +
  "get it working there, then build the same circuit for real on your bench. Show " +
  "both. The simulator is where mistakes are cheap.";

// Electronics has NO FLEX. A lab is 20 points on time, 18 if it is late or if
// it came back for a redo, and there is nothing to earn beyond finishing it.
// Robotics is the course where going further scores -- there a flex is 20 and
// all the work without one is 19. The three electronics guides that used to
// offer a flex (00's Morse code, 04's light show, 06's LED layout) now simply
// require the thing, because a reward the grade does not pay is one a student
// notices.
//
// A redo is NOT a zero. It comes back until it is right and then scores 18, the
// same as late, so the only way to score nothing is never to finish. Every
// guide prints this, from {{GRADING}}.
const GRADING =
  "This lab is worth 20 points. Show both halves, the simulation and the real " +
  "circuit, to get it checked off. A lab handed in after its due date is worth " +
  "18. A lab that is not working yet comes back to you as a redo, as many times " +
  "as it takes, and is worth 18 once it is right. The only way to score zero is " +
  "not to finish it.";

module.exports = {build, SIMREAL, GRADING};
