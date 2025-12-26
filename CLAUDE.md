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
| **systemapi.io** | `../systemapi.io` | API Platform | System/infrastructure management APIs |
| **computeapi.io** | `../computeapi.io` | Compute Platform | On-demand compute orchestration with billing |
| **vault-oci** | `../vault-oci` | Secrets Management | HashiCorp Vault on OCI K8s with cert-manager PKI |
| **keycloak-oci** | `../keycloak-oci` | Identity Platform | Keycloak IAM on OCI K8s for SSO/OIDC |
| **secretserver.io** | `../secretserver.io` | Secrets Platform | Managed secrets & certificate management with Stripe billing |
| **llmsecurity.dev** | `../llmsecurity.dev` | Security Platform | AI/LLM threat detection, model scanning & threat intelligence |
| **ads-ai-staff** | `../ads-ai-staff` | AI Staff Platform | AI-powered staff with executive team, chatbots, n8n integration |
| **telcocloud.io** | `../telcocloud.io` | Telecom Platform | TelcoCloud services platform (Next.js) |
| **adstelco.io** | `../adstelco.io` | Telecom Platform | After Dark Systems Telco platform (Next.js) |
| **telcocloud-workers** | `../telcocloud-workers` | Cloudflare Workers | TelcoCloud edge workers |
| **telcocloud-shared** | `../telcocloud-shared` | Shared Library | TelcoCloud shared TypeScript library |
| **telcocloud-cli** | `../telcocloud-cli` | CLI Tool | TelcoCloud command-line interface |
| **blasebase.com** | `../blasebase.com` | DBaaS Platform | Database-as-a-Service with BlazeDB (SQLite), BlazeCache (Redis), BlazeTSDB (InfluxDB) |
| **adsaichat-cli** | `../adsaichat-cli` | CLI Tool | Swiss army knife CLI for testing AI models via OpenRouter |

### Sites Portfolio (24+ domains)

**Priority 1 (Revenue Critical):**
- afterdarksys.com, login.afterdarksys.com (SSO)
- changes.afterdarksys.com (Change Management)
- n8nworkflo.ws (SaaS)
- infrastructure.zone, aiserve.farm (Platform)
- dnsscience.io, hostscience.io (Services)
- systemapi.io, computeapi.io (API Platforms)
- secretserver.io (Managed Secrets)
- llmsecurity.dev (AI Security)
- telcocloud.io, adstelco.io (Telecom Platform)

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

### Vault-OCI (Secrets Management)

```bash
cd ../vault-oci

# Deploy Vault via Helm
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault -n vault -f vault-values.yaml

# Initialize and unseal Vault
kubectl exec -n vault vault-0 -- vault operator init -key-shares=1 -key-threshold=1
kubectl exec -n vault vault-0 -- vault operator unseal <unseal-key>

# Check Vault status
kubectl exec -n vault vault-0 -- vault status

# Apply cert-manager ClusterIssuer
kubectl apply -f vault-issuer.yaml

# Local CLI access (set VAULT_ADDR and VAULT_TOKEN first)
vault status
vault secrets list
```

### SecretServer.io (Managed Secrets Platform)

```bash
cd ../secretserver.io

# Build and run
make build             # Build Go binary
make run               # Run API server

# CLI usage (adkm)
adkm cert list         # List certificates
adkm cert renew --all  # Renew expiring certificates
adkm secret set KEY    # Store a secret
adkm secret get KEY    # Retrieve a secret

# Stripe integration
./setup_stripe_products.sh  # Create products in Stripe
```

### LLMSecurity.dev (AI/LLM Security Platform)

```bash
cd ../llmsecurity.dev

# Build and run
make build             # Build Go services
make run               # Run API server

# Core capabilities
# - Model Scanner: Static analysis of model files
# - Runtime Sentinel: Dynamic behavior monitoring
# - Threat Intel Feed: Global AI attack intelligence
# - Compliance: OWASP LLM Top 10, EU AI Act mapping
```

### adsaichat-cli (AI Model Testing)

```bash
cd ../adsaichat-cli

# Install globally (optional)
npm link

# Start interactive chat
node index.js

# With API key
node index.js -k "sk-or-v1-..."

# With specific model
node index.js -m "openai/gpt-4o"

# List all available models
node index.js -l

# Use proxy endpoints
node index.js -p systemapi     # Route through systemapi.io
node index.js -p computeapi    # Route through computeapi.io

# Interactive commands (once running):
# /model gpt4         - Switch to GPT-4
# /model claude       - Switch to Claude
# /models llama       - Search for Llama models
# /config             - Show current configuration
# /save session.json  - Save conversation
# /load session.json  - Load conversation
```

**Config file:** `~/.adsaichat.json`
```json
{
  "apiKey": "sk-or-v1-...",
  "model": "anthropic/claude-3.5-sonnet",
  "endpoint": "https://openrouter.ai/api/v1"
}
```

**Environment variables:** `OPENROUTER_API_KEY` or `ADS_API_KEY`

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

## AI Staff Executive Team Integration

For strategic decisions, planning, and business coordination, consult the **AI Staff Executive Team** at `../ads-ai-staff/`.

### Executive Team Members

| Name | Role | Expertise | When to Consult |
|------|------|-----------|-----------------|
| **Marcus Chen** | CEO / Executive Director | Strategic decisions, business oversight, agent coordination | Major initiatives, resource allocation, cross-team coordination |
| **Diana Reyes** | Chief Strategy Officer | OKRs, roadmaps, competitive analysis, change management | Planning, prioritization, measuring success |

### Quick Access

```bash
cd ../ads-ai-staff

# Talk to the CEO
./scripts/talk_to_ceo.sh "Need strategic decision on prioritizing infrastructure fixes vs new features"

# Consult CSO for planning
python3 cli/ads_support.py  # Interactive CLI - select Diana Reyes

# View all staff
./scripts/staff_status.sh
```

### When to Involve Executive Team

1. **Strategic Decisions**
   - Prioritizing between competing initiatives
   - Resource allocation across projects
   - Go/no-go decisions on new features

2. **Planning & Roadmaps**
   - Quarterly OKR development
   - Long-term infrastructure planning
   - Competitive positioning

3. **Cross-Functional Coordination**
   - Multi-team initiatives
   - Compliance-impacting changes
   - Customer-facing decisions

### Delegation Chain

The Executive Team can delegate to specialized staff:

```
Marcus Chen (CEO)
├── Diana Reyes (Strategy) → Planning, OKRs
├── Sofia Martinez (Marketing) → SEO, social media
├── Pat Williams (Compliance) → PCI-DSS, SOX, HIPAA
├── Kai Nakamura (Linux) → System architecture
├── Jordan Blake (Cloud) → AWS, OCI, Cloudflare
└── Chris Anderson (Finance) → Billing, invoicing
```

### Integration with Validation Kit

When validation failures require strategic decisions:

```bash
# 1. Run validation
npm test

# 2. If strategic decision needed, consult CEO
cd ../ads-ai-staff
./scripts/talk_to_ceo.sh "Validation found 15 Priority 1 failures and 8 Priority 2. Need guidance on remediation priority given Q1 revenue targets."

# 3. For roadmap/timeline planning, consult CSO
./scripts/talk_to_ceo.sh "Diana, need a remediation roadmap for infrastructure issues identified in validation report."
```

**Location:** `../ads-ai-staff/`

---

## Integrated Development & Operations Workflow

**CRITICAL:** All significant work MUST follow this integrated workflow. AI Staff consultation is mandatory for planning, development, engineering, analysis, security, devops, strategy, and execution phases.

### Phase 0: Strategic Alignment (AI Staff)

Before beginning any significant task, consult AI Staff for strategic alignment:

```bash
cd ../ads-ai-staff

# For new initiatives, features, or major changes
./scripts/talk_to_ceo.sh "New initiative: [describe]. Need strategic alignment and priority assessment."

# For planning and roadmap integration
./scripts/talk_to_ceo.sh "Diana, need to integrate [task] into our roadmap. What are the dependencies and priorities?"
```

### Phase 1: Analysis & Gap Assessment

**Step 1a: Technical Analysis (Enterprise Systems Architect)**
```javascript
Task({
  subagent_type: "enterprise-systems-architect",
  prompt: `
    Perform comprehensive analysis for [initiative]:
    1. Current state assessment
    2. Gap analysis against requirements
    3. Technical feasibility evaluation
    4. Risk identification
    5. Integration points with existing systems
  `
})
```

**Step 1b: Strategic Review (AI Staff)**
```bash
# Present findings to executive team
./scripts/talk_to_ceo.sh "Analysis complete for [initiative]. Key gaps: [list]. Risks: [list]. Need strategic go/no-go decision."

# For compliance-impacting changes
python3 cli/ads_support.py  # Consult Pat Williams (Compliance)

# For infrastructure decisions
python3 cli/ads_support.py  # Consult Jordan Blake (Cloud) or Kai Nakamura (Linux)
```

### Phase 2: Planning & Design

**Step 2a: Technical Design (Enterprise Systems Architect)**
```javascript
Task({
  subagent_type: "enterprise-systems-architect",
  prompt: `
    Design implementation plan for [initiative]:
    1. Architecture diagrams
    2. Component specifications
    3. Integration patterns
    4. Security considerations
    5. Scalability approach
    6. Rollback strategy
  `
})
```

**Step 2b: Strategic Validation (AI Staff CSO)**
```bash
# Diana Reyes validates plan alignment with OKRs
./scripts/talk_to_ceo.sh "Diana, review implementation plan for [initiative]. Does this align with Q[X] objectives?"
```

### Phase 3: Development & Engineering

**Iterative Development Loop:**
1. Implement changes with guidance from AI Staff specialists
2. Consult Jordan Blake (Cloud) for AWS/OCI/Cloudflare decisions
3. Consult Kai Nakamura (Linux) for system architecture
4. Consult Pat Williams (Compliance) for regulatory requirements

```bash
# Example: Cloud architecture decision
python3 cli/ads_support.py  # Select Jordan Blake
# "Should we use OCI Load Balancer or Cloudflare for this service?"

# Example: Security review
python3 cli/ads_support.py  # Select Pat Williams
# "Review this implementation for PCI-DSS compliance"
```

### Phase 4: Security & Compliance Review

**Mandatory before any deployment:**

```bash
# Security review with Pat Williams
./scripts/talk_to_ceo.sh "Pat, security review needed for [changes]. Please assess compliance impact."

# Use llmsecurity.dev for AI components
cd ../llmsecurity.dev
make scan MODEL=[model-path]  # For AI/ML components
```

### Phase 5: DevOps & Deployment

**Step 5a: Change Management (adsops-utils)**
```bash
cd ../adsops-utils
changes ticket create --title "[Initiative] Deployment" --type standard
changes ticket submit CHG-2025-XXXXX
# Await approvals from required teams
```

**Step 5b: Deployment with AI Staff Coordination**
```bash
# Notify stakeholders
./scripts/talk_to_ceo.sh "Deploying [initiative]. ETA: [time]. Rollback plan ready."

# Execute deployment
cd ../warp-oci && make deploy  # or appropriate deploy command

# Post-deployment notification
./scripts/talk_to_ceo.sh "Deployment complete. Monitoring for issues."
```

### Phase 6: Validation & Execution Monitoring

```bash
# Run validation suite
cd ../afterdark-validation-kit
npm test

# Report results to AI Staff
./scripts/talk_to_ceo.sh "Deployment validation: [X] passed, [Y] failed. [Details]"
```

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATED OPERATIONS WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  AI Staff    │───▶│  Enterprise  │───▶│  AI Staff    │               │
│  │  (Strategy)  │    │  Sys Arch    │    │  (Validate)  │               │
│  │  Marcus/Diana│    │  (Analysis)  │    │  (Go/No-Go)  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                        │
│         ▼                   ▼                   ▼                        │
│  ┌──────────────────────────────────────────────────────┐               │
│  │              DEVELOPMENT & ENGINEERING                │               │
│  │  • Jordan Blake (Cloud) • Kai Nakamura (Linux)       │               │
│  │  • Pat Williams (Compliance) • Chris Anderson (Fin)  │               │
│  └──────────────────────────────────────────────────────┘               │
│         │                                                                │
│         ▼                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │  Security    │───▶│  Change Mgmt │───▶│  Deploy &    │               │
│  │  Review      │    │  (adsops)    │    │  Monitor     │               │
│  │  (Pat)       │    │  Approvals   │    │  Validation  │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Service Lifecycle Policy

### No Decommissioning Policy

**CRITICAL: Services are NEVER decommissioned.** Instead, follow the legacy tagging procedure:

### Legacy Tagging Procedure

When a service is no longer actively developed or is superseded:

1. **Tag as Legacy** - Add `status: legacy` to service metadata
2. **Document Reason** - Record why service is legacy (superseded by X, low usage, etc.)
3. **Maintain Operations** - Continue monitoring, security patches, infrastructure
4. **Preserve Data** - All data must remain accessible
5. **Update Portal** - Mark as legacy in Central Portal

### Legacy Service States

| State | Description | Support Level |
|-------|-------------|---------------|
| `active` | Full development and support | Full |
| `maintenance` | Bug fixes and security only | Security + Critical Bugs |
| `legacy` | No new development, operational only | Security Only |
| `archived` | Read-only, preserved for compliance | None (data access only) |

### Tagging in Code/Config

```yaml
# In service metadata (k8s, config, etc.)
metadata:
  labels:
    afterdark.io/status: legacy
    afterdark.io/legacy-since: "2025-12-25"
    afterdark.io/superseded-by: "new-service-name"
    afterdark.io/legacy-reason: "Replaced by v2 architecture"
```

### Legacy Tracking in Change Management

All legacy transitions require a change ticket:
```bash
cd ../adsops-utils
changes ticket create \
  --title "Mark [service] as Legacy" \
  --type standard \
  --compliance-framework "SOX" \
  --reason "Superseded by [new-service]"
```

---

## Central Portal & Account Management

### Overview

The AfterDark Central Portal (`login.afterdarksys.com`) is the single source of truth for:
- **Product Catalog** - All AfterDark products and services
- **Customer Accounts** - User profiles, organizations, entitlements
- **Licensing** - Software licenses, terms, and agreements
- **Platform Accounts** - Where users are active across the ecosystem
- **Audit Trails** - Complete history of all account changes
- **Change History** - Integration with adsops-utils ticketing

### Product Catalog Integration

The billing/account system MUST know the complete product catalog:

```typescript
// Product Catalog Schema
interface ProductCatalog {
  products: Product[];
  services: Service[];
  addons: Addon[];
  tiers: PricingTier[];
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: 'saas' | 'api' | 'infrastructure' | 'consulting';
  platforms: string[];  // Which platforms this product exists on
  status: 'active' | 'legacy' | 'beta';
  pricing: PricingConfig;
  entitlements: Entitlement[];
}
```

### Tracked Entities

| Entity | Description | Examples |
|--------|-------------|----------|
| **Terms** | Legal agreements, ToS versions, custom contracts | ToS v2.1, Enterprise Agreement |
| **Software Licenses** | License keys, types, expiration | n8n Pro License, Warp Enterprise |
| **Platform Accounts** | User presence across ecosystem | n8nworkflo.ws, infrastructure.zone |
| **Active Sessions** | Where user is currently logged in | login.afterdarksys.com, api sessions |
| **Audit Trail** | All actions with timestamps | Login, purchase, config change |
| **Change History** | Linked change tickets | CHG-2025-00001 |

### Integration with Change Management

```
┌─────────────────────────────────────────────────────────────┐
│                    CENTRAL PORTAL                            │
│              login.afterdarksys.com                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Product    │  │  Account    │  │  License    │          │
│  │  Catalog    │  │  Manager    │  │  Manager    │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          │                                   │
│                          ▼                                   │
│         ┌────────────────────────────────┐                   │
│         │        Audit Trail Engine      │                   │
│         │    (Immutable Event Log)       │                   │
│         └────────────────┬───────────────┘                   │
│                          │                                   │
│                          ▼                                   │
│         ┌────────────────────────────────┐                   │
│         │    Change Management Link      │◀──── adsops-utils │
│         │     (CHG-XXXX-XXXXX)          │                   │
│         └────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Audit Trail Requirements

Every portal action generates an audit event:

```typescript
interface AuditEvent {
  id: string;
  timestamp: Date;
  actor: {
    userId: string;
    email: string;
    role: string;
    ip: string;
  };
  action: AuditAction;
  resource: {
    type: 'user' | 'license' | 'subscription' | 'policy' | 'entitlement';
    id: string;
    name: string;
  };
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  changeTicket?: string;  // Link to adsops-utils ticket if applicable
  metadata: Record<string, any>;
}

type AuditAction =
  | 'create' | 'update' | 'delete'
  | 'login' | 'logout' | 'mfa_challenge'
  | 'grant_entitlement' | 'revoke_entitlement'
  | 'accept_terms' | 'upgrade' | 'downgrade';
```

### Platform Account Tracking

Track user presence across all AfterDark platforms:

```typescript
interface PlatformPresence {
  userId: string;
  platforms: {
    platform: string;        // e.g., "n8nworkflo.ws"
    accountId: string;       // Platform-specific ID
    status: 'active' | 'suspended' | 'trial';
    tier: string;            // Subscription tier
    createdAt: Date;
    lastActiveAt: Date;
    entitlements: string[];  // What they can do on this platform
  }[];
}
```

---

## Policy Engine

### Overview

The AfterDark Policy Engine provides centralized access control, entitlement management, and compliance enforcement across all platforms.

### Policy Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `pass` | Allow through without modification | Trusted internal traffic |
| `accept` | Explicitly approve and log | User access grant |
| `deny` | Block with reason | Unauthorized access attempt |
| `reject` | Block with error response | Invalid request |
| `entitlement` | Grant/revoke capability | Feature access control |
| `group` | Apply group-based policy | Team permissions |

### Policy Schema

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  priority: number;  // Lower = higher priority

  // Conditions
  conditions: {
    users?: string[];       // User IDs or patterns
    groups?: string[];      // Group memberships
    roles?: string[];       // Role requirements
    platforms?: string[];   // Platform scope
    resources?: string[];   // Resource patterns
    timeWindows?: TimeWindow[];
    geoRestrictions?: GeoRule[];
  };

  // Actions
  action: 'pass' | 'accept' | 'deny' | 'reject';

  // Entitlements (if action is entitlement-related)
  entitlements?: {
    grant?: string[];
    revoke?: string[];
  };

  // Logging
  logging: {
    enabled: boolean;
    level: 'none' | 'summary' | 'detailed' | 'full';
    includePayload: boolean;
    retentionDays: number;
  };

  // Metadata
  status: 'active' | 'disabled' | 'testing';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  changeTicket?: string;  // adsops-utils reference
}
```

### Policy Examples

**1. Admin Access Policy**
```yaml
id: pol-admin-access
name: Administrator Full Access
priority: 1
conditions:
  roles: ["SUPER_ADMIN", "ADMIN"]
action: accept
logging:
  enabled: true
  level: full
  retentionDays: 365
```

**2. Platform Entitlement Policy**
```yaml
id: pol-n8n-pro
name: n8n Pro Features
priority: 100
conditions:
  platforms: ["n8nworkflo.ws"]
  groups: ["n8n-pro-subscribers"]
action: accept
entitlements:
  grant:
    - n8n.workflows.unlimited
    - n8n.executions.priority
    - n8n.support.priority
```

**3. Geo-Restriction Policy**
```yaml
id: pol-geo-restrict
name: OFAC Compliance Block
priority: 0
conditions:
  geoRestrictions:
    - type: deny
      countries: ["KP", "IR", "CU", "SY"]
action: reject
logging:
  enabled: true
  level: full
```

### Entitlement Groups

| Group | Description | Entitlements |
|-------|-------------|--------------|
| `free-tier` | Basic access | Core features, limited usage |
| `pro-tier` | Professional | All features, priority support |
| `enterprise-tier` | Enterprise | Custom limits, SLA, dedicated support |
| `api-unlimited` | API power users | Unlimited API calls |
| `admin-group` | Administrators | Full platform access |

### Application Logging & Search

All policy decisions are logged and searchable:

```bash
# Search policy logs via API
curl -X POST https://api.afterdarksys.com/v1/policies/logs/search \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "action:deny AND user:*@example.com",
    "timeRange": {"from": "2025-12-01", "to": "2025-12-25"},
    "limit": 100
  }'

# CLI search
changes policy-logs search --action deny --user "*@example.com" --days 30
```

### Policy Log Schema

```typescript
interface PolicyLog {
  id: string;
  timestamp: Date;
  policyId: string;
  policyName: string;

  request: {
    user: string;
    groups: string[];
    resource: string;
    action: string;
    platform: string;
    ip: string;
    userAgent: string;
  };

  decision: {
    action: 'pass' | 'accept' | 'deny' | 'reject';
    reason: string;
    matchedConditions: string[];
    entitlementsApplied: string[];
  };

  // For full logging level
  payload?: any;
  response?: any;
}
```

### Integration with adsops-utils

Policy changes require change tickets:

```bash
# Create policy change ticket
cd ../adsops-utils
changes ticket create \
  --title "Add geo-restriction policy for OFAC compliance" \
  --type standard \
  --compliance-framework "OFAC" \
  --affected-systems "policy-engine,central-portal"

# Apply policy after approval
changes policy apply pol-geo-restrict --ticket CHG-2025-00001
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

When running autonomously, follow this sequence. **AI Staff consultation is mandatory at each phase.**

### Phase 0: Strategic Briefing (15 min)
- [ ] Consult AI Staff CEO for session objectives
  ```bash
  cd ../ads-ai-staff
  ./scripts/talk_to_ceo.sh "Beginning autonomous operations session. Current priorities and any blocking issues?"
  ```
- [ ] Review any pending change tickets in adsops-utils

### Phase 1: Initial Assessment (30 min)
- [ ] Run `npm run list-projects` to verify project paths
- [ ] Run `npm run import-keys:dry` to check for new credentials
- [ ] Run `npm test` for baseline
- [ ] Report baseline to AI Staff
  ```bash
  ./scripts/talk_to_ceo.sh "Baseline validation complete: [X] passed, [Y] failed. Key issues: [summary]"
  ```

### Phase 2: Issue Diagnosis (2-4 hours)
- [ ] Parse latest validation report
- [ ] Categorize failures by type (DNS, SSL, API, DB)
- [ ] Use enterprise-systems-architect for technical analysis
- [ ] Consult AI Staff specialists as needed:
  - Jordan Blake (Cloud) for AWS/OCI/Cloudflare issues
  - Kai Nakamura (Linux) for system issues
  - Pat Williams (Compliance) for security/compliance issues
- [ ] Document root causes in INFRASTRUCTURE_DIAGNOSIS_AND_REMEDIATION.md

### Phase 3: Strategic Planning (30 min)
- [ ] Present diagnosis findings to AI Staff CSO
  ```bash
  ./scripts/talk_to_ceo.sh "Diana, diagnosis complete. Gap analysis: [summary]. Recommend prioritizing: [list]"
  ```
- [ ] Get go/no-go decisions on proposed remediation
- [ ] Create change tickets for significant changes
  ```bash
  cd ../adsops-utils
  changes ticket create --title "[Issue] Remediation" --type standard
  ```

### Phase 4: Infrastructure Improvements (2-4 hours)
- [ ] Fix critical DNS issues first (Priority 1 sites)
- [ ] Update SSL certificates where needed
- [ ] Verify OCI/AWS credentials configured
- [ ] Deploy infrastructure fixes
- [ ] **Never decommission** - tag as legacy if superseding
- [ ] Update change tickets with progress

### Phase 5: Enhancement Implementation (2-3 hours)
- [ ] Consult AI Staff for enhancement priorities
- [ ] Identify quick wins from enhancement list
- [ ] Implement caching where beneficial
- [ ] Add monitoring/alerting
- [ ] Update security configurations
- [ ] Ensure all changes go through change management

### Phase 6: New Features (1-2 hours)
- [ ] Get AI Staff approval before starting new features
- [ ] Prototype one monetization feature
- [ ] Create n8n workflow for automation
- [ ] Document new capability
- [ ] Update Central Portal product catalog if applicable

### Phase 7: Final Validation (1 hour)
- [ ] Run full test suite
- [ ] Compare with baseline
- [ ] Generate comprehensive report
- [ ] Document all changes made
- [ ] Close change tickets with outcomes

### Phase 8: Strategic Debrief (15 min)
- [ ] Report session outcomes to AI Staff
  ```bash
  ./scripts/talk_to_ceo.sh "Session complete. Changes deployed: [list]. Validation: [X] passed (was [Y]). Issues remaining: [list]"
  ```
- [ ] Update roadmap with any discovered work
- [ ] Flag items requiring human decision

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
# - OpenRouter (API key for adsaichat-cli)
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

*Last Updated: December 26, 2025*
*Version: 2.5.0*

---

## Changelog (v2.5.0)

### New Projects Added (v2.5.0)
- `adsaichat-cli` - Swiss army knife CLI for testing 200+ AI models via OpenRouter with streaming responses, model aliases, conversation history, and proxy support (systemapi.io, computeapi.io)

### Features
- **Multi-Model Testing** - Access GPT-4, Claude, Llama, Mistral, Gemini, DeepSeek, Qwen and more
- **Proxy Integration** - Route through systemapi.io or computeapi.io endpoints
- **Conversation Management** - Save/load chat sessions, configurable system prompts
- **Model Aliases** - Quick shortcuts: `gpt4`, `claude`, `llama`, `mistral`, `gemini`

---

## Changelog (v2.4.0)

### New Workflow & Governance (v2.4.0)

**Integrated Development & Operations Workflow**
- AI Staff consultation now **mandatory** for all phases: planning, development, engineering, analysis, security, devops, strategy, and execution
- Enterprise Systems Architect integration for technical analysis and gap assessment
- Structured 6-phase workflow: Strategic Alignment → Analysis → Planning → Development → Security → Deployment

**Service Lifecycle Policy**
- **No Decommissioning Policy** - Services are NEVER decommissioned
- Legacy tagging procedure with states: `active`, `maintenance`, `legacy`, `archived`
- All legacy transitions require change tickets

**Central Portal & Account Management**
- Product catalog integration - billing system knows all products/services
- Entity tracking: terms, software licenses, platform accounts, active sessions
- Full audit trail with immutable event logging
- Integration with adsops-utils change management

**Policy Engine**
- Policy actions: `pass`, `accept`, `deny`, `reject`, `entitlement`, `group`
- Entitlement groups: `free-tier`, `pro-tier`, `enterprise-tier`, `api-unlimited`
- Application logging with searchable policy decision logs
- Geo-restriction and OFAC compliance policies

**Enhanced Autonomous Operations**
- Expanded to 8 phases with AI Staff briefing/debrief
- Mandatory change ticket creation for significant changes
- Strategic planning phase with CSO consultation

---

## Changelog (v2.3.0)

### New Projects Added (v2.3.0)
- `ads-ai-staff` - AI Staff platform with executive team (Marcus Chen CEO, Diana Reyes CSO), chatbots, n8n integration
- `telcocloud.io` - TelcoCloud services platform (Next.js)
- `adstelco.io` - After Dark Systems Telco platform (Next.js)
- `telcocloud-workers` - TelcoCloud Cloudflare Workers
- `telcocloud-shared` - TelcoCloud shared TypeScript library
- `telcocloud-cli` - TelcoCloud CLI tool
- `telcocloud-deploy.sh` - TelcoCloud deployment script

### New Features (v2.3.0)
- **Executive Team Integration** - Consult AI CEO (Marcus Chen) and CSO (Diana Reyes) for strategic decisions
- **Delegation Chain** - Full AI staff hierarchy for specialized tasks
- **TelcoCloud Platform** - Complete telecom services stack

---

## Changelog (v2.2.0)

### Projects Added (v2.2.0)
- `secretserver.io` - Managed secrets & certificate management platform with Stripe billing, cert-manager integration, CLI (adkm)
- `llmsecurity.dev` - AI/LLM threat detection platform - model scanning, threat intelligence, adversarial testing ("VirusTotal for AI Models")

### Projects Added (v2.1.0)
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
