import requests
from readability import Document
from bs4 import BeautifulSoup
import datetime
import re
from urllib.parse import urlparse


def extract_slug_from_url(url: str) -> str:
    parsed = urlparse(url)
    path = parsed.path.strip("/")
    if not path:
        return "untitled"
    slug = path.split("/")[-1]
    slug = slug.split("?")[0].split("#")[0]
    return slug if slug else "untitled"


def scrape_article(url: str) -> dict | None:
    try:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        }
        response = requests.get(url, timeout=15, headers=headers)
        response.raise_for_status()

        # Derive the site's domain dynamically from the URL being scraped
        parsed_site = urlparse(url).netloc.lower()

        slug = extract_slug_from_url(url)

        # Try to get title from original HTML before Readability strips structure
        original_soup = BeautifulSoup(response.text, "html.parser")
        title = None
        h1 = original_soup.find("h1")
        if h1 and h1.get_text(strip=True):
            title = h1.get_text(strip=True)
        else:
            h2 = original_soup.find("h2")
            if h2 and h2.get_text(strip=True):
                title = h2.get_text(strip=True)

        # Process with Readability for clean article extraction
        doc = Document(response.text)
        readability_html = doc.summary()
        readability_soup = BeautifulSoup(readability_html, "html.parser")
        readability_text = readability_soup.get_text(separator=" ", strip=True)

        # If Readability extracted sparse content, try page-builder / CMS selectors
        # Priority order: semantic HTML first, then common page-builder classes
        CONTENT_SELECTORS = [
            "article",
            "main",
            "#main-content",
            ".entry-content",
            ".post-content",
            ".article-content",
            ".et_pb_section",       # Divi
            ".fl-builder-content",  # Beaver Builder
            ".elementor-section",   # Elementor
            ".wp-block-group",      # Gutenberg
            "#page-container",      # Divi fallback
        ]

        fallback_soup = None
        if len(readability_text) < 800:
            for selector in CONTENT_SELECTORS:
                matches = original_soup.select(selector)
                if not matches:
                    continue
                # Concatenate all matches into a single wrapper div
                wrapper = BeautifulSoup("<div></div>", "html.parser").div
                for m in matches:
                    wrapper.append(BeautifulSoup(str(m), "html.parser"))
                candidate_text = wrapper.get_text(separator=" ", strip=True)
                if len(candidate_text) > len(readability_text):
                    fallback_soup = wrapper
                    break

        soup = fallback_soup if fallback_soup else readability_soup

        if not title:
            title_tag = soup.find("h1") or soup.find("h2")
            title = (
                title_tag.get_text(strip=True)
                if title_tag and title_tag.get_text(strip=True)
                else doc.title() or "Untitled"
            )

        # Remove unwanted structural elements
        for unwanted in soup(["script", "style", "nav", "footer", "header", "aside"]):
            unwanted.decompose()

        allowed_tags = {
            "p", "h1", "h2", "h3", "h4", "h5", "h6",
            "ul", "ol", "li", "strong", "b", "em", "i",
            "a", "blockquote", "br", "span", "div",
            "table", "tr", "td", "th", "thead", "tbody",
        }

        def is_phone_or_email(href: str) -> bool:
            return href.lower().startswith(("tel:", "mailto:"))

        def clean_element(element):
            if element.name and element.name not in allowed_tags:
                element.unwrap()
                return

            if element.name:
                allowed_attrs = {
                    "a": ["href", "title", "target"],
                    "blockquote": ["cite"],
                }
                if element.name in allowed_attrs:
                    keep = {k: v for k, v in element.attrs.items() if k in allowed_attrs[element.name]}
                    element.attrs.clear()
                    element.attrs.update(keep)
                else:
                    element.attrs.clear()

                if element.name == "a" and "href" in element.attrs:
                    href = element["href"]
                    parsed_link = urlparse(href)
                    # Remove internal links (same domain or relative paths)
                    if (parsed_link.netloc and parsed_link.netloc.lower() == parsed_site) or href.startswith("/"):
                        element.unwrap()
                    elif not is_phone_or_email(href):
                        element["target"] = "_blank"

        for el in soup.find_all():
            clean_element(el)

        main = soup.find("div") or soup
        content_html = str(main)

        # Cleanup empty tags and excess whitespace
        content_html = re.sub(r"<p>\s*</p>", "", content_html)
        content_html = re.sub(r"<div>\s*</div>", "", content_html)
        content_html = re.sub(r"\s+", " ", content_html)

        # Unwrap single outer div
        cs = BeautifulSoup(content_html, "html.parser")
        if len(cs.contents) == 1 and getattr(cs.contents[0], "name", None) == "div":
            content_html = cs.div.decode_contents()

        if not content_html.strip() or len(content_html.strip()) < 50:
            print(f"Warning: very little content extracted from {url}")

        return {
            "title": title.strip(),
            "content": content_html,
            "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "url": url,
            "slug": slug,
        }

    except Exception as e:
        print(f"Failed to scrape {url}: {e}")
        return None
