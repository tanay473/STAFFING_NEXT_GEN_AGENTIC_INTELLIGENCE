import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.api.recruiter_routes import router as recruiter_router
from backend.api.client_routes import router as client_router
from backend.api.ingest_routes import router as ingest_router
from backend.api.websocket import ws_manager
from backend.scheduler.digest_scheduler import app_scheduler, simulate_morning_digest

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

app = FastAPI(
    title="Staffing NBA Platform API",
    description="Agentic next-best-action staffing recommendation and HitL matching system.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for demo
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register personas API routes
app.include_router(recruiter_router)
app.include_router(client_router)
app.include_router(ingest_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting FastAPI application...")
    # Add background monitoring jobs to the scheduler
    app_scheduler.add_job(simulate_morning_digest, interval_seconds=3600)  # Hourly digest simulation
    app_scheduler.start()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Stopping FastAPI application...")
    app_scheduler.stop()

@app.get("/")
def read_root():
    return {"name": "Staffing NBA Platform API", "status": "online"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Client Portal live state synchronization stream."""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive heartbeats if any
            data = await websocket.receive_text()
            logger.info(f"Received WS message: {data}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        ws_manager.disconnect(websocket)
