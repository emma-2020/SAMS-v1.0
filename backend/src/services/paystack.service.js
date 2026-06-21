'use strict';

const crypto = require('crypto');

const PAYSTACK_BASE = 'https://api.paystack.co';

function isConfigured(secretKey) {
  return Boolean(secretKey && secretKey.length > 10);
}

async function initializeTransaction({ secretKey, email, amountInPesewas, reference, metadata, callbackUrl }) {
  if (!isConfigured(secretKey)) {
    throw new Error('No Paystack key configured for this academy. Please add your Paystack secret key in Settings → Academy → Payments.');
  }

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount:       amountInPesewas,
      currency:     'GHS',
      reference,
      metadata,
      callback_url: callbackUrl,
    }),
  });

  const json = await res.json();
  if (!json.status) {
    throw new Error(`Paystack init failed: ${json.message || JSON.stringify(json)}`);
  }

  // Returns { authorization_url, access_code, reference }
  return json.data;
}

function verifyWebhookSignature(rawBody, signature, secretKey) {
  if (!isConfigured(secretKey) || !signature) return false;
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

module.exports = { isConfigured, initializeTransaction, verifyWebhookSignature };
