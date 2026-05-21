import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackAffiliateClick } from "@/lib/antifraud";

/**
 * Captures ?ref=CODE from the URL on any route across the site
 * (Master Serviços and Angelo Design) and persists it to localStorage
 * so the affiliate is credited when the visitor places an order.
 */
const AffiliateCapture = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get("ref");
      if (!ref) return;
      const code = ref.trim().toUpperCase();
      if (!code) return;
      localStorage.setItem("affiliate_ref", code);
      trackAffiliateClick(code).catch(() => {});
    } catch {}
  }, [location.search]);

  return null;
};

export default AffiliateCapture;