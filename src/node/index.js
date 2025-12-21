#!/usr/bin/env node

/**
 * AfterDark Validation Kit
 * Main entry point for programmatic usage
 */

import { ConfigLoader } from './config-loader.js';
import { ApiTester } from './testers/api-tester.js';
import { SecurityTester } from './testers/security-tester.js';
import { CdnTester } from './testers/cdn-tester.js';
import { DatabaseTester } from './testers/database-tester.js';
import { SiteTester } from './testers/site-tester.js';
import { Reporter } from './reporter.js';

export {
    ConfigLoader,
    ApiTester,
    SecurityTester,
    CdnTester,
    DatabaseTester,
    SiteTester,
    Reporter,
};

export class ValidationKit {
    constructor(configPath = null) {
        this.config = new ConfigLoader(configPath);
        this.config.load();
    }

    async runApiTests() {
        const tester = new ApiTester(this.config);
        return await tester.runAll();
    }

    async runSecurityTests() {
        const tester = new SecurityTester(this.config);
        return await tester.runAll();
    }

    async runCdnTests() {
        const tester = new CdnTester(this.config);
        return await tester.runAll();
    }

    async runDatabaseTests() {
        const tester = new DatabaseTester(this.config);
        return await tester.runAll();
    }

    async runSiteTests() {
        const tester = new SiteTester(this.config);
        return await tester.runAll();
    }

    async runAll() {
        const results = {
            timestamp: new Date().toISOString(),
            summary: { passed: 0, failed: 0, skipped: 0, warnings: 0 },
            tests: {}
        };

        const tests = [
            { name: 'api', fn: () => this.runApiTests() },
            { name: 'security', fn: () => this.runSecurityTests() },
            { name: 'cdn', fn: () => this.runCdnTests() },
            { name: 'database', fn: () => this.runDatabaseTests() },
            { name: 'sites', fn: () => this.runSiteTests() },
        ];

        for (const test of tests) {
            try {
                const testResults = await test.fn();
                results.tests[test.name] = testResults;

                if (testResults.passed) results.summary.passed += testResults.passed;
                if (testResults.failed) results.summary.failed += testResults.failed;
                if (testResults.skipped) results.summary.skipped += testResults.skipped;
                if (testResults.warnings) results.summary.warnings += testResults.warnings;
            } catch (error) {
                results.tests[test.name] = { error: error.message };
            }
        }

        return results;
    }

    async generateReport(results, options = {}) {
        const reporter = new Reporter(this.config);
        await reporter.generate(results, options);
    }
}

export default ValidationKit;
