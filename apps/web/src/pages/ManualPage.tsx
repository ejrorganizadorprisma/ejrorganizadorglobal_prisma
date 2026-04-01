import { useState, useRef } from 'react';
import { MainLayout } from '../components/MainLayout';
import {
  Book,
  Download,
  ChevronRight,
  Users,
  Package,
  ShoppingCart,
  Truck,
  Factory,
  Warehouse,
  FileText,
  Settings,
  Shield,
  BarChart3,
  Wrench,
  ClipboardList,
  Building2,
  CreditCard,
  Box,
  Layers,
  CheckCircle2,
  AlertCircle,
  Info,
  Lightbulb
} from 'lucide-react';

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export function ManualPage() {
  const [activeSection, setActiveSection] = useState<string>('introducao');
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadPDF = async () => {
    const content = contentRef.current;
    if (!content) return;

    // Criar uma nova janela para impressão/PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para baixar o PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Manual EJR Organizador</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1f2937;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
          }

          .header h1 {
            font-size: 28px;
            color: #1e40af;
            margin-bottom: 8px;
          }

          .header p {
            color: #6b7280;
            font-size: 14px;
          }

          h2 {
            font-size: 22px;
            color: #1e40af;
            margin-top: 30px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #dbeafe;
            page-break-after: avoid;
          }

          h3 {
            font-size: 18px;
            color: #1e3a8a;
            margin-top: 20px;
            margin-bottom: 10px;
            page-break-after: avoid;
          }

          h4 {
            font-size: 16px;
            color: #1e40af;
            margin-top: 15px;
            margin-bottom: 8px;
          }

          p {
            margin-bottom: 12px;
            text-align: justify;
          }

          ul, ol {
            margin-bottom: 15px;
            padding-left: 25px;
          }

          li {
            margin-bottom: 6px;
          }

          .tip-box {
            background: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
          }

          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
          }

          .info-box {
            background: #f3f4f6;
            border-left: 4px solid #6b7280;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 14px;
          }

          th, td {
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
          }

          th {
            background: #f3f4f6;
            font-weight: 600;
          }

          .page-break {
            page-break-before: always;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 20px;
            }

            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Manual do Usuario</h1>
          <h2 style="border: none; margin: 0; padding: 0; font-size: 24px;">EJR Organizador</h2>
          <p style="margin-top: 10px;">Sistema de Gestao Empresarial</p>
          <p>Desenvolvido por EJR Robotica Educacional</p>
          <p style="margin-top: 10px; font-size: 12px;">Versao 1.0 - ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        ${generatePDFContent()}

        <div class="footer">
          <p>EJR Organizador - Sistema de Gestao Empresarial</p>
          <p>Desenvolvido por EJR Robotica Educacional</p>
          <p>© ${new Date().getFullYear()} - Todos os direitos reservados</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();

    // Aguardar carregamento e abrir diálogo de impressão
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generatePDFContent = () => {
    return `
      <h2>1. Introducao</h2>
      <p>Bem-vindo ao EJR Organizador, o sistema de gestao empresarial desenvolvido pela EJR Robotica Educacional. Esta plataforma foi criada para otimizar e integrar todos os processos da sua empresa, desde o cadastro de produtos ate o controle de producao.</p>

      <h3>1.1 Sobre o Sistema</h3>
      <p>O EJR Organizador e uma solucao completa que integra:</p>
      <ul>
        <li>Gestao de Produtos e Estoque</li>
        <li>Cadastro de Clientes e Fornecedores</li>
        <li>Orcamentos e Vendas</li>
        <li>Ordens de Servico</li>
        <li>Compras e Recebimentos</li>
        <li>Producao e Lotes</li>
        <li>Relatorios e Dashboards</li>
      </ul>

      <h3>1.2 Requisitos</h3>
      <ul>
        <li>Navegador moderno (Chrome, Firefox, Edge ou Safari)</li>
        <li>Conexao com internet</li>
        <li>Usuario e senha cadastrados</li>
      </ul>

      <div class="page-break"></div>

      <h2>2. Primeiros Passos</h2>

      <h3>2.1 Acessando o Sistema</h3>
      <ol>
        <li>Abra o navegador e acesse o endereco fornecido</li>
        <li>Na tela de login, insira seu e-mail e senha</li>
        <li>Clique em "Entrar"</li>
      </ol>

      <h3>2.2 Navegacao</h3>
      <p>O sistema possui um menu lateral (sidebar) com todas as funcionalidades organizadas por categorias:</p>
      <ul>
        <li><strong>Dashboard:</strong> Visao geral com metricas importantes</li>
        <li><strong>Cadastros:</strong> Produtos, Clientes, Fornecedores</li>
        <li><strong>Comercial:</strong> Orcamentos, Vendas, Servicos</li>
        <li><strong>Compras:</strong> Requisicoes, Pedidos, Recebimentos</li>
        <li><strong>Producao:</strong> Ordens, Lotes, Minha Producao</li>
        <li><strong>Estoque:</strong> Ajustes, Reservas, Localizacoes</li>
        <li><strong>Configuracoes:</strong> Usuarios, Permissoes, Sistema</li>
      </ul>

      <div class="page-break"></div>

      <h2>3. Gestao de Produtos</h2>

      <h3>3.1 Cadastro de Produtos</h3>
      <p>Para cadastrar um novo produto:</p>
      <ol>
        <li>Acesse Produtos no menu lateral</li>
        <li>Clique em "Novo Produto"</li>
        <li>Preencha as informacoes obrigatorias: Codigo, Nome, Categoria</li>
        <li>Configure precos de custo e venda</li>
        <li>Defina estoques minimo e atual</li>
        <li>Clique em "Salvar"</li>
      </ol>

      <h3>3.2 Tipos de Produtos</h3>
      <table>
        <tr>
          <th>Tipo</th>
          <th>Descricao</th>
        </tr>
        <tr>
          <td>Produto Simples</td>
          <td>Item vendido diretamente, sem composicao</td>
        </tr>
        <tr>
          <td>Produto Montado</td>
          <td>Item composto por pecas (BOM)</td>
        </tr>
        <tr>
          <td>Peca/Componente</td>
          <td>Item usado na montagem de outros produtos</td>
        </tr>
      </table>

      <h3>3.3 Lista de Materiais (BOM)</h3>
      <p>Para produtos montados, configure a lista de materiais:</p>
      <ol>
        <li>Edite o produto e va para a aba "Composicao"</li>
        <li>Clique em "Adicionar Peca"</li>
        <li>Selecione o componente e a quantidade</li>
        <li>Repita para todas as pecas necessarias</li>
      </ol>

      <div class="page-break"></div>

      <h2>4. Gestao de Clientes</h2>

      <h3>4.1 Cadastro de Clientes</h3>
      <p>O sistema suporta dois tipos de clientes:</p>
      <ul>
        <li><strong>Pessoa Fisica:</strong> CPF obrigatorio</li>
        <li><strong>Pessoa Juridica:</strong> CNPJ obrigatorio</li>
      </ul>

      <h3>4.2 Informacoes do Cliente</h3>
      <ul>
        <li>Dados basicos: Nome, Documento, E-mail, Telefone</li>
        <li>Endereco completo para entregas e faturamento</li>
        <li>Historico de orcamentos e vendas</li>
      </ul>

      <div class="page-break"></div>

      <h2>5. Orcamentos e Vendas</h2>

      <h3>5.1 Criando um Orcamento</h3>
      <ol>
        <li>Acesse Orcamentos > Novo Orcamento</li>
        <li>Selecione o cliente</li>
        <li>Adicione os produtos/servicos</li>
        <li>Aplique descontos se necessario</li>
        <li>Defina a validade</li>
        <li>Salve e envie ao cliente</li>
      </ol>

      <h3>5.2 Status do Orcamento</h3>
      <table>
        <tr>
          <th>Status</th>
          <th>Descricao</th>
        </tr>
        <tr>
          <td>Rascunho</td>
          <td>Em elaboracao</td>
        </tr>
        <tr>
          <td>Enviado</td>
          <td>Aguardando resposta do cliente</td>
        </tr>
        <tr>
          <td>Aprovado</td>
          <td>Cliente aceitou</td>
        </tr>
        <tr>
          <td>Rejeitado</td>
          <td>Cliente recusou</td>
        </tr>
        <tr>
          <td>Expirado</td>
          <td>Validade venceu</td>
        </tr>
        <tr>
          <td>Convertido</td>
          <td>Transformado em venda</td>
        </tr>
      </table>

      <h3>5.3 Convertendo em Venda</h3>
      <p>Apos aprovacao do cliente:</p>
      <ol>
        <li>Abra o orcamento aprovado</li>
        <li>Clique em "Converter em Venda"</li>
        <li>Configure as condicoes de pagamento</li>
        <li>Confirme a venda</li>
      </ol>

      <h3>5.4 Controle de Pagamentos</h3>
      <p>O sistema permite:</p>
      <ul>
        <li>Parcelamento flexivel</li>
        <li>Multiplas formas de pagamento</li>
        <li>Registro de pagamentos parciais</li>
        <li>Controle de inadimplencia</li>
      </ul>

      <div class="page-break"></div>

      <h2>6. Gestao de Fornecedores</h2>

      <h3>6.1 Cadastro de Fornecedores</h3>
      <p>Mantenha seus fornecedores organizados com:</p>
      <ul>
        <li>Dados cadastrais completos</li>
        <li>Contatos e enderecos</li>
        <li>Prazos de entrega padrao</li>
        <li>Produtos fornecidos e precos</li>
      </ul>

      <h3>6.2 Relacionamento Produto-Fornecedor</h3>
      <p>Para cada produto, voce pode:</p>
      <ul>
        <li>Cadastrar multiplos fornecedores</li>
        <li>Definir precos por fornecedor</li>
        <li>Marcar fornecedor preferencial</li>
        <li>Registrar prazos de entrega</li>
      </ul>

      <div class="page-break"></div>

      <h2>7. Processo de Compras</h2>

      <h3>7.1 Requisicao de Compra</h3>
      <p>Fluxo para solicitar materiais:</p>
      <ol>
        <li>Crie uma Requisicao de Compra</li>
        <li>Adicione os itens necessarios</li>
        <li>Defina a prioridade</li>
        <li>Envie para aprovacao</li>
      </ol>

      <h3>7.2 Pedido ao Fornecedor</h3>
      <p>Apos aprovacao da requisicao:</p>
      <ol>
        <li>Converta em Pedido de Compra</li>
        <li>Selecione o fornecedor</li>
        <li>Confirme quantidades e precos</li>
        <li>Envie ao fornecedor</li>
      </ol>

      <h3>7.3 Recebimento de Mercadorias</h3>
      <p>Quando os produtos chegarem:</p>
      <ol>
        <li>Acesse Recebimentos</li>
        <li>Selecione o pedido</li>
        <li>Confira as quantidades</li>
        <li>Registre a nota fiscal</li>
        <li>Aprove para atualizar o estoque</li>
      </ol>

      <div class="page-break"></div>

      <h2>8. Controle de Producao</h2>

      <h3>8.1 Lotes de Producao</h3>
      <p>Para produtos montados, crie lotes:</p>
      <ol>
        <li>Acesse Lotes de Producao</li>
        <li>Clique em "Novo Lote"</li>
        <li>Selecione o produto</li>
        <li>Defina a quantidade</li>
        <li>Libere para producao</li>
      </ol>

      <h3>8.2 Unidades de Producao</h3>
      <p>Cada lote gera unidades individuais que podem ser:</p>
      <ul>
        <li>Atribuidas a funcionarios</li>
        <li>Rastreadas por numero de serie</li>
        <li>Testadas em dois niveis</li>
      </ul>

      <h3>8.3 Liberacao de Componentes</h3>
      <p>Antes da montagem:</p>
      <ol>
        <li>O estoquista libera os componentes</li>
        <li>O sistema verifica disponibilidade</li>
        <li>O estoque e baixado automaticamente</li>
      </ol>

      <h3>8.4 Testes de Qualidade</h3>
      <table>
        <tr>
          <th>Nivel</th>
          <th>Descricao</th>
        </tr>
        <tr>
          <td>Teste de Montagem</td>
          <td>Verificacao pos-montagem</td>
        </tr>
        <tr>
          <td>Teste Final</td>
          <td>Verificacao antes da entrega</td>
        </tr>
      </table>

      <div class="page-break"></div>

      <h2>9. Gestao de Estoque</h2>

      <h3>9.1 Localizacoes</h3>
      <p>Organize seu estoque em 3 niveis:</p>
      <ul>
        <li><strong>Espaco:</strong> Area fisica (Ex: Almoxarifado A)</li>
        <li><strong>Prateleira:</strong> Divisao do espaco (Ex: Prateleira 01)</li>
        <li><strong>Secao:</strong> Posicao especifica (Ex: A1, A2, B1)</li>
      </ul>

      <h3>9.2 Ajuste de Estoque</h3>
      <p>Para corrigir quantidades:</p>
      <ol>
        <li>Acesse Ajuste de Estoque</li>
        <li>Selecione o produto</li>
        <li>Informe a nova quantidade ou diferenca</li>
        <li>Registre o motivo</li>
        <li>Confirme o ajuste</li>
      </ol>

      <h3>9.3 Reservas de Estoque</h3>
      <p>O sistema reserva automaticamente produtos para:</p>
      <ul>
        <li>Vendas confirmadas</li>
        <li>Ordens de producao</li>
        <li>Ordens de servico</li>
      </ul>

      <div class="page-break"></div>

      <h2>10. Ordens de Servico</h2>

      <h3>10.1 Criando uma OS</h3>
      <ol>
        <li>Acesse Ordens de Servico > Nova OS</li>
        <li>Selecione o cliente e produto</li>
        <li>Descreva o problema</li>
        <li>Atribua um tecnico</li>
        <li>Salve a ordem</li>
      </ol>

      <h3>10.2 Fluxo da OS</h3>
      <table>
        <tr>
          <th>Status</th>
          <th>Descricao</th>
        </tr>
        <tr>
          <td>Aberta</td>
          <td>Aguardando atendimento</td>
        </tr>
        <tr>
          <td>Aguardando Pecas</td>
          <td>Faltam componentes</td>
        </tr>
        <tr>
          <td>Em Atendimento</td>
          <td>Tecnico trabalhando</td>
        </tr>
        <tr>
          <td>Aguardando Aprovacao</td>
          <td>Orcamento pendente</td>
        </tr>
        <tr>
          <td>Concluida</td>
          <td>Servico finalizado</td>
        </tr>
      </table>

      <div class="page-break"></div>

      <h2>11. Relatorios</h2>

      <h3>11.1 Relatorios Disponiveis</h3>
      <ul>
        <li><strong>Vendas:</strong> Por periodo, cliente, produto</li>
        <li><strong>Estoque:</strong> Posicao atual, movimentacoes</li>
        <li><strong>Producao:</strong> Eficiencia, refugos</li>
        <li><strong>Financeiro:</strong> Contas a receber, fluxo</li>
      </ul>

      <h3>11.2 Dashboard</h3>
      <p>Visualize em tempo real:</p>
      <ul>
        <li>Vendas do mes</li>
        <li>Produtos com estoque baixo</li>
        <li>Orcamentos pendentes</li>
        <li>Producao em andamento</li>
      </ul>

      <div class="page-break"></div>

      <h2>12. Usuarios e Permissoes</h2>

      <h3>12.1 Perfis de Usuario</h3>
      <table>
        <tr>
          <th>Perfil</th>
          <th>Descricao</th>
        </tr>
        <tr>
          <td>Proprietario</td>
          <td>Acesso total ao sistema</td>
        </tr>
        <tr>
          <td>Diretor</td>
          <td>Gestao administrativa</td>
        </tr>
        <tr>
          <td>Gerente</td>
          <td>Supervisao de equipes</td>
        </tr>
        <tr>
          <td>Coordenador</td>
          <td>Coordenacao operacional</td>
        </tr>
        <tr>
          <td>Vendedor</td>
          <td>Orcamentos e vendas</td>
        </tr>
        <tr>
          <td>Estoque</td>
          <td>Gestao de inventario</td>
        </tr>
        <tr>
          <td>Producao</td>
          <td>Montagem e testes</td>
        </tr>
        <tr>
          <td>Tecnico</td>
          <td>Ordens de servico</td>
        </tr>
        <tr>
          <td>Monitor</td>
          <td>Somente visualizacao</td>
        </tr>
      </table>

      <h3>12.2 Configurando Permissoes</h3>
      <p>Administradores podem:</p>
      <ul>
        <li>Definir acesso por modulo</li>
        <li>Permitir ou bloquear acoes (criar, editar, excluir)</li>
        <li>Personalizar por perfil</li>
      </ul>

      <div class="page-break"></div>

      <h2>13. Configuracoes do Sistema</h2>

      <h3>13.1 Configuracoes de Documentos</h3>
      <p>Personalize seus documentos com:</p>
      <ul>
        <li>Logo da empresa</li>
        <li>Dados de contato no rodape</li>
        <li>Assinatura digital</li>
        <li>Cores personalizadas</li>
      </ul>

      <h3>13.2 Categorias de Produtos</h3>
      <p>Organize seus produtos em categorias para facilitar a busca e relatorios.</p>

      <h3>13.3 Backup</h3>
      <p>Mantenha seus dados seguros:</p>
      <ul>
        <li>Backup automatico diario</li>
        <li>Opcao de backup manual</li>
        <li>Restauracao quando necessario</li>
      </ul>

      <div class="page-break"></div>

      <h2>14. Dicas e Boas Praticas</h2>

      <div class="tip-box">
        <strong>Dica:</strong> Mantenha os cadastros sempre atualizados para garantir a precisao dos relatorios.
      </div>

      <div class="tip-box">
        <strong>Dica:</strong> Configure alertas de estoque minimo para evitar falta de produtos.
      </div>

      <div class="tip-box">
        <strong>Dica:</strong> Use o sistema de permissoes para garantir que cada funcionario acesse apenas o necessario.
      </div>

      <div class="warning-box">
        <strong>Atencao:</strong> Sempre confira os recebimentos antes de aprovar para evitar divergencias no estoque.
      </div>

      <div class="warning-box">
        <strong>Atencao:</strong> Faca backup regular dos dados importantes.
      </div>

      <h2>15. Suporte</h2>

      <p>Em caso de duvidas ou problemas:</p>
      <ul>
        <li>Consulte este manual</li>
        <li>Entre em contato com o administrador do sistema</li>
        <li>Acesse o suporte da EJR Robotica Educacional</li>
      </ul>
    `;
  };

  const sections: ManualSection[] = [
    {
      id: 'introducao',
      title: 'Introducao',
      icon: <Book className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Bem-vindo ao EJR Organizador</h3>
            <p className="text-gray-600 leading-relaxed">
              O EJR Organizador e o sistema de gestao empresarial desenvolvido pela EJR Robotica Educacional.
              Esta plataforma foi criada para otimizar e integrar todos os processos da sua empresa,
              desde o cadastro de produtos ate o controle completo de producao.
            </p>
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              O que voce pode fazer com o EJR Organizador
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                'Gerenciar produtos e estoque',
                'Cadastrar clientes e fornecedores',
                'Criar orcamentos e vendas',
                'Controlar ordens de servico',
                'Gerenciar compras e recebimentos',
                'Controlar producao e lotes',
                'Gerar relatorios detalhados',
                'Administrar usuarios e permissoes'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-blue-800">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Requisitos</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- Navegador moderno</li>
                <li>- Conexao com internet</li>
                <li>- Usuario cadastrado</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Navegadores Suportados</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- Google Chrome</li>
                <li>- Mozilla Firefox</li>
                <li>- Microsoft Edge</li>
              </ul>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-2">Acesso</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>- Use seu e-mail</li>
                <li>- Senha pessoal</li>
                <li>- Acesso seguro</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'primeiros-passos',
      title: 'Primeiros Passos',
      icon: <ChevronRight className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Acessando o Sistema</h3>
            <div className="bg-gray-50 rounded-xl p-6">
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <div>
                    <p className="font-medium text-gray-900">Acesse o endereco do sistema</p>
                    <p className="text-sm text-gray-600">Abra seu navegador e digite o endereco fornecido pelo administrador</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <div>
                    <p className="font-medium text-gray-900">Faca login</p>
                    <p className="text-sm text-gray-600">Insira seu e-mail e senha na tela de login</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <div>
                    <p className="font-medium text-gray-900">Navegue pelo sistema</p>
                    <p className="text-sm text-gray-600">Use o menu lateral para acessar todas as funcionalidades</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Estrutura do Menu</h3>
            <p className="text-gray-600 mb-4">O menu lateral esta organizado por areas funcionais:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: <BarChart3 className="w-5 h-5" />, title: 'Dashboard', desc: 'Visao geral e metricas' },
                { icon: <Package className="w-5 h-5" />, title: 'Cadastros', desc: 'Produtos, clientes, fornecedores' },
                { icon: <ShoppingCart className="w-5 h-5" />, title: 'Comercial', desc: 'Orcamentos, vendas, servicos' },
                { icon: <Truck className="w-5 h-5" />, title: 'Compras', desc: 'Requisicoes, pedidos, recebimentos' },
                { icon: <Factory className="w-5 h-5" />, title: 'Producao', desc: 'Ordens, lotes, montagem' },
                { icon: <Warehouse className="w-5 h-5" />, title: 'Estoque', desc: 'Ajustes, reservas, localizacoes' },
                { icon: <FileText className="w-5 h-5" />, title: 'Relatorios', desc: 'Analises e exportacoes' },
                { icon: <Settings className="w-5 h-5" />, title: 'Configuracoes', desc: 'Usuarios, sistema, backup' },
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'produtos',
      title: 'Gestao de Produtos',
      icon: <Package className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Cadastro de Produtos</h3>
            <p className="text-gray-600 mb-4">
              O modulo de produtos permite cadastrar e gerenciar todos os itens da sua empresa,
              incluindo produtos para venda, componentes e pecas para montagem.
            </p>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Importante</p>
                <p className="text-sm text-amber-700">
                  O codigo do produto deve ser unico e nao pode ser alterado apos o cadastro.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Tipos de Produtos</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Tipo</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Descricao</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Uso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3">Produto Simples</td>
                    <td className="border border-gray-200 px-4 py-3">Item vendido diretamente</td>
                    <td className="border border-gray-200 px-4 py-3">Vendas e estoque</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3">Produto Montado</td>
                    <td className="border border-gray-200 px-4 py-3">Composto por pecas (BOM)</td>
                    <td className="border border-gray-200 px-4 py-3">Producao e vendas</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3">Peca/Componente</td>
                    <td className="border border-gray-200 px-4 py-3">Item para montagem</td>
                    <td className="border border-gray-200 px-4 py-3">Composicao de produtos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Lista de Materiais (BOM)</h4>
            <p className="text-gray-600 mb-3">
              Para produtos montados, configure a lista de componentes necessarios:
            </p>
            <div className="bg-blue-50 rounded-xl p-6">
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <span>Edite o produto e acesse a aba "Composicao"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <span>Clique em "Adicionar Peca"</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <span>Selecione o componente e informe a quantidade</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <span>Repita para todas as pecas necessarias</span>
                </li>
              </ol>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Campos Importantes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Preco de Custo</p>
                <p className="text-sm text-gray-600">Valor pago na aquisicao do produto</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Preco de Venda</p>
                <p className="text-sm text-gray-600">Valor cobrado do cliente</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Estoque Minimo</p>
                <p className="text-sm text-gray-600">Quantidade para alerta de reposicao</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Localizacao</p>
                <p className="text-sm text-gray-600">Onde o produto esta armazenado</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'clientes',
      title: 'Gestao de Clientes',
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Cadastro de Clientes</h3>
            <p className="text-gray-600 mb-4">
              Mantenha o cadastro completo dos seus clientes para agilizar orcamentos, vendas e suporte.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Tipos de Clientes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <h5 className="font-semibold text-gray-900">Pessoa Fisica</h5>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>- CPF obrigatorio</li>
                  <li>- Nome completo</li>
                  <li>- Dados de contato</li>
                  <li>- Endereco residencial</li>
                </ul>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <h5 className="font-semibold text-gray-900">Pessoa Juridica</h5>
                </div>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>- CNPJ obrigatorio</li>
                  <li>- Razao social</li>
                  <li>- Dados de contato</li>
                  <li>- Endereco comercial</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Dica</p>
                <p className="text-sm text-blue-700">
                  Mantenha os dados de contato sempre atualizados para facilitar a comunicacao com o cliente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'vendas',
      title: 'Orcamentos e Vendas',
      icon: <ShoppingCart className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Fluxo Comercial</h3>
            <p className="text-gray-600 mb-4">
              O processo comercial segue o fluxo: Orcamento → Aprovacao → Venda → Pagamento.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Status do Orcamento</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { status: 'Rascunho', color: 'bg-gray-100 text-gray-700', desc: 'Em elaboracao' },
                { status: 'Enviado', color: 'bg-blue-100 text-blue-700', desc: 'Aguardando cliente' },
                { status: 'Aprovado', color: 'bg-green-100 text-green-700', desc: 'Cliente aceitou' },
                { status: 'Rejeitado', color: 'bg-red-100 text-red-700', desc: 'Cliente recusou' },
                { status: 'Expirado', color: 'bg-orange-100 text-orange-700', desc: 'Validade venceu' },
                { status: 'Convertido', color: 'bg-purple-100 text-purple-700', desc: 'Virou venda' },
              ].map((item, index) => (
                <div key={index} className={`p-3 rounded-lg ${item.color}`}>
                  <p className="font-medium">{item.status}</p>
                  <p className="text-xs opacity-80">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Formas de Pagamento</h4>
            <div className="flex flex-wrap gap-2">
              {['Dinheiro', 'Cartao de Credito', 'Cartao de Debito', 'PIX', 'Transferencia', 'Boleto', 'Cheque'].map((forma, index) => (
                <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {forma}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Controle de Pagamentos</h4>
            <p className="text-gray-600 mb-3">O sistema permite:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Parcelamento flexivel</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Registro de pagamentos parciais</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Controle de vencimentos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Alertas de inadimplencia</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'fornecedores',
      title: 'Gestao de Fornecedores',
      icon: <Truck className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Cadastro de Fornecedores</h3>
            <p className="text-gray-600 mb-4">
              Mantenha seus fornecedores organizados com informacoes completas de contato,
              produtos fornecidos e condicoes comerciais.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Informacoes do Fornecedor</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Dados Cadastrais</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Razao social e CNPJ</li>
                  <li>- E-mail e telefone</li>
                  <li>- Endereco completo</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Condicoes Comerciais</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>- Prazo de entrega padrao</li>
                  <li>- Pedido minimo</li>
                  <li>- Observacoes especiais</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Relacionamento Produto-Fornecedor</h4>
            <p className="text-gray-600 mb-3">
              Para cada produto, voce pode vincular multiplos fornecedores:
            </p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Codigo do produto no fornecedor (SKU)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Preco unitario de compra</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Prazo de entrega especifico</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Marcacao de fornecedor preferencial</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'compras',
      title: 'Processo de Compras',
      icon: <ClipboardList className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Fluxo de Compras</h3>
            <p className="text-gray-600 mb-4">
              O processo de compras segue um fluxo controlado para garantir aprovacoes e rastreabilidade.
            </p>
          </div>

          <div className="relative overflow-x-auto">
            <div className="flex items-center justify-between mb-8 min-w-[320px]">
              {['Requisicao', 'Aprovacao', 'Pedido', 'Envio', 'Recebimento'].map((step, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base mb-2">
                    {index + 1}
                  </div>
                  <span className="text-xs text-gray-600 text-center">{step}</span>
                </div>
              ))}
            </div>
            <div className="absolute top-4 sm:top-5 left-10 right-10 h-0.5 bg-blue-200 -z-10"></div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Etapas Detalhadas</h4>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">1. Requisicao de Compra</p>
                <p className="text-sm text-gray-600">
                  Qualquer funcionario pode solicitar materiais. A requisicao aguarda aprovacao de um gestor.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">2. Pedido ao Fornecedor</p>
                <p className="text-sm text-gray-600">
                  Apos aprovacao, a requisicao e convertida em pedido com selecao do fornecedor.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">3. Recebimento de Mercadorias</p>
                <p className="text-sm text-gray-600">
                  Quando os produtos chegam, o recebimento e registrado e o estoque atualizado.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'producao',
      title: 'Controle de Producao',
      icon: <Factory className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Lotes de Producao</h3>
            <p className="text-gray-600 mb-4">
              Para produtos montados, o sistema permite controlar a producao em lotes com rastreamento individual de cada unidade.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Status do Lote</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { status: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
                { status: 'Planejado', color: 'bg-blue-100 text-blue-700' },
                { status: 'Liberado', color: 'bg-cyan-100 text-cyan-700' },
                { status: 'Em Producao', color: 'bg-yellow-100 text-yellow-700' },
                { status: 'Pausado', color: 'bg-orange-100 text-orange-700' },
                { status: 'Em Teste', color: 'bg-purple-100 text-purple-700' },
                { status: 'Concluido', color: 'bg-green-100 text-green-700' },
                { status: 'Cancelado', color: 'bg-red-100 text-red-700' },
              ].map((item, index) => (
                <div key={index} className={`p-2 rounded-lg text-center text-sm ${item.color}`}>
                  {item.status}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Fluxo de Producao</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Criacao do Lote</p>
                  <p className="text-sm text-gray-600">Defina o produto e a quantidade a ser produzida</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Box className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Liberacao de Componentes</p>
                  <p className="text-sm text-gray-600">O estoque libera os materiais necessarios para montagem</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Montagem</p>
                  <p className="text-sm text-gray-600">Funcionarios montam as unidades individualmente</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Testes de Qualidade</p>
                  <p className="text-sm text-gray-600">Teste pos-montagem e teste final antes da entrega</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Rastreabilidade</p>
                <p className="text-sm text-blue-700">
                  Cada unidade produzida recebe um numero de serie unico para rastreamento completo.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'estoque',
      title: 'Gestao de Estoque',
      icon: <Warehouse className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Organizacao do Estoque</h3>
            <p className="text-gray-600 mb-4">
              O sistema permite organizar o estoque em uma hierarquia de tres niveis para facilitar a localizacao dos produtos.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Hierarquia de Localizacao</h4>
            <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
              <div className="p-6 bg-blue-100 rounded-xl text-center">
                <Warehouse className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-blue-900">Espaco</p>
                <p className="text-xs text-blue-700">Ex: Almoxarifado A</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 hidden md:block" />
              <div className="p-6 bg-green-100 rounded-xl text-center">
                <Layers className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-900">Prateleira</p>
                <p className="text-xs text-green-700">Ex: Prateleira 01</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 hidden md:block" />
              <div className="p-6 bg-purple-100 rounded-xl text-center">
                <Box className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold text-purple-900">Secao</p>
                <p className="text-xs text-purple-700">Ex: A1, A2, B1</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Funcionalidades</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Ajuste de Estoque</p>
                <p className="text-sm text-gray-600">
                  Corrija quantidades com registro do motivo e responsavel.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Reservas</p>
                <p className="text-sm text-gray-600">
                  O sistema reserva automaticamente produtos para vendas e producao.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Alertas</p>
                <p className="text-sm text-gray-600">
                  Receba avisos quando produtos atingirem o estoque minimo.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Historico</p>
                <p className="text-sm text-gray-600">
                  Consulte todas as movimentacoes de cada produto.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'servicos',
      title: 'Ordens de Servico',
      icon: <Wrench className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Gestao de Servicos</h3>
            <p className="text-gray-600 mb-4">
              Controle completo de ordens de servico, desde a abertura ate a conclusao,
              incluindo pecas utilizadas e custos.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Fluxo da Ordem de Servico</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Status</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Descricao</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">Aberta</span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3">Aguardando atendimento</td>
                    <td className="border border-gray-200 px-4 py-3">Atribuir tecnico</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm">Aguardando Pecas</span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3">Faltam componentes</td>
                    <td className="border border-gray-200 px-4 py-3">Solicitar pecas</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">Em Atendimento</span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3">Tecnico trabalhando</td>
                    <td className="border border-gray-200 px-4 py-3">Registrar servico</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">Aguardando Aprovacao</span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3">Orcamento pendente</td>
                    <td className="border border-gray-200 px-4 py-3">Aprovar valor</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Concluida</span>
                    </td>
                    <td className="border border-gray-200 px-4 py-3">Servico finalizado</td>
                    <td className="border border-gray-200 px-4 py-3">Entregar ao cliente</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Informacoes Registradas</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Descricao do problema relatado pelo cliente</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Diagnostico tecnico</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Pecas utilizadas com custos</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Mao de obra e tempo gasto</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Fotos e documentos anexos</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'relatorios',
      title: 'Relatorios',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Relatorios e Analises</h3>
            <p className="text-gray-600 mb-4">
              Acompanhe o desempenho da sua empresa com relatorios detalhados e dashboards em tempo real.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Relatorios Disponiveis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-medium text-blue-900 mb-2">Vendas</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>- Por periodo</li>
                  <li>- Por cliente</li>
                  <li>- Por produto</li>
                  <li>- Por vendedor</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="font-medium text-green-900 mb-2">Estoque</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>- Posicao atual</li>
                  <li>- Movimentacoes</li>
                  <li>- Produtos abaixo do minimo</li>
                  <li>- Valor em estoque</li>
                </ul>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="font-medium text-purple-900 mb-2">Producao</p>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>- Eficiencia por lote</li>
                  <li>- Taxa de refugo</li>
                  <li>- Producao por funcionario</li>
                  <li>- Tempo medio de montagem</li>
                </ul>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="font-medium text-orange-900 mb-2">Financeiro</p>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>- Contas a receber</li>
                  <li>- Contas a pagar</li>
                  <li>- Fluxo de caixa</li>
                  <li>- Inadimplencia</li>
                </ul>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Dashboard</h4>
            <p className="text-gray-600 mb-3">O dashboard exibe em tempo real:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Vendas do mes', 'Estoque baixo', 'OS abertas', 'Producao'].map((item, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'usuarios',
      title: 'Usuarios e Permissoes',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Gestao de Usuarios</h3>
            <p className="text-gray-600 mb-4">
              Controle de acesso granular baseado em perfis de usuario, garantindo que cada funcionario
              acesse apenas as funcionalidades necessarias.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Perfis de Usuario</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Perfil</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Descricao</th>
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Acesso Principal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 font-medium">Proprietario</td>
                    <td className="border border-gray-200 px-4 py-3">Dono do sistema</td>
                    <td className="border border-gray-200 px-4 py-3">Acesso total</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Diretor</td>
                    <td className="border border-gray-200 px-4 py-3">Gestao administrativa</td>
                    <td className="border border-gray-200 px-4 py-3">Todos os modulos</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 font-medium">Gerente</td>
                    <td className="border border-gray-200 px-4 py-3">Supervisao</td>
                    <td className="border border-gray-200 px-4 py-3">Relatorios e equipes</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Coordenador</td>
                    <td className="border border-gray-200 px-4 py-3">Coordenacao</td>
                    <td className="border border-gray-200 px-4 py-3">Area especifica</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 font-medium">Vendedor</td>
                    <td className="border border-gray-200 px-4 py-3">Comercial</td>
                    <td className="border border-gray-200 px-4 py-3">Orcamentos e vendas</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Estoque</td>
                    <td className="border border-gray-200 px-4 py-3">Almoxarifado</td>
                    <td className="border border-gray-200 px-4 py-3">Inventario</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 font-medium">Producao</td>
                    <td className="border border-gray-200 px-4 py-3">Montagem</td>
                    <td className="border border-gray-200 px-4 py-3">Lotes e unidades</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 font-medium">Tecnico</td>
                    <td className="border border-gray-200 px-4 py-3">Servicos</td>
                    <td className="border border-gray-200 px-4 py-3">Ordens de servico</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-200 px-4 py-3 font-medium">Monitor</td>
                    <td className="border border-gray-200 px-4 py-3">Visualizacao</td>
                    <td className="border border-gray-200 px-4 py-3">Somente leitura</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Importante</p>
                <p className="text-sm text-amber-700">
                  Apenas usuarios com perfil Proprietario ou Diretor podem gerenciar permissoes de outros usuarios.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'configuracoes',
      title: 'Configuracoes',
      icon: <Settings className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Configuracoes do Sistema</h3>
            <p className="text-gray-600 mb-4">
              Personalize o sistema de acordo com as necessidades da sua empresa.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Configuracoes de Documentos</h4>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 mb-3">Personalize seus documentos (orcamentos, vendas, OS) com:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Logo da empresa</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Informacoes de contato no rodape</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Assinatura digital</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Cores personalizadas</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Outras Configuracoes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Categorias de Produtos</p>
                <p className="text-sm text-gray-600">
                  Organize seus produtos em categorias para facilitar a busca e relatorios.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Backup</p>
                <p className="text-sm text-gray-600">
                  Faca backup dos dados e restaure quando necessario.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Dica</p>
                <p className="text-sm text-blue-700">
                  Faca backup regularmente para garantir a seguranca dos seus dados.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dicas',
      title: 'Dicas e Boas Praticas',
      icon: <Lightbulb className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Dicas para Melhor Uso</h3>
            <p className="text-gray-600 mb-4">
              Siga estas boas praticas para aproveitar ao maximo o EJR Organizador.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="font-medium text-blue-900 mb-1">Mantenha cadastros atualizados</p>
              <p className="text-sm text-blue-800">
                Informacoes desatualizadas podem gerar erros em relatorios e processos.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <p className="font-medium text-green-900 mb-1">Configure alertas de estoque</p>
              <p className="text-sm text-green-800">
                Defina estoques minimos para evitar falta de produtos importantes.
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <p className="font-medium text-purple-900 mb-1">Use permissoes adequadas</p>
              <p className="text-sm text-purple-800">
                Cada funcionario deve ter acesso apenas ao necessario para sua funcao.
              </p>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
              <p className="font-medium text-orange-900 mb-1">Confira recebimentos</p>
              <p className="text-sm text-orange-800">
                Sempre verifique as quantidades antes de aprovar um recebimento.
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="font-medium text-red-900 mb-1">Faca backup regularmente</p>
              <p className="text-sm text-red-800">
                Proteja seus dados fazendo backup periodico das informacoes.
              </p>
            </div>

            <div className="p-4 bg-cyan-50 rounded-lg border-l-4 border-cyan-500">
              <p className="font-medium text-cyan-900 mb-1">Acompanhe o dashboard</p>
              <p className="text-sm text-cyan-800">
                Verifique diariamente as metricas para identificar problemas rapidamente.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'suporte',
      title: 'Suporte',
      icon: <Info className="w-5 h-5" />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Precisa de Ajuda?</h3>
            <p className="text-gray-600 mb-4">
              Em caso de duvidas ou problemas, temos diversas formas de suporte disponiveis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
              <Book className="w-8 h-8 text-blue-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Este Manual</h4>
              <p className="text-sm text-gray-600">
                Consulte este manual para encontrar respostas para as duvidas mais comuns.
              </p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
              <Users className="w-8 h-8 text-green-600 mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Administrador</h4>
              <p className="text-sm text-gray-600">
                Entre em contato com o administrador do sistema da sua empresa.
              </p>
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-3">EJR Robotica Educacional</h4>
            <p className="text-sm text-blue-800 mb-4">
              Para suporte tecnico especializado, entre em contato com a equipe da EJR.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-blue-700">
                <span className="font-medium">Desenvolvido por:</span>
                <span>EJR Robotica Educacional</span>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mt-8">
            <p>EJR Organizador - Sistema de Gestao Empresarial</p>
            <p>Versao 1.0 - {new Date().getFullYear()}</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <MainLayout title="Manual do Usuario">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">EJR</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Manual do Usuario</h1>
                  <p className="text-sm text-gray-500">EJR Organizador - Desenvolvido por EJR Robotica Educacional</p>
                </div>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-4 lg:gap-8">
            {/* Sidebar - Indice */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl shadow-lg p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-600" />
                  Indice
                </h2>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className={activeSection === section.id ? 'text-blue-600' : 'text-gray-400'}>
                        {section.icon}
                      </span>
                      <span className="text-sm">{section.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" ref={contentRef}>
              <div className="space-y-8">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={section.id}
                    className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 scroll-mt-24"
                  >
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                      <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                        {section.icon}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{section.title}</h2>
                    </div>
                    {section.content}
                  </section>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-12 text-center py-8 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">EJR</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">EJR Organizador</p>
                    <p className="text-sm text-gray-500">Sistema de Gestao Empresarial</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Desenvolvido por EJR Robotica Educacional
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  © {new Date().getFullYear()} - Todos os direitos reservados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
