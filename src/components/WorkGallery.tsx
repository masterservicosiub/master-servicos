import { useState } from "react";
import { X, Play, Image as ImageIcon, Video } from "lucide-react";

interface GalleryItem {
  type: "image" | "video";
  src: string;
  thumbnail: string;
  title: string;
}

const galleryItems: GalleryItem[] = [
  { type: "image", src: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800", thumbnail: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400", title: "Reparo de Vazamento" },
  { type: "image", src: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800", thumbnail: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400", title: "Instalação Hidráulica" },
  { type: "image", src: "https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800", thumbnail: "https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=400", title: "Limpeza de Caixa d'Água" },
  { type: "image", src: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=800", thumbnail: "https://images.unsplash.com/photo-1592595896551-12b371d546d5?w=400", title: "Roçagem de Grama" },
  { type: "image", src: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800", thumbnail: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400", title: "Limpeza Placa Solar" },
  { type: "image", src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800", thumbnail: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400", title: "Manutenção Geral" },
];

const WorkGallery = () => {
  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  const filtered = filter === "all" ? galleryItems : galleryItems.filter((i) => i.type === filter);

  return (
    <section className="py-20 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Nossos Trabalhos</h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Veja alguns dos serviços que já realizamos para nossos clientes.
          </p>
          <div className="flex items-center justify-center gap-3">
            {(["all", "image", "video"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-card/80 border border-border"
                }`}
              >
                {f === "all" ? "Todos" : f === "image" ? (
                  <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Fotos</span>
                ) : (
                  <span className="flex items-center gap-1"><Video className="w-4 h-4" /> Vídeos</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {filtered.map((item) => (
            <button
              key={item.src}
              onClick={() => setSelected(item)}
              className="relative group rounded-xl overflow-hidden aspect-square bg-muted"
            >
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center">
                {item.type === "video" && (
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                )}
                <span className="absolute bottom-3 left-3 text-sm font-medium text-background opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button className="absolute top-4 right-4 text-background hover:text-accent" onClick={() => setSelected(null)}>
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {selected.type === "image" ? (
              <img src={selected.src} alt={selected.title} className="w-full h-auto rounded-xl" />
            ) : (
              <video src={selected.src} controls autoPlay className="w-full h-auto rounded-xl" />
            )}
            <p className="text-background text-center mt-3 font-medium">{selected.title}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default WorkGallery;
