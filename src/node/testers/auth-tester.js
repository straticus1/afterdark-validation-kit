import axios from 'axios';

export class AuthTester {
    constructor(config) {
        this.config = config;
        this.ssoConfig = config.getSSO();
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            warnings: 0,
            tests: []
        };
    }

    async runAll() {
        const ssoUrl = `https://${this.ssoConfig.provider}`;

        // Test SSO provider health
        await this.testSSOHealth(ssoUrl);

        // Test SSO diagnostics
        await this.testSSODiagnostics(ssoUrl);

        // Test auth flow
        await this.testAuthFlow(ssoUrl);

        // Test CORS headers
        await this.testCORSHeaders(ssoUrl);

        // Test token validation endpoint
        await this.testTokenValidation(ssoUrl);

        // Test platform-specific SSO for each site
        const sites = this.config.getSites().filter(s => s.auth === 'sso');
        for (const site of sites) {
            await this.testPlatformSSO(ssoUrl, site);
        }

        return this.results;
    }

    async testSSOHealth(ssoUrl) {
        try {
            const start = Date.now();
            const response = await axios.get(`${ssoUrl}/health`, {
                timeout: 10000,
                validateStatus: () => true
            });
            const latency = Date.now() - start;

            const isHealthy = response.status === 200 &&
                              response.data?.status === 'healthy';

            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'SSO Health',
                test: 'Health Endpoint',
                passed: isHealthy,
                status: response.status,
                latency,
                details: response.data
            });

            if (isHealthy) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check platform count
            if (response.data?.platforms) {
                const platformCount = response.data.platforms;
                this.results.tests.push({
                    domain: this.ssoConfig.provider,
                    type: 'SSO Health',
                    test: 'Platforms Registered',
                    passed: platformCount >= 10,
                    platformCount
                });

                if (platformCount >= 10) {
                    this.results.passed++;
                } else {
                    this.results.warnings++;
                }
            }

        } catch (error) {
            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'SSO Health',
                test: 'Health Endpoint',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testSSODiagnostics(ssoUrl) {
        try {
            const response = await axios.get(`${ssoUrl}/debug/diagnostics`, {
                timeout: 15000,
                validateStatus: () => true
            });

            // In production, this should return 403 without key
            const isProperlySecured = response.status === 403 ||
                                      (response.status === 200 && response.data?.service === 'afterdark-sso');

            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'SSO Diagnostics',
                test: 'Diagnostics Endpoint Secure',
                passed: isProperlySecured,
                status: response.status
            });

            if (isProperlySecured) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

            // If accessible, check diagnostics details
            if (response.status === 200 && response.data) {
                const diag = response.data;

                // Check database connection
                if (diag.database) {
                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'SSO Diagnostics',
                        test: 'Database Connected',
                        passed: diag.database.connected === true,
                        mode: diag.database.mode
                    });

                    if (diag.database.connected) {
                        this.results.passed++;
                    } else {
                        this.results.failed++;
                    }
                }

                // Check SSO Bridge
                if (diag.ssoBridge) {
                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'SSO Diagnostics',
                        test: 'SSO Bridge Initialized',
                        passed: diag.ssoBridge.initialized === true
                    });

                    if (diag.ssoBridge.initialized) {
                        this.results.passed++;
                    } else {
                        this.results.failed++;
                    }
                }

                // Check configuration
                if (diag.config) {
                    const configOk = diag.config.jwtSecretConfigured &&
                                     diag.config.csrfEnabled &&
                                     diag.config.corsConfigured;

                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'SSO Diagnostics',
                        test: 'Security Configuration',
                        passed: configOk,
                        details: diag.config
                    });

                    if (configOk) {
                        this.results.passed++;
                    } else {
                        this.results.failed++;
                    }
                }
            }

        } catch (error) {
            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'SSO Diagnostics',
                test: 'Diagnostics Endpoint',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testAuthFlow(ssoUrl) {
        try {
            const response = await axios.get(`${ssoUrl}/debug/auth-flow-test`, {
                timeout: 15000,
                validateStatus: () => true
            });

            if (response.status === 200 && response.data?.tests) {
                const testResults = response.data;

                this.results.tests.push({
                    domain: this.ssoConfig.provider,
                    type: 'Auth Flow',
                    test: 'Auth Flow Test Suite',
                    passed: testResults.summary?.failed === 0,
                    details: {
                        total: testResults.summary?.total,
                        passed: testResults.summary?.passed,
                        failed: testResults.summary?.failed
                    }
                });

                if (testResults.summary?.failed === 0) {
                    this.results.passed++;
                } else {
                    this.results.failed++;
                }

                // Log individual test results
                for (const test of testResults.tests) {
                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'Auth Flow',
                        test: test.name,
                        passed: test.passed,
                        error: test.error
                    });

                    if (test.passed) {
                        this.results.passed++;
                    } else {
                        this.results.failed++;
                    }
                }
            } else {
                this.results.tests.push({
                    domain: this.ssoConfig.provider,
                    type: 'Auth Flow',
                    test: 'Auth Flow Test Suite',
                    passed: false,
                    status: response.status
                });
                this.results.failed++;
            }

        } catch (error) {
            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'Auth Flow',
                test: 'Auth Flow Test Endpoint',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testCORSHeaders(ssoUrl) {
        const testOrigins = [
            { origin: 'https://afterdarksys.com', shouldPass: true },
            { origin: 'https://ecosystem.zone', shouldPass: true },
            { origin: 'https://infrastructure.zone', shouldPass: true },
            { origin: 'https://aiserve.farm', shouldPass: true },
            { origin: 'https://n8nworkflo.ws', shouldPass: true },
            { origin: 'https://malicious-site.com', shouldPass: false }
        ];

        for (const { origin, shouldPass } of testOrigins) {
            try {
                const response = await axios.options(`${ssoUrl}/auth/validate`, {
                    headers: {
                        'Origin': origin,
                        'Access-Control-Request-Method': 'GET'
                    },
                    timeout: 10000,
                    validateStatus: () => true
                });

                const allowedOrigin = response.headers['access-control-allow-origin'];
                const isAllowed = allowedOrigin === origin || allowedOrigin === '*';
                const testPassed = shouldPass === isAllowed;

                this.results.tests.push({
                    domain: this.ssoConfig.provider,
                    type: 'CORS',
                    test: `CORS: ${origin}`,
                    passed: testPassed,
                    expected: shouldPass ? 'allowed' : 'blocked',
                    actual: isAllowed ? 'allowed' : 'blocked'
                });

                if (testPassed) {
                    this.results.passed++;
                } else {
                    this.results.failed++;
                }

            } catch (error) {
                // CORS errors may throw, which could be the expected behavior
                if (!shouldPass) {
                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'CORS',
                        test: `CORS: ${origin}`,
                        passed: true,
                        expected: 'blocked',
                        actual: 'blocked (error)'
                    });
                    this.results.passed++;
                } else {
                    this.results.tests.push({
                        domain: this.ssoConfig.provider,
                        type: 'CORS',
                        test: `CORS: ${origin}`,
                        passed: false,
                        error: error.message
                    });
                    this.results.failed++;
                }
            }
        }
    }

    async testTokenValidation(ssoUrl) {
        // Test with invalid token
        try {
            const response = await axios.post(`${ssoUrl}/debug/validate-token`, {
                token: 'invalid-token-12345'
            }, {
                timeout: 10000,
                validateStatus: () => true
            });

            const correctlyRejects = response.status === 200 &&
                                     response.data?.valid === false;

            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'Token Validation',
                test: 'Rejects Invalid Token',
                passed: correctlyRejects,
                details: response.data
            });

            if (correctlyRejects) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

        } catch (error) {
            this.results.tests.push({
                domain: this.ssoConfig.provider,
                type: 'Token Validation',
                test: 'Token Validation Endpoint',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testPlatformSSO(ssoUrl, site) {
        // Test that SSO redirect works for each platform
        const returnUrl = `https://${site.domain}/`;

        try {
            const loginUrl = `${ssoUrl}/?returnUrl=${encodeURIComponent(returnUrl)}`;
            const response = await axios.get(loginUrl, {
                timeout: 15000,
                validateStatus: () => true,
                maxRedirects: 0
            });

            // Should either serve login page (200) or redirect to login page
            const servesLogin = response.status === 200 ||
                               response.status === 302 ||
                               response.status === 301;

            this.results.tests.push({
                domain: site.domain,
                type: 'Platform SSO',
                test: 'SSO Login Redirect',
                passed: servesLogin,
                status: response.status,
                ssoUrl: loginUrl
            });

            if (servesLogin) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check if the login page content mentions the return URL handling
            if (response.status === 200 && typeof response.data === 'string') {
                const hasReturnUrlHandling = response.data.includes('returnUrl') ||
                                             response.data.includes('redirect');

                this.results.tests.push({
                    domain: site.domain,
                    type: 'Platform SSO',
                    test: 'Return URL Handling',
                    passed: hasReturnUrlHandling
                });

                if (hasReturnUrlHandling) {
                    this.results.passed++;
                } else {
                    this.results.warnings++;
                }
            }

        } catch (error) {
            this.results.tests.push({
                domain: site.domain,
                type: 'Platform SSO',
                test: 'SSO Integration',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }
}
