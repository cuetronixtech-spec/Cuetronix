import { Link } from "react-router-dom";

const RefundPolicy = () => (
  <div className="min-h-screen">
    <header className="h-14 border-b flex items-center px-6 bg-background"><Link to="/" className="font-bold text-lg text-primary">Cuetronix</Link></header>
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Refund Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>We offer a fair refund policy for all our subscription plans.</p>
        <h2 className="text-lg font-semibold text-foreground">Subscription Refunds</h2>
        <p>Refund requests within 7 days of payment will be processed in full.</p>
        <h2 className="text-lg font-semibold text-foreground">How to Request</h2>
        <p>Contact support@cuetronix.com with your account details.</p>
      </div>
    </div>
  </div>
);

export default RefundPolicy;
