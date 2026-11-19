import { catalogGallery, catalogPhoto } from "./catalog-image";
import { getCurrentProduct, readCatalogOverride, registerCatalogOverrides } from "./catalog-overrides";
import { getCartItemError, getCartItemKey, getProductOptions } from "./product-variants";
import { recentProductIds, recommendProducts, rememberProduct } from "./product-discovery";

const product = { id: 13, name: "Nike White AirForce", price: 160, category: "sneakers", size: "US 9", color: "White", quantity: 1 };
const values = {
  productId: 13, name: "White High Tops", description: "Updated description", price: 160,
  active: true, stock: { "US 9": 0 }, images: ["https://example.test/front.webp", "https://example.test/detail.webp"],
};

afterEach(() => { registerCatalogOverrides({}); localStorage.clear(); });

test("published stock and image changes apply to existing cart snapshots without changing their variant key", () => {
  const key = getCartItemKey(product);
  registerCatalogOverrides({ "13": readCatalogOverride(values, "13") });
  expect(getProductOptions(product).variants.find((variant) => variant.size === "US 9").stock).toBe(0);
  expect(getCartItemKey(product)).toBe(key);
  expect(getCartItemError(product)).toContain("exceeds the demo stock");
  expect(catalogPhoto(product).src).toBe(values.images[0]);
  expect(catalogGallery(product).map((photo) => photo.src)).toEqual(values.images);
  expect(getCurrentProduct(product).name).toBe("White High Tops");
});

test("unpublishing and repricing prevent an old bag snapshot from being checked out", () => {
  registerCatalogOverrides({ "13": { ...values, active: false } });
  expect(getCartItemError(product)).toContain("no longer available");
  registerCatalogOverrides({ "13": { ...values, price: 170 } });
  expect(getCartItemError(product)).toContain("new price");
});

test("catalog overrides reject malformed prices, quantities and unsafe image URLs", () => {
  expect(readCatalogOverride(values, "13")).toEqual(values);
  expect(readCatalogOverride({ ...values, stock: { "US 9": -1 } }, "13")).toBeNull();
  expect(readCatalogOverride({ ...values, stock: { "US 9": 1.5 } }, "13")).toBeNull();
  expect(readCatalogOverride({ ...values, images: ["javascript:alert(1)"] }, "13")).toBeNull();
  expect(readCatalogOverride({ ...values, images: ["https://user:password@example.test/photo.jpg"] }, "13")).toBeNull();
  expect(readCatalogOverride({ ...values, price: Infinity }, "13")).toBeNull();
  expect(readCatalogOverride(values, "14")).toBeNull();
});

test("recent products stay unique and ordered, while recommendations prefer matching category and colour", () => {
  rememberProduct(12); rememberProduct(13); rememberProduct(12);
  expect(recentProductIds()).toEqual([12, 13]);
  const products = [product, { id: 29, category: "womens", price: 20 }, { id: 10, category: "sneakers", price: 220 }, { id: 14, category: "sneakers", price: 160 }];
  expect(recommendProducts(products, product).map((item) => item.id)).toEqual([14, 10, 29]);
  localStorage.setItem("crwn-recent-products", "not-json");
  expect(recentProductIds()).toEqual([]);
});
