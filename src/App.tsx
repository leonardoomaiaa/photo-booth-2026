import React, { useRef, useState, useEffect } from 'react';

export default function PhotoStripBooth() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [step, setStep] = useState<'idle' | 'sequence_countdown' | 'capturing' | 'preview'>('idle');
  const [countdown, setCountdown] = useState<number>(3);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [finalStripImage, setFinalStripImage] = useState<string | null>(null);

  const STRIP_FRAME_URL = '/moldura-tira-vertical.png';
  const TOTAL_PHOTOS = 4;

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("Erro ao acessar a webcam:", err));
  }, []);

  const startSequence = () => {
    setCapturedImages([]);
    setPhotoIndex(0);
    setCountdown(3);
    setStep('sequence_countdown');
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'sequence_countdown') {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      } else {
        captureSingleFrame();
      }
    }
    return () => clearTimeout(timer);
  }, [step, countdown, photoIndex]);

  const captureSingleFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1200;
    tempCanvas.height = 900;
    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.95);
      
      const updatedImages = [...capturedImages, dataUrl];
      setCapturedImages(updatedImages);

      if (photoIndex + 1 < TOTAL_PHOTOS) {
        setPhotoIndex(prev => prev + 1);
        setCountdown(2);
        setStep('sequence_countdown');
      } else {
        generateStrip(updatedImages);
      }
    }
  };

  const generateStrip = (images: string[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 1200;
    canvas.height = 3600;

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);

    let loadedCount = 0;
    const imgElements: HTMLImageElement[] = [];

    images.forEach((src, idx) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imgElements[idx] = img;
        loadedCount++;

        if (loadedCount === TOTAL_PHOTOS) {
          const photoWidth = 1040;
          const photoHeight = 720;
          const startX = 80;
          const startY = 120;
          const spacingY = 770;

          imgElements.forEach((photo, i) => {
            const currentY = startY + (i * spacingY);
            context.drawImage(photo, startX, currentY, photoWidth, photoHeight);
          });

          const frameImg = new Image();
          frameImg.src = STRIP_FRAME_URL;
          frameImg.onload = () => {
            context.drawImage(frameImg, 0, 0, canvas.width, canvas.height);

            const finalDataUrl = canvas.toDataURL('image/jpeg', 0.95);
            setFinalStripImage(finalDataUrl);
            setStep('preview');
          };
        }
      };
    });
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
    setStep('idle');
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden text-white font-sans">
      
      <canvas ref={canvasRef} className="hidden" />

      {step === 'idle' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover transform -scale-x-100" />
          <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          
          <div className="z-10 text-center flex flex-col items-center gap-6">
            <h1 className="text-5xl font-black drop-shadow-lg tracking-wider">CABINE DE FOTOS (TIRAS)</h1>
            <p className="text-xl text-slate-200 drop-shadow">Prepare-se para 4 poses em sequência!</p>
            <button 
              onClick={startSequence}
              className="px-8 py-4 bg-pink-600 hover:bg-pink-500 text-white font-bold text-2xl rounded-full shadow-2xl transition transform hover:scale-105"
            >
              🎬 Começar Sequência
            </button>
          </div>
        </div>
      )}

      {step === 'sequence_countdown' && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 filter brightness-90" />
          <div className="absolute inset-0 bg-black/40" />
          
          <div className="z-10 flex flex-col items-center gap-4">
            <span className="text-2xl font-bold tracking-widest text-pink-400 uppercase">
              Foto {photoIndex + 1} de {TOTAL_PHOTOS}
            </span>
            <div className="flex items-center justify-center w-48 h-48 bg-pink-600/80 rounded-full border-8 border-white animate-pulse">
              <span className="text-8xl font-black">{countdown}</span>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && finalStripImage && (
        <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center bg-slate-900 gap-8 p-6">
          <div className="h-[80vh] max-w-[90vw] aspect-[1/3] bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700">
            <img src={finalStripImage} alt="Tira de Fotos Final" className="w-full h-full object-contain" />
          </div>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <h2 className="text-3xl font-bold text-center mb-2">Sua tira ficou pronta!</h2>
            
            <button 
              onClick={handlePrint}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              🖨️ Imprimir Tira
            </button>

            <button 
              onClick={handleDownload}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              📥 Baixar Imagem
            </button>

            <button 
              onClick={resetBooth}
              className="w-full py-4 bg-amber-600 hover:bg-amber-500 font-bold text-xl rounded-xl shadow-lg transition flex items-center justify-center gap-3"
            >
              🔄 Refazer Sequência
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
