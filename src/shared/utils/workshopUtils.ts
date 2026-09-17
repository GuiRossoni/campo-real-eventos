import { Workshop } from '../../types';

/**
 * Converte uma string de horário (ex: "14:00", "14:30", "14h", "14h30", "14") para minutos do dia.
 */
export function timeStringToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const clean = timeStr.trim().toLowerCase();
  
  // Corresponde a HH:MM ou HHhMM ou HH:MM:SS ou HHh
  const match = clean.match(/^(\d{1,2})(?:[:h](\d{1,2}))?/);
  if (!match) return null;
  
  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  
  if (isNaN(hours) || hours < 0 || hours > 24) return null;
  if (isNaN(minutes) || minutes < 0 || minutes > 59) return null;
  
  return hours * 60 + minutes;
}

/**
 * Extrai os minutos de início e término de um minicurso.
 */
export function getWorkshopTimeRange(ws: Workshop): { start: number; end: number } | null {
  let start = timeStringToMinutes(ws.startTime);
  let end = timeStringToMinutes(ws.endTime);

  // Se startTime / endTime estiverem ausentes ou inválidos, tenta extrair de `ws.time`
  if (start === null && ws.time) {
    const parts = ws.time.split(/(?:às|as|ate|até|-|–|—)/i);
    if (parts.length >= 2) {
      start = timeStringToMinutes(parts[0]);
      end = timeStringToMinutes(parts[1]);
    } else if (parts.length === 1) {
      start = timeStringToMinutes(parts[0]);
    }
  }

  if (start === null) return null;

  // Se o término estiver ausente, calcula com base nas horas ou usa o padrão de 120 minutos (2h)
  if (end === null || end <= start) {
    const durationMin = (ws.hours && ws.hours > 0) ? ws.hours * 60 : 120;
    end = Math.min(start + durationMin, 24 * 60);
  }

  return { start, end };
}

/**
 * Normaliza uma string de data para YYYY-MM-DD ou formato comparável.
 */
export function normalizeDate(dateStr?: string): string {
  if (!dateStr || dateStr === 'sem_data') return '';
  return dateStr.trim();
}

/**
 * Verifica se dois minicursos possuem datas conflitantes e horários sobrepostos.
 */
export function hasTimeConflict(ws1: Workshop, ws2: Workshop): boolean {
  if (ws1.id === ws2.id) return false;

  const date1 = normalizeDate(ws1.date);
  const date2 = normalizeDate(ws2.date);

  // Se as datas forem especificadas e diferentes, não há conflito
  if (date1 && date2 && date1 !== date2) {
    return false;
  }

  // Se ambos não tiverem data ou tiverem a mesma data, verifica o intervalo de horário
  const range1 = getWorkshopTimeRange(ws1);
  const range2 = getWorkshopTimeRange(ws2);

  // Se não foi possível interpretar os intervalos de horário, verifica se os textos de horário coincidem
  if (!range1 || !range2) {
    if (date1 === date2 && ws1.time && ws2.time && ws1.time.trim() === ws2.time.trim()) {
      return true;
    }
    return false;
  }

  // Condição de sobreposição: start1 < end2 e end1 > start2
  return range1.start < range2.end && range1.end > range2.start;
}

/**
 * Verifica se um minicurso de destino entra em conflito com algum dos minicursos atualmente selecionados.
 */
export function getConflictingWorkshop(
  targetWs: Workshop,
  selectedWorkshops: Workshop[]
): Workshop | null {
  for (const selected of selectedWorkshops) {
    if (selected.id !== targetWs.id && hasTimeConflict(targetWs, selected)) {
      return selected;
    }
  }
  return null;
}

/**
 * Verifica se um minicurso está esgotado.
 */
export function isWorkshopSoldOut(ws: Workshop): boolean {
  const remaining = ws.maxParticipants - (ws.enrolledCount || 0);
  return remaining <= 0;
}

/**
 * Obtém o número de vagas restantes em um minicurso.
 */
export function getWorkshopRemainingSpots(ws: Workshop): number {
  return Math.max(0, ws.maxParticipants - (ws.enrolledCount || 0));
}

/**
 * Encontra o minicurso em um dia específico que possui o MAIOR número de vagas disponíveis
 * e não possui conflito de horário com os minicursos já selecionados.
 */
export function getAvailableWorkshopWithMostSpots(
  dayWorkshops: Workshop[],
  currentlySelectedWorkshops: Workshop[]
): Workshop | null {
  // Filtra apenas minicursos que NÃO estão esgotados
  const availableWorkshops = dayWorkshops.filter(ws => !isWorkshopSoldOut(ws));

  // Filtra minicursos que NÃO conflitam com minicursos já selecionados de outros dias/horários
  const nonConflictingWorkshops = availableWorkshops.filter(ws => {
    return !getConflictingWorkshop(ws, currentlySelectedWorkshops);
  });

  if (nonConflictingWorkshops.length === 0) {
    return null;
  }

  // Ordena pelo maior número de vagas restantes primeiro
  nonConflictingWorkshops.sort((a, b) => {
    const spotsA = getWorkshopRemainingSpots(a);
    const spotsB = getWorkshopRemainingSpots(b);
    return spotsB - spotsA;
  });

  return nonConflictingWorkshops[0];
}
