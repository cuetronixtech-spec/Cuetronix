import { Link } from "react-router-dom";

const PrivacyPolicy = () => (
  <div className="min-h-screen">
    <header className="h-14 border-b flex items-center px-6 bg-background"><Link to="/" className="font-bold text-lg text-primary">Cuetronix</Link></header>
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-foreground mb-6">Privacy Policy</h1>
      <div className="prose prose-sm text-muted-foreground space-y-4">
        <p>This privacy policy outlines how Cuetronix collects, uses, and protects your data.</p>
        <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>We collect information you provide when creating an account, managing your club, or using our services.</p>
        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <p>Your information is used to provide and improve our services, process transactions, and communicate with you.</p>
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p>For privacy-related inquiries, contact us at privacy@cuetronix.com.</p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicy;
