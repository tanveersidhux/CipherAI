"""Consistency test verifying engine indicator catalog against Phase 01 specification."""

import os
import re

from app.engine.scoring_config import CATALOG

SPEC_PATH = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "..",
    "..",
    "docs",
    "architecture",
    "risk-scoring-spec.md",
)


def parse_indicators_from_spec():
    with open(SPEC_PATH, encoding="utf-8") as f:
        content = f.read()

    # Regex matching Markdown table rows:
    # | `URL_IP_HOST` | `domain` | `observed` | `high` | 35 | 45 | ...
    pattern = re.compile(
        r"\|\s*`([A-Z0-9_]+)`\s*\|\s*`([a-z_]+)`\s*\|\s*`([a-z_]+)`\s*\|\s*`([a-z_]+)`\s*\|\s*(\d+)\s*\|"
    )

    spec_indicators = {}
    for match in pattern.finditer(content):
        ind_id, cat, evidence, severity, points = match.groups()
        spec_indicators[ind_id] = {
            "category": cat,
            "evidence_kind": evidence,
            "severity": severity,
            "points": int(points),
        }
    return spec_indicators


def test_registry_matches_spec():
    spec_indicators = parse_indicators_from_spec()
    assert len(spec_indicators) >= 46  # 26 URL + 20/21 message indicators in spec table

    for ind_id, spec_data in spec_indicators.items():
        assert ind_id in CATALOG, f"Indicator '{ind_id}' in spec is missing from engine CATALOG."
        defn = CATALOG[ind_id]
        assert defn.category.value == spec_data["category"], f"Category mismatch on {ind_id}"
        assert defn.evidence_kind.value == spec_data["evidence_kind"], (
            f"EvidenceKind mismatch on {ind_id}"
        )
        assert defn.severity.value == spec_data["severity"], f"Severity mismatch on {ind_id}"
        assert defn.default_points == spec_data["points"], f"Points mismatch on {ind_id}"


def test_no_rogue_indicators_in_engine():
    spec_indicators = parse_indicators_from_spec()
    for ind_id in CATALOG:
        if ind_id == "MSG_ANALYZER_MANIPULATION_ATTEMPT":
            # Documented additive indicator per ADR-0008
            continue
        assert ind_id in spec_indicators, f"Indicator '{ind_id}' in engine is not in Phase 01 spec."
