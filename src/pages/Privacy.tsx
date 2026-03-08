import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
          </div>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="cyber-card p-6 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              When you create an account on SODABLOX, we collect your chosen username and password. 
              We do not collect your real name, email address, or other personally identifiable information. 
              We may collect anonymized IP hashes for security purposes such as alt-account detection.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              Your information is used solely to provide and improve the SODABLOX platform. This includes:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Account authentication and security</li>
              <li>Displaying your profile to other users</li>
              <li>Facilitating trades and transactions</li>
              <li>Preventing abuse and enforcing our terms</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">3. Data Storage & Security</h2>
            <p className="text-muted-foreground">
              All data is stored securely with encryption at rest and in transit. 
              Passwords are hashed and never stored in plain text. 
              We implement row-level security policies to ensure users can only access their own data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">4. Virtual Economy</h2>
            <p className="text-muted-foreground">
              SODABLOX features a virtual economy with "Emeralds" as currency. 
              All virtual items and currency have no real-world monetary value. 
              We reserve the right to modify, reset, or adjust any virtual economy elements at any time.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">5. Third-Party Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell, trade, or share your personal information with third parties. 
              Your public profile (username, avatar, online status) is visible to other SODABLOX users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">6. Data Deletion</h2>
            <p className="text-muted-foreground">
              You may request deletion of your account and associated data by contacting an administrator. 
              Some data may be retained for security and moderation purposes.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">7. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this privacy policy from time to time. 
              Continued use of SODABLOX after changes constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
