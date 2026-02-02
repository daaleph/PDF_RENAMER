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
var _a, _b, _c, _d;
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
// At top of file
dotenv.config();
// Then in AI_CognitionEngine
const API_KEYS = ((_b = (_a = process.env.GEMINI_API_KEYS) === null || _a === void 0 ? void 0 : _a.split(',')) === null || _b === void 0 ? void 0 : _b.map(k => k.trim())) || [];
const CONFIG = {
    entity: {
        version: '5.2.0',
        name: 'Sentient Knowledge Engine (SKE)',
    },
    ai: {
        models: [
            'gemini-3-flash-preview', // Primary / first attempt
            'gemini-flash-latest', // Fallback 1
            'gemini-flash-lite-latest', // Fallback 2 (corrected typo "fash" → "flash")
            'gemini-2.5-flash', // Fallback 3
            'gemini-2.5-flash-lite' // Fallback 4 (final)
        ],
        maxRetriesPerModel: 6,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
    },
    processing: {
        concurrencyLimit: 5,
        minTextLength: 100,
        maxFilenameLength: 200,
        processedFormatRegex: /^(\d{2,}_)?[^_]+_[^_]+_\d{4}(_[^_]+)*\.pdf$/i,
        backupExtension: '.ske.bak',
    },
    persistence: {
        cacheFile: '.ske_cache.json',
        journalFile: 'ske_journal.jsonl',
        attestationFile: 'ske_attestation_report.md',
        strategyFile: '.ske_strategy.json'
    },
    retry: {
        delayMinutes: 15, // General system retry
        keyExhaustionBackoffBase: 60, // Base seconds to wait when ALL keys are 429'd
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
    constructor() {
        // No longer requires apiKey in constructor
        logger.system(`Cognition Engine initialized with pool of ${AI_CognitionEngine.API_KEYS.length} keys.`);
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
    // --- MODIFIED ANALYZE METHOD ---
    analyze(content, name, context) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseRequest = {
                contents: [{ role: 'user', parts: [{ text: this.buildPrompt(content, name, context) }] }],
                safetySettings: Object.values(genai_1.HarmCategory).map(category => ({ category, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE })),
                generationConfig: CONFIG.ai.generationConfig,
            };
            // --- Outer Loop: Iterate through Models ---
            for (const model of CONFIG.ai.models) {
                logger.system(`Attempting cognitive analysis with model "${model}" for "${name}"`);
                let fullKeyCycleCount = 0;
                const MAX_CYCLES = 10; // How many times we loop through ALL keys before giving up on this model
                // Record where we started to detect if we wrapped around
                const cycleStartIndex = AI_CognitionEngine.currentKeyIndex;
                while (fullKeyCycleCount < MAX_CYCLES) {
                    // 1. Select Key
                    const apiKey = AI_CognitionEngine.API_KEYS[AI_CognitionEngine.currentKeyIndex];
                    const keyIndexDisplay = AI_CognitionEngine.currentKeyIndex + 1;
                    try {
                        logger.debug(`Cognitive cycle (model: ${model}, key: ${keyIndexDisplay}/${AI_CognitionEngine.API_KEYS.length}) for "${name}"`);
                        // 2. Initialize Client with specific key for this request
                        const client = new genai_1.GoogleGenAI({ apiKey });
                        const result = yield client.models.generateContent(Object.assign({ model }, baseRequest));
                        const rawText = result.text;
                        if (!rawText)
                            throw new Error('Empty text response from API');
                        const jsonText = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
                        const parsed = JSON.parse(jsonText);
                        logger.debug(`LLM Reasoning (model: ${model}) for "${name}": ${parsed.reasoning || 'None'}`);
                        let correctedTitle = parsed.title;
                        if (parsed.title && context.folderArchetype.title && parsed.title.toLowerCase().includes(context.folderArchetype.title.toLowerCase())) {
                            logger.decision(`Self-Correction`, `Discarded title "${parsed.title}" due to overlap with folder archetype.`);
                            correctedTitle = null;
                        }
                        // SUCCESS: Increment key index for next file (Load Balancing)
                        AI_CognitionEngine.currentKeyIndex = (AI_CognitionEngine.currentKeyIndex + 1) % AI_CognitionEngine.API_KEYS.length;
                        logger.success(`Successful analysis for "${name}" using model "${model}" (Key ${keyIndexDisplay})`);
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
                        // --- ERROR HANDLING ---
                        const isRateLimit = (error === null || error === void 0 ? void 0 : error.code) === 429 || (error === null || error === void 0 ? void 0 : error.status) === 'RESOURCE_EXHAUSTED';
                        if (isRateLimit) {
                            logger.warn(`Rate limit hit on Key ${keyIndexDisplay}. Switching to next key.`);
                            // Move to next key immediately
                            AI_CognitionEngine.currentKeyIndex = (AI_CognitionEngine.currentKeyIndex + 1) % AI_CognitionEngine.API_KEYS.length;
                            // Check if we have wrapped around (tried every key)
                            if (AI_CognitionEngine.currentKeyIndex === cycleStartIndex) {
                                // We have exhausted all keys. Wait before restarting cycle.
                                fullKeyCycleCount++;
                                const waitTime = Math.min(CONFIG.retry.keyExhaustionBackoffBase * Math.pow(2, fullKeyCycleCount), 600);
                                logger.warn(`All ${AI_CognitionEngine.API_KEYS.length} keys exhausted for model "${model}". Waiting ${waitTime}s...`);
                                yield new Promise(resolve => setTimeout(resolve, waitTime * 1000));
                            }
                            else {
                                // Continue loop to try next key immediately
                                continue;
                            }
                        }
                        else {
                            // Non-retryable error (e.g. 400, 401)
                            logger.error(`Non-retryable error with Key ${keyIndexDisplay}.`, error);
                            // Break the while loop to try the next MODEL
                            break;
                        }
                    }
                }
                logger.warn(`Model "${model}" failed after exhausting all key cycles. Trying next model.`);
            }
            // All models and keys failed
            logger.error(`All configured models and keys failed for "${name}". Skipping this file.`);
            return null;
        });
    }
}
// --- MODIFIED: API Key Pool ---
AI_CognitionEngine.API_KEYS = ((_d = (_c = process.env.GEMINI_API_KEYS) === null || _c === void 0 ? void 0 : _c.split(',')) === null || _d === void 0 ? void 0 : _d.map(k => k.trim())) || [];
// Static state to maintain round-robin position across all files/requests
AI_CognitionEngine.currentKeyIndex = 0;
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
            const backupPath = `${entity.fullPath}${CONFIG.processing.backupExtension}`;
            logger.debug(`Original path: ${entity.fullPath}`);
            logger.debug(`New path: ${newPath}`);
            logger.debug(`Backup path: ${backupPath}`);
            try {
                // Verificar que el archivo original existe
                yield fs_1.promises.access(entity.fullPath);
                logger.debug(`✓ Original file exists`);
                // Crear backup
                yield fs_1.promises.copyFile(entity.fullPath, backupPath);
                logger.debug(`✓ Backup created`);
                // Renombrar
                yield fs_1.promises.rename(entity.fullPath, newPath);
                logger.debug(`✓ File renamed`);
                // Eliminar backup
                yield fs_1.promises.unlink(backupPath);
                logger.success(`Backup cleaned up for "${entity.name}"`);
                // Verificar que el nuevo archivo existe
                yield fs_1.promises.access(newPath);
                logger.success(`✓ Verified new file exists at: ${newPath}`);
                yield this.journal.record({
                    file: entity.name,
                    status: 'SUCCESS',
                    details: 'Backup created, file renamed, and backup deleted.',
                    durationMs: Date.now() - startTime,
                    newName
                });
                return true;
            }
            catch (e) {
                logger.error(`RENAME FAILED for "${entity.name}": ${e.message}`, e);
                logger.error(`  Original: ${entity.fullPath}`);
                logger.error(`  Target: ${newPath}`);
                yield this.journal.record({
                    file: entity.name,
                    status: 'FAILURE_RENAME',
                    details: `Rename failed: ${e.message}. Backup retained.`,
                    durationMs: Date.now() - startTime
                });
                return false;
            }
        });
    }
}
class SystemCore {
    // MODIFIED: Constructor no longer takes apiKey
    constructor(directory) {
        this.activationTime = new Date();
        this.directory = directory;
        this.cognitionEngine = new AI_CognitionEngine(); // No args
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
                // REMOVED: Check for GEMINI_API_KEY env var as we use hardcoded pool
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
        const formatText = (input, mode) => {
            let text = input;
            if (mode === 'author')
                text = text.split('').map(char => specialCharMap[char] || char).join('');
            text = text.replace(/[\\/&'"`]/g, '');
            if (mode === 'title') {
                text = text.replace(/[,.;:!?]+/g, '-');
                text = text.replace(/(\w+)'(\w+)/g, '$1s');
                text = text.replace(/(\w+)’(\w+)/g, '$1s');
            }
            else {
                text = text.replace(/[,.\s]+/g, '-');
            }
            text = text.replace(/\s*-\s*/g, '-');
            if (mode === 'author') {
                return text.split('-').map(part => part.trim().replace(/\s+/g, '')).join('-');
            }
            else {
                return text.split('-').map(part => part.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')).join('-');
            }
        };
        const formatAuthors = (authors) => {
            if (!authors || authors.length === 0)
                return '';
            if (authors.length === 1) {
                return formatText(authors[0], 'author');
            }
            // Si hay 2 o más autores: Primer autor + "EtAl"
            return `${formatText(authors[0], 'author')}-EtAl`;
        };
        const { title, authors, year, fileType, documentType, journal, volume } = data;
        switch (documentType) {
            case 'article': {
                if (!title || !authors || authors.length === 0 || !year || !/^\d{4}$/.test(year))
                    return null;
                const formattedAuthors = formatAuthors(authors); // CAMBIADO
                const finalParts = [formatText(title, 'title'), formattedAuthors, year];
                if (journal)
                    finalParts.push(`J-${formatText(journal, 'title')}`);
                if (volume)
                    finalParts.push(`V${formatText(volume, 'author')}`);
                return finalParts.join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }
            case 'book':
            case 'chapter':
            default: {
                if (!title && !typeInfo.isStructural)
                    return null;
                if (year && !/^\d{4}$/.test(year))
                    return null;
                const finalParts = [];
                if (typeInfo.isChapter && typeInfo.enumeration)
                    finalParts.push(typeInfo.enumeration.padStart(2, '0'));
                if (title)
                    finalParts.push(formatText(title, 'title'));
                if (authors && authors.length > 0)
                    finalParts.push(formatAuthors(authors)); // CAMBIADO
                if (year)
                    finalParts.push(year);
                if (fileType)
                    finalParts.push(formatText(fileType, 'title'));
                if (finalParts.length === 0)
                    return null;
                return finalParts.filter(Boolean).join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }
        }
    }
    hasAbnormallyLongWord(filename) {
        const base = path.basename(filename, '.pdf');
        const rawParts = base.split(/[_-]|\d+/).filter(part => part.length > 0);
        const MAX_WORD_LENGTH = 30;
        for (const part of rawParts) {
            if (part.length < 16)
                continue;
            const words = part.split(/(?=[A-Z])/).filter(w => w.length > 0);
            for (const word of words) {
                const cleaned = word.replace(/^[^A-Za-z]+/, '');
                if (cleaned.length > MAX_WORD_LENGTH)
                    return true;
            }
        }
        return false;
    }
    processEntity(entity, context, journalMemory) {
        return __awaiter(this, void 0, void 0, function* () {
            const startTime = Date.now();
            console.log(`\n------------------------------------------------------------`);
            logger.info(`Analyzing entity: ${entity.name}`);
            const looksProcessed = CONFIG.processing.processedFormatRegex.test(entity.name);
            const hasAbnormalTitle = this.hasAbnormallyLongWord(entity.name);
            if (looksProcessed && !hasAbnormalTitle) {
                logger.warn(`Skipping: Entity already follows the standard naming convention and appears readable.`);
                yield this.journal.record({
                    file: entity.name, status: 'PROCESSED',
                    details: 'File already follows naming convention and has no abnormally long concatenated words.',
                    durationMs: Date.now() - startTime
                });
                return null;
            }
            const previousAttempt = journalMemory.get(entity.fullPath);
            if (previousAttempt && previousAttempt.status === 'SUCCESS') {
                logger.info(`Skipping: "${entity.name}" was successfully processed in a previous run.`);
                return null;
            }
            if (previousAttempt && previousAttempt.status === 'FAILURE_RENAME' && previousAttempt.newName) {
                logger.info(`RECOVERY MODE: Previous rename failed. Reusing cached target: "${previousAttempt.newName}"`);
                return { from: entity.name, to: previousAttempt.newName, entity };
            }
            if (previousAttempt && previousAttempt.status === 'FAILURE_AI') {
                logger.warn(`RETRY MODE: Previous AI analysis failed. Retrying full cognitive process.`);
            }
            if (looksProcessed && hasAbnormalTitle && (previousAttempt === null || previousAttempt === void 0 ? void 0 : previousAttempt.status) !== 'FAILURE_RENAME') {
                logger.info(`Forcing reprocessing: Detected abnormally long concatenated words in title despite matching format.`);
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
            logger.decision('Cognitive Analysis', `Confidence: ${validatedData.confidence.toFixed(2)}`);
            logger.decision(' -> Document Type', validatedData.documentType || 'Unknown');
            logger.decision(' -> Title', validatedData.title || 'N/A');
            logger.decision(' -> Authors', (validatedData.authors || []).join(', ') || 'N/A');
            logger.decision(' -> Year', validatedData.year || 'N/A');
            if (validatedData.confidence < 0.7) {
                logger.warn(`Skipping: Cognitive confidence (${validatedData.confidence.toFixed(2)}) is below the 0.75 threshold.`);
                yield this.journal.record({ file: entity.name, status: 'SKIPPED_LOW_CONF', details: `Confidence score below threshold.`, durationMs: Date.now() - startTime, confidence: validatedData.confidence });
                return null;
            }
            const baseName = this.formatBaseFilename(validatedData, entity.typeInfo);
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
    activate(liveMode) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.system(`Activating ${CONFIG.entity.name} v${CONFIG.entity.version}`);
            logger.system(`LIVE MODE: ${liveMode}`);
            if (!(yield this.selfValidate()))
                return;
            yield this.loadCache();
            yield this.strategyEngine.loadStrategies();
            const baseContext = {
                folderArchetype: this.getFolderArchetype(),
                strategyHints: this.strategyEngine.getStrategyHints(),
            };
            if (!liveMode) {
                yield this.runSingleCycle(baseContext, true);
            }
            else {
                let cycle = 0;
                const maxCycles = 50;
                while (cycle < maxCycles) {
                    cycle++;
                    logger.system(`\n=== Starting processing cycle ${cycle}/${maxCycles} ===`);
                    const success = yield this.runSingleCycle(baseContext, false);
                    if (!success.shouldContinue) {
                        logger.system('All files successfully processed or no further progress possible.');
                        break;
                    }
                    if (success.hasFailures) {
                        logger.system(`Failures detected. Waiting ${CONFIG.retry.delayMinutes} minutes before retry cycle...`);
                        yield new Promise(resolve => setTimeout(resolve, CONFIG.retry.delayMinutes * 60 * 1000));
                    }
                    else {
                        logger.system('Cycle completed with no failures. Proceeding to next cycle if needed.');
                    }
                }
                if (cycle >= maxCycles)
                    logger.warn('Maximum retry cycles reached. Stopping to prevent infinite execution.');
            }
            logger.system('Introspection phase: Learning from operational journal...');
            yield this.strategyEngine.learnFrom(this.journal);
            yield this.saveCache();
            yield this.generateAttestationReport(liveMode);
            logger.system('Deactivation complete.');
        });
    }
    runSingleCycle(context, isDryRun) {
        return __awaiter(this, void 0, void 0, function* () {
            const journalBefore = yield this.journal.read();
            const previousLength = journalBefore.length;
            const journalMemory = yield this.loadJournalMemory();
            logger.system(`Loaded ${journalMemory.size} historical states into active memory.`);
            const allPaths = yield this.findAllPaths();
            if (allPaths.length === 0) {
                logger.system('No PDF files found.');
                return { hasFailures: false, shouldContinue: false };
            }
            const entities = allPaths.map(p => new FileEntity(p));
            const manifest = [];
            logger.system(`Cognitive analysis phase starting for ${entities.length} entities...`);
            const progressBar = new ProgressBar(entities.length);
            const limit = (0, p_limit_1.default)(this.strategyEngine.getConcurrency());
            const tasks = entities.map(entity => limit(() => __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield this.processEntity(entity, context, journalMemory);
                    if (result)
                        manifest.push({ entity: result.entity, newName: result.to });
                }
                catch (e) {
                    logger.error(`Unhandled error processing "${entity.name}"`, e);
                    yield this.journal.record({ file: entity.name, status: 'FAILURE_AI', details: `Unhandled exception: ${e.message}`, durationMs: 0 });
                }
                finally {
                    progressBar.update();
                }
            })));
            yield Promise.all(tasks);
            const journalAfter = yield this.journal.read();
            const cycleEntries = journalAfter.slice(previousLength);
            const failureStatuses = ['FAILURE_PARSE', 'FAILURE_AI', 'FAILURE_RENAME', 'SKIPPED_LOW_CONF'];
            const hasFailures = cycleEntries.some(e => failureStatuses.includes(e.status));
            const onlyGoodSkips = cycleEntries.length > 0 && cycleEntries.every(e => ['PROCESSED', 'SKIPPED_NO_CHANGE', 'SUCCESS'].includes(e.status));
            if (manifest.length === 0 && onlyGoodSkips)
                return { hasFailures: false, shouldContinue: false };
            if (isDryRun) {
                console.log('\n\x1b[1;33m--- OPERATIONAL MANIFEST: DRY RUN ---\x1b[0m');
                logger.info(`Planned ${manifest.length} renaming operations.`);
                manifest.forEach(m => logger.trace(m.entity.name, m.newName));
                logger.info('No files changed (dry run).');
            }
            else {
                console.log(`\n\x1b[1;32m--- EXECUTING ${manifest.length} RENAMES ---\x1b[0m`);
                if (manifest.length > 0) {
                    logger.trace(manifest[0].entity.name, manifest[0].newName);
                    console.log('(further traces suppressed for brevity)');
                }
                const renameLimit = (0, p_limit_1.default)(5);
                const renameTasks = manifest.map(m => renameLimit(() => __awaiter(this, void 0, void 0, function* () {
                    const start = Date.now();
                    yield this.lifecycleManager.rename(m.entity, m.newName, start);
                })));
                yield Promise.all(renameTasks);
            }
            return { hasFailures, shouldContinue: true };
        });
    }
    generateAttestationReport(wasLiveMode) {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield this.journal.read();
            const runDuration = (new Date().getTime() - this.activationTime.getTime()) / 1000;
            const summary = entries.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});
            const successEntries = entries.filter(e => e.status === 'SUCCESS');
            const remainingPaths = yield this.findAllPaths();
            const unprocessedEntities = remainingPaths.map(p => new FileEntity(p)).filter(e => {
                const looksProcessed = CONFIG.processing.processedFormatRegex.test(e.name);
                const hasAbnormal = this.hasAbnormallyLongWord(e.name);
                return !looksProcessed || hasAbnormal;
            });
            let report = `# **Systemic Attestation Report**\n\n`;
            report += `*   **Entity**: ${CONFIG.entity.name} v${CONFIG.entity.version}\n`;
            report += `*   **Activation ID**: ${this.activationTime.toISOString()}\n`;
            report += `*   **Operational Duration**: ${runDuration.toFixed(2)} seconds\n`;
            report += `*   **Mode**: ${wasLiveMode ? 'Live (changes executed)' : 'Dry Run (no changes)'}\n\n`;
            report += `## I. Performance Summary\n\n| Status | Count |\n|---|---|\n`;
            Object.entries(summary).forEach(([status, count]) => { report += `| ${status} | ${count} |\n`; });
            report += `\n`;
            if (wasLiveMode && successEntries.length > 0) {
                report += `## II. Successful Renaming Operations (${successEntries.length})\n\n`;
                successEntries.forEach(e => { report += `- \`${e.file}\` → \`${e.newName}\`\n`; });
                report += `\n`;
            }
            report += `## III. Persistently Unprocessed Files (${unprocessedEntities.length})\n\n`;
            if (unprocessedEntities.length > 0) {
                unprocessedEntities.forEach(e => { const rel = path.relative(this.directory, e.fullPath); report += `- ${rel} (current name: \`${e.name}\`)\n`; });
                report += `\nThese files could not be successfully renamed after all retry attempts.\n`;
            }
            else {
                report += `**All PDF files were successfully processed and renamed.**\n`;
            }
            report += `\n`;
            report += `## IV. Learned Strategies\n\n`;
            report += this.strategyEngine.getStrategyHints().map(h => `* ${h}`).join('\n') || '* None\n';
            yield fs_1.promises.writeFile(path.join(this.directory, CONFIG.persistence.attestationFile), report);
            logger.system(`Attestation report generated: ${CONFIG.persistence.attestationFile}`);
        });
    }
    getFolderArchetype() {
        const folderName = path.basename(path.resolve(this.directory));
        const [title, authors, year] = folderName.split('_');
        return { title: title ? title.replace(/([A-Z])/g, ' $1').trim() : null, authors: authors ? authors.split('And') : [], year: year || null };
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
    loadJournalMemory() {
        return __awaiter(this, void 0, void 0, function* () {
            const entries = yield this.journal.read();
            const memory = new Map();
            for (let i = entries.length - 1; i >= 0; i--) {
                const entry = entries[i];
                const absolutePath = path.resolve(this.directory, entry.file);
                if (!memory.has(absolutePath))
                    memory.set(absolutePath, entry);
            }
            return memory;
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
            // MODIFIED: Instantiation no longer requires process.env.GEMINI_API_KEY
            const core = new SystemCore(absoluteDirectoryPath);
            yield core.activate(live);
        }
    });
}
main().catch(e => console.error("A critical, unhandled systemic collapse occurred.", e));
