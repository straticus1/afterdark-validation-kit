#!/usr/bin/env python3
"""Security scanner for AfterDark sites."""

import json
import re
import ssl
import socket
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import urlparse, urljoin
import requests
from bs4 import BeautifulSoup

from .config import ConfigLoader, get_config


@dataclass
class SecurityIssue:
    """Security issue found."""
    severity: str  # critical, high, medium, low, info
    category: str
    title: str
    description: str
    remediation: str
    affected_url: str = ""
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SecurityScanResults:
    """Security scan results."""
    domain: str
    scan_time: str
    issues: List[SecurityIssue] = field(default_factory=list)
    passed_checks: List[str] = field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return len([i for i in self.issues if i.severity == "critical"])

    @property
    def high_count(self) -> int:
        return len([i for i in self.issues if i.severity == "high"])

    @property
    def medium_count(self) -> int:
        return len([i for i in self.issues if i.severity == "medium"])

    @property
    def low_count(self) -> int:
        return len([i for i in self.issues if i.severity == "low"])


class SecurityScanner:
    """Security scanner for web applications."""

    # XSS test payloads
    XSS_PAYLOADS = [
        '<script>alert(1)</script>',
        '"><script>alert(1)</script>',
        "'-alert(1)-'",
        '<img src=x onerror=alert(1)>',
        '"><img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
    ]

    # SQL injection test payloads
    SQL_PAYLOADS = [
        "' OR '1'='1",
        "1' OR '1'='1' --",
        "1; DROP TABLE users--",
        "' UNION SELECT NULL--",
        "1' AND '1'='1",
    ]

    # Security headers to check
    SECURITY_HEADERS = {
        'Strict-Transport-Security': {
            'required': True,
            'check': lambda v: v and 'max-age' in v.lower(),
            'severity': 'high'
        },
        'X-Content-Type-Options': {
            'required': True,
            'expected': 'nosniff',
            'severity': 'medium'
        },
        'X-Frame-Options': {
            'required': True,
            'check': lambda v: v and v.upper() in ['DENY', 'SAMEORIGIN'],
            'severity': 'medium'
        },
        'X-XSS-Protection': {
            'required': False,
            'check': lambda v: v and '1' in v,
            'severity': 'low'
        },
        'Content-Security-Policy': {
            'required': False,
            'check': lambda v: v and len(v) > 10,
            'severity': 'medium'
        },
        'Referrer-Policy': {
            'required': False,
            'check': lambda v: bool(v),
            'severity': 'low'
        },
        'Permissions-Policy': {
            'required': False,
            'check': lambda v: bool(v),
            'severity': 'low'
        },
    }

    def __init__(self, config: Optional[ConfigLoader] = None):
        self.config = config or get_config()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AfterDark-Security-Scanner/1.0',
            'Accept': 'text/html,application/json',
        })

    def scan_site(self, domain: str) -> SecurityScanResults:
        """Perform full security scan of a site."""
        results = SecurityScanResults(
            domain=domain,
            scan_time=datetime.now().isoformat()
        )

        base_url = f"https://{domain}"

        # Run all security checks
        self._check_ssl(domain, results)
        self._check_security_headers(base_url, results)
        self._check_cookies(base_url, results)
        self._check_csrf(base_url, results)
        self._check_xss(base_url, results)
        self._check_information_disclosure(base_url, results)
        self._check_sensitive_files(base_url, results)
        self._check_cors(base_url, results)

        return results

    def _check_ssl(self, domain: str, results: SecurityScanResults):
        """Check SSL/TLS configuration."""
        try:
            context = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    protocol = ssock.version()

                    # Check certificate expiry
                    not_after = cert.get('notAfter', '')
                    if not_after:
                        expiry = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                        days_left = (expiry - datetime.now()).days

                        if days_left < 0:
                            results.issues.append(SecurityIssue(
                                severity="critical",
                                category="SSL/TLS",
                                title="SSL Certificate Expired",
                                description=f"SSL certificate expired {-days_left} days ago",
                                remediation="Renew SSL certificate immediately",
                                affected_url=domain
                            ))
                        elif days_left < 30:
                            results.issues.append(SecurityIssue(
                                severity="high",
                                category="SSL/TLS",
                                title="SSL Certificate Expiring Soon",
                                description=f"SSL certificate expires in {days_left} days",
                                remediation="Renew SSL certificate before expiry",
                                affected_url=domain
                            ))
                        else:
                            results.passed_checks.append(f"SSL certificate valid ({days_left} days remaining)")

                    # Check protocol version
                    if 'TLSv1.3' in protocol or 'TLSv1.2' in protocol:
                        results.passed_checks.append(f"Using secure TLS version: {protocol}")
                    else:
                        results.issues.append(SecurityIssue(
                            severity="high",
                            category="SSL/TLS",
                            title="Outdated TLS Version",
                            description=f"Server using outdated TLS version: {protocol}",
                            remediation="Configure server to use TLS 1.2 or 1.3",
                            affected_url=domain
                        ))

        except ssl.SSLCertVerificationError as e:
            results.issues.append(SecurityIssue(
                severity="critical",
                category="SSL/TLS",
                title="SSL Certificate Verification Failed",
                description=str(e),
                remediation="Install valid SSL certificate",
                affected_url=domain
            ))
        except Exception as e:
            results.issues.append(SecurityIssue(
                severity="high",
                category="SSL/TLS",
                title="SSL Connection Failed",
                description=str(e),
                remediation="Ensure SSL is properly configured",
                affected_url=domain
            ))

    def _check_security_headers(self, base_url: str, results: SecurityScanResults):
        """Check security headers."""
        try:
            response = self.session.get(base_url, timeout=15)
            headers = response.headers

            for header_name, config in self.SECURITY_HEADERS.items():
                value = headers.get(header_name)

                if 'expected' in config:
                    passed = value == config['expected']
                elif 'check' in config:
                    passed = config['check'](value)
                else:
                    passed = bool(value)

                if passed:
                    results.passed_checks.append(f"Security header present: {header_name}")
                elif config['required']:
                    results.issues.append(SecurityIssue(
                        severity=config['severity'],
                        category="Security Headers",
                        title=f"Missing Security Header: {header_name}",
                        description=f"The {header_name} header is not set or misconfigured",
                        remediation=f"Add {header_name} header to server responses",
                        affected_url=base_url,
                        details={"current_value": value}
                    ))
                else:
                    results.issues.append(SecurityIssue(
                        severity="info",
                        category="Security Headers",
                        title=f"Recommended Header Missing: {header_name}",
                        description=f"Consider adding {header_name} for additional security",
                        remediation=f"Add {header_name} header",
                        affected_url=base_url
                    ))

        except Exception as e:
            results.issues.append(SecurityIssue(
                severity="medium",
                category="Security Headers",
                title="Could Not Check Security Headers",
                description=str(e),
                remediation="Ensure site is accessible",
                affected_url=base_url
            ))

    def _check_cookies(self, base_url: str, results: SecurityScanResults):
        """Check cookie security."""
        try:
            response = self.session.get(f"{base_url}/login.php", timeout=15)
            cookies = response.cookies

            for cookie in cookies:
                issues = []

                if not cookie.secure:
                    issues.append("Secure flag missing")

                if not cookie.has_nonstandard_attr('HttpOnly'):
                    # Check raw Set-Cookie header
                    set_cookie = response.headers.get('Set-Cookie', '')
                    if 'httponly' not in set_cookie.lower():
                        issues.append("HttpOnly flag missing")

                if 'samesite' not in str(cookie).lower():
                    issues.append("SameSite attribute missing")

                if issues:
                    results.issues.append(SecurityIssue(
                        severity="medium",
                        category="Cookie Security",
                        title=f"Insecure Cookie: {cookie.name}",
                        description=f"Cookie security issues: {', '.join(issues)}",
                        remediation="Set Secure, HttpOnly, and SameSite flags on cookies",
                        affected_url=base_url,
                        details={"cookie": cookie.name, "issues": issues}
                    ))
                else:
                    results.passed_checks.append(f"Cookie {cookie.name} has proper security flags")

        except Exception as e:
            pass  # Skip if we can't check cookies

    def _check_csrf(self, base_url: str, results: SecurityScanResults):
        """Check CSRF protection."""
        try:
            response = self.session.get(f"{base_url}/login.php", timeout=15)
            html = response.text

            # Look for CSRF tokens
            csrf_patterns = [
                r'csrf_token',
                r'_token',
                r'csrfmiddlewaretoken',
                r'authenticity_token',
                r'__RequestVerificationToken',
            ]

            has_csrf = any(re.search(p, html, re.I) for p in csrf_patterns)

            if has_csrf:
                results.passed_checks.append("CSRF protection detected on login form")
            else:
                results.issues.append(SecurityIssue(
                    severity="high",
                    category="CSRF",
                    title="Missing CSRF Protection",
                    description="No CSRF token found on login form",
                    remediation="Implement CSRF token protection for all forms",
                    affected_url=f"{base_url}/login.php"
                ))

        except Exception:
            pass

    def _check_xss(self, base_url: str, results: SecurityScanResults):
        """Check for XSS vulnerabilities."""
        # Check common input points
        test_endpoints = [
            f"{base_url}/?q=",
            f"{base_url}/?search=",
            f"{base_url}/?name=",
        ]

        for endpoint in test_endpoints:
            for payload in self.XSS_PAYLOADS[:3]:  # Test first 3 payloads
                try:
                    test_url = endpoint + requests.utils.quote(payload)
                    response = self.session.get(test_url, timeout=10)

                    # Check if payload is reflected unescaped
                    if payload in response.text and self._html_escape(payload) not in response.text:
                        results.issues.append(SecurityIssue(
                            severity="high",
                            category="XSS",
                            title="Potential XSS Vulnerability",
                            description=f"XSS payload reflected unescaped in response",
                            remediation="Properly escape all user input in HTML output",
                            affected_url=endpoint,
                            details={"payload": payload}
                        ))
                        break  # Found issue, no need to test more payloads
                except Exception:
                    pass

    def _html_escape(self, text: str) -> str:
        """HTML escape a string."""
        return (text
                .replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#039;'))

    def _check_information_disclosure(self, base_url: str, results: SecurityScanResults):
        """Check for information disclosure."""
        try:
            response = self.session.get(base_url, timeout=15)

            # Check for server version disclosure
            server_header = response.headers.get('Server', '')
            if re.search(r'\d+\.\d+', server_header):
                results.issues.append(SecurityIssue(
                    severity="low",
                    category="Information Disclosure",
                    title="Server Version Disclosed",
                    description=f"Server header reveals version: {server_header}",
                    remediation="Configure server to hide version information",
                    affected_url=base_url
                ))

            # Check for X-Powered-By
            powered_by = response.headers.get('X-Powered-By', '')
            if powered_by:
                results.issues.append(SecurityIssue(
                    severity="low",
                    category="Information Disclosure",
                    title="Technology Stack Disclosed",
                    description=f"X-Powered-By header present: {powered_by}",
                    remediation="Remove X-Powered-By header",
                    affected_url=base_url
                ))

            # Check for error messages in HTML
            error_patterns = [
                r'Fatal error',
                r'Parse error',
                r'Warning:.*require',
                r'Warning:.*include',
                r'mysql_error',
                r'mysqli_error',
                r'pg_error',
                r'Stack trace:',
                r'Exception in',
            ]

            for pattern in error_patterns:
                if re.search(pattern, response.text, re.I):
                    results.issues.append(SecurityIssue(
                        severity="medium",
                        category="Information Disclosure",
                        title="Error Message Exposed",
                        description=f"Page contains exposed error message matching: {pattern}",
                        remediation="Configure proper error handling to hide error details",
                        affected_url=base_url
                    ))
                    break

        except Exception:
            pass

    def _check_sensitive_files(self, base_url: str, results: SecurityScanResults):
        """Check for exposed sensitive files."""
        sensitive_paths = [
            '.env',
            '.git/config',
            'config.php',
            'wp-config.php',
            '.htaccess',
            'composer.json',
            'package.json',
            'phpinfo.php',
            'info.php',
            'server-status',
            '.DS_Store',
            'backup.sql',
            'database.sql',
        ]

        for path in sensitive_paths:
            try:
                url = f"{base_url}/{path}"
                response = self.session.get(url, timeout=5)

                if response.status_code == 200:
                    # Check if it's actually the file content
                    content_type = response.headers.get('Content-Type', '')
                    content = response.text[:500]

                    # Skip if it's a custom 404 page
                    if '404' in content.lower() or 'not found' in content.lower():
                        continue

                    results.issues.append(SecurityIssue(
                        severity="critical" if path in ['.env', '.git/config', 'backup.sql'] else "high",
                        category="Sensitive Files",
                        title=f"Sensitive File Exposed: {path}",
                        description=f"Sensitive file is publicly accessible",
                        remediation="Block access to sensitive files in server configuration",
                        affected_url=url
                    ))
            except Exception:
                pass

    def _check_cors(self, base_url: str, results: SecurityScanResults):
        """Check CORS configuration."""
        try:
            # Make request with Origin header
            headers = {'Origin': 'https://evil.com'}
            response = self.session.get(base_url, headers=headers, timeout=15)

            acao = response.headers.get('Access-Control-Allow-Origin', '')
            acac = response.headers.get('Access-Control-Allow-Credentials', '')

            if acao == '*':
                if acac.lower() == 'true':
                    results.issues.append(SecurityIssue(
                        severity="critical",
                        category="CORS",
                        title="Dangerous CORS Configuration",
                        description="CORS allows all origins with credentials",
                        remediation="Configure specific allowed origins for CORS",
                        affected_url=base_url
                    ))
                else:
                    results.issues.append(SecurityIssue(
                        severity="medium",
                        category="CORS",
                        title="Overly Permissive CORS",
                        description="CORS allows all origins",
                        remediation="Restrict CORS to specific trusted origins",
                        affected_url=base_url
                    ))
            elif acao == 'https://evil.com':
                results.issues.append(SecurityIssue(
                    severity="high",
                    category="CORS",
                    title="CORS Reflects Origin",
                    description="CORS reflects arbitrary origin without validation",
                    remediation="Validate origins against whitelist",
                    affected_url=base_url
                ))
            else:
                results.passed_checks.append("CORS configuration appears secure")

        except Exception:
            pass


def main():
    """Run security scan from command line."""
    import argparse

    parser = argparse.ArgumentParser(description="Security Scanner")
    parser.add_argument("domain", nargs="?", help="Domain to scan")
    parser.add_argument("--all", "-a", action="store_true", help="Scan all configured sites")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    scanner = SecurityScanner()

    if args.all:
        config = get_config()
        sites = config.get_sites()
        all_results = []

        for site in sites:
            print(f"\nScanning {site['domain']}...")
            results = scanner.scan_site(site['domain'])
            all_results.append(results)

        if args.json:
            output = [
                {
                    "domain": r.domain,
                    "scan_time": r.scan_time,
                    "issues": [
                        {
                            "severity": i.severity,
                            "category": i.category,
                            "title": i.title,
                            "description": i.description,
                            "remediation": i.remediation,
                            "affected_url": i.affected_url
                        }
                        for i in r.issues
                    ],
                    "passed_checks": r.passed_checks
                }
                for r in all_results
            ]
            print(json.dumps(output, indent=2))

    elif args.domain:
        results = scanner.scan_site(args.domain)

        if args.json:
            output = {
                "domain": results.domain,
                "scan_time": results.scan_time,
                "summary": {
                    "critical": results.critical_count,
                    "high": results.high_count,
                    "medium": results.medium_count,
                    "low": results.low_count,
                    "passed": len(results.passed_checks)
                },
                "issues": [
                    {
                        "severity": i.severity,
                        "category": i.category,
                        "title": i.title,
                        "description": i.description,
                        "remediation": i.remediation,
                        "affected_url": i.affected_url
                    }
                    for i in results.issues
                ],
                "passed_checks": results.passed_checks
            }
            print(json.dumps(output, indent=2))
        else:
            print(f"\nSecurity Scan Results for {results.domain}")
            print("=" * 50)
            print(f"Critical: {results.critical_count}")
            print(f"High: {results.high_count}")
            print(f"Medium: {results.medium_count}")
            print(f"Low: {results.low_count}")
            print(f"Passed: {len(results.passed_checks)}")

            if results.issues:
                print("\nIssues Found:")
                for issue in results.issues:
                    print(f"  [{issue.severity.upper()}] {issue.title}")
                    print(f"    {issue.description}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
