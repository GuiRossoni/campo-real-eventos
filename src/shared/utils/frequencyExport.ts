import * as XLSX from 'xlsx';
import { Event, Workshop, Enrollment, Attendance } from '../../types';

export function exportFrequencyReportExcel(
  event: Event,
  workshops: Workshop[],
  enrollments: Enrollment[],
  attendances: Attendance[] = []
): void {
  try {
    const workbook = XLSX.utils.book_new();

    // 1. Filtra inscrições deste evento que não estejam canceladas
    const eventEnrollments = enrollments.filter(
      e => e.eventId === event.id && e.status !== 'CANCELADO'
    );

    // 2. Filtra minicursos/oficinas deste evento
    const eventWorkshops = workshops.filter(w => w.eventId === event.id);

    // Auxiliares de formatação
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

    const formatDateTime = (isoString?: string) => {
      if (!isoString) return '—';
      try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return isoString;
        return d.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return isoString;
      }
    };

    const getStudentMetrics = (en: Enrollment) => {
      const generalAtt = attendances.find(
        a => a.userId === en.userId && a.eventId === event.id && !a.workshopId
      );
      const isPresentGeneral = !!generalAtt;
      const userWorkshops = en.selectedWorkshops || [];
      const attendedWorkshopsCount = userWorkshops.filter(wsId =>
        attendances.some(a => a.userId === en.userId && a.eventId === event.id && a.workshopId === wsId)
      ).length;

      const totalActivities = 1 + userWorkshops.length;
      const totalAttended = (isPresentGeneral ? 1 : 0) + attendedWorkshopsCount;
      const frequencyPct = totalActivities > 0 ? Math.round((totalAttended / totalActivities) * 100) : 0;

      return {
        generalAtt,
        isPresentGeneral,
        userWorkshops,
        attendedWorkshopsCount,
        totalActivities,
        totalAttended,
        frequencyPct
      };
    };

    // -------------------------------------------------------------
    // PLANILHA 1: Frequência Geral do Evento
    // -------------------------------------------------------------
    const generalSheetData = eventEnrollments.map((en, index) => {
      const metrics = getStudentMetrics(en);
      return {
        'Nº': index + 1,
        'Nome do Participante': en.userName,
        'RA': en.userRa || '—',
        'E-mail': en.userEmail || '—',
        'Status da Inscrição': en.status,
        'Presença Geral': metrics.isPresentGeneral ? 'Presente' : 'Ausente',
        'Data/Hora Check-in Geral': metrics.generalAtt ? formatDateTime(metrics.generalAtt.checkedInAt) : '—',
        'Check-in Validado Por': metrics.generalAtt?.checkedInBy || '—',
        'Workshops Inscritos': metrics.userWorkshops.length,
        'Workshops Presente': metrics.attendedWorkshopsCount,
        'Frequência Total (%)': `${metrics.frequencyPct}%`
      };
    });

    const wsGeneral = XLSX.utils.json_to_sheet(generalSheetData);
    wsGeneral['!cols'] = [
      { wch: 6 },  // Nº
      { wch: 32 }, // Nome do Participante
      { wch: 15 }, // RA
      { wch: 30 }, // E-mail
      { wch: 18 }, // Status da Inscrição
      { wch: 16 }, // Presença Geral
      { wch: 22 }, // Data/Hora Check-in Geral
      { wch: 22 }, // Check-in Validado Por
      { wch: 20 }, // Workshops Inscritos
      { wch: 20 }, // Workshops Presente
      { wch: 20 }  // Frequência Total (%)
    ];
    XLSX.utils.book_append_sheet(workbook, wsGeneral, 'Frequência Geral');

    // -------------------------------------------------------------
    // PLANILHA 2: Resumo por Workshop
    // -------------------------------------------------------------
    const workshopSummaryData = eventWorkshops.map((ws, index) => {
      const wsEnrolls = eventEnrollments.filter(en => en.selectedWorkshops && en.selectedWorkshops.includes(ws.id));
      const wsAttendedCount = wsEnrolls.filter(en =>
        attendances.some(a => a.userId === en.userId && a.eventId === event.id && a.workshopId === ws.id)
      ).length;
      const wsAttendanceRate = wsEnrolls.length > 0
        ? Math.round((wsAttendedCount / wsEnrolls.length) * 100)
        : 0;

      const scheduleTime = ws.startTime && ws.endTime
        ? `${ws.startTime} às ${ws.endTime}`
        : (ws.time || 'A definir');

      return {
        'Nº': index + 1,
        'Workshop / Oficina': ws.name,
        'Ministrante / Docente': ws.instructor || 'A definir',
        'Data': formatDate(ws.date || event.startDate),
        'Horário': scheduleTime,
        'Capacidade Total (Vagas)': ws.maxParticipants,
        'Total de Inscritos': wsEnrolls.length,
        'Presentes': wsAttendedCount,
        'Ausentes': wsEnrolls.length - wsAttendedCount,
        'Taxa de Frequência (%)': `${wsAttendanceRate}%`
      };
    });

    if (workshopSummaryData.length > 0) {
      const wsSummary = XLSX.utils.json_to_sheet(workshopSummaryData);
      wsSummary['!cols'] = [
        { wch: 6 },  // Nº
        { wch: 35 }, // Workshop / Oficina
        { wch: 25 }, // Ministrante
        { wch: 14 }, // Data
        { wch: 18 }, // Horário
        { wch: 24 }, // Capacidade
        { wch: 18 }, // Inscritos
        { wch: 14 }, // Presentes
        { wch: 14 }, // Ausentes
        { wch: 22 }  // Taxa de Frequência (%)
      ];
      XLSX.utils.book_append_sheet(workbook, wsSummary, 'Resumo Workshops');
    }

    // -------------------------------------------------------------
    // PLANILHA 3: Todos os Participantes de Workshops (Lista Geral Detalhada)
    // -------------------------------------------------------------
    const allWorkshopRows: any[] = [];
    eventWorkshops.forEach(ws => {
      const wsEnrolls = eventEnrollments.filter(en => en.selectedWorkshops && en.selectedWorkshops.includes(ws.id));
      const scheduleTime = ws.startTime && ws.endTime
        ? `${ws.startTime} às ${ws.endTime}`
        : (ws.time || 'A definir');

      wsEnrolls.forEach((en, idx) => {
        const att = attendances.find(
          a => a.userId === en.userId && a.eventId === event.id && a.workshopId === ws.id
        );
        const isPresent = !!att;
        const metrics = getStudentMetrics(en);

        allWorkshopRows.push({
          'Workshop': ws.name,
          'Data': formatDate(ws.date || event.startDate),
          'Horário': scheduleTime,
          'Nº Aluno': idx + 1,
          'Nome do Participante': en.userName,
          'RA': en.userRa || '—',
          'E-mail': en.userEmail || '—',
          'Presença no Workshop': isPresent ? 'Presente' : 'Ausente',
          'Data/Hora Check-in': att ? formatDateTime(att.checkedInAt) : '—',
          'Check-in Validado Por': att?.checkedInBy || '—',
          'Frequência Geral Aluno (%)': `${metrics.frequencyPct}%`
        });
      });
    });

    if (allWorkshopRows.length > 0) {
      const wsAllDetail = XLSX.utils.json_to_sheet(allWorkshopRows);
      wsAllDetail['!cols'] = [
        { wch: 30 }, // Workshop
        { wch: 14 }, // Data
        { wch: 18 }, // Horário
        { wch: 10 }, // Nº Aluno
        { wch: 30 }, // Nome do Participante
        { wch: 15 }, // RA
        { wch: 28 }, // E-mail
        { wch: 22 }, // Presença no Workshop
        { wch: 22 }, // Data/Hora Check-in
        { wch: 22 }, // Check-in Validado Por
        { wch: 25 }  // Frequência Geral Aluno (%)
      ];
      XLSX.utils.book_append_sheet(workbook, wsAllDetail, 'Workshops Detalhado');
    }

    // -------------------------------------------------------------
    // PLANILHA 4+: Abas individuais para cada workshop (até o limite do Excel)
    // -------------------------------------------------------------
    eventWorkshops.forEach((ws, wsIdx) => {
      const wsEnrolls = eventEnrollments.filter(en => en.selectedWorkshops && en.selectedWorkshops.includes(ws.id));
      const individualData = wsEnrolls.map((en, idx) => {
        const att = attendances.find(
          a => a.userId === en.userId && a.eventId === event.id && a.workshopId === ws.id
        );
        const isPresent = !!att;
        const metrics = getStudentMetrics(en);

        return {
          'Nº': idx + 1,
          'Nome do Participante': en.userName,
          'RA': en.userRa || '—',
          'E-mail': en.userEmail || '—',
          'Presença no Workshop': isPresent ? 'Presente' : 'Ausente',
          'Data/Hora Check-in': att ? formatDateTime(att.checkedInAt) : '—',
          'Validado Por': att?.checkedInBy || '—',
          'Frequência Geral (%)': `${metrics.frequencyPct}%`
        };
      });

      if (individualData.length > 0) {
        const wsInd = XLSX.utils.json_to_sheet(individualData);
        wsInd['!cols'] = [
          { wch: 6 },  // Nº
          { wch: 32 }, // Nome do Participante
          { wch: 15 }, // RA
          { wch: 28 }, // E-mail
          { wch: 22 }, // Presença no Workshop
          { wch: 22 }, // Data/Hora Check-in
          { wch: 20 }, // Validado Por
          { wch: 20 }  // Frequência Geral (%)
        ];

        // Higieniza o nome da planilha: o Excel restringe nomes de abas a <= 31 caracteres e sem \ / ? * [ ] :
        let cleanWsName = ws.name.replace(/[\\/?*\[\]:]/g, '').trim();
        if (cleanWsName.length > 20) {
          cleanWsName = cleanWsName.substring(0, 20).trim();
        }
        const sheetName = `WS ${wsIdx + 1} - ${cleanWsName}`.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, wsInd, sheetName);
      }
    });

    // Gera o arquivo de saída
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanEventName = event.name
      .replace(/[^a-zA-Z0-9À-ÿ]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase()
      .slice(0, 30);

    XLSX.writeFile(workbook, `relatorio_frequencia_${cleanEventName}_${dateStr}.xlsx`);
  } catch (err: any) {
    console.error('Erro ao exportar relatório de frequência para Excel:', err);
    alert('Erro ao exportar relatório de frequência em Excel (.xlsx): ' + (err?.message || 'Erro inesperado.'));
  }
}
