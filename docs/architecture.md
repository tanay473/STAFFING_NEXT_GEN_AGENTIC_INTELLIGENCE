# System Architecture & Design Details

This document outlines the detailed system architecture, core design decisions, agent orchestrations, memory components, and UI structure for the Staffing NBA Platform.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TWO-SIDED UI (React)                        │
│                                                                     │
│   RECRUITER VIEW                      CLIENT PORTAL                 │
│   ┌─────────────────────────┐         ┌─────────────────────────┐  │
│   │ ▸ Priority queue        │         │ ▸ Live pipeline status   │  │
│   │ ▸ Ghosting alerts       │         │ ▸ SLA countdown tracker  │  │
│   │ ▸ Draft outreach        │         │ ▸ Structured feedback    │  │
│   │ ▸ HitL: Approve/Edit/   │         │ ▸ Market insights feed   │  │
│   │         Skip            │         │                          │  │
│   └─────────────────────────┘         └─────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────────────┐
│                        FastAPI Backend                               │
│          Session manager · HitL queue · Event trigger engine        │
│   Fires on: new JD · silence timer · client feedback · schedule     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│              Planner Agent  (LangGraph + ChatGoogleGenerativeAI)     │
│                                                                     │
│  Reads job context → identifies what's missing →                    │
│  sequences agents dynamically → assembles final output              │
└───┬──────────┬────────────┬────────────┬──────────────┬─────────────┘
    │          │            │            │              │
┌───▼───┐ ┌───▼────┐ ┌─────▼────┐ ┌────▼──────┐ ┌────▼──────────┐
│Ingest │ │Retriev.│ │Reasoning │ │Recommend  │ │ Engagement    │
│Agent  │ │Agent   │ │Agent     │ │Agent      │ │ Monitor       │
│       │ │        │ │          │ │           │ │               │
│Parses:│ │Queries:│ │Scores:   │ │Outputs:   │ │ Watches:      │
│· JDs  │ │· Cand. │ │· Skill   │ │· Ranked   │ │ · Silence>48h │
│· PDF  │ │  profls│ │  fit     │ │  shortlst │ │ · Offer ghost │
│· Email│ │· Past  │ │· Avail.  │ │· Action   │ │ · Client cold │
│· Calls│ │  placem│ │  risk    │ │  cards    │ │ · Cand. decay │
│· Feedb│ │· Salary│ │· Budget  │ │· Confid.  │ │               │
│       │ │  benchm│ │  match   │ │  + evid.  │ │ → Fires alerts│
│       │ │· Playbk│ │· Speed   │ │· Draft    │ │   into queue  │
│  ↓    │ │  ↓     │ │  risk ↓  │ │  outreach │ │  ↓            │
│Gemini │ │Gemini  │ │Gemini    │ │  ↓ Gemini │ │ Gemini        │
│extract│ │rerank  │ │score     │ │  generate │ │ classify      │
└───┬───┘ └───┬────┘ └─────┬────┘ └────┬──────┘ └────┬──────────┘
    └─────────┴────────────┴────────────┴──────────────┘
                           │
          ┌────────────────▼───────────────────┐
          │            Memory Layer             │
          │                                    │
          │  Short-term (Redis)                │
          │  · Active job context              │
          │  · Today's outreach status         │
          │  · Current agent state             │
          │                                    │
          │  Long-term (Pinecone)              │
          │  · Past placement outcomes         │
          │  · Recruiter edit patterns         │
          │  · Ghost risk signals              │
          │  · Client preference history       │
          │                                    │
          │  Write-back loop                   │
          │  HitL decisions → embed → store    │
          │  Embeddings via text-embedding-004 │
          └────────────────┬───────────────────┘
                           │
          ┌────────────────▼───────────────────┐
          │           Data Sources             │
          │  SQLite      → CRM, client history │
          │  JSON files  → candidate profiles  │
          │  Pinecone    → playbooks, outcomes │
          │  PyMuPDF     → resume PDF parsing  │
          │  APScheduler → digest + monitor    │
          └────────────────┬───────────────────┘
                           │
          ┌────────────────▼───────────────────┐
          │   Gemini API  (gemini-2.0-flash)   │
          │   via langchain-google-genai        │
          │                                    │
          │  · Ingest    → structured extract  │
          │  · Retrieval → chunk reranking     │
          │  · Reasoning → candidate scoring   │
          │  · Recommend → action card + draft │
          │  · Monitor   → signal classify     │
          │  · Embeddings→ text-embedding-004  │
          └────────────────────────────────────┘
```

---

## 🔑 Key Design Decisions

| Decision | What It Is | Why It Matters |
|---|---|---|
| **Two-sided UI** | Separate recruiter dashboard + client portal | Eliminates the black-hole problem — clients get live visibility instead of silence |
| **Event-driven planner** | Fires on timers, uploads, feedback, silence — not just user clicks | Makes the platform proactive, not reactive |
| **Engagement Monitor** | Background agent running independently of the main pipeline | Catches ghosting and silence signals 24/7 without recruiter action |
| **Structured feedback loop** | Client rejection captured as typed fields, not free text | Enables embedding and memory — vague "not a fit" can't be learned from |
| **Write-back memory** | Every HitL decision embedded into Pinecone | Recommendations get progressively sharper per client and per role type |
| **Configurable business rules** | Thresholds and weights live in `config/business_rules.py` | Swap clients or domains without touching agent code |

---

## 🤖 Agent Component Detail

### 〔1〕 Ingest Agent
**Role:** Transforms unstructured input into a normalized job context object.

**Accepts:**
- PDF resumes and job descriptions (via PyMuPDF)
- Raw text JD input
- Email thread content
- Post-call notes and client feedback forms

**Gemini task:** Structured extraction — outputs a typed JSON object with required skills, budget ceiling, timeline, location constraints, and any stated client preferences.

**Output:** Normalized `JobOrder` and `CandidateProfile` Pydantic objects consumed by all downstream agents.

**SLA trigger:** Automatically starts the 72-hour fulfillment countdown on JD receipt.

---

### 〔2〕 Retrieval Agent
**Role:** Dual-query semantic search across candidate and historical data.

**Query 1 — Candidate search:**
Embeds the extracted role requirements using `text-embedding-004` and queries Pinecone for the top matching candidate profiles by cosine similarity.

**Query 2 — Historical search:**
Retrieves past placements for the same client or same role type, pulling approval/rejection patterns to adjust candidate priority weights before passing to Reasoning.

**Gemini task:** Reranks retrieved chunks by contextual relevance before scoring.

---

### 〔3〕 Reasoning Agent — Interpretability Scorecard
**Role:** Multi-criteria weighted scoring engine. Every score is fully traceable.

| Dimension | Weight | Scoring Method | Risk Flag |
|---|---|---|---|
| **Skill fit** | 35% | Direct overlap of required technical competencies | Missing core skills → `⚠ Skill Gap` tag |
| **Salary fit** | 25% | `min(1.0, Budget / Candidate_Expected)` | Exceeds ceiling → `⚠ Salary Mismatch` tag |
| **Timeline fit** | 20% | Immediate = 100%, 2 weeks = 80%, 4 weeks = 50% | Notice vs start date gap → score drop |
| **Job stability** | 20% | `years_worked / job_switches` over 5 years | < 1.5 yrs avg tenure → `⚠ Flight Risk` tag |

**Gemini task:** Generates natural-language score justifications for every candidate — human-readable evidence that populates the action card.

**Speed risk overlay:** Every candidate also gets a market availability decay score based on how long similar profiles historically stayed active. Surfaces as urgency on the action card.

---

### 〔4〕 Recommendation Agent
**Role:** Assembles the final shortlist and generates all outreach content.

**Outputs per candidate:**
- Overall match score with dimension breakdown
- Top 3 reasons to submit
- Top risk flag to surface to recruiter
- Pre-drafted personalized outreach message
- Confidence level (High / Medium / Low) based on score distribution

**Gemini task:** Generates all natural language — outreach drafts, evidence summaries, rejection message templates for client use.

**HitL gate:** Nothing moves forward without recruiter approval. Recruiter can approve as-is, edit the outreach draft or swap a candidate, or reject with a structured reason that feeds the write-back loop.

---

### 〔5〕 Engagement Monitor Agent
**Role:** Background watchdog running independently on APScheduler. Not part of the main pipeline — fires on its own timer.

**Watches for:**
- `⏱ Candidate silence` — no response from candidate in 48h after outreach
- `👻 Offer ghost` — offer accepted, no follow-up communication in 72h
- `🧊 Client cold` — client hasn't responded to submitted shortlist in 48h
- `📉 Candidate decay` — profile active for 14+ days on open role, market risk rising

**Action:** Injects an alert directly into the recruiter's priority queue with a pre-drafted follow-up message ready for one-click approval.

**Gemini task:** Classifies signal severity and selects the appropriate alert template.

---

## 🧠 Memory Architecture

```
                    ┌─────────────────────────────┐
                    │       Two Memory Tiers       │
                    └──────────┬──────────┬────────┘
                               │          │
              ┌────────────────▼──┐   ┌───▼──────────────────┐
              │  Short-term       │   │  Long-term            │
              │  Redis            │   │  Pinecone             │
              │                   │   │                       │
              │  · Active job ctx │   │  · Placement outcomes │
              │  · Session state  │   │  · Recruiter edits    │
              │  · Today's queue  │   │  · Ghost risk signals │
              │  · Outreach sent  │   │  · Client preferences │
              └───────────────────┘   └───────────┬───────────┘
                                                  │
                                    ┌─────────────▼──────────┐
                                    │     Write-back Loop     │
                                    │                        │
                                    │  HitL approve → embed  │
                                    │  HitL reject  → embed  │
                                    │  + rejection reason    │
                                    │  → stored by client    │
                                    │    + role type tag     │
                                    └────────────────────────┘
```

Every recruiter decision — approval, edit, rejection with reason — gets embedded via `text-embedding-004` and written back into Pinecone. Future Reasoning Agent runs for the same client or role type pull this history and adjust scores accordingly. The platform learns which candidate archetypes each client actually accepts, not just what they say they want in the JD.

---

## 🖥️ Two-Sided UI Detail

### Recruiter Dashboard
The recruiter opens the app each morning to a ranked priority queue — not a blank screen. The Planner Agent's morning digest (fired at 8am by APScheduler) has already processed all open roles and surfaced the most urgent actions.

**Components:**
- `PriorityQueue.jsx` — ranked to-do list with urgency labels and reasons
- `ActionCard.jsx` — per-candidate card with score breakdown, evidence chain, and approve/edit/reject controls
- `GhostingAlerts.jsx` — silence alert banner with one-click follow-up approval
- `OutreachDraft.jsx` — Gemini-generated message, editable before sending
- `CandidateProfile.jsx` — full score breakdown with per-dimension evidence

### Client Portal
The client logs in and sees exactly where their job order sits in the pipeline. No chasing the recruiter. No black hole.

**Components:**
- `PipelineStatus.jsx` — live stage tracker (Sourcing → Shortlist Ready → Submitted → Interview → Placed)
- `SLATracker.jsx` — countdown to promised delivery date with on-track / at-risk / breached status
- `FeedbackForm.jsx` — structured rejection form (skill gap / salary / culture / timeline) — no free text that can't be learned from
- `MarketInsights.jsx` — salary benchmarks and talent availability context for the role
