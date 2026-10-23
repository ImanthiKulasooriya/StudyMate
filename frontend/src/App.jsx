import { useEffect, useState } from "react";
import "./App.css";

const API = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "") + "/api";

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [studyHistory, setStudyHistory] = useState({
    stats: {
      total_attempts: 0,
      average_percentage: 0,
      highest_percentage: 0,
    },
    attempts: [],
  });

  const selectedDocument = documents.find(
    (doc) => String(doc.id) === String(selectedId)
  );

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Something went wrong.");
    }

    return data;
  }

  async function loadDocuments() {
    try {
      const data = await request("/documents");
      setDocuments(data);

      if (data.length && !selectedId) {
        setSelectedId(String(data[0].id));
      }
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadDocuments();
    loadStudyHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

async function loadStudyHistory() {
  try {
    const data = await request("/study-history");
    setStudyHistory(data);
  } catch (err) {
    console.error("Could not load study history:", err);
  }
}
  
async function clearQuizSessions() {
  try {
    await request("/quiz-sessions", {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Could not clear old quiz sessions:", err);
  }
}


  useEffect(() => {
    setMessages([]);
    setSummary("");
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setError("");
    setNotice("");
  }, [selectedId]);
  

  async function uploadDocument(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setLoadingAction("upload");
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploaded = await request("/documents", {
        method: "POST",
        body: formData,
      });

      const updated = await request("/documents");
      setDocuments(updated);
      setSelectedId(String(uploaded.id));
      setFile(null);
      event.target.reset();

      setNotice(
        `Uploaded ${uploaded.filename}. Processed ${uploaded.pages} pages.`
      );
    } catch (err) {
      setError(err.message);

    } finally {
       setLoading(false);
       setLoadingAction("");
    }
  }

  
async function deleteDocument(documentId) {
  const documentToDelete = documents.find(
    (doc) => String(doc.id) === String(documentId)
  );

  if (!documentToDelete) return;

  const confirmed = window.confirm(
    `Delete "${documentToDelete.filename}" and its quiz history? This cannot be undone.`
  );

  if (!confirmed) return;

  setLoading(true);
  setLoadingAction("delete");
  setError("");
  setNotice("");  

  try {
    await request(`/documents/${documentId}`, {
      method: "DELETE",
    });

    const updated = await request("/documents");
    setDocuments(updated); 
    await loadStudyHistory();

    if (String(selectedId) === String(documentId)) {
      setSelectedId(
        updated.length ? String(updated[0].id) : ""
      );
      setMessages([]);
      setSummary("");
      setQuiz(null);
      setAnswers({});
      setResult(null);
      setQuestion("");
    }

    setNotice(`Deleted ${documentToDelete.filename}.`);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
    setLoadingAction("");
  }
}

async function clearLibraryHistory() {
  const confirmed = window.confirm(
    "Delete ALL uploaded documents, quiz attempts, and saved quiz sessions? This cannot be undone."
  );

  if (!confirmed) return;

  setLoading(true);
  setLoadingAction("clear");
  setError("");
  setNotice("");

  try {
    await request("/library/history", {
      method: "DELETE",
    });
    await loadStudyHistory();

    setDocuments([]);
    setSelectedId("");
    setMessages([]);
    setSummary("");
    setQuiz(null);
    setAnswers({});
    setResult(null);
    setQuestion("");
    setFile(null);

    setNotice("Library history cleared successfully.");
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
    setLoadingAction("");
  }
}


  async function generateSummary() {
    if (!selectedId) return;

    setLoading(true);
    setLoadingAction("summary");
    setError("");
    setNotice("");

    try {
      const data = await request(
        `/documents/${selectedId}/summary`
      );

      setSummary(data.summary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }

  async function askQuestion(event) {
    event.preventDefault();

    if (!selectedId || !question.trim()) return;

    const currentQuestion = question.trim();

    setQuestion("");
    setLoading(true);
    setLoadingAction("ask");
    setError("");
    setNotice("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: currentQuestion,
      },
    ]);

    try {
      const data = await request(
        `/documents/${selectedId}/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: currentQuestion,
          }),
        }
      );

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }

  async function generateQuiz() {
    if (!selectedId) return;

    setLoading(true);
    setLoadingAction("quiz");
    setError("");
    setNotice("");
    setQuiz(null);
    setAnswers({});
    setResult(null);

    try {
      const data = await request(
        `/documents/${selectedId}/quiz`,
        {
          method: "POST",
        }
      );

      setQuiz(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }

  async function submitQuiz() {
    if (!quiz || !selectedId || loading) return;

    setLoading(true);
    setLoadingAction("submit");
    setError("");
    setNotice("");

    try {
      const data = await request(
        `/documents/${selectedId}/quiz/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quiz_id: quiz.quiz_id,
            answers: quiz.questions.map(
              (_, index) => Number(answers[index])
            ),
          }),
        }
      );

      setResult(data);
      await loadStudyHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">S</span>
          <div>
            <h2>StudyMate</h2>
            <p>Your AI study space</p>
          </div>
        </div>

        <div className="sidebar-label">YOUR LIBRARY</div>

        <div className="document-list">
          {documents.map((doc) => (
            <button
              key={doc.id}
              className={
                String(doc.id) === String(selectedId)
                  ? "document-item active"
                  : "document-item"
              }
              onClick={() => setSelectedId(String(doc.id))}
            >
              <span>▤</span>
              <span className="document-name">
                {doc.filename}
              </span>
            </button>
          ))}

          {documents.length === 0 && (
            <p className="muted small">
              Your uploaded notes will appear here.
            </p>
          )}
        </div>

        
            <button
              type="button"
              className="secondary-button"
              onClick={clearLibraryHistory}
              disabled={!documents.length || loading}
            >
              {loadingAction === "clear"
                ? "Clearing library..."
                : "Clear Library History"}
              
            </button>


        <div className="sidebar-footer">
          Independent student project
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">STUDY SMARTER</p>
            <h1>Study dashboard</h1>
          </div>

          <span className="status-pill">● Workspace</span>
        </header>

        <section className="welcome-card">
          <div>
            <p className="eyebrow">
              YOUR PERSONAL STUDY ASSISTANT
            </p>
            <h2>Learn better, one document at a time.</h2>
            <p>
              Upload lecture notes, explore key ideas, and
              check your understanding.
            </p>
          </div>

          <div className="welcome-symbol">✦</div>
        </section>

        {error && (
          <div className="alert error" role="alert">
            {error}
            <button onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}

        {notice && (
          <div className="alert success" role="status">
            {notice}
          </div>
        )}

        <section className="panel upload-panel">
          <div className="section-heading">
            <div>
              <h2>Upload lecture notes</h2>
              <p>
                Start with a text-based PDF, up to 10 MB.
              </p>
            </div>

            <span className="feature-icon">↑</span>
          </div>

          <form
            onSubmit={uploadDocument}
            className="upload-form"
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) =>
                setFile(event.target.files?.[0] || null)
              }
            />

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loadingAction === "upload" ? "Uploading PDF..." : "Upload PDF"}
            </button>
          </form>
        </section>

        

        <section className="feature-grid">
          <article className="panel feature-card">
            <span className="feature-icon">✎</span>
            <h3>Smart summaries</h3>
            <p>
              Review the key points from your lecture notes.
            </p>

            <button
              className="secondary-button"
              onClick={generateSummary}
              disabled={!selectedId || loading}
            >
              {loadingAction === "summary"
                ? "Generating summary..."
                : "Generate summary"}
            </button>
          </article>

          <article className="panel feature-card">
            <span className="feature-icon">?</span>
            <h3>Ask your notes</h3>
            <p>
              Ask questions and explore supporting passages.
            </p>

            <span className="feature-hint">
              Use the study chat below
            </span>
          </article>

          <article className="panel feature-card">
            <span className="feature-icon">✓</span>
            <h3>Practice quiz</h3>
            <p>
              Test your understanding of the selected document.
            </p>

            <button
              className="secondary-button"
              onClick={generateQuiz}
              disabled={!selectedId || loading}
            >
              {loadingAction === "quiz"
                ? "Generating quiz..."
                : "Generate quiz"}
            </button>
          </article>
        </section>

        {!selectedDocument && (
          <section className="panel empty-state">
            <div className="empty-symbol">▤</div>
            <h2>Choose your first study document</h2>
            <p>
              Upload a PDF above. Then you can generate a
              summary, ask questions, and practise with a quiz.
            </p>
          </section>
        )}

       {selectedDocument && (
          <section className="panel selected-document">
            <div>
            <p className="eyebrow">CURRENT DOCUMENT</p>
            <h2>{selectedDocument.filename}</h2>
            <p className="muted">
                Uploaded {selectedDocument.created_at}
            </p>
            </div>

            
            <div>
                <span className="document-badge">PDF</span>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => deleteDocument(selectedDocument.id)}
                  disabled={loading}
                >
                  {loadingAction === "delete"
                    ? "Deleting..."
                    : "Delete Document"}
                </button>
            </div>
              </section>

        )}

        {summary && (
          <section className="panel result-panel">
            <h2>Document summary</h2>
            <p className="readable-text">{summary}</p>
          </section>
        )}

        {quiz && (
          <section className="panel result-panel">
            <h2>Practice quiz</h2>
            <p className="muted">
              Select one answer for each question.
            </p>

            {quiz.questions.map((item, index) => (
              <div className="question-block" key={index}>
                <h3>
                  {index + 1}. {item.question}
                </h3>

                {item.options.map((option, optionIndex) => (
                  <label
                    className="option"
                    key={optionIndex}
                  >
                    <input
                      type="radio"
                      name={`question-${index}`}
                      checked={
                        answers[index] === String(optionIndex)
                      }
                      disabled={Boolean(result) || loading}
                      onChange={() =>
                        setAnswers((previous) => ({
                          ...previous,
                          [index]: String(optionIndex),
                        }))
                      }
                    />

                    {option}
                  </label>
                ))}

                {result && result.results?.[index] && (
                  <p className="explanation">
                    {result.results[index].correct
                      ? "Correct!"
                      : "Not quite."}

                    {" "}Correct answer:{" "}

                    {
                      item.options[
                        result.results[index].correct_index
                      ]
                    }

                    <br />

                    {result.results[index].explanation}
                  </p>
                )}
              </div>
            ))}

            {!result ? (
              <button
                type="button"
                className="primary-button"
                onClick={submitQuiz}
                disabled={
                  loading ||
                  quiz.questions.length === 0 ||
                  quiz.questions.some(
                    (_, index) =>
                      answers[index] === undefined
                  )
                }
              >
                {loadingAction === "submit"
                  ? "Checking answers..."
                  : "Submit answers"} 
              </button>
            ) : (
              <div className="score-result">
                <h3>
                  Your score: {result.score}/{result.total}
                </h3>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={generateQuiz}
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Try another quiz"}
                </button>
              </div>
            )}
          </section>
        )}
        
<section className="panel history-panel">
  <div className="section-heading">
    <div>
      <p className="eyebrow">YOUR LEARNING JOURNEY</p>
      <h2>Study History</h2>
      <p className="muted">
        Track your quiz performance over time.
      </p>
    </div>
    <button
      type="button"
      className="secondary-button"
      onClick={loadStudyHistory}
      disabled={loading}
    >
      Refresh History
    </button>
  </div>

  <div className="history-stats">
    <article className="history-stat">
      <p>Total attempts</p>
      <h3>{studyHistory.stats.total_attempts}</h3>
    </article>

    <article className="history-stat">
      <p>Average score</p>
      <h3>{studyHistory.stats.average_percentage}%</h3>
    </article>

    <article className="history-stat">
      <p>Highest score</p>
      <h3>{studyHistory.stats.highest_percentage}%</h3>
    </article>
  </div>

  <div className="history-chart">
    <h3>Progress over time</h3>

    {studyHistory.attempts.length === 0 ? (
      <p className="muted">
        Complete a quiz to start tracking your progress.
      </p>
    ) : (
      <div className="progress-list">
        {studyHistory.attempts
          .slice(0, 10)
          .reverse()
          .map((attempt) => (
            <div className="progress-item" key={attempt.id}>
              <div className="progress-label">
                <span>
                  {attempt.filename || "Deleted document"}
                </span>
                <strong>{attempt.percentage}%</strong>
              </div>

              <div
                className="progress-track"
                role="progressbar"
                aria-label={`Score for ${attempt.filename || "quiz"}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={attempt.percentage}
              >
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, attempt.percentage)
                    )}%`,
                  }}
                />
              </div>

              <p className="muted small">
                {attempt.score}/{attempt.total} correct
                {" · "}
                {attempt.created_at}
              </p>
            </div>
          ))}
      </div>
    )}
  </div>

  <div className="history-table-section">
    <h3>Previous attempts</h3>

    {studyHistory.attempts.length === 0 ? (
      <p className="muted">
        No quiz attempts yet.
      </p>
    ) : (
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Date</th>

            </tr>
          </thead>
          <tbody>
            {studyHistory.attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>
                  {attempt.filename || "Deleted document"}
                </td>
                <td>
                  {attempt.score}/{attempt.total}
                </td>
                <td>{attempt.percentage}%</td>
                <td>{attempt.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</section>


        <section className="panel chat-panel">
          <div className="section-heading">
            <div>
              <h2>Study chat</h2>
              <p>
                Answers are based on retrieved document passages.
              </p>
            </div>

            <span className="feature-icon">✦</span>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-placeholder">
                <span>✦</span>
                <p>
                  Ask something like: “Explain the main concept
                  in these notes.”
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                className={`message ${message.role}`}
                key={index}
              >
                <strong>
                  {message.role === "user"
                    ? "You"
                    : "StudyMate"}
                </strong>

                <p>{message.content}</p>

                {message.sources?.length > 0 && (
                  <div className="sources">
                    <strong>Supporting passages</strong>

                    {message.sources.map(
                      (source, sourceIndex) => (
                        <div
                          className="source-item"
                          key={sourceIndex}
                        >
                          <span>
                            Page {source.page_number}
                          </span>

                          <p>{source.content}</p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={askQuestion}
            className="chat-form"
          >
            <input
              value={question}
              onChange={(event) =>
                setQuestion(event.target.value)
              }
              placeholder="Ask a question about your notes..."
              disabled={!selectedId || loading}
            />

            <button
              type="submit"
              className="primary-button"
              disabled={
                !selectedId || loading || !question.trim()
              }
            >
              {loadingAction === "ask" ? "Thinking..." : "Send"}
            </button>
          </form>
        </section>

        <footer className="footer">
          StudyMate · Built as a student software engineering project
        </footer>
      </main>
    </div>
  );
}

export default App;
