import React, { useState, useRef, useEffect } from 'react';
import { Camera, Printer, RefreshCcw, Settings, ArrowLeft, Video, Image as ImageIcon, Plus, Calendar, Clock, History, XCircle, Download, Eye, X } from 'lucide-react';

interface SessionRecord {
  id: string;
  date: string;
  eventName: string;
  clientName: string;
  photosCount: number;
  photos: string[];
}

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'sources-modal' | 'obs-properties' | 'register-session' | 'history' | 'session-detail' | 'booth'>('menu');
  const [step, setStep] = useState<'idle' | 'countdown' | 'preview' | 'done'>('idle');
  
  // Informações da Sessão Atual
  const [eventName, setEventName] = useState<string>('Evento Corporativo / Aniversário');
  const [clientName, setClientName] = useState<string>('Cliente Padrão');
  const [sessionNotes, setSessionNotes] = useState<string>('Sessão padrão de cabine de fotos.');
  
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

  // Estados de confirmação de encerramento e confetes
  const [showEndModal, setShowEndModal] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);

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

  // Função para salvar a sessão no histórico de forma segura
  const registerCompletedSession = (capturedPhotos: string[]) => {
    const newRecord: SessionRecord = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('pt-BR'),
      eventName: eventName,
      clientName: clientName,
      photosCount: capturedPhotos.length,
      photos: capturedPhotos
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

  // Função para gerar e baixar a moldura completa combinada
  const downloadFullFrame = (session: SessionRecord) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensões da tira/moldura
    canvas.width = 400;
    canvas.height = 1200;

    // Fundo branco da moldura
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;
    const imageElements: HTMLImageElement[] = [];

    session.photos.forEach((photoUrl, idx) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photoUrl;
      img.onload = () => {
        imageElements[idx] = img;
        loadedCount++;

        if (loadedCount === session.photos.length) {
          // Desenha as 3 fotos na moldura verticalmente
          imageElements.forEach((image, i) => {
            const yPos = 30 + i * 380;
            ctx.drawImage(image, 25, yPos, 350, 350);
          });

          // Baixa o arquivo resultante
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `moldura_${session.eventName.replace(/\s+/g, '_')}_${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* TELA 1: MENU INICIAL */}
      {screen === 'menu' && (
        <div className="text-center flex flex-col items-center max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">CABINE DE FOTOS</h1>
          <p className="text-slate-400 mb-6">Sessão Atual: <span className="text-pink-400 font-semibold">{eventName}</span></p>
          
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={openBooth}
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
                  {/* Botão Acessar Sessão */}
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

      {/* TELA: DETALHE DA SESSÃO COM EXIBIÇÃO DA MOLDURA COMPLETA */}
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
            {/* Moldura clicável contendo todas as fotos */}
            <div 
              onClick={() => setSelectedFrameModal(activeSessionDetail)}
              className="w-36 bg-white p-2 rounded shadow-2xl cursor-pointer border-2 border-slate-300 flex flex-col gap-2 transition-transform hover:scale-105 relative group"
            >
              {activeSessionDetail.photos.map((p, idx) => (
                <img key={idx} src={p} alt={`Pose ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded pointer-events-none" />
              ))}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1 rounded">
                <Eye className="w-4 h-4" /> Ampliar Moldura
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

            {/* Moldura expandida em tela cheia */}
            <div className="bg-white p-3 rounded-2xl shadow-2xl w-48 flex flex-col gap-3 border-4 border-slate-300 max-h-[55vh] overflow-y-auto">
              {selectedFrameModal.photos.map((p, idx) => (
                <img key={idx} src={p} alt={`Pose ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded pointer-events-none" />
              ))}
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
              <button onClick={() => setSelectedSourceType('video-capture')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${selectedSourceType === 'video-capture' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}>
                <Video className="w-4 h-4 text-pink-500" /> Dispositivo de captura de vídeo
              </button>
              <button onClick={() => setSelectedSourceType('image')} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${selectedSourceType === 'image' ? 'bg-[#2a2f3d] text-white font-medium border-l-4 border-pink-500' : 'hover:bg-[#222632] text-slate-300'}`}>
                <ImageIcon className="w-4 h-4 text-blue-400" /> Imagem (Moldura)
              </button>
            </div>

            <div className="flex-1 bg-[#1a1d24] p-6 flex flex-col justify-between overflow-y-auto">
              <div>
                <h2 className="text-base font-semibold text-white mb-1">Dispositivo de captura de vídeo</h2>
                <p className="text-xs text-slate-400 mb-6">Selecione quais fontes serão adicionadas à sua cena atual.</p>

                {selectedSourceType === 'video-capture' && (
                  <div className="flex flex-col gap-4">
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
                  </div>
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

      {/* TELA: JANELA DE PROPRIEDADES ESTILO OBS */}
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

      {/* TELA: FLUXO DA CABINE DE FOTOS (SESSÃO) */}
      {screen === 'booth' && (
        <div className="flex flex-col items-center w-full max-w-md">
          <div className="flex items-center justify-between w-full mb-2">
            <button onClick={() => setScreen('menu')} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm cursor-pointer">
              <ArrowLeft className="w-4 h-4" /> Menu Principal
            </button>
            <h1 className="text-xl font-bold">{eventName}</h1>
            <div className="w-16"></div>
          </div>

          <p className="text-slate-400 mb-4 text-sm">
            {step === 'idle' && "Câmera ativa. Clique em Começar para iniciar!"}
            {step === 'countdown' && `Foto ${photoIndex} de 3 - Preparando em ${countdown}s...`}
            {step === 'preview' && `Exibindo foto ${photoIndex} de 3 (${previewTimer}s)...`}
            {step === 'done' && !isEnded && "Sua tira ficou pronta!"}
            {isEnded && "Sessão encerrada com sucesso."}
          </p>

          <div className="relative w-full bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center aspect-[3/4] mb-6">
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

            {step === 'countdown' && !isEnded && (
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

            {step === 'preview' && photos.length > 0 && !isEnded && (
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <img src={photos[photos.length - 1]} alt="Foto capturada" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-sm font-semibold text-pink-400">
                  Próxima em {previewTimer}s
                </div>
              </div>
            )}

            {step === 'done' && !isEnded && (
              <div className="w-full h-full p-4 bg-white flex flex-col items-center justify-around">
                <div className="w-32 h-full flex flex-col gap-2 bg-slate-100 p-2 border border-slate-300 rounded shadow-inner overflow-y-auto">
                  {photos.map((p, idx) => (
                    <img key={idx} src={p} alt={`Pose ${idx + 1}`} className="w-full aspect-[4/3] object-cover rounded" />
                  ))}
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
                  onClick={() => setScreen('menu')}
                  className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg z-10 transition-all cursor-pointer"
                >
                  Voltar ao Menu Principal
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
                  setIsEnded(true);
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
