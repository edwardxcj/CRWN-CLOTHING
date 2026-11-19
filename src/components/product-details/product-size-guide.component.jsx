import { getProductOptions } from "../../utils/catalog/product-variants";

const apparelReference = [
  ["XS", "80–86", "64–70", "84–90"],
  ["S", "86–92", "70–76", "90–96"],
  ["M", "92–98", "76–82", "96–102"],
  ["L", "98–104", "82–88", "102–108"],
  ["XL", "104–112", "88–96", "108–116"],
];
const shoeGuides = {
  Adidas: "https://www.adidas.com/us/help/size_charts/men-shoes",
  Nike: "https://www.nike.com/size-fit/mens-footwear",
  Jordan: "https://www.nike.com/size-fit/mens-footwear",
  Converse: "https://www.converse.com/uk/en/size-chart-guide",
  Timberland: "https://www.timberland.com/en-us/customer-care/size-chart",
};

const ProductSizeGuide = ({ product }) => {
  const options = getProductOptions(product);
  const shoeGuide = shoeGuides[options.brand];
  return (
    <details className="product-details__sizing product-size-guide">
      <summary>Size guide &amp; measuring</summary>
      {shoeGuide ? (
        <>
          <p>Footwear options use US sizing. Measure both feet while standing in the socks you intend to wear. Compare the longer foot with the brand’s current guide.</p>
          <a className="store-text-link" href={shoeGuide} target="_blank" rel="noreferrer">Open the official {options.brand} size guide ↗</a>
        </>
      ) : product.category === "hats" ? (
        <>
          <p>Wrap a flexible tape around your head just above your ears and eyebrows, keeping it level without pulling it tight.</p>
          <div className="product-size-guide__table"><table>
            <caption>Illustrative demo fit reference · head circumference in cm</caption>
            <thead><tr><th scope="col">Option</th><th scope="col">Reference range</th></tr></thead>
            <tbody>{options.sizes.map((size) => <tr key={size}><th scope="row">{size}</th><td>{size === "S/M" ? "54–57" : size === "L/XL" ? "58–61" : "54–61"}</td></tr>)}</tbody>
          </table></div>
          <p className="product-size-guide__note">These example ranges support demo sizing. Product-specific measured dimensions have not been supplied.</p>
        </>
      ) : (
        <>
          <p>Measure around the fullest part of your chest and hips, and around your natural waist. Keep the tape level and relaxed. Compare the length and shoulders with clothing you already wear.</p>
          <div className="product-size-guide__table"><table>
            <caption>Illustrative demo fit reference · body measurements in cm</caption>
            <thead><tr><th scope="col">Size</th><th scope="col">Chest</th><th scope="col">Waist</th><th scope="col">Hip</th></tr></thead>
            <tbody>{apparelReference.filter(([size]) => options.sizes.includes(size)).map(([size, chest, waist, hip]) => <tr key={size}><th scope="row">{size}</th><td>{chest}</td><td>{waist}</td><td>{hip}</td></tr>)}</tbody>
          </table></div>
          <p className="product-size-guide__note">These example ranges support demo sizing. They are body measurements, and product-specific measured dimensions have not been supplied.</p>
        </>
      )}
      <p>Check the product’s own label for fibre composition and cleaning instructions. Test a hidden area before using a cleaning product.</p>
    </details>
  );
};

export default ProductSizeGuide;
