import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add project root to sys path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.main import app

client = TestClient(app)

def test_recruiter_digest_endpoint():
    """Tests the /recruiter/digest endpoint with a mock JD."""
    payload = {
        "jd_text": "We need a Senior React Developer, 5+ years, remote, budget 130000, starting immediately."
    }
    
    print("Sending POST request to /recruiter/digest...")
    response = client.post("/recruiter/digest", json=payload)
    
    print(f"Response Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "job_order" in response.json()
    assert len(response.json()["recommendations"]) > 0

def test_rejection_draft_endpoint():
    """Tests the /recruiter/draft-rejection endpoint."""
    payload = {
        "candidate_name": "Test Candidate",
        "role_name": "Test Developer",
        "client_name": "Test Client",
        "reason": "overqualified",
        "comments": "very experienced candidate"
    }
    response = client.post("/recruiter/draft-rejection", json=payload)
    print(f"Rejection Draft Response Code: {response.status_code}")
    print(f"Rejection Draft Response JSON: {response.json()}")
    assert response.status_code == 200
    assert "rejection_draft" in response.json()
    assert len(response.json()["rejection_draft"]) > 0

def test_client_status_endpoint():
    """Tests the /client/status endpoint."""
    response = client.get("/client/status")
    print(f"Client Status Response Code: {response.status_code}")
    print(f"Client Status Response JSON: {response.json()}")
    assert response.status_code == 200
    assert "pipeline" in response.json()

def test_resume_upload_endpoint():
    """Tests the /ingest/upload/resume endpoint."""
    file_payload = {
        "file": ("test_resume.pdf", b"%PDF-1.4 mock resume content. Elena Rostova, elena.r@email.com, 555-0103. React, Jest. expected salary: 115000", "application/pdf")
    }
    response = client.post("/ingest/upload/resume", files=file_payload)
    print(f"Resume Upload Response Code: {response.status_code}")
    print(f"Resume Upload Response JSON: {response.json()}")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert "candidate_id" in response.json()
    assert "parsed_profile" in response.json()

if __name__ == "__main__":
    test_recruiter_digest_endpoint()
    test_rejection_draft_endpoint()
    test_client_status_endpoint()
    test_resume_upload_endpoint()
