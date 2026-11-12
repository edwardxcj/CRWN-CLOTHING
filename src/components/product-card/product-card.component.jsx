import { useContext } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { categoryLabel, formatPrice, isSameTabLinkClick, productPath } from "../../utils/catalog/catalog.utils";
import CatalogImage from "../catalog-image/catalog-image.component";

import "./product-card.styles.scss";

const cardPhotoSizes = "(max-width: 700px) 46vw, (max-width: 850px) 30vw, (max-width: 1510px) 23vw, 350px";

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
          <CatalogImage
            photo={catalogPhoto(product)}
            alt=""
            className="product-card__image"
            sizes={cardPhotoSizes}
          />
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
