"""Public business website links shared by provider and durable projections."""
import re
from typing import Annotated
from urllib.parse import urlsplit

from pydantic import AfterValidator, Field


def public_website(value: str) -> str:
    try:
        parsed = urlsplit(value)
        host = parsed.hostname or ""
        if (len(value) <= 2048 and parsed.scheme in {"https", "http"}
                and not re.search(r"[\s\\]", value)
                and not parsed.username and not parsed.password
                and parsed.port in (None, 443 if parsed.scheme == "https" else 80)
                and "." in host and not re.fullmatch(r"[\d.]+", host) and ":" not in host
                and not re.search(r"(^localhost$|\.(local|internal|localhost)$)", host)):
            return value
    except ValueError:
        pass
    raise ValueError("Use a public HTTP or HTTPS website without credentials.")


WebsiteUrl = Annotated[str, Field(max_length=2048), AfterValidator(public_website)]
