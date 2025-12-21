import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

export class ConfigLoader {
    constructor(configPath = null) {
        this.configPath = configPath || path.join(__dirname, '../../config.json');
        this.config = null;
        this.secrets = {};
    }

    load() {
        try {
            const configData = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(configData);
            this._loadSecrets();
            return this.config;
        } catch (error) {
            throw new Error(`Failed to load config: ${error.message}`);
        }
    }

    _loadSecrets() {
        // Load API keys from environment variables
        const apiConfigs = this.config.apis || {};

        for (const [apiName, apiConfig] of Object.entries(apiConfigs)) {
            this.secrets[apiName] = {};

            for (const [key, value] of Object.entries(apiConfig)) {
                if (key.endsWith('_env') && typeof value === 'string') {
                    const envValue = process.env[value];
                    if (envValue) {
                        const secretKey = key.replace('_env', '');
                        this.secrets[apiName][secretKey] = envValue;
                    }
                }
            }
        }

        // Also load from config.api_keys if populated
        if (this.config.api_keys) {
            for (const [key, value] of Object.entries(this.config.api_keys)) {
                if (!this.secrets[key]) {
                    this.secrets[key] = {};
                }
                Object.assign(this.secrets[key], value);
            }
        }
    }

    getApiConfig(apiName) {
        const baseConfig = this.config.apis?.[apiName] || {};
        const secrets = this.secrets[apiName] || {};
        return { ...baseConfig, ...secrets };
    }

    getSites() {
        return this.config.sites || [];
    }

    getEnvironment(envName) {
        return this.config.environments?.[envName] || this.config.environments?.production;
    }

    getTestConfig(testType) {
        return this.config.tests?.[testType] || { enabled: true };
    }

    getReportingConfig() {
        return this.config.reporting || { output_dir: './reports', formats: ['json'] };
    }

    save() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    addApiKey(apiName, keyName, value) {
        if (!this.config.api_keys) {
            this.config.api_keys = {};
        }
        if (!this.config.api_keys[apiName]) {
            this.config.api_keys[apiName] = {};
        }
        this.config.api_keys[apiName][keyName] = value;
    }

    addSite(domain, type = 'site', priority = 2) {
        if (!this.config.sites) {
            this.config.sites = [];
        }
        const existing = this.config.sites.find(s => s.domain === domain);
        if (!existing) {
            this.config.sites.push({ domain, type, priority });
        }
    }
}

export default new ConfigLoader();
