import React, { useRef, useState } from 'react';
import { X, FileText, Download, Loader2, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Event, Workshop, Enrollment, Attendance } from '../../types';

interface FrequencyReportPrintModalProps {
  event: Event;
  workshops: Workshop[];
  enrollments: Enrollment[];
  attendances?: Attendance[];
  onClose: () => void;
}

// Função auxiliar para dividir listas de participantes em páginas de impressão separadas
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [[]];
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

export default function FrequencyReportPrintModal({
  event,
  workshops,
  enrollments,
  attendances = [],
  onClose
}: FrequencyReportPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Filtra inscrições deste evento específico que não estejam canceladas
  const eventEnrollments = enrollments.filter(
    e => e.eventId === event.id && e.status !== 'CANCELADO'
  );

  // Filtra workshops pertencentes a este evento
  const eventWorkshops = workshops.filter(w => w.eventId === event.id);

  // Função auxiliar de formatação de data
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'A definir';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  const getEventDateSchedule = () => {
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);
    const dateText = start === end || !event.endDate ? start : `${start} a ${end}`;
    const timeText = event.startTime && event.endTime ? `${event.startTime} às ${event.endTime}` : (event.startTime || 'Horário a definir');
    return { dateText, timeText };
  };

  const { dateText: eventDateText, timeText: eventTimeText } = getEventDateSchedule();
  const emissionTimestamp = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calcula presença geral e estatísticas de frequência do aluno
  const getStudentMetrics = (en: Enrollment) => {
    const isPresentGeneral = attendances.some(
      a => a.userId === en.userId && a.eventId === event.id && !a.workshopId
    );
    const userWorkshops = en.selectedWorkshops || [];
    const attendedWorkshopsCount = userWorkshops.filter(wsId =>
      attendances.some(a => a.userId === en.userId && a.eventId === event.id && a.workshopId === wsId)
    ).length;

    const totalActivities = 1 + userWorkshops.length;
    const totalAttended = (isPresentGeneral ? 1 : 0) + attendedWorkshopsCount;
    const frequencyPct = totalActivities > 0 ? Math.round((totalAttended / totalActivities) * 100) : 0;

    return {
      isPresentGeneral,
      userWorkshops,
      attendedWorkshopsCount,
      totalActivities,
      totalAttended,
      frequencyPct
    };
  };

  // Estatísticas gerais do evento
  const totalGeneralAttended = eventEnrollments.filter(en =>
    attendances.some(a => a.userId === en.userId && a.eventId === event.id && !a.workshopId)
  ).length;
  const generalAttendanceRate = eventEnrollments.length > 0
    ? Math.round((totalGeneralAttended / eventEnrollments.length) * 100)
    : 0;

  const allFrequencies = eventEnrollments.map(en => getStudentMetrics(en).frequencyPct);
  const averageEventFrequency = allFrequencies.length > 0
    ? Math.round(allFrequencies.reduce((acc, curr) => acc + curr, 0) / allFrequencies.length)
    : 0;

  // Máximo de linhas por página para garantir encaixe perfeito em folha A4 sem transbordar
  const ROWS_PER_PAGE = 22;

  // Páginas da listagem geral
  const generalPages = chunkArray(eventEnrollments, ROWS_PER_PAGE);
  const generalTotalPages = generalPages.length;

  // Gera e baixa o arquivo PDF real
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setGenerationProgress('Preparando relatório...');

      const sections = printAreaRef.current.querySelectorAll<HTMLElement>('section');
      if (sections.length === 0) {
        throw new Error('Nenhuma folha encontrada para gerar PDF.');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfPageWidth = 210;
      const pdfPageHeight = 297;

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        setGenerationProgress(`Renderizando página ${i + 1} de ${sections.length}...`);

        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Proportional dimensions matching A4 ratio
        const imgWidth = pdfPageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(
          imgData,
          'JPEG',
          0,
          0,
          imgWidth,
          Math.min(imgHeight, pdfPageHeight),
          undefined,
          'FAST'
        );
      }

      setGenerationProgress('Finalizando arquivo PDF...');
      const cleanEventName = event.name.replace(/[^a-zA-Z0-9À-ÿ]/g, '_').toLowerCase().slice(0, 30);
      pdf.save(`relatorio_frequencia_${cleanEventName}.pdf`);

      setGenerationProgress('Download concluído com sucesso!');
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setGenerationProgress('');
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o arquivo PDF: ' + (err?.message || 'Tente novamente.'));
      setIsGeneratingPdf(false);
      setGenerationProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Modal Floating Toolbar */}
      <div className="sticky top-2 z-50 w-full max-w-5xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
              Relatório de frequência
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {event.name} • {eventEnrollments.length} Participantes • Frequência Média: <strong className="text-indigo-600 dark:text-indigo-400">{averageEventFrequency}%</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de download do PDF */}
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:cursor-not-allowed"
            title="Exportar arquivo PDF de alta resolução"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{generationProgress || 'Gerando PDF...'}</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Baixar PDF (.pdf)</span>
              </>
            )}
          </button>

          {/* Botão de fechar o modal */}
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold p-2.5 rounded-xl cursor-pointer transition-colors"
            title="Fechar Visualização"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contêiner do relatório para impressão */}
      <div
        ref={printAreaRef}
        id="frequency-report-print-document"
        data-printable="true"
        className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full print:m-0 force-white-print"
      >
        {/* ========================================================
            PARTE 1: FREQUÊNCIA GERAL DO EVENTO (PAGINADA)
           ======================================================== */}
        {generalPages.map((pageRows, pageIdx) => {
          const startingIndex = pageIdx * ROWS_PER_PAGE;
          const currentPageNum = pageIdx + 1;

          return (
            <section
              key={`general_report_page_${pageIdx}`}
              className={`a4-print-sheet border border-gray-300 print:border-none p-[12mm] shadow-xl print:shadow-none print:p-0 flex flex-col justify-between box-border ${
                pageIdx > 0 ? 'print:break-before-page break-before-page' : ''
              }`}
            >
              <div className="flex-1 flex flex-col">
                {/* Cabeçalho */}
                <div className="border-b-2 border-black pb-2 mb-3">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div>
                      <h1 className="text-lg md:text-xl font-black uppercase text-black tracking-tight">
                        Relatório de frequência
                      </h1>
                      <p className="text-[11px] font-bold text-gray-700 print:text-black uppercase">
                        Evento Geral
                      </p>
                    </div>
                    <div className="text-right text-[10.5px] text-gray-700 print:text-black shrink-0 leading-tight">
                      <p className="font-semibold">Emissão: {emissionTimestamp}</p>
                      <p className="font-bold text-[11px] mt-0.5">
                        {currentPageNum}/{generalTotalPages}
                      </p>
                    </div>
                  </div>

                  {/* Grade de metadados do evento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 print:bg-gray-100 border border-gray-300 p-2.5 rounded-lg text-[11px]">
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Nome do Evento:</span>
                      <span className="font-black text-xs text-black block leading-tight mt-0.5">{event.name}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Dia e Horário:</span>
                      <span className="font-bold text-black block leading-tight mt-0.5">{eventDateText} • {eventTimeText}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Responsável:</span>
                      <span className="font-bold text-black block leading-tight mt-0.5">{event.creatorName || 'Coordenação de Eventos'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Localização:</span>
                      <span className="font-semibold text-gray-800 print:text-black block leading-tight mt-0.5">{event.location || 'Campus Principal'}</span>
                    </div>
                  </div>

                  {/* Linha de resumo rápido */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 print:bg-gray-200 border border-gray-300 rounded-md text-[10.5px] font-semibold text-black">
                    <span>Total de Inscritos: <strong>{eventEnrollments.length}</strong></span>
                    <span>Presenças (Check-in Geral): <strong>{totalGeneralAttended} ({generalAttendanceRate}%)</strong></span>
                    <span>Workshops Vinculados: <strong>{eventWorkshops.length}</strong></span>
                    <span>Frequência Média Geral: <strong>{averageEventFrequency}%</strong></span>
                  </div>
                </div>

                {/* Tabela de participantes */}
                <div className="border border-black overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200 border-b border-black text-black font-black uppercase text-[9.5px]">
                        <th className="py-1 px-2 w-10 text-center border-r border-black">Nº</th>
                        <th className="py-1 px-2 border-r border-black">Nome do Inscrito</th>
                        <th className="py-1 px-2 w-28 border-r border-black">RA</th>
                        <th className="py-1 px-2 border-r border-black">E-mail</th>
                        <th className="py-1 px-2 w-28 text-center">Presença</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 print:divide-black">
                      {eventEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 px-2 text-center text-gray-500 font-medium italic">
                            Nenhum participante inscrito neste evento até o momento.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((enrollment, idx) => {
                          const metrics = getStudentMetrics(enrollment);
                          return (
                            <tr key={enrollment.id} className="hover:bg-gray-50 print:hover:bg-transparent break-inside-avoid h-7">
                              <td className="py-1 px-2 text-center font-bold font-mono text-[10.5px] border-r border-black text-gray-700 print:text-black">
                                {String(startingIndex + idx + 1).padStart(2, '0')}
                              </td>
                              <td className="py-1 px-2 font-bold text-black border-r border-black leading-tight">
                                {enrollment.userName}
                              </td>
                              <td className="py-1 px-2 font-mono text-[10.5px] text-gray-800 print:text-black border-r border-black">
                                {enrollment.userRa || '—'}
                              </td>
                              <td className="py-1 px-2 text-[10px] text-gray-700 print:text-black border-r border-black truncate max-w-[180px]">
                                {enrollment.userEmail || '—'}
                              </td>
                              <td className="py-1 px-2 text-center font-bold">
                                {metrics.isPresentGeneral ? (
                                  <span className="text-black font-black">Presente</span>
                                ) : (
                                  <span className="text-gray-500 print:text-black">Ausente</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}

        {/* ========================================================
            PARTE 2: FREQUÊNCIA POR WORKSHOP (CADA UM SEPARADO)
           ======================================================== */}
        {eventWorkshops.map((workshop) => {
          // Localiza inscrições registradas neste workshop específico
          const workshopEnrollments = eventEnrollments.filter(
            e => e.selectedWorkshops && e.selectedWorkshops.includes(workshop.id)
          );

          const wsDateFormatted = formatDate(workshop.date || event.startDate);
          const wsTimeFormatted = (workshop.startTime && workshop.endTime)
            ? `${workshop.startTime} às ${workshop.endTime}`
            : (workshop.time || event.startTime || 'A definir');

          // Conta participantes presentes neste workshop
          const wsAttendedCount = workshopEnrollments.filter(en =>
            attendances.some(a => a.userId === en.userId && a.eventId === event.id && a.workshopId === workshop.id)
          ).length;

          const wsAttendanceRate = workshopEnrollments.length > 0
            ? Math.round((wsAttendedCount / workshopEnrollments.length) * 100)
            : 0;

          // Pagina inscrições do workshop de forma independente
          const wsPages = chunkArray(workshopEnrollments, ROWS_PER_PAGE);
          const wsTotalPages = wsPages.length;

          return wsPages.map((pageRows, pageIdx) => {
            const startingIndex = pageIdx * ROWS_PER_PAGE;
            const currentPageNum = pageIdx + 1;

            return (
              <section
                key={`workshop_report_${workshop.id}_page_${pageIdx}`}
                className="a4-print-sheet border border-gray-300 print:border-none p-[12mm] shadow-xl print:shadow-none print:p-0 flex flex-col justify-between box-border print:break-before-page break-before-page"
              >
                <div className="flex-1 flex flex-col">
                  {/* Cabeçalho da folha do workshop */}
                  <div className="border-b-2 border-black pb-2 mb-3">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="min-w-0 flex-1">
                        <h2 
                          className="text-lg md:text-xl font-black uppercase text-black tracking-tight truncate block"
                          title={workshop.name}
                        >
                          {workshop.name}
                        </h2>
                        <p className="text-[11px] font-bold text-gray-700 print:text-black uppercase">
                          Workshop
                        </p>
                      </div>
                      <div className="text-right text-[10.5px] text-gray-700 print:text-black shrink-0 leading-tight">
                        <p className="font-semibold">Emissão: {emissionTimestamp}</p>
                        <p className="font-bold text-[11px] mt-0.5">
                          {currentPageNum}/{wsTotalPages}
                        </p>
                      </div>
                    </div>

                    {/* Grade de metadados do workshop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 print:bg-gray-100 border border-gray-300 p-2.5 rounded-lg text-[11px]">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Evento Principal:</span>
                        <span className="font-black text-xs text-black block leading-tight mt-0.5">{event.name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Dia e Horário:</span>
                        <span className="font-bold text-black block leading-tight mt-0.5">{wsDateFormatted} • {wsTimeFormatted}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Ministrante:</span>
                        <span className="font-bold text-black block leading-tight mt-0.5">{workshop.instructor || 'A definir'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Capacidade / Vagas:</span>
                        <span className="font-semibold text-gray-800 print:text-black block leading-tight mt-0.5">{workshop.maxParticipants} vagas</span>
                      </div>
                    </div>

                    {/* Linha de resumo do workshop */}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-gray-100 print:bg-gray-200 border border-gray-300 rounded-md text-[10.5px] font-semibold text-black">
                      <span>Inscritos no Workshop: <strong>{workshopEnrollments.length}</strong></span>
                      <span>Presenças no Workshop: <strong>{wsAttendedCount} ({wsAttendanceRate}%)</strong></span>
                      <span>Vagas Totais: <strong>{workshop.maxParticipants}</strong></span>
                    </div>
                  </div>

                  {/* Tabela de participantes do workshop */}
                  <div className="border border-black overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-100 print:bg-gray-200 border-b border-black text-black font-black uppercase text-[9.5px]">
                          <th className="py-1 px-2 w-10 text-center border-r border-black">Nº</th>
                          <th className="py-1 px-2 border-r border-black">Nome do Inscrito</th>
                          <th className="py-1 px-2 w-28 border-r border-black">RA</th>
                          <th className="py-1 px-2 border-r border-black">E-mail</th>
                          <th className="py-1 px-2 w-28 text-center border-r border-black">Presença Workshop</th>
                          <th className="py-1 px-2 w-24 text-center">Frequência Geral</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300 print:divide-black">
                        {workshopEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-4 px-2 text-center text-gray-500 font-medium italic">
                              Nenhum participante inscrito neste workshop até o momento.
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((enrollment, idx) => {
                            const isPresentInWorkshop = attendances.some(
                              a => a.userId === enrollment.userId && a.eventId === event.id && a.workshopId === workshop.id
                            );
                            const metrics = getStudentMetrics(enrollment);

                            return (
                              <tr key={enrollment.id} className="hover:bg-gray-50 print:hover:bg-transparent break-inside-avoid h-7">
                                <td className="py-1 px-2 text-center font-bold font-mono text-[10.5px] border-r border-black text-gray-700 print:text-black">
                                  {String(startingIndex + idx + 1).padStart(2, '0')}
                                </td>
                                <td className="py-1 px-2 font-bold text-black border-r border-black leading-tight">
                                  {enrollment.userName}
                                </td>
                                <td className="py-1 px-2 font-mono text-[10.5px] text-gray-800 print:text-black border-r border-black">
                                  {enrollment.userRa || '—'}
                                </td>
                                <td className="py-1 px-2 text-[10px] text-gray-700 print:text-black border-r border-black truncate max-w-[180px]">
                                  {enrollment.userEmail || '—'}
                                </td>
                                <td className="py-1 px-2 text-center border-r border-black font-bold">
                                  {isPresentInWorkshop ? (
                                    <span className="text-black font-black">Presente</span>
                                  ) : (
                                    <span className="text-gray-500 print:text-black">Ausente</span>
                                  )}
                                </td>
                                <td className="py-1 px-2 text-center font-bold font-mono text-[11px] text-black">
                                  {metrics.frequencyPct}%
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          });
        })}
      </div>
    </div>
  );
}
