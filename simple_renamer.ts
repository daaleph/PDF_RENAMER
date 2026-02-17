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

// At top of file
dotenv.config();

// Then in AI_CognitionEngine
const API_KEYS = Object.keys(process.env)
  .filter(key => key.startsWith('GEMINI_API_KEY'))
  .map(key => process.env[key]?.trim())
  .filter(Boolean);

const CONFIG = {
    entity: {
        version: '5.2.0',
        name: 'Sentient Knowledge Engine (SKE)',
    },
    ai: {
        models: [
            'gemini-flash-latest',         // Fallback 1
            'gemini-flash-lite-latest',    // Fallback 2 (corrected typo "fash" → "flash")
            'gemini-2.5-flash',            // Fallback 3
            'gemini-2.5-flash-lite',        // Fallback 4 (final)
            'qwen3:1.7b',
            'gemini-3-flash-preview'      // Primary / first attempt
        ],
        localEndpoint: 'http://localhost:11434/v1/chat/completions',
        maxRetriesPerModel: 6,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.0 },
    },
    processing: {
        concurrencyLimit: 5,
        minTextLength: 100,
        maxFilenameLength: 120,
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
        delayMinutes: 15, // Kept for other parts of your script
         keyExhaustionBackoffBase: 60,
        // Python-equivalent backoff settings
        INITIAL_BACKOFF_SEC: 120,
        MAX_BACKOFF_SEC: 600,
        JITTER_RANGE: 0.15,
    }
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

class ProgressBar {
    private total: number;
    private current: number = 0;
    private barLength: number = 40;

    constructor(total: number) {
        this.total = total;
    }

    // Call this method to update the progress bar
    public update() {
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
    // --- MODIFIED: Load keys by specific names like Python script ---
    private static API_KEYS = [
        process.env.GEMINI_API_KEY_N,
        process.env.GEMINI_API_KEY_A1,
        process.env.GEMINI_API_KEY_A2,
        process.env.GEMINI_API_KEY_D,
        process.env.GEMINI_API_KEY_Di
    ].filter((k): k is string => !!k); // Filter undefined/empty

    // Static state for global rotation (Sticky Failover)
    private static currentKeyIndex = 0;

    constructor() {
        if (AI_CognitionEngine.API_KEYS.length === 0) {
            logger.error("No valid Gemini API keys found in environment variables (GEMINI_API_KEY_N, _A1, etc.).");
        } else {
            logger.system(`Cognition Engine initialized with pool of ${AI_CognitionEngine.API_KEYS.length} keys.`);
        }
    }

    private buildPrompt(content: string, name: string, context: ProcessingContext, isLocalModel: boolean = false): string {
        const hints = context.strategyHints.length > 0 ? `\nStrategic Hints:\n- ${context.strategyHints.join('\n- ')}\n` : '';

        const baseInstructions = `
    Analyze this document to extract its most meaningful title for file renaming. Context: Part of book "${context.folderArchetype.title}". Filename: "${name}".
    ${hints}
    Instructions:
    1. Reasoning: Explain your logic briefly.
    2. Document Classification: Classify as 'book', 'chapter', or 'article'.
    3. Title Selection (CRITICAL): Choose the most descriptive title/subtitle.
    4. Extract authors, year, journal (for articles), volume.
    5. Confidence: Score 0.0 to 1.0.
    `;

        const schema = `{
    "reasoning": "string",
    "documentType": "book" | "chapter" | "article" | null,
    "title": "string" | null,
    "authors": array of strings | null,
    "year": "string" | null,
    "journal": "string" | null,
    "volume": "string" | null,
    "fileType": "string" | null,
    "confidence": number
    }`;

        if (isLocalModel) {
            // Versión ultra-estricto para modelos locales (Qwen, Llama, Phi, etc.)
    return `
    Focus ONLY on the FIRST FEW PAGES of the text (title/authors/year are almost always there).

    Common title patterns:
    - Large bold text at the top
    - After authors list
    - Before "Abstract" or "Introduction"
    - Often followed by subtitle after colon ":"

    Ignore headers, footers, page numbers, references.

    If no clear title found in first pages, use the most descriptive section heading.
            
    You are an expert document analyzer. Your response MUST be ONLY a valid JSON object, wrapped in \`\`\`json markdown fences. 
    Do NOT write any explanation, introduction, conclusion, or text outside the JSON. 
    Do NOT use markdown except for the fences.
    Do NOW write comments or explanations within the json object outside

    Required exact format:

    \`\`\`json
    {
        "reasoning": "brief explanation",
        "documentType": "article" | "book" | "chapter",
        "title": "most descriptive title/subtitle (prefer subtitle if more specific)",
        "authors": ["list"],
        "year": "string",
        "journal": "string or null",
        "volume": "string or null",
        "fileType": null,
        "confidence": 0.0-1.0
    }
    \`\`\`

    Now analyze the following document text and respond ONLY with the JSON in the format above:

    TEXT: "${content.replace(/\s+/g, ' ').substring(0, 7000)}"`;
        } else {
            // Versión original para Gemini (ya funciona bien)
            return `${baseInstructions}
    6. Format: Respond in valid JSON.
    Schema: ${schema}
    ---
    TEXT: "${content.replace(/\s+/g, ' ').substring(0, 8000)}"`;
        }
    }

    async analyze(content: string, name: string, context: ProcessingContext): Promise<ValidatedData | null> {
        const prompt = this.buildPrompt(content, name, context);

        // --- OUTER LOOP: Iterate through Models (Fallback Strategy) ---
        for (const model of CONFIG.ai.models) {
            
            const isLocalModel = model.includes('qwen') || model.includes('llama') || model.includes('phi');

            // --- LOCAL MODEL LOGIC (Ollama) ---
            // Local models are attempted once. If they fail, we proceed to the next model in the list.
            if (isLocalModel) {
                try {
                    logger.debug(`Attempting local model: ${model}`);
                    const endpoint = CONFIG.ai.localEndpoint || 'http://localhost:11434/v1/chat/completions';

                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            model: model,
                            messages: [{ role: 'user', content: prompt }],
                            stream: false,
                            options: { 
                                temperature: 0.0,
                                num_gpu: 0,
                                num_thread: 8,
                                num_ctx: 32768
                            }
                        })
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new Error(`Local server error (${response.status}): ${errorBody}`);
                    }

                    const data = await response.json();
                    const resultText = data.choices?.[0]?.message?.content;
                    if (!resultText) throw new Error('Empty response from local model');

                    logger.debug(`Raw response from local model "${model}" for "${name}":`);
                    console.log('\x1b[33m=== RAW RESPONSE START ===\x1b[0m');
                    console.log(resultText);
                    console.log('\x1b[33m=== RAW RESPONSE END ===\x1b[0m');

                    const parsed = this.parseJsonResponse(resultText, name, context);
                    if (parsed) {
                        logger.success(`Success for "${name}" using local model "${model}"`);
                        return parsed;
                    } else {
                        throw new Error('Failed to parse valid JSON from local model');
                    }

                } catch (error: any) {
                    logger.error(`Local model "${model}" failed: ${error.message}`);
                    // Continue to the NEXT model in the outer loop
                    continue; 
                }
            }

            // --- CLOUD MODEL LOGIC (Gemini) ---
            // Implementation of the resilient "Sticky Failover" with Inner Loop
            
            let cycleCount = 0;
            // Track where we started to detect a full loop through keys
            let startIndexForCycle = AI_CognitionEngine.currentKeyIndex;

            // --- INNER LOOP: Rotate through Keys for this specific Model ---
            while (true) {
                cycleCount++;
                const apiKey = AI_CognitionEngine.API_KEYS[AI_CognitionEngine.currentKeyIndex];
                const keyIndexDisplay = AI_CognitionEngine.currentKeyIndex + 1;

                if (!apiKey) {
                    logger.error(`API Key at index ${AI_CognitionEngine.currentKeyIndex} is invalid.`);
                    AI_CognitionEngine.currentKeyIndex = (AI_CognitionEngine.currentKeyIndex + 1) % AI_CognitionEngine.API_KEYS.length;
                    if (AI_CognitionEngine.currentKeyIndex === startIndexForCycle) break;
                    continue;
                }

                try {
                    const client = new GoogleGenAI({ apiKey });

                    // Explicit Safety Settings
                    const safetySettings = [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                    ];

                    const result = await client.models.generateContent({
                        model,
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        config: {
                            ...CONFIG.ai.generationConfig as GenerationConfig,
                            safetySettings: safetySettings
                        }
                    });

                    const rawText = result.text;
                    if (!rawText) throw new Error('Empty text response from API');

                    const parsed = this.parseJsonResponse(rawText, name, context);
                    if (!parsed) throw new Error('JSON Parsing failed');

                    // SUCCESS: Update sticky index (start point) for future calls
                    startIndexForCycle = AI_CognitionEngine.currentKeyIndex;
                    
                    logger.success(`Success for "${name}" using model "${model}" (Key ${keyIndexDisplay})`);
                    return parsed;

                } catch (error: any) {
                    const errStr = (error.message || error.toString()).toLowerCase();
                    
                    const isQuotaError = errStr.includes('quota') || errStr.includes('resourceexhausted') || error?.status === 'RESOURCE_EXHAUSTED';
                    const isTransient = isQuotaError || errStr.includes('429') || errStr.includes('rate limit') || errStr.includes('503') || errStr.includes('unavailable');

                    if (isTransient) {
                        logger.warn(`Transient ${isQuotaError ? 'quota' : 'rate'} error on Key ${keyIndexDisplay} -> Switching to next key.`);
                        
                        // Rotate key
                        AI_CognitionEngine.currentKeyIndex = (AI_CognitionEngine.currentKeyIndex + 1) % AI_CognitionEngine.API_KEYS.length;

                        // Check if we completed a full cycle (wrapped around to start)
                        if (AI_CognitionEngine.currentKeyIndex === startIndexForCycle) {
                            
                            if (isQuotaError) {
                                logger.warn(`Quota exhausted on all keys for model "${model}". Switching to next model.`);
                                // Reset key index for the new model (optional but clean)
                                AI_CognitionEngine.currentKeyIndex = 0;
                                // Break inner loop to proceed to next model in outer loop
                                break; 
                            } else {
                                // Generic Rate Limit: Backoff and retry same model
                                logger.warn(`All keys exhausted for model "${model}". Applying backoff...`);
                                
                                // Exponential backoff with jitter
                                const backoffBase = Math.min(
                                    CONFIG.retry.INITIAL_BACKOFF_SEC * Math.pow(2, cycleCount - 1), 
                                    CONFIG.retry.MAX_BACKOFF_SEC
                                );
                                const jitter = backoffBase * (1 + (Math.random() * 2 - 1) * CONFIG.retry.JITTER_RANGE);
                                
                                logger.system(`Backoff timer: ${jitter.toFixed(0)} seconds.`);
                                await new Promise(resolve => setTimeout(resolve, jitter * 1000));
                                
                                // Reset cycle start to allow retrying keys after backoff
                                startIndexForCycle = AI_CognitionEngine.currentKeyIndex;
                            }
                        }
                    } else {
                        // Non-transient error (e.g. 400 Bad Request, Safety Filter)
                        logger.error(`Permanent error with model "${model}": ${error.message}`);
                        // Break inner loop to try next model in outer loop
                        break;
                    }
                }
            }
        }

        logger.error(`All models and keys failed for "${name}".`);
        return null;
    }

    // Helper method to keep the main loop clean
    private parseJsonResponse(rawText: string, name: string, context: ProcessingContext): ValidatedData | null {
        try {
            let jsonText = rawText;
            if (jsonText.includes("```")) {
                jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            }
            
            const startIndex = jsonText.indexOf('{');
            const endIndex = jsonText.lastIndexOf('}');
            if (startIndex === -1 || endIndex === -1) return null;

            jsonText = jsonText.substring(startIndex, endIndex + 1);
            const parsed = JSON.parse(jsonText) as LLMResponse;

            let correctedTitle = parsed.title;
            if (parsed.title && context.folderArchetype.title && parsed.title.toLowerCase().includes(context.folderArchetype.title.toLowerCase())) {
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
        } catch {
            return null;
        }
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
            const data = await pdf(dataBuffer, { 
                pagerender: (pageData) => pageData.getTextContent().then((text: { items: any[]; }) => text.items.map(i => i.str).join(' ')),
                max: 5  // ← cambia a 5 (o incluso 3 para artículos)
            });
            return data.text;
        } catch (error) { return null; }
    }
}

class LifecycleManager {
    private journal: OperationalJournal;
    constructor(journal: OperationalJournal) { this.journal = journal; }
    async rename(entity: FileEntity, newName: string, startTime: number): Promise<boolean> {
        logger.trace(entity.name, newName);
        const newPath = path.join(path.dirname(entity.fullPath), newName);
        const backupPath = `${entity.fullPath}${CONFIG.processing.backupExtension}`;
        
        logger.debug(`Original path: ${entity.fullPath}`);
        logger.debug(`New path: ${newPath}`);
        logger.debug(`Backup path: ${backupPath}`);
        
        try {
            // Verificar que el archivo original existe
            await fs.access(entity.fullPath);
            logger.debug(`✓ Original file exists`);
            
            // Crear backup
            await fs.copyFile(entity.fullPath, backupPath);
            logger.debug(`✓ Backup created`);
            
            // Renombrar
            await fs.rename(entity.fullPath, newPath);
            logger.debug(`✓ File renamed`);
            
            // Eliminar backup
            await fs.unlink(backupPath);
            logger.success(`Backup cleaned up for "${entity.name}"`);
            
            // Verificar que el nuevo archivo existe
            await fs.access(newPath);
            logger.success(`✓ Verified new file exists at: ${newPath}`);
            
            await this.journal.record({ 
                file: entity.name, 
                status: 'SUCCESS', 
                details: 'Backup created, file renamed, and backup deleted.', 
                durationMs: Date.now() - startTime, 
                newName 
            });
            return true;
        } catch (e) {
            logger.error(`RENAME FAILED for "${entity.name}": ${(e as Error).message}`, e as Error);
            logger.error(`  Original: ${entity.fullPath}`);
            logger.error(`  Target: ${newPath}`);
            
            await this.journal.record({ 
                file: entity.name, 
                status: 'FAILURE_RENAME', 
                details: `Rename failed: ${(e as Error).message}. Backup retained.`, 
                durationMs: Date.now() - startTime 
            });
            return false;
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

    // MODIFIED: Constructor no longer takes apiKey
    constructor(directory: string) {
        this.directory = directory;
        this.cognitionEngine = new AI_CognitionEngine(); // No args
        this.journal = new OperationalJournal(directory);
        this.lifecycleManager = new LifecycleManager(this.journal);
        this.cache = new NodeCache({ stdTTL: 86400 });
        this.strategyEngine = new AdaptiveStrategyEngine(directory);
    }

    private async selfValidate(): Promise<boolean> {
        logger.system('Initiating self-validation protocol...');
        try {
            await fs.access(this.directory);
            // REMOVED: Check for GEMINI_API_KEY env var as we use hardcoded pool
            logger.success('System integrity confirmed. All components operational.');
            return true;
        } catch (e) {
            logger.error('Self-validation failed. System cannot safely proceed.', e as Error);
            return false;
        }
    }

    private formatBaseFilename(data: ValidatedData, typeInfo: FileTypeInfo): string | null {
        // --- Funciones Auxiliares de Formateo ---

        // 1. Eliminador de palabras vacías (Stop Words) para acortar manteniendo significado
        const removeStopWords = (text: string): string => {
            const stopWords = new Set(['a', 'an', 'the', 'and', 'of', 'for', 'in', 'on', 'with', 'to', 'by', 'from', 'is', 'are']);
            return text.split(/\s+/)
                .filter(word => !stopWords.has(word.toLowerCase()))
                .join(' ');
        };

        // 2. Formateador de Texto Mejorado
        const formatText = (input: string, mode: 'title' | 'author'): string => {
            let text = input;
            // Normalizar caracteres especiales (mapeo definido globalmente)
            if (mode === 'author') text = text.split('').map(char => specialCharMap[char] || char).join('');
            
            // Limpiar caracteres problemáticos
            text = text.replace(/[\\/&'"`]/g, '');

            if (mode === 'title') {
                // Aplicar limpieza de palabras vacías ANTES de formatear
                text = removeStopWords(text);
                
                // Reemplazar puntuación por guiones
                text = text.replace(/[,.;:!?]+/g, '-');
                // Normalizar posesivos
                text = text.replace(/(\w+)'(\w+)/g, '$1s');
                text = text.replace(/(\w+)’(\w+)/g, '$1s');
            } else {
                text = text.replace(/[,.\s]+/g, '-');   
            }
            
            text = text.replace(/\s*-\s*/g, '-');

            // Convertir a PascalCase / CamelCase
            if (mode === 'author') {
                return text.split('-').map(part => part.trim().replace(/\s+/g, '')).join('-');
            } else {
                return text.split('-').map(part => 
                    part.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')
                ).join('-');
            }
        };

        // 3. Formateador de Autores
        const formatAuthors = (authors: string[]): string => {
            if (!authors || authors.length === 0) return '';
            if (authors.length === 1) {
                return formatText(authors[0], 'author');
            }
            return `${formatText(authors[0], 'author')}-EtAl`;
        };
        
        // --- LÓGICA DE PRESUPUESTO DE CARACTERES ---
        
        const SAFE_MAX = CONFIG.processing.maxFilenameLength; // 120 caracteres
        const { title, authors, year, fileType, documentType, journal, volume } = data;

        // A. Calcular longitudes de partes FIJAS (Metadata obligatoria)
        const authorsStr = formatAuthors(authors);
        const yearStr = year || '';
        
        // Para artículos
        const journalStr = journal ? `J-${formatText(journal, 'title')}` : '';
        const volumeStr = volume ? `V${formatText(volume, 'author')}` : '';
        
        // Para libros
        const fileTypeStr = fileType ? formatText(fileType, 'title') : '';
        const enumStr = (typeInfo.isChapter && typeInfo.enumeration) ? typeInfo.enumeration.padStart(2, '0') : '';

        // Calcular espacio ocupado por metadata + separadores
        // Unimos partes fijas para medir
        const fixedParts = [authorsStr, yearStr, journalStr, volumeStr, fileTypeStr, enumStr].filter(Boolean);
        const fixedLength = fixedParts.reduce((acc, p) => acc + p.length, 0) + fixedParts.length; // +1 underscore por parte

        // B. Calcular presupuesto para el Título
        // Dejamos un pequeño margen de seguridad (5 chars)
        const titleBudget = Math.max(20, SAFE_MAX - fixedLength - 5);

        let finalTitle = '';
        if (title) {
            finalTitle = formatText(title, 'title');
            // Si el título excede el presupuesto, lo truncamos
            if (finalTitle.length > titleBudget) {
                finalTitle = finalTitle.substring(0, titleBudget);
            }
        }

        // C. Ensamblaje Final
        const finalParts: string[] = [];

        switch (documentType) {
            case 'article': {
                if (!finalTitle || !authorsStr || !yearStr) return null;
                finalParts.push(finalTitle);
                finalParts.push(authorsStr);
                finalParts.push(yearStr);
                if (journalStr) finalParts.push(journalStr);
                if (volumeStr) finalParts.push(volumeStr);
                break;
            }
            case 'book':
            case 'chapter':
            default: {
                if (!finalTitle && !typeInfo.isStructural) return null;
                if (year && !/^\d{4}$/.test(year)) return null;

                if (enumStr) finalParts.push(enumStr);
                if (finalTitle) finalParts.push(finalTitle);
                if (authorsStr) finalParts.push(authorsStr);
                if (yearStr) finalParts.push(yearStr);
                if (fileTypeStr) finalParts.push(fileTypeStr);
                break;
            }
        }

        const result = finalParts.filter(Boolean).join('_');
        
        // D. Filtro final de seguridad absoluta
        if (result.length > SAFE_MAX) {
            return result.substring(0, SAFE_MAX);
        }
        
        return result;
    }

    private hasAbnormallyLongWord(filename: string): boolean {
        const base = path.basename(filename, '.pdf');
        const rawParts = base.split(/[_-]|\d+/).filter(part => part.length > 0);
        const MAX_WORD_LENGTH = 30;
        for (const part of rawParts) {
            if (part.length < 16) continue;
            const words = part.split(/(?=[A-Z])/).filter(w => w.length > 0);
            for (const word of words) {
                const cleaned = word.replace(/^[^A-Za-z]+/, '');
                if (cleaned.length > MAX_WORD_LENGTH) return true;
            }
        }
        return false;
    }
    
    private async processEntity(entity: FileEntity, context: ProcessingContext, journalMemory: Map<string, JournalEntry>): Promise<{ from: string, to: string, entity: FileEntity } | null> {
        const startTime = Date.now();
        console.log(`\n------------------------------------------------------------`);
        logger.info(`Analyzing entity: ${entity.name}`);

        const looksProcessed = CONFIG.processing.processedFormatRegex.test(entity.name);
        const hasAbnormalTitle = this.hasAbnormallyLongWord(entity.name);

        if (looksProcessed && !hasAbnormalTitle) {
            logger.warn(`Skipping: Entity already follows the standard naming convention and appears readable.`);
            await this.journal.record({
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
        if (looksProcessed && hasAbnormalTitle && previousAttempt?.status !== 'FAILURE_RENAME') {
            logger.info(`Forcing reprocessing: Detected abnormally long concatenated words in title despite matching format.`);
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

        logger.decision('Cognitive Analysis', `Confidence: ${validatedData.confidence.toFixed(2)}`);
        logger.decision(' -> Document Type', validatedData.documentType || 'Unknown');
        logger.decision(' -> Title', validatedData.title || 'N/A');
        logger.decision(' -> Authors', (validatedData.authors || []).join(', ') || 'N/A');
        logger.decision(' -> Year', validatedData.year || 'N/A');

        if (validatedData.confidence < 0.7) {
            logger.warn(`Skipping: Cognitive confidence (${validatedData.confidence.toFixed(2)}) is below the 0.75 threshold.`);
            await this.journal.record({ file: entity.name, status: 'SKIPPED_LOW_CONF', details: `Confidence score below threshold.`, durationMs: Date.now() - startTime, confidence: validatedData.confidence });
            return null;
        }

        const baseName = this.formatBaseFilename(validatedData, entity.typeInfo);
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
        logger.system(`LIVE MODE: ${liveMode}`);

        if (!await this.selfValidate()) return;

        await this.loadCache();
        await this.strategyEngine.loadStrategies();

        const baseContext = {
            folderArchetype: this.getFolderArchetype(),
            strategyHints: this.strategyEngine.getStrategyHints(),
        };

        if (!liveMode) {
            await this.runSingleCycle(baseContext, true);
        } else {
            let cycle = 0;
            const maxCycles = 50;
            while (cycle < maxCycles) {
                cycle++;
                logger.system(`\n=== Starting processing cycle ${cycle}/${maxCycles} ===`);
                const success = await this.runSingleCycle(baseContext, false);
                if (!success.shouldContinue) {
                    logger.system('All files successfully processed or no further progress possible.');
                    break;
                }
                if (success.hasFailures) {
                    logger.system(`Failures detected. Waiting ${CONFIG.retry.delayMinutes} minutes before retry cycle...`);
                    await new Promise(resolve => setTimeout(resolve, CONFIG.retry.delayMinutes * 60 * 1000));
                } else {
                    logger.system('Cycle completed with no failures. Proceeding to next cycle if needed.');
                }
            }
            if (cycle >= maxCycles) logger.warn('Maximum retry cycles reached. Stopping to prevent infinite execution.');
        }

        logger.system('Introspection phase: Learning from operational journal...');
        await this.strategyEngine.learnFrom(this.journal);
        await this.saveCache();
        await this.generateAttestationReport(liveMode);
        logger.system('Deactivation complete.');
    }

    private async runSingleCycle(context: ProcessingContext, isDryRun: boolean): Promise<{hasFailures: boolean, shouldContinue: boolean}> {
        const journalBefore = await this.journal.read();
        const previousLength = journalBefore.length;
        const journalMemory = await this.loadJournalMemory();
        logger.system(`Loaded ${journalMemory.size} historical states into active memory.`);
        const allPaths = await this.findAllPaths();
        if (allPaths.length === 0) {
            logger.system('No PDF files found.');
            return { hasFailures: false, shouldContinue: false };
        }
        const entities = allPaths.map(p => new FileEntity(p));
        
        // En modo Dry Run, acumulamos el manifiesto. En Live, no es necesario acumularlo.
        const manifest: { entity: FileEntity, newName: string }[] = [];
        
        logger.system(`Cognitive analysis phase starting for ${entities.length} entities...`);
        const progressBar = new ProgressBar(entities.length);
        const limit = pLimit(this.strategyEngine.getConcurrency());

        const tasks = entities.map(entity => limit(async () => {
            try {
                const result = await this.processEntity(entity, context, journalMemory);
                
                if (result) {
                    if (isDryRun) {
                        // MODO DRY RUN: Solo acumulamos para mostrar el resumen al final
                        manifest.push({ entity: result.entity, newName: result.to });
                    } else {
                        // MODO LIVE: RENOMBRAR INMEDIATAMENTE
                        const renameStart = Date.now();
                        await this.lifecycleManager.rename(result.entity, result.to, renameStart);
                    }
                }
            } catch (e) {
                logger.error(`Unhandled error processing "${entity.name}"`, e as Error);
                await this.journal.record({ file: entity.name, status: 'FAILURE_AI', details: `Unhandled exception: ${(e as Error).message}`, durationMs: 0 });
            } finally {
                progressBar.update();
            }
        }));

        await Promise.all(tasks);

        // Análisis de resultados del ciclo
        const journalAfter = await this.journal.read();
        const cycleEntries = journalAfter.slice(previousLength);
        const failureStatuses: JournalEntryStatus[] = ['FAILURE_PARSE', 'FAILURE_AI', 'FAILURE_RENAME', 'SKIPPED_LOW_CONF'];
        const hasFailures = cycleEntries.some(e => failureStatuses.includes(e.status));
        const onlyGoodSkips = cycleEntries.length > 0 && cycleEntries.every(e => ['PROCESSED', 'SKIPPED_NO_CHANGE', 'SUCCESS'].includes(e.status));

        // Lógica de salida temprana si no hay nada que hacer
        if (manifest.length === 0 && onlyGoodSkips) return { hasFailures: false, shouldContinue: false };

        // Lógica de impresión solo para Dry Run
        if (isDryRun) {
            console.log('\n\x1b[1;33m--- OPERATIONAL MANIFEST: DRY RUN ---\x1b[0m');
            logger.info(`Planned ${manifest.length} renaming operations.`);
            manifest.forEach(m => logger.trace(m.entity.name, m.newName));
            logger.info('No files changed (dry run).');
        }

        // Se elimina el bloque de ejecución de renombres que estaba aquí, 
        // porque ahora se ejecutan dentro del bucle (arriba).

        return { hasFailures, shouldContinue: true };
    }

    private async generateAttestationReport(wasLiveMode: boolean): Promise<void> {
        const entries = await this.journal.read();
        const runDuration = (new Date().getTime() - this.activationTime.getTime()) / 1000;
        const summary = entries.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {} as Record<JournalEntryStatus, number>);
        const successEntries = entries.filter(e => e.status === 'SUCCESS');
        const remainingPaths = await this.findAllPaths();
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
        } else {
            report += `**All PDF files were successfully processed and renamed.**\n`;
        }
        report += `\n`;
        report += `## IV. Learned Strategies\n\n`;
        report += this.strategyEngine.getStrategyHints().map(h => `* ${h}`).join('\n') || '* None\n';
        await fs.writeFile(path.join(this.directory, CONFIG.persistence.attestationFile), report);
        logger.system(`Attestation report generated: ${CONFIG.persistence.attestationFile}`);
    }

    private getFolderArchetype(): BookArchetype {
        const folderName = path.basename(path.resolve(this.directory));
        const [title, authors, year] = folderName.split('_');
        return { title: title ? title.replace(/([A-Z])/g, ' $1').trim() : null, authors: authors ? authors.split('And') : [], year: year || null };
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

    private async loadJournalMemory(): Promise<Map<string, JournalEntry>> {
        const entries = await this.journal.read();
        const memory = new Map<string, JournalEntry>();
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            const absolutePath = path.resolve(this.directory, entry.file);
            if (!memory.has(absolutePath)) memory.set(absolutePath, entry);
        }
        return memory;
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
        const absoluteDirectoryPath = path.resolve(directory);
        logger.system(`Resolved target directory to: ${absoluteDirectoryPath}`);

        // MODIFIED: Instantiation no longer requires process.env.GEMINI_API_KEY
        const core = new SystemCore(absoluteDirectoryPath);
        await core.activate(live);
    }
}

main().catch(e => console.error("A critical, unhandled systemic collapse occurred.", e));