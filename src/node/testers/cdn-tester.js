import axios from 'axios';
import https from 'https';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);
const dnsResolve4 = promisify(dns.resolve4);
const dnsResolveCname = promisify(dns.resolveCname);

export class CdnTester {
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
        const cdnConfig = this.config.getApiConfig('cloudflare');

        for (const site of sites) {
            await this.testDns(site.domain);
            await this.testSsl(site.domain);
            await this.testCdnHeaders(site.domain);
            await this.testCaching(site.domain);
            await this.testPerformance(site.domain);
        }

        // Test Cloudflare API if configured
        if (cdnConfig.api_token || cdnConfig.token) {
            await this.testCloudflareApi(cdnConfig);
        }

        return this.results;
    }

    async testDns(domain) {
        try {
            // Test A records
            const aRecords = await dnsResolve4(domain);

            this.results.tests.push({
                domain,
                type: 'DNS',
                test: 'A Record Resolution',
                passed: aRecords.length > 0,
                records: aRecords
            });

            if (aRecords.length > 0) {
                this.results.passed++;
            } else {
                this.results.failed++;
            }

            // Check for Cloudflare IPs
            const cloudflareRanges = [
                '103.21.244.', '103.22.200.', '103.31.4.', '104.16.', '104.17.',
                '104.18.', '104.19.', '104.20.', '104.21.', '104.22.', '104.23.',
                '104.24.', '104.25.', '104.26.', '104.27.', '108.162.', '131.0.72.',
                '141.101.64.', '162.158.', '172.64.', '172.65.', '172.66.', '172.67.',
                '173.245.48.', '188.114.96.', '188.114.97.', '188.114.98.', '188.114.99.',
                '190.93.240.', '197.234.240.', '198.41.128.'
            ];

            const isCloudflare = aRecords.some(ip =>
                cloudflareRanges.some(range => ip.startsWith(range))
            );

            this.results.tests.push({
                domain,
                type: 'DNS',
                test: 'Cloudflare Protected',
                passed: isCloudflare,
                ips: aRecords
            });

            if (isCloudflare) {
                this.results.passed++;
            } else {
                this.results.warnings++; // Not behind Cloudflare is a warning
            }

        } catch (error) {
            this.results.tests.push({
                domain,
                type: 'DNS',
                test: 'A Record Resolution',
                passed: false,
                error: error.code || error.message
            });
            this.results.failed++;
        }

        // Test CNAME records
        try {
            const cnameRecords = await dnsResolveCname(domain);
            this.results.tests.push({
                domain,
                type: 'DNS',
                test: 'CNAME Records',
                passed: true,
                records: cnameRecords
            });
        } catch (error) {
            // CNAME not existing is not an error
        }
    }

    async testSsl(domain) {
        const url = `https://${domain}`;

        try {
            const response = await axios.get(url, {
                timeout: 15000,
                validateStatus: () => true,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: true
                })
            });

            this.results.tests.push({
                domain,
                type: 'SSL',
                test: 'Valid SSL Certificate',
                passed: true,
                status: response.status
            });
            this.results.passed++;

        } catch (error) {
            if (error.code === 'CERT_HAS_EXPIRED') {
                this.results.tests.push({
                    domain,
                    type: 'SSL',
                    test: 'Valid SSL Certificate',
                    passed: false,
                    error: 'Certificate expired'
                });
                this.results.failed++;
            } else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
                this.results.tests.push({
                    domain,
                    type: 'SSL',
                    test: 'Valid SSL Certificate',
                    passed: false,
                    error: 'Invalid certificate chain'
                });
                this.results.failed++;
            } else if (error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
                this.results.tests.push({
                    domain,
                    type: 'SSL',
                    test: 'Valid SSL Certificate',
                    passed: false,
                    error: 'Certificate domain mismatch'
                });
                this.results.failed++;
            } else {
                this.results.tests.push({
                    domain,
                    type: 'SSL',
                    test: 'Valid SSL Certificate',
                    passed: false,
                    error: error.code || error.message
                });
                this.results.failed++;
            }
        }

        // Test HTTPS redirect
        try {
            const httpResponse = await axios.get(`http://${domain}`, {
                timeout: 10000,
                maxRedirects: 0,
                validateStatus: () => true
            });

            const redirectsToHttps =
                httpResponse.status === 301 ||
                httpResponse.status === 302 ||
                httpResponse.status === 308;

            const redirectLocation = httpResponse.headers.location || '';
            const redirectsCorrectly = redirectLocation.startsWith('https://');

            this.results.tests.push({
                domain,
                type: 'SSL',
                test: 'HTTP to HTTPS Redirect',
                passed: redirectsToHttps && redirectsCorrectly,
                status: httpResponse.status,
                location: redirectLocation
            });

            if (redirectsToHttps && redirectsCorrectly) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }
        } catch (error) {
            // HTTP might not be available
            this.results.skipped++;
        }
    }

    async testCdnHeaders(domain) {
        try {
            const response = await axios.get(`https://${domain}`, {
                timeout: 10000,
                validateStatus: () => true
            });

            const headers = response.headers;

            // Cloudflare specific headers
            const cloudflareHeaders = {
                'cf-ray': headers['cf-ray'],
                'cf-cache-status': headers['cf-cache-status'],
                'cf-request-id': headers['cf-request-id'],
                'server': headers['server'],
            };

            const isCloudflare =
                headers['cf-ray'] ||
                (headers['server'] && headers['server'].toLowerCase().includes('cloudflare'));

            this.results.tests.push({
                domain,
                type: 'CDN',
                test: 'Cloudflare Headers',
                passed: isCloudflare,
                headers: cloudflareHeaders
            });

            if (isCloudflare) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }

            // Test cache status
            const cacheStatus = headers['cf-cache-status'] || headers['x-cache-status'];
            if (cacheStatus) {
                const isOptimalCache = ['HIT', 'STALE', 'REVALIDATED'].includes(cacheStatus.toUpperCase());

                this.results.tests.push({
                    domain,
                    type: 'CDN',
                    test: 'Cache Status',
                    passed: true,
                    status: cacheStatus,
                    optimal: isOptimalCache
                });
                this.results.passed++;
            }

        } catch (error) {
            this.results.tests.push({
                domain,
                type: 'CDN',
                test: 'CDN Headers',
                passed: false,
                error: error.message
            });
            this.results.failed++;
        }
    }

    async testCaching(domain) {
        try {
            // Test static asset caching
            const staticPaths = [
                '/assets/css/style.css',
                '/assets/js/app.js',
                '/favicon.ico',
            ];

            for (const path of staticPaths) {
                try {
                    const response = await axios.get(`https://${domain}${path}`, {
                        timeout: 10000,
                        validateStatus: () => true
                    });

                    if (response.status === 200) {
                        const cacheControl = response.headers['cache-control'];
                        const hasGoodCaching = cacheControl &&
                            (cacheControl.includes('max-age') || cacheControl.includes('public'));

                        this.results.tests.push({
                            domain,
                            type: 'Caching',
                            test: `Static Asset: ${path}`,
                            passed: hasGoodCaching,
                            cacheControl
                        });

                        if (hasGoodCaching) {
                            this.results.passed++;
                        } else {
                            this.results.warnings++;
                        }
                    }
                } catch {
                    // Asset doesn't exist, skip
                }
            }
        } catch (error) {
            this.results.skipped++;
        }
    }

    async testPerformance(domain) {
        const url = `https://${domain}`;
        const times = [];

        // Run 3 requests to measure average response time
        for (let i = 0; i < 3; i++) {
            try {
                const start = Date.now();
                await axios.get(url, {
                    timeout: 30000,
                    validateStatus: () => true
                });
                times.push(Date.now() - start);
            } catch (error) {
                times.push(-1);
            }
        }

        const validTimes = times.filter(t => t > 0);
        if (validTimes.length > 0) {
            const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
            const minTime = Math.min(...validTimes);
            const maxTime = Math.max(...validTimes);

            const isGoodPerformance = avgTime < 2000; // Under 2 seconds

            this.results.tests.push({
                domain,
                type: 'Performance',
                test: 'Response Time',
                passed: isGoodPerformance,
                avgMs: Math.round(avgTime),
                minMs: minTime,
                maxMs: maxTime,
                samples: validTimes.length
            });

            if (isGoodPerformance) {
                this.results.passed++;
            } else {
                this.results.warnings++;
            }
        }
    }

    async testCloudflareApi(config) {
        const token = config.api_token || config.token;
        if (!token) {
            this.results.skipped++;
            return;
        }

        try {
            // Test API connectivity
            const response = await axios.get('https://api.cloudflare.com/client/v4/user/tokens/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            this.results.tests.push({
                type: 'Cloudflare API',
                test: 'Token Verification',
                passed: response.data.success === true,
                status: response.data.result?.status
            });

            if (response.data.success) {
                this.results.passed++;

                // List zones if token is valid
                try {
                    const zonesResponse = await axios.get('https://api.cloudflare.com/client/v4/zones', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });

                    if (zonesResponse.data.success) {
                        const zones = zonesResponse.data.result || [];
                        this.results.tests.push({
                            type: 'Cloudflare API',
                            test: 'Zones Access',
                            passed: true,
                            zoneCount: zones.length,
                            zones: zones.map(z => ({ name: z.name, status: z.status }))
                        });
                        this.results.passed++;
                    }
                } catch {
                    // Zones access might not be permitted
                    this.results.skipped++;
                }
            } else {
                this.results.failed++;
            }
        } catch (error) {
            this.results.tests.push({
                type: 'Cloudflare API',
                test: 'Token Verification',
                passed: false,
                error: error.response?.data?.errors?.[0]?.message || error.message
            });
            this.results.failed++;
        }
    }
}
