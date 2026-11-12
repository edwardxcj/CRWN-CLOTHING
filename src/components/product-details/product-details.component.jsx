import { useId, useRef, useState } from "react";

import StoreIcon from "../store-icon/store-icon";
import { catalogImage } from "../../utils/catalog/catalog-image";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import { getProductDetailCopy } from "./product-details.copy";

import "./product-details.styles.scss";

const ProductPhoto = ({ src, name }) => {
  const dialogId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  if (!src || unavailable) {
    return (
      <div className="product-details__photo product-details__photo--unavailable">
        Image unavailable
      </div>
    );
  }

  const openPhoto = () => {
    dialogRef.current.showModal();
    closeButtonRef.current.focus();
  };

  return (
    <div className="product-details__gallery">
      <button
        className="product-details__photo"
        type="button"
        aria-label={`Enlarge photo of ${name}`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={openPhoto}
      >
        <img
          src={src}
          alt={name}
          decoding="async"
          onError={() => setUnavailable(true)}
        />
        <span className="product-details__enlarge" aria-hidden="true">
          <StoreIcon name="search" size={16} />
          Enlarge
        </span>
      </button>

      <dialog
        id={dialogId}
        ref={dialogRef}
        className="product-details__viewer"
        aria-label={`Photo of ${name}`}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close();
        }}
      >
        <div className="product-details__viewer-content">
          <button
            className="product-details__close"
            type="button"
            ref={closeButtonRef}
            onClick={() => dialogRef.current.close()}
          >
            <StoreIcon name="close" size={20} />
            Close photo
          </button>
          <img src={src} alt={name} loading="lazy" decoding="async" />
        </div>
      </dialog>
    </div>
  );
};

const ProductDetails = ({ product, onAddToCart, backLink }) => {
  const { name, price, imageUrl } = product;
  const photo = catalogImage(imageUrl);
  const { description, details, sizing } = getProductDetailCopy(product);

  return (
    <div className="product-details">
      <ProductPhoto key={photo || name} src={photo} name={name} />
      <div className="product-details__summary">
        <h1>{name}</h1>
        <p className="product-details__price">{formatPrice(price)}</p>
        {description && <p className="product-details__description">{description}</p>}

        <div className="product-details__actions">
          <button
            type="button"
            className="store-button product-details__add"
            onClick={() => onAddToCart(product)}
          >
            Add to bag
            <StoreIcon name="bag" size={18} />
          </button>
          {backLink}
        </div>

        {details && (
          <dl className="product-details__specs">
            <div>
              <dt>Colour</dt>
              <dd>{details.colour}</dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>{details.style}</dd>
            </div>
          </dl>
        )}

        {sizing && (
          <details className="product-details__sizing">
            <summary>Fit &amp; sizing tips</summary>
            <p>{sizing}</p>
          </details>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
