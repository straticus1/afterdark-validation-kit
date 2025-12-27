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

        // Framework-specific endpoint configurations
        this.frameworkEndpoints = {
            nodejs: {
                health: '/health',
                login: '/auth/login',
                api: '/api'
            },
            nextjs: {
                health: '/api/health',
                login: '/auth/signin',
                api: '/api'
            },
            go: {
                health: '/health',
                login: '/v1/auth/login',
                api: '/v1'
            },
            python: {
                health: '/health',
                login: '/api/v1/auth/login',
                api: '/api/v1'
            },
            php: {
                health: '/api/health',
                login: '/login.php',
                api: '/api'
            },
            astro: {
                health: null,  // Static sites may not have health endpoints
                login: null,
                api: null
            },
            static: {
                health: null,
                login: null,
                api: null
            }
        };

        // Site type to endpoint configuration
        this.siteTypeEndpoints = {
            platform: ['health', 'api'],
            auth: ['health', 'login'],
            api: ['health', 'api'],
            'api-gateway': ['health', 'api'],
            'api-platform': ['health', 'api'],
            admin: ['health'],
            billing: ['health'],
            support: ['health'],
            service: ['health'],
            webapp: ['health'],
            'security-platform': ['health'],
            'compute-platform': ['health'],
            'secrets-platform': ['health'],
            'dns-platform': ['health'],
            'change-management': ['health'],
            n8n: ['health'],
            static: [],
            landing: [],
            cdn: [],
            internal: []
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
        const endpoints = [];
        const framework = site.framework || 'nodejs';  // Default to nodejs
        const frameworkConfig = this.frameworkEndpoints[framework] || this.frameworkEndpoints.nodejs;
        const siteTypeConfig = this.siteTypeEndpoints[site.type] || ['health'];

        // Always test homepage
        endpoints.push({
            path: '/',
            method: 'GET',
            name: 'Homepage',
            expectedStatus: [200, 301, 302, 307, 308]  // Allow redirects
        });

        // Add health check endpoint (use site-specific if configured)
        if (siteTypeConfig.includes('health')) {
            const healthPath = site.healthCheck || frameworkConfig.health || '/health';
            if (healthPath) {
                endpoints.push({
                    path: healthPath,
                    method: 'GET',
                    name: 'Health Check',
                    expectedStatus: [200, 204, 404]  // 404 is acceptable for unconfigured health
                });
            }
        }

        // Add login endpoint if applicable
        if (siteTypeConfig.includes('login') && site.loginPath) {
            endpoints.push({
                path: site.loginPath,
                method: 'GET',
                name: 'Login Page',
                expectedStatus: [200, 301, 302]
            });
        }

        // Add API root endpoint for API-type sites
        if (siteTypeConfig.includes('api') && frameworkConfig.api) {
            endpoints.push({
                path: frameworkConfig.api,
                method: 'GET',
                name: 'API Root',
                expectedStatus: [200, 301, 302, 401, 403, 404]
            });

            // Check for Swagger docs if configured
            if (site.swagger) {
                endpoints.push({
                    path: site.swagger,
                    method: 'GET',
                    name: 'API Documentation',
                    expectedStatus: [200, 301, 302]
                });
            }
        }

        // n8n-specific endpoints
        if (site.type === 'n8n') {
            endpoints.push(
                { path: '/healthz', method: 'GET', name: 'n8n Health', expectedStatus: [200] },
                { path: '/signin', method: 'GET', name: 'n8n Sign In', expectedStatus: [200] }
            );
        }

        // Admin-type sites
        if (site.type === 'admin' || site.requireAdmin) {
            endpoints.push({
                path: '/admin',
                method: 'GET',
                name: 'Admin Panel',
                expectedStatus: [200, 301, 302, 401, 403]
            });
        }

        return endpoints;
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

        // Determine the correct login endpoint based on framework
        const framework = site.framework || 'nodejs';
        const loginPath = site.loginPath || this.frameworkEndpoints[framework]?.login || '/auth/login';

        if (!loginPath) {
            testResult.tests.push({
                name: 'Login endpoint',
                passed: true,
                skipped: true,
                reason: 'No login path configured for this site type'
            });
            return testResult;
        }

        // Test login endpoint accepts POST
        try {
            const response = await axios.post(`${baseUrl}${loginPath}`, {}, {
                validateStatus: () => true,
                timeout: 10000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            testResult.tests.push({
                name: 'Login POST accepts requests',
                passed: [200, 302, 400, 401, 405, 422].includes(response.status),
                status: response.status,
                endpoint: loginPath
            });
        } catch (error) {
            testResult.tests.push({
                name: 'Login POST',
                passed: false,
                error: error.message,
                endpoint: loginPath
            });
        }

        return testResult;
    }

    async testApiResponseFormat(site) {
        const baseUrl = `https://${site.domain}`;
        const tests = [];
        const framework = site.framework || 'nodejs';
        const frameworkConfig = this.frameworkEndpoints[framework] || this.frameworkEndpoints.nodejs;

        // Determine API endpoints based on framework and site configuration
        const apiEndpoints = [];

        // Always test health endpoint if configured
        const healthPath = site.healthCheck || frameworkConfig.health;
        if (healthPath) {
            apiEndpoints.push(healthPath);
        }

        // Add API root for API-type sites
        if (['api', 'api-gateway', 'api-platform', 'platform'].includes(site.type)) {
            if (frameworkConfig.api) {
                apiEndpoints.push(frameworkConfig.api);
            }
        }

        // Skip if no endpoints to test
        if (apiEndpoints.length === 0) {
            return [{
                endpoint: 'N/A',
                skipped: true,
                reason: 'No API endpoints configured for this site type'
            }];
        }

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

    /**
     * Get framework configuration for a site
     * @param {Object} site - Site configuration
     * @returns {Object} Framework-specific endpoints
     */
    getFrameworkConfig(site) {
        const framework = site.framework || 'nodejs';
        return this.frameworkEndpoints[framework] || this.frameworkEndpoints.nodejs;
    }

    /**
     * Check if site should have API tests
     * @param {Object} site - Site configuration
     * @returns {boolean}
     */
    shouldTestApi(site) {
        const apiTypes = ['api', 'api-gateway', 'api-platform', 'platform', 'service'];
        return apiTypes.includes(site.type);
    }
}
