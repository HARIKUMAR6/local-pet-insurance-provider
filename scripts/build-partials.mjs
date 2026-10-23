/**
 * Injects the shared partials (src/partials/*.html) into every root-level page.
 *
 * Each page marks where a partial goes:
 *   <!-- partial:header -->
 *   <!-- /partial:header -->
 * Everything between the markers is replaced on each run, so the partial
 * files stay the single source of truth and the pages remain plain static
 * HTML that deploys anywhere.
 *
 * Account pages (<body data-chrome="app">: login, dashboard) use their own
 * application chrome, so only the head partial is injected into them.
 *
 * Active navigation state is resolved here, from <body data-page="...">:
 *   data-nav="<page>"        -> gets aria-current="page"
 *   data-nav-group="<group>" -> gets data-active="true"
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PARTIALS_DIR = path.join(ROOT, 'src', 'partials');
const PARTIALS = ['head', 'header', 'footer'];
const NAV_GROUPS = { 'home-1': 'home', 'home-2': 'home' };

const partials = Object.fromEntries(
  await Promise.all(
    PARTIALS.map(async (name) => [
      name,
      (await readFile(path.join(PARTIALS_DIR, `${name}.html`), 'utf8')).trim(),
    ]),
  ),
);

function applyActiveState(html, page) {
  let out = html.replaceAll(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
  const group = NAV_GROUPS[page];
  if (group) {
    out = out.replaceAll(`data-nav-group="${group}"`, `data-nav-group="${group}" data-active="true"`);
  }
  return out;
}

function inject(html, name, content) {
  const pattern = new RegExp(
    `([ \\t]*)<!-- partial:${name} -->[\\s\\S]*?<!-- \\/partial:${name} -->`,
  );
  if (!pattern.test(html)) return { html, found: false };

  const replaced = html.replace(pattern, (_match, indent) => {
    const body = content
      .split('\n')
      .map((line) => (line ? indent + line : line))
      .join('\n');
    return `${indent}<!-- partial:${name} -->\n${body}\n${indent}<!-- /partial:${name} -->`;
  });
  return { html: replaced, found: true };
}

const pages = (await readdir(ROOT)).filter((file) => file.endsWith('.html'));
let updated = 0;

for (const file of pages) {
  const filePath = path.join(ROOT, file);
  const source = await readFile(filePath, 'utf8');
  const page = source.match(/<body[^>]*\sdata-page="([^"]+)"/)?.[1];
  if (!page) {
    console.warn(`skip  ${file} (no <body data-page>)`);
    continue;
  }

  const isApp = /<body[^>]*\sdata-chrome="app"/.test(source);
  let html = source;
  const missing = [];
  for (const name of isApp ? ['head'] : PARTIALS) {
    const result = inject(html, name, applyActiveState(partials[name], page));
    if (!result.found) missing.push(name);
    html = result.html;
  }

  if (missing.length) console.warn(`warn  ${file} is missing markers: ${missing.join(', ')}`);
  if (html !== source) {
    await writeFile(filePath, html);
    updated += 1;
    console.log(`built ${file}`);
  } else {
    console.log(`same  ${file}`);
  }
}

console.log(`\n${pages.length} page(s) processed, ${updated} updated.`);
