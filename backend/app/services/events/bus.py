import asyncio
import logging
import uuid
from typing import Dict, List, Callable, Any
from app.schemas.events import ClinicalEvent, EventPriority

logger = logging.getLogger(__name__)

class ClinicalEventBus:
    """
    Centralized Enterprise Event Bus for Novelle.
    Supports Publish-Subscribe architecture for cross-service communication.
    """

    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.event_queue = asyncio.Queue()

    def subscribe(self, event_type: str, handler: Callable):
        """Register a handler for a specific clinical event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        logger.info(f"New subscriber registered for event: {event_type}")

    async def publish(self, event: ClinicalEvent):
        """Publish an event to the bus for asynchronous processing."""
        await self.event_queue.put(event)
        logger.info(f"Event [{event.event_type}] published by {event.source}")

    async def start_event_loop(self):
        """Background worker to dispatch enqueued events to subscribers."""
        logger.info("📡 Event Bus loop started")
        while True:
            event: ClinicalEvent = await self.event_queue.get()
            try:
                await self.dispatch(event)
            except Exception as e:
                logger.error(f"Dispatch error for event {event.event_id}: {str(e)}")
            finally:
                self.event_queue.task_done()

    async def dispatch(self, event: ClinicalEvent):
        """Execute all registered handlers for the event type."""
        handlers = self.subscribers.get(event.event_type, [])
        if not handlers:
            logger.debug(f"No subscribers for event type: {event.event_type}")
            return

        # Execute handlers in parallel
        tasks = [handler(event) for handler in handlers]
        await asyncio.gather(*tasks)

# Global Event Bus Singleton
event_bus = ClinicalEventBus()

# Utility to create and publish events
async def emit_clinical_event(event_type: str, user_id: int, priority: EventPriority, source: str, payload: Dict[str, Any]):
    event = ClinicalEvent(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        user_id=user_id,
        priority=priority,
        source=source,
        payload=payload
    )
    await event_bus.publish(event)
