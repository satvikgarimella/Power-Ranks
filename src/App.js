import React, { useState, useEffect } from "react";

const playerList = [
  "Pratham", "Arjan", "Madhav", "Sid", "Jattan", "Arjun", "Saksham", "Japnam", "Kevin", "Surya", "Shiv", "Satvik", "Yash", "Kshitij", "Cristian", "Jaival"
];
const rankLabels = [
  "1st Overall", "2nd Overall", "3rd Overall", "4th Overall", "5th Overall",
  "6th Overall", "7th Overall", "8th Overall", "9th Overall", "10th Overall"
];
const STORAGE_KEY = "powerranks_submissions";
const USER_KEY = "powerranks_user_submitted";

export default function App() {
  const numRanks = 10;
  const [selections, setSelections] = useState(Array(numRanks).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    // Inject Google Fonts (Poppins)
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    // Load submissions from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setAllSubmissions(JSON.parse(stored));
    }
    // Check if user has already submitted
    const userSubmitted = localStorage.getItem(USER_KEY);
    setHasSubmitted(!!userSubmitted);
    return () => { document.head.removeChild(link); };
  }, []);

  const handleSelect = (idx, value) => {
    setSelections((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleReset = () => {
    setSelections(Array(numRanks).fill(""));
    setSubmitted(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (selections.some((s) => !s) || hasSubmitted) return;
    // Save to localStorage
    const newSubmissions = [...allSubmissions, selections];
    setAllSubmissions(newSubmissions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubmissions));
    localStorage.setItem(USER_KEY, "1");
    setHasSubmitted(true);
    let msg = "Your Rankings:\n";
    for (let i = 0; i < numRanks; i++) {
      msg += `${rankLabels[i]}: ${selections[i]}\n`;
    }
    window.alert(msg);
    setSelections(Array(numRanks).fill(""));
    setSubmitted(false);
  };

  const handleDeleteSubmission = (idx) => {
    const newSubmissions = allSubmissions.filter((_, i) => i !== idx);
    setAllSubmissions(newSubmissions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSubmissions));
    // If user deleted their own submission, allow them to submit again
    if (hasSubmitted && idx === allSubmissions.length - 1) {
      localStorage.removeItem(USER_KEY);
      setHasSubmitted(false);
    }
  };

  const handleClearAll = () => {
    setAllSubmissions([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    setHasSubmitted(false);
  };

  // For each dropdown, show all unselected players + its own selection
  const getDropdownOptions = (idx) => {
    const used = selections.filter((sel, i) => sel && i !== idx);
    const available = playerList.filter((name) => !used.includes(name));
    // If this dropdown has a selection, add it back
    if (selections[idx] && !available.includes(selections[idx])) {
      available.push(selections[idx]);
    }
    return available.sort((a, b) => a.localeCompare(b));
  };

  return (
    <div className="pr-bg">
      <div className="pr-container">
        <h1 className="pr-title">Powerranks</h1>
        <p className="pr-subtitle">Rank your <span>Top 10</span> players</p>
        {hasSubmitted ? (
          <div className="pr-already-submitted">You have already submitted your rankings. Delete your submission to vote again.</div>
        ) : (
          <form className="pr-form" onSubmit={handleSubmit} autoComplete="off">
            {rankLabels.map((label, idx) => (
              <div className="pr-rank-row" key={idx}>
                <label className="pr-rank-label" htmlFor={`rank${idx}`}>{label}</label>
                <div className="pr-select-wrap">
                  <select
                    id={`rank${idx}`}
                    value={selections[idx]}
                    onChange={(e) => handleSelect(idx, e.target.value)}
                    className={submitted && !selections[idx] ? "pr-error" : ""}
                  >
                    <option value="">-- Select Player --</option>
                    {getDropdownOptions(idx).map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <span className="pr-chevron" aria-hidden>▼</span>
                </div>
              </div>
            ))}
            <div className="pr-actions">
              <button type="button" className="pr-reset-btn" onClick={handleReset}>
                Reset
              </button>
              <button
                type="submit"
                className="pr-submit-btn"
                disabled={selections.some((s) => !s)}
              >
                Submit Rankings
              </button>
            </div>
          </form>
        )}
        {allSubmissions.length > 0 && (
          <div className="pr-submissions">
            <h2>All Anonymous Rankings</h2>
            <div className="pr-table-wrap">
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {rankLabels.map((label, i) => (
                      <th key={i}>{label}</th>
                    ))}
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {allSubmissions.map((submission, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      {submission.map((name, i) => (
                        <td key={i}>{name}</td>
                      ))}
                      <td>
                        <button
                          className="pr-delete-btn"
                          title="Delete this ranking"
                          onClick={() => handleDeleteSubmission(idx)}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="pr-clearall-btn" onClick={handleClearAll}>
              Clear All Rankings
            </button>
          </div>
        )}
      </div>
      <style>{`
        .pr-already-submitted {
          background: #16232a;
          color: #00e6d8;
          border-radius: 1rem;
          padding: 1.2rem 1rem;
          margin: 1.5rem 0 2rem 0;
          text-align: center;
          font-size: 1.13rem;
          font-weight: 600;
          box-shadow: 0 2px 8px #00e6d822;
        }
        body, #root {
          min-height: 100vh;
        }
        .pr-bg {
          min-height: 100vh;
          width: 100vw;
          background: linear-gradient(135deg, #10151a 0%, #0a232e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', 'Segoe UI', Arial, sans-serif;
        }
        .pr-container {
          background: rgba(18, 24, 28, 0.98);
          border-radius: 2rem;
          box-shadow: 0 8px 32px rgba(0,255,255,0.08), 0 1.5px 8px rgba(0,0,0,0.12);
          padding: 2.5rem 2rem 2rem 2rem;
          max-width: 520px;
          width: 100%;
          margin: 2rem 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .pr-title {
          font-size: 2.3rem;
          font-weight: 700;
          letter-spacing: -1px;
          color: #00e6d8;
          margin-bottom: 0.2em;
          text-shadow: 0 2px 16px #0ff2, 0 1px 0 #000a;
        }
        .pr-subtitle {
          font-size: 1.1rem;
          color: #b2e6e6;
          margin-bottom: 2rem;
        }
        .pr-subtitle span {
          color: #00e6d8;
          font-weight: 600;
        }
        .pr-form {
          width: 100%;
        }
        .pr-rank-row {
          display: flex;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .pr-rank-label {
          flex: 0 0 120px;
          font-weight: 500;
          color: #b2e6e6;
          font-size: 1.04rem;
        }
        .pr-select-wrap {
          position: relative;
          flex: 1;
        }
        select {
          width: 100%;
          padding: 0.6rem 2.2rem 0.6rem 0.9rem;
          border-radius: 0.8rem;
          border: 1.5px solid #1b3a3a;
          font-size: 1.04rem;
          background: #16232a;
          color: #eafffa;
          font-family: inherit;
          appearance: none;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          box-shadow: 0 1.5px 6px rgba(0,255,255,0.03);
        }
        select:focus {
          border: 1.5px solid #00e6d8;
          box-shadow: 0 0 0 2px #00e6d855;
        }
        select.pr-error {
          border: 1.5px solid #e74c3c;
          background: #2a1a1a;
        }
        .pr-chevron {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          color: #00e6d8;
          font-size: 1.1em;
        }
        .pr-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 2.2rem;
          gap: 1.1rem;
        }
        .pr-submit-btn {
          flex: 1;
          padding: 0.85rem 0;
          border: none;
          border-radius: 1.2rem;
          font-size: 1.08rem;
          font-weight: 700;
          background: linear-gradient(90deg, #00e6d8 60%, #0a232e 100%);
          color: #10151a;
          box-shadow: 0 2px 8px #00e6d822;
          cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
        }
        .pr-submit-btn:disabled {
          background: linear-gradient(90deg, #1b3a3a 60%, #16232a 100%);
          color: #b2e6e6;
          cursor: not-allowed;
          box-shadow: none;
        }
        .pr-submit-btn:not(:disabled):hover {
          background: linear-gradient(90deg, #00bfae 60%, #00e6d8 100%);
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 4px 16px #00e6d833;
        }
        .pr-reset-btn {
          flex: 1;
          padding: 0.85rem 0;
          border: none;
          border-radius: 1.2rem;
          font-size: 1.08rem;
          font-weight: 700;
          background: linear-gradient(90deg, #232b2b 60%, #16232a 100%);
          color: #00e6d8;
          box-shadow: 0 2px 8px #00e6d822;
          cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
        }
        .pr-reset-btn:hover {
          background: linear-gradient(90deg, #00e6d8 60%, #232b2b 100%);
          color: #10151a;
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 4px 16px #00e6d844;
        }
        .pr-submissions {
          margin-top: 2.5rem;
          width: 100%;
        }
        .pr-submissions h2 {
          color: #00e6d8;
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          text-align: center;
        }
        .pr-table-wrap {
          overflow-x: auto;
        }
        .pr-table {
          width: 100%;
          border-collapse: collapse;
          background: #10151a;
          color: #eafffa;
          border-radius: 1rem;
          overflow: hidden;
          font-size: 0.98rem;
        }
        .pr-table th, .pr-table td {
          padding: 0.5rem 0.7rem;
          border-bottom: 1px solid #1b3a3a;
          text-align: center;
        }
        .pr-table th {
          background: #0a232e;
          color: #00e6d8;
          font-weight: 600;
        }
        .pr-table tr:last-child td {
          border-bottom: none;
        }
        .pr-delete-btn {
          background: none;
          border: none;
          color: #e74c3c;
          font-size: 1.2em;
          cursor: pointer;
          transition: color 0.18s, transform 0.13s;
        }
        .pr-delete-btn:hover {
          color: #ff4c4c;
          transform: scale(1.2);
        }
        .pr-clearall-btn {
          margin: 1.2rem auto 0 auto;
          display: block;
          padding: 0.7rem 1.5rem;
          border: none;
          border-radius: 1.2rem;
          font-size: 1.05rem;
          font-weight: 700;
          background: linear-gradient(90deg, #e74c3c 60%, #232b2b 100%);
          color: #fff;
          box-shadow: 0 2px 8px #e74c3c22;
          cursor: pointer;
          transition: background 0.18s, box-shadow 0.18s, transform 0.13s;
        }
        .pr-clearall-btn:hover {
          background: linear-gradient(90deg, #ff4c4c 60%, #e74c3c 100%);
          color: #fff;
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 4px 16px #e74c3c44;
        }
        @media (max-width: 600px) {
          .pr-container {
            padding: 1.1rem 0.3rem 1.2rem 0.3rem;
            max-width: 99vw;
            border-radius: 1.1rem;
          }
          .pr-title {
            font-size: 1.3rem;
          }
          .pr-rank-label {
            flex: 0 0 90px;
            font-size: 0.97rem;
          }
        }
      `}</style>
    </div>
  );
} 