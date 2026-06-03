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
import Produto from "./pages/Produto.tsx";
import Servico from "./pages/Servico.tsx";
import Carrinho from "./pages/Carrinho.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import AdminGear from "./components/AdminGear.tsx";
import AffiliateCapture from "./components/AffiliateCapture.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AffiliateCapture />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/orcamento" element={<ServicosResidenciais />} />
          <Route path="/master-servicos" element={<ServicosResidenciais />} />
          <Route path="/angelo-design" element={<ServicosGraficos />} />
          <Route path="/servicos-residenciais" element={<ServicosResidenciais />} />
          <Route path="/servicos-graficos" element={<ServicosGraficos />} />
          <Route path="/midias" element={<Midias />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/afiliados" element={<Afiliados />} />
          <Route path="/cliente" element={<Cliente />} />
          <Route path="/produto/:slug" element={<Produto />} />
          <Route path="/angelo-design/:slug" element={<Produto />} />
          <Route path="/servico/:id" element={<Servico />} />
          <Route path="/master-servicos/:id" element={<Servico />} />
          <Route path="/carrinho" element={<Carrinho />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AdminGear />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
