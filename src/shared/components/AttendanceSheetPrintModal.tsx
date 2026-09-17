import React, { useRef, useState } from 'react';
import { X, FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Event, Workshop, Enrollment, Attendance } from '../../@types';

interface AttendanceSheetPrintModalProps {
  event: Event;
  workshops: Workshop[];
  enrollments: Enrollment[];
  attendances?: Attendance[];
  onClose: () => void;
}

// Divide a lista de participantes em páginas de impressão separadas
function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [[]];
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

export default function AttendanceSheetPrintModal({
  event,
  workshops,
  enrollments,
  onClose
}: AttendanceSheetPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Filtra as inscrições deste evento específico que não foram canceladas
  const eventEnrollments = enrollments.filter(
    e => e.eventId === event.id && e.status !== 'CANCELADO'
  );

  // Filtra os workshops pertencentes a este evento
  const eventWorkshops = workshops.filter(w => w.eventId === event.id);

  // Auxiliar para formatar data e horário
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

  // Máximo de linhas por página para garantir um encaixe limpo no A4 sem transbordamento
  const ROWS_PER_PAGE = 22;

  // Páginas da lista geral
  const generalPages = chunkArray(eventEnrollments, ROWS_PER_PAGE);
  const generalTotalPages = generalPages.length;

  // Gera e baixa o arquivo PDF real
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setGenerationProgress('Preparando páginas...');

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

        // Dimensões proporcionais correspondentes à proporção A4
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
      pdf.save(`lista_presencas_${cleanEventName}.pdf`);

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
      {/* Barra de ferramentas flutuante do modal */}
      <div className="sticky top-2 z-50 w-full max-w-5xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
              Lista de presenças
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {event.name} • Presença Geral ({generalTotalPages} pág.) {eventWorkshops.length > 0 && `• ${eventWorkshops.length} Workshop(s)`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão para baixar o PDF diretamente */}
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Baixar arquivo PDF no computador"
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

          {/* Botão para fechar o modal */}
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

      {/* Contêiner das folhas para impressão */}
      <div
        ref={printAreaRef}
        id="attendance-print-document"
        data-printable="true"
        className="w-full flex flex-col items-center gap-8 print:gap-0 print:w-full print:m-0 force-white-print"
      >
        {/* ========================================================
            PRESENÇA GERAL DO EVENTO (PAGINADA INDEPENDENTEMENTE)
           ======================================================== */}
        {generalPages.map((pageRows, pageIdx) => {
          const isLastPage = pageIdx === generalTotalPages - 1;
          const startingIndex = pageIdx * ROWS_PER_PAGE;
          const currentPageNum = pageIdx + 1;

          return (
            <section
              key={`general_page_${pageIdx}`}
              className={`a4-print-sheet border border-gray-300 print:border-none p-[12mm] shadow-xl print:shadow-none print:p-0 flex flex-col justify-between box-border ${
                pageIdx > 0 ? 'print:break-before-page break-before-page' : ''
              }`}
            >
              <div className="flex-1 flex flex-col">
                {/* Cabeçalho */}
                <div className="border-b-2 border-black pb-2 mb-3">
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h1 className="text-lg md:text-xl font-black uppercase text-black tracking-tight">
                      Lista de presenças
                    </h1>
                    <div className="text-right text-[10.5px] text-gray-700 print:text-black shrink-0 leading-tight">
                      <p className="font-semibold">Emissão: {emissionTimestamp}</p>
                      {/* Contador de páginas independente da presença geral */}
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
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Responsável pelo Evento:</span>
                      <span className="font-bold text-black block leading-tight mt-0.5">{event.creatorName || 'Coordenação de Eventos'}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Localização:</span>
                      <span className="font-semibold text-gray-800 print:text-black block leading-tight mt-0.5">{event.location || 'Campus Principal'}</span>
                    </div>
                  </div>
                </div>

                {/* Tabela de participantes */}
                <div className="border border-black overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 print:bg-gray-200 border-b border-black text-black font-black uppercase text-[9.5px]">
                        <th className="py-1 px-2 w-10 text-center border-r border-black">Nº</th>
                        <th className="py-1 px-2 border-r border-black">Nome do Inscrito</th>
                        <th className="py-1 px-2 w-32 border-r border-black">RA</th>
                        <th className="py-1 px-2 w-72 text-center">Assinatura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 print:divide-black">
                      {eventEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 px-2 text-center text-gray-500 font-medium italic">
                            Nenhum participante inscrito neste evento até o momento.
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((enrollment, idx) => (
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
                            <td className="py-1 px-2 border-r-0">
                              {/* Espaço em branco para assinatura manual */}
                            </td>
                          </tr>
                        ))
                      )}

                      {/* Linhas extras em branco na última página para inscrições manuais */}
                      {isLastPage && [1, 2, 3, 4, 5].map((num) => (
                        <tr key={`blank_general_${num}`} className="hover:bg-gray-50 print:hover:bg-transparent break-inside-avoid h-7">
                          <td className="py-1 px-2 text-center font-mono text-[10.5px] border-r border-black text-gray-400 print:text-black">
                            {String(eventEnrollments.length + num).padStart(2, '0')}
                          </td>
                          <td className="py-1 px-2 border-r border-black"></td>
                          <td className="py-1 px-2 border-r border-black"></td>
                          <td className="py-1 px-2"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          );
        })}

        {/* ========================================================
            WORKSHOPS DO EVENTO (CADA UM COM SEU CONTADOR PRÓPRIO)
           ======================================================== */}
        {eventWorkshops.map((workshop) => {
          // Encontra as inscrições feitas neste workshop específico
          const workshopEnrollments = eventEnrollments.filter(
            e => e.selectedWorkshops && e.selectedWorkshops.includes(workshop.id)
          );

          const wsDateFormatted = formatDate(workshop.date || event.startDate);
          const wsTimeFormatted = (workshop.startTime && workshop.endTime)
            ? `${workshop.startTime} às ${workshop.endTime}`
            : (workshop.time || event.startTime || 'A definir');

          // Pagina as inscrições do workshop de forma independente
          const wsPages = chunkArray(workshopEnrollments, ROWS_PER_PAGE);
          const wsTotalPages = wsPages.length;

          return wsPages.map((pageRows, pageIdx) => {
            const isLastPage = pageIdx === wsTotalPages - 1;
            const startingIndex = pageIdx * ROWS_PER_PAGE;
            const currentPageNum = pageIdx + 1;

            return (
              <section
                key={`workshop_${workshop.id}_page_${pageIdx}`}
                className="a4-print-sheet border border-gray-300 print:border-none p-[12mm] shadow-xl print:shadow-none print:p-0 flex flex-col justify-between box-border print:break-before-page break-before-page"
              >
                <div className="flex-1 flex flex-col">
                  {/* Cabeçalho da folha do workshop */}
                  <div className="border-b-2 border-black pb-2 mb-3">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h2 className="text-lg md:text-xl font-black uppercase text-black tracking-tight">
                        Lista de presenças - {workshop.name}
                      </h2>
                      <div className="text-right text-[10.5px] text-gray-700 print:text-black shrink-0 leading-tight">
                        <p className="font-semibold">Emissão: {emissionTimestamp}</p>
                        {/* Contador de páginas independente deste workshop específico */}
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
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Responsável pelo Evento / Minicurso:</span>
                        <span className="font-bold text-black block leading-tight mt-0.5">{workshop.instructor || event.creatorName || 'A definir'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-gray-500 print:text-black">Capacidade / Vagas:</span>
                        <span className="font-semibold text-gray-800 print:text-black block leading-tight mt-0.5">
                          {workshop.maxParticipants} vagas ({workshopEnrollments.length} inscritos)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de participantes do workshop */}
                  <div className="border border-black overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-gray-100 print:bg-gray-200 border-b border-black text-black font-black uppercase text-[9.5px]">
                          <th className="py-1 px-2 w-10 text-center border-r border-black">Nº</th>
                          <th className="py-1 px-2 border-r border-black">Nome do Inscrito</th>
                          <th className="py-1 px-2 w-32 border-r border-black">RA</th>
                          <th className="py-1 px-2 w-72 text-center">Assinatura</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300 print:divide-black">
                        {workshopEnrollments.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 px-2 text-center text-gray-500 font-medium italic">
                              Nenhum participante inscrito especificamente neste workshop até o momento.
                            </td>
                          </tr>
                        ) : (
                          pageRows.map((enrollment, idx) => (
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
                              <td className="py-1 px-2 border-r-0">
                                {/* Espaço em branco para assinatura manual */}
                              </td>
                            </tr>
                          ))
                        )}

                        {/* Linhas extras em branco na última página para participantes presenciais */}
                        {isLastPage && [1, 2, 3, 4, 5].map((num) => (
                          <tr key={`blank_ws_${workshop.id}_${num}`} className="hover:bg-gray-50 print:hover:bg-transparent break-inside-avoid h-7">
                            <td className="py-1 px-2 text-center font-mono text-[10.5px] border-r border-black text-gray-400 print:text-black">
                              {String(workshopEnrollments.length + num).padStart(2, '0')}
                            </td>
                            <td className="py-1 px-2 border-r border-black"></td>
                            <td className="py-1 px-2 border-r border-black"></td>
                            <td className="py-1 px-2"></td>
                          </tr>
                        ))}
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
