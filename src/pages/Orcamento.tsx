import { useState, useMemo, useEffect } from "react";
import { Trash2, Plus, Send, CheckCircle, Tag, X, Sparkles, ShieldCheck, Clock, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { sendToGoogleSheets } from "@/lib/googleSheets";
import { applyPhoneMask } from "@/lib/phoneMask";
import { insertOrder, fetchBudgetServices, findCouponByCode, type CouponRow } from "@/lib/supabase";
import { sendOrderEmailNotification } from "@/lib/emailNotification";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import {
  getDeviceFingerprint,
  getClientIp,
  trackAffiliateClick,
  runFraudCheck,
} from "@/lib/antifraud";

type ServiceType = "fixed" | "area";

interface ServiceDef {
  id: string;
  name: string;
  type: ServiceType;
  fixedPrice?: number;
  tiers?: { maxArea: number; pricePerM2: number }[];
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
  const area = svc.width * svc.height;
  if (area <= 0) return 0;
  const tier = def.tiers?.find((t) => area <= t.maxArea) ?? def.tiers?.[def.tiers.length - 1];
  const raw = area * (tier?.pricePerM2 ?? 0);
  return Math.max(raw, def.minPrice ?? 0);
}

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const Orcamento = () => {
  const companyInfo = useCompanyInfo();
  const [availableServices, setAvailableServices] = useState<ServiceDef[]>(defaultServices);
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
    fetchBudgetServices()
      .then((data) => {
        if (data.length > 0) {
          const mapped: ServiceDef[] = data.map((bs) => ({
            id: bs.id!,
            name: bs.name,
            type: bs.type as ServiceType,
            fixedPrice: bs.fixed_price,
            tiers: bs.tiers?.map((t: any) => ({
              maxArea: t.maxArea === null ? Infinity : t.maxArea,
              pricePerM2: t.pricePerM2,
            })),
            minPrice: bs.min_price,
            imageUrl: bs.image_url || "",
            description: bs.description || "",
            category: bs.category || "",
          }));
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
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Preencha nome, contato e endereço.");
      return;
    }
    if (selectedServices.length === 0) {
      toast.error("Adicione pelo menos um serviço ao orçamento.");
      return;
    }

    const servicesLines = selectedServices.map((svc) => {
      const def = availableServices.find((d) => d.id === svc.id)!;
      const price = calcPrice(def, svc);
      let detail = svc.name;
      if (svc.width && svc.height) {
        detail += ` (${svc.width}x${svc.height}m = ${(svc.width * svc.height).toFixed(1)}m²)`;
      } else if (svc.quantity > 1) {
        detail += ` (x${svc.quantity})`;
      }
      detail += ` - ${formatBRL(price)}`;
      return detail;
    });
    if (appliedCoupon && discount > 0) {
      servicesLines.push(`Cupom ${appliedCoupon.code} (-${formatBRL(discount)})`);
    }
    if (clientSession && clientDiscount > 0) {
      servicesLines.push(`Desconto Cliente 3% (-${formatBRL(clientDiscount)})`);
    }
    const servicesText = servicesLines.join(" | ");

    // Save to Supabase
    try {
      const affiliate_code =
        (typeof window !== "undefined" && localStorage.getItem("affiliate_ref")) || undefined;
      const fingerprint = getDeviceFingerprint();
      const ip = await getClientIp();

      let fraud_status = "ok";
      let fraud_reasons = "";
      let finalAffiliate = affiliate_code;

      // Clientes logados não geram cashback para afiliados
      if (clientSession) {
        finalAffiliate = undefined;
      }

      if (finalAffiliate) {
        try {
          const result = await runFraudCheck({
            affiliate_code: finalAffiliate,
            client_phone: phone.trim(),
            client_email: email.trim(),
            client_name: name.trim(),
            fingerprint,
            ip,
          });
          fraud_status = result.status;
          fraud_reasons = result.reasons.join("; ");
          if (result.status === "blocked") {
            // Drop the affiliate link entirely so the affiliate gets no credit
            finalAffiliate = undefined;
          }
        } catch {
          // antifraud failure should not block the order
        }
      }

      await insertOrder({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        services: servicesText,
        total: finalTotal,
        status: "Novo",
        notes: "",
        affiliate_code: finalAffiliate,
        fraud_status,
        fraud_reasons,
        client_fingerprint: fingerprint,
        client_ip: ip || undefined,
      });
    } catch (err) {
      console.error("Erro ao salvar no Supabase:", err);
    }

    // Also send to Google Sheets
    const order = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      services: selectedServices.map((svc) => {
        const def = availableServices.find((d) => d.id === svc.id)!;
        return { ...svc, price: calcPrice(def, svc) };
      }),
      total: finalTotal,
      status: "Novo",
      notes: "",
    };
    sendToGoogleSheets(order).catch(console.error);

    // Send email notification
    sendOrderEmailNotification({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      services: servicesText,
      total: finalTotal,
    }).catch(console.error);

    // Enviar pedido por WhatsApp
    const whatsappLines = [
      `*Novo Orçamento*`,
      ``,
      `*Cliente:* ${name.trim()}`,
      `*Telefone:* ${phone.trim()}`,
      email.trim() ? `*E-mail:* ${email.trim()}` : null,
      `*Endereço:* ${address.trim()}`,
      ``,
      `*Serviços:*`,
      ...selectedServices.map((svc) => {
        const def = availableServices.find((d) => d.id === svc.id)!;
        const price = calcPrice(def, svc);
        let detail = `• ${svc.name}`;
        if (svc.width && svc.height) {
          detail += ` (${svc.width}x${svc.height}m = ${(svc.width * svc.height).toFixed(1)}m²)`;
        } else if (svc.quantity > 1) {
          detail += ` (x${svc.quantity})`;
        }
        detail += ` — ${formatBRL(price)}`;
        if (svc.observation) detail += `\n   Obs: ${svc.observation}`;
        return detail;
      }),
      appliedCoupon && discount > 0 ? `\n*Cupom:* ${appliedCoupon.code} (-${formatBRL(discount)})` : null,
      clientSession && clientDiscount > 0 ? `*Desconto Cliente 3%:* -${formatBRL(clientDiscount)}` : null,
      ``,
      `*Total: ${formatBRL(finalTotal)}*`,
    ].filter(Boolean);
    const whatsappMessage = encodeURIComponent(whatsappLines.join("\n"));
    window.open(`https://wa.me/${companyInfo.company_whatsapp}?text=${whatsappMessage}`, "_blank");

    setSubmitted(true);
    toast.success("Orçamento enviado com sucesso!");
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
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-sm font-semibold mb-6 animate-fade-in-up">
              <Sparkles className="w-4 h-4" />
              Orçamento rápido e sem compromisso
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold mb-3 animate-fade-in-up [animation-delay:120ms] drop-shadow-lg">
              Solicite seu Orçamento
            </h1>
            <p className="text-primary-foreground/90 max-w-xl mx-auto animate-fade-in-up [animation-delay:240ms]">
              Preencha seus dados, escolha os serviços e envie sua solicitação.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/90 animate-fade-in-up [animation-delay:360ms]">
              <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Garantia Total</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Resposta Rápida</div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> 100% Online</div>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
            {!clientSession && (
              <div className="bg-gradient-to-r from-accent/15 to-orange-500/10 border-2 border-accent/40 rounded-2xl p-5 text-sm text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg animate-fade-in-up">
                <span>
                  💡 <strong>Cadastre-se</strong> e ganhe{" "}
                  <strong className="bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">
                    3% de desconto
                  </strong>{" "}
                  automático em todos os serviços.
                </span>
                <a
                  href="/cliente"
                  className="bg-gradient-to-r from-accent to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:scale-105 hover:shadow-xl transition-all whitespace-nowrap shadow-lg"
                >
                  Criar conta grátis
                </a>
              </div>
            )}
            {clientSession && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-5 text-sm text-foreground shadow-lg animate-fade-in-up">
                ✅ Você está logado como <strong>{clientSession.name}</strong> — desconto de <strong>3%</strong> aplicado automaticamente.
              </div>
            )}
            {/* Client Info */}
            <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg hover:shadow-xl transition-shadow animate-fade-in-up">
              <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm">1</span>
                Seus Dados
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Seu nome"
                    maxLength={100}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="(64) 9 9999-9999"
                    maxLength={20}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="seu@email.com"
                    maxLength={255}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Endereço *</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Rua, número, bairro"
                    maxLength={200}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Service Selection */}
            <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg hover:shadow-xl transition-shadow animate-fade-in-up">
              <h2 className="text-xl font-bold text-card-foreground mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm">2</span>
                Catálogo de Serviços
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Toque em um serviço para adicioná-lo ao seu orçamento.
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
                  const added =
                    s.type === "fixed" && !!selectedServices.find((sel) => sel.id === s.id);
                  return (
                    <div
                      key={s.id}
                      style={{ animationDelay: `${idx * 60}ms` }}
                      className={`group rounded-2xl border-2 bg-card overflow-hidden flex flex-col transition-all shadow-sm hover:-translate-y-1 hover:shadow-2xl animate-fade-in-up ${
                        added ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                      }`}
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
                        <button
                          type="button"
                          onClick={() => addService(s.id)}
                          disabled={added}
                          className="mt-auto w-full bg-gradient-to-r from-primary to-accent text-white px-3 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                          {added ? (
                            <>
                              <CheckCircle className="w-4 h-4" /> Adicionado
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              {s.type === "area" &&
                              selectedServices.some((sel) => sel.id === s.id)
                                ? "Adicionar outra área"
                                : "Adicionar"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Services */}
            {selectedServices.length > 0 && (
              <div className="bg-card rounded-2xl p-6 border-2 border-border shadow-lg animate-fade-in-up">
                <h2 className="text-xl font-bold text-card-foreground mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm">3</span>
                  Serviços Selecionados ({selectedServices.length})
                </h2>
                <div className="space-y-4">
                  {selectedServices.map((svc) => {
                    const def = availableServices.find((d) => d.id === svc.id)!;
                    const price = calcPrice(def, svc);
                    return (
                      <div key={svc.instanceId} className="p-4 rounded-xl bg-gradient-to-br from-secondary to-muted/50 border border-border hover:border-primary/40 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-foreground">{svc.name}</h3>
                          <button
                            type="button"
                            onClick={() => removeService(svc.instanceId)}
                            className="text-destructive hover:opacity-70 transition-opacity"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        {def.type === "fixed" && (
                          <div className="flex items-center gap-3 mb-2">
                            <label className="text-sm text-muted-foreground">Qtd:</label>
                            <input
                              type="number"
                              min={1}
                              value={svc.quantity}
                              onChange={(e) => updateField(svc.instanceId, "quantity", Math.max(1, Number(e.target.value)))}
                              className="w-20 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <span className="text-sm font-semibold text-primary ml-auto">{formatBRL(price)}</span>
                          </div>
                        )}

                        {def.type === "area" && (
                          <div className="space-y-2 mb-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground">Largura (m):</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={svc.width || ""}
                                  onChange={(e) => updateField(svc.instanceId, "width", Math.max(0, Number(e.target.value)))}
                                  className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-muted-foreground">Comprimento (m):</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={svc.height || ""}
                                  onChange={(e) => updateField(svc.instanceId, "height", Math.max(0, Number(e.target.value)))}
                                  className="w-24 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            </div>
                            {svc.width > 0 && svc.height > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Área: {(svc.width * svc.height).toFixed(1)} m²
                                  {def.minPrice && price === def.minPrice && " (valor mínimo aplicado)"}
                                </span>
                                <span className="font-semibold text-primary">{formatBRL(price)}</span>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Até 50m²: {formatBRL(def.tiers![0].pricePerM2)}/m² · 51–100m²:{" "}
                              {formatBRL(def.tiers![1].pricePerM2)}/m² · +100m²: {formatBRL(def.tiers![2].pricePerM2)}
                              /m²
                              {def.minPrice ? ` · Mínimo: ${formatBRL(def.minPrice)}` : ""}
                            </p>
                          </div>
                        )}

                        <input
                          type="text"
                          value={svc.observation}
                          onChange={(e) => updateField(svc.instanceId, "observation", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Observação (opcional)"
                          maxLength={300}
                        />
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-4 border-t-2 border-dashed border-border">
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Subtotal:</span>
                        <span>{formatBRL(subtotal)}</span>
                      </div>
                      {appliedCoupon && discount > 0 && (
                        <div className="flex items-center justify-between text-sm text-accent">
                          <span>Desconto ({appliedCoupon.code}):</span>
                          <span>-{formatBRL(discount)}</span>
                        </div>
                      )}
                      {clientSession && clientDiscount > 0 && (
                        <div className="flex items-center justify-between text-sm text-accent">
                          <span>Desconto Cliente (3%):</span>
                          <span>-{formatBRL(clientDiscount)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-lg font-bold text-foreground">Total Estimado:</span>
                        <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{formatBRL(finalTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cupom de Desconto */}
            {selectedServices.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 shadow-lg animate-fade-in-up">
                <h2 className="text-xl font-bold text-card-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-amber-600" /> Cupom de Desconto
                </h2>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30">
                    <div className="flex items-center gap-2 text-accent text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Cupom <strong>{appliedCoupon.code}</strong> aplicado
                        {appliedCoupon.discount_type === "percent"
                          ? ` (${appliedCoupon.discount_value}% de desconto)`
                          : ` (-${formatBRL(Number(appliedCoupon.discount_value))})`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-destructive hover:opacity-70"
                      aria-label="Remover cupom"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código do cupom"
                      maxLength={50}
                      className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon}
                      className="bg-gradient-to-r from-primary to-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-60"
                    >
                      {validatingCoupon ? "Validando..." : "Aplicar"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="group relative w-full overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-green-700 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Send className="w-5 h-5 relative" />
              <span className="relative">Contratar Serviços</span>
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Orcamento;
