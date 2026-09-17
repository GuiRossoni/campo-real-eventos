import readline from 'readline';
import mysql from 'mysql2/promise';
import { hashPassword } from '../src/modules/auth/auth.utils';
import { ENV } from '../src/config/env';
import { loadFallbackDb, fallbackDb, saveFallbackDb } from '../src/config/database';

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function createAdmin() {
  console.log('\n======================================================');
  console.log('   CAMPO REAL EVENTOS — CRIAR ADMINISTRADOR ROOT');
  console.log('======================================================\n');

  const args = process.argv.slice(2);
  let name = args[0];
  let email = args[1];
  let password = args[2];

  if (!name) {
    name = await prompt('Nome completo do Administrador: ');
  }
  if (!email) {
    email = await prompt('E-mail institucional: ');
  }
  if (!password) {
    password = await prompt('Senha de acesso (mínimo 6 caracteres): ');
  }

  if (!name || !email || !password || password.length < 6) {
    console.error('❌ Erro: Todos os campos são obrigatórios e a senha deve ter pelo menos 6 caracteres.');
    process.exit(1);
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedPassword = await hashPassword(password);
  const userId = `user_root_${Date.now()}`;

  console.log(`\nGerando hash de segurança com bcrypt para a senha...`);

  if (ENV.DB_HOST) {
    console.log(`Conectando ao banco MySQL em ${ENV.DB_HOST}:${ENV.DB_PORT} (Base: ${ENV.DB_NAME})...`);
    try {
      const connection = await mysql.createConnection({
        host: ENV.DB_HOST,
        port: ENV.DB_PORT,
        user: ENV.DB_USER,
        password: ENV.DB_PASSWORD,
        database: ENV.DB_NAME
      });

      const [existing]: any = await connection.query('SELECT id FROM users WHERE LOWER(email) = ?', [normalizedEmail]);
      if (existing.length > 0) {
        await connection.query(
          'UPDATE users SET name = ?, password = ?, role = ? WHERE LOWER(email) = ?',
          [name, hashedPassword, 'ROOT', normalizedEmail]
        );
        console.log(`✅ Usuário existente atualizado com sucesso para perfil ROOT!`);
      } else {
        await connection.query(
          'INSERT INTO users (id, name, email, role, password) VALUES (?, ?, ?, ?, ?)',
          [userId, name, normalizedEmail, 'ROOT', hashedPassword]
        );
        console.log(`✅ Novo Administrador ROOT criado diretamente no banco MySQL com sucesso!`);
      }

      await connection.end();
    } catch (err: any) {
      console.error(`❌ Erro ao conectar ou gravar no MySQL: ${err.message}`);
      console.log(`Gravando no fallback local...`);
      await saveToFallback(userId, name, normalizedEmail, hashedPassword);
    }
  } else {
    console.log('📌 DB_HOST não configurado. Gravando usuário no banco local (local_db_fallback.json)...');
    await saveToFallback(userId, name, normalizedEmail, hashedPassword);
  }

  console.log('\n--- DADOS DE ACESSO ---');
  console.log(`E-mail: ${normalizedEmail}`);
  console.log(`Perfil: ROOT`);
  console.log('-----------------------\n');
  process.exit(0);
}

async function saveToFallback(id: string, name: string, email: string, passwordHash: string) {
  await loadFallbackDb();
  const existingIdx = fallbackDb.users.findIndex(u => u.email.toLowerCase() === email);
  if (existingIdx !== -1) {
    fallbackDb.users[existingIdx].name = name;
    fallbackDb.users[existingIdx].password = passwordHash;
    fallbackDb.users[existingIdx].role = 'ROOT';
  } else {
    fallbackDb.users.push({
      id,
      name,
      email,
      role: 'ROOT',
      password: passwordHash
    });
  }
  saveFallbackDb();
  console.log('✅ Usuário ROOT registrado no fallback local.');
}

createAdmin().catch(err => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
