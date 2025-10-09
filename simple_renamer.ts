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

// --- Core Node.js & External Dependencies ---
import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pdf from 'pdf-parse';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';

// --- Google GenAI SDK ---
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerationConfig } from '@google/genai';

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

const specialCharMap: { [key: string]: string } = {
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

// --- L0-Ontology: The Entity's Worldview ---

interface BookArchetype { title: string | null; authors: string[] | null; year: string | null; }
interface FileTypeInfo { isStructural: boolean; structuralType: string | null; isChapter: boolean; enumeration: string | null; }
interface ProcessingContext { folderArchetype: BookArchetype; strategyHints: string[]; }
interface LLMResponse { 
    reasoning: string; 
    title: string | null; 
    authors: string[] | null; 
    year: string | null; 
    fileType: string | null; 
    confidence: number; 
    // --- ADDITIONS ---
    documentType: 'book' | 'chapter' | 'article' | null;
    journal: string | null;
    volume: string | null;
}
interface ValidatedData { 
    title: string | null; 
    authors: string[]; 
    year: string | null; 
    fileType: string | null; 
    confidence: number; 
    // --- ADDITIONS ---
    documentType: 'book' | 'chapter' | 'article' | null;
    journal: string | null;
    volume: string | null;
}
type JournalEntryStatus = 'SUCCESS' | 'FAILURE_PARSE' | 'FAILURE_AI' | 'FAILURE_RENAME' | 'SKIPPED_NO_CHANGE' | 'SKIPPED_LOW_CONF' | 'PROCESSED';
interface JournalEntry { timestamp: string; file: string; status: JournalEntryStatus; details: string; durationMs: number; confidence?: number; newName?: string; }

// --- L4-Identity: The Entity's Voice ---
const logger = {
    system: (msg: string) => console.log(`\x1b[38;5;81m[SYSTEM]\x1b[0m ${msg}`),
    info: (msg: string) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
    warn: (msg: string) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
    error: (msg: string, e?: Error) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`, e ? `| ${e.message}` : ''),
    debug: (msg: string) => console.log(`\x1b[90m[DEBUG]\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
    trace: (from: string, to: string) => console.log(`  \x1b[35m[TRACE]\x1b[0m \x1b[33m${from}\x1b[0m -> \x1b[32m${to}\x1b[0m`),
    decision: (label: string, value: any) => console.log(`  \x1b[34m[DECISION]\x1b[0m ${label}: \x1b[37m${value}\x1b[0m`),
};

// --- L4-Culture & L5-Learning: The Entity's Memory and Mind ---
class OperationalJournal {
    private logPath: string;
    constructor(directory: string) { this.logPath = path.join(directory, CONFIG.persistence.journalFile); }
    async record(entry: Omit<JournalEntry, 'timestamp'>): Promise<void> {
        const logEntry: JournalEntry = { timestamp: new Date().toISOString(), ...entry };
        try { await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n'); } catch (e) { logger.error('Failed to write to operational journal', e as Error); }
    }
    async read(): Promise<JournalEntry[]> {
        try {
            const data = await fs.readFile(this.logPath, 'utf-8');
            return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
        } catch { return []; }
    }
}

class AdaptiveStrategyEngine {
    private strategies: { concurrency: number; aiPromptHints: string[] } = { concurrency: CONFIG.processing.concurrencyLimit, aiPromptHints: [] };
    private strategyPath: string;

    constructor(directory: string) { this.strategyPath = path.join(directory, CONFIG.persistence.strategyFile); }

    async loadStrategies(): Promise<void> {
        try {
            const data = await fs.readFile(this.strategyPath, 'utf-8');
            this.strategies = JSON.parse(data);
            logger.system(`Adaptive strategies loaded. Current concurrency: ${this.strategies.concurrency}. Hints: ${this.strategies.aiPromptHints.length}`);
        } catch { logger.system('No prior adaptive strategies found. Using defaults.'); }
    }

    async learnFrom(journal: OperationalJournal): Promise<void> {
        const entries = await journal.read();
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
            await fs.writeFile(this.strategyPath, JSON.stringify(this.strategies, null, 2));
        }
    }

    getConcurrency(): number { return this.strategies.concurrency; }
    getStrategyHints(): string[] { return this.strategies.aiPromptHints; }
}

class AI_CognitionEngine {
    private ai: GoogleGenAI;
    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    private buildPrompt(content: string, name: string, context: ProcessingContext): string {
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

    async analyze(content: string, name: string, context: ProcessingContext): Promise<ValidatedData | null> {
        const request = {
            contents: [{ role: 'user', parts: [{ text: this.buildPrompt(content, name, context) }] }],
            safetySettings: Object.values(HarmCategory).map(category => ({ category, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE })),
            generationConfig: CONFIG.ai.generationConfig as GenerationConfig,
        };

        for (let attempt = 0; attempt < CONFIG.ai.maxRetries; attempt++) {
            try {
                logger.debug(`Cognitive cycle starting for "${name}" (Attempt ${attempt + 1}).`);
                const response = await this.ai.models.generateContent({
                    model: CONFIG.ai.model,
                    ...request
                });

                if (!response) {
                    logger.warn(`Cognitive cycle for "${name}" received no response object (potentially blocked). Retrying...`);
                    continue;
                }

                const rawText = response.text;

                if (!rawText) {
                    logger.warn(`Cognitive cycle for "${name}" returned an empty text response. Retrying...`);
                    continue;
                }

                const jsonText = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
                const parsed = JSON.parse(jsonText) as LLMResponse;
                logger.debug(`LLM Reasoning for "${name}": ${parsed.reasoning || 'None'}`);

                let correctedTitle = parsed.title;
                if (parsed.title && context.folderArchetype.title && parsed.title.toLowerCase().includes(context.folderArchetype.title.toLowerCase())) {
                    // --- ENHANCED LOGGING ---
                    logger.decision(`Self-Correction`, `Discarded title "${parsed.title}" due to overlap with folder archetype "${context.folderArchetype.title}".`);
                    correctedTitle = null;
                }

                return {
                    title: correctedTitle,
                    authors: parsed.authors || context.folderArchetype.authors || [],
                    year: parsed.year || context.folderArchetype.year,
                    fileType: parsed.fileType,
                    confidence: parsed.confidence || 0.5,
                    // --- ADDITIONS ---
                    documentType: parsed.documentType,
                    journal: parsed.journal,
                    volume: parsed.volume,
                };
            } catch (error) {
                logger.error(`Cognitive cycle failed for "${name}" on attempt ${attempt + 1}`, error as Error);
                if (attempt < CONFIG.ai.maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
                }
            }
        }
        return null;
    }
}

class FileEntity {
    public readonly fullPath: string;
    public readonly name: string;
    public readonly typeInfo: FileTypeInfo;
    constructor(fullPath: string) {
        this.fullPath = fullPath;
        this.name = path.basename(fullPath);
        this.typeInfo = this.detectFileType();
    }
    private detectFileType(): FileTypeInfo {
        const lowerName = this.name.toLowerCase().replace('.pdf', '');
        const structuralMatch = lowerName.match(/^(toc|table|content|title|index|preface|frontmatter|backmatter|figures?|tables?|appendices?|glossary)/i);
        if (structuralMatch) return { isStructural: true, structuralType: structuralMatch[0].toUpperCase(), isChapter: false, enumeration: null };
        const chapterMatch = lowerName.match(/(?:chapter|ch|chap|kapitel|chapitre|section|sec)[\s_-]*(\d+(?:\.\d+)?)/i);
        if (chapterMatch) return { isStructural: false, structuralType: null, isChapter: true, enumeration: chapterMatch[1] };
        return { isStructural: false, structuralType: null, isChapter: false, enumeration: null };
    }
    async readContent(): Promise<string | null> {
        try {
            const dataBuffer = await fs.readFile(this.fullPath);
            const data = await pdf(dataBuffer, { max: this.typeInfo.isStructural ? 5 : 10 });
            return data.text;
        } catch (error) { return null; }
    }
}

class LifecycleManager {
    private journal: OperationalJournal;
    constructor(journal: OperationalJournal) { this.journal = journal; }
    async rename(entity: FileEntity, newName: string, startTime: number): Promise<void> {
        // --- ENHANCED LOGGING ---
        logger.trace(entity.name, newName);
        const newPath = path.join(path.dirname(entity.fullPath), newName);
        try {
            await fs.copyFile(entity.fullPath, `${entity.fullPath}${CONFIG.processing.backupExtension}`);
            await fs.rename(entity.fullPath, newPath);
            await this.journal.record({ file: entity.name, status: 'SUCCESS', details: 'Backup created and file renamed.', durationMs: Date.now() - startTime, newName });
        } catch (e) {
            await this.journal.record({ file: entity.name, status: 'FAILURE_RENAME', details: `Rename failed: ${(e as Error).message}`, durationMs: Date.now() - startTime });
        }
    }
}

class SystemCore {
    private directory: string;
    private cognitionEngine: AI_CognitionEngine;
    private journal: OperationalJournal;
    private lifecycleManager: LifecycleManager;
    private cache: NodeCache;
    private strategyEngine: AdaptiveStrategyEngine;
    public readonly activationTime: Date = new Date();

    constructor(directory: string, apiKey: string) {
        this.directory = directory;
        this.cognitionEngine = new AI_CognitionEngine(apiKey);
        this.journal = new OperationalJournal(directory);
        this.lifecycleManager = new LifecycleManager(this.journal);
        this.cache = new NodeCache({ stdTTL: 86400 });
        this.strategyEngine = new AdaptiveStrategyEngine(directory);
    }

    private async selfValidate(): Promise<boolean> {
        logger.system('Initiating self-validation protocol...');
        try {
            await fs.access(this.directory);
            if (!process.env.GEMINI_API_KEY) throw new Error('Cognitive faculty (API key) is missing.');
            logger.success('System integrity confirmed. All components operational.');
            return true;
        } catch (e) {
            logger.error('Self-validation failed. System cannot safely proceed.', e as Error);
            return false;
        }
    }

    private formatBaseFilename(data: ValidatedData, typeInfo: FileTypeInfo): string | null {
        // --- NEW, ADVANCED FORMATTING LOGIC ---
        const formatText = (input: string, mode: 'title' | 'author'): string => {
            let text = input;

            // Rule 1 & 2: Normalize characters and remove unsafe symbols first.
            if (mode === 'author') {
                text = text.split('').map(char => specialCharMap[char] || char).join('');
            }
            text = text.replace(/[\\/&'"`]/g, '');

            // Rule 3: Replace punctuation with a single hyphen. This is the main change.
            if (mode === 'title') {
                text = text.replace(/[,.;:!?]+/g, '-'); // Use + to handle multiple punctuations
            }

            // Rule 4: Clean up spaces around the new hyphens
            text = text.replace(/\s*-\s*/g, '-');

            // Final Step: Process for output
            if (mode === 'author') {
                // For authors, just remove all remaining spaces.
                return text.replace(/\s+/g, '');
            } else { // mode === 'title'
                // For titles, we now split by the hyphen, process each part, and rejoin.
                return text.split('-').map(part => 
                    // PascalCase each segment individually
                    part.trim().split(' ').map(w => 
                        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
                    ).join('')
                ).join('-'); // Rejoin the processed segments with the hyphen
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
                
                const finalParts: string[] = [
                    formatText(title, 'title'),
                    formattedAuthors,
                    year,
                ];

                if (journal) finalParts.push(`J-${formatText(journal, 'title')}`);
                if (volume) finalParts.push(`V${formatText(volume, 'author')}`); // Volume is like an author (no spaces)
                
                return finalParts.join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }

            case 'book':
            case 'chapter':
            default: {
                if (!title && !typeInfo.isStructural) {
                    logger.warn(`Formatting failed for book/chapter: Missing title.`);
                    return null;
                }
                if (year && !/^\d{4}$/.test(year)) return null;

                const finalParts: string[] = [];

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

                if (finalParts.length === 0) return null;

                return finalParts.filter(Boolean).join('_').substring(0, CONFIG.processing.maxFilenameLength);
            }
        }
    }

    private async processEntity(entity: FileEntity, context: ProcessingContext): Promise<{ from: string, to: string, entity: FileEntity } | null> {
        const startTime = Date.now();
        // --- ENHANCED LOGGING ---
        console.log(`\n------------------------------------------------------------`);
        logger.info(`Analyzing entity: ${entity.name}`);
        
        if (CONFIG.processing.processedFormatRegex.test(entity.name)) {
            logger.warn(`Skipping: Entity already follows the standard naming convention.`);
            await this.journal.record({ file: entity.name, status: 'PROCESSED', details: 'File already follows naming convention.', durationMs: Date.now() - startTime });
            return null;
        }

        const content = await entity.readContent();
        if (!content || content.length < CONFIG.processing.minTextLength) {
            logger.error(`Skipping: Insufficient text content found in file.`);
            await this.journal.record({ file: entity.name, status: 'FAILURE_PARSE', details: 'Insufficient text content.', durationMs: Date.now() - startTime });
            return null;
        }

        const validatedData = await this.cognitionEngine.analyze(content, entity.name, context);
        if (!validatedData) {
            logger.error(`Skipping: Cognitive engine failed to produce a valid analysis.`);
            await this.journal.record({ file: entity.name, status: 'FAILURE_AI', details: 'Cognition failed to produce valid data.', durationMs: Date.now() - startTime });
            return null;
        }

        // --- ENHANCED LOGGING ---
        logger.decision('Cognitive Analysis', `Confidence: ${validatedData.confidence.toFixed(2)}`);
        logger.decision('  -> Document Type', validatedData.documentType || 'Unknown');
        logger.decision('  -> Title', validatedData.title || 'N/A');
        logger.decision('  -> Authors', (validatedData.authors || []).join(', ') || 'N/A');
        logger.decision('  -> Year', validatedData.year || 'N/A');
        if(validatedData.documentType === 'article') {
            logger.decision('  -> Journal', validatedData.journal || 'N/A');
            logger.decision('  -> Volume', validatedData.volume || 'N/A');
        }
        logger.decision('  -> File Type', validatedData.fileType || 'Content');

        if (validatedData.confidence < 0.75) {
            logger.warn(`Skipping: Cognitive confidence (${validatedData.confidence.toFixed(2)}) is below the 0.75 threshold.`);
            await this.journal.record({ file: entity.name, status: 'SKIPPED_LOW_CONF', details: `Confidence score (${validatedData.confidence.toFixed(2)}) below threshold.`, durationMs: Date.now() - startTime, confidence: validatedData.confidence });
            return null;
        }

        const baseName = this.formatBaseFilename(validatedData, entity.typeInfo);
        // --- ENHANCED LOGGING ---
        logger.decision('Formatted Base Name', baseName || 'Invalid');

        const newName = `${baseName}.pdf`;
        if (!baseName || newName.toLowerCase() === entity.name.toLowerCase()) {
            logger.warn(`Skipping: Name unchanged after formatting.`);
            await this.journal.record({ file: entity.name, status: 'SKIPPED_NO_CHANGE', details: 'Generated name is invalid or identical.', durationMs: Date.now() - startTime, confidence: validatedData.confidence });
            return null;
        }
        
        return { from: entity.name, to: newName, entity };
    }

    public async activate(liveMode: boolean) {
        logger.system(`Activating ${CONFIG.entity.name} v${CONFIG.entity.version}`);
        if (!await this.selfValidate()) return;

        await this.loadCache();

        await this.strategyEngine.loadStrategies();
        const context: ProcessingContext = {
            folderArchetype: this.getFolderArchetype(),
            strategyHints: this.strategyEngine.getStrategyHints(),
        };

        const allPaths = await this.findAllPaths();
        const entities = allPaths.map(p => new FileEntity(p));
        const manifest: { entity: FileEntity, newName: string }[] = [];

        logger.system(`Cognitive analysis phase starting for ${entities.length} entities...`);
        const limit = pLimit(this.strategyEngine.getConcurrency());
        const tasks = entities.map(entity => limit(async () => {
            const result = await this.processEntity(entity, context);
            if (result) manifest.push({ entity: result.entity, newName: result.to });
        }));
        await Promise.all(tasks);

        if (manifest.length === 0) {
            logger.info('Analysis complete. No required modifications found.');
            await this.generateAttestationReport(false);
            return;
        }

        // --- NEW, NON-INTERACTIVE LOGIC STARTS HERE ---

        if (liveMode) {
            // In live mode, state the intent and execute automatically.
            console.log('\n\x1b[1;31m--- LIVE MODE ENGAGED: EXECUTING AUTOMATICALLY ---');
            logger.system(`Executing ${manifest.length} modifications based on trusted analysis.`);
            if (manifest.length > 0) {
                console.log('Example modification planned:');
                logger.trace(manifest[0].entity.name, manifest[0].newName);
            }
            console.log('\x1b[33mBackups will be created for all modified files.\x1b[0m\n');

            const executionTasks = manifest.map(({ entity, newName }) =>
                limit(() => this.lifecycleManager.rename(entity, newName, Date.now()))
            );
            await Promise.all(executionTasks);
            logger.success('Execution phase complete.');
        } else {
            // In dry run mode, just print the manifest as before.
            console.log('\n\x1b[1;33m--- OPERATIONAL MANIFEST: DRY RUN ---');
            logger.info(`The entity has planned ${manifest.length} renaming operations.`);
            manifest.forEach(({ entity, newName }) => {
                logger.trace(entity.name, newName);
            });
            logger.info('No files were changed. Run with the --live flag to execute.');
        }

        // --- NEW LOGIC ENDS HERE ---

        logger.system('Introspection phase: Learning from operational journal...');
        await this.strategyEngine.learnFrom(this.journal);

        await this.saveCache();
        // Pass 'liveMode' to the report to accurately reflect the outcome.
        await this.generateAttestationReport(liveMode && manifest.length > 0); 
        logger.system('Deactivation complete.');
    }

    private async generateAttestationReport(executed: boolean): Promise<void> {
        const entries = await this.journal.read();
        const runDuration = (new Date().getTime() - this.activationTime.getTime()) / 1000;
        const summary = entries.reduce((acc, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
        }, {} as Record<JournalEntryStatus, number>);

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

        await fs.writeFile(path.join(this.directory, CONFIG.persistence.attestationFile), report);
        logger.system(`Systemic Attestation Report generated.`);
    }

    private getFolderArchetype(): BookArchetype {
        const folderName = path.basename(path.resolve(this.directory));
        const [title, authors, year] = folderName.split('_');
        return {
            title: title ? title.replace(/([A-Z])/g, ' $1').trim() : null,
            authors: authors ? authors.split('And') : [],
            year: year || null,
        };
    }
    private async findAllPaths(): Promise<string[]> {
        const paths: string[] = [];
        const recurse = async (currentDir: string) => {
            try {
                const entries = await fs.readdir(currentDir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    if (entry.isDirectory()) await recurse(fullPath);
                    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) paths.push(fullPath);
                }
            } catch (e) { logger.error(`Could not read directory "${currentDir}"`, e as Error); }
        };
        await recurse(this.directory);
        return paths;
    }
    private async loadCache(): Promise<void> {
        const cachePath = path.join(this.directory, CONFIG.persistence.cacheFile);
        try {
            const data = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
            this.cache.mset(Object.entries(data).map(([key, val]) => ({ key, val, ttl: 86400 } as any)));
            logger.system(`System cache loaded with ${this.cache.stats.keys} entries.`);
        } catch { logger.debug('No persistent cache found.'); }
    }
    private async saveCache(): Promise<void> {
        const cachePath = path.join(this.directory, CONFIG.persistence.cacheFile);
        const data = Object.fromEntries(this.cache.keys().map(key => [key, this.cache.get(key)]));
        await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
        logger.info(`System cache with ${this.cache.stats.keys} entries persisted.`);
    }
}

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .command('activate', 'Activate the Sentient Knowledge Engine', {
            directory: { alias: 'd', type: 'string', default: './ManagedLibrary' },
            live: { type: 'boolean', default: false, description: 'Request consent for executing irreversible file operations.' },
        })
        .demandCommand(1, 'You must provide the "activate" command.')
        .help().argv;

    if (argv._[0] === 'activate') {
        const { directory, live } = argv as unknown as { directory: string; live: boolean; };
        const core = new SystemCore(directory, process.env.GEMINI_API_KEY!);
        await core.activate(live);
    }
}

main().catch(e => console.error("A critical, unhandled systemic collapse occurred.", e));