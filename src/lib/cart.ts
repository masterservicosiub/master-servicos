export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  variationId: string | null;
  variationLabel: string | null;
  mode: "unit" | "area" | "fixed";
  qty: number;
  area: number;
  unitPrice: number; // already-resolved per-line subtotal
}

const KEY = "shop_cart_v1";
const EVT = "shop_cart_changed";

export function readCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVT));
}

export function addToCart(item: CartItem) {
  const items = readCart();
  items.push({ ...item, productId: item.productId, variationId: item.variationId });
  writeCart(items);
}

export function removeFromCart(index: number) {
  const items = readCart();
  items.splice(index, 1);
  writeCart(items);
}

export function clearCart() {
  writeCart([]);
}

export function cartCount(): number {
  return readCart().length;
}

export function subscribeCart(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}