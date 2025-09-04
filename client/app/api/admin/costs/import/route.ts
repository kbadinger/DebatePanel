import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CostRecord {
  timestamp: string;
  model: string;
  cost: number;
  inputTokens?: number;
  outputTokens?: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const provider = formData.get('provider') as string;

    if (!file || !provider) {
      return NextResponse.json(
        { error: 'File and provider are required' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    const lines = fileContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least header and one data row' },
        { status: 400 }
      );
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    // Find column indices
    const timestampIndex = headers.findIndex(h => h.includes('timestamp') || h.includes('date') || h.includes('time'));
    const modelIndex = headers.findIndex(h => h.includes('model') || h.includes('name'));
    const costIndex = headers.findIndex(h => h.includes('cost') || h.includes('amount') || h.includes('price'));
    const inputTokensIndex = headers.findIndex(h => h.includes('input') || h.includes('prompt'));
    const outputTokensIndex = headers.findIndex(h => h.includes('output') || h.includes('completion'));

    if (timestampIndex === -1 || modelIndex === -1 || costIndex === -1) {
      return NextResponse.json(
        { 
          error: 'CSV must contain timestamp, model, and cost columns',
          details: `Found headers: ${headers.join(', ')}. Required: timestamp/date, model/name, cost/amount`
        },
        { status: 400 }
      );
    }

    // Parse cost records
    const costRecords: CostRecord[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i].split(',').map(cell => cell.trim());
      
      try {
        const timestamp = row[timestampIndex];
        const model = row[modelIndex];
        const cost = parseFloat(row[costIndex]);
        const inputTokens = inputTokensIndex >= 0 ? parseInt(row[inputTokensIndex]) || undefined : undefined;
        const outputTokens = outputTokensIndex >= 0 ? parseInt(row[outputTokensIndex]) || undefined : undefined;

        if (!timestamp || !model || isNaN(cost)) {
          errors.push(`Row ${i + 2}: Missing required data (timestamp: ${timestamp}, model: ${model}, cost: ${cost})`);
          continue;
        }

        costRecords.push({
          timestamp: new Date(timestamp).toISOString(),
          model,
          cost,
          inputTokens,
          outputTokens
        });
      } catch (error) {
        errors.push(`Row ${i + 2}: Parse error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (costRecords.length === 0) {
      return NextResponse.json(
        { 
          error: 'No valid cost records found',
          errors,
          details: 'All rows had parsing errors or missing required data'
        },
        { status: 400 }
      );
    }

    console.log(`[COST IMPORT] Processing ${costRecords.length} cost records for provider: ${provider}`);

    // Match and update records
    let matched = 0;
    let updated = 0;
    let unmatched = 0;

    for (const costRecord of costRecords) {
      try {
        // Try to find matching usage record by timestamp, model, and provider
        // Allow for some time variance (within 5 minutes)
        const recordTime = new Date(costRecord.timestamp);
        const timeStart = new Date(recordTime.getTime() - 5 * 60 * 1000); // 5 minutes before
        const timeEnd = new Date(recordTime.getTime() + 5 * 60 * 1000);   // 5 minutes after

        const matchingRecord = await prisma.usageRecord.findFirst({
          where: {
            modelProvider: provider,
            modelId: {
              contains: costRecord.model.toLowerCase().replace(/[-_]/g, ''),
              mode: 'insensitive'
            },
            createdAt: {
              gte: timeStart,
              lte: timeEnd
            },
            roundNumber: { not: 0 } // Don't update reconciliation records
          },
          orderBy: {
            createdAt: 'asc' // Get the closest match
          }
        });

        if (matchingRecord) {
          matched++;

          // Update the record with imported cost data
          await prisma.usageRecord.update({
            where: { id: matchingRecord.id },
            data: {
              providerReportedCost: costRecord.cost,
              providerInputTokens: costRecord.inputTokens,
              providerOutputTokens: costRecord.outputTokens,
              importSource: 'csv_import',
              providerCostFetched: true,
              providerCostFetchedAt: new Date(),
              reconciliationNotes: `Imported from CSV: $${costRecord.cost} at ${costRecord.timestamp}`,
              // Update the actual API cost if we have a real cost
              apiCost: costRecord.cost,
              totalCost: costRecord.cost * (1 + 0.3) // Apply platform markup
            }
          });
          
          updated++;
          console.log(`[COST IMPORT] Updated record ${matchingRecord.id}: $${costRecord.cost} for ${costRecord.model}`);
        } else {
          unmatched++;
          console.log(`[COST IMPORT] No match found for ${costRecord.model} at ${costRecord.timestamp}`);
        }
      } catch (error) {
        console.error(`[COST IMPORT] Error processing record for ${costRecord.model}:`, error);
        errors.push(`${costRecord.model} at ${costRecord.timestamp}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[COST IMPORT] Import complete: ${matched} matched, ${updated} updated, ${unmatched} unmatched`);

    return NextResponse.json({
      success: true,
      matched,
      unmatched,
      updated,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors shown
      details: `Processed ${costRecords.length} cost records. ${updated} records were updated with real cost data.`
    });

  } catch (error) {
    console.error('[COST IMPORT] Import error:', error);
    
    return NextResponse.json({
      success: false,
      matched: 0,
      unmatched: 0,
      updated: 0,
      errors: ['Server error during import'],
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}