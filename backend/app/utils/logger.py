"""Structured JSON logging matching Next.js implementation."""

import json
import sys
import traceback
from datetime import datetime, timezone
from typing import Any

from app.config import settings


class Logger:
    def __init__(self):
        self.min_level = self._get_min_level()
        self.levels = {"debug": 0, "info": 1, "warn": 2, "error": 3}

    def _get_min_level(self) -> str:
        level = settings.LOG_LEVEL.lower()
        if level in ["debug", "info", "warn", "error"]:
            return level
        return "debug" if settings.DEBUG else "info"

    def _should_log(self, level: str) -> bool:
        return self.levels.get(level, 0) >= self.levels.get(self.min_level, 0)

    def _format_entry(
        self,
        level: str,
        message: str,
        context: dict[str, Any] | None = None,
        error: Exception | None = None,
    ) -> str:
        entry: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": level,
            "message": message,
            "service": "countercart-backend",
        }

        if context:
            entry["context"] = context

        if error:
            entry["error"] = {
                "name": type(error).__name__,
                "message": str(error),
            }
            if settings.DEBUG:
                entry["error"]["stack"] = traceback.format_exc()

        return json.dumps(entry)

    def _output(self, level: str, formatted: str):
        if level in ["error", "warn"]:
            print(formatted, file=sys.stderr)
        else:
            print(formatted)

    def debug(self, message: str, context: dict | None = None):
        if self._should_log("debug"):
            self._output("debug", self._format_entry("debug", message, context))

    def info(self, message: str, context: dict | None = None):
        if self._should_log("info"):
            self._output("info", self._format_entry("info", message, context))

    def warn(
        self, message: str, context: dict | None = None, error: Exception | None = None
    ):
        if self._should_log("warn"):
            self._output("warn", self._format_entry("warn", message, context, error))

    def error(
        self, message: str, context: dict | None = None, error: Exception | None = None
    ):
        if self._should_log("error"):
            self._output("error", self._format_entry("error", message, context, error))


logger = Logger()
