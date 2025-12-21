import axios from 'axios';
import chalk from 'chalk';

export class ApiTester {
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
        const testConfig = this.config.getTestConfig('api');

        if (!testConfig.enabled) {
            console.log(chalk.yellow('API tests disabled'));
            return { ...this.results, skipped: sites.length };
        }

        // Test each site's core endpoints
        for (const site of sites) {
            await this.testSite(site, testConfig);
        }

        return this.results;
    }

    async testSite(site, testConfig) {
        const baseUrl = `https://${site.domain}`;
        const endpoints = this.getEndpointsForSite(site);

        for (const endpoint of endpoints) {
            await this.testEndpoint(site.domain, baseUrl, endpoint, testConfig);
        }
    }

    getEndpointsForSite(site) {
        // Common endpoints for all AEIMS sites
        const commonEndpoints = [
            { path: '/', method: 'GET', name: 'Homepage', expectedStatus: [200] },
            { path: '/login.php', method: 'GET', name: 'Login Page', expectedStatus: [200] },
            { path: '/api/health', method: 'GET', name: 'Health Check', expectedStatus: [200, 404] },
        ];

        // Platform-specific endpoints
        if (site.type === 'platform') {
            return [
                ...commonEndpoints,
                { path: '/api/operators.php', method: 'GET', name: 'Operators API', expectedStatus: [200, 401, 403] },
                { path: '/api/calls.php', method: 'GET', name: 'Calls API', expectedStatus: [200, 401, 403, 405] },
                { path: '/api/dashboard.php', method: 'GET', name: 'Dashboard API', expectedStatus: [200, 401, 403] },
                { path: '/admin/', method: 'GET', name: 'Admin Panel', expectedStatus: [200, 302, 401, 403] },
            ];
        }

        return commonEndpoints;
    }

    async testEndpoint(domain, baseUrl, endpoint, testConfig) {
        const url = `${baseUrl}${endpoint.path}`;
        const startTime = Date.now();

        try {
            const response = await axios({
                method: endpoint.method,
                url,
                timeout: testConfig.timeout || 30000,
                validateStatus: () => true, // Don't throw on any status
                headers: {
                    'User-Agent': 'AfterDark-Validation-Kit/1.0',
                    'Accept': 'text/html,application/json',
                }
            });

            const latency = Date.now() - startTime;
            const passed = endpoint.expectedStatus.includes(response.status);

            const testResult = {
                domain,
                endpoint: endpoint.path,
                name: endpoint.name,
                method: endpoint.method,
                status: response.status,
                expectedStatus: endpoint.expectedStatus,
                passed,
                latency,
                headers: this.extractSecurityHeaders(response.headers),
            };

            this.results.tests.push(testResult);

            if (passed) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check for slow responses
            if (latency > 5000) {
                this.results.warnings++;
                testResult.warning = 'Slow response time';
            }

        } catch (error) {
            const testResult = {
                domain,
                endpoint: endpoint.path,
                name: endpoint.name,
                method: endpoint.method,
                passed: false,
                error: error.code || error.message,
                latency: Date.now() - startTime,
            };

            this.results.tests.push(testResult);
            this.results.failed++;
        }
    }

    extractSecurityHeaders(headers) {
        const securityHeaders = [
            'strict-transport-security',
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection',
            'content-security-policy',
            'referrer-policy',
            'permissions-policy',
        ];

        const found = {};
        for (const header of securityHeaders) {
            if (headers[header]) {
                found[header] = headers[header];
            }
        }
        return found;
    }

    async testAuthentication(site) {
        const baseUrl = `https://${site.domain}`;
        const testResult = {
            domain: site.domain,
            name: 'Authentication Flow',
            tests: []
        };

        // Test login endpoint accepts POST
        try {
            const response = await axios.post(`${baseUrl}/login.php`, {}, {
                validateStatus: () => true,
                timeout: 10000
            });

            testResult.tests.push({
                name: 'Login POST accepts requests',
                passed: [200, 302, 400, 401, 422].includes(response.status),
                status: response.status
            });
        } catch (error) {
            testResult.tests.push({
                name: 'Login POST',
                passed: false,
                error: error.message
            });
        }

        return testResult;
    }

    async testApiResponseFormat(site) {
        const baseUrl = `https://${site.domain}`;
        const tests = [];

        // Test that API endpoints return proper JSON
        const apiEndpoints = ['/api/operators.php', '/api/health'];

        for (const endpoint of apiEndpoints) {
            try {
                const response = await axios.get(`${baseUrl}${endpoint}`, {
                    validateStatus: () => true,
                    timeout: 10000,
                    headers: { 'Accept': 'application/json' }
                });

                const contentType = response.headers['content-type'] || '';
                const isJson = contentType.includes('application/json');

                let validJson = false;
                if (isJson) {
                    try {
                        JSON.parse(JSON.stringify(response.data));
                        validJson = true;
                    } catch {
                        validJson = false;
                    }
                }

                tests.push({
                    endpoint,
                    contentType,
                    isJson,
                    validJson,
                    status: response.status
                });
            } catch (error) {
                tests.push({
                    endpoint,
                    error: error.message
                });
            }
        }

        return tests;
    }
}
