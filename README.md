# Staffing NBA Platform: Agentic Next-Gen Recruitment Intelligence

An advanced, human-in-the-loop (HitL) talent acquisition platform powered by a **LangGraph state machine** and **Google Gemini API**. The system ingests job descriptions (JDs) via text or PDF, queries CRM and vector databases, scores candidates across multi-criteria matrices, drafts outreach playbooks, and monitors response timelines to prevent ghosting.

---

## ─── SYSTEM ARCHITECTURE ───

```
                      ┌──────────────────────────────────────┐
                      │          React Frontend UI           │
                      │   (Recruiter Queue & Client Portal)  │
                      └──────────┬─────────────────▲─────────┘
                                 │ HTTP POST       │ WebSockets
                                 │ (JD / Upload)   │ (Alerts/Updates)
                                 ▼                 │
                      ┌────────────────────────────┴─────────┐
                      │          FastAPI Backend             │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │    LangGraph State Machine (Planner)  │
                     └───────────────────┬───────────────────┘
                                         │
       ┌────────────────────┬────────────┴───────┬────────────────────┐
       │ (Step 1)           │ (Step 2)           │ (Step 3)           │ (Step 4)
       ▼                    ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Ingest Agent │ ──> │  Retrieval   │ ──> │  Reasoning   │ ──> │Recommend-    │
│ (PyMuPDF /   │     │  Agent       │     │  Agent       │     │  ation Agent │
│ JD Extractor)│     │ (Dual-Query) │     │ (Scorecard)  │     │ (Outreach)   │
└──────────────┘     └──────┬───────┘     └──────────────┘     └──────┬───────┘
                            │                                         │
                            ▼                                         ▼
               ┌─────────────────────────┐               ┌─────────────────────────┐
               │    Local SQL + Vector   │               │    Recruiter Feedback   │
               │  (SQLite & Cosine Sim)  │               │   Closed-loop Learning  │
               └─────────────────────────┘               └─────────────────────────┘
```

---

## ─── CORE AGENTIC COMPONENTS ───

### 1. Ingestion Agent
*   **Role**: Extracts structured parameters from unstructured requirements.
*   **Mechanisms**: Parses uploaded PDF files using `PyMuPDF` or takes plain text input. Extracts key technical skills, target budget ceiling, location parameters, and timeline urgency.
*   **SLA Trigger**: Automatically configures and initiates a 72-hour fulfillment countdown window.

### 2. Retrieval Agent
*   **Role**: Performs semantic dual-queries across databases.
*   **Mechanisms**: Matches the target job order requirements against candidate profiles in SQLite. In parallel, retrieves historical client preference vectors (placements, approvals, and rejections) to adjust candidates' priority weights.

### 3. Reasoning Agent (Interpretability Scorecard)
*   **Role**: Evaluates matches across a weighted scorecard.
*   **Evaluation Matrices**:
    *   **Skill Overlap (35% weight)**: Measures the percentage of matching required technical competencies.
    *   **Budget Alignment (25% weight)**: Scores candidate salary requirements against the maximum client budget ceiling.
    *   **Availability Timeline (20% weight)**: Matches target start dates with the candidate's notice period.
    *   **Job Retention Stability (20% weight)**: Flags historical attrition risk by identifying candidates with frequent short-term employments.

### 4. Recommendation Agent
*   **Role**: Assembles final recommendations.
*   **Mechanisms**: Selects the top 3 scoring profiles, populates interactive candidate submission cards with evidence explanations, and writes personalized outreach message drafts using the Gemini API.

### 5. Engagement Monitor
*   **Role**: Monitors timeline health in the background.
*   **Mechanisms**: Runs background scheduling loops to detect silence thresholds (ghosting) and raises system notification alerts for the agency recruiter.

---

## ─── DETAILED SCORECARD INTERPRETABILITY ───

The platform utilizes a structured scorecard calculation within the **Reasoning Agent** to calculate candidate alignment:

| Dimension | Weight | Scoring Metric | Flags / Adjustments |
| :--- | :--- | :--- | :--- |
| **Skills Fit** | 35% | Direct overlap of technical skills (e.g. React, Redux, TypeScript) | Missing nice-to-haves penalizes score minimally, but missing core requirements raises warning tags. |
| **Salary Fit** | 25% | Linear calculation of `min(1.0, Budget / Candidate_Expected)` | If expected compensation exceeds target budget limits, it triggers a `Salary Mismatch` risk tag. |
| **Timeline Fit** | 20% | Scored based on availability (Immediate = 100%, 2 Weeks = 80%, 4 Weeks = 50%) | A mismatch between the client's start date and the candidate's notice period drops the score. |
| **Job Stability** | 20% | Calculated as `years_worked / job_switches` over the past 5 years | A tenure average of less than 1.5 years per role triggers an `Attrition / Flight Risk` warning tag. |

---

## ─── TECHNOLOGY STACK ───

### Backend Persona Layer
*   **FastAPI**: High-performance REST API routing.
*   **LangGraph / LangChain**: Handles agent-routing state graphs.
*   **Google Gemini API**: Generates matches, score analyses, personalized outreach copy, and dynamic candidate rejection messages.
*   **SQLite**: Local relational store for candidate records and feedback logs.
*   **Pinecone / Vector Fallback**: Local semantic cosine-similarity fallback for embedding match metrics.

### Frontend Dashboard Layer
*   **React (Vite)**: Glassmorphic interactive workspace.
*   **React Router v6**: Dynamic, parameterized tab sub-routing (`/recruiter/:tab?`, `/client/:tab?`).
*   **Lucide React**: Clean typography and activity iconography.
*   **Framer Motion**: Smooth micro-animations, fade-ins, and step progress transitions.

---

## ─── RUNNING THE APPLICATION ───

### 1. Backend Server Setup
1.  Navigate to the `backend/` directory.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Configure your credentials in `.env`:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    ```
4.  Launch the FastAPI server:
    ```bash
    uvicorn backend.main:app --host 127.0.0.1 --port 8000
    ```

### 2. Frontend React Setup
1.  Navigate to the `frontend/` directory.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Launch the development server:
    ```bash
    npm run dev -- --port 3000
    ```
4.  Open `http://localhost:3000` in your web browser.
