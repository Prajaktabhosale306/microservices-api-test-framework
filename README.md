# 🚀 Distributed Microservices API Test Automation Framework

[![API Regression CI](https://github.com/Prajaktabhosale306/microservices-api-test-framework/actions/workflows/api-regression-ci.yml/badge.svg)](https://github.com/Prajaktabhosale306/microservices-api-test-framework/actions/workflows/api-regression-ci.yml)
[![Live Report](https://img.shields.io/badge/Test%20Report-GitHub%20Pages-2ea44f?style=flat&logo=github)](https://prajaktabhosale306.github.io/microservices-api-test-framework/)
[![Postman](https://img.shields.io/badge/Postman-v10+-FF6C37?style=flat&logo=postman&logoColor=white)](https://www.postman.com/)
[![Newman](https://img.shields.io/badge/CLI-Newman-orange?style=flat)](https://github.com/postmanlabs/newman)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

An enterprise-grade, contract-driven API test automation framework designed to test asynchronous distributed systems, microservices architectures, OAuth/JWT security boundaries (BOLA/IDOR), idempotency mechanics, and boundary matrices via Postman, Newman, and GitHub Actions CI/CD.

---

## 📊 Live Interactive Dashboard

Explore the latest automated test execution report hosted on GitHub Pages:  
👉 **[View Live Newman HTML Dashboard](https://prajaktabhosale306.github.io/microservices-api-test-framework/)**

---

## 🏗️ Architectural Topology

```text
                      ┌─────────────────────────┐
                      │   Postman / Newman CI   │
                      │  Automation Test Suite  │
                      └────────────┬────────────┘
                                   │ HTTP / JSON
                                   ▼
                      ┌─────────────────────────┐
                      │  API Gateway (:8080)    │
                      │  - JWT Verification     │
                      │  - Distributed Tracing  │
                      │  - Correlation ID Gen   │
                      └───────┬───────────┬─────┘
                              │           │
           ┌──────────────────┘           └──────────────────┐
           ▼                                                 ▼
┌─────────────────────────┐                       ┌─────────────────────────┐
│  Order Service (:8081)  │                       │ Payment Service (:8082) │
│  - Async 202 Lifecycle  │                       │ - Idempotency Keys      │
│  - BOLA Authorization   │                       │ - Deduplication Store   │
│  - RFC 7807 Error Specs │                       │ - State Capture         │
└─────────────────────────┘                       └─────────────────────────┘

---

## 🧪 Key Testing Competencies Demonstrated

### 1. Asynchronous Lifecycle & State-Machine Polling
* Validates `202 Accepted` response pattern for non-blocking operations.
* Implements dynamic polling loops using Postman's `pm.execution.setNextRequest()` with exponential retry limits until order state resolves to `CONFIRMED`.

### 2. Security Boundaries: OWASP API #1 (BOLA / IDOR)
* Generates dual tenant identities (**User A** customer vs. **User B** attacker).
* Validates cross-tenant resource isolation, ensuring unauthorized requests receive strict `403 Forbidden` with RFC 7807 Problem Details payloads.

### 3. Data-Driven Testing (DDT) & Boundary Value Matrix
* Parameterized test execution against `ddt-order-matrix.json`.
* Automated validation across positive flows, numeric boundaries (`$0.01`, `$0.00`), empty payload structures, and malformed types.

### 4. Network Resilience & Idempotency
* Verifies transaction deduplication using `X-Idempotency-Key` headers to guarantee zero double-charging over flaky networks.

### 5. Contract Governance & Distributed Tracing
* Strict schema validation via AJV JSON Schema definitions.
* End-to-end `X-Correlation-ID` validation propagated across gateway hops.

---

## 📋 Test Matrix & Scenarios

| Test Suite | Focus Area | Assertions / Validations |
| :--- | :--- | :--- |
| **01_Authentication** | Token Handling | Access Token issuance, JWT structure, dynamic expiry tracking |
| **02_Async_Order_Lifecycle** | Distributed Workflows | `202 Accepted`, polling loop state resolution, AJV Schema validation |
| **03_Security_BOLA_RBAC** | Authorization Integrity | IDOR cross-tenant boundary (`403`), Unauthenticated rejection (`401`) |
| **04_Idempotency_Resilience** | Mutation Safety | Payment deduplication, replay safety with idempotency keys |
| **05_Data_Driven_Matrix** | Boundary & Negative Testing | 6-scenario matrix: zero amounts, empty arrays, invalid types |

---

## 🚀 Getting Started

### Prerequisites
* [Node.js 18+](https://nodejs.org/)
* [Docker Desktop](https://www.docker.com/) (Optional for containerized runs)

### Local Execution (Step-by-Step)

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Prajaktabhosale306/microservices-api-test-framework.git](https://github.com/Prajaktabhosale306/microservices-api-test-framework.git)
   cd microservices-api-test-framework

```

2. **Install root dependencies:**
```bash
npm install

```


3. **Start the Microservices Cluster:**
```bash
# Option A: Using Docker Compose
docker compose up --build -d

# Option B: Run locally in separate terminals
cd services/order-service && npm install && node server.js &
cd services/payment-service && npm install && node server.js &
cd services/gateway-service && npm install && node server.js &

```


4. **Execute End-to-End Regression Suite:**
```bash
npm run test:local

```


5. **Execute Data-Driven Boundary Matrix:**
```bash
npm run test:ddt

```


6. **View HTML Reports:**
```bash
open reports/test-report.html
# or
open reports/ddt-test-report.html

```



---

## ⚙️ CI/CD Pipeline Flow

This framework integrates a fully automated GitHub Actions pipeline (`api-regression-ci.yml`):

1. **Environment Setup:** Configures Node.js 20 runner and restores package caches.
2. **Container Orchestration:** Spins up microservice dependencies using `docker compose`.
3. **Health Check Validation:** Polls Gateway `/health` until all endpoints are ready.
4. **Headless Execution:** Runs Newman with `htmlextra` reporter.
5. **Artifact Publishing:** Automatically publishes and deploys the report to **GitHub Pages**.
6. **Clean Teardown:** Shuts down Docker containers cleanly upon completion.

```

---