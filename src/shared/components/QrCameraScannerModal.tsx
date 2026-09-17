import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle, Volume2, VolumeX, Sparkles, UserCheck, ShieldCheck, Zap, Flashlight, Search, CornerDownLeft } from 'lucide-react';
import jsQR from 'jsqr';
import { Event, Workshop, Enrollment, Attendance, User } from '../../types';
import { DB } from '../utils/db';

interface QrCameraScannerModalProps {
  event: Event;
  selectedWorkshopId: string; // 'GERAL' ou ID do workshop
  workshops: Workshop[];
  enrollments: Enrollment[];
  attendances: Attendance[];
  currentUser: User;
  onClose: () => void;
  onDataChanged: () => void;
}

export default function QrCameraScannerModal({
  event,
  selectedWorkshopId,
  workshops,
  enrollments,
  attendances,
  currentUser,
  onClose,
  onDataChanged
}: QrCameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isStartingCameraRef = useRef(false);
  const lastScannedCodeRef = useRef<{ code: string; time: number } | null>(null);

  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  
  // Estado de feedback do último escaneamento
  const [lastScannedResult, setLastScannedResult] = useState<{
    status: 'success' | 'already_checked' | 'not_found' | 'error' | 'wrong_workshop';
    studentName?: string;
    studentEmail?: string;
    studentRa?: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const [scanCountSession, setScanCountSession] = useState(0);

  // Mantém referência mutável para as propriedades mais recentes para que os loops de escaneamento nunca reiniciem a câmera
  const contextRef = useRef({
    event,
    selectedWorkshopId,
    workshops,
    enrollments,
    attendances,
    currentUser,
    onDataChanged,
    soundEnabled
  });

  useEffect(() => {
    contextRef.current = {
      event,
      selectedWorkshopId,
      workshops,
      enrollments,
      attendances,
      currentUser,
      onDataChanged,
      soundEnabled
    };
  }, [event, selectedWorkshopId, workshops, enrollments, attendances, currentUser, onDataChanged, soundEnabled]);

  // Rótulo com o nome da atividade em andamento
  const activeActivityName = selectedWorkshopId === 'GERAL' 
    ? 'Presença Geral do Evento' 
    : (workshops.find(w => w.id === selectedWorkshopId)?.name || 'Workshop / Minicurso');

  // Emite bipe sonoro via Web Audio API
  const playBeep = useCallback((type: 'success' | 'warning' | 'error') => {
    if (!contextRef.current.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext não permitido ou não suportado
    }
  }, []);

  // Processa o texto decodificado (do QR da câmera ou entrada manual)
  const processDecodedString = useCallback((rawText: string) => {
    if (!rawText || !rawText.trim()) return;

    const {
      event: currentEvent,
      selectedWorkshopId: currentWsId,
      enrollments: currentEnrollments,
      attendances: currentAttendances,
      currentUser: currentActor,
      onDataChanged: triggerDataChanged
    } = contextRef.current;

    let term = rawText.trim();

    // Verifica se o termo é JSON
    if (term.startsWith('{') && term.endsWith('}')) {
      try {
        const parsed = JSON.parse(term);
        term = parsed.enrollmentId || parsed.id || parsed.userId || parsed.ra || parsed.email || term;
      } catch {
        // Prossegue como string bruta
      }
    }

    // Caso o QR code contenha uma URL, extrai possíveis parâmetros de consulta
    if (term.includes('?') || term.includes('http')) {
      try {
        const url = new URL(term);
        const paramId = url.searchParams.get('id') || 
                        url.searchParams.get('ticket') || 
                        url.searchParams.get('enrollmentId') || 
                        url.searchParams.get('userId');
        if (paramId) term = paramId;
      } catch {
        // Trata como string bruta
      }
    }

    // Trata formato EVENT_xxx_USER_yyy
    if (term.includes('_USER_')) {
      const parts = term.split('_USER_');
      if (parts[1]) term = parts[1];
    }

    const termLower = term.toLowerCase();
    const activeWs = currentWsId === 'GERAL' ? undefined : currentWsId;

    // Filtra inscrições deste evento
    const eventEnrollments = currentEnrollments.filter(e => 
      e.eventId === currentEvent.id && e.status !== 'CANCELADO'
    );

    // Busca entre todos os participantes do evento
    const matchedParticipant = eventEnrollments.find(p => {
      const idMatch = p.id && p.id.toLowerCase() === termLower;
      const userMatch = p.userId && p.userId.toLowerCase() === termLower;
      const emailMatch = p.userEmail && p.userEmail.toLowerCase() === termLower;
      const raMatch = p.userRa && p.userRa.toLowerCase() === termLower;
      const nameMatch = p.userName && p.userName.toLowerCase() === termLower;
      
      // Correspondências parciais para tags QR com espaçamento extra
      const containsId = p.id && termLower.includes(p.id.toLowerCase());
      const containsUserId = p.userId && termLower.includes(p.userId.toLowerCase());
      const containsRa = p.userRa && p.userRa.length >= 4 && termLower.includes(p.userRa.toLowerCase());

      return idMatch || userMatch || emailMatch || raMatch || nameMatch || containsId || containsUserId || containsRa;
    });

    // Vibra o dispositivo caso suportado
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {}
    }

    if (!matchedParticipant) {
      playBeep('error');
      setLastScannedResult({
        status: 'not_found',
        message: `Nenhuma inscrição ativa localizada para o código escaneado: "${term.slice(0, 30)}".`,
        timestamp: Date.now()
      });
      return;
    }

    // Verifica se o workshop foi selecionado e se o participante está inscrito nele
    if (currentWsId !== 'GERAL') {
      const isEnrolledInWorkshop = matchedParticipant.selectedWorkshops && 
                                   matchedParticipant.selectedWorkshops.includes(currentWsId);
      if (!isEnrolledInWorkshop) {
        playBeep('warning');
        setLastScannedResult({
          status: 'wrong_workshop',
          studentName: matchedParticipant.userName,
          studentEmail: matchedParticipant.userEmail,
          studentRa: matchedParticipant.userRa,
          message: `Participante inscrito no evento, mas NÃO está inscrito neste Workshop específico (${activeActivityName})!`,
          timestamp: Date.now()
        });
        return;
      }
    }

    // Verifica se a presença já foi confirmada anteriormente
    const alreadyChecked = currentAttendances.find(
      a => a.userId === matchedParticipant.userId && 
           a.eventId === currentEvent.id && 
           a.workshopId === activeWs
    );

    if (alreadyChecked) {
      playBeep('warning');
      const timeStr = alreadyChecked.checkedInAt ? new Date(alreadyChecked.checkedInAt).toLocaleTimeString('pt-BR') : '';
      setLastScannedResult({
        status: 'already_checked',
        studentName: matchedParticipant.userName,
        studentEmail: matchedParticipant.userEmail,
        studentRa: matchedParticipant.userRa,
        message: `Presença já havia sido confirmada anteriormente${timeStr ? ` às ${timeStr}` : ''}!`,
        timestamp: Date.now()
      });
      return;
    }

    // Registra o check-in no banco de dados
    try {
      DB.registerAttendance(matchedParticipant.userId, currentEvent.id, activeWs, currentActor);
      playBeep('success');
      setScanCountSession(prev => prev + 1);
      setLastScannedResult({
        status: 'success',
        studentName: matchedParticipant.userName,
        studentEmail: matchedParticipant.userEmail,
        studentRa: matchedParticipant.userRa,
        message: `PRESENÇA CONFIRMADA COM SUCESSO!`,
        timestamp: Date.now()
      });
      triggerDataChanged();
    } catch (err: any) {
      playBeep('error');
      setLastScannedResult({
        status: 'error',
        studentName: matchedParticipant.userName,
        message: err?.message || 'Erro ao registrar presença no banco de dados.',
        timestamp: Date.now()
      });
    }
  }, [playBeep, activeActivityName]);

  // Encerra a transmissão da câmera de forma segura
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setTorchEnabled(false);
    setHasTorch(false);
  }, []);

  // Loop contínuo de escaneamento de quadros com BarcodeDetector nativo e fallback para jsQR
  const startScanLoop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Verifica se a API nativa BarcodeDetector é suportada no navegador
    let barcodeDetector: any = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetector = null;
      }
    }

    let isProcessing = false;
    let lastCheckTime = 0;

    const scan = async () => {
      if (!isMountedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const now = Date.now();

      if (video && video.readyState >= 2 && !video.paused && !isProcessing && (now - lastCheckTime > 90)) {
        lastCheckTime = now;
        isProcessing = true;

        try {
          // 1. Tenta usar BarcodeDetector nativo para decodificação ultra-rápida sem sobrecarregar a CPU
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                const qrVal = barcodes[0].rawValue;
                const last = lastScannedCodeRef.current;
                if (!last || last.code !== qrVal || now - last.time > 2200) {
                  lastScannedCodeRef.current = { code: qrVal, time: now };
                  processDecodedString(qrVal);
                }
                isProcessing = false;
                if (isMountedRef.current) {
                  animationFrameRef.current = requestAnimationFrame(scan);
                }
                return;
              }
            } catch {
              // Fallback para jsQR abaixo
            }
          }

          // 2. Fallback de alta performance via jsQR em canvas
          if (canvas && video.videoWidth > 0 && video.videoHeight > 0) {
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              // Reduz dimensões de quadros de vídeo grandes (máx. 640px) para execução fluida a 60fps
              const maxDim = 640;
              let targetW = video.videoWidth;
              let targetH = video.videoHeight;
              if (targetW > maxDim) {
                targetH = Math.round((targetH * maxDim) / targetW);
                targetW = maxDim;
              }

              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(video, 0, 0, targetW, targetH);

              const imageData = ctx.getImageData(0, 0, targetW, targetH);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });

              if (qrCode && qrCode.data) {
                const qrVal = qrCode.data;
                const last = lastScannedCodeRef.current;
                if (!last || last.code !== qrVal || now - last.time > 2200) {
                  lastScannedCodeRef.current = { code: qrVal, time: now };
                  processDecodedString(qrVal);
                }
              }
            }
          }
        } catch (e) {
          // Ignora erros individuais de quadro
        } finally {
          isProcessing = false;
        }
      }

      if (isMountedRef.current) {
        animationFrameRef.current = requestAnimationFrame(scan);
      }
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  }, [processDecodedString]);

  // Inicia transmissão da câmera
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    if (isStartingCameraRef.current) return;
    isStartingCameraRef.current = true;

    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não suporta acesso à câmera ou a conexão não é segura (HTTPS).');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        isStartingCameraRef.current = false;
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;

        try {
          await videoRef.current.play();
        } catch (playError: any) {
          if (playError.name === 'AbortError' || playError.message?.includes('interrupted')) {
            isStartingCameraRef.current = false;
            return;
          }
          throw playError;
        }

        if (isMountedRef.current) {
          setIsCameraActive(true);

          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
            if (capabilities && capabilities.torch) {
              setHasTorch(true);
            }
          }

          startScanLoop();
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('interrupted')) {
        isStartingCameraRef.current = false;
        return;
      }
      console.error('Camera access error:', err);
      let errorMsg = 'Não foi possível acessar a câmera do dispositivo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permissão de acesso à câmera negada. Por favor, autorize o uso da câmera nas configurações do seu navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Nenhuma câmera ou webcam foi detectada no dispositivo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'A câmera está sendo utilizada por outro aplicativo ou aba do navegador.';
      }
      if (isMountedRef.current) {
        setCameraError(errorMsg);
        setIsCameraActive(false);
      }
    } finally {
      isStartingCameraRef.current = false;
    }
  }, [stopCamera, startScanLoop]);

  // Alterna lanterna/flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newStatus = !torchEnabled;
      await (track as any).applyConstraints({
        advanced: [{ torch: newStatus }]
      });
      setTorchEnabled(newStatus);
    } catch (e) {
      console.warn('Torch not supported or failed:', e);
    }
  };

  // Alterna entre câmera frontal e traseira
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
  };

  // Efeito de montagem/desmontagem - executa APENAS quando cameraFacing mudar
  useEffect(() => {
    isMountedRef.current = true;
    startCamera(cameraFacing);
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [cameraFacing, startCamera, stopCamera]);

  // Processa envio manual
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    processDecodedString(manualInput.trim());
    setManualInput('');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Cabeçalho do modal */}
        <div className="p-3.5 sm:p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black uppercase text-white tracking-wide flex items-center gap-1.5">
                <span>Leitor de QR Code</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  AO VIVO
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 truncate">
                {event.name} • <span className="text-purple-300 font-semibold">{activeActivityName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de alternar áudio */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                soundEnabled 
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
              title={soundEnabled ? 'Silenciar bipes' : 'Ativar bipes de confirmação'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Botão de fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Fechar câmera"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Janela de exibição do vídeo e sobreposição do scanner */}
        <div className="relative bg-black flex-1 min-h-[260px] sm:min-h-[320px] flex items-center justify-center overflow-hidden">
          
          {/* Elemento de vídeo real */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {/* Canvas oculto para processamento dos quadros do QR */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Mensagem de erro da câmera */}
          {cameraError && (
            <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-sm mb-1">Câmera Indisponível</h4>
              <p className="text-xs text-slate-300 mb-4 max-w-xs leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => startCamera(cameraFacing)}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          )}

          {/* Sobreposição do quadro de mira do escaneamento */}
          {isCameraActive && !cameraError && (
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
              {/* Caixa de mira com marcadores de canto */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-purple-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
                
                {/* Marcadores de canto */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-purple-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-purple-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-purple-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-purple-400 rounded-br-lg" />

                {/* Linha de laser do scanner */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-300 to-transparent shadow-[0_0_8px_#c084fc] scanner-laser" />
              </div>

              <span className="mt-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-slate-200 border border-white/10 shadow-lg">
                Posicione o QR Code da etiqueta no quadro
              </span>
            </div>
          )}

          {/* Controles rápidos flutuantes (virar câmera e lanterna) */}
          {isCameraActive && !cameraError && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2.5 rounded-full backdrop-blur-md text-xs font-bold transition-all cursor-pointer shadow-lg ${
                    torchEnabled 
                      ? 'bg-amber-400 text-slate-900 shadow-amber-400/30' 
                      : 'bg-black/60 text-white border border-white/20 hover:bg-black/80'
                  }`}
                  title={torchEnabled ? 'Desligar Lanterna' : 'Ligar Lanterna'}
                >
                  <Flashlight className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80 text-xs font-bold transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                title="Alternar câmera frontal / traseira"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-[10px] hidden sm:inline">Virar Câmera</span>
              </button>
            </div>
          )}
        </div>

        {/* Barra de entrada manual (fallback) */}
        <div className="px-3.5 py-2 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Ou digite Nome, RA ou Código da Inscrição..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!manualInput.trim()}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
              title="Confirmar presença manualmente"
            >
              <span>Validar</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* Banner dinâmico com o resultado do escaneamento */}
        <div className="p-3.5 sm:p-4 bg-slate-850 border-t border-slate-700 flex flex-col gap-2.5">
          
          {lastScannedResult ? (
            <div
              key={lastScannedResult.timestamp}
              className={`p-3 rounded-2xl border transition-all animate-fade-in ${
                lastScannedResult.status === 'success'
                  ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                  : lastScannedResult.status === 'already_checked'
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                  : lastScannedResult.status === 'wrong_workshop'
                  ? 'bg-orange-950/70 border-orange-500/60 text-orange-200'
                  : 'bg-rose-950/70 border-rose-500/60 text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                  lastScannedResult.status === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : lastScannedResult.status === 'already_checked'
                    ? 'bg-amber-500/20 text-amber-400'
                    : lastScannedResult.status === 'wrong_workshop'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {lastScannedResult.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : lastScannedResult.status === 'already_checked' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : lastScannedResult.status === 'wrong_workshop' ? (
                    <UserCheck className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase font-black tracking-wider opacity-90">
                      {lastScannedResult.status === 'success' && 'PRESENÇA CONFIRMADA'}
                      {lastScannedResult.status === 'already_checked' && 'ATENÇÃO - JÁ REGISTRADO'}
                      {lastScannedResult.status === 'wrong_workshop' && 'WORKSHOP NÃO CONFERE'}
                      {lastScannedResult.status === 'not_found' && 'NÃO ENCONTRADO'}
                      {lastScannedResult.status === 'error' && 'ERRO AO REGISTRAR'}
                    </p>
                    <span className="text-[10px] opacity-60 font-mono">
                      {new Date(lastScannedResult.timestamp).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  {lastScannedResult.studentName && (
                    <p className="text-sm font-black text-white truncate mt-0.5">
                      {lastScannedResult.studentName}
                    </p>
                  )}

                  {(lastScannedResult.studentRa || lastScannedResult.studentEmail) && (
                    <p className="text-[11px] opacity-80 font-mono mt-0.5 truncate">
                      {lastScannedResult.studentRa ? `RA: ${lastScannedResult.studentRa}` : ''} 
                      {lastScannedResult.studentRa && lastScannedResult.studentEmail ? ' • ' : ''}
                      {lastScannedResult.studentEmail}
                    </p>
                  )}

                  <p className="text-xs font-semibold mt-1 leading-snug">
                    {lastScannedResult.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-xs font-semibold">
                  Aguardando leitura de QR Code na câmera...
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                {enrollments.filter(e => e.eventId === event.id && e.status !== 'CANCELADO').length} inscritos
              </span>
            </div>
          )}

          {/* Estatísticas do rodapé inferior e botão Concluir */}
          <div className="flex items-center justify-between gap-3 pt-0.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-[11px]">
                Credenciados nesta sessão: <strong className="text-white font-black">{scanCountSession}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-4 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Concluir
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
