import angeloLogo from "@/assets/angelo-design-logo.png";
import masterLogo from "@/assets/logo-master-residenciais.png";
import defaultLogo from "@/assets/logo.png";

export type OrderOrigin = "angelo" | "master" | "default";

export function detectOrigin(servicesText: string | undefined | null): OrderOrigin {
  const t = (servicesText || "").trim();
  if (/^\[(angelo design|loja gráfica|loja grafica)\]/i.test(t)) return "angelo";
  return "master";
}

export function logoUrlFor(origin: OrderOrigin): string {
  if (origin === "angelo") return angeloLogo;
  if (origin === "master") return masterLogo;
  return defaultLogo;
}

export function companyNameFor(origin: OrderOrigin): string {
  if (origin === "angelo") return "ANGELO DESIGN";
  if (origin === "master") return "MASTER SERVIÇOS";
  return "MASTER SOLUÇÕES";
}

export async function loadLogo(origin: OrderOrigin): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(logoUrlFor(origin));
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims: { width: number; height: number } = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, ...dims };
  } catch (e) {
    console.error("Erro ao carregar logo:", e);
    return null;
  }
}

/** Returns [width, height] in mm fitting inside maxW x maxH while preserving aspect ratio. */
export function fitLogo(natW: number, natH: number, maxW: number, maxH: number): [number, number] {
  const ratio = natW / natH;
  let w = maxW;
  let h = w / ratio;
  if (h > maxH) {
    h = maxH;
    w = h * ratio;
  }
  return [w, h];
}