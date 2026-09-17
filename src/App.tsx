import React, { useState, useEffect } from 'react';
import Header from './shared/components/Header';
import HeroCarrossel from './shared/components/HeroCarrossel';
import EventGrid from './shared/components/EventGrid';
import EventDetailModal from './shared/components/EventDetailModal';
import CheckoutModal from './shared/components/CheckoutModal';
import DashboardAluno from './shared/components/DashboardAluno';
import DashboardOrganizador from './shared/components/DashboardOrganizador';
import DashboardCoordenador from './shared/components/DashboardCoordenador';
import AuthModal from './shared/components/AuthModal';
import CertificateView from './shared/components/CertificateView';
import Footer from './shared/components/Footer';
import LoginLanding from './shared/components/LoginLanding';
import ComoFunciona from './shared/components/ComoFunciona';
import AjudaFaq from './shared/components/AjudaFaq';
import PoliticaPrivacidade from './shared/components/PoliticaPrivacidade';
import { DB } from './shared/utils/db';
import { User, Event, Workshop, Enrollment, Attendance, HomeBanner, SystemLog, UserRole } from './types';
import { Users, FileCode, Play, AlertCircle, Sparkles, BookOpen } from 'lucide-react';

export default function App() {
  // Sincronização inicial do banco de dados
  const [dbLoaded, setDbLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Estados da interface (UI)
  const [activePage, setActivePage] = useState<'home' | 'como' | 'ajuda' | 'privacidade'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCheckoutForWsIds, setShowCheckoutForWsIds] = useState<string[] | null>(null); // Se não for nulo, representa o checkout para o selectEventId atualmente aberto
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [activeCertificateView, setActiveCertificateView] = useState<any>(null);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [pendingCheckoutWsIds, setPendingCheckoutWsIds] = useState<string[] | null>(null);
  const [forceCreateEvent, setForceCreateEvent] = useState(false);
  const [organizerTab, setOrganizerTab] = useState<'EVENTOS' | 'PRESENCAS' | 'RELATORIOS' | 'MEUS_INGRESSOS'>('EVENTOS');

  // Sincroniza dados na inicialização e edições
  const reloadFromDB = () => {
    DB.init();
    setCurrentUser(DB.getCurrentUser());
    setEvents(DB.getEvents());
    setWorkshops(DB.getWorkshops());
    setEnrollments(DB.getEnrollments());
    setAttendances(DB.getAttendance());
    setBanners(DB.getBanners());
    setLogs(DB.getLogs());
    setUsers(DB.getUsers());
  };

  const handleQuickCreateEvent = () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    
    if (currentUser.role === 'ORGANIZADOR') {
      setOrganizerTab('EVENTOS');
      setTimeout(() => {
        const target = document.getElementById('dashboard-top');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (currentUser.role === 'COORDENADOR' || currentUser.role === 'ROOT') {
      setTimeout(() => {
        const target = document.getElementById('dashboard-top');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      alert('Seu perfil de login é de "Participante" e não possui permissão para criar eventos.');
    }
  };

  useEffect(() => {
    reloadFromDB();
    setDbLoaded(true);
    // Sincroniza em segundo plano com o banco de dados MySQL do servidor Node
    DB.syncWithBackend(() => {
      reloadFromDB();
    });
  }, []);

  const handleLogout = () => {
    DB.setCurrentUser(null);
    setCurrentUser(null);
    setIsGuestMode(false);
    setActivePage('home');
    setPendingCheckoutWsIds(null);
    reloadFromDB();
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsGuestMode(false);
    setActivePage('home');
    reloadFromDB();

    if (selectedEventId && pendingCheckoutWsIds !== null) {
      const alreadyEnrolled = DB.getEnrollments().some(
        e => e.userId === user.id && e.eventId === selectedEventId && e.status !== 'CANCELADO'
      );
      if (!alreadyEnrolled) {
        setShowCheckoutForWsIds(pendingCheckoutWsIds);
      }
      setPendingCheckoutWsIds(null);
    }
  };

  // Executa o bloco de reserva efetiva dos ingressos
  const handleConfirmCheckout = (paymentOption: 'CREDITO' | 'PIX' | 'GRATUITO', voucherCode?: string) => {
    if (!selectedEventId) return;

    try {
      const userIdToUse = currentUser?.id;
      if (!userIdToUse) {
        setShowAuthModal(true);
        alert('Por favor, acesse sua conta ou cadastre-se para confirmar sua inscrição.');
        return;
      }

      DB.createEnrollment({
        userId: userIdToUse,
        eventId: selectedEventId,
        selectedWorkshops: showCheckoutForWsIds || [],
        paymentOption,
        voucherCode
      });

      // Limpa janelas de layout
      setShowCheckoutForWsIds(null);
      setSelectedEventId(null);
      if (currentUser?.role === 'ORGANIZADOR') {
        setOrganizerTab('MEUS_INGRESSOS');
      }
      reloadFromDB();
      setTimeout(() => {
        const target = document.getElementById('dashboard-top');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } catch (err: any) {
      alert(err.message || 'Erro ao efetivar checkout.');
    }
  };

  if (!dbLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] text-gray-800 flex items-center justify-center font-sans tracking-tight">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <span className="text-xs text-gray-500 mt-2 font-medium">Buscando tabelas relacionais Campo Real...</span>
        </div>
      </div>
    );
  }

  // Gateway da página inicial pré-login
  if (currentUser === null && !isGuestMode && activePage === 'home') {
    return (
      <LoginLanding 
        onLoginSuccess={handleLoginSuccess}
        onContinueAsGuest={() => setIsGuestMode(true)}
        onNavigate={(page) => {
          setActivePage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    );
  }

  // Auxiliar com detalhes do evento selecionado
  const trackingEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
  const trackingWorkshops = selectedEventId ? workshops.filter(w => w.eventId === selectedEventId) : [];
  const trackingAlreadyEnrolled = (currentUser && selectedEventId) 
    ? enrollments.some(e => e.userId === currentUser.id && e.eventId === selectedEventId && e.status !== 'CANCELADO')
    : false;

  const trackingEnrollment = (currentUser && selectedEventId)
    ? enrollments.find(e => e.userId === currentUser.id && e.eventId === selectedEventId && e.status !== 'CANCELADO')
    : null;

  const handleUpdateWorkshops = (selectedWsIds: string[]) => {
    if (!selectedEventId || !trackingEnrollment) return;
    try {
      DB.updateEnrollmentWorkshops(trackingEnrollment.id, selectedWsIds);
      reloadFromDB();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar workshops.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-950 flex flex-col font-sans antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* 1. Barra de navegação global (Header) */}
      <Header 
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setShowAuthModal(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onQuickCreateEvent={handleQuickCreateEvent}
        onProfileUpdated={reloadFromDB}
        onLogoClick={() => {
          setSearchQuery('');
          setSelectedEventId(null);
          setActivePage('home');
          if (isGuestMode) {
            setIsGuestMode(false);
          }
        }}
      />

      {/* Visualizações condicionais de páginas institucionais */}
      {activePage === 'como' && <ComoFunciona onBackToHome={() => setActivePage('home')} />}
      {activePage === 'ajuda' && <AjudaFaq onBackToHome={() => setActivePage('home')} />}
      {activePage === 'privacidade' && <PoliticaPrivacidade onBackToHome={() => setActivePage('home')} />}

      {activePage === 'home' && (
        <>
          {/* 2. Carrossel de banners promocionais superiores */}
          {!currentUser && !isGuestMode && (
            <HeroCarrossel 
              banners={banners}
              events={events}
              onSelectEvent={(id) => setSelectedEventId(id)}
            />
          )}

          {/* 4. Painéis adaptativos do espaço de trabalho conforme perfil logado */}
          {currentUser && (
            <main className="flex-1">
              {/* Renderiza painéis */}
              {currentUser.role === 'PARTICIPANTE' && (
                <DashboardAluno 
                  currentUser={currentUser}
                  enrollments={enrollments}
                  events={events}
                  workshops={workshops}
                  attendances={attendances}
                  certificates={DB.getCertificates(currentUser.id)}
                  onOpenCertificate={(c) => setActiveCertificateView(c)}
                  onProfileUpdated={reloadFromDB}
                  onSelectEvent={(id) => setSelectedEventId(id)}
                />
              )}

              {currentUser.role === 'ORGANIZADOR' && (
                <DashboardOrganizador 
                  currentUser={currentUser}
                  events={events}
                  workshops={workshops}
                  enrollments={enrollments}
                  attendances={attendances}
                  certificates={DB.getCertificates(currentUser.id)}
                  onDataChanged={reloadFromDB}
                  onOpenCertificate={(c) => setActiveCertificateView(c)}
                  onSelectEvent={(id) => setSelectedEventId(id)}
                  searchQuery={searchQuery}
                  activeTab={organizerTab}
                  onTabChange={setOrganizerTab}
                />
              )}

              {(currentUser.role === 'COORDENADOR' || currentUser.role === 'ROOT') && (
                <DashboardCoordenador 
                  currentUser={currentUser}
                  events={events}
                  workshops={workshops}
                  enrollments={enrollments}
                  logs={logs}
                  banners={banners}
                  systemUsers={users}
                  attendances={attendances}
                  onDataChanged={reloadFromDB}
                />
              )}
            </main>
          )}

          {/* 3. Grade pública global de busca e aquisição de ingressos */}
          {(!currentUser || (currentUser.role !== 'COORDENADOR' && currentUser.role !== 'ROOT' && currentUser.role !== 'ORGANIZADOR')) && (
            <div className="mt-4">
              <EventGrid 
                events={events}
                enrollments={enrollments}
                searchQuery={searchQuery}
                onSelectEvent={(id) => setSelectedEventId(id)}
                onQuickCreateEvent={handleQuickCreateEvent}
                hideCreateEventBanner={isGuestMode || currentUser?.role === 'PARTICIPANTE'}
              />
            </div>
          )}
        </>
      )}

      {/* 5. Rodapé institucional */}
      <Footer onNavigate={(page) => {
        setActivePage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }} />

      {/* SOBREPOSIÇÕES DE MODAIS */}

      {/* A. Modal de detalhes do evento */}
      {trackingEvent && showCheckoutForWsIds === null && (
        <EventDetailModal 
          event={trackingEvent}
          workshops={trackingWorkshops}
          alreadyEnrolled={trackingAlreadyEnrolled}
          currentUser={currentUser}
          enrollment={trackingEnrollment}
          onUpdateWorkshops={handleUpdateWorkshops}
          onClose={() => {
            setSelectedEventId(null);
            setPendingCheckoutWsIds(null);
          }}
          onOpenCheckout={(wsIds) => setShowCheckoutForWsIds(wsIds)}
          onOpenAuth={(wsIds) => {
            setPendingCheckoutWsIds(wsIds);
            setShowAuthModal(true);
          }}
        />
      )}

      {/* B. Modal de checkout e pagamento */}
      {trackingEvent && showCheckoutForWsIds !== null && (
        <CheckoutModal 
          event={trackingEvent}
          selectedWorkshops={workshops.filter(w => showCheckoutForWsIds.includes(w.id))}
          onClose={() => setShowCheckoutForWsIds(null)}
          onConfirm={handleConfirmCheckout}
        />
      )}

      {/* C. Modal de autenticação (login/cadastro) */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* D. Modal de visualização e impressão de certificado */}
      {activeCertificateView && (
        <CertificateView 
          certificate={activeCertificateView}
          onClose={() => setActiveCertificateView(null)}
        />
      )}

    </div>
  );
}
