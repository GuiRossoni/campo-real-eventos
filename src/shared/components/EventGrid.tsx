import React, { useState } from 'react';
import { Event, Enrollment } from '../../types';
import { Calendar, MapPin, Users, Ticket, ArrowUpRight } from 'lucide-react';

interface EventGridProps {
  events: Event[];
  enrollments: Enrollment[];
  searchQuery: string;
  onSelectEvent: (eventId: string) => void;
  onQuickCreateEvent?: () => void;
  hideCreateEventBanner?: boolean;
}

export default function EventGrid({ events, enrollments, searchQuery, onSelectEvent, onQuickCreateEvent, hideCreateEventBanner }: EventGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('TODOS');
  const [activeTab, setActiveTab] = useState<'PROXIMOS' | 'ENCERRADOS'>('PROXIMOS');

  // Lista de categorias
  const categories = ['TODOS', 'PALESTRA', 'WORKSHOP', 'SEMANA ACADÊMICA', 'CONGRESSO'];

  // Comparação com a data atual
  const nowStr = new Date().toISOString().split('T')[0];

  // Auxiliar: calcula as vagas restantes para um evento
  const getRemainingSeats = (event: Event) => {
    const approvedCount = enrollments.filter(e => e.eventId === event.id && e.status === 'APROVADO').length;
    const remaining = event.maxParticipants - approvedCount;
    return remaining < 0 ? 0 : remaining;
  };

  // Lógica de filtragem
  const filteredEvents = events.filter(event => {
    // 1. Deve ser PUBLICADO para alunos/visitantes (ou podemos exibir outros status para a administração em outro local, mas aqui exibimos apenas itens públicos correspondentes)
    if (event.status !== 'PUBLICADO' && event.status !== 'ENCERRADO') return false;

    // 2. Correspondência de busca
    const matchesSearch = 
      event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // 3. Correspondência de categoria
    if (activeCategory !== 'TODOS' && event.category.toUpperCase() !== activeCategory.toUpperCase()) {
      return false;
    }

    // 4. Correspondência da aba de período (comparando com a data atual do sistema, data inicial ou status da data do evento)
    // Para corresponder com precisão onde os eventos estão por volta de outubro/novembro de 2026:
    // Define se "ENCERRADO" possui flag fixa ou se filtramos por status.
    const isEnded = event.status === 'ENCERRADO' || event.endDate < '2026-06-01'; // Marca eventos passados como encerrados
    if (activeTab === 'PROXIMOS' && isEnded) return false;
    if (activeTab === 'ENCERRADOS' && !isEnded) return false;

    return true;
  });

  // Auxiliar para formatação de data (ex.: mês no formato brasileiro "10 OUT")
  const formatDateBR = (startDateStr: string, endDateStr: string) => {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const start = new Date(startDateStr + 'T00:00:00');
    
    if (!startDateStr) return '';
    const startDay = start.getDate();
    const startMonthNum = start.getMonth();
    const startMonth = months[startMonthNum];

    if (startDateStr === endDateStr) {
      return `${startDay} ${startMonth}`;
    }

    const end = new Date(endDateStr + 'T00:00:00');
    const endDay = end.getDate();
    const endMonthNum = end.getMonth();
    const endMonth = months[endMonthNum];

    if (startMonth === endMonth) {
      return `${startDay} a ${endDay} ${startMonth}`;
    } else {
      return `${startDay} ${startMonth} a ${endDay} ${endMonth}`;
    }
  };

  return (
    <section id="eventos" className="max-w-7xl mx-auto px-4 md:px-8 mt-12 py-2 select-none selection:bg-blue-600 selection:text-white">
      
      {/* Título e alternadores de seção */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black uppercase text-gray-900 dark:text-zinc-100 tracking-tight">
            <span>Eventos</span>
          </h2>
        </div>

        {/* Botões seletores de alternância de estado (Próximos vs Encerrados) */}
        <div className="flex bg-gray-100 dark:bg-zinc-800 border border-gray-200/85 dark:border-zinc-700 p-1 rounded-full text-xs font-semibold">
          <button 
            onClick={() => setActiveTab('PROXIMOS')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${activeTab === 'PROXIMOS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-855 dark:hover:text-zinc-200'}`}
          >
            Próximos Eventos
          </button>
          <button 
            onClick={() => setActiveTab('ENCERRADOS')}
            className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${activeTab === 'ENCERRADOS' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-855 dark:hover:text-zinc-200'}`}
          >
            Eventos Encerrados
          </button>
        </div>
      </div>

      {/* Barra horizontal de filtros por categoria */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-full font-bold uppercase text-[11px] tracking-wider transition-all whitespace-nowrap cursor-pointer border ${
              activeCategory === cat 
                ? 'bg-blue-600 text-white border-blue-650 shadow-sm' 
                : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Lista principal em grade */}
      {filteredEvents.length === 0 ? (
        <div className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl py-16 px-4 text-center mt-6">
          <Ticket className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-gray-800 dark:text-zinc-100 font-bold text-lg">Nenhum evento encontrado</h3>
          <p className="text-gray-400 dark:text-zinc-400 text-xs mt-1 max-w-sm mx-auto">Tente redefinir seus termos de busca ou mudar a categoria ativa para buscar mais opções.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {filteredEvents.map((event) => {
            const seatsRemaining = getRemainingSeats(event);
            const isSoldOut = seatsRemaining === 0 && event.maxParticipants > 0;
            const eventDateText = formatDateBR(event.startDate, event.endDate);
            const priceText = event.price === 0 ? 'Gratuito' : `R$ ${event.price.toFixed(2)}`;

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event.id)}
                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-zinc-700 transition-all duration-300 group cursor-pointer flex flex-col justify-between hover:-translate-y-1 hover:shadow-md p-0 relative select-none shadow-xs"
              >
                <div>
                  {/* Contêiner de proporção com banner de capa e política de referenciador */}
                  <div className="w-full h-44 overflow-hidden relative rounded-t-2xl">
                    <img 
                      src={event.banner} 
                      alt={event.name} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    
                    {/* Sombreado escuro inferior */}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>

                    {/* Distintivo de categoria superior esquerdo */}
                    <span className="absolute top-3 left-3 bg-blue-600 text-white font-extrabold text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-full shadow-sm">
                      {event.category}
                    </span>

                    {/* Distintivo de preço */}
                    <span className="absolute bottom-3 right-3 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-sm border border-gray-100 dark:border-zinc-700 text-blue-650 dark:text-blue-400 font-black text-xs px-2.5 py-1 rounded-md shadow-xs">
                      {priceText}
                    </span>
                  </div>

                  {/* Informações do corpo */}
                  <div className="p-4 flex flex-col gap-2.5">
                    
                    {/* Nome do evento */}
                    <h3 className="text-gray-800 dark:text-zinc-100 font-bold text-sm tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight line-clamp-2">
                      {event.name}
                    </h3>

                    {/* Bloco de data */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span>{eventDateText} • {event.startTime}h</span>
                    </div>

                    {/* Bloco de localização */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>

                  </div>
                </div>

                {/* Rodapé: contadores de vagas / chamada para ação */}
                <div className="border-t border-gray-100 dark:border-zinc-800 p-4 pt-3 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 bg-gray-50/50 dark:bg-zinc-950/40">
                  
                  {isSoldOut ? (
                    <span className="text-red-500 dark:text-red-400 font-extrabold uppercase tracking-wider">Esgotado</span>
                  ) : event.maxParticipants > 0 ? (
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      <span className="font-bold text-gray-700 dark:text-zinc-200">{seatsRemaining}</span>
                      <span>vagas restando</span>
                    </div>
                  ) : (
                    <span>Entrada Livre</span>
                  )}

                  <div className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform duration-300">
                    <span>Garantir</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Cartão de convite promocional - "Transforme sua ideia em um grande evento" */}
      {!hideCreateEventBanner && (
        <div className="w-full bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 mt-16 select-none relative overflow-hidden shadow-md">
          
          {/* Efeito de vetor luminoso */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="flex flex-col gap-2 max-w-xl">
            <span className="text-xs text-blue-400 font-extrabold uppercase tracking-widest leading-none">CRIAR EVENTO</span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-none capitalize mt-1">
              Transforme sua ideia em um grande evento.
            </h2>
            <p className="text-xs md:text-sm text-gray-300 font-normal leading-relaxed mt-2">
              Publique, divulgue e gerencie seu evento de forma simples, integrada e totalmente eficiente com o aval da nossa coordenação de curso.
            </p>
          </div>

          <div>
            <button
              onClick={onQuickCreateEvent}
              className="inline-flex bg-blue-600 hover:bg-blue-700 active:scale-97 text-white font-bold uppercase text-xs tracking-wider px-8 py-3.5 rounded-full transition-all cursor-pointer hover:scale-101 shadow-sm whitespace-nowrap animate-pulse"
            >
              Criar Evento
            </button>
          </div>

        </div>
      )}

    </section>
  );
}
