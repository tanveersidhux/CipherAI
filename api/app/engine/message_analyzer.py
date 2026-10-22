"""Scam message analyzer evaluating all 21 Phase 01 indicators + additive manipulation rule."""

from app.engine.data_loader import BRAND_DOMAINS, MESSAGE_PHRASE_GROUPS, SHORTENER_DOMAINS
from app.engine.extractors import ExtractedEntities, extract_entities
from app.engine.indicators import TriggeredFinding, registry
from app.engine.normalization import sanitize_observed_value
from app.engine.url_analyzer import analyze_url


def _find_phrase_match(text: str, group_key: str) -> str | None:
    """Check if any phrase in the specified phrase group appears in normalized lowercase text."""
    phrases = MESSAGE_PHRASE_GROUPS.get(group_key, [])
    for phrase in phrases:
        if phrase in text:
            return phrase
    return None


@registry.register_message_rule("MSG_URGENCY_DEADLINE")
def check_urgency_deadline(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "urgency_deadline")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_URGENCY_DEADLINE",
            observed_value=sanitize_observed_value(f"Urgency phrase: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_ACCOUNT_CLOSURE_THREAT")
def check_account_closure(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "account_closure")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_ACCOUNT_CLOSURE_THREAT",
            observed_value=sanitize_observed_value(f"Threat phrase: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_CREDENTIAL_REQUEST")
def check_credential_request(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "credential_request")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_CREDENTIAL_REQUEST",
            observed_value=sanitize_observed_value(f"Request phrase: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_OTP_PIN_REQUEST")
def check_otp_pin_request(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "otp_pin_request")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_OTP_PIN_REQUEST",
            observed_value=sanitize_observed_value(f"OTP lure: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_PAYMENT_GIFT_CARD")
def check_payment_gift_card(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "gift_card")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_PAYMENT_GIFT_CARD",
            observed_value=sanitize_observed_value(f"Gift card mention: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_CRYPTO_PAYMENT")
def check_crypto_payment(text: str, channel: str) -> TriggeredFinding | None:
    # Check for crypto keyword or wallet match
    if "bitcoin" in text or "ethereum" in text or "crypto" in text or "usdt" in text:
        return TriggeredFinding(
            indicator_id="MSG_CRYPTO_PAYMENT",
            observed_value=sanitize_observed_value("Cryptocurrency payment directive detected"),
        )
    return None


@registry.register_message_rule("MSG_PRIZE_LOTTERY_CLAIM")
def check_prize_lottery(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "prize_lottery")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_PRIZE_LOTTERY_CLAIM",
            observed_value=sanitize_observed_value(f"Prize claim: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_BANK_IMPERSONATION")
def check_bank_impersonation(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "bank_impersonation")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_BANK_IMPERSONATION",
            observed_value=sanitize_observed_value(f"Institution: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_DELIVERY_IMPERSONATION")
def check_delivery_impersonation(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "delivery_impersonation")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_DELIVERY_IMPERSONATION",
            observed_value=sanitize_observed_value(f"Courier lure: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_GOV_AGENCY_IMPERSONATION")
def check_gov_impersonation(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "gov_agency_impersonation")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_GOV_AGENCY_IMPERSONATION",
            observed_value=sanitize_observed_value(f"Agency lure: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_TECH_SUPPORT_IMPERSONATION")
def check_tech_support(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "tech_support")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_TECH_SUPPORT_IMPERSONATION",
            observed_value=sanitize_observed_value(f"Tech alert: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_EMBEDDED_SHORT_LINK")
def check_embedded_short_link(text: str, channel: str) -> TriggeredFinding | None:
    for shortener in ("bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd"):
        if shortener in text:
            return TriggeredFinding(
                indicator_id="MSG_EMBEDDED_SHORT_LINK",
                observed_value=sanitize_observed_value(f"Shortener: '{shortener}'"),
            )
    return None


@registry.register_message_rule("MSG_SENDER_DOMAIN_MISMATCH")
def check_sender_domain_mismatch(text: str, channel: str) -> TriggeredFinding | None:
    # Extract URLs from message
    entities = extract_entities(text)
    if not entities.urls:
        return None

    # Check if a known brand or bank is claimed in text
    claimed_brand = None
    for brand in BRAND_DOMAINS:
        if brand in text:
            claimed_brand = brand
            break
    if not claimed_brand:
        if "wells fargo" in text:
            claimed_brand = "wellsfargo"
        elif "bank of america" in text:
            claimed_brand = "bankofamerica"
        elif "chase" in text:
            claimed_brand = "chase"
        elif "usps" in text:
            claimed_brand = "usps"

    if claimed_brand and claimed_brand in BRAND_DOMAINS:
        official_domains = BRAND_DOMAINS[claimed_brand]
        for parsed_url in entities.urls:
            if (
                parsed_url.registrable_domain
                and parsed_url.registrable_domain not in official_domains
                and parsed_url.registrable_domain not in SHORTENER_DOMAINS
            ):
                return TriggeredFinding(
                    indicator_id="MSG_SENDER_DOMAIN_MISMATCH",
                    observed_value=sanitize_observed_value(
                        f"Claims '{claimed_brand}' but links to '{parsed_url.registrable_domain}'"
                    ),
                )
    return None


@registry.register_message_rule("MSG_OFF_PLATFORM_REDIRECT")
def check_off_platform(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "off_platform")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_OFF_PLATFORM_REDIRECT",
            observed_value=sanitize_observed_value(f"Channel shift: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_AUTHORITY_POOR_GRAMMAR")
def check_authority_poor_grammar(text: str, channel: str) -> TriggeredFinding | None:
    # Detect poor grammar paired with official claim
    has_authority = any(
        auth in text
        for auth in ("official", "security department", "account team", "customer support")
    )
    has_grammar_defect = any(
        err in text
        for err in (
            "kindly to inform",
            "do not hesistate",
            "your funds has been",
            "verify your details sir",
        )
    )
    if has_authority and has_grammar_defect:
        return TriggeredFinding(
            indicator_id="MSG_AUTHORITY_POOR_GRAMMAR",
            observed_value=sanitize_observed_value("Grammar defect in authoritative claim"),
        )
    return None


@registry.register_message_rule("MSG_ATTACHMENT_LURE")
def check_attachment_lure(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "attachment_lure")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_ATTACHMENT_LURE",
            observed_value=sanitize_observed_value(f"Attachment directive: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_ADVANCE_FEE_419")
def check_advance_fee(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "advance_fee_419")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_ADVANCE_FEE_419",
            observed_value=sanitize_observed_value(f"Advance-fee theme: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_JOB_OFFER_UNSOLICITED")
def check_job_offer(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "job_offer_unsolicited")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_JOB_OFFER_UNSOLICITED",
            observed_value=sanitize_observed_value(f"Job lure: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_SEXTORTION_BLACKMAIL")
def check_sextortion(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "sextortion")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_SEXTORTION_BLACKMAIL",
            observed_value=sanitize_observed_value(f"Blackmail directive: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_CHARITY_DISASTER_SCAM")
def check_charity_scam(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "charity_disaster")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_CHARITY_DISASTER_SCAM",
            observed_value=sanitize_observed_value(f"Donation lure: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_REFUND_OVERPAYMENT")
def check_refund_overpayment(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "refund_overpayment")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_REFUND_OVERPAYMENT",
            observed_value=sanitize_observed_value(f"Overpayment theme: '{match}'"),
        )
    return None


@registry.register_message_rule("MSG_ANALYZER_MANIPULATION_ATTEMPT")
def check_analyzer_manipulation(text: str, channel: str) -> TriggeredFinding | None:
    match = _find_phrase_match(text, "analyzer_manipulation")
    if match:
        return TriggeredFinding(
            indicator_id="MSG_ANALYZER_MANIPULATION_ATTEMPT",
            observed_value=sanitize_observed_value(f"Instruction directive: '{match}'"),
        )
    return None


def analyze_message(text: str, channel: str) -> tuple[list[TriggeredFinding], ExtractedEntities]:
    """Execute all registered message rules and analyze any extracted links."""
    norm_text = text.lower()
    findings: list[TriggeredFinding] = []

    # 1. Run message rules
    for rule in registry.message_rules.values():
        finding = rule(norm_text, channel)
        if finding:
            findings.append(finding)

    # 2. Extract and analyze embedded URLs
    entities = extract_entities(text)
    for parsed_url in entities.urls:
        url_findings = analyze_url(parsed_url)
        for uf in url_findings:
            # Include strong structural indicators from links if not already present
            if uf.indicator_id in (
                "URL_SUSPICIOUS_TLD",
                "URL_IP_HOST",
                "URL_HOMOGLYPH_PUNYCODE",
            ) and not any(f.indicator_id == uf.indicator_id for f in findings):
                findings.append(uf)

    return findings, entities
