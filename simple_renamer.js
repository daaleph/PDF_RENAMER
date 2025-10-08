"use strict";
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
const fs_1 = require("fs");
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
// --- Import necessary types from the SDK ---
const genai_1 = require("@google/genai");
// --- Load Environment Variables ---
dotenv.config();
// --- Initialize the AI Client (once) ---
const ai = new genai_1.GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});
// --- HELPER FUNCTIONS ---
/**
 * Executes a promise-based function while temporarily silencing stderr.
 * This suppresses non-critical warnings from the pdf-parse library.
 */
function executeSilently(fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const originalStderrWrite = process.stderr.write;
        process.stderr.write = () => true; // Suppress output
        try {
            return yield fn();
        }
        finally {
            process.stderr.write = originalStderrWrite; // Restore original function
        }
    });
}
/**
 * Recursively finds all PDF file paths within a directory.
 */
function findAllPdfPaths(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const allPaths = [];
        try {
            const entries = yield fs_1.promises.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    allPaths.push(...(yield findAllPdfPaths(fullPath)));
                }
                else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
                    allPaths.push(fullPath);
                }
            }
        }
        catch (error) {
            console.error(`  \x1b[31m[ERROR]\x1b[0m Could not read directory "${dir}":`, error.message);
            throw error;
        }
        return allPaths;
    });
}
function extractTextFromPdf(pdfPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const dataBuffer = yield fs_1.promises.readFile(pdfPath);
            const data = yield executeSilently(() => (0, pdf_parse_1.default)(dataBuffer, { max: 10 }));
            return data.text;
        }
        catch (error) {
            console.error(`  \x1b[31m[ERROR]\x1b[0m Could not parse PDF "${path.basename(pdfPath)}":`, error.message);
            return null;
        }
    });
}
/**
 * Sends PDF text to the Gemini API to get structured metadata for renaming.
 */
function getNewFilenameFromLLM(pdfContent, originalName, modelName) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        // --- NEW: Retry configuration ---
        const MAX_RETRIES = 3;
        const RETRY_DELAY_MS = 2000; // 2 seconds
        const truncatedContent = pdfContent.replace(/\s+/g, ' ').substring(0, 8000);
        const prompt = `You are an expert librarian AI. Your task is to analyze text from a book's first few pages to extract its metadata.

    **Instructions:**
    1. Analyze the following text. The original filename was "${originalName}", which might be a clue.
    2. Extract only the main title (exclude subtitles, i.e., anything after a colon (:)).
    3. Extract all authors, the publication year, the edition, and the volume.
    4. Replace all commas with hyphens (-) in all fields.
    5. Convert special characters (e.g., accents, symbols) to their closest ASCII equivalents (e.g., 'é' to 'e', 'ñ' to 'n', '©' to 'c').
    6. If a component is not present, return null for that field.
    7. Your response MUST be a single, valid JSON object and nothing else.

    **JSON Schema:**
    {
    "title": "string | null", "authors": ["string"] | null, "year": "string | null", "edition": "string | null", "volume": "string | null"
    }
    ---
    **TEXT TO ANALYZE:**
    "${truncatedContent}"`;
        const safetySettings = [
            { category: genai_1.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: genai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: genai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: genai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: genai_1.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
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
                const result = yield ai.models.generateContent(Object.assign({ model: modelName }, request));
                if (!result.candidates || result.candidates.length === 0) {
                    const blockReason = (_a = result.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason;
                    if (blockReason) {
                        console.error(`  \x1b[31m[API BLOCK]\x1b[0m Request was blocked. Reason: ${blockReason}`);
                    }
                    else {
                        console.error(`  \x1b[31m[API ERROR]\x1b[0m The API returned no content.`);
                    }
                    return null; // Fatal error, don't retry
                }
                const rawText = result.text;
                const firstBrace = rawText.indexOf('{');
                const lastBrace = rawText.lastIndexOf('}');
                if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
                    console.error(`  \x1b[31m[PARSE ERROR]\x1b[0m Could not find a valid JSON object in the API response.`);
                    console.error(`  \x1b[90m[RAW RESPONSE]\x1b[0m ${rawText}`);
                    return null; // Fatal error, don't retry
                }
                const jsonText = rawText.substring(firstBrace, lastBrace + 1);
                console.log(`  \x1b[90m[DEBUG]\x1b[0m Cleaned JSON for parsing: ${jsonText.substring(0, 200)}...`);
                const parsed = JSON.parse(jsonText);
                const { title, authors, year, edition, volume } = parsed;
                // --- Validation check ---
                if (title && authors && Array.isArray(authors) && authors.length > 0) {
                    // --- SUCCESS: We have the required data, format and return ---
                    const specialCharMap = {
                        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ç': 'c',
                        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ñ': 'N', 'Ç': 'C',
                        '©': 'c', '®': 'r', '™': 'tm', '–': '-', '—': '-', '’': '', '“': '', '”': ''
                    };
                    const sanitize = (str) => {
                        return str
                            .replace(/,/g, '-') // Replace commas with hyphens
                            .replace(/[().;:\[\]{}'"]/g, '') // Remove other special characters
                            .replace(/[\u00C0-\u017F©®™–—’“”]/g, (char) => specialCharMap[char] || '') // Map special chars
                            .replace(/\s+/g, ' ') // Normalize spaces
                            .trim();
                    };
                    const collapse = (str) => str.replace(/\s+/g, '');
                    const toPascalCase = (text) => text.split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join('');
                    // Only take the main title (before any colon)
                    const mainTitle = title.split(':')[0].trim();
                    const formattedTitle = toPascalCase(sanitize(mainTitle));
                    const sanitizedAuthors = authors.map((author) => collapse(sanitize(author)));
                    let formattedAuthors;
                    if (sanitizedAuthors.length > 2) {
                        formattedAuthors = `${sanitizedAuthors.slice(0, 2).join('-')}-EtAl`;
                    }
                    else {
                        formattedAuthors = sanitizedAuthors.join('-');
                    }
                    const finalParts = [
                        formattedTitle,
                        formattedAuthors,
                        year ? sanitize(year) : null,
                        edition ? collapse(sanitize(edition)) : null,
                        volume ? collapse(sanitize(volume)) : null
                    ].filter(Boolean);
                    // Ensure the final filename is not too long (e.g., limit to 100 characters)
                    const finalName = finalParts.join('_');
                    return finalName.length > 100 ? finalName.substring(0, 100) : finalName; // Exit loop and function on success
                }
                // --- Incomplete data, prepare for retry ---
                console.warn(`  \x1b[90m[SKIP]\x1b[0m LLM returned incomplete data (missing title or authors).`);
            }
            catch (error) {
                if (error instanceof SyntaxError) {
                    console.error(`  \x1b[31m[FATAL ERROR]\x1b[0m Failed to parse the cleaned JSON.`, error);
                }
                else {
                    console.error(`  \x1b[31m[FATAL ERROR]\x1b[0m A critical error occurred during the API call for "${originalName}".`, error);
                }
                return null; // Fatal error, don't retry
            }
            // --- Wait before the next attempt ---
            if (attempt < MAX_RETRIES - 1) {
                console.log(`  \x1b[33m[RETRY]\x1b[0m Waiting ${RETRY_DELAY_MS / 1000}s before next attempt...`);
                yield new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
            }
        }
        // --- All retries failed ---
        console.error(`  \x1b[31m[FAIL]\x1b[0m Could not get a valid response from the LLM after ${MAX_RETRIES} attempts.`);
        return null;
    });
}
// --- MAIN ORCHESTRATOR AND EXECUTION (Unchanged) ---
function processAllPdfs(directory, model, dryRun) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`\x1b[36m[INFO]\x1b[0m Scanning for PDF files in ${directory}...`);
        const allPdfPaths = yield findAllPdfPaths(directory);
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
            const pdfContent = yield extractTextFromPdf(fullPath);
            if (!pdfContent || pdfContent.length < 200) {
                console.log(`  \x1b[91m[FAIL]\x1b[0m Could not extract sufficient text. Skipping.`);
                continue;
            }
            const newBaseName = yield getNewFilenameFromLLM(pdfContent, originalName, model);
            if (newBaseName) {
                const newPdfFilename = `${newBaseName}.pdf`;
                const newPdfPath = path.join(originalDir, newPdfFilename);
                if (newPdfFilename.toLowerCase() !== originalName.toLowerCase()) {
                    console.log(`  \x1b[33m[FROM]\x1b[0m ${originalName}`);
                    console.log(`  \x1b[32m[TO]\x1b[0m   ${newPdfFilename}`);
                    if (!dryRun) {
                        try {
                            yield fs_1.promises.rename(fullPath, newPdfPath);
                            console.log(`  \x1b[32m[SUCCESS]\x1b[0m PDF file renamed.`);
                        }
                        catch (e) {
                            console.error(`  \x1b[31m[ERROR]\x1b[0m Could not rename PDF file:`, e);
                        }
                    }
                }
                else {
                    console.log(`  \x1b[32m[OK]\x1b[0m Filename is already in the correct format.`);
                }
            }
            else {
                console.log(`  \x1b[91m[FAIL]\x1b[0m Could not generate a valid new name for this file.`);
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const argv = yield (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
            .option('directory', { alias: 'd', type: 'string', default: './Books' })
            .option('model', { alias: 'm', type: 'string', default: 'gemini-2.5-flash-lite' })
            .option('live', { type: 'boolean', default: false, description: 'Actually rename files. Default is a dry run.' })
            .help().alias('help', 'h').argv;
        if (!process.env.GEMINI_API_KEY) {
            console.error('\x1b[1;31m❌ ERROR: GEMINI_API_KEY is not set in your .env file.\x1b[0m');
            process.exit(1);
        }
        try {
            yield fs_1.promises.access(argv.directory);
        }
        catch (error) {
            console.error(`\x1b[1;31m❌ ERROR: Directory not found: ${argv.directory}\x1b[0m`);
            process.exit(1);
        }
        if (argv.live) {
            console.log('\x1b[1;31m--- RUNNING IN LIVE MODE --- Files will be renamed.\x1b[0m');
        }
        else {
            console.log('\x1b[1;33m--- RUNNING IN DRY RUN MODE --- Use --live to rename files.\x1b[0m');
        }
        console.log(`\x1b[36m[CONFIG]\x1b[0m Directory: ${path.resolve(argv.directory)}`);
        console.log(`\x1b[36m[CONFIG]\x1b[0m Model: ${argv.model}`);
        try {
            yield processAllPdfs(argv.directory, argv.model, !argv.live);
            console.log('\n\x1b[1;32m✅ All PDF files processed.\x1b[0m');
        }
        catch (error) {
            console.error('\n\x1b[1;31m❌ A critical error stopped the script.\x1b[0m');
        }
    });
}
main();
