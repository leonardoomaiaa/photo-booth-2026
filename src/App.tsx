import { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<'idle' | 'countdown' | 'preview' | 'done'>('idle');
  const [photoIndex, setPhotoIndex] = useState<number>(0); // 1, 2 ou 3
  const [countdown, setCountdown] = useState<number>(5);
  const [previewTimer, setPreviewTimer] = useState<number>(5);
  const [photos, setPhotos] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar a webcam ao carregar
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Erro ao acessar a webcam:", err);
      });
  }, []);

  // Lógica da Contagem Regressiva (5 segundos)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'countdown') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        takePhoto();
      }
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Lógica do Preview da foto tirada no monitor (5 segundos)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'preview') {
      if (previewTimer > 0) {
        timer = setTimeout(() => setPreviewTimer(previewTimer - 1), 1000);
      } else {
        if (photoIndex < 3) {
          setCountdown(5);
          setStep('countdown');
        } else {
          setStep('done');
        }
      }
    }
    return () => clearTimeout(timer);
  }, [step, previewTimer, photoIndex]);

  const startSequence = () => {
    setPhotos([]);
    setPhotoIndex(1);
    setCountdown(5);
    setStep('countdown');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setPhotos((prev) => {
          const updated = [...prev, dataUrl];
          // Se já tirou a 3ª foto, avança o índice para o final
          if (updated.length >= 3) {
            setPhotoIndex(3);
          } else {
            setPhotoIndex(updated.length + 1);
          }
          return updated;
        });
        setPreviewTimer(5);
        setStep('preview');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-2">CABINE DE FOTOS (TESTE GITHUB)</h1>
      <p className="text-slate-400 mb-6">
        {step === 'idle' && "Prepare-se para 3 fotos em sequência!"}
        {step === 'countdown' && `Foto ${photoIndex} de 3 - Preparando em ${countdown}s...`}
        {step === 'preview' && `Exibindo foto ${photoIndex} de 3 (${previewTimer}s)...`}
        {step === 'done' && "Sua tira ficou pronta!"}
      </p>

      {/* Elemento de vídeo principal da webcam (sempre ativo em segundo plano) */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Tela principal / Monitor de visualização */}
      <div className="relative w-full max-w-md bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center aspect-[3/4] mb-6">
        {step === 'idle' && (
          <div className="text-center p-6">
            <Camera className="w-16 h-16 mx-auto mb-4 text-pink-500 animate-pulse" />
            <button
              onClick={startSequence}
              className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all"
            >
              Começar Sequência
            </button>
          </div>
        )}

        {step === 'countdown' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="text-9xl font-black text-pink-500 animate-bounce">{countdown}</span>
          </div>
        )}

        {step === 'countdown' && (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <video
              autoPlay
              playsInline
              muted
              ref={(node) => {
                if (node && videoRef.current && videoRef.current.srcObject) {
                  node.srcObject = videoRef.current.srcObject;
                }
              }}
              className="w-full h-full object-cover -scale-x-100"
            />
          </div>
        )}

        {step === 'preview' && photos.length > 0 && (
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <img
              src={photos[photos.length - 1]}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-sm font-semibold text-pink-400">
              Próxima em {previewTimer}s
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="w-full h-full p-4 bg-white flex flex-col items-center justify-around">
            <div className="w-32 h-full flex flex-col gap-2 bg-slate-100 p-2 border border-slate-300 rounded shadow-inner overflow-y-auto">
              {photos.map((p, idx) => (
                <img key={idx} src={p} alt={`Pose ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Botões de Ação Final */}
      {step === 'done' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 px-6 rounded-xl shadow"
          >
            <Printer className="w-5 h-5" /> Imprimir Tira
          </button>
          <button
            onClick={startSequence}
            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 font-bold py-3 px-6 rounded-xl shadow"
          >
            <RefreshCcw className="w-5 h-5" /> Refazer Sequência
          </button>
        </div>
      )}
    </div>
  );
}
