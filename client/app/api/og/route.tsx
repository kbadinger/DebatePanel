import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'AI Debate';
  const models = searchParams.get('models') || '6';
  const startConf = searchParams.get('startConf');
  const endConf = searchParams.get('endConf');
  const winner = searchParams.get('winner');

  const hasConfidenceDrop = startConf && endConf && Number(startConf) > Number(endConf);
  const confidenceDrop = hasConfidenceDrop ? Number(startConf) - Number(endConf) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0A0A0A',
          padding: '50px 60px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '30px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 'bold',
                color: '#FFFFFF',
                letterSpacing: '-0.5px',
              }}
            >
              DecisionForge
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#666666',
                marginLeft: '16px',
              }}
            >
              Iron-Forged AI Debate
            </div>
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#888888',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#22C55E',
              }}
            />
            {models} AI Models
          </div>
        </div>

        {/* Main title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: title.length > 50 ? '44px' : '52px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              lineHeight: 1.15,
              maxWidth: '950px',
              marginBottom: '35px',
            }}
          >
            {title.length > 90 ? title.slice(0, 90) + '...' : title}
          </div>

          {/* The Hook - Confidence Drop or Winner */}
          {hasConfidenceDrop ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Confidence trajectory visualization */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#22C55E' }}>
                    {startConf}%
                  </span>
                  <span style={{ fontSize: '32px', color: '#666666' }}>→</span>
                  <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#F59E0B' }}>
                    {endConf}%
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '20px',
                    fontWeight: 'bold',
                  }}
                >
                  ↓ {confidenceDrop} points
                </div>
              </div>

              {/* The anti-sycophancy hook */}
              <div
                style={{
                  fontSize: '22px',
                  color: '#A3A3A3',
                  fontStyle: 'italic',
                }}
              >
                Confidence dropped as they thought harder. That&apos;s the point.
              </div>
            </div>
          ) : winner ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: '#F59E0B',
                  color: '#000000',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '22px',
                  fontWeight: 'bold',
                }}
              >
                🏆 WINNER
              </div>
              <span style={{ fontSize: '26px', color: '#FFFFFF', fontWeight: '600' }}>
                {winner}
              </span>
            </div>
          ) : (
            <div
              style={{
                fontSize: '24px',
                color: '#888888',
              }}
            >
              {models} AI models debated this decision
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #333',
            paddingTop: '25px',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              color: '#666666',
            }}
          >
            decisionforge.ai
          </div>
          <div
            style={{
              fontSize: '16px',
              color: '#888888',
            }}
          >
            See the full debate →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
