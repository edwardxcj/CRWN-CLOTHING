import { useId, useRef, useState } from "react";

import CatalogImage from "../catalog-image/catalog-image.component";
import StoreIcon from "../store-icon/store-icon";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { formatPrice } from "../../utils/catalog/catalog.utils";
import { getProductDetailCopy } from "./product-details.copy";

import "./product-details.styles.scss";

const detailPhotoSizes = "(max-width: 700px) 94vw, (max-width: 1510px) 49vw, 725px";

const ProductPhoto = ({ photo, name }) => {
  const dialogId = useId();
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [unavailable, setUnavailable] = useState(false);

  const photoClass = photo.width
    ? "product-details__photo product-details__photo--studio"
    : "product-details__photo";

  if (!photo.src || unavailable) {
    return (
      <div className={`${photoClass} product-details__photo--unavailable`}>
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
        className={photoClass}
        type="button"
        aria-label={`Enlarge photo of ${name}`}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        onClick={openPhoto}
      >
        <CatalogImage
          photo={photo}
          alt={name}
          sizes={detailPhotoSizes}
          loading="eager"
          onUnavailable={() => setUnavailable(true)}
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
          <CatalogImage photo={photo} alt={name} />
        </div>
      </dialog>
    </div>
  );
};

const ProductDetails = ({ product, onAddToCart, backLink }) => {
  const { name, price } = product;
  const photo = catalogPhoto(product);
  const { description, details, sizing } = getProductDetailCopy(product);

  return (
    <div className="product-details">
      <ProductPhoto key={photo.src || name} photo={photo} name={name} />
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
