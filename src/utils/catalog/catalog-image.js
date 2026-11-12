const photoSlugs = new Map([
  ["1", "brown-brim"],
  ["2", "blue-beanie"],
  ["3", "brown-cowboy"],
  ["4", "grey-brim"],
  ["5", "green-beanie"],
  ["6", "palm-tree-cap"],
  ["7", "red-beanie"],
  ["8", "wolf-cap"],
  ["9", "blue-snapback"],
  ["10", "adidas-nmd"],
  ["11", "yeezy"],
  ["12", "black-converse"],
  ["13", "white-nike-high-tops"],
  ["14", "nikes-red"],
  ["15", "nike-brown"],
  ["16", "nike-funky"],
  ["17", "timberlands"],
  ["18", "black-shearling"],
  ["19", "blue-jean-jacket"],
  ["20", "grey-jean-jacket"],
  ["21", "brown-shearling"],
  ["22", "brown-trench"],
  ["23", "blue-tank"],
  ["24", "floral-blouse"],
  ["25", "floral-skirt"],
  ["26", "red-polka-dot-dress"],
  ["27", "striped-sweater"],
  ["28", "yellow-track-suit"],
  ["29", "white-vest"],
  ["30", "camo-vest"],
  ["31", "floral-shirt"],
  ["32", "long-sleeve"],
  ["33", "pink-shirt"],
  ["34", "roll-up-jean-shirt"],
  ["35", "polka-dot-shirt"],
]);

const catalogMedia = `${process.env.PUBLIC_URL}/media/catalog`;

export const catalogPhoto = ({ id, imageUrl }) => {
  // A saved bag may still have the original external URL, or no URL at all.
  const slug = photoSlugs.get(String(id));
  if (!slug) return { src: imageUrl };

  const base = `${catalogMedia}/studio/${slug}`;
  const src = `${base}.webp`;

  return {
    src,
    srcSet: `${base}-small.webp 480w, ${src} 1120w`,
    width: 1120,
    height: 1400,
    fallback: `${catalogMedia}/${slug}.webp`,
  };
};
