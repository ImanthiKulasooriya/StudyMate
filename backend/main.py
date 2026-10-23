
import json
import sqlite3
from contextlib import asynccontextmanager
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from database import get_connection, init_db
from ai_service import (
    extract_pdf_pages,
    prepare_document,
    generate_summary,
    retrieve_chunks,
    answer_question,
    generate_quiz,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="StudyMate API",
    description="AI-powered university study assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class QuizSubmission(BaseModel):
    quiz_id: str
    answers: list[int]

def get_document(document_id):
    with get_connection() as conn:
        document = conn.execute(
            "SELECT * FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()

        if not document:
            raise HTTPException(404, "Document not found")

        chunks = conn.execute(
            "SELECT page_number, content, embedding "
            "FROM chunks WHERE document_id = ?",
            (document_id,),
        ).fetchall()

        pages = conn.execute(
            "SELECT page_number, content FROM chunks "
            "WHERE document_id = ? ORDER BY id",
            (document_id,),
        ).fetchall()

    return document, [dict(c) for c in chunks], pages


@app.get("/api/health")
def health():
    return {"status": "ok", "application": "StudyMate"}


@app.get("/api/documents")
def list_documents():
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, filename, created_at FROM documents "
            "ORDER BY id DESC"
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)):
    filename = file.filename or "document.pdf"

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")

    pdf_bytes = await file.read()

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(400, "The uploaded file is not a valid PDF.")

    # A basic upload limit to reduce accidental large uploads.
    if not pdf_bytes or len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "PDF must be between 1 byte and 10 MB.")

    try:
        pages = extract_pdf_pages(pdf_bytes)
    except Exception:
        raise HTTPException(400, "Could not read this PDF file.")

    if not pages:
        raise HTTPException(
            400,
            "No readable text found. Scanned PDFs need OCR."
        )

    full_text = "\n\n".join(p["text"] for p in pages)
    if len(full_text) > 500_000:
        raise HTTPException(400, "The extracted document is too large.")

    chunks = prepare_document(pages)

    if not chunks:
        raise HTTPException(400, "No text chunks could be created.")

    try:
        with get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO documents (filename) VALUES (?)",
                (filename,),
            )
            document_id = cursor.lastrowid

            conn.executemany(
                "INSERT INTO chunks "
                "(document_id, page_number, content, embedding) "
                "VALUES (?, ?, ?, ?)",
                [
                    (
                        document_id,
                        chunk["page_number"],
                        chunk["content"],
                        json.dumps(chunk["embedding"]),
                    )
                    for chunk in chunks
                ],
            )

        return {
            "id": document_id,
            "filename": filename,
            "pages": len(pages),
            "chunks": len(chunks),
            "message": "Document uploaded successfully.",
        }

    except Exception:
        raise HTTPException(500, "Failed to save the document.")


@app.get("/api/documents/{document_id}/summary")
def summarize_document(document_id: int):
    document, _, chunks = get_document(document_id)

    text = "\n\n".join(row["content"] for row in chunks)

    try:
        summary = generate_summary(text)
    except Exception:
        raise HTTPException(502, "Summary generation failed.")

    return {
        "document_id": document_id,
        "filename": document["filename"],
        "summary": summary,
    }


@app.post("/api/documents/{document_id}/ask")
def ask_document(document_id: int, request: QuestionRequest):
    _, chunks, _ = get_document(document_id)

    passages = retrieve_chunks(request.question, chunks)

    try:
        result = answer_question(request.question, passages)
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(502, "Summary generation failed.")

    return result


@app.post("/api/documents/{document_id}/quiz")
def create_quiz(document_id: int):
    _, _, chunks = get_document(document_id)
    text = "\n\n".join(row["content"] for row in chunks)


    try:
        questions = generate_quiz(text, count=5)
    except ValueError as error:
        raise HTTPException(400, str(error))
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(502, "Quiz generation failed.")

    quiz_id = str(uuid.uuid4())

    try:
        with get_connection() as conn:
            conn.execute(
                "INSERT INTO quiz_sessions "
                "(id, document_id, questions_json) VALUES (?, ?, ?)",
                (
                    quiz_id,
                    document_id,
                    json.dumps(questions),
                ),
            )
    except Exception:
        raise HTTPException(500, "Could not save quiz session.")

    # Correct answers stay in the database.
    return {
        "quiz_id": quiz_id,
        "document_id": document_id,
        "questions": [
            {
                "question": q["question"],
                "options": q["options"],
            }
            for q in questions
        ],
    }


@app.post("/api/documents/{document_id}/quiz/submit")
def submit_quiz(
    document_id: int,
    submission: QuizSubmission,
):
    with get_connection() as conn:
        session = conn.execute(
            "SELECT * FROM quiz_sessions "
            "WHERE id = ? AND document_id = ?",
            (submission.quiz_id, document_id),
        ).fetchone()

        if not session:
            raise HTTPException(404, "Quiz session not found.")

        questions = json.loads(session["questions_json"])

        if len(submission.answers) != len(questions):
            raise HTTPException(
                400, "Please submit one answer per question."
            )

        if any(
            not isinstance(answer, int) or answer not in range(4)
            for answer in submission.answers
        ):
            raise HTTPException(400, "Invalid answer selection.")

        score = sum(
            answer == question["answer_index"]
            for answer, question in zip(
                submission.answers, questions
            )
        )

        conn.execute(
            "INSERT INTO quiz_attempts "
            "(document_id, score, total) VALUES (?, ?, ?)",
            (document_id, score, len(questions)),
        )

        # Consume the session to prevent duplicate submissions.
        conn.execute(
            "DELETE FROM quiz_sessions WHERE id = ?",
            (submission.quiz_id,),
        )

    return {
        "score": score,
        "total": len(questions),
        "results": [
            {
                "question": q["question"],
                "selected_index": submission.answers[i],
                "correct_index": q["answer_index"],
                "correct": (
                    submission.answers[i] == q["answer_index"]
                ),
                "explanation": q.get("explanation", ""),
            }
            for i, q in enumerate(questions)
        ],
    }


@app.delete("/api/quiz-sessions")
def clear_quiz_sessions():
    """Remove unfinished quiz sessions, for example after a page refresh."""
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM quiz_sessions")
        deleted_count = cursor.rowcount

    return {
        "message": "Unfinished quiz sessions cleared.",
        "deleted_count": deleted_count,
    }


@app.delete("/api/documents/{document_id}")
def delete_document(document_id: int):
    """Delete one document and all its related study records."""
    with get_connection() as conn:
        document = conn.execute(
            "SELECT id, filename FROM documents WHERE id = ?",
            (document_id,),
        ).fetchone()

        if not document:
            raise HTTPException(404, "Document not found.")

        conn.execute(
            "DELETE FROM quiz_sessions WHERE document_id = ?",
            (document_id,),
        )
        conn.execute(
            "DELETE FROM quiz_attempts WHERE document_id = ?",
            (document_id,),
        )
        conn.execute(
            "DELETE FROM chunks WHERE document_id = ?",
            (document_id,),
        )
        conn.execute(
            "DELETE FROM documents WHERE id = ?",
            (document_id,),
        )

    return {
        "message": "Document and related history deleted.",
        "filename": document["filename"],
    }


@app.delete("/api/library/history")
def clear_library_history():
    """Delete all uploaded documents and their related study records."""
    with get_connection() as conn:
        conn.execute("DELETE FROM quiz_sessions")
        conn.execute("DELETE FROM quiz_attempts")
        conn.execute("DELETE FROM chunks")
        cursor = conn.execute("DELETE FROM documents")
        deleted_count = cursor.rowcount

    return {
        "message": "Library history cleared successfully.",
        "deleted_documents": deleted_count,
    }


@app.get("/api/study-history")
def get_study_history():
    """Return quiz statistics and previous attempts."""
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                qa.id,
                qa.document_id,
                d.filename,
                qa.score,
                qa.total,
                qa.created_at
            FROM quiz_attempts AS qa
            LEFT JOIN documents AS d
                ON d.id = qa.document_id
            ORDER BY qa.id ASC
            """
        ).fetchall()

    attempts = []

    for row in rows:
        item = dict(row)
        total = item["total"] or 0
        score = item["score"] or 0

        item["percentage"] = (
            round(score / total * 100, 1)
            if total > 0
            else 0
        )
        attempts.append(item)

    total_attempts = len(attempts)

    average_percentage = (
        round(
            sum(item["percentage"] for item in attempts)
            / total_attempts,
            1,
        )
        if total_attempts
        else 0
    )

    highest_percentage = (
        max(item["percentage"] for item in attempts)
        if attempts
        else 0
    )

    return {
        "stats": {
            "total_attempts": total_attempts,
            "average_percentage": average_percentage,
            "highest_percentage": highest_percentage,
        },
        "attempts": list(reversed(attempts)),
    }

