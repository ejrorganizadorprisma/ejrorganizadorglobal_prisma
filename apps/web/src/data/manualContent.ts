/**
 * Manual content - bilingual (pt-BR + es)
 * Each leaf is a LocalizedText { pt, es }
 */

export type Lang = 'pt' | 'es';

export interface LocalizedText {
  pt: string;
  es: string;
}

export const t = (text: LocalizedText, lang: Lang): string => text[lang];

// ─────────────────────────────────────────────────────────────────────────────
// UI labels
// ─────────────────────────────────────────────────────────────────────────────
export const UI_LABELS = {
  manualTitle: { pt: 'Manual do Usuário', es: 'Manual del Usuario' },
  subtitle: {
    pt: 'EJR Organizador - Desenvolvido por EJR Robótica Educacional',
    es: 'EJR Organizador - Desarrollado por EJR Robótica Educacional',
  },
  systemTitle: {
    pt: 'Sistema de Gestão Empresarial',
    es: 'Sistema de Gestión Empresarial',
  },
  developedBy: {
    pt: 'Desenvolvido por EJR Robótica Educacional',
    es: 'Desarrollado por EJR Robótica Educacional',
  },
  index: { pt: 'Índice', es: 'Índice' },
  downloadPdf: { pt: 'Baixar PDF', es: 'Descargar PDF' },
  language: { pt: 'Idioma', es: 'Idioma' },
  ptLabel: { pt: 'Português', es: 'Portugués' },
  esLabel: { pt: 'Espanhol', es: 'Español' },
  version: { pt: 'Versão', es: 'Versión' },
  allRightsReserved: {
    pt: 'Todos os direitos reservados',
    es: 'Todos los derechos reservados',
  },
  importantLabel: { pt: 'Importante', es: 'Importante' },
  tipLabel: { pt: 'Dica', es: 'Consejo' },
  warningLabel: { pt: 'Atenção', es: 'Atención' },
  infoLabel: { pt: 'Informação', es: 'Información' },
  novelty: { pt: 'Novidade v1.3.1', es: 'Novedad v1.3.1' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section IDs (used as React keys and anchors)
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_IDS = [
  'introducao',
  'primeiros-passos',
  'dashboard',
  'produtos',
  'clientes',
  'orcamentos',
  'vendas',
  'cobrancas',
  'fornecedores',
  'compras',
  'producao',
  'estoque',
  'servicos',
  'vendedores',
  'mobile',
  'pdfs',
  'financeiro',
  'relatorios',
  'usuarios',
  'configuracoes',
  'dicas',
  'suporte',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Section titles
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_TITLES: Record<SectionId, LocalizedText> = {
  introducao: { pt: '1. Introdução', es: '1. Introducción' },
  'primeiros-passos': { pt: '2. Primeiros Passos', es: '2. Primeros Pasos' },
  dashboard: { pt: '3. Dashboard', es: '3. Panel Principal' },
  produtos: { pt: '4. Gestão de Produtos', es: '4. Gestión de Productos' },
  clientes: { pt: '5. Gestão de Clientes', es: '5. Gestión de Clientes' },
  orcamentos: { pt: '6. Orçamentos', es: '6. Presupuestos' },
  vendas: { pt: '7. Vendas', es: '7. Ventas' },
  cobrancas: { pt: '8. Cobranças', es: '8. Cobros' },
  fornecedores: { pt: '9. Gestão de Fornecedores', es: '9. Gestión de Proveedores' },
  compras: { pt: '10. Processo de Compras', es: '10. Proceso de Compras' },
  producao: { pt: '11. Controle de Produção', es: '11. Control de Producción' },
  estoque: { pt: '12. Gestão de Estoque', es: '12. Gestión de Inventario' },
  servicos: { pt: '13. Ordens de Serviço', es: '13. Órdenes de Servicio' },
  vendedores: { pt: '14. Vendedores e Comissões', es: '14. Vendedores y Comisiones' },
  mobile: { pt: '15. Aplicativo Mobile', es: '15. Aplicación Móvil' },
  pdfs: { pt: '16. Geração de PDFs', es: '16. Generación de PDFs' },
  financeiro: { pt: '17. Financeiro', es: '17. Financiero' },
  relatorios: { pt: '18. Relatórios', es: '18. Informes' },
  usuarios: { pt: '19. Usuários e Permissões', es: '19. Usuarios y Permisos' },
  configuracoes: { pt: '20. Configurações', es: '20. Configuración' },
  dicas: { pt: '21. Dicas e Boas Práticas', es: '21. Consejos y Buenas Prácticas' },
  suporte: { pt: '22. Suporte', es: '22. Soporte' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-section content
// ─────────────────────────────────────────────────────────────────────────────
export const SECTION_CONTENT = {
  introducao: {
    heading: {
      pt: 'Bem-vindo ao EJR Organizador',
      es: 'Bienvenido a EJR Organizador',
    },
    body: {
      pt: 'O EJR Organizador é o sistema de gestão empresarial completo desenvolvido pela EJR Robótica Educacional. Esta plataforma integra todos os processos críticos da sua empresa em um único ambiente: cadastros, comercial, compras, produção, estoque, financeiro, ordens de serviço e até um aplicativo móvel para sua equipe de vendas externa.',
      es: 'EJR Organizador es el sistema de gestión empresarial completo desarrollado por EJR Robótica Educacional. Esta plataforma integra todos los procesos críticos de su empresa en un único entorno: registros, comercial, compras, producción, inventario, financiero, órdenes de servicio e incluso una aplicación móvil para su equipo de ventas externo.',
    },
    capabilitiesTitle: {
      pt: 'O que você pode fazer com o EJR Organizador',
      es: 'Lo que puede hacer con EJR Organizador',
    },
    capabilities: [
      {
        pt: 'Gerenciar produtos, componentes e estoque com BOM',
        es: 'Gestionar productos, componentes e inventario con BOM',
      },
      {
        pt: 'Cadastrar clientes (PF/PJ) e fornecedores',
        es: 'Registrar clientes (físicos/jurídicos) y proveedores',
      },
      {
        pt: 'Criar orçamentos e converter em vendas',
        es: 'Crear presupuestos y convertirlos en ventas',
      },
      {
        pt: 'Controlar cobranças e pagamentos com GPS',
        es: 'Controlar cobros y pagos con GPS',
      },
      {
        pt: 'Gerar PDFs profissionais (elegante ou para impressão)',
        es: 'Generar PDFs profesionales (elegante o para impresión)',
      },
      {
        pt: 'Controlar produção em lotes com testes de qualidade',
        es: 'Controlar producción por lotes con pruebas de calidad',
      },
      {
        pt: 'Gerenciar ordens de serviço e técnicos',
        es: 'Gestionar órdenes de servicio y técnicos',
      },
      {
        pt: 'Acompanhar vendedores externos via app mobile',
        es: 'Acompañar vendedores externos vía app móvil',
      },
      {
        pt: 'Gerar relatórios detalhados em todas as áreas',
        es: 'Generar informes detallados en todas las áreas',
      },
      {
        pt: 'Administrar usuários, permissões e backup',
        es: 'Administrar usuarios, permisos y respaldo',
      },
    ],
    requirementsTitle: { pt: 'Requisitos', es: 'Requisitos' },
    requirements: [
      { pt: 'Navegador moderno', es: 'Navegador moderno' },
      { pt: 'Conexão com internet', es: 'Conexión a internet' },
      { pt: 'Usuário cadastrado', es: 'Usuario registrado' },
    ],
    browsersTitle: { pt: 'Navegadores Suportados', es: 'Navegadores Soportados' },
    browsers: [
      { pt: 'Google Chrome', es: 'Google Chrome' },
      { pt: 'Mozilla Firefox', es: 'Mozilla Firefox' },
      { pt: 'Microsoft Edge', es: 'Microsoft Edge' },
      { pt: 'Safari', es: 'Safari' },
    ],
    accessTitle: { pt: 'Acesso', es: 'Acceso' },
    access: [
      { pt: 'Use seu e-mail', es: 'Use su correo electrónico' },
      { pt: 'Senha pessoal', es: 'Contraseña personal' },
      { pt: 'Acesso seguro com JWT', es: 'Acceso seguro con JWT' },
    ],
  },

  primeirosPassos: {
    headingAccess: { pt: 'Acessando o Sistema', es: 'Accediendo al Sistema' },
    step1Title: {
      pt: 'Acesse o endereço do sistema',
      es: 'Acceda a la dirección del sistema',
    },
    step1Desc: {
      pt: 'Abra seu navegador e digite o endereço fornecido pelo administrador',
      es: 'Abra su navegador y escriba la dirección proporcionada por el administrador',
    },
    step2Title: { pt: 'Faça login', es: 'Inicie sesión' },
    step2Desc: {
      pt: 'Insira seu e-mail e senha na tela de login',
      es: 'Ingrese su correo y contraseña en la pantalla de inicio de sesión',
    },
    step3Title: {
      pt: 'Navegue pelo sistema',
      es: 'Navegue por el sistema',
    },
    step3Desc: {
      pt: 'Use o menu lateral para acessar todas as funcionalidades',
      es: 'Use el menú lateral para acceder a todas las funcionalidades',
    },
    menuTitle: { pt: 'Estrutura do Menu', es: 'Estructura del Menú' },
    menuIntro: {
      pt: 'O menu lateral está organizado por áreas funcionais:',
      es: 'El menú lateral está organizado por áreas funcionales:',
    },
    menuItems: [
      {
        title: { pt: 'Dashboard', es: 'Panel Principal' },
        desc: { pt: 'Visão geral e métricas', es: 'Visión general y métricas' },
      },
      {
        title: { pt: 'Cadastros', es: 'Registros' },
        desc: {
          pt: 'Produtos, clientes, fornecedores',
          es: 'Productos, clientes, proveedores',
        },
      },
      {
        title: { pt: 'Comercial', es: 'Comercial' },
        desc: {
          pt: 'Orçamentos, vendas, cobranças, serviços',
          es: 'Presupuestos, ventas, cobros, servicios',
        },
      },
      {
        title: { pt: 'Compras', es: 'Compras' },
        desc: {
          pt: 'Requisições, pedidos, recebimentos',
          es: 'Requisiciones, pedidos, recepciones',
        },
      },
      {
        title: { pt: 'Produção', es: 'Producción' },
        desc: {
          pt: 'Ordens, lotes, montagem, testes',
          es: 'Órdenes, lotes, montaje, pruebas',
        },
      },
      {
        title: { pt: 'Estoque', es: 'Inventario' },
        desc: {
          pt: 'Ajustes, reservas, localizações',
          es: 'Ajustes, reservas, ubicaciones',
        },
      },
      {
        title: { pt: 'Financeiro', es: 'Financiero' },
        desc: {
          pt: 'Contas a receber e a pagar',
          es: 'Cuentas por cobrar y por pagar',
        },
      },
      {
        title: { pt: 'Relatórios', es: 'Informes' },
        desc: { pt: 'Análises e exportações', es: 'Análisis y exportaciones' },
      },
      {
        title: { pt: 'App Mobile', es: 'App Móvil' },
        desc: {
          pt: 'Configuração de vendedores',
          es: 'Configuración de vendedores',
        },
      },
      {
        title: { pt: 'Configurações', es: 'Configuración' },
        desc: { pt: 'Usuários, sistema, backup', es: 'Usuarios, sistema, respaldo' },
      },
    ],
  },

  dashboard: {
    heading: { pt: 'Visão Geral em Tempo Real', es: 'Visión General en Tiempo Real' },
    body: {
      pt: 'O Dashboard é a primeira tela após o login e exibe métricas críticas do seu negócio em tempo real, permitindo identificar rapidamente oportunidades e problemas.',
      es: 'El Panel Principal es la primera pantalla después del inicio de sesión y muestra métricas críticas de su negocio en tiempo real, permitiendo identificar rápidamente oportunidades y problemas.',
    },
    metricsTitle: { pt: 'Métricas Principais', es: 'Métricas Principales' },
    metrics: [
      {
        title: { pt: 'Vendas do Mês', es: 'Ventas del Mes' },
        desc: {
          pt: 'Total faturado e quantidade de vendas no período',
          es: 'Total facturado y cantidad de ventas en el período',
        },
      },
      {
        title: { pt: 'Estoque Baixo', es: 'Inventario Bajo' },
        desc: {
          pt: 'Produtos abaixo do mínimo definido',
          es: 'Productos por debajo del mínimo definido',
        },
      },
      {
        title: { pt: 'Orçamentos Pendentes', es: 'Presupuestos Pendientes' },
        desc: {
          pt: 'Orçamentos enviados aguardando resposta',
          es: 'Presupuestos enviados esperando respuesta',
        },
      },
      {
        title: { pt: 'Produção em Andamento', es: 'Producción en Curso' },
        desc: { pt: 'Lotes ativos no momento', es: 'Lotes activos en el momento' },
      },
      {
        title: { pt: 'Contas a Receber', es: 'Cuentas por Cobrar' },
        desc: {
          pt: 'Total pendente e inadimplência',
          es: 'Total pendiente y morosidad',
        },
      },
      {
        title: { pt: 'OS Abertas', es: 'OS Abiertas' },
        desc: {
          pt: 'Ordens de serviço aguardando atendimento',
          es: 'Órdenes de servicio esperando atención',
        },
      },
    ],
  },

  produtos: {
    heading: { pt: 'Cadastro de Produtos', es: 'Registro de Productos' },
    body: {
      pt: 'O módulo de produtos permite cadastrar e gerenciar todos os itens da sua empresa, incluindo produtos para venda, componentes e peças para montagem. Cada produto tem código único, código de fábrica opcional, categoria, preços de custo e venda, controle de estoque mínimo e atual.',
      es: 'El módulo de productos permite registrar y gestionar todos los artículos de su empresa, incluyendo productos para venta, componentes y piezas para montaje. Cada producto tiene código único, código de fábrica opcional, categoría, precios de costo y venta, control de stock mínimo y actual.',
    },
    importantText: {
      pt: 'O código do produto deve ser único e não pode ser alterado após o cadastro. Use uma estrutura clara desde o início (ex: PRD-001, CMP-001 para componentes).',
      es: 'El código del producto debe ser único y no puede modificarse después del registro. Use una estructura clara desde el inicio (ej: PRD-001, CMP-001 para componentes).',
    },
    typesTitle: { pt: 'Tipos de Produtos', es: 'Tipos de Productos' },
    types: [
      {
        type: { pt: 'Produto Simples', es: 'Producto Simple' },
        desc: { pt: 'Item vendido diretamente', es: 'Artículo vendido directamente' },
        usage: { pt: 'Vendas e estoque', es: 'Ventas e inventario' },
      },
      {
        type: { pt: 'Produto Montado', es: 'Producto Ensamblado' },
        desc: { pt: 'Composto por peças (BOM)', es: 'Compuesto por piezas (BOM)' },
        usage: { pt: 'Produção e vendas', es: 'Producción y ventas' },
      },
      {
        type: { pt: 'Peça/Componente', es: 'Pieza/Componente' },
        desc: { pt: 'Item para montagem', es: 'Artículo para montaje' },
        usage: { pt: 'Composição de produtos', es: 'Composición de productos' },
      },
    ],
    bomTitle: { pt: 'Lista de Materiais (BOM)', es: 'Lista de Materiales (BOM)' },
    bomBody: {
      pt: 'Para produtos montados, configure a lista de componentes necessários:',
      es: 'Para productos ensamblados, configure la lista de componentes necesarios:',
    },
    bomSteps: [
      {
        pt: 'Edite o produto e acesse a aba "Composição"',
        es: 'Edite el producto y acceda a la pestaña "Composición"',
      },
      { pt: 'Clique em "Adicionar Peça"', es: 'Haga clic en "Añadir Pieza"' },
      {
        pt: 'Selecione o componente e informe a quantidade',
        es: 'Seleccione el componente e ingrese la cantidad',
      },
      {
        pt: 'Repita para todas as peças necessárias',
        es: 'Repita para todas las piezas necesarias',
      },
      {
        pt: 'O sistema calcula o custo total da montagem automaticamente',
        es: 'El sistema calcula el costo total del ensamble automáticamente',
      },
    ],
    fieldsTitle: { pt: 'Campos Importantes', es: 'Campos Importantes' },
    fields: [
      {
        title: { pt: 'Preço de Custo', es: 'Precio de Costo' },
        desc: {
          pt: 'Valor pago na aquisição do produto',
          es: 'Valor pagado en la adquisición del producto',
        },
      },
      {
        title: { pt: 'Preço de Venda', es: 'Precio de Venta' },
        desc: { pt: 'Valor cobrado do cliente', es: 'Valor cobrado al cliente' },
      },
      {
        title: { pt: 'Estoque Mínimo', es: 'Stock Mínimo' },
        desc: {
          pt: 'Quantidade para alerta de reposição',
          es: 'Cantidad para alerta de reposición',
        },
      },
      {
        title: { pt: 'Localização', es: 'Ubicación' },
        desc: { pt: 'Onde o produto está armazenado', es: 'Dónde está almacenado el producto' },
      },
      {
        title: { pt: 'Imagens', es: 'Imágenes' },
        desc: {
          pt: 'Múltiplas fotos do produto (visíveis também no app mobile)',
          es: 'Múltiples fotos del producto (visibles también en la app móvil)',
        },
      },
      {
        title: { pt: 'Categoria', es: 'Categoría' },
        desc: {
          pt: 'Agrupamento para relatórios e busca',
          es: 'Agrupamiento para informes y búsqueda',
        },
      },
    ],
  },

  clientes: {
    heading: { pt: 'Cadastro de Clientes', es: 'Registro de Clientes' },
    body: {
      pt: 'Mantenha o cadastro completo dos seus clientes para agilizar orçamentos, vendas e suporte. O sistema também controla limite de crédito e formas de pagamento permitidas por cliente.',
      es: 'Mantenga el registro completo de sus clientes para agilizar presupuestos, ventas y soporte. El sistema también controla límite de crédito y formas de pago permitidas por cliente.',
    },
    typesTitle: { pt: 'Tipos de Clientes', es: 'Tipos de Clientes' },
    physical: {
      title: { pt: 'Pessoa Física', es: 'Persona Física' },
      items: [
        { pt: 'CPF obrigatório', es: 'Documento personal obligatorio' },
        { pt: 'Nome completo', es: 'Nombre completo' },
        { pt: 'Dados de contato', es: 'Datos de contacto' },
        { pt: 'Endereço residencial', es: 'Dirección residencial' },
      ],
    },
    legal: {
      title: { pt: 'Pessoa Jurídica', es: 'Persona Jurídica' },
      items: [
        { pt: 'CNPJ obrigatório', es: 'CUIT/RUC obligatorio' },
        { pt: 'Razão social', es: 'Razón social' },
        { pt: 'Dados de contato', es: 'Datos de contacto' },
        { pt: 'Endereço comercial', es: 'Dirección comercial' },
      ],
    },
    creditTitle: { pt: 'Crédito do Cliente', es: 'Crédito del Cliente' },
    creditBody: {
      pt: 'Para cada cliente você pode definir:',
      es: 'Para cada cliente puede definir:',
    },
    creditItems: [
      {
        pt: 'Formas de pagamento permitidas (à vista, a prazo, cheque, etc.)',
        es: 'Formas de pago permitidas (al contado, a plazo, cheque, etc.)',
      },
      {
        pt: 'Prazo máximo de crédito em dias',
        es: 'Plazo máximo de crédito en días',
      },
      {
        pt: 'Histórico completo de orçamentos, vendas e pagamentos',
        es: 'Historial completo de presupuestos, ventas y pagos',
      },
      {
        pt: 'Bloqueio automático em caso de inadimplência',
        es: 'Bloqueo automático en caso de mora',
      },
    ],
    tipText: {
      pt: 'Mantenha os dados de contato sempre atualizados para facilitar a comunicação e gerar PDFs corretos.',
      es: 'Mantenga los datos de contacto siempre actualizados para facilitar la comunicación y generar PDFs correctos.',
    },
  },

  orcamentos: {
    heading: { pt: 'Criando Orçamentos', es: 'Creando Presupuestos' },
    body: {
      pt: 'O processo comercial começa com um orçamento. Você pode criar orçamentos com produtos e/ou serviços avulsos, aplicar descontos, definir validade e gerar PDFs profissionais para enviar ao cliente.',
      es: 'El proceso comercial comienza con un presupuesto. Puede crear presupuestos con productos y/o servicios sueltos, aplicar descuentos, definir validez y generar PDFs profesionales para enviar al cliente.',
    },
    stepsTitle: { pt: 'Passo a Passo', es: 'Paso a Paso' },
    steps: [
      {
        pt: 'Acesse Comercial > Orçamentos > Novo Orçamento',
        es: 'Acceda a Comercial > Presupuestos > Nuevo Presupuesto',
      },
      {
        pt: 'Selecione o cliente (ou cadastre um novo)',
        es: 'Seleccione el cliente (o registre uno nuevo)',
      },
      {
        pt: 'Adicione produtos e/ou serviços com quantidades',
        es: 'Añada productos y/o servicios con cantidades',
      },
      {
        pt: 'Aplique desconto se necessário (valor ou %)',
        es: 'Aplique descuento si es necesario (valor o %)',
      },
      {
        pt: 'Defina a data de validade do orçamento',
        es: 'Defina la fecha de validez del presupuesto',
      },
      {
        pt: 'Adicione observações ou condições especiais',
        es: 'Añada observaciones o condiciones especiales',
      },
      {
        pt: 'Salve e gere o PDF para enviar ao cliente',
        es: 'Guarde y genere el PDF para enviar al cliente',
      },
    ],
    statusTitle: { pt: 'Status do Orçamento', es: 'Estado del Presupuesto' },
    statuses: [
      {
        status: { pt: 'Rascunho', es: 'Borrador' },
        desc: { pt: 'Em elaboração', es: 'En elaboración' },
      },
      {
        status: { pt: 'Enviado', es: 'Enviado' },
        desc: { pt: 'Aguardando cliente', es: 'Esperando cliente' },
      },
      {
        status: { pt: 'Aprovado', es: 'Aprobado' },
        desc: { pt: 'Cliente aceitou', es: 'Cliente aceptó' },
      },
      {
        status: { pt: 'Rejeitado', es: 'Rechazado' },
        desc: { pt: 'Cliente recusou', es: 'Cliente rechazó' },
      },
      {
        status: { pt: 'Expirado', es: 'Expirado' },
        desc: { pt: 'Validade venceu', es: 'Validez venció' },
      },
      {
        status: { pt: 'Convertido', es: 'Convertido' },
        desc: { pt: 'Virou venda', es: 'Se convirtió en venta' },
      },
    ],
    pdfNoveltyTitle: {
      pt: 'PDF de Orçamento (Novidade v1.3.1)',
      es: 'PDF de Presupuesto (Novedad v1.3.1)',
    },
    pdfNoveltyBody: {
      pt: 'Cada orçamento agora pode ser exportado em dois formatos de PDF: Elegante (com cores e visual moderno para enviar por e-mail) e Impressão (escala de cinza, ideal para economizar tinta).',
      es: 'Cada presupuesto ahora puede exportarse en dos formatos de PDF: Elegante (con colores y visual moderno para enviar por correo) e Impresión (escala de grises, ideal para ahorrar tinta).',
    },
    convertTitle: { pt: 'Convertendo em Venda', es: 'Convirtiendo en Venta' },
    convertBody: {
      pt: 'Após aprovação do cliente, abra o orçamento e clique em "Converter em Venda". Configure as condições de pagamento, parcelas e confirme. O orçamento ficará marcado como "Convertido" e a venda será criada automaticamente.',
      es: 'Después de la aprobación del cliente, abra el presupuesto y haga clic en "Convertir en Venta". Configure las condiciones de pago, cuotas y confirme. El presupuesto quedará marcado como "Convertido" y la venta se creará automáticamente.',
    },
  },

  vendas: {
    heading: { pt: 'Registrando Vendas', es: 'Registrando Ventas' },
    body: {
      pt: 'As vendas podem ser criadas diretamente ou a partir de um orçamento aprovado. Cada venda baixa o estoque automaticamente, gera contas a receber e pode ser exportada em PDF.',
      es: 'Las ventas pueden crearse directamente o a partir de un presupuesto aprobado. Cada venta descuenta el inventario automáticamente, genera cuentas por cobrar y puede exportarse en PDF.',
    },
    paymentMethodsTitle: { pt: 'Formas de Pagamento', es: 'Formas de Pago' },
    paymentMethods: [
      { pt: 'Dinheiro', es: 'Efectivo' },
      { pt: 'Cartão de Crédito', es: 'Tarjeta de Crédito' },
      { pt: 'Cartão de Débito', es: 'Tarjeta de Débito' },
      { pt: 'PIX', es: 'PIX' },
      { pt: 'Transferência', es: 'Transferencia' },
      { pt: 'Boleto', es: 'Boleto' },
      { pt: 'Cheque', es: 'Cheque' },
    ],
    installmentsTitle: { pt: 'Parcelamento', es: 'Cuotas' },
    installmentsBody: {
      pt: 'O sistema permite parcelar a venda em múltiplas parcelas com vencimentos diferentes. Cada parcela vira uma conta a receber rastreada individualmente.',
      es: 'El sistema permite dividir la venta en múltiples cuotas con vencimientos diferentes. Cada cuota se convierte en una cuenta por cobrar rastreada individualmente.',
    },
    pdfNoveltyTitle: {
      pt: 'PDF de Venda (Novidade v1.3.1)',
      es: 'PDF de Venta (Novedad v1.3.1)',
    },
    pdfNoveltyBody: {
      pt: 'Cada venda gera um comprovante em PDF com dois modos: Elegante (visual completo) e Impressão (econômico). Inclui dados do cliente, itens, totais, parcelas e área de assinatura.',
      es: 'Cada venta genera un comprobante en PDF con dos modos: Elegante (visual completo) e Impresión (económico). Incluye datos del cliente, ítems, totales, cuotas y área de firma.',
    },
    stockTitle: { pt: 'Baixa Automática de Estoque', es: 'Descuento Automático de Inventario' },
    stockBody: {
      pt: 'Ao confirmar uma venda, o sistema verifica disponibilidade e baixa o estoque automaticamente. Se algum produto não tem estoque suficiente, a venda é bloqueada.',
      es: 'Al confirmar una venta, el sistema verifica disponibilidad y descuenta el inventario automáticamente. Si algún producto no tiene stock suficiente, la venta se bloquea.',
    },
  },

  cobrancas: {
    heading: { pt: 'Módulo de Cobranças', es: 'Módulo de Cobros' },
    body: {
      pt: 'O módulo de Cobranças permite que vendedores externos registrem recebimentos no campo (via app mobile) com captura de GPS. As cobranças passam por aprovação e depósito antes de baixar a parcela.',
      es: 'El módulo de Cobros permite que vendedores externos registren cobros en el campo (vía app móvil) con captura de GPS. Los cobros pasan por aprobación y depósito antes de descontar la cuota.',
    },
    flowTitle: { pt: 'Fluxo da Cobrança', es: 'Flujo del Cobro' },
    statuses: [
      {
        status: { pt: 'Aguardando Aprovação', es: 'Esperando Aprobación' },
        desc: {
          pt: 'Cobrança registrada, aguardando análise',
          es: 'Cobro registrado, esperando análisis',
        },
      },
      {
        status: { pt: 'Aprovado', es: 'Aprobado' },
        desc: {
          pt: 'Aprovado, aguardando depósito bancário',
          es: 'Aprobado, esperando depósito bancario',
        },
      },
      {
        status: { pt: 'Depositado', es: 'Depositado' },
        desc: {
          pt: 'Depósito confirmado, parcela baixada',
          es: 'Depósito confirmado, cuota descontada',
        },
      },
      {
        status: { pt: 'Rejeitado', es: 'Rechazado' },
        desc: {
          pt: 'Rejeitado pelo administrador',
          es: 'Rechazado por el administrador',
        },
      },
    ],
    gpsTitle: { pt: 'Captura GPS', es: 'Captura GPS' },
    gpsBody: {
      pt: 'Quando o vendedor registra uma cobrança pelo aplicativo móvel, a localização GPS é capturada automaticamente, garantindo rastreabilidade e segurança das visitas em campo.',
      es: 'Cuando el vendedor registra un cobro por la aplicación móvil, la ubicación GPS se captura automáticamente, garantizando trazabilidad y seguridad de las visitas en campo.',
    },
    pdfNoveltyTitle: {
      pt: 'Comprovante de Cobrança em PDF (Novidade v1.3.1)',
      es: 'Comprobante de Cobro en PDF (Novedad v1.3.1)',
    },
    pdfNoveltyBody: {
      pt: 'Cada cobrança pode gerar um comprovante PDF completo com dados do cliente, vendedor, valor, forma de pagamento, GPS, timeline e assinaturas. Modos elegante e impressão disponíveis.',
      es: 'Cada cobro puede generar un comprobante PDF completo con datos del cliente, vendedor, valor, forma de pago, GPS, línea de tiempo y firmas. Modos elegante e impresión disponibles.',
    },
    commissionTitle: { pt: 'Comissões', es: 'Comisiones' },
    commissionBody: {
      pt: 'Vendedores podem ter comissões configuradas que são calculadas automaticamente sobre cobranças aprovadas e depositadas.',
      es: 'Los vendedores pueden tener comisiones configuradas que se calculan automáticamente sobre cobros aprobados y depositados.',
    },
  },

  fornecedores: {
    heading: { pt: 'Cadastro de Fornecedores', es: 'Registro de Proveedores' },
    body: {
      pt: 'Mantenha seus fornecedores organizados com informações completas de contato, produtos fornecidos, preços e prazos de entrega.',
      es: 'Mantenga sus proveedores organizados con información completa de contacto, productos suministrados, precios y plazos de entrega.',
    },
    infoTitle: { pt: 'Informações do Fornecedor', es: 'Información del Proveedor' },
    registrationTitle: { pt: 'Dados Cadastrais', es: 'Datos de Registro' },
    registration: [
      { pt: 'Razão social e CNPJ', es: 'Razón social y CUIT/RUC' },
      { pt: 'E-mail e telefone', es: 'Correo y teléfono' },
      { pt: 'Endereço completo', es: 'Dirección completa' },
      {
        pt: 'Contato comercial responsável',
        es: 'Contacto comercial responsable',
      },
    ],
    commercialTitle: { pt: 'Condições Comerciais', es: 'Condiciones Comerciales' },
    commercial: [
      { pt: 'Prazo de entrega padrão', es: 'Plazo de entrega estándar' },
      { pt: 'Pedido mínimo', es: 'Pedido mínimo' },
      { pt: 'Condições de pagamento', es: 'Condiciones de pago' },
      { pt: 'Observações especiais', es: 'Observaciones especiales' },
    ],
    relationTitle: {
      pt: 'Relacionamento Produto-Fornecedor',
      es: 'Relación Producto-Proveedor',
    },
    relationBody: {
      pt: 'Para cada produto, você pode vincular múltiplos fornecedores e marcar o preferencial:',
      es: 'Para cada producto, puede vincular múltiples proveedores y marcar el preferido:',
    },
    relation: [
      {
        pt: 'Código do produto no fornecedor (SKU)',
        es: 'Código del producto en el proveedor (SKU)',
      },
      { pt: 'Preço unitário de compra', es: 'Precio unitario de compra' },
      {
        pt: 'Prazo de entrega específico',
        es: 'Plazo de entrega específico',
      },
      {
        pt: 'Marcação de fornecedor preferencial',
        es: 'Marcación de proveedor preferido',
      },
      {
        pt: 'Histórico de compras passadas',
        es: 'Historial de compras pasadas',
      },
    ],
  },

  compras: {
    heading: { pt: 'Fluxo de Compras', es: 'Flujo de Compras' },
    body: {
      pt: 'O processo de compras segue um fluxo controlado para garantir aprovações e rastreabilidade: Requisição → Aprovação → Pedido → Envio → Recebimento.',
      es: 'El proceso de compras sigue un flujo controlado para garantizar aprobaciones y trazabilidad: Requisición → Aprobación → Pedido → Envío → Recepción.',
    },
    stepsTitle: { pt: 'Etapas Detalhadas', es: 'Etapas Detalladas' },
    steps: [
      {
        title: { pt: '1. Requisição de Compra', es: '1. Requisición de Compra' },
        desc: {
          pt: 'Qualquer funcionário pode solicitar materiais. A requisição aguarda aprovação de um gestor com permissão.',
          es: 'Cualquier empleado puede solicitar materiales. La requisición espera aprobación de un gestor con permiso.',
        },
      },
      {
        title: { pt: '2. Aprovação', es: '2. Aprobación' },
        desc: {
          pt: 'Gerentes ou diretores analisam e aprovam ou rejeitam a requisição.',
          es: 'Gerentes o directores analizan y aprueban o rechazan la requisición.',
        },
      },
      {
        title: { pt: '3. Pedido ao Fornecedor', es: '3. Pedido al Proveedor' },
        desc: {
          pt: 'Após aprovação, a requisição é convertida em pedido com seleção do fornecedor preferencial.',
          es: 'Después de la aprobación, la requisición se convierte en pedido con selección del proveedor preferido.',
        },
      },
      {
        title: { pt: '4. Envio do Pedido', es: '4. Envío del Pedido' },
        desc: {
          pt: 'O pedido é formalizado e enviado ao fornecedor, marcando o início do prazo de entrega.',
          es: 'El pedido se formaliza y se envía al proveedor, marcando el inicio del plazo de entrega.',
        },
      },
      {
        title: { pt: '5. Recebimento', es: '5. Recepción' },
        desc: {
          pt: 'Quando os produtos chegam, o recebimento é registrado, o estoque atualizado e a nota fiscal anexada.',
          es: 'Cuando los productos llegan, la recepción se registra, el inventario se actualiza y la factura se adjunta.',
        },
      },
    ],
    payablesTitle: { pt: 'Contas a Pagar', es: 'Cuentas por Pagar' },
    payablesBody: {
      pt: 'Cada pedido de compra gera contas a pagar com parcelas. O módulo financeiro consolida todos os vencimentos para você não perder prazos.',
      es: 'Cada pedido de compra genera cuentas por pagar con cuotas. El módulo financiero consolida todos los vencimientos para que no pierda plazos.',
    },
  },

  producao: {
    heading: { pt: 'Lotes de Produção', es: 'Lotes de Producción' },
    body: {
      pt: 'Para produtos montados, o sistema permite controlar a produção em lotes com rastreamento individual de cada unidade, número de série, testes em dois níveis e atribuição a funcionários.',
      es: 'Para productos ensamblados, el sistema permite controlar la producción en lotes con seguimiento individual de cada unidad, número de serie, pruebas en dos niveles y asignación a empleados.',
    },
    statusTitle: { pt: 'Status do Lote', es: 'Estado del Lote' },
    statuses: [
      { pt: 'Rascunho', es: 'Borrador' },
      { pt: 'Planejado', es: 'Planificado' },
      { pt: 'Liberado', es: 'Liberado' },
      { pt: 'Em Produção', es: 'En Producción' },
      { pt: 'Pausado', es: 'Pausado' },
      { pt: 'Em Teste', es: 'En Prueba' },
      { pt: 'Concluído', es: 'Concluido' },
      { pt: 'Cancelado', es: 'Cancelado' },
    ],
    flowTitle: { pt: 'Fluxo de Produção', es: 'Flujo de Producción' },
    flow: [
      {
        title: { pt: 'Criação do Lote', es: 'Creación del Lote' },
        desc: {
          pt: 'Defina o produto e a quantidade a ser produzida',
          es: 'Defina el producto y la cantidad a producir',
        },
      },
      {
        title: { pt: 'Liberação de Componentes', es: 'Liberación de Componentes' },
        desc: {
          pt: 'O estoque libera os materiais necessários, baixando-os do inventário',
          es: 'El inventario libera los materiales necesarios, descontándolos del inventario',
        },
      },
      {
        title: { pt: 'Atribuição', es: 'Asignación' },
        desc: {
          pt: 'Funcionários da produção recebem unidades para montar individualmente',
          es: 'Empleados de producción reciben unidades para ensamblar individualmente',
        },
      },
      {
        title: { pt: 'Montagem', es: 'Montaje' },
        desc: {
          pt: 'Cada unidade é montada e marcada como pronta para teste',
          es: 'Cada unidad se ensambla y se marca como lista para prueba',
        },
      },
      {
        title: { pt: 'Teste de Montagem', es: 'Prueba de Montaje' },
        desc: {
          pt: 'Verificação pós-montagem por um responsável',
          es: 'Verificación posterior al montaje por un responsable',
        },
      },
      {
        title: { pt: 'Teste Final', es: 'Prueba Final' },
        desc: {
          pt: 'Verificação final antes da entrega ao estoque ou cliente',
          es: 'Verificación final antes de la entrega al inventario o cliente',
        },
      },
    ],
    traceabilityText: {
      pt: 'Cada unidade produzida recebe um número de série único para rastreamento completo, da origem ao destino final.',
      es: 'Cada unidad producida recibe un número de serie único para seguimiento completo, desde el origen hasta el destino final.',
    },
  },

  estoque: {
    heading: { pt: 'Organização do Estoque', es: 'Organización del Inventario' },
    body: {
      pt: 'O sistema permite organizar o estoque em uma hierarquia de três níveis para facilitar a localização dos produtos.',
      es: 'El sistema permite organizar el inventario en una jerarquía de tres niveles para facilitar la ubicación de los productos.',
    },
    locationTitle: {
      pt: 'Hierarquia de Localização',
      es: 'Jerarquía de Ubicación',
    },
    space: { pt: 'Espaço', es: 'Espacio' },
    spaceExample: { pt: 'Ex: Almoxarifado A', es: 'Ej: Almacén A' },
    shelf: { pt: 'Prateleira', es: 'Estantería' },
    shelfExample: { pt: 'Ex: Prateleira 01', es: 'Ej: Estantería 01' },
    section: { pt: 'Seção', es: 'Sección' },
    sectionExample: { pt: 'Ex: A1, A2, B1', es: 'Ej: A1, A2, B1' },
    featuresTitle: { pt: 'Funcionalidades', es: 'Funcionalidades' },
    features: [
      {
        title: { pt: 'Ajuste de Estoque', es: 'Ajuste de Inventario' },
        desc: {
          pt: 'Corrija quantidades com registro do motivo e responsável',
          es: 'Corrija cantidades con registro del motivo y responsable',
        },
      },
      {
        title: { pt: 'Reservas Automáticas', es: 'Reservas Automáticas' },
        desc: {
          pt: 'O sistema reserva automaticamente produtos para vendas e produção',
          es: 'El sistema reserva automáticamente productos para ventas y producción',
        },
      },
      {
        title: { pt: 'Alertas de Mínimo', es: 'Alertas de Mínimo' },
        desc: {
          pt: 'Receba avisos quando produtos atingirem o estoque mínimo',
          es: 'Reciba avisos cuando productos alcancen el stock mínimo',
        },
      },
      {
        title: { pt: 'Histórico Completo', es: 'Historial Completo' },
        desc: {
          pt: 'Consulte todas as movimentações de cada produto',
          es: 'Consulte todos los movimientos de cada producto',
        },
      },
      {
        title: { pt: 'Múltiplas Unidades', es: 'Múltiples Unidades' },
        desc: {
          pt: 'Controle por unidade, caixa, kg ou metro',
          es: 'Control por unidad, caja, kg o metro',
        },
      },
      {
        title: { pt: 'Inventário Físico', es: 'Inventario Físico' },
        desc: {
          pt: 'Realize contagens periódicas e ajuste discrepâncias',
          es: 'Realice conteos periódicos y ajuste discrepancias',
        },
      },
    ],
  },

  servicos: {
    heading: { pt: 'Gestão de Serviços', es: 'Gestión de Servicios' },
    body: {
      pt: 'Controle completo de ordens de serviço, desde a abertura até a conclusão, incluindo peças utilizadas, mão de obra, custos, fotos e diagnóstico técnico.',
      es: 'Control completo de órdenes de servicio, desde la apertura hasta la conclusión, incluyendo piezas utilizadas, mano de obra, costos, fotos y diagnóstico técnico.',
    },
    flowTitle: { pt: 'Fluxo da OS', es: 'Flujo de OS' },
    statuses: [
      {
        status: { pt: 'Aberta', es: 'Abierta' },
        desc: { pt: 'Aguardando atendimento', es: 'Esperando atención' },
        action: { pt: 'Atribuir técnico', es: 'Asignar técnico' },
      },
      {
        status: { pt: 'Aguardando Peças', es: 'Esperando Piezas' },
        desc: { pt: 'Faltam componentes', es: 'Faltan componentes' },
        action: { pt: 'Solicitar peças', es: 'Solicitar piezas' },
      },
      {
        status: { pt: 'Em Atendimento', es: 'En Atención' },
        desc: { pt: 'Técnico trabalhando', es: 'Técnico trabajando' },
        action: { pt: 'Registrar serviço', es: 'Registrar servicio' },
      },
      {
        status: { pt: 'Aguardando Aprovação', es: 'Esperando Aprobación' },
        desc: { pt: 'Orçamento pendente', es: 'Presupuesto pendiente' },
        action: { pt: 'Aprovar valor', es: 'Aprobar valor' },
      },
      {
        status: { pt: 'Concluída', es: 'Concluida' },
        desc: { pt: 'Serviço finalizado', es: 'Servicio finalizado' },
        action: { pt: 'Entregar ao cliente', es: 'Entregar al cliente' },
      },
    ],
    infoTitle: { pt: 'Informações Registradas', es: 'Información Registrada' },
    info: [
      {
        pt: 'Descrição do problema relatado pelo cliente',
        es: 'Descripción del problema reportado por el cliente',
      },
      { pt: 'Diagnóstico técnico', es: 'Diagnóstico técnico' },
      { pt: 'Peças utilizadas com custos', es: 'Piezas utilizadas con costos' },
      { pt: 'Mão de obra e tempo gasto', es: 'Mano de obra y tiempo gastado' },
      { pt: 'Fotos e documentos anexos', es: 'Fotos y documentos adjuntos' },
      { pt: 'Garantia oferecida', es: 'Garantía ofrecida' },
    ],
  },

  vendedores: {
    heading: { pt: 'Vendedores Externos', es: 'Vendedores Externos' },
    body: {
      pt: 'O sistema possui um módulo dedicado para gestão de vendedores externos (SALESPERSON), incluindo autorização para o app mobile, controle de comissões e acompanhamento de cobranças com GPS.',
      es: 'El sistema tiene un módulo dedicado para gestión de vendedores externos (SALESPERSON), incluyendo autorización para la app móvil, control de comisiones y seguimiento de cobros con GPS.',
    },
    permissionsTitle: {
      pt: 'Permissões do Vendedor',
      es: 'Permisos del Vendedor',
    },
    permissions: [
      {
        title: { pt: 'Clientes', es: 'Clientes' },
        desc: { pt: 'Cadastrar e editar clientes', es: 'Registrar y editar clientes' },
      },
      {
        title: { pt: 'Orçamentos', es: 'Presupuestos' },
        desc: {
          pt: 'Criar e gerenciar orçamentos',
          es: 'Crear y gestionar presupuestos',
        },
      },
      {
        title: { pt: 'Vendas', es: 'Ventas' },
        desc: {
          pt: 'Registrar vendas no campo',
          es: 'Registrar ventas en el campo',
        },
      },
      {
        title: { pt: 'Produtos', es: 'Productos' },
        desc: {
          pt: 'Visualizar catálogo com imagens',
          es: 'Visualizar catálogo con imágenes',
        },
      },
      {
        title: { pt: 'Cobranças', es: 'Cobros' },
        desc: {
          pt: 'Registrar recebimentos com GPS',
          es: 'Registrar cobros con GPS',
        },
      },
    ],
    commissionTitle: { pt: 'Comissões', es: 'Comisiones' },
    commissionBody: {
      pt: 'Configure comissões por vendedor com percentuais sobre vendas e/ou cobranças aprovadas. O cálculo é automático e visível em relatórios dedicados.',
      es: 'Configure comisiones por vendedor con porcentajes sobre ventas y/o cobros aprobados. El cálculo es automático y visible en informes dedicados.',
    },
  },

  mobile: {
    heading: { pt: 'Aplicativo Mobile (Android)', es: 'Aplicación Móvil (Android)' },
    body: {
      pt: 'O EJR OrGlobal é o aplicativo Android para vendedores externos. Permite trabalhar offline, sincroniza dados automaticamente e captura GPS para cobranças. Atualmente na versão 1.3.1.',
      es: 'EJR OrGlobal es la aplicación Android para vendedores externos. Permite trabajar sin conexión, sincroniza datos automáticamente y captura GPS para cobros. Actualmente en versión 1.3.1.',
    },
    featuresTitle: { pt: 'Funcionalidades', es: 'Funcionalidades' },
    features: [
      {
        title: { pt: 'Modo Offline', es: 'Modo Sin Conexión' },
        desc: {
          pt: 'Trabalha sem internet e sincroniza quando voltar a conectar',
          es: 'Trabaja sin internet y sincroniza al volver a conectarse',
        },
      },
      {
        title: { pt: 'Catálogo com Imagens', es: 'Catálogo con Imágenes' },
        desc: {
          pt: 'Mostre produtos com fotos ampliáveis aos clientes',
          es: 'Muestre productos con fotos ampliables a los clientes',
        },
      },
      {
        title: { pt: 'Captura de GPS', es: 'Captura de GPS' },
        desc: {
          pt: 'Localização automática em vendas e cobranças',
          es: 'Ubicación automática en ventas y cobros',
        },
      },
      {
        title: { pt: 'Sincronização Automática', es: 'Sincronización Automática' },
        desc: {
          pt: 'Pull/push de dados a cada 2 minutos',
          es: 'Pull/push de datos cada 2 minutos',
        },
      },
      {
        title: { pt: 'Multi-Vendedor', es: 'Multi-Vendedor' },
        desc: {
          pt: 'Cada vendedor tem seu próprio token de acesso',
          es: 'Cada vendedor tiene su propio token de acceso',
        },
      },
      {
        title: { pt: 'Cobranças com Foto', es: 'Cobros con Foto' },
        desc: {
          pt: 'Anexe foto do recibo ou cheque na cobrança',
          es: 'Adjunte foto del recibo o cheque en el cobro',
        },
      },
    ],
    setupTitle: { pt: 'Como Configurar', es: 'Cómo Configurar' },
    setupSteps: [
      {
        pt: 'Acesse Configurações > App Mobile no painel web',
        es: 'Acceda a Configuración > App Móvil en el panel web',
      },
      {
        pt: 'Habilite o app globalmente (toggle no topo)',
        es: 'Habilite la app globalmente (toggle arriba)',
      },
      {
        pt: 'Autorize cada vendedor individualmente',
        es: 'Autorice cada vendedor individualmente',
      },
      {
        pt: 'Configure as permissões por vendedor',
        es: 'Configure los permisos por vendedor',
      },
      {
        pt: 'Compartilhe o token gerado com o vendedor',
        es: 'Comparta el token generado con el vendedor',
      },
      {
        pt: 'Baixe o APK no link disponível na mesma página',
        es: 'Descargue el APK en el enlace disponible en la misma página',
      },
      {
        pt: 'Vendedor instala o APK e usa o token para login',
        es: 'El vendedor instala el APK y usa el token para iniciar sesión',
      },
    ],
    versionInfo: {
      pt: 'A versão atual é 1.3.1 e inclui: nome dinâmico da empresa, títulos nas telas, imagens de produtos com fullscreen, sincronização automática melhorada e captura de GPS.',
      es: 'La versión actual es 1.3.1 e incluye: nombre dinámico de la empresa, títulos en pantallas, imágenes de productos con pantalla completa, sincronización automática mejorada y captura de GPS.',
    },
  },

  pdfs: {
    heading: { pt: 'Geração de PDFs', es: 'Generación de PDFs' },
    body: {
      pt: 'A partir da versão 1.3.1, o sistema gera PDFs profissionais para vendas, orçamentos e cobranças. Cada documento pode ser exportado em dois modos diferentes para atender diferentes necessidades.',
      es: 'A partir de la versión 1.3.1, el sistema genera PDFs profesionales para ventas, presupuestos y cobros. Cada documento puede exportarse en dos modos diferentes para atender distintas necesidades.',
    },
    modesTitle: { pt: 'Modos de PDF', es: 'Modos de PDF' },
    elegantTitle: { pt: 'Modo Elegante', es: 'Modo Elegante' },
    elegantBody: {
      pt: 'Visual moderno com cores da empresa, cabeçalho colorido, badges destacados e tabelas listradas. Ideal para envio digital ao cliente por e-mail ou WhatsApp.',
      es: 'Visual moderno con colores de la empresa, encabezado colorido, badges destacados y tablas con franjas. Ideal para envío digital al cliente por correo o WhatsApp.',
    },
    printTitle: { pt: 'Modo Impressão', es: 'Modo Impresión' },
    printBody: {
      pt: 'Versão em escala de cinza com bordas finas, sem áreas preenchidas, otimizada para economizar tinta da impressora. Ideal para arquivo físico ou impressão em grande volume.',
      es: 'Versión en escala de grises con bordes finos, sin áreas rellenadas, optimizada para ahorrar tinta de la impresora. Ideal para archivo físico o impresión en gran volumen.',
    },
    documentsTitle: { pt: 'Documentos Disponíveis', es: 'Documentos Disponibles' },
    documents: [
      {
        title: { pt: 'PDF de Venda', es: 'PDF de Venta' },
        desc: {
          pt: 'Comprovante completo com cliente, itens, totais, parcelas e assinatura',
          es: 'Comprobante completo con cliente, ítems, totales, cuotas y firma',
        },
      },
      {
        title: { pt: 'PDF de Orçamento', es: 'PDF de Presupuesto' },
        desc: {
          pt: 'Proposta comercial com produtos/serviços, descontos, validade e assinatura',
          es: 'Propuesta comercial con productos/servicios, descuentos, validez y firma',
        },
      },
      {
        title: { pt: 'PDF de Cobrança', es: 'PDF de Cobro' },
        desc: {
          pt: 'Recibo de cobrança com forma de pagamento, GPS, timeline e assinaturas',
          es: 'Recibo de cobro con forma de pago, GPS, línea de tiempo y firmas',
        },
      },
    ],
    customizationTitle: { pt: 'Personalização', es: 'Personalización' },
    customizationBody: {
      pt: 'Em Configurações > Documentos você pode personalizar logo, cor primária, dados do rodapé, assinatura digital e nome do responsável que aparecerão em todos os PDFs.',
      es: 'En Configuración > Documentos puede personalizar logo, color primario, datos del pie, firma digital y nombre del responsable que aparecerán en todos los PDFs.',
    },
  },

  financeiro: {
    heading: { pt: 'Módulo Financeiro', es: 'Módulo Financiero' },
    body: {
      pt: 'O módulo financeiro consolida contas a receber (de vendas) e contas a pagar (de compras) em um único painel, com filtros por status, vencimento e cliente/fornecedor.',
      es: 'El módulo financiero consolida cuentas por cobrar (de ventas) y cuentas por pagar (de compras) en un único panel, con filtros por estado, vencimiento y cliente/proveedor.',
    },
    receivablesTitle: { pt: 'Contas a Receber', es: 'Cuentas por Cobrar' },
    receivablesBody: {
      pt: 'Geradas automaticamente a partir das parcelas das vendas. Cada parcela tem vencimento, valor, status (pendente/pago/atrasado) e pode ser baixada manualmente ou via cobrança aprovada.',
      es: 'Generadas automáticamente a partir de las cuotas de las ventas. Cada cuota tiene vencimiento, valor, estado (pendiente/pagado/atrasado) y puede descontarse manualmente o vía cobro aprobado.',
    },
    payablesTitle: { pt: 'Contas a Pagar', es: 'Cuentas por Pagar' },
    payablesBody: {
      pt: 'Geradas a partir dos pedidos de compra confirmados. Permite acompanhar vencimentos, marcar como pago e exportar relatórios de fluxo de caixa.',
      es: 'Generadas a partir de pedidos de compra confirmados. Permite seguir vencimientos, marcar como pagado y exportar informes de flujo de caja.',
    },
    cashflowTitle: { pt: 'Fluxo de Caixa', es: 'Flujo de Caja' },
    cashflowBody: {
      pt: 'Visualize entradas e saídas projetadas por período. Identifique gargalos e tome decisões com base em dados reais.',
      es: 'Visualice entradas y salidas proyectadas por período. Identifique cuellos de botella y tome decisiones basadas en datos reales.',
    },
  },

  relatorios: {
    heading: { pt: 'Relatórios e Análises', es: 'Informes y Análisis' },
    body: {
      pt: 'Acompanhe o desempenho da sua empresa com relatórios detalhados. Todos os relatórios podem ser filtrados por período e exportados.',
      es: 'Acompañe el rendimiento de su empresa con informes detallados. Todos los informes pueden filtrarse por período y exportarse.',
    },
    availableTitle: { pt: 'Relatórios Disponíveis', es: 'Informes Disponibles' },
    available: [
      {
        title: { pt: 'Vendas', es: 'Ventas' },
        items: [
          { pt: 'Por período', es: 'Por período' },
          { pt: 'Por cliente', es: 'Por cliente' },
          { pt: 'Por produto', es: 'Por producto' },
          { pt: 'Por vendedor', es: 'Por vendedor' },
        ],
      },
      {
        title: { pt: 'Compras', es: 'Compras' },
        items: [
          { pt: 'Por período', es: 'Por período' },
          { pt: 'Por fornecedor', es: 'Por proveedor' },
          { pt: 'Por produto', es: 'Por producto' },
          { pt: 'Pendentes de recebimento', es: 'Pendientes de recepción' },
        ],
      },
      {
        title: { pt: 'Estoque', es: 'Inventario' },
        items: [
          { pt: 'Posição atual', es: 'Posición actual' },
          { pt: 'Movimentações', es: 'Movimientos' },
          { pt: 'Produtos abaixo do mínimo', es: 'Productos por debajo del mínimo' },
          { pt: 'Valor em estoque', es: 'Valor en inventario' },
        ],
      },
      {
        title: { pt: 'Produção', es: 'Producción' },
        items: [
          { pt: 'Eficiência por lote', es: 'Eficiencia por lote' },
          { pt: 'Taxa de refugo', es: 'Tasa de rechazo' },
          { pt: 'Produção por funcionário', es: 'Producción por empleado' },
          { pt: 'Tempo médio de montagem', es: 'Tiempo promedio de montaje' },
        ],
      },
      {
        title: { pt: 'Financeiro', es: 'Financiero' },
        items: [
          { pt: 'Contas a receber', es: 'Cuentas por cobrar' },
          { pt: 'Contas a pagar', es: 'Cuentas por pagar' },
          { pt: 'Fluxo de caixa', es: 'Flujo de caja' },
          { pt: 'Inadimplência', es: 'Morosidad' },
        ],
      },
      {
        title: { pt: 'Comissões', es: 'Comisiones' },
        items: [
          { pt: 'Comissões por vendedor', es: 'Comisiones por vendedor' },
          { pt: 'Comissões por período', es: 'Comisiones por período' },
          { pt: 'Cobranças realizadas', es: 'Cobros realizados' },
          { pt: 'Visitas com GPS', es: 'Visitas con GPS' },
        ],
      },
    ],
  },

  usuarios: {
    heading: { pt: 'Gestão de Usuários', es: 'Gestión de Usuarios' },
    body: {
      pt: 'Controle de acesso granular baseado em perfis de usuário, garantindo que cada funcionário acesse apenas as funcionalidades necessárias para sua função.',
      es: 'Control de acceso granular basado en perfiles de usuario, garantizando que cada empleado acceda solo a las funcionalidades necesarias para su función.',
    },
    profilesTitle: { pt: 'Perfis de Usuário', es: 'Perfiles de Usuario' },
    profiles: [
      {
        role: { pt: 'Proprietário (OWNER)', es: 'Propietario (OWNER)' },
        desc: { pt: 'Dono do sistema', es: 'Dueño del sistema' },
        access: { pt: 'Acesso total', es: 'Acceso total' },
      },
      {
        role: { pt: 'Diretor (DIRECTOR)', es: 'Director (DIRECTOR)' },
        desc: { pt: 'Gestão administrativa', es: 'Gestión administrativa' },
        access: { pt: 'Todos os módulos', es: 'Todos los módulos' },
      },
      {
        role: { pt: 'Gerente (MANAGER)', es: 'Gerente (MANAGER)' },
        desc: { pt: 'Supervisão', es: 'Supervisión' },
        access: { pt: 'Relatórios e equipes', es: 'Informes y equipos' },
      },
      {
        role: { pt: 'Coordenador (COORDINATOR)', es: 'Coordinador (COORDINATOR)' },
        desc: { pt: 'Coordenação', es: 'Coordinación' },
        access: { pt: 'Área específica', es: 'Área específica' },
      },
      {
        role: { pt: 'Vendedor (SALESPERSON)', es: 'Vendedor (SALESPERSON)' },
        desc: { pt: 'Comercial', es: 'Comercial' },
        access: {
          pt: 'Orçamentos, vendas, cobranças (web e mobile)',
          es: 'Presupuestos, ventas, cobros (web y móvil)',
        },
      },
      {
        role: { pt: 'Estoque (STOCK)', es: 'Inventario (STOCK)' },
        desc: { pt: 'Almoxarifado', es: 'Almacén' },
        access: { pt: 'Inventário e movimentações', es: 'Inventario y movimientos' },
      },
      {
        role: { pt: 'Produção (PRODUCTION)', es: 'Producción (PRODUCTION)' },
        desc: { pt: 'Montagem', es: 'Montaje' },
        access: { pt: 'Lotes e unidades', es: 'Lotes y unidades' },
      },
      {
        role: { pt: 'Técnico (TECHNICIAN)', es: 'Técnico (TECHNICIAN)' },
        desc: { pt: 'Serviços', es: 'Servicios' },
        access: { pt: 'Ordens de serviço', es: 'Órdenes de servicio' },
      },
      {
        role: { pt: 'Monitor (MONITOR)', es: 'Monitor (MONITOR)' },
        desc: { pt: 'Visualização', es: 'Visualización' },
        access: { pt: 'Somente leitura', es: 'Solo lectura' },
      },
    ],
    importantText: {
      pt: 'Apenas usuários com perfil Proprietário ou Diretor podem gerenciar permissões de outros usuários.',
      es: 'Solo usuarios con perfil Propietario o Director pueden gestionar permisos de otros usuarios.',
    },
  },

  configuracoes: {
    heading: { pt: 'Configurações do Sistema', es: 'Configuración del Sistema' },
    body: {
      pt: 'Personalize o sistema de acordo com as necessidades da sua empresa: documentos, categorias, backup, dados da empresa e muito mais.',
      es: 'Personalice el sistema según las necesidades de su empresa: documentos, categorías, respaldo, datos de la empresa y mucho más.',
    },
    documentsTitle: { pt: 'Configurações de Documentos', es: 'Configuración de Documentos' },
    documentsBody: {
      pt: 'Personalize seus documentos (orçamentos, vendas, cobranças, OS) com:',
      es: 'Personalice sus documentos (presupuestos, ventas, cobros, OS) con:',
    },
    documents: [
      { pt: 'Logo da empresa', es: 'Logo de la empresa' },
      { pt: 'Cor primária da marca', es: 'Color primario de la marca' },
      { pt: 'Nome e dados de contato no rodapé', es: 'Nombre y datos de contacto en el pie' },
      { pt: 'Endereço completo', es: 'Dirección completa' },
      { pt: 'Telefone e e-mail', es: 'Teléfono y correo' },
      { pt: 'Website', es: 'Sitio web' },
      { pt: 'Assinatura digital', es: 'Firma digital' },
      { pt: 'Nome e cargo do responsável', es: 'Nombre y cargo del responsable' },
      { pt: 'Texto personalizado de rodapé', es: 'Texto personalizado del pie' },
    ],
    otherTitle: { pt: 'Outras Configurações', es: 'Otras Configuraciones' },
    other: [
      {
        title: { pt: 'Categorias de Produtos', es: 'Categorías de Productos' },
        desc: {
          pt: 'Organize produtos para facilitar busca e relatórios',
          es: 'Organice productos para facilitar búsqueda e informes',
        },
      },
      {
        title: { pt: 'Backup', es: 'Respaldo' },
        desc: {
          pt: 'Backup automático diário e backup manual sob demanda',
          es: 'Respaldo automático diario y respaldo manual bajo demanda',
        },
      },
      {
        title: { pt: 'Moeda', es: 'Moneda' },
        desc: {
          pt: 'Configure BRL, PYG ou USD como moeda principal',
          es: 'Configure BRL, PYG o USD como moneda principal',
        },
      },
      {
        title: { pt: 'App Mobile', es: 'App Móvil' },
        desc: {
          pt: 'Habilite e configure vendedores externos',
          es: 'Habilite y configure vendedores externos',
        },
      },
    ],
    backupTip: {
      pt: 'Faça backup regularmente para garantir a segurança dos seus dados. O sistema possui backup automático diário, mas backups manuais antes de mudanças importantes são recomendados.',
      es: 'Haga respaldo regularmente para garantizar la seguridad de sus datos. El sistema tiene respaldo automático diario, pero respaldos manuales antes de cambios importantes son recomendados.',
    },
  },

  dicas: {
    heading: { pt: 'Dicas para Melhor Uso', es: 'Consejos para Mejor Uso' },
    body: {
      pt: 'Siga estas boas práticas para aproveitar ao máximo o EJR Organizador.',
      es: 'Siga estas buenas prácticas para aprovechar al máximo EJR Organizador.',
    },
    tips: [
      {
        title: { pt: 'Mantenha cadastros atualizados', es: 'Mantenga registros actualizados' },
        body: {
          pt: 'Informações desatualizadas podem gerar erros em relatórios e processos.',
          es: 'Información desactualizada puede generar errores en informes y procesos.',
        },
      },
      {
        title: {
          pt: 'Configure alertas de estoque',
          es: 'Configure alertas de inventario',
        },
        body: {
          pt: 'Defina estoques mínimos para evitar falta de produtos importantes.',
          es: 'Defina stocks mínimos para evitar falta de productos importantes.',
        },
      },
      {
        title: { pt: 'Use permissões adequadas', es: 'Use permisos adecuados' },
        body: {
          pt: 'Cada funcionário deve ter acesso apenas ao necessário para sua função.',
          es: 'Cada empleado debe tener acceso solo a lo necesario para su función.',
        },
      },
      {
        title: { pt: 'Confira recebimentos', es: 'Verifique recepciones' },
        body: {
          pt: 'Sempre verifique as quantidades antes de aprovar um recebimento.',
          es: 'Siempre verifique las cantidades antes de aprobar una recepción.',
        },
      },
      {
        title: { pt: 'Faça backup regularmente', es: 'Haga respaldo regularmente' },
        body: {
          pt: 'Proteja seus dados fazendo backup periódico das informações.',
          es: 'Proteja sus datos haciendo respaldo periódico de la información.',
        },
      },
      {
        title: { pt: 'Acompanhe o dashboard', es: 'Acompañe el panel principal' },
        body: {
          pt: 'Verifique diariamente as métricas para identificar problemas rapidamente.',
          es: 'Verifique diariamente las métricas para identificar problemas rápidamente.',
        },
      },
      {
        title: { pt: 'Use PDFs no modo correto', es: 'Use PDFs en el modo correcto' },
        body: {
          pt: 'Modo Elegante para envio digital, modo Impressão para economizar tinta.',
          es: 'Modo Elegante para envío digital, modo Impresión para ahorrar tinta.',
        },
      },
      {
        title: { pt: 'Treine seus vendedores no app', es: 'Entrene a sus vendedores en la app' },
        body: {
          pt: 'O modo offline permite trabalhar sem internet, ideal para campo.',
          es: 'El modo sin conexión permite trabajar sin internet, ideal para campo.',
        },
      },
    ],
  },

  suporte: {
    heading: { pt: 'Precisa de Ajuda?', es: '¿Necesita Ayuda?' },
    body: {
      pt: 'Em caso de dúvidas ou problemas, temos diversas formas de suporte disponíveis.',
      es: 'En caso de dudas o problemas, tenemos diversas formas de soporte disponibles.',
    },
    manualTitle: { pt: 'Este Manual', es: 'Este Manual' },
    manualBody: {
      pt: 'Consulte este manual para encontrar respostas para as dúvidas mais comuns.',
      es: 'Consulte este manual para encontrar respuestas a las dudas más comunes.',
    },
    adminTitle: { pt: 'Administrador', es: 'Administrador' },
    adminBody: {
      pt: 'Entre em contato com o administrador do sistema da sua empresa.',
      es: 'Póngase en contacto con el administrador del sistema de su empresa.',
    },
    ejrTitle: { pt: 'EJR Robótica Educacional', es: 'EJR Robótica Educacional' },
    ejrBody: {
      pt: 'Para suporte técnico especializado, entre em contato com a equipe da EJR.',
      es: 'Para soporte técnico especializado, póngase en contacto con el equipo de EJR.',
    },
    developedBy: { pt: 'Desenvolvido por:', es: 'Desarrollado por:' },
  },
} as const;
