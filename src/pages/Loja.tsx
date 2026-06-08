import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Clock, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { fetchShopProducts, primaryImage, startingPrice, type ShopProductFull } from "@/lib/shop";
import angeloLogo from "@/assets/angelo-design-logo.png";

const Loja = () => {
  const [products, setProducts] = useState<ShopProductFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [catPath, setCatPath] = useState<string[]>([]);

  useEffect(() => {
    fetchShopProducts(true)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const splitCat = (c: string) =>
    (c || "")
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

  // Products that match the current cascade path (prefix match on category segments)
  const filteredProducts = useMemo(() => {
    if (catPath.length === 0) return products;
    return products.filter((p) => {
      const segs = splitCat(p.category || "");
      if (segs.length < catPath.length) return false;
      return catPath.every((s, i) => segs[i] === s);
    });
  }, [products, catPath]);

  // Next-level category options at the current depth
  const nextLevelCats = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const segs = splitCat(p.category || "");
      if (segs.length <= catPath.length) return;
      if (!catPath.every((s, i) => segs[i] === s)) return;
      set.add(segs[catPath.length]);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products, catPath]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShopProductFull[]>();
    filteredProducts.forEach((p) => {
      const segs = splitCat(p.category || "");
      const key = segs.join(" › ") || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Outros") return 1;
      if (b === "Outros") return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [filteredProducts]);

  const renderCard = (p: ShopProductFull) => {
    const img = primaryImage(p);
    const from = startingPrice(p);
    return (
      <Link
        to={`/angelo-design/${p.slug}`}
        key={p.id}
        className="group rounded-2xl border-2 bg-card overflow-hidden flex flex-col transition-all shadow-sm hover:-translate-y-1 hover:shadow-2xl animate-fade-in-up border-border hover:border-primary/50"
      >
        <div className="aspect-[4/3] bg-background overflow-hidden flex items-center justify-center">
          {img ? (
            <img
              src={img}
              alt={p.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <span className="text-xs text-muted-foreground">Sem imagem</span>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold text-foreground leading-tight">{p.name}</h3>
          {p.category && (
            <span className="inline-block self-start mt-1 text-[10px] uppercase tracking-wide bg-gradient-to-r from-primary/10 to-accent/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {p.category}
            </span>
          )}
          {p.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{p.description}</p>
          )}
          {from > 0 && (
            <div className="mt-3 mb-3 text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              A partir de R$ {from.toFixed(2)}
            </div>
          )}
          <span className="mt-auto w-full bg-gradient-to-r from-primary to-accent text-white px-3 py-2.5 rounded-xl text-sm font-semibold text-center transition-all group-hover:shadow-lg">
            Ver detalhes
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Angelo Design — Master Soluções</title>
        <meta name="description" content="Cartões, banners, panfletos e produtos gráficos sob medida." />
        <meta property="og:title" content="Angelo Design — Master Soluções" />
        <meta property="og:description" content="Cartões, banners, panfletos e produtos gráficos sob medida." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://masterservicos.lovable.app/angelo-design" />
        <meta property="og:image" content="https://masterservicos.lovable.app/__l5e/assets-v1/60349e70-2de4-406f-9765-50e588a4862e/angelo-design-logo.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Angelo Design - Serviços Gráficos" />
        <meta property="og:site_name" content="Master Soluções" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://masterservicos.lovable.app/__l5e/assets-v1/60349e70-2de4-406f-9765-50e588a4862e/angelo-design-logo.png" />
      </Helmet>
      <Header />
      <main className="flex-1 pt-16 bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 md:py-24 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-[24rem] h-[24rem] rounded-full bg-white/20 blur-3xl animate-blob" />
            <div className="absolute top-10 -right-32 w-[22rem] h-[22rem] rounded-full bg-accent/40 blur-3xl animate-blob [animation-delay:2s]" />
            <div className="absolute -bottom-32 left-1/3 w-[26rem] h-[26rem] rounded-full bg-primary-foreground/10 blur-3xl animate-blob [animation-delay:4s]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent_60%)]" />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="mb-6 animate-fade-in-up flex justify-center">
              <img
                src={angeloLogo}
                alt="Angelo Design - Serviços Gráficos"
                className="h-32 md:h-40 w-auto drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 animate-fade-in-up [animation-delay:120ms] drop-shadow-lg">
              Angelo Design
            </h1>
            <p className="text-primary-foreground/90 max-w-xl mx-auto animate-fade-in-up [animation-delay:240ms]">
              Produtos gráficos personalizados com entrega rápida em Itumbiara e região.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/90 animate-fade-in-up [animation-delay:360ms]">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Qualidade Garantida</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Entrega Rápida</div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> 100% Online</div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando produtos...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhum produto cadastrado ainda. Volte em breve!
            </p>
          ) : (
            <>
              <div className="mb-8 space-y-3">
                {/* Breadcrumb cascade */}
                <div className="flex flex-wrap items-center gap-2 justify-center text-sm">
                  <button
                    onClick={() => setCatPath([])}
                    className={`px-3 py-1 rounded-full font-semibold border-2 transition-all ${
                      catPath.length === 0
                        ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow"
                        : "bg-card text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    Todos
                  </button>
                  {catPath.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-muted-foreground">›</span>
                      <button
                        onClick={() => setCatPath(catPath.slice(0, i + 1))}
                        className="px-3 py-1 rounded-full font-semibold border-2 bg-gradient-to-r from-primary to-accent text-white border-transparent shadow"
                      >
                        {seg}
                      </button>
                    </div>
                  ))}
                </div>
                {/* Next-level options */}
                {nextLevelCats.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {nextLevelCats.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCatPath([...catPath, c])}
                        className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 bg-card text-foreground border-border hover:border-primary/50 hover:scale-105 transition-all"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-10">
                {grouped.map(([cat, items]) => (
                  <section key={cat}>
                    <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">
                      {cat}
                    </h2>
              <div className="max-w-3xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map(renderCard)}
                </div>
              </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Loja;