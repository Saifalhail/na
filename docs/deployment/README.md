# Deployment Guide - Nutrition AI

This directory contains comprehensive deployment documentation for the Nutrition AI application.

## Quick Start

For immediate deployment:
- **Development**: See [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md)
- **Production**: See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- **Docker**: See [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)

## Documentation Structure

| File | Purpose |
|------|---------|
| `DEVELOPMENT_SETUP.md` | Local development environment setup |
| `PRODUCTION_DEPLOYMENT.md` | Production deployment guide |
| `DOCKER_DEPLOYMENT.md` | Docker-based deployment |
| `ENVIRONMENT_VARIABLES.md` | Environment configuration reference |
| `DATABASE_SETUP.md` | Database configuration and migration |
| `SSL_CERTIFICATES.md` | SSL/TLS setup and configuration |
| `MONITORING_SETUP.md` | Application monitoring and logging |

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Django API    │────│   PostgreSQL    │
│   (Nginx)       │    │   (Backend)     │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │      Redis      │
                       │   (Cache/Queue) │
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   CDN Storage   │
│ (React Native)  │────│    (Media)      │
└─────────────────┘    └─────────────────┘
```

## Prerequisites

- **Backend**: Python 3.10+, PostgreSQL 13+, Redis 6+
- **Frontend**: Node.js 18+, Expo CLI
- **Infrastructure**: Docker (optional), SSL certificates, domain name

## Support

For deployment issues:
1. Check the troubleshooting section in each deployment guide
2. Review logs in the monitoring setup
3. Consult the [troubleshooting guide](../guides/TROUBLESHOOTING.md)