"""Strict research contracts; evidence is issued by the tool observer, never the model."""

from __future__ import annotations

import ipaddress
import re
from typing import Annotated, Literal
from urllib.parse import urlsplit, urlunsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def public_https_url(value: str) -> str:
    """Reject credentials, private literal hosts and ambiguous URL spellings."""
    if len(value) > 2048 or re.search(r"[\s\\\x00-\x1f]", value):
        raise ValueError("invalid source URL")
    parts = urlsplit(value)
    host = (parts.hostname or "").lower().rstrip(".")
    if (parts.scheme != "https" or not host or parts.username or parts.password
            or parts.port not in (None, 443) or "." not in host
            or host.endswith((".local", ".localhost", ".internal"))):
        raise ValueError("invalid source URL")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if re.fullmatch(r"[0-9.]+", host):
            raise ValueError("invalid source URL") from None
    else:
        if not address.is_global:
            raise ValueError("invalid source URL")
    return urlunsplit(("https", parts.netloc.lower(), parts.path, parts.query, ""))


class StrictResult(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ReadEvidence(StrictResult):
    evidence_id: str = Field(min_length=1, max_length=180, pattern=r"^[a-zA-Z0-9_-]+$")
    title: str = Field(min_length=1, max_length=180)
    url: str = Field(min_length=1, max_length=2048)
    read_status: Literal["read"]
    retrieved_at: str = Field(min_length=1, max_length=80)
    content: str = Field(min_length=1, max_length=2400)

    _url = field_validator("url")(public_https_url)


class EvidenceSelection(StrictResult):
    """The SDK can select observed evidence, but cannot manufacture its contents."""

    evidence_ids: list[Annotated[str, Field(min_length=1, max_length=180)]] = Field(max_length=9)
    uncertainty: list[Annotated[str, Field(min_length=1, max_length=300)]] = Field(max_length=5)


class ResearchResult(EvidenceSelection):
    answer: str = Field(min_length=1, max_length=2000)
    evidence: list[ReadEvidence] = Field(max_length=9)

    @model_validator(mode="after")
    def observed_citations(self) -> ResearchResult:
        known = {item.evidence_id for item in self.evidence}
        if set(self.evidence_ids) != known or len(self.evidence_ids) != len(known):
            raise ValueError("unobserved citation")
        urls = {item.url for item in self.evidence}
        for url in re.findall(r"https?://[^\s<>\]\)]+", self.answer):
            if public_https_url(url.rstrip(".,;")) not in urls:
                raise ValueError("unobserved citation")
        return self
