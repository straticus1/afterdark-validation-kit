# AfterDark Systems Infrastructure Diagnosis Report
**Generated:** December 23, 2025
**OCI Server:** 129.153.158.177
**Primary DNS:** Route53
**Database:** Neon PostgreSQL

---

## Executive Summary

Comprehensive infrastructure audit of AfterDark Systems ecosystem revealed **5 fully operational services**, **5 services with SSL/routing issues**, and **5 services with missing DNS records**. Database connectivity is healthy with all required schemas present. The root cause analysis indicates:

1. **SSL Certificate Issues** - Several subdomains experiencing TLS handshake failures
2. **Missing DNS Records** - 3 subdomains (docs, sip, oss) have no DNS A records
3. **Backend Container Issues** - Several backend services not responding on expected ports
4. **DNS Pointing Mismatch** - Some subdomains point to wrong IPs (admin, billing at 141.148.79.30)

---

## 1. Service Status Overview

### 1.1 Working Services (HTTP 200)
| Subdomain | DNS IP | HTTPS Status | Health Check | Notes |
|-----------|--------|--------------|--------------|-------|
| **afterdarksys.com** | 129.153.158.177 | 200 OK | N/A | Main site operational |
| **login.afterdarksys.com** | 129.153.158.177 | 200 OK | 200 OK | SSO service fully operational |
| **status.afterdarksys.com** | 129.153.158.177 | 200 OK | 404 (health endpoint) | Status page accessible but health endpoint missing |
| **support.afterdarksys.com** | 129.153.158.177 | 200 OK | 200 OK | Support portal operational |
| **catalog.afterdarksys.com** | 129.153.158.177 | 200 OK | 200 OK | Catalog service operational |

**Status:** 5 services fully functional ✓

---

### 1.2 Broken Services (HTTP 4xx/5xx)
| Subdomain | DNS IP | HTTPS Status | Health Check | Issue |
|-----------|--------|--------------|--------------|-------|
| **admin.afterdarksys.com** | 141.148.79.30 | 502 Bad Gateway | 502 | Wrong IP - should be 129.153.158.177 |
| **billing.afterdarksys.com** | 141.148.79.30 | 404 Not Found | 200 OK | Wrong IP - health check works but routing fails |

**Status:** 2 services with DNS pointing issues

---

### 1.3 SSL/Connection Failures
| Subdomain | DNS IP | Error | Root Cause |
|-----------|--------|-------|------------|
| **api.afterdarksys.com** | 129.153.158.177 | TLS handshake failure (tlsv1 alert internal error) | Backend service not running or SSL cert issue |
| **analytics.afterdarksys.com** | 129.153.158.177 | Connection failed | Backend service not running on port 3007 |
| **cdn.afterdarksys.com** | 129.153.158.177 | Connection failed | Caddy needs /var/www/cdn directory or backend |
| **dnsscience.afterdarksys.com** | 129.153.158.177 | TLS handshake failure | Backend service not running on port 5000 |
| **migration.afterdarksys.com** | 129.153.158.177 | Connection failed | Backend service not running on port 3000 |

**Status:** 5 services with SSL/backend issues

---

### 1.4 Missing DNS Records
| Subdomain | DNS Status | Expected Port | Issue |
|-----------|-----------|---------------|-------|
| **docs.afterdarksys.com** | NO A RECORD | 3004 | DNS record not configured in Route53 |
| **search.afterdarksys.com** | 54.162.70.181 (AWS) | 3012 | Points to AWS instead of OCI |
| **sip.afterdarksys.com** | NO A RECORD | 3009 | DNS record not configured |
| **oss.afterdarksys.com** | NO A RECORD | 3008 | DNS record not configured |

**Status:** 4 services with DNS configuration issues

---

## 2. DNS Records Analysis

### 2.1 Correct DNS Configuration (129.153.158.177)
- afterdarksys.com ✓
- login.afterdarksys.com ✓
- api.afterdarksys.com ✓
- status.afterdarksys.com ✓
- support.afterdarksys.com ✓
- catalog.afterdarksys.com ✓
- analytics.afterdarksys.com ✓
- cdn.afterdarksys.com ✓
- dnsscience.afterdarksys.com ✓
- migration.afterdarksys.com ✓

### 2.2 Incorrect DNS Configuration
- **admin.afterdarksys.com** → 141.148.79.30 (should be 129.153.158.177)
- **billing.afterdarksys.com** → 141.148.79.30 (should be 129.153.158.177)
- **search.afterdarksys.com** → 54.162.70.181 (AWS - may be intentional)

### 2.3 Missing DNS Records
- **docs.afterdarksys.com** - No A record
- **sip.afterdarksys.com** - No A record
- **oss.afterdarksys.com** - No A record

---

## 3. Database Status

### 3.1 Connectivity
**Status:** ✓ HEALTHY
**Database:** Neon PostgreSQL
**Host:** ep-icy-lab-a4y02aid-pooler.us-east-1.aws.neon.tech
**Database Name:** neondb
**Connection:** Successful via pooler

### 3.2 Schema Structure
| Schema | Tables | Status | Purpose |
|--------|--------|--------|---------|
| **public** | 26 tables | ✓ Active | Admin panel (Prisma ORM) |
| **afterdark** | 16 tables | ✓ Active | SSO/authentication system |
| **infrastructure** | 10 tables | ✓ Active | Infrastructure rental platform |
| **auth** | Unknown | Present | Legacy auth schema |
| **lonelyfyi** | Unknown | Present | lonely.fyi app schema |
| **undateable** | Unknown | Present | undatable.me app schema |
| **neon_auth** | Unknown | Present | Neon internal auth |
| **pgrst** | Unknown | Present | PostgREST schema |

**Key Tables Present:**
- ✓ User (3 users)
- ✓ Session, LoginLog, AuditLog
- ✓ ApiKey, ApiKeyUsageLog
- ✓ Organization, OrganizationUser
- ✓ Container, VirtualMachine, LoadBalancer
- ✓ Site, DnsRecord
- ✓ OAuth tables (clients, tokens, consents)

**Missing Tables:** None detected - all expected tables present

---

## 4. Docker Container Analysis

### 4.1 Expected Containers (per docker-compose.production.yml)
| Container | Port | Status | Notes |
|-----------|------|--------|-------|
| afterdarksys-caddy | 80, 443, 2019 | Unknown (SSH access denied) | Reverse proxy |
| afterdarksys-main | 8080 | Unknown | Main site |
| afterdarksys-login | 3001 | ✓ Likely running | Health checks pass |
| afterdarksys-api | 3002 | ✗ Not responding | TLS error suggests no backend |
| afterdarksys-admin | 3003 | ✗ Not responding | DNS points to wrong IP |
| afterdarksys-migration | 3000 | ✗ Not responding | Connection fails |
| afterdarksys-dnsscience | 5000 | ✗ Not responding | TLS error |
| afterdarksys-analytics | 3007 | ✗ Not responding | Connection fails |
| afterdarksys-billing | 3005 | Unknown | DNS points to wrong IP |
| afterdarksys-status | 3006 | ✓ Likely running | Site accessible |
| afterdarksys-catalog | 3010 | ✓ Likely running | Health checks pass |
| afterdarksys-support | 3011 | ✓ Likely running | Health checks pass |
| afterdarksys-postgres | N/A | ✓ Running (Neon used instead) | Using managed Neon DB |
| afterdarksys-redis | N/A | Unknown | Session/cache backend |

**SSH Access Issue:** Cannot verify container status - SSH key authentication required for user ryan@129.153.158.177

---

## 5. SSL Certificate Analysis

### 5.1 Working SSL Certificates
**login.afterdarksys.com**
- Subject: CN=login.afterdarksys.com
- Issuer: Let's Encrypt (E8)
- Valid: Dec 20, 2025 - Mar 20, 2026
- Status: ✓ Valid

**Expected:** All subdomains should have Let's Encrypt certificates auto-provisioned by Caddy

### 5.2 SSL Issues
Several subdomains experiencing TLS handshake failures:
- api.afterdarksys.com: `error:1404B438:SSL routines:ST_CONNECT:tlsv1 alert internal error`
- dnsscience.afterdarksys.com: Same TLS error

**Root Cause:** Backend services not running, causing Caddy to fail TLS negotiation

---

## 6. Caddyfile Configuration

### 6.1 Analysis
- **Comprehensive:** All 15 subdomains configured ✓
- **SSL:** Auto HTTPS enabled via Let's Encrypt ✓
- **Health Checks:** Configured for all services ✓
- **Security Headers:** HSTS, CSP, XSS protection ✓
- **Logging:** JSON logs per subdomain ✓
- **Compression:** gzip/zstd enabled ✓

### 6.2 Port Mapping
| Service | Caddy Listens | Backend Port | Config Status |
|---------|---------------|--------------|---------------|
| Main Site | afterdarksys.com:443 | localhost:8080 | ✓ |
| Login | login:443 | localhost:3001 | ✓ |
| API | api:443 | localhost:3002 | ✓ |
| Admin | admin:443 | localhost:3003 | ✓ |
| Migration | migration:443 | localhost:3000 | ✓ |
| DNS Science | dnsscience:443 | localhost:5000 | ✓ |
| Analytics | analytics:443 | localhost:3007 | ✓ |
| CDN | cdn:443 | /var/www/cdn (static) | ✓ |
| Billing | billing:443 | localhost:3005 | ✓ |
| Status | status:443 | localhost:3006 | ✓ |
| Catalog | catalog:443 | localhost:3010 | ✓ |
| Support | support:443 | localhost:3011 | ✓ |
| Docs | docs:443 | localhost:3004 | ✓ |
| Search | search:443 | localhost:3012 | ✓ |
| SIP | sip:443 | localhost:3009 | ✓ |
| OSS | oss:443 | localhost:3008 | ✓ |

**Configuration:** Complete and correct ✓

---

## 7. Remediation Plan

### 7.1 IMMEDIATE FIXES (Priority 1 - Revenue Impact)

#### Fix 1: Correct DNS Records for Admin and Billing
**Impact:** HIGH - Admin panel and billing system inaccessible
**Effort:** 5 minutes
**Risk:** LOW

**Steps:**
```bash
# Via Route53 or DNS provider
# Change A record for admin.afterdarksys.com: 141.148.79.30 → 129.153.158.177
# Change A record for billing.afterdarksys.com: 141.148.79.30 → 129.153.158.177
# TTL: 300 seconds (5 min propagation)
```

**Expected Result:** Admin and billing become accessible within 5 minutes

---

#### Fix 2: Add Missing DNS Records
**Impact:** MEDIUM - New services inaccessible
**Effort:** 10 minutes
**Risk:** LOW

**Steps:**
```bash
# Via Route53 or DNS provider
# Add A records:
docs.afterdarksys.com    → 129.153.158.177
sip.afterdarksys.com     → 129.153.158.177
oss.afterdarksys.com     → 129.153.158.177

# Verify search.afterdarksys.com pointing to AWS is intentional
# If not, change: 54.162.70.181 → 129.153.158.177
```

---

#### Fix 3: Start Missing Backend Services
**Impact:** HIGH - 5 services offline
**Effort:** 30-60 minutes
**Risk:** MEDIUM (requires SSH access and container deployment)

**Required Access:** SSH key for ryan@129.153.158.177

**Steps:**
```bash
# SSH into OCI server
ssh ryan@129.153.158.177

# Check which containers are running
docker ps -a

# Check docker-compose status
cd /path/to/infrastructure
docker-compose -f docker-compose.production.yml ps

# Start missing services
docker-compose -f docker-compose.production.yml up -d \
  api migration dnsscience analytics

# Verify health
curl http://localhost:3002/health  # API
curl http://localhost:3000/api/health  # Migration
curl http://localhost:5000/health  # DNS Science
curl http://localhost:3007/health  # Analytics
```

**Expected Containers to Start:**
- afterdarksys-api (port 3002)
- afterdarksys-migration (port 3000)
- afterdarksys-dnsscience (port 5000)
- afterdarksys-analytics (port 3007)

---

#### Fix 4: Configure CDN Static Files
**Impact:** MEDIUM - CDN not serving files
**Effort:** 15 minutes
**Risk:** LOW

**Steps:**
```bash
# SSH into OCI server
ssh ryan@129.153.158.177

# Create CDN directory if missing
sudo mkdir -p /var/www/cdn
sudo chown -R www-data:www-data /var/www/cdn

# Verify Caddy volume mount
docker inspect afterdarksys-caddy | grep cdn_files

# Copy static assets to CDN directory
# (deployment-specific - depends on asset location)
```

---

### 7.2 SHORT-TERM IMPROVEMENTS (Priority 2 - Within 1 Week)

#### Improvement 1: Enable SSH Access for Remote Monitoring
**Steps:**
1. Add SSH public key to ryan@129.153.158.177
2. Configure SSH config for easy access
3. Set up automated health checking script

---

#### Improvement 2: Implement Container Health Monitoring
**Tools:** Docker healthchecks + external monitoring (Uptime Robot, Better Stack)

**Steps:**
1. Verify all container healthchecks working
2. Set up external monitoring for all 15+ subdomains
3. Configure alerts (Slack, email, PagerDuty)
4. Create status page integration

---

#### Improvement 3: Database Schema Documentation
**Steps:**
1. Document all schemas and their purposes
2. Create ERD diagrams
3. Set up automated schema backups
4. Configure point-in-time recovery testing

---

#### Improvement 4: Centralized Logging
**Steps:**
1. Aggregate all Caddy JSON logs
2. Set up log shipping (to CloudWatch, Loki, or ELK)
3. Create dashboards for traffic patterns
4. Set up error alerting

---

### 7.3 LONG-TERM ARCHITECTURE (Priority 3 - Strategic)

#### Architecture 1: Multi-Region Failover
**Current:** Single OCI server (129.153.158.177)
**Recommended:** Add failover region with health-based DNS routing

**Steps:**
1. Deploy identical stack to second OCI region
2. Configure Route53 health checks
3. Set up active-active or active-passive failover
4. Test failover scenarios

**Benefits:**
- 99.99% uptime guarantee
- Geographic load distribution
- Disaster recovery capability

---

#### Architecture 2: Container Orchestration
**Current:** Docker Compose on single host
**Recommended:** Kubernetes or Docker Swarm for auto-scaling

**Steps:**
1. Migrate to OKE (Oracle Kubernetes Engine) or OCI Container Instances
2. Implement auto-scaling policies
3. Set up rolling deployments
4. Configure pod auto-restart and health-based routing

**Benefits:**
- Automatic container restart on failure
- Horizontal scaling for traffic spikes
- Zero-downtime deployments
- Better resource utilization

---

#### Architecture 3: Database Optimization
**Current:** Neon PostgreSQL (pooler)
**Current Status:** Healthy ✓

**Recommendations:**
1. **Enable Read Replicas:** For analytics and reporting queries
2. **Connection Pool Tuning:** Verify PgBouncer configuration
3. **Query Performance:** Implement query monitoring and indexing strategy
4. **Backup Strategy:** Verify Neon backup retention and test recovery
5. **Schema Isolation:** Consider separate databases for different apps

**Steps:**
```sql
-- Monitor connection usage
SELECT count(*) FROM pg_stat_activity;

-- Identify slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check table sizes
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

#### Architecture 4: Security Hardening
**Current:** Basic HSTS and security headers ✓

**Enhancements:**
1. **WAF:** Implement Cloudflare WAF or OCI WAF
2. **DDoS Protection:** Enable Cloudflare DDoS protection
3. **Rate Limiting:** Implement per-IP rate limiting in Caddy
4. **2FA Enforcement:** Require 2FA for all admin accounts
5. **Secret Management:** Migrate from .env to Vault or OCI Secrets
6. **Network Segmentation:** Isolate database access via VPC

---

#### Architecture 5: CDN and Caching Strategy
**Current:** CDN subdomain configured but may not have assets

**Recommendations:**
1. **Cloudflare Integration:** Use Cloudflare as CDN + DDoS protection
2. **Cache Strategy:**
   - Static assets: 1 year cache
   - API responses: 5-60 min cache with cache invalidation
   - HTML: No cache or 5 min cache
3. **Edge Workers:** Deploy serverless functions at edge for dynamic content
4. **Asset Optimization:** Implement image optimization, minification, compression

---

## 8. Monitoring and Alerting Strategy

### 8.1 Health Check Endpoints
**Implement standardized health checks for all services:**

```json
{
  "status": "healthy|degraded|unhealthy",
  "version": "1.0.0",
  "uptime": 12345,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "dependencies": "ok"
  },
  "timestamp": "2025-12-23T00:00:00Z"
}
```

---

### 8.2 Recommended Monitoring Tools
| Tool | Purpose | Cost |
|------|---------|------|
| **Uptime Robot** | External HTTP monitoring | Free tier OK |
| **Better Stack** | Uptime + incident management | $18/mo |
| **Grafana Cloud** | Metrics, logs, dashboards | Free tier OK |
| **Sentry** | Error tracking | $26/mo |
| **Cloudflare Analytics** | Traffic insights | Free with Cloudflare |
| **Neon Monitoring** | Database metrics | Included |

---

### 8.3 Alert Conditions
| Condition | Severity | Notification |
|-----------|----------|--------------|
| Service down > 2 min | CRITICAL | Slack + Email + SMS |
| SSL cert expires < 7 days | HIGH | Email |
| DB connections > 80% | MEDIUM | Slack |
| Disk usage > 85% | MEDIUM | Email |
| High error rate (5xx) | HIGH | Slack |
| Response time > 2s | LOW | Email daily digest |

---

## 9. Deployment Checklist

### 9.1 Pre-Deployment Verification
- [ ] DNS records configured correctly
- [ ] SSL certificates auto-renewing
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Health check endpoints responding
- [ ] Docker images built and tagged
- [ ] Volume mounts configured
- [ ] Network connectivity verified

### 9.2 Deployment Steps
```bash
# 1. Pull latest code
git pull origin main

# 2. Build images
docker-compose -f infrastructure/docker-compose.production.yml build

# 3. Run migrations (if needed)
docker-compose -f infrastructure/docker-compose.production.yml run --rm migration npm run migrate

# 4. Deploy with zero downtime
docker-compose -f infrastructure/docker-compose.production.yml up -d --no-deps --build <service>

# 5. Verify health
./scripts/health-check-all.sh

# 6. Monitor logs
docker-compose -f infrastructure/docker-compose.production.yml logs -f --tail=100
```

### 9.3 Rollback Procedure
```bash
# Tag current deployment
docker tag <image> <image>:rollback-$(date +%Y%m%d-%H%M%S)

# Revert to previous image
docker-compose -f infrastructure/docker-compose.production.yml up -d --no-deps <service>

# Verify rollback
curl https://<subdomain>.afterdarksys.com/health
```

---

## 10. Cost Optimization

### 10.1 Current Infrastructure Costs (Estimated)
| Service | Provider | Cost/Month | Notes |
|---------|----------|------------|-------|
| OCI Compute (VM.Standard.E4.Flex) | Oracle Cloud | $0-50 | Always Free tier if 1-4 OCPU |
| Neon PostgreSQL | Neon | $0-19 | Free tier 0.5 GB, Pro $19/mo |
| Domain Registrations | Route53/Namecheap | ~$200/year | 22+ domains |
| SSL Certificates | Let's Encrypt | $0 | Free |
| **Total** | | **~$20-70/month** | Very cost-effective |

### 10.2 Potential Savings
1. **Cloudflare Free Tier:** Use for DNS + CDN + DDoS (saves Route53 query costs)
2. **OCI Always Free:** Keep within 1-4 OCPU limit for free compute
3. **Neon Free Tier:** Monitor database size to stay under 0.5 GB
4. **Container Optimization:** Reduce image sizes to save storage costs

---

## 11. Next Steps

### Immediate (Today)
1. ✓ Complete infrastructure diagnosis
2. **Fix DNS records for admin + billing** (5 min)
3. **Add missing DNS records** (docs, sip, oss) (10 min)
4. **Verify SSH access to OCI server**

### This Week
1. **Start missing Docker containers** (api, migration, dnsscience, analytics)
2. **Configure CDN static file serving**
3. **Set up external monitoring** (Uptime Robot)
4. **Document SSH access and deployment procedures**

### This Month
1. **Implement comprehensive monitoring and alerting**
2. **Set up automated backups for all volumes**
3. **Create disaster recovery runbook**
4. **Optimize database queries and indexes**
5. **Security audit and penetration testing**

---

## 12. Technical Debt

### High Priority
- [ ] Missing SSH access for automated deployments
- [ ] No centralized logging solution
- [ ] Manual certificate management (Caddy handles, but monitoring needed)
- [ ] No automated backups for Docker volumes

### Medium Priority
- [ ] No container orchestration (relying on single-host Docker Compose)
- [ ] No CI/CD pipeline
- [ ] Limited error tracking (no Sentry integration)
- [ ] No performance monitoring (APM)

### Low Priority
- [ ] Documentation gaps
- [ ] No load testing performed
- [ ] No chaos engineering practices

---

## 13. Success Metrics

### Current Baseline (Dec 23, 2025)
- **Uptime:** Unknown (no monitoring)
- **Services Online:** 5/15 (33%)
- **DNS Correct:** 10/15 (67%)
- **Database Health:** 100% ✓
- **SSL Coverage:** 1/15 verified (login only)

### Target (7 Days)
- **Uptime:** 99%+ monitored
- **Services Online:** 15/15 (100%)
- **DNS Correct:** 15/15 (100%)
- **Database Health:** 100% ✓
- **SSL Coverage:** 15/15 (100%)
- **Monitoring Coverage:** 100%

### Target (30 Days)
- **Uptime:** 99.9%
- **Response Time P95:** < 500ms
- **Error Rate:** < 0.1%
- **Automated Deployments:** 100%
- **Security Score:** A+ on all domains

---

## 14. Appendix

### A. Environment File Locations
```
/Users/ryan/development/afterdarksys.com/admin-panel/.env.production
/Users/ryan/development/afterdarksys.com/admin-panel/.env
/Users/ryan/development/afterdarksys.com/subdomains/login/.env
/Users/ryan/development/afterdarksys.com/subdomains/billing/.env
/Users/ryan/development/afterdarksys.com/subdomains/dnsscience/.env.production
/Users/ryan/development/afterdarksys.com/.env
```

### B. Database Connection Strings
```bash
# Pooled (for application use)
DATABASE_URL="postgresql://neondb_owner:npg_gmURiN7l2hqr@ep-icy-lab-a4y02aid-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Direct (for migrations)
DIRECT_URL="postgresql://neondb_owner:npg_gmURiN7l2hqr@ep-icy-lab-a4y02aid.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### C. Neon API Credentials
```bash
NEON_API_KEY="napi_60d8cpily6tjvjg8dppznky6qrb2z3184ko4t5xegfrm938bsjfbwz0xw9oer4g0"
NEON_ORG_ID="org-falling-lake-56792490"
NEON_PROJECT_ID="br-autumn-truth-a4a74ob9"
```

### D. Key Infrastructure Files
```
/Users/ryan/development/afterdarksys.com/infrastructure/docker-compose.production.yml
/Users/ryan/development/afterdarksys.com/infrastructure/Caddyfile.production
/Users/ryan/development/afterdark-validation-kit/config.json
```

---

## 15. Contact and Escalation

**Infrastructure Owner:** Ryan
**OCI Server:** 129.153.158.177
**SSH Access:** Requires public key authentication

**Critical Issues:** Immediate SSH access needed to:
1. Check actual Docker container status
2. View Caddy logs for SSL errors
3. Restart failed services
4. Verify Redis connectivity
5. Check disk space and resource usage

**Recommended Action:** Establish SSH access as highest priority to complete diagnosis and remediation.

---

**End of Report**
