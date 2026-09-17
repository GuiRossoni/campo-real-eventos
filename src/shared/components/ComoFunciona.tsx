import React from 'react';
import { ArrowLeft, Compass, CreditCard, Ticket, CheckCircle2 } from 'lucide-react';

interface ComoFuncionaProps {
  onBackToHome: () => void;
}

export default function ComoFunciona({ onBackToHome }: ComoFuncionaProps) {
  const steps = [
    {
      index: '01',
      title: 'Explore os Eventos',
      icon: <Compass className="w-5 h-5 text-blue-600" />,
      description: 'Conheça a programação completa de eventos, palestras e workshops disponíveis na plataforma.'
    },
    {
      index: '02',
      title: 'Faça sua Inscrição',
      icon: <CreditCard className="w-5 h-5 text-blue-600" />,
      description: 'Escolha as atividades que deseja participar e garanta sua vaga de forma rápida e segura.'
    },
    {
      index: '03',
      title: 'Acesse seu Ingresso',
      icon: <Ticket className="w-5 h-5 text-blue-600" />,
      description: 'Acompanhe suas inscrições confirmadas e tenha acesso ao seu ingresso com QR Code no painel.'
    },
    {
      index: '04',
      title: 'Check-in no Evento',
      icon: <CheckCircle2 className="w-5 h-5 text-blue-600" />,
      description: 'Apresente seu QR Code na entrada das atividades para validação rápida da sua participação.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 select-none">
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
          Como Funciona?
        </h1>
        <p className="text-sm text-gray-500 mt-3 max-w-2xl font-semibold">
          Entenda os passos fundamentais para participar dos eventos do Centro Universitário Campo Real.
        </p>
      </div>

      <div className="border-t border-gray-150 pt-10">
        {/* Mapeamento da lista de etapas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-gray-150 p-6 rounded-2xl flex flex-col gap-4 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all duration-200"
            >
              {/* Marcador de índice absoluto */}
              <span className="absolute right-4 top-4 text-3xl font-black text-gray-100 group-hover:text-blue-50 transition-colors font-mono">
                {step.index}
              </span>

              <div className="bg-blue-50 w-fit p-3 rounded-xl">
                {step.icon}
              </div>

              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-850">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-520 font-medium leading-relaxed mt-2.5">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
