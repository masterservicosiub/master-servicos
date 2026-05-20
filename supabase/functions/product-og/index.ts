// Edge function: renders HTML with Open Graph meta tags for a product,
// so when the link is shared on WhatsApp/Facebook/etc the primary image previews.
// Browsers (non-crawlers) get redirected to the SPA /produto/:slug route.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://mastersolucoes.lovable.app";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isCrawler(ua: string): boolean {
  return /facebookexternalhit|whatsapp|twitterbot|linkedinbot|slackbot|telegrambot|discordbot|googlebot|bingbot|pinterest|skypeuripreview/i.test(ua);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // path: /product-og/<slug>  OR  ?slug=<slug>
  const parts = url.pathname.split("/").filter(Boolean);
  const slug = parts[parts.length - 1] !== "product-og" ? parts[parts.length - 1] : url.searchParams.get("slug") || "";

  if (!slug) {
    return new Response("Missing slug", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  const { data: product } = await supabase
    .from("shop_products")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) {
    return new Response("Product not found", { status: 404, headers: corsHeaders });
  }

  const { data: imgs } = await supabase
    .from("shop_product_images")
    .select("image_url, is_primary, sort_order")
    .eq("product_id", (product as any).id)
    .order("sort_order");

  const primary =
    ((imgs as any[]) || []).find((i) => i.is_primary)?.image_url ||
    ((imgs as any[]) || [])[0]?.image_url ||
    "";

  const productUrl = `${SITE}/produto/${(product as any).slug}`;
  const ua = req.headers.get("user-agent") || "";

  // Real browser → redirect to SPA
  if (!isCrawler(ua)) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: productUrl },
    });
  }

  const title = esc((product as any).name);
  const desc = esc(((product as any).description || "").slice(0, 200));

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${esc(productUrl)}" />
${primary ? `<meta property="og:image" content="${esc(primary)}" />` : ""}
${primary ? `<meta name="twitter:card" content="summary_large_image" />` : ""}
<meta http-equiv="refresh" content="0; url=${esc(productUrl)}" />
</head>
<body>
<p>Redirecionando para <a href="${esc(productUrl)}">${title}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
