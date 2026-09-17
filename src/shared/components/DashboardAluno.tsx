import React, { useState } from 'react';
import { User, Enrollment, Attendance, Certificate, Event, Workshop } from '../../types';
import { UserCircle, Shield, Award, Edit3, ClipboardList, CheckCircle2, QrCode, BookOpen, AlertCircle, Save, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DB } from '../utils/db';

interface DashboardAlunoProps {
  currentUser: User;
  enrollments: Enrollment[];
  events: Event[];
  workshops: Workshop[];
  attendances: Attendance[];
  certificates: Certificate[];
  onOpenCertificate: (cert: Certificate) => void;
  onProfileUpdated: () => void;
  onSelectEvent?: (id: string) => void;
}

export default function DashboardAluno({
  currentUser,
  enrollments,
  events,
  workshops,
  attendances,
  certificates,
  onOpenCertificate,
  onProfileUpdated,
  onSelectEvent
}: DashboardAlunoProps) {
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<string | null>(null);
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<Enrollment | null>(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState<Record<string, boolean>>({});

  const toggleTicketExpand = (id: string) => {
    setExpandedTicketIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtra as inscrições do aluno com unicidade garantida
  const studentEnrollments = Array.from(
    new Map(
      enrollments
        .filter(e => e.userId === currentUser.id && e.status !== 'CANCELADO')
        .map(e => [e.id, e])
    ).values()
  );

  // Verifica se há presença registrada no evento principal
  const isCheckedInForEvent = (eventId: string) => {
    return attendances.some(a => a.userId === currentUser.id && a.eventId === eventId && !a.workshopId);
  };

  // Verifica se houve credenciamento em um workshop específico
  const isCheckedInForWorkshop = (eventId: string, wsId: string) => {
    return attendances.some(a => a.userId === currentUser.id && a.eventId === eventId && a.workshopId === wsId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 py-2 select-none selection:bg-blue-600 selection:text-white">
      
      <div className="flex flex-col gap-8 text-gray-850">
        
        {/* Inscrições ativas (ingressos) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 shadow-xs">
          <div className="pb-3 mb-5 border-b border-gray-150 dark:border-zinc-800">
            <h3 className="text-lg font-black uppercase text-gray-800 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Meus</span>
              <span className="text-blue-600 dark:text-blue-400">Ingressos</span>
            </h3>
          </div>

            {studentEnrollments.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 dark:bg-zinc-850/40 border border-gray-150 dark:border-zinc-800 rounded-2xl py-12">
                <AlertCircle className="w-10 h-10 text-gray-400 dark:text-zinc-500 mx-auto mb-3" />
                <h4 className="text-gray-700 dark:text-zinc-200 font-bold text-sm">Você ainda não se inscreveu em nenhum evento</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">Busque eventos na nossa página e faça sua inscrição gratuita ou paga.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {studentEnrollments.map((en) => {
                  const ev = events.find(e => e.id === en.eventId);
                  const isApproved = en.status === 'APROVADO';
                  const isExpanded = !!expandedTicketIds[en.id];
                  
                  // Se o evento for Semana Acadêmica, considera presente como um todo se tiver check-in no evento ou em qualquer um dos workshops dele
                  const isPresent = ev?.category === 'SEMANA ACADÊMICA'
                    ? (isCheckedInForEvent(en.eventId) || attendances.some(a => a.userId === currentUser.id && a.eventId === en.eventId && a.workshopId))
                    : isCheckedInForEvent(en.eventId);
                  
                  // Verifica se este evento gera um certificado ativo
                  const cert = certificates.find(c => c.eventId === en.eventId);

                  return (
                    <div 
                      key={en.id} 
                      className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs hover:border-gray-350 dark:hover:border-zinc-700 transition-all flex flex-col"
                    >
                      {/* Cabeçalho do ingresso: sempre visível (recolhido por padrão) */}
                      <div 
                        onClick={() => toggleTicketExpand(en.id)}
                        className="p-4 md:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-zinc-800/60 transition-colors select-none"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {isApproved ? (
                              <span className="bg-green-50 dark:bg-emerald-950/60 border border-green-150 dark:border-emerald-800 text-green-700 dark:text-emerald-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">APROVADO</span>
                            ) : (
                              <span className="bg-yellow-50 dark:bg-amber-950/60 border border-yellow-150 dark:border-amber-800 text-yellow-700 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">AGUARDANDO APROVAÇÃO</span>
                            )}
                            
                            {isPresent ? (
                              <span className="bg-blue-50 dark:bg-blue-950/60 border border-blue-150 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded">PRESENÇA CONFIRMADA</span>
                            ) : (
                              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-bold text-[9px] uppercase tracking-wide py-0.5 px-2 rounded border border-gray-200 dark:border-zinc-700">Aguardando Check-In</span>
                            )}
                          </div>

                          <h4 className="text-gray-900 dark:text-zinc-100 font-bold text-sm leading-tight mt-1 truncate">{en.eventName}</h4>
                          {ev && (
                            <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 font-semibold">Data: {ev.startDate.split('-').reverse().join('/')} • {ev.startTime}h • {ev.location}</p>
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

                      {/* Seção expansível do ingresso: oculta quando recolhida */}
                      {isExpanded && (
                        <div className="border-t border-gray-150 dark:border-zinc-800 flex flex-col md:flex-row justify-between bg-white dark:bg-zinc-900 animate-fade-in">
                          <div className="p-4 md:p-5 flex-1 flex flex-col gap-3">
                            {/* Lista aninhada de workshops dentro do ingresso */}
                            {ev?.category === 'SEMANA ACADÊMICA' ? (
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">Minicursos & Oficinas:</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectEvent) onSelectEvent(en.eventId);
                                    }}
                                    className="text-[10px] text-blue-650 dark:text-blue-400 hover:text-blue-750 dark:hover:text-blue-300 font-extrabold uppercase hover:underline cursor-pointer flex items-center gap-0.5 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded"
                                  >
                                    {en.selectedWorkshops.length > 0 ? '✏️ Alterar Grade' : '➕ Escolher Grade'}
                                  </button>
                                </div>
                                {en.selectedWorkshops.length === 0 ? (
                                  <p className="text-[11px] text-gray-450 dark:text-zinc-400 italic mt-1">Nenhum minicurso selecionado para esta Semana Acadêmica.</p>
                                ) : (
                                  <div className="flex flex-col gap-1.5 mt-1.5">
                                    {en.selectedWorkshops.map(wsId => {
                                      const wsObj = workshops.find(w => w.id === wsId);
                                      const wsPresent = isCheckedInForWorkshop(en.eventId, wsId);
                                      if (!wsObj) return null;
                                      return (
                                        <div key={wsId} className="flex items-center justify-between text-xs text-gray-700 dark:text-zinc-300">
                                          <span className="truncate max-w-[200px] block">• {wsObj.name}</span>
                                          <span className={`text-[9px] font-bold ${wsPresent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                                            {wsPresent ? '✓ Presente' : 'Não credenciado'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              en.selectedWorkshops.length > 0 ? (
                                <div>
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold tracking-wider">Minicursos Contatados:</span>
                                  <div className="flex flex-col gap-1.5 mt-1">
                                    {en.selectedWorkshops.map(wsId => {
                                      const wsObj = workshops.find(w => w.id === wsId);
                                      const wsPresent = isCheckedInForWorkshop(en.eventId, wsId);
                                      if (!wsObj) return null;
                                      return (
                                        <div key={wsId} className="flex items-center justify-between text-xs text-gray-700 dark:text-zinc-300">
                                          <span className="truncate max-w-[200px] block">• {wsObj.name}</span>
                                          <span className={`text-[9px] font-bold ${wsPresent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'}`}>
                                            {wsPresent ? '✓ Presente' : 'Não credenciado'}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null
                            )}

                            {/* Barra de informações do status de presença */}
                            {isPresent ? (
                              <div className="mt-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/80 p-2.5 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-bold font-sans">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>Presença confirmada</span>
                              </div>
                            ) : (
                              <div className="mt-2 bg-gray-50 dark:bg-zinc-850/50 border border-gray-150 dark:border-zinc-800 p-2.5 rounded-lg flex items-center gap-2 text-[10px] text-gray-500 dark:text-zinc-400 font-sans font-medium italic">
                                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>Presença pendente de credenciamento. Apresente seu QR Code de entrada no evento para validar seu ingresso.</span>
                              </div>
                            )}

                          </div>

                          {/* Seção direita: QR Code do ingresso ou opção de cancelamento */}
                          <div className="bg-gray-50 dark:bg-zinc-950/40 md:w-44 border-l max-md:border-t max-md:border-l-0 border-gray-200 dark:border-zinc-800 p-5 flex flex-col items-center justify-center text-center gap-2">
                            {isApproved ? (
                              <>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTicketForQr(selectedTicketForQr === en.id ? null : en.id);
                                  }}
                                  className="bg-white dark:bg-zinc-800 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700 cursor-pointer border border-gray-200 dark:border-zinc-700 group transition-all"
                                >
                                  <QrCode className="w-14 h-14 text-blue-600 dark:text-blue-400 group-hover:scale-103 transition-transform" />
                                </button>
                                <span className="text-[10px] font-mono tracking-tight font-black text-gray-500 dark:text-zinc-400 uppercase mt-1">Check-in Pass</span>
                                <span className="text-[9px] text-gray-455 dark:text-zinc-400 font-medium">Clique para abrir</span>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-2.5 text-yellow-600 dark:text-yellow-400 w-full gap-2 text-center">
                                <div>
                                  <span className="text-[11px] font-bold uppercase block">Pendente</span>
                                  <span className="text-[9px] text-gray-400 dark:text-zinc-400 mt-1 leading-tight">Aguardando confirmação de pagamento.</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnrollmentToCancel(en);
                                  }}
                                  className="bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-[10px] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1 w-full mt-1.5 shadow-3xs"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Cancelar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Modal sobreposto do QR Code ampliado (quando o aluno clica para exibi-lo) */}
          {selectedTicketForQr && (() => {
            const ticket = studentEnrollments.find(e => e.id === selectedTicketForQr);
            if (!ticket) return null;
            return (
              <div className="bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center max-w-sm mx-auto shadow-2xl relative animate-in zoom-in-95 duration-100 text-gray-800 dark:text-zinc-100">
                <button 
                  onClick={() => setSelectedTicketForQr(null)}
                  className="absolute top-4 right-4 text-gray-400 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer text-xs font-bold"
                >
                  ✕
                </button>
                
                <h4 className="text-gray-950 dark:text-zinc-100 font-extrabold text-sm uppercase tracking-tight mb-1">Entrada Credencial</h4>
                <p className="text-[10px] text-gray-505 dark:text-zinc-400 mb-4">{ticket.eventName}</p>

                {/* Contêiner animado do QR Code para scanner */}
                <div className="relative bg-white p-4 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-inner mb-4 overflow-hidden group qr-white-container" data-qr-container="true">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=1e293b&data=${encodeURIComponent(ticket.id)}`} 
                    alt="Digital Checkin QR Code"
                    className="w-40 h-40 object-contain select-none"
                    referrerPolicy="no-referrer"
                  />
                  {/* Linha de animação do laser neon */}
                  <div className="absolute left-0 right-0 top-0 h-[2px] bg-blue-650 shadow shadow-blue-500/80 animate-bounce"></div>
                </div>

                <span className="text-xs font-mono font-black text-gray-700 dark:text-zinc-200 bg-gray-105 dark:bg-zinc-800 py-1 px-3 rounded-md uppercase border border-gray-200 dark:border-zinc-700">
                  ID: {ticket.id.toUpperCase()}
                </span>
                
                <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-3.5 max-w-[250px] leading-relaxed">
                  Apresente este código para o credenciador ou organizador na entrada para registrar sua presença.
                </p>
              </div>
            );
          })()}

        {/* Modal personalizado de confirmação sobreposta para cancelar a inscrição */}
        {enrollmentToCancel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-150 dark:border-zinc-800 p-6 max-w-md w-full shadow-xl animate-scale-in">
              <div className="text-center">
                <span className="text-4xl block mb-3">🛑</span>
                <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-sm uppercase tracking-wider">
                  Cancelar Inscrição
                </h4>
                <p className="text-gray-600 dark:text-zinc-300 text-xs mt-3 leading-relaxed">
                  Tem certeza que deseja cancelar sua inscrição no evento <strong className="text-gray-950 dark:text-white">"{enrollmentToCancel.eventName}"</strong>?
                </p>
                <p className="text-gray-500 dark:text-zinc-400 text-[10px] mt-2.5 font-medium italic">
                  Esta ação liberará sua pré-reserva. Você poderá se inscrever novamente no futuro se houver vagas disponíveis.
                </p>
              </div>

              <div className="mt-6 flex gap-3 justify-center text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEnrollmentToCancel(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold uppercase text-[10px] tracking-wider py-3 px-4 rounded-xl cursor-pointer transition-colors text-center"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      DB.updateEnrollmentStatus(enrollmentToCancel.id, 'CANCELADO', currentUser);
                      setEnrollmentToCancel(null);
                      onProfileUpdated();
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

      </div>

    </div>
  );
}
