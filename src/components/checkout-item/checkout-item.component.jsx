import { useContext } from "react";
import { Link } from "react-router-dom";

import { CartContext } from "../../contexts/cart.context";
import { catalogPhoto } from "../../utils/catalog/catalog-image";
import { formatPrice, productPath } from "../../utils/catalog/catalog.utils";
import { getCartItemError, getCartItemKey, getProductVariants, getSelectedVariant } from "../../utils/catalog/product-variants";
import CatalogImage from "../catalog-image/catalog-image.component";

import "./checkout-item.styles.scss";

const CheckoutItem = ({ cartItem, compact = false, onNavigate }) => {
  const { name, price, quantity } = cartItem;
  const { addItemToCart, removeItemFromCart, clearItemFromCart, chooseItemVariant, cartItems, isCheckoutSaving } =
    useContext(CartContext);
  const variant = getSelectedVariant(cartItem);
  const variants = getProductVariants(cartItem);
  const error = getCartItemError(cartItem);
  const label = [name, cartItem.color, cartItem.size].filter(Boolean).join(", ");
  const canChooseVariant = (option) => {
    const existing = cartItems.find((item) => getCartItemKey(item) === option.key && getCartItemKey(item) !== getCartItemKey(cartItem));
    return quantity + (existing?.quantity || 0) <= option.stock;
  };

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
        {cartItem.color && <span className="bag-line__variant">{cartItem.color} · {cartItem.size}</span>}
        <span className="bag-line__unit-price">{formatPrice(price)} each</span>
        {variants.length > 0 && (
          <label className="bag-line__size">
            <span>{variant ? "Size" : "Choose size"}</span>
            <select
              aria-label={`Size for ${name}${cartItem.size ? `, ${cartItem.size}` : ""}`}
              value={variant?.key || ""}
              disabled={isCheckoutSaving}
              onChange={(event) => chooseItemVariant(cartItem, variants.find((option) => option.key === event.target.value))}
            >
              <option value="" disabled>Choose size</option>
              {variants.map((option) => (
                <option key={option.key} value={option.key} disabled={!canChooseVariant(option)}>
                  {option.size}{option.stock === 0 ? " — out of stock" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {error && <span className="bag-line__stock" role="status">{error}</span>}
      </div>
      <div className="bag-line__controls">
        <div
          className="bag-line__quantity"
          role="group"
          aria-label={`Quantity for ${label}`}
        >
          <button
            type="button"
            aria-label={`Decrease quantity for ${label}`}
            disabled={isCheckoutSaving}
            onClick={() => removeItemFromCart(cartItem)}
          >
            −
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label={`Increase quantity for ${label}`}
            disabled={isCheckoutSaving || (variants.length > 0 && (!variant || quantity >= variant.stock))}
            onClick={() => addItemToCart(cartItem, { openDrawer: false })}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="bag-line__remove"
          aria-label={`Remove ${label} from bag`}
          disabled={isCheckoutSaving}
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
