import React, { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw, Settings, ArrowLeft, Video, Image as ImageIcon, FileText, Globe, Volume2 } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'sources-modal' | 'booth'>('menu');
  const [step, setStep] = useState<'idle' | 'countdown' | 'preview' | 'done'>('idle');
  const [photoIndex, setPhotoIndex] = useState<number>(1);
  const [countdown, setCountdown] = useState<number>(5);
  const [previewTimer, setPreviewTimer] = useState<number>(5);
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Estados para fontes estilo OBS
  const [selectedSourceType, setSelectedSourceType] = useState<string>('video-capture');
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

      {/* TELA 1: MENU INICIAL (Com os dois botões principais) */}
      {screen === 'menu' && (
        <div className="text-center flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">CABINE DE FOTOS</h1>
          <p className="text-slate-400 mb-8">Gerenciador de Sessão e Fontes</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={startSequence}
              className="flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
            >
              <Camera className="w-6 h-6" /> Iniciar Sessão
            </button>

            <button
              onClick={() => setScreen('sources-modal')}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 px-6 rounded-2xl border border-slate-700 transition-all text-lg"
            >
              <Settings className="w-6 h-6 text-pink-500" /> Inserir Fontes
            </button>
          </div>
        </div>
      )}

      {/* TELA 2: ESTILO OBS STUDIO (ADICIONAR FONTE) */}
      {screen === 'sources-modal' && (
        <div className="w-full max-w-5xl h-[600px] bg-[#1a1d24] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
          {/* Barra Superior */}
          <div className="bg-[#121418] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-sm">Adicionar fonte</span>
            <button 
              onClick={() => setScreen('menu')}
              className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>

          {/* Corpo Estilo OBS */}
          <div className="flex flex-1 overflow-hidden">
            {/* Menu Lateral Esquerdo */}
            <div className="w-72 bg-[#121418] border-r border-slate-800 flex flex-col overflow-y-auto p-2 gap-1">
              <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider">Criado recentemente</div>
              
              <button 
                onClick={() => setSelectedSourceType('video-capture')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'video-capture' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <Video className="w-4 h-4 text-pink-500" /> Dispositivo de captura de vídeo
              </button>

              <button 
                onClick={() => setSelectedSourceType('image')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'image' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <ImageIcon className="w-4 h-4 text-blue-400" /> Imagem (Moldura)
              </button>

              <button 
                onClick={() => setSelectedSourceType('audio')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'audio' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <Volume2 className="w-4 h-4 text-emerald-400" /> Captura de entrada de áudio
              </button>

              <button 
                onClick={() => setSelectedSourceType('text')}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'text' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <FileText className="w-4 h-4 text-amber-400" /> Texto (GDI+)
              </button>
            </div>

            {/* Painel de Conteúdo à Direita */}
            <div className="flex-1 bg-[#1a1d24] p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">
                  {selectedSourceType === 'video-capture' && 'Dispositivo de captura de vídeo'}
                  {selectedSourceType === 'image' && 'Imagem'}
                  {selectedSourceType === 'audio' && 'Captura de entrada de áudio'}
                  {selectedSourceType === 'text' && 'Texto (GDI+)'}
                </h2>
                <p className="text-xs text-slate-400 mb-6">Selecione quais fontes serão adicionadas à sua cena atual.</p>

                {selectedSourceType === 'video-capture' && (
                  <div className="flex flex-col gap-4">
                    <div className="border border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-pink-500 transition-colors">
                      <span className="text-sm text-slate-300">+ Adicionar novo Dispositivo de captura de vídeo</span>
                    </div>

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">Câmeras disponíveis conectadas:</div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {devices.map((device, idx) => (
                        <div 
                          key={device.deviceId}
                          onClick={() => setSelectedDeviceId(device.deviceId)}
                          className={`p-3 rounded-lg border cursor-pointer flex flex-col items-center gap-2 transition-all ${selectedDeviceId === device.deviceId ? 'border-pink-500 bg-[#252a37]' : 'border-slate-800 bg-[#121418] hover:border-slate-700'}`}
                        >
                          <Video className={`w-8 h-8 ${selectedDeviceId === device.deviceId ? 'text-pink-500' : 'text-slate-500'}`} />
                          <span className="text-xs text-center font-medium text-slate-200">
                            {device.label || `Câmera USB / Porta ${idx + 1}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSourceType !== 'video-capture' && (
                  <div className="text-sm text-slate-400 p-8 text-center border border-slate-800 rounded-lg bg-[#121418]">
                    Nenhum arquivo ou dispositivo adicional configurado para esta fonte ainda.
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-6">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-pink-600 focus:ring-0" />
                  Tornar a fonte visível
                </label>
                <button
                  onClick={() => setScreen('menu')}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-all"
                >
                  Fechar / Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELA 3: FLUXO DA CABINE DE FOTOS (SESSÃO) */}
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
