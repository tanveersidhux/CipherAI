"""Tests ensuring no output text or template claims absolute safety."""

import re

from app.ai.fallback import build_deterministic_explanation
from app.engine.actions import ALL_ACTIONS
from app.engine.scoring_config import CATALOG, MANDATORY_LOW_LIMITATION

FORBIDDEN_PHRASES = [
    r"this link is safe",
    r"this message is safe",
    r"100%\s*safe",
    r"100\s*percent\s*safe",
    r"no threat",
    r"guaranteed safe",
    r"completely safe",
    r"totally safe",
    r"is verified safe",
]


def check_for_forbidden_phrases(text: str):
    for pattern in FORBIDDEN_PHRASES:
        match = re.search(pattern, text, re.IGNORECASE)
        assert match is None, f"Forbidden phrase pattern '{pattern}' found in text: '{text}'"


def test_catalog_titles_and_descriptions_safe():
    for defn in CATALOG.values():
        check_for_forbidden_phrases(defn.title)
        check_for_forbidden_phrases(defn.description)


def test_recommended_actions_wording_safe():
    for action in ALL_ACTIONS:
        check_for_forbidden_phrases(action.text)


def test_mandatory_low_limitation_wording():
    assert "This does not guarantee that the content is safe." in MANDATORY_LOW_LIMITATION
    check_for_forbidden_phrases(MANDATORY_LOW_LIMITATION)


def test_deterministic_explanation_templates_safe():
    for level in ("low", "medium", "high", "critical", "inconclusive"):
        exp = build_deterministic_explanation(
            {"risk_level": level, "risk_score": 10 if level == "low" else 80},
            indicators=[],
        )
        check_for_forbidden_phrases(exp.summary)
        check_for_forbidden_phrases(exp.user_guidance)
        check_for_forbidden_phrases(exp.uncertainty_notes)
