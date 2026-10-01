"""Claude and MCP protocol constants shared by focused adapters."""

RESEARCH_TOOL = "research_destination_candidates"
MAP_TOOL = "resolve_candidate_locations"
SOURCE_TOOL = "get_candidate_sources"
ALLOWED_TOOLS = (RESEARCH_TOOL, MAP_TOOL, SOURCE_TOOL)


class GatewayProtocolError(RuntimeError):
    """A safe, provider-neutral failure while using the private MCP Gateway."""
