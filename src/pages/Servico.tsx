import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ShoppingCart, Eye, Share2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { fetchBudgetServices, type BudgetServiceRow } from "@/lib/supabase";
import { addToCart } from "@/lib/cart";
import { slugify } from "@/lib/shop";
import { toast } from "sonner";

type ServiceType = "fixed" | "area" | "quantity";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcPrice(
  svc: BudgetServiceRow,
  qty: number,
  width: number,
  height: number,
): number {
  if (svc.type === "fixed") return (svc.fixed_price ?? 0) * Math.max(1, qty);
  if (svc.type === "quantity") {
    const q = Math.max(1, qty || 1);
    const tiers = (svc.tiers as any[]) || [];
    const tier =
      tiers.find((t) => q <= (t.maxQty === null ? Infinity : t.maxQty)) ?? tiers[tiers.length - 1];
    const raw = q * (tier?.pricePerUnit ?? 0);
    return Math.max(raw, svc.min_price ?? 0);
  }
  const area = Math.max(0, width) * Math.max(0, height);
  if (area <= 0) return 0;
  const tiers = (svc.tiers as any[]) || [];
  const tier =
    tiers.find((t) => area <= (t.maxArea === null ? Infinity : t.maxArea)) ?? tiers[tiers.length - 1];
  const raw = area * (tier?.pricePerM2 ?? 0);
  return Math.max(raw, svc.min_price ?? 0);
}

const Servico = () => {
  const { id = "" } = useParams();
  const param = id;
  const nav = useNavigate();
  const [service, setService] = useState<BudgetServiceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBudgetServices("residencial"), fetchBudgetServices("grafico")])
      .then(([a, b]) => {
        const all = [...a, ...b];
        const found =
          all.find((s) => slugify(s.name) === param) ||
          all.find((s) => s.id === param) ||
          null;
        setService(found);
      })
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [param]);

  const area = useMemo(
    () => Math.max(0, width) * Math.max(0, height),
    [width, height],
  );
  const price = useMemo(
    () => (service ? calcPrice(service, qty, width, height) : 0),
    [service, qty, width, height],
  );

  const handleAdd = () => {
    if (!service) return;
    const t = service.type as ServiceType;
    if (t === "area" && area <= 0) {
      toast.error("Informe a largura e o comprimento");
      return;
    }
    addToCart({
      productId: service.id!,
      slug: "",
      name: service.name,
      image: service.image_url || "",
      variationId: null,
      variationLabel: t === "area" ? `${width}m x ${height}m` : null,
      mode: t === "area" ? "area" : "unit",
      qty: t === "area" ? 1 : Math.max(1, qty || 1),
      area: t === "area" ? area : 0,
      unitPrice: price,
      notes: notes.trim().slice(0, 500),
    });
    toast.success("Adicionado ao carrinho");
    setNotes("");
    setAdded(true);
  };

  const handleShare = async () => {
    if (!service) return;
    const url = `https://masteriub.com.br/servico/${slugify(service.name)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: service.name, text: service.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      } catch {
        toast.error("Não foi possível compartilhar");
      }
    }
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

  if (!service) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 pt-24 container mx-auto px-4 py-10 text-center">
          <p className="text-muted-foreground mb-4">Serviço não encontrado.</p>
          <Link to="/master-servicos" className="text-primary underline">
            Voltar
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const t = service.type as ServiceType;
  const tiers = (service.tiers as any[]) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{service.name} — Master Soluções</title>
        <meta name="description" content={(service.description || service.name).slice(0, 160)} />
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
            <div className="aspect-square bg-muted rounded-xl overflow-hidden">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{service.name}</h1>
              {service.category && (
                <span className="inline-block mt-2 text-[10px] uppercase tracking-wide bg-gradient-to-r from-primary/10 to-accent/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                  {service.category}
                </span>
              )}
              {service.description && (
                <p className="text-muted-foreground mt-3 whitespace-pre-wrap">{service.description}</p>
              )}

              {t === "fixed" && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 h-10 rounded-md border border-input bg-background px-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Valor unitário: {formatBRL(service.fixed_price ?? 0)}
                  </p>
                </div>
              )}

              {t === "quantity" && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 h-10 rounded-md border border-input bg-background px-3"
                  />
                  {tiers.length >= 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Até {tiers[0].maxQty} un.: {formatBRL(tiers[0].pricePerUnit)}/un · até{" "}
                      {tiers[1].maxQty} un.: {formatBRL(tiers[1].pricePerUnit)}/un · acima:{" "}
                      {formatBRL(tiers[2].pricePerUnit)}/un
                      {service.min_price ? ` · Mínimo: ${formatBRL(service.min_price)}` : ""}
                    </p>
                  )}
                </div>
              )}

              {t === "area" && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Largura e comprimento (em metros)
                  </label>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Largura (m)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={width || ""}
                        onChange={(e) => setWidth(Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 h-10 rounded-md border border-input bg-background px-3"
                      />
                    </div>
                    <span className="pb-2 text-muted-foreground">×</span>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Comprimento (m)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.1"
                        value={height || ""}
                        onChange={(e) => setHeight(Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 h-10 rounded-md border border-input bg-background px-3"
                      />
                    </div>
                    <div className="pb-1 text-sm text-muted-foreground">
                      = <strong className="text-foreground">{area.toFixed(2)} m²</strong>
                    </div>
                  </div>
                  {tiers.length >= 3 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Até {tiers[0].maxArea}m²: {formatBRL(tiers[0].pricePerM2)}/m² ·{" "}
                      {tiers[0].maxArea}–{tiers[1].maxArea}m²: {formatBRL(tiers[1].pricePerM2)}/m² ·{" "}
                      +{tiers[1].maxArea}m²: {formatBRL(tiers[2].pricePerM2)}/m²
                      {service.min_price ? ` · Mínimo: ${formatBRL(service.min_price)}` : ""}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-6 p-4 bg-card border border-border rounded-xl">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-3xl font-bold text-primary">{formatBRL(price)}</p>
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
                  placeholder="Detalhes do serviço, endereço, prazo..."
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
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 border border-border"
                >
                  <Share2 className="w-4 h-4" /> Compartilhar
                </button>
                {added && (
                  <Link
                    to="/carrinho"
                    className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 border border-border"
                  >
                    <Eye className="w-4 h-4" /> Ver carrinho
                  </Link>
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

export default Servico;