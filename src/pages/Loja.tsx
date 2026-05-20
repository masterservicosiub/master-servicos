import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetchShopProducts(true)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
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
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Loja;