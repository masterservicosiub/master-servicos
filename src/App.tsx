import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ServicosResidenciais from "./pages/ServicosResidenciais.tsx";
import ServicosGraficos from "./pages/ServicosGraficos.tsx";
import Midias from "./pages/Midias.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import Afiliados from "./pages/Afiliados.tsx";
import Cliente from "./pages/Cliente.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import AdminGear from "./components/AdminGear.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/orcamento" element={<ServicosResidenciais />} />
          <Route path="/servicos-residenciais" element={<ServicosResidenciais />} />
          <Route path="/servicos-graficos" element={<ServicosGraficos />} />
          <Route path="/midias" element={<Midias />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/afiliados" element={<Afiliados />} />
          <Route path="/cliente" element={<Cliente />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AdminGear />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
