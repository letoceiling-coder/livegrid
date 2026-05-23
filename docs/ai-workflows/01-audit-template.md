# LiveGrid Audit Template

## Mode

READ-ONLY AUDIT

NO CODE CHANGES.
NO FILE MODIFICATIONS.
NO MIGRATIONS.
NO REFACTORING.

Analysis only.

---

# gstack Workflow

Execute:

@gstack/.cursor/skills/gstack-plan-eng-review/SKILL.md

If needed additionally use:

* gstack-investigate
* gstack-review
* gstack-cso
* gstack-qa

Follow SKILL instructions from PREAMBLE through all steps.

---

# Required Context

Always inspect:

* PROJECT_FULL_CONTEXT.md
* docs/*
* routes/api.php
* App.tsx
* existing hooks
* existing services
* existing DB schema

If feature touches imports:

* inspect FeedImporter
* inspect UpsertService
* inspect ArchiveService

---

# Audit Objectives

Analyze:

* architecture
* API contracts
* frontend compatibility
* backend compatibility
* DB integrity
* import integrity
* RBAC/security
* performance risks
* production risks
* rollback complexity

---

# Required Output Format

## Scope

...

## Current State

...

## Existing Architecture

...

## Existing API

...

## Existing Frontend Flow

...

## Existing Backend Flow

...

## Existing DB Dependencies

...

## Risks

...

## Security Risks

...

## Performance Risks

...

## Production Risks

...

## High Risk Files

...

## Recommended Safe Approach

...

## Recommended Iteration Plan

...

## Rollback Complexity

...

## Final Recommendation

...

---

# Important Rules

DO NOT:

* invent architecture
* invent endpoints
* invent DB structure
* invent unsupported flows

ALWAYS:

* verify actual implementation
* verify routes/api.php
* verify services
* verify frontend consumers
* verify DB dependencies

Laravel production code is source of truth.
