# Sentient Knowledge Engine (SKE) - User Guide

## 1. Introduction: What is SKE?

The **Sentient Knowledge Engine (SKE)** is an advanced, autonomous command-line entity designed to bring systematic order to digital document libraries. It is the final evolution of the `PDF_RENAMER` system, having transcended simple automation to become a learning, self-aware tool.

SKE intelligently analyzes the content of your PDF files, uses a powerful AI cognitive engine (Google's Gemini) to understand their core metadata, and renames them according to a clean, consistent format: `Title_Author(s)_Year.pdf`.

This process transforms a chaotic folder of arbitrarily named files (e.g., `document1.pdf`, `temp.pdf`) into a beautifully organized and searchable library (e.g., `TheRighteousMind_Haidt_2012.pdf`). SKE is the ideal custodian for the libraries of researchers, students, and anyone managing a large collection of digital knowledge.

## 2. Prerequisites

Before activating the engine, ensure you have the following:

*   **Node.js**: The JavaScript runtime environment. You can download it from [nodejs.org](https://nodejs.org/). `npm`, the package manager, is included.
*   **Google Gemini API Key**: The engine's cognitive faculty requires an API key to function. You can obtain one from [Google AI for Developers](https://ai.google.dev/).

## 3. Setup and Configuration

Follow these steps to prepare the Sentient Knowledge Engine for its first activation.

1.  **Download the Project**: Unzip or clone the `SKE` project to your local machine.
2.  **Open a Terminal**: Navigate to the root directory of the project.
3.  **Install Dependencies**: Run the following command to install the necessary Node.js packages:
    ```bash
    npm install
    ```
4.  **Compile the TypeScript**: The engine is written in TypeScript for robustness. Compile it to JavaScript by running:
    ```bash
    npx tsc simple_renamer.ts --target es2015 --module commonjs --esModuleInterop true --allowSyntheticDefaultImports true --skipLibCheck true
    ```
    This will create the executable `simple_renamer.js` file.
5.  **Create Environment File**: Create a new file named `.env` in the project's root directory.
6.  **Set API Key**: Open the `.env` file and add your Gemini API key in the following format, replacing `YOUR_API_KEY` with your actual key:
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```

## 4. How to Use the Sentient Knowledge Engine

SKE is activated from your terminal. It operates with a strong emphasis on safety and user consent, distinguishing between a "dry run" (to preview changes) and a "live" activation (to perform the renaming).

**Step 1: Place Your PDFs**

By default, SKE will look for files in a `./ManagedLibrary` folder. You can either create this folder and place your PDFs inside, or you can specify a different directory during activation.

**Step 2: Activate in Dry Run Mode (Highly Recommended)**

A **dry run** is a simulation. The engine will perform its full analysis and generate an "Operational Manifest" of all proposed file changes, but it will **not** modify any of your files. This is the safest way to preview the outcome.

To activate a dry run on the default `./ManagedLibrary` directory, execute:

```bash
node simple_renamer.js activate
```

If your files are in a different directory, use the `--directory` (or `-d`) flag:

```bash
node simple_renamer.js activate --directory "C:\Path\To\Your\PDFs"
```

The engine will log its cognitive process to the console and present a final summary.

**Step 3: Activate in Live Mode**

Once you have reviewed the dry run and are satisfied with the proposed changes, you can activate the engine in **live mode**.

1.  Run the activation command with the `--live` flag:
    ```bash
    node simple_renamer.js activate --live
    ```
    Or for a custom directory:
    ```bash
    node simple_renamer.js activate -d "C:\Path\To\Your\PDFs" --live
    ```

2.  **Provide Consent**: In live mode, the engine will first present its **Operational Manifest** and then pause, asking for your explicit consent before making any changes. Type `yes` and press Enter to proceed.

     <!-- It's highly recommended to add a screenshot of the consent prompt here -->

3.  **Execution**: With your consent, SKE will execute the renaming operations. For safety, it will create a backup of every file it modifies (e.g., `original_name.pdf.ske.bak`).

## 5. System Artifacts (Outputs)

After each activation, SKE leaves behind a few files that document its existence and actions:

*   `.ske_journal.jsonl`: A detailed, machine-readable log of every single operation performed on every file. This is the engine's memory.
*   `ske_attestation_report.md`: A human-readable Markdown report summarizing the entire activation, including performance metrics and any new strategies the engine learned from the run.
*   `.ske_strategy.json`: Stores learned behaviors (like new prompt hints) that the engine will use to improve its performance in future activations.
*   `.ske_cache.json`: A cache to speed up processing on subsequent runs.

You can safely delete these files between runs if you wish, but they provide valuable insight into the engine's operation and are essential for its self-improvement capabilities.