import { useEffect, useState } from "react";
import { Radio, Video as VideoIcon, Play, Pause } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchVideos, fetchRadios, type VideoItem, type RadioItem } from "@/lib/mediaLibrary";

const Midias = () => {
  const [playing, setPlaying] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [radios, setRadios] = useState<RadioItem[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [vs, rs] = await Promise.all([fetchVideos(), fetchRadios()]);
        setVideos(vs);
        setRadios(rs);
      } catch (e) {
        console.error("Erro carregando mídias:", e);
      }
    };
    load();
    const onChange = () => load();
    window.addEventListener("media-library-changed", onChange);
    return () => window.removeEventListener("media-library-changed", onChange);
  }, []);
  const audios: Record<string, HTMLAudioElement> =
    (window as any).__radioAudios || ((window as any).__radioAudios = {});

  const togglePlay = (url: string) => {
    Object.entries(audios).forEach(([u, a]) => {
      if (u !== url) {
        a.pause();
      }
    });
    if (!audios[url]) {
      audios[url] = new Audio(url);
      audios[url].crossOrigin = "anonymous";
    }
    if (playing === url) {
      audios[url].pause();
      setPlaying(null);
    } else {
      audios[url]
        .play()
        .then(() => setPlaying(url))
        .catch((e) => {
          console.error("Erro ao reproduzir rádio:", e);
          setPlaying(null);
        });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16 bg-background">
        <div className="bg-primary py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">Mídias</h1>
            <p className="text-primary-foreground/80">
              Vídeos da Master Soluções e rádios ao vivo para você ouvir enquanto navega.
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Vídeos */}
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <VideoIcon className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Vídeos</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((v) => (
                <div key={v.youtubeId} className="bg-card rounded-xl overflow-hidden border border-border shadow-sm">
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${v.youtubeId}`}
                      title={v.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-card-foreground">{v.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rádios / Streamings */}
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-6">
              <Radio className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Rádios e Streamings ao Vivo</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {radios.map((r) => {
                const isPlaying = playing === r.streamUrl;
                return (
                  <div key={r.streamUrl} className="bg-card rounded-xl p-6 border border-border flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Radio className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-card-foreground">{r.name}</h3>
                        <p className="text-xs text-muted-foreground">Ao vivo</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 flex-1">{r.description}</p>
                    <button
                      onClick={() => togglePlay(r.streamUrl)}
                      className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${
                        isPlaying
                          ? "bg-destructive text-destructive-foreground hover:opacity-90"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4" /> Pausar
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" /> Ouvir agora
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Midias;
