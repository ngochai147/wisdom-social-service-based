import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Play, Pause, Music } from "lucide-react";
import {
  getAllMusic,
  searchMusicByTitle,
  formatDuration,
  resolveMusicMediaUrl,
  playAudioPreview,
  stopAudioPreview,
  type MusicMetadata,
} from "../../services/musicService";
import { buildS3Url } from "../../utils/s3";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (music: MusicMetadata) => void;
}

export default function StoryMusicPickerModal({
  isOpen,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<MusicMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load initial tracks
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getAllMusic(0, 30)
      .then(setTracks)
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Auto-focus search
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 100);
  }, [isOpen]);

  // Cleanup audio on close
  useEffect(() => {
    if (!isOpen) {
      stopAudioPreview();
      setPlayingId(null);
    }
  }, [isOpen]);

  // Search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = q.trim()
        ? await searchMusicByTitle(q)
        : await getAllMusic(0, 30);
      setTracks(results);
      setLoading(false);
    }, 300);
  }, []);

  const togglePlay = useCallback(
    (track: MusicMetadata) => {
      if (playingId === track.id) {
        stopAudioPreview();
        setPlayingId(null);
      } else {
        stopAudioPreview();
        const url = resolveMusicMediaUrl(track.audioUrl);
        if (url) {
          playAudioPreview(url, { onEnded: () => setPlayingId(null) });
          setPlayingId(track.id);
        }
      }
    },
    [playingId]
  );

  const handleSelect = useCallback(
    (track: MusicMetadata) => {
      stopAudioPreview();
      setPlayingId(null);
      onSelect(track);
      onClose();
    },
    [onSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] max-h-[75vh] bg-[#1a1a1a] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-purple-400" />
            <h3 className="text-white font-semibold text-sm">Chọn nhạc</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5 focus-within:border-purple-500/40 transition-colors">
            <Search size={16} className="text-white/30 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm bài hát, nghệ sĩ..."
              className="flex-1 bg-transparent text-white text-sm placeholder-white/30 outline-none"
            />
            {query && (
              <button
                onClick={() => handleSearch("")}
                className="text-white/30 hover:text-white/60"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Track list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loading ? (
            // Skeleton
            <div className="space-y-1 px-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/5 rounded w-3/4" />
                    <div className="h-2.5 bg-white/5 rounded w-1/2" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/5" />
                </div>
              ))}
            </div>
          ) : tracks.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              Không tìm thấy bài hát nào
            </div>
          ) : (
            <div className="space-y-0.5">
              {tracks.map((track) => {
                const albumUrl = buildS3Url(track.imageUrl) || "";
                const isPlaying = playingId === track.id;

                return (
                  <div
                    key={track.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all group ${
                      isPlaying
                        ? "bg-purple-500/10 border border-purple-500/20"
                        : "hover:bg-white/5 border border-transparent"
                    }`}
                    onClick={() => handleSelect(track)}
                  >
                    {/* Album art */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md relative">
                      {albumUrl ? (
                        <img
                          src={albumUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                          <span className="text-white text-xl">♪</span>
                        </div>
                      )}
                      {isPlaying && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="flex items-end gap-[2px] h-4">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="w-[3px] bg-white rounded-full"
                                style={{
                                  animation: `musicBar${i} 0.${4 + i}s ease-in-out infinite alternate`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-white/40 truncate">
                        {track.artist}
                      </p>
                      <p className="text-[10px] text-white/25 mt-0.5">
                        {formatDuration(track.duration)}
                      </p>
                    </div>

                    {/* Play/Pause button */}
                    <button
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isPlaying
                          ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                          : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay(track);
                      }}
                    >
                      {isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
