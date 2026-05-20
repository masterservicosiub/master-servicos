import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { cartCount, subscribeCart } from "@/lib/cart";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [hasClient, setHasClient] = useState(false);
  const [cartN, setCartN] = useState(0);

  useEffect(() => {
    const check = () => setHasClient(!!localStorage.getItem("client_session"));
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, [location.pathname]);

  useEffect(() => {
    const update = () => setCartN(cartCount());
    update();
    return subscribeCart(update);
  }, []);

  const links = [
    { to: "/", label: "Início" },
    { to: "/servicos-residenciais", label: "Serviços Residenciais" },
    { to: "/servicos-graficos", label: "Angelo Design" },
    { to: "/midias", label: "Mídias" },
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
            to="/carrinho"
            aria-label="Carrinho"
            className="relative text-muted-foreground hover:text-primary transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartN > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartN}
              </span>
            )}
          </Link>
          <Link
            to="/cliente"
            className={`flex items-center gap-1 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity ${
              location.pathname === "/cliente" ? "opacity-100" : ""
            }`}
          >
            <User className="w-4 h-4" /> {hasClient ? "Minha Conta" : "Entrar"}
          </Link>
        </nav>
        <div className="md:hidden flex items-center gap-3">
          <Link to="/carrinho" aria-label="Carrinho" className="relative text-foreground">
            <ShoppingCart className="w-5 h-5" />
            {cartN > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {cartN}
              </span>
            )}
          </Link>
          <button className="text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
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
            className="block bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            <User className="w-4 h-4 inline-block mr-1" /> {hasClient ? "Minha Conta" : "Entrar / Cadastrar"}
          </Link>
        </div>
      )}
    </header>
  );
};

export default Header;
