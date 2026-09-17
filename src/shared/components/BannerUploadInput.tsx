import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, CheckCircle2, AlertCircle, RefreshCw, Link as LinkIcon, FileCheck } from 'lucide-react';

interface BannerUploadInputProps {
  id?: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  required?: boolean;
}

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export default function BannerUploadInput({
  id = 'event-banner-input',
  value,
  onChange,
  label = 'Banner do Evento',
  required = false
}: BannerUploadInputProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState(value || '');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setUploadError(null);
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    const isExtValid = ALLOWED_EXTENSIONS.includes(extension);

    if (!isMimeValid && !isExtValid) {
      setUploadError('Formato inválido. Por favor, envie uma imagem nos formatos PNG, JPG ou WEBP.');
      return false;
    }

    // Verificação de limite de 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('O arquivo é muito grande. O tamanho máximo permitido é de 15MB.');
      return false;
    }

    return true;
  };

  const processFile = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // 1. Lê como Data URL em Base64
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Erro ao ler arquivo local.'));
        reader.readAsDataURL(file);
      });

      setUploadedFileName(file.name);

      // 2. Envia ao servidor para salvar diretamente em public/uploads/banners
      try {
        const response = await fetch('/api/uploads/banner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            data: dataUrl,
            mimeType: file.type
          })
        });

        const result = await response.json();
        if (result.success && result.url) {
          onChange(result.url);
          setManualUrl(result.url);
        } else {
          // Fallback para Data URL
          onChange(dataUrl);
          setManualUrl(dataUrl);
        }
      } catch {
        // Fallback para Data URL em caso de erro ou modo offline
        onChange(dataUrl);
        setManualUrl(dataUrl);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Falha ao processar o arquivo de imagem.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    setManualUrl('');
    setUploadedFileName(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyManualUrl = () => {
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setUploadedFileName(null);
      setUploadError(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'Ocultar URL' : 'Inserir URL'}</span>
          </button>
        </div>
      </div>

      {/* Campo nativo oculto de input de arquivo */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Campo retrátil de inserção manual de URL */}
      {showUrlInput && (
        <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200 mb-1 animate-fade-in">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Cole a URL direta da imagem (ex: https://...)"
            className="flex-1 bg-white border border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-blue-600 font-mono"
          />
          <button
            type="button"
            onClick={handleApplyManualUrl}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-md cursor-pointer transition-colors shrink-0"
          >
            Aplicar
          </button>
        </div>
      )}

      {/* Pré-visualização da imagem carregada */}
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-900 group shadow-xs">
          {/* Imagem de pré-visualização do banner */}
          <div className="w-full aspect-[21/9] sm:aspect-[16/7] relative overflow-hidden bg-gray-950 flex items-center justify-center">
            <img
              src={value}
              alt="Banner do evento"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-101"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Oculta imagem corrompida
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
          </div>

          {/* Informações do banner e controles de ação */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/90 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:shadow-lg backdrop-blur-sm cursor-pointer transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
              <span>Trocar Banner</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveImage}
              className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all"
              title="Remover banner"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold truncate max-w-[200px] sm:max-w-xs">
                {uploadedFileName || 'Banner selecionado'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-600/80 backdrop-blur-md px-2 py-0.5 rounded">
              16:9 Capa
            </span>
          </div>
        </div>
      ) : (
        /* Área de arrastar e soltar (Dropzone) */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2.5 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
              : 'border-gray-300 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/30'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-blue-900">Processando e salvando imagem na pasta de banners...</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6 text-blue-600" />
              </div>
              
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold text-gray-800">
                  <span className="text-blue-600 hover:underline">Clique para selecionar</span> ou arraste a imagem aqui
                </p>
                <p className="text-[11px] text-gray-500 font-medium">
                  Recomendado 1920x1080 ou proporção 16:9
                </p>
              </div>

              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-gray-500 font-semibold bg-white border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-emerald-600" />
                  Salvo automaticamente em /public/uploads/banners
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Alerta de erro */}
      {uploadError && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
