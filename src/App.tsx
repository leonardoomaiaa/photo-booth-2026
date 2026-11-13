import React, { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw, Settings, ArrowLeft, Video, Image as ImageIcon, FileText, Volume2, Plus } from 'lucide-react';

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'sources-modal' | 'obs-properties' | 'booth'>('menu');
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
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Listar todas as câmeras e placas de captura conectadas no computador
  const fetchCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Erro ao listar webcams e placas de captura:", err);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Iniciar a webcam/placa selecionada no elemento de vídeo ativo
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
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Erro ao acessar o dispositivo de vídeo selecionado:", err);
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
          <p className="text-slate-400 mb-8">Gerenciador de Sessão e Fontes</p>
          
          <div className="flex flex-col gap-4 w-full">
            <button
              onClick={startSequence}
              className="flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 px-6 rounded-2xl shadow-lg transition-all text-lg"
            >
              <Camera className="w-6 h-6" /> Iniciar sessão
            </button>

            <button
              onClick={() => {
                setScreen('sources-modal');
                fetchCameras();
              }}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-4 px-6 rounded-2xl border border-slate-700 transition-all text-lg"
            >
              <Settings className="w-6 h-6 text-pink-500" /> Inserir fontes
            </button>
          </div>
        </div>
      )}

      {/* TELA 2: ESTILO OBS STUDIO (ADICIONAR FONTE) */}
      {screen === 'sources-modal' && (
        <div className="w-full max-w-5xl h-[620px] bg-[#1a1d24] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
          <div className="bg-[#121418] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-sm">Adicionar fonte</span>
            <button onClick={() => setScreen('menu')} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1">✕</button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-72 bg-[#121418] border-r border-slate-800 flex flex-col overflow-y-auto p-2 gap-1">
              <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider">Criado recentemente</div>
              <button onClick={() => setSelectedSourceType('video-capture')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'video-capture' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}>
                <Video className="w-4 h-4 text-pink-500" /> Dispositivo de captura de vídeo
              </button>
              <button onClick={() => setSelectedSourceType('image')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${selectedSourceType === 'image' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}>
                <ImageIcon className="w-4 h-4 text-blue-400" /> Imagem (Moldura)
              </button>
            </div>

            <div className="flex-1 bg-[#1a1d24] p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Dispositivo de captura de vídeo</h2>
                <p className="text-xs text-slate-400 mb-6">Selecione quais fontes serão adicionadas à sua cena atual.</p>

                {selectedSourceType === 'video-capture' && (
                  <div className="flex flex-col gap-4">
                    {/* Botão tracejado que abre a janela de propriedades estilo OBS */}
                    <div 
                      onClick={() => {
                        setScreen('obs-properties');
                        fetchCameras();
                      }}
                      className="border border-dashed border-slate-700 hover:border-pink-500 bg-[#121418] rounded-lg p-6 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 group"
                    >
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
                      <span className="text-sm text-slate-300 group-hover:text-white font-medium">+ Adicionar novo Dispositivo de captura de vídeo</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-pink-600 focus:ring-0" />
                  Tornar a fonte visível
                </label>
                <button onClick={() => setScreen('menu')} className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-all">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELA 3: JANELA DE PROPRIEDADES ESTILO OBS (COM PREVIEW E SELECT DE CÂMERAS) */}
      {screen === 'obs-properties' && (
        <div className="w-full max-w-2xl bg-[#1a1d24] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
          <div className="bg-[#121418] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-sm">Propriedades de 'Dispositivo de captura de vídeo'</span>
            <button onClick={() => setScreen('sources-modal')} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1">✕</button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            {/* Monitor de Pré-visualização ao vivo na janela de propriedades */}
            <div className="w-full h-56 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
              <video
                autoPlay
                playsInline
                muted
                ref={previewVideoRef}
                className="w-full h-full object-cover -scale-x-100"
              />
            </div>

            {/* Seleção de Dispositivo (Câmeras e Placas de Captura) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Dispositivo</label>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-[#121418] text-white
