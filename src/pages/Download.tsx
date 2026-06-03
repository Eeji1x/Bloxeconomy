import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Monitor, Gamepad2, Shield, ArrowLeft, Cpu, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DownloadPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            BloxEconomy Client
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            The official desktop client for BloxEconomy. Play games, trade, and explore with better performance.
          </p>
        </div>

        {/* Download Card */}
        <Card className="mb-8 border-primary/20 overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <Monitor className="w-6 h-6 text-primary" />
              Download Desktop Client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Windows */}
              <div className="rounded-lg border border-border bg-card p-5 flex flex-col items-center text-center hover:border-primary/40 transition-colors">
                <div className="text-4xl mb-3">🪟</div>
                <h3 className="font-bold text-lg mb-1">Windows</h3>
                <p className="text-xs text-muted-foreground mb-4">Windows 10+ 64-bit</p>
                <Button
                  className="w-full gap-2 mt-auto"
                  onClick={() => {
                    window.open('/bloxeconomy-client-win.zip', '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download .zip
                </Button>
              </div>

              {/* macOS */}
              <div className="rounded-lg border border-border bg-card p-5 flex flex-col items-center text-center hover:border-primary/40 transition-colors">
                <div className="text-4xl mb-3">🍎</div>
                <h3 className="font-bold text-lg mb-1">macOS</h3>
                <p className="text-xs text-muted-foreground mb-4">macOS 11+ (Intel & Apple Silicon)</p>
                <Button
                  className="w-full gap-2 mt-auto"
                  variant="outline"
                  onClick={() => {
                    window.open('/bloxeconomy-client-mac.zip', '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download .zip
                </Button>
              </div>

              {/* Linux */}
              <div className="rounded-lg border border-border bg-card p-5 flex flex-col items-center text-center hover:border-primary/40 transition-colors">
                <div className="text-4xl mb-3">🐧</div>
                <h3 className="font-bold text-lg mb-1">Linux</h3>
                <p className="text-xs text-muted-foreground mb-4">Ubuntu / Debian / Arch</p>
                <Button
                  className="w-full gap-2 mt-auto"
                  variant="outline"
                  onClick={() => {
                    window.open('/bloxeconomy-client-linux.tar.gz', '_blank');
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download .tar.gz
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-2">⚠️ Note</p>
              <p>
                The desktop client is currently in beta. If the download links above don't work yet, 
                you can still use the <strong>Web Client</strong> to play all games directly in your browser. 
                Download links will be updated as builds become available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Gamepad2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Better Game Performance</h3>
                <p className="text-sm text-muted-foreground">
                  Native rendering with RCC mode enabled by default. Higher frame rates and smoother gameplay.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Wifi className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Auto Deep-Link</h3>
                <p className="text-sm text-muted-foreground">
                  Click "Join with Client" on any game and it opens instantly. No manual navigation needed.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Secure by Default</h3>
                <p className="text-sm text-muted-foreground">
                  Context isolation enabled. No node integration. Runs the same trusted web code in a sandboxed window.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5 flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold mb-1">Lightweight</h3>
                <p className="text-sm text-muted-foreground">
                  Minimal memory footprint. Single-instance lock means only one copy runs at a time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How to install */}
        <Card className="border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Installation Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-bold text-foreground">Windows</h4>
              <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                <li>Download and extract the <code>bloxeconomy-client-win.zip</code> file.</li>
                <li>Run <code>BloxEconomy Client.exe</code>.</li>
                <li>The protocol <code>bloxeconomy://</code> will auto-register on first launch.</li>
                <li>Log in with your BloxEconomy account and play!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-foreground">macOS</h4>
              <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                <li>Download and extract the <code>bloxeconomy-client-mac.zip</code> file.</li>
                <li>Move <code>BloxEconomy Client.app</code> to your Applications folder.</li>
                <li>Right-click and choose "Open" the first time (to bypass Gatekeeper).</li>
                <li>Log in and play!</li>
              </ol>
            </div>
            <div>
              <h4 className="font-bold text-foreground">Linux</h4>
              <ol className="list-decimal list-inside text-muted-foreground mt-1 space-y-1">
                <li>Download and extract the <code>bloxeconomy-client-linux.tar.gz</code> file.</li>
                <li>Run <code>./bloxeconomy-client</code> from the extracted folder.</li>
                <li>Log in and play!</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          BloxEconomy Client v1.0.0 &mdash; Built with Electron
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
