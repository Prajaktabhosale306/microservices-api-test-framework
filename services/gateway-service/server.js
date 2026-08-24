const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123456789';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:8081';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8082';

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date().toISOString() });
});

app.post('/api/v1/auth/token', (req, res) => {
  const { username, userId, role } = req.body;
  if (!username || !userId) {
    return res.status(400).json({ error: 'Username and userId are required.' });
  }

  const tokenPayload = {
    userId,
    username,
    role: role || 'CUSTOMER'
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '15m' });
  res.status(200).json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 900
  });
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      type: 'https://example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing Bearer authentication token.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        type: 'https://example.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Invalid or expired token.'
      });
    }
    req.user = user;
    next();
  });
}

app.post('/api/v1/orders', authenticateToken, async (req, res) => {
  try {
    const correlationId = req.headers['x-correlation-id'] || `corr-${uuidv4()}`;
    const response = await axios.post(`${ORDER_SERVICE_URL}/orders`, req.body, {
      headers: {
        'x-user-id': req.user.userId,
        'x-user-role': req.user.role,
        'x-correlation-id': correlationId,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(502).json({
      type: 'https://example.com/errors/bad-gateway',
      title: 'Bad Gateway',
      status: 502,
      detail: error.message
    });
  }
});

app.get('/api/v1/orders/:id', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE_URL}/orders/${req.params.id}`, {
      headers: {
        'x-user-id': req.user.userId,
        'x-user-role': req.user.role
      },
      validateStatus: () => true
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(502).json({
      type: 'https://example.com/errors/bad-gateway',
      title: 'Bad Gateway',
      status: 502,
      detail: error.message
    });
  }
});

app.post('/api/v1/payments/charge', authenticateToken, async (req, res) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] || req.headers['X-Idempotency-Key'];
    const correlationId = req.headers['x-correlation-id'] || `corr-${uuidv4()}`;

    const headersToSend = {
      'Content-Type': 'application/json',
      'x-user-id': req.user.userId,
      'x-user-role': req.user.role,
      'x-correlation-id': correlationId
    };

    if (idempotencyKey) {
      headersToSend['x-idempotency-key'] = idempotencyKey;
    }

    const response = await axios.post(`${PAYMENT_SERVICE_URL}/payments/charge`, req.body, {
      headers: headersToSend,
      validateStatus: () => true
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    return res.status(502).json({
      type: 'https://example.com/errors/bad-gateway',
      title: 'Bad Gateway',
      status: 502,
      detail: error.message
    });
  }
});

app.listen(PORT, () => console.log(`[GATEWAY-SERVICE] Running on port ${PORT}`));