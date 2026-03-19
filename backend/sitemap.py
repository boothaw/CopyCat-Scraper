import requests
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, urljoin
import re

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}

# URL path segments that indicate non-article pages
NON_POST_PATTERNS = re.compile(
    r"/(category|tag|author|page|feed|wp-content|wp-includes|wp-admin|"
    r"cart|checkout|account|login|register|search|404|sitemap)[/\.]",
    re.IGNORECASE,
)


def _fetch(url: str) -> str | None:
    try:
        r = requests.get(url, timeout=10, headers=HEADERS)
        if r.status_code == 200:
            return r.text
    except Exception:
        pass
    return None


def _is_article_url(url: str) -> bool:
    return not NON_POST_PATTERNS.search(url)


def _parse_sitemap(xml_text: str, base_domain: str) -> list[dict]:
    """Parse a sitemap or sitemap index XML, returning article dicts."""
    articles = []
    try:
        root = ET.fromstring(xml_text)
        # Strip namespace for easier tag matching
        tag = root.tag.split("}")[-1] if "}" in root.tag else root.tag

        ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

        if tag == "sitemapindex":
            # Recursively fetch child sitemaps
            for sitemap_el in root.findall("sm:sitemap", ns):
                loc = sitemap_el.findtext("sm:loc", namespaces=ns)
                if loc:
                    child_xml = _fetch(loc.strip())
                    if child_xml:
                        articles.extend(_parse_sitemap(child_xml, base_domain))
        elif tag == "urlset":
            for url_el in root.findall("sm:url", ns):
                loc = url_el.findtext("sm:loc", namespaces=ns)
                title = url_el.findtext(
                    "{http://www.google.com/schemas/sitemap-news/0.9}news/"
                    "{http://www.google.com/schemas/sitemap-news/0.9}title"
                )
                lastmod = url_el.findtext("sm:lastmod", namespaces=ns)

                if loc:
                    loc = loc.strip()
                    parsed = urlparse(loc)
                    # Only include URLs from the same domain
                    if parsed.netloc.lower().lstrip("www.") == base_domain.lstrip("www."):
                        if _is_article_url(loc):
                            articles.append({
                                "url": loc,
                                "title": (title or "").strip() or None,
                                "lastmod": (lastmod or "").strip() or None,
                            })
    except ET.ParseError:
        pass
    return articles


def _sitemap_url_from_robots(base_url: str) -> str | None:
    robots_url = urljoin(base_url, "/robots.txt")
    text = _fetch(robots_url)
    if text:
        for line in text.splitlines():
            if line.lower().startswith("sitemap:"):
                return line.split(":", 1)[1].strip()
    return None


def discover_articles(url: str) -> list[dict]:
    """
    Given any URL (homepage or sitemap URL), discover all article URLs.
    Tries /sitemap.xml → /sitemap_index.xml → robots.txt fallback.
    Returns list of {url, title, lastmod}.
    """
    parsed = urlparse(url)
    base = f"{parsed.scheme}://{parsed.netloc}"
    base_domain = parsed.netloc.lower().lstrip("www.")

    candidates = [
        urljoin(base, "/sitemap.xml"),
        urljoin(base, "/sitemap_index.xml"),
        urljoin(base, "/post-sitemap.xml"),
        urljoin(base, "/page-sitemap.xml"),
    ]

    # Also try robots.txt for a sitemap pointer
    robots_sitemap = _sitemap_url_from_robots(base)
    if robots_sitemap and robots_sitemap not in candidates:
        candidates.insert(0, robots_sitemap)

    for candidate in candidates:
        xml_text = _fetch(candidate)
        if xml_text and ("<urlset" in xml_text or "<sitemapindex" in xml_text):
            articles = _parse_sitemap(xml_text, base_domain)
            if articles:
                # Deduplicate by URL
                seen = set()
                unique = []
                for a in articles:
                    if a["url"] not in seen:
                        seen.add(a["url"])
                        unique.append(a)
                return unique

    return []
