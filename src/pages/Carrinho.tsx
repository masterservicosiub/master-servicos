import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, ShoppingCart, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { readCart, removeFromCart, subscribeCart, clearCart, type CartItem } from "@/lib/cart";
import { findCouponByCode, insertOrder, type CouponRow } from "@/lib/supabase";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { applyPhoneMask } from "@/lib/phoneMask";
import { getDeviceFingerprint, getClientIp, runFraudCheck } from "@/lib/antifraud";
import { toast } from "sonner";
import { sendOrderEmailNotification } from "@/lib/emailNotification";
import { generateBudget } from "@/lib/generateBudget";
import type { OrderRow } from "@/lib/supabase";

const Carrinho = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponRow | null>(null);
  const [validating, setValidating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const info = useCompanyInfo();

  useEffect(() => {
    setItems(readCart());
    return subscribeCart(() => setItems(readCart()));
  }, []);

  const subtotal = items.reduce((s, i) => s + i.unitPrice, 0);
  let discount = 0;
  if (coupon) {
    discount =
      coupon.discount_type === "percent"
        ? subtotal * (coupon.discount_value / 100)
        : coupon.discount_value;
    discount = Math.min(discount, subtotal);
  }
  const total = subtotal - discount;

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidating(true);
    try {
      const c = await findCouponByCode(couponCode);
      if (!c) {
        toast.error("Cupom inválido");
        setCoupon(null);
      } else {
        setCoupon(c);
        toast.success("Cupom aplicado!");
      }
    } finally {
      setValidating(false);
    }
  };

  const finalize = async () => {
    if (!items.length) return;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("Informe nome, telefone e endereço.");
      return;
    }
    setSubmitting(true);
    const lines = items
      .map((i, idx) => {
        const qtyTxt =
          i.mode === "unit" ? `${i.qty}un` : i.mode === "area" ? `${i.area}m²` : "1x";
        const base = `${idx + 1}. ${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""} — ${qtyTxt} = R$ ${i.unitPrice.toFixed(2)}`;
        return i.notes?.trim() ? `${base}\n   Obs: ${i.notes.trim()}` : base;
      })
      .join("\n");
    const servicesText = lines;
    const aggregatedNotes = items
      .map((i, idx) =>
        i.notes?.trim() ? `${idx + 1}. ${i.name}: ${i.notes.trim()}` : null,
      )
      .filter(Boolean)
      .join("\n");
    try {
      const affiliate_code =
        (typeof window !== "undefined" && localStorage.getItem("affiliate_ref")) || undefined;
      const fingerprint = getDeviceFingerprint();
      const ip = await getClientIp();
      let fraud_status = "ok";
      let fraud_reasons = "";
      let finalAffiliate = affiliate_code;
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
        services: `[Angelo Design]\n${servicesText}${coupon ? `\nCupom: ${coupon.code} (-R$ ${discount.toFixed(2)})` : ""}`,
        total,
        status: "Novo",
        notes: aggregatedNotes,
        affiliate_code: finalAffiliate,
        fraud_status,
        fraud_reasons,
        client_fingerprint: fingerprint,
        client_ip: ip || undefined,
      });
      // Send email notification (best-effort, non-blocking)
      sendOrderEmailNotification({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        services: servicesText,
        total,
      }).catch((e) => console.error("E-mail notification failed:", e));
    } catch (err) {
      console.error("Erro ao salvar pedido:", err);
      toast.error("Não foi possível registrar o pedido. Tente novamente.");
      setSubmitting(false);
      return;
    }
    let msg = `Olá! Quero fechar este pedido da Angelo Design:\n\n${lines}\n\nSubtotal: R$ ${subtotal.toFixed(2)}`;
    if (coupon) msg += `\nCupom ${coupon.code} (-R$ ${discount.toFixed(2)})`;
    msg += `\n*Total: R$ ${total.toFixed(2)}*\n\nCliente: ${name}\nTel: ${phone}${email ? `\nE-mail: ${email}` : ""}${address ? `\nEndereço: ${address}` : ""}`;
    const url = `https://wa.me/${info.company_whatsapp}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    clearCart();
    setItems([]);
    setCoupon(null);
    setCouponCode("");
    toast.success("Pedido registrado!");
    setSubmitting(false);
  };

  const handleDownloadBudget = async () => {
    if (!items.length) return;
    if (!name.trim()) {
      toast.error("Informe ao menos o nome do cliente para gerar o orçamento.");
      return;
    }
    const servicesText = items
      .map((i) => {
        const label = `${i.name}${i.variationLabel ? ` (${i.variationLabel})` : ""}${
          i.mode === "unit" ? ` - ${i.qty}un` : i.mode === "area" ? ` - ${i.area}m²` : ""
        }`;
        return `${label} - R$ ${i.unitPrice.toFixed(2)}`;
      })
      .join(" | ");
    const couponPart = coupon ? ` | Cupom ${coupon.code} (- R$ ${discount.toFixed(2)})` : "";
    const order: OrderRow = {
      name: name.trim() || "Cliente",
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      services: `${servicesText}${couponPart}`,
      total,
      status: "Orçamento",
      notes: "",
    };
    try {
      await generateBudget(order);
    } catch (err) {
      console.error("Erro ao gerar orçamento PDF:", err);
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" /> Carrinho
          </h1>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Seu carrinho está vazio.</p>
              <Link
                to="/servicos-graficos"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold"
              >
                Ver produtos
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-card border border-border rounded-xl p-4 flex gap-4 items-center"
                  >
                    {it.image && (
                      <img src={it.image} alt={it.name} className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      {it.slug ? (
                        <Link to={`/produto/${it.slug}`} className="font-semibold text-card-foreground hover:text-primary">
                          {it.name}
                        </Link>
                      ) : (
                        <span className="font-semibold text-card-foreground">{it.name}</span>
                      )}
                      {it.variationLabel && (
                        <p className="text-xs text-muted-foreground">{it.variationLabel}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {it.mode === "unit"
                          ? `${it.qty} unidade(s)`
                          : it.mode === "area"
                          ? `${it.area} m²`
                          : "Preço fixo"}
                      </p>
                      {it.notes?.trim() && (
                        <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                          Obs: {it.notes.trim()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">R$ {it.unitPrice.toFixed(2)}</p>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-destructive hover:opacity-70 mt-1"
                        aria-label="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl p-4 mt-6 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome *</label>
                    <input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full h-10 rounded-md border border-input bg-background px-3 uppercase" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Telefone *</label>
                    <input value={phone} onChange={(e) => setPhone(applyPhoneMask(e.target.value))} inputMode="tel" placeholder="(00) 0 0000-0000" className="w-full h-10 rounded-md border border-input bg-background px-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">E-mail</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Endereço</label>
                    <input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cupom de desconto</label>
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3"
                      placeholder="Digite o código"
                    />
                    <button
                      onClick={validateCoupon}
                      disabled={validating}
                      className="bg-secondary text-secondary-foreground px-4 rounded-md font-medium hover:opacity-90"
                    >
                      {validating ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {coupon && (
                    <p className="text-xs text-primary mt-1">
                      Cupom {coupon.code} aplicado (-R$ {discount.toFixed(2)})
                    </p>
                  )}
                </div>

                <div className="space-y-1 pt-3 border-t border-border">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {subtotal.toFixed(2)}</span>
                  </div>
                  {coupon && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Desconto</span>
                      <span>- R$ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span>Total</span>
                    <span className="text-primary">R$ {total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={finalize}
                  disabled={submitting}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? "Enviando..." : "Finalizar pedido via WhatsApp"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Carrinho;