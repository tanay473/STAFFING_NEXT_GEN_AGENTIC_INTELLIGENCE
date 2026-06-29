# API Reference & WebSocket Events

This document details the REST endpoints and WebSocket events exposed by the FastAPI backend server.

---

## 👔 Recruiter (Admin) Endpoints

### 1. Fetch Priority Queue
- **Endpoint**: `GET /recruiter/queue`
- **Response**:
```json
{
  "action_cards": [
    {
      "id": "CARD-A12",
      "job_id": "JOB-B34",
      "candidate_id": "CAND-001",
      "candidate_name": "Sarah Jenkins",
      "match_score": 92.5,
      "fit_breakdown": {
        "skills": 95,
        "salary": 100,
        "availability": 80,
        "stability": 95
      },
      "reasons": ["Deep React & TypeScript expert", "Expected salary aligns perfectly"],
      "risks": [],
      "outreach_draft": "Hi Sarah, I saw your impressive work at Apex Fintech...",
      "confidence_score": 87.8,
      "evidence_chain": {
        "assessment": "• Technical Alignment (95%): Matches core skills...\\n• Financial Alignment (100%): Expectation is within budget..."
      },
      "status": "Pending"
    }
  ],
  "alerts": [
    {
      "id": "ALERT-001",
      "title": "Client Cold Warning",
      "message": "Vertex Finance has not reviewed Sarah Jenkins in 48 hours.",
      "severity": "warning"
    }
  ]
}
```

### 2. Process Recruiter Action
- **Endpoint**: `POST /recruiter/action`
- **Payload**:
```json
{
  "action_card_id": "CARD-A12",
  "decision": "Approved", 
  "notes": "Excellent cultural fit",
  "edits": "Hi Sarah... updated outreach message..."
}
```
- **Description**: Triggers the long-term write-back worker and broadcasts a WebSocket message if approved.

### 3. Trigger Agentic matching pipeline
- **Endpoint**: `POST /recruiter/digest`
- **Payload**:
```json
{
  "jd_text": "We need a Senior React Developer with 5+ years experience..."
}
```
- **Description**: Ingests raw requirements, runs the cooperative LangGraph agents, updates the queue, and notifies the client portal.

---

## 💼 Client Endpoints

### 1. Fetch Client Dashboard Status
- **Endpoint**: `GET /client/status`
- **Response**:
```json
{
  "job_order": {
    "id": "JOB-B34",
    "client_name": "Vertex Finance",
    "role_name": "Senior React Developer",
    "budget_max": 140000.0,
    "location": "Remote",
    "sla_deadline": "2026-07-02T18:00:00Z"
  },
  "pipeline": [
    {
      "candidate_id": "CAND-001",
      "name": "Sarah Jenkins",
      "role_name": "Senior React Developer",
      "match_score": 92.5,
      "status": "Under Review",
      "reasons": ["Deep React & TypeScript expert"],
      "risks": [],
      "evidence_chain": {
        "assessment": "• Technical Alignment (95%): Matches core skills..."
      }
    }
  ],
  "sla_hours_remaining": 71.5
}
```

### 2. Submit Candidate Feedback
- **Endpoint**: `POST /client/feedback`
- **Payload**:
```json
{
  "job_id": "JOB-B34",
  "candidate_id": "CAND-001",
  "rating": 2,
  "rejection_reason": "salary_mismatch",
  "comments": "Expects $145k which is slightly too high."
}
```

---

## 🔌 WebSocket Events

Clients and recruiters maintain a persistent WebSocket connection at `ws://localhost:8000/ws`.

### 1. Candidate Submitted
- **Sender**: Server (when Recruiter approves a card)
- **Payload**:
```json
{
  "event": "candidate_submitted",
  "job_id": "JOB-B34",
  "candidate_id": "CAND-001",
  "candidate_name": "Sarah Jenkins",
  "role_name": "Senior React Developer",
  "match_score": 92.5,
  "reasons": ["Deep React & TypeScript expert"],
  "risks": [],
  "status": "Submitted",
  "evidence_chain": {
    "assessment": "..."
  }
}
```

### 2. Pipeline Updated
- **Sender**: Server (when a new Job Description is ingested)
- **Payload**:
```json
{
  "event": "pipeline_updated",
  "job_id": "JOB-B34"
}
```
- **Description**: Triggers the frontend to fetch fresh pipeline and job details.
