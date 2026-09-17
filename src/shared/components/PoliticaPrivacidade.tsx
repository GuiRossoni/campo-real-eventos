import React from 'react';
import { ArrowLeft, ShieldAlert, Lock, Eye } from 'lucide-react';

interface PoliticaPrivacidadeProps {
  onBackToHome: () => void;
}

export default function PoliticaPrivacidade({ onBackToHome }: PoliticaPrivacidadeProps) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 select-none text-gray-700">
      {/* Navegação de retorno */}
      <button 
        onClick={onBackToHome}
        className="mb-8 text-xs text-blue-600 font-extrabold hover:underline flex items-center gap-1.5 uppercase tracking-wider font-mono cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Voltar ao Início</span>
      </button>

      {/* Cabeçalho principal */}
      <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-gray-900 mt-2 leading-tight">
          Política de Privacidade
        </h1>
      </div>

      <div className="border-t border-gray-150 pt-10 flex flex-col gap-8 text-sm leading-relaxed text-gray-650">
        
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-blue-600" />
            <span>1. Coleta de Informações</span>
          </h3>
          <p>
            Para viabilizar a inscrição em eventos, geração de ingressos e identificação dos participantes nas atividades e workshops, a plataforma coleta dados cadastrais básicos, tais como: nome completo, endereço de e-mail, Registro Acadêmico (RA) para acadêmicos do Centro Universitário Campo Real, curso e período.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>2. Uso de Dados</span>
          </h3>
          <p>
            As informações coletadas são utilizadas exclusivamente para a gestão das inscrições, emissão de ingressos com QR Code, controle de vagas e confirmação de presença (check-in) nas palestras e workshops. Os dados dos participantes não são comercializados ou compartilhados com terceiros sob nenhuma hipótese.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-950 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>3. Cookies e Sessão</span>
          </h3>
          <p>
            Utilizamos recursos seguros de armazenamento local no navegador para manter sua sessão autenticada e gerenciar o estado das inscrições e ingressos em andamento, garantindo uma navegação fluida e protegida.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-950">
            4. Seus Direitos e Consentimento
          </h3>
          <p>
            Ao utilizar a plataforma para se inscrever e participar das atividades acadêmicas, você concorda com as diretrizes desta política. Para retificações cadastrais, alterações ou exclusão de histórico de inscrições, entre em contato com a comissão organizadora através da nossa página de Ajuda / Suporte.
          </p>
        </section>

      </div>
    </div>
  );
}
