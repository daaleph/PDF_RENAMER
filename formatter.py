#!/usr/bin/env python3
"""
Recursively scans a directory for PDF files and uses the Google Gemini API 
to correct their filenames based on a specific capitalization rule.

This script is built upon a provided template for robust Gemini API communication,
including detailed logging, rate limit handling with exponential backoff, and
the official Python SDK patterns.
"""
import os
import time
import random
import logging
from dotenv import load_dotenv
import google.genai as genai

# --- 1. Logging and Environment Configuration (from your template) ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info("Loading environment variables from .env file...")
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    logging.critical("Error: GEMINI_API_KEY environment variable not set in .env file. Exiting.")
    exit(1)
else:
    logging.info("GEMINI_API_KEY loaded successfully.")

# --- 2. Gemini Client Initialization (from your template) ---
try:
    logging.info("Initializing Google Gemini client...")
    # Using the genai.Client class as required by your environment.
    client = genai.Client(api_key=GEMINI_API_KEY)
    logging.info("Gemini client initialized successfully.")
except Exception as e:
    logging.critical(f"Fatal Error: Could not initialize the Gemini client: {e}", exc_info=True)
    exit(1)


# --- 3. Robust API Communication Function (adapted from your template) ---
MAX_RETRIES = 5
INITIAL_BACKOFF_SECONDS = 10 # Adjusted for potentially many small requests
MAX_BACKOFF_SECONDS = 120

def get_gemini_response(prompt: str) -> str:
    """
    Sends a prompt to the Google Gemini API and returns the response.
    Includes an intelligent retry mechanism for rate limit errors.
    """
    logging.debug(f"Preparing to send prompt to Gemini model.")
    
    for attempt in range(MAX_RETRIES):
        try:
            logging.debug(f"Attempt {attempt + 1}/{MAX_RETRIES}: Calling Gemini API...")
            response = client.models.generate_content(
                model=os.getenv("MODEL_NAME"), # The model path format is typically "models/model-name"
                contents=prompt
            )
            
            logging.debug(f"Attempt {attempt + 1}/{MAX_RETRIES}: API call successful.")
            
            if response.text:
                return response.text.strip()
            else:
                logging.warning("Response received, but it contains no text. It may have been blocked.")
                # Return empty string to signify a non-successful but non-crashing response
                return ""

        except Exception as e:
            error_message = str(e).upper()
            
            # Check for common rate limit error indicators
            if "429" in error_message or "RESOURCE_EXHAUSTED" in error_message or "RATE LIMIT" in error_message:
                if attempt < MAX_RETRIES - 1:
                    backoff_time = min(INITIAL_BACKOFF_SECONDS * (2 ** attempt), MAX_BACKOFF_SECONDS)
                    jitter = random.uniform(0, 3)
                    wait_time = backoff_time + jitter
                    
                    logging.warning(
                        f"Attempt {attempt + 1}/{MAX_RETRIES}: Rate limit hit. "
                        f"Waiting for {wait_time:.2f} seconds before next retry."
                    )
                    time.sleep(wait_time)
                else:
                    logging.error(f"Gemini API failed after {MAX_RETRIES} attempts due to persistent rate limiting.")
                    # Return empty to allow the main loop to continue with other files
                    return ""
            else:
                logging.error(f"Attempt {attempt + 1}/{MAX_RETRIES}: A non-recoverable error occurred: {e}")
                return "" # Return empty so one error doesn't stop the whole script
    
    logging.error(f"Failed to get response for prompt after {MAX_RETRIES} attempts.")
    return ""

# --- 4. AI-Powered File Formatting Logic ---

def get_formatted_title_with_ai(original_title: str) -> str | None:
    """
    Constructs a prompt, gets the AI's decision, and parses it.
    
    Returns:
        The new title if a change is needed, otherwise None.
    """
    prompt = f"""
    You are an expert file name formatter. Your task is to analyze a filename and correct it based on a specific rule.

    THE RULE:
    A filename is correctly formatted if every distinct word starts with a capital letter. This rule applies even when words are not separated by spaces. Underscores, hyphens, and existing capitalization should be respected and preserved where appropriate.

    EXAMPLES of poorly formatted names and their corrections:
    - "Therighteousmindwhygoodpeoplearedividedbypoliticsandreligion" -> "TheRighteousMindWhyGoodPeopleAreDividedByPoliticsAndReligion"
    - "Chapter_01_The_Basics" -> "Chapter01_01TheBasics"

    EXAMPLES of correctly formatted names (DO NOT CHANGE THESE):
    - "PersonalityEmotionalandSelf-AssessedIntelligenceandRightWingAuthoritarianism"
    - "HowtheDarkTriadtraitspredictrelationshipchoices"
    - "TheLuciferEffectUnderstandingHowGoodPeopleTurnEvil"
    - "SNAKESINSUITSWhenPsychopathsGotoWork"

    YOUR TASK:
    Analyze the filename provided below. First, decide if it needs to be reformatted. Then, provide the corrected name only if it needs changing.

    Respond in the following strict format, with no other text or explanation:
    Decision: [YES or NO]
    Corrected Name: [The new name if Decision is YES, otherwise the original name]

    ---
    Filename to analyze: "{original_title}"
    """
    
    response_text = get_gemini_response(prompt)
    
    if not response_text:
        logging.error(f"Received no response from AI for title: '{original_title}'")
        return None

    try:
        decision = "NO"
        corrected_name = original_title

        for line in response_text.strip().split('\n'):
            if line.lower().startswith("decision:"):
                decision = line.split(":", 1)[1].strip().upper()
            elif line.lower().startswith("corrected name:"):
                corrected_name = line.split(":", 1)[1].strip()

        if decision == "YES" and original_title != corrected_name:
            logging.info(f"AI decided to format. New name: '{corrected_name}'")
            return corrected_name
        else:
            logging.info("AI decided no change is needed.")
            return None
            
    except IndexError:
        logging.warning(f"Could not parse AI response: '{response_text}'. Skipping this file.")
        return None

# --- 5. Main Directory Processing Logic ---

def process_directory(root_dir: str):
    """
    Recursively walks through a directory, asks the AI to format PDF titles,
    and renames the files if necessary.
    """
    logging.info(f"--- Starting to process directory: {root_dir} ---")
    for subdir, _, files in os.walk(root_dir):
        for filename in files:
            # Process only PDF files, case-insensitively
            if filename.lower().endswith(".pdf"):
                original_path = os.path.join(subdir, filename)
                title_part = filename[:-4]  # Remove .pdf extension

                logging.info(f"Analyzing file: {filename}")
                
                new_title_part = get_formatted_title_with_ai(title_part)
                
                if new_title_part:
                    new_filename = new_title_part + ".pdf"
                    new_path = os.path.join(subdir, new_filename)
                    
                    try:
                        os.rename(original_path, new_path)
                        logging.info(f"SUCCESS: Renamed '{filename}' to '{new_filename}'")
                    except OSError as e:
                        logging.error(f"FAILURE: Could not rename '{filename}'. Error: {e}")
                
                print("-" * 20) # Visual separator in console
    
    logging.info("--- Directory processing complete. ---")


# --- 6. Script Execution ---
if __name__ == "__main__":
    # --- IMPORTANT ---
    # 1. Replace this path with the absolute path to your "ATTRACTIVENESS" directory.
    target_directory = "C:\\Users\\camip\\Documents\\NACC\\LECTURES\\ATTRACTIVENESS"
    
    # 2. IT IS STRONGLY RECOMMENDED TO BACK UP YOUR FILES BEFORE RUNNING.
    
    logging.info("--- AI File Renamer Initializing ---")
    
    if os.path.isdir(target_directory):
        # Safety confirmation step
        print(f"\nWARNING: This script will permanently rename files in the following directory:")
        print(f"  {target_directory}\n")
        print("Please ensure you have a backup of your data before proceeding.")
        
        consent = input("Are you sure you want to continue? (type 'yes' to proceed): ")
        
        if consent.lower() == 'yes':
            process_directory(target_directory)
        else:
            logging.info("Operation cancelled by the user.")
    else:
        logging.error(f"The specified directory does not exist: '{target_directory}'")