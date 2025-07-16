// Powerranks App - Updated for React Router DOM v6.20.1 compatibility
import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  Link,
  useLocation
} from "react-router-dom";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const playerList = [
  "Pratham", "Arjan", "Madhav", "Sid", "Jattan", "Arjun", "Saksham", "Japnam", "Kevin", "Surya", "Shiv", "Satvik", "Yash", "Kshitij", "Cristian", "Jaival"
];
const rankLabels = [
  "1st Overall", "2nd Overall", "3rd Overall", "4th Overall", "5th Overall",
  "6th Overall", "7th Overall", "8th Overall", "9th Overall", "10th Overall"
];
const USER_KEY = "powerranks_firestore_id";

function getColor(idx) {
  const palette = [
    "#00e6d8", "#3b82f6", "#a78bfa", "#f59e42", "#f43f5e", "#10b981", "#fbbf24", "#6366f1", "#eab308", "#14b8a6", "#f472b6", "#818cf8", "#f87171", "#22d3ee", "#a3e635"
  ];
  return palette[idx % palette.length];
}

function useRankingsData() {
  const numRanks = 10;
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [userDocId, setUserDocId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    // Fetch initial data
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching data:', error);
        return;
      }
      
      setAllSubmissions(data || []);
      setLoading(false);
      const myId = localStorage.getItem(USER_KEY);
      
      // Check if the stored ID actually exists in the database
      const hasValidSubmission = myId && data?.some(d => d.id === myId);
      setHasSubmitted(hasValidSubmission);
      setUserDocId(hasValidSubmission ? myId : null);
      
      // Clean up invalid localStorage entry
      if (myId && !hasValidSubmission) {
        localStorage.removeItem(USER_KEY);
      }
    };
    
    fetchData();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('rankings_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rankings' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAllSubmissions(prev => [...prev, payload.new]);
            // Check if this is the user's submission
            const myId = localStorage.getItem(USER_KEY);
            if (payload.new.id === myId) {
              setHasSubmitted(true);
              setUserDocId(myId);
            }
          } else if (payload.eventType === 'DELETE') {
            setAllSubmissions(prev => prev.filter(item => item.id !== payload.old.id));
            // Check if this was the user's submission
            const myId = localStorage.getItem(USER_KEY);
            if (payload.old.id === myId) {
              setHasSubmitted(false);
              setUserDocId(null);
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      document.head.removeChild(link);
      subscription.unsubscribe();
    };
  }, []);

  return { allSubmissions, hasSubmitted, userDocId, loading };
}

function RankingFormPage() {
  const numRanks = 10;
  const [selections, setSelections] = useState(Array(numRanks).fill(""));
  const [submitted, setSubmitted] = useState(false);
  const { hasSubmitted, loading } = useRankingsData();
  const navigate = useNavigate();
  const location = useLocation();
  const [redirectMsg, setRedirectMsg] = useState("");

  useEffect(() => {
    if (location.state && location.state.redirectMsg) {
      setRedirectMsg(location.state.redirectMsg);
    } else {
      setRedirectMsg("");
    }
  }, [location.state]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (selections.some((s) => !s) || hasSubmitted) return;
    try {
      const { data, error } = await supabase
        .from('rankings')
        .insert([{ selections }])
        .select();
      
      if (error) {
        throw error;
      }
      
      localStorage.setItem(USER_KEY, data[0].id);
      let msg = "Your Rankings:\n";
      for (let i = 0; i < numRanks; i++) {
        msg += `${rankLabels[i]}: ${selections[i]}\n`;
      }
      window.alert(msg);
      setSelections(Array(numRanks).fill(""));
      setSubmitted(false);
      navigate("/results");
    } catch (err) {
      console.error('Error saving ranking:', err);
      alert("Error saving ranking. Please try again.");
    }
  };

  const getDropdownOptions = (idx) => {
    const used = selections.filter((sel, i) => sel && i !== idx);
    const available = playerList.filter((name) => !used.includes(name));
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
        
        {loading ? (
          <div className="pr-loading">Loading...</div>
        ) : (
          <>
            {redirectMsg && (
              <div className="pr-redirect-msg">{redirectMsg}</div>
            )}
            
            {hasSubmitted ? (
              <div className="pr-already-submitted">
                You have already submitted your rankings. Delete your submission to vote again.
                <br />
                <Link to="/results" className="pr-link" style={{marginTop: '1rem', display: 'inline-block'}}>
                  View Results
                </Link>
              </div>
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
          </>
        )}
      </div>
      <style>{`
        .pr-redirect-msg {
          background: #2a1a1a;
          color: #fbbf24;
          border-radius: 0.7rem;
          padding: 0.7rem 1rem;
          margin-bottom: 1.2rem;
          text-align: center;
          font-size: 1.05rem;
          font-weight: 500;
          box-shadow: 0 1px 4px #fbbf2422;
        }
        .pr-link { color: #00e6d8; text-decoration: underline; font-weight: 600; }
        .pr-link:hover { color: #3b82f6; }
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

function ResultsPage() {
  const numRanks = 10;
  const { allSubmissions, hasSubmitted, userDocId, loading } = useRankingsData();
  const navigate = useNavigate();
  const [ownerMode, setOwnerMode] = useState(false);
  const [ownerInput, setOwnerInput] = useState("");
  const OWNER_CODE = "letmein";

  useEffect(() => {
    if (!loading && !hasSubmitted) {
      navigate("/", { state: { redirectMsg: "You must submit your rankings before viewing results." } });
    }
  }, [hasSubmitted, loading, navigate]);

  // Prepare chart data
  let chartData = null;
  if (allSubmissions.length > 0) {
    const counts = Array(numRanks).fill(0).map(() => ({}));
    for (const sub of allSubmissions) {
      sub.selections.forEach((name, pos) => {
        if (!counts[pos][name]) counts[pos][name] = 0;
        counts[pos][name]++;
      });
    }
    chartData = {
      labels: rankLabels,
      datasets: playerList.map((player, idx) => ({
        label: player,
        data: counts.map(pos => pos[player] || 0),
        backgroundColor: getColor(idx),
        borderRadius: 6,
        maxBarThickness: 22
      }))
    };
  }

  const handleDeleteSubmission = async (id) => {
    try {
      const { error } = await supabase
        .from('rankings')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      if (userDocId === id) {
        localStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.error('Error deleting ranking:', err);
      alert("Error deleting ranking. Please try again.");
    }
  };

  const handleClearAll = async () => {
    for (const sub of allSubmissions) {
      await handleDeleteSubmission(sub.id);
    }
    localStorage.removeItem(USER_KEY);
  };

  const handleOwnerCode = (e) => {
    e.preventDefault();
    if (ownerInput === OWNER_CODE) {
      setOwnerMode(true);
      setOwnerInput("");
    } else {
      alert("Incorrect code");
    }
  };

  return (
    <div className="pr-bg">
      <div className="pr-container">
        <h1 className="pr-title">Powerranks</h1>
        <p className="pr-subtitle">All Anonymous Rankings & Chart</p>
        <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
          <Link to="/" className="pr-link">Back to form</Link>
        </div>
        <form onSubmit={handleOwnerCode} style={{marginBottom: '1.2rem', textAlign: 'center'}}>
          {!ownerMode && (
            <>
              <input
                type="password"
                value={ownerInput}
                onChange={e => setOwnerInput(e.target.value)}
                placeholder="Owner code"
                className="pr-owner-input"
                style={{marginRight: '0.5rem', padding: '0.4rem 0.7rem', borderRadius: '0.5rem', border: '1px solid #23323a', background: '#16232a', color: '#00e6d8'}}
              />
              <button type="submit" className="pr-owner-btn">Enter</button>
            </>
          )}
        </form>
        {ownerMode && (
          <button className="pr-clearall-btn" onClick={handleClearAll}>
            Owner Clear All Rankings (irreversible)
          </button>
        )}
        {loading ? (
          <div className="pr-loading">Loading rankings...</div>
        ) : allSubmissions.length > 0 ? (
          <>
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
                      <tr key={submission.id}>
                        <td>{idx + 1}</td>
                        {submission.selections.map((name, i) => (
                          <td key={i}>{name}</td>
                        ))}
                        <td>
                          {userDocId === submission.id ? (
                            <button
                              className="pr-delete-btn"
                              title="Delete this ranking"
                              onClick={() => handleDeleteSubmission(submission.id)}
                            >
                              🗑️
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userDocId && (
                <button className="pr-clearall-btn" onClick={handleClearAll}>
                  Clear All Rankings (yours and everyone’s)
                </button>
              )}
            </div>
            <div className="pr-chart-wrap">
              <h2>Who Gets Picked Where?</h2>
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: true,
                      position: "bottom",
                      labels: { color: "#00e6d8", font: { size: 13, family: "Poppins" } }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.parsed.y}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      stacked: false,
                      ticks: { color: "#b2e6e6", font: { family: "Poppins" } },
                      grid: { color: "#23323a" }
                    },
                    y: {
                      beginAtZero: true,
                      ticks: { color: "#b2e6e6", font: { family: "Poppins" } },
                      grid: { color: "#23323a" }
                    }
                  }
                }}
                height={320}
              />
            </div>
          </>
        ) : (
          <div className="pr-loading">No rankings yet.</div>
        )}
      </div>
      <style>{`
        .pr-link { color: #00e6d8; text-decoration: underline; font-weight: 600; }
        .pr-link:hover { color: #3b82f6; }
        .pr-redirect-msg {
          background: #2a1a1a;
          color: #fbbf24;
          border-radius: 0.7rem;
          padding: 0.7rem 1rem;
          margin-bottom: 1.2rem;
          text-align: center;
          font-size: 1.05rem;
          font-weight: 500;
          box-shadow: 0 1px 4px #fbbf2422;
        }
        .pr-chart-wrap {
          margin: 2.5rem 0 1.5rem 0;
          background: #10151a;
          border-radius: 1.5rem;
          box-shadow: 0 2px 12px #00e6d822;
          padding: 1.5rem 1rem 2.5rem 1rem;
        }
        .pr-chart-wrap h2 {
          color: #00e6d8;
          text-align: center;
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 1.2rem;
        }
        .pr-loading {
          color: #00e6d8;
          text-align: center;
          margin: 2rem 0;
          font-size: 1.2rem;
        }
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
        .pr-owner-input {
          padding: 0.6rem 1rem;
          border-radius: 0.8rem;
          border: 1.5px solid #1b3a3a;
          font-size: 1.04rem;
          background: #16232a;
          color: #eafffa;
          font-family: inherit;
          outline: none;
          transition: border 0.2s, box-shadow 0.2s;
          box-shadow: 0 1.5px 6px rgba(0,255,255,0.03);
        }
        .pr-owner-input:focus {
          border: 1.5px solid #00e6d8;
          box-shadow: 0 0 0 2px #00e6d855;
        }
        .pr-owner-btn {
          padding: 0.6rem 1.2rem;
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
        .pr-owner-btn:hover {
          background: linear-gradient(90deg, #00bfae 60%, #00e6d8 100%);
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 4px 16px #00e6d833;
        }
        .pr-owner-btn:disabled {
          background: linear-gradient(90deg, #1b3a3a 60%, #16232a 100%);
          color: #b2e6e6;
          cursor: not-allowed;
          box-shadow: none;
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

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RankingFormPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </Router>
  );
} 