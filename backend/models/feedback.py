from pydantic import BaseModel, Field
from typing import Optional

class Feedback(BaseModel):
    id: str = Field(..., description="Unique feedback record ID")
    job_id: str = Field(..., description="Job ID this feedback relates to")
    candidate_id: str = Field(..., description="Candidate evaluated")
    rating: int = Field(..., description="Rating score (1 to 5 stars)")
    rejection_reason: Optional[str] = Field(None, description="Selectable reason: overqualified, underqualified, salary mismatch, communication, stability, other")
    comments: str = Field(..., description="Additional text comments from recruiter or client")
    created_at: str = Field(..., description="Feedback creation timestamp")
