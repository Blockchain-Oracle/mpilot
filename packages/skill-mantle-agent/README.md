<p align="center">
  <a href="https://github.com/Blockchain-Oracle/mpilot">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner-dark.svg">
      <img alt="mPilot" src="https://raw.githubusercontent.com/Blockchain-Oracle/mpilot/main/assets/banner.svg" width="100%">
    </picture>
  </a>
</p>

# @mpilot/skill-mantle-agent

The mPilot **Agent Skill** package — installable into Claude (and compatible agent runtimes) so the model can drive the mPilot autonomous DeFi agent on Mantle through a small, permissioned tool surface.

The user-facing contract lives in **[`SKILL.md`](./SKILL.md)** (the source of truth): skill name,
description, supported chains (5000 / 5003), the hosted MCP server URL, and the tool list with
per-tool permissions (`get_agent_state`, `get_reputation`, `get_attestation`, …).

This package ships the skill manifest, asset/icon, JSON schemas, and reference docs — no runtime code.
The actual tools are served by the mPilot MCP server (`@mpilot/mcp`); the skill is the thin,
discoverable wrapper that points an agent host at them.

Part of [mPilot](https://github.com/Blockchain-Oracle/mpilot).
