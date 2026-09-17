import React, { useState } from 'react';
import { Event, Workshop, Voucher } from '../../types';
import { X, Copy, Check, CheckCircle2, ShoppingBag, Wallet, Tag, Ticket, Trash2, AlertCircle, Sparkles } from 'lucide-react';
import { DB } from '../utils/db';

interface CheckoutModalProps {
  event: Event;
  selectedWorkshops: Workshop[];
  onClose: () => void;
  onConfirm: (paymentOption: 'CREDITO' | 'PIX' | 'GRATUITO', voucherCode?: string) => void;
}

export default function CheckoutModal({
  event,
  selectedWorkshops,
  onClose,
  onConfirm
}: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CREDITO' | 'PIX'>('PIX');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'CHECKOUT' | 'SUCCESS'>('CHECKOUT');

  // Estados do voucher
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherSuccessMsg, setVoucherSuccessMsg] = useState<string | null>(null);

  // Cálculo de valores
  const baseValue = event.price;
  const workshopsTotal = selectedWorkshops.reduce((sum, w) => sum + w.price, 0);
  const grossTotal = baseValue + workshopsTotal;
  
  // Calcula o total final com base no voucher aplicado
  let currentDiscount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discountType === 'TOTAL') {
      currentDiscount = grossTotal;
    } else if (appliedVoucher.discountType === 'PORCENTAGEM') {
      currentDiscount = Math.round(((grossTotal * (appliedVoucher.discountPercent || 0)) / 100) * 100) / 100;
    }
  }

  const finalTotal = Math.max(0, Math.round((grossTotal - currentDiscount) * 100) / 100);
  const isFree = finalTotal === 0;
  const pixKey = DB.getPixKey();
  const whatsappNumber = DB.getWhatsapp();

  const handleApplyVoucher = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setVoucherError(null);
    setVoucherSuccessMsg(null);

    if (!voucherInput.trim()) {
      setVoucherError('Informe o código do voucher para aplicar.');
      return;
    }

    const validation = DB.validateVoucher(voucherInput.trim(), event.id, grossTotal);
    if (!validation.valid || !validation.voucher) {
      setVoucherError(validation.message || 'Código de voucher inválido.');
      return;
    }

    setAppliedVoucher(validation.voucher);
    setVoucherDiscountAmount(validation.discountAmount);
    setVoucherSuccessMsg(validation.message);
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscountAmount(0);
    setVoucherInput('');
    setVoucherError(null);
    setVoucherSuccessMsg(null);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handlePaySimulate = () => {
    if (isFree) {
      setIsProcessing(true);
      setTimeout(() => {
        setIsProcessing(false);
        setStep('SUCCESS');
      }, 1000);
      return;
    }

    if (paymentMethod === 'CREDITO') {
      if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
        alert('Por favor, preencha todos os campos do cartão para simular.');
        return;
      }
    }

    setIsProcessing(true);
    // Simula atraso de processamento de sandbox
    setTimeout(() => {
      setIsProcessing(false);
      setStep('SUCCESS');
    }, 1500);
  };

  const handleSuccessClose = () => {
    onConfirm(isFree ? 'GRATUITO' : paymentMethod, appliedVoucher ? appliedVoucher.code : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 p-0 md:p-6 md:py-10 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center animate-fade-in select-none selection:bg-blue-600 selection:text-white">
      
      {/* Contêiner - Tela inteira no mobile, card centralizado no desktop */}
      <div className="bg-white dark:bg-zinc-900 border-0 md:border md:border-gray-200/90 dark:md:border-zinc-800 w-full h-full md:h-auto md:max-h-[92vh] md:max-w-4xl rounded-none md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col text-gray-800 dark:text-zinc-100">
        
        {/* Cabeçalho do modal com título e botão fechar */}
        <div className="bg-gray-50 dark:bg-zinc-850/80 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-gray-900 dark:text-zinc-100 font-extrabold text-xs sm:text-sm uppercase tracking-wider">
                {step === 'CHECKOUT' ? 'Inscrição & Ingressos' : 'Inscrição Confirmada'}
              </h2>
              <p className="text-[10px] text-gray-400 dark:text-zinc-400 font-medium truncate max-w-xs sm:max-w-md">
                {event.name}
              </p>
            </div>
          </div>
          {step === 'CHECKOUT' && (
            <button 
              type="button"
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-200/60 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Alternador de etapas do modal de checkout */}
        {step === 'CHECKOUT' ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 bg-white dark:bg-zinc-900">
            
            {/* Coluna esquerda: Resumo da compra e campo de voucher */}
            <div className="flex flex-col gap-4 border-b md:border-b-0 md:border-r border-gray-150 dark:border-zinc-800 pb-5 md:pb-0 pr-0 md:pr-8">
              
              <div>
                <h3 className="text-gray-400 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mb-2">Resumo da Inscrição</h3>
                
                {/* Nome do evento */}
                <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-750 rounded-xl p-3.5 flex flex-col gap-1">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold uppercase">{event.category}</span>
                  <h4 className="text-gray-800 dark:text-zinc-100 font-bold text-xs leading-snug">{event.name}</h4>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 mt-2 pt-2 border-t border-gray-200/80 dark:border-zinc-700/80">
                    <span>Acesso ao Evento Principal</span>
                    <span className="font-mono font-bold text-gray-800 dark:text-zinc-200">
                      {event.price === 0 ? 'Incluso' : `R$ ${event.price.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workshops selecionados, se houver */}
              {selectedWorkshops.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-gray-400 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider">
                      Workshops Selecionados ({selectedWorkshops.length})
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto pr-1">
                    {selectedWorkshops.map(ws => {
                      const dateFormatted = ws.date ? ws.date.split('-').reverse().join('/') : '';
                      return (
                        <div key={ws.id} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-750 rounded-lg p-2.5 flex items-center justify-between text-xs gap-3">
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {dateFormatted && (
                                <span className="bg-blue-100/70 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[9px] font-bold px-1.5 py-0.2 rounded font-mono">
                                  {dateFormatted}
                                </span>
                              )}
                              <span className="font-bold text-gray-800 dark:text-zinc-100 leading-tight truncate">{ws.name}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
                              Instrutor: {ws.instructor} • {ws.time}
                            </span>
                          </div>
                          <span className="font-mono text-gray-700 dark:text-zinc-300 font-bold shrink-0">
                            {ws.price === 0 ? 'Grátis' : `+ R$ ${ws.price.toFixed(2)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SEÇÃO DE VOUCHER / CUPOM DE DESCONTO / PRÉ-VENDA */}
              <div className="mt-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Voucher de Pré-venda / Desconto</span>
                  </h3>
                </div>

                {!appliedVoucher ? (
                  <form onSubmit={handleApplyVoucher} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                          type="text"
                          value={voucherInput}
                          onChange={(e) => {
                            setVoucherInput(e.target.value);
                            setVoucherError(null);
                          }}
                          placeholder="Ex: softweek-5gg4f6"
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-800 focus:bg-white dark:focus:bg-zinc-850 border border-gray-300 dark:border-zinc-700 focus:border-blue-500 rounded-xl text-xs font-mono text-gray-800 dark:text-zinc-100 outline-none uppercase placeholder:normal-case placeholder:font-sans transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!voucherInput.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>

                    {voucherError && (
                      <div className="flex items-center gap-1.5 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-2 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{voucherError}</span>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs animate-fade-in shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wide truncate">{appliedVoucher.code}</span>
                          <span className="text-[9px] bg-emerald-200 dark:bg-emerald-850 text-emerald-800 dark:text-emerald-200 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono shrink-0">
                            {appliedVoucher.discountType === 'TOTAL' ? '100% OFF (Pré-venda)' : `${appliedVoucher.discountPercent}% OFF`}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate mt-0.5">
                          {appliedVoucher.discountType === 'TOTAL' 
                            ? 'Pagamento antecipado validado (Total 100% Gratuito)' 
                            : `Desconto de ${appliedVoucher.discountPercent}% aplicado na inscrição.`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      title="Remover este voucher"
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Fim da coluna esquerda */}
            </div>

            {/* Coluna direita: Detalhes de pagamento e botão de ação */}
            <div className="flex flex-col justify-between gap-5">
              
              {isFree ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-200 dark:border-zinc-750">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-gray-900 dark:text-zinc-100 font-black text-sm uppercase tracking-wide">
                    {appliedVoucher ? 'Inscrição Pré-paga via Voucher!' : 'Evento Gratuito!'}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-zinc-300 mt-1 max-w-xs leading-relaxed">
                    {appliedVoucher 
                      ? 'Seu voucher cobriu 100% do valor da inscrição. Basta confirmar abaixo para garantir a vaga e aprovar seu ingresso imediatamente.' 
                      : 'Nenhum custo adicional aplicável para este evento ou workshops associados. Basta clicar em confirmar para reservar sua vaga.'}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  
                  <div>
                    <h3 className="text-gray-400 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider mb-1.5">Pagamento via Pix</h3>
                  </div>

                  {/* Chave Pix e botão de cópia */}
                  <div className="flex flex-col gap-3.5 bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 p-4 sm:p-5 rounded-2xl">
                    
                    <div>
                      <label className="text-[11px] text-gray-600 dark:text-zinc-300 font-bold block mb-1.5">
                        Chave Pix para Pagamento:
                      </label>
                      <div className="flex items-center bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-1.5 pl-3 gap-2 shadow-2xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 dark:focus-within:ring-emerald-900 transition-all">
                        <input 
                          type="text" 
                          readOnly 
                          value={pixKey}
                          className="w-full text-xs sm:text-sm text-gray-800 dark:text-zinc-100 font-bold font-mono bg-transparent outline-none truncate select-all"
                        />
                        <button 
                          type="button"
                          onClick={handleCopyPix}
                          title={copiedPix ? 'Copiado!' : 'Copiar chave Pix'}
                          className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-lg transition-all active:scale-95 cursor-pointer ${
                            copiedPix 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-850 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {copiedPix ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/80 dark:bg-zinc-850/80 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-[11px] text-gray-600 dark:text-zinc-300 leading-relaxed space-y-1">
                      <p>
                        1. Copie a chave Pix acima e faça a transferência de <strong className="text-emerald-700 dark:text-emerald-400 font-bold">R$ {finalTotal.toFixed(2)}</strong> pelo app do seu banco.
                      </p>
                      <p>
                        2. Após a transferência, clique em <strong className="text-gray-800 dark:text-zinc-100">"Finalizar Inscrição"</strong> para registrar sua vaga.
                      </p>
                    </div>

                  </div>

                </div>
              )}

              {/* Totais e confirmação */}
              <div className="border-t border-gray-150 dark:border-zinc-800 pt-4 flex flex-col gap-3">
                
                {/* Detalhamento com desconto do voucher aplicado */}
                {appliedVoucher && currentDiscount > 0 && (
                  <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-750 p-2.5 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                      <span>Subtotal da Inscrição:</span>
                      <span className="font-mono">R$ {grossTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        <span>Desconto Voucher ({appliedVoucher.code}):</span>
                      </span>
                      <span className="font-mono">- R$ {currentDiscount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 dark:text-zinc-400 font-bold text-xs uppercase block">Valor Total a Pagar</span>
                    {appliedVoucher && grossTotal > 0 && (
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 line-through font-mono">
                        De R$ {grossTotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {finalTotal === 0 ? 'GRATUITO' : `R$ ${finalTotal.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handlePaySimulate}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-xs tracking-widest py-3.5 sm:py-4 rounded-xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-white"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      <span>Processando Inscrição...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      <span>{isFree ? 'Confirmar Reserva de Vaga' : `Concluir Inscrição (R$ ${finalTotal.toFixed(2)})`}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        ) : (
          /* PAINEL DE SUCESSO */
          <div className="p-6 sm:p-10 text-center flex flex-col items-center justify-center gap-4 flex-1 select-none bg-white dark:bg-zinc-900 overflow-y-auto">
            
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-50 dark:bg-emerald-950/60 border border-green-200 dark:border-emerald-800 flex items-center justify-center text-green-600 dark:text-emerald-400 shrink-0">
              <svg 
                className="w-8 h-8 sm:w-10 sm:h-10" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth="3.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-xl sm:text-2xl font-black uppercase text-gray-900 dark:text-zinc-100 tracking-tight">
              {isFree ? 'Reserva Confirmada!' : 'Inscrição Registrada!'}
            </h3>
            
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md leading-relaxed">
              {isFree ? (
                <>
                  Obrigado! Sua vaga foi reservada com êxito no evento <span className="font-bold text-gray-800 dark:text-zinc-200">"{event.name}"</span>. 
                  {appliedVoucher && <> Inscrição validada com o voucher <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 uppercase">"{appliedVoucher.code}"</span>.</>}
                  {selectedWorkshops.length > 0 && ` Seus ${selectedWorkshops.length} minicursos adicionais também foram vinculados com sucesso.`}
                </>
              ) : (
                <>Sua inscrição no evento <span className="font-bold text-gray-800 dark:text-zinc-200">"{event.name}"</span> foi enviada para validação. Realize a transferência Pix para a chave institucional e envie o comprovante para o whatsapp.</>
              )}
            </p>

            {!isFree && (
              <div className="flex flex-col items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-900 p-3.5 rounded-xl w-full max-w-sm">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold uppercase tracking-wider">WhatsApp para Envio do Comprovante</span>
                <a 
                  href={`https://wa.me/${whatsappNumber.replace(/\D/g, '')}`} 
                  target="_blank" 
                  referrerPolicy="no-referrer"
                  className="font-mono text-xs font-bold text-emerald-850 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white transition-colors flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-3xs cursor-pointer"
                >
                  <span>💬</span>
                  <span>{whatsappNumber}</span>
                </a>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-750 p-3.5 rounded-xl text-left w-full max-w-sm flex flex-col gap-1 text-gray-700 dark:text-zinc-300">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 dark:text-zinc-400 leading-none">Comprovante ID</span>
                <span className="font-mono text-[10px] text-gray-600 dark:text-zinc-400">TKT-{Date.now().toString().substr(-8)}</span>
              </div>
              {appliedVoucher && (
                <div className="flex justify-between items-center text-xs border-t border-gray-150 dark:border-zinc-700 pt-1.5 mt-1">
                  <span className="text-gray-400 dark:text-zinc-400 leading-none">Voucher Aplicado</span>
                  <span className="font-mono font-bold text-[10px] text-emerald-700 dark:text-emerald-400 uppercase">{appliedVoucher.code}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs border-t border-gray-150 dark:border-zinc-700 pt-1.5 mt-1">
                <span className="text-gray-400 dark:text-zinc-400 leading-none">Status Inicial</span>
                <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase font-mono border ${
                  isFree 
                    ? 'bg-green-100 dark:bg-emerald-950/80 text-green-700 dark:text-emerald-300 border-green-200 dark:border-emerald-800' 
                    : 'bg-orange-100 dark:bg-amber-950/80 text-orange-700 dark:text-amber-300 border-orange-200 dark:border-amber-800 animate-pulse'
                }`}>
                  {isFree ? 'Aprovado' : 'Aguardando Pix'}
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSuccessClose}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-xs tracking-wider px-8 py-3.5 rounded-xl transition-all cursor-pointer shadow-sm active:scale-98"
            >
              {isFree ? 'Visualizar Meus Ingressos' : 'Ver Minhas Inscrições'}
            </button>

          </div>
        )}

      </div>
      
    </div>
  );
}
