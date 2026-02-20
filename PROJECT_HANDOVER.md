# Project Handover: Web Notifications Combined

This document provides a comprehensive overview of the **Web Notifications Combined** project to facilitate its migration and continued development on another machine.

## 1. System Architecture
The project follows a microservices-inspired architecture managed via **Docker Compose**. It consists of a central Next.js frontend and multiple specialized backends.

### Main Modules:
*   **Web (Frontend/API Gateway)**: Next.js 14 app (Pages Router). Handles the UI, user authentication, and proxies requests to backends.
*   **Backend Span Processor**: Node.js/Express service for processing Cisco Span data, generating AI reports (Gemini), and managing attenuation history.
*   **Performance Backend**: service for NMS (Network Management System) tasks, handling Telegram alerts and performance monitoring.
*   **Databases**: Two separate MySQL instances and an integration with Firebase Firestore.
*   **Grafana**: Consolidated dashboard for visualizing network metrics.

---

## 2. Technical Stack
*   **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide React (Icons).
*   **Backend**: Node.js, Express, Axios, Multer (file uploads).
*   **ORM**: Prisma (for the main `web_notifications` database).
*   **AI**: Google Gemini Pro (@google/genai).
*   **Containers**: Docker & Docker Compose (Debian-based `node:20-slim`).

---

## 3. Database Configuration

### 1. Web Notifications DB (`mysql_wn_combined`)
*   **Purpose**: Manages users, audit logs, notifications, inventory, and system settings.
*   **Technology**: MySQL 8.0.
*   **Prisma Support**: All tables are mapped in `prisma/schema.prisma`.
*   **Key Tables**: `usuarios`, `notifications`, `audit_logs`, `active_alarms`.

### 2. Span Processor DB (`mysql_span_combined`)
*   **Purpose**: Stores historical span data (attenuations), batch uploads, and link thresholds.
*   **Technology**: MySQL 8.0.
*   **Database Name**: `datosinter`.
*   **Key Tables**: `spans` (Stores current and historical attenuation values).

### 3. Firebase Integration
*   The system synchronizes link data from a Firebase Firestore collection to the local MySQL for faster querying and offline support.

---

## 4. Key Data Flows

### Span Processing Flow:
1.  **CSV Upload**: User uploads a Cisco Span CSV via the UI.
2.  **Processing**: `backend-span` parses the CSV, updates `spans` table, and calculates atenuations.
3.  **Visualization**: The frontend fetches data via `/api/span-processor/[...path]` proxy and displays it with "Traffic Light" colors (Green < 20dB, Yellow 20-30dB, Red > 30dB).
4.  **AI Analysis**: The `backend-span` uses Gemini to generate technical summaries of link health.

### Notification Flow:
1.  **Alert Trigger**: A threshold is exceeded or a simulation is triggered via the "Simulation Center".
2.  **Telegram Alert**: `backend-performance` or `backend-span` sends a message to the configured Telegram Chat ID using the Bot Token.
3.  **UI Sync**: `active_alarms` are updated in the MySQL DB, reflecting immediately in the Top Navbar.

---

## 5. Deployment & Setup

### Essential Files for Setup:
*   `docker-compose.yml`: Orchestrates all services.
*   `.env`: contains all connectivity secrets (DB, Telegram, Gemini API).
*   `prisma/schema.prisma`: The source of truth for the `web_notifications` database structure.

### Environment Highlights:
*   `NODE_OPTIONS="--max-old-space-size=4096"`: Needed to avoid `ENOMEM` errors during build.
*   `DATABASE_URL`: Prisma connection string.
*   `NEXT_PUBLIC_SPAN_BACKEND_URL`: URL to the span backend (internal docker network).

### Setup Commands (New Machine):
1.  `docker-compose up -d --build` (Builds all services from scratch).
2.  `npx prisma generate` (Inside the `web` container, handled automatically during build).
3.  `node seed-admins.js` (Optional: To create default admin users).

---

## 6. Recent Optimizations & Fixes
*   **Bcrypt Fix**: Switched from `bcrypt` to `bcryptjs` for better compatibility with Docker/Linux images (avoids `libc.musl` binary issues).
*   **Memory Management**: Large SQL backups were moved out of the build context to optimize performance.
*   **Glassmorphism UI**: The Admin Menu and main tables now use a premium transparent aesthetic.
*   **Robust Proxy**: The `[[...path]].ts` route in Next.js serves as a resilient gateway to the span backend.

---

## 7. Troubleshooting & Common Fixes
*   **Module not found: 'bcrypt'**: This error occurs because `node:20-slim` (Debian) may lack the binaries for the compiled `bcrypt` library. **Solution**: Use `bcryptjs` (pure JavaScript) instead. I have already refactored `[...nextauth].ts` and `api/users/index.ts` to use it.
*   **ENOMEM during build**: Next.js builds can be memory-intensive. **Solution**: Ensure `NODE_OPTIONS="--max-old-space-size=4096"` is present in the `web` service environment variables in `docker-compose.yml`.
*   **Database Initial Connection**: MySQL might take longer to start than the app. **Solution**: The `span-backend` and `nms-backend` have retry logic in their `init` sequences.

## 8. Tips for Antigravity (AI Agents)
When working on this project with Antigravity, you can tell it:
*   "The main database schema is in `prisma/schema.prisma`."
*   "The API proxy to the span backend is in `pages/api/span-processor/[[...path]].ts`."
*   "Always use `bcryptjs` for authentication logic to ensure container stability."
*   "If the Simulation Center gives 404, check the proxy logs in the `web_combined` container."

## 9. Known Credentials (Test Environment)
*   **Database**: `web_user` / `web_pass`
*   **Admin User**: `admin@inter.com.ve` / `T0pt1c0`
*   **Grafana**: `jpetit` / `666`
