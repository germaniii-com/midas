import { useState } from 'react';
import { Button, Input, Card, CardBody, Spinner, Select, SelectItem } from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../hooks/useTheme';
import { useServer } from '../../hooks/useServer';
import { THEME_OPTIONS } from '../../constants/preferences';
import { getErrorMessage } from '../../utils/toast';

export default function ServerSelector() {
  const { theme, setTheme } = useTheme();
  const { connect, recentServers } = useServer();
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect(connectUrl?: string, connectPassword?: string) {
    const targetUrl = connectUrl || url;
    const targetPassword = connectPassword !== undefined ? connectPassword : password;
    if (!targetUrl) {
      setError('Server URL is required');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      await connect(targetUrl, targetPassword || undefined);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to connect'));
    } finally {
      setConnecting(false);
    }
  }

  function handleRecentConnect(serverUrl: string) {
    setUrl(serverUrl);
    setError('');
  }

  function formatUrl(urlStr: string): string {
    try {
      const u = new URL(urlStr);
      return u.hostname + (u.port ? `:${u.port}` : '');
    } catch {
      return urlStr;
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
        <Select
          size="sm"
          variant="flat"
          aria-label="Theme"
          selectedKeys={[theme]}
          onSelectionChange={(keys) => {
            const val = Array.from(keys)[0];
            if (val) setTheme(String(val) as typeof theme);
          }}
          className="w-[140px]"
        >
          {THEME_OPTIONS.map((opt) => (
            <SelectItem key={opt.value}>{opt.label}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in-up">
        <p className="text-app-muted text-sm text-center">
          Connect to a Midas server
        </p>

        <Input
          label="Server URL"
          value={url}
          onValueChange={(v) => { setUrl(v); setError(''); }}
          placeholder="http://192.168.1.100:5001"
          description="Host and port of the Midas server"
          isInvalid={!!error}
          errorMessage={error || undefined}
          isDisabled={connecting}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
        />

        <Input
          label="Server Password (optional)"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onValueChange={(v) => { setPassword(v); setError(''); }}
          isDisabled={connecting}
          description="Required only if the server has a sync password configured"
          endContent={
            <Button
              isIconOnly
              variant="light"
              size="sm"
              onPress={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="data-[hover=true]:bg-transparent min-w-0 h-auto p-0"
            >
              {showPassword ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
            </Button>
          }
          onKeyDown={(e) => { if (e.key === 'Enter') handleConnect(); }}
        />

        <Button
          color="primary"
          onPress={() => handleConnect()}
          isLoading={connecting}
          size="lg"
          className="w-full"
        >
          Connect
        </Button>

        {recentServers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-app-muted mb-2 font-medium uppercase tracking-wider">
              Recent Servers
            </p>
            <div className="flex flex-col gap-2">
              {recentServers.map((s) => (
                <Card
                  key={s.url}
                  isPressable
                  onPress={() => handleRecentConnect(s.url)}
                  className="w-full transition-all"
                >
                  <CardBody className="p-3 flex flex-row items-center justify-between">
                    <span className="text-sm font-medium">{formatUrl(s.url)}</span>
                    <span className="text-xs text-app-muted">{s.url}</span>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
