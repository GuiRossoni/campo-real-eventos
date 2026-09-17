import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import {
  Mail,
  Shield,
  Eye,
  EyeOff,
  Key,
  UserIcon,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  GraduationCap,
  Hash,
  Lock,
  Building,
  Calendar,
} from 'lucide-react';
import { DB } from '../utils/db';
import Logo from './Logo';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateRecoveryCode,
} from '../utils/validators';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({ onClose, onLoginSuccess }: AuthModalProps) {
  const [formType, setFormType] = useState<'LOGIN' | 'REGISTER' | 'RECOVER'>('LOGIN');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Campos do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [ra, setRa] = useState('');
  const [course, setCourse] = useState('');
  const [institution, setInstitution] = useState('');
  const [period, setPeriod] = useState('');
  
  // Estados de recuperação
  const [recoverStep, setRecoverStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState<{ type: 'success' | 'error'; text: string; details?: string } | null>(null);
  const [inputRecoveryCode, setInputRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const newPasswordStrength = validatePassword(newPassword, true);
  const newPasswordMatch = validatePasswordMatch(newPassword, confirmNewPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formType === 'LOGIN') {
        const loginRes = await DB.login(email.trim(), password);
        if (!loginRes.success || !loginRes.user) {
          throw new Error(loginRes.error || 'E-mail ou senha incorretos.');
        }
        onLoginSuccess(loginRes.user);
        onClose();
      } else if (formType === 'REGISTER') {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Por favor, preencha todos os campos obrigatórios (Nome, E-mail e Senha).');
        }

        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem. Por favor, verifique a confirmação de senha.');
        }

        if (password.length < 6) {
          throw new Error('A senha deve conter no mínimo 6 caracteres.');
        }
        
        const createdUser = DB.registerUser({
          name: name.trim(),
          email: email.trim(),
          role: 'PARTICIPANTE',
          ra: ra.trim() ? ra.trim() : undefined,
          course: course.trim() ? course.trim() : undefined,
          institution: institution.trim() || 'Centro Universitário Campo Real',
          period: period.trim() ? period.trim() : undefined,
          password
        });

        DB.setCurrentUser(createdUser);
        onLoginSuccess(createdUser);
        onClose();
      } else if (formType === 'RECOVER') {
        if (recoverStep === 'REQUEST') {
          const val = validateEmail(email);
          if (!val.isValid) {
            setRecoverMessage({ type: 'error', text: val.error || 'Informe um e-mail válido.' });
            return;
          }

          setRecoverLoading(true);
          setRecoverMessage(null);

          try {
            await DB.sendPasswordRecovery(email.trim());
            setInputRecoveryCode('');
            setNewPassword('');
            setConfirmNewPassword('');
            setRecoverStep('RESET');
            setRecoverMessage({
              type: 'success',
              text: 'E-mail de recuperação enviado com sucesso. Insira o código de 6 dígitos recebido.'
            });
          } catch (err: any) {
            setRecoverMessage({
              type: 'error',
              text: err.message || 'Falha ao enviar e-mail de recuperação.'
            });
          } finally {
            setRecoverLoading(false);
          }
        } else {
          const codeVal = validateRecoveryCode(inputRecoveryCode);
          if (!codeVal.isValid) {
            setRecoverMessage({ type: 'error', text: codeVal.error || 'Código de verificação inválido (deve conter 6 dígitos).' });
            return;
          }

          const pwdVal = validatePassword(newPassword, true);
          if (!pwdVal.isValid) {
            setRecoverMessage({ type: 'error', text: pwdVal.error || 'A nova senha não atende aos requisitos.' });
            return;
          }

          const matchVal = validatePasswordMatch(newPassword, confirmNewPassword);
          if (!matchVal.isValid) {
            setRecoverMessage({ type: 'error', text: matchVal.error || 'As senhas não coincidem.' });
            return;
          }

          setRecoverLoading(true);
          setRecoverMessage(null);

          try {
            const updatedUser = await DB.resetPasswordWithCode(email.trim(), inputRecoveryCode.trim(), newPassword);
            setPassword(newPassword);
            setFormType('LOGIN');
            setRecoverStep('REQUEST');
            setInputRecoveryCode('');
            setNewPassword('');
            setConfirmNewPassword('');
            setRecoverMessage(null);
            alert(`Senha redefinida com sucesso para ${updatedUser.email}! Você já pode entrar com sua nova senha.`);
          } catch (err: any) {
            setRecoverMessage({
              type: 'error',
              text: err.message || 'Falha ao redefinir a senha com o código informado.'
            });
          } finally {
            setRecoverLoading(false);
          }
        }
      }
    } catch (err: any) {
      alert(err.message || 'Houve um erro.');
    }
  };

  const handleResendRecoveryCode = async () => {
    const val = validateEmail(email);
    if (!val.isValid) {
      setRecoverMessage({ type: 'error', text: val.error || 'Informe um e-mail válido para reenviar o código.' });
      return;
    }

    setRecoverLoading(true);
    setRecoverMessage(null);

    try {
      await DB.sendPasswordRecovery(email.trim());
      setRecoverMessage({
        type: 'success',
        text: 'Novo código de verificação enviado! Verifique seu e-mail.'
      });
    } catch (err: any) {
      setRecoverMessage({
        type: 'error',
        text: err.message || 'Falha ao reenviar código de recuperação.'
      });
    } finally {
      setRecoverLoading(false);
    }
  };

  const handleBack = () => {
    if (formType === 'RECOVER' && recoverStep === 'RESET') {
      setRecoverStep('REQUEST');
      setRecoverMessage(null);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white select-none">
      
      {/* Contêiner */}
      <div className="bg-white border border-gray-200/80 rounded-3xl p-8 md:p-10 w-full max-w-[420px] shadow-2xl relative flex flex-col items-center text-gray-800 my-auto">
        
        {/* Botão de voltar */}
        <button 
          onClick={handleBack}
          type="button"
          className="absolute top-6 left-6 border border-gray-200 hover:border-blue-600 text-xs font-bold text-gray-600 hover:text-blue-600 uppercase py-1.5 px-4 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar</span>
        </button>

        {/* Logo central correspondendo à identidade visual do Campo Real Eventos */}
        <div className="mt-8 flex flex-col items-center gap-1 cursor-pointer">
          <Logo variant="full" className="w-44 h-11 object-contain transition-all" />
        </div>

        {/* Textos dinâmicos de cabeçalho */}
        {formType === 'LOGIN' && (
          <div className="text-center mt-6 w-full mb-6">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">ACESSO</span>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mt-1 leading-none">Bem-vindo de volta!</h3>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">Entre na sua conta para continuar.</p>
          </div>
        )}

        {formType === 'REGISTER' && (
          <div className="text-center mt-6 w-full mb-4">
            <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest font-mono">CADASTRO</span>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mt-1 leading-none">Crie sua Conta</h3>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">Preencha seus dados para participar dos eventos.</p>
          </div>
        )}

        {formType === 'RECOVER' && (
          <div className="text-center mt-6 w-full mb-5">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest font-mono">SEGURANÇA</span>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight mt-1 leading-none">
              {recoverStep === 'REQUEST' ? 'Recuperar Senha' : 'Nova Senha'}
            </h3>
            <p className="text-gray-500 text-xs mt-2 leading-relaxed">
              {recoverStep === 'REQUEST'
                ? 'Enviaremos um código de verificação para o seu e-mail cadastrado.'
                : 'Insira o código de 6 dígitos recebido e sua nova senha.'}
            </p>
          </div>
        )}

        {/* Campos do corpo do formulário */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
          
          {/* Banner de feedback da mensagem de recuperação */}
          {formType === 'RECOVER' && recoverMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs w-full mb-1 ${
                recoverMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {recoverMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 text-left">
                  <p className="font-bold">{recoverMessage.text}</p>
                  {recoverMessage.details && (
                    <p className="mt-1 text-[11px] opacity-90">{recoverMessage.details}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {formType === 'RECOVER' ? (
            recoverStep === 'REQUEST' ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <input 
                      type="email" 
                      placeholder="seuemail@camporeal.edu.br"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        setRecoverMessage(null);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold"
                      required
                      autoFocus
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={recoverLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-wider transition-all mt-1 cursor-pointer flex items-center justify-center gap-2"
                >
                  {recoverLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando e-mail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar código de recuperação</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecoverStep('RESET');
                    setRecoverMessage(null);
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold text-center mt-1 cursor-pointer transition-colors"
                >
                  Já possui o código de 6 dígitos? Clique aqui
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Código de Verificação (6 dígitos) */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                    Código de Verificação (6 dígitos)
                  </label>
                  <input 
                    type="text" 
                    maxLength={6}
                    placeholder="000000"
                    value={inputRecoveryCode}
                    onChange={e => {
                      setInputRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setRecoverMessage(null);
                    }}
                    className="w-full bg-blue-50/30 border border-blue-200 rounded-xl p-3 text-base text-center font-bold tracking-widest text-blue-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-mono"
                    required
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 mt-1">
                    <span className="truncate max-w-[210px]">Enviado para: {email || 'seu e-mail'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoverStep('REQUEST');
                        setRecoverMessage(null);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input 
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        setRecoverMessage(null);
                      }}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-20 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold font-mono"
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Key className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Barra de força da senha */}
                  {newPassword.length > 0 && (
                    <div className="flex flex-col gap-1 mt-1.5 p-2 rounded-xl bg-gray-50 border border-gray-200">
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
                </div>

                {/* Confirmar Nova Senha */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input 
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      value={confirmNewPassword}
                      onChange={e => {
                        setConfirmNewPassword(e.target.value);
                        setRecoverMessage(null);
                      }}
                      className={`w-full bg-white border rounded-xl p-3 pr-20 text-xs text-gray-800 focus:outline-none focus:ring-1 font-semibold font-mono ${
                        confirmNewPassword && !newPasswordMatch.isValid
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-gray-200 focus:border-blue-600 focus:ring-blue-100'
                      }`}
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                      <button 
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  {confirmNewPassword.length > 0 && (
                    newPasswordMatch.isValid ? (
                      <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        As senhas conferem
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-rose-600 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        {newPasswordMatch.error || 'As senhas não coincidem'}
                      </span>
                    )
                  )}
                </div>

                {/* Botão de envio para Salvar Nova Senha */}
                <button 
                  type="submit"
                  disabled={recoverLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-wider transition-all mt-1 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {recoverLoading ? (
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
                  disabled={recoverLoading}
                  onClick={handleResendRecoveryCode}
                  className="text-[11px] text-gray-500 hover:text-blue-600 font-semibold text-center mt-0.5 cursor-pointer transition-colors"
                >
                  Reenviar código por e-mail
                </button>
              </div>
            )
          ) : (
            <>
              {/* Campo de Nome (Apenas cadastro) */}
              {formType === 'REGISTER' && (
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">Nome Completo</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ex: Guilherme de Oliveira"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold"
                      required
                    />
                    <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}

              {/* Campo de E-mail */}
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">E-mail</label>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="seuemail@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold"
                    required
                  />
                  <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Campos específicos de cadastro: Instituição, Curso, Período/Ano e RA (Opcionais) */}
              {formType === 'REGISTER' && (
                <div className="flex flex-col gap-3 animate-in slide-in-from-top-1.5 duration-100">
                  {/* Instituição */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                      Instituição <span className="text-gray-400 lowercase font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ex: Centro Universitário Campo Real"
                        value={institution}
                        onChange={e => setInstitution(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold"
                      />
                      <Building className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Curso e Período em Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Curso */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">
                        Curso <span className="text-gray-400 lowercase font-normal">(opcional)</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Ex: Eng. de Software"
                          value={course}
                          onChange={e => setCourse(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                        />
                        <GraduationCap className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Período / Ano */}
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold mb-1">
                        Período / Ano <span className="text-gray-400 lowercase font-normal">(opcional)</span>
                      </label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Ex: 5º Período"
                          value={period}
                          onChange={e => setPeriod(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100"
                        />
                        <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Registro Acadêmico (RA) */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                      Registro Acadêmico (RA) <span className="text-gray-400 lowercase font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Ex: 202611029"
                        value={ra}
                        onChange={e => setRa(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-10 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold"
                      />
                      <Hash className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Campo de Senha */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block">Senha</label>
                  {formType === 'LOGIN' && (
                    <button 
                      type="button"
                      onClick={() => {
                        setFormType('RECOVER');
                        setRecoverStep('REQUEST');
                        setRecoverMessage(null);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-extrabold tracking-tight cursor-pointer"
                    >
                      Esqueceu sua senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 pr-20 text-xs text-gray-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-100 font-semibold font-mono"
                    required
                  />
                  
                  {/* Contêiner de ícones */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <Key className="w-4 h-4 cursor-help text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Campo de Confirmar Senha (Apenas cadastro) */}
              {formType === 'REGISTER' && (
                <div className="relative animate-in slide-in-from-top-1.5 duration-100">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold block mb-1">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`w-full bg-white border rounded-xl p-3 pr-20 text-xs text-gray-800 focus:outline-none focus:ring-1 font-semibold font-mono ${
                        confirmPassword && confirmPassword !== password 
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100' 
                          : 'border-gray-200 focus:border-blue-600 focus:ring-blue-100'
                      }`}
                      required
                    />
                    
                    {/* Contêiner de ícones */}
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-gray-400">
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">As senhas não coincidem</p>
                  )}
                </div>
              )}

              {/* Botão de chamada para Login/Cadastro */}
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold uppercase text-xs tracking-widest py-3.5 rounded-xl transition-all shadow-md active:scale-98 mt-1 cursor-pointer hover:scale-101"
              >
                {formType === 'LOGIN' ? 'Entrar' : 'Cadastrar-se'}
              </button>
            </>
          )}

        </form>

        {/* Subtextos de alternância do formulário */}
        <div className="text-center mt-5 text-xs text-gray-500">
          {formType === 'LOGIN' ? (
            <p>
              Não tem uma conta?{' '}
              <button 
                type="button"
                onClick={() => {
                  setFormType('REGISTER');
                  setPassword('');
                  setConfirmPassword('');
                  setRecoverStep('REQUEST');
                  setRecoverMessage(null);
                }}
                className="text-blue-600 hover:text-blue-700 font-extrabold transition-colors cursor-pointer capitalize"
              >
                Cadastre-se
              </button>
            </p>
          ) : formType === 'REGISTER' ? (
            <p className="flex items-center gap-1 justify-center">
              <span>Já possui uma conta?</span>
              <button 
                type="button"
                onClick={() => {
                  setFormType('LOGIN');
                  setPassword('');
                  setConfirmPassword('');
                  setRecoverStep('REQUEST');
                  setRecoverMessage(null);
                }}
                className="text-blue-600 hover:text-blue-700 font-extrabold transition-colors cursor-pointer capitalize pl-0.5"
              >
                Entrar
              </button>
            </p>
          ) : (
            <p className="flex items-center gap-1 justify-center">
              <span>Lembrou da senha?</span>
              <button 
                type="button"
                onClick={() => {
                  setFormType('LOGIN');
                  setPassword('');
                  setConfirmPassword('');
                  setRecoverStep('REQUEST');
                  setRecoverMessage(null);
                }}
                className="text-blue-600 hover:text-blue-700 font-extrabold transition-colors cursor-pointer capitalize pl-0.5"
              >
                Voltar ao Login
              </button>
            </p>
          )}
        </div>

      </div>

    </div>
  );
}
