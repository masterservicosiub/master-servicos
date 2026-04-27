import { Link } from "react-router-dom";
import { Shield, Clock, Award, Droplets, Sun, Scissors, Search, UserPlus, Percent } from "lucide-react";
import logo from "@/assets/logo.png";
import sloganBanner from "@/assets/slogan-banner.png";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import TestimonialsCarousel from "@/components/TestimonialsCarousel";
import StatsCounter from "@/components/StatsCounter";
import HowItWorks from "@/components/HowItWorks";

import heroBg from "@/assets/hero-banner.jpg";

const services = [
  { icon: Search, title: "Verificar Vazamento", desc: "Detecção e reparo de vazamentos" },
  { icon: Droplets, title: "Instalação Padrão Saneago", desc: "Instalação hidráulica padrão" },
  { icon: Droplets, title: "Limpeza de Caixa d'Água", desc: "Higienização completa" },
  { icon: Droplets, title: "Limpeza de Caixa de Gordura", desc: "Manutenção preventiva" },
  { icon: Sun, title: "Limpeza de Placa Solar", desc: "Otimizando sua Geração" },
  { icon: Scissors, title: "Roçagem de Grama e Mato Alto", desc: "Deixe seu jardim sempre lindo" },
];

const benefits = [
  { icon: Shield, title: "Garantia de Serviço", desc: "Todos os serviços com garantia de qualidade e satisfação." },
  { icon: Clock, title: "Pontualidade", desc: "Cumprimos prazos e horários combinados com você." },
  { icon: Award, title: "Profissionais Qualificados", desc: "Equipe treinada para cada tipo de serviço." },
];

const Index = () => (
  <div className="min-h-screen">
    <Header />

    {/* Hero */}
    <section className="relative min-h-[600px] flex items-center pt-16">
      <div className="absolute inset-0">
        <img
          src={heroBg}
          alt="Serviços profissionais"
          className="w-full h-full object-cover"
          width={1920}
          height={1024}
        />
        <div className="absolute inset-0 bg-foreground/70" />
      </div>
      <div className="container mx-auto px-4 relative z-10 py-20">
        <div className="max-w-2xl">
          <img
            src={logo}
            alt="Master Serviços"
            className="h-32 md:h-40 lg:h-48 w-auto mb-6 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] drop-shadow-2xl"
          />
          <div className="mb-8 max-w-xl overflow-hidden">
            <img
              src={sloganBanner}
              alt="Não somos Marido de Aluguel - Somos Profissionais!"
              className="h-24 md:h-[8.4rem] lg:h-[9.6rem] w-auto animate-[slideInPause_8s_ease-in-out_infinite] drop-shadow-xl"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/orcamento"
              className="bg-primary text-primary-foreground w-56 text-center py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Fazer Orçamento
            </Link>
            <a
              href="https://wa.me/5564992642950"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white w-56 text-center py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
            >
              Fale Conosco
            </a>
          </div>
        </div>
      </div>
    </section>

    {/* Services */}
    <section id="servicos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Nossos Serviços</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Oferecemos uma ampla gama de serviços para atender todas as suas necessidades.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((s) => (
            <div
              key={s.title}
              className="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <s.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-card-foreground mb-1">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How It Works */}
    <HowItWorks />

    {/* Stats */}
    <StatsCounter />

    {/* Benefits */}
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Por que nos escolher?</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((b) => (
            <div key={b.title} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <b.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">{b.title}</h3>
              <p className="text-muted-foreground text-sm">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Testimonials Carousel */}
    <TestimonialsCarousel />

    {/* CTA */}
    <section className="py-20 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Pronto para resolver seu problema?
        </h2>
        <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
          Faça um orçamento sem compromisso online, e feche seus serviços.
        </p>
        <Link
          to="/orcamento"
          className="inline-block bg-accent text-accent-foreground px-8 py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
        >
          Fazer Orçamento Gratuito
        </Link>
      </div>
    </section>

    {/* Client signup CTA */}
    <section className="py-16 bg-accent/10 border-y border-accent/30">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto bg-card rounded-2xl p-8 md:p-10 border border-border shadow-lg flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
            <Percent className="w-10 h-10 text-accent" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Cadastre-se e ganhe <span className="text-accent">3% de desconto</span>
            </h3>
            <p className="text-muted-foreground">
              Crie sua conta gratuita e tenha desconto automático em todos os serviços, além de
              acompanhar seus pedidos pelo painel do cliente.
            </p>
          </div>
          <Link
            to="/cliente"
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" /> Criar Conta Grátis
          </Link>
        </div>
      </div>
    </section>

    <Footer />
    <WhatsAppFloat />
  </div>
);

export default Index;
