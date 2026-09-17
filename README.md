# Campo Real Eventos — Portal Institucional de Gestão e Inscrições

Sistema completo para gestão de eventos acadêmicos, semanas temáticas integradas, minicursos, palestras, credenciamento QR Code, controle de presença e emissão de certificados com assinatura digital para o Centro Universitário Campo Real.

**Desenvolveroes:**
Anne Gabrielly Latchuk - engs-anneantunes@camporeal.edu.br
Guilherme Rossoni - engs-guilhermerossoni@camporeal.edu.br
**Coordenador da disciplina:**
Gabriel Christopher Dall Pozzo - prof_gabrielpozzo@camporeal.edu.br

---

## 1. Requisitos de Sistema

- **Node.js**: Versão 20.x LTS ou 22.x LTS (mínimo Node.js 18+)
- **NPM**: Versão 9+ ou 10+
- **Banco de Dados**: MySQL 8.0+ ou MariaDB 10.5+ (possui fallback local JSON para desenvolvimento offline)
- **Memória RAM**: Mínimo 512 MB (Recomendado 1 GB+ para compilação Vite/esbuild)
- **Armazenamento**: Mínimo 500 MB livres para dependências, build e uploads

---

## 2. Instalação e Execução Local

### Passo 1: Clonar o repositório e acessar a pasta
```bash
git clone <URL_DO_REPOSITORIO>
cd campo-real-eventos
```

### Passo 2: Instalar as dependências
```bash
npm install
```

### Passo 3: Configurar variáveis de ambiente
Copie o arquivo de exemplo e ajuste os parâmetros conforme seu ambiente:
```bash
cp .env.example .env
```

### Passo 4: Iniciar em modo de desenvolvimento
```bash
npm run dev
```
A aplicação estará disponível em `http://localhost:3000`.

---

## 3. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env` (ou no painel da Hostinger):

| Variável | Descrição | Exemplo em Produção |
| :--- | :--- | :--- |
| `NODE_ENV` | Modo de execução do Express | `production` |
| `PORT` | Porta HTTP da aplicação (gerenciada na Hostinger) | `3000` |
| `JWT_SECRET` | Chave secreta criptográfica para assinatura de tokens | `chave_forte_aleatoria_com_32_chars` |
| `JWT_EXPIRES_IN` | Tempo de expiração dos tokens JWT | `7d` |
| `CORS_ORIGIN` | Domínios autorizados para requisições cross-origin | `https://eventos.camporeal.edu.br` |
| `DB_HOST` | Host do servidor MySQL | `localhost` |
| `DB_PORT` | Porta de conexão do MySQL | `3306` |
| `DB_USER` | Usuário do banco de dados | `u123456789_camporeal` |
| `DB_PASSWORD` | Senha do usuário do banco | `SenhaForteMySQL123!` |
| `DB_NAME` | Nome do banco de dados | `u123456789_eventos` |
| `SMTP_HOST` | Servidor SMTP institucional | `smtp.camporeal.edu.br` |
| `SMTP_PORT` | Porta do servidor SMTP | `587` |
| `SMTP_SECURE` | Usar SSL/TLS direto (`true` para 465, `false` para 587) | `false` |
| `SMTP_USER` | Usuário/E-mail de autenticação SMTP | `notificacoes.eventos@camporeal.edu.br` |
| `SMTP_PASS` | Senha da conta de e-mail institucional | `SenhaEmailForte2026!` |
| `SMTP_FROM_NAME` | Nome de exibição do remetente | `Campo Real Eventos` |
| `SMTP_FROM_EMAIL` | Endereço do remetente | `notificacoes.eventos@camporeal.edu.br` |
| `SMTP_REPLY_TO` | E-mail de resposta de suporte | `suporte.eventos@camporeal.edu.br` |
| `MAX_UPLOAD_SIZE_MB` | Tamanho máximo permitido para upload de imagens | `10` |

---

## 4. Configuração do Banco de Dados

O sistema cria e migra automaticamente todas as tabelas na inicialização se o MySQL estiver configurado.

### Criação do Banco no hPanel (Hostinger)
1. Acesse o **hPanel** da Hostinger.
2. Navegue até **Bancos de Dados** → **Bancos de Dados MySQL**.
3. Crie um novo banco (ex.: `u123456789_eventos`), defina o usuário e anote a senha gerada.
4. Preencha as credenciais correspondentes no `.env`.

### Tabelas Gerenciadas
- `users`: Contas de usuários com senhas criptografadas em bcrypt e papéis (`ROOT`, `COORDENADOR`, `ORGANIZADOR`, `PARTICIPANTE`).
- `events`: Dados dos eventos, categorias, banners e lotes.
- `workshops`: Oficinas e minicursos vinculados com controle de vagas.
- `enrollments`: Inscrições e status de pagamento.
- `attendance`: Registros de check-in via QR Code com data/hora e operador.
- `certificates`: Certificados emitidos com hash de autenticidade único.
- `financial_expenses`: Lançamentos de receitas e despesas por evento.
- `vouchers`: Cupons de desconto com regras e auditoria de utilização.
- `home_banners`: Banners em destaque na página inicial.
- `system_logs`: Auditoria de ações administrativas no sistema.

---

## 5. Scripts Disponíveis

- `npm run dev`: Inicia o servidor híbrido Express + Vite HMR para desenvolvimento.
- `npm run build`: Compila os assets do frontend com Vite e empacota o backend Node.js em `dist/server.cjs` com esbuild.
- `npm start`: Inicia o servidor Express em modo de produção (`node dist/server.cjs`).
- `npm test`: Executa a suíte completa de testes automatizados com Vitest.
- `npm run lint`: Executa verificação estática de tipos TypeScript (`tsc --noEmit`).
- `npm run clean`: Limpa as pastas de compilação de forma compatível com Windows e Linux.

---

## 6. Build de Produção

Para gerar uma compilação de produção:
```bash
npm run build
```
Esse comando gera:
- `dist/index.html` e `dist/assets/*` (Frontend React otimizado com chunks estáticos).
- `dist/server.cjs` (Servidor backend Express empacotado em CommonJS para máxima compatibilidade).

---

## 7. Execução em Produção

Após compilar o projeto:
```bash
NODE_ENV=production npm start
```
Ou diretamente:
```bash
node dist/server.cjs
```

---

## 8. Guia de Deploy na Hostinger

### Opção Recomendada: Hospedagem Node.js Gerenciada (Cloud / Business)

1. **Acessar o Painel Node.js:**
   - No hPanel da Hostinger, vá até a seção **Avançado** ou pesquise por **Node.js**.
2. **Criar Nova Aplicação Node.js:**
   - **Versão do Node.js:** Selecione **Node.js 20.x LTS** ou **Node.js 22.x LTS**.
   - **Modo da Aplicação (Application Mode):** `production`.
   - **Diretório da Aplicação (Application Root):** `/home/u123456789/domains/seudominio.com.br/public_html` (ou subpasta correspondente).
   - **URI da Aplicação (Application URL):** seu domínio ou subdomínio.
   - **Arquivo de Inicialização (Application Startup File):** `server.cjs` (ou `dist/server.cjs`).
3. **Fazer Upload dos Arquivos:**
   - Envie os arquivos do projeto via Git, Gerenciador de Arquivos do hPanel ou SSH/SFTP (exceto a pasta `node_modules/` local).
4. **Instalar Dependências e Gerar o Build:**
   - Via terminal SSH (ou botão "Run npm install" no painel):
     ```bash
     npm ci --production=false
     npm run build
     npm prune --production
     ```
5. **Configurar Variáveis de Ambiente:**
   - No painel da Hostinger, adicione cada variável de ambiente descrita na seção 3 (`NODE_ENV`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, etc.).
6. **Permissões de Pastas:**
   - Certifique-se de que a pasta de uploads possui permissão de escrita para o usuário web:
     ```bash
     chmod -R 755 public/uploads
     ```
7. **Iniciar/Reiniciar a Aplicação:**
   - Clique em **Restart Application** no painel Node.js da Hostinger.
   - Acesse seu domínio e verifique o funcionamento.

---

## 9. Configuração de Domínio e HTTPS

1. No hPanel, vá em **Segurança** → **Certificados SSL**.
2. Ative o **SSL Let's Encrypt Gratuito** com renovação automática para seu domínio.
3. Ative a opção **Forçar HTTPS** para garantir tráfego criptografado seguro.

---

## 10. Verificação de Logs e Monitoramento

- **Logs do Servidor (Express / Node.js):**
  - No hPanel, acesse a seção de **Logs de Erro** ou verifique via SSH o arquivo `stderr.log` / `stdout.log` gerado pelo Passenger na raiz da aplicação.
- **Logs Internos do Sistema (Auditoria):**
  - Administradores com perfil `COORDENADOR` ou `ROOT` podem consultar a aba **Auditoria & Logs** no dashboard administrativo ou exportar relatórios em Excel (`.xlsx`).
- **Health Check:**
  - O endpoint `GET https://seu-dominio.com.br/api/health` retorna o status operacional da aplicação.

---

## 11. Procedimento de Rollback e Atualização

### Para Atualizar a Aplicação:
```bash
git pull origin main
npm install --no-audit
npm run build
# Reiniciar a aplicação no hPanel (ou tocar o arquivo tmp/restart.txt)
mkdir -p tmp && touch tmp/restart.txt
```

### Para Realizar Rollback em caso de Falha:
1. Reverter para o commit estável anterior:
   ```bash
   git checkout <COMMIT_HASH_ANTERIOR>
   npm run build
   touch tmp/restart.txt
   ```
2. Se necessário restaurar o banco de dados, utilize o backup diário disponível no hPanel em **Arquivos** → **Backups**.

---

## 12. Execução dos Testes Automatizados

Para executar os testes de unidade, integração e segurança:
```bash
npm test
```
A suíte valida:
- Hashing de senhas com bcrypt e assinatura/verificação de JWT.
- Bloqueio de elevação não autorizada de privilégios (RBAC).
- Sanitização de projeções do banco (proibição de exposição de senhas).
- Proteção e validação de assinatura binária de uploads de imagem.
- Fluxo de ponta a ponta de eventos, workshops, inscrições e certificados.

---

## 13. Resumo de Compatibilidade Hostinger

- **Framework**: Express 4 (Backend API) + React 19 / Vite 6 (Frontend SPA)
- **Versão Node.js**: 20.x LTS ou 22.x LTS
- **Build command**: `npm run build`
- **Start command**: `node dist/server.cjs` (ou via startup file `server.cjs`)
- **Output directory**: `dist`
- **Environment variables**: `NODE_ENV`, `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SMTP_REPLY_TO`, `MAX_UPLOAD_SIZE_MB`
- **Configuração da Porta**: A porta é configurada dinamicamente via `process.env.PORT` atribuída pelo servidor web (Passenger/Nginx) da Hostinger, possuindo fallback padrão para a porta 3000 em ambiente local.


**Feito com 💖 por Anne e Gui.**