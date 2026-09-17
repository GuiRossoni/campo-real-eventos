import React, { useState, useMemo } from 'react';
import { Event, Workshop, User } from '../../types';
import { 
  X, 
  Calendar, 
  MapPin, 
  Users, 
  CheckCircle2, 
  Ticket, 
  Sparkles, 
  CalendarDays, 
  Layers, 
  ChevronRight, 
  Edit3, 
  Trash2,
  AlertTriangle,
  Ban,
  Loader2
} from 'lucide-react';
import WorkshopSelectionModal from './WorkshopSelectionModal';
import { 
  isWorkshopSoldOut, 
  getWorkshopRemainingSpots, 
  getConflictingWorkshop 
} from '../utils/workshopUtils';

interface EventDetailModalProps {
  event: Event;
  workshops: Workshop[];
  alreadyEnrolled: boolean;
  onClose: () => void;
  onOpenCheckout: (selectedWorkshopIds: string[]) => void;
  currentUser: User | null;
  enrollment?: any;
  onUpdateWorkshops?: (selectedWorkshopIds: string[]) => void;
  onOpenAuth?: (selectedWorkshopIds: string[]) => void;
}

export default function EventDetailModal({
  event,
  workshops,
  alreadyEnrolled,
  onClose,
  onOpenCheckout,
  currentUser,
  enrollment,
  onUpdateWorkshops,
  onOpenAuth
}: EventDetailModalProps) {
  const [selectedWorkshops, setSelectedWorkshops] = useState<string[]>([]);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [detailConflictWarning, setDetailConflictWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    if (alreadyEnrolled && enrollment && enrollment.selectedWorkshops) {
      setSelectedWorkshops(enrollment.selectedWorkshops);
    }
  }, [alreadyEnrolled, enrollment]);

  const handleSaveGrade = async () => {
    if (isSaving || isSaved) return;
    if (onUpdateWorkshops) {
      setIsSaving(true);
      try {
        await onUpdateWorkshops(selectedWorkshops);
        setIsSaving(false);
        setIsSaved(true);
        setTimeout(() => {
          onClose();
        }, 900);
      } catch (e) {
        setIsSaving(false);
      }
    }
  };

  // Cálculo de preços
  const basePrice = event.price;
  const workshopsPrice = selectedWorkshops.reduce((sum, id) => {
    const ws = workshops.find(w => w.id === id);
    return sum + (ws ? ws.price : 0);
  }, 0);
  const totalPrice = basePrice + workshopsPrice;

  // Auxiliar de formatação de data
  const formatDateBadge = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Contagem de dias únicos
  const uniqueDaysCount = useMemo(() => {
    const dates = new Set(workshops.map(w => w.date).filter(Boolean));
    return dates.size || 1;
  }, [workshops]);

  const selectedWorkshopObjects = useMemo(() => {
    return selectedWorkshops.map(id => workshops.find(w => w.id === id)).filter(Boolean) as Workshop[];
  }, [selectedWorkshops, workshops]);

  const toggleWorkshop = (wsId: string) => {
    const targetWs = workshops.find(w => w.id === wsId);
    if (!targetWs) return;

    if (selectedWorkshops.includes(wsId)) {
      setDetailConflictWarning(null);
      setSelectedWorkshops(prev => prev.filter(id => id !== wsId));
      return;
    }

    if (isWorkshopSoldOut(targetWs)) {
      setDetailConflictWarning(`O workshop "${targetWs.name}" está esgotado.`);
      return;
    }

    const conflicting = getConflictingWorkshop(targetWs, selectedWorkshopObjects);
    if (conflicting) {
      setDetailConflictWarning(`Conflito de horário: "${targetWs.name}" coincide com "${conflicting.name}".`);
      return;
    }

    setDetailConflictWarning(null);
    setSelectedWorkshops(prev => [...prev, wsId]);
  };

  const handleEnrollClick = () => {
    if (!currentUser) {
      if (onOpenAuth) {
        onOpenAuth(selectedWorkshops);
      }
      return;
    }
    onOpenCheckout(selectedWorkshops);
  };

  return (
    <div className="fixed inset-0 z-50 p-0 md:p-6 md:py-10 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center animate-fade-in select-none selection:bg-blue-600 selection:text-white">
      
      {/* Contêiner - Tela cheia no mobile, card centralizado no desktop */}
      <div className="bg-white dark:bg-zinc-900 border-0 md:border md:border-gray-200/90 dark:md:border-zinc-800 w-full h-full md:h-auto md:max-h-[88vh] md:max-w-4xl rounded-none md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col md:flex-row text-gray-800 dark:text-zinc-100">
        
        {/* Lado esquerdo: Banner fixo e estatísticas rápidas no desktop */}
        <div className="hidden md:flex md:w-5/12 bg-slate-900 flex-col justify-between border-r border-gray-200 dark:border-zinc-800 relative shrink-0">
          
          {/* Imagem de capa */}
          <div className="absolute inset-0 bg-gray-900">
            <img 
              src={event.banner} 
              alt={event.name} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            {/* Sobreposição escura suave para contraste dos títulos */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
          </div>

          {/* Informações e estatísticas rápidas sobre a capa no desktop */}
          <div className="p-6 relative z-10 flex flex-col justify-end h-full text-white">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-white font-extrabold uppercase text-[10px] tracking-widest bg-blue-600 w-fit px-2.5 py-0.5 rounded-full shadow-xs">
                {event.category}
              </span>
              <span className="text-[10px] text-gray-300 font-mono">
                {event.price === 0 ? 'Entrada Franca' : `Acesso R$ ${event.price.toFixed(2)}`}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase leading-snug text-white mb-3">
              {event.name}
            </h2>

            <div className="flex flex-col gap-2 text-xs text-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{event.startDate.split('-').reverse().join('/')} {event.startDate !== event.endDate && ` a ${event.endDate.split('-').reverse().join('/')}`} às {event.startTime}h</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Capacidade: {event.maxParticipants} participantes</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/15 flex items-center gap-2 text-[11px] text-gray-300">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {event.creatorName.charAt(0)}
              </div>
              <div className="truncate">
                <p className="font-semibold text-gray-200 text-[10px] leading-none">Organizado por:</p>
                <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5">{event.creatorName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito: Área de conteúdo rolável com informações do evento */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden bg-white dark:bg-zinc-900 relative">
          
          {/* APENAS MOBILE: Cabeçalho compacto fixo mostrando evento e data/horário */}
          <div className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-xs shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[9px] font-extrabold uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-150 dark:border-blue-900 shrink-0">
                  {event.category}
                </span>
                <h3 className="text-xs font-extrabold text-gray-900 dark:text-zinc-100 truncate leading-tight flex-1">
                  {event.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-gray-500 dark:text-zinc-400 mt-0.5 truncate">
                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="truncate">
                  {event.startDate.split('-').reverse().join('/')} {event.startDate !== event.endDate ? `a ${event.endDate.split('-').reverse().join('/')}` : ''} às {event.startTime}h
                </span>
                <span className="text-gray-300 dark:text-zinc-600 shrink-0">•</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold font-mono text-[10px] shrink-0">
                  {event.price === 0 ? 'Grátis' : `R$ ${event.price.toFixed(2)}`}
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Botão fechar no desktop */}
          <button 
            type="button"
            onClick={onClose} 
            className="hidden md:flex absolute top-5 right-5 z-20 p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Área rolável de conteúdo (foto, descrição e workshops) */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            
            {/* APENAS MOBILE: Foto de capa e banner introdutório */}
            <div className="md:hidden relative bg-slate-950 text-white shrink-0 overflow-hidden">
              <div className="relative h-44 sm:h-52 w-full">
                <img 
                  src={event.banner} 
                  alt={event.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
              </div>

              <div className="p-4 relative z-10 -mt-20">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-white font-extrabold uppercase text-[9px] tracking-widest bg-blue-600 px-2 py-0.5 rounded-full shadow-xs">
                    {event.category}
                  </span>
                  <span className="text-[10px] text-gray-300 font-mono">
                    {event.price === 0 ? 'Entrada Franca' : `Acesso R$ ${event.price.toFixed(2)}`}
                  </span>
                </div>

                <h2 className="text-lg font-black tracking-tight uppercase leading-tight text-white mb-2">
                  {event.name}
                </h2>

                <div className="flex flex-col gap-1 text-xs text-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{event.startDate.split('-').reverse().join('/')} {event.startDate !== event.endDate && ` a ${event.endDate.split('-').reverse().join('/')}`} às {event.startTime}h</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Capacidade: {event.maxParticipants} participantes</span>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-white/15 flex items-center gap-2 text-[11px] text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                    {event.creatorName.charAt(0)}
                  </div>
                  <span className="truncate text-[10px] text-gray-300">Organizado por: <strong className="text-white">{event.creatorName}</strong></span>
                </div>
              </div>
            </div>

            {/* Contêiner com espaçamento interno para descrição e workshops */}
            <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-5">
              
              {/* Texto descritivo sobre o evento */}
              <div>
                <h3 className="text-gray-400 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mb-2">Sobre o evento</h3>
                <p className="text-gray-600 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-line text-justify">
                  {event.description}
                </p>
              </div>

              {/* Lista de workshops */}
              <div>
                <div className="flex items-center justify-between border-b border-gray-150 dark:border-zinc-800 pb-2 mb-3">
                  <h3 className="text-gray-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider">
                    Minicursos & Workshops Integrados
                  </h3>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                    {workshops.length > 2 ? `${uniqueDaysCount} dias de programação` : 'Selecione para participar'}
                  </span>
                </div>

                {workshops.length === 0 ? (
                  <div className="text-center p-4 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-zinc-400">Nenhum workshop associado disponível para este evento acadêmico.</p>
                  </div>
                ) : workshops.length > 2 ? (
                  /* Visualização detalhada para mais de 2 workshops: acionador de seleção e prévia por dia */
                  <div className="flex flex-col gap-3">
                    
                    {selectedWorkshops.length === 0 ? (
                      <div className="bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div className="text-left min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-zinc-100 leading-snug">
                              {workshops.length} Workshops em {uniqueDaysCount} {uniqueDaysCount === 1 ? 'dia' : 'dias'}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                              Toque no botão ao lado para abrir a grade completa dividida por dia.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsWorkshopModalOpen(true)}
                          className="w-full sm:w-auto px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-98"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Selecionar Workshops</span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-750 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3">
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                              {selectedWorkshops.length} {selectedWorkshops.length === 1 ? 'workshop selecionado' : 'workshops selecionados'}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedWorkshops.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setSelectedWorkshops([])}
                                className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                title="Limpar seleção de workshops"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Limpar</span>
                              </button>
                            )}
                            
                            <button
                              type="button"
                              onClick={() => setIsWorkshopModalOpen(true)}
                              className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-750 dark:hover:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-150 dark:border-blue-850 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Alterar Grade</span>
                            </button>
                          </div>
                        </div>

                        {/* Lista compacta rolável de workshops selecionados */}
                        <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1">
                          {selectedWorkshopObjects.map(ws => (
                            <div 
                              key={ws.id} 
                              className="bg-white dark:bg-zinc-900 border border-gray-200/90 dark:border-zinc-700/80 rounded-xl p-2.5 flex items-center justify-between text-xs gap-2.5 shadow-2xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-blue-150 dark:border-blue-900 shrink-0">
                                  {formatDateBadge(ws.date) || ws.time}
                                </span>
                                <div className="truncate">
                                  <span className="font-bold text-gray-800 dark:text-zinc-100 block truncate">{ws.name}</span>
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 block truncate">
                                    {ws.instructor} • {ws.startTime && ws.endTime ? `${ws.startTime} às ${ws.endTime}` : ws.time}
                                  </span>
                                </div>
                              </div>

                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                {ws.price === 0 ? 'Incluso' : `+ R$ ${ws.price.toFixed(2)}`}
                              </span>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                  </div>
                ) : (
                  /* Visualização compacta inline quando há 1 ou 2 workshops */
                  <div className="flex flex-col gap-2.5">
                    {detailConflictWarning && (
                      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs shadow-2xs animate-fade-in">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>{detailConflictWarning}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => setDetailConflictWarning(null)}
                          className="text-amber-700 dark:text-amber-400 hover:text-amber-900 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {workshops.map((ws) => {
                      const wsRemaining = getWorkshopRemainingSpots(ws);
                      const wsSoldOut = isWorkshopSoldOut(ws);
                      const isSelected = selectedWorkshops.includes(ws.id);
                      const isWsPaidObj = ws.price > 0;
                      
                      const conflictingWs = !isSelected 
                        ? getConflictingWorkshop(ws, selectedWorkshopObjects) 
                        : null;
                      const hasConflict = !!conflictingWs;

                      return (
                        <div 
                          key={ws.id}
                          onClick={() => {
                            if (event.category === 'SEMANA ACADÊMICA' || !alreadyEnrolled) {
                              if (!wsSoldOut || isSelected) {
                                toggleWorkshop(ws.id);
                              }
                            }
                          }}
                          className={`p-3.5 rounded-xl border-2 transition-all flex items-start gap-3 select-none relative ${
                            isSelected 
                              ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20 cursor-pointer' 
                              : wsSoldOut
                                ? 'border-red-500/90 dark:border-red-500/90 bg-red-50/30 dark:bg-red-950/20 ring-1 ring-red-500/30 opacity-90 cursor-not-allowed'
                                : hasConflict
                                  ? 'border-amber-400/80 dark:border-amber-600/70 bg-amber-50/20 dark:bg-amber-950/20 opacity-80 cursor-not-allowed'
                                  : 'bg-gray-50 dark:bg-zinc-800/60 border-gray-200 dark:border-zinc-750 hover:border-blue-300 dark:hover:border-zinc-650 cursor-pointer'
                          }`}
                        >
                          
                          {/* Caixa de seleção */}
                          <div className="mt-0.5">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              disabled={(event.category !== 'SEMANA ACADÊMICA' && alreadyEnrolled) || (wsSoldOut && !isSelected) || hasConflict}
                              onChange={() => {}} // Controlado via onClick do contêiner
                              className="w-4 h-4 rounded text-blue-600 dark:text-blue-500 bg-white dark:bg-zinc-900 border-gray-350 dark:border-zinc-600 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                            />
                          </div>

                          {/* Título e detalhes do ministrante */}
                          <div className="flex-1 flex flex-col gap-1 text-gray-700 dark:text-zinc-200 min-w-0">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                {ws.date && (
                                  <span className="bg-blue-100/60 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-mono text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0">
                                    {formatDateBadge(ws.date)}
                                  </span>
                                )}
                                <h4 className="text-gray-800 dark:text-zinc-100 font-bold text-xs leading-none group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                  {ws.name}
                                </h4>
                              </div>
                              {isWsPaidObj && (
                                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                  + R$ {ws.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            
                            {ws.description && (
                              <p className="text-gray-500 dark:text-zinc-400 text-[11px] leading-tight line-clamp-1">{ws.description}</p>
                            )}

                            {hasConflict && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/80">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span className="truncate">Conflito de horário com "{conflictingWs?.name}"</span>
                              </div>
                            )}
                            
                            <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400 dark:text-zinc-400 mt-0.5">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">Instrutor: {ws.instructor}</span>
                              <span className="dark:text-zinc-600">•</span>
                              <span>Horário: {ws.startTime && ws.endTime ? `${ws.startTime} às ${ws.endTime}` : ws.time}</span>
                              <span className="dark:text-zinc-600">•</span>
                              {wsSoldOut ? (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-0.5">
                                  <Ban className="w-2.5 h-2.5 stroke-[2.5]" />
                                  Esgotado
                                </span>
                              ) : (
                                <span className="font-semibold text-gray-600 dark:text-zinc-400">
                                  {wsRemaining} vagas
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Resumo de preços e botões de ação */}
          <div className="border-t border-gray-200 dark:border-zinc-800 bg-gray-50/90 md:bg-white dark:bg-zinc-900/95 dark:md:bg-zinc-900 p-4 sm:p-5 md:p-6 shrink-0 flex flex-col gap-3">
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400">Total a Pagar</span>
                <span className="text-gray-400 dark:text-zinc-500 text-[9px] mt-0.5">
                  Base ({basePrice === 0 ? 'Grátis' : `R$ ${basePrice.toFixed(2)}`}) + Workshops ({workshopsPrice === 0 ? 'R$ 0,00' : `R$ ${workshopsPrice.toFixed(2)}`})
                </span>
              </div>
              <div className="text-right text-gray-800 dark:text-zinc-100">
                <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                  {totalPrice === 0 ? 'GRATUITO' : `R$ ${totalPrice.toFixed(2)}`}
                </span>
              </div>
            </div>

            {alreadyEnrolled ? (
              <div className="flex flex-col gap-2.5">
                {event.category === 'SEMANA ACADÊMICA' ? (
                  <div className="flex gap-2 sm:gap-3">
                    <button 
                      type="button"
                      onClick={onClose}
                      className="hidden md:block border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-650 dark:text-zinc-300 font-bold uppercase text-xs tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                    <button 
                      type="button"
                      onClick={handleSaveGrade}
                      disabled={isSaving || isSaved}
                      className={`flex-1 font-extrabold uppercase text-xs tracking-widest py-3.5 sm:py-4 rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2 ${
                        isSaved
                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-md scale-[1.01]'
                          : isSaving
                            ? 'bg-blue-600/85 text-white cursor-wait opacity-90'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                          <span>Grade Salva com Sucesso!</span>
                        </>
                      ) : isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                          <span>Salvando Grade...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Salvar Minha Grade</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-emerald-950/40 border border-green-200 dark:border-emerald-800 p-3 rounded-xl flex items-center justify-center gap-2 text-green-700 dark:text-emerald-300 text-xs text-center w-full">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">Você já está inscrito neste evento! Consulte seus ingressos no perfil.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="hidden md:block border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-650 dark:text-zinc-300 font-bold uppercase text-xs tracking-wider px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  onClick={handleEnrollClick}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold uppercase text-xs tracking-widest py-3.5 sm:py-4 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Inscrever-se Agora</span>
                </button>
              </div>
            )}

            {!currentUser && (
              <p className="text-[10px] text-gray-500 dark:text-zinc-400 text-center font-medium">
                📌 Acesso como visitante: ao clicar em <strong className="font-bold text-blue-600 dark:text-blue-400">Inscrever-se Agora</strong>, você poderá entrar ou criar sua conta para confirmar sua vaga.
              </p>
            )}

          </div>

        </div>

      </div>

      {/* Modal dedicado de seleção de workshops dia a dia */}
      <WorkshopSelectionModal
        isOpen={isWorkshopModalOpen}
        onClose={() => setIsWorkshopModalOpen(false)}
        eventName={event.name}
        eventCategory={event.category}
        workshops={workshops}
        selectedWorkshopIds={selectedWorkshops}
        onSave={(newSelected) => setSelectedWorkshops(newSelected)}
        isReadOnly={event.category !== 'SEMANA ACADÊMICA' && alreadyEnrolled}
      />
      
    </div>
  );
}
