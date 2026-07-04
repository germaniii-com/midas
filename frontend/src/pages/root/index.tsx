import { useServer } from '../../hooks/useServer';
import ServerSelector from '../server-selector';
import HomePage from '../home';

export default function RootPage() {
  const { isConnected } = useServer();
  if (!isConnected) return <ServerSelector />;
  return <HomePage />;
}
