export type VideoItem = { id: string; title: string; youtubeId: string };
export type RadioItem = { id: string; name: string; description: string; streamUrl: string };

const VIDEOS_KEY = "media_library_videos_v1";
const RADIOS_KEY = "media_library_radios_v1";

const DEFAULT_VIDEOS: VideoItem[] = [
  { id: "v1", title: "Conheça a Master Soluções", youtubeId: "dQw4w9WgXcQ" },
  { id: "v2", title: "Serviços Residenciais", youtubeId: "X1ILuKIM_WA" },
  { id: "v3", title: "Serviços Comerciais", youtubeId: "9bZkp7q19f0" },
];

const DEFAULT_RADIOS: RadioItem[] = [
  {
    id: "r1",
    name: "Rádio Itumbiara FM",
    description: "Notícias e música local de Itumbiara/GO",
    streamUrl: "https://radio.garden/listen/radio-mega-fm-106-1/XcUIFhM4",
  },
  {
    id: "r2",
    name: "Antena 1",
    description: "O melhor do Soft Rock",
    streamUrl: "https://antenaone.crossradio.com.br/stream/1;",
  },
  {
    id: "r3",
    name: "Jovem Pan FM",
    description: "Hits e variedades 24h",
    streamUrl: "https://jpfm.jovempanfm.uol.com.br/jpfmsp.aac",
  },
];

function read<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("media-library-changed"));
}

export function getVideos(): VideoItem[] {
  return read(VIDEOS_KEY, DEFAULT_VIDEOS);
}
export function getRadios(): RadioItem[] {
  return read(RADIOS_KEY, DEFAULT_RADIOS);
}
export function saveVideos(items: VideoItem[]) {
  write(VIDEOS_KEY, items);
}
export function saveRadios(items: RadioItem[]) {
  write(RADIOS_KEY, items);
}

export function extractYoutubeId(input: string): string {
  const s = input.trim();
  if (!s) return "";
  // Already an id (no slashes / spaces, length around 11)
  if (!/[\/\s?=&]/.test(s) && s.length >= 8 && s.length <= 20) return s;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return m[1];
  }
  return s;
}
