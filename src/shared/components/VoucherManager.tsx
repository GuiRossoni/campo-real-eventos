import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User, Event, Voucher, VoucherDiscountType } from '../../types';
import { DB } from '../utils/db';
import { 
  Ticket, 
  Plus, 
  Check, 
  Copy, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  FileSpreadsheet,
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Users, 
  Percent, 
  Tag, 
  Calendar, 
  Eye, 
  X,
  ToggleLeft,
  ToggleRight,
  Gift,
  Zap,
  Info
} from 'lucide-react';

interface VoucherManagerProps {
  currentUser: User;
  events: Event[];
  onDataChanged: () => void;
}

export default function VoucherManager({
  currentUser,
  events,
  onDataChanged
}: VoucherManagerProps) {
  const [vouchers, setVouchers] = useState<Voucher[]>(DB.getVouchers());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'INACTIVE'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  // Estados do formulário para criação de novos vouchers
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [prefix, setPrefix] = useState('softweek');
  const [count, setCount] = useState<number>(1);
  const [discountType, setDiscountType] = useState<VoucherDiscountType>('TOTAL');
  const [discountPercent, setDiscountPercent] = useState<number>(50);
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [maxUses, setMaxUses] = useState<number>(1);
  const [description, setDescription] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState<string | null>(null);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);

  // Estados de feedback de interação
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedAllSuccess, setCopiedAllSuccess] = useState(false);
  const [viewingUsageVoucher, setViewingUsageVoucher] = useState<Voucher | null>(null);
  const [voucherToDelete, setVoucherToDelete] = useState<Voucher | null>(null);
  const [isDeletingVoucher, setIsDeletingVoucher] = useState(false);
  const [deleteVoucherError, setDeleteVoucherError] = useState<string | null>(null);

  const refreshData = () => {
    setVouchers(DB.getVouchers());
    onDataChanged();
  };

  // Mantém os vouchers sincronizados com o armazenamento local e com o backend
  React.useEffect(() => {
    setVouchers(DB.getVouchers());
  }, [events]);

  React.useEffect(() => {
    DB.syncWithBackend(() => {
      setVouchers(DB.getVouchers());
    });
  }, []);

  // Cálculos de KPIs
  const totalVouchers = vouchers.length;
  const activeVouchers = vouchers.filter(v => v.isActive && v.usedCount < v.maxUses).length;
  const usedVouchers = vouchers.filter(v => v.usedCount > 0).length;
  const fullyUsedVouchers = vouchers.filter(v => v.usedCount >= v.maxUses).length;
  
  const totalDiscountGranted = vouchers.reduce((sum, v) => {
    if (!v.usages || v.usages.length === 0) return sum;
    return sum + v.usages.reduce((sub, u) => sub + (u.discountApplied || 0), 0);
  }, 0);

  // Gerador de código de pré-visualização em tempo real
  const cleanPrefix = (prefix || 'voucher').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'voucher';
  const previewCodeExample = `${cleanPrefix}-5gg4f6`;

  const handleCreateVouchers = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccessMessage(null);
    setFormErrorMessage(null);

    try {
      const applicableEventIds = selectedEventId === 'ALL' ? ['ALL'] : [selectedEventId];
      
      const created = DB.saveVouchers({
        prefix: prefix.trim(),
        count: Number(count) || 1,
        discountType,
        discountPercent: discountType === 'PORCENTAGEM' ? Number(discountPercent) : undefined,
        applicableEventIds,
        maxUses: Number(maxUses) || 1,
        description: description.trim() || undefined
      }, currentUser);

      setFormSuccessMessage(`Sucesso! ${created.length} voucher(s) gerado(s) com sucesso. Exemplo: ${created[0].code}`);
      setDescription('');
      refreshData();

      // Redefine a exibição do formulário após atraso se for criação única
      setTimeout(() => {
        setFormSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      setFormErrorMessage(err.message || 'Erro ao gerar vouchers.');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllActive = () => {
    const activeCodes = filteredVouchers
      .filter(v => v.isActive && v.usedCount < v.maxUses)
      .map(v => v.code)
      .join('\n');

    if (!activeCodes) {
      alert('Nenhum voucher ativo encontrado no filtro atual.');
      return;
    }

    navigator.clipboard.writeText(activeCodes);
    setCopiedAllSuccess(true);
    setTimeout(() => setCopiedAllSuccess(false), 2500);
  };

  const handleToggleActive = (voucherId: string) => {
    try {
      DB.toggleVoucherActive(voucherId, currentUser);
      refreshData();
    } catch (err: any) {
      setFormErrorMessage(err.message || 'Erro ao alterar status do voucher.');
      setTimeout(() => setFormErrorMessage(null), 4000);
    }
  };

  const handleDeleteVoucher = (voucher: Voucher) => {
    setDeleteVoucherError(null);
    setVoucherToDelete(voucher);
  };

  const handleConfirmDeleteVoucher = () => {
    if (!voucherToDelete) return;
    setIsDeletingVoucher(true);
    setDeleteVoucherError(null);

    try {
      DB.deleteVoucher(voucherToDelete.id, currentUser);
      setVoucherToDelete(null);
      refreshData();
    } catch (err: any) {
      setDeleteVoucherError(err.message || 'Erro ao excluir voucher.');
    } finally {
      setIsDeletingVoucher(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = filteredVouchers.length > 0 ? filteredVouchers : vouchers;
      const worksheetData = dataToExport.map(v => {
        const typeLabel = v.discountType === 'TOTAL' ? '100% (Pré-venda Total)' : `${v.discountPercent}%`;
        const eventLabel = v.applicableEventIds.includes('ALL') 
          ? 'Todos os Eventos' 
          : v.applicableEventIds.map(eid => events.find(e => e.id === eid)?.name || eid).join('; ');
        const statusLabel = !v.isActive ? 'Inativo' : (v.usedCount >= v.maxUses ? 'Esgotado' : 'Disponível');

        return {
          'Código': v.code,
          'Prefixo': v.prefix,
          'Tipo de Desconto': typeLabel,
          'Valor do Desconto': v.discountType === 'TOTAL' ? '100%' : `${v.discountPercent}%`,
          'Eventos Aplicáveis': eventLabel,
          'Limite de Usos': v.maxUses,
          'Usos Realizados': v.usedCount,
          'Saldo Restante': Math.max(0, v.maxUses - v.usedCount),
          'Status': statusLabel,
          'Data de Criação': v.createdAt,
          'Criador': v.creatorName || 'Coordenação',
          'Descrição / Observações': v.description || ''
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Ajuste automático de largura das colunas
      worksheet['!cols'] = [
        { wch: 18 }, // Código
        { wch: 12 }, // Prefixo
        { wch: 22 }, // Tipo de Desconto
        { wch: 18 }, // Valor do Desconto
        { wch: 32 }, // Eventos Aplicáveis
        { wch: 15 }, // Limite de Usos
        { wch: 16 }, // Usos Realizados
        { wch: 15 }, // Saldo Restante
        { wch: 14 }, // Status
        { wch: 20 }, // Data de Criação
        { wch: 22 }, // Criador
        { wch: 35 }  // Descrição / Observações
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vouchers');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `vouchers_camporeal_${dateStr}.xlsx`);
    } catch (err: any) {
      alert('Erro ao exportar tabela de vouchers para o Excel (.xlsx): ' + err.message);
    }
  };

  // Filtra lista
  const filteredVouchers = vouchers.filter(v => {
    // Correspondência de busca
    const search = searchTerm.toLowerCase();
    const matchesSearch = !search || 
      v.code.toLowerCase().includes(search) ||
      (v.description && v.description.toLowerCase().includes(search)) ||
      (v.creatorName && v.creatorName.toLowerCase().includes(search));

    // Correspondência de status
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = v.isActive && v.usedCount < v.maxUses;
    } else if (statusFilter === 'USED') {
      matchesStatus = v.usedCount >= v.maxUses;
    } else if (statusFilter === 'INACTIVE') {
      matchesStatus = !v.isActive;
    }

    // Correspondência de evento
    let matchesEvent = true;
    if (eventFilter !== 'ALL') {
      matchesEvent = v.applicableEventIds.includes('ALL') || v.applicableEventIds.includes(eventFilter);
    }

    return matchesSearch && matchesStatus && matchesEvent;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-gray-800 dark:text-zinc-100">
      
      {/* Cabeçalho e resumo de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block tracking-wider">Total de Vouchers</span>
            <span className="text-xl font-black text-gray-900 dark:text-zinc-100 font-mono">{totalVouchers}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block tracking-wider">Disponíveis / Ativos</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{activeVouchers}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block tracking-wider">Vouchers Utilizados</span>
            <span className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">{usedVouchers}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-2xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block tracking-wider">Descontos Concedidos</span>
            <span className="text-xl font-black text-amber-700 dark:text-amber-400 font-mono">R$ {totalDiscountGranted.toFixed(2)}</span>
          </div>
        </div>

      </div>

      {/* Card principal de ação do gerador */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Ticket className="w-4 h-4" />
            </div>
            <h3 className="text-gray-800 dark:text-zinc-100 font-bold text-sm uppercase tracking-wider leading-none">
              Gerador de Vouchers de Pré-venda
            </h3>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              showCreateForm 
                ? 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300' 
                : 'bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-2xs'
            }`}
          >
            {showCreateForm ? (
              <>
                <X className="w-4 h-4" />
                <span>Ocultar Formulário</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Gerar Novos Vouchers</span>
              </>
            )}
          </button>
        </div>

        {/* Formulário expansível de criação */}
        {showCreateForm && (
          <form onSubmit={handleCreateVouchers} className="p-5 sm:p-6 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40 space-y-5 animate-fade-in">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Campo 1: Sigla / Prefixo */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Sigla / Prefixo do Evento</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">Sem espaços</span>
                </label>
                <input 
                  type="text"
                  required
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="Ex: softweek, engsoft, cre"
                  className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-gray-900 dark:text-zinc-100 font-bold focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 uppercase"
                />
              </div>

              {/* Campo 2: Quantidade a Gerar */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Quantidade de Vouchers</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">Máx: 100</span>
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 w-full"
                  />
                  <div className="flex gap-1 shrink-0">
                    {[1, 5, 10, 20].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCount(n)}
                        className={`text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          count === n 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-700'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campo 3: Modalidade de Desconto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">Modalidade de Desconto</label>
                <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-zinc-800 p-1 rounded-xl border border-transparent dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setDiscountType('TOTAL')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                      discountType === 'TOTAL'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    100% (Pré-venda)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('PORCENTAGEM')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center truncate ${
                      discountType === 'PORCENTAGEM'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    Desconto em %
                  </button>
                </div>
              </div>

              {/* Campo 4: Porcentagem ou Informações */}
              {discountType === 'PORCENTAGEM' ? (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                    <span>Porcentagem (%)</span>
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-bold">{discountPercent}% OFF</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min={1}
                      max={99}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(99, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 w-full"
                    />
                    <div className="flex gap-1 shrink-0">
                      {[25, 50, 75].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercent(pct)}
                          className={`text-[10px] font-bold px-1.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                            discountPercent === pct 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 border-gray-300 dark:border-zinc-700'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">Cobertura do Voucher</label>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="truncate">Totalidade (100% Gratuito)</span>
                  </div>
                </div>
              )}

            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200 dark:border-zinc-800">
              
              {/* Event Link selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">Evento Acadêmico Permitido</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                >
                  <option value="ALL">🌐 Todos os Eventos (Geral)</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.price === 0 ? 'Gratuito' : `R$ ${ev.price.toFixed(2)}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Limite de Usos por Voucher */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Limite de Usos por Voucher</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-normal">Padrão: 1 (Uso único)</span>
                </label>
                <input 
                  type="number"
                  min={1}
                  max={100}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                />
              </div>

              {/* Descrição / Observação */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">Identificação / Observação Interna</label>
                <input 
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Alunos inscritos presencialmente Bloco 3"
                  className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
                />
              </div>

            </div>

            {/* Caixa de pré-visualização ao vivo e envio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-100/60 dark:bg-zinc-800/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 rounded-b-xl">
              
              <div className="flex items-center gap-3">
                <div className="text-xs text-gray-600 dark:text-zinc-300">
                  <span className="font-bold text-gray-800 dark:text-zinc-100 block">Formato Gerado em Tempo Real:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs font-black text-gray-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg shadow-2xs">
                      {previewCodeExample}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                      ({count} código{count > 1 ? 's únicos serão criados' : ' único será criado'})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Gerar e Ativar {count > 1 ? `${count} Vouchers` : 'Voucher'}</span>
                </button>
              </div>

            </div>

            {formSuccessMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{formSuccessMessage}</span>
              </div>
            )}

            {formErrorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{formErrorMessage}</span>
              </div>
            )}

          </form>
        )}

      </div>

      {/* Listagem de vouchers e controles de busca */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden flex flex-col">
        
        {/* Cabeçalho de filtros da tabela */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-gray-50/50 dark:bg-zinc-900/60">
          
          {/* Busca à esquerda */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código (ex: softweek), observação ou emissor..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 focus:border-blue-600 dark:focus:border-blue-500 rounded-xl text-xs text-gray-800 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none transition-all"
            />
          </div>

          {/* Filtros à direita e exportação */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filtro de status */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ACTIVE">Disponíveis / Ativos</option>
              <option value="USED">Totalmente Utilizados</option>
              <option value="INACTIVE">Desativados</option>
            </select>

            {/* Filtro de evento */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 max-w-[200px] truncate"
            >
              <option value="ALL">Evento: Todos</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>

            {/* Copiar todos os códigos */}
            <button
              type="button"
              onClick={handleCopyAllActive}
              title="Copiar lista de códigos ativos"
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                copiedAllSuccess 
                  ? 'bg-emerald-600 text-white border-emerald-600' 
                  : 'bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 border-gray-300 dark:border-zinc-700'
              }`}
            >
              {copiedAllSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Códigos Copiados!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
                  <span>Copiar Ativos</span>
                </>
              )}
            </button>

            {/* Export Excel (.xlsx) */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="Exportar tabela de vouchers em planilha Excel (.xlsx)"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>

          </div>

        </div>

        {/* Componente da tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100/70 dark:bg-zinc-800/70 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="p-3.5 pl-5">Código do Voucher</th>
                <th className="p-3.5">Tipo & Desconto</th>
                <th className="p-3.5">Evento Vinculado</th>
                <th className="p-3.5 text-center">Uso / Limite</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Criado em</th>
                <th className="p-3.5 pr-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-zinc-800 text-gray-800 dark:text-zinc-200">
              {filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400 dark:text-zinc-500 italic bg-gray-50/30 dark:bg-zinc-900/30">
                    <Ticket className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-600 mb-2" />
                    <p className="font-bold text-gray-600 dark:text-zinc-300">Nenhum voucher encontrado com os filtros selecionados.</p>
                    <p className="text-[11px] mt-1 text-gray-400 dark:text-zinc-500">Clique em "Gerar Novos Vouchers" para emitir novos códigos de pré-venda.</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => {
                  const isExhausted = voucher.usedCount >= voucher.maxUses;
                  const isAvailable = voucher.isActive && !isExhausted;
                  const isCopied = copiedCode === voucher.code;

                  const eventName = voucher.applicableEventIds.includes('ALL') 
                    ? 'Todos os Eventos'
                    : events.find(e => voucher.applicableEventIds.includes(e.id))?.name || 'Evento Específico';

                  return (
                    <tr key={voucher.id} className="hover:bg-blue-50/30 dark:hover:bg-zinc-800/40 transition-colors">
                      
                      {/* Código e cópia */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-300 dark:border-zinc-700 px-2.5 py-1 rounded-lg transition-colors group">
                            <span className="font-mono font-black text-gray-900 dark:text-zinc-100 uppercase tracking-wider text-xs">
                              {voucher.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(voucher.code)}
                              title="Copiar código do voucher"
                              className="text-gray-400 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer p-0.5"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {isCopied && (
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono animate-fade-in border border-emerald-200 dark:border-emerald-800">
                              Copiado!
                            </span>
                          )}
                        </div>

                        {voucher.description && (
                          <div className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1 truncate max-w-xs">
                            {voucher.description}
                          </div>
                        )}
                      </td>

                      {/* Tipo de desconto */}
                      <td className="p-3.5">
                        {voucher.discountType === 'TOTAL' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                            <Zap className="w-3 h-3" />
                            <span>100% (Pré-pago)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase font-mono bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                            <Percent className="w-3 h-3" />
                            <span>{voucher.discountPercent}% OFF</span>
                          </span>
                        )}
                      </td>

                      {/* Evento */}
                      <td className="p-3.5">
                        <span className="font-semibold text-gray-700 dark:text-zinc-300 block truncate max-w-[180px]" title={eventName}>
                          {eventName}
                        </span>
                      </td>

                      {/* Progresso de utilização */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono font-bold text-xs text-gray-800 dark:text-zinc-200">
                            {voucher.usedCount} / {voucher.maxUses}
                          </span>
                          <div className="w-16 h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                isExhausted 
                                  ? 'bg-purple-600 dark:bg-purple-500' 
                                  : voucher.usedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, (voucher.usedCount / voucher.maxUses) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {!voucher.isActive ? (
                          <span className="text-[10px] font-extrabold uppercase font-mono bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 border border-gray-200 dark:border-zinc-750 px-2 py-0.5 rounded">
                            Desativado
                          </span>
                        ) : isExhausted ? (
                          <span className="text-[10px] font-extrabold uppercase font-mono bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded">
                            Esgotado
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase font-mono bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                            Disponível
                          </span>
                        )}
                      </td>

                      {/* Informações de criação */}
                      <td className="p-3.5 text-gray-500 dark:text-zinc-400 text-[11px]">
                        <div>{new Date(voucher.createdAt).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[9px] text-gray-400 dark:text-zinc-500 truncate max-w-[120px]">{voucher.creatorName || 'Coordenação'}</div>
                      </td>

                      {/* Ações */}
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* Visualizar utilizações */}
                          {voucher.usedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setViewingUsageVoucher(voucher)}
                              title="Ver histórico de alunos que utilizaram"
                              className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Alternar ativo/inativo */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(voucher.id)}
                            title={voucher.isActive ? "Desativar este voucher" : "Ativar este voucher"}
                            className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                          >
                            {voucher.isActive ? (
                              <ToggleRight className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-gray-400 dark:text-zinc-500" />
                            )}
                          </button>

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVoucher(voucher)}
                            title="Excluir voucher"
                            className="p-1.5 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: HISTÓRICO DE RESGATE / UTILIZAÇÃO */}
      {viewingUsageVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-lg w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900 dark:text-zinc-100">Histórico de Utilização</h4>
                  <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">{viewingUsageVoucher.code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingUsageVoucher(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {!viewingUsageVoucher.usages || viewingUsageVoucher.usages.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-zinc-500 italic text-center py-6">Nenhum registro detalhado encontrado.</p>
              ) : (
                viewingUsageVoucher.usages.map((usage, idx) => (
                  <div key={idx} className="bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/80 rounded-xl p-3 text-xs flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-900 dark:text-zinc-100">{usage.userName}</span>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        - R$ {usage.discountApplied.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400">{usage.userEmail}</div>
                    <div className="text-[10px] text-gray-400 dark:text-zinc-500 flex justify-between pt-1 border-t border-gray-200 dark:border-zinc-700 mt-1">
                      <span>Data: {new Date(usage.usedAt).toLocaleString('pt-BR')}</span>
                      <span className="font-mono">Inscrição: {usage.enrollmentId.substr(-8)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewingUsageVoucher(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAÇÃO DE EXCLUSÃO DE VOUCHER */}
      {voucherToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-2xl animate-scale-in flex flex-col gap-4 text-gray-800 dark:text-zinc-100">
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-900/50">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h4 className="text-gray-900 dark:text-zinc-100 font-extrabold text-base uppercase tracking-wider">
                Excluir Voucher
              </h4>
              <p className="text-gray-600 dark:text-zinc-300 text-xs mt-2 leading-relaxed">
                Tem certeza que deseja excluir permanentemente o voucher <span className="font-mono font-bold text-gray-950 dark:text-white bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-gray-300 dark:border-zinc-700">{voucherToDelete.code}</span>?
              </p>
            </div>

            {/* Resumo dos detalhes do voucher */}
            <div className="bg-gray-50 dark:bg-zinc-800/60 rounded-xl p-3.5 border border-gray-200 dark:border-zinc-700/80 text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Desconto:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {voucherToDelete.discountType === 'TOTAL' ? '100% (Pré-venda Total)' : `${voucherToDelete.discountPercent}% OFF`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-zinc-400">Utilizações:</span>
                <span className="font-mono font-bold text-gray-800 dark:text-zinc-200">
                  {voucherToDelete.usedCount} de {voucherToDelete.maxUses}
                </span>
              </div>
              {voucherToDelete.description && (
                <div className="text-[11px] text-gray-500 dark:text-zinc-400 pt-1.5 border-t border-gray-200 dark:border-zinc-700">
                  Obs: {voucherToDelete.description}
                </div>
              )}
              {voucherToDelete.usedCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] rounded-lg p-2 font-medium">
                  ⚠️ Este voucher já foi resgatado {voucherToDelete.usedCount} vez(es). A exclusão impedirá novos resgates.
                </div>
              )}
            </div>

            {deleteVoucherError && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-3 rounded-xl">
                {deleteVoucherError}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-gray-150 dark:border-zinc-800">
              <button
                type="button"
                disabled={isDeletingVoucher}
                onClick={() => {
                  setVoucherToDelete(null);
                  setDeleteVoucherError(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingVoucher}
                onClick={handleConfirmDeleteVoucher}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isDeletingVoucher ? (
                  <span>Excluindo...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
