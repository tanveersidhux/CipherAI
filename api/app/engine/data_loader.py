"""Data loader for curated threat lists with strict validation."""

import json
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load_json(filename: str) -> dict:
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"Required curated data file not found: {path}")
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    # Check mandatory metadata fields
    for field in ("version", "last_reviewed", "description", "maintenance_notes"):
        if field not in data:
            raise ValueError(f"Data file '{filename}' missing metadata field '{field}'.")
    return data


# Load and validate brands
_brands_raw = _load_json("brands.json")
if "brands" not in _brands_raw or not isinstance(_brands_raw["brands"], dict):
    raise ValueError("brands.json must contain a 'brands' dictionary.")
BRAND_DOMAINS: dict[str, list[str]] = {
    k.lower(): [d.lower() for d in v] for k, v in _brands_raw["brands"].items()
}

# Load and validate shorteners
_shorteners_raw = _load_json("shorteners.json")
if "domains" not in _shorteners_raw or not isinstance(_shorteners_raw["domains"], list):
    raise ValueError("shorteners.json must contain a 'domains' list.")
SHORTENER_DOMAINS: set[str] = {d.lower() for d in _shorteners_raw["domains"]}

# Load and validate suspicious TLDs
_tlds_raw = _load_json("suspicious_tlds.json")
if "tlds" not in _tlds_raw or not isinstance(_tlds_raw["tlds"], list):
    raise ValueError("suspicious_tlds.json must contain a 'tlds' list.")
SUSPICIOUS_TLDS: set[str] = {t.lower().lstrip(".") for t in _tlds_raw["tlds"]}

# Load and validate URL keywords
_keywords_raw = _load_json("url_keywords.json")
for key in ("credential_keywords", "open_redirect_params", "suspicious_query_params"):
    if key not in _keywords_raw or not isinstance(_keywords_raw[key], list):
        raise ValueError(f"url_keywords.json missing list '{key}'.")
CREDENTIAL_KEYWORDS: set[str] = {k.lower() for k in _keywords_raw["credential_keywords"]}
OPEN_REDIRECT_PARAMS: set[str] = {p.lower() for p in _keywords_raw["open_redirect_params"]}
SUSPICIOUS_QUERY_PARAMS: set[str] = {p.lower() for p in _keywords_raw["suspicious_query_params"]}

# Load and validate message phrases
_phrases_raw = _load_json("message_phrases.json")
if "phrase_groups" not in _phrases_raw or not isinstance(_phrases_raw["phrase_groups"], dict):
    raise ValueError("message_phrases.json must contain 'phrase_groups'.")
MESSAGE_PHRASE_GROUPS: dict[str, list[str]] = {
    k: [p.lower() for p in v] for k, v in _phrases_raw["phrase_groups"].items()
}
