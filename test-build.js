// Tests for the guide builder. No robot, no Word, no network.
// V03
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
  console.error('  cd guides/unit01 && node ../../shared/test-build.js');
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

  // --- A sized image in a table cell is one cell, not two ---------------
  // Obsidian writes ![[thing|155]] for a sized embed, and escapes the `|` as
  // `\|` when that sits inside a table cell -- e.g. ![[thing\|155]] -- so the
  // row's own `|` delimiters aren't confused with it. A naive split on every
  // `|` tears that one cell into two, and the picture never renders.
  console.log('\nA sized image in a table cell is one cell, not two');
  const w8 = scratchUnit();
  const src8 = path.join(w8, 'g.md');
  fs.writeFileSync(src8, guide(
    '| Part | Picture |\n' +
    '| --- | --- |\n' +
    '| Widget | ![[test_pic.png\\|155]] |\n'
  ));
  const r8 = build(w8, src8);
  check('builds', r8.ok, r8.err.trim());
  if (r8.ok) {
    const {text, xml} = await textOf(path.join(w8, 'Test.docx'));
    check('the image embeds instead of printing as text', /r:embed|<a:blip/.test(xml));
    check('no leftover wikilink syntax reaches the page',
          !/\[\[|\]\]|155/.test(text), text.slice(0, 200));
    check('the row is still two cells, not three',
          text.includes('Widget') && !text.includes('WidgetPicture'));
  }

  // --- Print readability: 12pt, 1.5 spacing, ragged right ----------------
  // Guides are printed and read on paper, some of them by dyslexic students.
  // The standard print guidance asks for 12pt or larger, line spacing near
  // 1.5, and left-aligned rather than justified text. All three are cheap and
  // all three are easy to lose in a later edit, which is why they are pinned
  // here rather than left to a default: Word's own default alignment is left,
  // so a justified guide would come from a style someone added, and nothing
  // would fail.
  console.log('\nBody text is 12pt, 1.5-spaced, and left-aligned');
  const w9 = scratchUnit();
  const src9 = path.join(w9, 'g.md');
  fs.writeFileSync(src9, guide(
    'A paragraph long enough to wrap across more than one printed line, so ' +
    'that its alignment and its line spacing are both visible on the page.\n\n' +
    '- A bullet that also wraps, for the same reason as the paragraph above.\n'
  ));
  const r9 = build(w9, src9);
  check('builds', r9.ok, r9.err.trim());
  if (r9.ok) {
    const {xml} = await textOf(path.join(w9, 'Test.docx'));
    check('body runs are 12pt', /<w:sz w:val="24"\/>/.test(xml));
    check('line spacing is 1.5', /w:line="360"/.test(xml));
    check('paragraphs say left, explicitly',
          /<w:jc w:val="left"\/>/.test(xml));
    check('nothing on the page is justified',
          !/w:val="both"|w:val="distribute"/.test(xml));
  }

  // --- $math$ becomes a real Word equation -------------------------------
  // Physics guides carry 209 equations across the year, and every one of them
  // is a fraction, a subscript, a superscript, both scripts at once, or a
  // square root. Flattening those to text loses meaning rather than looks:
  // "a = (v_f - v_i)/Δt" written flat reads "aaverage=∆v∆t", which is not the
  // same equation. So the builder emits Word's own math, which LibreOffice
  // then draws properly in the PDF.
  //
  // The check is on the math XML, not the visible text: <m:f> is a fraction,
  // <m:sSub> a subscript, and so on. Word puts equation characters in <m:t>
  // rather than <w:t>, so textOf's plain text deliberately does not see them.
  console.log('\n$math$ becomes a real Word equation');
  const wM = scratchUnit();
  const srcM = path.join(wM, 'g.md');
  fs.writeFileSync(srcM, guide(
    'Acceleration is $a = \\frac{v_f - v_i}{\\Delta t}$ in every case.\n\n' +
    'Units are $m/s^2$, charge is $q_1^2$, and time is $\\sqrt{\\frac{2d}{a}}$.\n'
  ));
  const rM = build(wM, srcM);
  check('builds', rM.ok, rM.err.trim());
  if (rM.ok) {
    const {text, xml} = await textOf(path.join(wM, 'Test.docx'));
    check('a fraction is a fraction', /<m:f>/.test(xml));
    check('a subscript is a subscript', /<m:sSub>/.test(xml));
    check('a superscript is a superscript', /<m:sSup>/.test(xml));
    check('sub and super together are one object', /<m:sSubSup>/.test(xml));
    check('a root is a root', /<m:rad>/.test(xml));
    check('the surrounding sentence still prints',
          text.includes('Acceleration is') && text.includes('in every case.'));
    check('no LaTeX source reaches the page',
          !/\\frac|\\sqrt|\\Delta|\$/.test(text), text.slice(0, 200));
  }

  // --- A dollar sign is still a dollar sign ------------------------------
  // The one way this feature could damage a guide that never asked for it:
  // two prices in a sentence looking like a pair of math delimiters. Both
  // delimiters must sit against non-space, so "a $20 and $30 item" is money.
  // Engineering and Robotics guides are full of ordinary prose and must not
  // change because Physics wanted equations.
  console.log('\nOrdinary dollar signs are left alone');
  const wD = scratchUnit();
  const srcD = path.join(wD, 'g.md');
  fs.writeFileSync(srcD, guide(
    'The kit costs $20 and the spare costs $30, so budget $50.\n\n' +
    'A lone $ is just a dollar sign.\n\n' +
    'Backticks protect it: `$5 each`.\n\n' +
    'An escaped \\$ prints as one too.\n'
  ));
  const rD = build(wD, srcD);
  check('builds', rD.ok, rD.err.trim());
  if (rD.ok) {
    const {text, xml} = await textOf(path.join(wD, 'Test.docx'));
    check('two prices in a sentence stay text', text.includes('$20 and the spare costs $30'));
    check('a lone dollar sign survives', text.includes('A lone $ is just'));
    check('a dollar in backticks survives', text.includes('$5 each'));
    check('an escaped dollar loses its backslash', text.includes('An escaped $ prints'));
    check('nothing here became an equation', !/<m:oMath/.test(xml));
  }

  // --- Bad math fails the build, loudly ----------------------------------
  // One rule with several faces: anything outside the five supported
  // constructs, and anything malformed, must stop the build and say why. The
  // alternative is a wrong equation printed on a handout, which nobody
  // catches until a student is looking at it.
  console.log('\nUnsupported or malformed math fails the build');
  const bad = [
    ['an unsupported command', '$\\int x$',        /\\int is not supported/],
    ['an unknown command',     '$\\wibble{x}$',    /\\wibble is not supported/],
    ['a missing closing brace','$\\frac{a}{b$',    /missing '}'/],
    ['too few arguments',      '$\\frac{a} + 1$',  /\\frac needs a \{\.\.\.\} argument/],
    ['an empty argument',      '$\\sqrt{}$',       /empty \{\} argument/],
    ['a script with nothing after it', '$x^$',     /with nothing after it/],
    ['two subscripts on one thing',    '$x_a_b$',  /two subscripts/],
    // Legal LaTeX, refused on purpose: Word draws an empty base as nothing,
    // LibreOffice draws a small empty box, and the PDF is what a student
    // holds. Only looking at the PDF caught this.
    ['a script with no base',   'at 9.8 m/s$^2$ here', /Put the whole thing in the math/],
    ['math in a heading',      '## Find $x^2$',    /not supported in a heading/],
  ];
  for (const [name, body, wanted] of bad) {
    const wB = scratchUnit();
    const srcB = path.join(wB, 'g.md');
    fs.writeFileSync(srcB, guide(body));
    const rB = build(wB, srcB);
    check(`${name} fails the build`, !rB.ok);
    check(`${name} says why`, wanted.test(rB.err), rB.err.trim());
    check(`${name} names the file`, /g\.md/.test(rB.err), rB.err.trim());
  }

  // --- Math survives where text already works ----------------------------
  // Equations turn up inside worksheet problems, which are numbered lists and
  // table cells as often as paragraphs.
  console.log('\nMath works in lists and table cells too');
  const wL = scratchUnit();
  const srcL = path.join(wL, 'g.md');
  fs.writeFileSync(srcL, guide(
    '1. Solve for $v_f$ given $a = 2$.\n\n' +
    '| Quantity | Formula |\n' +
    '| --- | --- |\n' +
    '| Speed | $\\frac{d}{t}$ |\n'
  ));
  const rL = build(wL, srcL);
  check('builds', rL.ok, rL.err.trim());
  if (rL.ok) {
    const {text, xml} = await textOf(path.join(wL, 'Test.docx'));
    check('a numbered item can hold an equation', /<m:sSub>/.test(xml));
    check('a table cell can hold an equation', /<m:f>/.test(xml));
    check('no LaTeX source reaches the page', !/\\frac|\$/.test(text), text.slice(0, 200));
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

  // --- build-all.sh only needs Class Development on a -d run -------------
  // It used to resolve deploy.txt before it had even read the arguments, so a
  // machine without Class Development mounted could not build a guide at all.
  // Nothing here converts anything: the PDF is written first and is newer than
  // its sources, so the run reports "up to date" and never reaches LibreOffice.
  console.log('\nbuild-all.sh builds without Class Development mounted');
  const wNoDeploy = scratchUnit();
  fs.writeFileSync(path.join(wNoDeploy, 'z01.md'), guide('Some words.', 'Z.docx'));
  fs.writeFileSync(path.join(wNoDeploy, 'deploy.txt'), 'No Such Folder Anywhere\n');
  fs.writeFileSync(path.join(wNoDeploy, 'Z.pdf'), 'not really a pdf');
  const runAll = args => {
    try {
      const out = execFileSync(path.join(__dirname, 'build-all.sh'), args,
                               {cwd: wNoDeploy, stdio: 'pipe'});
      return {ok: true, out: out.toString()};
    } catch (e) {
      return {ok: false, out: ((e.stderr || '') + (e.stdout || '')).toString()};
    }
  };
  const noDeploy = runAll(['z01.md']);
  check('a plain run succeeds', noDeploy.ok, noDeploy.out.trim());
  check('it did not go looking for Class Development',
        !/Class Development/.test(noDeploy.out), noDeploy.out.trim());
  // The same run must not demand LibreOffice either. It converts nothing --
  // every guide is current -- and this repo's CI runner has node and no
  // LibreOffice, so an up-front tool check turns a green build red. Asserting
  // on the message keeps the reason visible: a passing exit code alone would
  // not say whether the tools were skipped or merely present.
  check('it did not demand LibreOffice for a run that converts nothing',
        !/not on PATH/.test(noDeploy.out), noDeploy.out.trim());

  // The other half of the tool rule: a run that really does have to convert
  // must still refuse, and still name what is missing. Deferring the check
  // must not become skipping it. Simulated by making the guide stale and
  // handing the script a PATH with node but no LibreOffice, which is the CI
  // runner's shape.
  const stalePdf = path.join(wNoDeploy, 'Z.pdf');
  const past = new Date(Date.now() - 60_000);
  fs.utimesSync(stalePdf, past, past);
  const bin = fs.mkdtempSync(path.join(os.tmpdir(), 'guide-bin-'));
  for (const t of ['node', 'dirname', 'grep', 'head', 'sed', 'awk', 'cat',
                   'ls', 'mktemp', 'rm', 'mkdir', 'cp', 'mv', 'basename',
                   'wc', 'sort', 'tr', 'sh', 'bash', 'env']) {
    for (const dir of ['/usr/bin', '/bin', '/usr/local/bin']) {
      if (fs.existsSync(path.join(dir, t))) {
        fs.symlinkSync(path.join(dir, t), path.join(bin, t));
        break;
      }
    }
  }
  let noTools;
  try {
    execFileSync(path.join(__dirname, 'build-all.sh'), ['z01.md'],
                 {cwd: wNoDeploy, stdio: 'pipe', env: {PATH: bin}});
    noTools = {ok: true, out: ''};
  } catch (e) {
    noTools = {ok: false, out: ((e.stderr || '') + (e.stdout || '')).toString()};
  }
  check('a run that must convert still refuses without LibreOffice',
        !noTools.ok, noTools.out.trim());
  check('and it names the tool that is missing',
        /not on PATH:.*soffice/.test(noTools.out), noTools.out.trim());

  // The other half of the same rule: -d still refuses, and still says why.
  fs.writeFileSync(stalePdf, 'not really a pdf');
  const withDeploy = runAll(['-d', 'z01.md']);
  check('a -d run still fails when the folder is missing', !withDeploy.ok);
  check('and the message names the folder deploy.txt asked for',
        /No Such Folder Anywhere/.test(withDeploy.out), withDeploy.out.trim());

  console.log(failures === 0
    ? '\nAll checks passed.'
    : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
