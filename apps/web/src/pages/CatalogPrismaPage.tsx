import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Maximize,
  Minimize,
  Pause,
  Play,
  X,
} from 'lucide-react';

/**
 * Catálogo Prisma 2026 — experiência de apresentação.
 *
 * Desktop: livro aberto em página dupla GIGANTE com virada de página 3D
 * realista (dobra sobre a lombada, sombra dinâmica, espessura de páginas).
 * Mobile: página única em tela cheia com transição 3D.
 *
 * Efeitos: intro cinematográfica da marca, fundo ambiente (a própria página
 * desfocada preenchendo a tela), modo apresentação automático, lightbox de
 * zoom, miniaturas, fullscreen, teclado e swipe. 160 páginas na íntegra.
 */

const TOTAL_PAGES = 160;
const FLIP_MS = 1000;
const pageSrc = (n: number) => `/catalog/prisma/page-${String(n).padStart(3, '0')}.jpg`;

type Spread = { left: number | null; right: number | null };

function buildSpreads(): Spread[] {
  // Capa sozinha à direita; depois 2-3, 4-5, ...; última sozinha à esquerda.
  const s: Spread[] = [{ left: null, right: 1 }];
  for (let p = 2; p <= TOTAL_PAGES; p += 2) {
    s.push({ left: p, right: p + 1 <= TOTAL_PAGES ? p + 1 : null });
  }
  return s;
}

function useIsDesktop() {
  const [is, setIs] = useState(() => window.matchMedia('(min-width: 1024px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = (e: MediaQueryListEvent) => setIs(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return is;
}

function PageImg({ n, className = '' }: { n: number | null; className?: string }) {
  if (!n) {
    return (
      <div
        className={`w-full h-full bg-[#17100f] flex items-center justify-center ${className}`}
      >
        <span className="text-white/15 text-[10px] tracking-[0.4em] uppercase">Prisma</span>
      </div>
    );
  }
  return (
    <img
      src={pageSrc(n)}
      alt={`Página ${n}`}
      draggable={false}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}

export function CatalogPrismaPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const spreads = useMemo(buildSpreads, []);

  const [intro, setIntro] = useState(true);
  const [sIdx, setSIdx] = useState(0); // índice do spread (desktop)
  const [page, setPage] = useState(1); // página única (mobile)
  const [flip, setFlip] = useState<null | { dir: 'next' | 'prev' }>(null);
  const [mDir, setMDir] = useState<'next' | 'prev'>('next');
  const [showThumbs, setShowThumbs] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [isFull, setIsFull] = useState(false);
  const [auto, setAuto] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);

  const cur = spreads[sIdx];
  const nxt = spreads[Math.min(sIdx + 1, spreads.length - 1)];
  const prv = spreads[Math.max(sIdx - 1, 0)];
  const curFirstPage = cur.left ?? cur.right ?? 1;

  // ── navegação ──
  const next = useCallback(() => {
    if (isDesktop) {
      if (flip || sIdx >= spreads.length - 1) return;
      setFlip({ dir: 'next' });
      window.setTimeout(() => {
        setSIdx((i) => Math.min(i + 1, spreads.length - 1));
        setFlip(null);
      }, FLIP_MS);
    } else {
      setMDir('next');
      setPage((p) => Math.min(p + 1, TOTAL_PAGES));
    }
  }, [isDesktop, flip, sIdx, spreads.length]);

  const prev = useCallback(() => {
    if (isDesktop) {
      if (flip || sIdx <= 0) return;
      setFlip({ dir: 'prev' });
      window.setTimeout(() => {
        setSIdx((i) => Math.max(i - 1, 0));
        setFlip(null);
      }, FLIP_MS);
    } else {
      setMDir('prev');
      setPage((p) => Math.max(p - 1, 1));
    }
  }, [isDesktop, flip, sIdx]);

  const goToPage = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(TOTAL_PAGES, p));
      if (isDesktop) {
        const target = spreads.findIndex(
          (s) => s.left === clamped || s.right === clamped
        );
        if (target >= 0) {
          setFlip(null);
          setSIdx(target);
        }
      } else {
        setMDir(clamped >= page ? 'next' : 'prev');
        setPage(clamped);
      }
    },
    [isDesktop, spreads, page]
  );

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (intro) {
        setIntro(false);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') next();
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
      else if (e.key === 'Home') goToPage(1);
      else if (e.key === 'End') goToPage(TOTAL_PAGES);
      else if (e.key === 'Escape') {
        setShowThumbs(false);
        setLightbox(null);
        setAuto(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, goToPage, intro]);

  // intro auto-dismiss
  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), 3400);
    return () => window.clearTimeout(t);
  }, []);

  // pré-carrega vizinhos
  useEffect(() => {
    const around = isDesktop
      ? [prv.left, prv.right, nxt.left, nxt.right]
      : [page - 1, page + 1, page + 2];
    around
      .filter((n): n is number => !!n && n >= 1 && n <= TOTAL_PAGES)
      .forEach((n) => {
        const img = new Image();
        img.src = pageSrc(n);
      });
  }, [isDesktop, page, prv, nxt]);

  // autoplay (modo apresentação)
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      const atEnd = isDesktop ? sIdx >= spreads.length - 1 : page >= TOTAL_PAGES;
      if (atEnd) setAuto(false);
      else next();
    }, 4200);
    return () => window.clearInterval(id);
  }, [auto, next, isDesktop, sIdx, page, spreads.length]);

  // fullscreen
  const toggleFull = () => {
    if (!document.fullscreenElement) {
      stageRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };
  useEffect(() => {
    const onFs = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // swipe
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    dx < 0 ? next() : prev();
  };

  const ambient = isDesktop ? cur.right ?? cur.left ?? 1 : page;
  const counterLabel = isDesktop
    ? cur.left && cur.right
      ? `${String(cur.left).padStart(3, '0')}–${String(cur.right).padStart(3, '0')}`
      : String(cur.left ?? cur.right ?? 1).padStart(3, '0')
    : String(page).padStart(3, '0');
  const progress = ((isDesktop ? curFirstPage : page) / TOTAL_PAGES) * 100;

  return (
    <div
      ref={stageRef}
      className="cpx fixed inset-0 select-none overflow-hidden bg-[#0b0707] text-[#f3ece4]"
      style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <style>{`
        .cpx { --crimson:#9b1c1c; --crimson-hi:#e0503c; --paper:#f3ece4; }

        /* ───── fundo ambiente (página desfocada) ───── */
        .cpx-ambient { position:absolute; inset:-6%; z-index:0;
          background-size:cover; background-position:center;
          filter: blur(64px) saturate(1.25) brightness(.5);
          transform: scale(1.1);
          transition: background-image .8s; }
        .cpx-ambient::after { content:''; position:absolute; inset:0;
          background:
            radial-gradient(75% 60% at 50% 42%, transparent 30%, rgba(8,4,4,.78) 100%),
            linear-gradient(180deg, rgba(8,4,4,.55), transparent 28%, transparent 68%, rgba(8,4,4,.8)); }
        @keyframes cpxDrift { 0%,100%{ transform:scale(1.1) translate(0,0);} 50%{ transform:scale(1.16) translate(1.5%, -1.5%);} }
        .cpx-ambient { animation: cpxDrift 26s ease-in-out infinite; }

        /* grão */
        .cpx::after { content:''; position:absolute; inset:0; z-index:2; pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E"); }

        /* ───── livro ───── */
        .cpx-book { position:relative; height:min(88vh, 88svh); aspect-ratio: 9/8; /* 2 páginas 9:16 */
          transform-style:preserve-3d; }
        .cpx-half { position:absolute; top:0; bottom:0; width:50%; overflow:hidden; background:#17100f; }
        .cpx-half.l { left:0; border-radius:14px 3px 3px 14px; }
        .cpx-half.r { right:0; border-radius:3px 14px 14px 3px; }

        /* vinco da lombada */
        .cpx-spine { position:absolute; top:0; bottom:0; left:50%; width:90px; transform:translateX(-50%); z-index:5; pointer-events:none;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,.42) 46%, rgba(0,0,0,.55) 50%, rgba(0,0,0,.42) 54%, transparent); }

        /* espessura de páginas nas bordas */
        .cpx-edges-l, .cpx-edges-r { position:absolute; top:6px; bottom:6px; width:16px; z-index:-1; border-radius:8px;
          background: repeating-linear-gradient(90deg, #d8cfc2 0 1px, #b3a795 1px 2.5px); }
        .cpx-edges-l { left:-12px; transform: skewY(-.6deg); }
        .cpx-edges-r { right:-12px; transform: skewY(.6deg); }

        /* sombra/penumbra no chão */
        .cpx-floor { position:absolute; left:8%; right:8%; bottom:-7%; height:14%;
          background: radial-gradient(50% 100% at 50% 0%, rgba(0,0,0,.65), transparent 70%);
          filter: blur(8px); z-index:-2; }

        /* ───── virada de página 3D ───── */
        .cpx-flipper { position:absolute; top:0; bottom:0; width:50%; z-index:8;
          transform-style:preserve-3d; }
        .cpx-flipper.next { left:50%; transform-origin:left center; animation: cpxFlipN ${FLIP_MS}ms cubic-bezier(.45,.05,.28,1) both; }
        .cpx-flipper.prev { left:0; transform-origin:right center; animation: cpxFlipP ${FLIP_MS}ms cubic-bezier(.45,.05,.28,1) both; }
        @keyframes cpxFlipN { from{ transform:rotateY(0);} to{ transform:rotateY(-180deg);} }
        @keyframes cpxFlipP { from{ transform:rotateY(0);} to{ transform:rotateY(180deg);} }
        .cpx-face { position:absolute; inset:0; overflow:hidden; backface-visibility:hidden; background:#17100f; }
        .cpx-face.back { transform:rotateY(180deg); }
        /* luz que percorre a folha durante a virada */
        .cpx-face::after { content:''; position:absolute; inset:0; pointer-events:none; }
        .cpx-flipper.next .cpx-face.front::after { animation: cpxShadeN ${FLIP_MS}ms linear both;
          background:linear-gradient(270deg, rgba(0,0,0,.0), rgba(0,0,0,.45)); }
        .cpx-flipper.prev .cpx-face.front::after { animation: cpxShadeN ${FLIP_MS}ms linear both;
          background:linear-gradient(90deg, rgba(0,0,0,.0), rgba(0,0,0,.45)); }
        @keyframes cpxShadeN { 0%{opacity:0} 45%{opacity:1} 100%{opacity:0} }
        /* sombra projetada sobre a página de baixo */
        .cpx-cast { position:absolute; top:0; bottom:0; width:50%; z-index:7; pointer-events:none; opacity:0; }
        .cpx-cast.next { left:50%; background:linear-gradient(90deg, rgba(0,0,0,.5), transparent 70%);
          animation: cpxCast ${FLIP_MS}ms linear both; }
        .cpx-cast.prev { left:0; background:linear-gradient(270deg, rgba(0,0,0,.5), transparent 70%);
          animation: cpxCast ${FLIP_MS}ms linear both; }
        @keyframes cpxCast { 0%{opacity:0} 40%{opacity:.9} 100%{opacity:0} }

        /* ───── mobile: página única com flip ───── */
        @keyframes cpxMNext { from{ opacity:0; transform: translateX(9%) rotateY(-12deg) scale(.96);} to{ opacity:1; transform:none;} }
        @keyframes cpxMPrev { from{ opacity:0; transform: translateX(-9%) rotateY(12deg) scale(.96);} to{ opacity:1; transform:none;} }
        .cpx-m-next { animation: cpxMNext .5s cubic-bezier(.2,.7,.2,1) both; }
        .cpx-m-prev { animation: cpxMPrev .5s cubic-bezier(.2,.7,.2,1) both; }

        /* ───── chrome ───── */
        @keyframes cpxUp { from{ opacity:0; transform:translateY(16px);} to{ opacity:1; transform:none;} }
        .cpx-chrome { animation: cpxUp .8s .2s cubic-bezier(.2,.7,.2,1) both; }
        .cpx-btn { display:inline-flex; align-items:center; justify-content:center;
          width:42px; height:42px; border-radius:9999px; color:rgba(243,236,228,.88);
          background:rgba(20,10,10,.45); border:1px solid rgba(255,255,255,.14);
          backdrop-filter: blur(10px); transition:all .25s; }
        .cpx-btn:hover { background:rgba(155,28,28,.55); border-color:rgba(224,80,60,.6); color:#fff;
          box-shadow:0 0 24px -6px rgba(224,80,60,.7); transform:translateY(-1px); }
        .cpx-arrow { width:54px; height:54px; }

        .cpx-thumb { transition: transform .25s, box-shadow .25s, outline-color .25s; outline:2px solid transparent; }
        .cpx-thumb:hover { transform:translateY(-4px) scale(1.02); box-shadow:0 16px 32px -10px rgba(155,28,28,.55); }
        .cpx-thumb.cur { outline-color:var(--crimson-hi); }

        /* ───── intro cinematográfica ───── */
        .cpx-intro { position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
          align-items:center; justify-content:center; background:#080404; cursor:pointer;
          animation: cpxIntroOut .7s 2.8s cubic-bezier(.6,0,.4,1) both; }
        @keyframes cpxIntroOut { to{ opacity:0; visibility:hidden; } }
        .cpx-intro-line { height:1px; width:0; background:linear-gradient(90deg, transparent, var(--crimson-hi), transparent);
          animation: cpxLine 1.1s .25s cubic-bezier(.2,.7,.2,1) forwards; box-shadow:0 0 18px rgba(224,80,60,.8); }
        @keyframes cpxLine { to{ width:min(560px, 78vw);} }
        .cpx-intro-word { display:flex; gap:.06em; }
        .cpx-intro-word span { font-family:Georgia, 'Times New Roman', serif; font-weight:700;
          font-size:clamp(54px, 11vw, 130px); line-height:1; color:var(--paper);
          opacity:0; transform:translateY(38px) rotateX(45deg); display:inline-block;
          animation: cpxChar .7s cubic-bezier(.2,.7,.2,1) forwards;
          text-shadow:0 6px 40px rgba(224,80,60,.35); }
        @keyframes cpxChar { to{ opacity:1; transform:none; } }
        .cpx-intro-sub { letter-spacing:.5em; text-transform:uppercase; font-size:11px; color:rgba(243,236,228,.55);
          opacity:0; animation: cpxChar .8s 1.5s forwards; }
        .cpx-intro-glow { position:absolute; inset:0; pointer-events:none;
          background: radial-gradient(40% 30% at 50% 55%, rgba(155,28,28,.28), transparent 70%);
          animation: cpxGlow 2.6s ease-in-out infinite; }
        @keyframes cpxGlow { 0%,100%{ opacity:.6 } 50%{ opacity:1 } }

        input[type='range'].cpx-range::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px;
          border-radius:9999px; background:var(--crimson-hi); box-shadow:0 0 12px rgba(224,80,60,.9); cursor:pointer; }
      `}</style>

      {/* fundo ambiente */}
      <div className="cpx-ambient" style={{ backgroundImage: `url(${pageSrc(ambient)})` }} />

      {/* ───── intro ───── */}
      {intro && (
        <div className="cpx-intro" onClick={() => setIntro(false)}>
          <div className="cpx-intro-glow" />
          <div className="cpx-intro-word">
            {'PRISMA'.split('').map((ch, i) => (
              <span key={i} style={{ animationDelay: `${0.35 + i * 0.09}s` }}>
                {ch}
              </span>
            ))}
          </div>
          <div className="cpx-intro-line mt-5 mb-5" />
          <p className="cpx-intro-sub">Catálogo 2026 · Edição 03</p>
        </div>
      )}

      {/* ───── topo ───── */}
      <div className="cpx-chrome absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-6 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="cpx-btn" title="Voltar">
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
          <div className="hidden sm:block">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50">
              Prisma · Materiales Eléctricos y Ferretería
            </p>
            <p className="text-sm font-semibold tracking-wide">Catálogo 2026 · Ed. 03</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuto((a) => !a)}
            className="cpx-btn"
            title={auto ? 'Pausar apresentação' : 'Modo apresentação (autoplay)'}
          >
            {auto ? <Pause className="w-[18px] h-[18px]" /> : <Play className="w-[18px] h-[18px]" />}
          </button>
          <button onClick={() => setShowThumbs(true)} className="cpx-btn" title="Miniaturas">
            <LayoutGrid className="w-[18px] h-[18px]" />
          </button>
          <button onClick={toggleFull} className="cpx-btn" title={isFull ? 'Sair de tela cheia' : 'Tela cheia'}>
            {isFull ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
          </button>
        </div>
      </div>

      {/* ───── palco ───── */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ perspective: '2800px' }}
      >
        {isDesktop ? (
          /* ── LIVRO (página dupla + flip 3D) ── */
          <div className="cpx-book" style={{ boxShadow: '0 60px 120px -30px rgba(0,0,0,.9)' }}>
            <div className="cpx-edges-l" />
            <div className="cpx-edges-r" />
            <div className="cpx-floor" />

            {/* metade esquerda (estática) */}
            <div className="cpx-half l cursor-zoom-in" onClick={() => cur.left && setLightbox(cur.left)}>
              <PageImg n={flip?.dir === 'prev' ? prv.left : cur.left} />
            </div>
            {/* metade direita (estática) */}
            <div className="cpx-half r cursor-zoom-in" onClick={() => cur.right && setLightbox(cur.right)}>
              <PageImg n={flip?.dir === 'next' ? nxt.right : cur.right} />
            </div>

            {/* folha virando */}
            {flip && (
              <>
                <div className={`cpx-cast ${flip.dir}`} />
                <div className={`cpx-flipper ${flip.dir}`}>
                  <div className="cpx-face front">
                    <PageImg n={flip.dir === 'next' ? cur.right : cur.left} />
                  </div>
                  <div className="cpx-face back">
                    <PageImg n={flip.dir === 'next' ? nxt.left : prv.right} />
                  </div>
                </div>
              </>
            )}

            <div className="cpx-spine" />
          </div>
        ) : (
          /* ── MOBILE (página única) ── */
          <div
            key={page}
            className={`${mDir === 'next' ? 'cpx-m-next' : 'cpx-m-prev'} relative`}
            style={{ transformStyle: 'preserve-3d' }}
            onClick={() => setLightbox(page)}
          >
            <img
              src={pageSrc(page)}
              alt={`Página ${page}`}
              draggable={false}
              className="rounded-xl max-h-[calc(100svh-7rem)] max-w-[96vw] object-contain shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9),0_0_70px_-18px_rgba(155,28,28,0.5)]"
            />
          </div>
        )}

        {/* setas */}
        <button
          onClick={prev}
          disabled={isDesktop ? sIdx === 0 || !!flip : page === 1}
          className="hidden sm:flex cpx-btn cpx-arrow absolute left-4 lg:left-10 top-1/2 -translate-y-1/2 z-20 disabled:opacity-20 disabled:pointer-events-none"
          title="Anterior (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={next}
          disabled={isDesktop ? sIdx >= spreads.length - 1 || !!flip : page === TOTAL_PAGES}
          className="hidden sm:flex cpx-btn cpx-arrow absolute right-4 lg:right-10 top-1/2 -translate-y-1/2 z-20 disabled:opacity-20 disabled:pointer-events-none"
          title="Próxima (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* ───── rodapé ───── */}
      <div className="cpx-chrome absolute bottom-0 left-0 right-0 z-30 px-4 sm:px-8 pb-4 pt-12 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center gap-4 max-w-3xl mx-auto">
          <span className="text-xs tabular-nums text-white/75 whitespace-nowrap">
            {counterLabel} / {TOTAL_PAGES}
          </span>
          <input
            type="range"
            min={1}
            max={TOTAL_PAGES}
            value={isDesktop ? curFirstPage : page}
            onChange={(e) => goToPage(parseInt(e.target.value))}
            className="cpx-range flex-1 h-1 appearance-none rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(90deg, var(--crimson-hi) ${progress}%, rgba(255,255,255,0.16) ${progress}%)`,
            }}
            aria-label="Ir para página"
          />
          <span className="hidden md:block text-[10px] tracking-[0.25em] uppercase text-white/40 whitespace-nowrap">
            ← → folhear · clique amplia
          </span>
        </div>
      </div>

      {/* ───── lightbox (zoom) ───── */}
      {lightbox && (
        <div
          className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm overflow-auto flex items-start justify-center"
          onClick={() => setLightbox(null)}
        >
          <img
            src={pageSrc(lightbox)}
            alt={`Página ${lightbox} ampliada`}
            className="w-[min(1000px,140vw)] max-w-none my-6 rounded-lg shadow-2xl cursor-zoom-out"
          />
          <button className="cpx-btn fixed top-4 right-4" title="Fechar (Esc)">
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>
      )}

      {/* ───── miniaturas ───── */}
      {showThumbs && (
        <div className="absolute inset-0 z-40 bg-black/88 backdrop-blur-md overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-b from-black/90 to-transparent">
            <p className="text-sm tracking-[0.3em] uppercase text-white/70">Todas as páginas</p>
            <button onClick={() => setShowThumbs(false)} className="cpx-btn" title="Fechar (Esc)">
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3 sm:gap-4 px-4 sm:px-8 pb-10">
            {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => {
                  goToPage(n);
                  setShowThumbs(false);
                }}
                className={`cpx-thumb relative rounded-lg overflow-hidden bg-[#1c1414] ${
                  (isDesktop ? n === cur.left || n === cur.right : n === page) ? 'cur' : ''
                }`}
                style={{ aspectRatio: '9/16' }}
              >
                <img src={pageSrc(n)} alt={`Página ${n}`} loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white/85">
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
