import { Star } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";

const testimonials = [
  { name: "Maria Silva", text: "Excelente serviço! Profissionais muito atenciosos e pontuais.", rating: 5 },
  { name: "João Santos", text: "Resolveram o vazamento rapidamente. Recomendo!", rating: 5 },
  { name: "Ana Costa", text: "Roçagem ficou perfeita, superou minhas expectativas.", rating: 5 },
  { name: "Carlos Oliveira", text: "Limpeza da caixa d'água feita com muito profissionalismo.", rating: 5 },
  { name: "Fernanda Lima", text: "Serviço de qualidade e preço justo. Voltarei a contratar!", rating: 5 },
];

const TestimonialsCarousel = () => (
  <section className="py-20 bg-background">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">O que nossos clientes dizem</h2>
      </div>
      <div className="max-w-4xl mx-auto px-12">
        <Carousel
          opts={{ align: "start", loop: true }}
          plugins={[Autoplay({ delay: 4000, stopOnInteraction: false })]}
        >
          <CarouselContent>
            {testimonials.map((t) => (
              <CarouselItem key={t.name} className="md:basis-1/2 lg:basis-1/2">
                <div className="bg-card rounded-xl p-6 border border-border h-full">
                  <div className="flex gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-sm mb-4">"{t.text}"</p>
                  <p className="font-semibold text-card-foreground text-sm">{t.name}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </div>
  </section>
);

export default TestimonialsCarousel;
