// Public OG meta endpoint for social crawlers (WhatsApp, Facebook, LinkedIn, X).
// Returns static HTML with og:* tags so link previews work without SSR,
// then redirects real browsers to the SPA route.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_ORIGIN = "https://masteriub.com.br";

function slugify(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  type?: string;
}): string {
  const { title, description, image, url, type = "product" } = opts;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="${esc(type)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
${image ? `<meta property="og:image" content="${esc(image)}" />
<meta property="og:image:secure_url" content="${esc(image)}" />
<meta property="og:image:alt" content="${esc(title)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
${image ? `<meta name="twitter:image" content="${esc(image)}" />` : ""}
<meta http-equiv="refresh" content="0; url=${esc(url)}" />
</head>
<body>
<script>window.location.replace(${JSON.stringify(url)});</script>
<p>Redirecionando para <a href="${esc(url)}">${esc(title)}</a>...</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    // Accept ?type=...&slug=... or /og-share/<type>/<slug>
    let type = url.searchParams.get("type") || "";
    let slug = url.searchParams.get("slug") || "";
    if (!type || !slug) {
      const parts = url.pathname.split("/").filter(Boolean);
      // [..., "og-share", type, slug]
      const idx = parts.indexOf("og-share");
      if (idx >= 0) {
        type = type || parts[idx + 1] || "";
        slug = slug || parts[idx + 2] || "";
      }
    }
    type = (type || "").toLowerCase();
    slug = decodeURIComponent(slug || "").toLowerCase();

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let title = "Master Soluções";
    let description =
      "Soluções em Manutenção Hidráulica, Roçagem, Serviços Gráficos e Administrativos em Itumbiara e Região.";
    let image = "";
    let target = SITE_ORIGIN + "/";

    if (type === "produto" && slug) {
      const { data: p } = await supabase
        .from("shop_products")
        .select("id,name,description,slug")
        .eq("slug", slug)
        .maybeSingle();
      if (p) {
        title = (p as any).name || title;
        description = ((p as any).description || title).slice(0, 200);
        target = `${SITE_ORIGIN}/produto/${(p as any).slug}`;
        const { data: imgs } = await supabase
          .from("shop_product_images")
          .select("image_url,is_primary,sort_order")
          .eq("product_id", (p as any).id)
          .order("sort_order");
        const list = (imgs as any[]) || [];
        image = (list.find((i) => i.is_primary) || list[0])?.image_url || "";
      }
    } else if (type === "servico" && slug) {
      const { data: all } = await supabase
        .from("budget_services")
        .select("id,name,description,image_url");
      const found =
        ((all as any[]) || []).find((s) => slugify(s.name) === slug) || null;
      if (found) {
        title = found.name || title;
        description = (found.description || title).slice(0, 200);
        image = found.image_url || "";
        target = `${SITE_ORIGIN}/servico/${slugify(found.name)}`;
      }
    }

    const html = renderHtml({ title, description, image, url: target });
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (e) {
    return new Response("og-share error: " + (e as Error).message, {
      status: 500,
    });
  }
});