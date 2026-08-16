// Pack a docx-js Document straight to a PDF, the way a guide is made.
//
//   const {writePdf} = require('../../shared/topdf');
//   writePdf(doc, "Some Sheet.pdf");
//
// The .docx is an intermediate: it is written to a temp folder, converted by
// LibreOffice, and thrown away. Nothing an editor can open is left behind, so a
// typo fixed by hand cannot survive the next build -- the same rule the guides
// follow. This lives in the builder rather than in each course's script because
// two copies of it in two repos is exactly the drift that made the builder
// shared in the first place.

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

// The macOS installer does not put soffice on PATH. build-all.sh adds it for
// anything it runs, but a script run by hand needs the same courtesy.
function soffice() {
  const mac = "/Applications/LibreOffice.app/Contents/MacOS/soffice";
  try {
    execFileSync("command", ["-v", "soffice"], {stdio: "ignore", shell: true});
    return "soffice";
  } catch (e) {
    if (fs.existsSync(mac)) return mac;
    console.error("LibreOffice (soffice) is not on PATH, and a PDF needs it.");
    console.error("  brew install --cask libreoffice");
    process.exit(1);
  }
}

async function writePdf(doc, outPdf, Packer) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "sheet-"));
  try {
    const base = path.basename(outPdf).replace(/\.pdf$/i, "");
    const docx = path.join(work, base + ".docx");
    fs.writeFileSync(docx, await Packer.toBuffer(doc));
    execFileSync(soffice(), ["--headless", "--convert-to", "pdf", docx],
                 {cwd: work, stdio: "ignore"});
    const pdf = path.join(work, base + ".pdf");
    if (!fs.existsSync(pdf)) {
      throw new Error("LibreOffice produced no PDF for " + base + ".docx");
    }
    // cp, not rename: the temp folder is often on another device.
    fs.copyFileSync(pdf, outPdf);
    console.log("wrote", outPdf);
  } finally {
    fs.rmSync(work, {recursive: true, force: true});
  }
}

module.exports = {writePdf};
