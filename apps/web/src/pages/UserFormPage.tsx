import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser, useCreateUser, useUpdateUser } from '../hooks/useUsers';
import { UserRole } from '@ejr/shared-types';
import { toast } from 'sonner';
import { UserCog, Mail, Lock, Shield, Clock, ArrowLeft, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react';

export function UserFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: user, isLoading: loadingUser } = useUser(id);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  // Estrutura de horários por dia da semana
  type WeekSchedule = {
    [dayOfWeek: number]: Array<{ start: string; end: string }>;
  };

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'SALESPERSON' as UserRole,
    isActive: true,
    allowedHoursEnabled: false,
    weekSchedule: {
      1: [{ start: '08:00', end: '18:00' }], // Segunda
      2: [{ start: '08:00', end: '18:00' }], // Terça
      3: [{ start: '08:00', end: '18:00' }], // Quarta
      4: [{ start: '08:00', end: '18:00' }], // Quinta
      5: [{ start: '08:00', end: '18:00' }], // Sexta
    } as WeekSchedule,
  });

  // Estado para controlar o menu de clonagem
  const [cloneMenuOpen, setCloneMenuOpen] = useState<number | null>(null);

  // Estado para controlar visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fecha o menu de clonagem ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cloneMenuOpen !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.clone-menu-container')) {
          setCloneMenuOpen(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cloneMenuOpen]);

  useEffect(() => {
    if (user) {
      // Carrega a estrutura weekSchedule ou converte da estrutura antiga
      let weekSchedule: WeekSchedule = {
        1: [{ start: '08:00', end: '18:00' }],
        2: [{ start: '08:00', end: '18:00' }],
        3: [{ start: '08:00', end: '18:00' }],
        4: [{ start: '08:00', end: '18:00' }],
        5: [{ start: '08:00', end: '18:00' }],
      };

      if (user.allowedHours?.weekSchedule) {
        // Usa a nova estrutura
        weekSchedule = user.allowedHours.weekSchedule;
      } else if (user.allowedHours?.timeRanges && user.allowedHours?.days) {
        // Converte estrutura antiga para nova
        const schedule: WeekSchedule = {};
        user.allowedHours.days.forEach(day => {
          schedule[day] = user.allowedHours!.timeRanges!;
        });
        weekSchedule = schedule;
      }

      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        isActive: user.isActive,
        allowedHoursEnabled: !!user.allowedHours,
        weekSchedule,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.name || !formData.email) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!isEditing && !formData.password) {
      toast.error('A senha é obrigatória para novos usuários');
      return;
    }

    if (formData.password && formData.password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    // Valida confirmação de senha
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    // Valida email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email inválido');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
        allowedHours: formData.allowedHoursEnabled
          ? {
              weekSchedule: formData.weekSchedule,
            }
          : null,
      };

      // Incluir senha se for criação ou se foi preenchida na edição
      if (!isEditing || formData.password) {
        payload.password = formData.password;
      }

      if (isEditing) {
        await updateUser.mutateAsync({
          id: id!,
          data: payload,
        });
      } else {
        await createUser.mutateAsync(payload);
      }
      navigate('/users');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Erro ao salvar usuário');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      // Se alterou para OWNER, força isActive = true
      if (name === 'role' && value === 'OWNER') {
        setFormData((prev) => ({ ...prev, [name]: value, isActive: true }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
  };

  // Adiciona ou remove um dia do schedule
  const handleDayToggle = (day: number) => {
    setFormData((prev) => {
      const newSchedule = { ...prev.weekSchedule };
      if (newSchedule[day]) {
        delete newSchedule[day];
      } else {
        newSchedule[day] = [{ start: '08:00', end: '18:00' }];
      }
      return { ...prev, weekSchedule: newSchedule };
    });
  };

  // Adiciona um intervalo de tempo para um dia específico
  const handleAddTimeRange = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      weekSchedule: {
        ...prev.weekSchedule,
        [day]: [...(prev.weekSchedule[day] || []), { start: '08:00', end: '18:00' }],
      },
    }));
  };

  // Remove um intervalo de tempo de um dia específico
  const handleRemoveTimeRange = (day: number, index: number) => {
    setFormData((prev) => {
      const dayRanges = prev.weekSchedule[day] || [];
      if (dayRanges.length === 1) {
        // Se for o último intervalo, remove o dia inteiro
        const newSchedule = { ...prev.weekSchedule };
        delete newSchedule[day];
        return { ...prev, weekSchedule: newSchedule };
      }
      return {
        ...prev,
        weekSchedule: {
          ...prev.weekSchedule,
          [day]: dayRanges.filter((_, i) => i !== index),
        },
      };
    });
  };

  // Atualiza um intervalo de tempo de um dia específico
  const handleTimeRangeChange = (day: number, index: number, field: 'start' | 'end', value: string) => {
    setFormData((prev) => ({
      ...prev,
      weekSchedule: {
        ...prev.weekSchedule,
        [day]: (prev.weekSchedule[day] || []).map((range, i) =>
          i === index ? { ...range, [field]: value } : range
        ),
      },
    }));
  };

  // Clona os intervalos de um dia para outros dias
  const handleCloneToWeekdays = (sourceDay: number) => {
    const sourceRanges = formData.weekSchedule[sourceDay];
    if (!sourceRanges) return;

    const weekdays = [1, 2, 3, 4, 5]; // Segunda a Sexta
    const newSchedule = { ...formData.weekSchedule };

    weekdays.forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = [...sourceRanges];
      }
    });

    setFormData(prev => ({ ...prev, weekSchedule: newSchedule }));
    toast.success('Horários copiados para os dias úteis!');
  };

  const handleCloneToWeekend = (sourceDay: number) => {
    const sourceRanges = formData.weekSchedule[sourceDay];
    if (!sourceRanges) return;

    const weekend = [0, 6]; // Domingo e Sábado
    const newSchedule = { ...formData.weekSchedule };

    weekend.forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = [...sourceRanges];
      }
    });

    setFormData(prev => ({ ...prev, weekSchedule: newSchedule }));
    toast.success('Horários copiados para o fim de semana!');
  };

  const handleCloneToAllDays = (sourceDay: number) => {
    const sourceRanges = formData.weekSchedule[sourceDay];
    if (!sourceRanges) return;

    const newSchedule: WeekSchedule = {};

    for (let day = 0; day <= 6; day++) {
      newSchedule[day] = [...sourceRanges];
    }

    setFormData(prev => ({ ...prev, weekSchedule: newSchedule }));
    toast.success('Horários copiados para todos os dias!');
  };

  const handleCloneToSelectedDays = (sourceDay: number, targetDays: number[]) => {
    const sourceRanges = formData.weekSchedule[sourceDay];
    if (!sourceRanges) return;

    const newSchedule = { ...formData.weekSchedule };

    targetDays.forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = [...sourceRanges];
      }
    });

    setFormData(prev => ({ ...prev, weekSchedule: newSchedule }));
    toast.success(`Horários copiados para ${targetDays.length} dia(s)!`);
  };

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Usuários
        </button>
        <h1 className="text-2xl lg:text-3xl font-bold">
          {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditing
            ? 'Atualize as informações do usuário'
            : 'Preencha os dados para criar um novo usuário'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 lg:p-6 space-y-6">
        {/* Informações Básicas */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Informações Básicas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="w-4 h-4" />
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="joao@exemplo.com"
              />
            </div>
          </div>
        </div>

        {/* Senha */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {isEditing ? 'Alterar Senha (opcional)' : 'Credenciais'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha {!isEditing && '*'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required={!isEditing}
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isEditing ? "Deixe em branco para não alterar" : "Mínimo 8 caracteres"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {!isEditing && (
                <p className="text-sm text-gray-500 mt-1">
                  A senha deve ter no mínimo 8 caracteres
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha {!isEditing && '*'}
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required={!isEditing}
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={isEditing ? "Confirme a nova senha" : "Confirme a senha"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {isEditing && (
                <p className="text-sm text-gray-500 mt-1">
                  Deixe em branco para manter a senha atual
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Função e Permissões */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Função e Permissões
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Função *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="OWNER">Proprietário</option>
                <option value="DIRECTOR">Diretor</option>
                <option value="MANAGER">Admin TI</option>
                <option value="COORDINATOR">Coordenador(a)</option>
                <option value="SALESPERSON">Vendedor</option>
                <option value="STOCK">Estoque</option>
                <option value="PRODUCTION">Produção</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="MONITOR">Monitor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <div className="flex items-center h-10">
                <label className={`flex items-center ${formData.role === 'OWNER' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    disabled={formData.role === 'OWNER'}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-gray-700">Usuário Ativo</span>
                </label>
              </div>
              {formData.role === 'OWNER' && (
                <p className="text-xs text-gray-500 mt-1">
                  O proprietário não pode ser desativado
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Horário Permitido */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Horário de Acesso
          </h2>

          <div className="space-y-4">
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="allowedHoursEnabled"
                  checked={formData.allowedHoursEnabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Restringir horário de acesso
                </span>
              </label>
            </div>

            {formData.allowedHoursEnabled && (
              <div className="ml-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Configure os horários permitidos para cada dia da semana. Você pode adicionar múltiplos intervalos por dia.
                </p>

                <div className="space-y-3">
                  {[
                    { day: 0, label: 'Domingo' },
                    { day: 1, label: 'Segunda-feira' },
                    { day: 2, label: 'Terça-feira' },
                    { day: 3, label: 'Quarta-feira' },
                    { day: 4, label: 'Quinta-feira' },
                    { day: 5, label: 'Sexta-feira' },
                    { day: 6, label: 'Sábado' },
                  ].map(({ day, label }) => {
                    const isDayActive = !!formData.weekSchedule[day];
                    const dayRanges = formData.weekSchedule[day] || [];

                    return (
                      <div
                        key={day}
                        className={`border rounded-lg p-4 transition-colors ${
                          isDayActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isDayActive}
                              onChange={() => handleDayToggle(day)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm font-semibold text-gray-700">
                              {label}
                            </span>
                          </label>

                          {isDayActive && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddTimeRange(day)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Plus className="w-3 h-3" />
                                Intervalo
                              </button>

                              <div className="relative clone-menu-container">
                                <button
                                  type="button"
                                  onClick={() => setCloneMenuOpen(cloneMenuOpen === day ? null : day)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  title="Copiar para outros dias"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copiar
                                </button>

                                {cloneMenuOpen === day && (
                                  <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                                    <div className="p-2 space-y-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCloneToWeekdays(day);
                                          setCloneMenuOpen(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded flex items-center gap-2"
                                      >
                                        <Copy className="w-3 h-3 text-gray-500" />
                                        Copiar para dias úteis (Seg-Sex)
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCloneToWeekend(day);
                                          setCloneMenuOpen(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded flex items-center gap-2"
                                      >
                                        <Copy className="w-3 h-3 text-gray-500" />
                                        Copiar para fim de semana
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleCloneToAllDays(day);
                                          setCloneMenuOpen(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 rounded flex items-center gap-2"
                                      >
                                        <Copy className="w-3 h-3 text-gray-500" />
                                        Copiar para todos os dias
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {isDayActive && (
                          <div className="space-y-2 ml-6">
                            {dayRanges.map((range, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="flex-1 grid grid-cols-2 gap-2">
                                  <input
                                    type="time"
                                    value={range.start}
                                    onChange={(e) =>
                                      handleTimeRangeChange(day, index, 'start', e.target.value)
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <input
                                    type="time"
                                    value={range.end}
                                    onChange={(e) =>
                                      handleTimeRangeChange(day, index, 'end', e.target.value)
                                    }
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTimeRange(day, index)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                                  title="Remover intervalo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="w-full sm:w-auto px-6 py-2 min-h-[44px] border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={createUser.isPending || updateUser.isPending}
            className="w-full sm:w-auto px-6 py-2 min-h-[44px] bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createUser.isPending || updateUser.isPending
              ? 'Salvando...'
              : isEditing
              ? 'Atualizar Usuário'
              : 'Criar Usuário'}
          </button>
        </div>
      </form>
    </div>
  );
}
