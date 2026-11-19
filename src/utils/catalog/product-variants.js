import { getCurrentProduct } from "./catalog-overrides";

export { getCurrentProduct } from "./catalog-overrides";

const productColours = [
  ["Brown", "#654638"], ["Blue", "#315a7a"], ["Brown", "#795c3d"],
  ["Grey", "#9c9b94"], ["Green", "#42583b"], ["Light blue", "#becbd0"],
  ["Red", "#a82327"], ["Dark blue", "#3a515d"], ["Light blue", "#a9bed3"],
  ["Black", "#252624"], ["Lilac", "#b6aaba"], ["Black", "#222221"],
  ["White", "#efeee9"], ["Red and white", "#a92832"], ["Tan and white", "#a67c50"],
  ["Black and white", "#3c3b37"], ["Wheat", "#b68a48"], ["Black", "#30302f"],
  ["Blue", "#366783"], ["Grey", "#aaa9a1"], ["Brown", "#8a4c32"],
  ["Tan", "#ae855c"], ["Teal", "#296f69"], ["Ivory floral", "#e7dacb"],
  ["Ivory floral", "#e8dfce"], ["Red", "#a92832"], ["Brown and white", "#b18b65"],
  ["Yellow", "#d7a122"], ["White", "#eee9de"], ["Camouflage", "#4c483d"],
  ["Blue floral", "#356082"], ["Black and white", "#464540"], ["Pink", "#d1ada7"],
  ["Blue", "#345b74"], ["Burgundy", "#633538"],
];

const apparelSizes = ["XS", "S", "M", "L", "XL"];
const shoeSizes = ["US 6", "US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];
const fittedHatIds = new Set([1, 3, 4]);

const colourValue = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const getProductBrand = (product) => {
  const id = Number(product.id);
  if (id === 10 || id === 11) return "Adidas";
  if (id === 12) return "Converse";
  if (id >= 13 && id <= 15) return "Nike";
  if (id === 16) return "Jordan";
  if (id === 17) return "Timberland";
  return "CRWN";
};

export const getProductOptions = (product) => {
  product = getCurrentProduct(product);
  const id = Number(product.id);
  const colour = productColours[id - 1];
  if (!Number.isInteger(id) || !colour) {
    return { colors: [], sizes: [], variants: [], brand: getProductBrand(product) };
  }

  const [name, swatch] = colour;
  const color = { name, value: colourValue(name), swatch };
  const sizes = id <= 9
    ? (fittedHatIds.has(id) ? ["S/M", "L/XL"] : ["One size"])
    : id <= 17 ? shoeSizes : apparelSizes;
  const variants = sizes.map((size, index) => ({
    key: `${id}::${color.value}::${size}`,
    size,
    color: name,
    colorValue: color.value,
    // The catalog is a demo. Availability is deliberately fixed and reproducible.
    stock: product.active === false ? 0 : Number.isInteger(product.stockBySize?.[size])
      ? product.stockBySize[size]
      : id === 7 || (sizes.length > 1 && (id + index) % 5 === 0)
      ? 0
      : 2 + ((id * 3 + index) % 7),
  }));

  return { colors: [color], sizes, variants, brand: getProductBrand(product) };
};

export const getProductVariants = (product) => getProductOptions(product).variants;

export const getSelectedVariant = (product) => getProductVariants(product).find((variant) => (
  variant.size === product.size && variant.color === product.color
));

export const getCartItemKey = (item) => getSelectedVariant(item)?.key || `${item.id}::unselected`;

export const getCartItemError = (item) => {
  const current = getCurrentProduct(item);
  if (current.active === false) return `${item.name} is no longer available. Remove it to continue.`;
  if (current.price !== item.price) return `${item.name} has a new price. Remove it and add it again to continue.`;
  const variants = getProductVariants(item);
  if (!variants.length) return "";
  const variant = getSelectedVariant(item);
  if (!variant) return `Choose a size for ${item.name}.`;
  if (item.quantity > variant.stock) {
    return `${item.name} (${variant.size}) exceeds the demo stock of ${variant.stock}.`;
  }
  return "";
};

export const selectedVariantItem = (product, variant) => ({
  ...getCurrentProduct(product),
  variantKey: variant.key,
  size: variant.size,
  color: variant.color,
});
