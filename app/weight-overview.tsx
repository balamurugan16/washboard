import { getErrorCode } from '@/lib/db';
import { listWeights, type WeightEntry } from '@/lib/weight';
import WeightDashboard from './weight-dashboard';

export default async function WeightOverview({ showHistory = true }: { showHistory?: boolean }) {
  let entries: WeightEntry[] = [];
  let unavailable = false;

  try {
    entries = await listWeights();
  } catch (error) {
    console.error('Could not load weight history.', getErrorCode(error) ?? 'database unavailable');
    unavailable = true;
  }

  return <WeightDashboard entries={entries} unavailable={unavailable} showHistory={showHistory} />;
}
