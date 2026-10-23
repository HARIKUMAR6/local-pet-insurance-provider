/**
 * Static project checks. Run after `npm run build`.
 *   - every required page exists, uses the shared CSS/JS and all partials
 *   - every page has exactly one <h1> and a <title>
 *   - the Home dropdown has exactly two entries: Home 1 and Home 2
 *   - every local href/src resolves to a file
 *   - heading alignment rule: no heading may be right/end aligned
 *   - the compiled stylesheet exists and contains the design system
 */
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [
  'index.html',
  'home-2.html',
  'about.html',
  'contact.html',
  'plans.html',
  'claims.html',
  'login.html',
  'dashboard.html',
];

// Classes that would right/end-align a heading or push it to the right edge.
const FORBIDDEN_HEADING_CLASSES =
  /(^|\s)([\w-]+:)*(text-right|text-end|ml-auto|ms-auto|self-end|justify-self-end|place-self-end|float-right|float-end)(?=\s|$)/;

const errors = [];
const fail = (msg) => errors.push(msg);
const exists = (p) => access(p).then(() => true, () => false);

for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!(await exists(file))) {
    fail(`${page}: missing`);
    continue;
  }
  const html = await readFile(file, 'utf8');

  if (!html.includes('href="assets/css/styles.css"')) fail(`${page}: missing shared stylesheet`);
  if (!html.includes('src="assets/js/main.js"')) fail(`${page}: missing shared script`);
  // Account pages (login, dashboard) have their own app chrome instead of the public header/footer.
  const isApp = /<body[^>]*\sdata-chrome="app"/.test(html);
  for (const name of isApp ? ['head'] : ['head', 'header', 'footer']) {
    const block = html.match(new RegExp(`<!-- partial:${name} -->([\\s\\S]*?)<!-- /partial:${name} -->`));
    if (!block || !block[1].trim()) fail(`${page}: partial "${name}" not injected (run npm run build)`);
  }

  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(`${page}: expected exactly one <h1>, found ${h1s.length}`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page}: missing <title>`);

  if (isApp) {
    if (!/<a class="logo" href="index.html"/.test(html)) fail(`${page}: app page needs the logo linking to index.html`);
    if (html.includes('nav-home-menu')) fail(`${page}: app page should not include the public navigation`);
  }
  if (!isApp) {
    const dropdown = html.match(/<ul id="nav-home-menu"[\s\S]*?<\/ul>/)?.[0] || '';
    const entries = [...dropdown.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim());
    if (entries.join('|') !== 'Home 1|Home 2') fail(`${page}: Home dropdown entries are [${entries.join(', ')}]`);
  }

  // In app pages, #hash links are view routes (data-view="…"), plus #claims-new / #claim-<ref>.
  const views = new Set([...html.matchAll(/data-view="([^"]+)"/g)].map((m) => m[1]).concat(['claims-new']));
  const isRoute = (hash) => isApp && (views.has(hash) || /^claim-/.test(hash));

  const refs = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const [, set] of html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/g)) {
    refs.push(...set.split(',').map((entry) => entry.trim().split(/\s+/)[0]));
  }
  for (const ref of refs) {
    if (ref.startsWith('#') && ref.length > 1 && !html.includes(`id="${ref.slice(1)}"`) && !isRoute(ref.slice(1))) {
      fail(`${page}: in-page anchor "${ref}" has no target`);
    }
    if (/^(https?:|mailto:|tel:|#|data:)/.test(ref)) continue;
    const target = path.join(ROOT, ref.split(/[?#]/)[0]);
    if (!(await exists(target))) fail(`${page}: broken local reference "${ref}"`);
  }

  for (const [tag, cls] of [...html.matchAll(/<(h[1-6])\b[^>]*\bclass="([^"]*)"/g)].map((m) => [m[1], m[2]])) {
    if (FORBIDDEN_HEADING_CLASSES.test(cls)) fail(`${page}: <${tag}> uses a right/end alignment class: "${cls}"`);
  }
  if (/<h[1-6][^>]*style="[^"]*text-align:\s*(right|end)/i.test(html)) fail(`${page}: heading with inline right/end alignment`);
}

const sourceCss = await readFile(path.join(ROOT, 'src', 'input.css'), 'utf8');
for (const [, selector] of sourceCss.matchAll(/([^{}]+)\{[^}]*text-align:\s*(?:right|end)/gi)) {
  if (/\bh[1-6]\b|heading/i.test(selector)) fail(`src/input.css: right/end text-align on a heading selector: "${selector.trim()}"`);
}

const cssPath = path.join(ROOT, 'assets', 'css', 'styles.css');
if (!(await exists(cssPath))) {
  fail('assets/css/styles.css: missing (run npm run build:css)');
} else {
  const css = await readFile(cssPath, 'utf8');
  for (const needle of ['--pine:24 60 53', '.btn-primary', '.drawer', '.container-site', 'text-align:left!important']) {
    if (!css.includes(needle)) fail(`assets/css/styles.css: expected "${needle}"`);
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`✓ ${PAGES.length} pages checked: structure, links, Home dropdown, heading alignment, compiled CSS.`);
