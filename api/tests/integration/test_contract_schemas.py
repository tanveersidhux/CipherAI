"""JSON Schema contract conformance tests validating API responses against Phase 01 schemas."""

import json
import os

import jsonschema
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.rate_limit import rate_limiter
from app.main import create_app

SCHEMAS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "docs", "api", "schemas")


def load_schema(schema_name: str) -> dict:
    path = os.path.join(SCHEMAS_DIR, schema_name)
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def test_threat_report_schema_conformance():
    report_schema = load_schema("threat-report.schema.json")
    indicator_schema = load_schema("indicator.schema.json")
    score_schema = load_schema("score-contribution.schema.json")
    evidence_schema = load_schema("external-evidence.schema.json")
    ai_schema = load_schema("ai-explanation.schema.json")
    action_schema = load_schema("recommended-action.schema.json")

    from referencing import Registry, Resource
    from referencing.jsonschema import DRAFT202012

    schema_registry = {
        "indicator.schema.json": indicator_schema,
        "score-contribution.schema.json": score_schema,
        "external-evidence.schema.json": evidence_schema,
        "ai-explanation.schema.json": ai_schema,
        "recommended-action.schema.json": action_schema,
    }

    resources = [
        (name, Resource.from_contents(schema, default_specification=DRAFT202012))
        for name, schema in schema_registry.items()
    ]
    registry = Registry().with_resources(resources)
    validator = jsonschema.Draft202012Validator(report_schema, registry=registry)

    # Call endpoint and validate live response
    client = TestClient(create_app(Settings()))
    rate_limiter.reset()

    res = client.post(
        "/api/v1/scans/url", json={"url": "https://chase-security.online-banking-portal.top/login"}
    )
    assert res.status_code == 200
    report_data = res.json()

    # Validate against JSON schema
    validator.validate(report_data)


def test_error_envelope_schema_conformance():
    envelope_schema = load_schema("error-envelope.schema.json")
    validator = jsonschema.Draft202012Validator(envelope_schema)

    client = TestClient(create_app(Settings()))
    rate_limiter.reset()

    # Trigger 422 error
    res = client.post("/api/v1/scans/url", json={"url": "javascript:void(0)"})
    assert res.status_code == 422
    err_data = res.json()

    # Validate against JSON schema
    validator.validate(err_data)
