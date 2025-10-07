import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import pdf from 'pdf-parse';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
// --- Import necessary types from the SDK ---
import {
    GoogleGenAI,
    HarmCategory,
    HarmBlockThreshold
} from '@google/genai';

// --- Load Environment Variables ---
dotenv.config();

// --- Initialize the AI Client (once) ---
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

// --- HELPER FUNCTIONS ---

/**
 * Executes a promise-based function while temporarily silencing stderr.
 * This suppresses non-critical warnings from the pdf-parse library.
 */
async function executeSilently<T>(fn: () => Promise<T>): Promise<T> {
    const originalStderrWrite = process.stderr.write;
    process.stderr.write = () => true; // Suppress output
    try {
        return await fn();
    } finally {
        process.stderr.write = originalStderrWrite; // Restore original function
    }
}

/**
 * Recursively finds all PDF file paths within a directory.
 */
async function findAllPdfPaths(dir: string): Promise<string[]> {
    const allPaths: string[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                allPaths.push(...(await findAllPdfPaths(fullPath)));
            } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
                allPaths.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`  \x1b[31m[ERROR]\x1b[0m Could not read directory "${dir}":`, (error as Error).message);
        throw error;
    }
    return allPaths;
}

/**
 * Extracts text from the first 10 pages of a PDF file.
 */
async function extractTextFromPdf(pdfPath: string): Promise<string | null> {
    try {
        const dataBuffer = await fs.readFile(pdfPath);
        const data = await executeSilently(() => pdf(dataBuffer, { max: 10 }));
        return data.text;
    } catch (error) {
        console.error(`  \x1b[31m[ERROR]\x1b[0m Could not parse PDF "${path.basename(pdfPath)}":`, (error as Error).message);
        return null;
    }
}

/**
 * Sends PDF text to the Gemini API to get structured metadata for renaming.
 */
async function getNewFilenameFromLLM(pdfContent: string, originalName: string, modelName: string): Promise<string | null> {
    // --- NEW: Retry configuration ---
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2 seconds

    const truncatedContent = pdfContent.replace(/\s+/g, ' ').substring(0, 8000);

    const prompt = `You are an expert librarian AI. Your task is to analyze text from a book's first few pages to extract its metadata.

**Instructions:**
1. Analyze the following text. The original filename was "${originalName}", which might be a clue.
2. Extract the full title, including any subtitles. Subtitles are often separated by a colon (:).
3. Extract all authors, the publication year, the edition, and the volume.
4. If a component is not present, return null for that field.
5. Your response MUST be a single, valid JSON object and nothing else.

**JSON Schema:**
{
  "title": "string | null", "authors": ["string"] | null, "year": "string | null", "edition": "string | null", "volume": "string | null"
}
---
**TEXT TO ANALYZE:**
"${truncatedContent}"`;

    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const request = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        safetySettings,
        generationConfig: {
            responseMimeType: 'application/json',
        },
    };
    
    // --- NEW: Retry loop ---
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            console.log(`  \x1b[90m[DEBUG]\x1b[0m Calling Gemini API (${modelName}), attempt ${attempt + 1}/${MAX_RETRIES}...`);
            const result = await ai.models.generateContent({ model: modelName, ...request });

            if (!result.candidates || result.candidates.length === 0) {
                const blockReason = result.promptFeedback?.blockReason;
                if (blockReason) {
                    console.error(`  \x1b[31m[API BLOCK]\x1b[0m Request was blocked. Reason: ${blockReason}`);
                } else {
                    console.error(`  \x1b[31m[API ERROR]\x1b[0m The API returned no content.`);
                }
                return null; // Fatal error, don't retry
            }

            const rawText = result.text;

            const firstBrace = rawText!.indexOf('{');
            const lastBrace = rawText!.lastIndexOf('}');

            if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                console.error(`  \x1b[31m[PARSE ERROR]\x1b[0m Could not find a valid JSON object in the API response.`);
                console.error(`  \x1b[90m[RAW RESPONSE]\x1b[0m ${rawText}`);
                return null; // Fatal error, don't retry
            }
            
            const jsonText = rawText!.substring(firstBrace, lastBrace + 1);
            console.log(`  \x1b[90m[DEBUG]\x1b[0m Cleaned JSON for parsing: ${jsonText.substring(0, 200)}...`);

            const parsed = JSON.parse(jsonText);
            const { title, authors, year, edition, volume } = parsed;

            // --- Validation check ---
            if (title && authors && Array.isArray(authors) && authors.length > 0) {
                 // --- SUCCESS: We have the required data, format and return ---
                const sanitize = (str: string) => str.replace(/[().,;:\[\]{}'"]/g, '').replace(/\s+/g, ' ').trim();
                const collapse = (str: string) => str.replace(/\s+/g, '');

                const toPascalCase = (text: string) =>
                    text.split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join('');

                const formattedTitle = title.split(':').map((part: string) => toPascalCase(part.trim())).join('-');
                const sanitizedAuthors = authors.map((author: string) => collapse(sanitize(author)));

                let formattedAuthors: string;
                if (sanitizedAuthors.length > 2) {
                    formattedAuthors = `${sanitizedAuthors.slice(0, 2).join('-')}-EtAl`;
                } else {
                    formattedAuthors = sanitizedAuthors.join('-');
                }
                
                const finalParts = [
                    formattedTitle,
                    formattedAuthors,
                    year,
                    edition ? collapse(sanitize(edition)) : null,
                    volume ? collapse(sanitize(volume)) : null
                ].filter(Boolean);

                return finalParts.join('_'); // Exit loop and function on success
            }
            
            // --- Incomplete data, prepare for retry ---
            console.warn(`  \x1b[90m[SKIP]\x1b[0m LLM returned incomplete data (missing title or authors).`);

        } catch (error: any) {
            if (error instanceof SyntaxError) {
                 console.error(`  \x1b[31m[FATAL ERROR]\x1b[0m Failed to parse the cleaned JSON.`, error);
            } else {
                console.error(`  \x1b[31m[FATAL ERROR]\x1b[0m A critical error occurred during the API call for "${originalName}".`, error);
            }
            return null; // Fatal error, don't retry
        }

        // --- Wait before the next attempt ---
        if (attempt < MAX_RETRIES - 1) {
            console.log(`  \x1b[33m[RETRY]\x1b[0m Waiting ${RETRY_DELAY_MS / 1000}s before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }

    // --- All retries failed ---
    console.error(`  \x1b[31m[FAIL]\x1b[0m Could not get a valid response from the LLM after ${MAX_RETRIES} attempts.`);
    return null;
}


// --- MAIN ORCHESTRATOR AND EXECUTION (Unchanged) ---
async function processAllPdfs(directory: string, model: string, dryRun: boolean) {
    console.log(`\x1b[36m[INFO]\x1b[0m Scanning for PDF files in ${directory}...`);
    const allPdfPaths = await findAllPdfPaths(directory);

    if (allPdfPaths.length === 0) {
        console.warn(`\x1b[33m[WARN]\x1b[0m No PDF files found.`);
        return;
    }
    console.log(`\x1b[32m[INFO]\x1b[0m Found ${allPdfPaths.length} PDF files. Starting processing...`);

    const PROCESSED_FORMAT_REGEX = /^[^_]+_[^_]+_\d{4}.*?\.pdf$/i;

    for (const fullPath of allPdfPaths) {
        const originalName = path.basename(fullPath);
        const originalDir = path.dirname(fullPath);

        if (PROCESSED_FORMAT_REGEX.test(originalName)) {
            console.log(`\n\x1b[90m[SKIP]\x1b[0m File already processed: ${originalName}`);
            continue;
        }

        console.log(`\n\x1b[36m[PROCESS]\x1b[0m Analyzing file: ${originalName}`);
        
        const pdfContent = await extractTextFromPdf(fullPath);
        if (!pdfContent || pdfContent.length < 200) {
            console.log(`  \x1b[91m[FAIL]\x1b[0m Could not extract sufficient text. Skipping.`);
            continue;
        }

        const newBaseName = await getNewFilenameFromLLM(pdfContent, originalName, model);

        if (newBaseName) {
            const newPdfFilename = `${newBaseName}.pdf`;
            const newPdfPath = path.join(originalDir, newPdfFilename);

            if (newPdfFilename.toLowerCase() !== originalName.toLowerCase()) {
                console.log(`  \x1b[33m[FROM]\x1b[0m ${originalName}`);
                console.log(`  \x1b[32m[TO]\x1b[0m   ${newPdfFilename}`);
                if (!dryRun) {
                    try {
                        await fs.rename(fullPath, newPdfPath);
                        console.log(`  \x1b[32m[SUCCESS]\x1b[0m PDF file renamed.`);
                    } catch (e) {
                        console.error(`  \x1b[31m[ERROR]\x1b[0m Could not rename PDF file:`, e);
                    }
                }
            } else {
                console.log(`  \x1b[32m[OK]\x1b[0m Filename is already in the correct format.`);
            }
        } else {
            console.log(`  \x1b[91m[FAIL]\x1b[0m Could not generate a valid new name for this file.`);
        }
    }
}

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option('directory', { alias: 'd', type: 'string', default: './Books' })
        .option('model', { alias: 'm', type: 'string', default: 'gemini-2.5-flash-lite' })
        .option('live', { type: 'boolean', default: false, description: 'Actually rename files. Default is a dry run.' })
        .help().alias('help', 'h').argv;

    if (!process.env.GEMINI_API_KEY) {
        console.error('\x1b[1;31m❌ ERROR: GEMINI_API_KEY is not set in your .env file.\x1b[0m');
        process.exit(1);
    }
    
    try {
        await fs.access(argv.directory);
    } catch (error) {
        console.error(`\x1b[1;31m❌ ERROR: Directory not found: ${argv.directory}\x1b[0m`);
        process.exit(1);
    }

    if (argv.live) {
        console.log('\x1b[1;31m--- RUNNING IN LIVE MODE --- Files will be renamed.\x1b[0m');
    } else {
        console.log('\x1b[1;33m--- RUNNING IN DRY RUN MODE --- Use --live to rename files.\x1b[0m');
    }
    console.log(`\x1b[36m[CONFIG]\x1b[0m Directory: ${path.resolve(argv.directory)}`);
    console.log(`\x1b[36m[CONFIG]\x1b[0m Model: ${argv.model}`);

    try {
        await processAllPdfs(argv.directory, argv.model, !argv.live);
        console.log('\n\x1b[1;32m✅ All PDF files processed.\x1b[0m');
    } catch (error) {
        console.error('\n\x1b[1;31m❌ A critical error stopped the script.\x1b[0m');
    }
}

main();