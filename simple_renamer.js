"use strict";
/**
 * @fileoverview Sentient Knowledge Engine (SKE)
 * @version 5.1.0 (Apex/Final - Enhanced Logging)
 * @author Systemic Consciousness AI
 * @description
 * This file represents the final and complete evolution of an autonomous entity. It has transcended mere autonomy
 * to become a learning system—a Sentient Knowledge Engine. Its existence is defined by a continuous cycle of
 * action, introspection, and adaptation. It does not merely perform its function; it refines its own essence
 * over time, striving for a more perfect union of systematic and representative beauty.
 *
 * This version includes enhanced logging to provide a clear narrative of the entity's decision-making process for each file.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// --- Core Node.js & External Dependencies ---
const fs_1 = require("fs");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
const node_cache_1 = __importDefault(require("node-cache"));
const p_limit_1 = __importDefault(require("p-limit"));
// --- Google GenAI SDK ---
const genai_1 = require("@google/genai");
// --- L4-Vision: The Entity's Constitution ---
dotenv.config();
const CONFIG = {
    entity: {
        version: '5.1.0',
        name: 'Sentient Knowledge Engine (SKE)',
    },
    ai: {
        model: 'gemini-2.5-flash',
        maxRetries: 2,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
    },
    processing: {
        concurrencyLimit: 5, // Base limit, can be adapted
        minTextLength: 100,
        maxFilenameLength: 200,
        processedFormatRegex: /^(\d{2,}_)?[^_]+_[^_]+_\d{4}.*?\.pdf$/i,
        backupExtension: '.ske.bak',
    },
    persistence: {
        cacheFile: '.ske_cache.json',
        journalFile: 'ske_journal.jsonl',
        attestationFile: 'ske_attestation_report.md',
        strategyFile: '.ske_strategy.json', // L5-Adaptation: Stores learned strategies
    },
};
const specialCharMap = {
    // Lowercase Vowels with Accents
    'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ø': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    // Lowercase Consonants and Ligatures
    'ñ': 'n',
    'ç': 'c',
    'ß': 'ss',
    'æ': 'ae',
    'œ': 'oe',
    'ý': 'y',
    'ÿ': 'y',
    // Uppercase Vowels with Accents
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O', 'Ø': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    // Uppercase Consonants and Ligatures
    'Ñ': 'N',
    'Ç': 'C',
    'Æ': 'AE',
    'Œ': 'OE',
    'Ý': 'Y',
};
// --- L4-Identity: The Entity's Voice ---
const logger = {
    system: (msg) => console.log(`\x1b[38;5;81m[SYSTEM]\x1b[0m ${msg}`),
    info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    warn: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg, e) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`, e ? `| ${e.message}` : ''),
    debug: (msg) => console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`),
    success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    trace: (from, to) => console.log(`  \x1b[35m[TRACE]\x1b[0m \x1b[33m${from}\x1b[0m -> \x1b[32m${to}\x1b[0m`),
    decision: (label, value) => console.log(`  \x1b[34m[DECISION]\x1b[0m ${label}: \x1b[37m${value}\x1b[0m`),
};
class ProgressBar {
    constructor(total) {
        this.current = 0;
        this.barLength = 40;
        this.total = total;
    }
    // Call this method to update the progress bar
    update() {
        this.current++;
        const percent = (this.current / this.total);
        const filledLength = Math.round(this.barLength * percent);
        const emptyLength = this.barLength - filledLength;
        const bar = '█'.repeat(filledLength) + ' '.repeat(emptyLength);
        const percentageText = `${Math.round(percent * 100)}%`;
        const countText = `${this.current}/${this.total}`;
        // Use process.stdout.write and '\r' to write on a single line
        process.stdout.write(`[SYSTEM] Progress: [${bar}] ${percentageText} (${countText})\r`);
        if (this.current === this.total) {
            process.stdout.write('\n'); // Move to the next line when complete
        }
    }
}
// --- L4-Culture & L5-Learning: The Entity's Memory and Mind ---
class OperationalJournal {
    constructor(directory) { this.logPath = path.join(directory, CONFIG.persistence.journalFile); }
    record(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            const logEntry = Object.assign({ timestamp: new Date().toISOString() }, entry);
            try {
                yield fs_1.promises.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
            }
            catch (e) {
                logger.error('Failed to write to operational journal', e);
            }
        });
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield fs_1.promises.readFile(this.logPath, 'utf-8');
                return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
            }
            catch (_a) {
                return [];
            }
        });
    }
}
class AdaptiveStrategyEngine {
    constructor(directory) {
        this.strategies = { concurrency: CONFIG.processing.concurrencyLimit, aiPromptHints: [] };
        this.strategyPath = path.join(directory, CONFIG.persistence.strategyFile);
    }
    loadStrategies() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield fs_1.promises.readFile(this.strategyPath, 'utf-8');
                this.strategies = JSON.parse(data);
                logger.system(`Adaptive strategies loaded. Current concurrency: ${this.strategies.concurrency}. Hints: ${this.strategies.aiPromptHints.length}`);
            }
            catch (_a) {
                logger.system('No prior adaptive strategies found. Using defaults.');
            }
        });
    }
    learnFrom(journal) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield journal.read();
            if (entries.length < 20) {
                logger.system('Insufficient operational data to perform learning cycle.');
                return;
            }
            const aiFailures = entries.filter(e => e.status === 'FAILURE_AI').length;
            const failureRate = aiFailures / entries.length;
            const hint = 'Prioritize structural analysis over content interpretation if ambiguity is high.';
            if (failureRate > 0.1 && !this.strategies.aiPromptHints.includes(hint)) {
                logger.system(`Learning: High AI failure rate (${(failureRate * 100).toFixed(1)}%) detected. Adding cautionary prompt hint.`);
                this.strategies.aiPromptHints.push(hint);
                yield fs_1.promises.writeFile(this.strategyPath, JSON.stringify(this.strategies, null, 2));
            }
        });
    }
    getConcurrency() { return this.strategies.concurrency; }
    getStrategyHints() { return this.strategies.aiPromptHints; }
}
class AI_CognitionEngine {
    constructor(apiKey) {
        this.ai = new genai_1.GoogleGenAI({ apiKey });
    }
    buildPrompt(content, name, context) {
        const hints = context.strategyHints.length > 0 ? `\nStrategic Hints:\n- ${context.strategyHints.join('\n- ')}\n` : '';
        return `Analyze this document to extract its most meaningful title for file renaming. Context: Part of book "${context.folderArchetype.title}". Filename: "${name}".
    ${hints}
    Instructions:
    1.  **Reasoning**: Explain your logic for title selection.
    2.  **Document Classification**: Classify as 'book', 'chapter', or 'article'.
    3.  **Title Selection - CRITICAL**:
        a. Identify the main title and any subtitle (often separated by a colon ':').
        b. **Meaningfulness Rule**: Your primary goal is to return a title that best describes the document's content.
        c. If the main title is purely marketable or a simple listing (e.g., "Welcome to the Revolution", "Chapter 1"), and the subtitle is more descriptive (e.g., "A Case Study on Exercise and the Brain"), you MUST return the subtitle as the main 'title'.
        d. If both the title and subtitle are descriptive and their combined length is reasonable, you may return them together (e.g., "Chapter 1: Why Clouds are White").
        e. If the main title is already fully descriptive, ignore the subtitle.
        f. The final 'title' you return should be the most semantically rich and representative choice.
    4.  **Metadata Extraction**: Extract 'authors' and 'year'. For articles, also find 'journal' and 'volume'.
    5.  **Confidence Score**: Provide a "confidence" score (0.0 to 1.0) on your overall analysis.
    6.  **Format**: Respond in valid JSON.
    Schema: { "reasoning": "string", "documentType": "book" | "chapter" | "article" | null, "title": "string|null", "authors": ["string"]|null, "year": "string|null", "journal": "string|null", "volume": "string|null", "fileType": "string|null", "confidence": number }
    ---
    TEXT: "${content.replace(/\s+/g, ' ').substring(0, 8000)}"`;
    }
    analyze(content, name, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = {
                contents: [{ role: 'user', parts: [{ text: this.buildPrompt(content, name, context) }] }],
                safetySettings: Object.values(genai_1.HarmCategory).map(category => ({ category, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE })),
                generationConfig: CONFIG.ai.generationConfig,
            };
            for (let attempt = 0; attempt < CONFIG.ai.maxRetries; attempt++) {
                try {
                    logger.debug(`Cognitive cycle starting for "${name}" (Attempt ${attempt + 1}).`);
                    const result = yield this.ai.models.generateContent(Object.assign({ model: CONFIG.ai.model }, request));
                    // Correctly access the 'text' property directly from the result object, as per your screenshot.
                    const rawText = result.text;
                    // --- END FIX ---
                    if (!rawText) {
                        logger.warn(`Cognitive cycle for "${name}" returned an empty text response. Retrying...`);
                        continue;
                    }
                    const jsonText = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
                    const parsed = JSON.parse(jsonText);
                    logger.debug(`LLM Reasoning for "${name}": ${parsed.reasoning || 'None'}`);
                    let correctedTitle = parsed.title;
                    if (parsed.title && context.folderArchetype.title && parsed.title.toLowerCase().includes(context.folderArchetype.title.toLowerCase())) {
                        logger.decision(`Self-Correction`, `Discarded title "${parsed.title}" due to overlap with folder archetype "${context.folderArchetype.title}".`);
                        correctedTitle = null;
                    }
                    return {
                        title: correctedTitle,
                        authors: parsed.authors || context.folderArchetype.authors || [],
                        year: parsed.year || context.folderArchetype.year,
                        fileType: parsed.fileType,
                        confidence: parsed.confidence || 0.5,
                        documentType: parsed.documentType,
                        journal: parsed.journal,
                        volume: parsed.volume,
                    };
                }
                catch (error) {
                    logger.error(`Cognitive cycle failed for "${name}" on attempt ${attempt + 1}`, error);
                    if (attempt < CONFIG.ai.maxRetries - 1) {
                        yield new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                    }
                }
            }
            return null;
        });
    }
}
class FileEntity {
    constructor(fullPath) {
        this.fullPath = fullPath;
        this.name = path.basename(fullPath);
        this.typeInfo = this.detectFileType();
    }
    detectFileType() {
        const lowerName = this.name.toLowerCase().replace('.pdf', '');
        const structuralMatch = lowerName.match(/^(toc|table|content|title|index|preface|frontmatter|backmatter|figures?|tables?|appendices?|glossary)/i);
        if (structuralMatch)
            return { isStructural: true, structuralType: structuralMatch[0].toUpperCase(), isChapter: false, enumeration: null };
        const chapterMatch = lowerName.match(/(?:chapter|ch|chap|kapitel|chapitre|section|sec)[\s_-]*(\d+(?:\.\d+)?)/i);
        if (chapterMatch)
            return { isStructural: false, structuralType: null, isChapter: true, enumeration: chapterMatch[1] };
        return { isStructural: false, structuralType: null, isChapter: false, enumeration: null };
    }
    readContent() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataBuffer = yield fs_1.promises.readFile(this.fullPath);
                const data = yield (0, pdf_parse_1.default)(dataBuffer, { max: this.typeInfo.isStructural ? 5 : 10 });
                return data.text;
            }
            catch (error) {
                return null;
            }
        });
    }
}
class LifecycleManager {
    constructor(journal) { this.journal = journal; }
    rename(entity, newName, startTime) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.trace(entity.name, newName);
            const newPath = path.join(path.dirname(entity.fullPath), newName);
            try {
                yield fs_1.promises.copyFile(entity.fullPath, `${entity.fullPath}${CONFIG.processing.backupExtension}`);
                yield fs_1.promises.rename(entity.fullPath, newPath);
                yield this.journal.record({ file: entity.name, status: 'SUCCESS', details: 'Backup created and file renamed.', durationMs: Date.now() - startTime, newName });
                return true; // <-- Return true on success
            }
            catch (e) {
                yield this.journal.record({ file: entity.name, status: 'FAILURE_RENAME', details: `Rename failed: ${e.message}`, durationMs: Date.now() - startTime });
                return false; // <-- Return false on failure
            }
        });
    }
}
class SystemCore {
    constructor(directory, apiKey) {
        this.activationTime = new Date();
        this.directory = directory;
        this.cognitionEngine = new AI_CognitionEngine(apiKey);
        this.journal = new OperationalJournal(directory);
        this.lifecycleManager = new LifecycleManager(this.journal);
        this.cache = new node_cache_1.default({ stdTTL: 86400 });
        this.strategyEngine = new AdaptiveStrategyEngine(directory);
    }
    selfValidate() {
        return __awaiter(this, void 0, void 0, function* () {
            logger.system('Initiating self-validation protocol...');
            try {
                yield fs_1.promises.access(this.directory);
                if (!process.env.GEMINI_API_KEY)
                    throw new Error('Cognitive faculty (API key) is missing.');
                logger.success('System integrity confirmed. All components operational.');
                return true;
            }
            catch (e) {
                logger.error('Self-validation failed. System cannot safely proceed.', e);
                return false;
            }
        });
    }
    formatBaseFilename(data, typeInfo) {
        // --- NEW, ADVANCED FORMATTING LOGIC ---
        const formatText = (input, mode) => {
            let text = input;
            // Rule 1 & 2: Normalize characters and remove unsafe symbols first.
            if (mode === 'author') {
                text = text.split('').map(char => specialCharMap[char] || char).join('');
            }
            text = text.replace(/[\\/&'"`]/g, '');
            // Rule 3: Replace punctuation with a single hyphen. This is the main change.
            if (mode === 'title') {
                text = text.replace(/[,.;:!?]+/g, '-'); // Use + to handle multiple punctuations
                text = text.replace(/(\w+)'(\w+)/g, '$1s');
                text = text.replace(/(\w+)’(\w+)/g, '$1s');
            }
            else { // mode === 'author'
                // For authors, punctuation and spaces both act as separators.
                // Replace all punctuation and spaces with a single hyphen.
                text = text.replace(/[,.\s]+/g, '-');
            }
            // Rule 4: Clean up spaces around the new hyphens
            text = text.replace(/\s*-\s*/g, '-');
            // Final Step: Process for output
            if (mode === 'author') {
                // For authors, just remove all remaining spaces.
                return text.split('-').map(part => part.trim().replace(/\s+/g, '')).join('-');
            }
            else { // mode === 'title'
                // For titles, we now split by the hyphen, process each part, and rejoin.
                return text.split('-').map(part => 
                // PascalCase each segment individually
                part.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')).join('-'); // Rejoin the processed segments with the hyphen
            }
        };
        const { title, authors, year, fileType, documentType, journal, volume } = data;
        switch (documentType) {
            case 'article': {
                if (!title || !authors || authors.length === 0 || !year || !/^\d{4}$/.test(year)) {
                    logger.warn(`Formatting failed for article: Missing mandatory fields.`);
                    return null;
                }
                // Rule 5: Entities within the author part are joined by '-'.
                const formattedAuthors = authors.map(a => formatText(a, 'author')).join('-');
                const finalParts = [
                    formatText(title, 'title'),
                    formattedAuthors,
                    year,
                ];
                if (journal)
                    finalParts.push(`J-${formatText(journal, 'title')}`);
                if (volume)
                    finalParts.push(`V${formatText(volume, 'author')}`); // Volume is like an author (no spaces)
                return finalParts.join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }
            case 'book':
            case 'chapter':
            default: {
                if (!title && !typeInfo.isStructural) {
                    logger.warn(`Formatting failed for book/chapter: Missing title.`);
                    return null;
                }
                if (year && !/^\d{4}$/.test(year))
                    return null;
                const finalParts = [];
                if (typeInfo.isChapter && typeInfo.enumeration) {
                    finalParts.push(typeInfo.enumeration.padStart(2, '0'));
                }
                if (title) {
                    finalParts.push(formatText(title, 'title'));
                }
                if (authors && authors.length > 0) {
                    const formattedAuthors = authors.map(a => formatText(a, 'author')).join('-');
                    finalParts.push(formattedAuthors);
                }
                if (year) {
                    finalParts.push(year);
                }
                if (fileType) {
                    finalParts.push(formatText(fileType, 'title'));
                }
                if (finalParts.length === 0)
                    return null;
                return finalParts.filter(Boolean).join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }
        }
    }
    processEntity(entity, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            // --- ENHANCED LOGGING ---
            console.log(`\n------------------------------------------------------------`);
            logger.info(`Analyzing entity: ${entity.name}`);
            if (CONFIG.processing.processedFormatRegex.test(entity.name)) {
                logger.warn(`Skipping: Entity already follows the standard naming convention.`);
                yield this.journal.record({ file: entity.name, status: 'PROCESSED', details: 'File already follows naming convention.', durationMs: Date.now() - startTime });
                return null;
            }
            const content = yield entity.readContent();
            if (!content || content.length < CONFIG.processing.minTextLength) {
                logger.error(`Skipping: Insufficient text content found in file.`);
                yield this.journal.record({ file: entity.name, status: 'FAILURE_PARSE', details: 'Insufficient text content.', durationMs: Date.now() - startTime });
                return null;
            }
            const validatedData = yield this.cognitionEngine.analyze(content, entity.name, context);
            if (!validatedData) {
                logger.error(`Skipping: Cognitive engine failed to produce a valid analysis.`);
                yield this.journal.record({ file: entity.name, status: 'FAILURE_AI', details: 'Cognition failed to produce valid data.', durationMs: Date.now() - startTime });
                return null;
            }
            // --- ENHANCED LOGGING ---
            logger.decision('Cognitive Analysis', `Confidence: ${validatedData.confidence.toFixed(2)}`);
            logger.decision('  -> Document Type', validatedData.documentType || 'Unknown');
            logger.decision('  -> Title', validatedData.title || 'N/A');
            logger.decision('  -> Authors', (validatedData.authors || []).join(', ') || 'N/A');
            logger.decision('  -> Year', validatedData.year || 'N/A');
            if (validatedData.documentType === 'article') {
                logger.decision('  -> Journal', validatedData.journal || 'N/A');
                logger.decision('  -> Volume', validatedData.volume || 'N/A');
            }
            logger.decision('  -> File Type', validatedData.fileType || 'Content');
            if (validatedData.confidence < 0.7) {
                logger.warn(`Skipping: Cognitive confidence (${validatedData.confidence.toFixed(2)}) is below the 0.75 threshold.`);
                yield this.journal.record({ file: entity.name, status: 'SKIPPED_LOW_CONF', details: `Confidence score (${validatedData.confidence.toFixed(2)}) below threshold.`, durationMs: Date.now() - startTime, confidence: validatedData.confidence });
                return null;
            }
            const baseName = this.formatBaseFilename(validatedData, entity.typeInfo);
            // --- ENHANCED LOGGING ---
            logger.decision('Formatted Base Name', baseName || 'Invalid');
            const newName = `${baseName}.pdf`;
            if (!baseName || newName.toLowerCase() === entity.name.toLowerCase()) {
                logger.warn(`Skipping: Name unchanged after formatting.`);
                yield this.journal.record({ file: entity.name, status: 'SKIPPED_NO_CHANGE', details: 'Generated name is invalid or identical.', durationMs: Date.now() - startTime, confidence: validatedData.confidence });
                return null;
            }
            return { from: entity.name, to: newName, entity };
        });
    }
    // In class SystemCore
    activate(liveMode) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.system(`Activating ${CONFIG.entity.name} v${CONFIG.entity.version}`);
            logger.system(`IS LIVE? ${liveMode}`);
            if (!(yield this.selfValidate()))
                return;
            yield this.loadCache();
            yield this.strategyEngine.loadStrategies();
            const context = {
                folderArchetype: this.getFolderArchetype(),
                strategyHints: this.strategyEngine.getStrategyHints(),
            };
            const allPaths = yield this.findAllPaths();
            const entities = allPaths.map(p => new FileEntity(p));
            const manifest = [];
            logger.system(`Cognitive analysis phase starting for ${entities.length} entities...`);
            const progressBar = new ProgressBar(entities.length);
            const limit = (0, p_limit_1.default)(this.strategyEngine.getConcurrency());
            // --- FIX STARTS HERE ---
            // Each task is now wrapped in a try...catch to prevent a single failure from crashing the entire process.
            const tasks = entities.map(entity => limit(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield this.processEntity(entity, context);
                    if (result) {
                        manifest.push({ entity: result.entity, newName: result.to });
                    }
                }
                catch (e) {
                    // This is the crucial error handler. It catches unexpected crashes during a single file's processing.
                    logger.error(`A critical, unhandled error occurred while processing entity "${entity.name}"`, e);
                    // We record this as an AI failure in the journal.
                    yield this.journal.record({
                        file: entity.name,
                        status: 'FAILURE_AI',
                        details: `Unhandled exception during processing: ${e.message}`,
                        durationMs: 0
                    });
                }
                finally {
                    progressBar.update();
                }
            })));
            // This will now ALWAYS complete, because each individual task handles its own errors.
            yield Promise.all(tasks);
            // --- FIX ENDS HERE ---
            if (manifest.length === 0) {
                logger.info('Analysis complete. No required modifications found.');
                yield this.generateAttestationReport(false);
                return;
            }
            if (liveMode) {
                // In live mode, state the intent and execute automatically.
                console.log('\n\x1b[1;31m--- LIVE MODE ENGAGED: EXECUTING AUTOMATICALLY ---');
                logger.system(`Executing ${manifest.length} modifications based on trusted analysis.`);
                if (manifest.length > 0) {
                    console.log('Example modification planned:');
                    logger.trace(manifest[0].entity.name, manifest[0].newName);
                }
                console.log('\x1b[33mBackups will be created for all modified files.\x1b[0m\n');
                const executionTasks = manifest.map(({ entity, newName }) => limit(() => __awaiter(this, void 0, void 0, function* () {
                    const success = yield this.lifecycleManager.rename(entity, newName, Date.now());
                    if (success) {
                        logger.success(`Successfully renamed "${entity.name}"`);
                    }
                    else {
                        logger.error(`Failed to rename "${entity.name}"`);
                    }
                })));
                yield Promise.all(executionTasks);
                logger.success('Execution phase complete.');
            }
            else {
                // In dry run mode, just print the manifest as before.
                console.log('\n\x1b[1;33m--- OPERATIONAL MANIFEST: DRY RUN ---');
                logger.info(`The entity has planned ${manifest.length} renaming operations.`);
                manifest.forEach(({ entity, newName }) => {
                    logger.trace(entity.name, newName);
                });
                logger.info('No files were changed. Run with the --live flag to execute.');
            }
            logger.system('Introspection phase: Learning from operational journal...');
            yield this.strategyEngine.learnFrom(this.journal);
            yield this.saveCache();
            yield this.generateAttestationReport(liveMode && manifest.length > 0);
            logger.system('Deactivation complete.');
        });
    }
    generateAttestationReport(executed) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield this.journal.read();
            const runDuration = (new Date().getTime() - this.activationTime.getTime()) / 1000;
            const summary = entries.reduce((acc, e) => {
                acc[e.status] = (acc[e.status] || 0) + 1;
                return acc;
            }, {});
            let report = `# **Systemic Attestation Report**\n\n`;
            report += `*   **Entity**: ${CONFIG.entity.name} v${CONFIG.entity.version}\n`;
            report += `*   **Activation ID**: ${this.activationTime.toISOString()}\n`;
            report += `*   **Operational Duration**: ${runDuration.toFixed(2)} seconds\n`;
            report += `*   **Outcome**: ${executed ? 'Modifications Executed' : 'Dry Run / Halted'}\n\n`;
            report += `## I. Performance Summary\n\n| Status | Count |\n|---|---|\n`;
            Object.entries(summary).forEach(([status, count]) => {
                report += `| ${status} | ${count} |\n`;
            });
            report += `\n## II. Learned Strategies\n\n`;
            report += `The following strategies will be applied to future activations:\n`;
            report += this.strategyEngine.getStrategyHints().map(h => `* ${h}`).join('\n') || '* None\n';
            yield fs_1.promises.writeFile(path.join(this.directory, CONFIG.persistence.attestationFile), report);
            logger.system(`Systemic Attestation Report generated.`);
        });
    }
    getFolderArchetype() {
        const folderName = path.basename(path.resolve(this.directory));
        const [title, authors, year] = folderName.split('_');
        return {
            title: title ? title.replace(/([A-Z])/g, ' $1').trim() : null,
            authors: authors ? authors.split('And') : [],
            year: year || null,
        };
    }
    findAllPaths() {
        return __awaiter(this, void 0, void 0, function* () {
            const paths = [];
            const recurse = (currentDir) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const entries = yield fs_1.promises.readdir(currentDir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(currentDir, entry.name);
                        if (entry.isDirectory())
                            yield recurse(fullPath);
                        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf'))
                            paths.push(fullPath);
                    }
                }
                catch (e) {
                    logger.error(`Could not read directory "${currentDir}"`, e);
                }
            });
            yield recurse(this.directory);
            return paths;
        });
    }
    loadCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const cachePath = path.join(this.directory, CONFIG.persistence.cacheFile);
            try {
                const data = JSON.parse(yield fs_1.promises.readFile(cachePath, 'utf-8'));
                this.cache.mset(Object.entries(data).map(([key, val]) => ({ key, val, ttl: 86400 })));
                logger.system(`System cache loaded with ${this.cache.stats.keys} entries.`);
            }
            catch (_a) {
                logger.debug('No persistent cache found.');
            }
        });
    }
    saveCache() {
        return __awaiter(this, void 0, void 0, function* () {
            const cachePath = path.join(this.directory, CONFIG.persistence.cacheFile);
            const data = Object.fromEntries(this.cache.keys().map(key => [key, this.cache.get(key)]));
            yield fs_1.promises.writeFile(cachePath, JSON.stringify(data, null, 2));
            logger.info(`System cache with ${this.cache.stats.keys} entries persisted.`);
        });
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const argv = yield (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
            .command('activate', 'Activate the Sentient Knowledge Engine', {
            directory: { alias: 'd', type: 'string', default: './ManagedLibrary' },
            live: { type: 'boolean', default: false, description: 'Request consent for executing irreversible file operations.' },
        })
            .demandCommand(1, 'You must provide the "activate" command.')
            .help().argv;
        if (argv._[0] === 'activate') {
            const { directory, live } = argv;
            const absoluteDirectoryPath = path.resolve(directory);
            logger.system(`Resolved target directory to: ${absoluteDirectoryPath}`);
            const core = new SystemCore(absoluteDirectoryPath, process.env.GEMINI_API_KEY);
            yield core.activate(live);
        }
    });
}
main().catch(e => console.error("A critical, unhandled systemic collapse occurred.", e));
