# StudyMate — AI-Powered University Study Assistant

StudyMate is a web-based study assistant designed to help university students learn more effectively from their lecture notes. Students can upload PDF documents, generate summaries, ask questions about document content, practise with automatically generated quizzes, and track their learning progress.

## Features

- **PDF Document Upload:** Upload and manage lecture notes in PDF format.
- **Smart Summaries:** Generate concise summaries from uploaded study materials.
- **Study Chat:** Ask questions about a selected document and view supporting passages from the source.
- **Practice Quizzes:** Generate multiple-choice questions based on uploaded notes.
- **Automatic Quiz Evaluation:** Submit answers and receive scores, correct answers, and explanations.
- **Study History:** Review previous quiz attempts, average scores, highest scores, and progress.
- **Document Management:** Delete individual documents or clear the library history.
- **Responsive Interface:** Access the study dashboard on desktop and mobile screens.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, JavaScript, CSS |
| Frontend development server | Vite |
| Backend | Python, FastAPI |
| Database | SQLite |
| PDF processing | Python PDF-processing libraries |
| API communication | REST API, HTTP, JSON |
| Version control | Git and GitHub |

## System Architecture

StudyMate uses a frontend-backend architecture.

```text
Student
   |
   v
React Frontend (Vite)
   |
   | HTTP / JSON requests
   v
FastAPI Backend
   |
   +---- PDF processing and text extraction
   |
   +---- Document retrieval and study features
   |
   +---- Summary and quiz generation
   |
   v
SQLite Database
   |
   +---- Documents and extracted text
   +---- Quiz attempts and study history
```

The React frontend provides the user interface. The FastAPI backend processes requests, handles document-related operations, and communicates with the SQLite database. The frontend displays the results returned by the backend.

## Prerequisites

Install the following software before running StudyMate:

- Python 3.13 or another version compatible with the project's dependencies
- Node.js and npm
- Git
- Visual Studio Code or another code editor
- A modern web browser

## Project Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/StudyMate.git
cd StudyMate
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

### 2. Set up the backend

Open a terminal in the project root.

On Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If `requirements.txt` does not exist yet, create it from the project's actual Python dependencies before running the installation command.

### 3. Configure environment variables

Create a `.env` file in the backend directory only if the backend requires environment variables.

For example, if the application reads this setting:

```env
OPENAI_MODEL=gpt-4o-mini
```

Include it only if the current implementation uses it. Do not publish API keys, passwords, or other secrets.

StudyMate's local processing features should be configured according to the current backend implementation. An OpenAI API key is not required if the relevant features run entirely locally.

### 4. Start the backend

From the `backend` directory, with the virtual environment activated:

```powershell
uvicorn main:app --reload
```

The API should be available at:

```text
http://127.0.0.1:8000
```

Interactive API documentation:

```text
http://127.0.0.1:8000/docs
```

Health endpoint:

```text
http://127.0.0.1:8000/api/health
```

### 5. Start the frontend

Open a second terminal:

```powershell
cd C:\Users\imant\StudyMate\frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

Keep both development servers running while using the application.

## Using StudyMate

1. Open the StudyMate web application.
2. Upload a text-based PDF containing lecture notes.
3. Select the document from the library.
4. Generate a summary to review the main concepts.
5. Ask questions through Study Chat.
6. Generate a practice quiz and