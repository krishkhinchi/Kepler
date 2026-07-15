"""Contributor-friendly debug logs (issue #29)."""

from __future__ import annotations

import logging
import os
from typing import Any

_LOGGER = logging.getLogger("kepler.debug")


def debug(msg: str, **fields: Any) -> None:
    """Emit a structured debug line when KEPLER_DEBUG=1 (or DEBUG=1)."""
    flag = os.environ.get("KEPLER_DEBUG") or os.environ.get("DEBUG")
    if not flag or flag in {"0", "false", "False"}:
        return
    if fields:
        extra = " ".join(f"{k}={v!r}" for k, v in fields.items())
        _LOGGER.debug("%s | %s", msg, extra)
    else:
        _LOGGER.debug("%s", msg)


def configure_debug_logging() -> None:
    if not _LOGGER.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[kepler-debug] %(message)s"))
        _LOGGER.addHandler(handler)
    _LOGGER.setLevel(logging.DEBUG)
