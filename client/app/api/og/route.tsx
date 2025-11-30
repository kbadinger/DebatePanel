import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'AI Debate';
  const models = searchParams.get('models') || '6 AI Models';

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0A0A0A',
          padding: '60px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}
          >
            DecisionForge
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#888888',
              marginLeft: '20px',
            }}
          >
            Multi-LLM Debate Engine
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
              fontSize: '56px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              lineHeight: 1.2,
              maxWidth: '900px',
              marginBottom: '30px',
            }}
          >
            {title.length > 80 ? title.slice(0, 80) + '...' : title}
          </div>

          <div
            style={{
              fontSize: '24px',
              color: '#888888',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span style={{ marginRight: '15px' }}>{models} debated this decision</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #333',
            paddingTop: '30px',
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
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22C55E',
              }}
            />
            <span style={{ fontSize: '16px', color: '#888888' }}>
              Completed Debate
            </span>
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
