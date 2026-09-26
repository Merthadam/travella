import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const steps = ["Register", "Verify email", "Authenticator", "My plans"];

function AuthStepper() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const next = () => {
    if (step === 0 && !email.includes("@")) return setError("Enter a valid email address.");
    setError("");
    setStep(Math.min(step + 1, steps.length - 1));
  };
  return <main className="shell">
    <p className="eyebrow">TRAVELLA ACCOUNT</p>
    <h1>{steps[step]}</h1>
    <ol className="checklist">{steps.map((label, index) => <li className={index <= step ? "done" : ""} key={label}>{label}</li>)}</ol>
    {step === 0 && <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" /></label>}
    {step === 1 && <p className="quiet">Check your email for the verification link. Private plans stay locked until verification succeeds.</p>}
    {step === 2 && <p className="quiet">Authenticator setup is optional now, but recovery-code sign-in requires replacement before private access.</p>}
    {step === 3 && <p className="quiet">You are signed in. My plans is the safe default destination.</p>}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="actions"><button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</button><button className="primary" onClick={next} disabled={step === steps.length - 1}>{step === 0 ? "Create account" : "Continue"}</button></div>
  </main>;
}

createRoot(document.getElementById("root")).render(<AuthStepper />);
