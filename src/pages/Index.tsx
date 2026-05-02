import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Shield,
  Clock,
  Award,
  Droplets,
  Sun,
  Scissors,
  Search,
  UserPlus,
  Percent,
  Sparkles,
  ArrowRight,
  Star,
  ShieldCheck,
  Zap,
  Wrench,
} from "lucide-react";
import logo from "@/assets/logo.png";
import sloganBanner from "@/assets/slogan-banner.png";
import heroBg from "@/assets/hero-bg.png";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import StatsCounter from "@/components/StatsCounter";
import HowItWorks from "@/components/HowItWorks";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { fetchActiveServices, type ServiceRow } from "@/lib/supabase";

const defaultServices = [
  { icon: Search, title: "Verificar Vazamento", desc: "Detecção e reparo de vazamentos", gradient: "from-blue-500 to-cyan-500" },
  { icon: Droplets, title: "Instalação Padrão Saneago", desc: "Instalação hidráulica padrão", gradient: "from-cyan-500 to-sky-500" },
  { icon: Droplets, title: "Limpeza de Caixa d'Água", desc: "Higienização completa", gradient: "from-sky-500 to-indigo-500" },
  { icon: Droplets, title: "Limpeza de Caixa de Gordura", desc: "Manutenção preventiva", gradient: "from-emerald-500 to-teal-500" },
  { icon: Sun, title: "Limpeza de Placa Solar", desc: "Otimizando sua Geração", gradient: "from-orange-500 to-yellow-500" },
  { icon: Scissors, title: "Roçagem de Grama e Mato Alto", desc: "Deixe seu jardim sempre lindo", gradient: "from-green-500 to-lime-500" },
];

const cardGradients = [
  "from-blue-500 to-cyan-500",
  "from-cyan-500 to-sky-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-yellow-500",
  "from-green-500 to-lime-500",
  "from-pink-500 to-rose-500",
  "from-violet-500 to-fuchsia-500",
];

const benefits = [
  { icon: Shield, title: "Garantia de Serviço", desc: "Todos os serviços com garantia de qualidade e satisfação.", gradient: "from-blue-500 to-cyan-500" },
  { icon: Clock, title: "Pontualidade", desc: "Cumprimos prazos e horários combinados com você.", gradient: "from-emerald-500 to-teal-500" },
  { icon: Award, title: "Profissionais Qualificados", desc: "Equipe treinada para cada tipo de serviço.", gradient: "from-orange-500 to-pink-500" },
];

const Index = () => {
  const info = useCompanyInfo();
  const [dbServices, setDbServices] = useState<ServiceRow[] | null>(null);

  useEffect(() => {
    fetchActiveServices()
      .then((data) => setDbServices(data))
      .catch(() => setDbServices([]));
  }, []);

  return (
  <div className="min-h-screen">
    <Header />

    {/* Hero */}
    <section
      className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-40 text-primary-foreground bg-cover bg-center"
      style={{ backgroundImage: `url(${heroBg})` }}
    >

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/30 px-4 py-2 rounded-full text-sm font-semibold mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4" />
            Serviços Profissionais com Garantia
          </div>

          <img
            src={logo}
            alt="Master Soluções"
            className="h-28 md:h-36 lg:h-44 w-auto mx-auto mb-6 drop-shadow-2xl animate-fade-in-up [animation-delay:120ms]"
          />

          <div className="mb-10 overflow-hidden animate-fade-in-up [animation-delay:240ms]">
            <img
              src={sloganBanner}
              alt="Não somos Marido de Aluguel - Somos Profissionais!"
              className="h-20 md:h-28 lg:h-32 w-auto mx-auto animate-[slideInPause_8s_ease-in-out_infinite] drop-shadow-xl"
            />
          </div>
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up [animation-delay:360ms]">
            <Link
              to="/orcamento"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl"
            >
              <Zap className="w-5 h-5" /> Fazer Orçamento
            </Link>
            <a
              href={`https://wa.me/${info.company_whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-md border-2 border-white/40 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/25 hover:scale-105 transition-all"
            >
              Fale Conosco <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-primary-foreground/90 animate-fade-in-up [animation-delay:480ms]">
            <div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Garantia Total</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> Pontualidade</div>
            <div className="flex items-center gap-2"><Star className="w-4 h-4 fill-current" /> +500 Clientes</div>
          </div>
        </div>
      </div>
    </section>

    {/* Floating stats card */}
    <section className="container mx-auto px-4 -mt-16 relative z-20">
      <div className="max-w-4xl mx-auto bg-card rounded-2xl shadow-2xl border border-border p-6 md:p-8 grid grid-cols-3 gap-4">
        {[
          { value: "500+", label: "Clientes" },
          { value: "5+", label: "Anos" },
          { value: "100%", label: "Satisfação" },
        ].map((s, i) => (
          <div key={s.label} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="text-2xl md:text-4xl font-extrabold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {s.value}
            </div>
            <div className="text-xs md:text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </section>

    {/* Services */}
    <section id="servicos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            Nossos <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Serviços</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Oferecemos uma ampla gama de serviços para atender todas as suas necessidades.
          </p>
        </div>
        {dbServices && dbServices.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbServices.map((s, i) => {
              const gradient = cardGradients[i % cardGradients.length];
              const isVideo = s.media_type === "video" && (s.video_url || "").trim() !== "";
              const imageSrc = (s.image_url || "").trim();
              return (
                <div
                  key={s.id}
                  className="group relative overflow-hidden bg-card rounded-2xl border-2 border-border hover:border-primary/40 transition-all hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="aspect-video bg-muted overflow-hidden">
                    {isVideo ? (
                      <video
                        src={s.video_url}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        autoPlay
                        controls={false}
                      />
                    ) : imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={s.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
                        <Wrench className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div className={`absolute inset-x-0 top-0 aspect-video bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none`} />
                  <div className="p-5">
                    <h3 className="font-bold text-lg text-card-foreground mb-1">{s.title}</h3>
                    <p className="text-muted-foreground text-sm">{s.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultServices.map((s, i) => (
              <div
                key={s.title}
                className="group relative overflow-hidden bg-card rounded-2xl p-6 border-2 border-border hover:border-primary/40 transition-all hover:-translate-y-2 hover:shadow-2xl animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <s.icon className="w-7 h-7" />
                </div>
                <h3 className="relative font-bold text-lg text-card-foreground mb-1">{s.title}</h3>
                <p className="relative text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>

    {/* How It Works */}
    <HowItWorks />

    {/* Stats */}
    <StatsCounter />

    {/* Benefits */}
    <section className="py-20 relative overflow-hidden bg-gradient-to-br from-muted/40 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 animate-fade-in-up">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
            Por que <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">nos escolher?</span>
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="text-center bg-card rounded-2xl p-8 border border-border hover:-translate-y-2 hover:shadow-2xl transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${b.gradient} text-white flex items-center justify-center mx-auto mb-4 shadow-lg animate-float`}>
                <b.icon className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-sm">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials Carousel */}
    <TestimonialsCarousel />

    {/* CTA */}
    <section className="relative py-24 overflow-hidden bg-gradient-to-br from-accent via-primary to-primary/80 text-primary-foreground">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-300/20 rounded-full blur-3xl animate-blob [animation-delay:3s]" />
      </div>
      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-extrabold mb-4 animate-fade-in-up">
          Pronto para resolver seu problema?
        </h2>
        <p className="text-primary-foreground/90 mb-8 max-w-lg mx-auto text-lg animate-fade-in-up [animation-delay:120ms]">
          Faça um orçamento sem compromisso online, e feche seus serviços.
        </p>
        <Link
          to="/orcamento"
          className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 hover:shadow-2xl transition-all shadow-xl animate-fade-in-up [animation-delay:240ms]"
        >
          Fazer Orçamento Gratuito <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </section>

    {/* Client signup CTA */}
    <section className="py-16 bg-gradient-to-br from-accent/10 via-background to-primary/10 border-y border-accent/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-card rounded-2xl p-8 md:p-10 border-2 border-accent/40 shadow-2xl flex flex-col md:flex-row items-center gap-6 hover:-translate-y-1 transition-transform animate-fade-in-up">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-orange-500 text-white flex items-center justify-center shrink-0 shadow-lg animate-float">
            <Percent className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Cadastre-se como Cliente e ganhe{" "}
              <span className="bg-gradient-to-r from-accent to-orange-500 bg-clip-text text-transparent">3% de desconto</span>
            </h3>
            <p className="text-muted-foreground">
              Crie sua conta gratuita de Cliente, e tenha desconto automático em todos os serviços, além de
              acompanhar seus pedidos pelo painel do cliente.
            </p>
          </div>
          <Link
            to="/cliente"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-accent to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 hover:shadow-xl transition-all whitespace-nowrap shadow-lg"
          >
            <UserPlus className="w-5 h-5" /> Criar Conta de Cliente Grátis
          </Link>
        </div>
      </div>
    </section>

    <Footer />
    <WhatsAppFloat />
  </div>
  );
};

export default Index;
