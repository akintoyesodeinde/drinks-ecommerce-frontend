# DrinksEcommerce Nigeria — Customer Storefront & Admin Operations Console (`drinks-ecommerce-frontend`)

Production-oriented **React 19 + TypeScript + Vite + Bootstrap 5** web application for **DrinksEcommerce**, a Nigerian single-store online drinks retailer.

- **Frontend Repository**: `https://github.com/akintoyesodeinde/drinks-ecommerce-frontend`
- **Backend API Repository**: `https://github.com/akintoyesodeinde/drinks-ecommerce-backend`
- **Docker Hub Image**: `akintoyesodeinde/drinks-ecommerce-frontend:<commit-sha>`

---

## 1. Key Capabilities

### Customer Storefront
- **Product Discovery**: Browse Nigerian soft drinks, bottled/sachet water, fruit juices, malt & non-alcoholic beverages, energy drinks, mixers, and party bundles by category, brand, pack type (`Single`, `Multipack`, `Carton`, `Crate`, `Sachet`, `Bundle`), price range, and stock availability.
- **Shopping Cart & Coupons**: Persistent guest cart with automatic merge into server cart upon sign-in (`/api/v1/cart/merge`), coupon code application (`WELCOME10`), and real-time Nigerian state/city delivery fee estimation (`/api/v1/delivery/estimate`).
- **Checkout & Idempotency**: Nigerian 36-states + FCT address validation (`+234` phone normalization), store pickup hub option, authoritative `/api/v1/checkout/preview`, and idempotent `/api/v1/checkout` (`Idempotency-Key` header).
- **Paystack Payment Verification**: Redirects to Paystack and verifies payment status exclusively against the backend (`GET /api/v1/payments/{reference}/verify`). Never trusts query-string flags.
- **Order Tracking & Account**: Live delivery step timeline, assigned rider contact, order cancellation (while eligible), address book CRUD, and customer notifications.

### Role-Based Admin & Fulfilment Console (`/admin/*`)
- **Executive Dashboard**: Revenue & order metrics in `Africa/Lagos` timezone, low-stock alerts, and payment reconciliation alerts.
- **Catalog & Inventory**: Full CRUD for products, variants, categories, product image uploads, stock adjustments, and inventory transaction ledger.
- **Order & Delivery Fulfilment**: Warehouse packing workflow, rider assignment, delivery status updates, and proof-of-delivery notes.
- **Finance & Store Policies**: Payment inspection, Paystack partial/full refunds, reconciliation resolution, coupon management, Nigerian delivery zone fee rules, store policy settings (including the Alcohol Sales compliance gate), and immutable audit logs.

---

## 2. Local Development

```bash
cp .env.example .env
npm ci
npm run lint
npm test
npm run dev
```

By default, Vite runs on `http://localhost:5173` and proxies `/api`, `/images`, `/uploads`, and `/health` to `VITE_PROXY_TARGET` (default `http://localhost:5080`).

---

## 3. Production Docker Build

```bash
docker build \
  --build-arg VITE_API_BASE_URL=/api/v1 \
  -t akintoyesodeinde/drinks-ecommerce-frontend:local .
```

At runtime, the Nginx container listens on port `80`, serves `/healthz` (`200 healthy`), handles SPA fallback routing (`try_files $uri $uri/ /index.html`), and reverse-proxies `/api/`, `/images/`, `/uploads/`, and `/health/` to `${API_UPSTREAM}` (default `http://api:8080`).

---

## 4. Automated CI/CD (GitHub Actions + Docker Hub + AWS OIDC)

Defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
1. Runs `npm ci`, `npm run lint`, `npm test` (Vitest), and `npm run build`.
2. Builds and pushes `akintoyesodeinde/drinks-ecommerce-frontend:<commit-sha>` and `:latest` to Docker Hub using `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.
3. Authenticates to AWS Account `402535053369` (`us-east-1`) via **GitHub OIDC** (`aws-actions/configure-aws-credentials@v4` with `id-token: write` — **zero static AWS credentials stored in GitHub**).
4. Triggers an AWS Systems Manager (`SSM SendCommand`) rolling update of the `frontend` container on EC2, verifies `/healthz` and `/`, and automatically rolls back to the previous image SHA if health checks fail.
