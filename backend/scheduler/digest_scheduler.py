import time
import logging
import threading
from typing import Callable

logger = logging.getLogger("scheduler")

class ProactiveScheduler:
    def __init__(self):
        self.scheduler_thread = None
        self._stop_event = threading.Event()
        self.jobs = []

    def add_job(self, func: Callable, interval_seconds: int):
        self.jobs.append((func, interval_seconds))

    def _loop(self):
        logger.info("Proactive Scheduler loop started.")
        last_run = {i: 0.0 for i in range(len(self.jobs))}
        
        while not self._stop_event.is_set():
            now = time.time()
            for idx, (func, interval) in enumerate(self.jobs):
                if now - last_run[idx] >= interval:
                    try:
                        logger.info(f"Scheduler executing scheduled job: {func.__name__}")
                        func()
                    except Exception as e:
                        logger.error(f"Scheduler job error in {func.__name__}: {e}")
                    last_run[idx] = now
            # Sleep in short increments to allow fast shutdown
            time.sleep(1.0)

    def start(self):
        """Starts background thread scheduler."""
        # Fallback thread logic
        self._stop_event.clear()
        self.scheduler_thread = threading.Thread(target=self._loop, daemon=True)
        self.scheduler_thread.start()
        logger.info("Scheduler started background thread.")

    def stop(self):
        self._stop_event.set()
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=2.0)
            logger.info("Scheduler stopped.")

# Singleton scheduler
app_scheduler = ProactiveScheduler()

def simulate_morning_digest():
    logger.info("[Scheduler] Checking active shortlists. Generating daily morning digest...")
    # This can update active Redis session queues or send logs
