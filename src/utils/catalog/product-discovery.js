import { getProductBrand, getProductOptions } from "./product-variants";

const recentKey = "crwn-recent-products";

export const recentProductIds = () => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(recentKey) || "[]");
    return Array.isArray(stored) ? [...new Set(stored.filter((id) => Number.isInteger(id) && id >= 1 && id <= 35))].slice(0, 8) : [];
  } catch {
    return [];
  }
};

export const rememberProduct = (productId) => {
  const id = Number(productId);
  if (!Number.isInteger(id) || id < 1 || id > 35) return;
  try {
    window.localStorage.setItem(recentKey, JSON.stringify([id, ...recentProductIds().filter((value) => value !== id)].slice(0, 8)));
  } catch {
    // Product browsing remains available when local storage is blocked.
  }
};

export const recommendProducts = (products, current, limit = 4) => {
  const colour = getProductOptions(current).colors[0]?.value;
  const score = (product) => (
    (product.category === current.category ? 6 : 0) +
    (getProductBrand(product) === getProductBrand(current) ? 2 : 0) +
    (getProductOptions(product).colors[0]?.value === colour ? 2 : 0) +
    Math.max(0, 1 - Math.abs(product.price - current.price) / Math.max(1, current.price)) +
    (getProductOptions(product).variants.some((variant) => variant.stock > 0) ? 1 : -10)
  );
  return products.filter((product) => String(product.id) !== String(current.id) && product.active !== false)
    .sort((first, second) => score(second) - score(first) || Number(first.id) - Number(second.id))
    .slice(0, limit);
};
