#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigLoader } from './config-loader.js';
import { ApiTester } from './testers/api-tester.js';
import { SecurityTester } from './testers/security-tester.js';
import { CdnTester } from './testers/cdn-tester.js';
import { DatabaseTester } from './testers/database-tester.js';
import { SiteTester } from './testers/site-tester.js';
import { Reporter } from './reporter.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ValidationRunner {
    constructor() {
        this.config = new ConfigLoader();
        this.results = {
            timestamp: new Date().toISOString(),
            summary: { passed: 0, failed: 0, skipped: 0, warnings: 0 },
            tests: {}
        };
    }

    async initialize() {
        this.config.load();
        console.log(chalk.blue.bold('\n=== AfterDark Validation Kit ===\n'));
    }

    async runAll(options = {}) {
        await this.initialize();

        const tests = [
            { name: 'API Tests', fn: () => this.runApiTests(options) },
            { name: 'Security Tests', fn: () => this.runSecurityTests(options) },
            { name: 'CDN Tests', fn: () => this.runCdnTests(options) },
            { name: 'Database Tests', fn: () => this.runDatabaseTests(options) },
            { name: 'Site Tests', fn: () => this.runSiteTests(options) },
        ];

        for (const test of tests) {
            if (options.verbose) {
                console.log(chalk.cyan(`\nRunning ${test.name}...`));
            }
            try {
                await test.fn();
            } catch (error) {
                console.error(chalk.red(`Error in ${test.name}: ${error.message}`));
                this.results.tests[test.name] = { error: error.message };
            }
        }

        await this.generateReport(options);
    }

    async runApiTests(options = {}) {
        const spinner = ora('Running API validation tests...').start();
        try {
            const tester = new ApiTester(this.config);
            const results = await tester.runAll();
            this.results.tests.api = results;
            this.updateSummary(results);
            spinner.succeed(`API Tests: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
            spinner.fail(`API Tests failed: ${error.message}`);
            this.results.tests.api = { error: error.message };
        }
    }

    async runSecurityTests(options = {}) {
        const spinner = ora('Running security tests...').start();
        try {
            const tester = new SecurityTester(this.config);
            const results = await tester.runAll();
            this.results.tests.security = results;
            this.updateSummary(results);
            spinner.succeed(`Security Tests: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
            spinner.fail(`Security Tests failed: ${error.message}`);
            this.results.tests.security = { error: error.message };
        }
    }

    async runCdnTests(options = {}) {
        const spinner = ora('Running CDN/Cloudflare tests...').start();
        try {
            const tester = new CdnTester(this.config);
            const results = await tester.runAll();
            this.results.tests.cdn = results;
            this.updateSummary(results);
            spinner.succeed(`CDN Tests: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
            spinner.fail(`CDN Tests failed: ${error.message}`);
            this.results.tests.cdn = { error: error.message };
        }
    }

    async runDatabaseTests(options = {}) {
        const spinner = ora('Running database tests...').start();
        try {
            const tester = new DatabaseTester(this.config);
            const results = await tester.runAll();
            this.results.tests.database = results;
            this.updateSummary(results);
            spinner.succeed(`Database Tests: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
            spinner.fail(`Database Tests failed: ${error.message}`);
            this.results.tests.database = { error: error.message };
        }
    }

    async runSiteTests(options = {}) {
        const spinner = ora('Running site validation tests...').start();
        try {
            const tester = new SiteTester(this.config);
            const results = await tester.runAll();
            this.results.tests.sites = results;
            this.updateSummary(results);
            spinner.succeed(`Site Tests: ${results.passed} passed, ${results.failed} failed`);
        } catch (error) {
            spinner.fail(`Site Tests failed: ${error.message}`);
            this.results.tests.sites = { error: error.message };
        }
    }

    updateSummary(results) {
        if (results.passed) this.results.summary.passed += results.passed;
        if (results.failed) this.results.summary.failed += results.failed;
        if (results.skipped) this.results.summary.skipped += results.skipped;
        if (results.warnings) this.results.summary.warnings += results.warnings;
    }

    async generateReport(options = {}) {
        const reporter = new Reporter(this.config);
        await reporter.generate(this.results, options);
    }

    printSummary() {
        console.log(chalk.bold('\n=== Test Summary ==='));
        console.log(chalk.green(`Passed: ${this.results.summary.passed}`));
        console.log(chalk.red(`Failed: ${this.results.summary.failed}`));
        console.log(chalk.yellow(`Skipped: ${this.results.summary.skipped}`));
        console.log(chalk.blue(`Warnings: ${this.results.summary.warnings}`));
    }
}

async function main() {
    const program = new Command();

    program
        .name('afterdark-validate')
        .description('AfterDark Infrastructure Validation Toolkit')
        .version('1.0.0');

    program
        .option('-a, --all', 'Run all tests')
        .option('--api', 'Run API tests only')
        .option('--security', 'Run security tests only')
        .option('--cdn', 'Run CDN/Cloudflare tests only')
        .option('--database', 'Run database tests only')
        .option('--sites', 'Run site tests only')
        .option('-s, --site <domain>', 'Test specific site')
        .option('-e, --env <environment>', 'Environment to test', 'production')
        .option('-v, --verbose', 'Verbose output')
        .option('-o, --output <dir>', 'Output directory for reports')
        .parse();

    const options = program.opts();
    const runner = new ValidationRunner();

    try {
        if (options.all || (!options.api && !options.security && !options.cdn && !options.database && !options.sites)) {
            await runner.runAll(options);
        } else {
            await runner.initialize();

            if (options.api) await runner.runApiTests(options);
            if (options.security) await runner.runSecurityTests(options);
            if (options.cdn) await runner.runCdnTests(options);
            if (options.database) await runner.runDatabaseTests(options);
            if (options.sites) await runner.runSiteTests(options);

            await runner.generateReport(options);
        }

        runner.printSummary();

        if (runner.results.summary.failed > 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(chalk.red(`\nFatal error: ${error.message}`));
        process.exit(1);
    }
}

main();
