import { useCallback, useEffect, useRef, useState } from 'react';

const STRIP_FRAME_URL = '/moldura-tira-vertical.png';
const TOTAL_PHOTOS = 3;
const COUNTDOWN_SECONDS = 5;
const PHOTO_WIDTH = 1040;
const PHOTO_HEIGHT = 720;
const PHOTO_X = 80;
const PHOTO_START_Y = 120;
const PHOTO_SPACING_Y = 770;
const STRIP_WIDTH = 1200;
const STRIP_HEIGHT =
  PHOTO_START_Y + (TOTAL_PHOTOS - 1) * PHOTO_SPACING_Y + PHOTO_HEIGHT + PHOTO_START_Y;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Não foi possível carregar a imagem: ${src}`));
    image.src = src;
  });
}

export default function PhotoStripBooth() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [step, setStep] = useState<'idle' | 'sequence_countdown' | 'photo_preview' | 'preview'>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [photoPreviewImage, setPhotoPreviewImage] = useState<string | null>(null);
  const [finalStripImage, setFinalStripImage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sequenceError, setSequenceError] = useState<string | null>(null);
  const [frameError, setFrameError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let activeStream: MediaStream | null = null;

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este navegador não oferece acesso à câmera.');
        return;
      }

      setCameraReady(false);
      setCameraError(null);
      try {
        const videoConstraints: MediaTrackConstraints = selectedCameraId
          ? {
              deviceId: { exact: selectedCameraId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : { width: { ideal: 1280 }, height: { ideal: 720 } };
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const videoInputs = devices.filter((device) => device.kind === 'videoinput');
        setCameras(videoInputs);
        const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
        if (!selectedCameraId && activeDeviceId) setSelectedCameraId(activeDeviceId);
      } catch (error) {
        if (!cancelled) {
          setCameraError(
            error instanceof Error ? error.message : 'Não foi possível acessar a câmera.',
          );
        }
      }
    };

    void openCamera();
    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [selectedCameraId]);

  const generateStrip = useCallback(async (images: string[]) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || images.length !== TOTAL_PHOTOS) {
      setSequenceError('Não foi possível montar a tira com as três fotos capturadas.');
      setStep('idle');
      return;
    }

    canvas.width = STRIP_WIDTH;
    canvas.height = STRIP_HEIGHT;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    try {
      const photos = await Promise.all(images.map((src) => loadImage(src)));
      photos.forEach((photo, index) => {
        context.drawImage(
          photo,
          PHOTO_X,
          PHOTO_START_Y + index * PHOTO_SPACING_Y,
          PHOTO_WIDTH,
          PHOTO_HEIGHT,
        );
      });

      try {
        const frame = await loadImage(STRIP_FRAME_URL);
        context.drawImage(frame, 0, 0, canvas.width, canvas.height);
        setFrameError(null);
      } catch {
        setFrameError('Arquivo da moldura não encontrado; a tira foi gerada sem a arte da moldura.');
      }

      setFinalStripImage(canvas.toDataURL('image/jpeg', 0.95));
      setStep('preview');
    } catch (error) {
      setSequenceError(
        error instanceof Error ? error.message : 'Não foi possível montar a tira de fotos.',
      );
      setStep('idle');
    }
  }, []);

  const captureSingleFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setCameraError('A câmera ainda não está pronta para capturar a foto.');
      setStep('idle');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_WIDTH;
    canvas.height = PHOTO_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      setSequenceError('Não foi possível preparar a captura da foto.');
      setStep('idle');
      return;
    }

    context.drawImage(video, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT);
    const image = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImages((currentImages) => [...currentImages, image]);
    setPhotoPreviewImage(image);
    setStep('photo_preview');
  }, []);

  useEffect(() => {
    if (step !== 'sequence_countdown') return;

    const timer = window.setTimeout(() => {
      if (countdown > 1) {
        setCountdown((currentCountdown) => currentCountdown - 1);
      } else {
        captureSingleFrame();
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [step, countdown, photoIndex, captureSingleFrame]);

  useEffect(() => {
    if (step !== 'photo_preview') return;

    const timer = window.setTimeout(() => {
      if (photoIndex + 1 < TOTAL_PHOTOS) {
        setPhotoIndex((currentIndex) => currentIndex + 1);
        setCountdown(COUNTDOWN_SECONDS);
        setStep('sequence_countdown');
      } else {
        void generateStrip(capturedImages);
      }
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [step, photoIndex, capturedImages, generateStrip]);

  const startSequence = () => {
    setCapturedImages([]);
    setPhotoPreviewImage(null);
    setFinalStripImage(null);
    setSequenceError(null);
    setFrameError(null);
    setPhotoIndex(0);
    setCountdown(COUNTDOWN_SECONDS);
    setStep('sequence_countdown');
  };

  const handlePrint = () => {
    if (!finalStripImage) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Imprimir Tira de Fotos</title></head>
          <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#000;">
            <img src="${finalStripImage}" style="max-height:100%; max-width:100%; object-fit:contain;" />
            <script>
              window.onload = function() { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = () => {
    if (!finalStripImage) return;

    const link = document.createElement('a');
    link.href = finalStripImage;
    link.download = `photobooth-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetBooth = () => {
    setFinalStripImage(null);
    setCapturedImages([]);
    setPhotoPreviewImage(null);
    setSequenceError(null);
    setFrameError(null);
    setStep('idle');
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden text-white font-sans">
      <canvas ref={canvasRef} className="hidden" />

      <video
        ref={videoRef}
        autoPlay
        playsInline
        onLoadedData={() => setCameraReady(true)}
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
          step === 'photo_preview' || step === 'preview' ? 'invisible' : ''
        }`}
      />

      {step === 'idle' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-black/40">
          <div className="text-center flex flex-col items-center gap-6 px-6">
            <h1 className="text-5xl font-black drop-shadow-lg tracking-wider">CABINE DE FOTOS (TIRAS)</h1>
            <p className="text-xl text-slate-200 drop-shadow">
              Prepare-se para {TOTAL_PHOTOS} poses em sequência!
            </p>

            <label className="flex flex-col gap-2 text-left text-sm font-semibold">
              Câmera
              <select
                value={selectedCameraId}
                onChange={(event) => setSelectedCameraId(event.target.value)}
                disabled={cameras.length === 0}
                className="min-w-72 rounded-lg border border-slate-500 bg-slate-900 px-4 py-3 text-white disabled:opacity-60"
              >
                {cameras.length === 0 && <option value="">Nenhuma câmera encontrada</option>}
                {cameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Câmera ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <p className="max-w-xl text-sm text-slate-200">
              Uma DSLR conectada por USB aparecerá aqui se o computador a reconhecer como câmera
              compatível ou por meio de uma placa/software de captura.
            </p>
            {cameraError && <p role="alert" className="max-w-xl text-red-300">{cameraError}</p>}
            {sequenceError && <p role="alert" className="max-w-xl text-red-300">{sequenceError}</p>}
            {frameError && <p role="status" className="max-w-xl text-amber-200">{frameError}</p>}

            <button
              onClick={startSequence}
              disabled={!cameraReady || Boolean(cameraError)}
              className="px-8 py-4 bg-pink-600 hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold text-2xl rounded-full shadow-2xl transition transform hover:scale-105"
            >
              🎬 Começar sequência
            </button>
          </div>
        </div>
      )}

      {step === 'sequence_countdown' && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-4">
            <span className="text-2xl font-bold tracking-widest text-pink-400 uppercase">
              Foto {photoIndex + 1} de {TOTAL_PHOTOS}
            </span>
            <div className="flex items-center justify-center w-48 h-48 bg-pink-600/80 rounded-full border-8 border-white animate-pulse">
              <span className="text-8xl font-black">{countdown}</span>
            </div>
          </div>
        </div>
      )}

      {step === 'photo_preview' && photoPreviewImage && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center bg-slate-950 gap-6 p-6">
          <h2 className="text-2xl font-bold text-pink-300">
            Foto {photoIndex + 1} de {TOTAL_PHOTOS}
          </h2>
          <div className="w-[min(90vw,1040px)] aspect-[13/9] overflow-hidden bg-black shadow-2xl">
            <img
              src={photoPreviewImage}
              alt={`Prévia da foto ${photoIndex + 1}`}
              className="h-full w-full object-fill"
            />
          </div>
          <p className="text-lg text-slate-200">Próxima foto em 5 segundos</p>
        </div>
      )}

      {step === 'preview' && finalStripImage && (
        <div className="relative z-10 w-full h-full flex flex-col lg:flex-row items-center justify-center bg-slate-900 gap-8 p-6">
          <div className="h-[80vh] max-w-[90vw] aspect-[1/2.1] bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700">
            <img src={finalStripImage} alt="Tira de Fotos Final com três fotos" className="w-full h-full object-contain" />
          </div>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <h2 className="text-3xl font-bold text-center mb-2">Sua tira ficou pronta!</h2>
            {frameError && <p role="status" className="text-center text-amber-200">{frameError}</p>}

            <button
              onClick={handlePrint}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              🖨️ Imprimir tira
            </button>

            <button
              onClick={handleDownload}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              📥 Baixar imagem
            </button>

            <button
              onClick={resetBooth}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              🔄 Refazer sequência
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
