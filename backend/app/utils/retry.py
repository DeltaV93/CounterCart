"""Retry utility with exponential backoff."""

import asyncio
import random
from typing import TypeVar, Callable, Awaitable

from app.utils.logger import logger

T = TypeVar("T")


async def with_retry(
    func: Callable[[], Awaitable[T]],
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
) -> T:
    """
    Execute async function with exponential backoff retry.

    Args:
        func: Async function to execute
        max_attempts: Maximum number of attempts
        base_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        exponential_base: Multiplier for each retry
    """
    last_exception: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        try:
            return await func()
        except Exception as e:
            last_exception = e

            if attempt == max_attempts:
                logger.error(
                    "Max retry attempts reached",
                    {"attempts": attempt, "error": str(e)},
                    e,
                )
                raise

            # Calculate delay with jitter
            delay = min(base_delay * (exponential_base ** (attempt - 1)), max_delay)
            jitter = delay * 0.1 * (random.random() * 2 - 1)  # +/- 10%
            delay += jitter

            logger.warn(
                "Retrying after error",
                {"attempt": attempt, "delay": round(delay, 2), "error": str(e)},
            )

            await asyncio.sleep(delay)

    # Should never reach here, but satisfy type checker
    if last_exception:
        raise last_exception
    raise RuntimeError("Unexpected retry state")
