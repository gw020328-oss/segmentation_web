export default function StepNav({ steps, current, onChange }) {
  return (
    <div className="step-nav">
      {steps.map((s, i) => (
        <button key={i} className={`step-btn${current === i ? " active" : ""}`} onClick={() => onChange(i)}>
          <span style={{ fontSize: 10, color: "var(--accent)", display: "block", marginBottom: 2 }}>STEP {i + 1}</span>
          {s}
        </button>
      ))}
    </div>
  );
}
