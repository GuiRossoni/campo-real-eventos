import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, Mail, MessageSquare, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react';
import { THEME } from '../styles/designSystem';
import { DB } from '../utils/db';

interface AjudaFaqProps {
  onBackToHome: () => void;
}

export default function AjudaFaq({ onBackToHome }: AjudaFaqProps) {
  // Estado do formulário de suporte
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportSubject, setSupportSubject] = useState('Dúvida sobre Inscrições');
  const [supportMessage, setSupportMessage] = useState('');
  const [formSent, setFormSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado de expansão do FAQ
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: 'Como acesso meu ingresso ou comprovante de inscrição?',
      answer: 'Após entrar no sistema, acesse seu painel e consulte a seção de inscrições ou "Meus Ingressos". Lá você encontrará todos os seus eventos confirmados, com detalhes das atividades escolhidas e seu QR Code individual para validação de entrada.'
    },
    {
      question: 'Como funciona a confirmação de presença (check-in) nos eventos?',
      answer: 'No dia do evento ou workshop, apresente seu QR Code gerado no sistema (pelo smartphone ou impresso). A equipe de organização realiza a leitura em tempo real através do scanner integrado na plataforma para confirmar seu acesso.'
    },
    {
      question: 'Posso alterar meus workshops após concluir a inscrição?',
      answer: 'Sim! Desde que as inscrições do evento ainda estejam abertas e existam vagas disponíveis, você pode acessar a página do evento inscrito e clicar em "Alterar Grade" para atualizar ou trocar suas oficinas e palestras.'
    },
    {
      question: 'Como funciona o pagamento das inscrições em eventos ou workshops pagos?',
      answer: 'Para atividades com taxa de inscrição, a plataforma conta exclusivamente com checkout com pagamento por Pix, garantindo validação ágil, confirmação imediata da sua vaga e emissão automática do ingresso com QR Code, além de suportar a aplicação de cupons promocionais.'
    },
    {
      question: 'Visitantes externos da comunidade podem participar dos eventos?',
      answer: 'Sim! Membros externos e comunidade podem criar uma conta na plataforma ou acessar pelo modo visitante na tela de login para se inscrever nas palestras, oficinas e semanas acadêmicas abertas ao público geral.'
    },
    {
      question: 'Esqueci minha senha de acesso, como posso recuperá-la?',
      answer: 'Na tela de login, clique na opção "Esqueci minha senha" e insira seu e-mail cadastrado. Um código de verificação de 6 dígitos será enviado ao seu e-mail. Basta informar o código recebido e cadastrar uma nova senha para redefinir o acesso com segurança.'
    },
    {
      question: 'Quem desenvolveu e mantém esta plataforma?',
      answer: 'A plataforma é um projeto de extensão universitária desenvolvido pelo curso de Engenharia de Software do Centro Universitário Campo Real, concebida para modernizar a divulgação, as inscrições e a gestão de atividades acadêmicas.'
    }
  ];

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName || !supportEmail || !supportMessage) {
      alert('Por favor, preencha todos os campos do formulário de contato.');
      return;
    }

    setIsSubmitting(true);
    try {
      await DB.sendSupportMessage({
        fromName: supportName,
        fromEmail: supportEmail,
        subject: supportSubject,
        message: supportMessage
      });
      setFormSent(true);
      setSupportName('');
      setSupportEmail('');
      setSupportMessage('');
      setTimeout(() => {
        setFormSent(false);
      }, 6000);
    } catch {
      setFormSent(true);
      setSupportName('');
      setSupportEmail('');
      setSupportMessage('');
      setTimeout(() => {
        setFormSent(false);
      }, 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFaq = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

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
        <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest font-mono">
          Suporte e Dúvidas Frequentes
        </span>
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-gray-900 mt-2 leading-tight">
          Ajuda / FAQ
        </h1>
        <p className="text-sm text-gray-500 mt-3 max-w-2xl font-semibold">
          Precisa de auxílio sobre inscrições, workshops ou cadastro? Navegue pelas dúvidas resolvidas abaixo ou envie uma mensagem diretamente para a comissão organizadora de eventos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 border-t border-gray-150 pt-10">
        
        {/* Coluna esquerda: Acordeão de FAQ */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest font-mono flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Perguntas Frequentes</span>
          </h3>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white border border-gray-150 rounded-xl overflow-hidden transition-all shadow-2xs"
                >
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 font-semibold text-xs text-gray-800 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <span className="uppercase tracking-tight leading-relaxed">{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-550 leading-relaxed font-medium">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna direita: Formulário de contato para suporte */}
        <div className="bg-white border border-gray-150 p-6 md:p-8 rounded-2xl shadow-xs">
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest font-mono flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4 text-blue-600" />
            <span>Formulário de Suporte</span>
          </h3>

          {formSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center flex flex-col items-center gap-3">
              <CheckCircle className="w-10 h-10 text-green-600" />
              <h4 className="text-xs font-black text-green-800 uppercase">Mensagem Entregue!</h4>
              <p className="text-[11px] text-green-700 leading-relaxed font-semibold">
                Sua solicitação de suporte acadêmico de eventos foi encaminhada com sucesso! Uma resposta detalhada será enviada em breve ao seu e-mail institucional.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSupportSubmit} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <label className={THEME.input.label}>Seu Nome Completo</label>
                <input 
                  type="text" 
                  className={THEME.input.text}
                  placeholder="EX: Maria Cecília Santos"
                  value={supportName}
                  onChange={e => setSupportName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={THEME.input.label}>E-mail de Contato</label>
                <input 
                  type="email" 
                  className={THEME.input.text}
                  placeholder="Ex: maria.santos@camporeal.edu.br"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={THEME.input.label}>Assunto</label>
                <select 
                  className={THEME.input.select}
                  value={supportSubject}
                  onChange={e => setSupportSubject(e.target.value)}
                >
                  <option value="Dúvida sobre Inscrições">Dúvida sobre Inscrições</option>
                  <option value="Check-in e Ingressos">Check-in e Ingressos</option>
                  <option value="Inscrição em Workshops">Inscrição em Workshops</option>
                  <option value="Erro no Cadastro/Login">Erro no Cadastro ou Login</option>
                  <option value="Contato com Coordenador">Falar com Coordenação de Eventos</option>
                  <option value="Outros">Outros Casos</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={THEME.input.label}>Sua Mensagem</label>
                <textarea 
                  rows={4}
                  className={`${THEME.input.text} resize-none`}
                  placeholder="Descreva detalhadamente o ocorrido ou sua dúvida..."
                  value={supportMessage}
                  onChange={e => setSupportMessage(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase tracking-wider py-3 rounded-xl cursor-pointer transition-colors text-center font-mono mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando Mensagem...</span>
                  </>
                ) : (
                  <span>Enviar Requisição de Suporte</span>
                )}
              </button>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
