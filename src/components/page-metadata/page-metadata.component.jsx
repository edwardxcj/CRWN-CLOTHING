import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CategoriesContext } from "../../contexts/categories.context";
import { catalogProducts, categoryLabel } from "../../utils/catalog/catalog.utils";
import { catalogPhoto } from "../../utils/catalog/catalog-image";

const site = "https://crownclothings.com";
const pages = { "/": "The Everyday Edit", "/shop": "Shop all", "/wishlist": "Your wishlist", "/auth": "My account", "/checkout": "Shopping bag", "/help": "Help & returns", "/admin": "Manage catalog" };
const metadata = (key, content, attribute = "name") => {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!tag) { tag = document.createElement("meta"); tag.setAttribute(attribute, key); document.head.append(tag); }
  tag.setAttribute("content", content);
};

const PageMetadata = () => {
  const { pathname } = useLocation();
  const { categoriesMap } = useContext(CategoriesContext);
  const productId = pathname.match(/^\/shop\/product\/(\d+)\/?$/)?.[1];
  const product = catalogProducts(categoriesMap).find((item) => String(item.id) === productId);
  const category = pathname.match(/^\/shop\/([^/]+)\/?$/)?.[1];

  useEffect(() => {
    const title = `${product?.name || pages[pathname] || (category ? categoryLabel(category) : pathname.startsWith("/orders/") ? "Your demo order" : "Page not found")} | CRWN Clothing`;
    const description = product?.description || (product ? `Explore ${product.name}, choose your size and discover the details at CRWN Clothing.` : "Explore the CRWN Clothing demo collection, from everyday layers to sneakers and finishing touches.");
    const image = new URL(product ? catalogPhoto(product).src : "/media/everyday-edit.webp", site).href;
    const url = site + (pathname.replace(/\/$/, "") || "/");
    document.title = title;
    metadata("description", description);
    metadata("robots", /^\/(auth|checkout|wishlist|orders|admin)(\/|$)/.test(pathname) ? "noindex, nofollow" : "index, follow");
    for (const [key, value] of Object.entries({ title, description, image, url, type: product ? "product" : "website", "image:alt": product?.name || "CRWN Clothing collection" })) metadata(`og:${key}`, value, "property");
    metadata("twitter:card", "summary_large_image");
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = url;
    document.getElementById("product-structured-data")?.remove();
    if (product) {
      const script = document.createElement("script");
      script.id = "product-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Product", name: product.name, description, image, sku: String(product.id) });
      document.head.append(script);
    }
  }, [pathname, product, category]); // Route and current published catalog are the source for page metadata.

  return null;
};

export default PageMetadata;
