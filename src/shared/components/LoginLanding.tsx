import React, { useState } from 'react';
import { User } from '../../types';
import { DB } from '../utils/db';
import { THEME } from '../styles/designSystem';
import Logo from './Logo';
import Footer from './Footer';
import { 
  Mail, 
  Key, 
  UserCheck, 
  BookOpen, 
  ShieldAlert, 
  ShieldCheck,
  ArrowRight, 
  Compass, 
  ChevronRight,
  GraduationCap,
  Hash,
  Lock,
  Eye,
  EyeOff,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Check,
  Building,
  Calendar
} from 'lucide-react';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateFullName,
  validateRA,
  validateCourse,
  validateInstitution,
  validatePeriod,
  validateRecoveryCode
} from '../utils/validators';

interface LoginLandingProps {
  onLoginSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
  onNavigate?: (page: 'home' | 'como' | 'ajuda' | 'privacidade') => void;
}

export default function LoginLanding({ 
  onLoginSuccess, 
  onContinueAsGuest,
  onNavigate
}: LoginLandingProps) {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState('');
  const [ra, setRa] = useState('');
  const [course, setCourse] = useState('');
  const [institution, setInstitution] = useState('');
  const [period, setPeriod] = useState('');

  // Validação de campos e estados interativos
  const [touched, setTouched] = useState<{ [field: string]: boolean }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const switchAuthMode = (mode: 'LOGIN' | 'REGISTER' | 'FORGOT') => {
    setAuthMode(mode);
    setGeneralError(null);
    setTouched({});
    setPassword('');
    setConfirmPassword('');
    if (mode === 'FORGOT') {
      setRecoveryEmail(email);
      setRecoveryMessage(null);
      setRecoveryStep('REQUEST');
    }
  };

  // Validadores derivados em tempo real
  const emailValidation = validateEmail(email);
  const loginPasswordValidation = validatePassword(password, false);
  const registerPasswordStrength = validatePassword(password, true);
  const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
  const nameValidation = validateFullName(name);
  const raValidation = validateRA(ra);
  const courseValidation = validateCourse(course, false);
  const institutionValidation = validateInstitution(institution);
  const periodValidation = validatePeriod(period);

  // Estado específico de recuperação de senha
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [inputRecoveryCode, setInputRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);

  // Validadores de recuperação derivados
  const recoveryEmailValidation = validateEmail(recoveryEmail);
  const recoveryCodeValidation = validateRecoveryCode(inputRecoveryCode);
  const newPasswordStrength = validatePassword(newPassword, true);
  const newPasswordMatchValidation = validatePasswordMatch(newPassword, confirmNewPassword);

  // Obtém imagem personalizada do banner de login do coordenador e banners da página inicial
  const loginBannerImage = DB.getLoginBannerImage();
  const banners = DB.getBanners();
  const activeBanners = banners.filter(b => b.isActive);
  
  // Utiliza a imagem de banner de login configurada, o banner ativo ou o padrão
  const effectiveImageUrl = loginBannerImage || activeBanners[0]?.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200';

  const currentBanner = {
    id: activeBanners[0]?.id || 'default',
    imageUrl: effectiveImageUrl,
    title: activeBanners[0]?.title || 'EVENTOS ACADÊMICOS CAMPO REAL',
    subtitle: activeBanners[0]?.subtitle || 'Conecte-se com conhecimento prático, semanas acadêmicas integradas, palestras e workshops.',
    linkToEventId: activeBanners[0]?.linkToEventId
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    try {
      if (authMode === 'REGISTER') {
        // Marca todos os campos de cadastro como tocados
        setTouched({
          name: true,
          email: true,
          password: true,
          confirmPassword: true,
          institution: true,
          course: true,
          period: true,
          ra: true
        });

        const nameVal = validateFullName(name);
        if (!nameVal.isValid) throw new Error(nameVal.error || 'Nome inválido.');

        const emailVal = validateEmail(email);
        if (!emailVal.isValid) throw new Error(emailVal.error || 'E-mail inválido.');

        const pwdVal = validatePassword(password, true);
        if (!pwdVal.isValid) throw new Error(pwdVal.error || 'Senha fraca ou inválida.');

        const matchVal = validatePasswordMatch(password, confirmPassword);
        if (!matchVal.isValid) throw new Error(matchVal.error || 'As senhas não coincidem.');

        const instVal = validateInstitution(institution);
        if (!instVal.isValid) throw new Error(instVal.error || 'Instituição inválida.');

        const courseVal = validateCourse(course, false);
        if (!courseVal.isValid) throw new Error(courseVal.error || 'Curso inválido.');

        const periodVal = validatePeriod(period);
        if (!periodVal.isValid) throw new Error(periodVal.error || 'Período inválido.');

        const raVal = validateRA(ra);
        if (!raVal.isValid) throw new Error(raVal.error || 'RA inválido.');

        // Verifica se o usuário já existe localmente
        const allUsers = DB.getUsers();
        if (allUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
          throw new Error('Este endereço de e-mail já está cadastrado no sistema.');
        }

        const createdUser = DB.registerUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'PARTICIPANTE',
          ra: ra.trim() ? ra.trim() : undefined,
          course: course.trim() ? course.trim() : undefined,
          institution: institution.trim() || 'Centro Universitário Campo Real',
          period: period.trim() ? period.trim() : undefined,
          password
        });

        DB.setCurrentUser(createdUser);
        DB.addLog('USER_REGISTER', email, 'PARTICIPANTE', `Novo cadastro efetuado via Portal: ${name}`);
        onLoginSuccess(createdUser);
      } else {
        // Marca os campos de login como tocados
        setTouched({
          email: true,
          password: true
        });

        const emailVal = validateEmail(email);
        if (!emailVal.isValid) throw new Error(emailVal.error || 'Informe um e-mail válido.');

        const pwdVal = validatePassword(password, false);
        if (!pwdVal.isValid) throw new Error(pwdVal.error || 'Informe sua senha de acesso.');

        const loginRes = await DB.login(email.trim(), password);
        if (!loginRes.success || !loginRes.user) {
          throw new Error(loginRes.error || 'E-mail ou senha incorretos.');
        }

        onLoginSuccess(loginRes.user);
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Erro ao processar autenticação.');
    }
  };

  const handleSendRecoveryEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, recoveryEmail: true }));

    const val = validateEmail(recoveryEmail);
    if (!val.isValid) {
      setRecoveryMessage({ type: 'error', text: val.error || 'Informe um e-mail válido.' });
      return;
    }

    setRecoveryLoading(true);
    setRecoveryMessage(null);

    try {
      await DB.sendPasswordRecovery(recoveryEmail.trim());
      setInputRecoveryCode(''); // O campo não é preenchido automaticamente e deve ser inserido pelo usuário
      setNewPassword('');
      setConfirmNewPassword('');
      setRecoveryStep('RESET');
      setRecoveryMessage({
        type: 'success',
        text: 'E-mail de recuperação enviado com sucesso. Verifique sua caixa de entrada.'
      });
    } catch (err: any) {
      setRecoveryMessage({
        type: 'error',
        text: err.message || 'Falha ao enviar e-mail de recuperação.'
      });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(prev => ({ ...prev, recoveryCode: true, newPassword: true, confirmNewPassword: true }));

    const codeVal = validateRecoveryCode(inputRecoveryCode);
    if (!codeVal.isValid) {
      setRecoveryMessage({ type: 'error', text: codeVal.error || 'Código de verificação inválido.' });
      return;
    }

    const pwdVal = validatePassword(newPassword, true);
    if (!pwdVal.isValid) {
      setRecoveryMessage({ type: 'error', text: pwdVal.error || 'A nova senha não atende aos requisitos.' });
      return;
    }

    const matchVal = validatePasswordMatch(newPassword, confirmNewPassword);
    if (!matchVal.isValid) {
      setRecoveryMessage({ type: 'error', text: matchVal.error || 'A confirmação de senha não confere.' });
      return;
    }

    setRecoveryLoading(true);
    setRecoveryMessage(null);
    try {
      const updatedUser = await DB.resetPasswordWithCode(recoveryEmail.trim(), inputRecoveryCode.trim(), newPassword);
      setEmail(recoveryEmail);
      setPassword(newPassword);
      switchAuthMode('LOGIN');
      setRecoveryStep('REQUEST');
      setInputRecoveryCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setRecoveryMessage(null);
      setGeneralError(null);
      alert(`Senha redefinida com sucesso para ${updatedUser.email}! Você já pode entrar com suas novas credenciais.`);
    } catch (err: any) {
      setRecoveryMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between font-sans antialiased text-gray-800 select-none">
      
      {/* Divisão de coluna em grade 50/50 */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 lg:h-screen lg:min-h-0">
        
        {/* Lado esquerdo: Imagem do banner do coordenador e detalhes do título */}
        <div className="relative min-h-[420px] lg:min-h-0 bg-slate-900 text-white flex flex-col justify-between p-8 md:p-16 overflow-hidden lg:h-full">
          
          {/* Imagem de fundo obtida diretamente do esquema do banco de dados com configuração de referenciador */}
          <img 
            src={currentBanner.imageUrl} 
            alt={currentBanner.title} 
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none transition-all duration-300"
          />
          
          {/* Sobreposição escura de alto contraste para acessibilidade */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/25 z-0"></div>
          
          {/* Logo de marca do cabeçalho dentro do contêiner do banner */}
          <div className="relative z-10">
            <Logo variant="full" className="w-40 h-10 object-contain" />
          </div>
          
          {/* Conteúdo do banner gerenciado */}
          <div className="relative z-10 mt-auto flex flex-col gap-4">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
              {currentBanner.title}
            </h1>
            <p className="text-gray-200 text-xs md:text-sm leading-relaxed max-w-lg font-medium">
              {currentBanner.subtitle}
            </p>
          </div>
          
          {/* Pequeno aviso de identidade visual */}
          <div className="relative z-10 select-none text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-8">
            Campo Real Eventos
          </div>
        </div>

        {/* Lado direito: Campos de credenciais de acesso e cadastros */}
        <div className="p-6 md:p-12 lg:p-16 flex flex-col justify-center bg-white border-l border-gray-150 min-h-full lg:h-full lg:overflow-y-auto">
          
          <div className="w-full max-w-md mx-auto">
            
            {/* VISÃO 1 & 2: LOGIN & CADASTRO */}
            {authMode !== 'FORGOT' ? (
              <>
                {/* Detalhes dos títulos do cabeçalho */}
                <div className="mb-6">
                  <span className="text-[9px] text-blue-600 font-extrabold tracking-widest uppercase font-mono">PORTAL DE EVENTOS</span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-gray-850 mt-1">
                    {authMode === 'REGISTER' ? 'Criar Nova Conta' : 'Acesse Sua Conta'}
                  </h2>
                </div>

                {/* Banner de erro geral */}
                {generalError && (
                  <div className="mb-4 p-3.5 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in-50 duration-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">
                      <span className="font-bold block text-rose-900">Atenção no preenchimento</span>
                      <span>{generalError}</span>
                    </div>
                  </div>
                )}

                {/* Formulário principal de credenciais */}
                <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
                  
                  {authMode === 'REGISTER' && (
                    <>
                      {/* Campo de Nome */}
                      <div className="flex flex-col gap-1">
                        <label className={THEME.input.label}>Nome Completo</label>
                        <input
                          type="text"
                          className={`${THEME.input.text} ${touched.name && !nameValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                          placeholder="Ex: Carlos de Souza Santos"
                          value={name}
                          onBlur={() => markTouched('name')}
                          onChange={e => {
                            setName(e.target.value);
                            setGeneralError(null);
                          }}
                          required
                        />
                        {touched.name && !nameValidation.isValid && (
                          <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {nameValidation.error}
                          </span>
                        )}
                      </div>

                      {/* Instituição (opcional) */}
                      <div className="flex flex-col gap-1">
                        <label className={THEME.input.label}>
                          Instituição <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            className={`${THEME.input.text} pr-9 ${touched.institution && !institutionValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                            placeholder="Ex: Centro Universitário Campo Real..."
                            value={institution}
                            onBlur={() => markTouched('institution')}
                            onChange={e => {
                              setInstitution(e.target.value);
                              setGeneralError(null);
                            }}
                          />
                          <Building className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {touched.institution && !institutionValidation.isValid && (
                          <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {institutionValidation.error}
                          </span>
                        )}
                      </div>

                      {/* Curso e Período (opcionais) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className={THEME.input.label}>
                            Curso <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              className={`${THEME.input.text} pr-9 ${touched.course && !courseValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                              placeholder="Ex: Engenharia de Software..."
                              value={course}
                              onBlur={() => markTouched('course')}
                              onChange={e => {
                                setCourse(e.target.value);
                                setGeneralError(null);
                              }}
                            />
                            <GraduationCap className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                          {touched.course && !courseValidation.isValid && (
                            <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {courseValidation.error}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className={THEME.input.label}>
                            Período / Ano <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              className={`${THEME.input.text} pr-9 ${touched.period && !periodValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                              placeholder="Ex: 5º Período"
                              value={period}
                              onBlur={() => markTouched('period')}
                              onChange={e => {
                                setPeriod(e.target.value);
                                setGeneralError(null);
                              }}
                            />
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                          {touched.period && !periodValidation.isValid && (
                            <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              {periodValidation.error}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Registro Acadêmico (RA) (opcional) */}
                      <div className="flex flex-col gap-1">
                        <label className={THEME.input.label}>
                          Registro Acadêmico (RA) <span className="text-gray-400 font-normal lowercase">(opcional)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            className={`${THEME.input.text} pr-9 ${touched.ra && !raValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                            placeholder="Ex: 202611993"
                            value={ra}
                            onBlur={() => markTouched('ra')}
                            onChange={e => {
                              setRa(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15));
                              setGeneralError(null);
                            }}
                          />
                          <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {touched.ra && !raValidation.isValid && (
                          <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {raValidation.error}
                          </span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Campo de E-mail */}
                  <div className="flex flex-col gap-1">
                    <label className={THEME.input.label}>E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        className={`${THEME.input.text} pl-10 font-mono ${touched.email && !emailValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                        placeholder="Ex: seuemail@camporeal.edu.br"
                        value={email}
                        onBlur={() => markTouched('email')}
                        onChange={e => {
                          setEmail(e.target.value);
                          setGeneralError(null);
                        }}
                        required
                      />
                    </div>
                    {touched.email && !emailValidation.isValid && (
                      <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {emailValidation.error}
                      </span>
                    )}
                  </div>

                  {/* Campo de Senha */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className={THEME.input.label}>Senha</label>
                      {authMode === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => switchAuthMode('FORGOT')}
                          className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline cursor-pointer transition-colors"
                        >
                          Esqueci a senha
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={`${THEME.input.text} pl-10 pr-10 font-mono ${
                          (authMode === 'LOGIN' && touched.password && !loginPasswordValidation.isValid) ||
                          (authMode === 'REGISTER' && touched.password && !registerPasswordStrength.isValid)
                            ? '!border-rose-400 !ring-1 !ring-rose-200'
                            : ''
                        }`}
                        placeholder="••••••••"
                        value={password}
                        onBlur={() => markTouched('password')}
                        onChange={e => {
                          setPassword(e.target.value);
                          setGeneralError(null);
                        }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Medidor de força da senha e diretrizes (Apenas cadastro) */}
                    {authMode === 'REGISTER' && password.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-150 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-gray-500 font-semibold">Força da Senha:</span>
                          <span className={`font-bold uppercase tracking-wider ${
                            registerPasswordStrength.level === 'forte' ? 'text-emerald-600' :
                            registerPasswordStrength.level === 'media' ? 'text-amber-600' :
                            'text-rose-600'
                          }`}>
                            {registerPasswordStrength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full my-0.5">
                          <div className={`rounded-full transition-all duration-300 ${
                            registerPasswordStrength.score >= 1
                              ? (registerPasswordStrength.level === 'forte' ? 'bg-emerald-500' : registerPasswordStrength.level === 'media' ? 'bg-amber-500' : 'bg-rose-500')
                              : 'bg-gray-200'
                          }`} />
                          <div className={`rounded-full transition-all duration-300 ${
                            registerPasswordStrength.score >= 2
                              ? (registerPasswordStrength.level === 'forte' ? 'bg-emerald-500' : 'bg-amber-500')
                              : 'bg-gray-200'
                          }`} />
                          <div className={`rounded-full transition-all duration-300 ${
                            registerPasswordStrength.score >= 3 ? 'bg-emerald-500' : 'bg-gray-200'
                          }`} />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] font-mono text-gray-500">
                          <span className={`flex items-center gap-1 ${registerPasswordStrength.hasMinLength ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                            <Check className="w-2.5 h-2.5" /> Mínimo 6 dígitos
                          </span>
                          <span className={`flex items-center gap-1 ${(registerPasswordStrength.hasNumber && registerPasswordStrength.hasLetter) ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                            <Check className="w-2.5 h-2.5" /> Letras e números
                          </span>
                          <span className={`flex items-center gap-1 ${registerPasswordStrength.hasSpecial ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
                            <Check className="w-2.5 h-2.5" /> Caractere especial
                          </span>
                        </div>
                      </div>
                    )}

                    {authMode === 'LOGIN' && touched.password && !loginPasswordValidation.isValid && (
                      <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {loginPasswordValidation.error}
                      </span>
                    )}
                  </div>

                  {/* Campo de Confirmar Senha (Apenas cadastro) */}
                  {authMode === 'REGISTER' && (
                    <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-100">
                      <label className={THEME.input.label}>Confirmar Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`${THEME.input.text} pl-10 pr-10 font-mono ${
                            confirmPassword && !passwordMatchValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''
                          }`}
                          placeholder="Repita sua senha"
                          value={confirmPassword}
                          onBlur={() => markTouched('confirmPassword')}
                          onChange={e => {
                            setConfirmPassword(e.target.value);
                            setGeneralError(null);
                          }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && (
                        passwordMatchValidation.isValid ? (
                          <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            As senhas conferem
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {passwordMatchValidation.error}
                          </span>
                        )
                      )}
                    </div>
                  )}

                  {/* Botão de ação de envio */}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 mt-2 shadow-xs group font-mono"
                  >
                    <span>{authMode === 'REGISTER' ? 'Efetuar Cadastro' : 'Entrar no Sistema'}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Transições alternativas de login */}
                  <div className="flex flex-col gap-3 text-center mt-4">
                    {authMode === 'REGISTER' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('LOGIN');
                          setPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-xs text-blue-600 font-extrabold hover:underline cursor-pointer uppercase tracking-wider font-mono"
                      >
                        Já tem conta? Clique para Entrar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('REGISTER');
                          setPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-xs text-blue-600 font-extrabold hover:underline cursor-pointer uppercase tracking-wider font-mono"
                      >
                        Cadastre-se
                      </button>
                    )}

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-gray-150"></div>
                      <span className="flex-shrink mx-3 text-gray-400 text-[10px] uppercase font-bold tracking-wider">ou</span>
                      <div className="flex-grow border-t border-gray-150"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={onContinueAsGuest}
                      className="text-gray-600 hover:text-blue-650 transition-colors cursor-pointer flex items-center justify-center gap-2 font-bold text-xs select-none border border-gray-250/70 hover:border-blue-300 py-3 rounded-xl bg-gray-50/50 hover:bg-gray-50"
                    >
                      <Compass className="w-4 h-4 text-blue-600 animate-spin-slow" />
                      <span>Entrar como visitante</span>
                    </button>
                  </div>

                </form>
              </>
            ) : (
              /* VISÃO 3: ESQUECI A SENHA / RECUPERAÇÃO VIA SMTP */
              <div className="animate-in fade-in-50 duration-200">
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('LOGIN');
                      setRecoveryMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 font-semibold mb-3 cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>
                  <span className="text-[9px] text-blue-600 font-extrabold tracking-widest uppercase font-mono block">
                    RECUPERAÇÃO DE CONTA
                  </span>
                  <h2 className="text-2xl font-black uppercase tracking-tight text-gray-850 mt-1">
                    Redefinir Senha
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Informe seu e-mail cadastrado para receber o código de recuperação.
                  </p>
                </div>

                {/* Mensagens de feedback */}
                {recoveryMessage && (
                  <div
                    className={`p-3.5 rounded-xl border mb-4 text-xs ${
                      recoveryMessage.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {recoveryMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-bold">{recoveryMessage.text}</p>
                        {recoveryMessage.details && (
                          <p className="mt-1 text-[11px] opacity-90">{recoveryMessage.details}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {recoveryStep === 'REQUEST' ? (
                  <form onSubmit={handleSendRecoveryEmail} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                      <label className={THEME.input.label}>E-mail Cadastrado</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          className={`${THEME.input.text} pl-10 font-mono ${touched.recoveryEmail && !recoveryEmailValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''}`}
                          placeholder="seuemail@camporeal.edu.br"
                          value={recoveryEmail}
                          onBlur={() => markTouched('recoveryEmail')}
                          onChange={e => {
                            setRecoveryEmail(e.target.value);
                            setRecoveryMessage(null);
                          }}
                          required
                          autoFocus
                        />
                      </div>
                      {touched.recoveryEmail && !recoveryEmailValidation.isValid && (
                        <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {recoveryEmailValidation.error}
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[11px] font-bold uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 font-mono shadow-xs"
                    >
                      {recoveryLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando e-mail...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar e-mail de recuperação</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1">
                      <label className={THEME.input.label}>Código de Verificação (6 dígitos)</label>
                      <input
                        type="text"
                        maxLength={6}
                        className={`${THEME.input.text} font-mono tracking-widest text-center text-base font-bold text-blue-700 bg-blue-50/30 border-blue-200 ${
                          touched.recoveryCode && !recoveryCodeValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''
                        }`}
                        placeholder="000000"
                        value={inputRecoveryCode}
                        onBlur={() => markTouched('recoveryCode')}
                        onChange={e => {
                          setInputRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setRecoveryMessage(null);
                        }}
                        required
                      />
                      <span className="text-[10px] text-gray-400 text-center">
                        Código enviado para {recoveryEmail}
                      </span>
                      {touched.recoveryCode && !recoveryCodeValidation.isValid && (
                        <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center justify-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {recoveryCodeValidation.error}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={THEME.input.label}>Nova Senha</label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className={`${THEME.input.text} pl-10 pr-10 font-mono ${
                            touched.newPassword && !newPasswordStrength.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''
                          }`}
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onBlur={() => markTouched('newPassword')}
                          onChange={e => {
                            setNewPassword(e.target.value);
                            setRecoveryMessage(null);
                          }}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Força da senha para a nova senha */}
                      {newPassword.length > 0 && (
                        <div className="flex flex-col gap-1 mt-1 p-2 rounded-xl bg-gray-50 border border-gray-150">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-500 font-semibold">Força:</span>
                            <span className={`font-bold uppercase tracking-wider ${
                              newPasswordStrength.level === 'forte' ? 'text-emerald-600' :
                              newPasswordStrength.level === 'media' ? 'text-amber-600' :
                              'text-rose-600'
                            }`}>
                              {newPasswordStrength.label}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 h-1.5 w-full">
                            <div className={`rounded-full transition-all duration-300 ${
                              newPasswordStrength.score >= 1
                                ? (newPasswordStrength.level === 'forte' ? 'bg-emerald-500' : newPasswordStrength.level === 'media' ? 'bg-amber-500' : 'bg-rose-500')
                                : 'bg-gray-200'
                            }`} />
                            <div className={`rounded-full transition-all duration-300 ${
                              newPasswordStrength.score >= 2
                                ? (newPasswordStrength.level === 'forte' ? 'bg-emerald-500' : 'bg-amber-500')
                                : 'bg-gray-200'
                            }`} />
                            <div className={`rounded-full transition-all duration-300 ${
                              newPasswordStrength.score >= 3 ? 'bg-emerald-500' : 'bg-gray-200'
                            }`} />
                          </div>
                        </div>
                      )}

                      {touched.newPassword && !newPasswordStrength.isValid && (
                        <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {newPasswordStrength.error}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className={THEME.input.label}>Confirmar Nova Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className={`${THEME.input.text} pl-10 pr-10 font-mono ${
                            confirmNewPassword && !newPasswordMatchValidation.isValid ? '!border-rose-400 !ring-1 !ring-rose-200' : ''
                          }`}
                          placeholder="Repita a nova senha"
                          value={confirmNewPassword}
                          onBlur={() => markTouched('confirmNewPassword')}
                          onChange={e => {
                            setConfirmNewPassword(e.target.value);
                            setRecoveryMessage(null);
                          }}
                          required
                        />
                      </div>
                      {confirmNewPassword.length > 0 && (
                        newPasswordMatchValidation.isValid ? (
                          <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            As senhas conferem
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {newPasswordMatchValidation.error}
                          </span>
                        )
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-[11px] font-bold uppercase tracking-wider py-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 font-mono mt-1 shadow-xs"
                    >
                      {recoveryLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Validando Código...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Salvar Nova Senha</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecoveryStep('REQUEST')}
                      className="text-[11px] text-gray-500 hover:text-blue-600 font-semibold text-center mt-2 cursor-pointer"
                    >
                      Reenviar e-mail de recuperação
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Rodapé institucional estilizado abaixo de ambas as metades */}
      <Footer onNavigate={onNavigate} className="!mt-0" />
    </div>
  );
}

