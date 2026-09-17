import React from 'react';
import { Certificate } from '../../types';
import { X, Printer, Award, ShieldCheck, Download, Sparkles } from 'lucide-react';

interface CertificateViewProps {
  certificate: Certificate;
  onClose: () => void;
}

export default function CertificateView({ certificate, onClose }: CertificateViewProps) {
  
  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs overflow-y-auto px-4 py-8 flex items-center justify-center select-none selection:bg-blue-600 selection:text-white">
      
      {/* Contêiner principal */}
      <div className="bg-white border border-gray-200/80 w-full max-w-4xl rounded-2xl md:rounded-3xl shadow-2xl relative p-6 md:p-8 flex flex-col gap-6 max-h-[96vh]">
        
        {/* Barra de ações do cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-150 pb-3">
          <div className="flex items-center gap-2 text-gray-800">
            <Award className="text-yellow-500 w-5 h-5 shrink-0" />
            <h3 className="text-gray-950 font-extrabold text-sm uppercase tracking-wider">Certificado de Evento Acadêmico</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="text-yellow-600 border border-yellow-600/30 hover:bg-yellow-50 py-1.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir</span>
            </button>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-blue-650 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Moldura de impressão estilizada como certificado físico */}
        <div id="print-area" className="flex-1 bg-[#fffdf5] text-[#221c0b] p-8 md:p-14 rounded-2xl border-8 border-double border-yellow-700/30 relative flex flex-col justify-between min-h-[520px] shadow-inner text-center font-sans py-12">
          
          {/* Detalhes nos cantos das bordas */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-yellow-600/40 pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-yellow-600/40 pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-yellow-600/40 pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-yellow-600/40 pointer-events-none"></div>

          {/* Estrela central em marca d'água */}
          <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none select-none z-0">
            <svg viewBox="0 0 100 100" fill="none" className="w-[300px] h-[300px] text-yellow-600">
              <path d="M50 5 L63.5 35 L95 38 L70 59 L78 91 L50 73 L22 91 L30 59 L5 38 L36.5 35 Z" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          </div>

          {/* Conteúdo do certificado */}
          <div className="relative z-10 flex flex-col justify-between h-full items-center">
            
            {/* Identidade do cabeçalho */}
            <div>
              <span className="text-yellow-800 text-[10px] uppercase font-bold tracking-[6px] block">Centro Universitário Campo Real</span>
              <h2 className="text-2xl md:text-3.5xl font-serif text-yellow-950 font-semibold tracking-tight uppercase mt-1 leading-none">CERTIFICADO DE PARTICIPAÇÃO</h2>
              <div className="w-16 h-0.5 bg-yellow-600/60 mx-auto mt-4"></div>
            </div>

            {/* Texto declarativo principal */}
            <div className="max-w-2xl px-4 mt-6">
              <p className="text-gray-700 text-sm md:text-md leading-relaxed font-sans font-light text-justify md:text-center text-gray-800">
                Certificamos para os devidos fins que o(a) graduando(a) <span className="font-bold text-[#1a1303] text-md underline decoration-yellow-600/40 underline-offset-4">{certificate.userName}</span>{certificate.userRa && `, inscrito sob Registro Acadêmico RA: ${certificate.userRa},`} participou ativamente das atividades e palestras do evento acadêmico integrado denominado <span className="font-bold text-[#1a1303] text-md">"{certificate.eventName}"</span>, realizado em conformidade com as diretrizes e coordenação pedagógica interna, totalizando carga horária curricular extracurricular de <span className="font-extrabold text-[#1a1303]">{certificate.hours} horas</span> de atividades complementares.
              </p>
            </div>

            {/* Lista de minicursos integrados validados */}
            {certificate.workshopsDetails && certificate.workshopsDetails.includes('•') && (
              <div className="bg-yellow-900/5 border border-yellow-850/10 p-3.5 rounded-xl text-left max-w-xl mx-auto w-full relative z-20 shadow-2xs">
                <span className="text-[10px] text-yellow-900 font-extrabold uppercase tracking-widest block mb-1 border-b border-yellow-800/10 pb-1">
                  Atividades de Minicurso / Oficinas Integradas Validadas:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-[#322a16] font-medium font-sans">
                  {certificate.workshopsDetails.split('\n').filter(line => line.includes('•')).map((line, i) => (
                    <div key={i} className="flex items-center gap-1.5 truncate">
                      <span className="text-yellow-700 font-extrabold">✓</span>
                      <span className="truncate">{line.replace('•', '').trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé com assinaturas e códigos de validação */}
            <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 border-t border-yellow-700/10 pt-6 mt-6">
              
              {/* Hash de validação digital */}
              <div className="flex flex-col items-center md:items-start text-[9px] text-gray-500 font-mono tracking-wider">
                <span className="font-bold">VERIFICAÇÃO DIGITAL</span>
                <span className="text-gray-700 font-bold mt-1 uppercase">Código: {certificate.hash}</span>
                <span className="text-gray-400 mt-0.5">Emitido em: {new Date(certificate.issuedAt).toLocaleDateString()}</span>
              </div>

              {/* Assinatura digital */}
              <div className="flex flex-col items-center">
                <span className="font-serif italic text-xs text-yellow-900 leading-none mb-1">Roberto de Almeida</span>
                <div className="w-48 h-[1px] bg-yellow-700/30"></div>
                <span className="text-[9px] uppercase text-gray-500 font-bold tracking-wider mt-1.5 leading-none">Diretório / Coordenador Geral</span>
              </div>

              {/* QR Code de validação */}
              <div className="flex items-center gap-2.5">
                <div className="bg-white p-1 rounded-md border border-yellow-600/30 w-12 h-12 flex items-center justify-center shrink-0">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&color=1e293b&data=${encodeURIComponent(`VERIFICATE_HASH_VAL_ID_${certificate.id}`)}`} 
                    alt="Certificate Validation Hash"
                    className="w-full h-full object-contain mix-blend-multiply"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-[8px] text-gray-500 text-left font-mono tracking-tighter leading-tight max-w-[100px] shrink-0 font-medium">
                  <span className="font-bold text-yellow-805 block uppercase">QR Code</span>
                  <span>Escaneie este código para conferir assinaturas digitais na base.</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Orientações de impressão do rodapé */}
        <p className="text-[10px] text-gray-500 text-center italic leading-none">
          💡 Nota: O certificado é gerado de forma totalmente automática. Se quiser salvar em arquivo físico, ative o recurso de impressão e marque a opção "Salvar como PDF" do navegador.
        </p>

      </div>
      
    </div>
  );
}
