import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchOrders, updateOrderStatus, updateOrderNotes, deleteOrderById, insertOrder, type OrderRow, fetchServicesAdmin, insertService, updateService, deleteService, type ServiceRow, fetchBudgetServices, insertBudgetService, updateBudgetService, deleteBudgetService, updateBudgetService as updateBudgetSvc, type BudgetServiceRow, fetchAdminPassword, updateAdminPassword, fetchEmailSettings, updateEmailSettings } from "@/lib/supabase";
import { toast } from "sonner";
import { applyPhoneMask } from "@/lib/phoneMask";
import { Trash2, Phone, MapPin, Plus, Send, DollarSign, TrendingUp, Calendar, Filter, Camera, Edit2, Save, X, Settings, ClipboardList, ArrowUp, ArrowDown, Bell, Lock, Mail, FlaskConical, CheckCircle, FileText } from "lucide-react";
import { generateRevenueReport } from "@/lib/generateRevenueReport";
import { startOrderNotificationListener } from "@/lib/orderNotifications";
import { setGoogleScriptUrl, setNotificationEmail, getGoogleScriptUrl, getNotificationEmail, syncEmailSettingsFromDB } from "@/lib/googleSheets";
import { sendTestEmail } from "@/lib/emailNotification";

const STATUS_OPTIONS = ["Todos", "Novo", "Em andamento", "Concluído", "Pago", "Cancelado"];

const MONTHS = [
  "Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("Novo");
  const [activeTab, setActiveTab] = useState<"pedidos" | "config">("pedidos");

  // Manual order fields
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualItems, setManualItems] = useState<{ description: string; value: string }[]>([
    { description: "", value: "" },
  ]);

  // Services management
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [svcTitle, setSvcTitle] = useState("");
  const [svcDesc, setSvcDesc] = useState("");
  const [svcImage, setSvcImage] = useState("");
  const [editingSvcId, setEditingSvcId] = useState<string | null>(null);
  const [editSvcTitle, setEditSvcTitle] = useState("");
  const [editSvcDesc, setEditSvcDesc] = useState("");
  const [editSvcImage, setEditSvcImage] = useState("");

  // Budget services management
  const [budgetServices, setBudgetServices] = useState<BudgetServiceRow[]>([]);
  const [bsName, setBsName] = useState("");
  const [bsType, setBsType] = useState<"fixed" | "area">("fixed");
  const [bsFixedPrice, setBsFixedPrice] = useState("");
  const [bsMinPrice, setBsMinPrice] = useState("");
  const [bsTier1, setBsTier1] = useState("");
  const [bsTier2, setBsTier2] = useState("");
  const [bsTier3, setBsTier3] = useState("");
  const [editingBsId, setEditingBsId] = useState<string | null>(null);
  const [editBsName, setEditBsName] = useState("");
  const [editBsType, setEditBsType] = useState<"fixed" | "area">("fixed");
  const [editBsFixedPrice, setEditBsFixedPrice] = useState("");
  const [editBsMinPrice, setEditBsMinPrice] = useState("");
  const [editBsTier1, setEditBsTier1] = useState("");
  const [editBsTier2, setEditBsTier2] = useState("");
  const [editBsTier3, setEditBsTier3] = useState("");

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [adminPw, setAdminPw] = useState<string | null>(null);

  // Email / Google Script settings
  const [scriptUrl, setScriptUrl] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Load admin password from DB on mount
  useEffect(() => {
    fetchAdminPassword().then(setAdminPw).catch(() => setAdminPw("1478"));
  }, []);

  const handleLogin = () => {
    if (adminPw === null) {
      toast.error("Carregando senha, tente novamente.");
      return;
    }
    if (password === adminPw) {
      setAuthenticated(true);
    } else {
      toast.error("Senha incorreta!");
    }
  };

  const handleChangePassword = async () => {
    if (currentPw !== adminPw) {
      toast.error("Senha atual incorreta!");
      return;
    }
    if (newPw.length < 4) {
      toast.error("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("As senhas não coincidem!");
      return;
    }
    try {
      await updateAdminPassword(newPw);
      setAdminPw(newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Senha alterada com sucesso!");
    } catch (err) {
      console.error("Erro ao alterar senha:", err);
      toast.error("Erro ao salvar a nova senha.");
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      toast.error("Erro ao carregar pedidos");
    }
    setLoading(false);
  };

  const loadServices = async () => {
    try {
      const data = await fetchServicesAdmin();
      setServices(data);
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
    }
  };

  const loadBudgetServices = async () => {
    try {
      const data = await fetchBudgetServices();
      setBudgetServices(data);
    } catch (err) {
      console.error("Erro ao buscar serviços de orçamento:", err);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadOrders();
      loadServices();
      loadBudgetServices();
      startOrderNotificationListener();
      // Sync email settings from DB and populate form
      syncEmailSettingsFromDB().then(() => {
        setScriptUrl(getGoogleScriptUrl());
        setNotifEmail(getNotificationEmail());
      });
      const interval = setInterval(loadOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  // Dashboard calculations
  const { annualRevenue, monthlyRevenue, monthlyBreakdown } = useMemo(() => {
    const now = new Date();
    const currentYear = filterYear;
    const currentMonth = now.getMonth();

    const yearOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getFullYear() === currentYear;
    });

    const annualRevenue = yearOrders
      .filter(o => o.status === "Pago")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const monthOrders = yearOrders.filter(o => {
      if (!o.created_at) return false;
      return new Date(o.created_at).getMonth() === currentMonth;
    });

    const monthlyRevenue = monthOrders
      .filter(o => o.status === "Pago")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const monthlyBreakdown: number[] = Array(12).fill(0);
    yearOrders
      .filter(o => o.status === "Pago")
      .forEach(o => {
        if (o.created_at) {
          const m = new Date(o.created_at).getMonth();
          monthlyBreakdown[m] += Number(o.total || 0);
        }
      });

    return { annualRevenue, monthlyRevenue, monthlyBreakdown };
  }, [orders, filterYear]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (filterStatus !== "Todos" && o.status !== filterStatus) return false;
      if (!o.created_at) return true;
      const d = new Date(o.created_at);
      if (d.getFullYear() !== filterYear) return false;
      if (filterMonth > 0 && d.getMonth() !== filterMonth - 1) return false;
      return true;
    });
  }, [orders, filterMonth, filterYear, filterStatus]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach(o => {
      if (o.created_at) years.add(new Date(o.created_at).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      toast.success("Status atualizado!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateOrderNotes(id, notes);
      setOrders(orders.map(o => o.id === id ? { ...o, notes } : o));
    } catch {
      toast.error("Erro ao salvar observação");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este pedido?")) return;
    try {
      await deleteOrderById(id);
      setOrders(orders.filter(o => o.id !== id));
      toast.success("Pedido excluído!");
    } catch {
      toast.error("Erro ao excluir pedido");
    }
  };

  const handleManualOrder = async () => {
    if (!manualName.trim() || !manualService.trim() || !manualValue.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    try {
      await insertOrder({
        name: manualName.trim(),
        phone: manualPhone.trim(),
        email: "",
        address: "",
        services: manualService.trim(),
        total: parseFloat(manualValue) || 0,
        status: "Novo",
        notes: "Pedido manual",
      });
      setManualName("");
      setManualPhone("");
      setManualService("");
      setManualValue("");
      toast.success("Pedido adicionado!");
      loadOrders();
    } catch {
      toast.error("Erro ao adicionar pedido");
    }
  };

  const handleAddService = async () => {
    if (!svcTitle.trim() || !svcDesc.trim()) {
      toast.error("Preencha título e descrição do serviço");
      return;
    }
    try {
      await insertService({ title: svcTitle.trim(), description: svcDesc.trim(), image_url: svcImage.trim() });
      setSvcTitle(""); setSvcDesc(""); setSvcImage("");
      toast.success("Serviço adicionado!");
      loadServices();
    } catch { toast.error("Erro ao adicionar serviço"); }
  };

  const handleEditService = async (id: string) => {
    try {
      await updateService(id, { title: editSvcTitle, description: editSvcDesc, image_url: editSvcImage });
      setEditingSvcId(null);
      toast.success("Serviço atualizado!");
      loadServices();
    } catch { toast.error("Erro ao atualizar serviço"); }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    try {
      await deleteService(id);
      setServices(services.filter(s => s.id !== id));
      toast.success("Serviço excluído!");
    } catch { toast.error("Erro ao excluir serviço"); }
  };

  const handleAddBudgetService = async () => {
    if (!bsName.trim()) { toast.error("Preencha o nome do serviço"); return; }
    const tiers = bsType === "area" ? [
      { maxArea: 50, pricePerM2: parseFloat(bsTier1) || 0 },
      { maxArea: 100, pricePerM2: parseFloat(bsTier2) || 0 },
      { maxArea: Infinity, pricePerM2: parseFloat(bsTier3) || 0 },
    ] : null;
    try {
      await insertBudgetService({
        name: bsName.trim(), type: bsType,
        fixed_price: parseFloat(bsFixedPrice) || 0,
        tiers, min_price: parseFloat(bsMinPrice) || 0,
        sort_order: budgetServices.length,
      });
      setBsName(""); setBsFixedPrice(""); setBsMinPrice(""); setBsTier1(""); setBsTier2(""); setBsTier3(""); setBsType("fixed");
      toast.success("Serviço de orçamento adicionado!");
      loadBudgetServices();
    } catch { toast.error("Erro ao adicionar serviço de orçamento"); }
  };

  const handleEditBudgetService = async (id: string) => {
    const tiers = editBsType === "area" ? [
      { maxArea: 50, pricePerM2: parseFloat(editBsTier1) || 0 },
      { maxArea: 100, pricePerM2: parseFloat(editBsTier2) || 0 },
      { maxArea: Infinity, pricePerM2: parseFloat(editBsTier3) || 0 },
    ] : null;
    try {
      await updateBudgetService(id, {
        name: editBsName, type: editBsType,
        fixed_price: parseFloat(editBsFixedPrice) || 0,
        tiers, min_price: parseFloat(editBsMinPrice) || 0,
      });
      setEditingBsId(null);
      toast.success("Serviço atualizado!");
      loadBudgetServices();
    } catch { toast.error("Erro ao atualizar"); }
  };

  const handleDeleteBudgetService = async (id: string) => {
    if (!confirm("Excluir este serviço de orçamento?")) return;
    try {
      await deleteBudgetService(id);
      setBudgetServices(budgetServices.filter(s => s.id !== id));
      toast.success("Serviço excluído!");
    } catch { toast.error("Erro ao excluir"); }
  };

  const handleSaveEmailSettings = async () => {
    if (!scriptUrl.trim()) {
      toast.error("Informe a URL do Google Script.");
      return;
    }
    if (!notifEmail.trim()) {
      toast.error("Informe o e-mail de destino.");
      return;
    }
    setSavingEmail(true);
    try {
      // Persist in Supabase
      await updateEmailSettings({
        google_script_url: scriptUrl.trim(),
        notification_email: notifEmail.trim(),
      });
      // Keep localStorage in sync
      setGoogleScriptUrl(scriptUrl.trim());
      setNotificationEmail(notifEmail.trim());
      toast.success("Configurações de e-mail salvas!");
    } catch (err) {
      console.error("Erro ao salvar configurações de e-mail:", err);
      toast.error("Erro ao salvar. Verifique o console.");
    } finally {
      setSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (!scriptUrl.trim()) {
      toast.error("Salve a URL do Google Script antes de testar.");
      return;
    }
    setTestingEmail(true);
    // Use the values currently in the form (already saved or not)
    setGoogleScriptUrl(scriptUrl.trim());
    setNotificationEmail(notifEmail.trim());
    const ok = await sendTestEmail();
    setTestingEmail(false);
    if (ok) {
      toast.success(`E-mail de teste enviado para ${notifEmail || getNotificationEmail()}!`);
    } else {
      toast.error("Falha ao enviar. Verifique a URL do script.");
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 min-h-[80vh] flex items-center justify-center bg-background">
          <div className="bg-card p-8 rounded-xl border border-border w-full max-w-sm">
            <h2 className="text-2xl font-bold text-card-foreground mb-6 text-center">Admin</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Senha"
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={handleLogin} className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90">
              Entrar
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyBreakdown, 1);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16 bg-background">
        <div className="bg-primary py-8">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl font-bold text-primary-foreground">Painel Admin</h1>
            <p className="text-primary-foreground/80">{orders.length} pedidos</p>
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={() => setActiveTab("pedidos")}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === "pedidos" ? "bg-background text-foreground" : "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"}`}
              >
                <ClipboardList className="w-4 h-4" /> Pedidos
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === "config" ? "bg-background text-foreground" : "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"}`}
              >
                <Settings className="w-4 h-4" /> Configurações
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 space-y-8">
          {activeTab === "pedidos" ? (
            <>
              {/* Dashboard */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-card rounded-xl p-6 border border-border flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento Anual ({filterYear})</p>
                    <p className="text-2xl font-bold text-card-foreground">R$ {annualRevenue.toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Faturamento Mês Atual</p>
                    <p className="text-2xl font-bold text-card-foreground">R$ {monthlyRevenue.toFixed(2)}</p>
                  </div>
                </div>
                <div className="bg-card rounded-xl p-6 border border-border flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos ({filterYear})</p>
                    <p className="text-2xl font-bold text-card-foreground">{filteredOrders.length}</p>
                  </div>
                </div>
              </div>

              {/* Gráfico Mensal */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-lg font-semibold text-card-foreground mb-4">Faturamento Mensal ({filterYear})</h2>
                <div className="flex items-end gap-1 h-40">
                  {monthlyBreakdown.map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {val > 0 ? `R$${(val / 1000).toFixed(1)}k` : ""}
                      </span>
                      <div
                        className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all"
                        style={{ height: `${(val / maxMonthly) * 120}px` }}
                      />
                      <span className="text-[10px] text-muted-foreground">{MONTHS[i + 1]?.slice(0, 3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão Relatório PDF */}
              <div className="flex justify-end">
                <button
                  onClick={() => generateRevenueReport(orders, filterYear)}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" /> Gerar Relatório PDF ({filterYear})
                </button>
              </div>

              {/* Filtros */}
              <div className="bg-card rounded-xl p-4 border border-border flex flex-wrap items-center gap-4">
                <Filter className="w-5 h-5 text-muted-foreground" />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <span className="text-sm text-muted-foreground">{filteredOrders.length} pedidos encontrados</span>
              </div>

              {/* Pedido Manual */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Pedido Manual
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome do cliente *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={manualPhone} onChange={(e) => setManualPhone(applyPhoneMask(e.target.value))} placeholder="Telefone"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={manualService} onChange={(e) => setManualService(e.target.value)} placeholder="Descrição do serviço *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input type="number" value={manualValue} onChange={(e) => setManualValue(e.target.value)} placeholder="Valor (R$) *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <button onClick={handleManualOrder} className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Adicionar Pedido
                </button>
              </div>

              {/* Lista de Pedidos */}
              {loading && <p className="text-muted-foreground text-center">Carregando...</p>}
              {!loading && filteredOrders.length === 0 && <p className="text-muted-foreground text-center">Nenhum pedido encontrado</p>}

              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-card-foreground">{order.name}</h3>
                      <p className="text-xs text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : ""}</p>
                    </div>
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateStatus(order.id!, e.target.value)}
                      className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="Novo">Novo</option>
                      <option value="Em andamento">Em andamento</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Pago">Pago</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>

                  {order.phone && <p className="text-sm text-foreground"><strong>Tel:</strong> {order.phone}</p>}
                  {order.email && <p className="text-sm text-foreground"><strong>Email:</strong> {order.email}</p>}
                  {order.address && <p className="text-sm text-foreground"><strong>Endereço:</strong> {order.address}</p>}
                  <p className="text-sm text-foreground mt-1"><strong>Serviços:</strong> {order.services}</p>
                  <p className="text-sm font-bold text-primary mt-1">Total: R$ {Number(order.total).toFixed(2)}</p>

                  <div className="mt-3">
                    <textarea
                      value={order.notes || ""}
                      onChange={(e) => setOrders(orders.map(o => o.id === order.id ? { ...o, notes: e.target.value } : o))}
                      onBlur={() => handleUpdateNotes(order.id!, order.notes)}
                      placeholder="Observações / Agendamento"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {order.phone && (
                      <a href={`https://wa.me/55${order.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90">
                        <Phone className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                    {order.address && (
                      <a href={`https://www.google.com/maps/search/${encodeURIComponent(order.address)}`} target="_blank" rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90">
                        <MapPin className="w-4 h-4" /> Como Chegar
                      </a>
                    )}
                    <button onClick={() => handleDelete(order.id!)}
                      className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90">
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Configurações - Gerenciar Serviços */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5" /> Gerenciar Serviços (Página Serviços)
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input value={svcTitle} onChange={(e) => setSvcTitle(e.target.value)} placeholder="Título do serviço *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <input value={svcImage} onChange={(e) => setSvcImage(e.target.value)} placeholder="URL da imagem (opcional)"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <textarea value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} placeholder="Descrição do serviço *"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4" rows={3} />
                <button onClick={handleAddService} className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>

                {services.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {services.map((svc) => (
                      <div key={svc.id} className="p-4 rounded-lg bg-secondary border border-border">
                        {editingSvcId === svc.id ? (
                          <div className="space-y-3">
                            <input value={editSvcTitle} onChange={(e) => setEditSvcTitle(e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                            <input value={editSvcImage} onChange={(e) => setEditSvcImage(e.target.value)} placeholder="URL da imagem"
                              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                            <textarea value={editSvcDesc} onChange={(e) => setEditSvcDesc(e.target.value)}
                              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" rows={2} />
                            <div className="flex gap-2">
                              <button onClick={() => handleEditService(svc.id!)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1">
                                <Save className="w-4 h-4" /> Salvar
                              </button>
                              <button onClick={() => setEditingSvcId(null)} className="bg-muted text-muted-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-4">
                            {svc.image_url && <img src={svc.image_url} alt={svc.title} className="w-20 h-20 object-cover rounded-lg" />}
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">{svc.title}</h3>
                              <p className="text-sm text-muted-foreground">{svc.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => { setEditingSvcId(svc.id!); setEditSvcTitle(svc.title); setEditSvcDesc(svc.description); setEditSvcImage(svc.image_url); }}
                                className="text-primary hover:opacity-70"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteService(svc.id!)}
                                className="text-destructive hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gerenciar Serviços de Orçamento */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Serviços da Página Orçamento
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input value={bsName} onChange={(e) => setBsName(e.target.value)} placeholder="Nome do serviço *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  <select value={bsType} onChange={(e) => setBsType(e.target.value as "fixed" | "area")}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="fixed">Preço Fixo (por unidade)</option>
                    <option value="area">Por Área (m²)</option>
                  </select>
                </div>
                {bsType === "fixed" ? (
                  <input type="number" value={bsFixedPrice} onChange={(e) => setBsFixedPrice(e.target.value)} placeholder="Preço fixo (R$) *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4" />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input type="number" value={bsTier1} onChange={(e) => setBsTier1(e.target.value)} placeholder="Preço/m² até 50m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="number" value={bsTier2} onChange={(e) => setBsTier2(e.target.value)} placeholder="Preço/m² 51-100m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="number" value={bsTier3} onChange={(e) => setBsTier3(e.target.value)} placeholder="Preço/m² acima 100m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    <input type="number" value={bsMinPrice} onChange={(e) => setBsMinPrice(e.target.value)} placeholder="Preço mínimo (R$)"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}
                <button onClick={handleAddBudgetService} className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>

                {budgetServices.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {budgetServices.map((bs) => (
                      <div key={bs.id} className="p-4 rounded-lg bg-secondary border border-border">
                        {editingBsId === bs.id ? (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <input value={editBsName} onChange={(e) => setEditBsName(e.target.value)} placeholder="Nome"
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                              <select value={editBsType} onChange={(e) => setEditBsType(e.target.value as "fixed" | "area")}
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                                <option value="fixed">Preço Fixo</option>
                                <option value="area">Por Área (m²)</option>
                              </select>
                            </div>
                            {editBsType === "fixed" ? (
                              <input type="number" value={editBsFixedPrice} onChange={(e) => setEditBsFixedPrice(e.target.value)} placeholder="Preço fixo"
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                            ) : (
                              <div className="grid sm:grid-cols-2 gap-3">
                                <input type="number" value={editBsTier1} onChange={(e) => setEditBsTier1(e.target.value)} placeholder="R$/m² até 50m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                                <input type="number" value={editBsTier2} onChange={(e) => setEditBsTier2(e.target.value)} placeholder="R$/m² 51-100m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                                <input type="number" value={editBsTier3} onChange={(e) => setEditBsTier3(e.target.value)} placeholder="R$/m² +100m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                                <input type="number" value={editBsMinPrice} onChange={(e) => setEditBsMinPrice(e.target.value)} placeholder="Preço mínimo"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => handleEditBudgetService(bs.id!)} className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1">
                                <Save className="w-4 h-4" /> Salvar
                              </button>
                              <button onClick={() => setEditingBsId(null)} className="bg-muted text-muted-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1">
                                <X className="w-4 h-4" /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={async () => {
                                    const idx = budgetServices.findIndex(b => b.id === bs.id);
                                    if (idx <= 0) return;
                                    const prev = budgetServices[idx - 1];
                                    await updateBudgetService(bs.id!, { sort_order: prev.sort_order });
                                    await updateBudgetService(prev.id!, { sort_order: bs.sort_order });
                                    loadBudgetServices();
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  disabled={budgetServices.findIndex(b => b.id === bs.id) === 0}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const idx = budgetServices.findIndex(b => b.id === bs.id);
                                    if (idx >= budgetServices.length - 1) return;
                                    const next = budgetServices[idx + 1];
                                    await updateBudgetService(bs.id!, { sort_order: next.sort_order });
                                    await updateBudgetService(next.id!, { sort_order: bs.sort_order });
                                    loadBudgetServices();
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  disabled={budgetServices.findIndex(b => b.id === bs.id) === budgetServices.length - 1}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{bs.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {bs.type === "fixed" ? `Preço fixo: R$ ${Number(bs.fixed_price).toFixed(2)}` :
                                    `Por m² | Mín: R$ ${Number(bs.min_price).toFixed(2)}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => {
                                setEditingBsId(bs.id!); setEditBsName(bs.name); setEditBsType(bs.type);
                                setEditBsFixedPrice(String(bs.fixed_price || "")); setEditBsMinPrice(String(bs.min_price || ""));
                                const t = bs.tiers || [];
                                setEditBsTier1(String(t[0]?.pricePerM2 || "")); setEditBsTier2(String(t[1]?.pricePerM2 || "")); setEditBsTier3(String(t[2]?.pricePerM2 || ""));
                              }} className="text-primary hover:opacity-70"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteBudgetService(bs.id!)}
                                className="text-destructive hover:opacity-70"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notificações por E-mail */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-1 flex items-center gap-2">
                  <Mail className="w-5 h-5" /> Notificações por E-mail
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Configure o Google Apps Script para receber e-mails automáticos a cada novo pedido.
                </p>

                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      URL do Google Apps Script
                    </label>
                    <input
                      type="url"
                      value={scriptUrl}
                      onChange={(e) => setScriptUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/..."
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Implante o script como "App da Web" e cole a URL gerada aqui.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      E-mail de destino das notificações
                    </label>
                    <input
                      type="email"
                      value={notifEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Este e-mail receberá uma notificação a cada pedido recebido.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <button
                      onClick={handleSaveEmailSettings}
                      disabled={savingEmail}
                      className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      {savingEmail ? "Salvando..." : "Salvar Configurações"}
                    </button>
                    <button
                      onClick={handleTestEmail}
                      disabled={testingEmail}
                      className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
                    >
                      <FlaskConical className="w-4 h-4" />
                      {testingEmail ? "Enviando teste..." : "Enviar E-mail de Teste"}
                    </button>
                  </div>

                  {scriptUrl && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>Script configurado. Notificações automáticas <strong>ativas</strong>.</span>
                    </div>
                  )}
                  {!scriptUrl && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5">
                      <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Sem URL configurada. Notificações por e-mail <strong>desativadas</strong>.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Alterar Senha do Admin
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  E-mail de recuperação: <strong>masterservicos.iub@gmail.com</strong>
                </p>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Senha Atual</label>
                    <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Digite a senha atual" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Nova Senha</label>
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Digite a nova senha" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Confirmar Nova Senha</label>
                    <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Confirme a nova senha" />
                  </div>
                  <button onClick={handleChangePassword}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Alterar Senha
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Admin;
