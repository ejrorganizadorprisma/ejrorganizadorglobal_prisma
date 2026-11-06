import { useEffect, useRef, useState } from 'react';
import { Flashlight, FlashlightOff, SwitchCamera, X, Loader2, CameraOff } from 'lucide-react';

/**
 * Leitor de código de barras pela câmera (celular/tablet).
 *
 * - Usa o BarcodeDetector nativo quando o navegador tem (Chrome/Android: rápido,
 *   lê EAN-13/EAN-8/UPC/Code128/Code39/QR...).
 * - Senão (iPhone/iPad/Safari, Firefox), carrega o ZXing sob demanda.
 * - Leitura contínua: chama onDetect a cada código; o mesmo código só é aceito
 *   de novo depois de sair do quadro por `repeatMs` (produto parado não repete).
 * - Lanterna (quando o aparelho suporta) e troca de câmera.
 */
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

  const emit = (raw: string) => {
    const code = String(raw || '').trim();
    if (!code) return;
    const now = Date.now();
    // Pausado (janela aberta): só registra que o código está à vista, sem lançar —
    // ao fechar a janela o mesmo produto parado na frente não entra de novo.
    if (pausedRef.current) { lastRef.current = { code, at: now }; return; }
    // Mesmo código só conta de novo depois de SAIR do quadro (sem ser visto por
    // `repeatMs`): produto parado na frente da câmera não é lançado várias vezes.
    if (lastRef.current.code === code && now - lastRef.current.at < repeatMs) {
      lastRef.current.at = now;
      return;
    }
    lastRef.current = { code, at: now };
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
    onDetectRef.current(code);
  };

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;

    const start = async () => {
      setStatus('starting');
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setError('Este navegador não permite usar a câmera. Use o Chrome (Android) ou o Safari (iPhone) com o site em HTTPS.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        await video.play().catch(() => {});
        const track = stream.getVideoTracks()[0];
        const caps: any = track?.getCapabilities?.() || {};
        setTorchAvailable(!!caps.torch);
        setStatus('ready');

        const Native: any = (window as any).BarcodeDetector;
        let useNative = false;
        if (Native) {
          try {
            const supported: string[] = (await Native.getSupportedFormats?.()) || [];
            useNative = supported.some((f) => ['ean_13', 'ean_8', 'code_128', 'upc_a'].includes(f));
          } catch { useNative = false; }
        }

        if (useNative) {
          const detector = new Native({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'],
          });
          let last = 0;
          const loop = async (t: number) => {
            if (cancelled) return;
            if (t - last > 120 && video.readyState >= 2 && !pausedRef.current) {
              last = t;
              try {
                const codes = await detector.detect(video);
                if (codes?.[0]?.rawValue) emit(codes[0].rawValue);
              } catch { /* frame ruim — ignora */ }
            }
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        } else {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader(undefined, { delayBetweenScanAttempts: 120 });
          if (cancelled) return;
          zxingControls = await reader.decodeFromVideoElement(video, (result) => {
            if (result) emit(result.getText());
          });
        }
      } catch (e: any) {
        if (cancelled) return;
        if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
          setStatus('denied');
        } else {
          setStatus('error');
          setError(e?.message || 'Não foi possível abrir a câmera');
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
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
      <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />

      {/* Moldura de mira */}
      {status === 'ready' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className={`relative w-[78%] max-w-md aspect-[2.4/1] rounded-2xl transition-all ${flash ? 'ring-4 ring-emerald-400 bg-emerald-400/20' : 'ring-2 ring-white/80'}`}>
            <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-red-500/90 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/80">
            {paused ? 'Leitura pausada' : 'Aponte para o código de barras'}
          </div>
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

      {/* Controles */}
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
