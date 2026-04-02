import { Link } from "react-router-dom";

const TermsAndConditions = () => (
  <div className="min-h-screen">
    <header className="h-14 border-b flex items-center px-6 bg-background"><Link to="/" className="font-bold text-lg text-primary">Cuetronix</Link></header>
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Terms & Conditions</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>By using Cuetronix, you agree to these terms and conditions.</p>
        <h2 className="text-lg font-semibold text-foreground">Use of Service</h2>
        <p>You may use our platform to manage your snooker/pool club operations subject to these terms.</p>
        <h2 className="text-lg font-semibold text-foreground">Account Responsibilities</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
      </div>
    </div>
  </div>
);

export default TermsAndConditions;
