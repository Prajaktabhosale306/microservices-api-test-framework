const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8081;
const ordersDb = new Map();

app.post('/orders', (req, res) => {
  const userId = req.headers['x-user-id'];
  const correlationId = req.headers['x-correlation-id'];
  const { items, totalAmount } = req.body;

  // STRICT VALIDATION: items array with length > 0, totalAmount number > 0
  const isItemsValid = Array.isArray(items) && items.length > 0;
  const isAmountValid = typeof totalAmount === 'number' && !isNaN(totalAmount) && totalAmount > 0;

  if (!isItemsValid || !isAmountValid) {
    return res.status(422).json({
      type: 'https://example.com/errors/unprocessable-entity',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Invalid payload: items must be a non-empty array and totalAmount must be greater than 0.'
    });
  }

  const orderId = `ord_${uuidv4().substring(0, 8)}`;
  const newOrder = {
    orderId,
    userId,
    items,
    totalAmount,
    status: 'PROCESSING',
    createdAt: new Date().toISOString(),
    correlationId
  };

  ordersDb.set(orderId, newOrder);

  setTimeout(() => {
    const existing = ordersDb.get(orderId);
    if (existing) {
      existing.status = 'CONFIRMED';
      existing.updatedAt = new Date().toISOString();
      ordersDb.set(orderId, existing);
    }
  }, 3500);

  res.status(202).json({
    orderId,
    status: 'PROCESSING',
    correlationId,
    message: 'Order accepted for processing.',
    _links: {
      self: `/api/v1/orders/${orderId}`
    }
  });
});

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

app.listen(PORT, () => console.log(`[ORDER-SERVICE] Running on port ${PORT}`));