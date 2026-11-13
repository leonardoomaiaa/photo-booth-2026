import React, { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw, Settings, ArrowLeft, Video } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'camera-config' | 'booth'>('menu');
  const [step, setStep] = useState<'idle' | 'countdown' | 'preview' | 'done'>('idle');
  const [photoIndex, setPhotoIndex] = useState<number>(1);
  const [countdown, setCountdown] = useState<number>(5);
  const [previewTimer, setPreviewTimer] = useState<number>(5);
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Estados para gerenciar as câmeras
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Listar todas as câmeras conectadas no computador
  useEffect(() => {
    async function getCameras() {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Erro ao listar webcams:", err);
      }
    }
    getCameras();
  }, []);

  // Iniciar a webcam selecionada
  useEffect(() => {
    if (!selectedDeviceId) return;

    navigator.mediaDevices.getUserMedia({ 
      video: { 
        deviceId: { exact: selectedDeviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } 
    })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Erro ao acessar a webcam selecionada:", err);
      });
  }, [selectedDeviceId, screen]);

  // Lógica da Contagem Regressiva (5 segundos)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screen === 'booth' && step === 'countdown') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        takePhoto();
      }
    }
    return () => clearTimeout(timer);
  }, [screen, step, countdown]);

  // Lógica do Preview da foto tirada no monitor (5 segundos)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screen === 'booth' && step === 'preview') {
      if (previewTimer > 0) {
        timer = setTimeout(() => setPreviewTimer(previewTimer - 1), 1000);
      } else {
        if (photoIndex < 3) {
          setPhotoIndex((prev) => prev + 1);
          setCountdown(5);
          setStep('countdown');
        } else {
          setStep('done');
        }
      }
    }
    return () => clearTimeout(timer);
  }, [screen, step, previewTimer, photoIndex]);

  const startSequence = () => {
    setPhotos([]);
    setPhotoIndex(1);
    setCountdown(5);
    setStep('idle');
    setScreen('booth');
  };

  const startBoothAction = () => {
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
        setPhotos((prev) => [...prev, dataUrl]);
        setPreviewTimer(5);
        setStep('preview');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* TELA 1: MENU INICIAL */}
      {screen === 'menu' && (
        <div className="text-center flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">CABINE DE FOTOS</h1>
          <p className="text-slate-400 mb-8">Escolha uma opção para começar</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={startSequence}
              className="flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
            >
              <Camera className="w-6 h-6" /> Iniciar Cabine (3 Fotos)
            </button>

            <button
              onClick={() => setScreen('camera-config')}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 px-6 rounded-2xl border border-slate-700 transition-all text-lg"
            >
              <Settings className="w-6 h-6 text-pink-500" /> Escolher Câmera
            </button>
          </div>
        </div>
      )}

      {/* TELA 2: CONFIGURAÇÃO DE CÂMERA */}
      {screen === 'camera-config' && (
        <div className="flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between w-full mb-6">
            <button
              onClick={() => setScreen('menu')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-5 h-5" /> Voltar
            </button>
            <h2 className="text-xl font-bold">Configurar Câmera</h2>
            <div className="w-12"></div> {/* Espaçador para centralizar */}
          </div>

          <div className="w-full bg-black rounded-2xl overflow-hidden aspect-[4/3] border border-slate-800 mb-6 flex items-center justify-center relative">
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

          <div className="w-full flex flex-col gap-2 mb-6">
            <label className="text-sm text-slate-400 flex items-center gap-2">
              <Video className="w-4 h-4 text-pink-500" /> Câmeras disponíveis:
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-slate-800 text-white rounded-xl p-3 outline-none border border-slate-700 text-sm w-full"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Câmera USB ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setScreen('menu')}
            className="w-full bg-pink-600 hover:bg-pink-500 font-bold py-3 px-6 rounded-xl shadow transition-all"
          >
            Salvar e Voltar ao Menu
          </button>
        </div>
      )}

      {/* TELA 3: FLUXO DA CABINE DE FOTOS */}
      {screen === 'booth' && (
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="flex items-center justify-between w-full mb-2">
            <button
              onClick={() => setScreen('menu')}
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Menu Principal
            </button>
            <h1 className="text-xl font-bold">CABINE DE FOTOS</h1>
            <div className="w-16"></div>
          </div>

          <p className="text-slate-400 mb-4 text-sm">
            {step === 'idle' && "Pronto para iniciar a sequência de 3 fotos!"}
            {step === 'countdown' && `Foto ${photoIndex} de 3 - Preparando em ${countdown}s...`}
            {step === 'preview' && `Exibindo foto ${photoIndex} de 3 (${previewTimer}s)...`}
            {step === 'done' && "Sua tira ficou pronta!"}
          </p>

          <div className="relative w-full bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center aspect-[3/4] mb-6">
            {step === 'idle' && (
              <div className="text-center p-6">
                <Camera className="w-16 h-16 mx-auto mb-4 text-pink-500 animate-pulse" />
                <button
                  onClick={startBoothAction}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all"
                >
                  Começar Sequência
                </button>
              </div>
            )}

            {step === 'countdown' && (
              <>
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <span className="text-9xl font-black text-pink-500 animate-bounce">{countdown}</span>
                </div>
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
              </>
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

          {step === 'done' && (
            <div className="flex flex-col gap-3 w-full">
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
      )}
    </div>
  );
}
