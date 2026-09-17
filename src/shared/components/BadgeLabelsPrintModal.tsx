import React, { useRef, useState, useEffect, useMemo } from 'react';
import { X, Tag, Download, Loader2, Filter, Settings2, Sparkles, QrCode, Layers } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { Event, Enrollment } from '../../@types';

interface BadgeLabelsPrintModalProps {
  event: Event;
  enrollments: Enrollment[];
  onClose: () => void;
}

interface ParticipantLabelItem {
  enrollment: Enrollment;
  drawNumber: string; // exemplo: 001, 002
  qrDataUrl: string;
}

export type LabelTemplateType = '30_LABELS' | '27_LABELS';

interface TemplateConfig {
  id: LabelTemplateType;
  name: string;
  code: string;
  labelsPerPage: number;
  columns: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginLeftMm: number;
  marginRightMm: number;
  gapHorizontalMm: number;
  gapVerticalMm: number;
  gridWidthMm: number;
  gridHeightMm: number;
  qrSizeMm: number;
}

const TEMPLATES: Record<LabelTemplateType, TemplateConfig> = {
  '30_LABELS': {
    id: '30_LABELS',
    name: '30 Etiquetas por folha',
    code: 'Pimaco A4356 / 6182',
    labelsPerPage: 30,
    columns: 3,
    rows: 10,
    labelWidthMm: 66.7,
    labelHeightMm: 25.4,
    marginTopMm: 10.7,
    marginBottomMm: 10.7,
    marginLeftMm: 4.8,
    marginRightMm: 4.8,
    gapHorizontalMm: 2.5,
    gapVerticalMm: 0,
    gridWidthMm: 200.1,
    gridHeightMm: 254.0,
    qrSizeMm: 21.0
  },
  '27_LABELS': {
    id: '27_LABELS',
    name: '27 Etiquetas por folha',
    code: 'Pimaco 6089 / 6189',
    labelsPerPage: 27,
    columns: 3,
    rows: 9,
    labelWidthMm: 63.5,
    labelHeightMm: 31.0,
    marginTopMm: 9.0,
    marginBottomMm: 9.0,
    marginLeftMm: 7.0,
    marginRightMm: 7.0,
    gapHorizontalMm: 3.0,
    gapVerticalMm: 0,
    gridWidthMm: 196.5,
    gridHeightMm: 279.0,
    qrSizeMm: 25.0
  }
};

function chunkArray<T>(array: T[], size: number): T[][] {
  if (array.length === 0) return [[]];
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    results.push(array.slice(i, i + size));
  }
  return results;
}

export default function BadgeLabelsPrintModal({
  event,
  enrollments,
  onClose
}: BadgeLabelsPrintModalProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [templateType, setTemplateType] = useState<LabelTemplateType>('30_LABELS');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'APROVADO' | 'PENDENTE'>('ALL');
  const [sortOrder, setSortOrder] = useState<'INSCRIPTION_ORDER' | 'NAME_ASC'>('INSCRIPTION_ORDER');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [showBorderGuides, setShowBorderGuides] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [qrCodeMap, setQrCodeMap] = useState<Record<string, string>>({});
  const [isLoadingQrs, setIsLoadingQrs] = useState(true);

  const currentTemplate = TEMPLATES[templateType];

  // Filtra as inscrições válidas
  const filteredEnrollments = useMemo(() => {
    let list = enrollments.filter(e => e.eventId === event.id && e.status !== 'CANCELADO');

    if (filterStatus === 'APROVADO') {
      list = list.filter(e => e.status === 'APROVADO');
    } else if (filterStatus === 'PENDENTE') {
      list = list.filter(e => e.status === 'PENDENTE');
    }

    // Ordem de classificação
    if (sortOrder === 'NAME_ASC') {
      return [...list].sort((a, b) => a.userName.localeCompare(b.userName, 'pt-BR'));
    }
    // Padrão: ordem cronológica de inscrição
    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  }, [enrollments, event.id, filterStatus, sortOrder]);

  // Gera URLs de dados de QR Code em alta resolução para cada participante
  useEffect(() => {
    let isCancelled = false;
    async function generateQrs() {
      setIsLoadingQrs(true);
      const newMap: Record<string, string> = {};

      for (const en of filteredEnrollments) {
        if (isCancelled) return;
        try {
          // Codifica o ID exclusivo da inscrição ou do usuário
          const qrData = en.id || en.userId;
          const url = await QRCode.toDataURL(qrData, {
            width: 240,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
          newMap[en.id] = url;
        } catch (err) {
          console.error('Erro ao gerar QR Code para etiqueta:', err);
        }
      }

      if (!isCancelled) {
        setQrCodeMap(newMap);
        setIsLoadingQrs(false);
      }
    }

    generateQrs();
    return () => {
      isCancelled = true;
    };
  }, [filteredEnrollments, event.id]);

  // Monta itens com números sequenciais formatados para sorteio
  const labelItems: ParticipantLabelItem[] = useMemo(() => {
    const totalDigits = Math.max(3, String(startNumber + filteredEnrollments.length).length);
    return filteredEnrollments.map((en, index) => {
      const num = startNumber + index;
      const drawNumber = String(num).padStart(totalDigits, '0');
      return {
        enrollment: en,
        drawNumber,
        qrDataUrl: qrCodeMap[en.id] || ''
      };
    });
  }, [filteredEnrollments, startNumber, qrCodeMap]);

  // Divide em páginas A4 com base no modelo selecionado
  const pages = useMemo(() => {
    return chunkArray(labelItems, currentTemplate.labelsPerPage);
  }, [labelItems, currentTemplate.labelsPerPage]);

  const totalSheets = pages.length;

  // Gera e baixa o PDF
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsGeneratingPdf(true);
      setGenerationProgress(`Preparando etiquetas (${currentTemplate.name})...`);

      const sections = printAreaRef.current.querySelectorAll<HTMLElement>('.pimaco-a4-sheet');
      if (sections.length === 0) {
        throw new Error('Nenhuma folha de etiquetas encontrada para gerar.');
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
        setGenerationProgress(`Processando folha ${i + 1} de ${sections.length}...`);

        const canvas = await html2canvas(section, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.96);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        pdf.addImage(
          imgData,
          'JPEG',
          0,
          0,
          pdfPageWidth,
          pdfPageHeight,
          undefined,
          'FAST'
        );
      }

      setGenerationProgress('Finalizando arquivo PDF...');
      const cleanEventName = event.name.replace(/[^a-zA-Z0-9À-ÿ]/g, '_').toLowerCase().slice(0, 30);
      pdf.save(`etiquetas_${currentTemplate.labelsPerPage}por_folha_${cleanEventName}.pdf`);

      setGenerationProgress('Download concluído!');
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setGenerationProgress('');
      }, 1500);

    } catch (err: any) {
      console.error('Erro ao gerar PDF das etiquetas:', err);
      alert('Erro ao gerar PDF: ' + (err?.message || 'Tente novamente.'));
      setIsGeneratingPdf(false);
      setGenerationProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-6">
      
      {/* Barra de ferramentas e cabeçalho de configuração */}
      <div className="sticky top-2 z-50 w-full max-w-5xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 mb-6 shadow-2xl flex flex-col gap-4 animate-fade-in">
        
        {/* Título e botões de ação */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-150 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-zinc-100 uppercase tracking-tight">
                Emissão de Etiquetas
              </h3>
              <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 mt-0.5 truncate max-w-md sm:max-w-xl">
                {event.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão para baixar o PDF diretamente */}
            <button
              type="button"
              disabled={isLoadingQrs || isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Baixar arquivo PDF com todas as folhas de etiquetas"
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

            {/* Fechar modal */}
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold p-2.5 rounded-xl cursor-pointer transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de controles de configuração */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          
          {/* Seletor do modelo de layout (27 ou 30 etiquetas) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-600" />
              <span>Padrão Pimaco:</span>
            </label>
            <select
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as LabelTemplateType)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-gray-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="30_LABELS">30 Etiquetas / Folha (A4356 / 6182)</option>
              <option value="27_LABELS">27 Etiquetas / Folha (6089 / 6189)</option>
            </select>
          </div>

          {/* Filtro de status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-purple-600" />
              <span>Filtrar Inscritos:</span>
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-gray-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="ALL">Todos os Inscritos</option>
              <option value="APROVADO">Apenas Aprovados</option>
              <option value="PENDENTE">Apenas Pendentes</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
              <Settings2 className="w-3 h-3 text-purple-600" />
              <span>Ordem de Numeração:</span>
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-gray-800 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="INSCRIPTION_ORDER">Ordem de Inscrição (1º ao último)</option>
              <option value="NAME_ASC">Ordem Alfabética (A - Z)</option>
            </select>
          </div>

          {/* Número inicial sequencial */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Nº Inicial do Sorteio:</span>
            </label>
            <input
              type="number"
              min="1"
              max="9999"
              value={startNumber}
              onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs font-bold text-gray-800 dark:text-zinc-200 outline-none"
            />
          </div>

          {/* Controle das linhas-guia */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setShowBorderGuides(!showBorderGuides)}
              className={`w-full p-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                showBorderGuides
                  ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : 'bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-zinc-700'
              }`}
            >
              <span>Linhas-Guia: {showBorderGuides ? 'Ativadas' : 'Ocultas'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* Área das folhas para impressão: branco puro e layout exato */}
      <div
        ref={printAreaRef}
        id="pimaco-print-document"
        data-printable="true"
        className="w-full flex flex-col items-center gap-8"
      >
        {labelItems.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-12 text-center text-gray-500 dark:text-zinc-400 text-sm max-w-md shadow-lg">
            Nenhum participante encontrado para os filtros selecionados neste evento.
          </div>
        ) : (
          pages.map((sheetLabels, sheetIdx) => {
            // Preenche a página até a capacidade do modelo para manter a estrutura exata da grade
            const paddedLabels: (ParticipantLabelItem | null)[] = [...sheetLabels];
            while (paddedLabels.length < currentTemplate.labelsPerPage) {
              paddedLabels.push(null);
            }

            return (
              <section
                key={`pimaco_sheet_${templateType}_${sheetIdx}`}
                style={{
                  width: '210mm',
                  height: '297mm',
                  paddingTop: `${currentTemplate.marginTopMm}mm`,
                  paddingBottom: `${currentTemplate.marginBottomMm}mm`,
                  paddingLeft: `${currentTemplate.marginLeftMm}mm`,
                  paddingRight: `${currentTemplate.marginRightMm}mm`,
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}
                className="pimaco-a4-sheet pimaco-isolated-sheet shadow-2xl relative box-border overflow-hidden select-none"
              >
                {/* Layout da grade estilizado dinamicamente conforme os parâmetros do modelo Pimaco */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${currentTemplate.columns}, ${currentTemplate.labelWidthMm}mm)`,
                    gridTemplateRows: `repeat(${currentTemplate.rows}, ${currentTemplate.labelHeightMm}mm)`,
                    columnGap: `${currentTemplate.gapHorizontalMm}mm`,
                    rowGap: `${currentTemplate.gapVerticalMm}mm`,
                    width: `${currentTemplate.gridWidthMm}mm`,
                    height: `${currentTemplate.gridHeightMm}mm`,
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  {paddedLabels.map((item, labelIdx) => {
                    if (!item) {
                      // Espaço reservado vazio
                      return (
                        <div
                          key={`empty_${labelIdx}`}
                          style={{
                            width: `${currentTemplate.labelWidthMm}mm`,
                            height: `${currentTemplate.labelHeightMm}mm`,
                            boxSizing: 'border-box',
                            backgroundColor: '#ffffff'
                          }}
                          className={showBorderGuides ? 'border border-dashed border-gray-200' : 'border-none'}
                        />
                      );
                    }

                    const { enrollment, drawNumber, qrDataUrl } = item;
                    const participantName = enrollment.userName || 'Participante';

                    return (
                      <div
                        key={`label_${templateType}_${sheetIdx}_${labelIdx}_${enrollment.id}`}
                        style={{
                          width: `${currentTemplate.labelWidthMm}mm`,
                          height: `${currentTemplate.labelHeightMm}mm`,
                          boxSizing: 'border-box',
                          padding: '1.8mm 2.2mm 1.8mm 2.0mm',
                          backgroundColor: '#ffffff',
                          color: '#000000'
                        }}
                        className={`pimaco-label-card pimaco-isolated-card flex items-center gap-2 relative overflow-hidden ${
                          showBorderGuides ? 'border border-dashed border-gray-300' : 'border-none'
                        }`}
                      >
                        {/* 1. Coluna esquerda: QR Code de credenciamento */}
                        <div
                          style={{
                            width: `${currentTemplate.qrSizeMm}mm`,
                            height: `${currentTemplate.qrSizeMm}mm`,
                            backgroundColor: '#ffffff'
                          }}
                          className="shrink-0 flex items-center justify-center p-0.5"
                        >
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt={`QR ${drawNumber}`}
                              style={{
                                width: `${currentTemplate.qrSizeMm - 0.5}mm`,
                                height: `${currentTemplate.qrSizeMm - 0.5}mm`,
                                backgroundColor: '#ffffff'
                              }}
                              className="object-contain block"
                              loading="eager"
                            />
                          ) : (
                            <div className="w-full h-full border border-gray-300 flex items-center justify-center text-[7px] text-gray-400 font-mono">
                              QR
                            </div>
                          )}
                        </div>

                        {/* 2. Coluna direita: nome do participante ACIMA e número do sorteio ABAIXO, centralizados */}
                        <div className="pimaco-label-card-content flex-1 min-w-0 h-full flex flex-col justify-center items-center gap-1.5 py-0.5 leading-none text-center">
                          {/* Nome do participante (acima) */}
                          <div className="w-full min-w-0 px-0.5">
                            <p
                              className="text-black font-black text-[10px] sm:text-[11px] uppercase tracking-tight line-clamp-2 leading-tight text-center"
                              title={participantName}
                            >
                              {participantName}
                            </p>
                          </div>

                          {/* Indicador numérico (abaixo e centralizado) */}
                          <div className="flex items-center justify-center">
                            <span className="pimaco-draw-number-badge font-mono font-black text-[12px] sm:text-[13px] border px-2.5 py-0.5 rounded tracking-tight leading-none text-center">
                              #{drawNumber}
                            </span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Indicador da folha na parte inferior */}
                <div className="pimaco-sheet-footer font-mono">
                  Folha {sheetIdx + 1} de {totalSheets} ({currentTemplate.code})
                </div>
              </section>
            );
          })
        )}
      </div>

    </div>
  );
}
