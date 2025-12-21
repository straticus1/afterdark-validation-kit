import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Reporter {
    constructor(config) {
        this.config = config;
    }

    async generate(results, options = {}) {
        const reportConfig = this.config.getReportingConfig();
        const outputDir = options.output || reportConfig.output_dir || './reports';

        // Ensure output directory exists
        const absoluteOutputDir = path.resolve(__dirname, '../../', outputDir);
        if (!fs.existsSync(absoluteOutputDir)) {
            fs.mkdirSync(absoluteOutputDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const formats = reportConfig.formats || ['json'];

        for (const format of formats) {
            switch (format) {
                case 'json':
                    await this.generateJsonReport(results, absoluteOutputDir, timestamp);
                    break;
                case 'html':
                    await this.generateHtmlReport(results, absoluteOutputDir, timestamp);
                    break;
                case 'markdown':
                    await this.generateMarkdownReport(results, absoluteOutputDir, timestamp);
                    break;
            }
        }

        console.log(chalk.green(`\nReports generated in: ${absoluteOutputDir}`));
    }

    async generateJsonReport(results, outputDir, timestamp) {
        const filename = `validation-report-${timestamp}.json`;
        const filepath = path.join(outputDir, filename);

        fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
        console.log(chalk.gray(`  JSON: ${filename}`));
    }

    async generateHtmlReport(results, outputDir, timestamp) {
        const filename = `validation-report-${timestamp}.html`;
        const filepath = path.join(outputDir, filename);

        const html = this.buildHtmlReport(results);
        fs.writeFileSync(filepath, html);
        console.log(chalk.gray(`  HTML: ${filename}`));
    }

    async generateMarkdownReport(results, outputDir, timestamp) {
        const filename = `validation-report-${timestamp}.md`;
        const filepath = path.join(outputDir, filename);

        const markdown = this.buildMarkdownReport(results);
        fs.writeFileSync(filepath, markdown);
        console.log(chalk.gray(`  Markdown: ${filename}`));
    }

    buildHtmlReport(results) {
        const summary = results.summary;
        const tests = results.tests;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AfterDark Validation Report</title>
    <style>
        :root {
            --bg-color: #1a1a2e;
            --card-bg: #16213e;
            --text-color: #e4e4e4;
            --success-color: #00b894;
            --error-color: #d63031;
            --warning-color: #fdcb6e;
            --info-color: #74b9ff;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        h1 {
            color: #fff;
            border-bottom: 2px solid var(--info-color);
            padding-bottom: 10px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .summary-card {
            background: var(--card-bg);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .summary-card .number {
            font-size: 3em;
            font-weight: bold;
        }
        .summary-card.passed .number { color: var(--success-color); }
        .summary-card.failed .number { color: var(--error-color); }
        .summary-card.warnings .number { color: var(--warning-color); }
        .summary-card.skipped .number { color: var(--info-color); }
        .test-section {
            background: var(--card-bg);
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
        }
        .test-section h2 {
            background: rgba(255,255,255,0.1);
            margin: 0;
            padding: 15px 20px;
        }
        .test-table {
            width: 100%;
            border-collapse: collapse;
        }
        .test-table th, .test-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .test-table th {
            background: rgba(0,0,0,0.2);
            font-weight: 600;
        }
        .status-passed { color: var(--success-color); }
        .status-failed { color: var(--error-color); }
        .status-warning { color: var(--warning-color); }
        .timestamp {
            color: #888;
            font-size: 0.9em;
        }
        .details {
            font-size: 0.85em;
            color: #aaa;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AfterDark Validation Report</h1>
        <p class="timestamp">Generated: ${results.timestamp}</p>

        <div class="summary">
            <div class="summary-card passed">
                <div class="number">${summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="summary-card failed">
                <div class="number">${summary.failed}</div>
                <div>Failed</div>
            </div>
            <div class="summary-card warnings">
                <div class="number">${summary.warnings}</div>
                <div>Warnings</div>
            </div>
            <div class="summary-card skipped">
                <div class="number">${summary.skipped}</div>
                <div>Skipped</div>
            </div>
        </div>

        ${Object.entries(tests).map(([category, categoryResults]) => this.buildHtmlSection(category, categoryResults)).join('')}
    </div>
</body>
</html>`;
    }

    buildHtmlSection(category, results) {
        if (results.error) {
            return `
        <div class="test-section">
            <h2>${this.formatCategory(category)}</h2>
            <p style="padding: 20px; color: var(--error-color);">Error: ${results.error}</p>
        </div>`;
        }

        const testsList = results.tests || [];

        return `
        <div class="test-section">
            <h2>${this.formatCategory(category)} (${results.passed || 0} passed, ${results.failed || 0} failed)</h2>
            <table class="test-table">
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Type</th>
                        <th>Test</th>
                        <th>Status</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${testsList.map(test => `
                    <tr>
                        <td>${test.domain || '-'}</td>
                        <td>${test.type || '-'}</td>
                        <td>${test.test || test.name || test.endpoint || '-'}</td>
                        <td class="${test.passed ? 'status-passed' : (test.error ? 'status-failed' : 'status-warning')}">
                            ${test.passed ? 'PASS' : (test.error ? 'FAIL' : 'WARN')}
                        </td>
                        <td class="details">${this.formatDetails(test)}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    }

    formatCategory(category) {
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
    }

    formatDetails(test) {
        const details = [];
        if (test.status) details.push(`Status: ${test.status}`);
        if (test.latency) details.push(`${test.latency}ms`);
        if (test.error) details.push(`Error: ${test.error}`);
        if (test.warning) details.push(`Warning: ${test.warning}`);
        if (test.note) details.push(test.note);
        return details.join(' | ') || '-';
    }

    buildMarkdownReport(results) {
        const summary = results.summary;
        const tests = results.tests;

        let markdown = `# AfterDark Validation Report

**Generated:** ${results.timestamp}

## Summary

| Metric | Count |
|--------|-------|
| Passed | ${summary.passed} |
| Failed | ${summary.failed} |
| Warnings | ${summary.warnings} |
| Skipped | ${summary.skipped} |

`;

        for (const [category, categoryResults] of Object.entries(tests)) {
            markdown += this.buildMarkdownSection(category, categoryResults);
        }

        return markdown;
    }

    buildMarkdownSection(category, results) {
        if (results.error) {
            return `
## ${this.formatCategory(category)}

**Error:** ${results.error}

`;
        }

        const testsList = results.tests || [];
        let section = `
## ${this.formatCategory(category)}

**Results:** ${results.passed || 0} passed, ${results.failed || 0} failed

| Domain | Type | Test | Status | Details |
|--------|------|------|--------|---------|
`;

        for (const test of testsList) {
            const status = test.passed ? 'PASS' : (test.error ? 'FAIL' : 'WARN');
            const details = this.formatDetails(test).replace(/\|/g, '/');
            section += `| ${test.domain || '-'} | ${test.type || '-'} | ${test.test || test.name || '-'} | ${status} | ${details} |\n`;
        }

        return section + '\n';
    }
}
