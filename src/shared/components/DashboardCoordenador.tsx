import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { User, Event, Workshop, Enrollment, SystemLog, HomeBanner, UserRole, FinancialExpense, ExpenseCategory, Attendance, SmtpSettings } from '../../types';
import { ShieldCheck, BarChart4, ClipboardList, CheckCircle2, XCircle, Sliders, Settings, Users, LogIn, ChevronRight, Play, ToggleLeft, ToggleRight, Sparkles, Activity, FileSpreadsheet, TrendingUp, TrendingDown, DollarSign, FileText, Download, Trash2, Plus, Calculator, AlertCircle, AlertTriangle, RefreshCw, Edit2, Calendar, MapPin, BookOpen, QrCode, Printer, BarChart3, Mail, Send, Server, Key, Eye, EyeOff, Lock, Bell, Check, Globe, Ticket, Search, X, Camera, UserCheck, CheckSquare, Square, Tag, Image as ImageIcon, MoreVertical } from 'lucide-react';
import { DB } from '../utils/db';
import { THEME } from '../styles/designSystem';
import BannerUploadInput from './BannerUploadInput';
import AttendanceSheetPrintModal from './AttendanceSheetPrintModal';
import BadgeLabelsPrintModal from './BadgeLabelsPrintModal';
import QrCameraScannerModal from './QrCameraScannerModal';
import FrequencyReportPrintModal from './FrequencyReportPrintModal';
import VoucherManager from './VoucherManager';
import { exportFrequencyReportExcel } from '../utils/frequencyExport';

interface DashboardCoordenadorProps {
  currentUser: User;
  events: Event[];
  workshops: Workshop[];
  enrollments: Enrollment[];
  logs: SystemLog[];
  banners: HomeBanner[];
  systemUsers: User[];
  attendances: Attendance[];
  onDataChanged: () => void;
}

export default function DashboardCoordenador({
  currentUser,
  events,
  workshops,
  enrollments,
  logs,
  banners,
  systemUsers,
  attendances,
  onDataChanged
}: DashboardCoordenadorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'METRICS' | 'APPROVALS' | 'BANNERS' | 'AUDIT_LOGS' | 'USERS' | 'FINANCEIRO' | 'VOUCHERS' | 'CONFIGURACOES' | 'INSCRITOS' | 'EVENTOS' | 'CREDENCIAMENTO'>('METRICS');
  
  // Estados das sub-abas de eventos
  const [coordinatorEventTab, setCoordinatorEventTab] = useState<'LIST' | 'REPORTS'>('LIST');
  const [eventListFilter, setEventListFilter] = useState<'TODOS' | 'ANALISE' | 'PUBLICADO' | 'ENCERRADO'>('TODOS');
  const [isEditingEventId, setIsEditingEventId] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventToClose, setEventToClose] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  const [deleteEventError, setDeleteEventError] = useState<string | null>(null);

  const [workshopToDelete, setWorkshopToDelete] = useState<Workshop | null>(null);
  const [isDeletingWorkshop, setIsDeletingWorkshop] = useState(false);
  const [deleteWorkshopError, setDeleteWorkshopError] = useState<string | null>(null);

  const [expenseToDelete, setExpenseToDelete] = useState<FinancialExpense | null>(null);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<Enrollment | null>(null);
  const [enrollmentToRevert, setEnrollmentToRevert] = useState<Enrollment | null>(null);

  // Estado do formulário de criação de evento
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventBanner, setNewEventBanner] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventStartDate, setNewEventStartDate] = useState('');
  const [newEventEndDate, setNewEventEndDate] = useState('');
  const [newEventStartTime, setNewEventStartTime] = useState('19:00');
  const [newEventEndTime, setNewEventEndTime] = useState('22:00');
  const [newEventCategory, setNewEventCategory] = useState('PALESTRA');
  const [newEventMaxPart, setNewEventMaxPart] = useState(100);
  const [newEventPrice, setNewEventPrice] = useState(0);

  // Estado do formulário de edição de evento
  const [editEventName, setEditEventName] = useState('');
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventBanner, setEditEventBanner] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventStartDate, setEditEventStartDate] = useState('');
  const [editEventEndDate, setEditEventEndDate] = useState('');
  const [editEventStartTime, setEditEventStartTime] = useState('');
  const [editEventEndTime, setEditEventEndTime] = useState('');
  const [editEventCategory, setEditEventCategory] = useState('PALESTRA');
  const [editEventMaxPart, setEditEventMaxPart] = useState(100);
  const [editEventPrice, setEditEventPrice] = useState(0);

  // Estado do formulário de workshop na aba de eventos da coordenação
  const [showAddWsInCoordenador, setShowAddWsInCoordenador] = useState<string | null>(null); // armazena o eventId
  const [coorWsName, setCoorWsName] = useState('');
  const [coorWsDesc, setCoorWsDesc] = useState('');
  const [coorWsInstructor, setCoorWsInstructor] = useState('');
  const [coorWsDate, setCoorWsDate] = useState('2026-10-15');
  const [coorWsStartTime, setCoorWsStartTime] = useState('14:00');
  const [coorWsEndTime, setCoorWsEndTime] = useState('18:00');
  const [coorWsMaxVagas, setCoorWsMaxVagas] = useState(30);
  const [coorWsPrice, setCoorWsPrice] = useState(0);

  // Estado de edição de workshop na aba da coordenação
  const [editingWorkshopId, setEditingWorkshopId] = useState<string | null>(null);
  const [editWsName, setEditWsName] = useState('');
  const [editWsDesc, setEditWsDesc] = useState('');
  const [editWsInstructor, setEditWsInstructor] = useState('');
  const [editWsDate, setEditWsDate] = useState('2026-10-15');
  const [editWsStartTime, setEditWsStartTime] = useState('14:00');
  const [editWsEndTime, setEditWsEndTime] = useState('18:00');
  const [editWsMaxVagas, setEditWsMaxVagas] = useState(30);
  const [editWsPrice, setEditWsPrice] = useState(0);

  const handleStartEditWorkshop = (ws: Workshop) => {
    setEditingWorkshopId(ws.id);
    setEditWsName(ws.name);
    setEditWsDesc(ws.description);
    setEditWsInstructor(ws.instructor);
    setEditWsDate(ws.date);
    const parsedStart = ws.startTime || (ws.time?.includes(' às ') ? ws.time.split(' às ')[0] : ws.time) || '14:00';
    const parsedEnd = ws.endTime || (ws.time?.includes(' às ') ? ws.time.split(' às ')[1] : '18:00') || '18:00';
    setEditWsStartTime(parsedStart);
    setEditWsEndTime(parsedEnd);
    setEditWsMaxVagas(ws.maxParticipants);
    setEditWsPrice(ws.price);
  };

  // Estados dos filtros de inscritos por evento
  const [selectedEventIdForInscritos, setSelectedEventIdForInscritos] = useState<string>(events.length > 0 ? events[0].id : '');
  const [selectedWorkshopIdForInscritos, setSelectedWorkshopIdForInscritos] = useState<string>('GERAL');
  const [isPrintingAttendance, setIsPrintingAttendance] = useState(false);
  const [isPrintingFrequencyReport, setIsPrintingFrequencyReport] = useState(false);
  const [isPrintingBadgeLabels, setIsPrintingBadgeLabels] = useState(false);
  // Estados da sub-aba de credenciamento
  const [selectedCredEventId, setSelectedCredEventId] = useState<string>(events.length > 0 ? events[0].id : '');
  const [selectedCredWorkshopId, setSelectedCredWorkshopId] = useState<string>('GERAL');
  const [credStudentSearchQuery, setCredStudentSearchQuery] = useState('');
  const [credQuickCheckinInput, setCredQuickCheckinInput] = useState('');
  const [credQuickCheckinFeedback, setCredQuickCheckinFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isCredCameraScannerOpen, setIsCredCameraScannerOpen] = useState(false);

  // Objeto do evento ativo para credenciamento
  const effectiveCredEventId = selectedCredEventId || (events.length > 0 ? events[0].id : '');
  const activeCredEventObj = events.find(e => e.id === effectiveCredEventId) || events[0];
  const activeCredEventWorkshops = effectiveCredEventId ? workshops.filter(w => w.eventId === effectiveCredEventId) : [];

  // Inscrições do evento ativo de credenciamento
  const currentCredParticipants = effectiveCredEventId ? (() => {
    const eventEnrolls = enrollments.filter(en => en.eventId === effectiveCredEventId && en.status !== 'CANCELADO');
    if (selectedCredWorkshopId === 'GERAL') {
      return eventEnrolls;
    } else {
      return eventEnrolls.filter(en => en.selectedWorkshops && en.selectedWorkshops.includes(selectedCredWorkshopId));
    }
  })() : [];

  // Filtrado pela consulta de busca
  const filteredCredParticipants = currentCredParticipants.filter(p => {
    if (!credStudentSearchQuery.trim()) return true;
    const q = credStudentSearchQuery.toLowerCase();
    return (
      (p.userName && p.userName.toLowerCase().includes(q)) ||
      (p.userEmail && p.userEmail.toLowerCase().includes(q)) ||
      (p.userRa && p.userRa.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q))
    );
  });

  // Cálculos dos indicadores-chave
  const totalCredInscriptions = currentCredParticipants.length;
  const presentCredCount = currentCredParticipants.filter(p => 
    attendances.some(a => a.userId === p.userId && a.eventId === effectiveCredEventId && (selectedCredWorkshopId === 'GERAL' ? !a.workshopId : a.workshopId === selectedCredWorkshopId))
  ).length;
  const missingCredCount = Math.max(0, totalCredInscriptions - presentCredCount);
  const presenceCredPercentage = totalCredInscriptions > 0 ? Math.round((presentCredCount / totalCredInscriptions) * 100) : 0;

  // Manipulador para alternar o credenciamento
  const handleCredToggleCheckin = (participantEmail: string, userId: string) => {
    if (!effectiveCredEventId) return;
    try {
      const activeWs = selectedCredWorkshopId === 'GERAL' ? undefined : selectedCredWorkshopId;
      const alreadyChecked = attendances.find(
        a => a.userId === userId && a.eventId === effectiveCredEventId && a.workshopId === activeWs
      );

      if (alreadyChecked) {
        DB.removeAttendance(alreadyChecked.id, currentUser);
        setCredQuickCheckinFeedback({
          type: 'info',
          message: `Presença de ${participantEmail} removida com sucesso.`
        });
      } else {
        DB.registerAttendance(userId, effectiveCredEventId, activeWs, currentUser);
        setCredQuickCheckinFeedback({
          type: 'success',
          message: `✓ Presença confirmada para ${participantEmail}!`
        });
      }
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar lista de presença.');
    }
  };

  // Scanner de credenciamento rápido ou entrada de texto
  const handleCredQuickCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!credQuickCheckinInput.trim() || !effectiveCredEventId) return;

    const term = credQuickCheckinInput.trim().toLowerCase();
    const activeWs = selectedCredWorkshopId === 'GERAL' ? undefined : selectedCredWorkshopId;

    const match = currentCredParticipants.find(p => 
      (p.id && p.id.toLowerCase() === term) ||
      (p.userEmail && p.userEmail.toLowerCase() === term) ||
      (p.userRa && p.userRa.toLowerCase() === term) ||
      (p.userName && p.userName.toLowerCase().includes(term))
    );

    if (!match) {
      setCredQuickCheckinFeedback({
        type: 'error',
        message: `Inscrição não localizada para "${credQuickCheckinInput}" neste evento/workshop.`
      });
      return;
    }

    const alreadyChecked = attendances.find(
      a => a.userId === match.userId && a.eventId === effectiveCredEventId && a.workshopId === activeWs
    );

    if (alreadyChecked) {
      setCredQuickCheckinFeedback({
        type: 'info',
        message: `Participante "${match.userName}" já estava com presença confirmada anteriormente.`
      });
      setCredQuickCheckinInput('');
      return;
    }

    try {
      DB.registerAttendance(match.userId, effectiveCredEventId, activeWs, currentUser);
      setCredQuickCheckinFeedback({
        type: 'success',
        message: `✓ SUCESSO: Presença confirmada para "${match.userName}" (${match.userEmail})!`
      });
      setCredQuickCheckinInput('');
      onDataChanged();
    } catch (err: any) {
      setCredQuickCheckinFeedback({
        type: 'error',
        message: err.message || 'Erro ao registrar presença.'
      });
    }
  };


  // Estado do formulário de criação de banner
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200');
  const [newBannerLinkedEventId, setNewBannerLinkedEventId] = useState('');

  // Estados dos formulários financeiros
  const [expenseEventId, setExpenseEventId] = useState(events.length > 0 ? events[0].id : '');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('INFRAESTRUTURA');
  const [expenseValue, setExpenseValue] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState<'DESPESA' | 'ENTRADA'>('DESPESA');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('ALL');
  const [coordinatorPixKey, setCoordinatorPixKey] = useState(DB.getPixKey());
  const [coordinatorWhatsapp, setCoordinatorWhatsapp] = useState(DB.getWhatsapp());
  const [coordinatorSupportEmail, setCoordinatorSupportEmail] = useState(DB.getSupportEmail());
  const [coordinatorLoginBanner, setCoordinatorLoginBanner] = useState(DB.getLoginBannerImage());
  const [loginBannerSaveSuccess, setLoginBannerSaveSuccess] = useState(false);
  
  // Estados da configuração de SMTP
  const [smtpSettings, setSmtpSettings] = useState<SmtpSettings>(DB.getSmtpSettings());
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(currentUser.email || '');
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string; timestamp?: string; logs?: string[] } | null>(null);
  const [smtpSaveSuccess, setSmtpSaveSuccess] = useState(false);
  const [recebimentoSaveSuccess, setRecebimentoSaveSuccess] = useState(false);

  // Estados do relatório financeiro em PDF
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportEventId, setReportEventId] = useState<string>('ALL');

  // Estados do relatório de frequência de workshops em PDF
  const [selectedReportEventId, setSelectedReportEventId] = useState<string>(() => events.length > 0 ? events[0].id : '');

  // Estados da busca e dos filtros do diretório de usuários
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Menu de três pontos e ações de gerenciamento de usuários (alteração forçada de senha e exclusão)
  const [activeUserMenuId, setActiveUserMenuId] = useState<string | null>(null);
  const [forcePasswordUser, setForcePasswordUser] = useState<User | null>(null);
  const [newForcedPassword, setNewForcedPassword] = useState('');
  const [confirmForcedPassword, setConfirmForcedPassword] = useState('');
  const [showForcedPassword, setShowForcedPassword] = useState(false);
  const [showConfirmForcedPassword, setShowConfirmForcedPassword] = useState(false);
  const [forcedPasswordError, setForcedPasswordError] = useState<string | null>(null);
  const [isSubmittingForcedPassword, setIsSubmittingForcedPassword] = useState(false);
  const [isForcedPasswordSaved, setIsForcedPasswordSaved] = useState(false);

  const [deleteUserConfirm, setDeleteUserConfirm] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);

  // Fecha o menu de três pontos ao clicar fora dele
  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveUserMenuId(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Sincroniza as configurações de SMTP com o backend MySQL / Hostinger
  useEffect(() => {
    DB.fetchSmtpSettings().then(serverSettings => {
      if (serverSettings && serverSettings.host) {
        setSmtpSettings(prev => ({
          ...prev,
          ...serverSettings,
          status: serverSettings.status || (serverSettings.isWorking ? 'working' : prev.status),
          isWorking: serverSettings.isWorking !== undefined ? serverSettings.isWorking : (serverSettings.status === 'working' ? true : prev.isWorking),
          // Preserva a senha local se o usuário estiver digitando uma
          pass: prev.pass || serverSettings.pass || ''
        }));
      }
    });

    // Sincroniza as configurações globais do sistema com o backend MySQL / Hostinger
    fetch('/api/settings')
      .then(res => res.json())
      .then(json => {
        if (json && json.success && json.data) {
          const s = json.data;
          if (s.pixKey) {
            setCoordinatorPixKey(s.pixKey);
            localStorage.setItem('cre_pix_key', s.pixKey);
          }
          if (s.whatsapp) {
            setCoordinatorWhatsapp(s.whatsapp);
            localStorage.setItem('cre_whatsapp', s.whatsapp);
          }
          if (s.supportEmail) {
            setCoordinatorSupportEmail(s.supportEmail);
            localStorage.setItem('cre_support_email', s.supportEmail);
          }
          if (s.loginBannerImage) {
            setCoordinatorLoginBanner(s.loginBannerImage);
            localStorage.setItem('cre_login_banner_image', s.loginBannerImage);
          }
          if (s.isSmtpWorking !== undefined || s.smtpStatus) {
            setSmtpSettings(prev => ({
              ...prev,
              isWorking: s.isSmtpWorking,
              status: s.smtpStatus || (s.isSmtpWorking ? 'working' : prev.status),
              lastTestedAt: s.smtpLastTestedAt || prev.lastTestedAt
            }));
          }
        }
      })
      .catch(() => {
        setCoordinatorPixKey(DB.getPixKey());
        setCoordinatorWhatsapp(DB.getWhatsapp());
        setCoordinatorSupportEmail(DB.getSupportEmail());
        setCoordinatorLoginBanner(DB.getLoginBannerImage());
      });
  }, []);


  const handleForcePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forcePasswordUser) return;

    if (newForcedPassword.length < 6) {
      setForcedPasswordError('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (newForcedPassword !== confirmForcedPassword) {
      setForcedPasswordError('As senhas digitadas não coincidem.');
      return;
    }

    setIsSubmittingForcedPassword(true);
    setForcedPasswordError(null);

    try {
      DB.updateUser(forcePasswordUser.id, { password: newForcedPassword }, currentUser);
      DB.addLog(
        'PASSWORD_FORCE_CHANGE',
        currentUser.email,
        currentUser.role,
        `Senha do usuário "${forcePasswordUser.name}" (${forcePasswordUser.email}) redefinida pelo administrador.`
      );
      onDataChanged();
      setIsSubmittingForcedPassword(false);
      setIsForcedPasswordSaved(true);

      setTimeout(() => {
        setIsForcedPasswordSaved(false);
        setForcePasswordUser(null);
        setNewForcedPassword('');
        setConfirmForcedPassword('');
      }, 1200);
    } catch (err: any) {
      setIsSubmittingForcedPassword(false);
      setIsForcedPasswordSaved(false);
      setForcedPasswordError(err.message || 'Erro ao alterar a senha do usuário.');
    }
  };

  const handleConfirmDeleteUser = () => {
    if (!deleteUserConfirm) return;

    setIsDeletingUser(true);
    setDeleteUserError(null);

    try {
      const isSelf = currentUser && currentUser.id === deleteUserConfirm.id;
      DB.deleteUser(deleteUserConfirm.id, currentUser);
      setDeleteUserConfirm(null);
      if (isSelf) {
        window.location.reload();
      } else {
        onDataChanged();
      }
    } catch (err: any) {
      setDeleteUserError(err.message || 'Erro ao apagar usuário.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Estados da busca e dos filtros de gerenciamento de inscrições
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState('');
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<'ALL' | 'PENDENTE' | 'APROVADO' | 'CANCELADO'>('ALL');

  // Aprovações aguardando validação
  const pendingEvents = events.filter(e => e.status === 'ANALISE');

  // Contagens gerais
  const totalParticipants = systemUsers.filter(u => u.role === 'PARTICIPANTE').length;
  const totalApprovedEventsCount = events.filter(e => e.status === 'PUBLICADO').length;

  // Cálculo da receita a partir das inscrições aprovadas
  const totalSimulatorEarnings = enrollments
    .filter(en => en.status === 'APROVADO')
    .reduce((sum, en) => sum + en.totalValue, 0);

  const handleApproveReject = (eventId: string, approve: boolean) => {
    try {
      DB.approveEvent(eventId, approve, currentUser);
      alert(approve ? 'Evento publicado com sucesso!' : 'Evento reprovado e removido do fluxo.');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao modificar status do evento.');
    }
  };

  const handleEditEventClickInCoordenador = (ev: Event) => {
    setIsEditingEventId(ev.id);
    setEditEventName(ev.name);
    setEditEventDesc(ev.description);
    setEditEventBanner(ev.banner);
    setEditEventLocation(ev.location);
    setEditEventStartDate(ev.startDate);
    setEditEventEndDate(ev.endDate);
    setEditEventStartTime(ev.startTime);
    setEditEventEndTime(ev.endTime);
    setEditEventCategory(ev.category);
    setEditEventMaxPart(ev.maxParticipants);
    setEditEventPrice(ev.price);
  };

  const handleStartCreateEvent = () => {
    setIsEditingEventId(null);
    setNewEventName('');
    setNewEventDesc('');
    setNewEventBanner('https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200');
    setNewEventLocation('');
    setNewEventStartDate('');
    setNewEventEndDate('');
    setNewEventStartTime('19:00');
    setNewEventEndTime('22:00');
    setNewEventCategory('PALESTRA');
    setNewEventMaxPart(100);
    setNewEventPrice(0);
    setIsCreatingEvent(true);
  };

  const handleCreateEventSubmitInCoordenador = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      DB.saveEvent({
        name: newEventName,
        description: newEventDesc,
        banner: newEventBanner,
        location: newEventLocation,
        startDate: newEventStartDate,
        endDate: newEventEndDate,
        startTime: newEventStartTime,
        endTime: newEventEndTime,
        category: newEventCategory,
        maxParticipants: Number(newEventMaxPart),
        isFeatured: false,
        price: Number(newEventPrice)
      }, currentUser);

      setIsCreatingEvent(false);
      alert('Novo evento cadastrado e publicado com sucesso pela coordenação!');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar o evento.');
    }
  };

  const handleEditEventSubmitInCoordenador = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingEventId) return;
    try {
      DB.updateEvent(isEditingEventId, {
        name: editEventName,
        description: editEventDesc,
        banner: editEventBanner,
        location: editEventLocation,
        startDate: editEventStartDate,
        endDate: editEventEndDate,
        startTime: editEventStartTime,
        endTime: editEventEndTime,
        category: editEventCategory,
        maxParticipants: Number(editEventMaxPart),
        price: Number(editEventPrice)
      }, currentUser);
      setIsEditingEventId(null);
      alert('Evento editado com sucesso!');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao editar o evento.');
    }
  };

  const handleAddWorkshopSubmitInCoordenador = (e: React.FormEvent, eventId: string) => {
    e.preventDefault();
    try {
      DB.saveWorkshop({
        eventId,
        name: coorWsName,
        description: coorWsDesc,
        instructor: coorWsInstructor,
        date: coorWsDate,
        startTime: coorWsStartTime,
        endTime: coorWsEndTime,
        time: `${coorWsStartTime} às ${coorWsEndTime}`,
        maxParticipants: Number(coorWsMaxVagas),
        price: Number(coorWsPrice)
      }, currentUser);

      setCoorWsName('');
      setCoorWsDesc('');
      setCoorWsInstructor('');
      setCoorWsPrice(0);
      setCoorWsStartTime('14:00');
      setCoorWsEndTime('18:00');
      setShowAddWsInCoordenador(null);
      alert('Workshop criado e vinculado com sucesso!');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao adicionar workshop.');
    }
  };

  const handleAddBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      DB.saveBanner({
        imageUrl: newBannerImage,
        title: newBannerTitle,
        subtitle: newBannerSubtitle,
        linkToEventId: newBannerLinkedEventId || undefined,
        isActive: true
      }, currentUser);

      setNewBannerTitle('');
      setNewBannerSubtitle('');
      setNewBannerLinkedEventId('');
      alert('Novo Banner cadastrado com sucesso!');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Ocorreu um erro.');
    }
  };

  const handleToggleBannerState = (bannerId: string) => {
    try {
      DB.toggleBanner(bannerId, currentUser);
      onDataChanged();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Auxiliar para formatar texto de data no padrão brasileiro
  const formatTimeBR = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} às ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}h`;
    } catch {
      return isoStr;
    }
  };

  // Carrega as despesas
  const allExpenses = DB.getExpenses();

  // Filtra as despesas do livro razão pelo evento escolhido
  const filteredLedgerExpenses = selectedEventFilter === 'ALL'
    ? allExpenses
    : allExpenses.filter(ex => ex.eventId === selectedEventFilter);

  // Funções auxiliares de consulta
  const getEventEnrollmentsRevenue = (eventId: string) => {
    return enrollments
      .filter(en => en.eventId === eventId && en.status === 'APROVADO')
      .reduce((sum, en) => sum + en.totalValue, 0);
  };

  const getEventExtraRevenues = (eventId: string) => {
    return allExpenses
      .filter(ex => ex.eventId === eventId && ex.type === 'ENTRADA')
      .reduce((sum, ex) => sum + ex.value, 0);
  };

  const getEventRevenue = (eventId: string) => {
    return getEventEnrollmentsRevenue(eventId) + getEventExtraRevenues(eventId);
  };

  const getEventExpenses = (eventId: string) => {
    return allExpenses
      .filter(ex => ex.eventId === eventId && ex.type === 'DESPESA')
      .reduce((sum, ex) => sum + ex.value, 0);
  };

  const getEventEnrollmentsCount = (eventId: string) => {
    return enrollments.filter(en => en.eventId === eventId && en.status === 'APROVADO').length;
  };

  // Totais agregados
  const totalEnrollmentRevenue = enrollments
    .filter(en => en.status === 'APROVADO')
    .reduce((sum, en) => sum + en.totalValue, 0);

  const totalFinancialRevenue = totalEnrollmentRevenue + allExpenses
    .filter(ex => ex.type === 'ENTRADA')
    .reduce((sum, ex) => sum + ex.value, 0);

  const totalFinancialExpenses = allExpenses
    .filter(ex => ex.type === 'DESPESA')
    .reduce((sum, ex) => sum + ex.value, 0);

  const netFinancialProfit = totalFinancialRevenue - totalFinancialExpenses;

  // Métodos manipuladores
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseEventId) {
      alert('Selecione um evento válido.');
      return;
    }
    const val = Number(expenseValue);
    if (!expenseValue || isNaN(val) || val <= 0) {
      alert('Digite um valor numérico de transação válido.');
      return;
    }
    const evt = events.find(ev => ev.id === expenseEventId);
    if (!evt) {
      alert('Evento não encontrado.');
      return;
    }

    try {
      DB.saveExpense({
        eventId: expenseEventId,
        eventName: evt.name,
        description: expenseDescription,
        category: expenseCategory,
        value: val,
        type: expenseType,
        date: expenseDate,
      }, currentUser);

      setExpenseDescription('');
      setExpenseValue('');
      alert(expenseType === 'ENTRADA' ? 'Entrada / Patrocínio registrado com sucesso!' : 'Gasto registrado com sucesso de forma consolidada!');
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar.');
    }
  };

  const handleDeleteExpenseClick = (id: string) => {
    const transaction = allExpenses.find(x => x.id === id);
    if (transaction) {
      setExpenseToDelete(transaction);
    }
  };

  const handleConfirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    try {
      DB.deleteExpense(expenseToDelete.id, currentUser);
      setExpenseToDelete(null);
      onDataChanged();
    } catch (err: any) {
      alert(err.message || 'Erro ao deletar lançamento.');
    }
  };

  const getCategoryColor = (cat: ExpenseCategory) => {
    switch(cat) {
      case 'INFRAESTRUTURA': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'REFEICAO': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MARKETING': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'PALESTRANTE': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SERVICOS': return 'bg-green-50 text-green-700 border-green-200';
      case 'PATROCINIO': return 'bg-amber-50 text-amber-700 border-amber-250';
      case 'APORTE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleExportLogsExcel = () => {
    try {
      const worksheetData = logs.map(l => {
        const dateStr = formatTimeBR(l.timestamp);
        return {
          'ID': l.id,
          'Ação': l.action,
          'Usuário (E-mail)': l.userEmail,
          'Cargo / Perfil': l.userRole,
          'Detalhes da Ação': l.details,
          'Data e Hora': dateStr,
          'Timestamp ISO': l.timestamp
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Ajusta automaticamente as larguras das colunas
      worksheet['!cols'] = [
        { wch: 16 }, // ID
        { wch: 22 }, // Ação
        { wch: 32 }, // Usuário (E-mail)
        { wch: 18 }, // Cargo / Perfil
        { wch: 50 }, // Detalhes da Ação
        { wch: 20 }, // Data e Hora
        { wch: 26 }  // Timestamp ISO
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Logs do Sistema');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `logs_do_sistema_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Erro ao exportar logs em Excel (.xlsx): ' + err.message);
    }
  };

  const handleExportFinancialExcel = () => {
    try {
      // 1. Balanço por evento
      const balanceData = events.map(evt => {
        const rev = getEventRevenue(evt.id);
        const exp = getEventExpenses(evt.id);
        const bal = rev - exp;
        const approvedCount = getEventEnrollmentsCount(evt.id);
        const statusResult = bal > 0 ? 'Saldo positivo' : bal < 0 ? 'Saldo negativo' : 'Equilibrado';

        return {
          'Evento': evt.name,
          'Categoria': evt.category,
          'Status do Evento': evt.status,
          'Inscrições Aprovadas': approvedCount,
          'Receita Bruta (R$)': Number(rev.toFixed(2)),
          'Total Despesas (R$)': Number(exp.toFixed(2)),
          'Saldo Líquido (R$)': Number(bal.toFixed(2)),
          'Situação Financeira': statusResult
        };
      });

      // 2. Livro razão detalhado (lançamentos)
      const expensesData = allExpenses.map(exp => {
        return {
          'ID Lançamento': exp.id,
          'Evento Relacionado': exp.eventName,
          'Descrição': exp.description,
          'Tipo': exp.type === 'ENTRADA' ? 'Entrada / Patrocínio' : 'Despesa',
          'Categoria': exp.category,
          'Valor (R$)': Number(exp.value.toFixed(2)),
          'Data do Lançamento': exp.date,
          'Data do Registro': exp.createdAt
        };
      });

      const wsBalance = XLSX.utils.json_to_sheet(balanceData);
      wsBalance['!cols'] = [
        { wch: 32 }, // Evento
        { wch: 22 }, // Categoria
        { wch: 18 }, // Status do Evento
        { wch: 22 }, // Inscrições Aprovadas
        { wch: 20 }, // Receita Bruta (R$)
        { wch: 20 }, // Total Despesas (R$)
        { wch: 20 }, // Saldo Líquido (R$)
        { wch: 20 }  // Situação Financeira
      ];

      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
      wsExpenses['!cols'] = [
        { wch: 16 }, // ID Lançamento
        { wch: 30 }, // Evento Relacionado
        { wch: 35 }, // Descrição
        { wch: 22 }, // Tipo
        { wch: 20 }, // Categoria
        { wch: 16 }, // Valor (R$)
        { wch: 18 }, // Data do Lançamento
        { wch: 22 }  // Data do Registro
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, wsBalance, 'Balanço por Evento');
      XLSX.utils.book_append_sheet(workbook, wsExpenses, 'Livro Razão (Lançamentos)');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `demonstrativo_financeiro_camporeal_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Erro ao exportar demonstrativo financeiro em Excel (.xlsx): ' + err.message);
    }
  };

  const handlePrintReport = (elementId: string, title: string) => {
    const el = document.getElementById(elementId);
    if (!el) {
      alert('Erro: área de relatório não encontrada.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('O bloqueador de pop-ups impediu a abertura da guia de impressão. Ative as permissões de pop-up ou abra o site fora do iframe.');
      return;
    }
    
    const htmlContent = el.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>\${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    emerald: {
                      50: '#ecfdf5',
                      100: '#d1fae5',
                      200: '#a7f3d0',
                      250: '#86efac',
                      600: '#059669',
                      700: '#047857',
                      800: '#065f46',
                      850: '#064e3b',
                    },
                    blue: {
                      600: '#2563eb',
                      700: '#1d4ed8',
                    }
                  }
                }
              }
            }
          </script>
          <style>
            body { 
              font-family: ui-sans-serif, system-ui, sans-serif;
              color: black;
              background-color: white;
            }
            @media screen {
              body {
                padding: 40px;
                background-color: #f3f4f6;
              }
              .print-container {
                max-width: 900px;
                margin: 0 auto;
                background-color: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
                border: 1px solid #e5e7eb;
              }
            }
            @media print {
              body {
                padding: 0;
                background-color: white;
              }
              .print-container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body class="bg-gray-100">
          <div class="no-print mb-6 flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl max-w-[900px] mx-auto">
            <div class="text-xs text-blue-800 font-medium">
              <span class="font-extrabold block">📄 Visualização Dinâmica do Relatório</span>
              Selecione o destino "Salvar como PDF" nas opções da sua impressora para transferir para o seu computador.
            </div>
            <div class="flex gap-2">
              <button onclick="window.print()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg cursor-pointer transition-colors shadow-sm">
                Confirmar Impressão / PDF 🖨️
              </button>
              <button onclick="window.close()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold uppercase tracking-wider py-2 px-4 rounded-lg cursor-pointer transition-colors border border-gray-300">
                Fechar Guia
              </button>
            </div>
          </div>
          
          <div class="print-container">
            \${htmlContent}
          </div>
          
          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 400);
            });
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 py-2 select-none selection:bg-blue-600 selection:text-white pb-12">
      
      {/* Seção introdutória */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-gray-200 pb-5 mb-8 gap-4">
        <div className="shrink-0">
          <span className="text-xs text-blue-600 font-extrabold uppercase tracking-widest leading-none">ADMINISTRAÇÃO</span>
        </div>

        {/* Botões de controle da navegação da coordenação */}
        <div className="flex bg-gray-100 border border-gray-200 p-1 rounded-xl text-xs font-bold w-full lg:w-auto overflow-x-auto lg:overflow-visible flex-nowrap gap-1 items-center max-w-full">
          <button 
            onClick={() => setActiveSubTab('METRICS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'METRICS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Métricas
          </button>
          <button 
            onClick={() => setActiveSubTab('APPROVALS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 relative ${activeSubTab === 'APPROVALS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Aprovações {pendingEvents.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-500 text-purple-950 font-black flex items-center justify-center rounded-full text-[9px]">{pendingEvents.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('USERS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'USERS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Usuários
          </button>
                    <button 
            onClick={() => setActiveSubTab('CREDENCIAMENTO')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'CREDENCIAMENTO' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Credenciamento
          </button>
          <button 
            onClick={() => setActiveSubTab('INSCRITOS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 relative ${activeSubTab === 'INSCRITOS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Inscrições
            {enrollments.filter(e => e.status === 'PENDENTE').length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 font-extrabold text-white flex items-center justify-center rounded-full text-[9px] animate-pulse">
                {enrollments.filter(e => e.status === 'PENDENTE').length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('EVENTOS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'EVENTOS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Gerenciar Eventos
          </button>
          <button 
            onClick={() => setActiveSubTab('FINANCEIRO')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'FINANCEIRO' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Gestão
          </button>
          <button 
            onClick={() => setActiveSubTab('VOUCHERS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'VOUCHERS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Vouchers
          </button>
          <button 
            onClick={() => setActiveSubTab('CONFIGURACOES')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${activeSubTab === 'CONFIGURACOES' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <span>Configurações Gerais</span>
            {(smtpSettings.status === 'working' || smtpSettings.isWorking === true) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-xs" title="Servidor SMTP Global Operacional" />
            )}
          </button>
          <button 
            onClick={() => setActiveSubTab('AUDIT_LOGS')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-colors whitespace-nowrap shrink-0 ${activeSubTab === 'AUDIT_LOGS' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Log
          </button>
        </div>
      </div>

      {/* SUBVISÃO 1: MÉTRICAS, ESTATÍSTICAS E GRÁFICOS ANALÍTICOS */}
      {activeSubTab === 'METRICS' && (
        <div className="flex flex-col gap-8 animate-fade-in text-gray-805">
          
          {/* Blocos rápidos de indicadores-chave */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold font-mono">Participantes</span>
                <span className="text-xl font-black text-gray-900">{totalParticipants}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center font-bold">
                <BarChart4 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold font-mono">Eventos Ativos</span>
                <span className="text-xl font-black text-gray-900">{totalApprovedEventsCount}</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold font-mono">Receita Ingressos</span>
                <span className="text-xl font-black text-green-600 font-mono">R$ {totalSimulatorEarnings.toFixed(2)}</span>
              </div>
            </div>

          </div>

          {/* Gráficos vetoriais analíticos (gráficos em CSS puro e SVG com acabamento refinado) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Módulo de gráfico 1: distribuição de eventos por categoria */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between h-[300px]">
              <div>
                <h4 className="text-gray-800 font-bold text-xs uppercase tracking-wider mb-1">Eventos por Categoria</h4>
              </div>

              {/* Gráfico de barras SVG responsivo */}
              <div className="flex-1 mt-4 relative flex items-end justify-between px-4 pb-4 gap-2">
                
                {/* Elemento visual de barra 1: palestra */}
                <div className="flex flex-col items-center flex-1 gap-2 group cursor-pointer">
                  <div className="text-[10px] font-mono font-bold text-blue-600 group-hover:block hidden absolute -top-1 animate-in fade-in transition-all">
                    {events.filter(e => e.category === 'PALESTRA').length} Eventos
                  </div>
                  <div 
                    style={{ height: `${(events.filter(e => e.category === 'PALESTRA').length / Math.max(events.length, 1)) * 140 + 10}px` }}
                    className="w-full max-w-[44px] bg-gradient-to-t from-blue-700/80 to-blue-600 rounded-t-lg group-hover:brightness-110 shadow shadow-blue-500/20"
                  ></div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold truncate tracking-tighter">Palestras</span>
                </div>

                {/* Elemento visual de barra 2: semana acadêmica */}
                <div className="flex flex-col items-center flex-1 gap-2 group cursor-pointer">
                  <div className="text-[10px] font-mono font-bold text-sky-600 group-hover:block hidden absolute -top-1 animate-in fade-in transition-all">
                    {events.filter(e => e.category === 'SEMANA ACADÊMICA').length} Eventos
                  </div>
                  <div 
                    style={{ height: `${(events.filter(e => e.category === 'SEMANA ACADÊMICA').length / Math.max(events.length, 1)) * 140 + 10}px` }}
                    className="w-full max-w-[44px] bg-gradient-to-t from-sky-600/80 to-sky-500 rounded-t-lg group-hover:brightness-110 shadow shadow-sky-500/20"
                  ></div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold truncate tracking-tighter">S. Acadêm</span>
                </div>

                {/* Elemento visual de barra 3: workshop */}
                <div className="flex flex-col items-center flex-1 gap-2 group cursor-pointer">
                  <div className="text-[10px] font-mono font-bold text-yellow-500 group-hover:block hidden absolute -top-1 animate-in fade-in transition-all">
                    {events.filter(e => e.category === 'WORKSHOP').length} Eventos
                  </div>
                  <div 
                    style={{ height: `${(events.filter(e => e.category === 'WORKSHOP').length / Math.max(events.length, 1)) * 140 + 10}px` }}
                    className="w-full max-w-[44px] bg-gradient-to-t from-yellow-500/80 to-yellow-500 rounded-t-lg group-hover:brightness-110 shadow shadow-yellow-500/20"
                  ></div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold truncate tracking-tighter">Workshops</span>
                </div>

                {/* Elemento visual de barra 4: congresso */}
                <div className="flex flex-col items-center flex-1 gap-2 group cursor-pointer">
                  <div className="text-[10px] font-mono font-bold text-gray-600 group-hover:block hidden absolute -top-1 animate-in fade-in transition-all">
                    {events.filter(e => e.category === 'CONGRESSO').length} Eventos
                  </div>
                  <div 
                    style={{ height: `${(events.filter(e => e.category === 'CONGRESSO').length / Math.max(events.length, 1)) * 140 + 10}px` }}
                    className="w-full max-w-[44px] bg-gradient-to-t from-gray-500/80 to-gray-400 rounded-t-lg group-hover:brightness-110 shadow shadow-gray-400/20"
                  ></div>
                  <span className="text-[9px] text-gray-500 uppercase font-bold truncate tracking-tighter">Congresso</span>
                </div>

              </div>

            </div>

            {/* Módulo de gráfico 2: visualização circular da proporção de credenciamentos */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5 flex flex-col justify-between h-[300px]">
              <div>
                <h4 className="text-gray-800 font-bold text-xs uppercase tracking-wider mb-1">Taxa de Inscrições</h4>
              </div>

              {/* Indicadores de progresso concêntricos */}
              <div className="flex-1 flex items-center justify-center p-4">
                
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Círculo externo */}
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
                  
                  {/* Sobreposição circular dinâmica do percentual */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="72" 
                      cy="72" 
                      r="66" 
                      stroke="#2563EB" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray="414"
                      // Proporção percentual de aprovações
                      strokeDashoffset={414 - (414 * (enrollments.filter(e => e.status === 'APROVADO').length / Math.max(enrollments.length, 1)))} 
                      strokeLinecap="round"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-gray-900 font-mono">
                      {Math.round((enrollments.filter(e => e.status === 'APROVADO').length / Math.max(enrollments.length, 1)) * 100)}%
                    </span>
                    <span className="text-[8px] text-gray-400 uppercase tracking-wider font-extrabold mt-0.5">Aprovadas</span>
                  </div>
                </div>

              </div>
              
              <div className="flex items-center justify-around text-[10px] font-mono text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600"></span>
                  <span>{enrollments.filter(e => e.status === 'APROVADO').length} Aprovadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gray-200"></span>
                  <span>{enrollments.filter(e => e.status === 'PENDENTE').length} Pendentes</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* SUBVISÃO 2: SEÇÃO DE VALIDAÇÃO DE APROVAÇÕES */}
      {activeSubTab === 'APPROVALS' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs animate-fade-in flex flex-col gap-4">
          <div>
            <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider mb-1">Aprovações Pendentes</h3>
            <p className="text-xs text-gray-500">Eventos criados aguardando aprovação da coordenação.</p>
          </div>

          {pendingEvents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-gray-150 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
              <h4 className="text-gray-800 font-bold text-sm">Nenhum evento em análise no momento</h4>
              <p className="text-xs text-gray-400 mt-1">Todos os eventos publicados estão de acordo com as diretrizes do colegiado de curso.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingEvents.map((pe) => (
                <div 
                  key={pe.id}
                  className="bg-white border border-gray-250 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-gray-350"
                >
                  
                  {/* Capa da foto e itens de descrição */}
                  <div className="flex gap-4 items-start flex-1 min-w-0">
                    <img 
                      src={pe.banner} 
                      alt={pe.name} 
                                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                    />
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-[9px] text-blue-600 font-extrabold uppercase bg-blue-50 px-2 py-0.5 rounded-full w-fit">{pe.category}</span>
                      <h4 className="text-gray-800 font-bold text-xs truncate leading-tight mt-0.5">{pe.name}</h4>
                      <p className="text-[10px] text-gray-500 leading-normal line-clamp-2 mt-0.5">{pe.description}</p>
                      <div className="flex items-center gap-x-3 text-[10px] text-blue-600 font-semibold mt-1">
                        <span>Proponente: {pe.creatorName}</span>
                        <span>•</span>
                        <span>Local: {pe.location}</span>
                        <span>•</span>
                        <span>Limite: {pe.maxParticipants} vagas</span>
                      </div>
                    </div>
                  </div>

                  {/* Botões de aprovar e rejeitar */}
                  <div className="flex md:flex-col gap-2 shrink-0 max-md:w-full">
                    <button 
                      onClick={() => handleApproveReject(pe.id, true)}
                      className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white font-bold uppercase text-[9px] tracking-wider px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Aprovar</span>
                    </button>
                    <button 
                      onClick={() => handleApproveReject(pe.id, false)}
                      className="flex-1 md:flex-none border border-red-200 hover:bg-red-50 text-red-650 font-bold uppercase text-[9px] tracking-wider px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Reprovar</span>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>
      )}



      {/* SUBVISÃO 4: VISÃO DO DIRETÓRIO DE USUÁRIOS */}
      {activeSubTab === 'USERS' && (() => {
        const cleanSearch = userSearchTerm.trim().toLowerCase();
        const filteredUsers = systemUsers.filter((su) => {
          const matchesRole = userRoleFilter === 'ALL' || su.role === userRoleFilter;
          if (!matchesRole) return false;
          if (!cleanSearch) return true;

          const matchName = su.name?.toLowerCase().includes(cleanSearch);
          const matchEmail = su.email?.toLowerCase().includes(cleanSearch);
          const matchRa = su.ra ? su.ra.toLowerCase().includes(cleanSearch) : false;
          const matchCourse = su.course ? su.course.toLowerCase().includes(cleanSearch) : false;
          const matchInstitution = su.institution ? su.institution.toLowerCase().includes(cleanSearch) : false;

          return matchName || matchEmail || matchRa || matchCourse || matchInstitution;
        });

        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-5 animate-fade-in shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-4">
              <div>
                <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Usuários Cadastrados</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Pesquise e gerencie permissões de acesso e cargos dos usuários do sistema.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                  {filteredUsers.length} de {systemUsers.length} {systemUsers.length === 1 ? 'usuário' : 'usuários'}
                </span>
              </div>
            </div>

            {/* Barra de busca e filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Campo de busca */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, e-mail, RA, curso ou instituição..."
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 focus:bg-white rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none transition-all"
                />
                {userSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setUserSearchTerm('')}
                    title="Limpar busca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filtro de função */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as 'ALL' | UserRole)}
                  className="w-full sm:w-auto bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                >
                  <option value="ALL">Todos os Cargos</option>
                  <option value="PARTICIPANTE">Participantes</option>
                  <option value="ORGANIZADOR">Organizadores</option>
                  <option value="COORDENADOR">Coordenadores</option>
                  <option value="ROOT">Root (Super Admin)</option>
                </select>
              </div>
            </div>

            {/* Tabela de usuários */}
            <div className="border border-gray-200 rounded-xl bg-white mt-1">
              
              <div className="bg-gray-50 text-[10px] font-extrabold uppercase text-gray-600 p-3 flex items-center border-b border-gray-200 rounded-t-xl align-middle">
                <div className="flex-1 pl-2">Nome Completo</div>
                <div className="flex-1">E-mail</div>
                <div className="w-40 max-md:hidden">Curso</div>
                <div className="w-32 text-right">Nível</div>
                <div className="w-12 text-center">Ações</div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center justify-center">
                  <Users className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs font-bold text-gray-600">Nenhum usuário encontrado</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {userSearchTerm || userRoleFilter !== 'ALL'
                      ? 'Nenhum cadastro corresponde aos filtros informados.'
                      : 'Não há usuários cadastrados no momento.'}
                  </p>
                  {(userSearchTerm || userRoleFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserSearchTerm('');
                        setUserRoleFilter('ALL');
                      }}
                      className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                    >
                      Limpar filtros de busca
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-150 font-medium">
                  {filteredUsers.map((su) => (
                    <div key={su.id} className="p-3 flex items-center hover:bg-gray-50/50 transition-all text-xs leading-none">
                      
                      <div className="flex-1 flex items-center gap-2 pl-2">
                        <div className="w-6 h-6 rounded-full bg-gray-100 text-blue-600 font-black text-[10px] flex items-center justify-center shrink-0">
                          {su.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-800">{su.name} {su.ra && <span className="font-mono text-gray-400 font-normal text-[10px] ml-0.5">({su.ra})</span>}</span>
                      </div>

                      <div className="flex-1 text-gray-500 truncate pr-2 font-mono">
                        {su.email}
                      </div>

                      <div className="w-40 max-md:hidden text-gray-400 truncate mt-0.5" title={su.institution ? `${su.course || 'Administrativo'} • ${su.institution}` : (su.course || 'Administrativo')}>
                        <div className="truncate font-semibold text-gray-600">{su.course || 'Administrativo'}</div>
                        {su.institution && (
                          <div className="text-[10px] text-gray-400 truncate font-normal leading-tight">{su.institution}</div>
                        )}
                      </div>

                      <div className="w-32 text-right">
                        {su.role === 'ROOT' && currentUser.role !== 'ROOT' ? (
                          <span 
                            className="inline-block text-[10px] font-bold py-1 px-2 rounded-lg border font-mono bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 cursor-not-allowed select-none"
                            title="Apenas um usuário com nível ROOT pode alterar este usuário."
                          >
                            ROOT ⚡
                          </span>
                        ) : (
                          <select
                            value={su.role}
                            onChange={(e) => {
                              const newRole = e.target.value as UserRole;
                              if (newRole === 'ROOT' && currentUser.role !== 'ROOT') {
                                alert('Apenas o próprio ROOT pode conceder o cargo ROOT.');
                                return;
                              }
                              if (su.role === 'ROOT' && currentUser.role !== 'ROOT') {
                                alert('Apenas o próprio ROOT pode alterar o cargo de um usuário ROOT.');
                                return;
                              }
                              if (su.id === currentUser.id && newRole !== currentUser.role) {
                                if (!confirm(`Você está prestes a alterar o seu próprio cargo de ${currentUser.role} para ${newRole}. Tem certeza de que deseja prosseguir?`)) {
                                  return;
                                }
                              }
                              try {
                                DB.updateUser(su.id, { role: newRole }, currentUser);
                                onDataChanged();
                              } catch (err: any) {
                                alert(err.message || 'Erro ao alterar permissão.');
                              }
                            }}
                            className={`text-[10px] font-bold py-1 px-2 rounded-lg border outline-none cursor-pointer text-center font-mono ${
                              su.role === 'COORDENADOR' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' :
                              su.role === 'ROOT' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/90' :
                              su.role === 'ORGANIZADOR' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' :
                              'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                            }`}
                          >
                            <option value="PARTICIPANTE" className="bg-white text-blue-700">PARTICIPANTE</option>
                            <option value="ORGANIZADOR" className="bg-white text-indigo-700">ORGANIZADOR</option>
                            <option value="COORDENADOR" className="bg-white text-yellow-700">COORDENADOR</option>
                            {currentUser.role === 'ROOT' && (
                              <option value="ROOT" className="bg-white text-purple-700 font-bold">ROOT ⚡</option>
                            )}
                          </select>
                        )}
                      </div>

                      {/* 3-dots Menu - ROOT pode gerenciar qualquer usuário; COORDENADOR gerencia participantes e organizadores */}
                      <div className="w-12 flex justify-center items-center">
                        {currentUser.role === 'ROOT' || (currentUser.role === 'COORDENADOR' && su.role !== 'COORDENADOR' && su.role !== 'ROOT') ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveUserMenuId(activeUserMenuId === su.id ? null : su.id);
                              }}
                              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                                activeUserMenuId === su.id
                                  ? 'bg-blue-100 text-blue-700 shadow-xs'
                                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                              title="Mais opções do usuário"
                              aria-label={`Mais opções para ${su.name}`}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Menu suspenso */}
                            {activeUserMenuId === su.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in-50 zoom-in-95 duration-150"
                              >
                                <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
                                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Gerenciar Usuário</span>
                                  <div className="flex items-center justify-between gap-1 mt-0.5">
                                    <span className="text-[11px] font-bold text-gray-800 truncate block">{su.name}</span>
                                    {su.id === currentUser.id && (
                                      <span className="text-[8px] font-bold bg-amber-100 text-amber-800 px-1 py-0.5 rounded font-mono shrink-0">Você</span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setForcePasswordUser(su);
                                    setNewForcedPassword('');
                                    setConfirmForcedPassword('');
                                    setShowForcedPassword(false);
                                    setShowConfirmForcedPassword(false);
                                    setForcedPasswordError(null);
                                    setIsForcedPasswordSaved(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                >
                                  <Key className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                  <span>Alterar Senha</span>
                                </button>

                                <div className="h-px bg-gray-100 my-1" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveUserMenuId(null);
                                    setDeleteUserConfirm(su);
                                    setDeleteUserError(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>Apagar Usuário</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-7 h-7" />
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>

          </div>
        );
      })()}

      {/* SUBVISÃO PARA GERENCIAR INSCRITOS E APROVAR PAGAMENTOS MANUALMENTE */}
      {activeSubTab === 'INSCRITOS' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-6 animate-fade-in shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span>Inscrições</span>
            </h3>
            {selectedEventIdForInscritos && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintingAttendance(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[11px] tracking-wider py-2 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Emitir e baixar lista de presença em PDF"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>Lista de Presença (PDF)</span>
                </button>
              </div>
            )}
          </div>

          {/* Linha de filtros de seleção */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
            <div>
              <label className="text-[10px] font-extrabold uppercase text-gray-450 block mb-1">Selecione o Evento Ativo</label>
              <select
                value={selectedEventIdForInscritos}
                onChange={(e) => {
                  setSelectedEventIdForInscritos(e.target.value);
                  setSelectedWorkshopIdForInscritos('GERAL');
                }}
                className="w-full bg-white border border-gray-200 text-xs font-semibold py-2 px-3 rounded-lg outline-none text-gray-800 focus:border-blue-500 cursor-pointer"
              >
                {events.filter(e => e.status !== 'CANCELADO').map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.status === 'PUBLICADO' ? 'Ativo/Publicado' : evt.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold uppercase text-gray-450 block mb-1">Filtrar por Workshop</label>
              <select
                value={selectedWorkshopIdForInscritos}
                onChange={(e) => setSelectedWorkshopIdForInscritos(e.target.value)}
                className="w-full bg-white border border-gray-200 text-xs font-semibold py-2 px-3 rounded-lg outline-none text-gray-800 focus:border-blue-500 cursor-pointer"
                disabled={!selectedEventIdForInscritos}
              >
                <option value="GERAL">Geral (Todos os Inscritos no Evento)</option>
                {workshops.filter(w => w.eventId === selectedEventIdForInscritos).map(ws => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Indicadores de contagem do evento */}
          {(() => {
            const currentEvent = events.find(e => e.id === selectedEventIdForInscritos);
            if (!currentEvent) {
              return (
                <div className="text-center py-10 text-xs text-gray-400">
                  Nenhum evento ativo selecionado.
                </div>
              );
            }

            const currentWorkshop = selectedWorkshopIdForInscritos !== 'GERAL' 
              ? workshops.find(w => w.id === selectedWorkshopIdForInscritos) 
              : null;

            const totalEnrollmentForFilter = enrollments.filter(en => {
              if (en.eventId !== selectedEventIdForInscritos) return false;
              if (selectedWorkshopIdForInscritos !== 'GERAL') {
                return en.selectedWorkshops.includes(selectedWorkshopIdForInscritos);
              }
              return true;
            });

            const countTotal = totalEnrollmentForFilter.length;
            const countPending = totalEnrollmentForFilter.filter(en => en.status === 'PENDENTE').length;
            const countApproved = totalEnrollmentForFilter.filter(en => en.status === 'APROVADO').length;
            const limitMax = currentWorkshop ? currentWorkshop.maxParticipants : currentEvent.maxParticipants;

            const cleanEnrollmentSearch = enrollmentSearchTerm.trim().toLowerCase();
            const displayEnrollments = totalEnrollmentForFilter.filter(en => {
              const matchesStatus = enrollmentStatusFilter === 'ALL' || en.status === enrollmentStatusFilter;
              if (!matchesStatus) return false;
              if (!cleanEnrollmentSearch) return true;

              const matchName = en.userName?.toLowerCase().includes(cleanEnrollmentSearch);
              const matchEmail = en.userEmail?.toLowerCase().includes(cleanEnrollmentSearch);
              const matchRa = en.userRa ? en.userRa.toLowerCase().includes(cleanEnrollmentSearch) : false;
              const matchVoucher = en.voucherCode ? en.voucherCode.toLowerCase().includes(cleanEnrollmentSearch) : false;

              return matchName || matchEmail || matchRa || matchVoucher;
            });

            return (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex flex-col justify-between">
                    <span className="text-[9px] text-blue-800 uppercase tracking-wider font-extrabold font-mono">Filtro Ativo</span>
                    <span className="text-sm font-black text-blue-900 mt-1 truncate">
                      {currentWorkshop ? `WS: ${currentWorkshop.name}` : `Geral: ${currentEvent.name}`}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold font-mono">Inscritos Totais</span>
                    <span className="text-lg font-black text-gray-800 mt-1">{countTotal} / {limitMax}</span>
                  </div>

                  <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 flex flex-col justify-between">
                    <span className="text-[9px] text-amber-700 uppercase tracking-widest font-extrabold font-mono flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>Aprovações Pendentes</span>
                    </span>
                    <span className="text-lg font-black text-amber-700 mt-1">{countPending}</span>
                  </div>

                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/60 flex flex-col justify-between">
                    <span className="text-[9px] text-emerald-700 uppercase tracking-widest font-extrabold font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Inscrições Pagas</span>
                    </span>
                    <span className="text-lg font-black text-emerald-700 mt-1">{countApproved}</span>
                  </div>
                </div>

                {/* Barra de busca e filtros para inscrições */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {/* Campo de busca */}
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={enrollmentSearchTerm}
                      onChange={(e) => setEnrollmentSearchTerm(e.target.value)}
                      placeholder="Buscar inscrição por nome, e-mail, RA ou cupom..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 focus:bg-white rounded-xl pl-9 pr-9 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 outline-none transition-all"
                    />
                    {enrollmentSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setEnrollmentSearchTerm('')}
                        title="Limpar busca"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filtro de status */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <select
                      value={enrollmentStatusFilter}
                      onChange={(e) => setEnrollmentStatusFilter(e.target.value as 'ALL' | 'PENDENTE' | 'APROVADO' | 'CANCELADO')}
                      className="w-full sm:w-auto bg-gray-50 border border-gray-200 focus:border-blue-600 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 outline-none cursor-pointer"
                    >
                      <option value="ALL">Todas as Situações</option>
                      <option value="APROVADO">Pagas / Aprovadas</option>
                      <option value="PENDENTE">Pendentes de Pagamento</option>
                      <option value="CANCELADO">Canceladas</option>
                    </select>

                    <span className="text-[11px] font-mono font-bold text-gray-500 bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 whitespace-nowrap">
                      {displayEnrollments.length} de {totalEnrollmentForFilter.length}
                    </span>
                  </div>
                </div>

                {/* Listagem de dados da tabela de inscritos */}
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white mt-1">
                  <div className="bg-gray-50 text-[10px] font-extrabold uppercase text-gray-600 p-3.5 flex border-b border-gray-200 text-center items-center">
                    <div className="flex-1 text-center">Participante</div>
                    <div className="w-44 max-md:hidden text-center">Contato</div>
                    <div className="w-32 text-center">Valor Total</div>
                    <div className="w-28 text-center">Situação</div>
                    <div className="w-48 text-center">Ações</div>
                  </div>

                  {displayEnrollments.length === 0 ? (
                    <div className="text-center py-12 text-gray-450 font-medium text-xs bg-gray-50/50 flex flex-col items-center justify-center">
                      <ClipboardList className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="font-bold text-gray-600">Nenhuma inscrição encontrada</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {enrollmentSearchTerm || enrollmentStatusFilter !== 'ALL'
                          ? 'Nenhuma inscrição corresponde aos filtros informados.'
                          : 'Nenhuma inscrição encontrada para o evento ou workshop selecionado.'}
                      </p>
                      {(enrollmentSearchTerm || enrollmentStatusFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => {
                            setEnrollmentSearchTerm('');
                            setEnrollmentStatusFilter('ALL');
                          }}
                          className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
                        >
                          Limpar filtros de busca
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-150 font-medium divide-dashed">
                      {displayEnrollments.map((en) => (
                        <div key={en.id} className="p-3.5 flex items-center hover:bg-gray-50/30 transition-all text-xs">
                          
                          {/* Caixa do nome */}
                          <div className="flex-1 flex flex-col items-center justify-center text-center px-2 leading-tight">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                                {en.userName.charAt(0)}
                              </div>
                              <span className="font-bold text-gray-800 text-[13px]">{en.userName}</span>
                            </div>
                            <span className="text-[9px] text-gray-400 font-semibold uppercase mt-0.5">{en.selectedWorkshops.length} workshops selecionados</span>
                          </div>

                          {/* Caixa de e-mail e RA */}
                          <div className="w-44 max-md:hidden flex flex-col items-center justify-center text-center px-2 overflow-hidden leading-tight font-mono">
                            <span className="text-gray-600 font-medium truncate w-full">{en.userEmail}</span>
                            <span className="text-[10px] text-gray-400">RA: {en.userRa || 'Não Inf.'}</span>
                          </div>

                          {/* Caixa do valor */}
                          <div className="w-32 text-center text-gray-700 font-black font-mono">
                            R$ {en.totalValue.toFixed(2)}
                          </div>

                          {/* Emblema de status */}
                          <div className="w-28 text-center shrink-0 flex items-center justify-center">
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${
                              en.status === 'APROVADO' ? 'bg-green-50 text-green-700 border-green-200' :
                              en.status === 'PENDENTE' ? 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse' :
                              'bg-gray-50 text-gray-500 border-gray-200'
                            }`}>
                              {en.status === 'APROVADO' ? 'Pago' : en.status === 'PENDENTE' ? 'Pendente' : 'Cancelado'}
                            </span>
                          </div>

                          {/* Linha de botões de aprovação manual */}
                          <div className="w-48 text-center shrink-0 flex items-center justify-center gap-1.5 px-2">
                            {en.status === 'PENDENTE' ? (
                              <>
                                <button
                                  onClick={() => {
                                    try {
                                      DB.updateEnrollmentStatus(en.id, 'APROVADO', currentUser);
                                      onDataChanged();
                                    } catch (err: any) {
                                      alert(err.message || 'Erro ao homologar pagamento.');
                                    }
                                  }}
                                  className="bg-green-600 hover:bg-green-700 active:scale-95 cursor-pointer text-white font-extrabold uppercase text-[9px] tracking-wider py-1.5 px-2.5 rounded-lg transition-all flex items-center gap-1 shadow-3xs"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Aprovar</span>
                                </button>
                                <button
                                  onClick={() => setEnrollmentToCancel(en)}
                                  className="bg-gray-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 border border-gray-200 font-extrabold uppercase text-[9px] tracking-wider py-1.5 px-2 rounded-lg transition-all cursor-pointer"
                                >
                                  <span>Recusar</span>
                                </button>
                              </>
                            ) : en.status === 'APROVADO' ? (
                              <button
                                onClick={() => setEnrollmentToRevert(en)}
                                className="bg-gray-50 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200 border border-gray-200 text-gray-500 font-bold text-[9px] tracking-wide py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Reverter para Pendente
                              </button>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic font-medium">Sem ações</span>
                            )}
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* SUBVISÃO: CREDENCIAMENTO E CHECK-IN EM TEMPO REAL */}
      {activeSubTab === 'CREDENCIAMENTO' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Barra de controle superior: seleção de evento e ações de exportação */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 md:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="w-full md:w-auto flex-1 flex flex-col md:flex-row items-start md:items-center gap-3">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Selecionar Evento:</span>
              </label>
              
              <select
                value={effectiveCredEventId}
                onChange={(e) => {
                  setSelectedCredEventId(e.target.value);
                  setSelectedCredWorkshopId('GERAL');
                  setCredQuickCheckinFeedback(null);
                }}
                className="w-full md:max-w-md bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2.5 text-xs text-gray-800 dark:text-zinc-100 font-bold focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none cursor-pointer shadow-3xs"
              >
                {events.length === 0 ? (
                  <option value="">Nenhum evento disponível</option>
                ) : (
                  events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.status === 'PUBLICADO' ? 'Publicado' : ev.status})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Botões de exportação, download de PDF e emissão de etiquetas Pimaco */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  if (!activeCredEventObj) {
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
                  if (!activeCredEventObj) {
                    alert('Selecione um evento válido para baixar a lista de presença.');
                    return;
                  }
                  setSelectedEventIdForInscritos(activeCredEventObj.id);
                  setIsPrintingAttendance(true);
                }}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
                title="Visualizar e baixar lista de presença em PDF"
              >
                <Download className="w-4 h-4" />
                <span>Lista de Presença (PDF)</span>
              </button>
            </div>

          </div>

          {/* Barra de credenciamento rápido e scanner */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-5 md:p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-black uppercase text-gray-800 dark:text-zinc-200 tracking-wider">
                Credenciamento Rápido (Leitor de Voucher / RA / E-mail / QR Code)
              </h4>
            </div>

            <form onSubmit={handleCredQuickCheckinSubmit} className="flex flex-col lg:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Escaneie o código do QR Code, digite o RA ou e-mail do aluno..."
                  value={credQuickCheckinInput}
                  onChange={(e) => setCredQuickCheckinInput(e.target.value)}
                  className="w-full h-11 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 font-semibold focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!activeCredEventObj) {
                      alert('Selecione um evento válido para abrir a câmera.');
                      return;
                    }
                    setIsCredCameraScannerOpen(true);
                  }}
                  className="flex-1 sm:flex-initial sm:w-48 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold uppercase text-xs tracking-wider px-4 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
                  title="Abrir câmera do celular ou webcam para escanear QR Code dos alunos"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Ler QR Code</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 sm:flex-initial sm:w-48 h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold uppercase text-xs tracking-wider px-4 rounded-xl cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>Confirmar Presença</span>
                </button>
              </div>
            </form>

            {/* Alerta de retorno do credenciamento rápido */}
            {credQuickCheckinFeedback && (
              <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center justify-between border ${
                credQuickCheckinFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : credQuickCheckinFeedback.type === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              }`}>
                <span>{credQuickCheckinFeedback.message}</span>
                <button
                  type="button"
                  onClick={() => setCredQuickCheckinFeedback(null)}
                  className="text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 ml-2 font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Linha de indicadores rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
            <div className="flex flex-col p-2">
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Total de Inscritos</span>
              <span className="text-2xl font-black text-gray-800 dark:text-zinc-100 mt-1">{totalCredInscriptions}</span>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Inscrições ativas</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 dark:border-zinc-800 pl-4 p-2">
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Presentes (Check-in)</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{presentCredCount}</span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">Credenciados no local</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 dark:border-zinc-800 pl-4 p-2">
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Faltantes</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{missingCredCount}</span>
              <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-0.5 font-medium">Aguardando entrada</span>
            </div>
            <div className="flex flex-col border-l border-gray-150 dark:border-zinc-800 pl-4 p-2">
              <span className="text-[10px] text-gray-400 dark:text-zinc-500 uppercase tracking-widest font-bold">Taxa de Presença</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{presenceCredPercentage}%</span>
              <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${presenceCredPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Sub-abas de grade e workshop */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-gray-500 dark:text-zinc-400 uppercase tracking-wider font-bold">
              Filtrar por Grade / Minicurso:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCredWorkshopId('GERAL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                  selectedCredWorkshopId === 'GERAL'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 shadow-3xs hover:border-gray-300'
                }`}
              >
                Presença Geral do Evento
              </button>
              
              {activeCredEventWorkshops.map((ws) => (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => setSelectedCredWorkshopId(ws.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    selectedCredWorkshopId === ws.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 shadow-3xs hover:border-gray-300'
                  }`}
                >
                  ⚙ {ws.name} ({ws.time}h)
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de busca da tabela */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-4 shadow-xs">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Filtrar lista por nome, RA ou e-mail do aluno..."
                value={credStudentSearchQuery}
                onChange={(e) => setCredStudentSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-xs text-gray-800 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 outline-none font-medium"
              />
              {credStudentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCredStudentSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 text-xs font-bold cursor-pointer"
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {/* Tabela da interface de lista de presença */}
            <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 select-none">
              <div className="bg-gray-50 dark:bg-zinc-800/80 text-[10px] font-extrabold uppercase text-gray-500 dark:text-zinc-400 p-3.5 flex border-b border-gray-200 dark:border-zinc-800">
                <div className="w-12 text-center shrink-0">Presença</div>
                <div className="flex-1 pl-3">Participante / Cadastro</div>
                <div className="w-32 max-md:hidden pl-2">Status Pagamento</div>
                <div className="w-36 text-right shrink-0">Situação</div>
              </div>

              {filteredCredParticipants.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-zinc-500 text-xs">
                  {credStudentSearchQuery 
                    ? `Nenhum inscrito encontrado com o termo "${credStudentSearchQuery}".`
                    : 'Não há inscrições ativas para o filtro selecionado.'}
                </div>
              ) : (
                <div className="divide-y divide-gray-150 dark:divide-zinc-800 max-h-[450px] overflow-y-auto">
                  {filteredCredParticipants.map((en) => {
                    const isChecked = attendances.some(
                      a => a.userId === en.userId && a.eventId === effectiveCredEventId && (selectedCredWorkshopId === 'GERAL' ? !a.workshopId : a.workshopId === selectedCredWorkshopId)
                    );
                    const isPaid = en.status === 'APROVADO';

                    return (
                      <div
                        key={en.id}
                        onClick={() => handleCredToggleCheckin(en.userEmail, en.userId)}
                        className={`p-3.5 flex items-center hover:bg-blue-50/40 dark:hover:bg-zinc-800/60 transition-all cursor-pointer border-b border-gray-150/70 dark:border-zinc-800 group ${
                          isChecked ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        {/* Caixa de seleção */}
                        <div className="w-12 flex items-center justify-center shrink-0">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300 dark:text-zinc-600 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          )}
                        </div>

                        {/* Nome e credenciais */}
                        <div className="flex-1 pl-3 flex flex-col gap-0.5 truncate font-bold">
                          <span className="text-xs text-gray-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {en.userName}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-zinc-400 font-mono font-medium">
                            RA: {en.userRa || 'Sem RA'} • {en.userEmail}
                          </span>
                        </div>

                        {/* Status do pagamento */}
                        <div className="w-32 pl-2 max-md:hidden">
                          {isPaid ? (
                            <span className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Confirmado
                            </span>
                          ) : (
                            <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                              Pendente
                            </span>
                          )}
                        </div>

                        {/* Indicador de presença */}
                        <div className="w-36 text-right shrink-0">
                          {isChecked ? (
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                              ✓ Presente
                            </span>
                          ) : (
                            <span className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-gray-200 dark:border-zinc-700 group-hover:border-blue-300 dark:group-hover:border-blue-700 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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

            <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 dark:text-zinc-500 px-1">
              <span>Mostrando {filteredCredParticipants.length} de {totalCredInscriptions} inscritos</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Clique em qualquer linha para alternar presença</span>
            </div>

          </div>

        </div>
      )}
      {activeSubTab === 'EVENTOS' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-6 animate-fade-in shadow-xs text-left">
          
            {isCreatingEvent ? (
                /* FORMULÁRIO DE CRIAÇÃO DE NOVO EVENTO */
              <form onSubmit={handleCreateEventSubmitInCoordenador} className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
                <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
                  <h3 className="text-gray-805 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Cadastrar novo evento</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreatingEvent(false)}
                    className="text-xs text-gray-500 hover:text-gray-800 font-bold uppercase transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Título</label>
                    <input 
                      type="text" 
                      value={newEventName}
                      onChange={e => setNewEventName(e.target.value)}
                      placeholder="Exemplo: Semana Integrada de Tecnologia e Gestão"
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <BannerUploadInput
                      id="coordenador-new-event-banner"
                      value={newEventBanner}
                      onChange={(url) => setNewEventBanner(url)}
                      label="Banner de Capa do Evento"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Descrição</label>
                    <textarea 
                      rows={4}
                      value={newEventDesc}
                      onChange={e => setNewEventDesc(e.target.value)}
                      placeholder="Insira detalhes completos sobre o evento acadêmico..."
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium"
                      required
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Localização</label>
                    <input 
                      type="text" 
                      value={newEventLocation}
                      onChange={e => setNewEventLocation(e.target.value)}
                      placeholder="Ex: Auditório Principal, Bloco A"
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Categoria</label>
                    <select 
                      value={newEventCategory}
                      onChange={e => setNewEventCategory(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold cursor-pointer"
                    >
                      <option value="PALESTRA">PALESTRA</option>
                      <option value="WORKSHOP">WORKSHOP</option>
                      <option value="SEMANA ACADÊMICA">SEMANA ACADÊMICA</option>
                      <option value="CONGRESSO">CONGRESSO</option>
                      <option value="OFICINA">OFICINA</option>
                      <option value="SEMINÁRIO">SEMINÁRIO</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Data de Início</label>
                    <input 
                      type="date" 
                      value={newEventStartDate}
                      onChange={e => setNewEventStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Data Final</label>
                    <input 
                      type="date" 
                      value={newEventEndDate}
                      onChange={e => setNewEventEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Horário de Início</label>
                    <input 
                      type="time" 
                      value={newEventStartTime}
                      onChange={e => setNewEventStartTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Horário de Término</label>
                    <input 
                      type="time" 
                      value={newEventEndTime}
                      onChange={e => setNewEventEndTime(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Limite Máximo de Inscritos</label>
                    <input 
                      type="number" 
                      value={newEventMaxPart}
                      onChange={e => setNewEventMaxPart(Number(e.target.value))}
                      min={5}
                      placeholder="Vagas para o evento"
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-855 outline-none font-bold font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Preço da Inscrição (R$ / 0 = Gratuito)</label>
                    <input 
                      type="number" 
                      step="5"
                      min="0"
                      value={newEventPrice}
                      onChange={e => setNewEventPrice(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-855 outline-none font-bold font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCreatingEvent(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-[9px] tracking-wider py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[9px] tracking-wider py-2.5 px-5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs font-mono"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Publicar Novo Evento</span>
                  </button>
                </div>
              </form>
            ) : isEditingEventId ? (
                /* FORMULÁRIO DE EDIÇÃO DE EVENTO */
            <form onSubmit={handleEditEventSubmitInCoordenador} className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
              <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
                <h3 className="text-gray-805 font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  <span>Editar Detalhes do Evento Acadêmico</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingEventId(null)}
                  className="text-xs text-gray-500 hover:text-gray-800 font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Título</label>
                  <input 
                    type="text" 
                    value={editEventName}
                    onChange={e => setEditEventName(e.target.value)}
                    placeholder="Exemplo: VII Semana de Engenharia de Software"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <BannerUploadInput
                    id="coordenador-edit-event-banner"
                    value={editEventBanner}
                    onChange={(url) => setEditEventBanner(url)}
                    label="Banner de Capa do Evento"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Descrição</label>
                  <textarea 
                    rows={4}
                    value={editEventDesc}
                    onChange={e => setEditEventDesc(e.target.value)}
                    placeholder="Insira detalhes completos sobre o evento acadêmico..."
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium"
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Localização</label>
                  <input 
                    type="text" 
                    value={editEventLocation}
                    onChange={e => setEditEventLocation(e.target.value)}
                    placeholder="Ex: Auditório Central, Bloco 2"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Categoria</label>
                  <select 
                    value={editEventCategory}
                    onChange={e => setEditEventCategory(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold cursor-pointer"
                  >
                    <option value="PALESTRA">PALESTRA</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="SEMANA ACADÊMICA">SEMANA ACADÊMICA</option>
                    <option value="CONGRESSO">CONGRESSO</option>
                    <option value="OFICINA">OFICINA</option>
                    <option value="SEMINÁRIO">SEMINÁRIO</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Data de Início</label>
                  <input 
                    type="date" 
                    value={editEventStartDate}
                    onChange={e => setEditEventStartDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Data Final</label>
                  <input 
                    type="date" 
                    value={editEventEndDate}
                    onChange={e => setEditEventEndDate(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Horário de Início</label>
                  <input 
                    type="time" 
                    value={editEventStartTime}
                    onChange={e => setEditEventStartTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Horário de Término</label>
                  <input 
                    type="time" 
                    value={editEventEndTime}
                    onChange={e => setEditEventEndTime(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-850 outline-none font-semibold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Limite Máximo de Inscritos</label>
                  <input 
                    type="number" 
                    value={editEventMaxPart}
                    onChange={e => setEditEventMaxPart(Number(e.target.value))}
                    min={5}
                    placeholder="Vagas para o evento"
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-855 outline-none font-bold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold mb-1">Preço da Inscrição (Básico / R$)</label>
                  <input 
                    type="number" 
                    step="5"
                    min="0"
                    value={editEventPrice}
                    onChange={e => setEditEventPrice(Number(e.target.value))}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs text-gray-855 outline-none font-bold font-mono"
                    required
                  />
                </div>
              </div>

              {isEditingEventId && (
                <div className="border-t border-gray-200 pt-6 mt-4">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5 leading-none">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Workshops Vinculados a este Evento</span>
                      </h4>
                      <span className="text-[10px] text-gray-505 font-bold uppercase">{workshops.filter(w => w.eventId === isEditingEventId).length} Encontrados</span>
                    </div>

                    {workshops.filter(w => w.eventId === isEditingEventId).length === 0 ? (
                      <p className="text-gray-500 text-xs italic text-center py-4 bg-white border border-dashed border-gray-200 rounded-xl">Não há workshops vinculados a este evento ainda.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {workshops.filter(w => w.eventId === isEditingEventId).map(ws => {
                          const isSelfEditing = editingWorkshopId === ws.id;
                          return (
                            <div key={ws.id} className="bg-white border border-gray-150 rounded-xl p-3 shadow-3xs flex flex-col gap-3">
                              {isSelfEditing ? (
                                /* CAMPOS DO FORMULÁRIO DE EDIÇÃO DE WORKSHOP EM LINHA */
                                <div className="flex flex-col gap-3 text-left">
                                  <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                                    <span className="text-[10px] text-blue-600 font-extrabold uppercase font-mono">Editando Workshop</span>
                                    <button 
                                      type="button" 
                                      onClick={() => setEditingWorkshopId(null)}
                                      className="text-[10px] text-gray-500 hover:text-gray-800 font-bold uppercase"
                                    >
                                      Cancelar
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                      <label className={THEME.input.labelSmall}>Título do Workshop</label>
                                      <input
                                        type="text"
                                        value={editWsName}
                                        onChange={e => setEditWsName(e.target.value)}
                                        className={THEME.input.textSmall}
                                        required
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={THEME.input.labelSmall}>Instrutor / Palestrante</label>
                                      <input
                                        type="text"
                                        value={editWsInstructor}
                                        onChange={e => setEditWsInstructor(e.target.value)}
                                        className={THEME.input.textSmall}
                                        required
                                      />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className={THEME.input.labelSmall}>Resumo / Descrição</label>
                                      <textarea
                                        rows={2}
                                        value={editWsDesc}
                                        onChange={e => setEditWsDesc(e.target.value)}
                                        className={THEME.input.textareaSmall}
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className={THEME.input.labelSmall}>Data</label>
                                      <input
                                        type="date"
                                        value={editWsDate}
                                        onChange={e => setEditWsDate(e.target.value)}
                                        className={THEME.input.textSmall + " font-mono"}
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className={THEME.input.labelSmall}>Horário Início</label>
                                      <input
                                        type="time"
                                        value={editWsStartTime}
                                        onChange={e => setEditWsStartTime(e.target.value)}
                                        className={THEME.input.textSmall + " font-mono"}
                                        required
                                      />
                                    </div>
                                    <div>
                                      <label className={THEME.input.labelSmall}>Horário Fim</label>
                                      <input
                                        type="time"
                                        value={editWsEndTime}
                                        onChange={e => setEditWsEndTime(e.target.value)}
                                        className={THEME.input.textSmall + " font-mono"}
                                        required
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 md:col-span-2">
                                      <div>
                                        <label className={THEME.input.labelSmall}>Limite Vagas</label>
                                        <input
                                          type="number"
                                          min={1}
                                          value={editWsMaxVagas}
                                          onChange={e => setEditWsMaxVagas(Number(e.target.value))}
                                          className={THEME.input.textSmall + " font-mono font-bold"}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className={THEME.input.labelSmall}>Preço (R$)</label>
                                        <input
                                          type="number"
                                          min={0}
                                          value={editWsPrice}
                                          onChange={e => setEditWsPrice(Number(e.target.value))}
                                          className={THEME.input.textSmall + " font-mono font-bold"}
                                          required
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-100">
                                    <button
                                      type="button"
                                      onClick={() => setEditingWorkshopId(null)}
                                      className={THEME.button.secondary + " py-1.5 px-3"}
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        if (!editWsName || !editWsInstructor) {
                                          alert('Nome e Palestrante são obrigatórios.');
                                          return;
                                        }
                                        try {
                                          DB.updateWorkshop(ws.id, {
                                            name: editWsName,
                                            description: editWsDesc,
                                            instructor: editWsInstructor,
                                            date: editWsDate,
                                            startTime: editWsStartTime,
                                            endTime: editWsEndTime,
                                            time: `${editWsStartTime} às ${editWsEndTime}`,
                                            maxParticipants: Number(editWsMaxVagas),
                                            price: Number(editWsPrice)
                                          }, currentUser);
                                          setEditingWorkshopId(null);
                                          alert('Workshop atualizado com sucesso!');
                                          onDataChanged();
                                        } catch (err: any) {
                                          alert(err.message || 'Erro ao editar workshop.');
                                        }
                                      }}
                                      className={THEME.button.primary + " py-1.5 px-4"}
                                    >
                                      Salvar Workshop
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* PAINEL DE VISUALIZAÇÃO DO WORKSHOP COM CONTROLES */
                                <div className="flex justify-between items-start md:items-center gap-3 flex-wrap">
                                  <div className="flex-1 min-w-0 text-left">
                                    <h5 className="text-xs font-bold text-gray-800 leading-tight">{ws.name}</h5>
                                    <span className="text-[10px] text-gray-500 font-medium">Instrutor: <strong className="text-gray-750">{ws.instructor}</strong></span>
                                    <div className="flex gap-x-2 text-[9px] text-gray-400 font-mono mt-0.5 flex-wrap">
                                      <span>Data: {ws.date.split('-').reverse().join('/')}</span>
                                      <span>•</span>
                                      <span>Preço: {ws.price === 0 ? 'Gratuito' : `R$ ${ws.price}`}</span>
                                      <span>•</span>
                                      <span>Horário: {ws.startTime && ws.endTime ? `${ws.startTime} às ${ws.endTime}` : ws.time}</span>
                                      <span>•</span>
                                      <span>{ws.maxParticipants} vagas</span>
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditWorkshop(ws)}
                                      className="bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 font-medium uppercase text-[9px] tracking-wider py-1.5 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                      <span>Editar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteWorkshopError(null);
                                        setWorkshopToDelete(ws);
                                      }}
                                      className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 font-medium uppercase text-[9px] tracking-wider py-1.5 px-2.5 rounded-lg flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                      <span>Apagar</span>
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

              <div className="flex gap-3 justify-end mt-4">
                <button 
                  type="button"
                  onClick={() => setIsEditingEventId(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold uppercase text-[9px] tracking-wider py-2.5 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[9px] tracking-wider py-2.5 px-5 rounded-lg cursor-pointer transition-colors flex items-center gap-1 shadow-xs font-mono"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          ) : (
                /* GERENCIAMENTO DE EVENTOS */
            <>
              {/* Cabeçalho dos seletores de abas, semelhante à barra do professor com Presenças e Novo Evento */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-200 pb-5 gap-4">
                <div>
                  <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
                    <ClipboardList className="w-4 h-4 text-blue-600" />
                    <span>Gerenciamento de Eventos</span>
                  </h3>
                </div>

                {/* Alternadores dos botões de ação */}
                <div className="flex bg-gray-100 border border-gray-200 p-1.5 rounded-xl gap-2 text-xs font-bold w-full md:w-auto shadow-3xs flex-wrap md:flex-nowrap">
                  <button 
                    type="button"
                    onClick={() => { 
                      setCoordinatorEventTab('LIST'); 
                      setIsEditingEventId(null); 
                    }}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all ${coordinatorEventTab === 'LIST' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Eventos
                  </button>

                  <button 
                    type="button"
                    onClick={() => { 
                      setCoordinatorEventTab('REPORTS'); 
                      setIsEditingEventId(null); 
                      if (events.length > 0 && !selectedReportEventId) {
                        setSelectedReportEventId(events[0].id);
                      }
                    }}
                    className={`flex-1 md:flex-none px-4 py-2 rounded-lg cursor-pointer transition-all ${coordinatorEventTab === 'REPORTS' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  >
                    Frequências
                  </button>
                  
                  <button 
                    type="button"
                    onClick={handleStartCreateEvent}
                    className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span>Novo Evento</span>
                  </button>
                </div>
              </div>

              {coordinatorEventTab === 'LIST' ? (
                <div className="flex flex-col gap-6">
                  {/* Filtro de seleção de sub-aba */}
                  <div className="flex bg-gray-100 border border-gray-200 p-1 rounded-xl text-[10px] font-bold self-start shrink-0 shadow-3xs gap-1">
                    {(['TODOS', 'ANALISE', 'PUBLICADO', 'ENCERRADO'] as const).map(f => (
                      <button 
                        key={f}
                        type="button"
                        onClick={() => setEventListFilter(f)}
                        className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-bold ${
                          eventListFilter === f 
                            ? 'bg-blue-600 text-white shadow-3xs' 
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {f === 'ANALISE' ? 'Em Análise' : f === 'TODOS' ? 'Todos' : f === 'PUBLICADO' ? 'Publicado' : 'Encerrado'}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const filteredEvents = events.filter(e => {
                      if (eventListFilter === 'TODOS') return true;
                      return e.status === eventListFilter;
                    });

                if (filteredEvents.length === 0) {
                  return (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-200 shadow-xs">
                      <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-gray-800 font-bold text-sm">Nenhum evento registrado nesta subdivisão</h4>
                      <p className="text-gray-500 text-[11px] mt-1 max-w-xs mx-auto">Não há eventos cadastrados no status "{eventListFilter === 'ANALISE' ? 'Em Análise' : eventListFilter === 'PUBLICADO' ? 'Publicado' : eventListFilter === 'ENCERRADO' ? 'Encerrado' : eventListFilter}".</p>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-4">
                    {filteredEvents.map((ev) => {
                      const enrolledCount = enrollments.filter(en => en.eventId === ev.id && en.status === 'APROVADO').length;
                      const evWorkshops = workshops.filter(w => w.eventId === ev.id);

                      return (
                        <div 
                          key={ev.id}
                          className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 md:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 transition-all hover:bg-gray-50/40 hover:border-gray-300 shadow-3xs"
                        >
                          {/* Linha de informações da imagem e do título */}
                          <div className="flex gap-4 items-center flex-1 min-w-0">
                            <img 
                              src={ev.banner} 
                              alt={ev.name} 
                              referrerPolicy="no-referrer"
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-gray-200"
                            />
                            <div className="flex flex-col gap-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                  ev.status === 'PUBLICADO' ? 'bg-green-50 text-green-700 border border-green-200' :
                                  ev.status === 'ANALISE' ? 'bg-yellow-50 text-yellow-700 border border-yellow-250' :
                                  ev.status === 'ENCERRADO' ? 'bg-purple-50 text-purple-700 border border-purple-250' :
                                  'bg-gray-100 text-gray-505 border border-gray-200'
                                }`}>
                                  {ev.status === 'ANALISE' ? 'Em Análise' : ev.status === 'ENCERRADO' ? 'Encerrado' : ev.status === 'PUBLICADO' ? 'Publicado' : ev.status}
                                </span>
                                <span className="text-[10px] text-blue-600 font-bold uppercase">{ev.category}</span>
                                {ev.creatorName && (
                                  <span className="text-[9px] text-gray-400 font-medium">Por: {ev.creatorName}</span>
                                )}
                              </div>
                              
                              <h4 className="text-gray-800 font-bold text-sm leading-tight mt-0.5 truncate">{ev.name}</h4>
                              <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-gray-500 mt-1">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-600" />{ev.startDate.split('-').reverse().join('/')}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#FF2A85]" />{ev.location}</span>
                                <span className="flex items-center gap-1 font-mono text-gray-600 font-semibold">{ev.price === 0 ? 'Gratuito' : `R$ ${ev.price.toFixed(2)}`}</span>
                              </div>
                            </div>
                          </div>

                            {/* Estatísticas de inscrições e links de botões */}
                          <div className="flex flex-col md:items-end gap-1.5 shrink-0 w-full md:w-auto max-md:border-t max-md:border-gray-200 max-md:pt-4">
                            <div className="flex items-center gap-4 text-xs text-gray-600 font-bold font-mono py-1 px-3 bg-gray-50 border border-gray-200 rounded-lg max-md:w-full max-md:justify-around shadow-3xs">
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>{enrolledCount} / {ev.maxParticipants} Inscritos</span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                <span>{evWorkshops.length} Workshops</span>
                              </div>
                            </div>

                              {/* Linha de botões de controle */}
                            <div className="flex flex-wrap gap-2 mt-1.5 max-md:w-full">
                              <button 
                                type="button"
                                onClick={() => handleEditEventClickInCoordenador(ev)}
                                className="bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-700 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-all duration-150 active:scale-95 max-md:flex-1 justify-center shadow-3xs"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Editar</span>
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  setDeleteEventError(null);
                                  setEventToDelete(ev);
                                }}
                                className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors max-md:flex-1 justify-center shadow-3xs"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Apagar</span>
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  setSelectedReportEventId(ev.id);
                                  setCoordinatorEventTab('REPORTS');
                                }}
                                className="bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors max-md:flex-1 justify-center shadow-3xs"
                                title="Relatório de Frequência do Evento"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Frequência</span>
                              </button>

                              {ev.status === 'PUBLICADO' && (
                                <button 
                                  type="button"
                                  onClick={() => setEventToClose(ev)}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border border-amber-600 max-md:flex-1 justify-center shadow-xs"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>Encerrar</span>
                                </button>
                              )}

                              {(() => {
                                const isCreator = ev.creatorId === currentUser.id;
                                const isCoordinatorOrRoot = currentUser.role === 'COORDENADOR' || currentUser.role === 'ROOT';
                                const hasPermission = isCreator || isCoordinatorOrRoot;
                                const isClosed = ev.status === 'ENCERRADO';

                                if (!hasPermission) {
                                  return (
                                    <button 
                                      type="button"
                                      disabled
                                      title="Apenas o criador do evento ou a coordenação possuem autorização para adicionar workshops."
                                      className="bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-400 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-not-allowed opacity-50 max-md:flex-1 justify-center"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>+ Workshop</span>
                                    </button>
                                  );
                                }

                                if (isClosed) {
                                  return null;
                                }

                                return (
                                  <button 
                                    type="button"
                                    onClick={() => setShowAddWsInCoordenador(showAddWsInCoordenador === ev.id ? null : ev.id)}
                                    className="bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold uppercase text-[9px] tracking-wider py-2 px-3 rounded-lg flex items-center gap-1 cursor-pointer transition-colors max-md:flex-1 justify-center shadow-3xs"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>+ Workshop</span>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
                </div>
              ) : (
                /* ABA: RELATÓRIO DE FREQUÊNCIA (correspondente à do organizador) */
                <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-6 animate-fade-in shadow-xs">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-150 pb-4">
                    <div>
                      <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <span>Relatório de Frequência</span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={selectedReportEventId || (events.length > 0 ? events[0].id : '')}
                        onChange={(e) => setSelectedReportEventId(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-xs text-gray-800 font-bold focus:border-blue-600 outline-none cursor-pointer"
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
                        className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
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
                        <div className="bg-blue-50/50 border border-blue-150 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-3">
                          <div>
                            <span className="text-[10px] text-blue-600 uppercase font-black tracking-wider block">Evento Selecionado</span>
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
                              <span className="text-lg font-black text-blue-600">{repWorkshops.length}</span>
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
                                      <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150">
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
                                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
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
                                  <th className="p-3">Participante</th>
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
            </>
          )}

          {/* MODAL SOBREPOSTO PARA ADICIONAR WORKSHOP */}
          {showAddWsInCoordenador && (() => {
            const parentEvent = events.find(e => e.id === showAddWsInCoordenador);
            if (!parentEvent) return null;
            
            return (
              <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-12 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl relative select-none animate-fade-in text-left">
                  
                  <button 
                    type="button"
                    onClick={() => setShowAddWsInCoordenador(null)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer text-sm font-bold"
                  >
                    ✕
                  </button>

                  <div className="mb-4">
                    <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest block font-mono">ADICIONAR GRADE CURRICULAR</span>
                    <h4 className="text-md font-extrabold text-gray-800 uppercase mt-0.5 leading-tight">Novo Workshop para "{parentEvent.name.slice(0, 30)}..."</h4>
                  </div>

                  <form onSubmit={(e) => handleAddWorkshopSubmitInCoordenador(e, parentEvent.id)} className="flex flex-col gap-3.5">
                    
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Título do Workshop</label>
                      <input 
                        type="text" 
                        value={coorWsName}
                        onChange={e => setCoorWsName(e.target.value)}
                        placeholder="EX: Introdução a Figma ou Redes"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Instrutor / Palestrante Convidado</label>
                      <input 
                        type="text" 
                        value={coorWsInstructor}
                        onChange={e => setCoorWsInstructor(e.target.value)}
                        placeholder="EX: Prof. Daniel de Oliveira"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Objetivos / Resumo</label>
                      <textarea 
                        rows={2}
                        value={coorWsDesc}
                        onChange={e => setCoorWsDesc(e.target.value)}
                        placeholder="Descreva as atividades..."
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 placeholder-gray-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-medium"
                        required
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Data</label>
                        <input 
                          type="date" 
                          value={coorWsDate}
                          onChange={e => setCoorWsDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Horário Início</label>
                        <input 
                          type="time" 
                          value={coorWsStartTime}
                          onChange={e => setCoorWsStartTime(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 uppercase tracking-wider block font-semibold mb-1">Horário Fim</label>
                        <input 
                          type="time" 
                          value={coorWsEndTime}
                          onChange={e => setCoorWsEndTime(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block font-semibold mb-1 truncate">Limite Vagas</label>
                        <input 
                          type="number" 
                          min={5}
                          max={200}
                          value={coorWsMaxVagas}
                          onChange={e => setCoorWsMaxVagas(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold font-mono"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-[9px] text-gray-500 uppercase tracking-wider block font-semibold mb-1 truncate">Preço (R$)</label>
                        <input 
                          type="number" 
                          min={0}
                          value={coorWsPrice}
                          onChange={e => setCoorWsPrice(Number(e.target.value))}
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-805 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none font-bold font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-2 justify-end">
                      <button 
                        type="button"
                        onClick={() => setShowAddWsInCoordenador(null)}
                        className="border border-gray-200 text-gray-500 font-bold uppercase text-[9px] tracking-wider py-1.8 px-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[9px] tracking-wider py-1.8 px-4 rounded-lg cursor-pointer transition-colors"
                      >
                        Vincular Workshop
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SUBVISÃO 5: RASTREADOR DE LOGS DE AUDITORIA */}
      {activeSubTab === 'AUDIT_LOGS' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4 animate-fade-in max-h-[80vh] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3 gap-3">
            <div>
              <h3 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Logs do Sistema</span>
              </h3>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={handleExportLogsExcel}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-97 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                title="Exportar registros de log em formato Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Logs (Excel)</span>
              </button>
              <span className="text-[10px] text-gray-500 bg-gray-50 py-1 px-3 border border-gray-150 rounded-full font-mono">{logs.length} ações salvas</span>
            </div>
          </div>

          {/* Exibição da tabela */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[360px] pr-1.5 scrollbar-thin">
            {logs.map((log) => (
              <div 
                key={log.id} 
                className="bg-white border border-gray-200 p-2.5 rounded-lg flex items-start justify-between gap-4 text-xs font-medium hover:border-gray-200 transition-colors"
              >
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[9px] bg-blue-55 text-blue-700 px-1.5 rounded py-0.2 font-black uppercase border border-blue-200">{log.action}</span>
                    <span className="text-[10px] text-gray-500 font-semibold">{log.userEmail}</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold font-mono">({log.userRole})</span>
                  </div>
                  <p className="text-gray-700 leading-normal mt-0.5 text-[11px] font-sans">{log.details}</p>
                </div>
                
                <span className="text-[9px] text-gray-400 font-mono shrink-0 pt-0.5">
                  {formatTimeBR(log.timestamp)}
                </span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* SUBVISÃO 6: PAINEL COMPLETO DE GERENCIAMENTO FINANCEIRO */}
      {activeSubTab === 'FINANCEIRO' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          {/* Linha de ações do cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-200 gap-4 shadow-3xs">
            <div>
              <h3 className="text-gray-800 font-extrabold text-base uppercase tracking-tight flex items-center gap-2 leading-none">
                <Calculator className="w-5 h-5 text-blue-600" />
                <span>Painel Financeiro</span>
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button 
                onClick={handleExportFinancialExcel}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-97 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                title="Exportar Demonstrativo Financeiro em Planilha Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* Grade de indicadores rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Métrica 1: receita total */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-3xs flex items-center justify-between relative overflow-hidden group">
              <div className="flex flex-col gap-1.5 z-10">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest leading-none">Receita Total</span>
                <span className="text-2xl font-black text-gray-900 leading-tight">
                  {totalFinancialRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-green-600 font-mono font-bold flex items-center gap-1 leading-none mt-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{enrollments.filter(en => en.status === 'APROVADO').length} inscrições + {allExpenses.filter(x => x.type === 'ENTRADA').length} patrocínios</span>
                </span>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-green-600 border border-green-100 group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-green-50/20 rounded-full translate-x-8 translate-y-8 select-none pointer-events-none"></div>
            </div>

            {/* Métrica 2: despesas totais */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-3xs flex items-center justify-between relative overflow-hidden group">
              <div className="flex flex-col gap-1.5 z-10">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest leading-none">Despesas Totais</span>
                <span className="text-2xl font-black text-gray-900 leading-tight text-red-650">
                  {totalFinancialExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                <span className="text-[10px] text-red-500 font-mono font-bold flex items-center gap-1 leading-none mt-1">
                  <TrendingDown className="w-3 h-3" />
                  <span>{allExpenses.filter(x => x.type === 'DESPESA').length} despesas/saídas registradas</span>
                </span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-red-650 border border-red-100 group-hover:scale-105 transition-transform">
                <TrendingDown className="w-6 h-6" />
              </div>
              <div className="absolute right-0 bottom-0 w-24 h-24 bg-red-50/20 rounded-full translate-x-8 translate-y-8 select-none pointer-events-none"></div>
            </div>

            {/* Métrica 3: margem de lucro ou saldo */}
            <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-3xs flex items-center justify-between relative overflow-hidden group">
              <div className="flex flex-col gap-1.5 z-10">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest leading-none">Balanço</span>
                <span className={`text-2xl font-black leading-tight ${netFinancialProfit >= 0 ? 'text-green-600' : 'text-red-700'}`}>
                  {netFinancialProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className={`p-3 rounded-xl border group-hover:scale-105 transition-transform ${
                netFinancialProfit >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            
            {/* COLUNA 1: tabela dinâmica de saldo por evento */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 shadow-3xs h-full">
              <div>
                <h4 className="text-gray-800 font-bold text-sm uppercase tracking-wider leading-none">Balanço por Evento</h4>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-[10px] font-extrabold uppercase tracking-wider text-gray-400 font-bold">
                      <th className="py-2.5 px-3">Evento</th>
                      <th className="py-2.5 px-2 text-center">Checkouts</th>
                      <th className="py-2.5 px-2 text-right">Inscrições</th>
                      <th className="py-2.5 px-2 text-right">Despesas</th>
                      <th className="py-2.5 px-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(evt => {
                      const revVal = getEventRevenue(evt.id);
                      const expVal = getEventExpenses(evt.id);
                      const balVal = revVal - expVal;
                      const hasProfit = balVal >= 0;
                      const salesCount = getEventEnrollmentsCount(evt.id);

                      return (
                        <tr key={evt.id} className="border-b border-gray-150 hover:bg-gray-50/50 transition-colors font-medium">
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-800 block leading-tight">{evt.name}</span>
                            <span className="text-[9px] uppercase font-mono tracking-wider text-gray-400 font-bold mt-0.5 block">{evt.category} • R$ {evt.price.toFixed(2)}/ingresso</span>
                          </td>
                          <td className="py-3 px-2 text-center text-gray-600 font-mono font-bold">
                            {salesCount}
                          </td>
                          <td className="py-3 px-2 text-right text-gray-800 font-mono">
                            R$ {revVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-2 text-right text-red-650 font-mono">
                            R$ {expVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={`inline-block font-mono font-black text-[11px] px-2 py-0.5 rounded ${
                              hasProfit ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {hasProfit ? '+' : ''} R$ {balVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400">Nenhum evento registrado no sistema para cálculos.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* COLUNA 2: configurações financeiras e formulários de lançamentos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-between gap-4 shadow-3xs relative h-full">
              <div>
                <h4 className="text-gray-800 font-bold text-sm uppercase tracking-wider leading-none">Registrar Lançamento</h4>
              </div>

              <form onSubmit={handleAddExpenseSubmit} className="flex flex-col gap-3 flex-1 justify-between">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Tipo de Lançamento</label>
                  <div className="grid grid-cols-2 gap-2 mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseType('DESPESA');
                        if (expenseCategory === 'PATROCINIO' || expenseCategory === 'APORTE') {
                          setExpenseCategory('INFRAESTRUTURA');
                        }
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        expenseType === 'DESPESA'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      🛑 Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseType('ENTRADA');
                        setExpenseCategory('APORTE');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        expenseType === 'ENTRADA'
                          ? 'bg-green-50 text-green-700 border-green-300'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      💰 Entrada
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Evento</label>
                  <select 
                    value={expenseEventId} 
                    onChange={(e) => setExpenseEventId(e.target.value)} 
                    className="bg-gray-55 border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-505 w-full"
                    required
                  >
                    <option value="" disabled>Selecione o Evento</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Categoria</label>
                  <select 
                    value={expenseCategory} 
                    onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                    disabled={expenseType === 'ENTRADA'}
                    className="bg-gray-55 border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-505 w-full disabled:bg-gray-100 disabled:opacity-75 disabled:cursor-not-allowed"
                    required
                  >
                    {expenseType === 'ENTRADA' ? (
                      <option value="APORTE">Aporte</option>
                    ) : (
                      <>
                        <option value="INFRAESTRUTURA">Infraestrutura e Equipamentos</option>
                        <option value="REFEICAO">Alimentação e Refeição</option>
                        <option value="MARKETING">Marketing e Brindes</option>
                        <option value="PALESTRANTE">Honorários de Palestrante</option>
                        <option value="SERVICOS">Serviços Gerais e Limpeza</option>
                        <option value="OUTROS">Outros Lançamentos</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Descrição</label>
                  <input 
                    type="text" 
                    value={expenseDescription} 
                    onChange={(e) => setExpenseDescription(e.target.value)} 
                    placeholder={expenseType === 'ENTRADA' ? "Ex: Patrocínio Master - Cooperativa Sicredi" : "Copos descartáveis"} 
                    className="bg-gray-55 border border-gray-200 rounded-lg p-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-blue-505 w-full animate-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Valor (R$)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={expenseValue} 
                      onChange={(e) => setExpenseValue(e.target.value === '' ? '' : Number(e.target.value))} 
                      placeholder="15,00" 
                      className="bg-gray-55 border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-505 w-full"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] uppercase tracking-wider font-extrabold text-gray-400">Data da Operação</label>
                    <input 
                      type="date" 
                      value={expenseDate} 
                      onChange={(e) => setExpenseDate(e.target.value)} 
                      className="bg-gray-55 border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-blue-505 w-full"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-black text-[11px] uppercase tracking-widest py-2.5 rounded-xl cursor-pointer shadow-xs transition-all mt-2 w-full text-center flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Lançamento ⚡</span>
                </button>
              </form>
            </div>
          </div> {/* Fecha a grade */}

          {/* QUADRO DETALHADO DO LIVRO RAZÃO */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4 shadow-3xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-3 gap-2">
              <div>
                <h4 className="text-gray-800 font-bold text-sm uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <span>Lançamentos</span>
                </h4>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 max-w-full">
                <span className="text-[9px] font-extrabold text-gray-450 uppercase shrink-0">Filtrar Evento:</span>
                <select 
                  value={selectedEventFilter} 
                  onChange={(e) => setSelectedEventFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-3 text-xs font-bold text-gray-700 focus:outline-none focus:border-blue-500 max-w-full truncate"
                >
                  <option value="ALL">Mostrar Todos ({allExpenses.length})</option>
                  {events.map(ev => {
                    const cnt = allExpenses.filter(x => x.eventId === ev.id).length;
                    return (
                      <option key={ev.id} value={ev.id}>{ev.name} ({cnt})</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Lista de lançamentos */}
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[350px] pr-1.5 scrollbar-thin">
              {filteredLedgerExpenses.map((exp) => (
                <div 
                  key={exp.id} 
                  className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between gap-4 text-xs font-medium hover:border-blue-200 hover:bg-gray-50/20 transition-all shadow-xs"
                >
                  <div className="flex flex-col gap-1">
                    <h5 className="font-black text-gray-800 text-[13px]">{exp.description}</h5>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-blue-600 font-bold">{exp.eventName}</span>
                      <span className="text-gray-300">•</span>
                      <span className={`text-[9px] uppercase font-mono border px-1.5 rounded-full font-bold ${getCategoryColor(exp.category)}`}>
                        {exp.category}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[10px] text-gray-500 font-semibold mt-0.5 sm:mt-0">{exp.type === 'ENTRADA' ? 'Entrada ocorrida em' : 'Gasto ocorrido em'}: {exp.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase font-mono tracking-wider ${
                      exp.type === 'ENTRADA' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {exp.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                    </span>
                    <span className={`font-mono font-black text-xs py-1 px-2.5 rounded-lg border ${
                      exp.type === 'ENTRADA' 
                        ? 'text-green-700 bg-green-50 border-green-100' 
                        : 'text-red-650 bg-red-50 border-red-100'
                    }`}>
                      {exp.type === 'ENTRADA' ? '+' : '-'} R$ {exp.value.toFixed(2)}
                    </span>
                    <button 
                      onClick={() => handleDeleteExpenseClick(exp.id)}
                      className="text-gray-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 active:scale-95 transition-all cursor-pointer"
                      title="Apagar lançamento do livro-razão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredLedgerExpenses.length === 0 && (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                  <span className="text-[13px] font-semibold">Nenhuma movimentação de lançamento encontrada.</span>
                  <span className="text-xs text-gray-400">Utilize o painel lateral para registrar os lançamentos dos eventos.</span>
                </div>
              )}
            </div>
          </div>

          {/* MODELO DINÂMICO DE PRÉ-VISUALIZAÇÃO DO RELATÓRIO DE CONFORMIDADE (SOBREPOSIÇÃO POP-UP) */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/75 z-[9999] flex items-center justify-center p-4 overflow-y-auto backdrop-blur-xs animate-fade-in print:p-0 print:bg-white print:absolute print:inset-0">

              <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100 print:rounded-none print:shadow-none print:border-none">
                
                {/* Cabeçalho das ações do modal que não será impresso */}
                <div className="non-printable-element p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Ficha PDF de Prestação de Contas</h4>
                      <p className="text-[10px] text-gray-500">Configure o escopo antes de gerar a via impressa ou exportar em PDF oficial.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <span className="text-gray-500">Filtrar para impressão:</span>
                      <select 
                        value={reportEventId}
                        onChange={(e) => setReportEventId(e.target.value)}
                        className="bg-white border border-gray-250 py-1 px-2.5 rounded-lg text-xs font-bold text-gray-700"
                      >
                        <option value="ALL">Balancete Geral Consolidado</option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      onClick={() => handlePrintReport('printable-report-area', 'Relatório Gerencial de Prestação de Contas')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase text-[10px] tracking-wider px-4 py-2 rounded-lg cursor-pointer"
                    >
                      Imprimir PDF 🖨️
                    </button>

                    <button 
                      onClick={() => setShowReportModal(false)}
                      className="text-gray-400 hover:text-gray-700 font-bold p-2 text-xs"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                  {/* Div principal do conteúdo para impressão */}
                <div 
                  id="printable-report-area" 
                  className="flex-1 overflow-y-auto p-12 bg-white text-black font-sans print:overflow-visible print:p-0"
                >
                  
                  {/* Cabeçalho com papel timbrado institucional */}
                  <div className="text-center border-b-2 border-black pb-4 mb-6 flex flex-col items-center">
                    <h2 className="text-2xl font-black uppercase tracking-wider text-black">Centro Universitário Campo Real</h2>
                    <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-gray-700 mt-1">Pró-Reitoria de Administração e Eventos de Extensão</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Campus Guarapuava • PR • Brasil • www.camporeal.edu.br</p>
                  </div>

                  {/* Faixa de título do documento */}
                  <div className="bg-gray-100 p-4 border border-gray-300 text-center mb-6 rounded-lg print:border-black">
                    <h1 className="text-base font-bold uppercase tracking-wide">Relatório Gerencial de Prestação de Contas & Auditoria Financeira</h1>
                    <p className="text-xs text-gray-600 mt-1">Auditado sob as credenciais de {currentUser.name} ({currentUser.role})</p>
                  </div>

                  {/* Bloco de metadados do documento */}
                  <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-gray-200 p-4 rounded-lg bg-gray-50/50 print:border-black">
                    <div>
                      <p className="mb-1"><span className="font-bold text-gray-700">Data de Emissão:</span> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
                      <p className="mb-1"><span className="font-bold text-gray-700">Auditor Responsável:</span> {currentUser.name} ({currentUser.email})</p>
                      <p className="mb-1"><span className="font-bold text-gray-700">Cargo de Exercício:</span> {currentUser.role}</p>
                    </div>
                    <div>
                      <p className="mb-1">
                        <span className="font-bold text-gray-700">Escopo do Demonstrativo:</span>{' '}
                        <span className="font-bold uppercase text-blue-600 print:text-black">
                          {reportEventId === 'ALL' ? 'CONSOLIDADO INTEGRAL (TODOS EVENTOS)' : events.find(e => e.id === reportEventId)?.name}
                        </span>
                      </p>
                      <p className="mb-1"><span className="font-bold text-gray-700">Código Oficial de Autenticidade:</span> <span className="font-mono uppercase font-extrabold text-[10px] bg-gray-200 px-1 py-0.2 rounded print:p-0">CRE-AUD-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span></p>
                      <p className="mb-1"><span className="font-bold text-gray-700">Situação de Conformidade:</span> <span className="font-bold text-green-700">Conforme (Aprovado em Exercício)</span></p>
                    </div>
                  </div>

                  {/* Indicadores de desempenho financeiro nas folhas impressas */}
                  <div className="grid grid-cols-3 gap-4 mb-6 border-b border-gray-300 pb-6 text-center">
                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 print:border-black leading-none">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Receita de Inscrições</span>
                      <span className="text-lg font-black text-black block">
                        {(reportEventId === 'ALL' 
                          ? totalFinancialRevenue 
                          : getEventRevenue(reportEventId)
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-[9px] text-gray-500 block mt-1">{(reportEventId === 'ALL' ? enrollments.filter(en => en.status === 'APROVADO').length : getEventEnrollmentsCount(reportEventId))} checkouts aprovados</span>
                    </div>

                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 print:border-black leading-none">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Despesas Operacionais</span>
                      <span className="text-lg font-black text-black block">
                        {(reportEventId === 'ALL' 
                          ? totalFinancialExpenses 
                          : getEventExpenses(reportEventId)
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-[9px] text-gray-500 block mt-1">{(reportEventId === 'ALL' ? allExpenses.length : allExpenses.filter(x => x.eventId === reportEventId).length)} saídas contábeis</span>
                    </div>

                    <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 print:border-black leading-none">
                      <span className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Saldo Final de Caixa</span>
                      <span className="text-lg font-black text-black block">
                        {(reportEventId === 'ALL' 
                          ? netFinancialProfit 
                          : (getEventRevenue(reportEventId) - getEventExpenses(reportEventId))
                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      {(() => {
                        const finalBal = reportEventId === 'ALL' 
                          ? netFinancialProfit 
                          : (getEventRevenue(reportEventId) - getEventExpenses(reportEventId));
                        return (
                          <span className={`text-[9.5px] uppercase font-mono tracking-widest font-extrabold block mt-1 ${finalBal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {finalBal >= 0 ? '💰 Saldo positivo' : '⚠️ Saldo negativo'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Seção A: balancete dos eventos */}
                  {reportEventId === 'ALL' && (
                    <div className="mb-6">
                      <h4 className="text-xs uppercase font-extrabold text-black border-l-4 border-black pl-2.5 mb-3">Item 1. Balancete Consolidado por Evento Acadêmico</h4>
                      <table className="w-full text-left text-[11px] border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100 uppercase text-[9px] font-bold text-gray-700 border-b border-gray-300">
                            <th className="p-2 border border-gray-350">Nome do Evento</th>
                            <th className="p-2 border border-gray-350">Categoria</th>
                            <th className="p-2 border border-gray-350 text-center">Matrículas</th>
                            <th className="p-2 border border-gray-355 text-right font-bold">Inscrições (R$)</th>
                            <th className="p-2 border border-gray-355 text-right font-bold">Despesas (R$)</th>
                            <th className="p-2 border border-gray-355 text-right font-bold">Balanço (R$)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {events.map(ev => {
                            const rev = getEventRevenue(ev.id);
                            const exp = getEventExpenses(ev.id);
                            const bal = rev - exp;
                            return (
                              <tr key={ev.id} className="border-b border-gray-300 font-medium">
                                <td className="p-2 border border-gray-300 font-bold">{ev.name}</td>
                                <td className="p-2 border border-gray-300">{ev.category}</td>
                                <td className="p-2 border border-gray-300 text-center font-mono">{getEventEnrollmentsCount(ev.id)}</td>
                                <td className="p-2 border border-gray-300 text-right font-mono">R$ {rev.toFixed(2)}</td>
                                <td className="p-2 border border-gray-300 text-right font-mono text-red-650 font-bold">R$ {exp.toFixed(2)}</td>
                                <td className={`p-2 border border-gray-300 text-right font-mono font-bold ${bal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  R$ {bal.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Seção B: lançamentos detalhados do livro-caixa */}
                  <div className="mb-6">
                    <h4 className="text-xs uppercase font-extrabold text-black border-l-4 border-black pl-2.5 mb-3">
                      {reportEventId === 'ALL' ? 'Item 2. Histórico Contábil Detalhado (Livro Caixa)' : 'Item 1. Rol de Movimentações Alocadas (Entradas e Saídas)'}
                    </h4>
                    <table className="w-full text-left text-[11px] border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100 uppercase text-[9px] font-bold text-gray-700 border-b border-gray-300">
                          <th className="p-2 border border-gray-300">ID Lançamento</th>
                          <th className="p-2 border border-gray-300">Evento Alvo</th>
                          <th className="p-2 border border-gray-300">Descrição / Destino</th>
                          <th className="p-2 border border-gray-300">Tipo</th>
                          <th className="p-2 border border-gray-300">Categoria</th>
                          <th className="p-2 border border-gray-300 mr-2">Data</th>
                          <th className="p-2 border border-gray-355 text-right font-bold">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportEventId === 'ALL' 
                          ? allExpenses 
                          : allExpenses.filter(x => x.eventId === reportEventId)
                        ).map(ex => (
                          <tr key={ex.id} className="border-b border-gray-300">
                            <td className="p-2 border border-gray-300 font-mono text-[10px]">{ex.id}</td>
                            <td className="p-2 border border-gray-300 font-bold">{ex.eventName}</td>
                            <td className="p-2 border border-gray-300">{ex.description}</td>
                            <td className="p-2 border border-gray-300 font-semibold">{ex.type === 'ENTRADA' ? 'Entrada' : 'Saída'}</td>
                            <td className="p-2 border border-gray-300 font-bold">{ex.category}</td>
                            <td className="p-2 border border-gray-300 text-center">{ex.date}</td>
                            <td className={`p-2 border border-gray-300 text-right font-mono font-bold ${ex.type === 'ENTRADA' ? 'text-green-700' : 'text-red-650'}`}>
                              {ex.type === 'ENTRADA' ? '+' : '-'} R$ {ex.value.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        {(reportEventId === 'ALL' ? allExpenses.length : allExpenses.filter(x => x.eventId === reportEventId).length) === 0 && (
                          <tr>
                            <td colSpan={7} className="p-4 border border-gray-300 text-center text-gray-400">Nenhum débito, crédito ou gasto alocado para este escopo.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Declaração de integridade */}
                  <div className="mt-8 border border-gray-350 p-4 rounded bg-gray-50 text-[10.5px] text-gray-600 print:bg-white print:border-black">
                    <p className="font-bold text-black uppercase mb-1">Declaração de Conformidade & Autoria Sistêmica</p>
                    <p>O presente balancete consolida faturas, taxas de matrícula de Semana Acadêmica e despesas reais cadastradas por coordenadores habilitados na base sistêmica de eventos do Centro Universitário Campo Real. Por meio deste documento, certifica-se a conformidade e integridade fiscal dos valores demonstrados no exercício fiscal de vigência acadêmica.</p>
                  </div>

                  {/* Bloco de assinaturas na parte inferior */}
                  <div className="mt-12 flex justify-between items-end">
                    <div className="flex flex-col items-center flex-1 max-w-[280px]">
                      <div className="border-b border-black w-full mb-1"></div>
                      <span className="text-[10px] font-bold uppercase">{currentUser.name}</span>
                      <span className="text-[9px] text-gray-500 uppercase">{currentUser.role} Emissor</span>
                    </div>

                    <div className="flex flex-col items-center flex-1 max-w-[280px]">
                      <div className="border-b border-black w-full mb-1"></div>
                      <span className="text-[10px] font-bold uppercase">Prof. Roberto de Almeida — Campo Real</span>
                      <span className="text-[9px] text-gray-500 uppercase">Coordenação Geral de Extensão</span>
                    </div>
                  </div>

                </div>

                {/* Rodapé do modal que não será impresso */}
                <div className="non-printable-element p-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
                  <button 
                    onClick={() => setShowReportModal(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold uppercase text-[10px] tracking-wider px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Fechar Terminais
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* SUBVISÃO: VOUCHERS DE PRÉ-VENDA */}
      {activeSubTab === 'VOUCHERS' && (
        <VoucherManager 
          currentUser={currentUser}
          events={events}
          onDataChanged={onDataChanged}
        />
      )}

      {/* SUBVISÃO: CONFIGURAÇÕES GERAIS (RECEBIMENTO E SMTP) */}
      {activeSubTab === 'CONFIGURACOES' && (
        <div className="flex flex-col gap-6 animate-fade-in text-gray-800">
          
          {/* Cabeçalho das configurações gerais */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 gap-3">
            <div>
              <h3 className="text-gray-900 font-extrabold text-base uppercase tracking-tight flex items-center gap-2 leading-none">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Configurações Gerais do Sistema</span>
              </h3>
            </div>
          </div>

          {/* CARD 1: CONFIGURAÇÕES GERAIS DE RECEBIMENTO (PIX & WHATSAPP) & E-MAIL DE SUPORTE */}
          <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-emerald-100 pb-3 mb-4 gap-2">
              <div>
                <h4 className="text-emerald-900 font-bold text-sm uppercase tracking-wider leading-none flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Configurações Gerais de Recebimento & Contato (Pix, WhatsApp e Suporte)</span>
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Defina a chave Pix institucional, o número de WhatsApp de atendimento e o endereço de e-mail que receberá os formulários de suporte enviados pelos usuários.
                </p>
              </div>

              {recebimentoSaveSuccess && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fade-in">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Dados Salvos com Sucesso!
                </span>
              )}
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  DB.saveSystemSettings({
                    pixKey: coordinatorPixKey,
                    whatsapp: coordinatorWhatsapp,
                    supportEmail: coordinatorSupportEmail
                  }, currentUser);
                  setRecebimentoSaveSuccess(true);
                  setTimeout(() => setRecebimentoSaveSuccess(false), 3500);
                  onDataChanged();
                } catch (err: any) {
                  alert(err.message || 'Erro ao salvar as configurações globais de recebimento e suporte.');
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <span>Chave Pix Institucional</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={coordinatorPixKey} 
                    onChange={(e) => setCoordinatorPixKey(e.target.value)} 
                    placeholder="Ex: CNPJ, E-mail, Telefone ou Chave Aleatória (EVP)" 
                    className="bg-emerald-50/20 border border-emerald-300 rounded-xl p-2.5 text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 w-full h-[40px]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <span>Número do WhatsApp de Suporte</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={coordinatorWhatsapp} 
                    onChange={(e) => setCoordinatorWhatsapp(e.target.value)} 
                    placeholder="Ex: (42) 99999-9999 ou 42999999999" 
                    className="bg-emerald-50/20 border border-emerald-300 rounded-xl p-2.5 text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 w-full h-[40px]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-4">
                  <label className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-700" />
                    <span>E-mail de Recebimento do Suporte</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    value={coordinatorSupportEmail} 
                    onChange={(e) => setCoordinatorSupportEmail(e.target.value)} 
                    placeholder="Ex: softweek@aeg.dev.br" 
                    className="bg-emerald-50/20 border border-emerald-300 rounded-xl p-2.5 text-xs font-semibold text-emerald-950 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 w-full h-[40px]"
                    required
                  />
                </div>

                <div className="md:col-span-12 flex justify-end pt-1">
                  <button 
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 active:scale-97 text-white font-extrabold text-xs uppercase tracking-wider h-[40px] px-6 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                    <span>Salvar Dados de Recebimento & Suporte</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* CARD NOVO: IMAGEM DE BANNER DA TELA INICIAL DE LOGIN */}
          <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-blue-100 pb-3 gap-2">
              <div>
                <h4 className="text-blue-950 font-bold text-sm uppercase tracking-wider leading-none flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Imagem de Banner da Tela Inicial de Login</span>
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  Configure a imagem de capa principal exibida no painel esquerdo da tela de login e cadastro (aceitando envio de imagem ou link externo).
                </p>
              </div>

              {loginBannerSaveSuccess && (
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fade-in">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  Banner Atualizado com Sucesso!
                </span>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <BannerUploadInput
                id="coordenador-login-banner-upload-input"
                value={coordinatorLoginBanner}
                onChange={(url) => setCoordinatorLoginBanner(url)}
                label="Banner da Tela de Login / Cadastro (Arquivo de Imagem ou Link URL)"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    const defaultUrl = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';
                    setCoordinatorLoginBanner(defaultUrl);
                    DB.setLoginBannerImage(defaultUrl, currentUser);
                    setLoginBannerSaveSuccess(true);
                    setTimeout(() => setLoginBannerSaveSuccess(false), 3500);
                    onDataChanged();
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 font-semibold underline cursor-pointer"
                >
                  Restaurar Imagem Padrão
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      if (!coordinatorLoginBanner || !coordinatorLoginBanner.trim()) {
                        alert('Por favor, selecione uma imagem ou informe uma URL de banner.');
                        return;
                      }
                      DB.setLoginBannerImage(coordinatorLoginBanner, currentUser);
                      setLoginBannerSaveSuccess(true);
                      setTimeout(() => setLoginBannerSaveSuccess(false), 3500);
                      onDataChanged();
                    } catch (err: any) {
                      alert(err.message || 'Erro ao salvar o banner de login.');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-6 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                  <span>Salvar Imagem de Banner da Tela de Login</span>
                </button>
              </div>
            </div>
          </div>

          {/* CARD 2: CONFIGURAÇÕES DE SERVIDOR SMTP & NOTIFICAÇÕES */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-3 gap-2">
              <div>
                <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider leading-none flex items-center gap-2">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span>Configurações do Servidor SMTP (E-mails & Notificações)</span>
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  const hasRequired = !!(smtpSettings.host && smtpSettings.user);
                  if (!hasRequired) {
                    return (
                      <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-gray-100 text-gray-600 border-gray-200">
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        Não Configurado
                      </span>
                    );
                  }
                  if (smtpSettings.status === 'working' || smtpSettings.isWorking === true) {
                    return (
                      <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 animate-fade-in" title="Status Global: Servidor SMTP verificado e operacional no sistema">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Servidor Funcionando
                      </span>
                    );
                  }
                  if (smtpSettings.status === 'error' || (smtpSettings.isWorking === false && !!smtpSettings.lastTestedAt)) {
                    return (
                      <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-rose-50 text-rose-700 border-rose-200 animate-fade-in" title="Status Global: Falha na conexão com o servidor SMTP">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        Falha na Conexão
                      </span>
                    );
                  }
                  return (
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full border flex items-center gap-1.5 bg-blue-50 text-blue-700 border-blue-200" title="Status Global: Pendente de Teste de Conexão">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Pendente de Teste
                    </span>
                  );
                })()}
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              try {
                DB.setSmtpSettings(smtpSettings, currentUser);
                setSmtpSaveSuccess(true);
                setTimeout(() => setSmtpSaveSuccess(false), 3500);
                onDataChanged();
              } catch (err: any) {
                alert(err.message || 'Erro ao salvar as configurações de SMTP.');
              }
            }} className="flex flex-col gap-6">
              
              {/* Seção 1 do formulário: dados de conexão com o servidor */}
              <div>
                <span className="text-xs text-blue-600 font-extrabold uppercase tracking-wider block mb-3">
                  1. Parâmetros de Conexão SMTP
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Host SMTP */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Host do Servidor SMTP</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={smtpSettings.host} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })} 
                      placeholder="ex: smtp.camporeal.edu.br ou smtp.gmail.com" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      required
                    />
                    <span className="text-[11px] text-gray-400">Endereço IP ou domínio do gateway de envio de e-mails.</span>
                  </div>

                  {/* Porta SMTP */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Server className="w-3.5 h-3.5 text-blue-600" />
                      <span>Porta de Conexão</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="number" 
                      min={1}
                      max={65535}
                      value={smtpSettings.port} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, port: Number(e.target.value) })} 
                      placeholder="587 ou 465" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      required
                    />
                    <span className="text-[11px] text-gray-400">Padrões: 587 (STARTTLS) ou 465 (SSL/TLS).</span>
                  </div>

                  {/* Criptografia / Segurança */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Segurança de Transporte</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <select 
                      value={smtpSettings.secure}
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.value as 'TLS' | 'SSL' | 'NONE' })}
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    >
                      <option value="TLS">TLS / STARTTLS (Recomendado - Porta 587)</option>
                      <option value="SSL">SSL / TLS Direto (Porta 465)</option>
                      <option value="NONE">Sem Criptografia (Porta 25 / Não Recomendado)</option>
                    </select>
                    <span className="text-[11px] text-gray-400">Tipo de canal criptográfico negociado com o servidor.</span>
                  </div>

                  {/* Usuário SMTP */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Usuário de Autenticação</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={smtpSettings.user} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })} 
                      placeholder="ex: eventos@camporeal.edu.br" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      required
                    />
                    <span className="text-[11px] text-gray-400">E-mail ou credencial para autenticação no servidor.</span>
                  </div>

                  {/* Senha SMTP */}
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      <span>Senha / Token de Aplicativo</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showSmtpPassword ? 'text' : 'password'} 
                        value={smtpSettings.pass} 
                        onChange={(e) => setSmtpSettings({ ...smtpSettings, pass: e.target.value })} 
                        placeholder="••••••••••••••••" 
                        className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 pr-10 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all w-full"
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
                        title={showSmtpPassword ? 'Ocultar senha' : 'Exibir senha'}
                      >
                        {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[11px] text-gray-400">Senha da conta de serviço ou senha de aplicativo (App Password).</span>
                  </div>

                </div>
              </div>

              {/* Seção 2 do formulário: configurações de e-mail */}
              <div className="border-t border-gray-150 pt-5">
                <span className="text-xs text-blue-600 font-extrabold uppercase tracking-wider block mb-3">
                  Configurações E-mail
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Nome do Remetente */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700">Nome de Exibição</label>
                    <input 
                      type="text" 
                      value={smtpSettings.senderName} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, senderName: e.target.value })} 
                      placeholder="Ex: Campo Real Eventos Institucionais" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  {/* E-mail do Remetente */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700">E-mail do Remetente</label>
                    <input 
                      type="email" 
                      value={smtpSettings.senderEmail} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, senderEmail: e.target.value })} 
                      placeholder="Ex: eventos@camporeal.edu.br" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                      required
                    />
                  </div>

                  {/* E-mail para resposta (Reply-To) */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-gray-700">E-mail para Resposta</label>
                    <input 
                      type="email" 
                      value={smtpSettings.replyTo || ''} 
                      onChange={(e) => setSmtpSettings({ ...smtpSettings, replyTo: e.target.value })} 
                      placeholder="Ex: suporte.eventos@camporeal.edu.br" 
                      className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                    />
                  </div>

                </div>
              </div>

              {/* Seção 3 do formulário: notificações */}
              <div className="border-t border-gray-150 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-blue-600 font-extrabold uppercase tracking-wider block">
                      Notificações
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Gatilho 1: novo cadastro */}
                  <div 
                    onClick={() => {
                      const nextVal = !(smtpSettings.notifyNewRegistration ?? smtpSettings.notifyOnRegister ?? true);
                      setSmtpSettings({ ...smtpSettings, notifyNewRegistration: nextVal, notifyOnRegister: nextVal });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      (smtpSettings.notifyNewRegistration ?? smtpSettings.notifyOnRegister ?? true)
                        ? 'bg-blue-50/40 border-blue-300 shadow-2xs' 
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">👤</span>
                      <span className="font-extrabold text-xs text-gray-900">Notificação de Novo Cadastro</span>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      (smtpSettings.notifyNewRegistration ?? smtpSettings.notifyOnRegister ?? true)
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Gatilho 2: inscrição em eventos */}
                  <div 
                    onClick={() => {
                      const nextVal = !(smtpSettings.notifyEventEnrollment ?? smtpSettings.notifyOnEnrollment ?? true);
                      setSmtpSettings({ ...smtpSettings, notifyEventEnrollment: nextVal, notifyOnEnrollment: nextVal });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      (smtpSettings.notifyEventEnrollment ?? smtpSettings.notifyOnEnrollment ?? true)
                        ? 'bg-blue-50/40 border-blue-300 shadow-2xs' 
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎟️</span>
                      <span className="font-extrabold text-xs text-gray-900">Notificação de Inscrição em Evento</span>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      (smtpSettings.notifyEventEnrollment ?? smtpSettings.notifyOnEnrollment ?? true)
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Gatilho 3: homologação de pagamento */}
                  <div 
                    onClick={() => {
                      const nextVal = !(smtpSettings.notifyPaymentConfirmation ?? smtpSettings.notifyOnPaymentApproved ?? true);
                      setSmtpSettings({ ...smtpSettings, notifyPaymentConfirmation: nextVal, notifyOnPaymentApproved: nextVal });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      (smtpSettings.notifyPaymentConfirmation ?? smtpSettings.notifyOnPaymentApproved ?? true)
                        ? 'bg-blue-50/40 border-blue-300 shadow-2xs' 
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💳</span>
                      <span className="font-extrabold text-xs text-gray-900">Confirmação de Pagamento & Voucher</span>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      (smtpSettings.notifyPaymentConfirmation ?? smtpSettings.notifyOnPaymentApproved ?? true)
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Gatilho 4: recuperação de conta ou senha */}
                  <div 
                    onClick={() => {
                      const nextVal = !(smtpSettings.notifyPasswordRecovery ?? smtpSettings.notifyOnPasswordRecovery ?? true);
                      setSmtpSettings({ ...smtpSettings, notifyPasswordRecovery: nextVal, notifyOnPasswordRecovery: nextVal });
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      (smtpSettings.notifyPasswordRecovery ?? smtpSettings.notifyOnPasswordRecovery ?? true)
                        ? 'bg-blue-50/40 border-blue-300 shadow-2xs' 
                        : 'bg-gray-50 border-gray-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔑</span>
                      <span className="font-extrabold text-xs text-gray-900">Recuperação de Conta & Senha</span>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      (smtpSettings.notifyPasswordRecovery ?? smtpSettings.notifyOnPasswordRecovery ?? true)
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-white border-gray-300 text-transparent'
                    }`}>
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </div>
              </div>

              {/* Botão de Salvamento Principal de SMTP */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-150 pt-5 gap-3">
                <div className="flex items-center gap-2">
                  {smtpSaveSuccess && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Configurações de SMTP salvas e ativadas com sucesso!
                    </span>
                  )}
                </div>

                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3 rounded-xl cursor-pointer transition-all flex items-center gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Configurações de SMTP</span>
                </button>
              </div>

            </form>
          </div>

          {/* CARTÃO 3: TESTE DE CONEXÃO E ENVIO SMTP DE DIAGNÓSTICO */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-3 gap-2">
              <div>
                <h4 className="text-gray-900 font-bold text-sm uppercase tracking-wider leading-none flex items-center gap-2">
                  <Send className="w-4 h-4 text-purple-600" />
                  <span>Teste de e-mail</span>
                </h4>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-end gap-3">
              <div className="flex-1 flex flex-col gap-1 w-full">
                <label className="text-xs font-bold text-gray-700">E-mail Destinatário de Teste</label>
                <input 
                  type="email" 
                  value={testEmailAddress} 
                  onChange={(e) => setTestEmailAddress(e.target.value)} 
                  placeholder="seu-email@dominio.com" 
                  className="bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
                />
              </div>

              <button 
                type="button" 
                onClick={async () => {
                  if (!smtpSettings.host || !smtpSettings.user) {
                    alert('Por favor, preencha o Host e Usuário SMTP antes de testar a conexão.');
                    return;
                  }

                  setIsTestingSmtp(true);
                  setSmtpTestResult(null);

                  try {
                    const result = await DB.testSmtpSettings(smtpSettings, testEmailAddress, currentUser);
                    setIsTestingSmtp(false);
                    const timeStr = new Date().toLocaleTimeString('pt-BR');
                    
                    const isWorking = !!result.success;
                    const newStatus = result.status || (isWorking ? 'working' : 'error');
                    setSmtpSettings(prev => ({
                      ...prev,
                      status: newStatus,
                      isWorking,
                      lastTestedAt: result.lastTestedAt || new Date().toISOString(),
                      lastTestMessage: result.message
                    }));

                    setSmtpTestResult({
                      success: !!result.success,
                      message: result.message || (result.success ? 'Conexão SMTP validada com sucesso!' : 'Falha na conexão SMTP.'),
                      timestamp: timeStr,
                      logs: result.logs || [
                        `[${timeStr}] Conectando ao host ${smtpSettings.host}:${smtpSettings.port || 587}...`,
                        `[${timeStr}] Resultado: ${result.success ? 'SUCESSO - Conexão ativa e pronta' : 'ERRO - ' + (result.message || 'Falha')}`
                      ]
                    });

                    onDataChanged();
                  } catch (err: any) {
                    setIsTestingSmtp(false);
                    const timeStr = new Date().toLocaleTimeString('pt-BR');
                    const errMsg = err.message || 'Erro inesperado durante o teste de conexão.';
                    setSmtpSettings(prev => ({
                      ...prev,
                      status: 'error',
                      isWorking: false,
                      lastTestedAt: new Date().toISOString(),
                      lastTestMessage: errMsg
                    }));
                    setSmtpTestResult({
                      success: false,
                      message: `Falha na conexão: ${errMsg}`,
                      timestamp: timeStr,
                      logs: [
                        `[${timeStr}] Conectando ao host ${smtpSettings.host}:${smtpSettings.port || 587}...`,
                        `[${timeStr}] ERRO: ${errMsg}`
                      ]
                    });
                  }
                }}
                disabled={isTestingSmtp}
                className="bg-purple-600 hover:bg-purple-700 active:scale-97 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 h-[42px] w-full md:w-auto"
              >
                {isTestingSmtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{testEmailAddress ? 'Disparar E-mail de Teste' : 'Testar Conexão SMTP'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Exibição do resultado do teste e logs do console */}
            {smtpTestResult && (
              <div className={`p-4 rounded-xl border flex flex-col gap-3 animate-fade-in ${
                smtpTestResult.success 
                  ? 'bg-emerald-50/40 border-emerald-200' 
                  : 'bg-rose-50/40 border-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  {smtpTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className={`text-xs font-bold ${smtpTestResult.success ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {smtpTestResult.message}
                  </span>
                </div>

                {smtpTestResult.logs && smtpTestResult.logs.length > 0 && (
                  <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-[10px] flex flex-col gap-1 overflow-x-auto shadow-inner">
                    <div className="text-gray-400 font-bold uppercase text-[9px] border-b border-gray-700 pb-1 mb-1 flex justify-between items-center">
                      <span>Console de Transmissão SMTP</span>
                      <span>{smtpTestResult.timestamp}</span>
                    </div>
                    {smtpTestResult.logs.map((line, idx) => (
                      <div key={idx} className={line.includes('SUCESSO') || line.includes('OK') ? 'text-emerald-400 font-semibold' : line.includes('ERRO') || line.includes('FALHA') ? 'text-rose-400 font-semibold' : 'text-gray-300'}>
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL PERSONALIZADO DE CONFIRMAÇÃO SOBREPOSTA PARA ENCERRAR ATIVIDADES */}
      {eventToClose && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in non-printable-element">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 p-6 max-w-md w-full shadow-xl animate-scale-in">
            <div className="text-center">
              <span className="text-4xl block mb-3">⚠️</span>
              <h4 className="text-gray-900 dark:text-zinc-101 font-extrabold text-sm uppercase tracking-wider">
                Encerrar Evento Acadêmico
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-3 leading-relaxed">
                Atenção: Ao encerrar o evento <strong className="text-gray-950 dark:text-white">"{eventToClose.name}"</strong>, você finalizará as atividades acadêmicas e liberará a emissão do relatório consolidado de frequência dos workshops para os orientadores.
              </p>
              <p className="text-gray-500 dark:text-zinc-400 text-[10px] mt-2.5 font-medium italic">
                Esta ação é definitiva e atualizará o status do evento para <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-zinc-800 dark:text-amber-300 px-1.5 py-0.5 rounded">ENCERRADO</span>.
              </p>
            </div>

            <div className="mt-6 flex gap-3 justify-center text-xs font-bold">
              <button
                type="button"
                onClick={() => setEventToClose(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold uppercase text-[10px] tracking-wider py-3 px-4 rounded-xl cursor-pointer transition-colors text-center"
              >
                Mudar de Ideia
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    DB.updateEvent(eventToClose.id, { status: 'ENCERRADO' }, currentUser);
                    setEventToClose(null);
                    onDataChanged();
                  } catch (err: any) {
                    alert(err.message || 'Erro ao encerrar o evento.');
                  }
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-[10px] tracking-wider py-3 px-4 rounded-xl cursor-pointer transition-colors shadow-xs text-center flex items-center justify-center gap-1.5 border border-amber-600"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE EVENTO */}
      {eventToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-900/50">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Excluir Evento
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o evento <strong className="text-gray-950 dark:text-white">"{eventToDelete.name}"</strong>?
              </p>
            </div>

            {/* Resumo dos detalhes do evento */}
            <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-gray-200 dark:border-zinc-700/80 text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Data:</span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">
                  {new Date(eventToDelete.startDate + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Status:</span>
                <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-zinc-200">
                  {eventToDelete.status}
                </span>
              </div>
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-[11px] rounded-lg p-2.5 font-medium leading-relaxed mt-1">
                ⚠️ Esta ação removerá o evento e todos os workshops, inscrições, frequências e certificados associados de forma irreversível.
              </div>
            </div>

            {deleteEventError && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl">
                {deleteEventError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeletingEvent}
                onClick={() => {
                  setEventToDelete(null);
                  setDeleteEventError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingEvent}
                onClick={() => {
                  setIsDeletingEvent(true);
                  setDeleteEventError(null);
                  try {
                    DB.deleteEvent(eventToDelete.id, currentUser);
                    setEventToDelete(null);
                    onDataChanged();
                  } catch (err: any) {
                    setDeleteEventError(err.message || "Erro ao excluir evento.");
                  } finally {
                    setIsDeletingEvent(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isDeletingEvent ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir Evento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE WORKSHOP */}
      {workshopToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-900/50">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Excluir Workshop
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Tem certeza que deseja apagar o workshop <strong className="text-gray-950 dark:text-white">"{workshopToDelete.name}"</strong>?
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-gray-200 dark:border-zinc-700/80 text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Instrutor:</span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">{workshopToDelete.instructor}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Horário:</span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">{workshopToDelete.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Inscritos:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-zinc-200">{workshopToDelete.enrolledCount} / {workshopToDelete.maxParticipants}</span>
              </div>
            </div>

            {deleteWorkshopError && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl">
                {deleteWorkshopError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeletingWorkshop}
                onClick={() => {
                  setWorkshopToDelete(null);
                  setDeleteWorkshopError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingWorkshop}
                onClick={() => {
                  setIsDeletingWorkshop(true);
                  setDeleteWorkshopError(null);
                  try {
                    DB.deleteWorkshop(workshopToDelete.id, currentUser);
                    setWorkshopToDelete(null);
                    onDataChanged();
                  } catch (err: any) {
                    setDeleteWorkshopError(err.message || "Erro ao apagar workshop.");
                  } finally {
                    setIsDeletingWorkshop(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isDeletingWorkshop ? (
                  <span>Apagando...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Apagar Workshop</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE DESPESA / ENTRADA */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-900/50">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Excluir {expenseToDelete.type === "ENTRADA" ? "Entrada" : "Despesa"}
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Deseja realmente remover o lançamento <strong className="text-gray-950 dark:text-white">"{expenseToDelete.description}"</strong> de valor <strong className="text-gray-950 dark:text-white">R$ {expenseToDelete.value.toFixed(2)}</strong>?
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExpense}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE RECUSA/CANCELAMENTO DE INSCRIÇÃO */}
      {enrollmentToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-900/50">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Recusar Inscrição
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Deseja recusar e cancelar a inscrição de <strong className="text-gray-950 dark:text-white">"{enrollmentToCancel.userName}"</strong> ({enrollmentToCancel.eventName})?
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEnrollmentToCancel(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    DB.updateEnrollmentStatus(enrollmentToCancel.id, "CANCELADO", currentUser);
                    setEnrollmentToCancel(null);
                    onDataChanged();
                  } catch (err: any) {
                    alert(err.message || "Erro ao cancelar inscrição.");
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Recusar Inscrição</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE REVERSÃO PARA PENDENTE */}
      {enrollmentToRevert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-200 dark:border-amber-900/50">
                <AlertCircle className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Reverter Inscrição
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Deseja reverter o pagamento de <strong className="text-gray-950 dark:text-white">"{enrollmentToRevert.userName}"</strong> de volta para o status <span className="font-mono font-bold text-amber-700 bg-amber-50 dark:bg-zinc-800 dark:text-amber-300 px-1.5 py-0.5 rounded">PENDENTE</span>?
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEnrollmentToRevert(null)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    DB.updateEnrollmentStatus(enrollmentToRevert.id, "PENDENTE", currentUser);
                    setEnrollmentToRevert(null);
                    onDataChanged();
                  } catch (err: any) {
                    alert(err.message || "Erro ao reverter status.");
                  }
                }}
                className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
              >
                <span>Reverter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* Modal do scanner de câmera QR para a coordenação */}
      {isCredCameraScannerOpen && activeCredEventObj && (
        <QrCameraScannerModal
          event={activeCredEventObj}
          selectedWorkshopId={selectedCredWorkshopId}
          workshops={workshops}
          enrollments={enrollments}
          attendances={attendances}
          currentUser={currentUser}
          onClose={() => setIsCredCameraScannerOpen(false)}
          onDataChanged={onDataChanged}
        />
      )}

      {/* Modal de impressão da lista de presença para a coordenação */}
      {isPrintingAttendance && selectedEventIdForInscritos && (() => {
        const evObj = events.find(e => e.id === selectedEventIdForInscritos);
        if (!evObj) return null;
        return (
          <AttendanceSheetPrintModal
            event={evObj}
            workshops={workshops}
            enrollments={enrollments}
            attendances={attendances}
            onClose={() => setIsPrintingAttendance(false)}
          />
        );
      })()}

      {/* Modal de impressão das etiquetas Pimaco A4356 para a coordenação */}
      {isPrintingBadgeLabels && (activeCredEventObj || events[0]) && (() => {
        const evObj = activeCredEventObj || events[0];
        if (!evObj) return null;
        return (
          <BadgeLabelsPrintModal
            event={evObj}
            enrollments={enrollments}
            onClose={() => setIsPrintingBadgeLabels(false)}
          />
        );
      })()}

      {/* Modal de impressão do relatório de frequência para a coordenação */}
      {isPrintingFrequencyReport && (() => {
        const evObj = events.find(e => e.id === (selectedReportEventId || selectedEventIdForInscritos)) || events[0];
        if (!evObj) return null;
        return (
          <FrequencyReportPrintModal
            event={evObj}
            workshops={workshops}
            enrollments={enrollments}
            attendances={attendances}
            onClose={() => setIsPrintingFrequencyReport(false)}
          />
        );
      })()}

      {/* Force Password Change Modal (Alteração de Senha Forçada pelo Administrador) */}
      {forcePasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 leading-tight">Alteração de Senha</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForcePasswordUser(null);
                  setForcedPasswordError(null);
                  setIsForcedPasswordSaved(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Faixa de informações do usuário-alvo */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-150 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Usuário</span>
                <span className="font-bold text-gray-800 truncate block">{forcePasswordUser.name}</span>
                <span className="text-gray-500 font-mono text-[11px] truncate block">{forcePasswordUser.email}</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                forcePasswordUser.role === 'ORGANIZADOR'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {forcePasswordUser.role}
              </span>
            </div>

            {/* Formulário */}
            <form onSubmit={handleForcePasswordChange} className="p-6 flex flex-col gap-4">
              {forcedPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{forcedPasswordError}</span>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700">Nova Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showForcedPassword ? 'text' : 'password'}
                    value={newForcedPassword}
                    onChange={(e) => {
                      setNewForcedPassword(e.target.value);
                      setForcedPasswordError(null);
                    }}
                    placeholder="Digite a nova senha (mínimo 6 caracteres)"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-800 font-mono outline-none transition-all disabled:opacity-60"
                    required
                    minLength={6}
                    autoFocus
                    disabled={isSubmittingForcedPassword || isForcedPasswordSaved}
                  />
                  <button
                    type="button"
                    onClick={() => setShowForcedPassword(!showForcedPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title={showForcedPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showForcedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmForcedPassword ? 'text' : 'password'}
                    value={confirmForcedPassword}
                    onChange={(e) => {
                      setConfirmForcedPassword(e.target.value);
                      setForcedPasswordError(null);
                    }}
                    placeholder="Repita a nova senha para confirmação"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-blue-600 focus:bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs text-gray-800 font-mono outline-none transition-all disabled:opacity-60"
                    required
                    minLength={6}
                    disabled={isSubmittingForcedPassword || isForcedPasswordSaved}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmForcedPassword(!showConfirmForcedPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                    title={showConfirmForcedPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showConfirmForcedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Botões do modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setForcePasswordUser(null);
                    setForcedPasswordError(null);
                    setIsForcedPasswordSaved(false);
                  }}
                  disabled={isSubmittingForcedPassword || isForcedPasswordSaved}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForcedPassword || isForcedPasswordSaved || !newForcedPassword || !confirmForcedPassword}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isForcedPasswordSaved
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-102 ring-2 ring-emerald-400/40'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSubmittingForcedPassword ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : isForcedPasswordSaved ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white animate-in zoom-in-75 duration-200" />
                      <span>Senha Salva!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Nova Senha</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão de usuário (apagar usuário pelo administrador) */}
      {deleteUserConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Cabeçalho do modal */}
            <div className="px-6 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950 leading-tight">Excluir Usuário</h4>
                  <p className="text-[11px] text-rose-700">Ação administrativa irreversível</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDeleteUserConfirm(null);
                  setDeleteUserError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {deleteUserError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{deleteUserError}</span>
                </div>
              )}

              <p className="text-xs text-gray-600 leading-relaxed">
                Tem certeza de que deseja apagar o usuário abaixo? Esta operação removerá definitivamente o cadastro e todas as credenciais de acesso ao sistema.
              </p>

              {currentUser && currentUser.id === deleteUserConfirm.id && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    Atenção: Você está excluindo a sua própria conta de acesso logada. Ao confirmar a exclusão, sua sessão será encerrada e você será desconectado imediatamente.
                  </span>
                </div>
              )}

              {/* Resumo do cartão do usuário */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-sm">{deleteUserConfirm.name}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border bg-gray-100 text-gray-700 border-gray-300">
                    {deleteUserConfirm.role}
                  </span>
                </div>
                <span className="text-gray-500 font-mono text-[11px]">{deleteUserConfirm.email}</span>
                {deleteUserConfirm.ra && (
                  <span className="text-gray-500 text-[11px]">RA: <span className="font-mono font-bold text-gray-800">{deleteUserConfirm.ra}</span></span>
                )}
                {deleteUserConfirm.course && (
                  <span className="text-gray-500 text-[11px]">Curso: <span className="font-medium text-gray-800">{deleteUserConfirm.course}</span></span>
                )}
              </div>

              {/* Botões do modal */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-150 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteUserConfirm(null);
                    setDeleteUserError(null);
                  }}
                  disabled={isDeletingUser}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingUser ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Apagando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Sim, Apagar Usuário</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

