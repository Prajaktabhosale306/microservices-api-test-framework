/**
 * ORDER MICROSERVICE (INTERNAL SERVICE)
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;

// In-Memory Order Storage: Map<OrderId, OrderObject>
const ordersDb = new Map();

/**
 * POST /orders
 */
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
      validateStatus: () => true // Allow all status codes (202, 422, etc.) to pass through
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

/**
 * GET /orders/:id
 */
app.get('/orders/:id', (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  const currentUserRole = req.headers['x-user-role'];
  const orderId = req.params.id;

  const order = ordersDb.get(orderId);

  if (!order) {
    return res.status(404).json({
      type: 'https://example.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Order with ID "${orderId}" was not found.`
    });
  }

  if (order.userId !== currentUserId && currentUserRole !== 'ADMIN') {
    return res.status(403).json({
      type: 'https://example.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Access Denied: You do not have permission to view this resource.'
    });
  }

  res.status(200).json(order);
});

app.listen(PORT, () => {
  console.log(`[ORDER-SERVICE] Running on port ${PORT}`);
});