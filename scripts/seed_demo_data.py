#!/usr/bin/env python3
"""Seed clearly labeled demonstration data for hackathon demonstrations.

Idempotent and easily removable. Does not run automatically.
"""

import argparse
import sys
from pathlib import Path

# Add api directory to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir / "api"))

from app.repositories import get_case_repository, get_note_repository, get_scan_repository
from app.schemas.scans import MessageScanRequest, UrlScanRequest
from app.services.scan_service import scan_message, scan_url


def seed_demo_data(user_id: str) -> None:
    print(f"Seeding demo data for user: {user_id}")
    scan_repo = get_scan_repository()
    case_repo = get_case_repository()
    note_repo = get_note_repository()

    from app.core.config import get_settings
    settings = get_settings()

    # 1. High-risk phishing URL scan
    phish_report = scan_url(
        UrlScanRequest(url="https://secure-login.chase-verification-alert.com/signin"),
        settings=settings,
    )
    s1_id = scan_repo.save_scan(
        user_id=user_id,
        report=phish_report,
        title="[DEMO] Suspected Banking Credential Phish",
        is_pinned=True,
        tags=["demo", "phishing", "banking"],
    )

    # 2. Urgent scam SMS message scan
    msg_report = scan_message(
        MessageScanRequest(
            message="FINAL NOTICE: Your parcel delivery is suspended due to unpaid customs fee of $2.95. Click http://usps-tracking-parcel-redelivery.org to avoid return to sender.",
            channel="sms",
        ),
        settings=settings,
    )
    s2_id = scan_repo.save_scan(
        user_id=user_id,
        report=msg_report,
        title="[DEMO] Postal Impersonation Scam SMS",
        is_pinned=False,
        tags=["demo", "sms-scam", "courier"],
    )

    # 3. Create demo case grouping the scans
    case = case_repo.create_case(
        user_id=user_id,
        title="[DEMO] Case #1042 - Multi-Vector Impersonation Attack",
        description="Investigation grouping coordinated SMS parcel scam and bank phishing lures targeting enterprise staff.",
        priority="high",
        scan_ids=[s1_id, s2_id],
    )

    # 4. Add initial case notes
    note_repo.add_note(
        user_id=user_id,
        case_id=case.id,
        body="Initial threat intake confirmed typosquat domain registered 48 hours ago using anonymous registrar.",
    )
    note_repo.add_note(
        user_id=user_id,
        case_id=case.id,
        body="Sender phone prefix traces to VOIP carrier with history of mass smishing abuse.",
    )

    print(f"✅ Demo seed complete! Created 2 scans and Case '{case.title}' ({case.id}).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data for a user UUID.")
    parser.add_argument("--user-id", required=True, help="Target user UUID")
    args = parser.parse_args()

    seed_demo_data(args.user_id)


if __name__ == "__main__":
    main()
