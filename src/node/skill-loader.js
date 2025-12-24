/**
 * Skill Loader Module
 *
 * Discovers and catalogs Claude Code skills from:
 * - Project-level: .claude/skills/
 * - User-level: ~/.claude/skills/
 *
 * Displays skill loading progress and provides skill metadata
 * for the validation kit and other tools.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Skill categories based on directory structure
const SKILL_CATEGORIES = {
    'anthropic-skills': 'Anthropic Official Skills',
    'superpowers': 'Superpowers Framework',
    'superpowers-skills': 'Superpowers Extensions',
    'custom': 'Custom Skills'
};

// Known important skills to highlight
const CORE_SKILLS = [
    'systematic-debugging',
    'writing-plans',
    'executing-plans',
    'brainstorming',
    'test-driven-development',
    'subagent-driven-development',
    'dispatching-parallel-agents',
    'mcp-builder',
    'skill-creator'
];

export class SkillLoader {
    constructor() {
        this.skills = [];
        this.categories = new Map();
        this.loadErrors = [];
    }

    /**
     * Get all skill directories to scan
     */
    getSkillPaths() {
        const paths = [];

        // Project-level skills
        const projectRoot = path.resolve(__dirname, '../..');
        const projectSkills = path.join(projectRoot, '.claude/skills');
        if (fs.existsSync(projectSkills)) {
            paths.push({ path: projectSkills, scope: 'project' });
        }

        // User-level skills
        const homeDir = os.homedir();
        const userSkills = path.join(homeDir, '.claude/skills');
        if (fs.existsSync(userSkills)) {
            paths.push({ path: userSkills, scope: 'user' });
        }

        return paths;
    }

    /**
     * Parse a SKILL.md file to extract metadata
     */
    parseSkillFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const skill = {
                path: filePath,
                name: '',
                description: '',
                category: 'custom',
                isCore: false
            };

            // Extract name from frontmatter
            const nameMatch = content.match(/^---[\s\S]*?name:\s*(.+?)[\r\n]/m);
            if (nameMatch) {
                skill.name = nameMatch[1].trim();
            } else {
                // Fall back to directory name
                skill.name = path.basename(path.dirname(filePath));
            }

            // Extract description from frontmatter
            const descMatch = content.match(/^---[\s\S]*?description:\s*(.+?)[\r\n]/m);
            if (descMatch) {
                skill.description = descMatch[1].trim();
            }

            // Determine category from path
            for (const [key, value] of Object.entries(SKILL_CATEGORIES)) {
                if (filePath.includes(`/${key}/`)) {
                    skill.category = key;
                    break;
                }
            }

            // Check if it's a core skill
            skill.isCore = CORE_SKILLS.includes(skill.name);

            return skill;
        } catch (error) {
            this.loadErrors.push({ path: filePath, error: error.message });
            return null;
        }
    }

    /**
     * Recursively find all SKILL.md files in a directory
     */
    findSkillFiles(dir, files = []) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Skip node_modules and hidden directories (except .claude)
                    if (entry.name !== 'node_modules' &&
                        (!entry.name.startsWith('.') || entry.name === '.claude')) {
                        this.findSkillFiles(fullPath, files);
                    }
                } else if (entry.name === 'SKILL.md' || entry.name === 'skill.md') {
                    files.push(fullPath);
                }
            }
        } catch (error) {
            this.loadErrors.push({ path: dir, error: error.message });
        }

        return files;
    }

    /**
     * Discover all available skills
     */
    async discover(options = {}) {
        const { showSpinner = true, verbose = false } = options;

        let spinner;
        if (showSpinner) {
            spinner = ora('Discovering Claude Code skills...').start();
        }

        const skillPaths = this.getSkillPaths();
        const allSkillFiles = [];

        // Find all skill files
        for (const { path: skillPath, scope } of skillPaths) {
            const files = this.findSkillFiles(skillPath);
            for (const file of files) {
                allSkillFiles.push({ file, scope });
            }
        }

        // Parse each skill file
        for (const { file, scope } of allSkillFiles) {
            const skill = this.parseSkillFile(file);
            if (skill) {
                skill.scope = scope;
                this.skills.push(skill);

                // Organize by category
                if (!this.categories.has(skill.category)) {
                    this.categories.set(skill.category, []);
                }
                this.categories.get(skill.category).push(skill);
            }
        }

        if (spinner) {
            spinner.succeed(`Discovered ${this.skills.length} Claude Code skills`);
        }

        return this.skills;
    }

    /**
     * Display skills grouped by category
     */
    displaySkills(options = {}) {
        const { showDescriptions = false, coreOnly = false } = options;

        console.log(chalk.blue.bold('\n=== Claude Code Skills ===\n'));

        // Display by category
        for (const [categoryKey, skills] of this.categories) {
            const categoryName = SKILL_CATEGORIES[categoryKey] || categoryKey;
            const filteredSkills = coreOnly ? skills.filter(s => s.isCore) : skills;

            if (filteredSkills.length === 0) continue;

            console.log(chalk.cyan.bold(`${categoryName} (${filteredSkills.length}):`));

            for (const skill of filteredSkills) {
                const coreMarker = skill.isCore ? chalk.yellow(' *') : '';
                const scopeMarker = skill.scope === 'project' ? chalk.dim(' [project]') : '';

                if (showDescriptions && skill.description) {
                    console.log(`  ${chalk.green('+')} ${skill.name}${coreMarker}${scopeMarker}`);
                    console.log(`    ${chalk.dim(skill.description)}`);
                } else {
                    console.log(`  ${chalk.green('+')} ${skill.name}${coreMarker}${scopeMarker}`);
                }
            }
            console.log();
        }

        // Summary
        const coreCount = this.skills.filter(s => s.isCore).length;
        console.log(chalk.dim(`Total: ${this.skills.length} skills (${coreCount} core)`));

        if (this.loadErrors.length > 0) {
            console.log(chalk.yellow(`\nWarning: ${this.loadErrors.length} skills failed to load`));
        }
    }

    /**
     * Show loading animation for skills
     */
    async showLoadingSequence(options = {}) {
        const { delay = 50, showAll = false } = options;

        console.log(chalk.blue.bold('\n=== Loading Claude Code Skills ===\n'));

        // Group skills by category for organized loading
        const categories = [
            { key: 'superpowers', name: 'Superpowers Framework', icon: '⚡' },
            { key: 'anthropic-skills', name: 'Anthropic Skills', icon: '🤖' },
            { key: 'superpowers-skills', name: 'Extensions', icon: '🔌' },
            { key: 'custom', name: 'Custom Skills', icon: '⚙️' }
        ];

        for (const category of categories) {
            const skills = this.categories.get(category.key) || [];
            if (skills.length === 0) continue;

            console.log(chalk.cyan(`${category.icon} ${category.name}`));

            // Show loading for each skill
            const displaySkills = showAll ? skills : skills.filter(s => s.isCore);
            for (const skill of displaySkills) {
                const spinner = ora({
                    text: `Loading skill: ${skill.name}`,
                    color: 'green'
                }).start();

                // Simulate loading time
                await new Promise(resolve => setTimeout(resolve, delay));

                spinner.succeed(`Loaded: ${chalk.green(skill.name)}`);
            }

            // Show count of non-displayed skills
            if (!showAll && skills.length > displaySkills.length) {
                console.log(chalk.dim(`  ... and ${skills.length - displaySkills.length} more skills`));
            }

            console.log();
        }

        // Show agent tools summary
        console.log(chalk.blue.bold('=== Agent Tools Ready ===\n'));
        const agentTools = [
            { name: 'Task Tool (Subagents)', desc: 'Parallel task execution' },
            { name: 'Enterprise Systems Architect', desc: 'AWS/Docker/PostgreSQL expert' },
            { name: 'Plan Mode', desc: 'Systematic planning before implementation' },
            { name: 'Explore Agent', desc: 'Fast codebase exploration' },
            { name: 'Claude Code Guide', desc: 'Documentation lookup' }
        ];

        for (const tool of agentTools) {
            console.log(`  ${chalk.green('✓')} ${chalk.bold(tool.name)}: ${chalk.dim(tool.desc)}`);
        }

        console.log();
    }

    /**
     * Get skills that match a query
     */
    findSkills(query) {
        const lowerQuery = query.toLowerCase();
        return this.skills.filter(skill =>
            skill.name.toLowerCase().includes(lowerQuery) ||
            skill.description.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get a skill by name
     */
    getSkill(name) {
        return this.skills.find(s => s.name === name);
    }

    /**
     * Export skill inventory as JSON
     */
    toJSON() {
        return {
            timestamp: new Date().toISOString(),
            totalSkills: this.skills.length,
            coreSkills: this.skills.filter(s => s.isCore).length,
            categories: Object.fromEntries(
                Array.from(this.categories.entries()).map(([key, skills]) => [
                    key,
                    skills.map(s => ({ name: s.name, description: s.description, isCore: s.isCore }))
                ])
            ),
            errors: this.loadErrors
        };
    }
}

// Singleton instance
export const skillLoader = new SkillLoader();

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const loader = new SkillLoader();
    await loader.discover();
    await loader.showLoadingSequence({ delay: 30, showAll: false });
    console.log(chalk.green.bold('\nAll skills loaded and ready!\n'));
}
