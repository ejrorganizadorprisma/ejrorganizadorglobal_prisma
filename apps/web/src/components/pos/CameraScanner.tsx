import { useEffect, useRef, useState } from 'react';
import { Flashlight, FlashlightOff, SwitchCamera, X, Loader2, CameraOff } from 'lucide-react';

/**
 * Leitor de código de barras pela câmera (celular/tablet).
 *
 * Como lê (robusto em aparelho real):
 * - Recorta a FAIXA CENTRAL da imagem (onde fica a mira), reduz para ~960px e
 *   analisa ~9x por segundo — bem mais rápido e preciso que a imagem inteira.
 * - Dois motores: BarcodeDetector nativo (Chrome/Android) e ZXing (iPhone/iPad,
 *   Safari, Firefox — e reserva do nativo: se o nativo não ler nada em 1,5s, o
 *   ZXing passa a rodar junto). ZXing com TRY_HARDER (também lê o código girado).
 * - Foco contínuo e resolução alta quando o aparelho permite; lanterna; troca de câmera.
 * - Mesmo código só conta de novo depois de sair do quadro (`repeatMs` sem ser visto).
 */
type Engine = 'native' | 'zxing' | 'native+zxing';

export function CameraScanner({
  onDetect,
  onClose,
  paused = false,
  repeatMs = 900,
  className = '',
}: {
  onDetect: (code: string) => void;
  onClose?: () => void;
  paused?: boolean;
  repeatMs?: number;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const pausedRef = useRef(paused);
  const onDetectRef = useRef(onDetect);
  pausedRef.current = paused;
  onDetectRef.current = onDetect;

  const [status, setStatus] = useState<'starting' | 'ready' | 'denied' | 'error'>('starting');
  const [error, setError] = useState('');
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [flash, setFlash] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [engine, setEngine] = useState<Engine | null>(null);

  const emit = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code) return;
    const now = Date.now();
    // Pausado (janela aberta): só registra que o código está à vista.
    if (pausedRef.current) { lastRef.current = { code, at: now }; return; }
    // Mesmo código só conta de novo depois de sair do quadro.
    if (lastRef.current.code === code && now - lastRef.current.at < repeatMs) { lastRef.current.at = now; return; }
    lastRef.current = { code, at: now };
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    onDetectRef.current(code);
  };

  useEffect(() => {
    let cancelled = false;
    let timer: any = 0;

    const start = async () => {
      setStatus('starting');
      setError('');
      setEngine(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('Este navegador não permite usar a câmera. Use o Chrome (Android) ou o Safari (iPhone) com o site em HTTPS.');
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          });
        } catch (e: any) {
          if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') throw e;
          stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facing } });
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play().catch(() => {});

        const track: any = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() || {};
        setTorchAvailable(!!caps.torch);
        // Foco contínuo (Android) — ignora se não suportar
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }
        setStatus('ready');

        // ── Motores ─────────────────────────────────────────────────────────
        let native: any = null;
        const Native: any = (window as any).BarcodeDetector;
        if (Native) {
          try {
            const supported: string[] = (await Native.getSupportedFormats?.()) || [];
            const wanted = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar'];
            const formats = wanted.filter((f) => supported.includes(f));
            if (formats.length) native = new Native({ formats });
          } catch { native = null; }
        }

        const zx = await import('@zxing/library');
        const { HTMLCanvasElementLuminanceSource } = await import('@zxing/browser');
        const hints = new Map<any, any>();
        hints.set(zx.DecodeHintType.POSSIBLE_FORMATS, [
          zx.BarcodeFormat.EAN_13, zx.BarcodeFormat.EAN_8, zx.BarcodeFormat.UPC_A, zx.BarcodeFormat.UPC_E,
          zx.BarcodeFormat.CODE_128, zx.BarcodeFormat.CODE_39, zx.BarcodeFormat.CODE_93, zx.BarcodeFormat.ITF,
          zx.BarcodeFormat.CODABAR,
        ]);
        hints.set(zx.DecodeHintType.TRY_HARDER, true);
        const reader = new zx.MultiFormatReader();
        reader.setHints(hints);
        if (cancelled) return;
        setEngine(native ? 'native' : 'zxing');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D;
        let lastNativeHit = Date.now();
        let tick = 0;

        const decodeZxing = (): string | null => {
          try {
            const src = new HTMLCanvasElementLuminanceSource(canvas);
            const bmp = new zx.BinaryBitmap(new zx.HybridBinarizer(src));
            return reader.decode(bmp).getText();
          } catch {
            return null; // NotFound / Checksum / Format — frame sem código
          } finally {
            reader.reset();
          }
        };

        const loop = async () => {
          if (cancelled) return;
          try {
            // Continua analisando mesmo pausado (janela aberta): o emit só REGISTRA o
            // código visto, assim o produto parado na frente não entra de novo ao fechar.
            if (video.readyState >= 2 && video.videoWidth) {
              // Faixa central (85% x 45%), reduzida para no máx. 960px de largura
              const vw = video.videoWidth, vh = video.videoHeight;
              const cw = Math.round(vw * 0.85), ch = Math.round(vh * 0.45);
              const sx = Math.round((vw - cw) / 2), sy = Math.round((vh - ch) / 2);
              const scale = Math.min(1, 960 / cw);
              canvas.width = Math.round(cw * scale);
              canvas.height = Math.round(ch * scale);
              ctx.drawImage(video, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);

              let code: string | null = null;
              if (native) {
                try {
                  const r = await native.detect(canvas);
                  if (r?.[0]?.rawValue) { code = r[0].rawValue; lastNativeHit = Date.now(); }
                } catch { /* frame ruim */ }
              }
              // ZXing: motor principal sem nativo; reserva quando o nativo não lê há 1,5s
              const useZx = !native || Date.now() - lastNativeHit > 1500;
              if (!code && useZx && (!native || tick % 2 === 0)) {
                code = decodeZxing();
                if (native) setEngine('native+zxing');
              }
              if (code) emit(code);
              tick++;
            }
          } catch { /* continua */ }
          timer = setTimeout(loop, pausedRef.current ? 250 : 110);
        };
        loop();
      } catch (e: any) {
        if (cancelled) return;
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setStatus('denied');
        else { setStatus('error'); setError(e?.message || 'Não foi possível abrir a câmera'); }
      }
    };

    start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, attempt]);

  const toggleTorch = async () => {
    const track: any = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] });
      setTorch(!torch);
    } catch { setTorchAvailable(false); }
  };

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 w-full h-full object-cover" />

      {/* Mira = área analisada (faixa central) */}
      {status === 'ready' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`relative w-[85%] h-[45%] rounded-2xl transition-all duration-150 ${flash ? 'ring-4 ring-emerald-400 bg-emerald-400/25' : 'ring-2 ring-white/80'}`}>
            <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse" />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-white/85 drop-shadow">
            {paused ? 'Leitura pausada' : 'Encaixe o código dentro da moldura'}
          </div>
          {engine && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/50 text-[10px] text-white/80 flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${paused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              {engine === 'native' ? 'Leitor nativo' : engine === 'zxing' ? 'Leitor ZXing' : 'Nativo + ZXing'}
            </div>
          )}
        </div>
      )}

      {status === 'starting' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2">
          <Loader2 className="w-7 h-7 animate-spin" /> <span className="text-sm">Abrindo câmera…</span>
        </div>
      )}
      {(status === 'denied' || status === 'error') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-5 gap-2">
          <CameraOff className="w-8 h-8 text-white/70" />
          <div className="font-semibold">{status === 'denied' ? 'Câmera bloqueada' : 'Câmera indisponível'}</div>
          <div className="text-xs text-white/70 max-w-xs">
            {status === 'denied'
              ? 'Permita o acesso à câmera nas configurações do navegador (ícone de cadeado na barra de endereço) e toque em "Tentar de novo".'
              : error}
          </div>
          <button onClick={() => setAttempt((a) => a + 1)} className="mt-2 px-4 py-2 rounded-xl bg-white/15 text-sm font-semibold">
            Tentar de novo
          </button>
        </div>
      )}

      <div className="absolute top-2 right-2 flex gap-2">
        {torchAvailable && (
          <button onClick={toggleTorch} className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur" title="Lanterna">
            {torch ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
          </button>
        )}
        <button onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))} className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur" title="Trocar câmera">
          <SwitchCamera className="w-5 h-5" />
        </button>
        {onClose && (
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur" title="Fechar câmera">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
