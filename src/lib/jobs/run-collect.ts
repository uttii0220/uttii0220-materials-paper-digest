import { runDailyCollectAndRecommend } from './collect-and-recommend';

async function main() {
  console.log('[run-collect] Starting...');
  await runDailyCollectAndRecommend();
  console.log('[run-collect] Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('[run-collect] Fatal:', err);
  process.exit(1);
});
