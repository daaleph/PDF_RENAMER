# Tutorial: PDF_RENAMER System

## 1. Introduction

The **PDF_RENAMER** system is a powerful command-line tool designed to automate the tedious task of renaming PDF files. It intelligently reads the initial pages of a PDF, sends the text content to the Gemini AI, and renames the file based on the extracted title, authors, and publication year. This process transforms a folder of arbitrarily named files (e.g., `document1.pdf`, `temp.pdf`) into a consistently organized library (e.g., `TheRighteousMind_JonathanHaidt_2012.pdf`).

The primary script, `simple_renamer.ts` (compiled to `simple_renamer.js`), handles this entire workflow, making it an ideal tool for researchers, students, and anyone managing a large collection of digital documents.

## 2. Prerequisites

Before you begin, ensure you have the following software installed:

*   **Node.js**: The JavaScript runtime environment. You can download it from [nodejs.org](https://nodejs.org/). `npm`, the package manager, is included with the installation.
*   **Google Gemini API Key**: The script requires an API key to communicate with Google's AI models. You can obtain one from [Google AI for Developers](https://ai.google.dev/).

## 3. Setup and Configuration

Follow these steps to get the system ready for use:

1.  **Download the Project**: Unzip or clone the `PDF_RENAMER` project to your local machine.
2.  **Open a Terminal**: Navigate to the root directory of the `PDF_RENAMER` project.
3.  **Install Dependencies**: Run the following command to install the necessary Node.js packages as defined in `package.json`:
    ```bash
    npm install
    ```
4.  **Create Environment File**: Create a new file named `.env` in the project's root directory.
5.  **Set API Key**: Open the `.env` file and add your Gemini API key in the following format, replacing `YOUR_API_KEY` with your actual key:
    ```
    GEMINI_API_KEY=YOUR_API_KEY
    ```

## 4. How to Use the PDF Renamer

The script is executed from your terminal and can be run in two modes: "dry run" (to preview changes) and "live" (to perform the renaming).

**Step 1: Place Your PDFs**

Copy the PDF files you want to rename into the `BOOKS/` folder within the project directory, or any other folder of your choice.

**Step 2: Perform a Dry Run (Highly Recommended)**

A dry run will simulate the entire process without actually renaming any files. It will print the proposed name changes to the console, allowing you to verify the results first.

To perform a dry run on the default `./BOOKS` directory, execute:

```bash
node simple_renamer.js
```

If your files are in a different directory, use the `--directory` (or `-d`) flag:

```bash
node simple_renamer.js --directory "C:\Path\To\Your\PDFs"
```

You will see output in the console for each file, showing the original name and the proposed new name.

**Step 3: Run in Live Mode**

Once you have confirmed that the proposed names are correct, you can run the script in live mode by adding the `--live` flag. **This will permanently rename the files.**

```bash
node simple_renamer.js --live
```

To run in live mode on a specific directory:

```bash
node simple_renamer.js --directory "C:\Path\To\Your\PDFs" --live
```

The script will now process each file and rename it according to the AI-generated metadata.

## 5. Advanced Options

*   **Changing the AI Model**: You can specify a different Gemini model using the `--model` (or `-m`) flag. For example, to use a more powerful model for potentially difficult files, you could run:
    ```bash
    node simple_renamer.js --model gemini-1.5-pro --live
    ```