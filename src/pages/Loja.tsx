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
  const [activeCat, setActiveCat] = useState<string>("all");

  useEffect(() => {
    fetchShopProducts(true)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const c = (p.category || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShopProductFull[]>();
    const visible =
      activeCat === "all"
        ? products
        : activeCat === "__none__"
        ? products.filter((p) => !(p.category || "").trim())
        : products.filter((p) => (p.category || "").trim() === activeCat);
    visible.forEach((p) => {
      const key = (p.category || "").trim() || "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Outros") return 1;
      if (b === "Outros") return -1;
      return a.localeCompare(b, "pt-BR");
    });
  }, [products, activeCat]);

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
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-8">
                  <button
                    onClick={() => setActiveCat("all")}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                      activeCat === "all"
                        ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-lg scale-105"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:scale-105"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                        activeCat === c
                          ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-lg scale-105"
                          : "bg-card text-foreground border-border hover:border-primary/50 hover:scale-105"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-10">
                {grouped.map(([cat, items]) => (
                  <section key={cat}>
                    <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">
                      {cat}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map(renderCard)}
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