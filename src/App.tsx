import React, { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw, Settings, ArrowLeft, Video, Image as ImageIcon, Plus, Calendar, Clock, History, XCircle, Download, Eye, X, Check, Sparkles } from 'lucide-react';

interface SessionRecord {
  id: string;
  date: string;
  eventName: string;
  clientName: string;
  photosCount: number;
  photos: string[];
  frameUrl?: string | null;
}

interface FrameItem {
  id: string;
  url: string;
  name: string;
}

export default function App() {
  // Inicia na Tela 1: Painel de Configuração e Menu
  const [screen, setScreen] = useState<'menu' | 'touch-start' | 'sources-modal' | 'obs-properties' | 'image-properties' | 'register-session' | 'history' | 'session-detail' | 'booth'>('menu');
  const [step, setStep] = useState<'idle' | 'countdown' | 'preview' | 'done'>('idle');
  
  // Informações da Sessão Atual
  const [eventName, setEventName] = useState<string>('Evento Corporativo / Aniversário');
  const [clientName, setClientName] = useState<string>('Cliente Padrão');
  const [sessionNotes, setSessionNotes] = useState<string>('Sessão padrão de cabine de fotos.');
  
  // Lista de Molduras salvas e a Moldura Ativa
  const [framesList, setFramesList] = useState<FrameItem[]>(() => {
    const saved = localStorage.getItem('photo_booth_frames_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });
  
  const [activeFrame, setActiveFrame] = useState<string | null>(() => {
    return localStorage.getItem('photo_booth_active_frame') || null;
  });
  
  // Histórico salvo no navegador de forma segura
  const [sessionsHistory, setSessionsHistory] = useState<SessionRecord[]>(() => {
    const saved = localStorage.getItem('photo_booth_history');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [activeSessionDetail, setActiveSessionDetail] = useState<SessionRecord | null>(null);
  const [selectedFrameModal, setSelectedFrameModal] = useState<SessionRecord | null>(null);

  // Estados de confirmação de encerramento e flash
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  const [photoIndex, setPhotoIndex] = useState<number>(1);
  const [countdown, setCountdown] = useState<number>(5);
  const [previewTimer, setPreviewTimer] = useState<number>(5);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [selectedSourceType, setSelectedSourceType] = useState<string>('video-capture');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDevices = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(track => track.stop());
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(prev => prev || videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Erro ao acessar permissões ou listar dispositivos de vídeo:", err);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

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
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (previewVideoRef.current) previewVideoRef.current.srcObject = stream;
      })
      .catch((err) => console.error("Erro ao iniciar o dispositivo selecionado:", err));
  }, [selectedDeviceId, screen]);

  // Lógica da Contagem Regressiva (5 segundos)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screen === 'booth' && step === 'countdown' && !isEnded) {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        takePhoto();
      }
    }
    return () => clearTimeout(timer);
  }, [screen, step, countdown, isEnded]);

  // Lógica do Preview da foto tirada no monitor (5 segundos)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (screen === 'booth' && step === 'preview' && !isEnded) {
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
  }, [screen, step, previewTimer, photoIndex, isEnded]);

  // Função para salvar a sessão no histórico com a moldura utilizada
  const registerCompletedSession = (capturedPhotos: string[]) => {
    const newRecord: SessionRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
      eventName: eventName,
      clientName: clientName,
      photosCount: capturedPhotos.length,
      photos: capturedPhotos,
      frameUrl: activeFrame
    };
    try {
      const updatedHistory = [newRecord, ...sessionsHistory];
      setSessionsHistory(updatedHistory);
      localStorage.setItem('photo_booth_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Armazenamento local cheio", e);
    }
  };

  const openBooth = () => {
    setIsEnded(false);
    setShowEndModal(false);
    setPhotos([]);
    setPhotoIndex(1);
    setCountdown(5);
    setStep('idle');
    setScreen('booth');
  };

  const startSequence = () => {
    setCountdown(5);
    setStep('countdown');
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      // Dispara efeito de flash visual na tela
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 300);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png', 0.8);
        setPhotos((prev) => {
          const updated = [...prev, dataUrl];
          if (updated.length === 3) {
            registerCompletedSession(updated);
          }
          return updated;
        });
        setPreviewTimer(5);
        setStep('preview');
      }
    }
  };

  // Frases motivacionais dinâmicas de acordo com o segundo da contagem
  const getCountdownMessage = (count: number) => {
    switch (count) {
      5: return "Arrumem o visual! ✨";
      4: return "Sorriam para o espelho! 😁";
      3: return "Quase lá... 📸";
      2: return "Preparados?! 🚀";
      1: return "VALENDO! 🔥";
      default: return "Preparando...";
    }
  };

  // Manipular upload da imagem de moldura do computador
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        const newFrame: FrameItem = {
          id: Date.now().toString(),
          url: result,
          name: file.name
        };
        const updatedFrames = [...framesList, newFrame];
        setFramesList(updatedFrames);
        localStorage.setItem('photo_booth_frames_list', JSON.stringify(updatedFrames));
        
        setActiveFrame(result);
        localStorage.setItem('photo_booth_active_frame', result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para gerar e baixar a moldura completa combinada com as 3 fotos
  const downloadFullFrame = (session: SessionRecord) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 1800;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loadedImages = 0;
    const totalImages = session.photos.length + (session.frameUrl ? 1 : 0);

    const checkComplete = () => {
      loadedImages++;
      if (loadedImages === totalImages) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `moldura_${session.eventName.replace(/\s+/g, '_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    session.photos.forEach((photoUrl, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoUrl;
      img.onload = () => {
        const yPos = 80 + idx * 560;
        ctx.drawImage(img, 50, yPos, 500, 500);
        checkComplete();
      };
    });

    if (session.frameUrl) {
      const frameImg = new Image();
      frameImg.crossOrigin = 'anonymous';
      frameImg.src = session.frameUrl;
      frameImg.onload = () => {
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        checkComplete();
      };
    } else {
      checkComplete();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* TELA 1: PAINEL DE CONFIGURAÇÃO E MENU */}
      {screen === 'menu' && (
        <div className="text-center flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative">
          <h1 className="text-2xl font-black mb-1 tracking-wider text-white">PAINEL DA CABINE</h1>
          <p className="text-slate-400 mb-6 text-sm">Sessão Atual: <span className="text-pink-400 font-semibold">{eventName}</span></p>
          
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setScreen('touch-start')}
              className="flex items-center justify-center gap-3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all text-base cursor-pointer"
            >
              <Camera className="w-5 h-5" /> Iniciar Sessão
            </button>

            <button
              onClick={() => setScreen('register-session')}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-6 rounded-2xl border border-slate-700 transition-all text-base cursor-pointer"
            >
              <Calendar className="w-5 h-5 text-pink-500" /> Cadastrar Sessão
            </button>

            <button
              onClick={() => setScreen('history')}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-6 rounded-2xl border border-slate-700 transition-all text-base cursor-pointer"
            >
              <History className="w-5 h-5 text-amber-400" /> Históricos de Sessões
            </button>

            <button
              onClick={() => {
                setScreen('sources-modal');
                loadDevices();
              }}
              className="flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-6 rounded-2xl border border-slate-700 transition-all text-base cursor-pointer"
            >
              <Settings className="w-5 h-5 text-blue-400" /> Inserir Fontes
            </button>
          </div>
        </div>
      )}

      {/* TELA 2: TELA DE APRESENTAÇÃO "TOQUE PARA COMEÇAR" */}
      {screen === 'touch-start' && (
        <div 
          onClick={openBooth}
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 flex flex-col items-center justify-center cursor-pointer select-none z-30 p-6 text-center animate-fade-in"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
            <div className="absolute w-72 h-72 bg-pink-500 rounded-full blur-3xl -top-20 -left-20 animate-pulse"></div>
            <div className="absolute w-96 h-96 bg-purple-600 rounded-full blur-3xl -bottom-20 -right-20 animate-pulse"></div>
          </div>

          <Sparkles className="w-16 h-16 text-pink-400 mb-6 animate-bounce" />
          <h1 className="text-4xl md:text-6xl font-black tracking-widest text-white mb-3 drop-shadow-lg">
            BEM-VINDO AO ESPELHO MÁGICO
          </h1>
          <p className="text-slate-300 text-lg md:text-xl font-medium mb-12 max-w-md">
            {eventName}
          </p>

          <div className="bg-pink-600 hover:bg-pink-500 text-white font-black text-xl md:text-2xl px-10 py-5 rounded-3xl shadow-2xl transition-all transform hover:scale-105 active:scale-95 border-2 border-pink-400/50 animate-pulse">
            TOQUE PARA COMEÇAR
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              setScreen('menu');
            }}
            className="absolute bottom-6 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Voltar ao Painel de Configuração
          </button>
        </div>
      )}

      {/* TELA: CADASTRAR SESSÃO */}
      {screen === 'register-session' && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen('menu')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold">Cadastrar Sessão</h2>
            <div className="w-12"></div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Nome do Evento</label>
              <input 
                type="text" 
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Nome do Cliente / Anfitrião</label>
              <input 
                type="text" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Observações do Evento</label>
              <textarea 
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={3}
                className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500 resize-none"
              />
            </div>
          </div>

          <button
            onClick={() => setScreen('menu')}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-xl shadow transition-all mt-2 cursor-pointer"
          >
            Salvar e Voltar ao Menu
          </button>
        </div>
      )}

      {/* TELA: HISTÓRICOS DE SESSÕES */}
      {screen === 'history' && (
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col gap-5 max-h-[80vh]">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen('menu')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-xl font-bold">Histórico de Sessões</h2>
            <div className="w-12"></div>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            {sessionsHistory.length === 0 ? (
              <p className="text-center text-slate-500 py-8 text-sm">Nenhum histórico registrado ainda no navegador.</p>
            ) : (
              sessionsHistory.map((s, idx) => (
                <div key={s.id || idx} className="bg-slate-800 border border-slate-700/60 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-pink-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {s.date}
                    </span>
                    <span className="text-xs bg-slate-900 px-2.5 py-1 rounded-full text-slate-300 font-medium">
                      {s.photosCount} fotos
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{s.eventName}</div>
                    <div className="text-xs text-slate-400">Cliente: {s.clientName}</div>
                  </div>
                  <div className="flex justify-end pt-1 border-t border-slate-700/50">
                    <button
                      onClick={() => {
                        setActiveSessionDetail(s);
                        setScreen('session-detail');
                      }}
                      className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer shadow"
                    >
                      <Eye className="w-3.5 h-3.5" /> Acessar sessão
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TELA: DETALHE DA SESSÃO COM EXIBIÇÃO DA MOLDURA E FOTOS POSICIONADAS */}
      {screen === 'session-detail' && activeSessionDetail && (
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl flex flex-col gap-4 max-h-[85vh]">
          <div className="flex items-center justify-between">
            <button onClick={() => setScreen('history')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <h2 className="text-sm font-bold truncate max-w-[180px]">{activeSessionDetail.eventName}</h2>
            <div className="w-8"></div>
          </div>

          <p className="text-xs text-slate-400 text-center">Clique na moldura abaixo para ampliar e baixar:</p>

          <div className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center overflow-y-auto max-h-[55vh]">
            <div 
              onClick={() => setSelectedFrameModal(activeSessionDetail)}
              className="w-32 bg-white rounded shadow-2xl cursor-pointer border-2 border-slate-300 transition-transform hover:scale-105 relative group overflow-hidden aspect-[1/3]"
            >
              <div className="absolute inset-0 p-1 flex flex-col justify-around bg-slate-100">
                {activeSessionDetail.photos.map((p, idx) => (
                  <img key={idx} src={p} alt={`Foto ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded" />
                ))}
              </div>
              {activeSessionDetail.frameUrl && (
                <img src={activeSessionDetail.frameUrl} alt="Moldura" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1 rounded">
                <Eye className="w-4 h-4" /> Ampliar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA MOLDURA (LIGHTBOX COM DOWNLOAD) */}
      {selectedFrameModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-md w-full flex flex-col items-center gap-4 relative animate-fade-in">
            <button
              onClick={() => setSelectedFrameModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white">Moldura Completa</h3>

            <div className="relative bg-white rounded-2xl shadow-2xl w-48 overflow-hidden border-4 border-slate-300 aspect-[1/3] max-h-[55vh]">
              <div className="absolute inset-0 p-2 flex flex-col justify-around bg-slate-100">
                {selectedFrameModal.photos.map((p, idx) => (
                  <img key={idx} src={p} alt={`Foto ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded" />
                ))}
              </div>
              {selectedFrameModal.frameUrl && (
                <img src={selectedFrameModal.frameUrl} alt="Moldura" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
              )}
            </div>

            <button
              onClick={() => downloadFullFrame(selectedFrameModal)}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow transition-all cursor-pointer text-sm w-full mt-2"
            >
              <Download className="w-4 h-4" /> Baixar Moldura Completa
            </button>
          </div>
        </div>
      )}

      {/* TELA: ESTILO OBS STUDIO (ADICIONAR FONTE) */}
      {screen === 'sources-modal' && (
        <div className="w-full max-w-5xl h-[620px] bg-[#1a1d24] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
          <div className="bg-[#121418] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-sm">Adicionar fonte</span>
            <button onClick={() => setScreen('menu')} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer">✕</button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-72 bg-[#121418] border-r border-slate-800 flex flex-col overflow-y-auto p-2 gap-1">
              <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider">Criado recentemente</div>
              
              <button 
                onClick={() => setSelectedSourceType('video-capture')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${selectedSourceType === 'video-capture' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <Video className="w-4 h-4 text-pink-500" /> Dispositivo de captura de vídeo
              </button>

              <button 
                onClick={() => setSelectedSourceType('image')} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${selectedSourceType === 'image' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}
              >
                <ImageIcon className="w-4 h-4 text-blue-400" /> Imagem (Moldura)
              </button>
            </div>

            <div className="flex-1 bg-[#1a1d24] p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                {selectedSourceType === 'video-capture' && (
                  <>
                    <h2 className="text-base font-semibold text-white mb-1">Dispositivo de captura de vídeo</h2>
                    <p className="text-xs text-slate-400 mb-6">Selecione quais fontes serão adicionadas à sua cena atual.</p>
                    <div 
                      onClick={async () => {
                        await loadDevices();
                        setScreen('obs-properties');
                      }}
                      className="border border-dashed border-slate-700 hover:border-pink-500 bg-[#121418] rounded-lg p-6 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 group"
                    >
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
                      <span className="text-sm text-slate-300 group-hover:text-white font-medium">+ Adicionar novo Dispositivo de captura de vídeo</span>
                    </div>
                  </>
                )}

                {selectedSourceType === 'image' && (
                  <>
                    <h2 className="text-base font-semibold text-white mb-1">Imagem (Moldura)</h2>
                    <p className="text-xs text-slate-400 mb-6">Selecione a imagem de moldura que será aplicada na cabine.</p>
                    
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-slate-700 hover:border-pink-500 bg-[#121418] rounded-lg p-6 text-center cursor-pointer transition-colors flex items-center justify-center gap-2 group mb-4"
                    >
                      <Plus className="w-5 h-5 text-slate-400 group-hover:text-pink-500" />
                      <span className="text-sm text-slate-300 group-hover:text-white font-medium">+ Adicionar nova Imagem (Moldura)</span>
                    </div>

                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Molduras Disponíveis:</span>
                      {framesList.length === 0 ? (
                        <p className="text-xs text-slate-500">Nenhuma moldura inserida ainda.</p>
                      ) : (
                        framesList.map((frame) => (
                          <div key={frame.id} className="flex items-center justify-between bg-[#121418] p-3 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-3">
                              <img src={frame.url} alt={frame.name} className="w-12 h-16 object-cover rounded border border-slate-700" />
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold text-white">{frame.name}</span>
                                {activeFrame === frame.url && (
                                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                    <Check className="w-3 h-3" /> Em uso atualmente
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setActiveFrame(frame.url);
                                localStorage.setItem('photo_booth_active_frame', frame.url);
                              }}
                              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                                activeFrame === frame.url 
                                  ? 'bg-emerald-600 text-white' 
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {activeFrame === frame.url ? 'Usando' : 'Usar'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded bg-slate-800 border-slate-700 text-pink-600 focus:ring-0" />
                  Tornar a fonte visível
                </label>
                <button onClick={() => setScreen('menu')} className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-all cursor-pointer">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TELA: JANELA DE PROPRIEDADES DE VÍDEO ESTILO OBS */}
      {screen === 'obs-properties' && (
        <div className="w-full max-w-2xl bg-[#1a1d24] border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
          <div className="bg-[#121418] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold text-sm">Propriedades de 'Dispositivo de captura de vídeo'</span>
            <button onClick={() => setScreen('sources-modal')} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer">✕</button>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <div className="w-full h-56 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center relative">
              <video
                autoPlay
                playsInline
                muted
                ref={previewVideoRef}
                className="w-full h-full object-cover -scale-x-100"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Dispositivo</label>
                <button onClick={loadDevices} className="text-xs text-pink-400 hover:underline cursor-pointer">Atualizar lista</button>
              </div>
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-[#121418] text-white rounded-lg p-3 outline-none border border-slate-700 text-sm w-full cursor-pointer"
              >
                {devices.length === 0 ? (
                  <option value="">Nenhum dispositivo encontrado</option>
                ) : (
                  devices.map((device, idx) => (
                    <option key={device.deviceId || idx} value={device.deviceId}>
                      {device.label || `Câmera / Placa de Captura ${idx + 1}`}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="bg-[#121418] px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button onClick={() => setScreen('sources-modal')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm px-5 py-2 rounded-lg transition-all cursor-pointer">Cancelar</button>
            <button onClick={() => setScreen('menu')} className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-all cursor-pointer">OK</button>
          </div>
        </div>
      )}

      {/* TELA: FLUXO DA CABINE DE FOTOS (SESSÃO COM ANIMAÇÃO E FLASH) */}
      {screen === 'booth' && (
        <div className="flex flex-col items-center w-full max-w-md">
          {/* Efeito de Flash na tela ao tirar a foto */}
          {flashActive && (
            <div className="absolute inset-0 bg-white z-50 animate-ping pointer-events-none"></div>
          )}

          <div className="flex items-center justify-between w-full mb-2">
            <button 
              onClick={() => {
                setIsEnded(false);
                setScreen('touch-start');
              }} 
              className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Tela Inicial
            </button>
            <h1 className="text-xl font-bold">{eventName}</h1>
            <div className="w-16"></div>
          </div>

          <p className="text-slate-400 mb-4 text-sm font-medium">
            {step === 'idle' && "Câmera ativa. Clique em Começar para iniciar!"}
            {step === 'countdown' && `Foto ${photoIndex} de 3 - Preparando...`}
            {step === 'preview' && `Exibindo foto ${photoIndex} de 3 (${previewTimer}s)...`}
            {step === 'done' && !isEnded && "Sua tira ficou pronta!"}
            {isEnded && "Sessão encerrada com sucesso."}
          </p>

          <div className="relative w-full bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center aspect-[3/4] mb-6">
            
            {/* TELA IDLE: Câmera com a moldura guia por cima */}
            {step === 'idle' && !isEnded && (
              <div className="w-full h-full relative flex flex-col items-center justify-between p-4 bg-black">
                <div className="w-full flex-1 relative flex items-center justify-center overflow-hidden rounded-lg">
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
                  {activeFrame && (
                    <img src={activeFrame} alt="Moldura Guia" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />
                  )}
                </div>
                <div className="w-full pt-4">
                  <button
                    onClick={startSequence}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all text-base cursor-pointer"
                  >
                    Começar
                  </button>
                </div>
              </div>
            )}

            {/* CONTAGEM REGRESSIVA: Com Animações Avançadas e Frases Dinâmicas */}
            {step === 'countdown' && !isEnded && (
              <>
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs gap-3">
                  <span className="text-2xl md:text-3xl font-bold text-pink-300 drop-shadow animate-pulse text-center px-4">
                    {getCountdownMessage(countdown)}
                  </span>
                  <span className="text-9xl font-black text-pink-500 animate-bounce drop-shadow-2xl">
                    {countdown}
                  </span>
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
                  {activeFrame && (
                    <img src={activeFrame} alt="Moldura Guia" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />
                  )}
                </div>
              </>
            )}

            {/* PREVIEW DA FOTO TIRADA: Com a moldura guia por cima */}
            {step === 'preview' && photos.length > 0 && !isEnded && (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <img src={photos[photos.length - 1]} alt="Foto capturada" className="w-full h-full object-cover" />
                {activeFrame && (
                  <img src={activeFrame} alt="Moldura Guia" className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80" />
                )}
                <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-sm font-semibold text-pink-400">
                  Próxima em {previewTimer}s
                </div>
              </div>
            )}

            {/* TELA FINAL: Apenas ao final as 3 fotos aparecem encaixadas dentro dos quadrados da moldura */}
            {step === 'done' && !isEnded && (
              <div className="w-full h-full bg-white flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative w-36 aspect-[1/3] bg-slate-100 rounded shadow-inner overflow-hidden flex flex-col justify-around p-1 border border-slate-300">
                  {photos.map((p, idx) => (
                    <img key={idx} src={p} alt={`Pose ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded" />
                  ))}
                  {activeFrame && (
                    <img src={activeFrame} alt="Moldura" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  )}
                </div>
              </div>
            )}

            {/* ESTADO FINAL: FIM COM CONFETES */}
            {isEnded && (
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center z-20 animate-fade-in">
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute w-3 h-3 bg-pink-500 rounded-full animate-ping top-1/4 left-1/4"></div>
                  <div className="absolute w-4 h-4 bg-amber-400 rounded-sm animate-bounce top-1/3 right-1/4"></div>
                  <div className="absolute w-3 h-3 bg-emerald-400 rounded-full animate-pulse bottom-1/3 left-1/3"></div>
                  <div className="absolute w-5 h-2 bg-blue-500 rounded animate-spin top-1/2 right-1/3"></div>
                  <div className="absolute w-3 h-3 bg-purple-500 rounded-sm animate-ping bottom-1/4 right-1/5"></div>
                  <div className="absolute w-4 h-4 bg-pink-400 rounded-full animate-bounce top-1/6 left-1/2"></div>
                </div>

                <span className="text-7xl font-black text-pink-500 tracking-wider mb-4 animate-bounce z-10">FIM</span>
                <p className="text-slate-400 text-sm z-10 mb-6">Sessão finalizada com sucesso!</p>
                <button
                  onClick={() => setScreen('touch-start')}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg z-10 transition-all cursor-pointer"
                >
                  Voltar à Tela Inicial
                </button>
              </div>
            )}
          </div>

          {/* BOTÕES DA TELA FINAL (IMPRIMIR / REFAZER / ENCERRAR SESSÃO) */}
          {step === 'done' && !isEnded && (
            <div className="flex flex-col gap-3 w-full">
              <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 font-bold py-3 px-6 rounded-xl shadow cursor-pointer">
                <Printer className="w-5 h-5" /> Imprimir Tira
              </button>
              <button onClick={openBooth} className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 font-bold py-3 px-6 rounded-xl shadow cursor-pointer">
                <RefreshCcw className="w-5 h-5" /> Refazer Sequência
              </button>
              <button 
                onClick={() => setShowEndModal(true)} 
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl shadow transition-all cursor-pointer"
              >
                <XCircle className="w-5 h-5" /> Encerrar Sessão
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ENCERRAMENTO */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center flex flex-col gap-6">
            <h3 className="text-lg font-bold text-white">Deseja encerrar a sessão?</h3>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setShowEndModal(false);
                  setScreen('touch-start');
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow transition-all cursor-pointer"
              >
                SIM
              </button>
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl shadow transition-all cursor-pointer"
              >
                NÃO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
