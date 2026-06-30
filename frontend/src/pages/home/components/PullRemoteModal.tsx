import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Card,
  CardBody,
  Spinner,
} from '@heroui/react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { listRemoteBinders, pullRemoteBinder, type RemoteBinder } from '../../../api/remote';
import { toastSuccess, toastError, getErrorMessage } from '../../../utils/toast';

interface PullRemoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PullRemoteModal({ isOpen, onClose }: PullRemoteModalProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'connect' | 'select'>('connect');
  const [host, setHost] = useState('');
  const [serverPassword, setServerPassword] = useState('');
  const [showServerPassword, setShowServerPassword] = useState(false);
  const [binders, setBinders] = useState<RemoteBinder[]>([]);
  const [selectedBinder, setSelectedBinder] = useState<RemoteBinder | null>(null);
  const [binderPassword, setBinderPassword] = useState('');
  const [showBinderPassword, setShowBinderPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    if (!host || !serverPassword) {
      setError('Host and server password are required');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const result = await listRemoteBinders(host, serverPassword);
      setBinders(result.binders);
      setStep('select');
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to connect');
      setError(msg);
      toastError(msg);
    } finally {
      setConnecting(false);
    }
  }

  async function handlePull() {
    if (!selectedBinder || !binderPassword) {
      setError('Select a binder and enter its password');
      return;
    }
    setPulling(true);
    setError('');
    try {
      const binder = await pullRemoteBinder({
        host,
        serverPassword,
        binderId: selectedBinder.id,
        binderName: selectedBinder.name,
        password: binderPassword,
      });
      onClose();
      toastSuccess('Binder pulled successfully');
      navigate(`/binders/${binder.id}/accounts`);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to pull binder');
      setError(msg);
      toastError(msg);
    } finally {
      setPulling(false);
    }
  }

  function handleClose() {
    setStep('connect');
    setHost('');
    setServerPassword('');
    setShowServerPassword(false);
    setBinders([]);
    setSelectedBinder(null);
    setBinderPassword('');
    setShowBinderPassword(false);
    setError('');
    setConnecting(false);
    setPulling(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} placement="center" size="lg" backdrop="blur">
      <ModalContent>
        <ModalHeader className="justify-center text-lg">
          Pull From Remote Server
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          {step === 'connect' ? (
            <>
              <Input
                label="Server URL"
                value={host}
                onValueChange={(v) => { setHost(v); setError(''); }}
                placeholder="http://192.168.1.100:3000"
                description="Host and port of the remote Midas server"
                isInvalid={!!error}
                errorMessage={error || undefined}
              />
              <Input
                label="Server Password"
                type={showServerPassword ? 'text' : 'password'}
                value={serverPassword}
                onValueChange={(v) => { setServerPassword(v); setError(''); }}
                isRequired
                endContent={
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onPress={() => setShowServerPassword(!showServerPassword)}
                    aria-label={showServerPassword ? 'Hide password' : 'Show password'}
                    className="data-[hover=true]:bg-transparent min-w-0 h-auto p-0"
                  >
                    {showServerPassword ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
                  </Button>
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConnect();
                }}
              />
            </>
          ) : (
            <>
              {!binders.length && !connecting ? (
                <p className="text-app-muted text-center py-4">No binders found on remote server</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                  {binders.map((b) => (
                    <Card
                      key={b.id}
                      isPressable
                      onPress={() => { setSelectedBinder(b); setError(''); }}
                      className={`w-full transition-all ${
                        selectedBinder?.id === b.id
                          ? 'ring-2 ring-primary bg-primary/5'
                          : ''
                      }`}
                    >
                      <CardBody className="p-3">
                        <div className="font-medium">{b.name}</div>
                        {b.description && (
                          <p className="text-sm text-app-muted">{b.description}</p>
                        )}
                        <p className="text-xs text-app-muted mt-0.5">{b.currency}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
              {selectedBinder && (
                <Input
                  label={`Password for "${selectedBinder.name}"`}
                  type={showBinderPassword ? 'text' : 'password'}
                  value={binderPassword}
                  onValueChange={(v) => { setBinderPassword(v); setError(''); }}
                  isRequired
                  isInvalid={!!error}
                  errorMessage={error}
                  endContent={
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onPress={() => setShowBinderPassword(!showBinderPassword)}
                      aria-label={showBinderPassword ? 'Hide password' : 'Show password'}
                      className="data-[hover=true]:bg-transparent min-w-0 h-auto p-0"
                    >
                      {showBinderPassword ? <EyeSlashIcon width={18} /> : <EyeIcon width={18} />}
                    </Button>
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePull();
                  }}
                />
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="flat"
            onPress={step === 'connect' ? handleClose : () => { setStep('connect'); setError(''); }}
          >
            {step === 'connect' ? 'Cancel' : 'Back'}
          </Button>
          {step === 'connect' ? (
            <Button color="primary" onPress={handleConnect} isLoading={connecting}>
              Connect
            </Button>
          ) : (
            <Button
              color="primary"
              onPress={handlePull}
              isLoading={pulling}
              isDisabled={!selectedBinder || !binderPassword}
            >
              Pull
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
