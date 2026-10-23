# StudyMate — AI-Powered Study Assistant

StudyMate is a web application designed to help university students study more efficiently using their lecture notes and PDF documents.

Students can upload PDF documents, generate summaries, ask questions about their study materials, and practise with automatically generated quizzes.

## Features

- **PDF Upload:** Upload lecture notes and study materials in PDF format.
- **Smart Summaries:** Generate concise summaries from document content.
- **Study Chat:** Ask questions about uploaded documents and receive relevant answers with source references.
- **Quiz Generation:** Generate practice questions based on uploaded study materials.
- **Quiz Evaluation:** Submit answers and view scores and feedback.
- **Study History:** Review available quiz attempts and learning progress.
- **Responsive Interface:** Use the application on desktop and mobile screens.
- **Local Processing:** Core study features are designed to work without requiring paid OpenAI API credits.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- CSS

### Backend
- Python
- FastAPI
- SQLite
- SQLAlchemy (if used in the current implementation)
- PDF text extraction and NLP utilities

## Project Architecture

```text
StudyMate/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── ai_service.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── index.html
├── .gitignore
└── README.md
```

## Requirements

Install the following before running StudyMate:

- Python 3.10 or later (use a version compatible with the project's dependencies)
- Node.js and npm
- Git (optional, for version control)

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd StudyMate
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Set up the backend

Open PowerShell in the project root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

If your existing virtual environment is in the project root, you can continue using that environment instead.

### 3. Start the backend

From the `backend` directory, run:

```powershell
uvicorn main:app --reload
```

The API should be available at:

- API base: `http://127.0.0.1:8000/api`
- API health endpoint: `http://127.0.0.1:8000/api/health`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 4. Set up the frontend

Open a second PowerShell terminal in the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## How to Use StudyMate

1. Start the backend and frontend.
2. Open StudyMate in your browser.
3. Upload a PDF containing selectable text.
4. Select the uploaded document.
5. Generate a summary to review the main points.
6. Ask questions through Study Chat.
7. Generate a quiz and answer the questions.
8. Submit the quiz to view your result.
9. Review study history if available in the current version.

## Limitations

- PDF files containing only scanned images may not work without OCR support.
- The quality of summaries, answers, and quizzes depends on the text extracted from the PDF.
- Extractive summaries and locally generated questions may not have the same conversational ability as a large language model.
- Supported PDF size and file-type restrictions depend on the backend validation settings.

## Future Improvements

- Improve answer relevance and source highlighting.
- Add OCR support for scanned lecture notes.
- Expand study analytics and progress visualizations.
- Add more question types and difficulty levels.
- Improve accessibility and mobile usability.

## Academic Project

StudyMate is an undergraduate software engineering project exploring how web technologies and local text-processing techniques can support university students in studying their learning materials.

## License

This project is currently intended for educational use. Add a license if you decide to distribute it under specific reuse conditions.
