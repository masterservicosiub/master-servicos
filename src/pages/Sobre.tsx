import { Users, Target, Heart } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const values = [
  { icon: Target, title: "Missão", desc: "Prestar serviços de excelência, garantindo a satisfação total de nossos clientes com qualidade, pontualidade e preço justo." },
  { icon: Heart, title: "Valores", desc: "Transparência, comprometimento, respeito ao cliente e busca constante pela excelência em tudo que fazemos." },
  { icon: Users, title: "Nossa Equipe", desc: "Contamos com profissionais especializados, treinados e certificados para atender todas as suas necessidades." },
];

const Sobre = () => (
  <div className="min-h-screen">
    <Header />
    <div className="pt-16 bg-background">
      <div className="bg-primary py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">Sobre Nós</h1>
          <p className="text-primary-foreground/80">Conheça a Master Serviços e nossa história de compromisso com a qualidade.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card rounded-xl p-8 border border-border mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quem Somos</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              A Master Serviços é uma empresa especializada em prestação de serviços residenciais e comerciais. Nascemos com o objetivo de oferecer soluções completas e de alta qualidade para nossos clientes.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Com uma equipe de profissionais qualificados e comprometidos, atendemos desde verificação de vazamentos até roçagem e limpeza, sempre com transparência, pontualidade e preços competitivos.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {values.map((v) => (
              <div key={v.title} className="bg-card rounded-xl p-6 border border-border text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <v.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-card-foreground mb-2">{v.title}</h3>
                <p className="text-muted-foreground text-sm">{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-6 text-center">
            {[
              { num: "500+", label: "Serviços Realizados" },
              { num: "98%", label: "Clientes Satisfeitos" },
              { num: "⭐", label: "Compromisso com Qualidade" },
            ].map((stat) => (
              <div key={stat.label} className="bg-primary rounded-xl p-6">
                <div className="text-3xl font-bold text-primary-foreground mb-1">{stat.num}</div>
                <div className="text-primary-foreground/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <Footer />
  </div>
);

export default Sobre;
