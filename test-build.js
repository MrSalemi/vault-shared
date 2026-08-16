// Tests for the guide builder. No robot, no Word, no network.
// V02
//
//   cd guides/unit01 && node ../../shared/test-build.js
//   node test-build.js <folder holding the guides>
//
// Exits non-zero on the first failure, so it can gate a commit.
//
// The builder repo holds no guides, so the tests are pointed at a course's
// guides folder -- the current directory unless one is named. Everything is
// built in a temp folder, so running this never touches a real .docx.

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const JSZip = require('jszip');

const MAKE = path.join(__dirname, 'make.js');
const GUIDES = path.resolve(process.argv[2] || process.cwd());

if (!fs.readdirSync(GUIDES).some(f => /^[a-z]\d+\.md$/.test(f))) {
  console.error(`no guides in ${GUIDES}`);
  console.error('run this from a unit folder, or name one:');
  console.error('  cd guides/unit01 && node ../../builder/test-build.js');
  process.exit(1);
}

let failures = 0;
function check(name, ok, detail) {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
  if (!ok) {
    failures++;
    if (detail) console.log('        ' + detail);
  }
}

// Run make.js with the temp folder as the working directory, so the .docx it
// writes lands there. Pictures and sibling guides resolve against the folder
// the markdown is in, so a synthetic test needs a folder that looks like a unit
// -- see scratchUnit().
function build(work, mdPath) {
  try {
    execFileSync('node', [MAKE, mdPath], {cwd: work, stdio: 'pipe'});
    return {ok: true, err: ''};
  } catch (e) {
    return {ok: false, err: (e.stderr || '').toString() + (e.stdout || '').toString()};
  }
}

// The visible words of a .docx, in order, with no markup.
async function textOf(docxPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(docxPath));
  const xml = await zip.file('word/document.xml').async('string');
  return {
    text: [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(m => m[1]).join(''),
    xml,
  };
}

function scratch() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'guide-test-'));
}

// A scratch folder that looks enough like a unit to exercise the rules that
// depend on one: empty sibling guides, so a bare [[e03]] is recognised as a
// link to a guide, and one real picture to embed. Borrowed from GUIDES rather
// than kept here, because this repo owns no pictures.
function scratchUnit() {
  const w = scratch();
  for (const name of ['e01', 'e02', 'e03']) {
    fs.writeFileSync(path.join(w, name + '.md'), '');
  }
  // Every guides folder must have one; the builder refuses to guess the text.
  fs.writeFileSync(path.join(w, 'course.js'),
                   "module.exports = () => ({});\n");
  const from = path.join(GUIDES, 'images');
  const png = fs.existsSync(from) && fs.readdirSync(from).find(f => f.endsWith('.png'));
  if (png) {
    fs.mkdirSync(path.join(w, 'images'), {recursive: true});
    fs.copyFileSync(path.join(from, png), path.join(w, 'images', 'test_pic.png'));
  }
  return w;
}

function guide(body, out = 'Test.docx') {
  return `---
out: ${out}
version: V01
title: "Test guide"
number: "99"
scaffold: test.py
---

${body}
`;
}

async function main() {
  // --- Every real guide still builds ------------------------------------
  console.log('Every guide builds');
  const work = scratch();
  for (const md of fs.readdirSync(GUIDES).filter(f => /^[a-z]\d+\.md$/.test(f)).sort()) {
    const r = build(work, path.join(GUIDES, md));
    check(md, r.ok, r.err.trim());
  }

  // --- A link prints as its label ---------------------------------------
  console.log('\nLinks print as their label, never as a target');
  const w2 = scratchUnit();
  const src = path.join(w2, 'g.md');
  fs.writeFileSync(src, guide(
    'You built this in [LED Circuit](e01.md) and again in [[e02|LED Circuit with Switch]].\n\n' +
    'The literal syntax `[[e03]]` must survive inside backticks.\n\n' +
    '![[test_pic.png]]'
  ));
  const r2 = build(w2, src);
  check('builds', r2.ok, r2.err.trim());
  if (r2.ok) {
    const {text, xml} = await textOf(path.join(w2, 'Test.docx'));
    check('markdown link shows its label', text.includes('built this in LED Circuit'));
    check('wikilink alias shows its label', text.includes('again in LED Circuit with Switch'));
    check('no link target reaches the page', !/\]\(|\[\[e02/.test(text), text.slice(0, 200));
    check('link syntax inside backticks is left alone', text.includes('[[e03]]'));
    check("an Obsidian image embed resolves to the guide's images/", /r:embed|<a:blip/.test(xml));
  }

  // --- A missing course.js is refused, not guessed -----------------------
  console.log('\nA guides folder with no course.js is refused');
  const bare = scratch();
  const bareSrc = path.join(bare, 'g.md');
  fs.writeFileSync(bareSrc, guide('Nothing special.'));
  const rb0 = build(bare, bareSrc);
  check('build fails', !rb0.ok);
  check('the message names course.js', /course\.js/.test(rb0.err), rb0.err.trim());

  // --- A bare link prints its target ------------------------------------
  console.log('\nA bare link prints its target, which is usually what you want');
  const w5 = scratchUnit();
  const src5 = path.join(w5, 'g.md');
  fs.writeFileSync(src5, guide('You will find what you need in [[robot_setup]].'));
  const r5 = build(w5, src5);
  check('builds', r5.ok, r5.err.trim());
  if (r5.ok) {
    const {text} = await textOf(path.join(w5, 'Test.docx'));
    check('the name prints as typed', text.includes('what you need in robot_setup.'));
    check('no brackets reach the page', !text.includes('[['), text.slice(0, 200));
  }

  // --- ...except a bare link to another guide ---------------------------
  console.log('\nA bare link to another guide is refused: "p03" means nothing to a student');
  const w3 = scratchUnit();
  const src3 = path.join(w3, 'g.md');
  fs.writeFileSync(src3, guide('You built this in [[e03]] last week.'));
  const r3 = build(w3, src3);
  check('build fails', !r3.ok);
  check('the message names the fix', /\[\[e03\|/.test(r3.err), r3.err.trim());

  // --- Frontmatter links are not guide-body links -----------------------
  console.log('\nBare links in frontmatter are fine, and change nothing');
  const w4 = scratchUnit();
  const plain = path.join(w4, 'plain.md');
  const withFm = path.join(w4, 'withfm.md');
  fs.writeFileSync(plain, guide('A plain paragraph.', 'A.docx'));
  fs.writeFileSync(withFm, guide('A plain paragraph.', 'B.docx')
    .replace('scaffold: test.py', 'scaffold: test.py\ntags:\n  - demo\nrelated:\n  - "[[e03]]"'));
  const ra = build(w4, plain), rb = build(w4, withFm);
  check('both build', ra.ok && rb.ok, (ra.err + rb.err).trim());
  if (ra.ok && rb.ok) {
    const a = await textOf(path.join(w4, 'A.docx'));
    const b = await textOf(path.join(w4, 'B.docx'));
    check('properties do not change the page', a.text === b.text);
  }

  // --- The same markdown always gives the same document -----------------
  // The file will not be byte-identical -- docProps carries a clock -- but
  // every part a reader ever sees must be.
  console.log('\nBuilding twice gives the same document');
  const w6 = scratch(), w7 = scratch();
  const one = fs.readdirSync(GUIDES).filter(f => /^[a-z]\d+\.md$/.test(f)).sort()[0];
  const ra2 = build(w6, path.join(GUIDES, one));
  const rb2 = build(w7, path.join(GUIDES, one));
  check('both build', ra2.ok && rb2.ok, (ra2.err + rb2.err).trim());
  if (ra2.ok && rb2.ok) {
    const name = fs.readdirSync(w6).find(f => f.endsWith('.docx'));
    const za = await JSZip.loadAsync(fs.readFileSync(path.join(w6, name)));
    const zb = await JSZip.loadAsync(fs.readFileSync(path.join(w7, name)));
    const differ = [];
    for (const key of Object.keys(za.files)) {
      if (za.files[key].dir || key === 'docProps/core.xml') continue;
      const a = await za.files[key].async('base64');
      const b = await zb.files[key].async('base64');
      if (a !== b) differ.push(key);
    }
    check('every part but the clock is identical', differ.length === 0, differ.join(', '));
  }

  console.log(failures === 0
    ? '\nAll checks passed.'
    : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
