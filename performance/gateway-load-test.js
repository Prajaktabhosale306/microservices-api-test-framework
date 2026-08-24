import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// 1. Load Profile & Threshold Budgets (SLAs)
export const options = {
  stages: [
    { duration: '15s', target: 20 }, // Ramp-up to 20 virtual users
    { duration: '30s', target: 20 }, // Stay at 20 VUs (steady load)
    { duration: '10s', target: 0 },  // Ramp-down to 0
  ],
  thresholds: {
    // 95% of requests must complete below 200ms; 99% below 400ms
    http_req_duration: ['p(95)<200', 'p(99)<400'],
    // HTTP failure rate must remain below 1%
    http_req_failed: ['rate<0.01'],
    // Custom check passing rate > 99%
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  let authToken = '';
  let orderId = '';
  const correlationId = `k6-corr-${uuidv4().substring(0, 8)}`;

  // Stage 1: Auth Token Generation
  group('01_Authentication', function () {
    const authPayload = JSON.stringify({
      username: 'perf_user',
      userId: `usr_perf_${__VU}`,
      role: 'CUSTOMER',
    });

    const authRes = http.post(`${BASE_URL}/api/v1/auth/token`, authPayload, {
      headers: { 'Content-Type': 'application/json' },
    });

    check(authRes, {
      'Auth status is 200': (r) => r.status === 200,
      'Access token present': (r) => r.json('access_token') !== undefined,
    });

    authToken = authRes.json('access_token');
  });

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
  };

  // Stage 2: Create Async Order (202 Accepted)
  group('02_Create_Order', function () {
    const orderPayload = JSON.stringify({
      items: ['SKU-PERF-MACBOOK', 'SKU-PERF-STAND'],
      totalAmount: 1899.5,
    });

    const orderRes = http.post(`${BASE_URL}/api/v1/orders`, orderPayload, {
      headers: authHeaders,
    });

    check(orderRes, {
      'Order status is 202 Accepted': (r) => r.status === 202,
      'Order initial state is PROCESSING': (r) => r.json('status') === 'PROCESSING',
      'Order ID generated': (r) => r.json('orderId') !== undefined,
    });

    orderId = orderRes.json('orderId');
  });

  // Stage 3: Fetch Order by ID
  group('03_Get_Order_Status', function () {
    if (orderId) {
      const getRes = http.get(`${BASE_URL}/api/v1/orders/${orderId}`, {
        headers: authHeaders,
      });

      check(getRes, {
        'Get Order returns 200': (r) => r.status === 200,
        'Matches requested Order ID': (r) => r.json('orderId') === orderId,
      });
    }
  });

  // Stage 4: Process Payment with Idempotency Key
  group('04_Charge_Payment', function () {
    if (orderId) {
      const idempKey = `IDEMP-K6-${uuidv4()}`;
      const payPayload = JSON.stringify({
        orderId: orderId,
        amount: 1899.5,
        currency: 'USD',
      });

      const payRes = http.post(`${BASE_URL}/api/v1/payments/charge`, payPayload, {
        headers: {
          ...authHeaders,
          'X-Idempotency-Key': idempKey,
        },
      });

      check(payRes, {
        'Payment status is 200': (r) => r.status === 200,
        'Payment is CAPTURED': (r) => r.json('status') === 'CAPTURED',
      });
    }
  });

  // Pacing between iterations per Virtual User
  sleep(1);
}
export function handleSummary(data) {
  return {
    "reports/k6-load-report.html": htmlReport(data),
  };
}