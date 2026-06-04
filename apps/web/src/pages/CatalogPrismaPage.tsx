import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize,
  Minimize,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

/**
 * Catálogo Prisma 2026 — viewer imersivo em HTML5.
 * 160 páginas do catálogo oficial (Canva) convertidas em imagens,
 * apresentadas como "story" vertical com transições 3D, miniaturas,
 * zoom, fullscreen, teclado e swipe. Conteúdo íntegro, nada de fora.
 */

const TOTAL_PAGES = 160;
const pageSrc = (n: number) => `/catalog/prisma/page-${String(n).padStart(3, '0')}.jpg`;

export function CatalogPrismaPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1); // 1-based
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [showThumbs, setShowThumbs] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (target: number) => {
      const clamped = Math.max(1, Math.min(TOTAL_PAGES, target));
      setDir(clamped >= page ? 'next' : 'prev');
      setZoomed(false);
      setPage(clamped);
    },
    [page]
  );
  const next = useCallback(() => go(page + 1), [go, page]);
  const prev = useCallback(() => go(page - 1), [go, page]);

  // Teclado: setas, Home/End, Esc fecha miniaturas/zoom
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
      else if (e.key === 'Home') go(1);
      else if (e.key === 'End') go(TOTAL_PAGES);
      else if (e.key === 'Escape') {
        setShowThumbs(false);
        setZoomed(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, go]);

  // Pré-carrega páginas vizinhas (±2)
  useEffect(() => {
    [page - 2, page - 1, page + 1, page + 2]
      .filter((n) => n >= 1 && n <= TOTAL_PAGES)
      .forEach((n) => {
        const img = new Image();
        img.src = pageSrc(n);
      });
  }, [page]);

  // Fullscreen
  const toggleFull = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().then(() => setIsFull(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFull(false)).catch(() => {});
    }
  };
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Swipe (touch)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  };

  const progress = (page / TOTAL_PAGES) * 100;
  const thumbs = useMemo(() => Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1), []);

  return (
    <div
      ref={stageRef}
      className="cpv-root fixed inset-0 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        .cpv-root {
          --crimson: #9b1c1c;
          --crimson-hi: #d24a3a;
          --paper: #f3ece4;
          background:
            radial-gradient(90% 70% at 50% 30%, rgba(155,28,28,0.16), transparent 60%),
            radial-gradient(120% 100% at 50% 110%, rgba(0,0,0,0.7), transparent 60%),
            #100c0c;
          color: var(--paper);
          font-family: 'Sora', system-ui, sans-serif;
          overflow: hidden;
        }
        /* grão sutil */
        .cpv-root::before {
          content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E");
        }

        @keyframes cpvInNext {
          from { opacity: 0; transform: translateX(7%) rotateY(-9deg) scale(.97); }
          to   { opacity: 1; transform: translateX(0) rotateY(0) scale(1); }
        }
        @keyframes cpvInPrev {
          from { opacity: 0; transform: translateX(-7%) rotateY(9deg) scale(.97); }
          to   { opacity: 1; transform: translateX(0) rotateY(0) scale(1); }
        }
        .cpv-page-next { animation: cpvInNext .55s cubic-bezier(.2,.7,.2,1) both; }
        .cpv-page-prev { animation: cpvInPrev .55s cubic-bezier(.2,.7,.2,1) both; }

        @keyframes cpvShimmer {
          0% { background-position: -200% 0; } 100% { background-position: 200% 0; }
        }
        .cpv-shimmer {
          background: linear-gradient(110deg, #1c1414 35%, #2b1d1d 50%, #1c1414 65%);
          background-size: 200% 100%;
          animation: cpvShimmer 1.4s linear infinite;
        }

        @keyframes cpvFadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        .cpv-chrome { animation: cpvFadeUp .7s .15s cubic-bezier(.2,.7,.2,1) both; }

        .cpv-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 40px; height: 40px; border-radius: 9999px;
          color: rgba(243,236,228,.85); background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          backdrop-filter: blur(8px);
          transition: all .25s;
        }
        .cpv-btn:hover { background: rgba(155,28,28,.45); border-color: rgba(210,74,58,.6); color: #fff; }

        .cpv-thumb { transition: transform .25s, box-shadow .25s, outline-color .25s; outline: 2px solid transparent; }
        .cpv-thumb:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -8px rgba(155,28,28,.5); }
        .cpv-thumb.cpv-cur { outline-color: var(--crimson-hi); }
      `}</style>

      {/* ── topo ── */}
      <div className="cpv-chrome absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="cpv-btn" title="Voltar">
            <ArrowLeft className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          </button>
          <div>
            <p className="text-[10px] tracking-[0.35em] uppercase text-white/50">Prisma · Materiales Eléctricos y Ferretería</p>
            <p className="text-sm font-semibold tracking-wide">Catálogo 2026 · Ed. 03</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoomed((z) => !z)} className="cpv-btn" title={zoomed ? 'Reduzir' : 'Ampliar'}>
            {zoomed ? <ZoomOut className="w-[18px] h-[18px]" /> : <ZoomIn className="w-[18px] h-[18px]" />}
          </button>
          <button onClick={() => setShowThumbs(true)} className="cpv-btn" title="Miniaturas">
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
          <button onClick={toggleFull} className="cpv-btn" title={isFull ? 'Sair de tela cheia' : 'Tela cheia'}>
            {isFull ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* ── página ── */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center px-2 sm:px-16"
        style={{ perspective: '1600px' }}
      >
        <div
          key={page}
          className={`relative ${dir === 'next' ? 'cpv-page-next' : 'cpv-page-prev'} ${
            zoomed ? 'overflow-auto max-h-[100vh] max-w-[100vw]' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {!loaded[page] && (
            <div
              className="cpv-shimmer absolute inset-0 rounded-xl"
              style={{ aspectRatio: '9/16' }}
              aria-hidden
            />
          )}
          <img
            src={pageSrc(page)}
            alt={`Página ${page} do Catálogo Prisma`}
            draggable={false}
            onLoad={() => setLoaded((m) => (m[page] ? m : { ...m, [page]: true }))}
            onClick={() => setZoomed((z) => !z)}
            className={`rounded-xl shadow-[0_40px_90px_-20px_rgba(0,0,0,0.85),0_0_60px_-20px_rgba(155,28,28,0.45)] cursor-zoom-in ${
              zoomed
                ? 'max-w-none w-[min(1100px,160vw)] cursor-zoom-out'
                : 'max-h-[calc(100vh-7.5rem)] max-w-[94vw] object-contain'
            }`}
          />
        </div>

        {/* zonas de clique laterais (desktop) */}
        {!zoomed && (
          <>
            <button
              onClick={prev}
              disabled={page === 1}
              className="hidden sm:flex absolute left-3 lg:left-8 top-1/2 -translate-y-1/2 z-20 cpv-btn !w-12 !h-12 disabled:opacity-25 disabled:pointer-events-none"
              title="Anterior (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              disabled={page === TOTAL_PAGES}
              className="hidden sm:flex absolute right-3 lg:right-8 top-1/2 -translate-y-1/2 z-20 cpv-btn !w-12 !h-12 disabled:opacity-25 disabled:pointer-events-none"
              title="Próxima (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* ── rodapé: progresso + contador ── */}
      <div className="cpv-chrome absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-8 pb-4 pt-10 bg-gradient-to-t from-black/75 to-transparent">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <span className="text-xs tabular-nums text-white/70 whitespace-nowrap">
            {String(page).padStart(3, '0')} / {TOTAL_PAGES}
          </span>
          <input
            type="range"
            min={1}
            max={TOTAL_PAGES}
            value={page}
            onChange={(e) => go(parseInt(e.target.value))}
            className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(90deg, var(--crimson-hi) ${progress}%, rgba(255,255,255,0.15) ${progress}%)`,
            }}
            aria-label="Ir para página"
          />
          <span className="hidden sm:block text-[10px] tracking-[0.25em] uppercase text-white/40 whitespace-nowrap">
            ← → navegar · clique amplia
          </span>
        </div>
      </div>

      {/* ── miniaturas ── */}
      {showThumbs && (
        <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-b from-black/90 to-transparent">
            <p className="text-sm tracking-[0.3em] uppercase text-white/70">Todas as páginas</p>
            <button onClick={() => setShowThumbs(false)} className="cpv-btn" title="Fechar (Esc)">
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3 sm:gap-4 px-4 sm:px-8 pb-10">
            {thumbs.map((n) => (
              <button
                key={n}
                onClick={() => {
                  go(n);
                  setShowThumbs(false);
                }}
                className={`cpv-thumb relative rounded-lg overflow-hidden bg-[#1c1414] ${
                  n === page ? 'cpv-cur' : ''
                }`}
                style={{ aspectRatio: '9/16' }}
              >
                <img
                  src={pageSrc(n)}
                  alt={`Página ${n}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white/80">
                  {n}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
