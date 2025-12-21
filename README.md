# AfterDark Validation Kit

Comprehensive infrastructure validation toolkit for the AfterDark ecosystem. This toolkit provides automated testing for APIs, security, CDN/Cloudflare, Oracle Cloud, Neon databases, and multi-site validation.

## Features

- **API Validation**: Test all site endpoints, response formats, status codes, and latency
- **Security Testing**: XSS, CSRF, session management, cookie security, and header validation
- **CDN Testing**: Cloudflare integration, DNS validation, SSL certificates, caching
- **Cloud Infrastructure**: Oracle Cloud (OCI) and Neon database health checks
- **Multi-Site Support**: Test all 17+ AfterDark sites in parallel
- **Import API Keys**: Automatic scanning and import of API keys from development directories
- **Comprehensive Reporting**: JSON, HTML, and Markdown reports

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/afterdark/validation-kit.git
cd afterdark-validation-kit

# Install dependencies
npm install
pip3 install -r requirements.txt
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your API credentials:
```env
CLOUDFLARE_API_TOKEN=your_token
NEON_API_KEY=your_key
OCI_TENANCY_OCID=your_ocid
OCI_USER_OCID=your_user_ocid
OCI_FINGERPRINT=your_fingerprint
OCI_PRIVATE_KEY_PATH=/path/to/key.pem
OCI_COMPARTMENT_OCID=your_compartment
```

3. Or use the import-api scanner to find keys:
```bash
npm run import-keys -- ~/development/
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:api        # API validation
npm run test:security   # Security tests
npm run test:cdn        # CDN/Cloudflare tests
npm run test:database   # Database tests
npm run test:sites      # Site functional tests

# Python-specific tests
python3 -m src.python.run_tests --all
python3 -m src.python.run_tests --oci
python3 -m src.python.run_tests --neon

# Security scan
python3 -m src.python.security_scanner example.com
python3 -m src.python.security_scanner --all
```

## Project Structure

```
afterdark-validation-kit/
├── config.json          # Main configuration
├── package.json         # Node.js dependencies
├── requirements.txt     # Python dependencies
├── src/
│   ├── node/           # Node.js modules
│   │   ├── runner.js        # Main test runner
│   │   ├── config-loader.js # Configuration loader
│   │   ├── import-api.js    # API key scanner
│   │   ├── reporter.js      # Report generator
│   │   └── testers/         # Test modules
│   │       ├── api-tester.js
│   │       ├── security-tester.js
│   │       ├── cdn-tester.js
│   │       ├── database-tester.js
│   │       └── site-tester.js
│   └── python/         # Python modules
│       ├── config.py        # Configuration loader
│       ├── run_tests.py     # Main runner
│       ├── oci_tester.py    # Oracle Cloud tests
│       ├── neon_tester.py   # Neon database tests
│       └── security_scanner.py # Security scanner
├── reports/            # Generated test reports
└── configs/            # Additional configurations
```

## Configuration

### config.json

The main configuration file supports:

```json
{
  "version": "1.0.0",
  "sites": [
    {"domain": "example.com", "type": "site", "priority": 1}
  ],
  "apis": {
    "cloudflare": {
      "enabled": true,
      "token_env": "CLOUDFLARE_API_TOKEN"
    },
    "neon": {
      "enabled": true,
      "api_key_env": "NEON_API_KEY"
    },
    "oracle_cloud": {
      "enabled": true,
      "region": "us-ashburn-1"
    }
  },
  "tests": {
    "security": {
      "enabled": true,
      "xss_testing": true,
      "csrf_testing": true
    }
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `NEON_API_KEY` | Neon database API key |
| `OCI_TENANCY_OCID` | Oracle Cloud tenancy OCID |
| `OCI_USER_OCID` | Oracle Cloud user OCID |
| `OCI_FINGERPRINT` | OCI API key fingerprint |
| `OCI_PRIVATE_KEY_PATH` | Path to OCI private key |
| `OCI_COMPARTMENT_OCID` | OCI compartment OCID |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |

## Test Categories

### API Tests

- Homepage accessibility
- Login page functionality
- API endpoint response codes
- JSON response validation
- Response latency measurement
- Security header presence

### Security Tests

- XSS vulnerability scanning
- CSRF token validation
- Session cookie security (HttpOnly, Secure, SameSite)
- Security header validation
- Rate limiting detection
- Authentication flow testing

### CDN Tests

- DNS resolution
- Cloudflare protection detection
- SSL certificate validation
- HTTPS redirect
- Cache header analysis
- Response time benchmarking

### Database Tests

- Neon API connectivity
- Project health status
- Branch and endpoint status
- Oracle Cloud resource validation
- Connection endpoint accessibility

### Site Tests

- Critical page availability
- Form structure validation
- JavaScript error detection
- Mobile responsiveness
- 404 page handling
- PHP error detection

## Import API Keys

The `import-api` tool scans directories for API keys and credentials:

```bash
# Scan default directory (~/development/)
npm run import-keys

# Scan specific directory
npm run import-keys -- /path/to/scan

# Dry run (don't modify config)
npm run import-keys -- --dry-run

# Interactive mode
npm run import-keys -- --interactive
```

Detected patterns:
- AWS credentials
- Cloudflare tokens and zone IDs
- Neon API keys and project IDs
- Oracle Cloud OCIDs
- Database connection strings
- JWT secrets

## Reports

Reports are generated in multiple formats:

### JSON Report
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "passed": 150,
    "failed": 5,
    "warnings": 10,
    "skipped": 3
  },
  "tests": { ... }
}
```

### HTML Report
Interactive HTML report with:
- Summary dashboard
- Categorized test results
- Pass/fail indicators
- Detailed error messages

### Markdown Report
Text-based report suitable for:
- CI/CD pipelines
- GitHub issues
- Documentation

## Sites Tested

The toolkit validates all AfterDark ecosystem sites:

| Domain | Type | Priority |
|--------|------|----------|
| aeims.app | Platform | 1 |
| sexacomms.com | Site | 1 |
| flirts.nyc | Site | 1 |
| nycflirts.com | Site | 1 |
| 9inchesof.com | Site | 2 |
| beastybitches.com | Site | 2 |
| cavernof.love | Site | 2 |
| ... | ... | ... |

## CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Validation Tests
  run: |
    npm install
    pip3 install -r requirements.txt
    npm test
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_TOKEN }}
    NEON_API_KEY: ${{ secrets.NEON_KEY }}
```

## Development

```bash
# Run tests in development
node src/node/runner.js --verbose

# Run Python tests
python3 -m src.python.run_tests --verbose

# Run security scan on single site
python3 -m src.python.security_scanner example.com --json
```

## License

MIT License - See LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request
