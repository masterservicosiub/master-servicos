import { supabase } from "./supabase";

export type PriceMode = "unit" | "area" | "fixed";

export interface ShopProductRow {
  id?: string;
  created_at?: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  active: boolean;
  sort_order: number;
  base_price_mode: PriceMode;
  base_unit_price: number;
  base_area_price_per_m2: number;
  base_fixed_price: number;
  base_min_price: number;
  download_url: string;
  download_label: string;
}

export interface ShopProductImageRow {
  id?: string;
  product_id?: string;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ShopProductVariationRow {
  id?: string;
  product_id?: string;
  label: string;
  price_mode: PriceMode;
  unit_price: number;
  area_price_per_m2: number;
  fixed_price: number;
  min_price: number;
  sort_order: number;
}

export interface ShopProductFull extends ShopProductRow {
  images: ShopProductImageRow[];
  variations: ShopProductVariationRow[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function fetchShopProducts(activeOnly = false): Promise<ShopProductFull[]> {
  let q = supabase.from("shop_products").select("*").order("sort_order").order("created_at");
  if (activeOnly) q = q.eq("active", true);
  const { data: prods, error } = await q;
  if (error) throw error;
  const ids = (prods || []).map((p: any) => p.id);
  if (!ids.length) return [];
  const [imgsRes, varsRes] = await Promise.all([
    supabase.from("shop_product_images").select("*").in("product_id", ids).order("sort_order"),
    supabase.from("shop_product_variations").select("*").in("product_id", ids).order("sort_order"),
  ]);
  if (imgsRes.error) throw imgsRes.error;
  if (varsRes.error) throw varsRes.error;
  return (prods as any[]).map((p) => ({
    ...p,
    images: ((imgsRes.data as any[]) || []).filter((i) => i.product_id === p.id),
    variations: ((varsRes.data as any[]) || []).filter((v) => v.product_id === p.id),
  }));
}

export async function fetchProductBySlug(slug: string): Promise<ShopProductFull | null> {
  const { data: p, error } = await supabase.from("shop_products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!p) return null;
  const [imgsRes, varsRes] = await Promise.all([
    supabase.from("shop_product_images").select("*").eq("product_id", (p as any).id).order("sort_order"),
    supabase.from("shop_product_variations").select("*").eq("product_id", (p as any).id).order("sort_order"),
  ]);
  return {
    ...(p as any),
    images: (imgsRes.data as any[]) || [],
    variations: (varsRes.data as any[]) || [],
  };
}

export async function insertShopProduct(p: Omit<ShopProductRow, "id" | "created_at">) {
  const { data, error } = await supabase.from("shop_products").insert([p]).select().single();
  if (error) throw error;
  return data as any;
}
export async function updateShopProduct(id: string, p: Partial<ShopProductRow>) {
  const { error } = await supabase.from("shop_products").update(p).eq("id", id);
  if (error) throw error;
}
export async function deleteShopProduct(id: string) {
  const { error } = await supabase.from("shop_products").delete().eq("id", id);
  if (error) throw error;
}

export async function replaceProductImages(productId: string, imgs: ShopProductImageRow[]) {
  await supabase.from("shop_product_images").delete().eq("product_id", productId);
  if (!imgs.length) return;
  const { error } = await supabase
    .from("shop_product_images")
    .insert(imgs.map((i, idx) => ({ ...i, product_id: productId, sort_order: idx })));
  if (error) throw error;
}

export async function replaceProductVariations(productId: string, vars: ShopProductVariationRow[]) {
  await supabase.from("shop_product_variations").delete().eq("product_id", productId);
  if (!vars.length) return;
  const { error } = await supabase
    .from("shop_product_variations")
    .insert(vars.map((v, idx) => ({ ...v, product_id: productId, sort_order: idx })));
  if (error) throw error;
}

export async function uploadShopProductImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("shop-products")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("shop-products").getPublicUrl(path).data.publicUrl;
}

export function primaryImage(p: ShopProductFull): string {
  const prim = p.images.find((i) => i.is_primary) || p.images[0];
  return prim?.image_url || "";
}

/** Compute price for a given product/variation choice. */
export function computePrice(
  product: ShopProductFull,
  variation: ShopProductVariationRow | null,
  qty: number,
  area: number,
): number {
  const mode: PriceMode = variation?.price_mode ?? product.base_price_mode;
  let raw = 0;
  if (mode === "fixed") raw = variation?.fixed_price ?? product.base_fixed_price;
  else if (mode === "unit") raw = (variation?.unit_price ?? product.base_unit_price) * Math.max(qty, 0);
  else raw = (variation?.area_price_per_m2 ?? product.base_area_price_per_m2) * Math.max(area, 0);
  const min = variation?.min_price ?? product.base_min_price;
  return Math.max(raw, min || 0);
}

export function startingPrice(p: ShopProductFull): number {
  const candidates: number[] = [];
  const base =
    p.base_price_mode === "fixed"
      ? p.base_fixed_price
      : p.base_price_mode === "unit"
      ? p.base_unit_price
      : p.base_area_price_per_m2;
  if (base > 0) candidates.push(Math.max(base, p.base_min_price || 0));
  for (const v of p.variations) {
    const b = v.price_mode === "fixed" ? v.fixed_price : v.price_mode === "unit" ? v.unit_price : v.area_price_per_m2;
    if (b > 0) candidates.push(Math.max(b, v.min_price || 0));
  }
  return candidates.length ? Math.min(...candidates) : 0;
}

export function modeLabel(m: PriceMode): string {
  return m === "unit" ? "por unidade" : m === "area" ? "por m²" : "fixo";
}