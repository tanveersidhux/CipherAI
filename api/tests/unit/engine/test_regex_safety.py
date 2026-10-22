"""ReDoS resistance and pathological input timing tests for all engine regexes."""

import contextlib
import time

import pytest

from app.engine.extractors import RE_EMAIL, RE_ETH, RE_PHONE, RE_RAW_URL
from app.engine.message_analyzer import analyze_message
from app.engine.url_validation import parse_and_validate_url

PATTERNS = [
    ("RE_EMAIL", RE_EMAIL),
    ("RE_PHONE", RE_PHONE),
    ("RE_ETH", RE_ETH),
    ("RE_RAW_URL", RE_RAW_URL),
]


@pytest.mark.parametrize("name,pattern", PATTERNS)
def test_regex_pathological_runs_of_same_character(name, pattern):
    pathological = "a" * 5000
    start = time.perf_counter()
    pattern.findall(pathological)
    duration = time.perf_counter() - start
    assert duration < 0.1, f"Pattern {name} suffered slow execution: {duration:.4f}s"


@pytest.mark.parametrize("name,pattern", PATTERNS)
def test_regex_pathological_nested_punctuation(name, pattern):
    pathological = "(([a-z]+)@([a-z]+)\\.([a-z]+))" * 200
    start = time.perf_counter()
    pattern.findall(pathological)
    duration = time.perf_counter() - start
    assert duration < 0.1, f"Pattern {name} suffered slow execution on punctuation: {duration:.4f}s"


def test_url_parser_pathological_slashes_and_dots():
    pathological = "https://example.com" + "/." * 500
    start = time.perf_counter()
    with contextlib.suppress(Exception):
        parse_and_validate_url(pathological)
    duration = time.perf_counter() - start
    assert duration < 0.05, f"URL parser too slow on repeating slashes: {duration:.4f}s"


def test_message_analyzer_pathological_repeated_phrases():
    # Long text with repeated trigger words
    pathological = ("urgent immediate action required within 24 hours " * 100)[:5000]
    start = time.perf_counter()
    analyze_message(pathological, "sms")
    duration = time.perf_counter() - start
    assert duration < 0.2, f"Message analyzer exceeded 200ms target on 5000 chars: {duration:.4f}s"
