"""Unit tests for Unicode normalization and adversarial character detection."""

from app.engine.normalization import (
    detect_hidden_characters,
    make_display_preview,
    normalize_text,
    sanitize_observed_value,
    sha256_hex,
)


def test_normalize_plain_text():
    raw = "Hello World"
    norm, anomalies = normalize_text(raw)
    assert norm == "Hello World"
    assert anomalies == []


def test_normalize_nfkc_compatibility():
    # Full-width characters
    raw = "Ｈｅｌｌｏ"
    norm, _ = normalize_text(raw)
    assert norm == "Hello"


def test_strip_c0_controls_except_newline_and_tab():
    raw = "Hello\x00\x07\x1bWorld\nTab:\tEnd"
    norm, anomalies = normalize_text(raw)
    assert norm == "HelloWorld\nTab:\tEnd"
    assert len(anomalies) >= 3


def test_detect_zero_width_characters():
    text = "pay\u200bpal\ufeff.com"
    anomalies = detect_hidden_characters(text)
    assert any("zero-width" in a for a in anomalies)


def test_detect_bidi_controls():
    text = "Click here: \u202e moc.elpmaxe//:sptth"
    anomalies = detect_hidden_characters(text)
    assert any("bidi-control" in a for a in anomalies)


def test_make_display_preview_escapes_hidden_chars():
    text = "test\u202etext\u200b"
    preview = make_display_preview(text, max_len=50)
    assert "\\u202E" in preview
    assert "\\u200B" in preview


def test_make_display_preview_truncation():
    long_text = "A" * 300
    preview = make_display_preview(long_text, max_len=50)
    assert len(preview) == 50
    assert preview.endswith("...")


def test_sanitize_observed_value():
    text = "   multiple    spaces \n and \t tabs   "
    clean = sanitize_observed_value(text)
    assert clean == "multiple spaces and tabs"


def test_sha256_hex():
    h = sha256_hex("test")
    assert h == "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
