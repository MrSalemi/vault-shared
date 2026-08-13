// Build one guide from markdown.
// V03
//
//   node make.js p02.md            -> writes the .docx named in the frontmatter
//   PAD_EVEN=1 node make.js p02.md -> adds a blank page for duplex printing
//
// Use ./build-all.sh to build every guide and pad the odd ones automatically.

const fs = require('fs');
const path = require('path');
const {parse} = require('./parse');
const {build} = require('./build');

const mdPath = process.argv[2];
if (!mdPath) {
  console.error("usage: node make.js <guide.md>");
  process.exit(1);
}

// The guide's own folder. Pictures and sibling guides are found here, not
// beside the builder -- the two are the same folder today and will not be once
// the builder is a submodule shared with nhsrobotics.
const contentDir = path.dirname(path.resolve(mdPath));

const src = fs.readFileSync(mdPath, 'utf8');

// A link prints its label, or its target when there is no label. That is what
// you want almost always -- "you will find it in [[robot_setup]]" should print
// the name. It is wrong in exactly one case: a link to another guide, because
// the target is a build filename. [[p07]] prints "p07", and no student has ever
// seen that name; the guide on their desk says "Project 07: The Parking Sensor".
// A guide is recognised by there being a .md of that name in the guide's own
// folder, so the rule needs no list to keep up to date.
//
// It is also the link Obsidian's autocomplete offers first, so it is the one
// that will slip through and reach a printed handout. Caught here, loudly.
//
// Frontmatter is exempt: `related:` is bare guide links on purpose, and is
// never rendered. Code spans and fences are exempt too, because a guide may
// legitimately show link syntax as an example.
const body = src
  .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
  .replace(/```[\s\S]*?```/g, '')
  .replace(/`[^`\n]*`/g, '');
const naked = [...body.matchAll(/(?<!!)\[\[([^\]|]+)\]\]/g)]
  .filter(m => fs.existsSync(path.join(contentDir, m[1] + '.md')));
if (naked.length) {
  console.error(`${mdPath}: a link to another guide needs words a student can read.`);
  for (const b of naked) {
    console.error(`  [[${b[1]}]] prints "${b[1]}"  ->  write [[${b[1]}|Project ${b[1].replace(/\D/g, '')}]]`);
  }
  process.exit(1);
}

// The words behind {{GRADING}}, {{SAVE}} and the rest belong to the course, not
// the builder. Each guides folder has a course.js taking the guide's frontmatter
// and returning what its placeholders stand for:
//
//   module.exports = meta => ({
//     GRADING: "This lab is worth 20 points...",
//     SAVE: `...save it as /workspace/p${meta.number}.py...`,
//   });
//
// This is the whole reason the builder can be shared. Engineering grades a
// circuit that works; Robotics grades a robot and a worksheet, and builds its
// SAVE text from the guide's own number and scaffold. Neither belongs in code
// the other course also runs.
const coursePath = path.join(contentDir, 'course.js');
if (!fs.existsSync(coursePath)) {
  console.error(`${mdPath}: no course.js in ${contentDir}`);
  console.error("it supplies the {{PLACEHOLDER}} text for this course's guides.");
  process.exit(1);
}
const course = require(coursePath);

// Frontmatter is read twice: once so course.js can see the project number and
// scaffold, once for real with all placeholders filled in.
const [meta0] = parse(src);
const vars = course(meta0);

const [meta, blocks] = parse(src, vars);
build(meta.out, meta.version, blocks, contentDir);
