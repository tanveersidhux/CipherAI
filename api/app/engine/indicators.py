"""Indicator rule interface and registration system."""

from collections.abc import Callable
from dataclasses import dataclass
from typing import Protocol

from app.engine.scoring_config import CATALOG
from app.engine.url_validation import ParsedUrl


@dataclass(frozen=True)
class TriggeredFinding:
    """Represents a triggered finding emitted by an analysis rule."""

    indicator_id: str
    observed_value: str | None
    points_override: int | None = None
    custom_reason: str | None = None


class UrlRule(Protocol):
    def __call__(self, parsed: ParsedUrl) -> TriggeredFinding | None: ...


class MessageRule(Protocol):
    def __call__(self, text: str, channel: str) -> TriggeredFinding | None: ...


class IndicatorRegistry:
    """Central registry preventing duplicate registrations and validating catalog definitions."""

    def __init__(self) -> None:
        self._url_rules: dict[str, Callable] = {}
        self._message_rules: dict[str, Callable] = {}

    def register_url_rule(self, indicator_id: str) -> Callable:
        """Decorator to register a URL indicator rule."""
        if indicator_id not in CATALOG:
            raise KeyError(f"Indicator '{indicator_id}' is not defined in CATALOG.")
        if indicator_id in self._url_rules:
            raise ValueError(f"URL rule '{indicator_id}' is already registered.")

        def decorator(func: Callable) -> Callable:
            self._url_rules[indicator_id] = func
            return func

        return decorator

    def register_message_rule(self, indicator_id: str) -> Callable:
        """Decorator to register a Message indicator rule."""
        if indicator_id not in CATALOG:
            raise KeyError(f"Indicator '{indicator_id}' is not defined in CATALOG.")
        if indicator_id in self._message_rules:
            raise ValueError(f"Message rule '{indicator_id}' is already registered.")

        def decorator(func: Callable) -> Callable:
            self._message_rules[indicator_id] = func
            return func

        return decorator

    @property
    def url_rules(self) -> dict[str, Callable]:
        return dict(self._url_rules)

    @property
    def message_rules(self) -> dict[str, Callable]:
        return dict(self._message_rules)


registry = IndicatorRegistry()
