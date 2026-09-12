import { useLocalSearchParams } from 'expo-router';

import { AquaPositionBuilderScreen } from '@/features/strategy/aqua-position-builder-screen';
import { StrategyBuilderScreen } from '@/features/strategy/strategy-builder-screen';

export default function StrategyBuilderRoute() {
  const { mechanism } = useLocalSearchParams<{ mechanism?: string }>();
  return mechanism === 'pegged' ? <AquaPositionBuilderScreen /> : <StrategyBuilderScreen />;
}
