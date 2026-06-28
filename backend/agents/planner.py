import logging
from langgraph.graph import StateGraph, END
from backend.models.agent_state import AgentState
from backend.agents.ingest_agent import run_ingest_agent
from backend.agents.retrieval_agent import run_retrieval_agent
from backend.agents.reasoning_agent import run_reasoning_agent
from backend.agents.recommendation_agent import run_recommendation_agent

logger = logging.getLogger("planner")

def create_planner_graph():
    """Compiles the LangGraph StateGraph mapping state routing between agent nodes."""
    logger.info("Initializing LangGraph Planner StateGraph...")
    
    # Define workflow with shared state schema
    workflow = StateGraph(AgentState)
    
    # Register agents
    workflow.add_node("ingest", run_ingest_agent)
    workflow.add_node("retrieval", run_retrieval_agent)
    workflow.add_node("reasoning", run_reasoning_agent)
    workflow.add_node("recommendation", run_recommendation_agent)
    
    # Linear execution flow
    workflow.set_entry_point("ingest")
    workflow.add_edge("ingest", "retrieval")
    workflow.add_edge("retrieval", "reasoning")
    workflow.add_edge("reasoning", "recommendation")
    workflow.add_edge("recommendation", END)
    
    # Compile execution graph
    compiled_app = workflow.compile()
    logger.info("LangGraph Planner StateGraph compiled successfully.")
    return compiled_app

# Singleton instance
planner_app = create_planner_graph()
