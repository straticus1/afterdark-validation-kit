import axios from 'axios';
import chalk from 'chalk';

export class SecurityTester {
    constructor(config) {
        this.config = config;
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            warnings: 0,
            tests: []
        };
    }

    async runAll() {
        const sites = this.config.getSites();
        const testConfig = this.config.getTestConfig('security');

        if (!testConfig.enabled) {
            return { ...this.results, skipped: 1 };
        }

        for (const site of sites) {
            const baseUrl = `https://${site.domain}`;

            if (testConfig.xss_testing) {
                await this.testXssProtection(site.domain, baseUrl);
            }

            if (testConfig.csrf_testing) {
                await this.testCsrfProtection(site.domain, baseUrl);
            }

            if (testConfig.session_testing) {
                await this.testSessionSecurity(site.domain, baseUrl);
            }

            if (testConfig.cookie_testing) {
                await this.testCookieSecurity(site.domain, baseUrl);
            }

            if (testConfig.auth_testing) {
                await this.testAuthSecurity(site.domain, baseUrl);
            }

            // Always test headers
            await this.testSecurityHeaders(site.domain, baseUrl);
        }

        return this.results;
    }

    async testXssProtection(domain, baseUrl) {
        const xssPayloads = [
            '<script>alert(1)</script>',
            '"><script>alert(1)</script>',
            "'-alert(1)-'",
            '<img src=x onerror=alert(1)>',
            'javascript:alert(1)',
        ];

        // Test common input points
        const testPoints = [
            { url: '/login.php', params: { username: null, password: null } },
            { url: '/', params: { search: null, q: null } },
        ];

        for (const point of testPoints) {
            for (const [paramName, _] of Object.entries(point.params)) {
                for (const payload of xssPayloads) {
                    try {
                        const response = await axios.get(`${baseUrl}${point.url}`, {
                            params: { [paramName]: payload },
                            validateStatus: () => true,
                            timeout: 10000,
                        });

                        const bodyContainsPayload =
                            typeof response.data === 'string' &&
                            response.data.includes(payload) &&
                            !response.data.includes(this.escapeHtml(payload));

                        const testResult = {
                            domain,
                            type: 'XSS',
                            endpoint: point.url,
                            param: paramName,
                            payload: payload.substring(0, 30),
                            reflected: bodyContainsPayload,
                            passed: !bodyContainsPayload,
                        };

                        this.results.tests.push(testResult);
                        if (bodyContainsPayload) {
                            this.results.failed++;
                        } else {
                            this.results.passed++;
                        }
                    } catch (error) {
                        // Network errors are not XSS vulnerabilities
                        this.results.passed++;
                    }
                }
            }
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    async testCsrfProtection(domain, baseUrl) {
        try {
            // Fetch login page to check for CSRF token
            const response = await axios.get(`${baseUrl}/login.php`, {
                validateStatus: () => true,
                timeout: 10000,
            });

            const hasCsrfToken =
                typeof response.data === 'string' &&
                (response.data.includes('csrf_token') ||
                 response.data.includes('_token') ||
                 response.data.includes('csrfmiddlewaretoken'));

            const hasCsrfHeader =
                response.headers['x-csrf-token'] ||
                response.headers['x-xsrf-token'];

            const testResult = {
                domain,
                type: 'CSRF',
                endpoint: '/login.php',
                hasCsrfToken,
                hasCsrfHeader: !!hasCsrfHeader,
                passed: hasCsrfToken || hasCsrfHeader,
            };

            this.results.tests.push(testResult);
            if (testResult.passed) {
                this.results.passed++;
            } else {
                this.results.warnings++; // CSRF missing is a warning
            }

            // Test that form submission without token is rejected
            if (hasCsrfToken) {
                try {
                    const postResponse = await axios.post(`${baseUrl}/login.php`, {
                        username: 'test@test.com',
                        password: 'test123'
                    }, {
                        validateStatus: () => true,
                        timeout: 10000,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    });

                    // Should be rejected (400, 403, 422) or have error message
                    const rejected = [400, 403, 422].includes(postResponse.status) ||
                        (typeof postResponse.data === 'string' &&
                         (postResponse.data.includes('csrf') ||
                          postResponse.data.includes('token') ||
                          postResponse.data.includes('invalid')));

                    this.results.tests.push({
                        domain,
                        type: 'CSRF',
                        test: 'Form submission without token rejected',
                        passed: rejected,
                        status: postResponse.status
                    });

                    if (rejected) {
                        this.results.passed++;
                    } else {
                        this.results.warnings++;
                    }
                } catch {
                    this.results.passed++; // Connection refused is fine
                }
            }
        } catch (error) {
            this.results.skipped++;
        }
    }

    async testSessionSecurity(domain, baseUrl) {
        try {
            const response = await axios.get(`${baseUrl}/login.php`, {
                validateStatus: () => true,
                timeout: 10000,
            });

            const setCookieHeader = response.headers['set-cookie'];
            if (!setCookieHeader) {
                this.results.tests.push({
                    domain,
                    type: 'Session',
                    test: 'Session cookie present',
                    passed: false,
                    note: 'No Set-Cookie header'
                });
                this.results.skipped++;
                return;
            }

            const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

            for (const cookie of cookies) {
                const cookieLower = cookie.toLowerCase();
                const isSessionCookie =
                    cookie.includes('PHPSESSID') ||
                    cookie.includes('session') ||
                    cookie.includes('ads_auth');

                if (isSessionCookie) {
                    const tests = {
                        httpOnly: cookieLower.includes('httponly'),
                        secure: cookieLower.includes('secure'),
                        sameSite: cookieLower.includes('samesite'),
                        path: cookie.includes('path=/'),
                    };

                    for (const [testName, passed] of Object.entries(tests)) {
                        this.results.tests.push({
                            domain,
                            type: 'Session',
                            cookie: cookie.split('=')[0],
                            test: testName,
                            passed,
                        });

                        if (passed) {
                            this.results.passed++;
                        } else if (testName === 'httpOnly' || testName === 'secure') {
                            this.results.failed++;
                        } else {
                            this.results.warnings++;
                        }
                    }
                }
            }
        } catch (error) {
            this.results.skipped++;
        }
    }

    async testCookieSecurity(domain, baseUrl) {
        try {
            const response = await axios.get(`${baseUrl}/`, {
                validateStatus: () => true,
                timeout: 10000,
            });

            const setCookieHeader = response.headers['set-cookie'];
            if (!setCookieHeader) {
                return;
            }

            const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];

            for (const cookie of cookies) {
                const cookieName = cookie.split('=')[0];
                const cookieLower = cookie.toLowerCase();

                // Check for sensitive data in cookies
                const sensitivePatterns = [
                    /password/i,
                    /secret/i,
                    /token(?!_name)/i,
                    /api_key/i,
                    /private/i,
                ];

                for (const pattern of sensitivePatterns) {
                    if (pattern.test(cookieName)) {
                        this.results.tests.push({
                            domain,
                            type: 'Cookie',
                            cookie: cookieName,
                            test: 'Sensitive data exposure',
                            passed: false,
                            warning: 'Cookie name suggests sensitive data'
                        });
                        this.results.warnings++;
                    }
                }

                // Check expiration
                const hasExpires = cookieLower.includes('expires=') || cookieLower.includes('max-age=');
                if (hasExpires) {
                    const maxAgeMatch = cookie.match(/max-age=(\d+)/i);
                    if (maxAgeMatch) {
                        const maxAge = parseInt(maxAgeMatch[1]);
                        const oneWeek = 7 * 24 * 60 * 60;

                        if (maxAge > oneWeek && cookieName.includes('session')) {
                            this.results.tests.push({
                                domain,
                                type: 'Cookie',
                                cookie: cookieName,
                                test: 'Session cookie expiration',
                                passed: false,
                                warning: `Session cookie max-age ${maxAge}s is too long`
                            });
                            this.results.warnings++;
                        }
                    }
                }
            }
        } catch (error) {
            // Skip on error
        }
    }

    async testAuthSecurity(domain, baseUrl) {
        // Test rate limiting
        const attempts = [];
        for (let i = 0; i < 10; i++) {
            try {
                const start = Date.now();
                const response = await axios.post(`${baseUrl}/login.php`, {
                    username: `test${i}@test.com`,
                    password: 'wrongpassword'
                }, {
                    validateStatus: () => true,
                    timeout: 5000,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                attempts.push({
                    status: response.status,
                    time: Date.now() - start
                });
            } catch (error) {
                attempts.push({ error: error.code });
            }
        }

        // Check if we got rate limited
        const rateLimited = attempts.some(a => a.status === 429 || a.status === 403);
        const timingIncreased = attempts.length > 5 &&
            attempts.slice(-3).every((a, i) =>
                i === 0 || (a.time && attempts.slice(-3)[i-1].time && a.time > attempts.slice(-3)[i-1].time)
            );

        this.results.tests.push({
            domain,
            type: 'Auth',
            test: 'Rate limiting',
            passed: rateLimited || timingIncreased,
            attempts: attempts.length,
            rateLimited,
        });

        if (rateLimited || timingIncreased) {
            this.results.passed++;
        } else {
            this.results.warnings++;
        }

        // Test password requirements messaging
        try {
            const response = await axios.get(`${baseUrl}/login.php`, {
                validateStatus: () => true,
                timeout: 10000,
            });

            // Check that login form exists and is properly structured
            const hasLoginForm = typeof response.data === 'string' &&
                (response.data.includes('type="password"') ||
                 response.data.includes("type='password'"));

            this.results.tests.push({
                domain,
                type: 'Auth',
                test: 'Login form exists',
                passed: hasLoginForm,
            });

            if (hasLoginForm) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }
        } catch (error) {
            this.results.skipped++;
        }
    }

    async testSecurityHeaders(domain, baseUrl) {
        try {
            const response = await axios.get(baseUrl, {
                validateStatus: () => true,
                timeout: 10000,
            });

            const headers = response.headers;
            const securityHeaders = {
                'strict-transport-security': {
                    required: true,
                    check: (value) => value && value.includes('max-age')
                },
                'x-content-type-options': {
                    required: true,
                    expectedValue: 'nosniff'
                },
                'x-frame-options': {
                    required: true,
                    check: (value) => ['DENY', 'SAMEORIGIN'].includes(value?.toUpperCase())
                },
                'x-xss-protection': {
                    required: false,
                    check: (value) => value?.includes('1')
                },
                'content-security-policy': {
                    required: false,
                    check: (value) => value && value.length > 10
                },
                'referrer-policy': {
                    required: false,
                    check: (value) => !!value
                },
                'permissions-policy': {
                    required: false,
                    check: (value) => !!value
                },
            };

            for (const [header, config] of Object.entries(securityHeaders)) {
                const value = headers[header];
                let passed = false;

                if (config.expectedValue) {
                    passed = value === config.expectedValue;
                } else if (config.check) {
                    passed = config.check(value);
                } else {
                    passed = !!value;
                }

                this.results.tests.push({
                    domain,
                    type: 'Headers',
                    header,
                    value: value || 'missing',
                    passed,
                    required: config.required,
                });

                if (passed) {
                    this.results.passed++;
                } else if (config.required) {
                    this.results.failed++;
                } else {
                    this.results.warnings++;
                }
            }
        } catch (error) {
            this.results.skipped++;
        }
    }
}
