import { randomBytes, pbkdf2Sync } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const ITERATIONS = 100000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';
const SALT_BYTES = 16;

function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function escapeSqlString(value) {
  return value.replace(/'/g, "''");
}

function getArgValue(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : '';
}

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    let email = getArgValue('email').trim();
    if (!email) {
      email = (await rl.question('請輸入第一位使用者 email: ')).trim();
    }

    if (!email) {
      console.error('email 不可為空。');
      process.exit(1);
    }

    let password = getArgValue('password');
    if (!password) {
      password = await rl.question('請輸入密碼: ');
    }

    if (!password) {
      console.error('密碼不可為空。');
      process.exit(1);
    }

    let confirmPassword = getArgValue('confirm');
    if (!confirmPassword) {
      confirmPassword = await rl.question('請再次輸入密碼確認: ');
    }

    if (password !== confirmPassword) {
      console.error('兩次密碼不一致。');
      process.exit(1);
    }

    const hashed = hashPassword(password);
    const escapedEmail = escapeSqlString(email);
    const escapedHash = escapeSqlString(hashed);

    const sql = [
      '-- 將下列 SQL 貼到 seed.sql（新增第一位使用者）',
      `INSERT INTO users (email, password_hash, is_active) VALUES ('${escapedEmail}', '${escapedHash}', 1);`,
      "INSERT INTO user_roles (user_id, role_id) SELECT id, 1 FROM users WHERE email = '" + escapedEmail + "';"
    ].join('\n');

    console.log('\n=== password_hash ===');
    console.log(hashed);
    console.log('\n=== seed.sql snippet ===');
    console.log(sql);
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('發生錯誤:', err instanceof Error ? err.message : err);
  process.exit(1);
});
