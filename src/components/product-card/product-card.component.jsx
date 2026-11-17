import { useId } from "react";
import { Link } from "react-router-dom";

import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { categoryLabel, formatPrice, isSameTabLinkClick, productPath } from "../../utils/catalog/catalog.utils";
import CatalogImage from "../catalog-image/catalog-image.component";
import WishlistButton from "../wishlist-button/wishlist-button.component";

import "./product-card.styles.scss";

const cardPhotoSizes = "(max-width: 700px) 46vw, (max-width: 850px) 30vw, (max-width: 1510px) 23vw, 350px";

const ProductCard = ({ product, category = product.category, catalogReturn, rememberCatalogPosition }) => {
  const { name, price } = product;
  const nameId = useId();

  return (
    <article className="product-card">
      <WishlistButton product={product} className="product-card__wishlist" />
      <Link
        className="product-card__link"
        to={productPath(product)}
        state={catalogReturn ? { catalogReturn } : undefined}
        onClick={(event) => {
          if (rememberCatalogPosition && isSameTabLinkClick(event)) rememberCatalogPosition();
        }}
      >
        <div className="product-card__media">
          <CatalogImage
            photo={catalogPhoto(product)}
            alt=""
            className="product-card__image"
            sizes={cardPhotoSizes}
          />
        </div>
        {category && <span className="product-card__category">{categoryLabel(category)}</span>}
        <div className="product-card__info">
          <span id={nameId} className="product-card__name">{name}</span>
          <span className="product-card__price">{formatPrice(price)}</span>
        </div>
      </Link>
      <Link
        className="product-card__add"
        to={productPath(product)}
        state={catalogReturn ? { catalogReturn } : undefined}
        aria-label="Choose options"
        aria-describedby={nameId}
        onClick={(event) => {
          if (rememberCatalogPosition && isSameTabLinkClick(event)) rememberCatalogPosition();
        }}
      >
        <span className="product-card__plus" aria-hidden="true" />
        Choose options
      </Link>
    </article>
  );
};

export default ProductCard;
