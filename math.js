// Math for the guide builder. V01
//
// Turns `$ ... $` in a guide's markdown into real Word equations, so a
// fraction prints stacked with a bar rather than flattened to a slash.
//
//   $\frac{v_f - v_i}{\Delta t}$
//
// The syntax is a small slice of LaTeX, chosen for two reasons. Obsidian
// already renders it, so the equation looks right while it is being written
// as well as on the printed page. And it is a notation physics teachers
// already know, so nothing here has to be learned.
//
// Supported, and nothing else:
//
//   \frac{a}{b}     stacked fraction
//   \sqrt{a}        square root
//   x_a  x_{ab}     subscript
//   x^a  x^{ab}     superscript
//   x_a^b           both at once
//   {a b}           grouping
//   \Delta \pi ...  the symbols in SYMBOLS below
//
// Anything else is refused with a message naming the file and the problem.
// That is deliberate. The alternative -- accepting all of LaTeX through a
// full library -- means a guide can ask for something Word cannot draw, and
// the failure then shows up as a wrong equation in a student's hand rather
// than as a build error on Ray's screen.
//
// Why a parser here instead of a LaTeX library: the requirement is to REFUSE
// everything outside five constructs. A library that handles all of LaTeX
// does the opposite, and fencing it back down is more work than parsing five
// things. It would also mean a large new dependency in a repo two other
// courses pin.

const d = require("docx");
const {Math: DocxMath, MathRun, MathFraction, MathRadical,
       MathSubScript, MathSuperScript, MathSubSuperScript} = d;

// Symbols a physics guide actually needs. Kept short on purpose: an unknown
// command must fail loudly, so this list is the contract, and adding to it is
// a deliberate act with a test behind it.
const SYMBOLS = {
  Delta: "Δ", delta: "δ",
  Omega: "Ω", omega: "ω",
  alpha: "α", beta: "β", gamma: "γ",
  theta: "θ", lambda: "λ", mu: "μ",
  pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ",
  times: "×", cdot: "·", div: "÷", pm: "±",
  approx: "≈", neq: "≠", leq: "≤", geq: "≥",
  degree: "°", infty: "∞",
  rightarrow: "→", leftarrow: "←",
};

const COMMANDS = ["frac", "sqrt", ...Object.keys(SYMBOLS)];

function fail(src, msg) {
  const e = new Error(`bad math: ${msg}\n  in: $${src}$`);
  e.mathError = true;
  throw e;
}

// --- parsing ---------------------------------------------------------------
//
// Produces a small tree:
//   {t:"run",    v:"2d"}
//   {t:"frac",   num:[...], den:[...]}
//   {t:"sqrt",   x:[...]}
//   {t:"script", base:[...], sub:[...]|null, sup:[...]|null}

const SPECIAL = "\\{}_^";

function readCommand(st, src) {
  st.i++;                                   // the backslash
  let name = "";
  while (st.i < st.s.length && /[a-zA-Z]/.test(st.s[st.i])) name += st.s[st.i++];
  if (!name) fail(src, "a lone backslash");
  if (!COMMANDS.includes(name)) {
    fail(src, `\\${name} is not supported. Supported: ` +
              COMMANDS.map(c => "\\" + c).join(", "));
  }
  return name;
}

function parseGroup(st, src, what) {
  skipSpace(st);
  if (st.s[st.i] !== "{") {
    fail(src, `${what} needs a {...} argument`);
  }
  st.i++;                                   // the {
  const nodes = parseSeq(st, src, true);
  if (st.s[st.i] !== "}") fail(src, "missing '}'");
  st.i++;                                   // the }
  if (nodes.length === 0) fail(src, `${what} has an empty {} argument`);
  return nodes;
}

function skipSpace(st) {
  while (st.i < st.s.length && st.s[st.i] === " ") st.i++;
}

// The argument of _ or ^: either a braced group, or exactly one thing.
function parseScriptArg(st, src, mark) {
  if (st.i >= st.s.length) fail(src, `'${mark}' with nothing after it`);
  if (st.s[st.i] === "{") return parseGroup(st, src, `'${mark}'`);
  if (st.s[st.i] === "\\") {
    const name = readCommand(st, src);
    if (name === "frac" || name === "sqrt") {
      fail(src, `'${mark}' needs braces around \\${name}: write ${mark}{\\${name}{...}}`);
    }
    return [{t: "run", v: SYMBOLS[name]}];
  }
  const c = st.s[st.i];
  if (SPECIAL.includes(c)) fail(src, `'${mark}' with nothing after it`);
  st.i++;
  return [{t: "run", v: c}];
}

function parseAtom(st, src) {
  const c = st.s[st.i];
  if (c === "\\") {
    const name = readCommand(st, src);
    if (name === "frac") {
      const num = parseGroup(st, src, "\\frac");
      const den = parseGroup(st, src, "\\frac");
      return {t: "frac", num, den};
    }
    if (name === "sqrt") {
      return {t: "sqrt", x: parseGroup(st, src, "\\sqrt")};
    }
    return {t: "run", v: SYMBOLS[name]};
  }
  if (c === "{") {
    st.i++;
    const nodes = parseSeq(st, src, true);
    if (st.s[st.i] !== "}") fail(src, "missing '}'");
    st.i++;
    if (nodes.length === 0) fail(src, "an empty {}");
    return {t: "group", x: nodes};
  }
  // A plain run: everything up to the next thing with meaning.
  let v = "";
  while (st.i < st.s.length && !SPECIAL.includes(st.s[st.i])) v += st.s[st.i++];
  return {t: "run", v};
}

function parseSeq(st, src, inGroup = false) {
  const out = [];
  while (st.i < st.s.length) {
    if (st.s[st.i] === "}") {
      if (inGroup) return out;
      fail(src, "a '}' with no '{' before it");
    }
    // "m/s$^2$" -- a script with no base -- is legal LaTeX and was supported
    // here until the PDF was looked at. Word draws an empty base as nothing;
    // LibreOffice draws a small empty box, and the PDF is what a student is
    // handed. So it is refused, with the fix in the message: put the unit
    // inside the math instead.
    if (st.s[st.i] === "_" || st.s[st.i] === "^") {
      const mark = st.s[st.i];
      fail(src, `'${mark}' with nothing before it. ` +
                `Put the whole thing in the math: write $m/s${mark}2$, ` +
                `not m/s$${mark}2$`);
    }

    let atom = parseAtom(st, src);

    // A script attaches to the last character, not the whole word, which is
    // what LaTeX does and what a reader expects: "vf_x" subscripts the f.
    let pending = null;
    if (atom.t === "run" && (st.s[st.i] === "_" || st.s[st.i] === "^") &&
        atom.v.length > 1) {
      pending = {t: "run", v: atom.v.slice(0, -1)};
      atom = {t: "run", v: atom.v.slice(-1)};
    }

    let sub = null, sup = null;
    while (st.i < st.s.length && (st.s[st.i] === "_" || st.s[st.i] === "^")) {
      const mark = st.s[st.i++];
      if (mark === "_") {
        if (sub) fail(src, "two subscripts on one thing");
        sub = parseScriptArg(st, src, "_");
      } else {
        if (sup) fail(src, "two superscripts on one thing");
        sup = parseScriptArg(st, src, "^");
      }
    }

    if (pending) out.push(pending);
    out.push(sub || sup ? {t: "script", base: [atom], sub, sup} : atom);
  }
  if (inGroup) fail(src, "missing '}'");
  return out;
}

// --- rendering -------------------------------------------------------------

function toDocx(nodes) {
  const out = [];
  for (const n of nodes) {
    if (n.t === "run") {
      if (n.v !== "") out.push(new MathRun(n.v));
    } else if (n.t === "group") {
      out.push(...toDocx(n.x));
    } else if (n.t === "frac") {
      out.push(new MathFraction({numerator: toDocx(n.num),
                                 denominator: toDocx(n.den)}));
    } else if (n.t === "sqrt") {
      out.push(new MathRadical({children: toDocx(n.x)}));
    } else if (n.t === "script") {
      const base = toDocx(n.base);
      if (n.sub && n.sup) {
        out.push(new MathSubSuperScript({children: base,
                                         subScript: toDocx(n.sub),
                                         superScript: toDocx(n.sup)}));
      } else if (n.sub) {
        out.push(new MathSubScript({children: base, subScript: toDocx(n.sub)}));
      } else {
        out.push(new MathSuperScript({children: base,
                                      superScript: toDocx(n.sup)}));
      }
    }
  }
  return out;
}

// The whole job: the text between two $ signs, in; one Word equation, out.
function mathRun(src) {
  const st = {s: src, i: 0};
  const nodes = parseSeq(st, src);
  const kids = toDocx(nodes);
  if (kids.length === 0) fail(src, "the equation is empty");
  return new DocxMath({children: kids});
}

module.exports = {mathRun, SYMBOLS, COMMANDS};
