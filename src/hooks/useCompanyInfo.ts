import { useEffect, useState } from "react";
import { fetchCompanyInfo, type CompanyInfo, DEFAULT_COMPANY_INFO } from "@/lib/supabase";

let cache: CompanyInfo | null = null;
const subscribers = new Set<(info: CompanyInfo) => void>();

export function refreshCompanyInfo() {
  return fetchCompanyInfo().then((info) => {
    cache = info;
    subscribers.forEach((cb) => cb(info));
    return info;
  });
}

export function useCompanyInfo(): CompanyInfo {
  const [info, setInfo] = useState<CompanyInfo>(cache ?? DEFAULT_COMPANY_INFO);

  useEffect(() => {
    subscribers.add(setInfo);
    if (!cache) {
      refreshCompanyInfo().catch(() => {});
    } else {
      setInfo(cache);
    }
    return () => {
      subscribers.delete(setInfo);
    };
  }, []);

  return info;
}
