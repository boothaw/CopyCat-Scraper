import requests
import xml.etree.ElementTree as ET
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import re

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
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


# Common paths where blogs/articles live on sites without sitemaps
BLOG_PATHS = [
    "/blog", "/news", "/articles", "/resources", "/posts",
    "/insights", "/tips", "/education", "/learn", "/guides",
    "/pet-care", "/pet-health", "/care-tips", "/advice",
]

# Patterns that strongly suggest a URL is a content page (not nav/utility)
ARTICLE_PATH_RE = re.compile(r"/.+/.+", re.IGNORECASE)  # at least 2 path segments

# Short utility paths to skip when crawling
SKIP_EXACT = {"/", "/about", "/contact", "/services", "/team", "/staff",
              "/faq", "/privacy", "/terms", "/sitemap", "/home"}


def _extract_internal_links(html: str, base: str, base_domain: str) -> list[str]:
    """Pull all same-domain hrefs out of an HTML page."""
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for tag in soup.find_all("a", href=True):
        href = tag["href"].strip()
        # Make relative URLs absolute
        full = urljoin(base, href)
        parsed = urlparse(full)
        # Keep only same-domain http(s) links, strip fragments/query strings
        if parsed.scheme not in ("http", "https"):
            continue
        if parsed.netloc.lower().lstrip("www.") != base_domain.lstrip("www."):
            continue
        clean = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        if clean and clean not in links:
            links.append(clean)
    return links


def _crawl_for_articles(base: str, base_domain: str, max_results: int = 300) -> list[dict]:
    """
    Fallback for sites with no sitemap.
    1. Checks common blog listing paths (/blog, /news, etc.)
    2. If none found, falls back to crawling the homepage.
    Collects article-like URLs (2+ path segments, not utility pages).
    """
    seen: set[str] = set()
    articles: list[dict] = []

    def collect_from_page(page_url: str):
        html = _fetch(page_url)
        if not html:
            return
        for link in _extract_internal_links(html, base, base_domain):
            path = urlparse(link).path.rstrip("/")
            if link in seen:
                continue
            seen.add(link)
            if (
                path not in SKIP_EXACT
                and _is_article_url(link)
                and ARTICLE_PATH_RE.match(path)
                and len(articles) < max_results
            ):
                articles.append({"url": link, "title": None, "lastmod": None})

    # Step 1: try well-known blog listing pages
    found_blog_page = False
    for path in BLOG_PATHS:
        listing_url = base + path
        html = _fetch(listing_url)
        if html and len(html) > 2000:  # non-trivial response
            seen.add(listing_url)
            collect_from_page(listing_url)
            if articles:
                found_blog_page = True
                break  # stop at first listing page that yields results

    # Step 2: fall back to crawling the homepage
    if not found_blog_page:
        seen.add(base)
        collect_from_page(base)

    return articles


def _dedupe(articles: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out = []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            out.append(a)
    return out


def discover_articles(url: str) -> tuple[list[dict], str]:
    """
    Given any URL (homepage or sitemap URL), discover all article URLs.
    Tries sitemap first, falls back to crawling if no sitemap is found.
    Returns (articles, method) where method is 'sitemap' or 'crawl'.
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

    robots_sitemap = _sitemap_url_from_robots(base)
    if robots_sitemap and robots_sitemap not in candidates:
        candidates.insert(0, robots_sitemap)

    for candidate in candidates:
        xml_text = _fetch(candidate)
        if xml_text and ("<urlset" in xml_text or "<sitemapindex" in xml_text):
            articles = _parse_sitemap(xml_text, base_domain)
            if articles:
                return _dedupe(articles), "sitemap"

    # No sitemap found — crawl instead
    articles = _crawl_for_articles(base, base_domain)
    return _dedupe(articles), "crawl"
