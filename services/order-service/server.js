/**
 * ORDER MICROSERVICE (INTERNAL SERVICE)
 * 
 * Responsibilities:
 * 1. Implement asynchronous state transitions (202 Accepted -> CONFIRMED via timer to mimic worker queues).
 * 2. Enforce Broken Object Level Authorization (BOLA/IDOR) verification.
 * 3. Return RFC 7807 compliant error payloads.
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
 * Creates an order asynchronously.
 * Returns 202 Accepted with status 'PROCESSING'.
 * Transitions state to 'CONFIRMED' after 3.5s to test Postman async polling scripts.
 */
app.post('/orders', (req, res) => {
  const userId = req.headers['x-user-id'];
  const correlationId = req.headers['x-correlation-id'];
  const { items, totalAmount } = req.body;

  // Payload Validation
  if (!items || !Array.isArray(items) || items.length === 0 || typeof totalAmount !== 'number') {
    return res.status(422).json({
      type: 'https://example.com/errors/unprocessable-entity',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Invalid payload: "items" must be a non-empty array and "totalAmount" must be numeric.'
    });
  }

  const orderId = `ord_${uuidv4().substring(0, 8)}`;

  const newOrder = {
    orderId,
    userId,
    items,
    totalAmount,
    status: 'PROCESSING', // Initial state
    createdAt: new Date().toISOString(),
    correlationId
  };

  // Save to database
  ordersDb.set(orderId, newOrder);

  // Background Task Simulation: Transitions to CONFIRMED after 3.5 seconds
  setTimeout(() => {
    const existing = ordersDb.get(orderId);
    if (existing) {
      existing.status = 'CONFIRMED';
      existing.updatedAt = new Date().toISOString();
      ordersDb.set(orderId, existing);
    }
  }, 3500);

  // Return 202 Accepted (Standard for async distributed operations)
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

/**
 * GET /orders/:id
 * Fetches order details with strict BOLA (Broken Object Level Authorization) checks.
 */
app.get('/orders/:id', (req, res) => {
  const currentUserId = req.headers['x-user-id'];
  const currentUserRole = req.headers['x-user-role'];
  const orderId = req.params.id;

  const order = ordersDb.get(orderId);

  // 1. Verify existence
  if (!order) {
    return res.status(404).json({
      type: 'https://example.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Order with ID "${orderId}" was not found.`
    });
  }

  // 2. Security / BOLA Check:
  // Non-admin users cannot view orders belonging to other users.
  if (order.userId !== currentUserId && currentUserRole !== 'ADMIN') {
    return res.status(403).json({
      type: 'https://example.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'Access Denied: You do not have permission to view this resource.'
    });
  }

  // Return order object
  res.status(200).json(order);
});

// Start Server
app.listen(PORT, () => {
  console.log(`[ORDER-SERVICE] Running on port ${PORT}`);
});