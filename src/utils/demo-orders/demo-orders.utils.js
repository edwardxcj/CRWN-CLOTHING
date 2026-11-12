const storagePrefix = (userId) => userId
  ? `crwn-demo-order:user:${encodeURIComponent(userId)}:`
  : "crwn-demo-order:guest:";

const orderIdPattern = /^DEMO-(?:[0-9A-F]{4}-){2}[0-9A-F]{4}$/;

export const isDemoOrderId = (id) => typeof id === "string" && orderIdPattern.test(id);

const makeOrderId = () => {
  const bytes = window.crypto.getRandomValues(new Uint8Array(6));
  const code = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `DEMO-${code.match(/.{4}/g).join("-").toUpperCase()}`;
};

const isDemoOrderItem = (item) => Boolean(
  item &&
  (typeof item.id === "string" || Number.isFinite(item.id)) &&
  typeof item.name === "string" &&
  Number.isFinite(item.price) && item.price >= 0 &&
  Number.isSafeInteger(item.quantity) && item.quantity > 0
);

const isDemoOrder = (order) => Boolean(
  order &&
  isDemoOrderId(order.id) &&
  typeof order.placedAt === "string" && Number.isFinite(Date.parse(order.placedAt)) &&
  Array.isArray(order.items) && order.items.length > 0 && order.items.every(isDemoOrderItem) &&
  Number.isSafeInteger(order.count) && order.count > 0 &&
  Number.isFinite(order.total) && order.total >= 0
);

const copyOrderItems = (items) => items.map(({ id, name, price, quantity }) => ({ id, name, price, quantity }));

export const readDemoOrder = (order, id) => {
  if (!isDemoOrder(order) || order.id !== id) return null;
  const { placedAt, items, count, total } = order;
  return { id, placedAt, items: copyOrderItems(items), count, total };
};

const parseDemoOrder = (stored, id) => {
  try {
    return readDemoOrder(JSON.parse(stored), id);
  } catch {
    return null;
  }
};

export const buildDemoOrder = (cartItems) => {
  const items = copyOrderItems(cartItems);
  const order = {
    id: makeOrderId(),
    placedAt: new Date().toISOString(),
    items,
    count: items.reduce((count, item) => count + item.quantity, 0),
    total: items.reduce((total, item) => total + item.price * item.quantity, 0),
  };

  if (!isDemoOrder(order)) throw new Error("Invalid demo order");
  return order;
};

export const createDemoOrder = (cartItems, userId) => {
  const order = buildDemoOrder(cartItems);
  // One key per order allows separate tabs to add orders without rewriting each other's history.
  const key = `${storagePrefix(userId)}${order.id}`;
  if (window.localStorage.getItem(key) !== null) throw new Error("Demo order reference already used");
  window.localStorage.setItem(key, JSON.stringify(order));
  return order;
};

export const getDemoOrder = (orderId, userId) => {
  if (!isDemoOrderId(orderId)) return null;
  const stored = window.localStorage.getItem(`${storagePrefix(userId)}${orderId}`);
  return parseDemoOrder(stored, orderId);
};

export const listDemoOrders = (userId) => {
  if (!userId) return [];

  const prefix = storagePrefix(userId);
  const orders = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;
    const order = getDemoOrder(key.slice(prefix.length), userId);
    if (order) orders.push(order);
  }

  return orders.sort((first, second) => second.placedAt.localeCompare(first.placedAt));
};

const orderDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export const formatDemoOrderDate = (date) => orderDate.format(new Date(date));

export const demoReceiptPath = (orderId) => `/checkout?receipt=${encodeURIComponent(orderId)}`;
