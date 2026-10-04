"""Claude and MCP protocol constants shared by focused adapters."""

MAP_TOOL = "resolve_candidate_locations"
SOURCE_TOOL = "get_candidate_sources"
# Destination discovery uses the Claude SDK's web tools exclusively. The private
# connector remains available only for map resolution and legacy source lookup.
ALLOWED_TOOLS = (MAP_TOOL, SOURCE_TOOL)


class GatewayProtocolError(RuntimeError):
    """A safe, provider-neutral failure while using the private MCP Gateway."""
