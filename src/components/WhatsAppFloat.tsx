import { MessageCircle } from "lucide-react";

const WhatsAppFloat = () => (
  <a
    href="https://wa.me/5564992642950"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
    aria-label="Fale Conosco no WhatsApp"
  >
    <MessageCircle className="w-7 h-7" />
  </a>
);

export default WhatsAppFloat;
