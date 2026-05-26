-- Add area tiers (3-tier pricing for "por m²" mode) to shop products and variations.
-- Stored as JSONB array: [{"maxArea":50,"pricePerM2":15},{"maxArea":100,"pricePerM2":12},{"maxArea":null,"pricePerM2":9}]
ALTER TABLE public.shop_products
  ADD COLUMN IF NOT EXISTS area_tiers JSONB;

ALTER TABLE public.shop_product_variations
  ADD COLUMN IF NOT EXISTS area_tiers JSONB;
