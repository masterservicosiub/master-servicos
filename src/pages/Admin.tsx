import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  fetchOrders,
  updateOrderStatus,
  updateOrderNotes,
  deleteOrderById,
  insertOrder,
  type OrderRow,
  fetchServicesAdmin,
  insertService,
  updateService,
  deleteService,
  type ServiceRow,
  fetchBudgetServices,
  insertBudgetService,
  updateBudgetService,
  deleteBudgetService,
  updateBudgetService as updateBudgetSvc,
  type BudgetServiceRow,
  fetchAdminAuth,
  updateAdminAuth,
  recoverAdminPassword,
  type AdminAuthSettings,
  fetchEmailSettings,
  updateEmailSettings,
  fetchCoupons,
  insertCoupon,
  updateCoupon,
  deleteCoupon,
  type CouponRow,
  fetchClients,
  insertClient,
  updateClient,
  deleteClient,
  type ClientRow,
  markAffiliateCommissionsPaid,
} from "@/lib/supabase";
import { toast } from "sonner";
import { applyPhoneMask } from "@/lib/phoneMask";
import {
  Trash2,
  Phone,
  MapPin,
  Plus,
  Send,
  DollarSign,
  TrendingUp,
  Calendar,
  Filter,
  Camera,
  Edit2,
  Save,
  X,
  Settings,
  ClipboardList,
  ArrowUp,
  ArrowDown,
  Bell,
  Lock,
  Mail,
  FlaskConical,
  CheckCircle,
  FileText,
  Tag,
  ToggleLeft,
  ToggleRight,
  Receipt,
  Users,
  Search,
} from "lucide-react";
import { ShieldAlert } from "lucide-react";
import {
  fetchAffiliatesAll,
  setAffiliateBlocked,
  setOrderFraudStatus,
  fetchSuspiciousOrders,
  deleteAffiliate,
} from "@/lib/antifraud";
import type { AffiliateRow } from "@/lib/supabase";
import { generateRevenueReport } from "@/lib/generateRevenueReport";
import { generateReceipt } from "@/lib/generateReceipt";
import { startOrderNotificationListener } from "@/lib/orderNotifications";
import {
  setGoogleScriptUrl,
  setNotificationEmail,
  getGoogleScriptUrl,
  getNotificationEmail,
  syncEmailSettingsFromDB,
} from "@/lib/googleSheets";
import { sendTestEmail } from "@/lib/emailNotification";
import { buildPixCpfPayload } from "@/lib/pixCpf";
import QRCode from "qrcode";

const STATUS_OPTIONS = ["Todos", "Novo", "Em andamento", "Concluído", "Pago", "Cancelado"];

const MONTHS = [
  "Todos",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const Admin = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMode, setLoginMode] = useState<"login" | "forgot">("login");
  const [recoverEmail, setRecoverEmail] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState("Novo");
  const [activeTab, setActiveTab] = useState<"pedidos" | "clientes" | "antifraude" | "config">("pedidos");

  // Antifraude state
  const [afAffiliates, setAfAffiliates] = useState<AffiliateRow[]>([]);
  const [afOrders, setAfOrders] = useState<OrderRow[]>([]);
  const [afLoading, setAfLoading] = useState(false);
  const [viewingAffiliateId, setViewingAffiliateId] = useState<string | null>(null);

  // Pix payout modal state
  const [payingAffiliate, setPayingAffiliate] = useState<AffiliateRow | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payQrUrl, setPayQrUrl] = useState("");
  const [payPayload, setPayPayload] = useState("");
  const [payProcessing, setPayProcessing] = useState(false);

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
  const [bsImage, setBsImage] = useState("");
  const [bsDescription, setBsDescription] = useState("");
  const [editingBsId, setEditingBsId] = useState<string | null>(null);
  const [editBsName, setEditBsName] = useState("");
  const [editBsType, setEditBsType] = useState<"fixed" | "area">("fixed");
  const [editBsFixedPrice, setEditBsFixedPrice] = useState("");
  const [editBsMinPrice, setEditBsMinPrice] = useState("");
  const [editBsTier1, setEditBsTier1] = useState("");
  const [editBsTier2, setEditBsTier2] = useState("");
  const [editBsTier3, setEditBsTier3] = useState("");
  const [editBsImage, setEditBsImage] = useState("");
  const [editBsDescription, setEditBsDescription] = useState("");

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [adminAuth, setAdminAuth] = useState<AdminAuthSettings | null>(null);
  const [editAdminUser, setEditAdminUser] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");

  // Email / Google Script settings
  const [scriptUrl, setScriptUrl] = useState("");
  const [notifEmail, setNotifEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  // Coupons
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [coupCode, setCoupCode] = useState("");
  const [coupType, setCoupType] = useState<"percent" | "fixed">("percent");
  const [coupValue, setCoupValue] = useState("");
  const [coupApplies, setCoupApplies] = useState<"all" | "service">("all");
  const [coupServiceId, setCoupServiceId] = useState("");

  // Clients
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clName, setClName] = useState("");
  const [clPhone, setClPhone] = useState("");
  const [clEmail, setClEmail] = useState("");
  const [clAddress, setClAddress] = useState("");
  const [clNotes, setClNotes] = useState("");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editClName, setEditClName] = useState("");
  const [editClPhone, setEditClPhone] = useState("");
  const [editClEmail, setEditClEmail] = useState("");
  const [editClAddress, setEditClAddress] = useState("");
  const [editClNotes, setEditClNotes] = useState("");

  // Load admin auth from DB on mount
  useEffect(() => {
    fetchAdminAuth()
      .then(data => {
        setAdminAuth(data);
        setEditAdminUser(data.username || "admin");
        setEditAdminEmail(data.email || "masterservicos.iub@gmail.com");
      })
      .catch(() => setAdminAuth({ username: "admin", password: "1478", email: "masterservicos.iub@gmail.com" }));
  }, []);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (adminAuth === null) {
      toast.error("Carregando configurações, tente novamente.");
      return;
    }
    const safeUsername = adminAuth.username || "admin";
    if (password === adminAuth.password && username === safeUsername) {
      setAuthenticated(true);
    } else {
      toast.error("Usuário ou senha incorretos!");
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail) return toast.error("Informe o e-mail.");
    try {
      const newPass = await recoverAdminPassword(recoverEmail);
      toast.success("Nova senha gerada com sucesso!");
      alert(`Sua nova senha temporária é: ${newPass}\n\nPor favor, anote-a e faça login para alterá-la.`);
      if (adminAuth) {
        setAdminAuth({ ...adminAuth, password: newPass });
      }
      setLoginMode("login");
      setRecoverEmail("");
      setPassword("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao recuperar senha.");
    }
  };

  const handleUpdateAdminSettings = async () => {
    if (currentPw !== adminAuth?.password) {
      toast.error("Senha atual incorreta!");
      return;
    }
    if (newPw && newPw.length < 4) {
      toast.error("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (newPw && newPw !== confirmPw) {
      toast.error("As senhas não coincidem!");
      return;
    }
    
    try {
      const updates: AdminAuthSettings = {
        username: editAdminUser || "admin",
        email: editAdminEmail || "masterservicos.iub@gmail.com",
      };
      if (newPw) {
        updates.password = newPw;
      }
      
      await updateAdminAuth(updates);
      setAdminAuth({ ...adminAuth, ...updates });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      toast.success("Configurações de acesso atualizadas!");
    } catch (err) {
      console.error("Erro ao alterar acesso:", err);
      toast.error("Erro ao salvar configurações.");
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

  const loadCoupons = async () => {
    try {
      const data = await fetchCoupons();
      setCoupons(data);
    } catch (err) {
      console.error("Erro ao buscar cupons:", err);
    }
  };

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      console.error("Erro ao buscar clientes:", err);
    }
  };

  useEffect(() => {
    if (authenticated) {
      loadOrders();
      loadServices();
      loadBudgetServices();
      loadCoupons();
      loadClients();
      startOrderNotificationListener();
      // Sync email settings from DB and populate form
      syncEmailSettingsFromDB().then(() => {
        setScriptUrl(getGoogleScriptUrl());
        setNotifEmail(getNotificationEmail());
      });
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated]);

  const loadAntifraud = async () => {
    setAfLoading(true);
    try {
      const [a, o] = await Promise.all([fetchAffiliatesAll(), fetchSuspiciousOrders()]);
      setAfAffiliates(a);
      setAfOrders(o);
    } catch (e) {
      toast.error("Erro ao carregar antifraude.");
    } finally {
      setAfLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && activeTab === "antifraude") loadAntifraud();
  }, [authenticated, activeTab]);

  const getAffiliateCommissions = (referral_code: string) => {
    const COMMISSION_RATE = 0.01;
    const affiliateOrders = orders.filter(
      (o) => o.affiliate_code === referral_code && (o.fraud_status || "ok") === "ok" && o.status === "Pago"
    );

    const now = new Date().getTime();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    let released = 0;
    let pending = 0;
    let paid = 0;

    affiliateOrders.forEach((o) => {
      const commissionValue = Number(o.total || 0) * COMMISSION_RATE;
      if (o.commission_paid_at) {
        paid += commissionValue;
        return;
      }
      const dateToUse = o.paid_at || o.created_at;
      if (dateToUse) {
        const orderDate = new Date(dateToUse).getTime();
        if (now - orderDate >= SEVEN_DAYS) {
          released += commissionValue;
        } else {
          pending += commissionValue;
        }
      }
    });

    return { released, pending, paid, affiliateOrders };
  };

  // Dashboard calculations
  const { annualRevenue, monthlyRevenue, monthlyBreakdown } = useMemo(() => {
    const now = new Date();
    const currentYear = filterYear;
    const currentMonth = now.getMonth();

    const yearOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getFullYear() === currentYear;
    });

    const annualRevenue = yearOrders
      .filter((o) => o.status === "Pago")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const monthOrders = yearOrders.filter((o) => {
      if (!o.created_at) return false;
      return new Date(o.created_at).getMonth() === currentMonth;
    });

    const monthlyRevenue = monthOrders
      .filter((o) => o.status === "Pago")
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    const monthlyBreakdown: number[] = Array(12).fill(0);
    yearOrders
      .filter((o) => o.status === "Pago")
      .forEach((o) => {
        if (o.created_at) {
          const m = new Date(o.created_at).getMonth();
          monthlyBreakdown[m] += Number(o.total || 0);
        }
      });

    return { annualRevenue, monthlyRevenue, monthlyBreakdown };
  }, [orders, filterYear]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
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
    orders.forEach((o) => {
      if (o.created_at) years.add(new Date(o.created_at).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, status);
      setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
      toast.success("Status atualizado!");
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateOrderNotes(id, notes);
      setOrders(orders.map((o) => (o.id === id ? { ...o, notes } : o)));
    } catch {
      toast.error("Erro ao salvar observação");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este pedido?")) return;
    try {
      await deleteOrderById(id);
      setOrders(orders.filter((o) => o.id !== id));
      toast.success("Pedido excluído!");
    } catch {
      toast.error("Erro ao excluir pedido");
    }
  };

  const handleManualOrder = async () => {
    if (!manualName.trim()) {
      toast.error("Preencha o nome do cliente");
      return;
    }
    const validItems = manualItems.filter((it) => it.description.trim() && it.value.trim());
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um serviço com descrição e valor");
      return;
    }
    const total = validItems.reduce((sum, it) => sum + (parseFloat(it.value) || 0), 0);
    const servicesText = validItems
      .map((it) => `${it.description.trim()} - R$ ${(parseFloat(it.value) || 0).toFixed(2)}`)
      .join(" | ");
    try {
      await insertOrder({
        name: manualName.trim(),
        phone: manualPhone.trim(),
        email: "",
        address: "",
        services: servicesText,
        total,
        status: "Novo",
        notes: "Pedido manual",
      });
      setManualName("");
      setManualPhone("");
      setManualItems([{ description: "", value: "" }]);
      toast.success("Pedido adicionado!");
      loadOrders();
    } catch {
      toast.error("Erro ao adicionar pedido");
    }
  };

  const addManualItem = () => setManualItems([...manualItems, { description: "", value: "" }]);
  const removeManualItem = (idx: number) =>
    setManualItems(
      manualItems.length === 1 ? [{ description: "", value: "" }] : manualItems.filter((_, i) => i !== idx),
    );
  const updateManualItem = (idx: number, field: "description" | "value", val: string) =>
    setManualItems(manualItems.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));

  const handleAddService = async () => {
    if (!svcTitle.trim() || !svcDesc.trim()) {
      toast.error("Preencha título e descrição do serviço");
      return;
    }
    try {
      await insertService({ title: svcTitle.trim(), description: svcDesc.trim(), image_url: svcImage.trim() });
      setSvcTitle("");
      setSvcDesc("");
      setSvcImage("");
      toast.success("Serviço adicionado!");
      loadServices();
    } catch {
      toast.error("Erro ao adicionar serviço");
    }
  };

  const handleEditService = async (id: string) => {
    try {
      await updateService(id, { title: editSvcTitle, description: editSvcDesc, image_url: editSvcImage });
      setEditingSvcId(null);
      toast.success("Serviço atualizado!");
      loadServices();
    } catch {
      toast.error("Erro ao atualizar serviço");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Excluir este serviço?")) return;
    try {
      await deleteService(id);
      setServices(services.filter((s) => s.id !== id));
      toast.success("Serviço excluído!");
    } catch {
      toast.error("Erro ao excluir serviço");
    }
  };

  const handleAddBudgetService = async () => {
    if (!bsName.trim()) {
      toast.error("Preencha o nome do serviço");
      return;
    }
    const tiers =
      bsType === "area"
        ? [
            { maxArea: 50, pricePerM2: parseFloat(bsTier1) || 0 },
            { maxArea: 100, pricePerM2: parseFloat(bsTier2) || 0 },
            { maxArea: Infinity, pricePerM2: parseFloat(bsTier3) || 0 },
          ]
        : null;
    try {
      await insertBudgetService({
        name: bsName.trim(),
        type: bsType,
        fixed_price: parseFloat(bsFixedPrice) || 0,
        tiers,
        min_price: parseFloat(bsMinPrice) || 0,
        sort_order: budgetServices.length,
        image_url: bsImage.trim(),
        description: bsDescription.trim(),
      });
      setBsName("");
      setBsFixedPrice("");
      setBsMinPrice("");
      setBsTier1("");
      setBsTier2("");
      setBsTier3("");
      setBsType("fixed");
      setBsImage("");
      setBsDescription("");
      toast.success("Serviço de orçamento adicionado!");
      loadBudgetServices();
    } catch {
      toast.error("Erro ao adicionar serviço de orçamento");
    }
  };

  const handleEditBudgetService = async (id: string) => {
    const tiers =
      editBsType === "area"
        ? [
            { maxArea: 50, pricePerM2: parseFloat(editBsTier1) || 0 },
            { maxArea: 100, pricePerM2: parseFloat(editBsTier2) || 0 },
            { maxArea: Infinity, pricePerM2: parseFloat(editBsTier3) || 0 },
          ]
        : null;
    try {
      await updateBudgetService(id, {
        name: editBsName,
        type: editBsType,
        fixed_price: parseFloat(editBsFixedPrice) || 0,
        tiers,
        min_price: parseFloat(editBsMinPrice) || 0,
        image_url: editBsImage.trim(),
        description: editBsDescription.trim(),
      });
      setEditingBsId(null);
      toast.success("Serviço atualizado!");
      loadBudgetServices();
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  const handleDeleteBudgetService = async (id: string) => {
    if (!confirm("Excluir este serviço de orçamento?")) return;
    try {
      await deleteBudgetService(id);
      setBudgetServices(budgetServices.filter((s) => s.id !== id));
      toast.success("Serviço excluído!");
    } catch {
      toast.error("Erro ao excluir");
    }
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

  const handleAddCoupon = async () => {
    const code = coupCode.trim().toUpperCase();
    if (!code) {
      toast.error("Informe o código do cupom.");
      return;
    }
    const value = parseFloat(coupValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Valor de desconto inválido.");
      return;
    }
    if (coupType === "percent" && value > 100) {
      toast.error("Desconto percentual não pode ser maior que 100%.");
      return;
    }
    if (coupApplies === "service" && !coupServiceId) {
      toast.error("Selecione o serviço ao qual o cupom se aplica.");
      return;
    }
    try {
      await insertCoupon({
        code,
        discount_type: coupType,
        discount_value: value,
        applies_to: coupApplies,
        service_id: coupApplies === "service" ? coupServiceId : null,
        active: true,
      });
      setCoupCode("");
      setCoupValue("");
      setCoupApplies("all");
      setCoupServiceId("");
      setCoupType("percent");
      toast.success("Cupom criado!");
      loadCoupons();
    } catch (err: any) {
      if (String(err?.message || "").includes("duplicate")) {
        toast.error("Já existe um cupom com este código.");
      } else {
        toast.error("Erro ao criar cupom.");
      }
    }
  };

  const handleToggleCoupon = async (c: CouponRow) => {
    try {
      await updateCoupon(c.id!, { active: !c.active });
      loadCoupons();
    } catch {
      toast.error("Erro ao atualizar cupom.");
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    try {
      await deleteCoupon(id);
      setCoupons(coupons.filter((c) => c.id !== id));
      toast.success("Cupom excluído!");
    } catch {
      toast.error("Erro ao excluir cupom.");
    }
  };

  const handleAddClient = async () => {
    if (!clName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    try {
      await insertClient({
        name: clName.trim(),
        phone: clPhone.trim(),
        email: clEmail.trim(),
        address: clAddress.trim(),
        notes: clNotes.trim(),
      });
      setClName("");
      setClPhone("");
      setClEmail("");
      setClAddress("");
      setClNotes("");
      toast.success("Cliente cadastrado!");
      loadClients();
    } catch {
      toast.error("Erro ao cadastrar cliente.");
    }
  };

  const startEditClient = (c: ClientRow) => {
    setEditingClientId(c.id!);
    setEditClName(c.name);
    setEditClPhone(c.phone);
    setEditClEmail(c.email);
    setEditClAddress(c.address);
    setEditClNotes(c.notes);
  };

  const handleSaveClient = async (id: string) => {
    if (!editClName.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    try {
      await updateClient(id, {
        name: editClName.trim(),
        phone: editClPhone.trim(),
        email: editClEmail.trim(),
        address: editClAddress.trim(),
        notes: editClNotes.trim(),
      });
      setEditingClientId(null);
      toast.success("Cliente atualizado!");
      loadClients();
    } catch {
      toast.error("Erro ao atualizar cliente.");
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    try {
      await deleteClient(id);
      setClients(clients.filter((c) => c.id !== id));
      toast.success("Cliente excluído!");
    } catch {
      toast.error("Erro ao excluir cliente.");
    }
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.email, c.address].some((f) => (f || "").toLowerCase().includes(q)),
    );
  }, [clients, clientSearch]);

  if (!authenticated) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-16 min-h-[80vh] flex items-center justify-center bg-background">
          <div className="bg-card p-8 rounded-xl border border-border w-full max-w-sm">
            <h2 className="text-2xl font-bold text-card-foreground mb-6 text-center">Admin</h2>
            {loginMode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
                  placeholder="Usuário"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="text-right mt-1">
                    <button type="button" onClick={() => setLoginMode("forgot")} className="text-xs text-primary underline">Esqueci minha senha</button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Entrar
                </button>
              </form>
            ) : (
              <form onSubmit={handleRecover} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">Informe o e-mail de recuperação cadastrado no Admin.</p>
                <input
                  type="email"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                  placeholder="E-mail"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:opacity-90"
                >
                  Recuperar Senha
                </button>
                <button type="button" onClick={() => setLoginMode("login")} className="w-full py-2 text-sm font-semibold underline text-muted-foreground hover:text-foreground">
                  Voltar ao login
                </button>
              </form>
            )}
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
                onClick={() => setActiveTab("clientes")}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === "clientes" ? "bg-background text-foreground" : "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"}`}
              >
                <Users className="w-4 h-4" /> Clientes
              </button>
              <button
                onClick={() => setActiveTab("antifraude")}
                className={`px-6 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${activeTab === "antifraude" ? "bg-background text-foreground" : "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"}`}
              >
                <ShieldAlert className="w-4 h-4" /> Afiliados
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
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(Number(e.target.value))}
                  className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground">{filteredOrders.length} pedidos encontrados</span>
              </div>

              {/* Pedido Manual */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Pedido Manual
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Nome do cliente *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={manualPhone}
                    onChange={(e) => setManualPhone(applyPhoneMask(e.target.value))}
                    placeholder="Telefone"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Serviços</h3>
                    <button
                      type="button"
                      onClick={addManualItem}
                      className="text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-md hover:opacity-80 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Adicionar serviço
                    </button>
                  </div>
                  {manualItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 sm:grid-cols-[1fr,160px,auto] gap-2 items-center p-3 rounded-lg bg-secondary/40 border border-border"
                    >
                      <input
                        value={item.description}
                        onChange={(e) => updateManualItem(idx, "description", e.target.value)}
                        placeholder="Descrição do serviço *"
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.value}
                        onChange={(e) => updateManualItem(idx, "value", e.target.value)}
                        placeholder="Valor (R$) *"
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => removeManualItem(idx)}
                        className="text-destructive hover:opacity-70 transition-opacity p-2 justify-self-end"
                        aria-label="Remover serviço"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total:</span>
                    <span className="text-lg font-bold text-primary">
                      {manualItems
                        .reduce((sum, it) => sum + (parseFloat(it.value) || 0), 0)
                        .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleManualOrder}
                  className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Adicionar Pedido
                </button>
              </div>

              {/* Lista de Pedidos */}
              {loading && <p className="text-muted-foreground text-center">Carregando...</p>}
              {!loading && filteredOrders.length === 0 && (
                <p className="text-muted-foreground text-center">Nenhum pedido encontrado</p>
              )}

              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-card rounded-xl p-6 border border-border">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-card-foreground">{order.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {order.created_at ? new Date(order.created_at).toLocaleString("pt-BR") : ""}
                      </p>
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

                  {order.phone && (
                    <p className="text-sm text-foreground">
                      <strong>Tel:</strong> {order.phone}
                    </p>
                  )}
                  {order.email && (
                    <p className="text-sm text-foreground">
                      <strong>Email:</strong> {order.email}
                    </p>
                  )}
                  {order.address && (
                    <p className="text-sm text-foreground">
                      <strong>Endereço:</strong> {order.address}
                    </p>
                  )}
                  <p className="text-sm text-foreground mt-1">
                    <strong>Serviços:</strong> {order.services}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">Total: R$ {Number(order.total).toFixed(2)}</p>

                  <div className="mt-3">
                    <textarea
                      value={order.notes || ""}
                      onChange={(e) =>
                        setOrders(orders.map((o) => (o.id === order.id ? { ...o, notes: e.target.value } : o)))
                      }
                      onBlur={() => handleUpdateNotes(order.id!, order.notes)}
                      placeholder="Observações / Agendamento"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {order.phone && (
                      <a
                        href={`https://wa.me/55${order.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90"
                      >
                        <Phone className="w-4 h-4" /> WhatsApp
                      </a>
                    )}
                    {order.address && (
                      <a
                        href={`https://www.google.com/maps/search/${encodeURIComponent(order.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90"
                      >
                        <MapPin className="w-4 h-4" /> Como Chegar
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(order.id!)}
                      className="bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90"
                    >
                      <Trash2 className="w-4 h-4" /> Excluir
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await generateReceipt(order);
                          toast.success("Recibo gerado!");
                        } catch (err) {
                          console.error("Erro ao gerar recibo:", err);
                          toast.error("Erro ao gerar recibo");
                        }
                      }}
                      className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:opacity-90"
                    >
                      <Receipt className="w-4 h-4" /> Gerar Recibo PDF
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : activeTab === "clientes" ? (
            <>
              {/* Cadastro de Clientes */}
              <div className="bg-secondary/40 rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Cadastrar Cliente
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={clName}
                    onChange={(e) => setClName(e.target.value)}
                    placeholder="Nome *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={clPhone}
                    onChange={(e) => setClPhone(applyPhoneMask(e.target.value))}
                    placeholder="Telefone"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="email"
                    value={clEmail}
                    onChange={(e) => setClEmail(e.target.value)}
                    placeholder="E-mail"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    value={clAddress}
                    onChange={(e) => setClAddress(e.target.value)}
                    placeholder="Endereço"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <textarea
                    value={clNotes}
                    onChange={(e) => setClNotes(e.target.value)}
                    placeholder="Observações"
                    rows={2}
                    className="sm:col-span-2 w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={handleAddClient}
                  className="mt-4 bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Cliente
                </button>
              </div>

              {/* Lista de Clientes */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                    <Users className="w-5 h-5" /> Clientes Cadastrados ({filteredClients.length})
                  </h2>
                  <div className="flex items-center gap-2 bg-background border border-input rounded-lg px-3 py-1.5">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="bg-transparent text-sm text-foreground focus:outline-none w-48"
                    />
                  </div>
                </div>

                {filteredClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredClients.map((c) => (
                      <div key={c.id} className="bg-secondary/40 border border-border rounded-lg p-4">
                        {editingClientId === c.id ? (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <input
                                value={editClName}
                                onChange={(e) => setEditClName(e.target.value)}
                                placeholder="Nome *"
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <input
                                value={editClPhone}
                                onChange={(e) => setEditClPhone(applyPhoneMask(e.target.value))}
                                placeholder="Telefone"
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <input
                                type="email"
                                value={editClEmail}
                                onChange={(e) => setEditClEmail(e.target.value)}
                                placeholder="E-mail"
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <input
                                value={editClAddress}
                                onChange={(e) => setEditClAddress(e.target.value)}
                                placeholder="Endereço"
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <textarea
                                value={editClNotes}
                                onChange={(e) => setEditClNotes(e.target.value)}
                                placeholder="Observações"
                                rows={2}
                                className="sm:col-span-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveClient(c.id!)}
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 flex items-center gap-1"
                              >
                                <Save className="w-4 h-4" /> Salvar
                              </button>
                              <button
                                onClick={() => setEditingClientId(null)}
                                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 flex items-center gap-1"
                              >
                                <X className="w-4 h-4" /> Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-card-foreground">{c.name}</p>
                              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                {c.phone && (
                                  <p className="flex items-center gap-1.5">
                                    <Phone className="w-3.5 h-3.5" /> {c.phone}
                                  </p>
                                )}
                                {c.email && (
                                  <p className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" /> {c.email}
                                  </p>
                                )}
                                {c.address && (
                                  <p className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {c.address}
                                  </p>
                                )}
                                {c.notes && <p className="italic mt-1">{c.notes}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditClient(c)}
                                className="text-primary hover:opacity-70 p-2"
                                aria-label="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(c.id!)}
                                className="text-destructive hover:opacity-70 p-2"
                                aria-label="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === "antifraude" ? (
            <>
              {/* Painel Antifraude */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-600" /> Pedidos suspeitos / bloqueados
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Pedidos vinculados a afiliados marcados pelo sistema antifraude. Você pode aprovar ou bloquear.
                </p>
                {afLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : afOrders.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum pedido suspeito. ✅</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Data</th>
                          <th className="py-2 pr-3">Cliente</th>
                          <th className="py-2 pr-3">Afiliado</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Motivos</th>
                          <th className="py-2 pr-3 text-right">Total</th>
                          <th className="py-2 pr-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {afOrders.map((o) => (
                          <tr key={o.id} className="border-b last:border-0 align-top">
                            <td className="py-2 pr-3">
                              {o.created_at ? new Date(o.created_at).toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="py-2 pr-3">
                              <div className="font-medium">{o.name}</div>
                              <div className="text-xs text-muted-foreground">{o.phone}</div>
                            </td>
                            <td className="py-2 pr-3 font-mono text-xs">{o.affiliate_code || "-"}</td>
                            <td className="py-2 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  o.fraud_status === "blocked"
                                    ? "bg-red-500/15 text-red-600"
                                    : "bg-yellow-500/15 text-yellow-700"
                                }`}
                              >
                                {o.fraud_status}
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-xs max-w-xs">{o.fraud_reasons || "-"}</td>
                            <td className="py-2 pr-3 text-right">R$ {Number(o.total || 0).toFixed(2)}</td>
                            <td className="py-2 pr-3">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={async () => {
                                    await setOrderFraudStatus(o.id!, "ok");
                                    toast.success("Pedido aprovado.");
                                    loadAntifraud();
                                  }}
                                  className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={async () => {
                                    await setOrderFraudStatus(o.id!, "blocked", o.fraud_reasons || "Bloqueado pelo admin");
                                    toast.success("Pedido bloqueado.");
                                    loadAntifraud();
                                  }}
                                  className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                                >
                                  Bloquear
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Afiliados */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5" /> Afiliados cadastrados
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Bloqueie afiliados suspeitos. Bloqueio impede login e zera comissões futuras.
                </p>
                {afLoading ? (
                  <p className="text-muted-foreground">Carregando...</p>
                ) : afAffiliates.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum afiliado cadastrado.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 pr-3">Nome</th>
                          <th className="py-2 pr-3">Usuário</th>
                          <th className="py-2 pr-3">Código</th>
                          <th className="py-2 pr-3">CPF</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">A Pagar</th>
                          <th className="py-2 pr-3">Pendente</th>
                          <th className="py-2 pr-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {afAffiliates.map((a) => {
                          const { released, pending } = getAffiliateCommissions(a.referral_code);
                          return (
                          <tr key={a.id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{a.full_name}</td>
                            <td className="py-2 pr-3">{a.username}</td>
                            <td className="py-2 pr-3 font-mono text-xs">{a.referral_code}</td>
                            <td className="py-2 pr-3">{a.cpf}</td>
                            <td className="py-2 pr-3">
                              {a.blocked ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-600">
                                  Bloqueado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-600">
                                  Ativo
                                </span>
                              )}
                            </td>
                            <td className="py-2 pr-3 font-semibold text-green-600">R$ {released.toFixed(2)}</td>
                            <td className="py-2 pr-3 font-semibold text-yellow-600">R$ {pending.toFixed(2)}</td>
                            <td className="py-2 pr-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => setViewingAffiliateId(a.id!)}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                                >
                                  Extrato
                                </button>
                                {a.blocked ? (
                                  <button
                                    onClick={async () => {
                                      await setAffiliateBlocked(a.id!, false, "");
                                      toast.success("Afiliado desbloqueado.");
                                      loadAntifraud();
                                    }}
                                    className="text-xs bg-green-600 text-white px-2 py-1 rounded"
                                  >
                                    Desbloquear
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      const reason = prompt("Motivo do bloqueio:") || "Suspeita de fraude";
                                      await setAffiliateBlocked(a.id!, true, reason);
                                      toast.success("Afiliado bloqueado.");
                                      loadAntifraud();
                                    }}
                                    className="text-xs bg-red-600 text-white px-2 py-1 rounded"
                                  >
                                    Bloquear
                                  </button>
                                )}
                                <button
                                  onClick={async () => {
                                    if (!confirm("Excluir este afiliado permanentemente?")) return;
                                    try {
                                      await deleteAffiliate(a.id!);
                                      toast.success("Afiliado excluído!");
                                      loadAntifraud();
                                    } catch {
                                      toast.error("Erro ao excluir afiliado.");
                                    }
                                  }}
                                  className="text-xs bg-red-800 text-white px-2 py-1 rounded"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Gerenciar Serviços de Orçamento */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" /> Serviços da Página Orçamento
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <input
                    value={bsName}
                    onChange={(e) => setBsName(e.target.value)}
                    placeholder="Nome do serviço *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <select
                    value={bsType}
                    onChange={(e) => setBsType(e.target.value as "fixed" | "area")}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="fixed">Preço Fixo (por unidade)</option>
                    <option value="area">Por Área (m²)</option>
                  </select>
                </div>
                <input
                  value={bsImage}
                  onChange={(e) => setBsImage(e.target.value)}
                  placeholder="URL da imagem (catálogo)"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                />
                <textarea
                  value={bsDescription}
                  onChange={(e) => setBsDescription(e.target.value)}
                  placeholder="Descrição curta (catálogo)"
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                  rows={2}
                />
                {bsType === "fixed" ? (
                  <input
                    type="number"
                    value={bsFixedPrice}
                    onChange={(e) => setBsFixedPrice(e.target.value)}
                    placeholder="Preço fixo (R$) *"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
                  />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <input
                      type="number"
                      value={bsTier1}
                      onChange={(e) => setBsTier1(e.target.value)}
                      placeholder="Preço/m² até 50m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={bsTier2}
                      onChange={(e) => setBsTier2(e.target.value)}
                      placeholder="Preço/m² 51-100m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={bsTier3}
                      onChange={(e) => setBsTier3(e.target.value)}
                      placeholder="Preço/m² acima 100m²"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <input
                      type="number"
                      value={bsMinPrice}
                      onChange={(e) => setBsMinPrice(e.target.value)}
                      placeholder="Preço mínimo (R$)"
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                )}
                <button
                  onClick={handleAddBudgetService}
                  className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Adicionar Serviço
                </button>

                {budgetServices.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {budgetServices.map((bs) => (
                      <div key={bs.id} className="p-4 rounded-lg bg-secondary border border-border">
                        {editingBsId === bs.id ? (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <input
                                value={editBsName}
                                onChange={(e) => setEditBsName(e.target.value)}
                                placeholder="Nome"
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <select
                                value={editBsType}
                                onChange={(e) => setEditBsType(e.target.value as "fixed" | "area")}
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="fixed">Preço Fixo</option>
                                <option value="area">Por Área (m²)</option>
                              </select>
                            </div>
                            <input
                              value={editBsImage}
                              onChange={(e) => setEditBsImage(e.target.value)}
                              placeholder="URL da imagem"
                              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <textarea
                              value={editBsDescription}
                              onChange={(e) => setEditBsDescription(e.target.value)}
                              placeholder="Descrição curta"
                              className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              rows={2}
                            />
                            {editBsType === "fixed" ? (
                              <input
                                type="number"
                                value={editBsFixedPrice}
                                onChange={(e) => setEditBsFixedPrice(e.target.value)}
                                placeholder="Preço fixo"
                                className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                            ) : (
                              <div className="grid sm:grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  value={editBsTier1}
                                  onChange={(e) => setEditBsTier1(e.target.value)}
                                  placeholder="R$/m² até 50m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                  type="number"
                                  value={editBsTier2}
                                  onChange={(e) => setEditBsTier2(e.target.value)}
                                  placeholder="R$/m² 51-100m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                  type="number"
                                  value={editBsTier3}
                                  onChange={(e) => setEditBsTier3(e.target.value)}
                                  placeholder="R$/m² +100m²"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <input
                                  type="number"
                                  value={editBsMinPrice}
                                  onChange={(e) => setEditBsMinPrice(e.target.value)}
                                  placeholder="Preço mínimo"
                                  className="w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditBudgetService(bs.id!)}
                                className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1"
                              >
                                <Save className="w-4 h-4" /> Salvar
                              </button>
                              <button
                                onClick={() => setEditingBsId(null)}
                                className="bg-muted text-muted-foreground px-4 py-1.5 rounded-lg text-sm flex items-center gap-1"
                              >
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
                                    const idx = budgetServices.findIndex((b) => b.id === bs.id);
                                    if (idx <= 0) return;
                                    const prev = budgetServices[idx - 1];
                                    await updateBudgetService(bs.id!, { sort_order: prev.sort_order });
                                    await updateBudgetService(prev.id!, { sort_order: bs.sort_order });
                                    loadBudgetServices();
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  disabled={budgetServices.findIndex((b) => b.id === bs.id) === 0}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const idx = budgetServices.findIndex((b) => b.id === bs.id);
                                    if (idx >= budgetServices.length - 1) return;
                                    const next = budgetServices[idx + 1];
                                    await updateBudgetService(bs.id!, { sort_order: next.sort_order });
                                    await updateBudgetService(next.id!, { sort_order: bs.sort_order });
                                    loadBudgetServices();
                                  }}
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                  disabled={
                                    budgetServices.findIndex((b) => b.id === bs.id) === budgetServices.length - 1
                                  }
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{bs.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {bs.type === "fixed"
                                    ? `Preço fixo: R$ ${Number(bs.fixed_price).toFixed(2)}`
                                    : `Por m² | Mín: R$ ${Number(bs.min_price).toFixed(2)}`}
                                </p>
                              </div>
                              {bs.image_url && (
                                <img
                                  src={bs.image_url}
                                  alt={bs.name}
                                  className="w-14 h-14 object-cover rounded-md ml-2"
                                />
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingBsId(bs.id!);
                                  setEditBsName(bs.name);
                                  setEditBsType(bs.type);
                                  setEditBsFixedPrice(String(bs.fixed_price || ""));
                                  setEditBsMinPrice(String(bs.min_price || ""));
                                  const t = bs.tiers || [];
                                  setEditBsTier1(String(t[0]?.pricePerM2 || ""));
                                  setEditBsTier2(String(t[1]?.pricePerM2 || ""));
                                  setEditBsTier3(String(t[2]?.pricePerM2 || ""));
                                  setEditBsImage(bs.image_url || "");
                                  setEditBsDescription(bs.description || "");
                                }}
                                className="text-primary hover:opacity-70"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBudgetService(bs.id!)}
                                className="text-destructive hover:opacity-70"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cupons de Desconto */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-1 flex items-center gap-2">
                  <Tag className="w-5 h-5" /> Cupons de Desconto
                </h2>
                <p className="text-sm text-muted-foreground mb-5">
                  Crie cupons que podem ser aplicados a todos os serviços ou a um serviço específico.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Código *</label>
                    <input
                      value={coupCode}
                      onChange={(e) => setCoupCode(e.target.value.toUpperCase())}
                      placeholder="EX: PROMO10"
                      maxLength={50}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Tipo de desconto *</label>
                    <select
                      value={coupType}
                      onChange={(e) => setCoupType(e.target.value as "percent" | "fixed")}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="percent">Percentual (%)</option>
                      <option value="fixed">Valor fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Valor do desconto * {coupType === "percent" ? "(%)" : "(R$)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={coupValue}
                      onChange={(e) => setCoupValue(e.target.value)}
                      placeholder={coupType === "percent" ? "Ex: 10" : "Ex: 50"}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Aplicar a *</label>
                    <select
                      value={coupApplies}
                      onChange={(e) => setCoupApplies(e.target.value as "all" | "service")}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="all">Todos os serviços</option>
                      <option value="service">Serviço específico</option>
                    </select>
                  </div>
                  {coupApplies === "service" && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Serviço *</label>
                      <select
                        value={coupServiceId}
                        onChange={(e) => setCoupServiceId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione um serviço...</option>
                        {budgetServices.map((bs) => (
                          <option key={bs.id} value={bs.id}>
                            {bs.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAddCoupon}
                  className="bg-accent text-accent-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Criar Cupom
                </button>

                {coupons.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {coupons.map((c) => {
                      const svc = c.service_id ? budgetServices.find((b) => b.id === c.service_id) : null;
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-lg border flex flex-wrap items-center justify-between gap-3 ${
                            c.active ? "bg-secondary border-border" : "bg-muted/40 border-border opacity-60"
                          }`}
                        >
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-base tracking-wide">
                                {c.code}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {c.discount_type === "percent"
                                  ? `${Number(c.discount_value)}%`
                                  : `R$ ${Number(c.discount_value).toFixed(2)}`}
                              </span>
                              {!c.active && (
                                <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                                  Inativo
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {c.applies_to === "all"
                                ? "Aplica-se a todos os serviços"
                                : `Aplica-se apenas a: ${svc?.name ?? "(serviço removido)"}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleCoupon(c)}
                              className="text-primary hover:opacity-70 flex items-center gap-1 text-sm"
                              title={c.active ? "Desativar" : "Ativar"}
                            >
                              {c.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteCoupon(c.id!)}
                              className="text-destructive hover:opacity-70"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
                    <label className="block text-sm font-medium text-foreground mb-1">URL do Google Apps Script</label>
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
                      <span>
                        Script configurado. Notificações automáticas <strong>ativas</strong>.
                      </span>
                    </div>
                  )}
                  {!scriptUrl && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 border border-border rounded-lg px-4 py-2.5">
                      <Bell className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Sem URL configurada. Notificações por e-mail <strong>desativadas</strong>.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Configurações de Acesso Admin */}
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="text-xl font-semibold text-card-foreground mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" /> Configurações de Acesso Admin
                </h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Usuário de Acesso</label>
                    <input
                      type="text"
                      value={editAdminUser}
                      onChange={(e) => setEditAdminUser(e.target.value.trim().toLowerCase())}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Ex: admin"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">E-mail de Recuperação</label>
                    <input
                      type="email"
                      value={editAdminEmail}
                      onChange={(e) => setEditAdminEmail(e.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="E-mail para recuperar senha"
                    />
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Alterar Senha</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Senha Atual (Obrigatória para salvar alterações)</label>
                        <input
                          type="password"
                          value={currentPw}
                          onChange={(e) => setCurrentPw(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Digite a senha atual"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Nova Senha (Opcional)</label>
                        <input
                          type="password"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Deixe em branco para não alterar"
                        />
                      </div>
                      {newPw && (
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">Confirmar Nova Senha</label>
                          <input
                            type="password"
                            value={confirmPw}
                            onChange={(e) => setConfirmPw(e.target.value)}
                            className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Confirme a nova senha"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleUpdateAdminSettings}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:opacity-90 flex items-center gap-2 mt-2 w-full justify-center"
                  >
                    <Save className="w-4 h-4" /> Salvar Configurações
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
      {viewingAffiliateId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-2xl rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingAffiliateId(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-card-foreground mb-4">Extrato de Comissões</h3>
            {(() => {
              const affiliate = afAffiliates.find(a => a.id === viewingAffiliateId);
              if (!affiliate) return null;
              const { released, pending, affiliateOrders } = getAffiliateCommissions(affiliate.referral_code);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                      <p className="text-sm text-green-700 font-semibold mb-1">Saldo Liberado (A Pagar)</p>
                      <p className="text-2xl font-bold text-green-600">R$ {released.toFixed(2)}</p>
                    </div>
                    <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                      <p className="text-sm text-yellow-700 font-semibold mb-1">Saldo Pendente (Aguardando 7 dias)</p>
                      <p className="text-2xl font-bold text-yellow-600">R$ {pending.toFixed(2)}</p>
                    </div>
                  </div>
                  <h4 className="font-semibold text-foreground mt-6 mb-2">Pedidos que geraram comissão ({affiliateOrders.length})</h4>
                  {affiliateOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pedido pago encontrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {affiliateOrders.map(o => {
                        const paidAt = o.paid_at ? new Date(o.paid_at) : new Date(o.created_at || "");
                        const isReleased = (new Date().getTime() - paidAt.getTime()) >= (7 * 24 * 60 * 60 * 1000);
                        const commission = (Number(o.total || 0) * 0.01).toFixed(2);
                        return (
                          <div key={o.id} className="p-3 border border-border rounded-lg bg-background flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm text-foreground">{o.name}</p>
                              <p className="text-xs text-muted-foreground">Data do Pagamento: {paidAt.toLocaleDateString("pt-BR")}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-primary">R$ {commission}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isReleased ? "bg-green-500/15 text-green-600" : "bg-yellow-500/15 text-yellow-600"}`}>
                                {isReleased ? "Liberado" : "Pendente"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
