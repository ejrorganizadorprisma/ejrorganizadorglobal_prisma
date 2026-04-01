import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const quickLogin = async (userEmail: string, userPassword: string) => {
    try {
      setEmail(userEmail);
      setPassword(userPassword);
      await login({ email: userEmail, password: userPassword });
      navigate('/dashboard');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4 py-4">
            <img
              src="/logo.jpeg"
              alt="EJR Organizador"
              className="h-28 sm:h-40 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bem-vindo de volta
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Faça login para continuar
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
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
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>

        {/* Botões de Login Rápido - Apenas para Desenvolvimento */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-center text-gray-500 mb-3">Login Rápido (Dev)</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => quickLogin('admin@ejr.com', 'admin123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin('leo@ejr.com', 'leo123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Leonardo
            </button>
            <button
              onClick={() => quickLogin('vendedor@ejr.com', 'venda123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Vendedor
            </button>
            <button
              onClick={() => quickLogin('producao@ejr.com', 'prod123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Produção
            </button>
            <button
              onClick={() => quickLogin('almoxarife@ejr.com', 'almox123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Almoxarife
            </button>
            <button
              onClick={() => quickLogin('compras@ejr.com', 'compras123')}
              disabled={isLoading}
              className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 transition-colors"
            >
              Compras
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
