import { NextRequest, NextResponse } from 'next/server';
import { getLatestModels } from '@/lib/models/discovery';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

/**
 * API endpoint to discover current models from all providers
 * GET /api/models/discover
 * GET /api/models/discover?refresh=true (force refresh)
 */
export async function GET(req: NextRequest) {
  try {
    // Check if user is authenticated (optional - you might want to make this public)
    const session = await getServerSession(authOptions);
    
    // Get query params
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Discover models from all providers
    const results = await getLatestModels(forceRefresh);
    
    // Calculate totals
    const totalModels = results.reduce((sum, result) => sum + result.models.length, 0);
    const providersWithErrors = results.filter(result => result.error).length;
    
    return NextResponse.json({
      success: true,
      totalModels,
      totalProviders: results.length,
      providersWithErrors,
      lastUpdated: new Date().toISOString(),
      providers: results,
    });
    
  } catch (error) {
    console.error('Model discovery error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to discover models', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Update model configurations based on discovery
 * POST /api/models/discover
 */
export async function POST(req: NextRequest) {
  try {
    // Check if user is admin (you might want to add admin check)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Force refresh and get latest models
    const results = await getLatestModels(true);
    
    // TODO: Here you could automatically update your config files
    // For now, just return the discovered models
    
    return NextResponse.json({
      success: true,
      message: 'Model discovery completed',
      results,
      action: 'Configuration update needed - please review discovered models'
    });
    
  } catch (error) {
    console.error('Model discovery update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update model configurations', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}