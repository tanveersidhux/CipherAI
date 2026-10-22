"""Unit tests for Phase 08 batch scanning service and input validation."""

from app.services.batch_service import parse_and_validate_batch_inputs


def test_batch_input_parsing_and_rejections():
    """Verify URL list and CSV parsing rejects malformed lines and enforces limits."""
    raw_urls = [
        "https://example.com/one",
        "https://example.com/one",  # Duplicate
        "not_a_valid_url",  # Malformed
        "http://test.com/two",  # Valid
    ]
    valid_urls, rejections = parse_and_validate_batch_inputs(
        urls=raw_urls, csv_text=None, max_items=25
    )
    assert len(valid_urls) == 2
    assert "https://example.com/one" in valid_urls
    assert "http://test.com/two" in valid_urls
    assert len(rejections) == 2
    assert any("duplicate" in r.reason.lower() for r in rejections)
    assert any("invalid" in r.reason.lower() for r in rejections)


def test_batch_csv_text_parsing():
    """Verify CSV string input parsing."""
    csv_text = "https://alpha.com\nhttps://beta.com\n"
    valid_urls, rejections = parse_and_validate_batch_inputs(
        urls=None, csv_text=csv_text, max_items=25
    )
    assert len(valid_urls) == 2
    assert "https://alpha.com" in valid_urls
    assert "https://beta.com" in valid_urls
    assert len(rejections) == 0


def test_batch_max_items_limit():
    """Verify batch inputs exceeding max_items are capped/rejected."""
    urls = [f"https://example{i}.com" for i in range(30)]
    valid_urls, rejections = parse_and_validate_batch_inputs(urls=urls, csv_text=None, max_items=10)
    assert len(valid_urls) == 10
    assert len(rejections) == 20
    assert all("limit" in r.reason.lower() for r in rejections)
