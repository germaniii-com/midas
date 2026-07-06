import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from '@heroui/react';
import { PlusIcon, ArrowUpTrayIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { getBinders, type Binder } from '../../api/binders';
import { getErrorMessage } from '../../utils/toast';
import { ErrorMessage } from '../../components/ErrorMessage';
import { useTheme } from '../../hooks/useTheme';
import { useServer } from '../../hooks/useServer';
import { THEME_OPTIONS } from '../../constants/preferences';
import BinderCard from './components/BinderCard';
import BinderLoginModal from './components/BinderLoginModal';
import BinderImportModal from './components/BinderImportModal';
import PullRemoteModal from './components/PullRemoteModal';

export default function HomePage() {
  const navigate = useNavigate();
  const { apiUrl, disconnect } = useServer();
  const [binders, setBinders] = useState<Binder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBinder, setSelectedBinder] = useState<Binder | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [pullRemoteOpen, setPullRemoteOpen] = useState(false);
  const [serverInfoOpen, setServerInfoOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  async function fetchBinders() {
    setLoading(true);
    setError('');
    try {
      const data = await getBinders();
      setBinders(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load binders'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBinders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="light"
              size="sm"
              onPress={() => setServerInfoOpen(true)}
              className="text-xs text-app-muted h-8 px-2 active:scale-90 transition-all duration-150"
            >
              {(() => {
                try { return new URL(apiUrl).hostname; } catch { return apiUrl; }
              })()}
            </Button>
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
        </div>
        <ErrorMessage message={error} onRetry={fetchBinders} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Midas</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            size="sm"
            onPress={() => setServerInfoOpen(true)}
            className="text-xs text-app-muted h-8 px-2 active:scale-90 transition-all duration-150"
          >
            {(() => {
              try { return new URL(apiUrl).hostname; } catch { return apiUrl; }
            })()}
          </Button>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card isPressable onPress={() => setImportOpen(true)} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <ArrowUpTrayIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Import Binder</span>
          </CardBody>
        </Card>
        <Card isPressable onPress={() => setPullRemoteOpen(true)} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <CloudArrowDownIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Pull From Remote Server</span>
          </CardBody>
        </Card>
        <Card isPressable onPress={() => navigate('/create')} className="w-full min-h-[120px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
          <CardBody className="flex flex-col items-center justify-center p-5 gap-2">
            <PlusIcon width={24} className="text-app-muted" />
            <span className="text-app-muted font-medium">Create Binder</span>
          </CardBody>
        </Card>
        {binders.map((binder, i) => (
          <div key={binder.id} className="animate-fade-in-up animate-fill-both" style={{ animationDelay: `${i * 80}ms` }}>
            <BinderCard
              binder={binder}
              onPress={() => setSelectedBinder(binder)}
            />
          </div>
        ))}
      </div>

      <BinderLoginModal
        binder={selectedBinder}
        onClose={() => setSelectedBinder(null)}
      />
      <BinderImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
      />
      <PullRemoteModal
        isOpen={pullRemoteOpen}
        onClose={() => setPullRemoteOpen(false)}
      />

      <Modal isOpen={serverInfoOpen} onClose={() => setServerInfoOpen(false)} placement="center" backdrop="blur">
        <ModalContent>
          <ModalHeader className="justify-center text-lg">Connected to server</ModalHeader>
          <ModalBody>
            <p className="text-sm opacity-75 break-all">{apiUrl}</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => setServerInfoOpen(false)}>
              Close
            </Button>
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                setServerInfoOpen(false);
                disconnect();
                navigate('/');
              }}
            >
              Disconnect
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
