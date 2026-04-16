import { Settings } from "lucide-react";
import { Link } from "react-router-dom";

const AdminGear = () => (
  <Link
    to="/admin"
    className="fixed bottom-6 left-6 z-50 bg-foreground/80 hover:bg-foreground text-background rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 backdrop-blur-sm"
    aria-label="Acessar Painel Admin"
    title="Painel Admin"
  >
    <Settings className="w-5 h-5" />
  </Link>
);

export default AdminGear;
