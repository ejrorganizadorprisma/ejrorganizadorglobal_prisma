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
  Lightbulb,
  Smartphone,
  DollarSign,
  Receipt,
  UserCheck,
  Globe,
} from 'lucide-react';
import {
  Lang,
  UI_LABELS,
  SECTION_IDS,
  SECTION_TITLES,
  SECTION_CONTENT,
  type SectionId,
} from '../data/manualContent';

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  introducao: <Book className="w-5 h-5" />,
  'primeiros-passos': <ChevronRight className="w-5 h-5" />,
  dashboard: <BarChart3 className="w-5 h-5" />,
  produtos: <Package className="w-5 h-5" />,
  clientes: <Users className="w-5 h-5" />,
  orcamentos: <FileText className="w-5 h-5" />,
  vendas: <ShoppingCart className="w-5 h-5" />,
  cobrancas: <Receipt className="w-5 h-5" />,
  fornecedores: <Truck className="w-5 h-5" />,
  compras: <ClipboardList className="w-5 h-5" />,
  producao: <Factory className="w-5 h-5" />,
  estoque: <Warehouse className="w-5 h-5" />,
  servicos: <Wrench className="w-5 h-5" />,
  vendedores: <UserCheck className="w-5 h-5" />,
  mobile: <Smartphone className="w-5 h-5" />,
  pdfs: <FileText className="w-5 h-5" />,
  financeiro: <DollarSign className="w-5 h-5" />,
  relatorios: <BarChart3 className="w-5 h-5" />,
  usuarios: <Shield className="w-5 h-5" />,
  configuracoes: <Settings className="w-5 h-5" />,
  dicas: <Lightbulb className="w-5 h-5" />,
  suporte: <Info className="w-5 h-5" />,
};

export function ManualPage() {
  const [lang, setLang] = useState<Lang>('pt');
  const [activeSection, setActiveSection] = useState<string>('introducao');
  const contentRef = useRef<HTMLDivElement>(null);

  const tx = (text: { pt: string; es: string }) => text[lang];

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(lang === 'pt' ? 'Por favor, permita pop-ups para baixar o PDF' : 'Por favor, permita pop-ups para descargar el PDF');
      return;
    }

    const dateLocale = lang === 'pt' ? 'pt-BR' : 'es-PY';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${lang}">
      <head>
        <meta charset="utf-8" />
        <title>${tx(UI_LABELS.manualTitle)} - EJR Organizador</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #1f2937; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
          .header h1 { font-size: 28px; color: #1e40af; margin-bottom: 8px; }
          h2 { font-size: 22px; color: #1e40af; margin-top: 30px; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #dbeafe; page-break-after: avoid; }
          h3 { font-size: 18px; color: #1e3a8a; margin-top: 20px; margin-bottom: 10px; page-break-after: avoid; }
          h4 { font-size: 16px; color: #1e40af; margin-top: 15px; margin-bottom: 8px; }
          p { margin-bottom: 12px; text-align: justify; }
          ul, ol { margin-bottom: 15px; padding-left: 25px; }
          li { margin-bottom: 6px; }
          .tip-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          .info-box { background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 14px; }
          th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
          th { background: #f3f4f6; font-weight: 600; }
          .page-break { page-break-before: always; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${tx(UI_LABELS.manualTitle)}</h1>
          <p style="color:#6b7280;font-size:14px;">EJR Organizador</p>
          <p style="color:#6b7280;font-size:14px;">${tx(UI_LABELS.systemTitle)}</p>
          <p style="margin-top:10px;font-size:12px;color:#9ca3af;">${tx(UI_LABELS.developedBy)}</p>
          <p style="margin-top:10px;font-size:12px;color:#9ca3af;">${tx(UI_LABELS.version)} 1.3.1 - ${new Date().toLocaleDateString(dateLocale)}</p>
        </div>
        ${generatePDFContent()}
        <div class="footer">
          <p>EJR Organizador - ${tx(UI_LABELS.systemTitle)}</p>
          <p>${tx(UI_LABELS.developedBy)}</p>
          <p>© ${new Date().getFullYear()} - ${tx(UI_LABELS.allRightsReserved)}</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const generatePDFContent = (): string => {
    const c = SECTION_CONTENT;
    const out: string[] = [];

    // 1. Introdução
    out.push(`<h2>${tx(SECTION_TITLES.introducao)}</h2>`);
    out.push(`<p>${tx(c.introducao.body)}</p>`);
    out.push(`<h3>${tx(c.introducao.capabilitiesTitle)}</h3><ul>`);
    c.introducao.capabilities.forEach((cap) => out.push(`<li>${tx(cap)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.introducao.requirementsTitle)}</h3><ul>`);
    c.introducao.requirements.forEach((r) => out.push(`<li>${tx(r)}</li>`));
    out.push(`</ul>`);

    // 2. Primeiros Passos
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES['primeiros-passos'])}</h2>`);
    out.push(`<h3>${tx(c.primeirosPassos.headingAccess)}</h3><ol>`);
    out.push(`<li><strong>${tx(c.primeirosPassos.step1Title)}:</strong> ${tx(c.primeirosPassos.step1Desc)}</li>`);
    out.push(`<li><strong>${tx(c.primeirosPassos.step2Title)}:</strong> ${tx(c.primeirosPassos.step2Desc)}</li>`);
    out.push(`<li><strong>${tx(c.primeirosPassos.step3Title)}:</strong> ${tx(c.primeirosPassos.step3Desc)}</li>`);
    out.push(`</ol>`);
    out.push(`<h3>${tx(c.primeirosPassos.menuTitle)}</h3><p>${tx(c.primeirosPassos.menuIntro)}</p><ul>`);
    c.primeirosPassos.menuItems.forEach((m) => out.push(`<li><strong>${tx(m.title)}:</strong> ${tx(m.desc)}</li>`));
    out.push(`</ul>`);

    // 3. Dashboard
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.dashboard)}</h2>`);
    out.push(`<p>${tx(c.dashboard.body)}</p>`);
    out.push(`<h3>${tx(c.dashboard.metricsTitle)}</h3><ul>`);
    c.dashboard.metrics.forEach((m) => out.push(`<li><strong>${tx(m.title)}:</strong> ${tx(m.desc)}</li>`));
    out.push(`</ul>`);

    // 4. Produtos
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.produtos)}</h2>`);
    out.push(`<p>${tx(c.produtos.body)}</p>`);
    out.push(`<div class="warning-box"><strong>${tx(UI_LABELS.importantLabel)}:</strong> ${tx(c.produtos.importantText)}</div>`);
    out.push(`<h3>${tx(c.produtos.typesTitle)}</h3><table><tr><th>${lang === 'pt' ? 'Tipo' : 'Tipo'}</th><th>${lang === 'pt' ? 'Descrição' : 'Descripción'}</th><th>${lang === 'pt' ? 'Uso' : 'Uso'}</th></tr>`);
    c.produtos.types.forEach((t) => out.push(`<tr><td>${tx(t.type)}</td><td>${tx(t.desc)}</td><td>${tx(t.usage)}</td></tr>`));
    out.push(`</table>`);
    out.push(`<h3>${tx(c.produtos.bomTitle)}</h3><p>${tx(c.produtos.bomBody)}</p><ol>`);
    c.produtos.bomSteps.forEach((s) => out.push(`<li>${tx(s)}</li>`));
    out.push(`</ol>`);
    out.push(`<h3>${tx(c.produtos.fieldsTitle)}</h3><ul>`);
    c.produtos.fields.forEach((f) => out.push(`<li><strong>${tx(f.title)}:</strong> ${tx(f.desc)}</li>`));
    out.push(`</ul>`);

    // 5. Clientes
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.clientes)}</h2>`);
    out.push(`<p>${tx(c.clientes.body)}</p>`);
    out.push(`<h3>${tx(c.clientes.typesTitle)}</h3>`);
    out.push(`<h4>${tx(c.clientes.physical.title)}</h4><ul>`);
    c.clientes.physical.items.forEach((i) => out.push(`<li>${tx(i)}</li>`));
    out.push(`</ul>`);
    out.push(`<h4>${tx(c.clientes.legal.title)}</h4><ul>`);
    c.clientes.legal.items.forEach((i) => out.push(`<li>${tx(i)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.clientes.creditTitle)}</h3><p>${tx(c.clientes.creditBody)}</p><ul>`);
    c.clientes.creditItems.forEach((i) => out.push(`<li>${tx(i)}</li>`));
    out.push(`</ul>`);
    out.push(`<div class="tip-box"><strong>${tx(UI_LABELS.tipLabel)}:</strong> ${tx(c.clientes.tipText)}</div>`);

    // 6. Orçamentos
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.orcamentos)}</h2>`);
    out.push(`<p>${tx(c.orcamentos.body)}</p>`);
    out.push(`<h3>${tx(c.orcamentos.stepsTitle)}</h3><ol>`);
    c.orcamentos.steps.forEach((s) => out.push(`<li>${tx(s)}</li>`));
    out.push(`</ol>`);
    out.push(`<h3>${tx(c.orcamentos.statusTitle)}</h3><table><tr><th>${lang === 'pt' ? 'Status' : 'Estado'}</th><th>${lang === 'pt' ? 'Descrição' : 'Descripción'}</th></tr>`);
    c.orcamentos.statuses.forEach((s) => out.push(`<tr><td>${tx(s.status)}</td><td>${tx(s.desc)}</td></tr>`));
    out.push(`</table>`);
    out.push(`<div class="tip-box"><strong>${tx(c.orcamentos.pdfNoveltyTitle)}:</strong> ${tx(c.orcamentos.pdfNoveltyBody)}</div>`);
    out.push(`<h3>${tx(c.orcamentos.convertTitle)}</h3><p>${tx(c.orcamentos.convertBody)}</p>`);

    // 7. Vendas
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.vendas)}</h2>`);
    out.push(`<p>${tx(c.vendas.body)}</p>`);
    out.push(`<h3>${tx(c.vendas.paymentMethodsTitle)}</h3><ul>`);
    c.vendas.paymentMethods.forEach((p) => out.push(`<li>${tx(p)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.vendas.installmentsTitle)}</h3><p>${tx(c.vendas.installmentsBody)}</p>`);
    out.push(`<div class="tip-box"><strong>${tx(c.vendas.pdfNoveltyTitle)}:</strong> ${tx(c.vendas.pdfNoveltyBody)}</div>`);
    out.push(`<h3>${tx(c.vendas.stockTitle)}</h3><p>${tx(c.vendas.stockBody)}</p>`);

    // 8. Cobrancas
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.cobrancas)}</h2>`);
    out.push(`<p>${tx(c.cobrancas.body)}</p>`);
    out.push(`<h3>${tx(c.cobrancas.flowTitle)}</h3><table><tr><th>${lang === 'pt' ? 'Status' : 'Estado'}</th><th>${lang === 'pt' ? 'Descrição' : 'Descripción'}</th></tr>`);
    c.cobrancas.statuses.forEach((s) => out.push(`<tr><td>${tx(s.status)}</td><td>${tx(s.desc)}</td></tr>`));
    out.push(`</table>`);
    out.push(`<h3>${tx(c.cobrancas.gpsTitle)}</h3><p>${tx(c.cobrancas.gpsBody)}</p>`);
    out.push(`<div class="tip-box"><strong>${tx(c.cobrancas.pdfNoveltyTitle)}:</strong> ${tx(c.cobrancas.pdfNoveltyBody)}</div>`);
    out.push(`<h3>${tx(c.cobrancas.commissionTitle)}</h3><p>${tx(c.cobrancas.commissionBody)}</p>`);

    // 9. Fornecedores
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.fornecedores)}</h2>`);
    out.push(`<p>${tx(c.fornecedores.body)}</p>`);
    out.push(`<h3>${tx(c.fornecedores.registrationTitle)}</h3><ul>`);
    c.fornecedores.registration.forEach((r) => out.push(`<li>${tx(r)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.fornecedores.commercialTitle)}</h3><ul>`);
    c.fornecedores.commercial.forEach((r) => out.push(`<li>${tx(r)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.fornecedores.relationTitle)}</h3><p>${tx(c.fornecedores.relationBody)}</p><ul>`);
    c.fornecedores.relation.forEach((r) => out.push(`<li>${tx(r)}</li>`));
    out.push(`</ul>`);

    // 10. Compras
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.compras)}</h2>`);
    out.push(`<p>${tx(c.compras.body)}</p>`);
    out.push(`<h3>${tx(c.compras.stepsTitle)}</h3>`);
    c.compras.steps.forEach((s) => out.push(`<h4>${tx(s.title)}</h4><p>${tx(s.desc)}</p>`));
    out.push(`<h3>${tx(c.compras.payablesTitle)}</h3><p>${tx(c.compras.payablesBody)}</p>`);

    // 11. Produção
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.producao)}</h2>`);
    out.push(`<p>${tx(c.producao.body)}</p>`);
    out.push(`<h3>${tx(c.producao.statusTitle)}</h3><ul>`);
    c.producao.statuses.forEach((s) => out.push(`<li>${tx(s)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.producao.flowTitle)}</h3>`);
    c.producao.flow.forEach((f) => out.push(`<h4>${tx(f.title)}</h4><p>${tx(f.desc)}</p>`));
    out.push(`<div class="info-box"><strong>${tx(UI_LABELS.infoLabel)}:</strong> ${tx(c.producao.traceabilityText)}</div>`);

    // 12. Estoque
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.estoque)}</h2>`);
    out.push(`<p>${tx(c.estoque.body)}</p>`);
    out.push(`<h3>${tx(c.estoque.locationTitle)}</h3><ul>`);
    out.push(`<li><strong>${tx(c.estoque.space)}:</strong> ${tx(c.estoque.spaceExample)}</li>`);
    out.push(`<li><strong>${tx(c.estoque.shelf)}:</strong> ${tx(c.estoque.shelfExample)}</li>`);
    out.push(`<li><strong>${tx(c.estoque.section)}:</strong> ${tx(c.estoque.sectionExample)}</li>`);
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.estoque.featuresTitle)}</h3><ul>`);
    c.estoque.features.forEach((f) => out.push(`<li><strong>${tx(f.title)}:</strong> ${tx(f.desc)}</li>`));
    out.push(`</ul>`);

    // 13. Serviços
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.servicos)}</h2>`);
    out.push(`<p>${tx(c.servicos.body)}</p>`);
    out.push(`<h3>${tx(c.servicos.flowTitle)}</h3><table><tr><th>Status</th><th>${lang === 'pt' ? 'Descrição' : 'Descripción'}</th><th>${lang === 'pt' ? 'Ação' : 'Acción'}</th></tr>`);
    c.servicos.statuses.forEach((s) => out.push(`<tr><td>${tx(s.status)}</td><td>${tx(s.desc)}</td><td>${tx(s.action)}</td></tr>`));
    out.push(`</table>`);
    out.push(`<h3>${tx(c.servicos.infoTitle)}</h3><ul>`);
    c.servicos.info.forEach((i) => out.push(`<li>${tx(i)}</li>`));
    out.push(`</ul>`);

    // 14. Vendedores
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.vendedores)}</h2>`);
    out.push(`<p>${tx(c.vendedores.body)}</p>`);
    out.push(`<h3>${tx(c.vendedores.permissionsTitle)}</h3><ul>`);
    c.vendedores.permissions.forEach((p) => out.push(`<li><strong>${tx(p.title)}:</strong> ${tx(p.desc)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.vendedores.commissionTitle)}</h3><p>${tx(c.vendedores.commissionBody)}</p>`);

    // 15. Mobile
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.mobile)}</h2>`);
    out.push(`<p>${tx(c.mobile.body)}</p>`);
    out.push(`<h3>${tx(c.mobile.featuresTitle)}</h3><ul>`);
    c.mobile.features.forEach((f) => out.push(`<li><strong>${tx(f.title)}:</strong> ${tx(f.desc)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.mobile.setupTitle)}</h3><ol>`);
    c.mobile.setupSteps.forEach((s) => out.push(`<li>${tx(s)}</li>`));
    out.push(`</ol>`);
    out.push(`<div class="info-box"><strong>v1.3.1:</strong> ${tx(c.mobile.versionInfo)}</div>`);

    // 16. PDFs
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.pdfs)}</h2>`);
    out.push(`<p>${tx(c.pdfs.body)}</p>`);
    out.push(`<h3>${tx(c.pdfs.modesTitle)}</h3>`);
    out.push(`<h4>${tx(c.pdfs.elegantTitle)}</h4><p>${tx(c.pdfs.elegantBody)}</p>`);
    out.push(`<h4>${tx(c.pdfs.printTitle)}</h4><p>${tx(c.pdfs.printBody)}</p>`);
    out.push(`<h3>${tx(c.pdfs.documentsTitle)}</h3><ul>`);
    c.pdfs.documents.forEach((d) => out.push(`<li><strong>${tx(d.title)}:</strong> ${tx(d.desc)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.pdfs.customizationTitle)}</h3><p>${tx(c.pdfs.customizationBody)}</p>`);

    // 17. Financeiro
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.financeiro)}</h2>`);
    out.push(`<p>${tx(c.financeiro.body)}</p>`);
    out.push(`<h3>${tx(c.financeiro.receivablesTitle)}</h3><p>${tx(c.financeiro.receivablesBody)}</p>`);
    out.push(`<h3>${tx(c.financeiro.payablesTitle)}</h3><p>${tx(c.financeiro.payablesBody)}</p>`);
    out.push(`<h3>${tx(c.financeiro.cashflowTitle)}</h3><p>${tx(c.financeiro.cashflowBody)}</p>`);

    // 18. Relatórios
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.relatorios)}</h2>`);
    out.push(`<p>${tx(c.relatorios.body)}</p>`);
    out.push(`<h3>${tx(c.relatorios.availableTitle)}</h3>`);
    c.relatorios.available.forEach((cat) => {
      out.push(`<h4>${tx(cat.title)}</h4><ul>`);
      cat.items.forEach((i) => out.push(`<li>${tx(i)}</li>`));
      out.push(`</ul>`);
    });

    // 19. Usuários
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.usuarios)}</h2>`);
    out.push(`<p>${tx(c.usuarios.body)}</p>`);
    out.push(`<h3>${tx(c.usuarios.profilesTitle)}</h3><table><tr><th>${lang === 'pt' ? 'Perfil' : 'Perfil'}</th><th>${lang === 'pt' ? 'Descrição' : 'Descripción'}</th><th>${lang === 'pt' ? 'Acesso' : 'Acceso'}</th></tr>`);
    c.usuarios.profiles.forEach((p) => out.push(`<tr><td>${tx(p.role)}</td><td>${tx(p.desc)}</td><td>${tx(p.access)}</td></tr>`));
    out.push(`</table>`);
    out.push(`<div class="warning-box"><strong>${tx(UI_LABELS.importantLabel)}:</strong> ${tx(c.usuarios.importantText)}</div>`);

    // 20. Configurações
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.configuracoes)}</h2>`);
    out.push(`<p>${tx(c.configuracoes.body)}</p>`);
    out.push(`<h3>${tx(c.configuracoes.documentsTitle)}</h3><p>${tx(c.configuracoes.documentsBody)}</p><ul>`);
    c.configuracoes.documents.forEach((d) => out.push(`<li>${tx(d)}</li>`));
    out.push(`</ul>`);
    out.push(`<h3>${tx(c.configuracoes.otherTitle)}</h3><ul>`);
    c.configuracoes.other.forEach((o) => out.push(`<li><strong>${tx(o.title)}:</strong> ${tx(o.desc)}</li>`));
    out.push(`</ul>`);
    out.push(`<div class="tip-box"><strong>${tx(UI_LABELS.tipLabel)}:</strong> ${tx(c.configuracoes.backupTip)}</div>`);

    // 21. Dicas
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.dicas)}</h2>`);
    out.push(`<p>${tx(c.dicas.body)}</p>`);
    c.dicas.tips.forEach((t) =>
      out.push(`<div class="tip-box"><strong>${tx(t.title)}:</strong> ${tx(t.body)}</div>`)
    );

    // 22. Suporte
    out.push(`<div class="page-break"></div><h2>${tx(SECTION_TITLES.suporte)}</h2>`);
    out.push(`<p>${tx(c.suporte.body)}</p>`);
    out.push(`<h3>${tx(c.suporte.manualTitle)}</h3><p>${tx(c.suporte.manualBody)}</p>`);
    out.push(`<h3>${tx(c.suporte.adminTitle)}</h3><p>${tx(c.suporte.adminBody)}</p>`);
    out.push(`<h3>${tx(c.suporte.ejrTitle)}</h3><p>${tx(c.suporte.ejrBody)}</p>`);

    return out.join('\n');
  };

  // ─── Render helpers ──────────────────────────────────────────────────────
  const renderSectionHeader = (id: SectionId) => (
    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
      <div className="p-3 bg-blue-100 rounded-xl text-blue-600">{SECTION_ICONS[id]}</div>
      <h2 className="text-2xl font-bold text-gray-900">{tx(SECTION_TITLES[id])}</h2>
    </div>
  );

  const renderSection = (id: SectionId, content: React.ReactNode) => (
    <section
      key={id}
      id={id}
      className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 scroll-mt-24"
    >
      {renderSectionHeader(id)}
      {content}
    </section>
  );

  const c = SECTION_CONTENT;

  return (
    <MainLayout title={tx(UI_LABELS.manualTitle)}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4 gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-white font-bold text-lg">EJR</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {tx(UI_LABELS.manualTitle)}
                  </h1>
                  <p className="text-sm text-gray-500 truncate">{tx(UI_LABELS.subtitle)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Language toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setLang('pt')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      lang === 'pt'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={tx(UI_LABELS.ptLabel)}
                  >
                    <Globe className="w-4 h-4" />
                    PT
                  </button>
                  <button
                    onClick={() => setLang('es')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      lang === 'es'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title={tx(UI_LABELS.esLabel)}
                  >
                    <Globe className="w-4 h-4" />
                    ES
                  </button>
                </div>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{tx(UI_LABELS.downloadPdf)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-4 lg:gap-8">
            {/* Sidebar */}
            <div className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24 bg-white rounded-2xl shadow-lg p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Book className="w-5 h-5 text-blue-600" />
                  {tx(UI_LABELS.index)}
                </h2>
                <nav className="space-y-1">
                  {SECTION_IDS.map((id) => (
                    <button
                      key={id}
                      onClick={() => scrollToSection(id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                        activeSection === id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className={activeSection === id ? 'text-blue-600' : 'text-gray-400'}>
                        {SECTION_ICONS[id]}
                      </span>
                      <span className="text-sm">{tx(SECTION_TITLES[id])}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" ref={contentRef}>
              <div className="space-y-8">
                {/* 1. Introdução */}
                {renderSection(
                  'introducao',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {tx(c.introducao.heading)}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">{tx(c.introducao.body)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-6">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        {tx(c.introducao.capabilitiesTitle)}
                      </h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {c.introducao.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-center gap-2 text-blue-800">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span>{tx(cap)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          {tx(c.introducao.requirementsTitle)}
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {c.introducao.requirements.map((r, i) => (
                            <li key={i}>- {tx(r)}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          {tx(c.introducao.browsersTitle)}
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {c.introducao.browsers.map((b, i) => (
                            <li key={i}>- {tx(b)}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium text-gray-900 mb-2">
                          {tx(c.introducao.accessTitle)}
                        </h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {c.introducao.access.map((a, i) => (
                            <li key={i}>- {tx(a)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Primeiros Passos */}
                {renderSection(
                  'primeiros-passos',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {tx(c.primeirosPassos.headingAccess)}
                      </h3>
                      <div className="bg-gray-50 rounded-xl p-6">
                        <ol className="space-y-4">
                          {[
                            { t: c.primeirosPassos.step1Title, d: c.primeirosPassos.step1Desc },
                            { t: c.primeirosPassos.step2Title, d: c.primeirosPassos.step2Desc },
                            { t: c.primeirosPassos.step3Title, d: c.primeirosPassos.step3Desc },
                          ].map((step, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">{tx(step.t)}</p>
                                <p className="text-sm text-gray-600">{tx(step.d)}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {tx(c.primeirosPassos.menuTitle)}
                      </h3>
                      <p className="text-gray-600 mb-4">{tx(c.primeirosPassos.menuIntro)}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.primeirosPassos.menuItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                              <Box className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{tx(item.title)}</p>
                              <p className="text-sm text-gray-600">{tx(item.desc)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Dashboard */}
                {renderSection(
                  'dashboard',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {tx(c.dashboard.heading)}
                      </h3>
                      <p className="text-gray-600 mb-4">{tx(c.dashboard.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">
                        {tx(c.dashboard.metricsTitle)}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.dashboard.metrics.map((m, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{tx(m.title)}</p>
                            <p className="text-sm text-gray-600">{tx(m.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Produtos */}
                {renderSection(
                  'produtos',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {tx(c.produtos.heading)}
                      </h3>
                      <p className="text-gray-600 mb-4">{tx(c.produtos.body)}</p>
                    </div>
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">{tx(UI_LABELS.importantLabel)}</p>
                          <p className="text-sm text-amber-700">{tx(c.produtos.importantText)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.produtos.typesTitle)}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Tipo' : 'Tipo'}
                              </th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Descrição' : 'Descripción'}
                              </th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Uso' : 'Uso'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.produtos.types.map((t, i) => (
                              <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                                <td className="border border-gray-200 px-4 py-3">{tx(t.type)}</td>
                                <td className="border border-gray-200 px-4 py-3">{tx(t.desc)}</td>
                                <td className="border border-gray-200 px-4 py-3">{tx(t.usage)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.produtos.bomTitle)}</h4>
                      <p className="text-gray-600 mb-3">{tx(c.produtos.bomBody)}</p>
                      <div className="bg-blue-50 rounded-xl p-6">
                        <ol className="space-y-3">
                          {c.produtos.bomSteps.map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {i + 1}
                              </span>
                              <span>{tx(step)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.produtos.fieldsTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.produtos.fields.map((f, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{tx(f.title)}</p>
                            <p className="text-sm text-gray-600">{tx(f.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Clientes */}
                {renderSection(
                  'clientes',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.clientes.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.clientes.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.clientes.typesTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <h5 className="font-semibold text-gray-900">{tx(c.clientes.physical.title)}</h5>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-2">
                            {c.clientes.physical.items.map((item, i) => (
                              <li key={i}>- {tx(item)}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Building2 className="w-5 h-5 text-green-600" />
                            </div>
                            <h5 className="font-semibold text-gray-900">{tx(c.clientes.legal.title)}</h5>
                          </div>
                          <ul className="text-sm text-gray-600 space-y-2">
                            {c.clientes.legal.items.map((item, i) => (
                              <li key={i}>- {tx(item)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        {tx(c.clientes.creditTitle)}
                      </h4>
                      <p className="text-gray-600 mb-3">{tx(c.clientes.creditBody)}</p>
                      <ul className="space-y-2">
                        {c.clientes.creditItems.map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700">{tx(item)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(UI_LABELS.tipLabel)}</p>
                          <p className="text-sm text-blue-700">{tx(c.clientes.tipText)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Orçamentos */}
                {renderSection(
                  'orcamentos',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.orcamentos.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.orcamentos.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.orcamentos.stepsTitle)}</h4>
                      <div className="bg-gray-50 rounded-xl p-6">
                        <ol className="space-y-3">
                          {c.orcamentos.steps.map((s, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {i + 1}
                              </span>
                              <span>{tx(s)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.orcamentos.statusTitle)}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {c.orcamentos.statuses.map((s, i) => (
                          <div key={i} className="p-3 rounded-lg bg-gray-100">
                            <p className="font-medium text-gray-800">{tx(s.status)}</p>
                            <p className="text-xs text-gray-600">{tx(s.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(c.orcamentos.pdfNoveltyTitle)}</p>
                          <p className="text-sm text-blue-700">{tx(c.orcamentos.pdfNoveltyBody)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.orcamentos.convertTitle)}</h4>
                      <p className="text-gray-600">{tx(c.orcamentos.convertBody)}</p>
                    </div>
                  </div>
                )}

                {/* 7. Vendas */}
                {renderSection(
                  'vendas',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.vendas.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.vendas.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.vendas.paymentMethodsTitle)}</h4>
                      <div className="flex flex-wrap gap-2">
                        {c.vendas.paymentMethods.map((p, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {tx(p)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.vendas.installmentsTitle)}</h4>
                      <p className="text-gray-600">{tx(c.vendas.installmentsBody)}</p>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(c.vendas.pdfNoveltyTitle)}</p>
                          <p className="text-sm text-blue-700">{tx(c.vendas.pdfNoveltyBody)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.vendas.stockTitle)}</h4>
                      <p className="text-gray-600">{tx(c.vendas.stockBody)}</p>
                    </div>
                  </div>
                )}

                {/* 8. Cobranças */}
                {renderSection(
                  'cobrancas',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.cobrancas.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.cobrancas.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.cobrancas.flowTitle)}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {c.cobrancas.statuses.map((s, i) => (
                          <div key={i} className="p-3 rounded-lg bg-gray-100">
                            <p className="font-medium text-gray-800 text-sm">{tx(s.status)}</p>
                            <p className="text-xs text-gray-600">{tx(s.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.cobrancas.gpsTitle)}</h4>
                      <p className="text-gray-600">{tx(c.cobrancas.gpsBody)}</p>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Receipt className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(c.cobrancas.pdfNoveltyTitle)}</p>
                          <p className="text-sm text-blue-700">{tx(c.cobrancas.pdfNoveltyBody)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.cobrancas.commissionTitle)}</h4>
                      <p className="text-gray-600">{tx(c.cobrancas.commissionBody)}</p>
                    </div>
                  </div>
                )}

                {/* 9. Fornecedores */}
                {renderSection(
                  'fornecedores',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.fornecedores.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.fornecedores.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.fornecedores.infoTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900 mb-2">{tx(c.fornecedores.registrationTitle)}</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {c.fornecedores.registration.map((r, i) => (
                              <li key={i}>- {tx(r)}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="font-medium text-gray-900 mb-2">{tx(c.fornecedores.commercialTitle)}</p>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {c.fornecedores.commercial.map((r, i) => (
                              <li key={i}>- {tx(r)}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.fornecedores.relationTitle)}</h4>
                      <p className="text-gray-600 mb-3">{tx(c.fornecedores.relationBody)}</p>
                      <ul className="space-y-2">
                        {c.fornecedores.relation.map((r, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-gray-700">{tx(r)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 10. Compras */}
                {renderSection(
                  'compras',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.compras.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.compras.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.compras.stepsTitle)}</h4>
                      <div className="space-y-4">
                        {c.compras.steps.map((s, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{tx(s.title)}</p>
                            <p className="text-sm text-gray-600">{tx(s.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                      <p className="font-medium text-orange-800">{tx(c.compras.payablesTitle)}</p>
                      <p className="text-sm text-orange-700 mt-1">{tx(c.compras.payablesBody)}</p>
                    </div>
                  </div>
                )}

                {/* 11. Produção */}
                {renderSection(
                  'producao',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.producao.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.producao.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.producao.statusTitle)}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {c.producao.statuses.map((s, i) => (
                          <div key={i} className="p-2 rounded-lg text-center text-sm bg-gray-100 text-gray-700">
                            {tx(s)}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.producao.flowTitle)}</h4>
                      <div className="space-y-4">
                        {c.producao.flow.map((f, i) => (
                          <div key={i} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <Layers className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{tx(f.title)}</p>
                              <p className="text-sm text-gray-600">{tx(f.desc)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(UI_LABELS.infoLabel)}</p>
                          <p className="text-sm text-blue-700">{tx(c.producao.traceabilityText)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 12. Estoque */}
                {renderSection(
                  'estoque',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.estoque.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.estoque.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.estoque.locationTitle)}</h4>
                      <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
                        <div className="p-6 bg-blue-100 rounded-xl text-center">
                          <Warehouse className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                          <p className="font-semibold text-blue-900">{tx(c.estoque.space)}</p>
                          <p className="text-xs text-blue-700">{tx(c.estoque.spaceExample)}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 hidden md:block" />
                        <div className="p-6 bg-green-100 rounded-xl text-center">
                          <Layers className="w-8 h-8 text-green-600 mx-auto mb-2" />
                          <p className="font-semibold text-green-900">{tx(c.estoque.shelf)}</p>
                          <p className="text-xs text-green-700">{tx(c.estoque.shelfExample)}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-gray-400 hidden md:block" />
                        <div className="p-6 bg-purple-100 rounded-xl text-center">
                          <Box className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <p className="font-semibold text-purple-900">{tx(c.estoque.section)}</p>
                          <p className="text-xs text-purple-700">{tx(c.estoque.sectionExample)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.estoque.featuresTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.estoque.features.map((f, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900 mb-2">{tx(f.title)}</p>
                            <p className="text-sm text-gray-600">{tx(f.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 13. Serviços */}
                {renderSection(
                  'servicos',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.servicos.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.servicos.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.servicos.flowTitle)}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">Status</th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Descrição' : 'Descripción'}
                              </th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Ação' : 'Acción'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.servicos.statuses.map((s, i) => (
                              <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                                <td className="border border-gray-200 px-4 py-3">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                    {tx(s.status)}
                                  </span>
                                </td>
                                <td className="border border-gray-200 px-4 py-3">{tx(s.desc)}</td>
                                <td className="border border-gray-200 px-4 py-3">{tx(s.action)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.servicos.infoTitle)}</h4>
                      <ul className="space-y-2">
                        {c.servicos.info.map((i, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span>{tx(i)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 14. Vendedores */}
                {renderSection(
                  'vendedores',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.vendedores.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.vendedores.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.vendedores.permissionsTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.vendedores.permissions.map((p, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{tx(p.title)}</p>
                            <p className="text-sm text-gray-600">{tx(p.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-800">{tx(c.vendedores.commissionTitle)}</p>
                          <p className="text-sm text-green-700">{tx(c.vendedores.commissionBody)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 15. Mobile */}
                {renderSection(
                  'mobile',
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                        {tx(UI_LABELS.novelty)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.mobile.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.mobile.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.mobile.featuresTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.mobile.features.map((f, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900">{tx(f.title)}</p>
                            <p className="text-sm text-gray-600">{tx(f.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.mobile.setupTitle)}</h4>
                      <div className="bg-blue-50 rounded-xl p-6">
                        <ol className="space-y-3">
                          {c.mobile.setupSteps.map((s, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {i + 1}
                              </span>
                              <span>{tx(s)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">v1.3.1</p>
                          <p className="text-sm text-blue-700">{tx(c.mobile.versionInfo)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 16. PDFs */}
                {renderSection(
                  'pdfs',
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-semibold">
                        {tx(UI_LABELS.novelty)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.pdfs.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.pdfs.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.pdfs.modesTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl">
                          <h5 className="font-bold mb-2">{tx(c.pdfs.elegantTitle)}</h5>
                          <p className="text-sm text-blue-100">{tx(c.pdfs.elegantBody)}</p>
                        </div>
                        <div className="p-6 bg-gray-100 border-2 border-gray-300 rounded-xl">
                          <h5 className="font-bold mb-2 text-gray-900">{tx(c.pdfs.printTitle)}</h5>
                          <p className="text-sm text-gray-700">{tx(c.pdfs.printBody)}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.pdfs.documentsTitle)}</h4>
                      <div className="space-y-3">
                        {c.pdfs.documents.map((d, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{tx(d.title)}</p>
                              <p className="text-sm text-gray-600">{tx(d.desc)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(c.pdfs.customizationTitle)}</p>
                          <p className="text-sm text-blue-700">{tx(c.pdfs.customizationBody)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 17. Financeiro */}
                {renderSection(
                  'financeiro',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.financeiro.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.financeiro.body)}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                        <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5" />
                          {tx(c.financeiro.receivablesTitle)}
                        </h4>
                        <p className="text-sm text-green-800">{tx(c.financeiro.receivablesBody)}</p>
                      </div>
                      <div className="p-6 bg-orange-50 border-2 border-orange-200 rounded-xl">
                        <h4 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          {tx(c.financeiro.payablesTitle)}
                        </h4>
                        <p className="text-sm text-orange-800">{tx(c.financeiro.payablesBody)}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.financeiro.cashflowTitle)}</h4>
                      <p className="text-gray-600">{tx(c.financeiro.cashflowBody)}</p>
                    </div>
                  </div>
                )}

                {/* 18. Relatórios */}
                {renderSection(
                  'relatorios',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.relatorios.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.relatorios.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.relatorios.availableTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.relatorios.available.map((cat, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="font-medium text-gray-900 mb-2">{tx(cat.title)}</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {cat.items.map((item, j) => (
                                <li key={j}>- {tx(item)}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 19. Usuários */}
                {renderSection(
                  'usuarios',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.usuarios.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.usuarios.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.usuarios.profilesTitle)}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Perfil' : 'Perfil'}
                              </th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Descrição' : 'Descripción'}
                              </th>
                              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                                {lang === 'pt' ? 'Acesso' : 'Acceso'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {c.usuarios.profiles.map((p, i) => (
                              <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                                <td className="border border-gray-200 px-4 py-3 font-medium">{tx(p.role)}</td>
                                <td className="border border-gray-200 px-4 py-3">{tx(p.desc)}</td>
                                <td className="border border-gray-200 px-4 py-3">{tx(p.access)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">{tx(UI_LABELS.importantLabel)}</p>
                          <p className="text-sm text-amber-700">{tx(c.usuarios.importantText)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 20. Configurações */}
                {renderSection(
                  'configuracoes',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.configuracoes.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.configuracoes.body)}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.configuracoes.documentsTitle)}</h4>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 mb-3">{tx(c.configuracoes.documentsBody)}</p>
                        <ul className="space-y-2">
                          {c.configuracoes.documents.map((d, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span>{tx(d)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">{tx(c.configuracoes.otherTitle)}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {c.configuracoes.other.map((o, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg">
                            <p className="font-medium text-gray-900 mb-2">{tx(o.title)}</p>
                            <p className="text-sm text-gray-600">{tx(o.desc)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-800">{tx(UI_LABELS.tipLabel)}</p>
                          <p className="text-sm text-blue-700">{tx(c.configuracoes.backupTip)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 21. Dicas */}
                {renderSection(
                  'dicas',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.dicas.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.dicas.body)}</p>
                    </div>
                    <div className="space-y-4">
                      {c.dicas.tips.map((t, i) => (
                        <div key={i} className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                          <p className="font-medium text-blue-900 mb-1">{tx(t.title)}</p>
                          <p className="text-sm text-blue-800">{tx(t.body)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 22. Suporte */}
                {renderSection(
                  'suporte',
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{tx(c.suporte.heading)}</h3>
                      <p className="text-gray-600 mb-4">{tx(c.suporte.body)}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <Book className="w-8 h-8 text-blue-600 mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-2">{tx(c.suporte.manualTitle)}</h4>
                        <p className="text-sm text-gray-600">{tx(c.suporte.manualBody)}</p>
                      </div>
                      <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200">
                        <Users className="w-8 h-8 text-green-600 mb-3" />
                        <h4 className="font-semibold text-gray-900 mb-2">{tx(c.suporte.adminTitle)}</h4>
                        <p className="text-sm text-gray-600">{tx(c.suporte.adminBody)}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-blue-50 rounded-xl">
                      <h4 className="font-semibold text-blue-900 mb-3">{tx(c.suporte.ejrTitle)}</h4>
                      <p className="text-sm text-blue-800 mb-4">{tx(c.suporte.ejrBody)}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-blue-700">
                          <span className="font-medium">{tx(c.suporte.developedBy)}</span>
                          <span>EJR Robótica Educacional</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-gray-500 mt-8">
                      <p>EJR Organizador - {tx(UI_LABELS.systemTitle)}</p>
                      <p>
                        {tx(UI_LABELS.version)} 1.3.1 - {new Date().getFullYear()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-12 text-center py-8 border-t border-gray-200">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">EJR</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">EJR Organizador</p>
                    <p className="text-sm text-gray-500">{tx(UI_LABELS.systemTitle)}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">{tx(UI_LABELS.developedBy)}</p>
                <p className="text-xs text-gray-400 mt-2">
                  © {new Date().getFullYear()} - {tx(UI_LABELS.allRightsReserved)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
