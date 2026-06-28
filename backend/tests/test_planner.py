import pytest
import sys
from pathlib import Path

# Add project root to sys path
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

from backend.agents.planner import planner_app

def test_planner_graph_execution():
    """Verifies that the compiled LangGraph executes from Ingest to Recommendation."""
    initial_state = {
        "job_id": "TEST-JOB-001",
        "job_order": None,
        "raw_input_jd": "We need a Senior React Developer, 5+ years, remote, budget 130000, starting immediately.",
        "raw_input_resumes": None,
        "candidates": [],
        "evaluated_matches": [],
        "logs": [],
        "errors": [],
        "current_step": "Ingest"
    }

    print("Invoking LangGraph Planner...")
    result = planner_app.invoke(initial_state)

    # Asserts
    assert result is not None
    assert result["job_order"] is not None
    assert result["job_order"].role_name == "Senior React Developer"
    assert len(result["candidates"]) > 0
    assert len(result["evaluated_matches"]) > 0
    assert len(result["errors"]) == 0
    
    print("All assertions passed. Planner ran from Ingest to Recommendation successfully!")

if __name__ == "__main__":
    test_planner_graph_execution()
