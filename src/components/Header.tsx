import { Link, useLocation } from "react-router-dom";
import { Menu, X, User } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [hasClient, setHasClient] = useState(false);

  useEffect(() => {
    const check = () => setHasClient(!!localStorage.getItem("client_session"));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [location.pathname]);

  const links = [
    { to: "/", label: "Início" },
    { to: "/orcamento", label: "Orçamento" },
    { to: "/sobre", label: "Sobre Nós" },
    { to: "/afiliados", label: "Afiliados" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Master Soluções" className="h-12 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === link.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/cliente"
            className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === "/cliente" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <User className="w-4 h-4" /> {hasClient ? "Minha Conta" : "Entrar"}
          </Link>
          <Link
            to="/orcamento"
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Solicitar Orçamento
          </Link>
        </nav>
        <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 pb-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/cliente"
            onClick={() => setMenuOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-primary"
          >
            {hasClient ? "Minha Conta" : "Entrar / Cadastrar"}
          </Link>
          <Link
            to="/orcamento"
            onClick={() => setMenuOpen(false)}
            className="block bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold text-center"
          >
            Solicitar Orçamento
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
