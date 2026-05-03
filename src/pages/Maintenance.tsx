import { Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Maintenance = () => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: '#e3e3e3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"Source Sans Pro", Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        {/* Logo */}
        <div
          style={{
            background: '#0074BD',
            display: 'inline-block',
            padding: '12px 32px',
            marginBottom: 24,
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            BloxEconomy
          </span>
        </div>

        {/* Panel */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #c3c3c3',
            padding: '32px 24px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 16px',
              background: '#f5c242',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
            }}
          >
            ⚠
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#393b3d',
              margin: '0 0 8px',
            }}
          >
            Under Maintenance
          </h1>

          <p
            style={{
              fontSize: 15,
              color: '#666',
              lineHeight: 1.5,
              margin: '0 0 24px',
            }}
          >
            BloxEconomy is currently under maintenance. The site will be back
            online soon.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f5c242',
                display: 'inline-block',
                animation: 'pulse 1.4s infinite',
              }}
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f5c242',
                display: 'inline-block',
                animation: 'pulse 1.4s 0.2s infinite',
              }}
            />
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f5c242',
                display: 'inline-block',
                animation: 'pulse 1.4s 0.4s infinite',
              }}
            />
          </div>

          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 16px',
              fontSize: 14,
              fontWeight: 600,
              color: '#393b3d',
              background: '#f2f2f2',
              border: '1px solid #c3c3c3',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <LogIn style={{ width: 16, height: 16 }} />
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
