"""Tests proving that the engine makes zero network calls and imports no network clients."""

import importlib
import pkgutil
import socket

import pytest

import app.engine
from app.engine.message_analyzer import analyze_message
from app.engine.url_analyzer import analyze_url
from app.engine.url_validation import parse_and_validate_url

FORBIDDEN_MODULES = {"httpx", "urllib.request", "requests", "aiohttp"}


@pytest.fixture(autouse=True)
def block_network_sockets(monkeypatch):
    """Ensure any network socket creation or DNS resolution raises an exception."""

    def raise_on_socket(*args, **kwargs):
        raise RuntimeError("Prohibited network socket creation detected in security engine!")

    monkeypatch.setattr(socket, "socket", raise_on_socket)
    monkeypatch.setattr(socket, "getaddrinfo", raise_on_socket)


def test_engine_modules_do_not_import_network_libraries():
    """Inspect all modules in app.engine and assert no network client libraries are imported."""
    package = app.engine
    for _, modname, _ in pkgutil.iter_modules(package.__path__):
        full_name = f"app.engine.{modname}"
        mod = importlib.import_module(full_name)
        imported = dir(mod)
        for forbidden in FORBIDDEN_MODULES:
            assert forbidden not in imported, (
                f"Module {full_name} imports forbidden network library '{forbidden}'"
            )


def test_url_analysis_runs_with_blocked_sockets():
    """Execute complete URL parsing and analysis under active socket block."""
    parsed = parse_and_validate_url(
        "https://sub.chase-login.example.com/verify?next=http://phish.top"
    )
    findings = analyze_url(parsed)
    assert len(findings) > 0


def test_message_analysis_runs_with_blocked_sockets():
    """Execute message extraction and analysis under active socket block."""
    text = "Wells Fargo Alert: Please visit http://bit.ly/update immediately."
    findings, _ = analyze_message(text, "sms")
    assert len(findings) > 0
