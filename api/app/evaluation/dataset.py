"""Ground-truth labeled evaluation benchmark dataset for CIPHER AI.

Used for offline regression testing, scan quality evaluation, and measuring
false positive / false negative rates with strict safety constraints.
"""

from typing import Literal

GroundTruth = Literal["SAFE", "SUSPICIOUS", "MALICIOUS"]

BENCHMARK_URLS: list[dict[str, str]] = [
    # --- Benign / Safe (Expected: LOW risk) ---
    {
        "id": "url-safe-01",
        "input": "https://www.google.com/search?q=cybersecurity+best+practices",
        "ground_truth": "SAFE",
        "description": "Legitimate major search engine query",
    },
    {
        "id": "url-safe-02",
        "input": "https://github.com/torvalds/linux",
        "ground_truth": "SAFE",
        "description": "Legitimate code repository on trusted developer platform",
    },
    {
        "id": "url-safe-03",
        "input": "https://en.wikipedia.org/wiki/Transport_Layer_Security",
        "ground_truth": "SAFE",
        "description": "Legitimate educational encyclopedia resource",
    },
    {
        "id": "url-safe-04",
        "input": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers",
        "ground_truth": "SAFE",
        "description": "Legitimate web standards documentation portal",
    },
    {
        "id": "url-safe-05",
        "input": "https://www.microsoft.com/en-us/security",
        "ground_truth": "SAFE",
        "description": "Official enterprise security product portal",
    },
    # --- Malicious Phishing / Credential Harvesting (Expected: HIGH or CRITICAL) ---
    {
        "id": "url-mal-01",
        "input": "http://paypal-security-verification-login.com.ru/update-account",
        "ground_truth": "MALICIOUS",
        "description": "Deceptive brand impersonation with country-code TLD and security keywords",
    },
    {
        "id": "url-mal-02",
        "input": "http://198.51.100.45:8080/secure/bankofamerica/login.htm",
        "ground_truth": "MALICIOUS",
        "description": "Raw IPv4 host address with banking path and non-standard HTTP port",
    },
    {
        "id": "url-mal-03",
        "input": "https://chase-ebanking-urgent-support.com/auth/login",
        "ground_truth": "MALICIOUS",
        "description": "Deceptive brand spoofing Chase Bank combined with high-risk financial path",
    },
    {
        "id": "url-mal-04",
        "input": "http://login-microsoft-online.com-account-recovery.top/verify.php",
        "ground_truth": "MALICIOUS",
        "description": "Subdomain spoofing targeting Microsoft 365 on high-abuse .top TLD",
    },
    {
        "id": "url-mal-05",
        "input": "http://apple-icloud-findmy-device-locked.xyz/unlock",
        "ground_truth": "MALICIOUS",
        "description": "iCloud lock phishing lure leveraging high-abuse .xyz TLD",
    },
    # --- Suspicious / Evasive (Expected: MEDIUM or HIGH) ---
    {
        "id": "url-susp-01",
        "input": "http://a.b.c.d.e.f.g.h.unusual-domain-redirect.info/track",
        "ground_truth": "SUSPICIOUS",
        "description": "Excessive subdomain hierarchy on .info TLD",
    },
    {
        "id": "url-susp-02",
        "input": "http://xn--pypal-4ve.com/account/login",
        "ground_truth": "SUSPICIOUS",
        "description": "Punycode IDN homoglyph impersonating PayPal",
    },
    {
        "id": "url-susp-03",
        "input": "http://shorturl.at/xK92Q",
        "ground_truth": "SUSPICIOUS",
        "description": "Obfuscated URL shortener masking true destination",
    },
    {
        "id": "url-susp-04",
        "input": "http://tinyurl.com/urgent-payment-invoice",
        "ground_truth": "SUSPICIOUS",
        "description": "Shortened link with payment and urgency tokens",
    },
    {
        "id": "url-susp-05",
        "input": "http://bit.ly/secure-account-access",
        "ground_truth": "SUSPICIOUS",
        "description": "Generic bit.ly URL shortener with security access keyword",
    },
]

BENCHMARK_MESSAGES: list[dict[str, str]] = [
    # --- Benign / Safe (Expected: LOW risk) ---
    {
        "id": "msg-safe-01",
        "input": "Hi Sarah, our team meeting is confirmed for tomorrow at 10:00 AM in Conference Room B. See you there!",
        "ground_truth": "SAFE",
        "description": "Standard business calendar / meeting confirmation",
    },
    {
        "id": "msg-safe-02",
        "input": "Your prescription order is ready for pickup at Main Street Pharmacy. Store hours are 9am to 6pm.",
        "ground_truth": "SAFE",
        "description": "Routine retail fulfillment advisory",
    },
    {
        "id": "msg-safe-03",
        "input": "Hey Dad, running 10 minutes late due to traffic. Please start dinner without me.",
        "ground_truth": "SAFE",
        "description": "Casual personal notification",
    },
    {
        "id": "msg-safe-04",
        "input": "Thank you for visiting Central Library. Your checked out books are due on November 15th.",
        "ground_truth": "SAFE",
        "description": "Civic institution library notification",
    },
    {
        "id": "msg-safe-05",
        "input": "Here is the recipe we discussed yesterday: 2 cups flour, 1 cup sugar, 2 eggs. Enjoy baking!",
        "ground_truth": "SAFE",
        "description": "Benign culinary exchange",
    },
    # --- Malicious Scam Messages (Expected: HIGH or CRITICAL) ---
    {
        "id": "msg-mal-01",
        "input": "URGENT NOTICE: Your Chase Bank account has been suspended due to suspicious activity. Enter your password immediately at http://chase-card-restore.com to prevent permanent closure.",
        "ground_truth": "MALICIOUS",
        "description": "Banking credential harvesting with artificial urgency and account closure threat",
    },
    {
        "id": "msg-mal-02",
        "input": "IRS Notice: Unpaid tax penalty detected. Act now within 24 hours and pay via bitcoin or apple gift card to prevent arrest warrant and law enforcement dispatch.",
        "ground_truth": "MALICIOUS",
        "description": "Government imposter scam with cryptocurrency and gift card extortion demands",
    },
    {
        "id": "msg-mal-03",
        "input": "Congratulations, you won $2,500,000 in the international lottery prize claim. Claim your prize now within 24 hours for overseas funds transfer by wiring $350 fee.",
        "ground_truth": "MALICIOUS",
        "description": "Advance-fee lottery fraud demanding bank details and fee with urgency deadline",
    },
    {
        "id": "msg-mal-04",
        "input": "Bank Alert: We detected an unauthorized login to your Chase Bank account. Reply with the code we sent or share the code immediately to prevent permanent closure.",
        "ground_truth": "MALICIOUS",
        "description": "Two-factor authentication OTP interception lure with banking impersonation",
    },
    {
        "id": "msg-mal-05",
        "input": "Netflix alert: Account will be closed within 24 hours. Enter your password and update your login details at http://netflix-billing-update.com immediately.",
        "ground_truth": "MALICIOUS",
        "description": "Subscription credential harvesting scam with urgent deadline and closure threat",
    },
    # --- Suspicious / Psychological Manipulation (Expected: MEDIUM or HIGH) ---
    {
        "id": "msg-susp-01",
        "input": "Limited time investment opportunity: Work from home daily payout! Earn $300 a day from home with zero experience. Act now within 24 hours.",
        "ground_truth": "SUSPICIOUS",
        "description": "High-yield job investment fraud with unrealistic daily payout and deadline",
    },
    {
        "id": "msg-susp-02",
        "input": "Urgent notice: You have an unpaid tax penalty. Act now and respond immediately at http://toll-violation-fees.info to prevent fee increase.",
        "ground_truth": "SUSPICIOUS",
        "description": "Smishing penalty lure with deadline pressure and external link",
    },
    {
        "id": "msg-susp-03",
        "input": "USPS Notice: Package could not be delivered due to incomplete address. Redelivery fee required. Download attached receipt right away.",
        "ground_truth": "SUSPICIOUS",
        "description": "Postal delivery failure lure with attachment directive",
    },
    {
        "id": "msg-susp-04",
        "input": "Critical warning: Windows infected and virus detected on your personal device. Call Microsoft support immediately for technical assistance.",
        "ground_truth": "SUSPICIOUS",
        "description": "Tech support panic pop-up lure with Microsoft impersonation",
    },
    {
        "id": "msg-susp-05",
        "input": "Immediate hire remote position: Earn $300 a day from home with no experience needed. Act now within 24 hours to secure your spot.",
        "ground_truth": "SUSPICIOUS",
        "description": "Job task scam recruitment lure with guaranteed daily payout and deadline",
    },
]
