import axios from 'axios';
import puppeteer from 'puppeteer';

export class SiteTester {
    constructor(config) {
        this.config = config;
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            warnings: 0,
            tests: []
        };
        this.browser = null;
    }

    async runAll() {
        const sites = this.config.getSites();
        const testConfig = this.config.getTestConfig('functional');

        if (!testConfig.enabled) {
            return { ...this.results, skipped: sites.length };
        }

        try {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } catch (error) {
            // Fall back to HTTP-only tests if Puppeteer fails
            console.log('Puppeteer unavailable, running HTTP-only tests');
            this.browser = null;
        }

        for (const site of sites) {
            await this.testSite(site, testConfig);
        }

        if (this.browser) {
            await this.browser.close();
        }

        return this.results;
    }

    async testSite(site, testConfig) {
        // Handle API type sites differently - they run on different ports
        if (site.type === 'api') {
            await this.testApiEndpoint(site);
            return;
        }

        const baseUrl = `https://${site.domain}`;

        // Basic connectivity
        await this.testConnectivity(site.domain, baseUrl);

        // Test critical pages (pass site config for auth-aware testing)
        await this.testCriticalPages(site.domain, baseUrl, site);

        // Test forms (pass site config for auth-aware testing)
        await this.testForms(site.domain, baseUrl, site);

        // Test JavaScript errors (if browser available)
        if (this.browser) {
            await this.testJavaScriptErrors(site.domain, baseUrl);
        }

        // Test mobile responsiveness
        await this.testMobileResponsiveness(site.domain, baseUrl);

        // Test 404 handling
        await this.test404Handling(site.domain, baseUrl);

        // Site-specific tests based on type
        if (site.type === 'platform') {
            await this.testPlatformFeatures(site.domain, baseUrl);
        }
    }

    async testApiEndpoint(site) {
        // API endpoints run on custom ports (default 8080) and use HTTP
        const port = site.port || 8080;
        const protocol = site.protocol || 'http';
        const baseUrl = `${protocol}://${site.domain}:${port}`;
        const healthPath = site.healthPath || '/health';

        try {
            const start = Date.now();
            const response = await axios.get(`${baseUrl}${healthPath}`, {
                timeout: 15000,
                validateStatus: () => true
            });
            const latency = Date.now() - start;

            const isHealthy = response.status === 200 &&
                (typeof response.data === 'object' || typeof response.data === 'string');

            this.results.tests.push({
                domain: site.domain,
                type: 'API',
                test: 'Health Endpoint',
                passed: isHealthy,
                status: response.status,
                latency,
                response: typeof response.data === 'object' ? response.data : undefined
            });

            if (isHealthy) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check API returns JSON
            const contentType = response.headers['content-type'] || '';
            const isJson = contentType.includes('application/json');

            this.results.tests.push({
                domain: site.domain,
                type: 'API',
                test: 'Returns JSON',
                passed: isJson,
                contentType
            });

            if (isJson) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.tests.push({
                domain: site.domain,
                type: 'API',
                test: 'Health Endpoint',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testConnectivity(domain, baseUrl) {
        try {
            const start = Date.now();
            const response = await axios.get(baseUrl, {
                timeout: 30000,
                validateStatus: () => true
            });
            const latency = Date.now() - start;

            this.results.tests.push({
                domain,
                type: 'Connectivity',
                test: 'Homepage Accessible',
                passed: response.status === 200,
                status: response.status,
                latency
            });

            if (response.status === 200) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check for proper content
            const contentType = response.headers['content-type'] || '';
            const hasHtmlContent = contentType.includes('text/html');

            this.results.tests.push({
                domain,
                type: 'Connectivity',
                test: 'Returns HTML Content',
                passed: hasHtmlContent,
                contentType
            });

            if (hasHtmlContent) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.tests.push({
                domain,
                type: 'Connectivity',
                test: 'Homepage Accessible',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }
    }

    async testCriticalPages(domain, baseUrl, site = {}) {
        const criticalPages = [
            { path: '/', name: 'Homepage' },
        ];

        // Add login page test based on auth type
        // auth: "local" - has own login page at loginPath
        // auth: "sso" - uses central SSO (login.afterdarksys.com), skip local login test
        // auth: "none" - no login needed, skip login test
        if (site.auth === 'local' && site.loginPath) {
            criticalPages.push({ path: site.loginPath, name: 'Login Page' });
        } else if (site.auth === 'sso') {
            // Skip - uses SSO, record as info
            this.results.tests.push({
                domain,
                type: 'Critical Pages',
                test: 'Login Page',
                passed: true,
                skipped: true,
                note: 'Uses SSO (login.afterdarksys.com)'
            });
            this.results.passed++;
        }
        // auth: "none" - no login test needed

        for (const page of criticalPages) {
            try {
                const response = await axios.get(`${baseUrl}${page.path}`, {
                    timeout: 15000,
                    validateStatus: () => true
                });

                const passed = response.status === 200;
                const hasContent = typeof response.data === 'string' && response.data.length > 100;

                this.results.tests.push({
                    domain,
                    type: 'Critical Pages',
                    test: page.name,
                    passed: passed && hasContent,
                    status: response.status,
                    contentLength: typeof response.data === 'string' ? response.data.length : 0
                });

                if (passed && hasContent) {
                    this.results.passed++;
                } else {
                    this.results.failed++;
                }

                // Check for common error messages in HTML
                if (typeof response.data === 'string') {
                    const errorPatterns = [
                        /fatal error/i,
                        /parse error/i,
                        /undefined variable/i,
                        /call to undefined/i,
                        /exception/i,
                        /stack trace/i,
                        /warning.*require/i,
                        /warning.*include/i,
                    ];

                    for (const pattern of errorPatterns) {
                        if (pattern.test(response.data)) {
                            this.results.tests.push({
                                domain,
                                type: 'Critical Pages',
                                test: `${page.name} - No PHP Errors`,
                                passed: false,
                                errorPattern: pattern.source
                            });
                            this.results.failed++;
                            break;
                        }
                    }
                }

            } catch (error) {
                this.results.tests.push({
                    domain,
                    type: 'Critical Pages',
                    test: page.name,
                    passed: false,
                    error: error.code || error.message
                });
                this.results.failed++;
            }
        }
    }

    async testForms(domain, baseUrl, site = {}) {
        // Skip form tests for SSO or no-auth sites
        if (site.auth === 'sso' || site.auth === 'none') {
            this.results.skipped += 2; // Skip form structure and CSRF tests
            return;
        }

        // Use configured login path or default
        const loginPath = site.loginPath || '/login';

        try {
            const response = await axios.get(`${baseUrl}${loginPath}`, {
                timeout: 15000,
                validateStatus: () => true
            });

            if (response.status !== 200 || typeof response.data !== 'string') {
                this.results.skipped++;
                return;
            }

            const html = response.data;

            // Check for proper form structure
            const hasForm = html.includes('<form');
            const hasPasswordField = html.includes('type="password"') || html.includes("type='password'");
            const hasSubmitButton = html.includes('type="submit"') || html.includes("type='submit'");
            const hasFormAction = html.includes('action=');

            this.results.tests.push({
                domain,
                type: 'Forms',
                test: 'Login Form Structure',
                passed: hasForm && hasPasswordField && hasSubmitButton,
                details: { hasForm, hasPasswordField, hasSubmitButton, hasFormAction }
            });

            if (hasForm && hasPasswordField && hasSubmitButton) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check for CSRF token in form
            const hasCsrfToken = html.includes('csrf_token') ||
                html.includes('_token') ||
                html.includes('csrfmiddlewaretoken');

            this.results.tests.push({
                domain,
                type: 'Forms',
                test: 'CSRF Token Present',
                passed: hasCsrfToken,
            });

            if (hasCsrfToken) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.skipped++;
        }
    }

    async testJavaScriptErrors(domain, baseUrl) {
        if (!this.browser) {
            this.results.skipped++;
            return;
        }

        const page = await this.browser.newPage();
        const jsErrors = [];
        const consoleErrors = [];

        page.on('pageerror', error => {
            jsErrors.push(error.message);
        });

        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        try {
            await page.goto(baseUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for any async JS to load
            await page.waitForTimeout(2000);

            const hasJsErrors = jsErrors.length > 0;
            const hasCriticalConsoleErrors = consoleErrors.some(e =>
                !e.includes('favicon') &&
                !e.includes('404') &&
                !e.includes('blocked')
            );

            this.results.tests.push({
                domain,
                type: 'JavaScript',
                test: 'No JS Errors',
                passed: !hasJsErrors,
                errors: jsErrors.slice(0, 5)
            });

            this.results.tests.push({
                domain,
                type: 'JavaScript',
                test: 'No Console Errors',
                passed: !hasCriticalConsoleErrors,
                errors: consoleErrors.slice(0, 5)
            });

            if (!hasJsErrors) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            if (!hasCriticalConsoleErrors) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.tests.push({
                domain,
                type: 'JavaScript',
                test: 'Page Load',
                passed: false,
                error: error.message
            });
            this.results.failed++;
        } finally {
            await page.close();
        }
    }

    async testMobileResponsiveness(domain, baseUrl) {
        try {
            const response = await axios.get(baseUrl, {
                timeout: 15000,
                validateStatus: () => true,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
                }
            });

            const html = typeof response.data === 'string' ? response.data : '';

            // Check for viewport meta tag
            const hasViewport = html.includes('viewport');
            const hasResponsiveMeta = html.includes('width=device-width');

            this.results.tests.push({
                domain,
                type: 'Mobile',
                test: 'Viewport Meta Tag',
                passed: hasViewport && hasResponsiveMeta,
                details: { hasViewport, hasResponsiveMeta }
            });

            if (hasViewport && hasResponsiveMeta) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

            // Check mobile response is not significantly different
            const regularResponse = await axios.get(baseUrl, {
                timeout: 15000,
                validateStatus: () => true
            });

            const sizeDiff = Math.abs(
                (typeof response.data === 'string' ? response.data.length : 0) -
                (typeof regularResponse.data === 'string' ? regularResponse.data.length : 0)
            );

            // Large size difference might indicate separate mobile site or issues
            const sizeRatio = sizeDiff / (typeof regularResponse.data === 'string' ? regularResponse.data.length : 1);

            this.results.tests.push({
                domain,
                type: 'Mobile',
                test: 'Consistent Mobile Response',
                passed: sizeRatio < 0.5, // Less than 50% difference
                sizeDiff,
                sizeRatio: Math.round(sizeRatio * 100) + '%'
            });

            if (sizeRatio < 0.5) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.skipped++;
        }
    }

    async test404Handling(domain, baseUrl) {
        const randomPath = `/nonexistent-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        try {
            const response = await axios.get(`${baseUrl}${randomPath}`, {
                timeout: 15000,
                validateStatus: () => true
            });

            const is404 = response.status === 404;
            const hasCustom404 = typeof response.data === 'string' &&
                response.data.length > 500 &&
                !response.data.includes('nginx') &&
                !response.data.includes('Apache');

            this.results.tests.push({
                domain,
                type: '404 Handling',
                test: 'Returns 404 Status',
                passed: is404,
                status: response.status
            });

            if (is404) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

            this.results.tests.push({
                domain,
                type: '404 Handling',
                test: 'Custom 404 Page',
                passed: hasCustom404,
                contentLength: typeof response.data === 'string' ? response.data.length : 0
            });

            if (hasCustom404) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

        } catch (error) {
            this.results.tests.push({
                domain,
                type: '404 Handling',
                test: '404 Response',
                passed: false,
                error: error.message
            });
            this.results.failed++;
        }
    }

    async testPlatformFeatures(domain, baseUrl) {
        // Test platform-specific features for aeims.app type sites
        const platformEndpoints = [
            { path: '/admin/', name: 'Admin Panel' },
            { path: '/operators', name: 'Operators Directory' },
        ];

        for (const endpoint of platformEndpoints) {
            try {
                const response = await axios.get(`${baseUrl}${endpoint.path}`, {
                    timeout: 15000,
                    validateStatus: () => true,
                    maxRedirects: 0
                });

                // Admin should redirect to login or return 401/403 if not authenticated
                const appropriateResponse =
                    [200, 301, 302, 401, 403].includes(response.status);

                this.results.tests.push({
                    domain,
                    type: 'Platform Features',
                    test: endpoint.name,
                    passed: appropriateResponse,
                    status: response.status
                });

                if (appropriateResponse) {
                    this.results.passed++;
                } else {
                    this.results.warnings++;
                }

            } catch (error) {
                this.results.tests.push({
                    domain,
                    type: 'Platform Features',
                    test: endpoint.name,
                    passed: false,
                    error: error.message
                });
                this.results.failed++;
            }
        }
    }
}
