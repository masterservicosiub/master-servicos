import { useEffect, useRef, useState } from "react";
import { Users, Calendar, ThumbsUp, Wrench } from "lucide-react";

const stats = [
  { icon: Users, value: 500, suffix: "+", label: "Clientes Atendidos" },
  { icon: Calendar, value: 5, suffix: "+", label: "Anos de Experiência" },
  { icon: ThumbsUp, value: 100, suffix: "%", label: "Satisfação" },
  { icon: Wrench, value: 1000, suffix: "+", label: "Serviços Realizados" },
];

const AnimatedNumber = ({ target, suffix }: { target: number; suffix: string }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <div ref={ref} className="text-4xl md:text-5xl font-bold text-primary">
      {count.toLocaleString("pt-BR")}{suffix}
    </div>
  );
};

const StatsCounter = () => (
  <section className="py-16 bg-primary/5">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <s.icon className="w-6 h-6 text-primary" />
            </div>
            <AnimatedNumber target={s.value} suffix={s.suffix} />
            <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsCounter;
