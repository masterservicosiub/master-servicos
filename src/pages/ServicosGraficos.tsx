import Orcamento from "./Orcamento";

const ServicosGraficos = () => (
  <Orcamento
    kind="grafico"
    pageTitle="Serviços Gráficos"
    pageSubtitle="Solicite cartões, banners, panfletos e outros materiais gráficos."
  />
   return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-20">
        {mode === "landing" && (
          <>
            {/* Hero */}
            <section className="relative overflow-hidden py-24 md:py-32 bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground">
              {/* Animated gradient blobs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-white/20 blur-3xl animate-blob" />
                <div className="absolute top-20 -right-32 w-[26rem] h-[26rem] rounded-full bg-accent/40 blur-3xl animate-blob [animation-delay:2s]" />
                <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] rounded-full bg-primary-foreground/10 blur-3xl animate-blob [animation-delay:4s]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent_60%)]" />
              </div>
);

export default ServicosGraficos;
