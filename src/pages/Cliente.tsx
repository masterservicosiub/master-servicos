import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, UserPlus, LogOut, User as UserIcon, KeyRound, FileText, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import {
  registerClient,
  loginClient,
  recoverClientPassword,
  fetchClientOrders,
  ClientRow,
  OrderRow,
} from "@/lib/supabase";
import { applyCpfMask, isValidCPF } from "@/lib/cpfValidator";
import { applyPhoneMask } from "@/lib/phoneMask";

const STORAGE_KEY = "client_session";

type Tab = "login" | "register" | "recover";

function formatBRL(v: number) {
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const Cliente = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<ClientRow | null>(null);
  const [tab, setTab] = useState<Tab>("login");

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loading, setLoading] = useState(false);

  // register
  const [rName, setRName] = useState("");
  const [rCpf, setRCpf] = useState("");
  const [rAddress, setRAddress] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rPass2, setRPass2] = useState("");

  // recover
  const [recEmail, setRecEmail] = useState("");
  const [recCpf, setRecCpf] = useState("");

  // orders
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (session?.email) {
      fetchClientOrders(session.email).then(setOrders).catch(() => setOrders([]));
    }
  }, [session]);

  const persist = (c: ClientRow) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setSession(c);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPass) {
      toast.error("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const c = await loginClient(loginEmail, loginPass);
      if (!c) {
        toast.error("E-mail ou senha incorretos.");
      } else {
        persist(c);
        toast.success(`Bem-vindo(a), ${c.name.split(" ")[0]}!`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!rName.trim()) return toast.error("Informe o nome completo.");
    if (!isValidCPF(rCpf)) return toast.error("CPF inválido.");
    if (!rAddress.trim()) return toast.error("Informe o endereço.");
    if (!rPhone.trim()) return toast.error("Informe o WhatsApp.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rEmail.trim())) return toast.error("E-mail inválido.");
    if (rPass.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres.");
    if (rPass !== rPass2) return toast.error("As senhas não conferem.");
    setLoading(true);
    try {
      const c = await registerClient({
        name: rName,
        cpf: rCpf,
        address: rAddress,
        phone: rPhone,
        email: rEmail,
        password: rPass,
      });
      persist(c);
      toast.success("Conta criada com sucesso! Você ganha 3% de desconto em todos os serviços.");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async () => {
    if (!recEmail.trim() || !isValidCPF(recCpf)) {
      return toast.error("Informe e-mail e CPF válido.");
    }
    setLoading(true);
    try {
      const newPass = await recoverClientPassword(recEmail, recCpf);
      toast.success(`Nova senha gerada: ${newPass}`, { duration: 15000 });
    } catch (e: any) {
      toast.error(e?.message || "Erro ao recuperar senha.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    toast.info("Você saiu da sua conta.");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          {session ? (
            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      <UserIcon className="w-6 h-6 text-primary" /> Olá, {session.name.split(" ")[0]}!
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">{session.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-destructive hover:opacity-80"
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </button>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-accent/10 border border-accent/30 text-sm text-foreground">
                  🎉 Como cliente cadastrado, você tem <strong>3% de desconto</strong> em todos os
                  serviços.
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">CPF:</span> {session.cpf}</div>
                  <div><span className="text-muted-foreground">WhatsApp:</span> {session.phone}</div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Endereço:</span> {session.address}</div>
                </div>

                <button
                  onClick={() => navigate("/orcamento")}
                  className="mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Fazer novo orçamento
                </button>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" /> Meus pedidos ({orders.length})
                </h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Você ainda não possui pedidos.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border text-sm">
                        <div>
                          <div className="font-medium text-foreground">{o.services.split("\n")[0]}</div>
                          <div className="text-xs text-muted-foreground">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : ""} • {o.status}
                          </div>
                        </div>
                        <div className="font-semibold text-primary">{formatBRL(Number(o.total))}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex border-b border-border mb-6">
                {[
                  { id: "login" as Tab, label: "Entrar", icon: LogIn },
                  { id: "register" as Tab, label: "Criar Conta", icon: UserPlus },
                  { id: "recover" as Tab, label: "Recuperar", icon: KeyRound },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      tab === t.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <t.icon className="w-4 h-4" /> {t.label}
                  </button>
                ))}
              </div>

              {tab === "login" && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Acesse sua conta</h2>
                  <p className="text-sm text-muted-foreground">Clientes cadastrados ganham 3% de desconto em todos os serviços.</p>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Senha"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </button>
                </div>
              )}

              {tab === "register" && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Crie sua conta gratuita</h2>
                  <p className="text-sm text-muted-foreground">Ganhe <strong className="text-accent">3% de desconto</strong> em todos os serviços ao se cadastrar.</p>
                  <input
                    value={rName}
                    onChange={(e) => setRName(e.target.value)}
                    placeholder="Nome completo *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={rCpf}
                    onChange={(e) => setRCpf(applyCpfMask(e.target.value))}
                    placeholder="CPF *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={rAddress}
                    onChange={(e) => setRAddress(e.target.value)}
                    placeholder="Endereço completo *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={rPhone}
                    onChange={(e) => setRPhone(applyPhoneMask(e.target.value))}
                    placeholder="WhatsApp *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="email"
                    value={rEmail}
                    onChange={(e) => setREmail(e.target.value)}
                    placeholder="E-mail *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      type="password"
                      value={rPass}
                      onChange={(e) => setRPass(e.target.value)}
                      placeholder="Senha (mín. 6) *"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="password"
                      value={rPass2}
                      onChange={(e) => setRPass2(e.target.value)}
                      placeholder="Confirmar senha *"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Cadastrando..." : "Criar conta e ganhar 3%"}
                  </button>
                </div>
              )}

              {tab === "recover" && (
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-foreground">Recuperar senha</h2>
                  <p className="text-sm text-muted-foreground">Informe seu e-mail e CPF cadastrados para gerar uma nova senha.</p>
                  <input
                    type="email"
                    value={recEmail}
                    onChange={(e) => setRecEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={recCpf}
                    onChange={(e) => setRecCpf(applyCpfMask(e.target.value))}
                    placeholder="CPF"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleRecover}
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Gerando..." : "Gerar nova senha"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Cliente;
