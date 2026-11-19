const fs = require("node:fs/promises");
const path = require("node:path");

const site = "https://crownclothings.com";
const catalogEndpoint = "https://firestore.googleapis.com/v1/projects/crwn-clothing-db-207f6/databases/(default)/documents/catalogOverrides";
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));

function decodeFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("mapValue" in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, entry]) => [key, decodeFirestoreValue(entry)]));
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  throw new Error("Unsupported public catalog value");
}

function validateOverride(document) {
  const id = document.name?.split("/").pop();
  const values = Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreValue(value)]));
  const safeImage = (value) => {
    if (typeof value !== "string" || value.length > 2048) return false;
    try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; }
  };
  if (!Number.isInteger(values.productId) || values.productId < 1 || values.productId > 35 || String(values.productId) !== id ||
    typeof values.name !== "string" || !values.name.trim() || values.name.length > 120 ||
    typeof values.description !== "string" || values.description.length > 2000 ||
    !Number.isFinite(values.price) || values.price < 0 || values.price > 10000 || typeof values.active !== "boolean" ||
    !Array.isArray(values.images) || values.images.length > 6 || !values.images.every(safeImage)) {
    throw new Error(`Invalid public catalog override: ${id || "unknown document"}`);
  }
  return [id, { name: values.name.trim(), description: values.description.trim(), price: values.price, active: values.active, images: values.images }];
}

async function fetchCatalogOverrides(fetchImpl = fetch) {
  const overrides = {};
  let token = "";
  const visited = new Set();
  do {
    if (visited.has(token)) throw new Error("Repeated public catalog page token");
    visited.add(token);
    const url = new URL(catalogEndpoint);
    url.searchParams.set("pageSize", "100");
    if (token) url.searchParams.set("pageToken", token);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Public catalog request failed (${response.status}); share pages were not exported`);
    const data = await response.json();
    if (!data || typeof data !== "object" || data.error || (data.documents !== undefined && !Array.isArray(data.documents))) throw new Error("Invalid public catalog response");
    for (const document of data.documents || []) {
      const [id, override] = validateOverride(document);
      overrides[id] = override;
    }
    token = data.nextPageToken || "";
    if (typeof token !== "string") throw new Error("Invalid public catalog page token");
  } while (token);
  return overrides;
}

async function loadCatalogOverrides(root, env = process.env, fetchImpl = fetch) {
  if (env.CRWN_QA_OFFLINE_CATALOG !== "1") return fetchCatalogOverrides(fetchImpl);
  let checkout = false;
  try { await fs.stat(path.join(root, ".git")); checkout = true; } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (env.NETLIFY || checkout) throw new Error("CRWN_QA_OFFLINE_CATALOG is restricted to scratch copies without .git; production builds must load the live public catalog");
  console.warn("QA scratch build only: using the bundled catalog without production overrides.");
  return {};
}

async function exportPages(root, catalog, overrides) {
  const template = await fs.readFile(path.join(root, "build/index.html"), "utf8");
  const pages = [{ route: "/", title: "The Everyday Edit", image: "/media/everyday-edit.webp" }, { route: "/shop", title: "Shop all" }, { route: "/help", title: "Help & returns" }];
  for (const category of catalog) {
    pages.push({ route: `/shop/${category.title.toLowerCase()}`, title: category.title });
    for (const base of category.items) {
      const product = { ...base, ...overrides[String(base.id)] };
      if (product.active === false) {
        await fs.rm(path.join(root, "build/shop/product", String(product.id)), { recursive: true, force: true });
        continue;
      }
      const stem = base.imageUrl.split("/").pop().replace(/\.png$/, "");
      pages.push({ route: `/shop/product/${product.id}`, title: product.name, image: product.images?.[0] || `/media/catalog/studio/${stem}.webp`, product });
    }
  }
  for (const page of pages) {
    const title = `${page.title} | CRWN Clothing`;
    const description = page.product?.description || (page.product ? `Explore ${page.title}, choose your size and discover the details at CRWN Clothing.` : "Explore the CRWN Clothing demo collection, from everyday layers to sneakers and finishing touches.");
    const url = site + page.route;
    const image = new URL(page.image || "/media/everyday-edit.webp", site).href;
    let html = template.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta\s+(?:name="description"|property="og:[^"]+")[^>]*>/g, "");
    const data = page.product ? `<script id="product-structured-data" type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: page.title, image, description, sku: String(page.product.id), offers: { "@type": "Offer", price: page.product.price, priceCurrency: "USD", url } }).replace(/</g, "\\u003c")}</script>` : "";
    html = html.replace("</head>", `<meta name="description" content="${escapeHtml(description)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="${page.product ? "product" : "website"}"><meta property="og:url" content="${url}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${url}">${data}</head>`);
    const destination = path.join(root, "build", page.route, "index.html");
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, html);
  }
  const urls = pages.map((page) => `<url><loc>${site}${page.route}</loc></url>`).join("");
  await fs.writeFile(path.join(root, "build/sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  await fs.writeFile(path.join(root, "build/404.html"), template.replace(/<title>.*?<\/title>/, "<title>Page not found | CRWN Clothing</title>").replace("</head>", '<meta name="robots" content="noindex"></head>'));
  return pages;
}

async function main() {
  const root = path.resolve(__dirname, "..");
  const catalog = await loadBundledCatalog(root);
  const overrides = await loadCatalogOverrides(root);
  const pages = await exportPages(root, catalog, overrides);
  console.log(`Exported ${pages.length} route-specific share pages and sitemap using the public catalog snapshot.`);
}

async function loadBundledCatalog(root) {
  // This standalone data module also loads on Netlify's Node 18, which does not
  // infer ES modules from .js files in a CommonJS package.
  const source = await fs.readFile(path.join(root, "src/shop-data.js"));
  return (await import(`data:text/javascript;base64,${source.toString("base64")}`)).default;
}

module.exports = { decodeFirestoreValue, fetchCatalogOverrides, loadCatalogOverrides, exportPages, loadBundledCatalog };
if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
