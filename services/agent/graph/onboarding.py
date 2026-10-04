"""Build the standalone, single-node traveler-intake LangGraph."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .nodes.onboarding_intake import OnboardingIntakeNode, OnboardingIntakeState


def build_onboarding_intake_graph(model: Any, *, checkpointer: Any | None = None):
    """Compile an intake-only graph with no tools or persistence edges."""
    graph = StateGraph(OnboardingIntakeState)
    graph.add_node("intake", OnboardingIntakeNode(model))
    graph.add_edge(START, "intake")
    graph.add_edge("intake", END)
    return graph.compile(checkpointer=checkpointer)
