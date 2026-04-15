import requests
import datetime
import time
import re
import logging
import os
import sys
import json
import io
import hashlib
from google import genai
from google.genai import types
from dotenv import load_dotenv

import time

def retry_generate(func, *args, **kwargs):
    for i in range(3):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            log.warning(f"Retry {i+1} failed: {e}")
            time.sleep(5)
    raise Exception("Failed after retries")

# AVIF conversion via Pillow + pillow-avif-plugin
# Install: pip install Pillow pillow-avif-plugin
try:
    import pillow_avif  # noqa: F401 — registers AVIF encoder with Pillow
    from PIL import Image
    AVIF_SUPPORTED = True
except ImportError:
    AVIF_SUPPORTED = False

# ==========================================
# 0. LOAD ENV & SETUP LOGGING
# ==========================================
from pathlib import Path
load_dotenv(Path(__file__).resolve().parent / ".env")

GEMINI_API_KEY          = os.getenv("GEMINI_API_KEY")
LOGIN_URL               = os.getenv("LOGIN_URL")
BLOG_API_URL            = os.getenv("BLOG_API_URL")
ADMIN_EMAIL             = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD          = os.getenv("ADMIN_PASSWORD")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET")

# How many blogs to auto-generate when running in scheduled/auto mode
AUTO_BLOG_COUNT = 3


class SafeStreamHandler(logging.StreamHandler):
    """Windows-safe console handler — strips emojis if terminal can't encode them."""
    def emit(self, record):
        try:
            msg = self.format(record)
            self.stream.write(msg + self.terminator)
            self.flush()
        except UnicodeEncodeError:
            safe = self.format(record).encode("ascii", "ignore").decode("ascii")
            self.stream.write(safe + self.terminator)
            self.flush()


_fmt             = logging.Formatter("%(asctime)s  %(levelname)s  %(message)s")
_file_handler    = logging.FileHandler("aadona_blog.log", encoding="utf-8")
_file_handler.setFormatter(_fmt)
_console_handler = SafeStreamHandler()
_console_handler.setFormatter(_fmt)

logging.basicConfig(level=logging.INFO, handlers=[_file_handler, _console_handler])
log = logging.getLogger(__name__)


# ==========================================
# 1. AADONA BRAND CONTEXT  (single source of truth)
# ==========================================
AADONA_CONTEXT = """
AADONA is a premium Made-in-India networking and IT infrastructure brand, trusted by
enterprises, SMBs, government bodies, and system integrators across India.

BRAND PILLARS:
  - Made in India: Proudly designed and manufactured in India under the Atmanirbhar Bharat vision.
  - Enterprise-Grade Reliability: Products are built for 24x7 uptime in demanding Indian environments.
  - End-to-End Infrastructure: From cabling to cloud-ready NAS — AADONA covers the full network stack.
  - Channel-Friendly: Strong pan-India distributor and reseller network.

PRODUCT PORTFOLIO:

  Diana Series PoE Switches:
    - Managed & unmanaged PoE/PoE+ switches for enterprise, SMB, surveillance, and smart buildings.
    - IEEE 802.3af/at/bt compliant; powers IP cameras, VoIP phones, WiFi APs, and IoT devices.
    - Models ranging from 8-port desktop to 48-port rack-mount with 10G uplinks.
    - Features: VLAN, QoS, RSTP, IGMP snooping, port mirroring, web/CLI/SNMP management.
    - Ideal vertical: CCTV/surveillance networks, hospitality, education, manufacturing.

  Apollo WiFi 7 Access Points:
    - Tri-band WiFi 7 (802.11be) with up to 9.6 Gbps aggregate throughput.
    - Multi-Link Operation (MLO), WPA3 Enterprise security, seamless BSS roaming.
    - Indoor ceiling-mount and outdoor IP67-rated variants available.
    - Centralised cloud management via AADONA NetManager portal.
    - Ideal vertical: Large campuses, hotels, hospitals, warehouses, smart offices.

  Helios Enterprise NAS:
    - High-availability NAS for data-heavy workloads — backup, surveillance storage, media.
    - Supports RAID 0/1/5/6/10; hot-swappable drives; dual redundant power supply.
    - 10GbE ready; iSCSI, NFS, SMB/CIFS, AFP protocols; AES-256 encryption at rest.
    - Scalable from 4-bay SMB units to 24-bay enterprise rackmount systems.
    - Ideal vertical: Media production, healthcare records, BFSI, government data centres.

  AADONA Cat6 / Cat6A Structured Cabling:
    - Shielded (STP) and unshielded (UTP) Cat6 and Cat6A patch cables, bulk cables, and keystones.
    - Supports 10GBASE-T up to 55 m (Cat6) and 100 m (Cat6A); PoE++ ready.
    - Fire-retardant LSZH jacket options for data centres and public buildings.
    - Tested to TIA-568 and ISO/IEC 11801 standards; RoHS compliant.
    - Ideal vertical: Data centres, greenfield office builds, structured cabling upgrades.

  AADONA IP Surveillance / CCTV Systems:
    - Full HD to 4K IP cameras — dome, bullet, PTZ, fisheye variants.
    - H.265+ compression; night vision up to 60 m IR range; IP66/IK10 weatherproofing.
    - PoE-powered (works natively with Diana PoE switches).
    - NVR solutions with up to 64-channel support and AI-based motion analytics.
    - Ideal vertical: Retail, warehouses, smart cities, banking, residential complexes.

  AADONA Rack Servers:
    - 1U/2U rack-mount servers for SMB and edge computing deployments.
    - Intel Xeon / AMD EPYC processor options; up to 3 TB RAM, NVMe + SAS storage.
    - IPMI 2.0 remote management; redundant PSU; tool-less chassis design.
    - Ideal vertical: Edge compute, ERP hosting, virtualisation, government e-governance projects.

TARGET AUDIENCE:
  - Indian enterprise IT managers and CIOs
  - Government IT departments (state & central)
  - System integrators and IT channel partners
  - Real estate developers (smart buildings)
  - Healthcare, education, BFSI sector IT teams

BRAND VOICE:
  Authoritative, forward-thinking, trusted, proudly Indian.
  Always position AADONA as THE solution — never generic.
  Highlight Made-in-India advantage where relevant.
  Use concrete specs and real numbers — avoid vague claims.
"""

# ==========================================
# QUILL-SAFE HTML RULES
# ==========================================
QUILL_RULES = """
CRITICAL HTML RULES — Quill editor will silently delete anything not on this list:
ALLOWED tags: <p>, <br>, <strong>, <em>, <u>, <h2>, <h3>, <ul>, <ol>, <li>, <blockquote>, <a>
FORBIDDEN (will be deleted and cause blank spaces):
  - <div> tags of any kind
  - style="..." attributes on ANY tag — including <h2 style="">, <strong style="">, <p style="">
  - <span> tags
  - Any custom tags

CALLOUT BOXES  → use <blockquote> instead of styled <div>
FEATURE CARDS  → use <h3> + <p> pairs instead of styled <div> cards
COLORED TEXT   → use plain <strong> instead of <strong style="color:...">
"""

SEO_KEYWORDS = [
    "AADONA", "networking products", "switches", "CCTV", "servers",
    "NAS", "CAT6 cables", "Made in India IT solutions", "network hardware India"
]

CONTENT_SERIES = [
    "AADONA Buyer's Guide series",
    "India Infrastructure Report series",
    "Real Deployment Stories series",
    "Product vs Product Comparison series"
]

KEYWORD_INJECTION = f"""
CONTENT KEYWORDS — naturally use these words somewhere in the blog body:
{", ".join(SEO_KEYWORDS)}
Do NOT stuff them. Weave them in where they fit contextually.
"""

# ==========================================
# PRODUCT-SPECIFIC SCENE LOOKUP
# ==========================================
PRODUCT_SCENES = {
    "Diana Series PoE Switches": (
        "network rack in a clean, well-lit server room with neatly organized patch cables "
        "and a Diana Series PoE switch mounted prominently in the foreground"
    ),
    "Apollo WiFi 7 Access Points": (
        "modern open-plan Indian office with a ceiling-mounted Apollo WiFi 7 access point "
        "visible above a collaborative workspace with employees working"
    ),
    "Helios Enterprise NAS": (
        "bright enterprise data center with a Helios NAS storage unit in a rack, "
        "drives visible, status LEDs lit, organized cabling behind"
    ),
    "Cat6 AADONA Cabling": (
        "structured cabling installation in a commercial building IT room, "
        "Cat6 cables neatly routed through conduits into a patch panel"
    ),
    "AADONA IP Surveillance / CCTV Systems": (
        "bright retail or warehouse environment with dome IP cameras mounted on ceiling, "
        "NVR unit visible in a nearby rack, clean and professional installation"
    ),
    "AADONA Rack Servers": (
        "modern edge computing room with 1U/2U rack servers mounted in an open rack, "
        "status LEDs green, cables organized with velcro ties, bright overhead lighting"
    ),
}

SHOT_TYPES = [
    "wide establishing shot showing the full environment",
    "medium environmental shot focused on the equipment in context",
    "detail close-up of the hardware front panel and ports",
]

IMAGE_NEGATIVE_PROMPT = (
    "STRICTLY AVOID: neon lighting, cyberpunk aesthetics, glowing blue or teal light trails, "
    "HDR color grading, sci-fi elements, dark moody backgrounds, robotic arms, holographic displays, "
    "overly dramatic shadows, fantasy server rooms, green matrix effects, glowing shields, "
    "unrealistic color casts, extreme bokeh that hides the subject. "
    "This must look like an authentic corporate IT photograph taken by a professional photographer."
)

# ==========================================
# 2. GEMINI CLIENT
# ==========================================
client = genai.Client(api_key=GEMINI_API_KEY)


# ==========================================
# 3. HELPERS
# ==========================================
def clean_text(text: str) -> str:
    """Strip markdown stars, backticks, and label prefixes."""
    text = re.sub(
        r'^(Title|Excerpt|Blog Title|Option\s*\d+|Here are)[\s:\-]*',
        '', text, flags=re.IGNORECASE | re.MULTILINE
    )
    text = text.replace('**', '').replace('*', '').replace('`', '').strip()
    return text


def strip_forbidden_html(html: str) -> str:
    """
    Post-process safety net — removes anything Quill will silently drop anyway.
    1. Unwrap <div ...>...</div> → keep inner content
    2. Strip style="..." from all tags
    3. Strip <span> tags (keep inner text)
    4. Remove <feature-data> wrapper tags (already replaced by rebuild_features)
    """
    html = re.sub(r'\s*style="[^"]*"', '', html)
    html = re.sub(r'<div[^>]*>', '', html)
    html = re.sub(r'</div>', '', html)
    html = re.sub(r'<span[^>]*>', '', html)
    html = re.sub(r'</span>', '', html)
    html = re.sub(r'</?feature-data[^>]*>', '', html)
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip()


def get_shot_type(blog_title: str) -> str:
    digest = int(hashlib.md5(blog_title.encode()).hexdigest(), 16)
    return SHOT_TYPES[digest % len(SHOT_TYPES)]


def get_auth_token() -> str:
    """Authenticate and return Firebase/JWT token."""
    log.info("Fetching auth token...")
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "returnSecureToken": True}
    res = requests.post(LOGIN_URL, json=payload, timeout=15)
    res.raise_for_status()
    token = res.json().get("idToken")
    if not token:
        raise ValueError("Auth token missing from response.")
    log.info("Auth token received.")
    return token


# ==========================================
# AVIF CONVERTER
# ==========================================
def convert_to_avif(png_bytes: bytes, quality: int = 60) -> tuple[bytes, str]:
    if not AVIF_SUPPORTED:
        log.warning("pillow-avif-plugin not installed — uploading as PNG.")
        return png_bytes, "image/png"
    try:
        img = Image.open(io.BytesIO(png_bytes)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="AVIF", quality=quality)
        avif_bytes = buf.getvalue()
        saving_pct = round((1 - len(avif_bytes) / len(png_bytes)) * 100, 1)
        log.info(f"AVIF conversion: {len(png_bytes):,} PNG → {len(avif_bytes):,} AVIF ({saving_pct}% smaller)")
        return avif_bytes, "image/avif"
    except Exception as e:
        log.warning(f"AVIF conversion failed: {e} — falling back to PNG.")
        return png_bytes, "image/png"


# ==========================================
# 4. TOPIC HISTORY  (persisted across runs)
# ==========================================
HISTORY_FILE = "used_topics.json"


def load_used_topics() -> list:
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_used_topic(idea: dict) -> None:
    topics = load_used_topics()
    topics.append({
        "title":   idea["BLOG_TITLE"],
        "trend":   idea["WINNER_TREND"],
        "product": idea["WINNER_PRODUCT"],
        "date":    datetime.datetime.now().strftime("%Y-%m-%d")
    })
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(topics, f, indent=2, ensure_ascii=False)
    log.info(f"Topic history updated — {len(topics)} blogs logged.")


# ==========================================
# 5A. STAGE 1 — USER-DRIVEN IDEA ENGINE
# ==========================================
def generate_blog_idea_from_topic(user_topic: str) -> dict:
    """Generate a blog idea based on a user-supplied topic/prompt."""
    log.info(f"Stage 1 (user-driven): Generating idea for topic: '{user_topic}'...")

    idea_prompt = f"""
You are a senior content strategist for AADONA — a premium Indian networking brand.

{AADONA_CONTEXT}

USER'S REQUESTED TOPIC/PROMPT: "{user_topic}"

TASK:
Based strictly on the user's requested topic above, craft a highly compelling, SEO-friendly blog post concept.
Map their topic to the most relevant AADONA product from the brand context provided.

Output ONLY the following 5 labels exactly as shown, with no extra text:

WINNER_TREND: <the core trend or theme based on the user's topic>
WINNER_PRODUCT: <the most relevant AADONA product from the portfolio>
WINNER_ANGLE: <one sentence explaining the unique content angle>
BLOG_TITLE: <compelling, SEO-friendly blog title>
EXCERPT: <2-sentence excerpt that hooks the reader>
"""

    res = retry_generate(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=idea_prompt,
        config=types.GenerateContentConfig(temperature=0.7)
    )

    raw = res.text.strip()
    log.info(f"Idea Engine Raw Output:\n{raw}")

    idea = {}
    for line in raw.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            idea[key.strip()] = clean_text(val.strip())

    required = ["WINNER_TREND", "WINNER_PRODUCT", "WINNER_ANGLE", "BLOG_TITLE", "EXCERPT"]
    for key in required:
        if key not in idea:
            raise ValueError(f"Idea engine missing key: {key}. Raw output:\n{raw}")

    log.info(f"Idea generated: {idea['BLOG_TITLE']}")
    return idea


# ==========================================
# 5B. STAGE 1 — AUTO IDEA ENGINE (scheduled)
# ==========================================
def generate_blog_idea_auto(already_used_this_run: list[str] | None = None) -> dict:
    """
    Auto-generate a trending blog idea using Gemini's thinking model.
    already_used_this_run: list of BLOG_TITLE strings generated earlier in the same batch,
    so the second blog in a Sunday run doesn't repeat the first one.
    """
    log.info("Stage 1 (auto): Scoring and selecting best blog idea...")

    used_topics = load_used_topics()
    avoid_lines = []

    for t in used_topics[-50:]:
        avoid_lines.append(f"  - [{t['date']}] \"{t['title']}\" (Product: {t['product']}, Trend: {t['trend']})")

    # Also avoid anything generated earlier in this same batch run
    if already_used_this_run:
        for title in already_used_this_run:
            avoid_lines.append(f"  - [TODAY - same batch] \"{title}\"")

    if avoid_lines:
        avoid_block = (
            "ALREADY PUBLISHED — DO NOT repeat these topics, products, or angles:\n"
            + "\n".join(avoid_lines)
            + "\n\nPick a COMPLETELY DIFFERENT product and trend angle from the above list.\n"
        )
    else:
        avoid_block = ""

    idea_prompt = f"""
You are a senior content strategist for AADONA — a premium Indian networking brand.

{AADONA_CONTEXT}

{avoid_block}
TASK — Think step by step:

STEP 1 — Identify 5 genuinely trending topics in networking/IT infrastructure for 2026
         (think: AI-driven networks, SASE, WiFi 7 adoption, edge computing, green IT, smart buildings,
         structured cabling, NAS storage, PoE automation, zero trust, smart surveillance, etc.)
         These must be real, specific trends — not generic buzzwords.
         IMPORTANT: Spread across ALL AADONA products — do not default to WiFi every time.

STEP 2 — For each trend, map it to the AADONA product that solves it best.
         Ensure the 5 ideas cover AT LEAST 3 different AADONA products.

STEP 3 — Score each idea from 1–10 on:
         (a) Relevance to Indian enterprise buyers
         (b) Novelty — has this angle been overdone?
         (c) SEO potential in 2026

STEP 4 — Pick the WINNER (highest total score) and output ONLY this:

WINNER_TREND: <the trend>
WINNER_PRODUCT: <the AADONA product>
WINNER_ANGLE: <one sentence explaining the unique content angle>
BLOG_TITLE: <compelling, SEO-friendly blog title>
EXCERPT: <2-sentence excerpt that hooks the reader>

Output ONLY the 5 labelled lines above. No extra text.

CONTENT_SERIES OPTIONS — prefer ideas that fit one of these formats:
{chr(10).join(f"  - {s}" for s in CONTENT_SERIES)}
"""

    res = retry_generate(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=idea_prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=8000)
        )
    )

    raw = res.text.strip()
    log.info(f"Idea Engine Raw Output:\n{raw}")

    idea = {}
    for line in raw.splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            idea[key.strip()] = clean_text(val.strip())

    required = ["WINNER_TREND", "WINNER_PRODUCT", "WINNER_ANGLE", "BLOG_TITLE", "EXCERPT"]
    for key in required:
        if key not in idea:
            raise ValueError(f"Idea engine missing key: {key}. Raw output:\n{raw}")

    log.info(f"Winning Idea: {idea['BLOG_TITLE']}")
    return idea


# ==========================================
# REBUILD FEATURES — Quill-safe output
# ==========================================
def rebuild_features(html: str) -> str:
    """Parses <feature-data>[...]</feature-data> and replaces it with Quill-safe <h3> + <p> pairs."""
    html = re.sub(r'`{3}(?:json)?\s*(<feature-data>)', r'\1', html)
    html = re.sub(r'(</feature-data>)\s*`{3}', r'\1', html)

    pattern = re.compile(r'<feature-data>\s*(\[.*?\])\s*</feature-data>', re.DOTALL)

    match = pattern.search(html)
    if not match:
        log.warning("No <feature-data> tag found in Gemini output.")

    def make_quill_safe_list(rows: list) -> str:
        output = ""
        for row in rows:
            feature = row.get("feature", "").strip()
            benefit  = row.get("benefit", "").strip()
            output  += f"<h3>{feature}</h3>\n<p>{benefit}</p>\n"
        log.info(f"Feature list built: {len(rows)} items.")
        return output

    def replacer(m):
        try:
            rows = json.loads(m.group(1).strip())
            return make_quill_safe_list(rows)
        except Exception as e:
            log.warning(f"Feature JSON parse failed: {e} — using regex fallback.")
            try:
                pairs = re.findall(
                    r'"feature"\s*:\s*"([^"]+)".*?"benefit"\s*:\s*"([^"]+)"',
                    m.group(1), re.DOTALL
                )
                if pairs:
                    return "".join(f"<h3>{f}</h3>\n<p>{b}</p>\n" for f, b in pairs)
            except Exception as e2:
                log.warning(f"Fallback regex also failed: {e2}")
            return re.sub(r'</?feature-data>', '', m.group(0))

    return pattern.sub(replacer, html)


# ==========================================
# 6. STAGE 2 — QUILL-SAFE BLOG BODY GENERATOR
# ==========================================
def validate_sections_raw(html: str) -> tuple[bool, list[str]]:
    sections = [s.strip() for s in html.split("---SECTION---") if s.strip()]
    if len(sections) != 4:
        log.warning(f"Expected 4 sections, got {len(sections)}")
        return False, sections
    for i, section in enumerate(sections):
        text_only = re.sub(r'<[^>]+>', '', section).strip()
        if len(text_only) < 80:
            log.warning(f"Section {i+1} too short ({len(text_only)} chars)")
            return False, sections
    if "<feature-data>" not in sections[2]:
        log.warning("Section 3 missing <feature-data> block")
        return False, sections
    log.info("Raw validation passed.")
    return True, sections


def validate_sections_clean(html: str) -> tuple[bool, list[str]]:
    sections = [s.strip() for s in html.split("---SECTION---") if s.strip()]
    if len(sections) != 4:
        log.warning(f"Post-clean: Expected 4 sections, got {len(sections)}")
        return False, sections
    if "<h3>" not in sections[2]:
        log.warning("Post-clean: Section 3 missing <h3> tags after feature rebuild")
        return False, sections
    return True, sections


def generate_blog_body(idea: dict) -> str:
    log.info("Stage 2: Generating Quill-safe blog body...")

    body_prompt = f"""
You are writing a complete blog post for AADONA's official website.
The blog will be rendered inside a Quill rich text editor.

{AADONA_CONTEXT}

Blog Topic  : {idea['BLOG_TITLE']}
Core Trend  : {idea['WINNER_TREND']}
AADONA Hero : {idea['WINNER_PRODUCT']}
Unique Angle: {idea['WINNER_ANGLE']}

{QUILL_RULES}
{KEYWORD_INJECTION}

ABSOLUTE CONTENT RULES:
1. DO NOT include the blog title "{idea['BLOG_TITLE']}" anywhere — it is already on the page.
2. Every heading must be followed by at least 2 paragraphs of content.
3. Keep paragraphs short — max 3-4 sentences each.
4. Output ALL 4 sections separated by exactly: ---SECTION---
5. Section 3 MUST contain the <feature-data>[...]</feature-data> block — do not skip it.

OUTPUT FORMAT — exactly 4 sections separated by ---SECTION---:

SECTION 1 (Introduction):
Write 3 short <p> paragraphs starting with a strong hook. No heading.

---SECTION---

SECTION 2 (Why This Trend Matters):
<h2>Why {idea['WINNER_TREND']} is Reshaping Indian Networks</h2>
Write 2 <p> paragraphs.
Then a <ul> with 3-4 bullet points containing real stats or facts.
Then a <blockquote> with one compelling key insight or statistic.
Then 1 more <p> paragraph.

---SECTION---

SECTION 3 (AADONA Solution — MOST IMPORTANT):
<h2>How {idea['WINNER_PRODUCT']} Solves This</h2>
Write 1 intro <p> paragraph.
Then output EXACTLY this structure with REAL features of {idea['WINNER_PRODUCT']}:
<feature-data>
[
  {{"feature": "Real Feature Name 1", "benefit": "Specific benefit explanation of at least 25 words describing real value"}},
  {{"feature": "Real Feature Name 2", "benefit": "Specific benefit explanation of at least 25 words describing real value"}},
  {{"feature": "Real Feature Name 3", "benefit": "Specific benefit explanation of at least 25 words describing real value"}},
  {{"feature": "Real Feature Name 4", "benefit": "Specific benefit explanation of at least 25 words describing real value"}},
  {{"feature": "Real Feature Name 5", "benefit": "Specific benefit explanation of at least 25 words describing real value"}},
  {{"feature": "Real Feature Name 6", "benefit": "Specific benefit explanation of at least 25 words describing real value"}}
]
</feature-data>
The <feature-data> block is MANDATORY. Do not replace it with paragraphs or divs.

---SECTION---

SECTION 4 (Conclusion):
<h2>The AADONA Advantage</h2>
Write 2 strong closing <p> paragraphs about why AADONA is the right choice for Indian enterprises.

OUTPUT ONLY THE HTML. No markdown fences, no explanations.
"""

    def attempt_generate(prompt: str) -> str:
        res = retry_generate(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(max_output_tokens=8192, temperature=0.7)
        )
        return res.text.strip()

    def attempt_and_clean() -> tuple[bool, list[str], str]:
        raw = attempt_generate(body_prompt)
        is_valid, raw_sections = validate_sections_raw(raw)
        if not is_valid:
            return False, raw_sections, raw

        fixed = rebuild_features(raw)
        fixed = strip_forbidden_html(fixed)

        clean_sections = [s.strip() for s in fixed.split("---SECTION---") if s.strip()]
        if clean_sections:
            title_to_remove = idea['BLOG_TITLE']
            if title_to_remove in clean_sections[0]:
                log.info("Stripping repeated title from Section 1...")
                clean_sections[0] = clean_sections[0].replace(title_to_remove, "")
                clean_sections[0] = re.sub(
                    r'<h[1-3][^>]*>\s*</h[1-3]>', '', clean_sections[0]
                ).strip()
                fixed = "\n\n---SECTION---\n\n".join(clean_sections)

        is_clean_valid, final_sections = validate_sections_clean(fixed)
        return is_clean_valid, final_sections, fixed

    is_valid, sections, fixed = attempt_and_clean()
    if not is_valid:
        log.warning("Retrying — attempt 2...")
        is_valid, sections, fixed = attempt_and_clean()
    if not is_valid:
        log.warning("Retrying — attempt 3...")
        is_valid, sections, fixed = attempt_and_clean()

    if not is_valid:
        raise ValueError("Blog body generation failed after 3 attempts.")

    if len(sections) >= 3:
        with open("debug_section3.html", "w", encoding="utf-8") as f:
            f.write(sections[2].strip())
        log.info("Section 3 HTML dumped to debug_section3.html")

    log.info("Blog body generated and validated successfully.")
    return fixed


# ==========================================
# FIREBASE ADMIN INIT (runs once)
# ==========================================
import firebase_admin
from firebase_admin import credentials, storage as fb_storage

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if not _firebase_initialized:
        # Supports both filenames used across the two original scripts
        for key_name in ("serviceAccountKey.json", "firebase_key.json"):
            key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), key_name)
            if os.path.exists(key_path):
                break
        else:
            raise FileNotFoundError(
                "Firebase service account key not found. "
                "Expected 'serviceAccountKey.json' or 'firebase_key.json' next to main.py."
            )
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred, {"storageBucket": os.getenv("FIREBASE_STORAGE_BUCKET")})
        _firebase_initialized = True
        log.info("Firebase Admin SDK initialized.")


# ==========================================
# 7. STAGE 3 — IMAGE GENERATION & UPLOAD
# ==========================================
def upload_to_firebase(image_bytes: bytes, filename: str, content_type: str = "image/avif") -> str | None:
    try:
        init_firebase()
        bucket = fb_storage.bucket()
        blob   = bucket.blob(f"blog-images/{filename}")
        blob.upload_from_string(image_bytes, content_type=content_type)
        blob.make_public()
        url = blob.public_url
        log.info(f"Image uploaded: {url}")
        return url
    except Exception as e:
        log.warning(f"Firebase upload failed: {e}")
        return None


def generate_blog_image(idea: dict, image_type: str = "header") -> str:
    fallback = (
        f"https://via.placeholder.com/1200x630.png"
        f"?text=AADONA+{idea['WINNER_PRODUCT'].replace(' ', '+')}"
    )

    scene = PRODUCT_SCENES.get(
        idea['WINNER_PRODUCT'],
        f"enterprise IT infrastructure in a modern Indian office related to {idea['WINNER_PRODUCT']}"
    )
    shot = get_shot_type(idea['BLOG_TITLE'])

    if image_type == "header":
        log.info("Stage 3a: Generating header image...")
        prompt = (
            f"LANDSCAPE WIDE PHOTO, 16:9 aspect ratio. "
            f"Professional enterprise IT photography, realistic and authentic. "
            f"Scene: {scene}. Shot type: {shot}. "
            f"Lighting: bright, neutral white overhead lighting — realistic corporate environment. "
            f"Color grading: natural, accurate colors, no heavy post-processing. "
            f"Style: editorial corporate photography, clean and professional. "
            f"Context: related to {idea['WINNER_TREND']} in Indian enterprise. "
            f"IMPORTANT: horizontal landscape orientation, much wider than tall. "
            f"{IMAGE_NEGATIVE_PROMPT} No text, no logos, no watermarks."
        )
        filename = f"blog_header_{int(time.time())}.avif"
    else:
        log.info("Stage 3b: Generating mid-blog image...")
        prompt = (
            f"LANDSCAPE PRODUCT PHOTO, 16:9 aspect ratio. "
            f"Clean professional hardware product photography of {idea['WINNER_PRODUCT']}. "
            f"Setting: white or light grey studio background with soft, diffused studio lighting. "
            f"Show clearly: front panel design, physical ports, indicator LEDs, form factor. "
            f"Shot type: detail close-up of the hardware, sharp focus across the entire product. "
            f"Style: catalogue-quality hardware photography with accurate, true-to-life colors. "
            f"Context: {idea['WINNER_PRODUCT']} hardware used for {idea['WINNER_TREND']}. "
            f"IMPORTANT: horizontal landscape orientation, much wider than tall. "
            f"{IMAGE_NEGATIVE_PROMPT} No text, no logos, no watermarks."
        )
        filename = f"blog_mid_{int(time.time())}.avif"

    try:
        result = retry_generate(
            client.models.generate_content,
            model="gemini-2.5-flash-image",
            contents=prompt,
            config=types.GenerateContentConfig(response_modalities=["IMAGE", "TEXT"]),
        )
        parts = getattr(result.candidates[0].content, "parts", [])
        for part in parts:
            if part.inline_data is not None:
                image_bytes, content_type = convert_to_avif(part.inline_data.data)
                url = upload_to_firebase(image_bytes, filename, content_type)
                if url:
                    return url
                with open(filename, "wb") as f:
                    f.write(image_bytes)
                log.warning(f"Firebase upload failed — image saved locally as {filename}.")
                return fallback
        raise ValueError("No image part found in Gemini response.")
    except Exception as e:
        log.warning(f"Image generation failed ({image_type}): {e}. Using fallback.")
        return fallback


# ==========================================
# 8. STAGE 4 — BUILD PAYLOAD & PUSH TO CMS
# ==========================================
def publish_blog(idea: dict, body_html: str, header_image: str, mid_image: str) -> None:
    log.info("Stage 4: Publishing to CMS...")

    sections    = [s.strip() for s in body_html.split("---SECTION---") if s.strip()]
    blog_blocks = [{"type": "image", "url": header_image, "caption": f"AADONA {idea['WINNER_PRODUCT']} — {idea['WINNER_TREND']}"}]

    for i, content in enumerate(sections):
        blog_blocks.append({"type": "text", "content": content})
        if i == 1:
            blog_blocks.append({"type": "image", "url": mid_image, "caption": f"{idea['WINNER_TREND']} — Powered by AADONA"})

    token = get_auth_token()
    now   = datetime.datetime.now()

    payload = {
        "title":     idea["BLOG_TITLE"],
        "slug":      f"aadona-{int(time.time())}",
        "excerpt":   idea["EXCERPT"],
        "author":    "Pinakii Chatterjee",
        "date":      f"{now.strftime('%b')} {now.day}, {now.year}",
        "readTime":  "5 min read",
        "image":     header_image,
        "tags":      [idea["WINNER_TREND"], idea["WINNER_PRODUCT"], "AADONA", "Networking"],
        "published": False,
        "blocks":    blog_blocks
    }

    res = requests.post(
        BLOG_API_URL,
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=20
    )

    log.info(f"CMS Response: {res.status_code} - {res.text}")

    if res.status_code in [200, 201]:
        log.info(f"Draft blog '{idea['BLOG_TITLE']}' pushed! Awaiting approval.")
    else:
        log.error(f"CMS push failed [{res.status_code}]: {res.text}")
        res.raise_for_status()


# ==========================================
# 9. SINGLE BLOG PIPELINE
# ==========================================
def build_and_publish(idea: dict) -> None:
    """Run the full pipeline for one idea dict — body → images → CMS → history."""
    body_html    = generate_blog_body(idea)
    header_image = generate_blog_image(idea, image_type="header")
    mid_image    = generate_blog_image(idea, image_type="mid")
    publish_blog(idea, body_html, header_image, mid_image)
    save_used_topic(idea)
    log.info(f"Blog '{idea['BLOG_TITLE']}' complete.")


# ==========================================
# 10A. USER-DRIVEN MODE
# ==========================================
def run_user_driven(user_topic: str) -> None:
    log.info("=" * 60)
    log.info(f"AADONA Blog Generator — User topic: '{user_topic}'")
    log.info("=" * 60)
    idea = generate_blog_idea_from_topic(user_topic)
    build_and_publish(idea)
    log.info("User-driven run complete.")


# ==========================================
# 10B. SCHEDULED AUTO MODE  (Sunday × 2 blogs)
# ==========================================
def run_auto_scheduled(count: int = AUTO_BLOG_COUNT) -> None:
    log.info("=" * 60)
    log.info(f"AADONA Blog Automation — Scheduled run ({count} blogs)")
    log.info("=" * 60)

    generated_titles: list[str] = []

    for i in range(1, count + 1):
        log.info(f"--- Blog {i} of {count} ---")
        try:
            # Pass already-generated titles so the second blog picks a different topic
            idea = generate_blog_idea_auto(already_used_this_run=generated_titles)
            generated_titles.append(idea["BLOG_TITLE"])
            build_and_publish(idea)
            time.sleep(10)
        except Exception as e:
            log.warning(f"Blog {i} failed, retrying once...")

            try:
                idea = generate_blog_idea_auto(already_used_this_run=generated_titles)
                generated_titles.append(idea["BLOG_TITLE"])
                build_and_publish(idea)
                time.sleep(10)
            except Exception as e2:
                log.error(f"Blog {i} skipped after retry: {e2}")

    log.info(f"Scheduled run complete — {len(generated_titles)}/{count} blogs published.")


# ==========================================
# ENTRYPOINT
# ==========================================
if __name__ == "__main__":
    # ── Detect run mode ──────────────────────────────────────────────
    # Scheduled / CI mode  →  no args, or --auto flag
    # User-driven mode     →  pass topic as a CLI arg, or enter interactively
    #
    # Examples:
    #   python main.py                          → interactive prompt
    #   python main.py --auto                   → auto mode (2 blogs, no prompt)
    #   python main.py "WiFi 7 for hospitals"   → user-driven with topic from CLI

    args = sys.argv[1:]

    if not args:
        # Interactive — ask user
        print("=" * 60)
        print(" AADONA BLOG GENERATOR")
        print("=" * 60)
        print("\nModes:")
        print("  1) Enter a topic  → generate 1 blog from your topic")
        print("  2) Press Enter    → auto mode (generate 2 blogs automatically)")
        user_input = input("\nEnter a blog topic, or press Enter for auto mode:\n> ").strip()

        if user_input:
            run_user_driven(user_input)
        else:
            run_auto_scheduled()

    elif args[0] == "--auto":
        # Explicitly forced auto mode (used by GitHub Actions cron)
        run_auto_scheduled()

    else:
        # Topic passed directly as CLI argument
        topic = " ".join(args)
        run_user_driven(topic)