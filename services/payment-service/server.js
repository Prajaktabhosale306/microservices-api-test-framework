const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8082;
const idempotencyStore = new Map();

app.post('/payments/charge', (req, res) => {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey || !idempotencyKey.startsWith('IDEMP-')) {
    return res.status(400).json({ error: 'INVALID_IDEMPOTENCY_KEY' });
  }

  // If key was seen, return cached result
  if (idempotencyStore.has(idempotencyKey)) {
    return res.status(200).json(idempotencyStore.get(idempotencyKey));
  }

  const responsePayload = {
    transactionId: `txn_${uuidv4().substring(0, 8)}`,
    status: 'CAPTURED',
    idempotencyVerified: true,
    message: 'Payment captured successfully.'
  };

  idempotencyStore.set(idempotencyKey, responsePayload);
  res.status(200).json(responsePayload);
});

app.listen(PORT, () => console.log(`[PAYMENT-SERVICE] Running on port ${PORT}`));