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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const COMMISSION_RATE = 0.01; // 1%
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

            {/* Material de divulgação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" /> Material de Divulgação
                </CardTitle>
                <CardDescription>
                  Gere o seu cartão de visita personalizado com o QR Code do seu link de afiliado.
                  Tamanho oficial 8,5 cm × 4,5 cm, pronto para impressão.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={async () => {
                      try {
                        await downloadBusinessCardPDF(referralLink, `cartao-${session.referral_code}.pdf`);
                        toast.success("Cartão em PDF gerado!");
                      } catch (e) {
                        toast.error("Erro ao gerar PDF.");
                      }
                    }}
                  >
                    <FileText className="w-4 h-4" /> Cartão de Visita (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await downloadBusinessCardJPG(referralLink, `cartao-${session.referral_code}.jpg`);
                        toast.success("Cartão em JPEG gerado!");
                      } catch (e) {
                        toast.error("Erro ao gerar JPEG.");
                      }
                    }}
                  >
                    <FileImage className="w-4 h-4" /> Cartão de Visita (JPEG)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  O panfleto estará disponível em breve.
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