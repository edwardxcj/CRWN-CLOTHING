const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const categoryLabels = new Map([
  ["womens", "Women"],
  ["mens", "Men"],
  ["jackets", "Jackets"],
  ["sneakers", "Sneakers"],
  ["hats", "Hats"],
]);

export const categoryLabel = (category) =>
  categoryLabels.get(category) ?? category.charAt(0).toUpperCase() + category.slice(1);

export const formatPrice = (price) => currency.format(price);

export const productPath = (product) =>
  `/shop/product/${encodeURIComponent(product.id)}`;

export const catalogProducts = (categoriesMap) =>
  Object.entries(categoriesMap).flatMap(([category, products]) =>
    products.map((product) => ({ ...product, category }))
  );
