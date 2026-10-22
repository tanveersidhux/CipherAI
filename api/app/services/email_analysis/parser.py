"""Safe and bounded email MIME parser protecting against MIME bombs and malformed payloads."""

import email
import re
from email import policy
from email.message import EmailMessage
from typing import Any

MAX_MIME_PARTS = 50
MAX_MIME_DEPTH = 5
MAX_PART_SIZE_BYTES = 1_048_576  # 1 MB
MAX_TOTAL_BODY_BYTES = 2_097_152  # 2 MB


class EmailParseError(Exception):
    """Raised when email parsing encounters unrecoverable structural or safety violations."""

    pass


class BoundedEmailParser:
    """Parses raw email source into structured text bodies and attachment metadata."""

    @classmethod
    def parse_raw(
        cls, raw_email_bytes: bytes
    ) -> tuple[EmailMessage, str, str, list[dict[str, Any]]]:
        """
        Parses raw RFC 822/MIME bytes.
        Returns:
            (message_object, plain_text_body, html_body, attachments_metadata)
        """
        if len(raw_email_bytes) > MAX_TOTAL_BODY_BYTES:
            raise EmailParseError("Email payload exceeds maximum allowed size (2 MB).")

        try:
            msg = email.message_from_bytes(raw_email_bytes, policy=policy.default)
        except Exception as exc:
            raise EmailParseError(f"Failed to parse email message: {exc}") from exc

        plain_parts: list[str] = []
        html_parts: list[str] = []
        attachments: list[dict[str, Any]] = []

        part_count = 0
        total_extracted_bytes = 0

        # Walk through message parts with depth and count bounds
        for part in msg.walk():
            part_count += 1
            if part_count > MAX_MIME_PARTS:
                break

            content_type = part.get_content_type()
            content_disposition = str(part.get_content_disposition() or "").lower()
            filename = part.get_filename()

            # Handle attachments
            if content_disposition == "attachment" or (
                filename and content_disposition != "inline"
            ):
                payload = part.get_payload(decode=True) or b""
                safe_name = cls._sanitize_filename(filename or "unnamed_attachment")
                import hashlib

                sha256_hash = hashlib.sha256(payload).hexdigest()
                is_risky = cls._is_risky_extension(safe_name)
                attachments.append(
                    {
                        "filename": safe_name,
                        "content_type": content_type,
                        "size_bytes": len(payload),
                        "sha256": sha256_hash,
                        "risky_extension": is_risky,
                        "is_executable": is_risky,
                    }
                )
                continue

            # Handle text content
            if content_type == "text/plain":
                try:
                    text = part.get_content()
                    if isinstance(text, str):
                        payload_bytes = len(text.encode("utf-8", errors="replace"))
                        if total_extracted_bytes + payload_bytes <= MAX_TOTAL_BODY_BYTES:
                            plain_parts.append(text[:MAX_PART_SIZE_BYTES])
                            total_extracted_bytes += payload_bytes
                except Exception:
                    pass
            elif content_type == "text/html":
                try:
                    html = part.get_content()
                    if isinstance(html, str):
                        payload_bytes = len(html.encode("utf-8", errors="replace"))
                        if total_extracted_bytes + payload_bytes <= MAX_TOTAL_BODY_BYTES:
                            html_parts.append(html[:MAX_PART_SIZE_BYTES])
                            total_extracted_bytes += payload_bytes
                except Exception:
                    pass

        full_plain = "\n\n".join(plain_parts)
        full_html = "\n\n".join(html_parts)

        return msg, full_plain, full_html, attachments

    @staticmethod
    def _sanitize_filename(filename: str) -> str:
        """Strip control characters, path traversals, and truncate to 255 chars."""
        # Remove control characters and path navigation
        cleaned = re.sub(r"[\x00-\x1f\x7f/\\]", "_", filename).strip()
        cleaned = re.sub(r"^\.+", "", cleaned)
        return cleaned[:255] or "attachment"

    @staticmethod
    def _is_risky_extension(filename: str) -> bool:
        """Check for executable, script, or deceptive double extensions."""
        risky_exts = {
            ".exe",
            ".scr",
            ".bat",
            ".cmd",
            ".vbs",
            ".js",
            ".ps1",
            ".hta",
            ".cpl",
            ".msi",
            ".jar",
            ".wsf",
            ".iso",
            ".img",
            ".vhd",
        }
        lower = filename.lower()
        # Check single extension
        for ext in risky_exts:
            if lower.endswith(ext):
                return True
        # Check double extension e.g. document.pdf.exe, invoice.xlsx.vbs
        parts = lower.split(".")
        return bool(len(parts) >= 3 and any(f".{parts[-1]}" in risky_exts for ext in [parts[-1]]))
