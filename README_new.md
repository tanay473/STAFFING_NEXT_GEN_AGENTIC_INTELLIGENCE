# Staffing NBA Platform — Next-Gen Agentic Intelligence

---

## 👥 Team Name and Details
<!-- USER_TODO: Fill in your Team Name and Team Member Details here -->
- **Team Name**: [Insert Team Name Here]
- **Team Members**:
  - [Name] — [Role/Responsibility]
  - [Name] — [Role/Responsibility]

---

## 🏗️ Project Overview

The **Staffing NBA (Next Best Action) Platform** is an enterprise-grade, human-in-the-loop agentic decision system built to optimize recruiter workflows and eliminate transparency issues in client-side hiring pipelines. 

By introducing a shared, real-time intelligence layer between agency recruiters and corporate clients, the platform replaces traditional, slow, and opaque email-based hiring pipelines with a modern, reactive system.

### 🌟 Key Core Capabilities

1. **Two-Sided Portal Experience**:
   - **Recruiter (Admin) Workspace**: Features a ranked matching priority queue, background ghosting alerts, and automated, personalized email outreach drafts.
   - **Client Portal**: Provides live applicant tracking stages, SLA fulfillment countdown trackers, and structured feedback interfaces.
2. **Cooperative Multi-Agent Engine**:
   - Powered by **LangGraph** and **Google Gemini AI**, the system orchestrates a linear execution pipeline across dedicated nodes (`Ingest`, `Retrieval`, `Reasoning`, and `Recommendation`).
3. **Real-Time Live Synchronization**:
   - Integrated **FastAPI WebSockets** automatically broadcast notifications to the client portal the second a recruiter approves and submits a candidate shortlist.
4. **Continuous Learning Memory Loop**:
   - Incorporates a write-back memory structure using **Pinecone** (semantic embeddings via `text-embedding-004`) to capture structured client rejection feedback and adjust future candidate scores accordingly.

---

## 🔗 GitHub Link
<!-- USER_TODO: Insert your GitHub repository link here -->
- **Project Repository**: [Insert GitHub Link Here]

---

## ⚙️ Setup Instructions

Follow these instructions to run the frontend and backend applications in your local environment.

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **Google Gemini API Key** (configured in `.env` file)
- **Redis** (Optional, running locally on port `6379`)

### 2. Environment Variables (`.env`)
Create a `.env` file in the project root directory:

```env
# Gemini Configuration
GEMINI_API_KEY="your_api_key_here"
GEMINI_MODEL="gemini-2.5-flash"

# Database Configuration (Set to False to run fully in local memory/JSON mode)
USE_REDIS=False
USE_PINECONE=False
PINECONE_API_KEY="your_pinecone_key"
PINECONE_ENV="us-west1-gcp"
PINECONE_INDEX_NAME="staffing-nba"
```

### 3. Backend Setup & Run (FastAPI)
1. Navigate to the project root directory.
2. Install the required Python packages:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Initialize and seed the local SQLite CRM database:
   ```bash
   python scripts/seed_sqlite.py
   ```
4. Run the Uvicorn web server:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```

The backend server is accessible at `http://localhost:8000`. API Docs are located at `http://localhost:8000/docs`.

### 4. Frontend Setup & Run (React + Vite)
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

The React app will be live at `http://localhost:3000`.

---

## 📝 Additional Notes about the Project

### 🛡️ Graceful Infrastructure Fallbacks
The backend features robust, offline-first fallback logic. If Redis or Pinecone is disabled (set to `False` in your `.env`), the platform runs perfectly using local memory structures and local JSON vector databases (`data/vector_db_sim.json`). This ensures full functionality even with zero external cloud subscriptions.

### 🐕 Background Watchdog (Engagement Monitor)
A background agent daemon (`backend/agents/engagement_monitor.py`) runs asynchronously on an `APScheduler` loop independent of the main recruiter matching flow. It watches for candidate/client communication silences exceeding 48 hours or ghosted offers, placing alert flags and automated follow-ups into the recruiter's feed.

### 📊 Deterministic + Qualitative Scorecards
The **Reasoning Agent** balances cold math with qualitative AI insight. Candidate suitability scores (0-100%) are calculated using customizable weights (Skills: 35%, Salary: 25%, Timeline: 20%, Stability: 20%) while Gemini generates natural-language justification logs for explainability.
