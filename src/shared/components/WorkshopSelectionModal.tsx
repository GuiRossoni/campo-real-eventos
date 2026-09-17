import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Workshop } from '../../types';
import { 
  X, 
  Clock, 
  User, 
  Check, 
  Search, 
  Sparkles, 
  CalendarDays, 
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Ban,
  ChevronDown
} from 'lucide-react';
import { 
  isWorkshopSoldOut, 
  getWorkshopRemainingSpots, 
  getConflictingWorkshop, 
  getAvailableWorkshopWithMostSpots 
} from '../utils/workshopUtils';
import { validateSearchQuery } from '../utils/validators';

interface WorkshopSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  eventCategory: string;
  workshops: Workshop[];
  selectedWorkshopIds: string[];
  onSave: (selectedIds: string[]) => void;
  isReadOnly?: boolean;
}

export default function WorkshopSelectionModal({
  isOpen,
  onClose,
  eventName,
  eventCategory,
  workshops,
  selectedWorkshopIds,
  onSave,
  isReadOnly = false
}: WorkshopSelectionModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedWorkshopIds || []);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('ALL');
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Trata pressionamento da tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lista completa de objetos de Workshop para os IDs atualmente selecionados
  const currentlySelectedWorkshopObjects = useMemo(() => {
    return (workshops || []).filter(w => tempSelected.includes(w.id));
  }, [workshops, tempSelected]);

  // Função auxiliar para formatação de data
  const formatDateInfo = (dateStr: string) => {
    if (!dateStr || dateStr === 'sem_data') {
      return { formatted: 'Data a definir', weekday: '', shortDate: 'Geral', raw: dateStr };
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const shortWeekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const weekday = !isNaN(d.getTime()) ? weekdays[d.getDay()] || '' : '';
      const shortWeekday = !isNaN(d.getTime()) ? shortWeekdays[d.getDay()] || '' : '';
      return {
        formatted: `${parts[2]}/${parts[1]}/${parts[0]}`,
        shortDate: `${parts[2]}/${parts[1]}${shortWeekday ? ` (${shortWeekday})` : ''}`,
        weekday,
        raw: dateStr
      };
    }
    return { formatted: dateStr, shortDate: dateStr, weekday: '', raw: dateStr };
  };

  // Agrupa workshops por data
  const groupedWorkshops = useMemo(() => {
    const map = new Map<string, Workshop[]>();

    (workshops || []).forEach(ws => {
      const dateKey = ws.date || 'sem_data';
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(ws);
    });

    // Ordena as datas
    const sortedKeys = Array.from(map.keys()).sort();
    
    return sortedKeys.map((dateKey, index) => {
      const dateWorkshops = map.get(dateKey)!;
      const dateInfo = formatDateInfo(dateKey);
      return {
        dateKey,
        dayNumber: index + 1,
        dateInfo,
        workshops: dateWorkshops
      };
    });
  }, [workshops]);

  // Lista de dias únicos para as abas de filtro
  const daysList = useMemo(() => {
    return groupedWorkshops.map(g => ({
      key: g.dateKey,
      label: g.dateKey === 'sem_data' ? 'Geral' : `Dia ${g.dayNumber} - ${g.dateInfo.formatted}`,
      shortLabel: g.dateKey === 'sem_data' ? 'Geral' : `Dia ${g.dayNumber} (${g.dateInfo.shortDate})`,
      count: g.workshops.length
    }));
  }, [groupedWorkshops]);

  // Grupos filtrados com base na busca e na aba de dia selecionada
  const filteredGroups = useMemo(() => {
    return groupedWorkshops
      .map(group => {
        if (selectedDayFilter !== 'ALL' && group.dateKey !== selectedDayFilter) {
          return null;
        }

        const matchingWorkshops = group.workshops.filter(ws => {
          if (!searchFilter.trim()) return true;
          const query = searchFilter.toLowerCase();
          return (
            (ws.name && ws.name.toLowerCase().includes(query)) ||
            (ws.instructor && ws.instructor.toLowerCase().includes(query)) ||
            (ws.description && ws.description.toLowerCase().includes(query))
          );
        });

        if (matchingWorkshops.length === 0) return null;

        return {
          ...group,
          workshops: matchingWorkshops
        };
      })
      .filter(Boolean) as typeof groupedWorkshops;
  }, [groupedWorkshops, searchFilter, selectedDayFilter]);

  // Sincroniza tempSelected e inicializa o dia expandido (apenas 1 dia aberto por vez)
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selectedWorkshopIds || []);
      setSearchFilter('');
      setSelectedDayFilter('ALL');
      setConflictWarning(null);

      // Expande automaticamente o dia que possui workshops selecionados, ou o primeiro dia
      const dayWithSelection = groupedWorkshops.find(g => 
        g.workshops.some(w => (selectedWorkshopIds || []).includes(w.id))
      );
      if (dayWithSelection) {
        setExpandedDayKey(dayWithSelection.dateKey);
      } else if (groupedWorkshops.length > 0) {
        setExpandedDayKey(groupedWorkshops[0].dateKey);
      } else {
        setExpandedDayKey(null);
      }
    }
  }, [isOpen, selectedWorkshopIds, groupedWorkshops]);

  // Trata a alteração da aba de filtro de dia
  const handleSelectDayFilter = (filterKey: string) => {
    setSelectedDayFilter(filterKey);
    if (filterKey !== 'ALL') {
      setExpandedDayKey(filterKey);
    } else {
      if (!expandedDayKey && groupedWorkshops.length > 0) {
        setExpandedDayKey(groupedWorkshops[0].dateKey);
      }
    }
  };

  // Alterna o acordeão do dia - Garante que apenas 1 dia esteja aberto por vez
  const handleToggleDayAccordion = (dateKey: string) => {
    setExpandedDayKey(prev => prev === dateKey ? null : dateKey);
  };

  // Alterna workshop individual verificando conflitos e vagas esgotadas
  const toggleWorkshop = (ws: Workshop) => {
    if (isReadOnly) return;
    const isSelected = tempSelected.includes(ws.id);

    if (isSelected) {
      setConflictWarning(null);
      setTempSelected(prev => prev.filter(id => id !== ws.id));
      return;
    }

    // Verifica se está esgotado
    if (isWorkshopSoldOut(ws)) {
      setConflictWarning(`O workshop "${ws.name}" está esgotado e não possui vagas disponíveis.`);
      return;
    }

    // Verifica conflito de horário com workshops já selecionados
    const conflicting = getConflictingWorkshop(ws, currentlySelectedWorkshopObjects);
    if (conflicting) {
      setConflictWarning(
        `Conflito de horário: "${ws.name}" coincide com "${conflicting.name}" (${conflicting.startTime || conflicting.time || 'mesmo dia'}). Desmarque o anterior para selecionar este.`
      );
      return;
    }

    setConflictWarning(null);
    setTempSelected(prev => [...prev, ws.id]);
  };

  // Trata "Selecionar o disponível" ou "Desmarcar dia"
  const handleSelectAvailableOrDeselectDay = (dayWorkshops: Workshop[]) => {
    if (isReadOnly) return;
    setConflictWarning(null);

    const dayWorkshopIds = dayWorkshops.map(w => w.id);
    const dayHasSelected = dayWorkshops.some(w => tempSelected.includes(w.id));

    if (dayHasSelected) {
      // Desmarcar todos os workshops do dia
      setTempSelected(prev => prev.filter(id => !dayWorkshopIds.includes(id)));
    } else {
      // Selecionar o workshop com mais vagas disponíveis no dia (sem conflito)
      const bestWorkshop = getAvailableWorkshopWithMostSpots(dayWorkshops, currentlySelectedWorkshopObjects);
      
      if (bestWorkshop) {
        setTempSelected(prev => [...prev, bestWorkshop.id]);
      } else {
        // Verificar se todos estão esgotados ou com conflito
        const hasSpotsAny = dayWorkshops.some(w => !isWorkshopSoldOut(w));
        if (!hasSpotsAny) {
          setConflictWarning('Todos os workshops deste dia estão esgotados.');
        } else {
          setConflictWarning('Não foi possível selecionar automaticamente: os workshops disponíveis entram em conflito de horário com sua seleção atual.');
        }
      }
    }
  };

  // Calcula o subtotal atual para os workshops selecionados
  const selectedWorkshopsTotal = tempSelected.reduce((sum, id) => {
    const ws = workshops.find(w => w.id === id);
    return sum + (ws ? ws.price : 0);
  }, 0);

  const handleConfirm = () => {
    onSave(tempSelected);
    onClose();
  };

  const handleClearAll = () => {
    if (isReadOnly) return;
    setConflictWarning(null);
    setTempSelected([]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] p-0 md:p-6 md:py-10 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center animate-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      {/* Contêiner - Tela cheia no mobile, card centralizado no desktop */}
      <div 
        className="bg-white dark:bg-zinc-900 border-0 md:border md:border-gray-200/90 dark:md:border-zinc-800 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col text-gray-800 dark:text-zinc-100 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Cabeçalho do modal */}
        <div className="bg-gray-50 dark:bg-zinc-850/80 px-4 sm:px-6 md:px-7 py-3.5 sm:py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600/10 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-150 dark:border-blue-900 shrink-0">
                  {eventCategory || 'Grade do Evento'}
                </span>
                <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-zinc-400 font-medium truncate">
                  {workshops.length} {workshops.length === 1 ? 'workshop' : 'workshops'} em {groupedWorkshops.length} {groupedWorkshops.length === 1 ? 'dia' : 'dias'}
                </span>
              </div>
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-gray-900 dark:text-zinc-100 leading-snug mt-0.5 truncate">
                Seleção de Workshops por Dia • {eventName}
              </h2>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer shrink-0"
            aria-label="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de filtros e abas de dias */}
        <div className="bg-white dark:bg-zinc-900 border-b border-gray-150 dark:border-zinc-800 px-4 sm:px-6 md:px-7 py-2.5 sm:py-3 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between shrink-0">
          
          {/* Abas de dias */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectDayFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedDayFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              Todos os Dias ({workshops.length})
            </button>

            {daysList.map(d => (
              <button
                key={d.key}
                type="button"
                onClick={() => handleSelectDayFilter(d.key)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedDayFilter === d.key
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{d.shortLabel}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedDayFilter === d.key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300'
                }`}>
                  {d.count}
                </span>
              </button>
            ))}
          </div>

          {/* Campo de busca */}
          <div className="relative min-w-[180px] sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
            <input 
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(validateSearchQuery(e.target.value, 50).sanitized)}
              maxLength={50}
              placeholder="Buscar workshop ou instrutor..."
              className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500 text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            />
            {searchFilter && (
              <button 
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

        </div>

        {/* Lista de workshops agrupados por dia */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-7 space-y-5 bg-gray-50/40 dark:bg-zinc-950/40">
          
          {/* Banner de aviso de conflito ou validação */}
          {conflictWarning && (
            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 px-4 py-3 rounded-2xl flex items-start justify-between gap-3 text-xs shadow-sm animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Atenção na seleção: </span>
                  <span>{conflictWarning}</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConflictWarning(null)}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
              <Filter className="w-10 h-10 text-gray-400 dark:text-zinc-600 mx-auto mb-2.5 opacity-60" />
              <h4 className="text-gray-700 dark:text-zinc-200 font-bold text-sm">Nenhum workshop encontrado</h4>
              <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Tente ajustar o termo de busca ou selecione outra aba de dia.</p>
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="mt-3 text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                >
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            filteredGroups.map(group => {
              const dayWorkshops = group.workshops;
              const daySelectedCount = dayWorkshops.filter(w => tempSelected.includes(w.id)).length;
              const hasSelectedInDay = daySelectedCount > 0;
              const hasAvailableInDay = dayWorkshops.some(w => !isWorkshopSoldOut(w));
              const isExpanded = expandedDayKey === group.dateKey;
              const selectedDayWorkshopObjects = dayWorkshops.filter(w => tempSelected.includes(w.id));

              return (
                <div 
                  key={group.dateKey} 
                  className={`bg-white dark:bg-zinc-900 border rounded-2xl transition-all duration-200 shadow-xs overflow-hidden ${
                    isExpanded 
                      ? 'border-blue-400/80 dark:border-blue-800 ring-2 ring-blue-500/10' 
                      : 'border-gray-200/90 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                  }`}
                >
                  
                  {/* Cabeçalho do acordeão do grupo do dia - Clique para abrir/fechar (Apenas 1 aberto por vez) */}
                  <div 
                    onClick={() => handleToggleDayAccordion(group.dateKey)}
                    className={`relative p-3.5 sm:px-5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                      isExpanded 
                        ? 'bg-blue-50/40 dark:bg-blue-950/25 border-b border-gray-150 dark:border-zinc-800' 
                        : 'bg-white dark:bg-zinc-900 hover:bg-gray-50/80 dark:hover:bg-zinc-850/60'
                    }`}
                  >
                    {/* Alternador de seta do acordeão no canto superior direito */}
                    <div 
                      className="absolute top-3 right-3 sm:top-3.5 sm:right-4 flex items-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleDayAccordion(group.dateKey);
                      }}
                    >
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`} />
                      </span>
                    </div>

                    {/* Esquerda: Emblema do dia + Data e título + Informações resumidas */}
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 pr-8 md:pr-0">
                      <div className={`text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-lg tracking-wide uppercase shadow-2xs shrink-0 transition-colors mt-0.5 sm:mt-0 ${
                        isExpanded
                          ? 'bg-blue-600 text-white'
                          : hasSelectedInDay
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                            : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300'
                      }`}>
                        Dia {group.dayNumber}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-zinc-100 truncate">
                            {group.dateInfo.formatted}
                          </h3>
                          {group.dateInfo.weekday && (
                            <span className="text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-zinc-400 shrink-0">
                              • {group.dateInfo.weekday}
                            </span>
                          )}
                        </div>

                        {/* Informações resumidas recolhidas */}
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] flex-wrap">
                          <span className="text-gray-400 dark:text-zinc-500">
                            {dayWorkshops.length} {dayWorkshops.length === 1 ? 'workshop' : 'workshops'}
                          </span>
                          
                          {hasSelectedInDay && (
                            <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              • <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline stroke-[2.5]" />
                              {daySelectedCount} selecionado{daySelectedCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Área direita / inferior: Pílula do workshop selecionado à ESQUERDA do botão Limpar/Disponível */}
                    <div 
                      className="flex items-center justify-between sm:justify-end gap-2 flex-wrap min-w-0 pr-0 md:pr-10" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Pílulas de workshops selecionados (posicionadas à ESQUERDA do botão de ação) */}
                      {hasSelectedInDay && (
                        <div className="flex items-center gap-1.5 flex-wrap max-w-full">
                          {selectedDayWorkshopObjects.map(ws => (
                            <span 
                              key={ws.id} 
                              className="text-[10px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/80 border border-blue-250 dark:border-blue-800 px-2 py-1 rounded-lg truncate max-w-[180px] sm:max-w-[240px] flex items-center gap-1 shadow-2xs"
                              title={ws.name}
                            >
                              <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0 stroke-[3]" />
                              <span className="truncate">{ws.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Botão de Ação: Limpar (se tiver selecionado) OU Selecionar o disponível */}
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleSelectAvailableOrDeselectDay(dayWorkshops)}
                          className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0 ${
                            hasSelectedInDay
                              ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/80 active:scale-95'
                              : hasAvailableInDay
                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-900'
                                : 'text-gray-400 dark:text-zinc-600 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800 cursor-not-allowed'
                          }`}
                          disabled={!hasSelectedInDay && !hasAvailableInDay}
                          title={hasSelectedInDay ? 'Limpar seleção deste dia' : 'Selecionar automaticamente workshop com mais vagas'}
                        >
                          {hasSelectedInDay ? (
                            <>
                              <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400 shrink-0" />
                              <span>Limpar</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="hidden sm:inline">Selecionar o disponível</span>
                              <span className="sm:hidden">Disponível</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Grade de cards de workshops do dia - Visível apenas quando expandido */}
                  {isExpanded && (
                    <div className="p-4 sm:p-5 bg-white dark:bg-zinc-900">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dayWorkshops.map(ws => {
                          const wsRemaining = getWorkshopRemainingSpots(ws);
                          const wsSoldOut = isWorkshopSoldOut(ws);
                          const isSelected = tempSelected.includes(ws.id);
                          const isPaid = ws.price > 0;
                          
                          // Verifica se entra em conflito com um workshop já selecionado (se não estiver selecionado no momento)
                          const conflictingWs = !isSelected 
                            ? getConflictingWorkshop(ws, currentlySelectedWorkshopObjects) 
                            : null;
                          const hasConflict = !!conflictingWs;

                          return (
                            <div
                              key={ws.id}
                              onClick={() => toggleWorkshop(ws)}
                              className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between select-none relative ${
                                isSelected
                                  ? 'bg-blue-50/70 dark:bg-blue-950/50 border-blue-600 dark:border-blue-500 shadow-xs ring-2 ring-blue-500/20 cursor-pointer'
                                  : wsSoldOut
                                    ? 'border-red-500/90 dark:border-red-500/90 bg-red-50/30 dark:bg-red-950/20 ring-1 ring-red-500/30 cursor-not-allowed opacity-90'
                                    : hasConflict
                                      ? 'border-amber-400/80 dark:border-amber-600/70 bg-amber-50/20 dark:bg-amber-950/20 opacity-80 cursor-not-allowed'
                                      : 'border-gray-200 dark:border-zinc-750 bg-gray-50 dark:bg-zinc-800/60 hover:border-blue-300 dark:hover:border-zinc-600 cursor-pointer'
                              }`}
                            >
                              <div>
                                {/* Linha superior: Caixa de seleção, Nome, Preço */}
                                <div className="flex items-start gap-2.5">
                                  
                                  <div className="mt-0.5 shrink-0">
                                    <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                                      isSelected 
                                        ? 'bg-blue-600 border-blue-600 text-white' 
                                        : wsSoldOut
                                          ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 text-red-500'
                                          : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-600'
                                    }`}>
                                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                      {!isSelected && wsSoldOut && <Ban className="w-2.5 h-2.5" />}
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className={`text-xs font-bold leading-snug ${
                                        wsSoldOut && !isSelected ? 'text-gray-700 dark:text-zinc-300' : 'text-gray-900 dark:text-zinc-100'
                                      }`}>
                                        {ws.name}
                                      </h4>
                                      
                                      <span className={`text-[10px] font-mono font-bold shrink-0 px-2 py-0.5 rounded-md ${
                                        isPaid 
                                          ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300' 
                                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                      }`}>
                                        {isPaid ? `+ R$ ${ws.price.toFixed(2)}` : 'Incluso'}
                                      </span>
                                    </div>

                                    {ws.description && (
                                      <p className="text-[11px] text-gray-550 dark:text-zinc-400 leading-relaxed mt-1 line-clamp-2">
                                        {ws.description}
                                      </p>
                                    )}

                                    {/* Tag de aviso de conflito */}
                                    {hasConflict && (
                                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/80">
                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                        <span className="truncate">Conflito de horário com "{conflictingWs?.name}"</span>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </div>

                              {/* Detalhes do rodapé: Instrutor, Horário, Vagas */}
                              <div className="mt-3 pt-2.5 border-t border-gray-150/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-500 dark:text-zinc-400">
                                <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-zinc-300">
                                  <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                  <span className="truncate max-w-[130px]">{ws.instructor}</span>
                                </div>

                                <div className="flex items-center gap-2.5">
                                  <div className="flex items-center gap-1 text-gray-600 dark:text-zinc-400">
                                    <Clock className="w-3 h-3 text-gray-400 dark:text-zinc-500" />
                                    <span>{ws.startTime && ws.endTime ? `${ws.startTime} às ${ws.endTime}` : ws.time}</span>
                                  </div>

                                  {wsSoldOut ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1 shadow-2xs">
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
                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

        {/* Barra inferior de ações do modal */}
        <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 px-5 md:px-7 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center justify-between w-full sm:w-auto gap-4">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-gray-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>{tempSelected.length} {tempSelected.length === 1 ? 'workshop selecionado' : 'workshops selecionados'}</span>
              </span>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                {selectedWorkshopsTotal > 0 ? `Adicional de R$ ${selectedWorkshopsTotal.toFixed(2)}` : 'Sem custo adicional'}
              </span>
            </div>

            {tempSelected.length > 0 && !isReadOnly && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                title="Limpar todos os workshops selecionados"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar seleção</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Seleção ({tempSelected.length})</span>
            </button>
          </div>

        </div>

      </div>

    </div>,
    document.body
  );
}
