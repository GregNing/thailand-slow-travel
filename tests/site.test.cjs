const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function loadApp(saved = null) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      innerHTML: '', textContent: '',
      style: { setProperty(k, v) { this[k] = v; } },
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, setAttribute() {},
      querySelector: () => ({ addEventListener() {} })
    });
    return nodes.get(id);
  };
  const context = {
    navigator: {}, console,
    localStorage: { getItem: () => { if (saved instanceof Error) throw saved; return saved; }, setItem() {} },
    document: { getElementById: node, querySelectorAll: () => [], querySelector: node }
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('data.js'), context);
  vm.runInContext(read('app.js'), context);
  return { context, node, run: (s) => vm.runInContext(s, context) };
}

test('all six days render distinct photos, correct titles and every stop', () => {
  const app = loadApp();
  const images = new Set();
  for (let i = 0; i < 6; i++) {
    app.run(`state.selectedDay=${i};renderTabs();renderDay()`);
    const day = app.context.TRIP_DATA.days[i];
    const rendered = app.node('timeline').innerHTML;
    assert(rendered.includes(`src="${day.photo.src}"`));
    assert(app.node('timeline').style['--section-photo'].includes(day.photo.src));
    assert(app.node('selected-day-title').innerHTML.includes(day.label));
    assert(app.node('day-tabs').innerHTML.includes(`data-day="${i}" aria-pressed="true"`));
    for (const stop of day.stops) assert(rendered.includes(stop.title));
    assert(fs.existsSync(path.join(root, day.photo.src)));
    images.add(day.photo.src);
  }
  assert.equal(images.size, 6);
});

test('broken, missing or blocked browser storage does not blank the page', () => {
  for (const saved of ['{broken', 'null', '[]', '42', new Error('blocked')]) {
    const app = loadApp(saved);
    assert(app.node('timeline').innerHTML.includes('Tiffany'));
    assert.equal(app.node('progress-text').textContent, '0%');
  }
});

test('obsolete completion records do not inflate trip progress', () => {
  const app = loadApp(JSON.stringify({ 'old-trip-stop': true, 'day-1-main-0': true }));
  assert.equal(app.node('progress-text').textContent, '3%');
});

test('all cached assets exist and photo attribution matches daily photos', () => {
  const context = { self: { addEventListener() {} } };
  vm.createContext(context); vm.runInContext(read('sw.js'), context);
  for (const asset of vm.runInContext('ASSETS', context)) {
    assert(fs.existsSync(path.join(root, asset.split('?')[0])), asset);
  }
  const app = loadApp();
  const credits = JSON.parse(read('assets/photos/credits.json'));
  for (const day of app.context.TRIP_DATA.days) {
    assert.equal(credits[day.id].src, day.photo.src);
    assert(credits[day.id].source.startsWith('https://'));
  }
});

test('service worker cleans only this project cache', async () => {
  const handlers = {}, deleted = []; let task;
  const context = {
    self: { addEventListener: (event, cb) => { handlers[event] = cb; }, clients: { claim() {} } },
    caches: { keys: async () => ['thailand-slow-travel-v20', 'thailand-slow-travel-v21', 'kansai-cache'], delete: async (key) => deleted.push(key) }
  };
  vm.createContext(context);vm.runInContext(read('sw.js'),context);
  handlers.activate({ waitUntil(p) { task = p; } });await task;
  assert.deepEqual(deleted, ['thailand-slow-travel-v20']);
});

test('offline missing images never receive index HTML', async () => {
  const handlers = {}; let response;
  const cache = { match: async (key) => key === './index.html' ? new Response('<html>') : undefined };
  const context = {
    URL, Response,
    self: { registration: { scope: 'https://example.com/thailand/' }, addEventListener: (event, cb) => { handlers[event] = cb; } },
    caches: { open: async () => cache }, fetch: async () => { throw new Error('offline'); }
  };
  vm.createContext(context);vm.runInContext(read('sw.js'),context);
  handlers.fetch({ request: { url:'https://example.com/thailand/missing.jpg', method:'GET', destination:'image', mode:'no-cors' }, respondWith(p) { response = p; } });
  assert.equal((await response).type, 'error');
});
