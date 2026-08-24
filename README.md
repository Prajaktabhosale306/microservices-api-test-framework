# 🚀 Distributed Microservices API Test Automation Framework

[![API Regression CI](https://github.com/Prajaktabhosale306/microservices-api-test-framework/actions/workflows/api-regression-ci.yml/badge.svg)](https://github.com/Prajaktabhosale306/microservices-api-test-framework/actions/workflows/api-regression-ci.yml)
[![Live Report](https://img.shields.io/badge/Test%20Report-GitHub%20Pages-2ea44f?style=flat&logo=github)](https://prajaktabhosale306.github.io/microservices-api-test-framework/)
[![k6 Performance](https://img.shields.io/badge/k6-Load%20Tested-7D64FF?style=flat&logo=k6&logoColor=white)](https://k6.io/)
[![Postman](https://img.shields.io/badge/Postman-v10+-FF6C37?style=flat&logo=postman&logoColor=white)](https://www.postman.com/)
[![Newman](https://img.shields.io/badge/CLI-Newman-orange?style=flat)](https://github.com/postmanlabs/newman)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)

An enterprise-grade, contract-driven API test automation framework designed to test asynchronous distributed systems, microservices architectures, OAuth/JWT security boundaries (BOLA/IDOR), idempotency mechanics, and boundary matrices via Postman, Newman, Grafana k6, and GitHub Actions CI/CD.

---

## 📊 Live Interactive Dashboard

Explore the latest automated test execution report hosted on GitHub Pages:  
👉 **[View Live Newman HTML Dashboard](https://prajaktabhosale306.github.io/microservices-api-test-framework/)**

---

## ⚡ Performance & Load Benchmark (Grafana k6)

The test battery includes an automated load testing suite simulating concurrent Virtual Users (VUs) traversing the complete asynchronous order-to-payment lifecycle.

| SLA Metric | Performance Target | Benchmark Result | Status |
| :--- | :--- | :--- | :--- |
| **P95 Latency** | `p(95) < 200ms` | **3.81 ms** | ✅ PASS |
| **P99 Latency** | `p(99) < 400ms` | **5.60 ms** | ✅ PASS |
| **HTTP Error Rate** | `< 1.00%` | **0.00% (0 / 3,428 calls)** | ✅ PASS |
| **Check Assertion Rate** | `> 99.00%` | **100.00% (7,713 / 7,713)** | ✅ PASS |
| **Peak Concurrency** | 20 Virtual Users | **61.6 RPS sustained** | ✅ PASS |

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
🧪 Key Testing Competencies Demonstrated1. Asynchronous Lifecycle & State-Machine PollingValidates 202 Accepted response pattern for non-blocking operations.Implements dynamic polling loops using Postman's pm.execution.setNextRequest() with exponential retry limits until order state resolves to CONFIRMED.2. Security Boundaries: OWASP API #1 (BOLA / IDOR)Generates dual tenant identities (User A customer vs. User B attacker).Validates cross-tenant resource isolation, ensuring unauthorized requests receive strict 403 Forbidden with RFC 7807 Problem Details payloads.3. Data-Driven Testing (DDT) & Boundary Value MatrixParameterized test execution against ddt-order-matrix.json.Automated validation across positive flows, numeric boundaries ($0.01, $0.00), empty payload structures, and malformed types.4. High-Throughput Load Verification (k6)Multi-stage workload simulating token authentication, asynchronous polling, and payment capture under concurrent load.Strict latency budget enforcement preventing performance regressions in CI.5. Network Resilience & IdempotencyVerifies transaction deduplication using X-Idempotency-Key headers to guarantee zero double-charging over flaky networks.6. Contract Governance & Distributed TracingStrict schema validation via AJV JSON Schema definitions.End-to-end X-Correlation-ID validation propagated across gateway hops.📋 Test Matrix & ScenariosTest SuiteFocus AreaAssertions / Validations01_AuthenticationToken HandlingAccess Token issuance, JWT structure, dynamic expiry tracking02_Async_Order_LifecycleDistributed Workflows202 Accepted, polling loop state resolution, AJV Schema validation03_Security_BOLA_RBACAuthorization IntegrityIDOR cross-tenant boundary (403), Unauthenticated rejection (401)04_Idempotency_ResilienceMutation SafetyPayment deduplication, replay safety with idempotency keys05_Data_Driven_MatrixBoundary & Negative Testing6-scenario matrix: zero amounts, empty arrays, invalid types06_Performance_LoadThroughput & Latency SLAsP95/P99 latency budgets, zero 5xx errors across 20 VUs🚀 Getting StartedPrerequisitesNode.js 18+k6 (via Homebrew: brew install k6)Docker Desktop (Optional for containerized runs)Local Execution (Step-by-Step)Clone the repository:Bashgit clone [https://github.com/Prajaktabhosale306/microservices-api-test-framework.git](https://github.com/Prajaktabhosale306/microservices-api-test-framework.git)
cd microservices-api-test-framework
Install root dependencies:Bashnpm install
Start the Microservices Cluster:Bash# Option A: Using Docker Compose
docker compose up --build -d

# Option B: Run locally in separate terminals
cd services/order-service && npm install && node server.js &
cd services/payment-service && npm install && node server.js &
cd services/gateway-service && npm install && node server.js &
Execute End-to-End Functional Regression:Bashnpm run test:local
Execute Data-Driven Boundary Matrix:Bashnpm run test:ddt
Execute k6 Concurrency Benchmark:Bashnpm run test:load
View Reports:Bashopen reports/test-report.html
# or
open reports/ddt-test-report.html
⚙️ CI/CD Pipeline FlowThis framework integrates a fully automated GitHub Actions pipeline (api-regression-ci.yml):Environment Setup: Configures Node.js 20 runner and restores package caches.Container Orchestration: Spins up microservice dependencies using docker compose.Health Check Validation: Polls Gateway /health until all endpoints are ready.Headless Execution: Runs Newman with htmlextra reporter.Performance Benchmarking: Executes Grafana k6 headless load testing with threshold validations.Artifact Publishing: Automatically publishes and deploys the report to GitHub Pages.Clean Teardown: Shuts down Docker containers cleanly upon completion.