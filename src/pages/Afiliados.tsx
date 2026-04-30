import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  registerAffiliate,
  loginAffiliate,
  fetchAffiliateOrders,
  recoverAffiliatePassword,
  type AffiliateRow,
  type OrderRow,
  fetchAffiliateMaterials,
  insertAffiliateMaterialOrder,
  type AffiliateMaterialRow,
  fetchTopAffiliatesRanking,
  type AffiliateRankingRow,
} from "@/lib/supabase";
import { applyCpfMask, isValidCPF, onlyDigits } from "@/lib/cpfValidator";
import { applyPhoneMask } from "@/lib/phoneMask";
import {
  DollarSign,
  Users,
  TrendingUp,
  Share2,
  Copy,
  LogOut,
  Sparkles,
  Gift,
  Wallet,
  CheckCircle2,
  ShoppingCart,
  Package,
  Zap,
  Star,
  ArrowRight,
  ShieldCheck,
  Clock,
  Trophy,
  Crown,
  Medal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const DEFAULT_COMMISSION_RATE = 0.01; // 1% (fallback)
const STORAGE_KEY = "affiliate_session";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PUBLIC_SITE_URL = "https://masterservicos.click";

const Afiliados = () => {
  const [mode, setMode] = useState<"landing" | "register" | "login" | "dashboard" | "forgot_password">("landing");
  const [session, setSession] = useState<AffiliateRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [topRanking, setTopRanking] = useState<AffiliateRankingRow[]>([]);
  const [myCommissionRate, setMyCommissionRate] = useState<number>(DEFAULT_COMMISSION_RATE);

  // register form
  const [rFullName, setRFullName] = useState("");
  const [rCpf, setRCpf] = useState("");
  const [rAddress, setRAddress] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPix, setRPix] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  const [rTerms, setRTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // login form
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");

  // forgot password form
  const [fEmail, setFEmail] = useState("");
  const [fCpf, setFCpf] = useState("");

  // Material catalog
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materials, setMaterials] = useState<AffiliateMaterialRow[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialQty, setMaterialQty] = useState<Record<string, number>>({});
  const [orderingMaterial, setOrderingMaterial] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const af = JSON.parse(raw) as AffiliateRow;
        setSession(af);
        setMode("dashboard");
      } catch {}
    }
  }, []);

  // Load Top 5 ranking on landing
  useEffect(() => {
    if (mode === "landing") {
      fetchTopAffiliatesRanking(5)
        .then(setTopRanking)
        .catch(() => {});
    }
  }, [mode]);

  // Compute my commission rate based on Top 5 ranking + star rates (for dashboard)
  useEffect(() => {
    if (mode !== "dashboard" || !session?.referral_code) return;
    (async () => {
      try {
        const [ranking, rates] = await Promise.all([
          fetchTopAffiliatesRanking(5),
          (await import("@/lib/supabase")).fetchAffiliateStarRates(),
        ]);
        const ranked = ranking.find((r) => r.referral_code === session.referral_code);
        const stars = ranked?.stars ?? 1;
        const tier = rates.find((s) => s.stars === stars);
        const pct = tier?.percent ?? 1;
        setMyCommissionRate(pct / 100);
      } catch {
        setMyCommissionRate(DEFAULT_COMMISSION_RATE);
      }
    })();
  }, [mode, session?.referral_code]);

  useEffect(() => {
    if (mode === "dashboard" && session?.referral_code) {
      setLoadingOrders(true);
      fetchAffiliateOrders(session.referral_code)
        .then(setOrders)
        .catch(() => toast.error("Erro ao carregar pedidos."))
        .finally(() => setLoadingOrders(false));
    }
  }, [mode, session?.referral_code]);

  const openMaterialCatalog = async () => {
    setMaterialsOpen(true);
    setMaterialsLoading(true);
    try {
      const list = await fetchAffiliateMaterials();
      setMaterials(list.filter((m) => m.active !== false));
      const qty: Record<string, number> = {};
      list.forEach((m) => (qty[m.id] = 1));
      setMaterialQty(qty);
    } catch {
      toast.error("Erro ao carregar catálogo.");
    } finally {
      setMaterialsLoading(false);
    }
  };

  const handleOrderMaterial = async (m: AffiliateMaterialRow) => {
    if (!session) return;
    const qty = Math.max(1, Number(materialQty[m.id] || 1));
    setOrderingMaterial(m.id);
    try {
      await insertAffiliateMaterialOrder({
        affiliate_id: session.id || null,
        affiliate_code: session.referral_code,
        affiliate_name: session.full_name,
        material_id: m.id,
        material_name: m.name,
        quantity: qty,
        unit_price: Number(m.price || 0),
        total: Number((Number(m.price || 0) * qty).toFixed(2)),
        status: "Pendente",
        notes: "",
      });
      toast.success("Pedido enviado! Em breve entraremos em contato.");
      setMaterialsOpen(false);
    } catch {
      toast.error("Erro ao enviar pedido.");
    } finally {
      setOrderingMaterial(null);
    }
  };

  const stats = useMemo(() => {
    // Antifraude: ignora pedidos bloqueados; mostra suspeitos como pendentes de revisão
    const valid = orders.filter((o) => (o.fraud_status || "ok") !== "blocked");
    const trusted = valid.filter((o) => (o.fraud_status || "ok") === "ok");
    const suspicious = valid.filter((o) => o.fraud_status === "suspicious");
    const paid = trusted.filter((o) => (o.status || "").toLowerCase() === "pago");
    const totalPaid = paid.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalAll = trusted.reduce((s, o) => s + Number(o.total || 0), 0);
    
    const now = new Date().getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    
    let releasedEarnings = 0;
    let pendingSevenDaysEarnings = 0;
    
    paid.forEach(o => {
      const dateToUse = o.paid_at || o.created_at;
      if (dateToUse) {
        const orderDate = new Date(dateToUse).getTime();
        const commission = Number(o.total || 0) * COMMISSION_RATE;
        if (now - orderDate >= SEVEN_DAYS) {
          releasedEarnings += commission;
        } else {
          pendingSevenDaysEarnings += commission;
        }
      }
    });

    const pendingEarnings = ((totalAll - totalPaid) * COMMISSION_RATE) + suspicious.reduce((s, o) => s + (Number(o.total || 0) * COMMISSION_RATE), 0);
    return {
      referrals: valid.length,
      paidCount: paid.length,
      totalPaid,
      releasedEarnings,
      pendingSevenDaysEarnings,
      pendingEarnings,
      suspiciousCount: suspicious.length,
      blockedCount: orders.length - valid.length,
    };
  }, [orders]);

  const referralLink = session
    ? `${PUBLIC_SITE_URL}/orcamento?ref=${session.referral_code}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Link copiado!");
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setOrders([]);
    setMode("landing");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rFullName.trim()) return toast.error("Informe o nome completo.");
    if (!isValidCPF(rCpf)) return toast.error("CPF inválido.");
    if (!rAddress.trim()) return toast.error("Informe o endereço.");
    if (onlyDigits(rPhone).length < 10) return toast.error("Contato inválido.");
    if (!rEmail.trim()) return toast.error("Informe seu e-mail.");
    if (!isValidCPF(rPix)) return toast.error("A chave Pix deve ser um CPF válido.");
    if (onlyDigits(rPix) !== onlyDigits(rCpf))
      return toast.error("A chave Pix CPF deve ser igual ao CPF do cadastro.");
    if (rPass.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (rPass !== rPass2) return toast.error("As senhas não coincidem.");
    if (!rTerms) return toast.error("Você deve aceitar os Termos de Uso para continuar.");

    setSubmitting(true);
    try {
      const created = await registerAffiliate({
        full_name: rFullName.trim(),
        cpf: onlyDigits(rCpf),
        address: rAddress.trim(),
        phone: rPhone.trim(),
        email: rEmail.trim().toLowerCase(),
        pix_key: onlyDigits(rPix),
        username: rEmail.trim().toLowerCase(),
        password: rPass,
        terms_agreed: rTerms,
      });
      toast.success("Cadastro realizado! Faça login para continuar.");
      setLEmail(created.username);
      setLPass("");
      setMode("login");
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Usuário, CPF ou código já cadastrado.");
      } else {
        toast.error("Erro ao cadastrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lEmail.trim() || !lPass) return toast.error("Informe e-mail e senha.");
    setSubmitting(true);
    try {
      const af = await loginAffiliate(lEmail.trim().toLowerCase(), lPass);
      if (!af) {
        toast.error("E-mail ou senha inválidos.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(af));
      setSession(af);
      setMode("dashboard");
      toast.success(`Bem-vindo, ${af.full_name.split(" ")[0]}!`);
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (msg.startsWith("AFFILIATE_BLOCKED:")) {
        toast.error("Conta bloqueada: " + msg.replace("AFFILIATE_BLOCKED:", ""));
      } else {
        toast.error("Erro ao entrar.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fEmail.trim() || !isValidCPF(fCpf)) {
      return toast.error("Informe o e-mail e CPF válidos.");
    }
    setSubmitting(true);
    try {
      const newPass = await recoverAffiliatePassword(fEmail, onlyDigits(fCpf));
      toast.success("Senha recuperada com sucesso!", { duration: 5000 });
      alert(`Sua nova senha temporária é: ${newPass}\n\nPor favor, anote-a e faça login.`);
      setMode("login");
      setLPass("");
      setLEmail(fEmail.trim().toLowerCase());
    } catch (err: any) {
      toast.error(err.message || "Erro ao recuperar senha.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {mode === "landing" && (
          <>
            {/* Hero */}
            <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground">
              {/* Animated gradient blobs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-white/20 blur-3xl animate-blob" />
                <div className="absolute top-20 -right-32 w-[26rem] h-[26rem] rounded-full bg-accent/40 blur-3xl animate-blob [animation-delay:2s]" />
                <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] rounded-full bg-primary-foreground/10 blur-3xl animate-blob [animation-delay:4s]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent_60%)]" />
              </div>

              <div className="relative container mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in-up">
                  <Sparkles className="w-4 h-4" /> Programa de Afiliados Master
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-950 text-[10px] font-bold animate-pulse">
                    NOVO
                  </span>
                </div>
                <h1 className="text-4xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight animate-fade-in-up [animation-delay:120ms]">
                  Indique. Receba.<br />
                  <span className="bg-gradient-to-r from-yellow-300 via-orange-200 to-yellow-300 bg-clip-text text-transparent bg-[length:200%_100%] animate-shine">
                    Cresça com a gente.
                  </span>
                </h1>
                <p className="text-lg md:text-2xl text-primary-foreground/90 max-w-2xl mx-auto mb-10 animate-fade-in-up [animation-delay:240ms]">
                  Ganhe <span className="font-bold text-yellow-300">1% de cashback</span> sobre cada serviço pago
                  pelos seus indicados. Direto no seu Pix, sem burocracia.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up [animation-delay:360ms]">
                  <Button
                    size="lg"
                    onClick={() => setMode("register")}
                    className="text-base bg-yellow-400 text-yellow-950 hover:bg-yellow-300 shadow-2xl shadow-yellow-500/30 hover:scale-105 transition-transform font-bold"
                  >
                    <Gift className="w-5 h-5" /> Quero ser Afiliado
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setMode("login")}
                    className="text-base bg-white/10 backdrop-blur-md border-white/40 text-white hover:bg-white/20 hover:text-white"
                  >
                    Já sou afiliado
                  </Button>
                </div>

                {/* Trust badges */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/80 animate-fade-in-up [animation-delay:480ms]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-yellow-300" /> 100% gratuito
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-300" /> Cadastro em 2 min
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-300" /> Pagamento via Pix
                  </div>
                </div>
              </div>

              {/* Wave divider */}
              <svg
                className="absolute bottom-0 left-0 w-full h-16 text-background"
                viewBox="0 0 1440 80"
                preserveAspectRatio="none"
                fill="currentColor"
              >
                <path d="M0,40 C360,100 1080,0 1440,40 L1440,80 L0,80 Z" />
              </svg>
            </section>

            {/* Stats bar */}
            <section className="container mx-auto px-4 -mt-10 relative z-10">
              <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8">
                {[
                  { value: "1%", label: "Cashback por venda" },
                  { value: "7d", label: "Liberação rápida" },
                  { value: "∞", label: "Indicações ilimitadas" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="text-center animate-fade-in-up"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div className="text-3xl md:text-5xl font-extrabold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Benefits */}
            <section className="py-20 container mx-auto px-4">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  Por que ser um <span className="text-primary">Afiliado Master?</span>
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Tudo que você precisa para transformar suas indicações em renda extra.
                </p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Share2,
                    title: "Link exclusivo",
                    desc: "Compartilhe um link único com amigos, familiares e nas redes sociais.",
                    gradient: "from-blue-500 to-cyan-500",
                  },
                  {
                    icon: Wallet,
                    title: "1% de cashback",
                    desc: "Ganhe 1% sobre todo serviço pago — direto na sua chave Pix.",
                    gradient: "from-emerald-500 to-teal-500",
                  },
                  {
                    icon: TrendingUp,
                    title: "Painel em tempo real",
                    desc: "Acompanhe indicações, conversões e ganhos em um dashboard simples.",
                    gradient: "from-orange-500 to-pink-500",
                  },
                ].map((b, i) => (
                  <Card
                    key={b.title}
                    className="group relative overflow-hidden border-2 hover:border-primary/40 transition-all hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up"
                    style={{ animationDelay: `${i * 120}ms` }}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${b.gradient} opacity-0 group-hover:opacity-5 transition-opacity`}
                    />
                    <CardHeader>
                      <div
                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${b.gradient} text-white flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}
                      >
                        <b.icon className="w-7 h-7" />
                      </div>
                      <CardTitle className="text-xl">{b.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{b.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Top 5 Ranking */}
            <section className="py-20 relative overflow-hidden bg-gradient-to-br from-amber-50 via-background to-yellow-50 dark:from-amber-950/20 dark:via-background dark:to-yellow-950/20">
              <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                  <span className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-amber-600 uppercase mb-3">
                    <Trophy className="w-4 h-4" /> Hall da Fama
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
                    Top 5{" "}
                    <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                      Afiliados
                    </span>
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    Os afiliados que mais indicam ganham mais cashback por venda. Quanto mais estrelas, maior o seu ganho!
                  </p>
                </div>

                {topRanking.length === 0 ? (
                  <div className="max-w-md mx-auto text-center bg-card border-2 border-dashed border-amber-300/60 rounded-2xl p-8">
                    <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Seja o primeiro do ranking! Cadastre-se e comece a indicar agora.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-3">
                    {topRanking.map((r, i) => {
                      const parts = r.full_name.trim().split(/\s+/);
                      const displayName = parts.slice(0, 2).join(" ");
                      const isFirst = i === 0;
                      const podium = [
                        "from-yellow-400 via-amber-500 to-orange-500",
                        "from-slate-300 via-slate-400 to-slate-500",
                        "from-orange-400 via-amber-600 to-amber-700",
                        "from-primary/70 to-accent/70",
                        "from-primary/60 to-accent/60",
                      ][i] || "from-primary to-accent";
                      return (
                        <div
                          key={r.referral_code}
                          className={`relative group flex items-center gap-4 p-4 md:p-5 rounded-2xl bg-card border-2 ${
                            isFirst ? "border-amber-400 shadow-xl shadow-amber-400/20" : "border-border"
                          } hover:-translate-y-1 hover:shadow-2xl transition-all animate-fade-in-up`}
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          {/* Position badge */}
                          <div
                            className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${podium} text-white font-extrabold text-xl flex items-center justify-center shadow-lg ${
                              isFirst ? "animate-float" : ""
                            }`}
                          >
                            {isFirst ? <Crown className="w-6 h-6" /> : i === 1 || i === 2 ? <Medal className="w-6 h-6" /> : `#${r.rank}`}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base md:text-lg text-foreground truncate">
                                {displayName}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                                #{r.rank}
                              </span>
                            </div>
                            {/* Stars */}
                            <div className="flex items-center gap-0.5 mt-1">
                              {Array.from({ length: 5 }).map((_, s) => (
                                <Star
                                  key={s}
                                  className={`w-4 h-4 md:w-5 md:h-5 ${
                                    s < r.stars
                                      ? "fill-yellow-400 text-yellow-400 drop-shadow"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {r.stars} estrela{r.stars > 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs text-muted-foreground">Indicações</div>
                            <div className="font-extrabold text-lg md:text-xl bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                              {r.paid_count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* How it works */}
            <section className="py-20 relative overflow-hidden bg-gradient-to-br from-muted/40 via-background to-primary/5">
              <div className="container mx-auto px-4">
                <div className="text-center mb-14">
                  <span className="inline-block text-xs font-bold tracking-widest text-primary uppercase mb-3">
                    Simples assim
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold">Como funciona</h2>
                </div>
                <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto relative">
                  {/* Connecting line */}
                  <div className="hidden md:block absolute top-7 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
                  {[
                    { text: "Cadastre-se gratuitamente como afiliado", icon: Users },
                    { text: "Receba seu link exclusivo de indicação", icon: Share2 },
                    { text: "Compartilhe com clientes em potencial", icon: Zap },
                    { text: "Receba 1% via Pix de cada serviço pago", icon: Wallet },
                  ].map((step, i) => (
                    <div
                      key={i}
                      className="relative text-center animate-fade-in-up"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-lg shadow-lg shadow-primary/30 animate-float">
                        {i + 1}
                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-primary">
                          <step.icon className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="text-muted-foreground text-sm md:text-base">{step.text}</p>
                    </div>
                  ))}
                </div>

                {/* Testimonial / social proof */}
                <div className="mt-16 max-w-2xl mx-auto bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg">
                  <div className="flex items-center gap-1 text-yellow-400 mb-3 justify-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                  </div>
                  <p className="text-center text-foreground italic">
                    "Em poucas semanas já tinha indicado vários amigos e recebi minha primeira comissão via Pix.
                    Super fácil de usar!"
                  </p>
                  <p className="text-center text-sm text-muted-foreground mt-3">
                    — Afiliado Master Soluções
                  </p>
                </div>

                <div className="text-center mt-12">
                  <Button
                    size="lg"
                    onClick={() => setMode("register")}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/30 hover:scale-105 transition-transform text-base font-bold"
                  >
                    <Sparkles className="w-5 h-5" /> Começar agora — É grátis
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Sem mensalidades • Sem taxas escondidas • Cancele quando quiser
                  </p>
                </div>
              </div>
            </section>

            {/* Final CTA */}
            <section className="relative py-20 overflow-hidden bg-gradient-to-br from-accent via-primary to-primary/80 text-primary-foreground">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-blob [animation-delay:3s]" />
              </div>
              <div className="relative container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
                  Pronto para começar a ganhar?
                </h2>
                <p className="text-lg text-primary-foreground/90 mb-8 max-w-xl mx-auto">
                  Junte-se ao programa de afiliados e transforme suas conexões em renda real.
                </p>
                <Button
                  size="lg"
                  onClick={() => setMode("register")}
                  className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300 hover:scale-105 transition-transform shadow-2xl font-bold text-base"
                >
                  <Gift className="w-5 h-5" /> Cadastre-se grátis agora
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </section>
          </>
        )}

        {mode === "register" && (
          <section className="py-12 container mx-auto px-4">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Cadastro de Afiliado</CardTitle>
                <CardDescription>
                  Preencha seus dados para criar sua conta. A chave Pix deve ser obrigatoriamente seu CPF.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label>Nome completo</Label>
                    <Input value={rFullName} onChange={(e) => setRFullName(e.target.value)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>CPF</Label>
                      <Input
                        value={rCpf}
                        onChange={(e) => setRCpf(applyCpfMask(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <Label>Contato (WhatsApp)</Label>
                      <Input
                        value={rPhone}
                        onChange={(e) => setRPhone(applyPhoneMask(e.target.value))}
                        placeholder="(00) 0 0000-0000"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Endereço</Label>
                    <Input value={rAddress} onChange={(e) => setRAddress(e.target.value)} />
                  </div>
                  <div>
                    <Label>E-mail (obrigatório)</Label>
                    <Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Chave Pix (CPF)</Label>
                    <Input
                      value={rPix}
                      onChange={(e) => setRPix(applyCpfMask(e.target.value))}
                      placeholder="Digite seu CPF como chave Pix"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Apenas chave Pix do tipo CPF é aceita, e deve ser igual ao CPF informado.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Senha</Label>
                      <Input type="password" value={rPass} onChange={(e) => setRPass(e.target.value)} />
                    </div>
                    <div>
                      <Label>Confirmar senha</Label>
                      <Input type="password" value={rPass2} onChange={(e) => setRPass2(e.target.value)} />
                    </div>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <Label className="text-base">Termos de Uso do Programa de Afiliados</Label>
                    <div className="h-64 overflow-y-auto border rounded-md p-4 text-sm text-muted-foreground bg-muted/30 space-y-4">
                      <div className="text-center mb-4 text-foreground">
                        <h3 className="font-bold text-lg">TERMOS DE USO DO PROGRAMA DE AFILIADOS</h3>
                        <p><strong>MASTER SERVIÇOS</strong><br />CNPJ: 61.906.390/0001-58</p>
                        <p className="text-xs mt-1 text-muted-foreground">Última atualização: 25/04/2026</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">1. OBJETO</h4>
                        <p>O presente Termo regula a participação de pessoas físicas no Programa de Afiliados da MASTER SERVIÇOS, permitindo a divulgação de seus serviços por meio de cupons e/ou links personalizados, com possibilidade de recebimento de comissões por vendas efetivamente concluídas.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">2. CADASTRO DO AFILIADO</h4>
                        <p>2.1. Para participar, o usuário deverá fornecer informações verdadeiras, completas e atualizadas, incluindo:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Nome completo</li>
                          <li>CPF válido</li>
                          <li>Telefone</li>
                          <li>Endereço</li>
                          <li>Chave Pix</li>
                        </ul>
                        <p className="mt-2">2.2. É permitido apenas <strong>um cadastro por CPF</strong>, sendo vedada a criação de múltiplas contas.</p>
                        <p className="mt-1">2.3. A MASTER SERVIÇOS poderá solicitar documentos adicionais para verificação da identidade do afiliado a qualquer momento.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">3. FUNCIONAMENTO DO PROGRAMA</h4>
                        <p>3.1. O afiliado receberá um <strong>cupom de desconto ou link exclusivo</strong> para divulgação.</p>
                        <p className="mt-1">3.2. A comissão será gerada apenas quando:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>A venda for efetivamente concluída;</li>
                          <li>O pagamento for confirmado;</li>
                          <li>Não houver indícios de fraude ou irregularidades.</li>
                        </ul>
                        <p className="mt-2">3.3. A empresa poderá alterar valores, regras e condições do programa a qualquer momento.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">4. PAGAMENTOS E SAQUES</h4>
                        <p>4.1. Os pagamentos <strong>não serão automáticos</strong> e estarão sujeitos à análise e aprovação da MASTER SERVIÇOS.</p>
                        <p className="mt-1">4.2. Os pagamentos serão realizados <strong>uma vez por mês</strong>, em data definida pela empresa.</p>
                        <p className="mt-1">4.3. O valor mínimo para saque é de <strong>R$ 50,00 (cinquenta reais)</strong>.</p>
                        <p className="mt-1">4.4. Os pagamentos serão realizados exclusivamente via <strong>Pix</strong>, sendo obrigatório que a chave Pix esteja vinculada ao <strong>CPF cadastrado do afiliado</strong>.</p>
                        <p className="mt-1">4.5. A empresa poderá reter pagamentos em caso de suspeita de fraude até a conclusão da análise.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">5. POLÍTICA ANTIFRAUDE</h4>
                        <p>5.1. É proibido:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Utilizar o próprio cupom para benefício próprio;</li>
                          <li>Criar múltiplas contas ou contas falsas;</li>
                          <li>Realizar compras fictícias ou manipular pedidos;</li>
                          <li>Gerar comissões indevidas por qualquer meio;</li>
                          <li>Compartilhar cupons de forma abusiva ou enganosa.</li>
                        </ul>
                        <p className="mt-2">5.2. A MASTER SERVIÇOS poderá adotar mecanismos de verificação, incluindo:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Validação de CPF e dados cadastrais;</li>
                          <li>Monitoramento de IP e comportamento;</li>
                          <li>Análise de padrões de compra.</li>
                        </ul>
                        <p className="mt-2">5.3. Comissões suspeitas poderão ser bloqueadas, canceladas ou estornadas.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">6. SUSPENSÃO E CANCELAMENTO</h4>
                        <p>6.1. Em caso de identificação de fraude ou tentativa de fraude, o afiliado poderá ter seu cadastro suspenso ou cancelado.</p>
                        <p className="mt-1">6.2. A MASTER SERVIÇOS poderá suspender ou encerrar o Programa de Afiliados <strong>a qualquer momento, sem aviso prévio</strong>.</p>
                        <p className="mt-1">6.3. Em caso de encerramento, os valores legítimos devidos aos afiliados serão pagos conforme este Termo.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">7. USO DA MARCA</h4>
                        <p>7.1. O afiliado deverá utilizar a marca de forma ética e verdadeira.</p>
                        <p className="mt-1">7.2. É proibido:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Uso indevido da marca;</li>
                          <li>Divulgação enganosa;</li>
                          <li>Promessas falsas ou irreais.</li>
                        </ul>
                        <p className="mt-2">7.3. O descumprimento poderá resultar no cancelamento imediato da conta.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">8. PROTEÇÃO DE DADOS (LGPD)</h4>
                        <p>8.1. A MASTER SERVIÇOS realiza o tratamento de dados pessoais em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD).</p>
                        <p className="mt-1">8.2. Os dados coletados têm como finalidade:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Identificação do afiliado;</li>
                          <li>Processamento de pagamentos;</li>
                          <li>Prevenção a fraudes;</li>
                          <li>Cumprimento de obrigações legais.</li>
                        </ul>
                        <p className="mt-2">8.3. Os dados poderão ser compartilhados com terceiros apenas quando necessário para:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Processamento de pagamentos;</li>
                          <li>Cumprimento de obrigações legais;</li>
                          <li>Execução do programa de afiliados.</li>
                        </ul>
                        <p className="mt-2">8.4. A MASTER SERVIÇOS adota medidas de segurança técnicas e administrativas para proteger os dados contra acessos não autorizados.</p>
                        <p className="mt-1">8.5. O afiliado poderá, a qualquer momento, exercer seus direitos previstos na LGPD, incluindo:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                          <li>Acesso aos dados;</li>
                          <li>Correção de informações;</li>
                          <li>Solicitação de exclusão, quando aplicável.</li>
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">9. RESPONSABILIDADES</h4>
                        <p>9.1. O afiliado é responsável por suas ações de divulgação.</p>
                        <p className="mt-1">9.2. A MASTER SERVIÇOS não se responsabiliza por danos decorrentes de práticas indevidas do afiliado.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">10. ALTERAÇÕES</h4>
                        <p>10.1. Estes Termos poderão ser atualizados a qualquer momento, sendo responsabilidade do afiliado revisá-los periodicamente.</p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-foreground">11. DISPOSIÇÕES FINAIS</h4>
                        <p>11.1. A participação no programa implica na aceitação integral destes Termos.</p>
                        <p className="mt-1">11.2. Fica eleito o foro da comarca da sede da MASTER SERVIÇOS para resolução de eventuais conflitos.</p>
                      </div>

                      <div className="mt-6 pt-4 border-t text-xs">
                        <p><strong>MASTER SERVIÇOS</strong></p>
                        <p>CNPJ: 61.906.390/0001-58</p>
                        <p>Endereço: Itumbiara/GO - Setor Planalto - CEP 75533-250</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pb-2">
                      <Checkbox id="terms" checked={rTerms} onCheckedChange={(checked) => setRTerms(checked as boolean)} />
                      <label
                        htmlFor="terms"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Li e aceito os Termos de Uso
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Cadastrando..." : "Criar conta"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setMode("landing")}>
                      Voltar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Já tem conta?{" "}
                    <button type="button" className="text-primary underline" onClick={() => setMode("login")}>
                      Fazer login
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === "login" && (
          <section className="py-12 container mx-auto px-4">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Acesso do Afiliado</CardTitle>
                <CardDescription>Entre com seu e-mail e senha.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={lEmail} onChange={(e) => setLEmail(e.target.value.toLowerCase())} required />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input type="password" value={lPass} onChange={(e) => setLPass(e.target.value)} required />
                    <div className="text-right mt-1">
                      <button type="button" onClick={() => setMode("forgot_password")} className="text-xs text-primary underline">
                        Esqueci minha senha
                      </button>
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Entrando..." : "Entrar"}
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    Não tem conta?{" "}
                    <button type="button" className="text-primary underline" onClick={() => setMode("register")}>
                      Cadastre-se
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === "forgot_password" && (
          <section className="py-12 container mx-auto px-4">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle>Recuperar Senha</CardTitle>
                <CardDescription>Informe seus dados para gerar uma nova senha temporária.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRecoverPassword} className="space-y-4">
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={fEmail} onChange={(e) => setFEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={fCpf}
                      onChange={(e) => setFCpf(applyCpfMask(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={submitting} className="flex-1">
                      {submitting ? "Recuperando..." : "Recuperar senha"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setMode("login")}>
                      Voltar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {mode === "dashboard" && session && (
          <section className="py-10 container mx-auto px-4 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Olá, {session.full_name.split(" ")[0]} 👋</h1>
                <p className="text-muted-foreground">Painel do Afiliado — Master Soluções</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4" /> Sair
              </Button>
            </div>

            {/* Referral link card */}
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-5 h-5" /> Seu link de indicação
                </CardTitle>
                <CardDescription>
                  Compartilhe este link. Toda solicitação de orçamento feita por ele será vinculada à sua conta.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input readOnly value={referralLink} className="font-mono text-sm" />
                  <Button onClick={handleCopy}>
                    <Copy className="w-4 h-4" /> Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Código: <span className="font-mono font-bold text-foreground">{session.referral_code}</span>
                </p>
              </CardContent>
            </Card>

            {/* Material de divulgação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Material de Divulgação
                </CardTitle>
                <CardDescription>
                  Solicite materiais impressos personalizados com o QR Code do seu link de afiliado para divulgar o seu trabalho.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={openMaterialCatalog}>
                  <Package className="w-4 h-4" /> Pedir Material de Divulgação
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Indicações" value={String(stats.referrals)} />
              <StatCard icon={CheckCircle2} label="Pedidos pagos" value={String(stats.paidCount)} />
              <StatCard icon={DollarSign} label="Total gerado (pago)" value={formatBRL(stats.totalPaid)} />
              <StatCard
                icon={Wallet}
                label="Saldo Liberado (Saque)"
                value={formatBRL(stats.releasedEarnings)}
                highlight
              />
            </div>

            {(stats.pendingSevenDaysEarnings > 0 || stats.pendingEarnings > 0) && (
              <div className="text-sm text-muted-foreground bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20">
                {stats.pendingSevenDaysEarnings > 0 && (
                  <p>
                    ⏳ Você tem <span className="font-semibold text-foreground">{formatBRL(stats.pendingSevenDaysEarnings)}</span>{" "}
                    em comissões aguardando o prazo de 7 dias após o pagamento do cliente.
                  </p>
                )}
                {stats.pendingEarnings > 0 && (
                  <p className={stats.pendingSevenDaysEarnings > 0 ? "mt-1" : ""}>
                    ⏳ Você tem <span className="font-semibold text-foreground">{formatBRL(stats.pendingEarnings)}</span>{" "}
                    em comissões pendentes (pedidos em andamento, não pagos ou em análise).
                  </p>
                )}
              </div>
            )}

            {/* Orders table */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de indicações</CardTitle>
                <CardDescription>Pedidos vinculados ao seu código de afiliado.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : orders.length === 0 ? (
                  <p className="text-muted-foreground">
                    Nenhuma indicação ainda. Compartilhe seu link para começar!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Data</th>
                          <th className="py-2 pr-3">Cliente</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3 text-right">Valor</th>
                          <th className="py-2 pr-3 text-right">CashBack</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const isPaid = (o.status || "").toLowerCase() === "pago";
                          const fraud = (o.fraud_status || "ok") as string;
                          const isBlocked = fraud === "blocked";
                          const isSuspicious = fraud === "suspicious";
                          const cb = isBlocked ? 0 : Number(o.total || 0) * COMMISSION_RATE;
                          return (
                            <tr key={o.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                {o.created_at
                                  ? new Date(o.created_at).toLocaleDateString("pt-BR")
                                  : "-"}
                              </td>
                              <td className="py-2 pr-3">{o.name}</td>
                              <td className="py-2 pr-3">
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                                      isPaid
                                        ? "bg-green-500/15 text-green-600"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {o.status}
                                  </span>
                                  {isBlocked && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-600 w-fit">
                                      Bloqueado (fraude)
                                    </span>
                                  )}
                                  {isSuspicious && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/15 text-yellow-700 w-fit">
                                      Em análise
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 pr-3 text-right">{formatBRL(Number(o.total || 0))}</td>
                              <td
                                className={`py-2 pr-3 text-right font-semibold ${
                                  isBlocked
                                    ? "text-red-500 line-through"
                                    : isPaid
                                    ? "text-primary"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <div>{formatBRL(cb)}</div>
                                {isPaid && !isBlocked && !isSuspicious && (() => {
                                  const dateToUse = o.paid_at || o.created_at;
                                  if (!dateToUse) return null;
                                  const isReleased = (new Date().getTime() - new Date(dateToUse).getTime()) >= (7 * 24 * 60 * 60 * 1000);
                                  return (
                                    <div className={`text-[10px] px-2 py-0.5 mt-1 rounded-full w-fit ml-auto ${isReleased ? 'bg-green-500/15 text-green-600' : 'bg-yellow-500/15 text-yellow-600'}`}>
                                      {isReleased ? "Liberado" : "Aguardando prazo"}
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
      <Footer />

      <Dialog open={materialsOpen} onOpenChange={setMaterialsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Catálogo de Materiais
            </DialogTitle>
            <DialogDescription>
              Escolha o material que deseja solicitar. Após a confirmação, entraremos em contato para combinar pagamento e entrega.
            </DialogDescription>
          </DialogHeader>
          {materialsLoading ? (
            <p className="text-muted-foreground py-6 text-center">Carregando catálogo...</p>
          ) : materials.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              Nenhum material disponível no momento.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              {materials.map((m) => {
                const qty = materialQty[m.id] || 1;
                const total = Number(m.price || 0) * qty;
                return (
                  <div key={m.id} className="border border-border rounded-lg p-4 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-card-foreground">{m.name}</h3>
                    </div>
                    {m.description && (
                      <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
                    )}
                    <p className="text-2xl font-bold text-primary mb-3">{formatBRL(Number(m.price || 0))}</p>
                    <div className="flex items-center gap-2 mb-3">
                      <Label className="text-xs">Qtd:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) =>
                          setMaterialQty((prev) => ({
                            ...prev,
                            [m.id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="w-20 h-8"
                      />
                      <span className="text-xs text-muted-foreground ml-auto">
                        Total: <strong className="text-foreground">{formatBRL(total)}</strong>
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="mt-auto"
                      disabled={orderingMaterial === m.id || Number(m.price) <= 0}
                      onClick={() => handleOrderMaterial(m)}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {orderingMaterial === m.id ? "Enviando..." : "Solicitar"}
                    </Button>
                    {Number(m.price) <= 0 && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Preço ainda não definido pelo administrador.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Afiliados;