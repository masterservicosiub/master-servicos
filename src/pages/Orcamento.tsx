import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle, Sparkles, ShieldCheck, Clock, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import logoMasterServicos from "@/assets/logo-master-servicos.png";
import logoMasterResidenciais from "@/assets/logo-master-residenciais.png";
import { toast } from "sonner";
import { applyPhoneMask } from "@/lib/phoneMask";
import { fetchBudgetServices, findCouponByCode, type CouponRow } from "@/lib/supabase";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { trackAffiliateClick } from "@/lib/antifraud";
import { addToCart } from "@/lib/cart";
import { slugify } from "@/lib/shop";

type ServiceType = "fixed" | "area" | "quantity";

interface ServiceDef {
  id: string;
  name: string;
  type: ServiceType;
  fixedPrice?: number;
  tiers?: { maxArea: number; pricePerM2: number }[];
  qtyTiers?: { maxQty: number; pricePerUnit: number }[];
  minPrice?: number;
  imageUrl?: string;
  description?: string;
  category?: string;
}

const defaultServices: ServiceDef[] = [
  {
    id: "vazamento",
    name: "Verificar Vazamento",
    type: "fixed",
    fixedPrice: 90,
    description: "Inspeção e detecção de vazamentos hidráulicos.",
  },
  {
    id: "saneago",
    name: "Instalação Padrão Saneago",
    type: "fixed",
    fixedPrice: 250,
    description: "Instalação completa do padrão de água Saneago.",
  },
  {
    id: "caixa-agua",
    name: "Limpeza de Caixa d'Água",
    type: "fixed",
    fixedPrice: 170,
    description: "Higienização completa da caixa d'água.",
  },
  {
    id: "caixa-gordura",
    name: "Limpeza de Caixa de Gordura",
    type: "fixed",
    fixedPrice: 150,
    description: "Limpeza e desobstrução da caixa de gordura.",
  },
  {
    id: "placa-solar",
    name: "Limpeza Placa Solar (Un)",
    type: "fixed",
    fixedPrice: 12,
    description: "Preço por placa. Aumente o desempenho do seu sistema solar.",
  },
  {
    id: "rocagem-grama",
    name: "Roçagem de Grama",
    type: "area",
    tiers: [
      { maxArea: 50, pricePerM2: 6.5 },
      { maxArea: 100, pricePerM2: 4.5 },
      { maxArea: Infinity, pricePerM2: 2.5 },
    ],
    minPrice: 80,
    description: "Corte e nivelamento de grama em áreas residenciais e comerciais.",
  },
  {
    id: "rocagem-mato",
    name: "Roçagem de Mato Alto",
    type: "area",
    tiers: [
      { maxArea: 50, pricePerM2: 7.5 },
      { maxArea: 100, pricePerM2: 5.5 },
      { maxArea: Infinity, pricePerM2: 3.5 },
    ],
    minPrice: 100,
    description: "Limpeza de terrenos com mato alto e vegetação densa.",
  },
];

interface SelectedService {
  instanceId: string;
  id: string;
  name: string;
  type: ServiceType;
  observation: string;
  quantity: number;
  width: number;
  height: number;
}

function calcPrice(def: ServiceDef, svc: SelectedService): number {
  if (def.type === "fixed") {
    return (def.fixedPrice ?? 0) * svc.quantity;
  }
  if (def.type === "quantity") {
    const qty = Math.max(1, svc.quantity || 1);
    const tier =
      def.qtyTiers?.find((t) => qty <= t.maxQty) ?? def.qtyTiers?.[def.qtyTiers.length - 1];
    const raw = qty * (tier?.pricePerUnit ?? 0);
    return Math.max(raw, def.minPrice ?? 0);
  }
  const area = svc.width * svc.height;
  if (area <= 0) return 0;
  const tier = def.tiers?.find((t) => area <= t.maxArea) ?? def.tiers?.[def.tiers.length - 1];
  const raw = area * (tier?.pricePerM2 ?? 0);
  return Math.max(raw, def.minPrice ?? 0);
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface OrcamentoProps {
  kind?: "residencial" | "grafico";
  pageTitle?: string;
  pageSubtitle?: string;
}

const Orcamento = ({ kind = "residencial", pageTitle = "Solicite seu Orçamento", pageSubtitle = "Preencha seus dados, escolha os serviços e envie sua solicitação." }: OrcamentoProps = {}) => {
  const navigate = useNavigate();
  const companyInfo = useCompanyInfo();
  const [availableServices, setAvailableServices] = useState<ServiceDef[]>(kind === "residencial" ? defaultServices : []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [currentServiceId, setCurrentServiceId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRow | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [clientSession, setClientSession] = useState<{ name: string; email: string; phone: string; address: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");

  useEffect(() => {
    // capture affiliate referral code from URL ?ref=CODE and persist
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        const code = ref.trim().toUpperCase();
        localStorage.setItem("affiliate_ref", code);
        // track click for antifraud analytics (non-blocking)
        trackAffiliateClick(code).catch(() => {});
      }
    } catch {}
    try {
      const raw = localStorage.getItem("client_session");
      if (raw) {
        const c = JSON.parse(raw);
        setClientSession(c);
        if (c.name && !name) setName(c.name);
        if (c.phone && !phone) setPhone(c.phone);
        if (c.email && !email) setEmail(c.email);
        if (c.address && !address) setAddress(c.address);
      }
    } catch {}
    fetchBudgetServices(kind)
      .then((data) => {
        if (data.length > 0) {
          const mapped: ServiceDef[] = data.map((bs) => {
            const rawTiers = (bs.tiers as any[]) || undefined;
            const isQty = bs.type === "quantity";
            return {
              id: bs.id!,
              name: bs.name,
              type: bs.type as ServiceType,
              fixedPrice: bs.fixed_price,
              tiers: !isQty
                ? rawTiers?.map((t: any) => ({
                    maxArea: t.maxArea === null ? Infinity : t.maxArea,
                    pricePerM2: t.pricePerM2,
                  }))
                : undefined,
              qtyTiers: isQty
                ? rawTiers?.map((t: any) => ({
                    maxQty: t.maxQty === null ? Infinity : t.maxQty,
                    pricePerUnit: t.pricePerUnit,
                  }))
                : undefined,
              minPrice: bs.min_price,
              imageUrl: bs.image_url || "",
              description: bs.description || "",
              category: bs.category || "",
            };
          });
          setAvailableServices(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const addService = (id?: string) => {
    const targetId = id ?? currentServiceId;
    if (!targetId) return;
    const service = availableServices.find((s) => s.id === targetId);
    if (!service) return;
    // For fixed services, prevent duplicates (use quantity instead).
    // For area services, allow multiple instances with different sizes.
    if (service.type === "fixed" && selectedServices.find((s) => s.id === targetId)) {
      toast.error("Este serviço já foi adicionado. Aumente a quantidade.");
      return;
    }
    const instanceId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${service.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSelectedServices([
      ...selectedServices,
      { instanceId, id: service.id, name: service.name, type: service.type, observation: "", quantity: 1, width: 0, height: 0 },
    ]);
    setCurrentServiceId("");
  };

  const removeService = (instanceId: string) => {
    setSelectedServices(selectedServices.filter((s) => s.instanceId !== instanceId));
  };

  const updateField = (instanceId: string, field: keyof SelectedService, value: string | number) => {
    setSelectedServices(
      selectedServices.map((s) => (s.instanceId === instanceId ? { ...s, [field]: value } : s)),
    );
  };

  const subtotal = useMemo(() => {
    return selectedServices.reduce((sum, svc) => {
      const def = availableServices.find((d) => d.id === svc.id);
      return sum + (def ? calcPrice(def, svc) : 0);
    }, 0);
  }, [selectedServices, availableServices]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    let base = 0;
    if (appliedCoupon.applies_to === "all") {
      base = subtotal;
    } else if (appliedCoupon.service_id) {
      const svc = selectedServices.find((s) => s.id === appliedCoupon.service_id);
      if (svc) {
        const def = availableServices.find((d) => d.id === svc.id);
        base = def ? calcPrice(def, svc) : 0;
      }
    }
    if (base <= 0) return 0;
    if (appliedCoupon.discount_type === "percent") {
      return Math.min(base, base * (Number(appliedCoupon.discount_value) / 100));
    }
    return Math.min(base, Number(appliedCoupon.discount_value));
  }, [appliedCoupon, subtotal, selectedServices, availableServices]);

  const total = Math.max(0, subtotal - discount);

  const clientDiscount = useMemo(() => {
    if (!clientSession) return 0;
    return Math.max(0, (subtotal - discount) * 0.03);
  }, [clientSession, subtotal, discount]);

  const finalTotal = Math.max(0, total - clientDiscount);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      toast.error("Digite um código de cupom.");
      return;
    }
    setValidatingCoupon(true);
    try {
      const coupon = await findCouponByCode(code);
      if (!coupon) {
        toast.error("Cupom inválido ou inativo.");
        setAppliedCoupon(null);
        return;
      }
      if (coupon.applies_to === "service" && coupon.service_id) {
        const hasService = selectedServices.some((s) => s.id === coupon.service_id);
        if (!hasService) {
          const svcDef = availableServices.find((d) => d.id === coupon.service_id);
          toast.error(`Este cupom é válido apenas para: ${svcDef?.name ?? "serviço específico"}.`);
          setAppliedCoupon(null);
          return;
        }
      }
      setAppliedCoupon(coupon);
      toast.success(`Cupom "${coupon.code}" aplicado!`);
    } catch {
      toast.error("Erro ao validar cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0) {
      toast.error("Adicione pelo menos um serviço.");
      return;
    }
    // Validate each selected service has the required inputs
    for (const svc of selectedServices) {
      const def = availableServices.find((d) => d.id === svc.id);
      if (!def) continue;
      if (def.type === "area" && (svc.width <= 0 || svc.height <= 0)) {
        toast.error(`Informe largura e comprimento para "${svc.name}".`);
        return;
      }
      if ((def.type === "fixed" || def.type === "quantity") && svc.quantity < 1) {
        toast.error(`Quantidade inválida para "${svc.name}".`);
        return;
      }
    }
    // Push each configured service to the shared cart, preserving the
    // current billing logic (calcPrice handles fixed / area-tiers / qty-tiers).
    selectedServices.forEach((svc) => {
      const def = availableServices.find((d) => d.id === svc.id)!;
      const price = calcPrice(def, svc);
      const area = def.type === "area" ? svc.width * svc.height : 0;
      const qty = def.type === "area" ? 1 : Math.max(1, svc.quantity || 1);
      const mode: "unit" | "area" | "fixed" =
        def.type === "area" ? "area" : def.type === "quantity" ? "unit" : "unit";
      addToCart({
        productId: def.id,
        slug: "",
        name: svc.name,
        image: def.imageUrl || "",
        variationId: null,
        variationLabel: def.type === "area" ? `${svc.width}m x ${svc.height}m` : null,
        mode,
        qty,
        area,
        unitPrice: price,
        notes: svc.observation?.trim().slice(0, 500) || "",
      });
    });
    toast.success("Serviços adicionados ao carrinho!");
    navigate("/carrinho");
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/10">
          <div className="text-center px-4 animate-fade-in-up">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center mx-auto mb-6 shadow-2xl animate-float">
              <CheckCircle className="w-12 h-12" />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Orçamento Enviado!</span>
            </h2>
            <p className="text-muted-foreground mb-2">
              Obrigado, <strong>{name}</strong>! Recebemos sua solicitação.
            </p>
            <p className="text-muted-foreground mb-8">
              Entraremos em contato em breve pelo telefone ou e-mail informado.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedServices([]);
                setName("");
                setPhone("");
                setEmail("");
                setAddress("");
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-8 py-3.5 rounded-xl font-bold hover:scale-105 hover:shadow-2xl transition-all shadow-xl"
            >
              <Sparkles className="w-5 h-5" /> Novo Orçamento
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle} — Master Soluções</title>
        <meta name="description" content={pageSubtitle} />
        <meta property="og:title" content={`${pageTitle} — Master Soluções`} />
        <meta property="og:description" content={pageSubtitle} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://masterservicos.lovable.app/master-servicos" />
        <meta property="og:image" content="https://masterservicos.lovable.app/__l5e/assets-v1/40765529-6010-4dae-beb2-759346072eac/logo-master-servicos.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Master Serviços" />
        <meta property="og:site_name" content="Master Soluções" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://masterservicos.lovable.app/__l5e/assets-v1/40765529-6010-4dae-beb2-759346072eac/logo-master-servicos.png" />
      </Helmet>
      <div className="min-h-screen">
      <Header />
      <div className="pt-16 bg-background">
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
                src={kind === "grafico" ? logoMasterServicos : logoMasterResidenciais}
                alt="Master Serviços"
                className="h-32 md:h-40 w-auto drop-shadow-2xl"
              />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 animate-fade-in-up [animation-delay:120ms] drop-shadow-lg">
              {pageTitle}
            </h1>
            <p className="text-primary-foreground/90 max-w-xl mx-auto animate-fade-in-up [animation-delay:240ms]">
              {pageSubtitle}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/90 animate-fade-in-up [animation-delay:360ms]">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Garantia Total</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Resposta Rápida</div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> 100% Online</div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-8">
            {!clientSession && (
              <div className="bg-gradient-to-r from-accent/15 to-orange-500/10 border-2 border-accent/40 rounded-2xl p-5 text-sm text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fade-in-up">
                <span>
                  💡 <strong>Cadastre-se como Cliente</strong> e ganhe{" "}
                  <strong className="bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">
                    3% de desconto
                  </strong>{" "}
                  automático em todos os serviços.
                </span>
                <a
                  href="/cliente"
                  className="bg-gradient-to-r from-accent to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 hover:shadow-xl transition-all whitespace-nowrap shadow-lg"
                >
                  Criar conta Cliente grátis
                </a>
              </div>
            )}
            {clientSession && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 text-sm text-foreground shadow-lg animate-fade-in-up">
                ✅ Você está logado como <strong>{clientSession.name}</strong> — desconto de <strong>3%</strong> aplicado automaticamente.
              </div>
            )}
            {/* Service Selection */}
            <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg hover:shadow-xl transition-shadow animate-fade-in-up">
              <h2 className="text-xl font-bold text-card-foreground mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm">2</span>
                Catálogo de Serviços
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Toque em um serviço para ver os detalhes e adicionar ao carrinho.
              </p>
              {(() => {
                const cats = Array.from(
                  new Set(availableServices.map((s) => (s.category || "").trim()).filter(Boolean)),
                );
                if (cats.length === 0) return null;
                const tabs = ["Todos", ...cats];
                return (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {tabs.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setActiveCategory(c)}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                          activeCategory === c
                            ? "bg-gradient-to-r from-primary to-accent text-white border-transparent shadow-lg scale-105"
                            : "bg-card text-foreground border-border hover:border-primary/50 hover:scale-105"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                );
              })()}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableServices
                  .filter(
                    (s) =>
                      activeCategory === "Todos" ||
                      (s.category || "").trim() === activeCategory,
                  )
                  .map((s, idx) => {
                  return (
                    <Link
                      to={`/master-servicos/${slugify(s.name)}`}
                      key={s.id}
                      style={{ animationDelay: `${idx * 60}ms` }}
                      className="group rounded-2xl border-2 bg-card overflow-hidden flex flex-col transition-all shadow-sm hover:-translate-y-1 hover:shadow-2xl animate-fade-in-up border-border hover:border-primary/50"
                    >
                      <div className="aspect-[4/3] bg-background overflow-hidden flex items-center justify-center">
                        {s.imageUrl ? (
                          <img
                            src={s.imageUrl}
                            alt={s.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem imagem</span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-semibold text-foreground leading-tight">{s.name}</h3>
                        {s.category && (
                          <span className="inline-block self-start mt-1 text-[10px] uppercase tracking-wide bg-gradient-to-r from-primary/10 to-accent/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                            {s.category}
                          </span>
                        )}
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.description}</p>
                        )}
                        <div className="mt-3 mb-3 text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {s.type === "fixed"
                            ? formatBRL(s.fixedPrice ?? 0)
                            : `A partir de ${formatBRL(s.minPrice ?? 0)} • por m²`}
                        </div>
                        <span className="mt-auto w-full bg-gradient-to-r from-primary to-accent text-white px-3 py-2.5 rounded-xl text-sm font-semibold text-center transition-all group-hover:shadow-lg">
                          Ver detalhes
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Orcamento;
