/**
 * auth.ts — Correr UNA SOLA VEZ para generar el refresh token
 * Uso: npx ts-node src/auth.ts
 */
import { google } from 'googleapis';
import * as readline from 'readline';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Faltan GMAIL_CLIENT_ID y GMAIL_CLIENT_SECRET como variables de entorno');
    console.error('   Ejemplo: GMAIL_CLIENT_ID=xxx GMAIL_CLIENT_SECRET=yyy npx ts-node src/auth.ts');
    process.exit(1);
  }

  const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔐 Abrí esta URL en el navegador:\n');
  console.log(authUrl);
  console.log('\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('📋 Pegá el código de autorización aquí: ', async (code) => {
    rl.close();
    try {
      const { tokens } = await oAuth2Client.getToken(code.trim());
      console.log('\n✅ Autenticación exitosa!\n');
      console.log('Guardá estas variables en Railway:\n');
      console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n');
    } catch (e) {
      console.error('❌ Error:', (e as Error).message);
    }
  });
}

main();
