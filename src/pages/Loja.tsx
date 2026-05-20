import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
        to={`/produto/${p.slug}`}
        key={p.id}
        className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-lg transition-shadow"
      >
        <div className="aspect-square bg-muted overflow-hidden">
          {img ? (
            <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Sem imagem
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-card-foreground line-clamp-2">{p.name}</h3>
          {from > 0 && (
            <p className="text-primary font-bold mt-2">
              A partir de R$ {from.toFixed(2)}
            </p>
          )}
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
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center mb-10">
            <h1 className="sr-only">Angelo Design</h1>
            <img
              src={angeloLogo}
              alt="Angelo Design - Serviços Gráficos"
              className="mx-auto w-full max-w-md md:max-w-lg h-auto"
            />
            <p className="text-muted-foreground mt-2">
              Produtos gráficos personalizados com entrega rápida em Itumbiara e região.
            </p>
          </div>

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
                    className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                      activeCat === "all"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-card-foreground border-border hover:border-primary"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setActiveCat(c)}
                      className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
                        activeCat === c
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-card-foreground border-border hover:border-primary"
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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