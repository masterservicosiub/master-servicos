import { MousePointerClick, PlusCircle, Phone, CalendarCheck, CheckCircle2 } from "lucide-react";

const steps = [
  { 
    icon: MousePointerClick, 
    title: "Ver o Valor", 
    desc: 'Clique em "Solicitar Orçamento" e veja o valor dos serviços.' 
  },
  { 
    icon: PlusCircle, 
    title: "Adicione Serviços", 
    desc: 'Adicione os serviços que precisa e clique em "Solicitar Serviços".' 
  },
  { 
    icon: Phone, 
    title: "Entramos em Contato", 
    desc: "Confirmamos seus serviços e tiramos dúvidas." 
  },
  { 
    icon: CalendarCheck, 
    title: "Agendamento", 
    desc: "Agendamos a melhor data para a execução." 
  },
  { 
    icon: CheckCircle2, 
    title: "Serviço Concluído", 
    desc: "Serviço entregue e cliente satisfeito!" 
  },
];

const HowItWorks = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Como Funciona</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Contratar nossos serviços é simples e rápido. Veja o passo a passo:
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 max-w-6xl mx-auto">
        {steps.map((s, i) => (
          <div key={s.title} className="text-center relative">
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-border" />
            )}
            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 relative z-10 shadow-md">
              <s.icon className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-primary mb-2 block">Passo {i + 1}</span>
            <h3 className="font-semibold text-lg text-foreground mb-1">{s.title}</h3>
            <p className="text-muted-foreground text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;