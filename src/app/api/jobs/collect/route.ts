import { NextResponse } from 'next/server';
import { runDailyCollectAndRecommend } from '@/lib/jobs/collect-and-recommend';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runDailyCollectAndRecommend();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/jobs/collect] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
