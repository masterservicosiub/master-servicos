import { MessageCircle } from "lucide-react";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";

const WhatsAppFloat = () => {
  const info = useCompanyInfo();
  return (
  <a
    href={`https://wa.me/${info.company_whatsapp}`}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
    aria-label="Fale Conosco no WhatsApp"
  >
    <MessageCircle className="w-7 h-7" />
  </a>
  );
};

export default WhatsAppFloat;
