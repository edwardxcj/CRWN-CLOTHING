import { useContext, useState } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { catalogImage } from "../../utils/catalog/catalog-image";
import { categoryLabel, formatPrice, isSameTabLinkClick, productPath } from "../../utils/catalog/catalog.utils";

import "./product-card.styles.scss";

export const CatalogImage = ({
  product,
  alt = product.name,
  className,
  loading = "lazy",
}) => {
  const src = catalogImage(product.imageUrl);
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`catalog-image-placeholder ${className ?? ""}`} aria-hidden={!alt}>
        Image unavailable
      </div>
    );
  }

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
};

const ProductCard = ({ product, category = product.category, catalogReturn, rememberCatalogPosition }) => {
  const { name, price } = product;
  const { addItemToCart } = useContext(CartContext);

  return (
    <article className="product-card">
      <Link
        className="product-card__link"
        to={productPath(product)}
        state={catalogReturn ? { catalogReturn } : undefined}
        onClick={(event) => {
          if (rememberCatalogPosition && isSameTabLinkClick(event)) rememberCatalogPosition();
        }}
      >
        <div className="product-card__media">
          <CatalogImage product={product} alt="" className="product-card__image" />
        </div>
        {category && <span className="product-card__category">{categoryLabel(category)}</span>}
        <div className="product-card__info">
          <span className="product-card__name">{name}</span>
          <span className="product-card__price">{formatPrice(price)}</span>
        </div>
      </Link>
      <button
        className="product-card__add"
        type="button"
        aria-label={`Add to bag, ${name}`}
        onClick={() => addItemToCart(product)}
      >
        <span className="product-card__plus" aria-hidden="true" />
        Add to bag
      </button>
    </article>
  );
};

export default ProductCard;
