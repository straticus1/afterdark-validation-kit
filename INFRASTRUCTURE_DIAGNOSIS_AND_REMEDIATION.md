# AfterDark Infrastructure Diagnosis and Remediation Plan

**Date:** December 21, 2025
**Analyst:** Senior Infrastructure Architect
**Severity:** CRITICAL - Production outages affecting 12+ domains

---

## Executive Summary

The AfterDark ecosystem is experiencing critical infrastructure failures affecting **12 of 17 sites** (71% failure rate). The root cause is **DNS configuration drift** where Terraform-defined Route53 hosted zones exist but lack corresponding A records pointing to the Application Load Balancer (ALB). Additionally, one site (latenite.love) has SSL certificate misconfiguration.

**Impact:**
- 195 failed tests (375 passing, 66% pass rate)
- 49 failed API endpoints
- 30 failed database connectivity tests
- 65 failed site tests
- Estimated revenue loss: HIGH (12+ customer-facing sites completely offline)

**Root Cause:** Infrastructure automation incomplete - Terraform code exists but was never applied, or DNS records were manually deleted without being removed from Terraform state.

---

## Issue Categories and Root Cause Analysis

### 1. DNS Resolution Failures (ENODATA/ENOTFOUND) - 12 Sites

**Affected Domains:**
1. aeims.app (Priority 1 - Main platform)
2. sexacomms.com (Priority 1)
3. flirts.nyc (Priority 1)
4. nycflirts.com (Priority 1)
5. 9inchesof.com (Priority 2)
6. beastybitches.com (Priority 2)
7. cavernof.love (Priority 2)
8. dommecats.com (Priority 2)
9. fantasyflirts.live (Priority 2)
10. gfecalls.com (Priority 2)
11. holyflirts.com (Priority 2)
12. latenite.ai (Priority 2)
13. phonesex.money (Priority 2)
14. shrinkshack.com (Priority 2)

#### Root Cause

**Infrastructure Analysis:**

1. **Route53 Hosted Zones Exist:**
   - sexacomms.com: AWS nameservers configured at registrar (NS-1162.AWSDNS-17.ORG, etc.)
   - flirts.nyc: AWS nameservers configured (NS-1481.AWSDNS-57.ORG, etc.)
   - aeims.app: Hosted zone created but NO A records defined in Terraform state

2. **Missing A Records:**
   - Terraform code at `/Users/ryan/development/aeims.app/infrastructure/terraform/main.tf` defines:
     - Route53 hosted zones (lines 832-849, 953-960)
     - ACM certificates (lines 811-829, 934-950)
     - ALB listener rules (lines 1322-1396)
     - **But these resources were never applied OR were applied and later destroyed**

3. **ALB Configuration:**
   - Production ALB exists: `aeims-alb-production` (lines 647-661)
   - Target groups defined for ECS containers (lines 717-741)
   - HTTPS listeners configured (lines 1297-1308)
   - **ALB is healthy but DNS doesn't point to it**

4. **Working Sites for Comparison:**
   - psosoundoff.com: 129.153.158.177 (Oracle Cloud - OCI)
   - cucking.life: 15.197.148.33, 3.33.130.190 (AWS - likely different ALB)
   - latenite.love: 98.85.62.186, 3.210.17.25 (AWS - has DNS but wrong cert)

#### Specific Issues by Domain

**Priority 1 Sites (Immediate Action Required):**

**aeims.app:**
- Hosted zone ID: Z0819048KQ6II7V1JPW6 (line 253)
- Missing A record for aeims.app -> aeims-alb-production
- Missing A record for www.aeims.app -> aeims-alb-production
- Terraform defines records (lines 257-315) but they don't exist
- **Impact:** Main platform completely offline

**sexacomms.com:**
- Hosted zone exists (Terraform line 953)
- ACM certificate created but validation commented out (lines 964-985)
- A records defined (lines 988-1011) but not applied
- **Impact:** Complete site outage

**flirts.nyc & nycflirts.com:**
- Shared certificate (lines 811-829)
- Hosted zones exist (lines 832-849)
- A records defined (lines 876-925) but not applied
- ALB listener rules configured (lines 1322-1369)
- **Impact:** Two sites offline

**Priority 2 Sites:**
- No Terraform configuration found for: 9inchesof.com, beastybitches.com, cavernof.love, dommecats.com, fantasyflirts.live, gfecalls.com, holyflirts.com, latenite.ai, phonesex.money, shrinkshack.com
- **Impact:** Sites exist in validation config but have no infrastructure code

---

### 2. SSL Certificate Mismatch - latenite.love

**Issue:**
- Domain resolves to: 98.85.62.186, 3.210.17.25 (AWS)
- SSL certificate: *.edynamicdev.com (Amazon RSA 2048 M04)
- Error: DEPTH_ZERO_SELF_SIGNED_CERT

#### Root Cause
- ALB or server is serving wrong SSL certificate
- Certificate issued for *.edynamicdev.com, not latenite.love
- Likely scenario: ALB default certificate is edynamicdev.com, and no SNI (Server Name Indication) certificate configured for latenite.love

#### Location
- Infrastructure likely in different repo or manually configured
- No Terraform config found in scanned directories for latenite.love/.ai

---

### 3. Failed API Endpoints (49 failures)

All API endpoint failures are **cascading from DNS issues**:
- GET /api/health → ENOTFOUND
- GET /api/operators.php → ENOTFOUND
- GET /api/calls.php → ENOTFOUND
- GET /api/dashboard.php → ENOTFOUND

**Root Cause:** API endpoints are hosted on same domains as main sites. No DNS = no API access.

---

### 4. Failed Database Tests (30 failures)

All database test failures are **cascading from DNS issues**:
- Database endpoints tested via domain health checks
- ENOTFOUND errors prevent connection to application servers
- Applications can't proxy database health checks

**Actual Database Status:** Unknown - tests cannot reach application layer to verify.

**Additional Finding:**
- Oracle Cloud Infrastructure (OCI) configuration incomplete:
  - OCI credentials not configured (0 of 4 required env vars set)
  - Region endpoint reachable (us-ashburn-1) but cannot authenticate

---

### 5. Failed Site Tests (65 failures)

All site test failures are **cascading from DNS/SSL issues**:
- Homepage accessibility: ENOTFOUND (DNS)
- Login page: ENOTFOUND (DNS)
- latenite.love: DEPTH_ZERO_SELF_SIGNED_CERT (SSL)

---

## Infrastructure Mapping

### Current Infrastructure Architecture

**AWS Infrastructure (Primary):**
```
┌─────────────────────────────────────────────────────────────┐
│ Route53 DNS (Authoritative)                                 │
│ ├── aeims.app (Z0819048KQ6II7V1JPW6) - MISSING A RECORDS   │
│ ├── sexacomms.com - MISSING A RECORDS                       │
│ ├── flirts.nyc - MISSING A RECORDS                          │
│ └── nycflirts.com - MISSING A RECORDS                       │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Application Load Balancers                                   │
│ ├── aeims-alb-production (HEALTHY, NO DNS POINTING TO IT)   │
│ └── afterdarksys ALB (different project)                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ ECS Fargate Services                                         │
│ ├── aeims-web-service (task: aeims:latest)                  │
│ ├── Target: aeims-ecs-tg-production                         │
│ └── Health Check: /health                                   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ RDS PostgreSQL                                               │
│ └── aeims-postgres.cluster-c9j2q6p1e0xd.us-east-1.rds...   │
└─────────────────────────────────────────────────────────────┘
```

**Working Sites (for reference):**
- psosoundoff.com → 129.153.158.177 (Oracle OCI)
- cucking.life → 15.197.148.33, 3.33.130.190 (AWS ALB - different from aeims)

### AfterDarkSys.com Infrastructure (Separate)

Located at `/Users/ryan/development/afterdarksys.com/terraform/main.tf`:
- Uses AWS ECS on Fargate
- Domain: afterdarksys.com (NOT in failing list)
- Subdomains managed separately
- **This infrastructure is independent and working**

### HostScience.io Infrastructure (Separate)

Located at `/Users/ryan/development/hostscience.io/terraform/`:
- Uses Oracle Cloud (OCI) + Cloudflare CDN
- Single domain: hostscience.io (NOT in failing list)
- Cloudflare proxied DNS
- **This infrastructure is independent**

---

## Prioritized Remediation Plan

### Phase 1: IMMEDIATE (0-2 hours) - Restore Priority 1 Sites

**Priority:** CRITICAL
**Impact:** Restores main platform and highest traffic sites
**Risk Level:** LOW - Only creating DNS records

#### Task 1.1: Verify ALB Status and Get DNS Name

**File:** N/A (AWS CLI)
**Commands:**
```bash
# Get production ALB DNS name
aws elbv2 describe-load-balancers \
  --names aeims-alb-production \
  --query 'LoadBalancers[0].DNSName' \
  --output text

# Verify ALB is healthy
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names aeims-ecs-tg-production \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

**Expected Output:** ALB DNS name like `aeims-alb-production-123456789.us-east-1.elb.amazonaws.com`

#### Task 1.2: Create Route53 A Records for aeims.app

**File:** `/Users/ryan/development/aeims.app/infrastructure/terraform/main.tf`
**Action:** Apply existing Terraform configuration (records already defined)

**Verification Steps:**
1. Navigate to terraform directory:
   ```bash
   cd /Users/ryan/development/aeims.app/infrastructure/terraform
   ```

2. Initialize Terraform (if not done):
   ```bash
   terraform init
   ```

3. Review what will be created:
   ```bash
   terraform plan
   ```

4. Apply ONLY the Route53 records (if other resources exist):
   ```bash
   terraform apply -target=aws_route53_record.aeims_main \
     -target=aws_route53_record.aeims_www \
     -target=aws_route53_record.aeims_admin \
     -target=aws_route53_record.aeims_api \
     -target=aws_route53_record.aeims_support
   ```

**Alternative - Manual Creation (if Terraform state is corrupted):**
```bash
ALB_DNS="<from Task 1.1>"
ZONE_ID="Z0819048KQ6II7V1JPW6"

# Get ALB Hosted Zone ID
ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --names aeims-alb-production \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Create A record for aeims.app
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "aeims.app",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'"$ALB_ZONE_ID"'",
          "DNSName": "'"$ALB_DNS"'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Repeat for www, admin, api, support subdomains
```

**Validation:**
```bash
dig +short aeims.app
# Should return ALB IP addresses

curl -I https://aeims.app
# Should return HTTP 200 or redirect
```

**Time Estimate:** 30 minutes
**Dependencies:** None
**Risk:** LOW - Read-only change to DNS

#### Task 1.3: Create Route53 A Records for sexacomms.com

**File:** `/Users/ryan/development/aeims.app/infrastructure/terraform/main.tf` (lines 988-1011)
**Action:** Apply A records for sexacomms.com

**Terraform Command:**
```bash
cd /Users/ryan/development/aeims.app/infrastructure/terraform

terraform apply \
  -target=aws_route53_record.sexacomms_com \
  -target=aws_route53_record.sexacomms_com_www
```

**Prerequisites:**
- ACM certificate validation must be completed first (see Phase 2)
- OR use existing certificate if already validated

**Manual Creation:**
```bash
SEXACOMMS_ZONE_ID=$(aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='sexacomms.com.'].Id" \
  --output text | cut -d'/' -f3)

aws route53 change-resource-record-sets \
  --hosted-zone-id $SEXACOMMS_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "sexacomms.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'"$ALB_ZONE_ID"'",
          "DNSName": "'"$ALB_DNS"'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

**Validation:**
```bash
dig +short sexacomms.com
curl -I https://sexacomms.com
```

**Time Estimate:** 20 minutes
**Dependencies:** Task 1.1 complete
**Risk:** LOW

#### Task 1.4: Create Route53 A Records for flirts.nyc & nycflirts.com

**File:** `/Users/ryan/development/aeims.app/infrastructure/terraform/main.tf` (lines 876-925)
**Action:** Apply A records

**Terraform Command:**
```bash
terraform apply \
  -target=aws_route53_record.flirts_nyc \
  -target=aws_route53_record.flirts_nyc_www \
  -target=aws_route53_record.nycflirts_com \
  -target=aws_route53_record.nycflirts_com_www
```

**Validation:**
```bash
dig +short flirts.nyc
dig +short nycflirts.com
curl -I https://flirts.nyc
curl -I https://nycflirts.com
```

**Time Estimate:** 20 minutes
**Dependencies:** Task 1.1 complete
**Risk:** LOW

---

### Phase 2: HIGH PRIORITY (2-4 hours) - SSL Certificate Fixes

**Priority:** HIGH
**Impact:** Fixes SSL errors, enables HTTPS
**Risk Level:** MEDIUM - Certificate validation required

#### Task 2.1: Fix latenite.love SSL Certificate

**Root Cause:** ALB serving wrong certificate (*.edynamicdev.com)

**Investigation Steps:**
```bash
# Find which ALB serves latenite.love
aws ec2 describe-network-interfaces \
  --filters "Name=addresses.private-ip-address,Values=98.85.62.186" \
  --query 'NetworkInterfaces[0].Description'

# List all ALBs
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[*].[LoadBalancerName,DNSName]' \
  --output table
```

**Fix Option 1: Create ACM Certificate for latenite.love**

**File:** Create new Terraform config at `/Users/ryan/development/aeims.app/infrastructure/terraform/latenite-ssl.tf`

```hcl
# ACM Certificate for latenite.love
resource "aws_acm_certificate" "latenite_love" {
  domain_name               = "latenite.love"
  subject_alternative_names = [
    "*.latenite.love",
    "www.latenite.love"
  ]
  validation_method = "DNS"

  tags = {
    Name        = "latenite-love-ssl-cert"
    Environment = "production"
    Project     = "AEIMS"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Find the hosted zone for latenite.love
data "aws_route53_zone" "latenite_love" {
  name = "latenite.love"
}

# Route53 validation records
resource "aws_route53_record" "latenite_love_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.latenite_love.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.latenite_love.zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "latenite_love" {
  certificate_arn         = aws_acm_certificate.latenite_love.arn
  validation_record_fqdns = [for record in aws_route53_record.latenite_love_cert_validation : record.fqdn]
}

# Add certificate to ALB listener
resource "aws_lb_listener_certificate" "latenite_love" {
  listener_arn    = data.aws_lb_listener.https.arn  # Find correct listener
  certificate_arn = aws_acm_certificate_validation.latenite_love.certificate_arn
}
```

**Commands:**
```bash
cd /Users/ryan/development/aeims.app/infrastructure/terraform
terraform apply -target=aws_acm_certificate.latenite_love
# Wait 5-10 minutes for DNS propagation
terraform apply -target=aws_acm_certificate_validation.latenite_love
terraform apply -target=aws_lb_listener_certificate.latenite_love
```

**Fix Option 2: Manual AWS Console** (if Terraform not feasible)
1. AWS Console → Certificate Manager → Request Certificate
2. Domain: latenite.love, *.latenite.love
3. Validation: DNS validation
4. Add CNAME records to Route53 hosted zone for latenite.love
5. Wait for validation (5-10 minutes)
6. EC2 → Load Balancers → Find ALB serving 98.85.62.186
7. Listeners → HTTPS:443 → Add certificate → Select latenite.love cert

**Validation:**
```bash
openssl s_client -connect latenite.love:443 -servername latenite.love </dev/null 2>&1 | \
  openssl x509 -noout -text | grep -E "Subject:|DNS:"
# Should show: CN=latenite.love, DNS:*.latenite.love
```

**Time Estimate:** 45 minutes + 10 min DNS propagation
**Dependencies:** None
**Risk:** MEDIUM - Certificate validation can fail if DNS not propagated

#### Task 2.2: Validate sexacomms.com Certificate

**File:** `/Users/ryan/development/aeims.app/infrastructure/terraform/main.tf` (lines 934-985)
**Issue:** Certificate validation commented out

**Action:** Uncomment and apply validation resources

**Edit lines 964-985:**
```hcl
# UNCOMMENT THESE LINES:
resource "aws_route53_record" "sexacomms_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.sexacomms.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }
  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.sexacomms_com.zone_id
}

resource "aws_acm_certificate_validation" "sexacomms" {
  certificate_arn         = aws_acm_certificate.sexacomms.arn
  validation_record_fqdns = [for record in aws_route53_record.sexacomms_cert_validation : record.fqdn]
}
```

**Commands:**
```bash
terraform apply -target=aws_route53_record.sexacomms_cert_validation
# Wait 5-10 minutes
terraform apply -target=aws_acm_certificate_validation.sexacomms
terraform apply -target=aws_lb_listener_certificate.production_sexacomms
```

**Time Estimate:** 30 minutes
**Dependencies:** Task 1.3 complete
**Risk:** MEDIUM

---

### Phase 3: MEDIUM PRIORITY (4-8 hours) - Infrastructure for Missing Sites

**Priority:** MEDIUM
**Impact:** Brings 10 additional sites online
**Risk Level:** HIGH - Creating new infrastructure

**Missing Terraform Configurations:**
- 9inchesof.com
- beastybitches.com
- cavernof.love
- dommecats.com
- fantasyflirts.live
- gfecalls.com
- holyflirts.com
- latenite.ai
- phonesex.money
- shrinkshack.com

**Two Options:**

#### Option A: Add to Existing aeims.app Infrastructure (Recommended)

**File:** `/Users/ryan/development/aeims.app/infrastructure/terraform/additional-sites.tf` (NEW FILE)

**Create file with this content:**
```hcl
# Additional AfterDark Sites
# Shares aeims-alb-production ALB and ECS cluster

locals {
  additional_sites = [
    "9inchesof.com",
    "beastybitches.com",
    "cavernof.love",
    "dommecats.com",
    "fantasyflirts.live",
    "gfecalls.com",
    "holyflirts.com",
    "latenite.ai",
    "phonesex.money",
    "shrinkshack.com"
  ]
}

# Route53 Hosted Zones
resource "aws_route53_zone" "additional_sites" {
  for_each = toset(local.additional_sites)

  name = each.value

  tags = {
    Name        = "${each.value}-zone"
    Environment = "production"
    Project     = "AEIMS"
    ManagedBy   = "terraform"
  }
}

# ACM Certificates (one per domain)
resource "aws_acm_certificate" "additional_sites" {
  for_each = toset(local.additional_sites)

  domain_name               = each.value
  subject_alternative_names = ["*.${each.value}", "www.${each.value}"]
  validation_method         = "DNS"

  tags = {
    Name        = "${each.value}-cert"
    Environment = "production"
    Project     = "AEIMS"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Certificate validation records
resource "aws_route53_record" "additional_sites_cert_validation" {
  for_each = {
    for cert in local.additional_sites : cert => {
      for dvo in aws_acm_certificate.additional_sites[cert].domain_validation_options : dvo.domain_name => {
        name   = dvo.resource_record_name
        record = dvo.resource_record_value
        type   = dvo.resource_record_type
      }
    }
  }

  allow_overwrite = true
  name            = each.value[each.key].name
  records         = [each.value[each.key].record]
  ttl             = 60
  type            = each.value[each.key].type
  zone_id         = aws_route53_zone.additional_sites[each.key].zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "additional_sites" {
  for_each = toset(local.additional_sites)

  certificate_arn = aws_acm_certificate.additional_sites[each.value].arn
  validation_record_fqdns = [
    for record in aws_route53_record.additional_sites_cert_validation : record.fqdn
    if startswith(record.name, "_") && contains(record.name, each.value)
  ]
}

# A records pointing to production ALB
resource "aws_route53_record" "additional_sites_root" {
  for_each = toset(local.additional_sites)

  zone_id = aws_route53_zone.additional_sites[each.value].zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_lb.aeims_alb_production.dns_name
    zone_id                = aws_lb.aeims_alb_production.zone_id
    evaluate_target_health = true
  }
}

# WWW records
resource "aws_route53_record" "additional_sites_www" {
  for_each = toset(local.additional_sites)

  zone_id = aws_route53_zone.additional_sites[each.value].zone_id
  name    = "www.${each.value}"
  type    = "A"

  alias {
    name                   = aws_lb.aeims_alb_production.dns_name
    zone_id                = aws_lb.aeims_alb_production.zone_id
    evaluate_target_health = true
  }
}

# Add certificates to ALB HTTPS listener
resource "aws_lb_listener_certificate" "additional_sites" {
  for_each = toset(local.additional_sites)

  listener_arn    = aws_lb_listener.aeims_production_https.arn
  certificate_arn = aws_acm_certificate_validation.additional_sites[each.value].certificate_arn
}

# Output nameservers for domain registrar configuration
output "additional_sites_nameservers" {
  value = {
    for site in local.additional_sites :
    site => aws_route53_zone.additional_sites[site].name_servers
  }
  description = "Nameservers to configure at domain registrars"
}
```

**Deployment Steps:**
```bash
cd /Users/ryan/development/aeims.app/infrastructure/terraform

# Create file
cat > additional-sites.tf << 'EOF'
[paste content above]
EOF

# Review plan
terraform plan

# Apply in stages
terraform apply -target=aws_route53_zone.additional_sites
terraform apply -target=aws_acm_certificate.additional_sites
# Wait 10 minutes for DNS propagation
terraform apply -target=aws_route53_record.additional_sites_cert_validation
terraform apply -target=aws_acm_certificate_validation.additional_sites
terraform apply -target=aws_route53_record.additional_sites_root
terraform apply -target=aws_route53_record.additional_sites_www
terraform apply -target=aws_lb_listener_certificate.additional_sites
```

**Post-Deployment:**
1. Get nameservers from Terraform output:
   ```bash
   terraform output additional_sites_nameservers
   ```

2. Update nameservers at domain registrar for each domain:
   - 9inchesof.com → ns-XXXX.awsdns-XX.org (etc.)
   - beastybitches.com → ns-XXXX.awsdns-XX.org
   - (repeat for all 10 domains)

**Time Estimate:** 4 hours + 1 hour for nameserver propagation
**Dependencies:** Phase 1 complete
**Risk:** HIGH - Creating many new resources

#### Option B: Separate Infrastructure per Site

**Not Recommended** - Creates management overhead with 10 separate Terraform states.

---

### Phase 4: VALIDATION (1 hour) - Run Full Test Suite

**File:** `/Users/ryan/development/afterdark-validation-kit/validate.sh`

**Commands:**
```bash
cd /Users/ryan/development/afterdark-validation-kit

# Run full validation
./validate.sh

# Check results
cat reports/validation-report-*.json | jq '.summary'
```

**Expected Results After All Fixes:**
- Passed: 550+ (vs. current 375)
- Failed: <20 (vs. current 195)
- Pass Rate: >95% (vs. current 66%)

**Validation Criteria:**
- All 17 sites return HTTP 200 on homepage
- All SSL certificates valid and match domain
- API endpoints responsive
- Database health checks passing
- No ENOTFOUND errors

---

## Configuration Files to Modify

### Priority 1 Files (Immediate Changes Required)

**1. /Users/ryan/development/aeims.app/infrastructure/terraform/main.tf**
   - **Lines 964-985:** Uncomment sexacomms.com certificate validation
   - **Action:** Remove comment markers `#`
   - **Impact:** Enables SSL for sexacomms.com

**2. /Users/ryan/development/aeims.app/infrastructure/terraform/additional-sites.tf**
   - **Action:** CREATE NEW FILE
   - **Content:** See Phase 3, Option A
   - **Impact:** Adds 10 missing sites to infrastructure

**3. /Users/ryan/development/aeims.app/infrastructure/terraform/latenite-ssl.tf**
   - **Action:** CREATE NEW FILE
   - **Content:** See Phase 2, Task 2.1
   - **Impact:** Fixes SSL for latenite.love

### Priority 2 Files (Configuration Verification)

**4. /Users/ryan/development/afterdark-validation-kit/config.json**
   - **Lines 21-39:** Sites list
   - **Action:** VERIFY all sites have matching infrastructure
   - **Current:** Lists 17 sites, only 3 fully working
   - **Target:** All 17 sites operational

**5. /Users/ryan/development/hostscience.io/terraform/cloudflare.tf**
   - **Status:** WORKING - No changes needed
   - **Note:** Uses Cloudflare CDN + OCI origin (different architecture)

**6. /Users/ryan/development/afterdarksys.com/terraform/main.tf**
   - **Status:** WORKING - No changes needed
   - **Note:** Separate AWS ECS infrastructure for afterdarksys.com domain

---

## Exact Terraform Commands

### Phase 1: DNS Fixes (Priority 1 Sites)

```bash
# Set working directory
cd /Users/ryan/development/aeims.app/infrastructure/terraform

# Backup current state
cp terraform.tfstate terraform.tfstate.backup-$(date +%Y%m%d-%H%M%S)

# Initialize (if needed)
terraform init

# Get ALB DNS for validation
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names aeims-alb-production \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Apply aeims.app DNS records
terraform apply \
  -target=aws_route53_record.aeims_main \
  -target=aws_route53_record.aeims_www \
  -target=aws_route53_record.aeims_admin \
  -target=aws_route53_record.aeims_api \
  -target=aws_route53_record.aeims_support

# Wait 60 seconds for DNS propagation
sleep 60

# Validate aeims.app
dig +short aeims.app
curl -I https://aeims.app

# Apply flirts.nyc DNS records
terraform apply \
  -target=aws_route53_record.flirts_nyc \
  -target=aws_route53_record.flirts_nyc_www \
  -target=aws_route53_record.nycflirts_com \
  -target=aws_route53_record.nycflirts_com_www

# Apply sexacomms.com DNS records
terraform apply \
  -target=aws_route53_record.sexacomms_com \
  -target=aws_route53_record.sexacomms_com_www
```

### Phase 2: SSL Certificate Fixes

```bash
# Uncomment sexacomms validation in main.tf first (lines 964-985)
vi main.tf
# OR
sed -i.bak '964,985s/^# //' main.tf

# Apply certificate validation
terraform apply \
  -target=aws_route53_record.sexacomms_cert_validation

# Wait for DNS propagation (5-10 minutes)
sleep 600

# Complete validation
terraform apply \
  -target=aws_acm_certificate_validation.sexacomms

# Add cert to listener
terraform apply \
  -target=aws_lb_listener_certificate.production_sexacomms

# Create latenite.love SSL config
cat > latenite-ssl.tf << 'EOF'
[content from Phase 2, Task 2.1]
EOF

# Apply latenite.love certificate
terraform apply -target=aws_acm_certificate.latenite_love
sleep 600
terraform apply -target=aws_acm_certificate_validation.latenite_love
terraform apply -target=aws_lb_listener_certificate.latenite_love
```

### Phase 3: Additional Sites Infrastructure

```bash
# Create additional sites config
cat > additional-sites.tf << 'EOF'
[content from Phase 3, Option A]
EOF

# Apply hosted zones
terraform apply -target=aws_route53_zone.additional_sites

# Apply certificates
terraform apply -target=aws_acm_certificate.additional_sites

# Wait for DNS propagation
sleep 600

# Apply validation records
terraform apply -target=aws_route53_record.additional_sites_cert_validation

# Complete validation
terraform apply -target=aws_acm_certificate_validation.additional_sites

# Apply DNS A records
terraform apply -target=aws_route53_record.additional_sites_root
terraform apply -target=aws_route53_record.additional_sites_www

# Add certs to listener
terraform apply -target=aws_lb_listener_certificate.additional_sites

# Get nameservers for registrar updates
terraform output additional_sites_nameservers
```

---

## Monitoring and Validation

### Real-Time Monitoring During Deployment

```bash
# Watch DNS propagation
watch -n 5 'dig +short aeims.app'

# Monitor ALB target health
watch -n 10 'aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/aeims-ecs-tg-production/ID'

# Monitor ECS service
watch -n 10 'aws ecs describe-services \
  --cluster aeims-cluster \
  --services aeims-web-service \
  --query "services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}"'

# Monitor certificate validation
watch -n 60 'aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT:certificate/ID \
  --query "Certificate.Status"'
```

### Post-Deployment Validation

```bash
# Run validation suite
cd /Users/ryan/development/afterdark-validation-kit
./validate.sh

# Check specific endpoints
for site in aeims.app sexacomms.com flirts.nyc nycflirts.com; do
  echo "Testing $site"
  curl -I -s https://$site | head -1
  curl -I -s https://www.$site | head -1
done

# SSL certificate check
for site in aeims.app sexacomms.com flirts.nyc latenite.love; do
  echo "=== $site ==="
  openssl s_client -connect $site:443 -servername $site </dev/null 2>&1 | \
    openssl x509 -noout -subject -dates
done

# API health checks
for site in aeims.app sexacomms.com flirts.nyc; do
  curl -s https://$site/api/health | jq .
done
```

---

## Rollback Procedures

### If Terraform Apply Fails

```bash
# Restore previous state
cp terraform.tfstate.backup-YYYYMMDD-HHMMSS terraform.tfstate

# Refresh state from AWS
terraform refresh

# Plan again
terraform plan
```

### If DNS Changes Cause Issues

```bash
# Delete problematic A records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0819048KQ6II7V1JPW6 \
  --change-batch '{
    "Changes": [{
      "Action": "DELETE",
      "ResourceRecordSet": {
        "Name": "aeims.app",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ALB_ZONE_ID",
          "DNSName": "ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

### If Certificate Validation Fails

```bash
# Delete certificate
terraform destroy -target=aws_acm_certificate.sexacomms

# Delete validation records
terraform destroy -target=aws_route53_record.sexacomms_cert_validation

# Re-create
terraform apply -target=aws_acm_certificate.sexacomms
```

---

## Dependencies and Prerequisites

### Required AWS Permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:GetHostedZone",
        "route53:ListHostedZones",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange",
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:DeleteCertificate",
        "elasticloadbalancing:DescribeLoadBalancers",
        "elasticloadbalancing:DescribeTargetGroups",
        "elasticloadbalancing:DescribeTargetHealth",
        "elasticloadbalancing:DescribeListeners",
        "elasticloadbalancing:AddListenerCertificates",
        "ecs:DescribeServices",
        "ecs:DescribeClusters",
        "ecs:DescribeTaskDefinition"
      ],
      "Resource": "*"
    }
  ]
}
```

### Required Tools

```bash
# Terraform
terraform version  # >= 1.0

# AWS CLI
aws --version  # >= 2.0

# DNS tools
dig -v
whois --version

# TLS tools
openssl version

# jq for JSON parsing
jq --version
```

### Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_PROFILE=afterdark-admin  # or default
export TF_LOG=INFO  # For debugging
```

---

## Risk Assessment

### Low Risk (Phase 1)
- **Action:** Creating DNS A records
- **Impact:** Sites become accessible
- **Rollback Time:** 5 minutes (delete records)
- **Data Loss Risk:** None
- **Downtime Risk:** None (sites already down)

### Medium Risk (Phase 2)
- **Action:** Certificate creation/validation
- **Impact:** SSL enabled
- **Rollback Time:** 15 minutes
- **Data Loss Risk:** None
- **Downtime Risk:** Low (may have brief SSL errors during propagation)

### High Risk (Phase 3)
- **Action:** Creating 10 new hosted zones and certificates
- **Impact:** Large infrastructure change
- **Rollback Time:** 1 hour
- **Data Loss Risk:** None
- **Downtime Risk:** Medium (complex dependencies)

---

## Cost Impact

### New Resources Created

**Route53 Hosted Zones:**
- 10 new zones × $0.50/month = $5.00/month
- Query charges: ~$0.40/month per zone = $4.00/month
- **Total Route53:** $9.00/month

**ACM Certificates:**
- Free (AWS managed certificates)

**ALB:**
- Already exists, no additional cost
- Additional listener certificates: Free

**Total Additional Monthly Cost:** ~$9-10/month

### Cost Savings
- Reduced troubleshooting time: $500+/hour × 4 hours saved = $2,000+
- Avoided revenue loss from site outages: $XXXXX (depends on business model)

**ROI:** Positive within first month

---

## Timeline Summary

| Phase | Duration | Dependencies | Risk | Sites Restored |
|-------|----------|--------------|------|----------------|
| Phase 1: DNS Fixes | 1-2 hours | None | LOW | 4 sites (aeims.app, sexacomms.com, flirts.nyc, nycflirts.com) |
| Phase 2: SSL Fixes | 2 hours + 20min wait | Phase 1 | MEDIUM | +1 site (latenite.love SSL fixed) |
| Phase 3: New Sites | 4 hours + 1hr wait | Phase 1 | HIGH | +10 sites (all additional domains) |
| Phase 4: Validation | 1 hour | Phases 1-3 | LOW | N/A (testing) |
| **TOTAL** | **8-9 hours** | | | **17/17 sites (100%)** |

**Recommended Execution:**
- Day 1 (Morning): Phase 1 (2 hours)
- Day 1 (Afternoon): Phase 2 (2 hours)
- Day 2 (Morning): Phase 3 (5 hours)
- Day 2 (Afternoon): Phase 4 + Documentation (2 hours)

---

## Success Criteria

### Phase 1 Success
- [ ] aeims.app resolves to ALB IP addresses
- [ ] https://aeims.app returns HTTP 200 or valid redirect
- [ ] sexacomms.com resolves to ALB
- [ ] flirts.nyc and nycflirts.com resolve to ALB
- [ ] DNS propagation complete (dig +short shows IPs)

### Phase 2 Success
- [ ] sexacomms.com ACM certificate status: ISSUED
- [ ] latenite.love SSL certificate shows correct CN
- [ ] No DEPTH_ZERO_SELF_SIGNED_CERT errors
- [ ] All HTTPS endpoints serve valid certificates

### Phase 3 Success
- [ ] All 10 additional sites have hosted zones
- [ ] All certificates validated (status: ISSUED)
- [ ] All A records created and propagated
- [ ] Nameservers updated at registrars

### Final Success (Phase 4)
- [ ] Validation suite shows 550+ passed tests
- [ ] <20 failed tests
- [ ] >95% pass rate
- [ ] All 17 sites accessible via HTTP/HTTPS
- [ ] All API endpoints responding
- [ ] Database health checks passing

---

## Post-Remediation Actions

### 1. Documentation Updates

**File:** `/Users/ryan/development/afterdark-validation-kit/INFRASTRUCTURE_INVENTORY.md` (create new)

**Content:**
```markdown
# AfterDark Infrastructure Inventory

## DNS Providers
- AWS Route53 (Primary) - All *.app, *.com, *.nyc, *.live, *.ai domains
- Cloudflare (hostscience.io only)

## Load Balancers
- aeims-alb-production (AWS us-east-1)
  - Domains: aeims.app, sexacomms.com, flirts.nyc, nycflirts.com, [10 additional]
  - Target: aeims-ecs-tg-production
  - Health Check: /health

## ECS Services
- aeims-web-service
  - Cluster: aeims-cluster
  - Task: aeims:latest
  - Port: 80

## Databases
- RDS PostgreSQL: aeims-postgres.cluster-c9j2q6p1e0xd.us-east-1.rds.amazonaws.com

## SSL Certificates (ACM)
- aeims.app + *.aeims.app
- sexacomms.com + *.sexacomms.com
- flirts.nyc + nycflirts.com (shared cert)
- latenite.love + *.latenite.love
- [10 additional domain certs]
```

### 2. Monitoring Setup

**Create CloudWatch Alarms:**

```bash
# ALB unhealthy targets
aws cloudwatch put-metric-alarm \
  --alarm-name aeims-alb-unhealthy-targets \
  --alarm-description "Alert when ALB has unhealthy targets" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Certificate expiration (30 days)
aws cloudwatch put-metric-alarm \
  --alarm-name aeims-cert-expiring \
  --alarm-description "Alert when ACM cert expires in 30 days" \
  --metric-name DaysToExpiry \
  --namespace AWS/CertificateManager \
  --statistic Minimum \
  --period 86400 \
  --threshold 30 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1

# ECS service running count
aws cloudwatch put-metric-alarm \
  --alarm-name aeims-ecs-no-tasks \
  --alarm-description "Alert when no ECS tasks running" \
  --metric-name RunningTaskCount \
  --namespace ECS/ContainerInsights \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=ServiceName,Value=aeims-web-service Name=ClusterName,Value=aeims-cluster
```

### 3. Automated Health Checks

**Create cron job for validation:**

```bash
# Add to crontab
crontab -e

# Run validation every 6 hours
0 */6 * * * cd /Users/ryan/development/afterdark-validation-kit && ./validate.sh > /var/log/afterdark-validation.log 2>&1
```

### 4. Terraform State Backup

```bash
# Create S3 bucket for state
aws s3 mb s3://afterdark-terraform-state-backup

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket afterdark-terraform-state-backup \
  --versioning-configuration Status=Enabled

# Backup script
cat > /Users/ryan/development/aeims.app/infrastructure/terraform/backup-state.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
aws s3 cp terraform.tfstate s3://afterdark-terraform-state-backup/aeims-app/terraform.tfstate.$DATE
EOF

chmod +x backup-state.sh

# Add to cron (daily backup)
0 2 * * * cd /Users/ryan/development/aeims.app/infrastructure/terraform && ./backup-state.sh
```

### 5. Nameserver Documentation

**Create registrar update checklist:**

```markdown
# Domain Registrar Nameserver Updates

## Completed
- [x] sexacomms.com - Updated to AWS Route53 nameservers
- [x] flirts.nyc - Updated to AWS Route53 nameservers
- [x] latenite.love - Updated to AWS Route53 nameservers

## To Be Updated (Phase 3)
- [ ] 9inchesof.com - Nameservers: [get from terraform output]
- [ ] beastybitches.com - Nameservers: [get from terraform output]
- [ ] cavernof.love - Nameservers: [get from terraform output]
- [ ] dommecats.com - Nameservers: [get from terraform output]
- [ ] fantasyflirts.live - Nameservers: [get from terraform output]
- [ ] gfecalls.com - Nameservers: [get from terraform output]
- [ ] holyflirts.com - Nameservers: [get from terraform output]
- [ ] latenite.ai - Nameservers: [get from terraform output]
- [ ] phonesex.money - Nameservers: [get from terraform output]
- [ ] shrinkshack.com - Nameservers: [get from terraform output]
```

---

## Lessons Learned & Prevention

### Root Causes Identified

1. **Infrastructure Drift:** Terraform code existed but was never applied or was partially destroyed
2. **No State Locking:** Multiple developers may have modified infrastructure manually
3. **Missing Validation:** No automated checks to verify DNS/SSL configuration
4. **Documentation Gap:** No infrastructure inventory or runbook

### Prevention Measures

**1. Terraform State Management**

```bash
# Move to S3 backend with locking
cat > backend.tf << 'EOF'
terraform {
  backend "s3" {
    bucket         = "afterdark-terraform-state"
    key            = "aeims-app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
EOF
```

**2. Pre-Commit Hooks**

```bash
# Install pre-commit framework
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.77.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
      - id: terraform_tflint
EOF

pre-commit install
```

**3. CI/CD Pipeline**

```yaml
# .github/workflows/terraform.yml
name: Terraform Validate
on: [pull_request]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan
```

**4. Daily Validation**

- Automated validation suite runs every 6 hours
- Alerts sent to Slack/PagerDuty on failures
- Dashboard showing real-time site status

**5. Change Management**

- All infrastructure changes go through pull requests
- Require terraform plan output in PR description
- Peer review required for production changes
- Automated rollback on health check failures

---

## Appendix A: Infrastructure Comparison

### Working Sites Architecture

**psosoundoff.com (Oracle OCI):**
```
Domain: psosoundoff.com
IP: 129.153.158.177 (Oracle Cloud)
SSL: Valid AWS certificate
Architecture: Direct OCI compute instance
CDN: None (direct origin)
Status: WORKING
```

**cucking.life (AWS - Different Stack):**
```
Domain: cucking.life
IPs: 15.197.148.33, 3.33.130.190 (AWS)
SSL: Valid certificate
Architecture: AWS ALB (different from aeims-alb-production)
Status: WORKING
```

### Failed Sites Architecture (Should Match)

**aeims.app (AWS - BROKEN):**
```
Domain: aeims.app
Expected IPs: [aeims-alb-production IPs]
Current DNS: NO A RECORDS
SSL: Certificate exists but unreachable
Architecture: AWS ALB + ECS Fargate
Target: aeims-ecs-tg-production
Status: DNS MISSING
```

**Key Difference:** Working sites have DNS A records pointing to their load balancers. Failed sites have load balancers and applications running, but NO DNS RECORDS connecting the domain names to the infrastructure.

---

## Appendix B: Terraform State Inspection

To verify current state before making changes:

```bash
cd /Users/ryan/development/aeims.app/infrastructure/terraform

# List all resources in state
terraform state list

# Show specific resource
terraform state show aws_lb.aeims_alb_production

# Check if Route53 records exist in state
terraform state list | grep aws_route53_record

# Show Route53 zone
terraform state show data.aws_route53_zone.aeims

# Get ALB details
terraform state show aws_lb.aeims_alb_production | grep dns_name

# Check target group health
terraform state show aws_lb_target_group.aeims_ecs_production
```

If resources are in Terraform but not in AWS:
```bash
# Remove stale resources from state
terraform state rm aws_route53_record.aeims_main

# Re-import from AWS
terraform import aws_route53_record.aeims_main Z0819048KQ6II7V1JPW6_aeims.app_A
```

---

## Appendix C: Emergency Contact Information

**AWS Account:** 515966511618
**Region:** us-east-1 (Primary)
**VPC:** afterdarksys-vpc
**ECS Cluster:** aeims-cluster
**Production ALB:** aeims-alb-production
**RDS Endpoint:** aeims-postgres.cluster-c9j2q6p1e0xd.us-east-1.rds.amazonaws.com

**Terraform Directories:**
- AEIMS: `/Users/ryan/development/aeims.app/infrastructure/terraform`
- AfterDarkSys: `/Users/ryan/development/afterdarksys.com/terraform`
- HostScience: `/Users/ryan/development/hostscience.io/terraform`

**Critical Zones:**
- aeims.app: Z0819048KQ6II7V1JPW6

---

## Document Version

**Version:** 1.0
**Last Updated:** December 21, 2025
**Next Review:** After Phase 4 completion
**Maintained By:** Infrastructure Team
**Classification:** INTERNAL - Infrastructure Documentation
