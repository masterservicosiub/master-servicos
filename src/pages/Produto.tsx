import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Share2, ShoppingCart, ArrowLeft, Download, Eye } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { fetchProductBySlug, computePrice, primaryImage, type ShopProductFull, type ShopProductVariationRow } from "@/lib/shop";
import { addToCart } from "@/lib/cart";
import { toast } from "sonner";

const SITE_URL = "https://mastersolucoes.lovable.app";
const OG_URL = "https://rpxlpqehpzhofxuzjbws.supabase.co/functions/v1/product-og";

const Produto = () => {
  const { slug = "" } = useParams();
  const nav = useNavigate();
  const [product, setProduct] = useState<ShopProductFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [variation, setVariation] = useState<ShopProductVariationRow | null>(null);
  const [qty, setQty] = useState(1);
  const [area, setArea] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        if (p?.variations.length) setVariation(p.variations[0]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const mode = variation?.price_mode ?? product?.base_price_mode ?? "unit";
  const price = useMemo(
    () => (product ? computePrice(product, variation, qty, area) : 0),
    [product, variation, qty, area],
  );

  // Share via the og edge function so WhatsApp/Facebook/etc fetch
  // proper OG meta (with the product's main image). The function
  // redirects real browsers to /produto/:slug.
  const shareUrl = `${OG_URL}/${slug}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: product?.name, text: product?.description?.slice(0, 140), url: shareUrl });
        return;
      } catch {
        // user cancelled or failed → fall back to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleAdd = () => {
    if (!product) return;
    addToCart({
      productId: product.id!,
      slug: product.slug,
      name: product.name,
      image: primaryImage(product),
      variationId: variation?.id ?? null,
      variationLabel: variation?.label ?? null,
      mode,
      qty: mode === "unit" ? qty : 1,
      area: mode === "area" ? area : 0,
      unitPrice: price,
      notes: notes.trim().slice(0, 500),
    });
    toast.success("Adicionado ao carrinho");
    setNotes("");
    setAdded(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 container mx-auto px-4 py-10 text-center text-muted-foreground">
          Carregando...
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 container mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground mb-4">Produto não encontrado.</p>
          <Link to="/servicos-graficos" className="text-primary underline">
            Voltar para a loja
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const mainImg = product.images[activeImg]?.image_url || primaryImage(product);
  const ogImg = primaryImage(product);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{product.name} — Master Soluções</title>
        <meta name="description" content={product.description.slice(0, 160)} />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description.slice(0, 160)} />
        {ogImg && <meta property="og:image" content={ogImg} />}
        <meta property="og:type" content="product" />
      </Helmet>
      <Header />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="aspect-square bg-muted rounded-xl overflow-hidden">
                {mainImg ? (
                  <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {product.images.map((im, i) => (
                    <button
                      key={im.id || i}
                      onClick={() => setActiveImg(i)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                        i === activeImg ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={im.image_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
              {product.description && (
                <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{product.description}</p>
              )}

              {product.variations.length > 0 && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">Variação</label>
                  <div className="flex flex-wrap gap-2">
                    {product.variations.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setVariation(v)}
                        className={`px-3 py-2 rounded-lg border text-sm ${
                          variation?.id === v.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-card-foreground hover:border-primary/50"
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "unit" && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 h-10 rounded-md border border-input bg-background px-3"
                  />
                </div>
              )}
              {mode === "area" && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">Área (m²)</label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={area}
                    onChange={(e) => setArea(Math.max(0.1, Number(e.target.value) || 0.1))}
                    className="w-32 h-10 rounded-md border border-input bg-background px-3"
                  />
                </div>
              )}

              <div className="mt-6 p-4 bg-card border border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-primary">R$ {price.toFixed(2)}</p>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                  rows={3}
                  maxLength={500}
                  placeholder="Detalhes do pedido, cores, prazo, arte de referência..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{notes.length}/500</p>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90"
                >
                  <ShoppingCart className="w-4 h-4" /> Adicionar ao carrinho
                </button>
                {added && (
                  <Link
                    to="/carrinho"
                    className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 border border-border"
                  >
                    <Eye className="w-4 h-4" /> Ver carrinho
                  </Link>
                )}
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-semibold hover:bg-accent"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar
                </button>
                {(product as any).download_url && (
                  <a
                    href={(product as any).download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-semibold hover:bg-accent"
                  >
                    <Download className="w-4 h-4" />
                    {(product as any).download_label?.trim() || "Baixar catálogo"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Produto;