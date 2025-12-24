# CLAUDE.md - AfterDark Ecosystem Operations Guide

## Mission Control for Autonomous Infrastructure Operations

This document provides Claude with comprehensive instructions for operating, testing, debugging, enhancing, and deploying the AfterDark ecosystem infrastructure.

---

## Ecosystem Overview

### Projects in Scope

| Project | Path | Type | Description |
|---------|------|------|-------------|
| **afterdark-validation-kit** | `.` | Toolkit | Infrastructure validation, testing, monitoring |
| **warp-oci** | `../warp-oci` | Cloud Platform | On-demand Warp AI agent hosting on OCI |
| **n8nworkflo.ws** | `../n8nworkflo.ws` | n8n Deployment | Workflow automation platform |
| **ecosystem.zone** | `../ecosystem.zone` | Static Site | Ecosystem marketing/landing page |
| **infrastructure.zone** | `../infrastructure.zone` | Platform | Multi-tenant infrastructure rental + Click-to-Run |
| **afterdarksys.com** | `../afterdarksys.com` | Main Site | Central SSO provider, admin portal |
| **afterdarksys.com/migration** | `../afterdarksys.com/migration` | Migration Tool | Multi-provider migration platform |
| **oci-n8n** | `../oci-n8n` | n8n Deployment | Oracle Cloud n8n infrastructure |
| **claude-cloudflare-skill** | `../claude-cloudflare-skill` | Claude Skill | Cloudflare management skill |
| **coredns** | `../coredns` | DNS Toolkit | CoreDNS management and migration tools |
| **dnsscience-tools** | `../dnsscience-tools` | DNS Toolkit | DNS analysis and network engineering suite |
| **adsops-utils** | `../adsops-utils` | Change Management | Enterprise change management CLI/API with compliance |
| **adait** | `../adait` | AI Platform | After Dark AI Tools - ML orchestration platform |
| **ads_buildservices** | `../ads_buildservices` | Build System | Ansible collections & Terraform providers |
| **changes.afterdarksys.com** | `../afterdarksys.com/subdomains/changes` | Web UI | Change management frontend |

### Sites Portfolio (22+ domains)

**Priority 1 (Revenue Critical):**
- afterdarksys.com, login.afterdarksys.com (SSO)
- changes.afterdarksys.com (Change Management)
- n8nworkflo.ws (SaaS)
- infrastructure.zone, aiserve.farm (Platform)
- dnsscience.io, hostscience.io (Services)

**Priority 2 (Active):**
- lonely.fyi, veribits.com, 9lives.xyz, undatable.me
- politics.place, outofwork.life, disease.zone
- web3dns.io, flipdomain.io, flipid.io

**Priority 3 (Development):**
- nerdycupid.ai

---

## Quick Start Commands

### Validation Kit

```bash
# Run all validation tests
npm test

# Run specific test suites
npm run test:api        # API endpoint validation
npm run test:security   # Security scanning
npm run test:cdn        # CDN/Cloudflare/DNS tests
npm run test:database   # Neon + OCI database tests
npm run test:sites      # Site functional tests

# Import API keys from all projects
npm run import-keys:projects      # Scan all configured projects
npm run import-keys:dry           # Dry run (preview without writing)
npm run list-projects             # List configured project paths

# Generate reports
npm run report
```

### Warp-OCI Infrastructure

```bash
cd ../warp-oci

# Infrastructure lifecycle
make init              # Initialize Terraform
make infrastructure    # Deploy OCI resources (VCN, OKE)
make build             # Build Docker images
make push              # Push to registry
make deploy            # Deploy to Kubernetes
make status            # Check deployment status
make endpoint          # Get LoadBalancer IP

# Operations
make logs COMPONENT=api-gateway
make scale COMPONENT=session-manager REPLICAS=5
make upgrade           # Rolling update
make rollback          # Rollback deployment
```

---

## Using the Enterprise Systems Architect Agent

For complex infrastructure diagnosis, remediation, and architectural decisions, use the **enterprise-systems-architect** agent. This agent specializes in:

- AWS, Docker, Asterisk, PostgreSQL systems
- Database performance optimization
- Scalability architecture
- Infrastructure troubleshooting
- Proactive deployment review

### When to Invoke

```
Use Task tool with subagent_type="enterprise-systems-architect" when:

1. Diagnosing infrastructure failures (DNS, SSL, connectivity)
2. Reviewing deployment configurations
3. Designing scalable architectures
4. Optimizing database performance
5. Planning remediation strategies
```

### Example Prompts for the Agent

```
"Analyze the validation report at reports/validation-report-*.json and create a comprehensive remediation plan for all failing tests."

"Review the warp-oci Kubernetes manifests in ../warp-oci/kubernetes/ and identify potential scaling bottlenecks."

"Diagnose why 12 sites are returning ENOTFOUND errors. Check DNS configuration, Route53 records, and ALB health."

"Design a high-availability architecture for the n8n deployment that can handle 10,000 concurrent workflows."
```

---

## Testing & Debugging Workflow

### Phase 1: Discovery & Baseline

```bash
# 1. Run full validation suite
npm test 2>&1 | tee reports/baseline-$(date +%Y%m%d).log

# 2. Analyze results
cat reports/validation-report-*.json | jq '.summary'

# 3. Identify failure categories
cat reports/validation-report-*.json | jq '.tests | to_entries | .[] | select(.value.failed > 0)'
```

### Phase 2: Root Cause Analysis

1. **DNS Issues (ENOTFOUND/ENODATA)**
   - Check Route53 hosted zones exist
   - Verify A records point to correct ALB/IP
   - Confirm nameservers at registrar match Route53 NS records

2. **SSL Issues (DEPTH_ZERO_SELF_SIGNED_CERT)**
   - Check ACM certificate status
   - Verify ALB has correct SNI certificate
   - Confirm certificate covers domain + www subdomain

3. **API Failures**
   - Check if cascading from DNS issues
   - Verify backend services running
   - Check security groups/firewall rules

4. **Database Failures**
   - Test Neon API connectivity
   - Verify connection strings
   - Check OCI credentials configured

### Phase 3: Remediation

Use the enterprise-systems-architect agent for complex fixes:

```javascript
// Example: Fix DNS for a site
Task({
  subagent_type: "enterprise-systems-architect",
  prompt: `
    Fix DNS for aeims.app:
    1. Verify Route53 hosted zone Z0819048KQ6II7V1JPW6 exists
    2. Create A record pointing to ALB aeims-alb-production
    3. Create www CNAME or A record
    4. Wait for propagation and verify with dig
    5. Update validation config if needed
  `
})
```

### Phase 4: Verification

```bash
# Re-run tests for specific site
npm run test:sites -- -s aeims.app

# Run full validation
npm test

# Compare with baseline
diff reports/baseline-*.log reports/validation-report-*.md
```

---

## Enhancement Opportunities

### Performance Optimizations

1. **Caching Layer**
   - Add Redis caching for API responses
   - Implement edge caching with Cloudflare
   - Cache database queries

2. **Load Balancing**
   - Optimize ALB target group health checks
   - Implement connection draining
   - Configure auto-scaling policies

3. **Database**
   - Review Neon connection pooling
   - Optimize slow queries
   - Implement read replicas

### Security Enhancements

1. **Authentication**
   - Audit SSO implementation
   - Review JWT token expiration
   - Implement MFA for admin accounts

2. **Headers & Policies**
   - Add CSP headers
   - Implement HSTS preloading
   - Review CORS configuration

3. **Monitoring**
   - Set up intrusion detection
   - Configure rate limiting
   - Implement DDoS protection

---

## Monetization Opportunities

### Current Revenue Streams

1. **SaaS Subscriptions**
   - n8nworkflo.ws (workflow automation)
   - infrastructure.zone (compute rental)
   - aiserve.farm (AI services)

2. **API Services**
   - dnsscience.io (DNS analytics)
   - hostscience.io (hosting services)

### New Revenue Ideas

1. **Warp-OCI as a Service**
   - Charge per agent session
   - Tiered pricing: Free (limited), Pro ($X/mo), Enterprise
   - BYOK (Bring Your Own Key) vs platform-provided

2. **n8n Marketplace**
   - Sell premium workflow templates
   - Custom node development service
   - Managed workflow hosting

3. **Infrastructure Rental**
   - Kubernetes namespace rental
   - Managed PostgreSQL databases
   - GPU compute for AI workloads

4. **Consulting/Services**
   - Infrastructure audit service
   - Migration assistance
   - Custom development

### Implementation Priority

| Opportunity | Effort | Revenue Potential | Priority |
|-------------|--------|-------------------|----------|
| Warp-OCI subscriptions | Medium | High | 1 |
| n8n template marketplace | Low | Medium | 2 |
| GPU compute rental | High | High | 3 |
| Consulting packages | Low | Medium | 4 |

---

## Migration Platform (NEW)

### Overview
The After Dark Systems Migration Platform enables customers to migrate from various cloud providers to AfterDark infrastructure.

### Supported Source Providers
- Vercel (static sites, serverless, Next.js)
- Fly.io (Docker containers)
- Netlify (static sites, serverless)
- Digital Ocean App Platform
- Hostinger (shared hosting, VPS)
- Rackspace (cloud servers)
- Kintone (low-code databases → Neon)

### Features
- **CLI Client** (`ads-migrate`) - downloadable, requires AfterDark account
- **Web Interface** - migration.afterdarksys.com
- **Infrastructure Analyzer** - scans source with progress tracking
- **DNS Management** - `--set-dns cloudflare|oracle|aws|dnsscience`
- **Zone File Import** - accept standard BIND zone files
- **DNS Brute Force** - discover all DNS records automatically
- **Rollback Support** - revert migrations if needed

### Quick Start
```bash
# Install CLI
npm install -g @afterdark/migrate

# Login
ads-migrate login

# Analyze existing infrastructure
ads-migrate analyze --provider vercel

# Create migration plan
ads-migrate plan create

# Execute migration
ads-migrate start --dns cloudflare
```

**Location:** `../afterdarksys.com/migration/`

---

## Click-to-Run Deployment Service (NEW)

### Overview
One-click deployment of applications to After Dark infrastructure.

### Supported Runtimes
- **Python**: Flask, FastAPI, Django
- **Node.js**: Express, Next.js, Remix, Nuxt
- **PHP**: Laravel, WordPress, Symfony

### Deployment Tiers
| Tier | Price | Deployments | CPU | Memory | Storage |
|------|-------|-------------|-----|--------|---------|
| Free | $0 | 1 | 0.25 cores | 256MB | 1GB |
| Starter | $9.99/mo | 3 | 0.5 cores | 512MB | 5GB |
| Pro | $29.99/mo | 10 | 2 cores | 2GB | 20GB |
| Business | $99.99/mo | Unlimited | 8 cores | 16GB | 100GB |

### Pre-built Templates
- FastAPI Starter, Flask Starter, Django Starter
- Next.js Starter, Express API, Remix Starter
- Laravel Starter, WordPress
- AI Chatbot (premium), Custom n8n (premium)

### Quick Start
```bash
# Deploy from template
POST /api/v1/deployments/template
{
  "template_id": "fastapi-starter",
  "name": "my-api",
  "tier": "starter"
}

# Deploy from GitHub
POST /api/v1/deployments/github
{
  "repo": "username/repo",
  "branch": "main",
  "name": "my-app"
}
```

**Location:** `../infrastructure.zone/backend/app/services/deployment.py`

---

## Change Management Platform (adsops-utils)

### Overview
Enterprise change management system with multi-industry compliance support. Provides CLI toolkit, REST API, and web interface for ticket-based change tracking.

### Key Features
- **Ticket Lifecycle**: Create, Submit, Approve, Close change requests
- **Multi-Industry Support**: Healthcare, IT, Government, Insurance, Finance
- **Compliance Frameworks**: GLBA, SOX, HIPAA, Banking Secrecy Act, GDPR, Custom
- **Approval Workflows**: Operations, IT, Risk, Change Management Board, AI Ops, Security, Network Engineering, Cloud
- **Audit Trail**: Immutable record of all changes with complete revision history

### Authentication Methods
- After Dark Systems Central Auth (OAuth2/OIDC)
- Google OAuth2
- Passkeys/WebAuthn (FIDO2)
- Email/Password with MFA (TOTP)

### Quick Start
```bash
# CLI Usage
cd ../adsops-utils
make run-api          # Start API server on :8080

# CLI Commands
changes config init   # Initialize CLI
changes auth login    # Authenticate
changes ticket create # Create new change request
changes ticket list   # List all tickets
changes ticket submit CHG-2025-00001  # Submit for approval
```

### API Endpoints
- `POST /v1/auth/login` - User authentication
- `GET/POST /v1/tickets` - Ticket CRUD
- `POST /v1/tickets/:id/submit` - Submit for approval
- `POST /v1/approvals/:id/approve` - Approve ticket
- `GET /v1/compliance/frameworks` - List compliance frameworks
- `GET /v1/reports/audit` - Generate audit reports

### Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                  changes.afterdarksys.com                   │
│                    (Next.js Frontend)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      adsops-utils                            │
│                    (Go Backend API)                          │
│  - Gin Framework                                             │
│  - PostgreSQL                                                │
│  - Redis                                                     │
│  - AWS SES/SQS                                              │
└─────────────────────────────────────────────────────────────┘
```

**Locations:**
- Backend API: `../adsops-utils/`
- Web Frontend: `../afterdarksys.com/subdomains/changes/`

---

## Admin Users & API Access

### Admin Accounts
- `admin@afterdarksys.com` - System Administrator
- `rjc@afterdarksys.com` - Ryan J. Cole (Primary Admin)
- `rams@afterdarksys.com` - RAMS Administrator

All admin users have:
- SUPER_ADMIN role with all permissions
- Unlimited API access (rateLimit: 0)
- Primary admin status in default organization

### API Key Management
Admin login automatically grants unlimited API rights. API keys are created during seed:
```bash
# Run seed to create admin users
cd ../afterdarksys.com/admin-panel
npx prisma db seed
```

---

## New Product Ideas

### 1. StatusPage.ai
**Concept:** AI-powered status page that automatically detects and reports outages

**Features:**
- Auto-detect from validation kit results
- Natural language incident updates
- Predictive maintenance alerts

**Implementation:**
```bash
# Use existing validation kit + n8n workflows
# Create public status endpoint at status.afterdarksys.com
# Integrate with Slack/Discord for alerts
```

### 2. DNS Analytics Dashboard (dnsscience.io)
**Concept:** Real-time DNS monitoring and analytics

**Features:**
- Query logging and analysis
- Performance benchmarking
- Security threat detection

### 3. Workflow Marketplace (n8nworkflo.ws/marketplace)
**Concept:** Buy/sell n8n workflow templates

**Features:**
- Template gallery
- One-click install
- Revenue sharing with creators

### 4. AI Agent Fleet Management
**Concept:** Orchestrate multiple Warp agents across tasks

**Features:**
- Agent pooling and scheduling
- Cost optimization
- Usage analytics

---

## Deployment Cycle

### Standard Deployment Flow

```
1. Development
   └── Code changes
   └── Local testing

2. Validation
   └── npm test (validation kit)
   └── Review reports
   └── Fix failures

3. Staging
   └── Deploy to staging environment
   └── Run integration tests
   └── Performance testing

4. Production
   └── Blue-green deployment
   └── Health check verification
   └── Monitor for 30 minutes
   └── Rollback if issues

5. Post-deployment
   └── Full validation run
   └── Update documentation
   └── Notify stakeholders
```

### Automated Deployment Commands

```bash
# Full deployment cycle for warp-oci
cd ../warp-oci
make all  # setup -> init -> infrastructure -> build -> push -> deploy -> endpoint

# Validate after deployment
cd ../afterdark-validation-kit
npm test

# Check specific sites
npm run test:sites -- -s warp-oci.afterdarksys.com
```

---

## Overnight Autonomous Operations Checklist

When running autonomously, follow this sequence:

### 1. Initial Assessment (30 min)
- [ ] Run `npm run list-projects` to verify project paths
- [ ] Run `npm run import-keys:dry` to check for new credentials
- [ ] Run `npm test` for baseline

### 2. Issue Diagnosis (2-4 hours)
- [ ] Parse latest validation report
- [ ] Categorize failures by type (DNS, SSL, API, DB)
- [ ] Use enterprise-systems-architect for complex issues
- [ ] Document root causes in INFRASTRUCTURE_DIAGNOSIS_AND_REMEDIATION.md

### 3. Infrastructure Improvements (2-4 hours)
- [ ] Fix critical DNS issues first (Priority 1 sites)
- [ ] Update SSL certificates where needed
- [ ] Verify OCI/AWS credentials configured
- [ ] Deploy infrastructure fixes

### 4. Enhancement Implementation (2-3 hours)
- [ ] Identify quick wins from enhancement list
- [ ] Implement caching where beneficial
- [ ] Add monitoring/alerting
- [ ] Update security configurations

### 5. New Features (1-2 hours)
- [ ] Prototype one monetization feature
- [ ] Create n8n workflow for automation
- [ ] Document new capability

### 6. Final Validation (1 hour)
- [ ] Run full test suite
- [ ] Compare with baseline
- [ ] Generate comprehensive report
- [ ] Document all changes made

---

## Important Files & Locations

### Configuration
- `config.json` - Main validation config
- `.env` - API credentials (DO NOT COMMIT)
- `../warp-oci/terraform/terraform.tfvars` - OCI settings
- `../warp-oci/kubernetes/` - K8s manifests

### Reports
- `reports/` - Validation reports (JSON, HTML, MD)
- `INFRASTRUCTURE_DIAGNOSIS_AND_REMEDIATION.md` - Issue tracking

### Key Testers
- `src/node/testers/api-tester.js` - API validation
- `src/node/testers/security-tester.js` - Security scanning
- `src/node/testers/cdn-tester.js` - CDN/DNS tests
- `src/node/testers/database-tester.js` - Database tests
- `src/node/testers/site-tester.js` - Functional tests

### Infrastructure
- `../warp-oci/terraform/` - OCI infrastructure as code
- `../warp-oci/kubernetes/` - K8s deployment manifests
- `../warp-oci/docker/` - Container definitions
- `../warp-oci/ansible/` - Configuration management

---

## Access & Credentials

All credentials are stored in `.env` files across projects. The validation kit can scan for and import them:

```bash
# Scan all projects and import credentials
npm run import-keys:projects

# The following credential types are detected:
# - AWS (access key, secret, region)
# - Oracle Cloud (tenancy, user, compartment OCIDs)
# - Cloudflare (API token, zone IDs)
# - Neon (API key, project IDs)
# - n8n (API key, encryption key, JWT secret)
# - PostgreSQL/Redis connection strings
```

---

## Success Metrics

Track these KPIs during autonomous operations:

1. **Test Pass Rate**: Target 95%+
2. **DNS Resolution**: All sites resolving
3. **SSL Validity**: All certs valid and not expiring within 30 days
4. **API Latency**: < 500ms p95
5. **Database Connectivity**: All Neon projects healthy
6. **Uptime**: 99.9% target

---

## Escalation

If encountering issues that cannot be resolved autonomously:

1. Document the issue thoroughly in reports/
2. Create detailed reproduction steps
3. Note what was attempted and why it failed
4. The user will review upon return

---

*Last Updated: December 23, 2025*
*Version: 2.1.0*

---

## Changelog (v2.1.0)

### New Projects Added (v2.1.0)
- `adsops-utils` - Enterprise change management CLI/API with multi-industry compliance
- `adait` - After Dark AI Tools - ML orchestration platform
- `ads_buildservices` - Ansible collections & Terraform providers for build automation
- `changes.afterdarksys.com` - Change management web frontend

### Previous Projects Added (v2.0.0)
- `claude-cloudflare-skill` - Cloudflare management skill for Claude Code
- `coredns` - CoreDNS toolkit with migration support
- `dnsscience-tools` - DNS analysis and network engineering suite
- `afterdarksys.com/migration` - Multi-provider migration platform

### New Features
- **Migration Platform** - Migrate from Vercel, Fly.io, Netlify, Digital Ocean, Hostinger, Rackspace, Kintone
- **Click-to-Run Deployment** - One-click deploy for Python, Node.js, PHP apps
- **Admin User Management** - rjc@afterdarksys.com, rams@afterdarksys.com with unlimited API access
- **Deployment Templates** - 10+ pre-built templates including AI Chatbot and n8n

### DNS Status (27/30 domains resolving)
- Primary cluster: 129.153.158.177 (16 domains)
- Secondary cluster: 129.80.158.147 (5 domains)
- Missing: cdn.afterdarksys.com, dnsscience.afterdarksys.com, migration.afterdarksys.com

### Revenue Projections
- Migration Platform: $58K-$300K Year 1, $300K-$1.5M Year 2
- Click-to-Run: $9.99-$99.99/mo per customer
- Combined potential: $500K+ Year 2
