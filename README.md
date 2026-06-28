---
title: Multi-Tenant RAG API & Dashboard
emoji: 🚀
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
---

# 🚀 Multi-Tenant RAG Platform

A production-ready SaaS full-stack platform that lets any business upload documents and query them using natural language — powered by **Retrieval-Augmented Generation (RAG)**.

Each tenant operates in complete isolation: their documents, vectors, and query history are never accessible to any other tenant. The project now includes a **premium dark-mode React frontend** for end-users to manage their knowledge base and test queries.

[![CI](https://github.com/YOUR_USERNAME/multi-tenant-rag-api/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/multi-tenant-rag-api/actions)

---

## ✨ Features

- **Zero hallucination by design** — answers only come from uploaded documents
- **Complete tenant isolation** — one client can never see another's data
- **Dual Authentication** — Supabase JWT for dashboard access, hashed API keys for developers
- **Hybrid retrieval** — BM25 + dense embeddings merged via Reciprocal Rank Fusion (RRF)
- **In-memory query cache** — TTL-based caching with tenant-scoped SHA256 keys
- **Premium User Interface** — Glassmorphism dark-mode UI with animated components (React + Vite + Tailwind)
- **Production-ready** — structured logging, request IDs, error handling

## 🏗️ Architecture

```
Frontend (Vercel / Netlify)
├── React 19 + Vite
├── Tailwind CSS + Framer Motion
└── Communicates securely with backend API via API Key or JWT

Backend (Hugging Face / Render)
├── FastAPI Layer
│   ├── Auth Middleware (Supabase JWT + bcrypt API key verification)
│   ├── Rate Limiter (sliding window per tenant)
│   └── Cross-cutting: Cache (TTL=1hr), Logging, Request IDs
└── Service Layer
    ├── Tenant DB (SQLite + SQLModel)
    ├── Vector Store (ChromaDB, per-tenant collections)
    └── LLM Layer (Groq / Llama 3.3-70B)
```

## 🚀 Quickstart

### 1. Clone & Install Backend

```bash
git clone https://github.com/YOUR_USERNAME/multi-tenant-rag-api.git
cd multi-tenant-rag-api

python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Backend

```bash
cp .env.example .env
# Edit .env and add your GROQ_API_KEY and SUPABASE keys
```

### 3. Run Backend

```bash
uvicorn app.main:app --reload --port 8001
```
The API is now live at `http://localhost:8001`.

### 4. Setup & Run Frontend

Open a new terminal window:
```bash
cd frontend
npm install
cp .env.example .env
# Ensure VITE_API_URL is set to http://localhost:8001
npm run dev
```
The dashboard is now live at `http://localhost:5173`.

---

## 🌐 Deployment Guide

### Deploying the Backend
1. Push your repository to GitHub.
2. Deploy the root directory to **Hugging Face Spaces** (Docker SDK), Render, or Railway.
3. Add your `.env` variables in your hosting provider's dashboard.
4. Note the deployed URL (e.g., `https://your-app.hf.space`).

### Deploying the Frontend
1. Go to [Vercel.com](https://vercel.com) and import your GitHub repository.
2. Set the Framework Preset to **Vite**.
3. Set the Root Directory to **`frontend`**.
4. In the "Environment Variables" section, add:
   - `VITE_API_URL`: Your deployed backend URL (e.g., `https://your-app.hf.space`)
   - `VITE_SUPERADMIN_EMAIL`: Your super admin email
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: Your Supabase credentials
5. Deploy!

---

## 🔧 Configuration

### Backend `.env`
See `.env.example` in the root directory for all available options including Groq, Supabase, chunking configurations, and cache settings.

### Frontend `.env`
See `frontend/.env.example` for the Vite configuration variables needed to connect the frontend to your backend and Supabase instance.
