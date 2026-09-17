import React from 'react';
import Logo from './Logo';
import { THEME } from '../styles/designSystem';

interface FooterProps {
  onNavigate?: (page: 'home' | 'como' | 'ajuda' | 'privacidade') => void;
  className?: string;
}

export default function Footer({ onNavigate, className = '' }: FooterProps) {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={`${THEME.footer.container} ${className}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Coluna da marca */}
        <div className="flex flex-col gap-3 w-full">
          <div className="h-10 flex items-center justify-start cursor-pointer group" onClick={() => { handleScrollToTop(); onNavigate?.('home'); }}>
            {/* Logotipo personalizado da marca */}
            <Logo variant="full" className="w-40 h-10 object-contain transition-all" />
          </div>
          <p className={THEME.footer.textMuted}>
            Plataforma de eventos desenvolvida como projeto de extensão do curso de Engenharia de Software do Centro Universitário Campo Real, promovendo a divulgação e a participação em atividades acadêmicas.
          </p>
          <p className={THEME.footer.textSmall}>
            © {new Date().getFullYear()} Campo Real Eventos. Todos os direitos reservados.
          </p>
        </div>

        {/* Coluna Institucional */}
        <div className="flex flex-col gap-3 md:items-center w-full">
          <div className="h-10 flex items-center justify-start md:justify-center w-full">
            <h3 className={`${THEME.footer.title} md:text-center`}>Institucional</h3>
          </div>
          <ul className="text-sm flex flex-col gap-2 text-gray-500 md:items-center">
            <li><button onClick={() => { handleScrollToTop(); onNavigate?.('como'); }} className="hover:text-blue-600 transition-colors cursor-pointer text-left md:text-center font-medium">Como Funciona</button></li>
            <li><button onClick={() => { handleScrollToTop(); onNavigate?.('ajuda'); }} className="hover:text-blue-600 transition-colors cursor-pointer text-left md:text-center font-medium">Ajuda / FAQ</button></li>
            <li><button onClick={() => { handleScrollToTop(); onNavigate?.('privacidade'); }} className="hover:text-blue-600 transition-colors cursor-pointer text-left md:text-center font-medium">Política de Privacidade</button></li>
          </ul>
        </div>

        {/* Coluna Fale Conosco / Contato */}
        <div className="flex flex-col gap-3 md:items-end w-full">
          <div className="h-10 flex items-center justify-start md:justify-end w-full">
            <h3 className={`${THEME.footer.title} md:text-right`}>Fale Conosco</h3>
          </div>
          <ul className="text-sm flex flex-col gap-3 text-gray-500 md:items-end">
            <li className="flex items-center gap-2 md:flex-row-reverse">
              <span className={THEME.footer.contactIcon}>✉</span>
              <a href="mailto:softweek@aeg.dev.br" className={`${THEME.footer.link} break-all md:text-right`}>softweek@aeg.dev.br</a>
            </li>
            <li className="flex items-center gap-2 md:flex-row-reverse">
              <span className={THEME.footer.contactIcon}>☎</span>
              <span className="font-mono md:text-right">(42) 3621-5200</span>
            </li>
            <li className="flex items-center gap-2 md:flex-row-reverse">
              <span className={THEME.footer.contactIcon}>📍</span>
              <span className="md:text-right">Guarapuava - PR</span>
            </li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
