// bot.js - Production Ready
const { Telegraf } = require('telegraf');
const admin = require('firebase-admin');

// Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Webhook mode (untuk Railway/Render)
bot.telegram.setWebhook(`${process.env.RENDER_EXTERNAL_URL}/webhook`);

// Polling mode (untuk Cyclic/Koyeb)
// bot.launch();

bot.start(async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const telegramUsername = ctx.from.username || ctx.from.first_name;
  const startParam = ctx.startPayload;
  
  if (startParam && startParam.startsWith('auth_')) {
    const token = startParam.replace('auth_', '');
    
    try {
      const tokenDoc = await db.collection('telegram_auth_tokens').doc(token).get();
      
      if (!tokenDoc.exists) {
        await ctx.reply('❌ Token tidak valid. Silakan coba lagi dari website RODROPZ.');
        return;
      }
      
      const tokenData = tokenDoc.data();
      const expiresAt = tokenData.expiresAt?.toDate();
      
      if (expiresAt && expiresAt < new Date()) {
        await ctx.reply('⏰ Token sudah kadaluarsa. Silakan coba lagi.');
        await tokenDoc.ref.delete();
        return;
      }
      
      await tokenDoc.ref.update({
        status: 'verified',
        telegramChatId: telegramId,
        telegramUsername: telegramUsername,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await ctx.reply(
        `✅ *Berhasil Terhubung!*\n\n` +
        `Akun Telegram @${telegramUsername} telah terhubung dengan akun RODROPZ **${tokenData.username}**.\n\n` +
        `🎉 Sekarang Anda akan menerima notifikasi event airdrop terbaru!\n\n` +
        `🚀 *Klik tombol di bawah untuk membuka RODROPZ:*`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Buka RODROPZ', web_app: { url: 'https://airdrops.rstudiolab.online' } }
            ]]
          }
        }
      );
      
    } catch (err) {
      console.error('Verification error:', err);
      await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
    }
  } else {
    await ctx.reply(
      `🎮 *Welcome to RODROPZ Bot!*\n\n` +
      `Halo @${telegramUsername}! 👋\n\n` +
      `Untuk menghubungkan akun, buka website RODROPZ dan klik "Connect Telegram".`,
      { parse_mode: 'Markdown' }
    );
  }
});

// Webhook endpoint untuk Railway/Render
const express = require('express');
const app = express();
app.use(express.json());
app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 Bot running on port ${PORT}`);
});