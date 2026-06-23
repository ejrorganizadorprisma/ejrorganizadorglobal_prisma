import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuote } from '../hooks/useQuotes';
import { useDefaultDocumentSettings } from '../hooks/useDocumentSettings';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { formatPriceValue } from '../hooks/useFormatPrice';
import { api } from '../lib/api';
import type { Currency } from '@ejr/shared-types';
import { ArrowLeft, ChevronDown, Printer } from 'lucide-react';

/**
 * Catálogo / Apresentação imersiva do orçamento.
 * Conteúdo integral do PDF: nº, data, cliente, itens (cod, cod. forn.,
 * produto, qtd, unit., total), subtotal, desconto, total, validade,
 * assinatura e rodapé com contatos.
 *
 * Estética: "luxo industrial em cobre" — fundo carvão, acentos cobre,
 * Fraunces (display) + Sora (corpo), reveals em scroll, contador animado.
 */

// ───────────────────────── helpers ─────────────────────────

function useGoogleFonts() {
  useEffect(() => {
    const id = 'catalog-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=Sora:wght@300;400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);
}

/** Reveal-on-scroll: aplica .cat-in quando o elemento entra na viewport. */
function useRevealOnScroll(deps: any[] = []) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.cat-reveal'));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('cat-in');
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Contador animado (ease-out) disparado quando visível. */
function CountUp({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const dur = 1600;
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 4);
            setDisplay(Math.round(value * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return <span ref={ref}>{format(display)}</span>;
}

function longDate(d?: string | Date | null): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const s = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  // "9 de abril de 2026" → "9 de Abril de 2026"
  return s.replace(/ de ([a-zà-ú])/i, (m) => m.toUpperCase().replace(' DE ', ' de '));
}

// ───────────────────────── page ─────────────────────────

export function QuoteCatalogPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useGoogleFonts();

  const { data: quote, isLoading } = useQuote(id || '', { enabled: !!id });
  const { data: docSettings } = useDefaultDocumentSettings();
  const { data: systemSettings } = useSystemSettings();
  const currency = (systemSettings?.defaultCurrency || 'BRL') as Currency;
  const fmt = (v: number) => formatPriceValue(v, currency);

  // Fotos dos produtos dos itens (a quote embute só name/code/factoryCode)
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = (quote?.items || [])
      .map((it: any) => it.productId)
      .filter(Boolean) as string[];
    if (ids.length === 0) return;
    let cancelled = false;
    Promise.all(
      ids.map((pid) =>
        api
          .get(`/products/${pid}`)
          .then((r) => [pid, r.data?.data?.imageUrls?.[0] || ''] as const)
          .catch(() => [pid, ''] as const)
      )
    ).then((pairs) => {
      if (cancelled) return;
      const map: Record<string, string> = {};
      pairs.forEach(([pid, url]) => {
        if (url) map[pid] = url;
      });
      setProductImages(map);
    });
    return () => {
      cancelled = true;
    };
  }, [quote?.items]);

  useRevealOnScroll([quote?.id, Object.keys(productImages).length]);

  const items = quote?.items || [];
  const subtotal = quote?.subtotal ?? 0;
  const discount = quote?.discount ?? 0;
  const total = quote?.total ?? 0;
  const customerName = quote?.customer?.name || '—';

  const company = useMemo(
    () => ({
      logo: docSettings?.companyLogo || '',
      name: docSettings?.companyName || 'EJR Organizador Global',
      footerText: docSettings?.footerText || 'Obrigado pela preferência!',
      address: docSettings?.footerAddress || '',
      phone: docSettings?.footerPhone || '',
      email: docSettings?.footerEmail || '',
      website: docSettings?.footerWebsite || '',
      signatureImage: docSettings?.signatureImage || '',
      signatureName: docSettings?.signatureName || 'Responsável',
      signatureRole: docSettings?.signatureRole || 'Diretor',
    }),
    [docSettings]
  );

  if (isLoading || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b08]">
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[#c98a4b] border-t-transparent animate-spin"
            aria-hidden
          />
          <p className="text-[#c9b89a] text-sm tracking-[0.3em] uppercase">Preparando catálogo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cat-root">
      {/* estilos do catálogo (escopados pelo prefixo .cat-) */}
      <style>{`
        .cat-root {
          --ink: #0d0b08;
          --ink-2: #14110c;
          --copper: #c98a4b;
          --copper-hi: #e9b27c;
          --cream: #f5eee1;
          --cream-dim: #c9b89a;
          background: var(--ink);
          color: var(--cream);
          font-family: 'Sora', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }
        .cat-display { font-family: 'Fraunces', serif; }

        /* grão + vinheta de atmosfera */
        .cat-root::before {
          content: '';
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
        .cat-root::after {
          content: '';
          position: fixed; inset: 0; z-index: 1; pointer-events: none;
          background: radial-gradient(120% 90% at 50% 0%, transparent 55%, rgba(0,0,0,0.55) 100%);
        }
        .cat-z { position: relative; z-index: 2; }

        /* entrada da capa */
        @keyframes catRise {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cat-hero-el { opacity: 0; animation: catRise 0.9s cubic-bezier(.2,.7,.2,1) forwards; }

        /* traçado de circuito (cobre) */
        @keyframes catDraw { to { stroke-dashoffset: 0; } }
        .cat-wire {
          stroke-dasharray: 1400; stroke-dashoffset: 1400;
          animation: catDraw 2.8s 0.4s cubic-bezier(.4,0,.2,1) forwards;
          filter: drop-shadow(0 0 6px rgba(233,178,124,0.55));
        }
        @keyframes catPulse { 0%,100% { opacity: .55 } 50% { opacity: 1 } }
        .cat-node { animation: catPulse 2.6s ease-in-out infinite; }

        /* reveal em scroll */
        .cat-reveal { opacity: 0; transform: translateY(34px); transition: opacity .9s cubic-bezier(.2,.7,.2,1), transform .9s cubic-bezier(.2,.7,.2,1); }
        .cat-reveal.cat-in { opacity: 1; transform: translateY(0); }
        .cat-reveal[data-delay='1'] { transition-delay: .12s }
        .cat-reveal[data-delay='2'] { transition-delay: .24s }
        .cat-reveal[data-delay='3'] { transition-delay: .36s }

        /* indicador de scroll */
        @keyframes catBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(8px) } }
        .cat-bob { animation: catBob 1.8s ease-in-out infinite; }

        /* cartão de item */
        .cat-card { transition: transform .5s cubic-bezier(.2,.7,.2,1), box-shadow .5s; }
        .cat-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px -20px rgba(201,138,75,0.25); }
        .cat-card .cat-photo img { transition: transform 1.1s cubic-bezier(.2,.7,.2,1); }
        .cat-card:hover .cat-photo img { transform: scale(1.06); }

        /* linha cobre decorativa */
        .cat-rule { height: 1px; background: linear-gradient(90deg, transparent, var(--copper) 30%, var(--copper-hi) 50%, var(--copper) 70%, transparent); }

        /* número fantasma */
        .cat-ghost {
          font-family: 'Fraunces', serif; font-weight: 700;
          color: transparent; -webkit-text-stroke: 1px rgba(201,138,75,0.35);
          user-select: none;
        }

        @media print {
          .cat-root::before, .cat-root::after { display: none; }
          .cat-noprint { display: none !important; }
          .cat-reveal { opacity: 1 !important; transform: none !important; }
          .cat-root { background: #fff; color: #111; }
        }
      `}</style>

      {/* ── barra de ações (admin) ── */}
      <div className="cat-z cat-noprint fixed top-0 left-0 right-0 flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-b from-black/70 to-transparent z-50">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[13px] tracking-wide text-[#c9b89a] hover:text-[#f5eee1] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 text-[13px] tracking-wide text-[#c9b89a] hover:text-[#f5eee1] transition-colors"
        >
          <Printer className="w-4 h-4" /> Imprimir
        </button>
      </div>

      {/* ════════ CAPA ════════ */}
      <section className="cat-z relative min-h-screen flex flex-col items-center justify-center text-center px-6">
        {/* circuito de cobre animado */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <path
            className="cat-wire"
            d="M-50 620 H 260 L 330 550 H 560 L 610 600 H 900 L 980 520 H 1250"
            fill="none"
            stroke="#c98a4b"
            strokeWidth="1.4"
          />
          <path
            className="cat-wire"
            style={{ animationDelay: '0.9s' }}
            d="M-50 180 H 180 L 250 250 H 520 L 580 195 H 860 L 930 265 H 1250"
            fill="none"
            stroke="#7a5631"
            strokeWidth="1.1"
          />
          <circle className="cat-node" cx="330" cy="550" r="4" fill="#e9b27c" />
          <circle className="cat-node" style={{ animationDelay: '.8s' }} cx="610" cy="600" r="4" fill="#e9b27c" />
          <circle className="cat-node" style={{ animationDelay: '1.4s' }} cx="580" cy="195" r="4" fill="#e9b27c" />
        </svg>

        {company.logo && (
          <img
            src={company.logo}
            alt={company.name}
            className="cat-hero-el h-16 sm:h-20 object-contain mb-10 drop-shadow-[0_4px_24px_rgba(233,178,124,0.25)]"
            style={{ animationDelay: '0.1s' }}
          />
        )}

        <p
          className="cat-hero-el text-[11px] sm:text-xs tracking-[0.45em] uppercase text-[#c9b89a] mb-5"
          style={{ animationDelay: '0.3s' }}
        >
          {company.name} · Proposta Comercial
        </p>

        <h1
          className="cat-hero-el cat-display font-semibold text-[#f5eee1] leading-[1.04] text-5xl sm:text-7xl lg:text-8xl max-w-5xl"
          style={{ animationDelay: '0.45s' }}
        >
          Orçamento
          <span className="block text-[#e9b27c] italic font-light mt-2">
            preparado para {customerName}
          </span>
        </h1>

        <div
          className="cat-hero-el mt-10 flex flex-col sm:flex-row items-center gap-3 sm:gap-8 text-sm text-[#c9b89a]"
          style={{ animationDelay: '0.65s' }}
        >
          <span className="px-4 py-1.5 rounded-full border border-[#c98a4b]/40 text-[#e9b27c] font-medium tracking-widest">
            Nº {quote.quoteNumber}
          </span>
          <span>Data: {longDate(quote.createdAt)}</span>
          <span>Validade: {longDate(quote.validUntil)}</span>
        </div>

        <div className="cat-hero-el absolute bottom-8 flex flex-col items-center gap-1 text-[#c9b89a]" style={{ animationDelay: '1.1s' }}>
          <span className="text-[10px] tracking-[0.35em] uppercase">Deslize</span>
          <ChevronDown className="w-5 h-5 cat-bob" />
        </div>
      </section>

      {/* ════════ DADOS DO CLIENTE ════════ */}
      <section className="cat-z max-w-5xl mx-auto px-6 py-20 sm:py-28">
        <div className="cat-reveal">
          <p className="text-[11px] tracking-[0.4em] uppercase text-[#c98a4b] mb-3">Dados do cliente</p>
          <div className="cat-rule mb-8" />
        </div>
        <div className="cat-reveal grid sm:grid-cols-[1fr_auto] gap-6 items-end" data-delay="1">
          <div>
            <h2 className="cat-display text-4xl sm:text-5xl font-semibold text-[#f5eee1]">{customerName}</h2>
            <div className="mt-3 space-y-0.5 text-sm text-[#c9b89a]">
              {quote.customer?.document && <p>Documento: {quote.customer.document}</p>}
              {quote.customer?.ruc && <p>RUC: {quote.customer.ruc}</p>}
              {quote.customer?.ci && <p>CI: {quote.customer.ci}</p>}
              {quote.customer?.email && <p>Email: {quote.customer.email}</p>}
              {quote.customer?.phone && <p>Telefone: {quote.customer.phone}</p>}
              {quote.customer?.address && <p>Endereço: {quote.customer.address}</p>}
            </div>
          </div>
          <div className="text-left sm:text-right text-sm text-[#c9b89a]">
            <p className="text-[#e9b27c] cat-display text-2xl">{quote.quoteNumber}</p>
            <p className="mt-1">{longDate(quote.createdAt)}</p>
          </div>
        </div>
      </section>

      {/* ════════ ITENS DO ORÇAMENTO (vitrine) ════════ */}
      <section className="cat-z max-w-6xl mx-auto px-6 pb-8">
        <div className="cat-reveal mb-14">
          <p className="text-[11px] tracking-[0.4em] uppercase text-[#c98a4b] mb-3">Itens do orçamento</p>
          <div className="cat-rule" />
        </div>

        <div className="space-y-20 sm:space-y-28">
          {items.map((it: any, idx: number) => {
            const photo = it.productId ? productImages[it.productId] : '';
            const name = it.product?.name || it.serviceName || 'Item';
            const flip = idx % 2 === 1;
            return (
              <article
                key={it.id || idx}
                className={`cat-reveal cat-card relative grid gap-8 lg:gap-14 items-center ${
                  photo ? 'lg:grid-cols-2' : ''
                }`}
              >
                {/* número fantasma */}
                <span className="cat-ghost absolute -top-12 sm:-top-16 left-0 text-[88px] sm:text-[120px] leading-none">
                  {String(idx + 1).padStart(2, '0')}
                </span>

                {photo && (
                  <div
                    className={`cat-photo relative rounded-2xl overflow-hidden border border-[#c98a4b]/25 bg-[#14110c] ${
                      flip ? 'lg:order-2' : ''
                    }`}
                  >
                    <img src={photo} alt={name} className="w-full h-72 sm:h-96 object-contain p-6" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                  </div>
                )}

                <div className={flip ? 'lg:order-1' : ''}>
                  <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] font-mono">
                    {it.product?.code && (
                      <span className="px-2.5 py-1 rounded-full bg-[#c98a4b]/15 text-[#e9b27c] border border-[#c98a4b]/30">
                        {it.product.code}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-[#c9b89a] border border-white/10">
                      Cód. Fáb: {it.product?.factoryCode || '—'}
                    </span>
                  </div>

                  <h3 className="cat-display text-3xl sm:text-4xl font-semibold text-[#f5eee1] leading-tight">
                    {name}
                  </h3>
                  {it.serviceDescription && (
                    <p className="mt-3 text-sm text-[#c9b89a] leading-relaxed">{it.serviceDescription}</p>
                  )}

                  <div className="mt-7 grid grid-cols-3 gap-4 max-w-md">
                    <div>
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#c9b89a]">Qtd</p>
                      <p className="cat-display text-2xl text-[#f5eee1] mt-1">{it.quantity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#c9b89a]">Valor unit.</p>
                      <p className="cat-display text-2xl text-[#f5eee1] mt-1">{fmt(it.unitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.25em] uppercase text-[#c9b89a]">Total</p>
                      <p className="cat-display text-2xl text-[#e9b27c] mt-1">{fmt(it.total)}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ════════ RESUMO (fidelidade ao PDF) ════════ */}
      <section className="cat-z max-w-5xl mx-auto px-6 py-20 sm:py-28">
        <div className="cat-reveal mb-8">
          <p className="text-[11px] tracking-[0.4em] uppercase text-[#c98a4b] mb-3">Resumo</p>
          <div className="cat-rule" />
        </div>
        <div className="cat-reveal overflow-x-auto rounded-xl border border-white/10" data-delay="1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.18em] uppercase text-[#c9b89a] bg-white/[0.03]">
                <th className="px-4 py-3 font-medium">Cód.</th>
                <th className="px-4 py-3 font-medium">Cód. Forn.</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium text-right">Qtd</th>
                <th className="px-4 py-3 font-medium text-right">Valor unit.</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it: any, idx: number) => (
                <tr key={it.id || idx} className="border-t border-white/[0.06]">
                  <td className="px-4 py-3 font-mono text-[#e9b27c]">{it.product?.code || '—'}</td>
                  <td className="px-4 py-3 font-mono text-[#c9b89a]">{it.product?.factoryCode || '—'}</td>
                  <td className="px-4 py-3 text-[#f5eee1]">{it.product?.name || it.serviceName || '—'}</td>
                  <td className="px-4 py-3 text-right">{it.quantity}</td>
                  <td className="px-4 py-3 text-right">{fmt(it.unitPrice)}</td>
                  <td className="px-4 py-3 text-right text-[#e9b27c]">{fmt(it.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ════════ INVESTIMENTO ════════ */}
      <section className="cat-z relative py-24 sm:py-32 px-6 text-center overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(60% 70% at 50% 50%, rgba(201,138,75,0.13), transparent 70%)' }}
          aria-hidden
        />
        <div className="cat-reveal relative">
          <p className="text-[11px] tracking-[0.45em] uppercase text-[#c98a4b]">Investimento total</p>
          <p className="cat-display mt-6 text-5xl sm:text-7xl lg:text-8xl font-semibold text-[#e9b27c] drop-shadow-[0_0_40px_rgba(233,178,124,0.25)]">
            <CountUp value={total} format={fmt} />
          </p>
          <div className="mt-8 inline-flex flex-col gap-1.5 text-sm text-[#c9b89a]">
            <span>
              Subtotal: <span className="text-[#f5eee1]">{fmt(subtotal)}</span>
            </span>
            {discount > 0 && (
              <span>
                Desconto: <span className="text-[#f5eee1]">− {fmt(discount)}</span>
              </span>
            )}
            <span className="mt-2 text-[#e9b27c] tracking-wide">
              Validade do orçamento: {longDate(quote.validUntil)}
            </span>
          </div>
          {quote.notes && (
            <p className="mt-8 max-w-2xl mx-auto text-sm text-[#c9b89a] italic leading-relaxed">
              “{quote.notes}”
            </p>
          )}
        </div>
      </section>

      {/* ════════ ASSINATURA + RODAPÉ ════════ */}
      <footer className="cat-z border-t border-white/10 px-6 pt-16 pb-10 text-center">
        <div className="cat-reveal max-w-md mx-auto">
          {company.signatureImage && (
            <img
              src={company.signatureImage}
              alt="Assinatura"
              className="h-16 mx-auto object-contain opacity-90 invert mix-blend-screen"
            />
          )}
          <div className="cat-rule mt-3 mb-3 mx-auto max-w-[260px]" />
          <p className="cat-display text-xl text-[#f5eee1]">{company.signatureName}</p>
          <p className="text-xs tracking-[0.25em] uppercase text-[#c9b89a] mt-1">{company.signatureRole}</p>
        </div>

        <div className="cat-reveal mt-14" data-delay="1">
          <p className="cat-display italic text-2xl text-[#e9b27c]">{company.footerText}</p>
          <div className="mt-6 text-xs text-[#c9b89a] space-y-1">
            {company.address && <p>{company.address}</p>}
            <p>
              {[company.phone && `Tel: ${company.phone}`, company.email, company.website]
                .filter(Boolean)
                .join(' | ')}
            </p>
            <p className="pt-4 text-[10px] tracking-[0.3em] uppercase opacity-60">{company.name}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
