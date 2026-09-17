import React, { useState } from 'react';
import { User, Event, Workshop, Enrollment, Attendance, Certificate } from '../../types';
import { 
  ClipboardList, 
  CheckSquare, 
  Square, 
  FileText, 
  QrCode, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  Award, 
  Users, 
  Clock, 
  BookOpen, 
  Filter, 
  UserCheck, 
  Tag, 
  Printer, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Camera,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { DB } from '../utils/db';
import { THEME } from '../styles/designSystem';
import EventGrid from './EventGrid';
import AttendanceSheetPrintModal from './AttendanceSheetPrintModal';
import BadgeLabelsPrintModal from './BadgeLabelsPrintModal';
import FrequencyReportPrintModal from './FrequencyReportPrintModal';
import QrCameraScannerModal from './QrCameraScannerModal';
import { exportFrequencyReportExcel } from '../utils/frequencyExport';

interface DashboardOrganizadorProps {
  currentUser: User;
  events: Event[];
  workshops: Workshop[];
  enrollments: Enrollment[];
  attendances: Attendance[];
  certificates: Certificate[];
  onDataChanged: () => void;
  onOpenCertificate: (cert: Certificate) => void;
  onSelectEvent?: (id: string) => void;
  searchQuery?: string;
  activeTab?: 'EVENTOS' | 'PRESENCAS' | 'RELATORIOS' | 'MEUS_INGRESSOS';
  onTabChange?: (tab: 'EVENTOS' | 'PRESENCAS' | 'RELATORIOS' | 'MEUS_INGRESSOS') => void;
}

export default function DashboardOrganizador({
  currentUser,
  events,
  workshops,
  enrollments,
  attendances,
  certificates,
  onDataChanged,
  onOpenCertificate,
  onSelectEvent,
  searchQuery,
  activeTab: controlledActiveTab,
  onTabChange
}: DashboardOrganizadorProps) {
  // Abas principais
  const [internalTab, setInternalTab] = useState<'EVENTOS' | 'PRESENCAS' | 'RELATORIOS' | 'MEUS_INGRESSOS'>('EVENTOS');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;

  const setActiveTab = (tab: 'EVENTOS' | 'PRESENCAS' | 'RELATORIOS' | 'MEUS_INGRESSOS') => {
    setInternalTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Contexto do evento e da grade selecionados para presença
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    return events.length > 0 ? events[0].id : '';
  });
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('GERAL');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [quickCheckinInput, setQuickCheckinInput] = useState('');
  const [quickCheckinFeedback, setQuickCheckinFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Ingressos e modal de QR Code das inscrições pessoais
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<string | null>(null);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<Enrollment | null>(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState<Record<string, boolean>>({});

  const toggleTicketExpand = (id: string) => {
    setExpandedTicketIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const [isPrintingAttendance, setIsPrintingAttendance] = useState(false);
  const [isPrintingFrequencyReport, setIsPrintingFrequencyReport] = useState(false);
  const [isPrintingBadgeLabels, setIsPrintingBadgeLabels] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Seletor de evento do relatório
  const [selectedReportEventId, setSelectedReportEventId] = useState<string>(() => {
    return events.length > 0 ? events[0].id : '';
  });

  // Inscrições pessoais do organizador com unicidade garantida
  const myEnrollments = Array.from(
    new Map(
      enrollments
        .filter(e => e.userId === currentUser.id && e.status !== 'CANCELADO')
        .map(e => [e.id, e])
    ).values()
  );

  // Verifica a presença pessoal
  const isCheckedInForEvent = (eventId: string) => {
    return attendances.some(a => a.userId === currentUser.id && a.eventId === eventId && !a.workshopId);
  };

  const isCheckedInForWorkshop = (eventId: string, wsId: string) => {
    return attendances.some(a => a.userId === currentUser.id && a.eventId === eventId && a.workshopId === wsId);
  };

  // Objeto do evento selecionado
  const activeEventObj = events.find(e => e.id === selectedEventId) || events[0];
  const activeEventWorkshops = selectedEventId ? workshops.filter(w => w.eventId === selectedEventId) : [];

  // Inscrições do evento ativo
  const currentParticipants = selectedEventId ? (() => {
    const eventEnrolls = enrollments.filter(en => en.eventId === selectedEventId && en.status !== 'CANCELADO');
    if (selectedWorkshopId === 'GERAL') {
      return eventEnrolls;
    } else {
      return eventEnrolls.filter(en => en.selectedWorkshops.includes(selectedWorkshopId));
    }
  })() : [];

  // Filtrado pela busca
  const filteredParticipants = currentParticipants.filter(p => {
    if (!studentSearchQuery.trim()) return true;
    const q = studentSearchQuery.toLowerCase();
    return (
      p.userName.toLowerCase().includes(q) ||
      p.userEmail.toLowerCase().includes(q) ||
      (p.userRa && p.userRa.toLowerCase().includes(q)) ||
      p.id.toLowerCase().includes(q)
    );
  });

  // Cálculos dos indicadores-chave
  const totalInscriptions = currentParticipants.length;
  const presentCount = currentParticipants.filter(p => 
    attendances.some(a => a.userId === p.userId && a.eventId === selectedEventId && (selectedWorkshopId === 'GERAL' ? !a.workshopId : a.workshopId === selectedWorkshopId))
  ).length;
  const missingCount = totalInscriptions - presentCount;
  const presencePercentage = totalInscriptions > 0 ? Math.round((presentCount / totalInscriptions) * 100) : 0;

  // Manipulador para alternar o credenciamento
  const handleToggleCheckin = (participantEmail: string, userId: string) => {
    if (!selectedEventId) return;
    try {
      const activeWs = selectedWorkshopId === 'GERAL' ? undefined : selectedWorkshopId;
      const alreadyChecked = attendances.find(
        a => a.userId === userId && a.eventId === selectedEventId && a.workshopId === activeWs
      );

      if (alreadyChecked) {
        DB.removeAttendance(alreadyChecked.id, currentUser);
        setQuickCheckinFeedback({
          type: 'info',
          message: `Presença de ${participantEmail} removida com sucesso.`
        });
      } else {
        DB.registerAttendance(userId, selectedEventId, activeWs, currentUser);
        setQuickCheckinFeedback({
          type: 'success',
          message: `✓ Presença confirmada para ${participantEmail}!`
        });
      }
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar lista de presença.');
    }
  };

  // Scanner de credenciamento rápido ou entrada de texto (ID do ingresso, RA ou e-mail)
  const handleQuickCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCheckinInput.trim() || !selectedEventId) return;

    const term = quickCheckinInput.trim().toLowerCase();
    const activeWs = selectedWorkshopId === 'GERAL' ? undefined : selectedWorkshopId;

    // Pesquisa entre os participantes do evento atual
    const match = currentParticipants.find(p => 
      p.id.toLowerCase() === term ||
      p.userEmail.toLowerCase() === term ||
      (p.userRa && p.userRa.toLowerCase() === term) ||
      p.userName.toLowerCase().includes(term)
    );

    if (!match) {
      setQuickCheckinFeedback({
        type: 'error',
        message: `Inscrição não localizada para o código/RA/e-mail "${quickCheckinInput}" neste evento/workshop.`
      });
      return;
    }

    // Verifica se já houve credenciamento
    const alreadyChecked = attendances.find(
      a => a.userId === match.userId && a.eventId === selectedEventId && a.workshopId === activeWs
    );

    if (alreadyChecked) {
      setQuickCheckinFeedback({
        type: 'info',
        message: `Aluno(a) "${match.userName}" já estava com presença confirmada anteriormente.`
      });
      setQuickCheckinInput('');
      return;
    }

    try {
      DB.registerAttendance(match.userId, selectedEventId, activeWs, currentUser);
      setQuickCheckinFeedback({
        type: 'success',
        message: `✓ SUCESSO: Presença registrada para "${match.userName}" (${match.userEmail})!`
      });
      setQuickCheckinInput('');
      onDataChanged();
    } catch (err: any) {
      setQuickCheckinFeedback({
        type: 'error',
        message: err.message || 'Erro ao registrar presença.'
      });
    }
  };

  return (
    <div id="dashboard-top" className="max-w-7xl mx-auto px-4 md:px-8 mt-10 py-2 select-none selection:bg-blue-600 selection:text-white">
      
      {/* Cabeçalho dos seletores de abas */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-5 mb-8 gap-4">
        <div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest leading-none">ORGANIZADOR</span>
        </div>

        {/* Alternadores dos botões de ação */}
        <div className="flex bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 p-1.5 rounded-xl gap-2 text-xs font-bold w-full md:w-auto shadow-3xs flex-wrap md:flex-nowrap">
          <button 
            type="button"
            onClick={() => setActiveTab('EVENTOS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'EVENTOS' ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}
          >
            Eventos
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('PRESENCAS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'PRESENCAS' ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}
          >
            Credenciamento
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab('RELATORIOS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all ${activeTab === 'RELATORIOS' ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}
          >
            Frequência
          </button>
          
          <button 
            type="button"
            onClick={() => setActiveTab('MEUS_INGRESSOS')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 ${activeTab === 'MEUS_INGRESSOS' ? 'bg-white dark:bg-zinc-900 text-gray-800 dark:text-zinc-100 shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-700/50'}`}
          >
            <span>Minhas Inscrições</span>
            {myEnrollments.length > 0 && (
              <span className="bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {myEnrollments.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ABA 0: PRÓXIMOS EVENTOS (CATÁLOGO) */}
      {activeTab === 'EVENTOS' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <EventGrid 
            events={events}
            enrollments={enrollments}
            searchQuery={searchQuery || ''}
            onSelectEvent={(id) => onSelectEvent && onSelectEvent(id)}
            hideCreateEventBanner={true}
          />
        </div>
      )}

      {/* ABA 1: CONTROLE DE PRESENÇAS E CREDENCIAMENTO */}
      {activeTab === 'PRESENCAS' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Barra de controle superior: seleção de evento e ações de exportação */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="w-full md:w-auto flex-1 flex flex-col md:flex-row items-start md:items-center gap-3">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Selecionar Evento:</span>
              </label>
              
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setSelectedWorkshopId('GERAL');
                  setQuickCheckinFeedback(null);
                }}
                className="w-full md:max-w-md bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 font-bold focus:border-indigo-600 focus:bg-white outline-none cursor-pointer shadow-3xs"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.status === 'PUBLICADO' ? 'Publicado' : ev.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Botões de exportação, download de PDF e emissão de etiquetas Pimaco */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!activeEventObj) {
                    alert('Selecione um evento válido para emitir as etiquetas.');
                    return;
                  }
                  setIsPrintingBadgeLabels(true);
                }}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                title="Gerar e imprimir folhas de etiquetas no padrão Pimaco"
              >
                <Tag className="w-4 h-4" />
                <span>Emitir Etiquetas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeEventObj) {
                    alert('Selecione um evento válido para baixar a lista de presença.');
                    return;
                  }
                  setIsPrintingAttendance(true);
                }}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                title="Visualizar e baixar lista de presença em PDF"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Lista de Presença</span>
              </button>
            </div>

          </div>

          {/* Barra de credenciamento rápido e scanner */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 md:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase text-gray-800 tracking-wider">
                Credenciamento Rápido (Leitor de Voucher / RA / E-mail)
              </h4>
            </div>

            <form onSubmit={handleQuickCheckinSubmit} className="flex flex-col lg:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Escaneie o código do QR Code, digite o RA ou e-mail do aluno..."
                  value={quickCheckinInput}
                  onChange={(e) => setQuickCheckinInput(e.target.value)}
                  className="w-full h-11 bg-gray-50 border border-gray-200 rounded-xl px-4 text-xs text-gray-800 placeholder-gray-400 font-semibold focus:border-indigo-600 focus:bg-white outline-none transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeEventObj) {
                      alert('Selecione um evento válido para abrir a câmera.');
                      return;
                    }
                    setIsCameraScannerOpen(true);
                  }}
                  className="flex-1 sm:flex-initial sm:w-48 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold uppercase text-xs tracking-wider px-4 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
                  title="Abrir câmera do celular ou webcam para escanear QR Code dos alunos"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Ler QR Code</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 sm:flex-initial sm:w-48 h-11 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold uppercase text-xs tracking-wider px-4 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Confirmar Presença</span>
                </button>
              </div>
            </form>

            {/* Alerta de retorno do credenciamento rápido */}
            {quickCheckinFeedback && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                quickCheckinFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : quickCheckinFeedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}>
                <span>{quickCheckinFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setQuickCheckinFeedback(null)}
                  className="text-gray-400 hover:text-gray-600 ml-2 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Linha de indicadores rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-gray-200 p-4 rounded-2xl shadow-xs">
            <div className="flex flex-col p-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Total de Inscritos</span>
              <span className="text-2xl font-black text-gray-800 mt-1">{totalInscriptions}</span>
              <span className="text-[10px] text-gray-400 mt-0.5">Inscrições ativas</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 pl-4 p-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Presentes (Check-in)</span>
              <span className="text-2xl font-black text-emerald-600 mt-1">{presentCount}</span>
              <span className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">Credenciados no local</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 pl-4 p-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Faltantes</span>
              <span className="text-2xl font-black text-amber-600 mt-1">{missingCount}</span>
              <span className="text-[10px] text-amber-600/80 mt-0.5 font-medium">Aguardando entrada</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 pl-4 p-2">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Taxa de Presença</span>
              <span className="text-2xl font-black text-indigo-600 mt-1">{presencePercentage}%</span>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${presencePercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Sub-abas de grade e workshop */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
              Filtrar por Grade / Minicurso:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedWorkshopId('GERAL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  selectedWorkshopId === 'GERAL'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-3xs hover:border-gray-300'
                }`}
              >
                Presença Geral do Evento
              </button>
              
              {activeEventWorkshops.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => setSelectedWorkshopId(ws.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    selectedWorkshopId === ws.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 shadow-3xs hover:border-gray-300'
                  }`}
                >
                  ⚙ {ws.name} ({ws.time}h)
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de busca da tabela */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar lista por nome, RA ou e-mail do aluno..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:border-indigo-600 focus:bg-white outline-none font-medium"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {/* Tabela da interface de lista de presença */}
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white select-none">
              <div className="bg-gray-50 text-[10px] font-extrabold uppercase text-gray-500 p-3.5 flex border-b border-gray-200">
                <div className="w-12 text-center shrink-0">Presença</div>
                <div className="flex-1 pl-3">Participante / Cadastro</div>
                <div className="w-32 max-md:hidden pl-2">Status Pagamento</div>
                <div className="w-36 text-right shrink-0">Situação</div>
              </div>

              {filteredParticipants.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  {studentSearchQuery 
                    ? `Nenhum inscrito encontrado com o termo "${studentSearchQuery}".`
                    : 'Não há inscrições ativas para o filtro selecionado.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-150 max-h-[450px] overflow-y-auto">
                  {filteredParticipants.map((en) => {
                    const isChecked = attendances.some(
                      a => a.userId === en.userId && a.eventId === selectedEventId && (selectedWorkshopId === 'GERAL' ? !a.workshopId : a.workshopId === selectedWorkshopId)
                    );
                    const isPaid = en.status === 'APROVADO';

                    return (
                      <div
                        key={en.id}
                        onClick={() => handleToggleCheckin(en.userEmail, en.userId)}
                        className={`p-3.5 flex items-center hover:bg-indigo-50/40 transition-all cursor-pointer border-b border-gray-150/70 group ${
                          isChecked ? 'bg-emerald-50/30' : ''
                        }`}
                      >
                        {/* Caixa de seleção */}
                        <div className="w-12 flex items-center justify-center shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-indigo-600 transition-colors" />
                          )}
                        </div>

                        {/* Nome e credenciais */}
                        <div className="flex-1 pl-3 flex flex-col gap-0.5 truncate font-bold">
                          <span className="text-xs text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {en.userName}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono font-medium">
                            RA: {en.userRa || 'Sem RA'} • {en.userEmail}
                          </span>
                        </div>

                        {/* Status do pagamento */}
                        <div className="w-32 pl-2 max-md:hidden">
                          {isPaid ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Confirmado
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Pendente
                            </span>
                          )}
                        </div>

                        {/* Indicador de presença */}
                        <div className="w-36 text-right shrink-0">
                          {isChecked ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200">
                              ✓ Presente
                            </span>
                          ) : (
                            <span className="bg-gray-100 text-gray-500 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-gray-200 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-colors">
                              Clique p/ Check-in
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span>Mostrando {filteredParticipants.length} de {totalInscriptions} inscritos</span>
              <span className="text-indigo-600 font-medium">Clique em qualquer linha para alternar presença</span>
            </div>

          </div>

        </div>
      )}

      {/* ABA 2: RELATÓRIO DE FREQUÊNCIA */}
      {activeTab === 'RELATORIOS' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6 animate-fade-in shadow-xs">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
            <div>
              <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Relatório de Frequência</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedReportEventId}
                onChange={(e) => setSelectedReportEventId(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs text-gray-800 font-bold focus:border-indigo-600 outline-none cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  const reportEvent = events.find(e => e.id === (selectedReportEventId || (events.length > 0 ? events[0].id : '')));
                  if (reportEvent) {
                    exportFrequencyReportExcel(reportEvent, workshops, enrollments, attendances);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Exportar dados de frequência em planilha Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintingFrequencyReport(true)}
                className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Visualizar e baixar relatório de frequência em PDF"
              >
                <Download className="w-4 h-4" />
                <span>Baixar PDF</span>
              </button>
            </div>
          </div>

          {/* Tabela consolidada do relatório */}
          {(() => {
            const reportEvent = events.find(e => e.id === selectedReportEventId) || events[0];
            if (!reportEvent) return <div className="text-xs text-gray-400">Selecione um evento.</div>;

            const repWorkshops = workshops.filter(w => w.eventId === reportEvent.id);
            const repEnrollments = enrollments.filter(en => en.eventId === reportEvent.id && en.status !== 'CANCELADO');

            return (
              <div className="flex flex-col gap-6">
                
                {/* Faixa de resumo do evento */}
                <div className="bg-indigo-50/50 border border-indigo-150 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-indigo-600 uppercase font-black tracking-wider block">Evento Selecionado</span>
                    <h4 className="text-sm font-bold text-gray-900">{reportEvent.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{reportEvent.location} • {reportEvent.startDate.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Inscritos</span>
                      <span className="text-lg font-black text-gray-800">{repEnrollments.length}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Workshops</span>
                      <span className="text-lg font-black text-indigo-600">{repWorkshops.length}</span>
                    </div>
                  </div>
                </div>

                {/* Detalhamento da frequência por workshop */}
                {repWorkshops.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wider mb-3">
                      Frequência por Workshop:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {repWorkshops.map(ws => {
                        const wsEnrolls = repEnrollments.filter(en => en.selectedWorkshops.includes(ws.id));
                        const wsPresents = wsEnrolls.filter(en => 
                          attendances.some(a => a.userId === en.userId && a.eventId === reportEvent.id && a.workshopId === ws.id)
                        );
                        const pct = wsEnrolls.length > 0 ? Math.round((wsPresents.length / wsEnrolls.length) * 100) : 0;

                        return (
                          <div key={ws.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-3xs flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150">
                                {ws.startTime && ws.endTime ? `${ws.startTime} às ${ws.endTime}` : ws.time || 'Horário a definir'}
                              </span>
                              <h5 className="text-xs font-bold text-gray-800 mt-2 line-clamp-1">{ws.name}</h5>
                              <p className="text-[10px] text-gray-400 mt-0.5">Instrutor: {ws.instructor || 'Docente'}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="text-gray-500 text-[10px]">Presença:</span>
                                <span className="font-bold text-gray-800">{wsPresents.length} de {wsEnrolls.length} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Lista detalhada de presença dos alunos */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-gray-700 tracking-wider mb-3">
                    Lista de Participantes:
                  </h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                          <th className="p-3">Aluno</th>
                          <th className="p-3">RA</th>
                          <th className="p-3">Checkin</th>
                          <th className="p-3">Workshops</th>
                          <th className="p-3 text-center">Frequência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-150 font-medium text-gray-700">
                        {repEnrollments.map(en => {
                          const generalCheck = attendances.some(a => a.userId === en.userId && a.eventId === reportEvent.id && !a.workshopId);
                          const userWorkshops = en.selectedWorkshops || [];
                          const attendedWorkshopsCount = userWorkshops.filter(wsId => 
                            attendances.some(a => a.userId === en.userId && a.eventId === reportEvent.id && a.workshopId === wsId)
                          ).length;
                          const totalActivities = 1 + userWorkshops.length;
                          const totalAttended = (generalCheck ? 1 : 0) + attendedWorkshopsCount;
                          const frequencyPct = totalActivities > 0 ? Math.round((totalAttended / totalActivities) * 100) : 0;

                          return (
                            <tr key={en.id} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-900">{en.userName}</td>
                              <td className="p-3 font-mono text-[11px] text-gray-500">{en.userRa || '—'}</td>
                              <td className="p-3">
                                {generalCheck ? (
                                  <span className="text-emerald-600 font-bold">✓ Presente</span>
                                ) : (
                                  <span className="text-gray-400">Ausente</span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-gray-500">
                                {userWorkshops.length} workshop(s)
                              </td>
                              <td className="p-3 text-center font-bold text-xs">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold ${
                                  frequencyPct >= 75 
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                                    : frequencyPct >= 50 
                                    ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                                    : frequencyPct > 0 
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                                }`}>
                                  {frequencyPct}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      )}

      {/* ABA 3: MINHAS INSCRIÇÕES E CERTIFICADOS */}
      {activeTab === 'MEUS_INGRESSOS' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-xs">
            <h3 className="text-lg font-black uppercase text-gray-800 dark:text-zinc-100 tracking-tight flex items-center gap-2 mb-1.5">
              <ClipboardList className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Minhas</span>
              <span className="text-indigo-600 dark:text-indigo-400">Inscrições & Ingressos</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-5 pb-3 border-b border-gray-150 dark:border-zinc-800">
              Como organizador, você também pode participar dos eventos acadêmicos, acessar seus ingressos com QR Code e emitir certificados.
            </p>

            {myEnrollments.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 dark:bg-zinc-850/40 border border-gray-150 dark:border-zinc-800 rounded-2xl py-12">
                <AlertCircle className="w-10 h-10 text-gray-400 dark:text-zinc-500 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-200 font-bold text-sm">Você ainda não se inscreveu em nenhum evento</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Navegue pelos eventos disponíveis abaixo e realize sua inscrição.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {myEnrollments.map((en) => {
                  const ev = events.find(e => e.id === en.eventId);
                  const isApproved = en.status === 'APROVADO';
                  const isExpanded = !!expandedTicketIds[en.id];
                  
                  const isPresent = ev?.category === 'SEMANA ACADÊMICA'
                    ? (isCheckedInForEvent(en.eventId) || attendances.some(a => a.userId === currentUser.id && a.eventId === en.eventId && a.workshopId))
                    : isCheckedInForEvent(en.eventId);
                  
                  const cert = certificates.find(c => c.eventId === en.eventId);

                  return (
                    <div 
                      key={en.id} 
                      className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-indigo-300 dark:hover:border-zinc-700 transition-all flex flex-col"
                    >
                      {/* Cabeçalho do ingresso: sempre visível (recolhido por padrão) */}
                      <div 
                        onClick={() => toggleTicketExpand(en.id)}
                        className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-zinc-800/60 transition-colors select-none"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isApproved ? (
                              <span className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">
                                INSCRIÇÃO CONFIRMADA
                              </span>
                            ) : (
                              <span className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">
                                AGUARDANDO CONFIRMAÇÃO
                              </span>
                            )}
                            
                            {isPresent ? (
                              <span className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">
                                PRESENÇA CONFIRMADA
                              </span>
                            ) : (
                              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded border border-gray-200 dark:border-zinc-700">
                                Aguardando Entrada
                              </span>
                            )}
                          </div>

                          <h4 className="text-gray-900 dark:text-zinc-100 font-bold text-sm leading-tight mt-1 truncate">{en.eventName}</h4>
                          {ev && (
                            <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 font-semibold">
                              Data: {ev.startDate.split('-').reverse().join('/')} • {ev.startTime}h • {ev.location}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-400 hidden sm:inline">
                            {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                          </span>
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Seção expansível: oculta quando recolhida */}
                      {isExpanded && (
                        <div className="border-t border-gray-150 dark:border-zinc-800 flex flex-col md:flex-row justify-between bg-white dark:bg-zinc-900 animate-fade-in">
                          <div className="p-4 md:p-5 flex-1 flex flex-col gap-3">
                            {/* Lista aninhada de workshops */}
                            {ev?.category === 'SEMANA ACADÊMICA' ? (
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Minicursos & Oficinas:</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectEvent) onSelectEvent(en.eventId);
                                    }}
                                    className="text-[10px] text-indigo-650 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 font-extrabold uppercase hover:underline cursor-pointer flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded"
                                  >
                                    {en.selectedWorkshops.length > 0 ? '✏️ Alterar Grade' : '➕ Escolher Grade'}
                                  </button>
                                </div>
                                {en.selectedWorkshops.length === 0 ? (
                                  <p className="text-[11px] text-gray-400 dark:text-zinc-400 italic mt-1">Nenhum minicurso selecionado para esta Semana Acadêmica.</p>
                                ) : (
                                  <div className="flex flex-col gap-1.5 mt-1.5">
                                    {en.selectedWorkshops.map(wsId => {
                                      const wsObj = workshops.find(w => w.id === wsId);
                                      const wsPresent = isCheckedInForWorkshop(en.eventId, wsId);
                                      if (!wsObj) return null;
                                      return (
                                        <div key={wsId} className="flex items-center justify-between text-xs text-gray-700 dark:text-zinc-300">
                                          <span className="truncate max-w-[200px] block">• {wsObj.name}</span>
                                          <span className={`text-[9px] font-bold ${wsPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                                            {wsPresent ? '✓ Presente' : 'Não credenciado'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              en.selectedWorkshops.length > 0 && (
                                <div>
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Minicursos Selecionados:</span>
                                  <div className="flex flex-col gap-1.5 mt-1">
                                    {en.selectedWorkshops.map(wsId => {
                                      const wsObj = workshops.find(w => w.id === wsId);
                                      const wsPresent = isCheckedInForWorkshop(en.eventId, wsId);
                                      if (!wsObj) return null;
                                      return (
                                        <div key={wsId} className="flex items-center justify-between text-xs text-gray-700 dark:text-zinc-300">
                                          <span className="truncate max-w-[200px] block">• {wsObj.name}</span>
                                          <span className={`text-[9px] font-bold ${wsPresent ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                                            {wsPresent ? '✓ Presente' : 'Não credenciado'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )
                            )}
                          </div>

                          {/* Botões de ação do ingresso à direita */}
                          <div className="p-4 md:p-5 bg-gray-50 dark:bg-zinc-950/40 border-t md:border-t-0 md:border-l border-gray-150 dark:border-zinc-800 flex flex-col justify-center gap-2 md:w-56 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicketForQr(en.id);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Ver QR Code</span>
                            </button>

                            {cert && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenCertificate(cert);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Visualizar Certificado</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnrollmentToCancel(en);
                              }}
                              className="bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 w-full shadow-3xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Modal sobreposto do QR Code ampliado */}
      {selectedTicketForQr && (() => {
        const ticket = myEnrollments.find(e => e.id === selectedTicketForQr);
        if (!ticket) return null;
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center text-center max-w-sm w-full shadow-2xl relative animate-scale-in text-gray-800">
              <button 
                onClick={() => setSelectedTicketForQr(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 cursor-pointer text-xs font-bold p-1"
              >
                ✕
              </button>
              
              <h4 className="text-gray-950 font-extrabold text-sm uppercase tracking-tight mb-1">Entrada Credencial</h4>
              <p className="text-[10px] text-gray-500 mb-4">{ticket.eventName}</p>

              <div className="relative bg-white p-4 rounded-xl border border-gray-200 shadow-inner mb-4 overflow-hidden group">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=1e293b&data=${encodeURIComponent(ticket.id)}`} 
                  alt="Digital Checkin QR Code"
                  className="w-40 h-40 object-contain select-none"
                  referrerPolicy="no-referrer"
                />
              </div>

              <span className="text-xs font-mono font-black text-gray-700 bg-gray-100 py-1 px-3 rounded-md uppercase">
                ID: {ticket.id.toUpperCase()}
              </span>
              
              <p className="text-[10px] text-gray-500 mt-3.5 max-w-[250px] leading-relaxed">
                Apresente este código na entrada para registro da sua presença.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Caixa de diálogo para cancelar inscrição */}
      {enrollmentToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full shadow-xl animate-scale-in">
            <div className="text-center">
              <span className="text-4xl block mb-3">🛑</span>
              <h4 className="text-gray-900 font-extrabold text-sm uppercase tracking-wider">
                Cancelar Inscrição
              </h4>
              <p className="text-gray-600 text-xs mt-3 leading-relaxed">
                Tem certeza que deseja cancelar sua inscrição no evento <strong>"{enrollmentToCancel.eventName}"</strong>?
              </p>
            </div>

            <div className="mt-6 flex gap-3 justify-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setEnrollmentToCancel(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-[10px] tracking-wider py-3 px-4 rounded-xl cursor-pointer transition-colors text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    DB.updateEnrollmentStatus(enrollmentToCancel.id, 'CANCELADO', currentUser);
                    setEnrollmentToCancel(null);
                    onDataChanged();
                  } catch (err: any) {
                    alert(err.message || 'Erro ao cancelar inscrição.');
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase text-[10px] tracking-wider py-3 px-4 rounded-xl cursor-pointer transition-colors shadow-xs text-center flex items-center justify-center gap-1"
              >
                Cancelar Inscrição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de impressão da lista de presença */}
      {isPrintingAttendance && activeEventObj && (
        <AttendanceSheetPrintModal
          event={activeEventObj}
          workshops={workshops}
          enrollments={enrollments}
          attendances={attendances}
          onClose={() => setIsPrintingAttendance(false)}
        />
      )}

      {/* Modal de impressão das etiquetas Pimaco A4356 */}
      {isPrintingBadgeLabels && activeEventObj && (
        <BadgeLabelsPrintModal
          event={activeEventObj}
          enrollments={enrollments}
          onClose={() => setIsPrintingBadgeLabels(false)}
        />
      )}

      {/* Modal de impressão do relatório de frequência */}
      {isPrintingFrequencyReport && (() => {
        const reportEvent = events.find(e => e.id === selectedReportEventId) || activeEventObj;
        if (!reportEvent) return null;
        return (
          <FrequencyReportPrintModal
            event={reportEvent}
            workshops={workshops}
            enrollments={enrollments}
            attendances={attendances}
            onClose={() => setIsPrintingFrequencyReport(false)}
          />
        );
      })()}

      {/* Modal do scanner de câmera para QR Code */}
      {isCameraScannerOpen && activeEventObj && (
        <QrCameraScannerModal
          event={activeEventObj}
          selectedWorkshopId={selectedWorkshopId}
          workshops={workshops}
          enrollments={enrollments}
          attendances={attendances}
          currentUser={currentUser}
          onClose={() => setIsCameraScannerOpen(false)}
          onDataChanged={onDataChanged}
        />
      )}

    </div>
  );
}
