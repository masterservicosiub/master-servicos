import { supabase } from "./supabase";

export type VideoItem = { id: string; title: string; youtubeId: string; sort_order?: number };
export type RadioItem = { id: string; name: string; description: string; streamUrl: string; sort_order?: number };

export async function fetchVideos(): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from("media_videos")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    youtubeId: r.youtube_id,
    sort_order: r.sort_order,
  }));
}

export async function fetchRadios(): Promise<RadioItem[]> {
  const { data, error } = await supabase
    .from("media_radios")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description || "",
    streamUrl: r.stream_url,
    sort_order: r.sort_order,
  }));
}

export async function insertVideo(v: { title: string; youtubeId: string }) {
  const { error } = await supabase
    .from("media_videos")
    .insert([{ title: v.title, youtube_id: v.youtubeId }]);
  if (error) throw error;
}

export async function updateVideoRow(id: string, patch: Partial<VideoItem>) {
  const upd: any = {};
  if (patch.title !== undefined) upd.title = patch.title;
  if (patch.youtubeId !== undefined) upd.youtube_id = patch.youtubeId;
  const { error } = await supabase.from("media_videos").update(upd).eq("id", id);
  if (error) throw error;
}

export async function deleteVideoRow(id: string) {
  const { error } = await supabase.from("media_videos").delete().eq("id", id);
  if (error) throw error;
}

export async function insertRadio(r: { name: string; description: string; streamUrl: string }) {
  const { error } = await supabase
    .from("media_radios")
    .insert([{ name: r.name, description: r.description, stream_url: r.streamUrl }]);
  if (error) throw error;
}

export async function updateRadioRow(id: string, patch: Partial<RadioItem>) {
  const upd: any = {};
  if (patch.name !== undefined) upd.name = patch.name;
  if (patch.description !== undefined) upd.description = patch.description;
  if (patch.streamUrl !== undefined) upd.stream_url = patch.streamUrl;
  const { error } = await supabase.from("media_radios").update(upd).eq("id", id);
  if (error) throw error;
}

export async function deleteRadioRow(id: string) {
  const { error } = await supabase.from("media_radios").delete().eq("id", id);
  if (error) throw error;
}

export function extractYoutubeId(input: string): string {
  const s = input.trim();
  if (!s) return "";
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
