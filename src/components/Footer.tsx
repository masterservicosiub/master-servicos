import { Phone, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const Footer = () => (
  <footer className="bg-foreground text-background py-12">
    <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8">
      <div>
        <img src={logo} alt="Master Soluções" className="h-16 w-auto mb-4 brightness-0 invert" />
        <p className="text-sm opacity-70">
          Soluções completas em serviços para sua casa e empresa. Qualidade e confiança em cada projeto.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Links Rápidos</h4>
        <div className="space-y-2 text-sm opacity-70">
          <Link to="/" className="block hover:opacity-100">
            Início
          </Link>
          <Link to="/orcamento" className="block hover:opacity-100">
            Orçamento
          </Link>
          <Link to="/sobre" className="block hover:opacity-100">
            Sobre Nós
          </Link>
        </div>
      </div>
      <div>
        <h4 className="font-semibold mb-4">Contato</h4>
        <div className="space-y-2 text-sm opacity-70">
          <a
            href="https://wa.me/5564992642950"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:opacity-100"
          >
            <Phone className="w-4 h-4" /> (64) 9 9264-2950
          </a>
          <a href="mailto:masterservicos.iub@gmail.com" className="flex items-center gap-2 hover:opacity-100">
            <Mail className="w-4 h-4" /> masterservicos.iub@gmail.com
          </a>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Itumbiara/GO - Setor Planalto - CEP 75533-250
          </div>
        </div>
      </div>
    </div>
    <div className="container mx-auto px-4 mt-8 pt-8 border-t border-background/20 text-center text-sm opacity-50">
      <div className="flex items-center justify-center gap-4">
        <span>© 2026 Master Soluções. Todos os direitos reservados.</span>
      </div>
      <div className="mt-2">CNPJ: 61.906.390/0001-58</div>
    </div>
  </footer>
);

export default Footer;
