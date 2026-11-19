import { useEffect, useId, useState } from "react";

import ProductCard from "../product-card/product-card.component";
import { recentProductIds, rememberProduct } from "../../utils/catalog/product-discovery";

import "./recently-viewed.styles.scss";

const RecentlyViewed = ({ products, currentId, catalogReturn }) => {
  const [ids, setIds] = useState(recentProductIds);
  const headingId = useId();

  useEffect(() => {
    if (currentId !== undefined) rememberProduct(currentId);
    setIds(recentProductIds());
  }, [currentId]);

  const items = ids.filter((id) => id !== Number(currentId)).map((id) => products.find((product) => Number(product.id) === id)).filter(Boolean).slice(0, 4);
  if (!items.length) return null;

  return (
    <section className="recent-products" aria-labelledby={headingId}>
      <h2 id={headingId}>Recently viewed</h2>
      <div className="recent-products__grid">{items.map((product) => <ProductCard key={product.id} product={product} catalogReturn={catalogReturn} />)}</div>
    </section>
  );
};

export default RecentlyViewed;
