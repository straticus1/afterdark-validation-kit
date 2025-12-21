#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from 'commander';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patterns to search for API keys and credentials
const KEY_PATTERNS = {
    // Cloud Providers
    aws_access_key: /AWS_ACCESS_KEY_ID[\s]*[=:][\s]*['"]?([A-Z0-9]{20})['"]?/gi,
    aws_secret_key: /AWS_SECRET_ACCESS_KEY[\s]*[=:][\s]*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    aws_region: /AWS_REGION[\s]*[=:][\s]*['"]?([a-z]{2}-[a-z]+-\d+)['"]?/gi,

    // Oracle Cloud
    oci_tenancy: /OCI_TENANCY_OCID[\s]*[=:][\s]*['"]?(ocid1\.tenancy\.[^'"]+)['"]?/gi,
    oci_user: /OCI_USER_OCID[\s]*[=:][\s]*['"]?(ocid1\.user\.[^'"]+)['"]?/gi,
    oci_compartment: /OCI_COMPARTMENT_OCID[\s]*[=:][\s]*['"]?(ocid1\.compartment\.[^'"]+)['"]?/gi,
    oci_fingerprint: /OCI_FINGERPRINT[\s]*[=:][\s]*['"]?([a-f0-9:]{47})['"]?/gi,

    // Cloudflare
    cloudflare_token: /CLOUDFLARE_API_TOKEN[\s]*[=:][\s]*['"]?([A-Za-z0-9_-]{40,})['"]?/gi,
    cloudflare_zone: /CLOUDFLARE_ZONE_ID[\s]*[=:][\s]*['"]?([a-f0-9]{32})['"]?/gi,
    cloudflare_email: /CLOUDFLARE_EMAIL[\s]*[=:][\s]*['"]?([^\s'"]+@[^\s'"]+)['"]?/gi,

    // Neon
    neon_api_key: /NEON_API_KEY[\s]*[=:][\s]*['"]?([A-Za-z0-9_-]+)['"]?/gi,
    neon_project: /NEON_PROJECT_ID[\s]*[=:][\s]*['"]?([a-z]+-[a-z]+-\d+)['"]?/gi,
    neon_connection: /postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+\/[^\s'"]+/gi,

    // Database
    database_url: /DATABASE_URL[\s]*[=:][\s]*['"]?(postgres(?:ql)?:\/\/[^\s'"]+)['"]?/gi,
    pg_host: /(?:PG_HOST|DB_HOST|POSTGRES_HOST)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,
    pg_user: /(?:PG_USER|DB_USER|POSTGRES_USER)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,
    pg_password: /(?:PG_PASSWORD|DB_PASSWORD|POSTGRES_PASSWORD)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,
    pg_database: /(?:PG_DATABASE|DB_NAME|POSTGRES_DB)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,

    // JWT/Auth
    jwt_secret: /JWT_SECRET[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,

    // Generic API Keys
    api_key: /(?:API_KEY|APIKEY)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,
    api_secret: /(?:API_SECRET|APISECRET)[\s]*[=:][\s]*['"]?([^\s'"]+)['"]?/gi,
};

// Files to scan
const SCAN_PATTERNS = [
    '**/.env',
    '**/.env.*',
    '**/config.json',
    '**/config.js',
    '**/config.ts',
    '**/*.config.js',
    '**/*.config.ts',
    '**/credentials.json',
    '**/secrets.json',
    '**/terraform.tfvars',
    '**/*.tfvars',
];

// Directories to ignore
const IGNORE_PATTERNS = [
    '**/node_modules/**',
    '**/.git/**',
    '**/vendor/**',
    '**/dist/**',
    '**/build/**',
    '**/__pycache__/**',
    '**/venv/**',
    '**/.venv/**',
];

class ApiKeyScanner {
    constructor(directory) {
        this.directory = directory;
        this.foundKeys = new Map();
        this.scannedFiles = [];
    }

    async scan() {
        console.log(chalk.blue(`\nScanning directory: ${this.directory}\n`));

        for (const pattern of SCAN_PATTERNS) {
            const files = await glob(pattern, {
                cwd: this.directory,
                ignore: IGNORE_PATTERNS,
                absolute: true,
                dot: true,
            });

            for (const file of files) {
                await this.scanFile(file);
            }
        }

        return this.foundKeys;
    }

    async scanFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(this.directory, filePath);
            let hasFindings = false;

            for (const [keyType, pattern] of Object.entries(KEY_PATTERNS)) {
                const matches = content.matchAll(new RegExp(pattern.source, pattern.flags));

                for (const match of matches) {
                    hasFindings = true;
                    const value = match[1] || match[0];

                    if (!this.foundKeys.has(keyType)) {
                        this.foundKeys.set(keyType, []);
                    }

                    const existingValues = this.foundKeys.get(keyType);
                    const isDuplicate = existingValues.some(
                        e => e.value === value || this.maskValue(e.value) === this.maskValue(value)
                    );

                    if (!isDuplicate) {
                        this.foundKeys.get(keyType).push({
                            value,
                            file: relativePath,
                            masked: this.maskValue(value),
                        });
                    }
                }
            }

            if (hasFindings) {
                this.scannedFiles.push(relativePath);
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    maskValue(value) {
        if (!value || value.length < 8) return '***';
        const visibleChars = Math.min(4, Math.floor(value.length / 4));
        return value.substring(0, visibleChars) + '***' + value.substring(value.length - visibleChars);
    }

    printResults() {
        console.log(chalk.green.bold('\n=== API Keys and Credentials Found ===\n'));

        if (this.foundKeys.size === 0) {
            console.log(chalk.yellow('No API keys or credentials found.'));
            return;
        }

        for (const [keyType, entries] of this.foundKeys) {
            console.log(chalk.cyan.bold(`\n${keyType.toUpperCase().replace(/_/g, ' ')}:`));

            for (const entry of entries) {
                console.log(`  ${chalk.gray('File:')} ${entry.file}`);
                console.log(`  ${chalk.gray('Value:')} ${entry.masked}`);
                console.log();
            }
        }

        console.log(chalk.blue(`\nTotal files scanned with findings: ${this.scannedFiles.length}`));
        console.log(chalk.blue(`Total unique key types found: ${this.foundKeys.size}`));
    }

    exportToConfig() {
        const configPath = path.join(__dirname, '../../config.json');
        let config;

        try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch {
            config = { api_keys: {} };
        }

        if (!config.api_keys) {
            config.api_keys = {};
        }

        // Organize keys by service
        const serviceMapping = {
            aws_access_key: { service: 'aws', key: 'access_key' },
            aws_secret_key: { service: 'aws', key: 'secret_key' },
            aws_region: { service: 'aws', key: 'region' },
            oci_tenancy: { service: 'oracle_cloud', key: 'tenancy_ocid' },
            oci_user: { service: 'oracle_cloud', key: 'user_ocid' },
            oci_compartment: { service: 'oracle_cloud', key: 'compartment_ocid' },
            oci_fingerprint: { service: 'oracle_cloud', key: 'fingerprint' },
            cloudflare_token: { service: 'cloudflare', key: 'api_token' },
            cloudflare_zone: { service: 'cloudflare', key: 'zone_id' },
            cloudflare_email: { service: 'cloudflare', key: 'email' },
            neon_api_key: { service: 'neon', key: 'api_key' },
            neon_project: { service: 'neon', key: 'project_id' },
            database_url: { service: 'database', key: 'url' },
            pg_host: { service: 'database', key: 'host' },
            pg_user: { service: 'database', key: 'user' },
            pg_password: { service: 'database', key: 'password' },
            pg_database: { service: 'database', key: 'database' },
            jwt_secret: { service: 'auth', key: 'jwt_secret' },
        };

        for (const [keyType, entries] of this.foundKeys) {
            const mapping = serviceMapping[keyType];
            if (mapping && entries.length > 0) {
                if (!config.api_keys[mapping.service]) {
                    config.api_keys[mapping.service] = {};
                }
                // Use the first found value
                config.api_keys[mapping.service][mapping.key] = entries[0].value;
            }
        }

        return config;
    }
}

async function main() {
    const program = new Command();

    program
        .name('import-api')
        .description('Scan directories for API keys and import them into the validation kit config')
        .argument('[directory]', 'Directory to scan', process.env.HOME + '/development')
        .option('-o, --output <file>', 'Output config file', path.join(__dirname, '../../config.json'))
        .option('-d, --dry-run', 'Show what would be imported without modifying config')
        .option('-i, --interactive', 'Interactively confirm each key import')
        .parse();

    const options = program.opts();
    const directory = program.args[0] || process.env.HOME + '/development';

    const scanner = new ApiKeyScanner(directory);
    await scanner.scan();
    scanner.printResults();

    if (scanner.foundKeys.size === 0) {
        console.log(chalk.yellow('\nNo keys found to import.'));
        return;
    }

    if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] Config would be updated with found keys.'));
        return;
    }

    let shouldImport = true;

    if (options.interactive) {
        const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'import',
            message: 'Do you want to import these keys into the config?',
            default: true
        }]);
        shouldImport = answer.import;
    }

    if (shouldImport) {
        const config = scanner.exportToConfig();
        fs.writeFileSync(options.output, JSON.stringify(config, null, 2));
        console.log(chalk.green(`\nConfig updated: ${options.output}`));
        console.log(chalk.yellow('\nIMPORTANT: Review the config file and ensure no sensitive keys are committed to git!'));
    }
}

main().catch(console.error);
