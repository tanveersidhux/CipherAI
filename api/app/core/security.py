"""Security helpers and request validation utilities.

Reserved for subsequent phases (Phase 07 authentication and session verification).
Currently provides sanitization and validation for incoming request identifiers.
"""

import re
import uuid

# Safe request ID pattern: alphanumeric, hyphens, and underscores between 8 and 64 characters
SAFE_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_]{8,64}$")


def sanitize_request_id(incoming_id: str | None) -> str:
    """Validate incoming request ID.

    Accepts only safe alphanumeric/hyphen/underscore strings between 8 and 64 chars.
    Replaces null, empty, invalid, overlong, or newline-containing values with a new UUID4.
    """
    if incoming_id and SAFE_REQUEST_ID_PATTERN.match(incoming_id.strip()):
        return incoming_id.strip()
    return str(uuid.uuid4())
