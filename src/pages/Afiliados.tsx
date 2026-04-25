import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  registerAffiliate,
  loginAffiliate,
  fetchAffiliateOrders,
  type AffiliateRow,
  type OrderRow,
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
} from "lucide-react";

const COMMISSION_RATE = 0.01; // 1%
const STORAGE_KEY = "affiliate_session";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const Afiliados = () => {
  const [mode, setMode] = useState<"landing" | "register" | "login" | "dashboard">("landing");
  const [session, setSession] = useState<AffiliateRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // register form
  const [rFullName, setRFullName] = useState("");
  const [rCpf, setRCpf] = useState("");
  const [rAddress, setRAddress] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPix, setRPix] = useState("");
  const [rUser, setRUser] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // login form
  const [lUser, setLUser] = useState("");
  const [lPass, setLPass] = useState("");

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

  useEffect(() => {
    if (mode === "dashboard" && session?.referral_code) {
      setLoadingOrders(true);
      fetchAffiliateOrders(session.referral_code)
        .then(setOrders)
        .catch(() => toast.error("Erro ao carregar pedidos."))
        .finally(() => setLoadingOrders(false));
    }
  }, [mode, session?.referral_code]);

  const stats = useMemo(() => {
    const paid = orders.filter((o) => (o.status || "").toLowerCase() === "pago");
    const totalPaid = paid.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalAll = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const earnings = totalPaid * COMMISSION_RATE;
    const pendingEarnings = (totalAll - totalPaid) * COMMISSION_RATE;
    return {
      referrals: orders.length,
      paidCount: paid.length,
      totalPaid,
      earnings,
      pendingEarnings,
    };
  }, [orders]);

  const referralLink = session
    ? `${window.location.origin}/orcamento?ref=${session.referral_code}`
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
    if (!isValidCPF(rPix)) return toast.error("A chave Pix deve ser um CPF válido.");
    if (onlyDigits(rPix) !== onlyDigits(rCpf))
      return toast.error("A chave Pix CPF deve ser igual ao CPF do cadastro.");
    if (rUser.trim().length < 3) return toast.error("Usuário deve ter ao menos 3 caracteres.");
    if (rPass.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (rPass !== rPass2) return toast.error("As senhas não coincidem.");

    setSubmitting(true);
    try {
      const created = await registerAffiliate({
        full_name: rFullName.trim(),
        cpf: onlyDigits(rCpf),
        address: rAddress.trim(),
        phone: rPhone.trim(),
        email: rEmail.trim(),
        pix_key: onlyDigits(rPix),
        username: rUser.trim(),
        password: rPass,
      });
      toast.success("Cadastro realizado! Faça login para continuar.");
      setLUser(created.username);
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
    if (!lUser.trim() || !lPass) return toast.error("Informe usuário e senha.");
    setSubmitting(true);
    try {
      const af = await loginAffiliate(lUser, lPass);
      if (!af) {
        toast.error("Usuário ou senha inválidos.");
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(af));
      setSession(af);
      setMode("dashboard");
      toast.success(`Bem-vindo, ${af.full_name.split(" ")[0]}!`);
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
            <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
              <div className="container mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" /> Programa de Afiliados Master
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                  Indique e ganhe <span className="text-primary">CashBack</span> de verdade
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                  Receba <span className="font-bold text-foreground">1% de retorno</span> sobre todos os
                  serviços pagos por clientes que você indicar. Sem limites, sem letras miúdas.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => setMode("register")} className="text-base">
                    <Gift className="w-5 h-5" /> Quero ser Afiliado
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setMode("login")} className="text-base">
                    Já sou afiliado
                  </Button>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section className="py-16 container mx-auto px-4">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Share2,
                    title: "Link exclusivo",
                    desc: "Receba um link único para compartilhar com amigos, familiares e nas redes sociais.",
                  },
                  {
                    icon: Wallet,
                    title: "1% de cashback",
                    desc: "Ganhe 1% sobre todo serviço marcado como pago — direto na sua chave Pix.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Painel em tempo real",
                    desc: "Acompanhe indicações, conversões e ganhos em um dashboard simples.",
                  },
                ].map((b) => (
                  <Card key={b.title} className="border-2 hover:border-primary/40 transition-colors">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                        <b.icon className="w-6 h-6" />
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

            {/* How it works */}
            <section className="py-16 bg-muted/30">
              <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12">Como funciona</h2>
                <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                  {[
                    "Cadastre-se gratuitamente como afiliado",
                    "Receba seu link exclusivo de indicação",
                    "Compartilhe com clientes em potencial",
                    "Receba 1% via Pix de cada serviço pago",
                  ].map((step, i) => (
                    <div key={i} className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto mb-4 text-lg">
                        {i + 1}
                      </div>
                      <p className="text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <Button size="lg" onClick={() => setMode("register")}>
                    <Sparkles className="w-5 h-5" /> Começar agora
                  </Button>
                </div>
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
                    <Label>Email (opcional)</Label>
                    <Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} />
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label>Usuário</Label>
                      <Input value={rUser} onChange={(e) => setRUser(e.target.value.toLowerCase())} />
                    </div>
                    <div>
                      <Label>Senha</Label>
                      <Input type="password" value={rPass} onChange={(e) => setRPass(e.target.value)} />
                    </div>
                    <div>
                      <Label>Confirmar senha</Label>
                      <Input type="password" value={rPass2} onChange={(e) => setRPass2(e.target.value)} />
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
                <CardDescription>Entre com seu usuário e senha.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>Usuário</Label>
                    <Input value={lUser} onChange={(e) => setLUser(e.target.value.toLowerCase())} />
                  </div>
                  <div>
                    <Label>Senha</Label>
                    <Input type="password" value={lPass} onChange={(e) => setLPass(e.target.value)} />
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

        {mode === "dashboard" && session && (
          <section className="py-10 container mx-auto px-4 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Olá, {session.full_name.split(" ")[0]} 👋</h1>
                <p className="text-muted-foreground">Painel do Afiliado — Master Serviços</p>
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

            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Indicações" value={String(stats.referrals)} />
              <StatCard icon={CheckCircle2} label="Pedidos pagos" value={String(stats.paidCount)} />
              <StatCard icon={DollarSign} label="Total gerado (pago)" value={formatBRL(stats.totalPaid)} />
              <StatCard
                icon={Wallet}
                label="CashBack acumulado"
                value={formatBRL(stats.earnings)}
                highlight
              />
            </div>

            {stats.pendingEarnings > 0 && (
              <p className="text-sm text-muted-foreground">
                Você tem <span className="font-semibold text-foreground">{formatBRL(stats.pendingEarnings)}</span>{" "}
                em comissões pendentes (aguardando marcação como “Pago”).
              </p>
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
                          const cb = Number(o.total || 0) * COMMISSION_RATE;
                          return (
                            <tr key={o.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                {o.created_at
                                  ? new Date(o.created_at).toLocaleDateString("pt-BR")
                                  : "-"}
                              </td>
                              <td className="py-2 pr-3">{o.name}</td>
                              <td className="py-2 pr-3">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isPaid
                                      ? "bg-green-500/15 text-green-600"
                                      : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right">{formatBRL(Number(o.total || 0))}</td>
                              <td
                                className={`py-2 pr-3 text-right font-semibold ${
                                  isPaid ? "text-primary" : "text-muted-foreground"
                                }`}
                              >
                                {formatBRL(cb)}
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