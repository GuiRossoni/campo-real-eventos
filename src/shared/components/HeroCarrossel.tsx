import React, { useState, useEffect } from 'react';
import { HomeBanner, Event } from '../../types';
import { ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';

interface HeroCarrosselProps {
  banners: HomeBanner[];
  events: Event[];
  onSelectEvent: (eventId: string) => void;
}

export default function HeroCarrossel({ banners, events, onSelectEvent }: HeroCarrosselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeBanners = banners.filter(b => b.isActive);

  useEffect(() => {
    if (activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners.length]);

  if (activeBanners.length === 0) {
    return (
      <div className="w-full h-4 bg-transparent max-w-7xl mx-auto px-4 mt-6"></div>
    );
  }

  const currentBanner = activeBanners[currentIndex];
  // Localiza informações do evento vinculado (como data ou local), caso haja, para enriquecer o banner
  const linkedEvent = currentBanner.linkToEventId 
    ? events.find(e => e.id === currentBanner.linkToEventId) 
    : null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 select-none relative">
      <div 
        onClick={() => {
          if (currentBanner.linkToEventId) {
            onSelectEvent(currentBanner.linkToEventId);
          }
        }}
        className={`w-full overflow-hidden rounded-2xl md:rounded-3xl relative h-[320px] md:h-[420px] bg-gray-50 border border-gray-200/80 cursor-pointer group transition-all duration-500 shadow-sm`}
      >
        {/* Imagem de fundo do banner com fallback */}
        <div className="absolute inset-0 transition-transform duration-700 ease-out scale-100 group-hover:scale-[1.01]">
          <img 
            src={currentBanner.imageUrl} 
            alt={currentBanner.title} 
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {/* Gradientes sobrepostos em preto/azul para melhor contraste e legibilidade do texto */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/60 to-transparent z-10"></div>
        </div>

        {/* Caixa de conteúdo */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 gap-3 z-20">
          
          {/* Selo do evento vinculado */}
          {linkedEvent && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200 font-semibold uppercase tracking-wider mb-1">
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[10px]">
                {linkedEvent.category}
              </span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{linkedEvent.startDate.split('-').reverse().join('/')}</span>
              </div>
              <div className="flex items-center gap-1 max-md:hidden">
                <MapPin className="w-3.5 h-3.5" />
                <span>{linkedEvent.location}</span>
              </div>
            </div>
          )}

          {/* Título */}
          <h1 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight leading-none drop-shadow-md">
            {currentBanner.title.split(' ').map((word, idx) => {
              // Destaca palavras-chave selecionadas com estilo visual
              const isHighlight = ['EVENTOS', 'ADMINISTRAÇÃO', 'TECNOLÓGICA', 'INTEGRAÇÃO', 'AQUI'].includes(word.toUpperCase());
              return (
                <span key={idx} className={isHighlight ? "text-blue-400 block md:inline" : "text-white"}>
                  {word}{' '}
                </span>
              );
            })}
          </h1>

          {/* Subtítulo */}
          <p className="text-sm md:text-md text-gray-200 max-w-xl font-normal leading-relaxed drop-shadow">
            {currentBanner.subtitle}
          </p>

          {/* Indicador de chamada para ação */}
          {currentBanner.linkToEventId && (
            <div className="mt-2 text-xs md:text-sm text-blue-400 font-bold tracking-wide uppercase flex items-center gap-1.5 group-hover:text-blue-300 transition-colors">
              <span>Saiba mais e inscreva-se</span>
              <span className="transform translate-x-0 group-hover:translate-x-1.5 transition-transform duration-300">→</span>
            </div>
          )}

        </div>

        {/* Controles de navegação do carrossel */}
        {activeBanners.length > 1 && (
          <>
            {/* Botão Anterior */}
            <button 
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-blue-600 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex border border-white/10 z-30"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Botão Próximo */}
            <button 
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-blue-600 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 cursor-pointer hidden md:flex border border-white/10 z-30"
              aria-label="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Indicadores de paginação em pontos */}
        {activeBanners.length > 1 && (
          <div className="absolute bottom-4 right-6 flex items-center gap-2 z-30">
            {activeBanners.map((_, idx) => (
              <button 
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${idx === currentIndex ? 'bg-blue-500 w-6' : 'bg-white/40 hover:bg-white/60'}`}
                aria-label={`Slide ${idx + 1}`}
              ></button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
