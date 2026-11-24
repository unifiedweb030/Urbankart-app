# UrbanKart India — White-Label B2B Dropshipping Starter Kit

## Folder Structure
```text
urbankart-fullstack/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── schema.sql
│   ├── server.js
│   └── fulfillment.js
├── frontend/
│   └── src/
│       └── LegalPolicies.jsx
└── README.md
```

## Setup & Launch Steps

### 1. Database Setup (Supabase PostgreSQL)
1. Create a free project on [Supabase](https://supabase.com).
2. Open the **SQL Editor**, paste `backend/schema.sql`, and click **Run**.
3. Copy your PostgreSQL connection string from **Project Settings -> Database**.

### 2. Backend Setup (Node.js + Express)
1. Open terminal in `urbankart-fullstack/backend`.
2. Copy `.env.example` to `.env` and fill in your `DATABASE_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `ADMIN_SECRET_KEY`.
3. Install dependencies and start the server:
   ```bash
   npm install
   npm start
   ```
4. Test health check at `http://localhost:5000/api/health` and public products at `http://localhost:5000/api/products`.

### 3. Frontend Integration
1. Place `LegalPolicies.jsx` inside your React `src/` directory and render `<LegalPolicies />` inside your storefront layout.
2. Connect checkout and order tracking calls in your React app to your backend base URL (`http://localhost:5000` locally, or your deployed Render/Railway URL in production).

### 4. Go-Live Checklist
- Complete GSTIN registration and open a business current bank account.
- Activate Razorpay Live Mode with your domain and business KYC.
- Configure your B2B supplier webhook URL and Shiprocket/courier webhook token in `.env`.
- Replace placeholder Grievance Officer details in `LegalPolicies.jsx` before publishing publicly.
