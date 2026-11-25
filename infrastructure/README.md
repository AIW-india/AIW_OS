# AIW OS Infrastructure

This directory contains infrastructure, deployment, and container configurations for AIW OS.

## Contents
- Local development containers (PostgreSQL local fallback, Redis for future background jobs)
- Cloud deployment specifications and Dockerfiles

## Neon PostgreSQL
For standard development, AIW OS connects to the designated **Neon PostgreSQL development branch**. Configure `DATABASE_URL` in your `.env` file.
