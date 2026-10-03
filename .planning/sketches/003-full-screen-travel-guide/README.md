---
sketch: 003
name: full-screen-travel-guide
question: "How should a simple GPT-like travel chat surface current research and the travel facts it learns?"
winner: A — Clean Chat
tags: [travel-guide, full-screen, chat, research, memory]
---

# Sketch 003: Full-screen Travel Guide

## Design Question

How should a simple, full-screen chat show researched country facts and make it clear when the agent has updated the travel context it is using?

## How to View

Open `.planning/sketches/003-full-screen-travel-guide/index.html` or use the local sketch preview URL shown by the agent.

## Variants

- **A: Clean Chat (selected)** — a plain, centered conversation with inline source links.
- **B: Research Replies** — source-backed answers use compact fact cards inside the same chat thread.
- **C: Research Thread** — source checks, remembered preferences, and trip-context updates appear inline in the conversation.

All interactions, Tavily searches, memory retrieval, and state updates are simulated. Sample claims and sources are illustrative, not verified travel advice.

## What to Look For

- Does the chat feel like a simple GPT wrapper rather than a planning dashboard?
- Are citations easy to inspect without interrupting the conversation?
- Does incremental assistant text feel natural while agent context remains private?
