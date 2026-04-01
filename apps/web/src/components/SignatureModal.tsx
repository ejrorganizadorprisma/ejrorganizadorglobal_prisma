import { useState } from 'react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signerInfo: { name: string; role: string }) => void;
  quoteName: string;
}

export function SignatureModal({ isOpen, onClose, onConfirm, quoteName }: SignatureModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Diretor');
  const [customRole, setCustomRole] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      setError('Nome do responsável é obrigatório');
      return;
    }

    if (role === 'Outro' && !customRole.trim()) {
      setError('Por favor, especifique o cargo');
      return;
    }

    const finalRole = role === 'Outro' ? customRole : role;

    onConfirm({
      name: name.trim(),
      role: finalRole
    });

    // Reset form
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setRole('Diretor');
    setCustomRole('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Gerar PDF do Orçamento</h2>
          <p className="text-sm text-blue-100 mt-1">{quoteName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600">
              Por favor, informe os dados do responsável que irá assinar o orçamento:
            </p>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Name input */}
            <div>
              <label htmlFor="signer-name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                id="signer-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: João Silva"
                autoFocus
              />
            </div>

            {/* Role select */}
            <div>
              <label htmlFor="signer-role" className="block text-sm font-medium text-gray-700 mb-1">
                Cargo <span className="text-red-500">*</span>
              </label>
              <select
                id="signer-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Diretor">Diretor</option>
                <option value="Vendedor">Vendedor</option>
                <option value="Admin TI">Admin TI</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Consultor">Consultor</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* Custom role input (shown when "Outro" is selected) */}
            {role === 'Outro' && (
              <div>
                <label htmlFor="custom-role" className="block text-sm font-medium text-gray-700 mb-1">
                  Especifique o Cargo <span className="text-red-500">*</span>
                </label>
                <input
                  id="custom-role"
                  type="text"
                  value={customRole}
                  onChange={(e) => {
                    setCustomRole(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Assistente Comercial"
                />
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                <strong>Nota:</strong> Estas informações aparecerão na linha de assinatura do PDF gerado.
              </p>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Gerar PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
