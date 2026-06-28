/**
 * XauBot Pro — Serveur webhook Railway
 * Stripe → Génération clé → Resend email
 *
 * Variables d'environnement Railway à configurer :
 *   STRIPE_SECRET_KEY       → sk_live_...
 *   STRIPE_WEBHOOK_SECRET   → whsec_...
 *   RESEND_API_KEY          → re_...
 *   LICENSE_SECRET          → une chaîne secrète aléatoire (ex: "XauBot2025#Secret!")
 *   PORT                    → 3000 (Railway le gère automatiquement)
 */

const express = require('express');
const crypto  = require('crypto');
const Stripe  = require('stripe');
const { Resend } = require('resend');

const app    = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================
// CONFIGURATION PRODUITS
// Remplace les price IDs par tes vrais IDs Stripe
// (Stripe Dashboard → Products → ton produit → Price ID)
// ============================================================
const PRODUCTS = {
  'price_1Tn5fK1eSvRwxvbukIHFOj4q': {
    name: 'XauBot FTMO',
    code: 'FTMO',
    robots: [{ name: 'XauBot_XAUUSD_FTMO.mq5', link: 'https://drive.google.com/file/d/1PivFvhxRlRUjI5l7i9OZHnGfAg5J6gUv/view?usp=share_link' }],
    pdfs: [
      { name: 'Checklist FTMO',     link: 'https://drive.google.com/file/d/1zFE0dqxpcHX3EmxUVy1jBWm91brpWnzE/view?usp=sharing' },
      { name: 'Guide Broker',       link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',          link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation', link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
    params: { symbole: 'XAUUSD', timeframe: 'M15', risque: '0.5%', stop_journalier: '3%', drawdown_max: '5%' },
  },
  'price_1Tn5gY1eSvRwxvbu5B6nzP2z': {
    name: 'XauBot Aggressive',
    code: 'AGG',
    robots: [{ name: 'XauBot_XAUUSD_Aggressive.mq5', link: 'https://drive.google.com/file/d/1DP87rqzRaY3UM7OxMLQVOgIgLMWOCmMQ/view?usp=sharing' }],
    pdfs: [
      { name: 'Guide Broker',       link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',          link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation', link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
    params: { symbole: 'XAUUSD', timeframe: 'M15', risque: '2%', stop_journalier: '8%', trailing_stop: 'Activé' },
  },
  'price_1Tn5hN1eSvRwxvbulZtlTrDr': {
    name: 'XauBot BTC SMC',
    code: 'BTC',
    robots: [{ name: 'XauBot_BTC_SMC.mq5', link: 'https://drive.google.com/file/d/12lDT_8g9f5FAEC3sdjXwnC3xoQvXlwTK/view?usp=sharing' }],
    pdfs: [
      { name: 'Guide Broker (compatible BTC)', link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',                    link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation',           link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
    params: { symbole: 'BTCUSD', timeframe: 'M15', filtre_tendance: 'H4', risque: '1.5%', rr_min: '2.5' },
    note: '⚠️ Ce robot nécessite un broker compatible MQL5 avec accès BTC/USD. Consultez le guide broker inclus.',
  },
  'price_1Tn5iA1eSvRwxvbulMgrPV64': {
    name: 'XauBot Scalping M5',
    code: 'SCALP',
    robots: [{ name: 'XauBot_Scalping_M5.mq5', link: 'https://drive.google.com/file/d/1RCzbXC51r-0Wx9xtKvoA8QMCm0oNyBw2/view?usp=sharing' }],
    pdfs: [
      { name: 'Guide Broker',       link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',          link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation', link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
    params: { symbole: 'XAUUSD', timeframe: 'M5', risque: '0.5%', positions_max: '4 simultanées', stop_journalier: '6%' },
  },
  'price_1Tn5kP1eSvRwxvbuiMGkQQ63': {
    name: 'Pack Prop Trader',
    code: 'PROP',
    robots: [
      { name: 'XauBot_XAUUSD_FTMO.mq5',      link: 'https://drive.google.com/file/d/1PivFvhxRlRUjI5l7i9OZHnGfAg5J6gUv/view?usp=share_link' },
      { name: 'XauBot_XAUUSD_Aggressive.mq5', link: 'https://drive.google.com/file/d/1DP87rqzRaY3UM7OxMLQVOgIgLMWOCmMQ/view?usp=sharing' },
    ],
    pdfs: [
      { name: 'Checklist FTMO',     link: 'https://drive.google.com/file/d/1zFE0dqxpcHX3EmxUVy1jBWm91brpWnzE/view?usp=sharing' },
      { name: 'Guide Broker',       link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',          link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation', link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
    tip: '💡 Utilisez XauBot FTMO pour les challenges prop firm et XauBot Aggressive sur votre compte personnel une fois le challenge passé.',
  },
  'price_1Tn5nQ1eSvRwxvbuYKeyDHKZ': {
    name: 'Pack Complet',
    code: 'FULL',
    robots: [
      { name: 'XauBot_XAUUSD_FTMO.mq5',      link: 'https://drive.google.com/file/d/1PivFvhxRlRUjI5l7i9OZHnGfAg5J6gUv/view?usp=share_link' },
      { name: 'XauBot_XAUUSD_Aggressive.mq5', link: 'https://drive.google.com/file/d/1DP87rqzRaY3UM7OxMLQVOgIgLMWOCmMQ/view?usp=sharing' },
      { name: 'XauBot_Scalping_M5.mq5',       link: 'https://drive.google.com/file/d/1RCzbXC51r-0Wx9xtKvoA8QMCm0oNyBw2/view?usp=sharing' },
      { name: 'XauBot_BTC_SMC.mq5',           link: 'https://drive.google.com/file/d/12lDT_8g9f5FAEC3sdjXwnC3xoQvXlwTK/view?usp=sharing' },
    ],
    pdfs: [
      { name: 'Checklist FTMO',     link: 'https://drive.google.com/file/d/1zFE0dqxpcHX3EmxUVy1jBWm91brpWnzE/view?usp=sharing' },
      { name: 'Guide Broker',       link: 'https://drive.google.com/file/d/11DFN4A0_dG98qpYUNtrbIAODNGRTLbNM/view?usp=sharing' },
      { name: 'Guide VPS',          link: 'https://drive.google.com/file/d/13MxTYprjneCZ9KctvitgRbVLIGZ5e0eP/view?usp=sharing' },
      { name: 'Guide Installation', link: 'https://drive.google.com/file/d/1Pv2T2bvpiKbqG6yAuO8kKrnAwryMnM3G/view?usp=sharing' },
    ],
  },
};

// ============================================================
// GÉNÉRATION DE CLÉ DE LICENCE UNIQUE
// Format : XAUBOT-{CODE}-{16 caractères hexadécimaux}
// Ex : XAUBOT-FTMO-A3F9B2C1D4E5F678
// ============================================================
function generateLicenseKey(productCode, paymentIntentId) {
  const secret = process.env.LICENSE_SECRET || 'XauBot2025DefaultSecret';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`${productCode}:${paymentIntentId}`)
    .digest('hex')
    .toUpperCase()
    .substring(0, 16);
  return `XAUBOT-${productCode}-${hash}`;
}

// ============================================================
// CONSTRUCTION DU HTML EMAIL
// ============================================================
function buildEmailHtml(product, licenseKey, customerEmail) {
  const robotLinks = product.robots.map(r =>
    `<a href="${r.link}" style="display:block;color:#F5C842;font-size:14px;margin-bottom:10px;text-decoration:none;padding:12px 16px;background:rgba(245,200,66,0.05);border-radius:6px;border:1px solid rgba(245,200,66,0.15);">⬇️ Télécharger ${r.name}</a>`
  ).join('');

  const pdfLinks = product.pdfs.map(p =>
    `<a href="${p.link}" style="display:block;color:#F5C842;font-size:14px;margin-bottom:8px;text-decoration:none;">📄 ${p.name} →</a>`
  ).join('');

  const paramsRows = product.params
    ? Object.entries(product.params).map(([k, v]) =>
        `<tr><td style="color:rgba(240,238,232,0.5);padding:5px 0;font-size:13px;">${k.replace(/_/g,' ')}</td><td style="color:#F0EEE8;text-align:right;font-size:13px;">${v}</td></tr>`
      ).join('')
    : '';

  const paramsBlock = paramsRows ? `
    <div style="background:#0D0D12;border:1px solid rgba(245,200,66,0.2);border-radius:10px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;color:#F5C842;font-weight:700;margin-bottom:12px;">⚙️ PARAMÈTRES RECOMMANDÉS</div>
      <table style="width:100%;border-collapse:collapse;">${paramsRows}</table>
    </div>` : '';

  const noteBlock = product.note ? `
    <div style="background:#0D0D12;border:1px solid rgba(245,200,66,0.15);border-radius:8px;padding:14px 20px;margin-bottom:24px;">
      <p style="font-size:13px;color:#F5C842;margin:0;">${product.note}</p>
    </div>` : '';

  const tipBlock = product.tip ? `
    <div style="border-left:3px solid #F5C842;padding:12px 16px;margin-bottom:24px;background:rgba(245,200,66,0.03);border-radius:0 8px 8px 0;">
      <p style="font-size:13px;color:rgba(240,238,232,0.7);line-height:1.7;margin:0;">${product.tip}</p>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#07070f;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#07070f;color:#F0EEE8;">

  <!-- Header -->
  <div style="background:#0D0D12;padding:32px 40px;text-align:center;border-bottom:2px solid #F5C842;">
    <div style="font-size:24px;font-weight:700;color:#F5C842;">Xau<span style="color:#F0EEE8;">Bot</span> Pro</div>
    <div style="font-size:11px;color:rgba(240,238,232,0.4);margin-top:4px;letter-spacing:2px;">TRADING AUTOMATISÉ</div>
  </div>

  <!-- Body -->
  <div style="padding:40px;">
    <div style="font-size:13px;color:rgba(240,238,232,0.5);margin-bottom:8px;">COMMANDE CONFIRMÉE</div>
    <h1 style="font-size:26px;color:#F5C842;margin:0 0 16px;">Merci pour votre achat 🎉</h1>
    <p style="color:rgba(240,238,232,0.7);font-size:15px;line-height:1.7;margin-bottom:28px;">
      Votre <strong style="color:#F0EEE8;">${product.name}</strong> est prêt à être installé sur MetaTrader 5.
    </p>

    <!-- Clé de licence -->
    <div style="background:linear-gradient(135deg,rgba(245,200,66,0.08),rgba(245,200,66,0.03));border:1px solid rgba(245,200,66,0.3);border-radius:12px;padding:24px;margin-bottom:28px;text-align:center;">
      <div style="font-size:12px;color:#F5C842;font-weight:700;letter-spacing:1px;margin-bottom:10px;">🔑 VOTRE CLÉ DE LICENCE</div>
      <div style="font-size:18px;font-weight:700;color:#F5C842;letter-spacing:2px;font-family:monospace;">${licenseKey}</div>
      <div style="font-size:11px;color:rgba(240,238,232,0.4);margin-top:8px;">Conservez cette clé précieusement — elle est unique et personnelle</div>
    </div>

    ${noteBlock}

    <!-- Téléchargements robots -->
    <div style="background:#0D0D12;border:1px solid rgba(245,200,66,0.2);border-radius:10px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;color:#F5C842;font-weight:700;margin-bottom:14px;">🤖 ${product.robots.length > 1 ? 'VOS ROBOTS' : 'VOTRE ROBOT'}</div>
      ${robotLinks}
    </div>

    <!-- PDFs bonus -->
    <div style="background:#0D0D12;border:1px solid rgba(245,200,66,0.2);border-radius:10px;padding:20px;margin-bottom:24px;">
      <div style="font-size:12px;color:#F5C842;font-weight:700;margin-bottom:12px;">🎁 GUIDES INCLUS</div>
      ${pdfLinks}
    </div>

    ${paramsBlock}
    ${tipBlock}

    <!-- VPS Affilié -->
    <div style="background:linear-gradient(135deg,rgba(245,200,66,0.05),rgba(245,200,66,0.02));border:1px solid rgba(245,200,66,0.2);border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:12px;color:#F5C842;font-weight:700;margin-bottom:10px;">🖥️ FAITES TOURNER VOTRE ROBOT 24H/24</div>
      <p style="font-size:13px;color:rgba(240,238,232,0.7);line-height:1.7;margin:0 0 14px;">Pour que votre robot trade même quand votre ordinateur est éteint, vous avez besoin d'un VPS Windows. Nous recommandons <strong style="color:#F0EEE8;">ForexVPS</strong> — optimisé pour MetaTrader, faible latence, disponible 24h/24.</p>
      <a href="https://www.forexvps.net/?aff=131737" style="display:inline-block;background:#F5C842;color:#07070f;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;text-decoration:none;">Obtenir mon VPS →</a>
    </div>

    <!-- Licence -->
    <div style="border-left:3px solid #F5C842;padding-left:16px;margin-bottom:28px;">
      <p style="font-size:13px;color:rgba(240,238,232,0.5);line-height:1.7;margin:0;">
        🔒 <strong style="color:#F0EEE8;">Licence personnelle</strong> — Réservée à votre usage exclusif. Toute revente ou redistribution est strictement interdite.
      </p>
    </div>

    <!-- Support -->
    <p style="font-size:14px;color:rgba(240,238,232,0.6);text-align:center;margin-bottom:12px;">Des questions ? Notre équipe est là pour vous.</p>
    <div style="text-align:center;">
      <a href="mailto:contact@xaubot.pro" style="display:inline-block;border:1px solid rgba(245,200,66,0.4);color:#F5C842;font-size:14px;padding:12px 32px;border-radius:6px;text-decoration:none;">
        📩 contact@xaubot.pro
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#0D0D12;padding:20px 40px;text-align:center;border-top:1px solid rgba(245,200,66,0.1);">
    <p style="font-size:11px;color:rgba(240,238,232,0.3);margin:0 0 6px;">© 2025 XauBot Pro — Paris, France</p>
    <p style="font-size:11px;color:rgba(240,238,232,0.3);margin:0;">⚠️ Le trading comporte des risques. Les performances passées ne garantissent pas les résultats futurs.</p>
  </div>

</div>
</body>
</html>`;
}

// ============================================================
// WEBHOOK STRIPE
// ============================================================
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // Récupère les line items pour connaître le produit acheté
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
      const priceId   = lineItems.data[0]?.price?.id;
      const product   = PRODUCTS[priceId];

      if (!product) {
        console.warn(`Produit inconnu pour price ID: ${priceId}`);
        return res.json({ received: true });
      }

      const customerEmail   = session.customer_details?.email;
      const paymentIntentId = session.payment_intent;
      const licenseKey      = generateLicenseKey(product.code, paymentIntentId);

      console.log(`✅ Achat: ${product.name} | Email: ${customerEmail} | Clé: ${licenseKey}`);

      // Envoie l'email via Resend
      const emailHtml = buildEmailHtml(product, licenseKey, customerEmail);
      const { error } = await resend.emails.send({
        from:    'XauBot Pro <contact@xaubot.pro>',
        to:      customerEmail,
        subject: `✅ Votre ${product.name} est prêt — Clé de licence & Téléchargement`,
        html:    emailHtml,
      });

      if (error) {
        console.error('Erreur Resend:', error);
      } else {
        console.log(`📧 Email envoyé à ${customerEmail}`);
      }

    } catch (err) {
      console.error('Erreur traitement webhook:', err);
    }
  }

  res.json({ received: true });
});

// Health check
app.get('/', (req, res) => res.send('XauBot webhook server running ✅'));

// ROUTE DE TEST TEMPORAIRE — à supprimer après validation
app.get('/test', async (req, res) => {
  const { email, product: code } = req.query;
  if (!email || !code) return res.status(400).json({ error: 'email et product requis' });
  const product = Object.values(PRODUCTS).find(p => p.code === code.toUpperCase());
  if (!product) return res.status(404).json({ error: `Code inconnu: ${code}. Valides: FTMO, AGG, BTC, SCALP, PROP, FULL` });
  const licenseKey = generateLicenseKey(product.code, `test_${Date.now()}`);
  console.log(`🧪 TEST: ${product.name} | Email: ${email} | Clé: ${licenseKey}`);
  const { error } = await resend.emails.send({
    from: 'XauBot Pro <contact@xaubot.pro>',
    to: email,
    subject: `✅ [TEST] Votre ${product.name} est prêt — Clé & Téléchargement`,
    html: buildEmailHtml(product, licenseKey, email),
  });
  if (error) return res.status(500).json({ error });
  res.json({ success: true, licenseKey, email, product: product.name });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
