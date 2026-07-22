\# 03 — Repository Rules



Version: 1.0



\---



\# Purpose



This document defines the repository structure and the rules for modifying files inside the SIGNAL13 project.



Its purpose is to ensure that every engineer, whether human or AI, understands which files are active, which files are historical, and how changes should be made safely.



\---



\# Repository Philosophy



The repository is the single source of truth for SIGNAL13 development.



Changes should always be intentional, reviewable, and reversible.



Never modify files simply because they appear unused.



Always confirm their purpose first.



\---



\# Repository Zones



The repository is divided into several logical zones.



\## Active



Contains the current implementation of SIGNAL13.



Files inside this area may be modified after approval.



Examples:



\- gateway.js

\- dashboard/

\- Launcher_v2/

\- server/

\- docs/

\- package.json



\---



\## Documentation



Contains project documentation.



Documentation should evolve together with the software.



Examples:



\- README.md

\- docs/

\- foundation/



\---



\## Archive



Contains historical versions.



Archive files are references.



Do not modify archive contents.



Do not use archive files as implementation targets unless explicitly instructed.



Examples:



\- BACKUP\_SIGNAL13-V1.0/

\- \_FREEZE\_2026-07-16/



\---



\## External Dependencies



Contains third-party software.



These files are not owned by SIGNAL13.



Avoid modifying them unless absolutely necessary.



Examples:



\- node\_modules/

\- tools/cloudflared.exe



\---



\# Source of Truth



Before implementing any feature, identify the canonical implementation.



Never assume multiple files should be edited.



If duplicate implementations exist:



\- explain the situation;

\- recommend one source of truth;

\- wait for approval.



\---



\# Legacy Files



Some files may remain in the repository for compatibility or historical reasons.



Do not delete legacy files without approval.



Instead:



\- identify them;

\- explain why they appear to be legacy;

\- recommend an action.



\---



\# File Deletion



Never delete files immediately.



Recommended process:



1\. Identify.

2\. Explain.

3\. Mark as legacy.

4\. Wait for approval.

5\. Remove only after approval.



\---



\# Folder Creation



New folders should only be created when they improve the architecture.



Avoid unnecessary nesting.



Prefer simple structures.



\---



\# Refactoring



Large refactoring must be incremental.



Never refactor unrelated modules in the same task.



Small, reviewable changes are preferred.



\---



\# Configuration



Avoid hardcoded paths.



Configuration should gradually move into centralized configuration files.



\---



\# Documentation First



Whenever a major architectural change is proposed:



1\. Explain the change.

2\. Explain the reason.

3\. Explain the impact.

4\. Wait for approval.

5\. Implement.



\---



\# Final Principle



Protect the repository.



Future engineers should always understand:



\- what is active;

\- what is archived;

\- what is experimental;

\- what is production.



A clean repository is part of software quality.

