const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { fetchCatalogOverrides, loadCatalogOverrides, exportPages, loadBundledCatalog } = require("../scripts/export-pages.cjs");

test("bundled catalog loads independently of the package module type", async () => {
  const catalog = await loadBundledCatalog(path.resolve(__dirname, ".."));
  assert.equal(catalog.length, 5);
  assert.equal(catalog.flatMap((category) => category.items).length, 35);
});

const field = (value) => typeof value === "boolean" ? { booleanValue: value } : typeof value === "number" ? { doubleValue: value } : typeof value === "string" ? { stringValue: value } : Array.isArray(value) ? { arrayValue: { values: value.map(field) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, field(entry)])) } };
const document = (productId, extra = {}) => ({ name: `projects/project/databases/(default)/documents/catalogOverrides/${productId}`, fields: Object.fromEntries(Object.entries({ productId, name: "Updated product", description: "Updated detail", price: 123.5, active: true, images: ["https://images.example.test/product.webp"], stock: { M: 2 }, ...extra }).map(([key, value]) => [key, field(value)])) });

test("public REST catalog loading merges all pages and validates overrides", async () => {
  const calls = [];
  const values = await fetchCatalogOverrides(async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => calls.length === 1 ? { documents: [document(1)], nextPageToken: "next" } : { documents: [document(2, { active: false })] } };
  });
  assert.equal(values["1"].price, 123.5);
  assert.equal(values["2"].active, false);
  assert.match(calls[1], /pageToken=next/);
  await assert.rejects(fetchCatalogOverrides(async () => ({ ok: false, status: 403 })), /request failed \(403\)/);
  await assert.rejects(fetchCatalogOverrides(async () => ({ ok: true, json: async () => ({ documents: [document(1, { images: ["javascript:alert(1)"] })] }) })), /Invalid public catalog override/);
  await assert.rejects(fetchCatalogOverrides(async () => { throw new Error("Network offline"); }), /Network offline/);
});

test("share pages use current names, images, descriptions and prices; inactive products are absent", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "crwn-export-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "build/shop/product/2"), { recursive: true });
  await fs.writeFile(path.join(root, "build/index.html"), '<html><head><title>Old title</title><meta name="description" content="Old description"></head><body><div id="root"></div></body></html>');
  await fs.writeFile(path.join(root, "build/shop/product/2/index.html"), "stale old product");
  const catalog = [{ title: "Hats", items: [{ id: 1, name: "Old name", price: 10, imageUrl: "https://old.test/brown-brim.png" }, { id: 2, name: "Hidden", price: 20, imageUrl: "https://old.test/blue-beanie.png" }] }];
  const pages = await exportPages(root, catalog, { "1": { name: "New & better", description: 'A <special> "detail"', price: 123.5, active: true, images: ["https://images.example.test/new.webp?v=1&size=large"] }, "2": { active: false } });
  const html = await fs.readFile(path.join(root, "build/shop/product/1/index.html"), "utf8");
  assert.match(html, /<title>New &amp; better \| CRWN Clothing<\/title>/);
  assert.match(html, /property="og:image" content="https:\/\/images.example.test\/new.webp\?v=1&amp;size=large"/);
  assert.match(html, /A &lt;special&gt; &quot;detail&quot;/);
  assert.match(html, /"price":123\.5/);
  assert.ok(!pages.some((page) => page.route === "/shop/product/2"));
  assert.ok(!(await fs.readFile(path.join(root, "build/sitemap.xml"), "utf8")).includes("/shop/product/2"));
  await assert.rejects(fs.stat(path.join(root, "build/shop/product/2")), { code: "ENOENT" });
  assert.match(await fs.readFile(path.join(root, "build/404.html"), "utf8"), /name="robots" content="noindex"/);
});

test("offline catalog fallback requires an explicit scratch-only setting", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "crwn-offline-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const offline = async () => { throw new Error("Network offline"); };
  await assert.rejects(loadCatalogOverrides(root, {}, offline), /Network offline/);
  assert.deepEqual(await loadCatalogOverrides(root, { CRWN_QA_OFFLINE_CATALOG: "1" }, offline), {});
  await assert.rejects(loadCatalogOverrides(root, { CRWN_QA_OFFLINE_CATALOG: "1", NETLIFY: "true" }, offline), /restricted to scratch/);
  await fs.writeFile(path.join(root, ".git"), "gitdir: somewhere");
  await assert.rejects(loadCatalogOverrides(root, { CRWN_QA_OFFLINE_CATALOG: "1" }, offline), /restricted to scratch/);
});

test("known shop routes use generated pages and unknown shop routes retain the 404 fallback", async () => {
  const redirects = await fs.readFile(path.join(__dirname, "../public/_redirects"), "utf8");
  assert.ok(!/^\/shop\/\*\s/m.test(redirects));
  assert.match(redirects, /^\/\*\s+\/404\.html\s+404$/m);
});
