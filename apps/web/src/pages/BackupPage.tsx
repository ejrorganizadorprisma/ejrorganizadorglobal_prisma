import { useState, useEffect, useCallback } from 'react';
import {
  Download, Upload, Database, AlertTriangle, CheckCircle2,
  Clock, Calendar, Trash2, Play, Settings, RefreshCw, HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useRequirePermission } from '../hooks/useRequirePermission';
import { AppPage } from '@ejr/shared-types';

interface BackupSettings {
  id: string;
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  dayOfWeek: number;
  dayOfMonth: number;
  retentionDays: number;
  maxBackups: number;
  lastBackupAt: string | null;
  nextBackupAt: string | null;
}

interface BackupHistoryEntry {
  id: string;
  filename: string;
  fileSize: number;
  tablesCount: number;
  recordsCount: number;
  backupType: 'manual' | 'scheduled';
  status: 'completed' | 'failed' | 'in_progress';
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface BackupInfo {
  tables: Record<string, number>;
  timestamp: string;
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR');
}

export function BackupPage() {
  const permissionCheck = useRequirePermission({
    page: AppPage.BACKUP,
    message: 'Você não tem permissão para acessar a página de backup.'
  });
  if (permissionCheck) return permissionCheck;

  const [isLoading, setIsLoading] = useState(false);
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  // Schedule form state
  const [formEnabled, setFormEnabled] = useState(false);
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [formTime, setFormTime] = useState('02:00');
  const [formDayOfWeek, setFormDayOfWeek] = useState(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState(1);
  const [formRetentionDays, setFormRetentionDays] = useState(30);
  const [formMaxBackups, setFormMaxBackups] = useState(10);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/backup/settings');
      const data = response.data.data;
      setSettings(data);
      setFormEnabled(data.enabled);
      setFormFrequency(data.frequency);
      setFormTime(data.time);
      setFormDayOfWeek(data.dayOfWeek);
      setFormDayOfMonth(data.dayOfMonth);
      setFormRetentionDays(data.retentionDays);
      setFormMaxBackups(data.maxBackups);
    } catch {
      toast.error('Erro ao carregar configurações de backup');
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await api.get('/backup/history?limit=20');
      setHistory(response.data.data.entries);
      setHistoryTotal(response.data.data.total);
    } catch {
      toast.error('Erro ao carregar histórico');
    }
  }, []);

  const fetchBackupInfo = useCallback(async () => {
    try {
      const response = await api.get('/backup/info');
      setBackupInfo(response.data.data);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchHistory();
    fetchBackupInfo();
  }, [fetchSettings, fetchHistory, fetchBackupInfo]);

  const handleExecuteBackup = async () => {
    setIsBackupRunning(true);
    try {
      const response = await api.post('/backup/execute', {}, { timeout: 300000 });
      const entry = response.data.data;
      if (entry.status === 'completed') {
        toast.success(`Backup realizado com sucesso! ${entry.tablesCount} tabelas, ${entry.recordsCount} registros`);
      } else {
        toast.error(`Backup falhou: ${entry.errorMessage}`);
      }
      fetchHistory();
      fetchSettings();
    } catch {
      toast.error('Erro ao executar backup');
    } finally {
      setIsBackupRunning(false);
    }
  };

  const handleSaveSchedule = async () => {
    setIsLoading(true);
    try {
      await api.patch('/backup/settings', {
        enabled: formEnabled,
        frequency: formFrequency,
        time: formTime,
        dayOfWeek: formDayOfWeek,
        dayOfMonth: formDayOfMonth,
        retentionDays: formRetentionDays,
        maxBackups: formMaxBackups,
      });
      toast.success('Configurações de agendamento salvas!');
      fetchSettings();
      setShowScheduleForm(false);
    } catch {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await api.get(`/backup/download/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar backup');
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este backup?')) return;
    try {
      await api.delete(`/backup/${id}`);
      toast.success('Backup excluído');
      fetchHistory();
    } catch {
      toast.error('Erro ao excluir backup');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleRestoreBackup = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo de backup primeiro');
      return;
    }
    if (!window.confirm('ATENÇÃO: Restaurar um backup irá SUBSTITUIR TODOS OS DADOS ATUAIS. Tem certeza?')) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const sql = e.target?.result as string;
      try {
        const response = await api.post('/backup/restore', { sql }, { timeout: 300000 });
        const { message, stats } = response.data;
        if (stats?.errors > 0) {
          toast.warning(message);
        } else {
          toast.success(message || 'Backup restaurado com sucesso!');
        }
        setSelectedFile(null);
        fetchBackupInfo();
        fetchHistory();
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Erro ao restaurar backup');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const getScheduleDescription = () => {
    if (!settings?.enabled) return 'Desativado';
    switch (settings.frequency) {
      case 'daily':
        return `Diário às ${settings.time}`;
      case 'weekly':
        return `Semanal - ${DAYS_OF_WEEK[settings.dayOfWeek]} às ${settings.time}`;
      case 'monthly':
        return `Mensal - Dia ${settings.dayOfMonth} às ${settings.time}`;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Backup Inteligente</h1>
          <p className="text-gray-600 mt-1">Backup automático e manual do banco de dados</p>
        </div>
        <button
          onClick={handleExecuteBackup}
          disabled={isBackupRunning}
          className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isBackupRunning ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Executando...</>
          ) : (
            <><Play className="w-4 h-4" /> Fazer Backup Agora</>
          )}
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            Agendamento
          </div>
          <p className="text-sm font-semibold text-gray-900">{getScheduleDescription()}</p>
          <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${settings?.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
            {settings?.enabled ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar className="w-4 h-4" />
            Último Backup
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {settings?.lastBackupAt ? formatDate(settings.lastBackupAt) : 'Nenhum'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            Próximo Backup
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {settings?.nextBackupAt ? formatDate(settings.nextBackupAt) : 'N/A'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <HardDrive className="w-4 h-4" />
            Total de Backups
          </div>
          <p className="text-sm font-semibold text-gray-900">{historyTotal}</p>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 lg:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Agendamento Automático</h2>
          </div>
          <button
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {showScheduleForm ? 'Cancelar' : 'Configurar'}
          </button>
        </div>

        {showScheduleForm && (
          <div className="p-4 lg:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Ativar backup automático</label>
              <button
                onClick={() => setFormEnabled(!formEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {formEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequência</label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="daily">Diário</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                {formFrequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana</label>
                    <select
                      value={formDayOfWeek}
                      onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i} value={i}>{day}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formFrequency === 'monthly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dia do Mês</label>
                    <select
                      value={formDayOfMonth}
                      onChange={(e) => setFormDayOfMonth(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      {Array.from({ length: 28 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Retenção (dias)</label>
                  <input
                    type="number"
                    value={formRetentionDays}
                    onChange={(e) => setFormRetentionDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máximo de backups armazenados</label>
                  <input
                    type="number"
                    value={formMaxBackups}
                    onChange={(e) => setFormMaxBackups(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
              <button
                onClick={() => setShowScheduleForm(false)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSchedule}
                disabled={isLoading}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isLoading ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 lg:p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Histórico de Backups</h2>
          </div>
          <button
            onClick={fetchHistory}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar
          </button>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum backup realizado ainda.</p>
            <p className="text-sm mt-1">Clique em "Fazer Backup Agora" para criar o primeiro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tabelas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registros</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tamanho</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.backupType === 'scheduled' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {entry.backupType === 'scheduled' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        entry.status === 'completed' ? 'bg-green-100 text-green-800' :
                        entry.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {entry.status === 'completed' ? 'Sucesso' :
                         entry.status === 'failed' ? 'Falhou' : 'Em andamento'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.tablesCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{entry.recordsCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFileSize(entry.fileSize)}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        {entry.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadBackup(entry.filename)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                            title="Baixar"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteBackup(entry.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Database Info */}
      {backupInfo && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 lg:p-6 border-b">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Informações do Banco de Dados</h2>
            </div>
          </div>
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(backupInfo.tables).map(([table, count]) => (
                <div key={table} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-600">{table.replace(/_/g, ' ')}</span>
                  <span className="text-xs font-semibold text-gray-900">{(count as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Restore Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 lg:p-6 border-b">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Restaurar Backup</h2>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0" />
              <p className="text-sm text-yellow-700">
                Restaurar um backup irá <strong>substituir todos os dados atuais</strong>. Faça um backup antes de restaurar.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="file"
              accept=".sql"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />

            {selectedFile && (
              <div className="flex items-center text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-blue-600 mr-2" />
                Arquivo: <strong className="ml-1">{selectedFile.name}</strong>
                <span className="ml-2 text-gray-400">({formatFileSize(selectedFile.size)})</span>
              </div>
            )}

            <button
              onClick={handleRestoreBackup}
              disabled={!selectedFile || isLoading}
              className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isLoading ? 'Restaurando...' : 'Restaurar Backup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
