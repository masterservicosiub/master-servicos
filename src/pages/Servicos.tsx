import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { Camera } from "lucide-react";

export interface ServiceItem {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  created_at?: string;
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as ServiceItem[];
}

const Servicos = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16 bg-background">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">Nossos Serviços</h1>
            <p className="text-primary-foreground/80">Confira alguns dos serviços executados pela nossa equipe.</p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {loading && <p className="text-muted-foreground text-center">Carregando...</p>}
          {!loading && services.length === 0 && (
            <div className="text-center py-20">
              <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum serviço cadastrado ainda.</p>
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s) => (
              <div key={s.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {s.image_url && (
                  <img src={s.image_url} alt={s.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-card-foreground mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Servicos;
