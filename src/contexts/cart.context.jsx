import { createContext, useState, useEffect, useRef } from "react";

import { getCartItemKey, getProductVariants, getSelectedVariant, selectedVariantItem } from "../utils/catalog/product-variants";

const STORAGE_KEY = "crwn-shopping-bag";

const readCartItems = () => {
  try {
    const items = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(items)) return [];

    return items.filter(
      (item) =>
        item &&
        (typeof item.id === "number" || typeof item.id === "string") &&
        typeof item.name === "string" &&
        Number.isFinite(item.price) &&
        item.price >= 0 &&
        Number.isSafeInteger(item.quantity) &&
        item.quantity > 0
    );
  } catch {
    return [];
  }
};

const addCartItem = (cartItems, productToAdd) => {
  const variant = getSelectedVariant(productToAdd);
  if (getProductVariants(productToAdd).length && !variant) return cartItems;
  const itemToAdd = variant ? selectedVariantItem(productToAdd, variant) : productToAdd;
  const key = getCartItemKey(itemToAdd);
  const existingCartItem = cartItems.find(
    (cartItem) => getCartItemKey(cartItem) === key
  );
  if (variant && (existingCartItem?.quantity || 0) >= variant.stock) return cartItems;

  if (existingCartItem) {
    return cartItems.map((cartItem) =>
      getCartItemKey(cartItem) === key
        ? { ...cartItem, ...itemToAdd, quantity: cartItem.quantity + 1 }
        : cartItem
    );
  }

  return [...cartItems, { ...itemToAdd, quantity: 1 }];
};

const removeCartItem = (cartItems, cartItemToRemove) => {
  const existingCartItem = cartItems.find(
    (cartItem) => getCartItemKey(cartItem) === getCartItemKey(cartItemToRemove)
  );

  if (!existingCartItem) return cartItems;

  if (existingCartItem.quantity === 1) {
    return cartItems.filter((cartItem) => getCartItemKey(cartItem) !== getCartItemKey(cartItemToRemove));
  }

  return cartItems.map((cartItem) =>
    getCartItemKey(cartItem) === getCartItemKey(cartItemToRemove)
      ? { ...cartItem, quantity: cartItem.quantity - 1 }
      : cartItem
  );
};

const clearCartItem = (cartItems, cartItemToClear) =>
  cartItems.filter((cartItem) => getCartItemKey(cartItem) !== getCartItemKey(cartItemToClear));

const chooseCartItemVariant = (cartItems, item, selectedVariant) => {
  const variant = getProductVariants(item).find((option) => option.key === selectedVariant?.key);
  if (!variant || variant.stock < 1) return cartItems;
  const oldKey = getCartItemKey(item);
  const source = cartItems.find((entry) => getCartItemKey(entry) === oldKey);
  if (!source) return cartItems;
  const existing = cartItems.find((entry) => getCartItemKey(entry) === variant.key && getCartItemKey(entry) !== oldKey);
  const quantity = source.quantity + (existing?.quantity || 0);
  if (quantity > variant.stock) return cartItems;
  const remaining = cartItems.filter((entry) => ![oldKey, variant.key].includes(getCartItemKey(entry)));
  return [...remaining, { ...selectedVariantItem(source, variant), quantity }];
};

export const CartContext = createContext({
  isCartOpen: false,
  setIsCartOpen: () => {},
  cartItems: [],
  addItemToCart: () => {},
  removeItemFromCart: () => {},
  clearItemFromCart: () => {},
  clearCart: () => {},
  chooseItemVariant: () => {},
  isCheckoutSaving: false,
  setIsCheckoutSaving: () => {},
  cartCount: 0,
  cartTotal: 0,
});

export const CartProvider = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(readCartItems);
  const [isCheckoutSaving, updateIsCheckoutSaving] = useState(false);
  const savingRef = useRef(false);
  const setIsCheckoutSaving = (saving) => {
    savingRef.current = saving;
    updateIsCheckoutSaving(saving);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // The bag still works for this visit if storage is unavailable.
    }
  }, [cartItems]);

  const addItemToCart = (productToAdd, { openDrawer = true } = {}) => {
    if (savingRef.current) return;
    setCartItems((items) => savingRef.current ? items : addCartItem(items, productToAdd));
    if (openDrawer) setIsCartOpen(true);
  };

  const removeItemFromCart = (cartItemToRemove) => {
    if (savingRef.current) return;
    setCartItems((items) => savingRef.current ? items : removeCartItem(items, cartItemToRemove));
  };

  const clearItemFromCart = (cartItemToClear) => {
    if (savingRef.current) return;
    setCartItems((items) => savingRef.current ? items : clearCartItem(items, cartItemToClear));
  };

  const chooseItemVariant = (item, variant) => {
    if (savingRef.current) return;
    setCartItems((items) => savingRef.current ? items : chooseCartItemVariant(items, item, variant));
  };

  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.quantity * item.price,
    0
  );

  const value = {
    isCartOpen,
    setIsCartOpen,
    addItemToCart,
    removeItemFromCart,
    clearItemFromCart,
    chooseItemVariant,
    isCheckoutSaving,
    setIsCheckoutSaving,
    clearCart: (purchasedItems) => setCartItems((items) => (
      !purchasedItems || items === purchasedItems ? [] : items
    )),
    cartItems,
    cartCount,
    cartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
