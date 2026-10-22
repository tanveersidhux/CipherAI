"""Catalog of defensive recommended actions tailored by threat level and scan type."""

from app.schemas.threat_report import RecommendedAction, RiskLevel, ScanType

ALL_ACTIONS = [
    RecommendedAction(
        action_id="ACT_DO_NOT_CLICK",
        priority=1,
        text="Do not click, navigate to, or open this link under any circumstances.",
        applies_to_levels=[RiskLevel.HIGH, RiskLevel.CRITICAL],
    ),
    RecommendedAction(
        action_id="ACT_DO_NOT_REPLY_OR_SHARE",
        priority=1,
        text="Do not reply to this message, and never disclose or forward passwords, OTPs, or security PINs.",
        applies_to_levels=[RiskLevel.HIGH, RiskLevel.CRITICAL],
    ),
    RecommendedAction(
        action_id="ACT_VERIFY_OFFICIAL_CHANNEL",
        priority=2,
        text="Independently verify the communication using official contact details retrieved from a trusted bookmark or statement.",
        applies_to_levels=[
            RiskLevel.MEDIUM,
            RiskLevel.HIGH,
            RiskLevel.CRITICAL,
            RiskLevel.INCONCLUSIVE,
        ],
    ),
    RecommendedAction(
        action_id="ACT_CHANGE_PASSWORDS",
        priority=3,
        text="If credentials were submitted, immediately reset your password and enable multi-factor authentication from a secure device.",
        applies_to_levels=[RiskLevel.HIGH, RiskLevel.CRITICAL],
    ),
    RecommendedAction(
        action_id="ACT_CONTACT_BANK",
        priority=4,
        text="If financial information or card numbers were shared, contact your bank immediately to block unauthorized transactions.",
        applies_to_levels=[RiskLevel.CRITICAL],
    ),
    RecommendedAction(
        action_id="ACT_REPORT_PHISHING",
        priority=5,
        text="Report the suspicious message or URL to your email/messaging provider and internal security department.",
        applies_to_levels=[RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL],
    ),
    RecommendedAction(
        action_id="ACT_EXERCISE_CAUTION",
        priority=1,
        text="Continue to exercise standard digital caution. Absence of strong findings does not guarantee safety.",
        applies_to_levels=[RiskLevel.LOW, RiskLevel.INCONCLUSIVE],
    ),
]


def get_recommended_actions(
    scan_type: ScanType, level: RiskLevel, indicator_ids: set[str]
) -> list[RecommendedAction]:
    """Retrieve filtered, prioritized actions for the assessment."""
    actions: list[RecommendedAction] = []
    for action in ALL_ACTIONS:
        if level in action.applies_to_levels:
            if (
                scan_type == ScanType.MESSAGE
                and action.action_id == "ACT_DO_NOT_CLICK"
                and not any("SHORT_LINK" in i or "URL" in i for i in indicator_ids)
            ):
                continue
            if scan_type == ScanType.URL and action.action_id == "ACT_DO_NOT_REPLY_OR_SHARE":
                continue
            actions.append(action)

    # Sort by priority ascending
    actions.sort(key=lambda a: a.priority)
    return actions
