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

      {/* HERO */}
      <section
        className="relative overflow-hidden pt-24 pb-32 text-white bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="container mx-auto px-4 text-center">
          <img src={logo} alt="Master Serviços - Manutenção residencial em Goiânia" className="h-28 mx-auto mb-6" />

          <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Serviços de Manutenção Residencial em Goiânia</h1>

          <p className="max-w-2xl mx-auto mb-6 text-white/90">
            Encanador, eletricista, limpeza de caixa d'água, roçagem e serviços gerais em Goiânia. Atendimento rápido,
            profissional e com garantia.
          </p>

          <img src={sloganBanner} alt="Serviços profissionais de manutenção em Goiânia" className="h-20 mx-auto mb-8" />

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/orcamento" className="bg-white text-black px-8 py-4 rounded-xl font-bold">
              Fazer Orçamento
            </Link>

            <a
              href={`https://wa.me/${info.company_whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white px-8 py-4 rounded-xl"
            >
              Fale Conosco
            </a>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Serviços de Manutenção em Goiânia</h2>

          <p className="text-muted-foreground max-w-xl mx-auto mb-10">
            Oferecemos serviços de encanador, eletricista, limpeza de caixa d’água, manutenção hidráulica e serviços
            gerais em Goiânia e região.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {(dbServices || []).map((s) => (
              <div key={s.id} className="border rounded-xl p-5">
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BLOCO SEO (IMPORTANTE) */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Empresa de Serviços em Goiânia</h2>

          <p className="mb-4 text-gray-600">
            A Master Serviços é especializada em manutenção residencial em Goiânia, oferecendo serviços de encanador,
            eletricista, limpeza de caixa d'água, roçagem e manutenção geral.
          </p>

          <p className="mb-4 text-gray-600">
            Atendemos diversos bairros de Goiânia com rapidez, qualidade e garantia, sempre com profissionais
            qualificados e atendimento eficiente.
          </p>

          <p className="text-gray-600">
            Solicite agora seu orçamento e tenha seu problema resolvido com segurança e profissionalismo.
          </p>
        </div>
      </section>

      <StatsCounter />
      <HowItWorks />
      <TestimonialsCarousel />

      <Footer />
      <WhatsAppFloat />
    </div>
  );
};

export default Index;
