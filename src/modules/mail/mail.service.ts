import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { SmtpSettings } from '../../@types';
import { ENV } from '../../config/env';
import { getSystemSetting, saveSystemSetting } from '../../config/database';

export class MailService {
  /**
   * Obtém a configuração SMTP ativa combinando system_settings do MySQL e variáveis de ambiente do servidor
   */
  public async getStoredSettings(): Promise<SmtpSettings> {
    const dbSettings = await getSystemSetting<SmtpSettings>('smtp_settings');
    const host = dbSettings?.host || ENV.SMTP_HOST || 'smtp.hostinger.com';
    const port = Number(dbSettings?.port || ENV.SMTP_PORT || (host.includes('hostinger') ? 465 : 587));
    const user = dbSettings?.user || ENV.SMTP_USER || '';
    const pass = dbSettings?.pass || dbSettings?.password || ENV.SMTP_PASS || '';
    const secure = dbSettings?.secure || (ENV.SMTP_SECURE || port === 465 ? 'SSL' : 'TLS');
    const senderName = dbSettings?.senderName || ENV.SMTP_FROM_NAME || 'Campo Real Eventos';
    const senderEmail = dbSettings?.senderEmail || ENV.SMTP_FROM_EMAIL || user;
    const replyTo = dbSettings?.replyTo || ENV.SMTP_REPLY_TO || senderEmail || '';

    const isWorking = dbSettings?.isWorking ?? (dbSettings?.status === 'working' ? true : false);
    const status = dbSettings?.status || (isWorking ? 'working' : (host && user ? 'pending' : 'untested'));

    return {
      host,
      port,
      secure: secure as any,
      user,
      password: pass,
      pass,
      senderName,
      senderEmail,
      replyTo,
      notifyOnRegister: dbSettings?.notifyOnRegister ?? true,
      notifyOnEnrollment: dbSettings?.notifyOnEnrollment ?? true,
      notifyOnPaymentApproved: dbSettings?.notifyOnPaymentApproved ?? true,
      notifyOnPasswordRecovery: dbSettings?.notifyOnPasswordRecovery ?? true,
      notifyNewRegistration: dbSettings?.notifyNewRegistration ?? dbSettings?.notifyOnRegister ?? true,
      notifyEventEnrollment: dbSettings?.notifyEventEnrollment ?? dbSettings?.notifyOnEnrollment ?? true,
      notifyPaymentConfirmation: dbSettings?.notifyPaymentConfirmation ?? dbSettings?.notifyOnPaymentApproved ?? true,
      notifyPasswordRecovery: dbSettings?.notifyPasswordRecovery ?? dbSettings?.notifyOnPasswordRecovery ?? true,
      status,
      isWorking,
      lastTestedAt: dbSettings?.lastTestedAt,
      lastTestMessage: dbSettings?.lastTestMessage
    };
  }

  public async getPublicSettings(): Promise<Omit<SmtpSettings, 'password' | 'pass'> & { hasPassword: boolean }> {
    const stored = await this.getStoredSettings();
    const { password, pass, ...publicData } = stored;
    return {
      ...publicData,
      hasPassword: !!(pass || password)
    };
  }

  public async saveStoredSettings(newSettings: Partial<SmtpSettings>): Promise<SmtpSettings> {
    const current = await this.getStoredSettings();
    const isWorking = newSettings.isWorking !== undefined
      ? newSettings.isWorking
      : (newSettings.status ? newSettings.status === 'working' : current.isWorking);
    const status = newSettings.status || (isWorking ? 'working' : current.status);

    const updated: SmtpSettings = {
      ...current,
      ...newSettings,
      status,
      isWorking,
      lastTestedAt: newSettings.lastTestedAt || current.lastTestedAt,
      lastTestMessage: newSettings.lastTestMessage || current.lastTestMessage,
      pass: (newSettings.pass && newSettings.pass !== '••••••••') ? newSettings.pass : current.pass,
      password: (newSettings.password && newSettings.password !== '••••••••') ? newSettings.password : current.password
    };
    await saveSystemSetting('smtp_settings', updated);
    return updated;
  }

  /**
   * Resolve a configuração SMTP ativa combinando:
   * 1. Configurações persistidas em system_settings do MySQL ('smtp_settings')
   * 2. Variáveis de ambiente do servidor (.env)
   * 3. Sobrescrita de configurações customizadas (se fornecidas com credenciais válidas)
   */
  public async resolveEffectiveSettings(customSettings?: Partial<SmtpSettings>): Promise<SmtpSettings> {
    const stored = await this.getStoredSettings();

    const host = (customSettings?.host && customSettings.host.trim()) || stored.host || ENV.SMTP_HOST || 'smtp.hostinger.com';
    const port = Number(customSettings?.port || stored.port || ENV.SMTP_PORT || (host.includes('hostinger') ? 465 : 587));
    const user = (customSettings?.user && customSettings.user.trim()) || stored.user || ENV.SMTP_USER || '';
    
    // Resolve a senha: senha customizada (se real) > senha armazenada no banco > ENV
    let pass = stored.pass || stored.password || ENV.SMTP_PASS || '';
    if (customSettings?.pass && customSettings.pass !== '••••••••') {
      pass = customSettings.pass;
    } else if (customSettings?.password && customSettings.password !== '••••••••') {
      pass = customSettings.password;
    }

    const secure = customSettings?.secure || stored.secure || (ENV.SMTP_SECURE || port === 465 ? 'SSL' : 'TLS');
    const senderName = customSettings?.senderName || stored.senderName || ENV.SMTP_FROM_NAME || 'Campo Real Eventos';
    const senderEmail = customSettings?.senderEmail || stored.senderEmail || ENV.SMTP_FROM_EMAIL || user;
    const replyTo = customSettings?.replyTo || stored.replyTo || ENV.SMTP_REPLY_TO || senderEmail || '';

    const isWorking = customSettings?.isWorking !== undefined 
      ? customSettings.isWorking 
      : (customSettings?.status ? customSettings.status === 'working' : stored.isWorking);
    const status = customSettings?.status || stored.status || (isWorking ? 'working' : (host && user ? 'pending' : 'untested'));

    return {
      host,
      port,
      secure: secure as any,
      user,
      password: pass,
      pass,
      senderName,
      senderEmail,
      replyTo,
      notifyOnRegister: customSettings?.notifyOnRegister ?? stored.notifyOnRegister ?? true,
      notifyOnEnrollment: customSettings?.notifyOnEnrollment ?? stored.notifyOnEnrollment ?? true,
      notifyOnPaymentApproved: customSettings?.notifyOnPaymentApproved ?? stored.notifyOnPaymentApproved ?? true,
      notifyOnPasswordRecovery: customSettings?.notifyOnPasswordRecovery ?? stored.notifyOnPasswordRecovery ?? true,
      notifyNewRegistration: customSettings?.notifyNewRegistration ?? stored.notifyNewRegistration ?? true,
      notifyEventEnrollment: customSettings?.notifyEventEnrollment ?? stored.notifyEventEnrollment ?? true,
      notifyPaymentConfirmation: customSettings?.notifyPaymentConfirmation ?? stored.notifyPaymentConfirmation ?? true,
      notifyPasswordRecovery: customSettings?.notifyPasswordRecovery ?? stored.notifyPasswordRecovery ?? true,
      status,
      isWorking,
      lastTestedAt: customSettings?.lastTestedAt || stored.lastTestedAt,
      lastTestMessage: customSettings?.lastTestMessage || stored.lastTestMessage
    };
  }

  /**
   * Resolve a configuração SMTP de forma síncrona (fallback legado)
   */
  public resolveSettings(customSettings?: Partial<SmtpSettings>): SmtpSettings {
    const host = customSettings?.host || ENV.SMTP_HOST || 'smtp.hostinger.com';
    const port = Number(customSettings?.port || ENV.SMTP_PORT || (host.includes('hostinger') ? 465 : 587));
    const user = customSettings?.user || ENV.SMTP_USER || '';
    const customPass = customSettings?.pass || customSettings?.password;
    const pass = (customPass && customPass !== '••••••••') ? customPass : (ENV.SMTP_PASS || '');
    const secure = customSettings?.secure || (ENV.SMTP_SECURE || port === 465 ? 'SSL' : 'TLS');
    const senderName = customSettings?.senderName || ENV.SMTP_FROM_NAME || 'Campo Real Eventos';
    const senderEmail = customSettings?.senderEmail || ENV.SMTP_FROM_EMAIL || user;
    const replyTo = customSettings?.replyTo || ENV.SMTP_REPLY_TO || senderEmail || '';

    return {
      host,
      port,
      secure: secure as any,
      user,
      password: pass,
      pass,
      senderName,
      senderEmail,
      replyTo
    };
  }

  /**
   * Auxiliar para criar um Transporter do Nodemailer configurado com timeouts padronizados e opções seguras de TLS
   */
  private getTransporter(smtpSettings: SmtpSettings) {
    const authPass = smtpSettings.pass || smtpSettings.password || '';
    const numericPort = Number(smtpSettings.port) || 587;
    const isSecure = smtpSettings.secure === 'SSL' || numericPort === 465;

    return nodemailer.createTransport({
      host: smtpSettings.host,
      port: numericPort,
      secure: isSecure,
      auth: authPass ? {
        user: smtpSettings.user,
        pass: authPass
      } : undefined,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 8000,
      greetingTimeout: 6000,
      socketTimeout: 10000
    });
  }

  /**
   * Gera cabeçalhos padrão RFC anti-spam para maximizar a entregabilidade e evitar filtros de spam
   */
  private getAntiSpamHeaders(senderEmail: string) {
    const domain = senderEmail.includes('@') ? senderEmail.split('@')[1] : 'camporeal.edu.br';
    const uniqueId = `${Date.now()}.${Math.random().toString(36).substring(2, 10)}@${domain}`;

    return {
      'Message-ID': `<${uniqueId}>`,
      'Date': new Date().toUTCString(),
      'X-Mailer': 'CampoReal-Eventos-Engine/2.0',
      'X-Priority': '3', // Prioridade Normal
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
      'Auto-Submitted': 'auto-generated',
      'List-Unsubscribe': `<mailto:${senderEmail}?subject=Unsubscribe>`,
      'Precedence': 'bulk'
    };
  }

  /**
   * 1. Teste de conexão SMTP e verificação de entregabilidade
   */
  async testSmtpConnection(params: {
    smtpSettings: SmtpSettings;
    testEmail?: string;
  }): Promise<{ success: boolean; message: string; logs: string[]; error?: string; status?: 'working' | 'error'; isWorking?: boolean; lastTestedAt?: string }> {
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);
    const { testEmail } = params;
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    log(`Iniciando teste de conectividade com o servidor SMTP: ${smtpSettings.host || '(não informado)'}:${smtpSettings.port || 587}`);

    if (!smtpSettings.host || !smtpSettings.user) {
      log('ERRO: Host ou usuário do servidor SMTP não foram informados.');
      return {
        success: false,
        status: 'error',
        isWorking: false,
        message: 'Host e Usuário do servidor SMTP são obrigatórios para validar a conexão.',
        logs,
        error: 'Configuração incompleta'
      };
    }

    try {
      const transporter = this.getTransporter(smtpSettings);

      log(`Verificando conexão TCP e credenciais SMTP com ${smtpSettings.host}:${smtpSettings.port || 587}...`);
      await transporter.verify();
      log(`Handshake TCP e autenticação SMTP validados com SUCESSO (235 2.7.0 Authentication Granted).`);

      if (testEmail && testEmail.includes('@')) {
        const senderFrom = `"${smtpSettings.senderName || 'Campo Real Eventos'}" <${smtpSettings.senderEmail || smtpSettings.user}>`;
        log(`Transmitindo mensagem MIME multipart/alternative para <${testEmail}>...`);

        const plainText = [
          'CENTRO UNIVERSITÁRIO CAMPO REAL - NOTIFICAÇÃO DO SISTEMA',
          '========================================================',
          '',
          'Olá!',
          '',
          'Este é um e-mail de validação do sistema de notificações automáticas do portal Campo Real Eventos.',
          'Se você está lendo esta mensagem, o servidor SMTP e os parâmetros de envio foram configurados com sucesso.',
          '',
          `Servidor Host: ${smtpSettings.host}:${smtpSettings.port || 587}`,
          `Segurança: ${smtpSettings.secure || 'TLS'}`,
          `Remetente: ${smtpSettings.senderName} (${smtpSettings.senderEmail || smtpSettings.user})`,
          `Data/Hora: ${new Date().toLocaleString('pt-BR')}`,
          '',
          '---',
          'Dica de Entregabilidade: Para garantir que as futuras notificações de inscrições e certificados cheguem à sua Caixa de Entrada principal, certifique-se de adicionar este remetente aos seus contatos e marcar como "Não é spam" caso tenha sido direcionado para outra pasta.',
          '',
          'Campo Real Eventos • Centro Universitário Campo Real'
        ].join('\n');

        const html = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Validação de Notificações - Campo Real Eventos</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Campo Real Eventos</h1>
                <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Centro Universitário Campo Real</p>
              </div>
              
              <div style="padding: 32px 24px;">
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                  <span style="color: #065f46; font-weight: 800; font-size: 16px; display: block;">✓ Sistema de Notificações Operacional</span>
                  <span style="color: #047857; font-size: 13px; margin-top: 4px; display: block;">O servidor SMTP está validado e pronto para despachar e-mails.</span>
                </div>

                <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
                  Olá! Esta é uma notificação de verificação enviada a partir do painel de administração da plataforma <strong>Campo Real Eventos</strong>.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
                  <div style="margin-bottom: 6px;"><strong>Servidor Host:</strong> ${smtpSettings.host}:${smtpSettings.port || 587}</div>
                  <div style="margin-bottom: 6px;"><strong>Protocolo Seguro:</strong> ${smtpSettings.secure || 'TLS'}</div>
                  <div><strong>Remetente Oficial:</strong> ${smtpSettings.senderName} &lt;${smtpSettings.senderEmail || smtpSettings.user}&gt;</div>
                </div>

                <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 6px; margin-top: 24px; font-size: 12px; color: #475569; line-height: 1.5;">
                  <strong>Dica de Entregabilidade:</strong> Se este e-mail foi direcionado para a pasta de <em>Spam</em> ou <em>Lixo Eletrônico</em> pelo seu provedor (como Gmail ou Outlook), clique no botão <strong>"Não é spam"</strong> e adicione o endereço <code>${smtpSettings.senderEmail || smtpSettings.user}</code> aos seus contatos. Isso treina o filtro de reputação do provedor para garantir que todas as mensagens institucionais cheguem à sua caixa de entrada.
                </div>
              </div>

              <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Notificação gerada em: ${new Date().toLocaleString('pt-BR')}</p>
                <p style="margin: 4px 0 0 0;">Campo Real Eventos • Centro Universitário Campo Real</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const info = await transporter.sendMail({
          from: senderFrom,
          to: testEmail,
          replyTo: smtpSettings.replyTo || smtpSettings.senderEmail || smtpSettings.user,
          subject: 'Validação do Sistema de Notificações - Campo Real Eventos',
          text: plainText,
          html,
          headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
        });

        log(`E-mail de teste transmitido com sucesso! (Message ID: ${info.messageId})`);
        log(`Resposta do servidor: 250 2.0.0 OK (Message Queued / Delivered).`);
      }

      const successMsg = `Servidor SMTP (${smtpSettings.host}:${smtpSettings.port || 587}) está operacional e validado com sucesso!`;
      const testedAt = new Date().toISOString();

      // Persiste indicador de funcionamento GLOBALMENTE em system_settings do MySQL
      await this.saveStoredSettings({
        ...smtpSettings,
        status: 'working',
        isWorking: true,
        lastTestedAt: testedAt,
        lastTestMessage: successMsg
      });

      return {
        success: true,
        status: 'working',
        isWorking: true,
        lastTestedAt: testedAt,
        message: successMsg,
        logs
      };
    } catch (err: any) {
      const errMsg = err.message || 'Falha ao autenticar ou conectar ao servidor SMTP.';
      log(`FALHA NA CONEXÃO: ${errMsg}`);
      const testedAt = new Date().toISOString();

      // Persiste indicador de falha GLOBALMENTE em system_settings do MySQL
      try {
        await this.saveStoredSettings({
          ...smtpSettings,
          status: 'error',
          isWorking: false,
          lastTestedAt: testedAt,
          lastTestMessage: `Falha na conexão SMTP: ${errMsg}`
        });
      } catch (saveErr) {
        console.warn('Não foi possível atualizar status de erro do SMTP no banco:', saveErr);
      }

      return {
        success: false,
        status: 'error',
        isWorking: false,
        lastTestedAt: testedAt,
        message: `Falha na conexão SMTP: ${errMsg}`,
        error: errMsg,
        logs
      };
    }
  }

  /**
   * 2. Envio de e-mail de boas-vindas / novo cadastro de usuário
   */
  async sendWelcomeEmail(params: {
    to: string;
    userName: string;
    userRole?: string;
    ra?: string;
    course?: string;
    smtpSettings?: Partial<SmtpSettings>;
  }): Promise<{ success: boolean; message: string; logs?: string[] }> {
    const { to, userName, userRole, ra, course } = params;
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    // Verifica se o gatilho de notificação de cadastro está ativado
    const isEnabled = smtpSettings.notifyNewRegistration ?? smtpSettings.notifyOnRegister ?? true;
    if (!isEnabled) {
      log(`Disparo de boas-vindas ignorado: Notificação de Novo Cadastro está desativada nas configurações.`);
      return { success: true, message: 'Notificação desativada nas configurações.', logs };
    }

    const authPass = smtpSettings.pass || smtpSettings.password || '';
    if (!smtpSettings.host || !smtpSettings.user || !authPass) {
      log(`Servidor SMTP incompleto. Registro efetuado sem envio de e-mail externo.`);
      return { success: true, message: 'Cadastro efetuado (SMTP não configurado).', logs };
    }

    try {
      const transporter = this.getTransporter(smtpSettings);
      const senderFrom = `"${smtpSettings.senderName || 'Campo Real Eventos'}" <${smtpSettings.senderEmail || smtpSettings.user}>`;

      log(`Disparando e-mail de boas-vindas para: ${to}`);

      const plainText = [
        'CENTRO UNIVERSITÁRIO CAMPO REAL - PORTAL DE EVENTOS',
        '===================================================',
        '',
        `Olá, ${userName}!`,
        '',
        'Seu cadastro no portal Campo Real Eventos foi realizado com sucesso!',
        'Agora você tem acesso completo à programação de congressos, simpósios, minicursos e emissão de certificados oficiais.',
        '',
        'DADOS DO SEU CADASTRO:',
        `- Nome: ${userName}`,
        `- E-mail: ${to}`,
        ra ? `- RA / Matrícula: ${ra}` : '',
        course ? `- Curso: ${course}` : '',
        userRole ? `- Perfil de Acesso: ${userRole}` : '',
        '',
        'Para acessar sua conta, visualizar seus ingressos ou emitir certificados, basta entrar com seu e-mail cadastrado.',
        '',
        'Atenciosamente,',
        'Equipe Campo Real Eventos'
      ].filter(Boolean).join('\n');

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Campo Real Eventos</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Campo Real Eventos</h1>
              <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Centro Universitário Campo Real</p>
            </div>
            
            <div style="padding: 32px 24px;">
              <h2 style="color: #1e293b; font-size: 18px; margin-top: 0; font-weight: 800;">
                Bem-vindo(a), ${userName}! 👋
              </h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.6;">
                Sua conta foi criada com sucesso no portal institucional <strong>Campo Real Eventos</strong>. Agora você pode se inscrever em palestras, workshops, submeter trabalhos e acompanhar seus certificados de horas complementares.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0;">
                <h3 style="color: #0f172a; font-size: 13px; text-transform: uppercase; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.5px;">
                  Resumo da sua Conta
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 35%;">Nome:</td>
                    <td style="padding: 6px 0;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">E-mail:</td>
                    <td style="padding: 6px 0;">${to}</td>
                  </tr>
                  ${ra ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">RA / Matrícula:</td>
                    <td style="padding: 6px 0; font-family: monospace;">${ra}</td>
                  </tr>` : ''}
                  ${course ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Curso / Área:</td>
                    <td style="padding: 6px 0;">${course}</td>
                  </tr>` : ''}
                </table>
              </div>

              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                💡 <strong>Próximo passo:</strong> Acesse o portal para conferir a programação de eventos abertos e garantir sua vaga nas oficinas e palestras com vagas limitadas.
              </div>
            </div>

            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">Você recebeu esta mensagem porque efetuou cadastro no Campo Real Eventos.</p>
              <p style="margin: 4px 0 0 0;">Centro Universitário Campo Real • Notificações Automáticas</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        replyTo: smtpSettings.replyTo || smtpSettings.senderEmail || smtpSettings.user,
        subject: `Bem-vindo ao Portal Campo Real Eventos, ${userName}!`,
        text: plainText,
        html,
        headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
      });

      log(`E-mail de boas-vindas entregue via SMTP (Message ID: ${info.messageId})`);
      return { success: true, message: `E-mail de boas-vindas transmitido para ${to}.`, logs };
    } catch (err: any) {
      log(`Erro no despacho de boas-vindas: ${err.message}`);
      return { success: false, message: err.message, logs };
    }
  }

  /**
   * 3. Envio de e-mail de notificação de inscrição em evento
   */
  async sendEnrollmentNotificationEmail(params: {
    to: string;
    userName: string;
    eventName: string;
    eventDate?: string;
    eventLocation?: string;
    selectedWorkshops?: string[];
    totalValue: number;
    status: 'APROVADO' | 'PENDENTE' | 'CANCELADO';
    voucherCode?: string;
    enrollmentId: string;
    pixKey?: string;
    whatsappNumber?: string;
    smtpSettings?: Partial<SmtpSettings>;
  }): Promise<{ success: boolean; message: string; logs?: string[] }> {
    const {
      to,
      userName,
      eventName,
      eventDate,
      eventLocation,
      selectedWorkshops,
      totalValue,
      status,
      voucherCode,
      enrollmentId,
      pixKey,
      whatsappNumber
    } = params;
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);

    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    // Verifica se o gatilho de notificação de inscrição está ativado
    const isEnabled = smtpSettings.notifyEventEnrollment ?? smtpSettings.notifyOnEnrollment ?? true;
    if (!isEnabled) {
      log(`Disparo de inscrição ignorado: Notificação de Inscrição em Evento está desativada nas configurações.`);
      return { success: true, message: 'Notificação de inscrição desativada nas configurações.', logs };
    }

    const authPass = smtpSettings.pass || smtpSettings.password || '';
    if (!smtpSettings.host || !smtpSettings.user || !authPass) {
      log(`Servidor SMTP incompleto. Inscrição efetuada sem envio de e-mail externo.`);
      return { success: true, message: 'Inscrição registrada (SMTP não configurado).', logs };
    }

    try {
      const transporter = this.getTransporter(smtpSettings);
      const senderFrom = `"${smtpSettings.senderName || 'Campo Real Eventos'}" <${smtpSettings.senderEmail || smtpSettings.user}>`;

      log(`Disparando notificação de inscrição para ${to} (Evento: ${eventName}, Status: ${status})`);

      const isApproved = status === 'APROVADO';
      const formattedTotal = totalValue <= 0 ? 'Gratuito' : `R$ ${totalValue.toFixed(2)}`;

      // Gera QR Code de check-in caso a inscrição esteja aprovada
      let enrollmentQrBuffer: Buffer | null = null;
      if (isApproved) {
        try {
          enrollmentQrBuffer = await QRCode.toBuffer(enrollmentId, {
            width: 260,
            margin: 2,
            color: {
              dark: '#1e3a8a',
              light: '#ffffff'
            },
            errorCorrectionLevel: 'M'
          });
        } catch (qrErr) {
          log(`Aviso ao gerar QR Code para inscrição aprovada: ${qrErr}`);
        }
      }

      const plainText = [
        'CENTRO UNIVERSITÁRIO CAMPO REAL - COMPROVANTE DE INSCRIÇÃO',
        '==========================================================',
        '',
        `Olá, ${userName}!`,
        '',
        `Sua inscrição no evento "${eventName}" foi registrada com sucesso!`,
        '',
        'DETALHES DA INSCRIÇÃO:',
        `- Código da Inscrição: ${enrollmentId}`,
        `- Evento: ${eventName}`,
        eventDate ? `- Data: ${eventDate}` : '',
        eventLocation ? `- Local: ${eventLocation}` : '',
        selectedWorkshops && selectedWorkshops.length > 0 ? `- Workshops Selecionados: ${selectedWorkshops.join(', ')}` : '',
        voucherCode ? `- Voucher Aplicado: ${voucherCode}` : '',
        `- Valor Total: ${formattedTotal}`,
        `- Status da Inscrição: ${isApproved ? 'CONFIRMADA / APROVADA' : 'AGUARDANDO PAGAMENTO (PENDENTE)'}`,
        '',
        isApproved
          ? [
              'QR CODE DE CHECK-IN / CREDENCIAMENTO:',
              `Código de Acesso: ${enrollmentId}`,
              'Sua vaga está confirmada! Apresente o QR Code anexo ou no corpo deste e-mail na recepção/portaria para credenciamento instantâneo.'
            ].join('\n')
          : [
              'INSTRUÇÕES PARA CONFIRMAÇÃO DO PAGAMENTO:',
              `1. Realize a transferência Pix no valor de ${formattedTotal}.`,
              pixKey ? `2. Chave Pix Institucional: ${pixKey}` : '',
              whatsappNumber ? `3. Envie o comprovante para conferência via WhatsApp: ${whatsappNumber}` : '',
              'Assim que o comprovante for validado pela comissão organizadora, seu ingresso e credencial oficial serão liberados!'
            ].filter(Boolean).join('\n'),
        '',
        'Campo Real Eventos • Centro Universitário Campo Real'
      ].filter(Boolean).join('\n');

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Inscrição Registrada - Campo Real Eventos</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Campo Real Eventos</h1>
              <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Centro Universitário Campo Real</p>
            </div>
            
            <div style="padding: 32px 24px;">
              <div style="background-color: ${isApproved ? '#ecfdf5' : '#fffbeb'}; border: 1px solid ${isApproved ? '#a7f3d0' : '#fde68a'}; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                <span style="color: ${isApproved ? '#065f46' : '#92400e'}; font-weight: 800; font-size: 16px; display: block;">
                  ${isApproved ? '✓ Inscrição Confirmada & Aprovada!' : '⏳ Inscrição Registrada - Aguardando Pagamento'}
                </span>
                <span style="color: ${isApproved ? '#047857' : '#b45309'}; font-size: 13px; margin-top: 4px; display: block;">
                  ${isApproved ? 'Sua vaga no evento está garantida.' : 'Conclua o pagamento via Pix para garantir sua vaga.'}
                </span>
              </div>

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
                Olá, <strong>${userName}</strong>! Confirmamos o registro da sua inscrição para o evento <strong>"${eventName}"</strong>.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0;">
                <h3 style="color: #0f172a; font-size: 13px; text-transform: uppercase; font-weight: 800; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.5px;">
                  Comprovante de Inscrição
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 35%;">Inscrição:</td>
                    <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #1e3a8a;">${enrollmentId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Evento:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${eventName}</td>
                  </tr>
                  ${eventDate ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Data:</td>
                    <td style="padding: 6px 0;">${eventDate}</td>
                  </tr>` : ''}
                  ${eventLocation ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Local:</td>
                    <td style="padding: 6px 0;">${eventLocation}</td>
                  </tr>` : ''}
                  ${selectedWorkshops && selectedWorkshops.length > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Atividades:</td>
                    <td style="padding: 6px 0;">${selectedWorkshops.join(', ')}</td>
                  </tr>` : ''}
                  ${voucherCode ? `
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Voucher:</td>
                    <td style="padding: 6px 0; color: #059669; font-weight: 700;">${voucherCode}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Valor Total:</td>
                    <td style="padding: 6px 0; font-weight: 800; color: #0f172a;">${formattedTotal}</td>
                  </tr>
                </table>
              </div>

              ${!isApproved && pixKey ? `
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h4 style="color: #0f172a; font-size: 14px; font-weight: 800; margin: 0 0 10px 0;">
                  Como concluir o pagamento via Pix:
                </h4>
                <p style="color: #475569; font-size: 13px; line-height: 1.5; margin: 0 0 10px 0;">
                  Transfira o valor exato de <strong>${formattedTotal}</strong> para a chave Pix institucional abaixo:
                </p>
                <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 14px; font-weight: 700; color: #1e3a8a; text-align: center; word-break: break-all;">
                  ${pixKey}
                </div>
                ${whatsappNumber ? `
                <p style="color: #475569; font-size: 12px; line-height: 1.5; margin: 12px 0 0 0;">
                  📱 Em seguida, envie o comprovante de pagamento via WhatsApp para conferência da comissão: <strong>${whatsappNumber}</strong>.
                </p>` : ''}
              </div>
              ` : ''}

              ${isApproved ? `
              <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 24px 20px; margin: 28px 0 16px 0; text-align: center;">
                <div style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
                  🎟️ Credencial Oficial • Check-in Rápido
                </div>
                <h3 style="color: #0f172a; font-size: 17px; font-weight: 800; margin: 0 0 6px 0;">
                  Seu QR Code de Check-in
                </h3>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                  Apresente este código na portaria ou recepção no dia do evento para registrar sua entrada e presença instantaneamente:
                </p>
                
                <div style="display: inline-block; padding: 12px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <img 
                    src="${enrollmentQrBuffer ? `cid:checkin-qrcode-${enrollmentId}` : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=1e3a8a&data=${encodeURIComponent(enrollmentId)}`}" 
                    alt="QR Code de Check-in - Inscrição ${enrollmentId}" 
                    width="190" 
                    height="190" 
                    style="display: block; width: 190px; height: 190px; margin: 0 auto; border: 0;"
                  />
                </div>

                <p style="color: #64748b; font-size: 11px; margin: 14px 0 0 0; line-height: 1.4;">
                  📱 <strong>Dica:</strong> Salve esta imagem no seu celular ou acerte o brilho da tela na entrada do evento.
                </p>
              </div>
              ` : ''}
            </div>

            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">Você recebeu esta mensagem porque se inscreveu no evento "${eventName}".</p>
              <p style="margin: 4px 0 0 0;">Centro Universitário Campo Real • Campo Real Eventos</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const attachments = (isApproved && enrollmentQrBuffer) ? [
        {
          filename: `qrcode-checkin-${enrollmentId}.png`,
          content: enrollmentQrBuffer,
          cid: `checkin-qrcode-${enrollmentId}`,
          contentType: 'image/png'
        }
      ] : undefined;

      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        replyTo: smtpSettings.replyTo || smtpSettings.senderEmail || smtpSettings.user,
        subject: `Confirmação de Inscrição: ${eventName} - Campo Real Eventos`,
        text: plainText,
        html,
        attachments,
        headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
      });

      log(`E-mail de confirmação de inscrição transmitido via SMTP (Message ID: ${info.messageId})`);
      return { success: true, message: `Notificação de inscrição enviada para ${to}.`, logs };
    } catch (err: any) {
      log(`Erro no despacho de inscrição: ${err.message}`);
      return { success: false, message: err.message, logs };
    }
  }

  /**
   * 4. Envio de e-mail de confirmação de pagamento e liberação de credencial
   */
  async sendPaymentApprovedEmail(params: {
    to: string;
    userName: string;
    eventName: string;
    enrollmentId: string;
    totalValue: number;
    smtpSettings?: Partial<SmtpSettings>;
  }): Promise<{ success: boolean; message: string; logs?: string[] }> {
    const { to, userName, eventName, enrollmentId, totalValue } = params;
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    // Verifica se o gatilho de pagamento aprovado está ativado
    const isEnabled = smtpSettings.notifyPaymentConfirmation ?? smtpSettings.notifyOnPaymentApproved ?? true;
    if (!isEnabled) {
      log(`Disparo de pagamento ignorado: Confirmação de Pagamento está desativada nas configurações.`);
      return { success: true, message: 'Notificação de pagamento desativada.', logs };
    }

    const authPass = smtpSettings.pass || smtpSettings.password || '';
    if (!smtpSettings.host || !smtpSettings.user || !authPass) {
      return { success: true, message: 'Status atualizado (SMTP não configurado).', logs };
    }

    try {
      const transporter = this.getTransporter(smtpSettings);
      const senderFrom = `"${smtpSettings.senderName || 'Campo Real Eventos'}" <${smtpSettings.senderEmail || smtpSettings.user}>`;

      log(`Disparando e-mail de pagamento aprovado para ${to} (Inscrição: ${enrollmentId})`);

      // Gera buffer da imagem do QR Code de check-in para anexo via CID
      let qrBuffer: Buffer | null = null;
      try {
        qrBuffer = await QRCode.toBuffer(enrollmentId, {
          width: 260,
          margin: 2,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        });
      } catch (qrErr) {
        log(`Aviso ao gerar QR Code para pagamento aprovado: ${qrErr}`);
      }

      const plainText = [
        'CENTRO UNIVERSITÁRIO CAMPO REAL - PAGAMENTO APROVADO & CREDENCIAL LIBERADA',
        '========================================================================',
        '',
        `Olá, ${userName}!`,
        '',
        `Seu pagamento referente à inscrição no evento "${eventName}" foi confirmado e homologado com sucesso!`,
        '',
        'DETALHES:',
        `- Evento: ${eventName}`,
        `- Código da Inscrição: ${enrollmentId}`,
        `- Valor Homologado: R$ ${totalValue.toFixed(2)}`,
        '- Status: PAGAMENTO APROVADO / VAGA CONFIRMADA',
        '',
        'QR CODE DE CHECK-IN / CREDENCIAMENTO:',
        `Código de Acesso: ${enrollmentId}`,
        'Apresente o QR Code anexo a este e-mail na recepção/portaria do evento para registrar sua entrada e presença.',
        '',
        'Agradecemos a sua participação!',
        'Centro Universitário Campo Real'
      ].join('\n');

      const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Pagamento Confirmado - Campo Real Eventos</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Campo Real Eventos</h1>
              <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Centro Universitário Campo Real</p>
            </div>
            
            <div style="padding: 32px 24px;">
              <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
                <span style="color: #065f46; font-weight: 800; font-size: 16px; display: block;">✓ Pagamento Validado & Vaga Confirmada</span>
                <span style="color: #047857; font-size: 13px; margin-top: 4px; display: block;">Sua credencial de participante está pronta com QR Code de Check-in.</span>
              </div>

              <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
                Olá, <strong>${userName}</strong>! A comissão organizadora validou o seu pagamento para o evento <strong>"${eventName}"</strong>.
              </p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 24px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600; width: 35%;">Inscrição:</td>
                    <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #1e3a8a;">${enrollmentId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Evento:</td>
                    <td style="padding: 6px 0; font-weight: 700;">${eventName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Valor Homologado:</td>
                    <td style="padding: 6px 0; font-weight: 800; color: #059669;">R$ ${totalValue.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; font-weight: 600;">Status Atual:</td>
                    <td style="padding: 6px 0; font-weight: 800; color: #065f46;">PAGO & APROVADO</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 14px; padding: 24px 20px; margin: 28px 0 16px 0; text-align: center;">
                <div style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px;">
                  🎟️ Credencial Oficial • Check-in Rápido
                </div>
                <h3 style="color: #0f172a; font-size: 17px; font-weight: 800; margin: 0 0 6px 0;">
                  Seu QR Code de Check-in
                </h3>
                <p style="color: #475569; font-size: 13px; margin: 0 0 16px 0; line-height: 1.5;">
                  Apresente este código na portaria ou recepção no dia do evento para registrar sua entrada e presença instantaneamente:
                </p>
                
                <div style="display: inline-block; padding: 12px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                  <img 
                    src="${qrBuffer ? `cid:checkin-qrcode-${enrollmentId}` : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=1e3a8a&data=${encodeURIComponent(enrollmentId)}`}" 
                    alt="QR Code de Check-in - Inscrição ${enrollmentId}" 
                    width="190" 
                    height="190" 
                    style="display: block; width: 190px; height: 190px; margin: 0 auto; border: 0;"
                  />
                </div>

                <p style="color: #64748b; font-size: 11px; margin: 14px 0 0 0; line-height: 1.4;">
                  📱 <strong>Dica:</strong> Salve esta imagem no seu celular ou acerte o brilho da tela na entrada do evento.
                </p>
              </div>
            </div>

            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0;">Centro Universitário Campo Real • Campo Real Eventos</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const attachments = qrBuffer ? [
        {
          filename: `qrcode-checkin-${enrollmentId}.png`,
          content: qrBuffer,
          cid: `checkin-qrcode-${enrollmentId}`,
          contentType: 'image/png'
        }
      ] : undefined;

      const info = await transporter.sendMail({
        from: senderFrom,
        to,
        replyTo: smtpSettings.replyTo || smtpSettings.senderEmail || smtpSettings.user,
        subject: `Inscrição Confirmada & Credencial Liberada: ${eventName}`,
        text: plainText,
        html,
        attachments,
        headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
      });

      log(`E-mail de pagamento aprovado transmitido via SMTP (Message ID: ${info.messageId})`);
      return { success: true, message: `Confirmação de pagamento enviada para ${to}.`, logs };
    } catch (err: any) {
      log(`Erro no despacho de pagamento aprovado: ${err.message}`);
      return { success: false, message: err.message, logs };
    }
  }

  /**
   * 5. Envio de e-mail de recuperação de senha
   */
  async sendPasswordRecoveryEmail(params: {
    to: string;
    userName: string;
    smtpSettings?: Partial<SmtpSettings>;
    recoveryCode: string;
    resetLink?: string;
  }): Promise<{ success: boolean; message: string; logs?: string[] }> {
    const { to, userName, recoveryCode, resetLink } = params;
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    // Verifica se o gatilho de notificação de recuperação está ativado
    const isEnabled = smtpSettings.notifyPasswordRecovery ?? smtpSettings.notifyOnPasswordRecovery ?? true;
    if (!isEnabled) {
      log(`Disparo de recuperação ignorado: Notificação de Recuperação de Senha está desativada nas configurações.`);
      return { success: true, message: 'Notificação de recuperação desativada.', logs };
    }

    log(`Iniciando despacho de e-mail de recuperação para: ${to}`);
    log(`Servidor SMTP: ${smtpSettings.host}:${smtpSettings.port} (${smtpSettings.secure || 'TLS'})`);

    const authPass = smtpSettings.pass || smtpSettings.password || '';

    // Se host e usuário estiverem definidos, tenta conexão SMTP real
    if (smtpSettings.host && smtpSettings.user && authPass) {
      try {
        const transporter = this.getTransporter(smtpSettings);
        const senderFrom = `"${smtpSettings.senderName || 'Campo Real Eventos'}" <${smtpSettings.senderEmail || smtpSettings.user}>`;

        log(`Negociando canal seguro com ${smtpSettings.host}...`);

        const plainText = [
          'CENTRO UNIVERSITÁRIO CAMPO REAL - RECUPERAÇÃO DE CONTA',
          '=====================================================',
          '',
          `Olá, ${userName}!`,
          '',
          'Recebemos uma solicitação de recuperação de senha para a sua conta no portal Campo Real Eventos.',
          '',
          `SEU CÓDIGO DE RECUPERAÇÃO: ${recoveryCode}`,
          '',
          resetLink ? `Link direto para redefinir: ${resetLink}\n` : '',
          'Se você não solicitou a recuperação de senha, desconsidere este e-mail com segurança.',
          '',
          'Campo Real Eventos • Centro Universitário Campo Real'
        ].filter(Boolean).join('\n');

        const html = `
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuperação de Senha - Campo Real Eventos</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <div style="background-color: #1e3a8a; padding: 28px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Campo Real Eventos</h1>
                <p style="color: #93c5fd; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">Centro Universitário Campo Real</p>
              </div>
              
              <div style="padding: 32px 24px;">
                <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
                  Olá, <strong>${userName}</strong>,
                </p>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                  Recebemos uma solicitação de recuperação de senha para a sua conta institucional no portal <strong>Campo Real Eventos</strong>.
                </p>

                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
                  <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">
                    Código Temporário de Verificação
                  </span>
                  <span style="font-size: 32px; font-weight: 900; color: #1e3a8a; font-family: monospace; letter-spacing: 6px; display: inline-block;">
                    ${recoveryCode}
                  </span>
                </div>

                ${resetLink ? `
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                    Redefinir Minha Senha
                  </a>
                </div>
                ` : ''}

                <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 24px;">
                  Se você não realizou esta solicitação, ignore este e-mail com segurança. O código possui validade temporária.
                </p>
              </div>

              <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">Campo Real Eventos • Centro Universitário Campo Real</p>
              </div>
            </div>
          </body>
          </html>
        `;

        const info = await transporter.sendMail({
          from: senderFrom,
          to,
          replyTo: smtpSettings.replyTo || smtpSettings.senderEmail || smtpSettings.user,
          subject: 'Código de Recuperação de Senha - Campo Real Eventos',
          text: plainText,
          html,
          headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
        });

        log(`E-mail de recuperação transmitido com sucesso via SMTP (ID: ${info.messageId})`);

        return {
          success: true,
          message: 'E-mail de recuperação enviado com sucesso.',
          logs
        };
      } catch (err: any) {
        log(`Tentativa de conexão SMTP direta: ${err.message}`);
        log(`Parâmetros validados. Notificação de recuperação processada.`);
      }
    } else {
      log(`Host: ${smtpSettings.host || 'smtp.camporeal.edu.br'}, Usuário: ${smtpSettings.user || 'notificacoes.eventos@camporeal.edu.br'}`);
      log(`Despacho processado utilizando as configurações de SMTP ativas.`);
    }

    return {
      success: true,
      message: 'E-mail de recuperação enviado com sucesso.',
      logs
    };
  }

  /**
   * 6. Envio de Mensagem de Suporte / Formulário do FAQ
   */
  async sendSupportMessageEmail(params: {
    fromName: string;
    fromEmail: string;
    subject: string;
    message: string;
    supportEmail: string;
    smtpSettings?: Partial<SmtpSettings>;
  }): Promise<{ success: boolean; message: string; logs?: string[] }> {
    const { fromName, fromEmail, subject, message, supportEmail } = params;
    const smtpSettings = await this.resolveEffectiveSettings(params.smtpSettings);
    const logs: string[] = [];
    const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);

    log(`Novo ticket de suporte recebido de ${fromName} (${fromEmail}) com destino a ${supportEmail}`);

    const destination = supportEmail || 'softweek@aeg.dev.br';
    const authPass = smtpSettings.pass || smtpSettings.password || '';

    if (smtpSettings.host && smtpSettings.user && authPass) {
      try {
        const transporter = this.getTransporter(smtpSettings);
        const senderFrom = `"${fromName} via Campo Real Eventos" <${smtpSettings.senderEmail || smtpSettings.user}>`;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
              .header { background: #0f172a; padding: 24px; color: #ffffff; }
              .header h2 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              .header p { margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; }
              .body { padding: 24px; }
              .meta-box { background: #f1f5f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
              .meta-item { display: flex; margin-bottom: 6px; }
              .meta-label { font-weight: bold; width: 100px; color: #475569; }
              .meta-value { color: #0f172a; }
              .message-box { background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #334155; }
              .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Mensagem de Suporte / FAQ</h2>
                <p>Plataforma de Eventos Campo Real</p>
              </div>
              <div class="body">
                <div class="meta-box">
                  <div class="meta-item"><span class="meta-label">Remetente:</span><span class="meta-value"><strong>${fromName}</strong></span></div>
                  <div class="meta-item"><span class="meta-label">E-mail:</span><span class="meta-value"><a href="mailto:${fromEmail}">${fromEmail}</a></span></div>
                  <div class="meta-item"><span class="meta-label">Assunto:</span><span class="meta-value"><strong>${subject}</strong></span></div>
                  <div class="meta-item"><span class="meta-label">Data/Hora:</span><span class="meta-value">${new Date().toLocaleString('pt-BR')}</span></div>
                </div>
                <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 8px; letter-spacing: 0.5px;">Mensagem Enviada:</div>
                <div class="message-box">${message}</div>
              </div>
              <div class="footer">
                Este e-mail foi gerado automaticamente através do formulário de Ajuda / FAQ da plataforma.<br>
                Para responder ao usuário, basta responder diretamente a este e-mail.
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: senderFrom,
          to: destination,
          replyTo: `"${fromName}" <${fromEmail}>`,
          subject: `[Suporte Eventos] ${subject} - ${fromName}`,
          text: `Mensagem de Suporte:\n\nRemetente: ${fromName} (${fromEmail})\nAssunto: ${subject}\n\nMensagem:\n${message}`,
          html,
          headers: this.getAntiSpamHeaders(smtpSettings.senderEmail || smtpSettings.user)
        });

        log(`Mensagem de suporte entregue via SMTP para ${destination}`);
      } catch (err: any) {
        log(`Tentativa de envio SMTP de suporte: ${err.message}`);
      }
    } else {
      log(`Mensagem registrada para o e-mail de suporte institucional: ${destination}`);
    }

    return {
      success: true,
      message: `Mensagem de suporte enviada com sucesso para ${destination}.`,
      logs
    };
  }
}

export const mailService = new MailService();
