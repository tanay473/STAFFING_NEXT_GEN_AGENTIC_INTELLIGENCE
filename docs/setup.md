# Setup and Installation Guide

This guide provides step-by-step instructions to get the **Staffing NBA Platform** up and running in your local development environment.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.x or higher)
- **Python** (v3.10.x or higher)
- **Redis** (running locally on port 6379, required if `USE_REDIS` is set to `True`)
- **Google Gemini API Key** (for agentic reasoning and resume parsing)

---

## ⚙️ Environment Configuration

1. In the project root (`t:/XL_Ventures`), create a `.env` file (or copy the existing one).
2. Configure the following environment variables:

```env
# Google Gemini API key (Required for reasoning & embeddings)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"

# Redis Cache Configurations (Set to False to use local memory fallback)
USE_REDIS=False
REDIS_HOST=localhost
REDIS_PORT=6379

# Pinecone Vector Database Configurations (Set to False to use local JSON database simulation)
USE_PINECONE=False
PINECONE_API_KEY="your-pinecone-key"
PINECONE_ENV="us-west1-gcp"
PINECONE_INDEX_NAME="staffing-nba"
```

> [!NOTE]  
> If `USE_PINECONE` or `USE_REDIS` are set to `False`, the platform automatically falls back to local in-memory/JSON structures so you can run the application with zero external infrastructure dependencies.

---

## 🗄️ Database Seeding

Before running the application, seed the mock data (candidates, client preferences, salary benchmarks, and playbooks) into the SQLite CRM database.

From the project root directory, run:

```powershell
python scripts/seed_sqlite.py
```

This script will:
- Connect to `data/crm.db` (creating the database file and directory if they don't exist).
- Create tables: `candidates`, `clients`, `placements`, `salary_benchmarks`, `playbooks`, and `feedback`.
- Populate candidate records, sample clients (e.g., Vertex Finance), historical placement benchmarks, and communication standards.

---

## 🚀 Running the Services

### 1. Backend Server (FastAPI)

1. Open a terminal and navigate to the project root.
2. Install the required Python packages:
   ```powershell
   pip install -r backend/requirements.txt
   ```
3. Start the FastAPI development server with Uvicorn:
   ```powershell
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```

The backend API will be available at [http://localhost:8000](http://localhost:8000). The interactive swagger documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 2. Frontend Application (React + Vite)

1. Open a separate terminal and navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```
2. Install the npm packages:
   ```powershell
   npm install
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

The React portal will run on [http://localhost:3000](http://localhost:3000) (or the port specified in your console).

---

## 🔄 Verifying the Portals

- **Recruiter (Admin) Workspace:** Navigate to `http://localhost:3000/recruiter` (or `http://localhost:3000/recruiter/queue`).
- **Client Workspace:** Navigate to `http://localhost:3000/client` (or `http://localhost:3000/client/pipeline`).
