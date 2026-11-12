import { useContext } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { formatPrice, productPath } from "../../utils/catalog/catalog.utils";
import CatalogImage from "../catalog-image/catalog-image.component";

import "./checkout-item.styles.scss";

const CheckoutItem = ({ cartItem, compact = false, onNavigate }) => {
  const { name, price, quantity } = cartItem;
  const { addItemToCart, removeItemFromCart, clearItemFromCart } =
    useContext(CartContext);

  return (
    <li className={compact ? "bag-line bag-line--compact" : "bag-line"}>
      <div className="bag-line__photo">
        <CatalogImage
          photo={catalogPhoto(cartItem)}
          alt=""
          sizes={compact ? "72px" : "(max-width: 680px) 72px, 96px"}
        />
      </div>
      <div className="bag-line__description">
        <Link to={productPath(cartItem)} onClick={onNavigate}>
          {name}
        </Link>
        <span className="bag-line__unit-price">{formatPrice(price)} each</span>
      </div>
      <div className="bag-line__controls">
        <div
          className="bag-line__quantity"
          role="group"
          aria-label={`Quantity for ${name}`}
        >
          <button
            type="button"
            aria-label={`Decrease quantity for ${name}`}
            onClick={() => removeItemFromCart(cartItem)}
          >
            −
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity for ${name}`}
            onClick={() => addItemToCart(cartItem, { openDrawer: false })}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="bag-line__remove"
          aria-label={`Remove ${name} from bag`}
          onClick={() => clearItemFromCart(cartItem)}
        >
          Remove
        </button>
      </div>
      <span className="bag-line__total">
        <span className="sr-only">Line total: </span>
        {formatPrice(price * quantity)}
      </span>
    </li>
  );
};

export default CheckoutItem;
