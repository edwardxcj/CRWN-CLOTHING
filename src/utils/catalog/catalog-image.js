// Keep original catalog imagery available without relying on its external host.
const localImages = {
  "ZYW3VTp/brown-brim.png": "brown-brim",
  "ypkgK0X/blue-beanie.png": "blue-beanie",
  "QdJwgmp/brown-cowboy.png": "brown-cowboy",
  "RjBLWxB/grey-brim.png": "grey-brim",
  "YTjW3vF/green-beanie.png": "green-beanie",
  "rKBDvJX/palm-tree-cap.png": "palm-tree-cap",
  "bLB646Z/red-beanie.png": "red-beanie",
  "1f2nWMM/wolf-cap.png": "wolf-cap",
  "X2VJP2W/blue-snapback.png": "blue-snapback",
  "0s3pdnc/adidas-nmd.png": "adidas-nmd",
  "dJbG1cT/yeezy.png": "yeezy",
  "bPmVXyP/black-converse.png": "black-converse",
  "1RcFPk0/white-nike-high-tops.png": "white-nike-high-tops",
  "QcvzydB/nikes-red.png": "nikes-red",
  "fMTV342/nike-brown.png": "nike-brown",
  "w4k6Ws9/nike-funky.png": "nike-funky",
  "Mhh6wBg/timberlands.png": "timberlands",
  "XzcwL5s/black-shearling.png": "black-shearling",
  "mJS6vz0/blue-jean-jacket.png": "blue-jean-jacket",
  "N71k1ML/grey-jean-jacket.png": "grey-jean-jacket",
  "s96FpdP/brown-shearling.png": "brown-shearling",
  "M6hHc3F/brown-trench.png": "brown-trench",
  "7CQVJNm/blue-tank.png": "blue-tank",
  "4W2DGKm/floral-blouse.png": "floral-blouse",
  "KV18Ysr/floral-skirt.png": "floral-skirt",
  "N3BN1bh/red-polka-dot-dress.png": "red-polka-dot-dress",
  "KmSkMbH/striped-sweater.png": "striped-sweater",
  "v1cvwNf/yellow-track-suit.png": "yellow-track-suit",
  "qBcrsJg/white-vest.png": "white-vest",
  "xJS0T3Y/camo-vest.png": "camo-vest",
  "qMQ75QZ/floral-shirt.png": "floral-shirt",
  "55z32tw/long-sleeve.png": "long-sleeve",
  "RvwnBL8/pink-shirt.png": "pink-shirt",
  "VpW4x5t/roll-up-jean-shirt.png": "roll-up-jean-shirt",
  "mh3VM1f/polka-dot-shirt.png": "polka-dot-shirt",
};

export const catalogImage = (imageUrl) => {
  const key = typeof imageUrl === "string" && imageUrl.replace(/^https:\/\/i\.ibb\.co\//, "");
  const name = key && Object.prototype.hasOwnProperty.call(localImages, key) && localImages[key];
  return name ? `${process.env.PUBLIC_URL}/media/catalog/${name}.webp` : imageUrl;
};
