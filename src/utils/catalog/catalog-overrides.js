let overridesById = {};

export const registerCatalogOverrides = (overrides) => { overridesById = overrides; };

export const getCurrentProduct = (product) => {
  const override = overridesById[String(product.id)];
  if (!override) return product;
  return {
    ...product,
    name: override.name,
    description: override.description,
    price: override.price,
    active: override.active,
    stockBySize: override.stock,
    images: override.images,
  };
};

export const validCatalogImage = (value) => {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
};

export const readCatalogOverride = (data, documentId) => {
  if (!data || !Number.isInteger(data.productId) || data.productId < 1 || data.productId > 35 || String(data.productId) !== documentId) return null;
  if (typeof data.name !== "string" || !data.name.trim() || data.name.length > 120) return null;
  if (typeof data.description !== "string" || data.description.length > 2000) return null;
  if (!Number.isFinite(data.price) || data.price < 0 || data.price > 10000 || typeof data.active !== "boolean") return null;
  if (!data.stock || typeof data.stock !== "object" || Array.isArray(data.stock)) return null;
  const allowedSizes = new Set(["XS", "S", "M", "L", "XL", "US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12", "S/M", "L/XL", "One size"]);
  if (Object.entries(data.stock).some(([size, stock]) => !allowedSizes.has(size) || !Number.isInteger(stock) || stock < 0 || stock > 999)) return null;
  if (!Array.isArray(data.images) || data.images.length > 6 || !data.images.every(validCatalogImage)) return null;
  return {
    productId: data.productId,
    name: data.name.trim(),
    description: data.description.trim(),
    price: data.price,
    active: data.active,
    stock: { ...data.stock },
    images: [...data.images],
  };
};
