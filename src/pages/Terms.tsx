import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';

const Terms = () => {
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
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-display font-bold">Terms of Service</h1>
          </div>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="cyber-card p-6 space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using SODABLOX, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not use the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">2. Account Registration</h2>
            <p className="text-muted-foreground">
              You must register an account to use SODABLOX. You are responsible for maintaining the confidentiality of your account credentials. You must not share your account with others or create multiple accounts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">3. Virtual Currency & Items</h2>
            <p className="text-muted-foreground">
              Emeralds and all virtual items on SODABLOX have no real-world monetary value. They are digital assets that exist solely within the platform. You may not sell, trade, or exchange virtual items or currency for real money or goods outside the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">4. User Conduct</h2>
            <p className="text-muted-foreground">
              You agree not to: use offensive or inappropriate usernames or content; exploit bugs, glitches, or vulnerabilities; harass, bully, or threaten other users; impersonate staff or other users; attempt to gain unauthorized access to accounts or systems; use automation, bots, or scripts.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">5. Trading</h2>
            <p className="text-muted-foreground">
              All trades conducted on SODABLOX are final once accepted by both parties. SODABLOX is not responsible for trades you consider unfair. Scamming or manipulating trades is prohibited and may result in a ban.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">6. Moderation & Bans</h2>
            <p className="text-muted-foreground">
              SODABLOX staff reserve the right to moderate content, restrict access, or ban accounts at their discretion. Bans may be issued for violating these terms or for any behavior deemed harmful to the community.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">7. Content Ownership</h2>
            <p className="text-muted-foreground">
              All content, code, assets, and intellectual property on SODABLOX belong to SODABLOX and its creators. You retain no ownership rights over virtual items, currency, or account data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">8. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time, with or without cause. Upon termination, your right to use the platform ceases immediately. All virtual items and currency associated with your account may be forfeited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">9. Disclaimer</h2>
            <p className="text-muted-foreground">
              SODABLOX is provided "as is" without warranties of any kind. We do not guarantee uptime, data preservation, or uninterrupted service. Use the platform at your own risk.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>
        </div>

        <div className="text-center text-xs text-muted-foreground pb-8">
          <p>© {new Date().getFullYear()} SODABLOX. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
