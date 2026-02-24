/**
 * discussion-templates command - Generate GitHub Discussion templates
 *
 * Generates `.github/DISCUSSION_TEMPLATE/` files from Handlebars templates
 * with i18n dictionary support.
 *
 * Subcommands:
 * - generate: Generate discussion templates for a specific language
 * - list-languages: List available languages
 *
 * @example
 * ```bash
 * shirokuma-docs discussion-templates generate --lang ja --output .github/DISCUSSION_TEMPLATE/
 * shirokuma-docs discussion-templates list-languages
 * ```
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";
import { createLogger } from "../utils/logger.js";
// =============================================================================
// Constants
// =============================================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Templates and i18n are in the package root
const PACKAGE_ROOT = join(__dirname, "..", "..");
const TEMPLATES_DIR = join(PACKAGE_ROOT, "templates", "discussion");
const I18N_DIR = join(PACKAGE_ROOT, "i18n", "discussion");
const TEMPLATE_FILES = ["handovers", "adr", "knowledge", "research", "reports"];
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Get nested value from dictionary using dot notation
 */
function getNestedValue(obj, path) {
    const keys = path.split(".");
    let current = obj;
    for (const key of keys) {
        if (typeof current !== "object" || current === null) {
            return path; // Return the key if not found
        }
        current = current[key];
    }
    if (typeof current === "string") {
        return current;
    }
    return path; // Return the key if not a string
}
/**
 * Indent multiline text for YAML block literals
 * Adds specified number of spaces to each line after the first
 */
function indentMultiline(text, spaces) {
    const indent = " ".repeat(spaces);
    const lines = text.split("\n");
    return lines.map((line, index) => (index === 0 ? line : indent + line)).join("\n");
}
/**
 * Load i18n dictionary for a language
 */
function loadDictionary(lang) {
    const dictPath = join(I18N_DIR, `${lang}.json`);
    if (!existsSync(dictPath)) {
        return null;
    }
    try {
        const content = readFileSync(dictPath, "utf-8");
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Get available languages
 */
function getAvailableLanguages() {
    if (!existsSync(I18N_DIR)) {
        return [];
    }
    try {
        const files = readdirSync(I18N_DIR);
        return files
            .filter((f) => f.endsWith(".json"))
            .map((f) => f.replace(".json", ""));
    }
    catch {
        return [];
    }
}
/**
 * Render a template with i18n dictionary
 */
function renderTemplate(templateName, dictionary) {
    const templatePath = join(TEMPLATES_DIR, `${templateName}.yml.hbs`);
    if (!existsSync(templatePath)) {
        return null;
    }
    try {
        const templateContent = readFileSync(templatePath, "utf-8");
        // Register the translation helper
        const handlebars = Handlebars.create();
        // Simple translation helper
        handlebars.registerHelper("t", (key) => {
            return getNestedValue(dictionary, key);
        });
        // Translation with indentation for YAML block literals
        // Usage: {{ti "key" 8}} - indents multiline text by 8 spaces
        handlebars.registerHelper("ti", (key, spaces) => {
            const value = getNestedValue(dictionary, key);
            return indentMultiline(value, spaces);
        });
        const template = handlebars.compile(templateContent, { noEscape: true });
        return template({});
    }
    catch {
        return null;
    }
}
// =============================================================================
// Subcommand Handlers
// =============================================================================
/**
 * generate subcommand
 */
async function cmdGenerate(options, logger) {
    const lang = options.lang ?? "en";
    const outputDir = options.output ?? ".github/DISCUSSION_TEMPLATE";
    // Check templates directory exists
    if (!existsSync(TEMPLATES_DIR)) {
        logger.error(`Templates directory not found: ${TEMPLATES_DIR}`);
        return 1;
    }
    // Load dictionary
    const dictionary = loadDictionary(lang);
    if (!dictionary) {
        logger.error(`Language '${lang}' not found`);
        const available = getAvailableLanguages();
        if (available.length > 0) {
            logger.info(`Available languages: ${available.join(", ")}`);
        }
        return 1;
    }
    // Create output directory
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
        logger.debug(`Created directory: ${outputDir}`);
    }
    // Generate templates
    const generated = [];
    const errors = [];
    for (const templateName of TEMPLATE_FILES) {
        const rendered = renderTemplate(templateName, dictionary);
        if (rendered === null) {
            errors.push(templateName);
            logger.warn(`Failed to render template: ${templateName}`);
            continue;
        }
        const outputPath = join(outputDir, `${templateName}.yml`);
        writeFileSync(outputPath, rendered, "utf-8");
        generated.push(templateName);
        logger.debug(`Generated: ${outputPath}`);
    }
    if (errors.length > 0) {
        logger.warn(`Failed to generate ${errors.length} template(s): ${errors.join(", ")}`);
    }
    if (generated.length > 0) {
        logger.success(`Generated ${generated.length} template(s) in ${outputDir}`);
    }
    // Output summary
    const output = {
        language: lang,
        output_directory: outputDir,
        generated: generated,
        errors: errors.length > 0 ? errors : undefined,
    };
    console.log(JSON.stringify(output, null, 2));
    return errors.length > 0 && generated.length === 0 ? 1 : 0;
}
/**
 * list-languages subcommand
 */
async function cmdListLanguages(_options, logger) {
    const languages = getAvailableLanguages();
    if (languages.length === 0) {
        logger.warn("No languages found");
        return 0;
    }
    const output = {
        languages: languages,
        total_count: languages.length,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * add-language subcommand
 */
async function cmdAddLanguage(langCode, options, logger) {
    // Check if language already exists
    const existing = getAvailableLanguages();
    if (existing.includes(langCode)) {
        logger.error(`Language '${langCode}' already exists`);
        return 1;
    }
    // Load English as base
    const baseDictionary = loadDictionary("en");
    if (!baseDictionary) {
        logger.error("Base language (en) not found. Cannot create new language.");
        return 1;
    }
    // Create new dictionary file
    if (!existsSync(I18N_DIR)) {
        mkdirSync(I18N_DIR, { recursive: true });
    }
    const newDictPath = join(I18N_DIR, `${langCode}.json`);
    writeFileSync(newDictPath, JSON.stringify(baseDictionary, null, 2), "utf-8");
    logger.success(`Created language file: ${newDictPath}`);
    logger.info("Edit the file to add translations for the new language.");
    const output = {
        language: langCode,
        file: newDictPath,
        status: "created",
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
// =============================================================================
// Main Command Handler
// =============================================================================
/**
 * discussion-templates command handler
 */
export async function discussionTemplatesCommand(action, target, options) {
    const logger = createLogger(options.verbose);
    logger.debug(`Action: ${action}`);
    logger.debug(`Target: ${target ?? "(none)"}`);
    let exitCode = 0;
    switch (action) {
        case "generate":
            exitCode = await cmdGenerate(options, logger);
            break;
        case "list-languages":
        case "list":
            exitCode = await cmdListLanguages(options, logger);
            break;
        case "add-language":
        case "add":
            if (!target) {
                logger.error("Language code required");
                logger.info("Usage: shirokuma-docs discussion-templates add-language <lang-code>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdAddLanguage(target, options, logger);
            }
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available actions: generate, list-languages, add-language");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=discussion-templates.js.map