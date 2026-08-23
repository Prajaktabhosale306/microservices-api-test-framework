/**
 * API GATEWAY & AUTHENTICATION SERVICE
 * 
 * Responsibilities:
 * 1. Issue short-lived JSON Web Tokens (JWT) with user claims and roles.
 * 2. Enforce authentication on protected routes.
 * 3. Enforce distributed tracing by ensuring an X-Correlation-ID header exists on all requests.
 * 4. Reverse-proxy downstream requests to internal microservices.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_12345';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:8081';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8082';

// -----------------------------------------------------------------------------
// Public Endpoints
// -----------------------------------------------------------------------------

/**
 * Health Check: Used by CI/CD pipelines to verify gateway readiness.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'gateway-service' });
});

/**
 * POST /api/v1/auth/token
 * Issues a JWT for a given user.
 * Tokens expire in 60s to validate automated token-refresh logic in Postman scripts.
 */
app.post('/api/v1/auth/token', (req, res) => {
  const { username, userId, role } = req.body;

  if (!username || !userId) {
    return res.status(400).json({
      type: 'https://example.com/errors/invalid-credentials',
      title: 'Bad Request',
      status: 400,
      detail: 'Both "username" and "userId" fields are required.',
      instance: req.originalUrl
    });
  }

  // Generate token with custom claims
  const token = jwt.sign(
    {
      userId,
      username,
      role: role || 'CUSTOMER' // Supports 'CUSTOMER' or 'ADMIN'
    },
    JWT_SECRET,
    { expiresIn: '60s' }
  );

  return res.status(200).json({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 60
  });
});

// -----------------------------------------------------------------------------
// Authentication & Tracing Middleware
// -----------------------------------------------------------------------------

const authenticateAndTrace = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  // 1. Check if token exists
  if (!token) {
    return res.status(401).json({
      type: 'https://example.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Missing or malformed Authorization header. Expected Bearer token.'
    });
  }

  // 2. Validate token signature and expiration
  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({
        type: 'https://example.com/errors/token-invalid',
        title: 'Forbidden',
        status: 403,
        detail: err.name === 'TokenExpiredError' ? 'JWT has expired' : 'JWT is invalid'
      });
    }

    // Attach decoded user claims to request
    req.user = decodedUser;

    // 3. Distributed Tracing: Extract or generate unique Correlation ID
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();
    res.setHeader('X-Correlation-ID', req.correlationId);

    next();
  });
};

// -----------------------------------------------------------------------------
// Reverse Proxy Routes
// -----------------------------------------------------------------------------

/**
 * Route: /api/v1/orders/* -> Forwarded to Order Service
 */
app.use('/api/v1/orders', authenticateAndTrace, async (req, res) => {
  try {
    const targetUrl = `${ORDER_SERVICE_URL}/orders${req.url === '/' ? '' : req.url}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'x-correlation-id': req.correlationId,
        'x-user-id': req.user.userId,
        'x-user-role': req.user.role
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      // Forward downstream microservice RFC 7807 response
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({
        type: 'https://example.com/errors/bad-gateway',
        title: 'Bad Gateway',
        status: 502,
        detail: 'Downstream Order Service is unreachable.'
      });
    }
  }
});

/**
 * Route: /api/v1/payments/* -> Forwarded to Payment Service (WireMock)
 */
app.use('/api/v1/payments', authenticateAndTrace, async (req, res) => {
  try {
    const targetUrl = `${PAYMENT_SERVICE_URL}/payments${req.url === '/' ? '' : req.url}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        'x-correlation-id': req.correlationId,
        'x-idempotency-key': req.headers['x-idempotency-key'] || ''
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(502).json({
        type: 'https://example.com/errors/bad-gateway',
        title: 'Bad Gateway',
        status: 502,
        detail: 'Downstream Payment Service is unreachable.'
      });
    }
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[GATEWAY-SERVICE] Running on port ${PORT}`);
});