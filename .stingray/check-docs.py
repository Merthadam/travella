#!/usr/bin/env python3
"""Strict drift check for the Travella documentation views (.stingray/views/system-*.yaml).

`stingray-views check` only fails on rule errors. This also fails when the code a diagram
documents has moved on:
  - a rule matches nothing (the anchored code was renamed or removed),
  - a rule matched but emitted nothing (a capture it needs disappeared),
  - an Agent -> CRUD endpoint has no CRUD handler (client path and route disagree).

Usage: python3 .stingray/check-docs.py   (exit 1 on drift)
"""
import glob
import json
import shutil
import subprocess
import sys

cli = shutil.which("stingray-views") or "stingray-views"
problems = []
for view in sorted(glob.glob(".stingray/views/system-*.yaml")):
    out = subprocess.run([cli, "check", view, "--json"], capture_output=True, text=True)
    try:
        result = json.loads(out.stdout)["result"]
    except (ValueError, KeyError):
        problems.append(f"{view}: check failed: {out.stderr.strip()[:300]}")
        continue
    if result.get("error"):
        problems.append(f"{view}: {result['error']}")
    for rule in result["diagnostics"].get("rules", []):
        for message in rule["errors"]:
            problems.append(f"{view}: {rule['rule']}: {message}")
        if rule["matches"] == 0:
            problems.append(f"{view}: {rule['rule']} matched nothing (code renamed or removed?)")
        elif rule["emitted"] == 0:
            problems.append(f"{view}: {rule['rule']} matched but emitted nothing")
    for node in result["nodes"]:
        if node["kind"] == "endpoint" and not node["fields"]:
            problems.append(f"{view}: endpoint '{node['label']}' has no CRUD route ({node['detail'].split(' with ')[0]})")
    print(f"{'checked':8} {view}: {len(result['nodes'])} nodes, {len(result['edges'])} edges")

for problem in problems:
    print(f"DRIFT    {problem}")
sys.exit(1 if problems else 0)
