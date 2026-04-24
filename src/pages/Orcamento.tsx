import { useState, useMemo, useEffect } from "react";
import { Trash2, Plus, Send, CheckCircle, Tag, X } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { sendToGoogleSheets } from "@/lib/googleSheets";
import { applyPhoneMask } from "@/lib/phoneMask";
import { insertOrder, fetchBudgetServices, findCouponByCode, type CouponRow } from "@/lib/supabase";
import { sendOrderEmailNotification } from "@/lib/emailNotification";

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

  useEffect(() => {
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
          }));
          setAvailableServices(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const addService = (id?: string) => {
    const targetId = id ?? currentServiceId;
    if (!targetId) return;
    if (selectedServices.find((s) => s.id === targetId)) {
      toast.error("Este serviço já foi adicionado.");
      return;
    }
    const service = availableServices.find((s) => s.id === targetId);
    if (!service) return;
    setSelectedServices([
      ...selectedServices,
      { id: service.id, name: service.name, type: service.type, observation: "", quantity: 1, width: 0, height: 0 },
    ]);
    setCurrentServiceId("");
  };

  const removeService = (id: string) => {
    setSelectedServices(selectedServices.filter((s) => s.id !== id));
  };

  const updateField = (id: string, field: keyof SelectedService, value: string | number) => {
    setSelectedServices(selectedServices.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
    const servicesText = servicesLines.join(" | ");

    // Save to Supabase
    try {
      await insertOrder({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        services: servicesText,
        total,
        status: "Novo",
        notes: "",
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
      total,
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
      total,
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
      ``,
      `*Total: ${formatBRL(total)}*`,
    ].filter(Boolean);
    const whatsappMessage = encodeURIComponent(whatsappLines.join("\n"));
    window.open(`https://wa.me/5564992642950?text=${whatsappMessage}`, "_blank");

    setSubmitted(true);
    toast.success("Orçamento enviado com sucesso!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 min-h-[80vh] flex items-center justify-center bg-background">
          <div className="text-center px-4">
            <CheckCircle className="w-20 h-20 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">Orçamento Enviado!</h2>
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
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Novo Orçamento
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
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">Solicite seu Orçamento</h1>
            <p className="text-primary-foreground/80">
              Preencha seus dados, escolha os serviços e envie sua solicitação.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
            {/* Client Info */}
            <div className="bg-blue-100 rounded-xl p-6 border border-border shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Seus Dados</h2>
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
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="text-xl font-semibold text-card-foreground mb-1">Catálogo de Serviços</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Toque em um serviço para adicioná-lo ao seu orçamento.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableServices.map((s) => {
                  const added = !!selectedServices.find((sel) => sel.id === s.id);
                  return (
                    <div
                      key={s.id}
                      className={`group rounded-xl border bg-blue-100 overflow-hidden flex flex-col transition-all shadow-sm ${
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
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{s.description}</p>
                        )}
                        <div className="mt-3 mb-3 text-sm font-semibold text-primary">
                          {s.type === "fixed"
                            ? formatBRL(s.fixedPrice ?? 0)
                            : `A partir de ${formatBRL(s.minPrice ?? 0)} • por m²`}
                        </div>
                        <button
                          type="button"
                          onClick={() => addService(s.id)}
                          disabled={added}
                          className="mt-auto w-full bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {added ? (
                            <>
                              <CheckCircle className="w-4 h-4" /> Adicionado
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" /> Adicionar
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
              <div className="bg-blue-100 rounded-xl p-6 border border-border shadow-sm">
                <h2 className="text-xl font-semibold text-card-foreground mb-4">
                  Serviços Selecionados ({selectedServices.length})
                </h2>
                <div className="space-y-4">
                  {selectedServices.map((svc) => {
                    const def = availableServices.find((d) => d.id === svc.id)!;
                    const price = calcPrice(def, svc);
                    return (
                      <div key={svc.id} className="p-4 rounded-lg bg-secondary border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-medium text-foreground">{svc.name}</h3>
                          <button
                            type="button"
                            onClick={() => removeService(svc.id)}
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
                              onChange={(e) => updateField(svc.id, "quantity", Math.max(1, Number(e.target.value)))}
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
                                  onChange={(e) => updateField(svc.id, "width", Math.max(0, Number(e.target.value)))}
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
                                  onChange={(e) => updateField(svc.id, "height", Math.max(0, Number(e.target.value)))}
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
                          onChange={(e) => updateField(svc.id, "observation", e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Observação (opcional)"
                          maxLength={300}
                        />
                      </div>
                    );
                  })}

                  {/* Total */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
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
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-lg font-semibold text-foreground">Total Estimado:</span>
                        <span className="text-xl font-bold text-primary">{formatBRL(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cupom de Desconto */}
            {selectedServices.length > 0 && (
              <div className="bg-[#fcfca9] rounded-xl p-6 border border-border shadow-sm">
                <h2 className="text-xl font-semibold text-card-foreground mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5" /> Cupom de Desconto
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
                      className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-60"
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
              className="w-full bg-accent text-accent-foreground py-3.5 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Solicitar Serviços
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Orcamento;
