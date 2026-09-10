import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, ListChecks, Search, Plus, Upload, Eye, EyeOff, X,
  Building2, AlertTriangle, Clock, ChevronRight, FileStack, Timer,
  ClipboardCheck, History, Download, MessageSquarePlus, CheckCircle2,
  XCircle, MinusCircle, Filter, ChevronLeft, ChevronDown, Layers,
  Link2, Lock, Wrench, FileSignature, Pencil, Trash2, PlusCircle, LogOut, Users,
  ArrowUp, ArrowDown, ArrowUpDown, Save, RotateCcw, ClipboardList
} from "lucide-react";

/* ============================================================
   CONEXÃO COM O BANCO DE DADOS (Supabase)
   Troque os dois valores abaixo pelos do SEU projeto Supabase:
   painel do Supabase → Project Settings → API → "Project URL" e
   a chave "anon public" (a chave "service_role" NUNCA vai aqui).
   ============================================================ */
const SUPABASE_URL = "https://qqgxkuryutxnbohdoaiu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sRGEkKQgw3XjNh_d3_uFJw_3VY52lTY";
const SUPABASE_CONFIGURADO = SUPABASE_URL.startsWith("http");
const supabase = createClient(
  SUPABASE_CONFIGURADO ? SUPABASE_URL : "https://placeholder.supabase.co",
  SUPABASE_CONFIGURADO ? SUPABASE_ANON_KEY : "placeholder-key-not-configured"
);

/* ============================================================
   DESIGN TOKENS
   ============================================================ */
const COLORS = {
  bg: "#0a1420", panel: "#101f30", panelAlt: "#16283d", panelSoft: "#132436",
  border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.14)",
  steel: "#8493a6", steelLight: "#b7c2cf", ice: "#eef2f6",
  red: "#e1483d", redDim: "rgba(225,72,61,0.16)",
  green: "#3ecf8e", greenDim: "rgba(62,207,142,0.15)",
  yellow: "#e8c547", yellowDim: "rgba(232,197,71,0.15)",
  orange: "#f2894b", orangeDim: "rgba(242,137,75,0.15)",
  blue: "#4a90d9", blueDim: "rgba(74,144,217,0.15)",
  gray: "#5b6675", grayDim: "rgba(91,102,117,0.18)",
  overdue: "#c23b32", overdueDim: "rgba(194,59,50,0.20)",
};

/* ============================================================
   MARCA/TEMA — logo e até 3 cores personalizáveis pelo
   administrador (branco-rótulo: o mesmo sistema pode ser vendido
   para outras empresas). Variáveis mutáveis a nível de módulo,
   aplicadas antes da primeira renderização.
   ============================================================ */
let LOGO_BASE64 = null;
let NOME_RESPONSAVEL = "Primers";
function rotuloResponsavel(valor) { return valor === "Primers" ? NOME_RESPONSAVEL : valor; }
function hexParaRgba(hex, alpha) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return `rgba(225,72,61,${alpha})`;
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function ajustarClaridade(hex, fator) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const canal = (i) => Math.min(255, Math.round(parseInt(h.substring(i, i + 2), 16) * fator));
  const hex2 = (n) => n.toString(16).padStart(2, "0");
  return `#${hex2(canal(0))}${hex2(canal(2))}${hex2(canal(4))}`;
}
function aplicarTema(cfg) {
  if (!cfg) return;
  if (cfg.cor_primaria) { COLORS.red = cfg.cor_primaria; COLORS.redDim = hexParaRgba(cfg.cor_primaria, 0.16); }
  if (cfg.cor_fundo) COLORS.bg = cfg.cor_fundo;
  if (cfg.cor_painel) {
    COLORS.panel = cfg.cor_painel;
    COLORS.panelAlt = ajustarClaridade(cfg.cor_painel, 1.35);
    COLORS.panelSoft = ajustarClaridade(cfg.cor_painel, 1.18);
  }
  LOGO_BASE64 = cfg.logo_base64 || null;
  NOME_RESPONSAVEL = cfg.nome_empresa && cfg.nome_empresa.trim() ? cfg.nome_empresa.trim() : "Primers";
}

/* ============================================================
   MODELO DE STATUS — cada status tem um responsável pela próxima ação
   ============================================================ */
const STATUS_CONFIG = {
  aguardando: { label: "Aguardando", responsavel: "Primers", fg: COLORS.steel, bg: COLORS.grayDim, final: false, grupo: "aguardando" },
  iniciado: { label: "Iniciado", responsavel: "Primers", fg: COLORS.blue, bg: COLORS.blueDim, final: false, grupo: "iniciado" },
  em_montagem: { label: "Em montagem", responsavel: "Primers", fg: COLORS.orange, bg: COLORS.orangeDim, final: false, grupo: "montagem" },
  protocolado: { label: "Protocolado — aguardando análise", labelServico: "Serviço iniciado", responsavel: "Órgão", fg: COLORS.blue, bg: COLORS.blueDim, final: false, grupo: "analise" },
  exigencia_primers: { label: "Em exigência — aguardando atendimento", labelServico: "Pendência interna — aguardando atendimento", responsavel: "Primers", fg: COLORS.orange, bg: COLORS.orangeDim, final: false, grupo: "exigencia" },
  exigencia_cliente: { label: "Em exigência — aguardando retorno do cliente", labelServico: "Aguardando retorno do cliente", responsavel: "Cliente", fg: COLORS.yellow, bg: COLORS.yellowDim, final: false, grupo: "exigencia" },
  exigencia_atendida: { label: "Exigência atendida — Aguardando análise", labelServico: "Exigência atendida — em análise", responsavel: "Órgão", fg: COLORS.blue, bg: COLORS.blueDim, final: false, grupo: "analise" },
  aguardando_orgao: { label: "Aguardando retorno do órgão", labelServico: "Em execução", responsavel: "Órgão", fg: COLORS.blue, bg: COLORS.blueDim, final: false, grupo: "analise" },
  concluido: { label: "Concluído / Deferido", labelServico: "Concluído", responsavel: "Finalizado", fg: COLORS.green, bg: COLORS.greenDim, final: true, grupo: "concluido" },
  indeferido: { label: "Indeferido", responsavel: "Finalizado", fg: "#ffb3ac", bg: COLORS.overdueDim, final: true, grupo: "indeferido" },
  cancelado: { label: "Cancelado", responsavel: "Finalizado", fg: COLORS.steel, bg: COLORS.grayDim, final: true, grupo: "cancelado" },
  suspenso: { label: "Suspenso", responsavel: "Cliente", fg: COLORS.yellow, bg: COLORS.yellowDim, final: false, grupo: "exigencia" },
};
const STATUS_KEYS = Object.keys(STATUS_CONFIG);
const RESPONSAVEIS = ["Primers", "Cliente", "Órgão", "Finalizado"];
/* Rótulo do status considerando o tipo: Serviço Técnico usa um
   vocabulário próprio (ex: "Serviço iniciado" em vez de
   "Protocolado", que é conceito exclusivo de Processo). */
function statusLabel(chave, tipo) {
  const cfg = STATUS_CONFIG[chave];
  if (!cfg) return chave;
  return (tipo === "Serviço Técnico" && cfg.labelServico) ? cfg.labelServico : cfg.label;
}
/* Compara uma data prevista com a data real e devolve se ficou
   adiantado, no prazo ou atrasado — usado para destacar isso na
   linha do tempo, no relatório e no status de serviço. */
function compararPrazo(previsto, real) {
  if (!previsto || !real) return null;
  const dPrev = new Date(previsto + "T00:00:00");
  const dReal = new Date(real + "T00:00:00");
  const dias = Math.round((dReal - dPrev) / 86400000);
  if (dias < 0) return { status: "antecipado", dias: Math.abs(dias), texto: `concluído ${Math.abs(dias)} dia(s) antes do previsto` };
  if (dias > 0) return { status: "atrasado", dias, texto: `concluído ${dias} dia(s) após o previsto` };
  return { status: "no_prazo", dias: 0, texto: "concluído na data prevista" };
}

const ATUALIZACAO_TIPOS = [
  "Atendimento presencial", "Atendimento online", "Comunique-se / Exigência recebida",
  "Reunião / Alinhamento com cliente", "Tramitação / Movimentação processual",
  "Cobrança de celeridade ao órgão", "Retorno do cliente", "Outro",
];

/* ============================================================
   TEMPLATES DE CHECKLIST TÉCNICO
   ============================================================ */
const CHECKLIST_TEMPLATES = {
  default: {
    nome: "Checklist padrão de serviço",
    secoes: [
      { titulo: "Preparação", itens: [
        { texto: "Documentação societária / cadeia de poderes conferida" },
        { texto: "Procuração e ART/RRT do responsável técnico" },
        { texto: "Documentos do imóvel (matrícula, IPTU) conferidos" },
        { texto: "Requisitos específicos do órgão levantados" },
        { texto: "Pré-protocolo / análise técnica concluída" },
      ]},
      { titulo: "Protocolo", itens: [
        { texto: "Taxas e emolumentos pagos" },
        { texto: "Documentação do cliente completa e validada" },
        { texto: "Conferência final antes do protocolo" },
      ]},
    ],
  },
  pmsp_projeto: {
    nome: "Checklist — Aprovação de Projeto (PMSP)",
    secoes: [
      { titulo: "Levantamento Planialtimétrico", itens: [
        { texto: "Medidas do terreno R=Real / E=Escritura" },
        { texto: "Medidas lineares do perímetro (divergência R x E ≤ 5%)" },
        { texto: "Área total do terreno R e E (divergência ≤ 5%)" },
        { texto: "Ângulos internos do terreno" },
        { texto: "Cotas de nível (vértices, área interna, calçada e rua) — compatibilizar com Geosampa" },
        { texto: "Edificação existente (a reformar / demolir / regularizar)" },
        { texto: "Árvores internas existentes" },
        { texto: "Área permeável existente" },
        { texto: "Largura de calçada e via (até o outro lado da rua)" },
        { texto: "Nº da matrícula indicado em planta" },
        { texto: "CODLOG da rua indicado em planta" },
        { texto: "Nº do SQL indicado em planta" },
        { texto: "Numeração predial e SQL dos vizinhos" },
        { texto: "Infraestrutura existente indicada (árvores, postes, semáforos, boca de lobo)" },
        { texto: "Curvas de nível (base Geosampa)" },
        { texto: "Legenda (existente regular/irregular, a reformar/regularizar/demolir)" },
        { texto: "Notas de projeto obrigatórias", detalhe: "Córregos/águas/galerias; árvores no local; postes e mobiliário urbano em frente ao lote; demolição (m² e hachura); rede de gás; rede de água/esgoto; passeio público (Decreto 58.611/2019)." },
        { texto: "Carimbo completo", detalhe: "Título, assunto, endereço + CEP, CODLOG, Prefeitura Regional, categoria de uso, zoneamento, quota ambiental, proprietário (CPF/CNPJ), SQL, escala, quadro de áreas (R e E + matrícula), declarações e assinaturas (proprietário, autor do projeto, responsável técnico com CREA/CAU/CCM)." },
      ]},
      { titulo: "Plantas", itens: [
        { texto: "Áreas permeáveis propostas indicadas e numeradas" },
        { texto: "Vagas PCD / Idoso / Carga-Descarga / Motocicletas indicadas" },
        { texto: "Sentido de fluxo interno de veículos" },
        { texto: "Entrada e saída de veículos e pedestres" },
        { texto: "Passeio público cimentado em toda a extensão" },
        { texto: "Rebaixos de guia propostos" },
        { texto: "Áreas computáveis e não computáveis corretas" },
        { texto: "Edificações numeradas, categoria de uso, hachuras, área e cota de nível" },
        { texto: "Perspectiva simplificada dos reservatórios (se Quota Ambiental)" },
        { texto: "Pavimentos superiores sem repetir dados de rua/calçada" },
        { texto: "Linha de corte até o limite do terreno e da rua" },
        { texto: "Quadro de áreas por pavimento + total geral" },
        { texto: "Quadro de áreas: TO, CA e quota de garagem utilizada" },
        { texto: "Quadro de vagas de automóveis conforme padrão da Prefeitura" },
        { texto: "Quadro de áreas permeáveis" },
        { texto: "Legenda completa conforme o projeto pretendido" },
        { texto: "Notas obrigatórias de legislação", detalhe: "Leis 16.050/2014, 16.402/2016, 16.642/2017 + Decreto 57.776/2017 (águas pluviais, estacionamento, instalações sanitárias), rede de gás/água/esgoto, Decreto 58.611/19, aquecimento solar, lotação e sanitários." },
        { texto: "Notas conforme uso e licenças envolvidas", detalhe: "Dimensões de vagas, rampas/inclinação, distância a sanitários, acessibilidade (NBR 9050), iluminação/ventilação mecânica, vestiários, amianto (Lei 13.113/2011), aberturas para vizinho, aeração/insolação." },
        { texto: "Quadro de uso e ocupação do solo completo", detalhe: "Macrozona, macroárea, zona de uso, TO, CA mínimo/básico/máximo/utilizado, permeabilidade, vagas, cota de garagem, área não computável, área construída total." },
        { texto: "Carimbo (conforme levantamento, alterando título e quadro de áreas)" },
      ]},
      { titulo: "Cortes", itens: [
        { texto: "Cortes transversal e longitudinal por toda a extensão do terreno até a rua" },
        { texto: "PNT — Perfil Natural do Terreno indicado (base Geosampa)" },
        { texto: "Volume de aterro demonstrado por hachuras" },
        { texto: "Muros de arrimo cotados (planta e corte)" },
        { texto: "Limite do terreno indicado" },
        { texto: "Corte apenas das alturas" },
        { texto: "Alturas cotadas a partir do PNT (início e fim da edificação)" },
        { texto: "Gabarito de altura cotado a partir do PNT" },
      ]},
      { titulo: "Planta de Quota Ambiental", itens: [
        { texto: "Edificações hachuradas em cinza (\"edificação / área ocupada\")" },
        { texto: "Itens de pontuação apresentados (permeável, piso drenante, muro/cobertura verde, vegetação)" },
        { texto: "Perspectiva simplificada dos reservatórios (Art. 79 e 80 da Lei 16.402)" },
        { texto: "Quadro de composição da pontuação da Quota Ambiental" },
        { texto: "Carimbo, notas, legenda e quadro conforme as plantas" },
      ]},
    ],
  },
};

function pickTemplateId(assunto) {
  const a = (assunto || "").toLowerCase();
  if (a.includes("aprovação de projeto") || a.includes("aprovacao de projeto")) return "pmsp_projeto";
  return "default";
}

function instantiateChecklist(templateId) {
  const tpl = CHECKLIST_TEMPLATES[templateId] || CHECKLIST_TEMPLATES.default;
  return {
    templateId,
    secoes: tpl.secoes.map((sec, si) => ({
      titulo: sec.titulo,
      itens: sec.itens.map((it, ii) => ({
        id: `${si}-${ii}`, texto: it.texto, detalhe: it.detalhe || null,
        estado: "pendente", obs: "",
      })),
    })),
  };
}

/* ============================================================
   DOCUMENTOS EXIGIDOS — checklist documental por tipo de serviço
   (controle de qualidade do protocolo: o que precisa estar no
   processo, e não apenas o desenho em si)
   ============================================================ */
const DOC_TEMPLATES = {
  default: {
    nome: "Documentos padrão de serviço",
    categorias: [
      { titulo: "Documentação geral", itens: [
        { texto: "Documento de identificação do requerente / representante", obrigatorio: true },
        { texto: "Comprovante de propriedade ou posse do imóvel", obrigatorio: true },
        { texto: "Procuração (quando houver procurador)", obrigatorio: false, condicionalLabel: "Há procurador neste serviço?" },
      ]},
    ],
  },
  pmsp_projeto: {
    nome: "Documentos — Aprovação de Projeto (PMSP)",
    categorias: [
      { titulo: "Proprietário do imóvel", itens: [
        { texto: "Matrícula atualizada do imóvel, registrando o proprietário", obrigatorio: true },
        { texto: "Contrato Social (se proprietário pessoa jurídica)", obrigatorio: false, condicionalLabel: "Proprietário é pessoa jurídica?" },
        { texto: "Ata de Eleição dos representantes (se pessoa jurídica)", obrigatorio: false, condicionalLabel: "Proprietário é pessoa jurídica?" },
        { texto: "Documento de identificação do representante legal", obrigatorio: true },
      ]},
      { titulo: "Procurador", itens: [
        { texto: "Procuração assinada por representante legal devidamente constituído", obrigatorio: false, condicionalLabel: "Há procurador neste serviço?" },
        { texto: "Documento de identificação do procurador", obrigatorio: false, condicionalLabel: "Há procurador neste serviço?" },
        { texto: "Contrato de locação com cláusula de outorga de poderes ao locatário", obrigatorio: false, condicionalLabel: "Requerente é o locatário (imóvel locado)?", detalhe: "Indispensável quando o locatário será registrado como requerente perante o órgão." },
      ]},
      { titulo: "Dados do terreno", itens: [
        { texto: "Conferência de medidas (linear e área) — divergência ≤ 5% entre matrícula e levantamento", obrigatorio: true },
        { texto: "Endereço completo e CEP", obrigatorio: true },
        { texto: "SQL", obrigatorio: true },
        { texto: "CODLOG", obrigatorio: true },
        { texto: "Subprefeitura", obrigatorio: true },
        { texto: "Macroárea", obrigatorio: true },
        { texto: "Macrozona", obrigatorio: true },
        { texto: "Perímetro de Qualificação Ambiental", obrigatorio: true },
        { texto: "Zona de uso", obrigatorio: true },
      ]},
      { titulo: "Declarações", itens: [
        { texto: "Declaração de conformidade quanto aos aspectos interiores da edificação (COE e legislação correlata)", obrigatorio: true },
        { texto: "Declaração ou Inexigibilidade — COMAER", obrigatorio: true },
        { texto: "Declaração de Movimento de Terra", obrigatorio: false, condicionalLabel: "Há movimento de terra no projeto?" },
        { texto: "Declaração para licenciamento de equipamento mecânico (transporte permanente / tanque / bomba / filtro de combustível / sistema especial de segurança)", obrigatorio: false, condicionalLabel: "Há equipamento mecânico permanente, tanque ou sistema especial de segurança?" },
      ]},
    ],
  },
};

function instantiateDocumentos(templateId) {
  const tpl = DOC_TEMPLATES[templateId] || DOC_TEMPLATES.default;
  return {
    templateId,
    categorias: tpl.categorias.map((cat, ci) => ({
      titulo: cat.titulo,
      itens: cat.itens.map((it, ii) => ({
        id: `${ci}-${ii}`, texto: it.texto, obrigatorio: it.obrigatorio, condicionalLabel: it.condicionalLabel || null,
        detalhe: it.detalhe || null, aplicavel: !it.condicionalLabel, estado: "pendente", arquivo: null, obs: "", validade: null,
      })),
    })),
  };
}

function documentosProgress(documentos) {
  const itens = (documentos && documentos.itens) || [];
  if (itens.length === 0) return 100;
  const ok = itens.filter((it) => it.status !== "Pendente").length;
  return Math.round((ok / itens.length) * 100);
}

function emptyParametrosUrbanisticos() {
  return {
    macrozona: "", macroarea: "", zonaUso: "", perimetroQualificacaoAmbiental: "",
    areaTerrenoEscritura: "", areaTerrenoReal: "", doacaoPasseio: "", areaRemanescente: "",
    taxaOcupacaoMaximaZona: "", areaProjecaoMaxima: "", taxaOcupacaoProjeto: "", areaProjecaoProjeto: "",
    caBasico: "", caMaximo: "", caUtilizado: "", areaComputavelUtilizada: "",
    taxaPermeabilidadeMinima: "", areaPermeavelExigida: "", taxaPermeabilidadeAdotada: "", areaPermeavelAdotada: "",
    areaNaoComputavel: "", areaConstruidaTotal: "",
  };
}

const PARAM_URB_FIELDS = [
  ["macrozona", "Macrozona"], ["macroarea", "Macroárea"], ["zonaUso", "Zona de uso"],
  ["perimetroQualificacaoAmbiental", "Perímetro de Qualificação Ambiental"],
  ["areaTerrenoEscritura", "Área de terreno — Escritura (m²)"], ["areaTerrenoReal", "Área de terreno — Real (m²)"],
  ["doacaoPasseio", "Doação de passeio público (m²)"], ["areaRemanescente", "Área remanescente (m²)"],
  ["taxaOcupacaoMaximaZona", "Taxa de ocupação máxima da zona"], ["areaProjecaoMaxima", "Área de projeção máxima (m²)"],
  ["taxaOcupacaoProjeto", "Taxa de ocupação utilizada no projeto"], ["areaProjecaoProjeto", "Área de projeção do projeto (m²)"],
  ["caBasico", "Coeficiente de aproveitamento básico"], ["caMaximo", "Coeficiente de aproveitamento máximo"],
  ["caUtilizado", "Coeficiente de aproveitamento utilizado"], ["areaComputavelUtilizada", "Área computável utilizada (m²)"],
  ["taxaPermeabilidadeMinima", "Taxa de permeabilidade mínima"], ["areaPermeavelExigida", "Área permeável exigida (m²)"],
  ["taxaPermeabilidadeAdotada", "Taxa de permeabilidade adotada"], ["areaPermeavelAdotada", "Área permeável adotada (m²)"],
  ["areaNaoComputavel", "Área não computável (m²)"], ["areaConstruidaTotal", "Área construída total da edificação (m²)"],
];

function emptyEnquadramentos() {
  return {
    alargamentoPasseio: { aplica: false, obs: "" },
    doacaoDUP: { aplica: false, obs: "" },
    areaTombada: { aplica: false, obs: "" },
    anuenciaMetro: { aplica: false, obs: "" },
  };
}
const ENQUADRAMENTOS_LABELS = {
  alargamentoPasseio: "Alargamento de passeio",
  doacaoDUP: "Doação de área / DUP (Declaração de Utilidade Pública)",
  areaTombada: "Área tombada ou envoltória",
  anuenciaMetro: "Anuência do Metrô",
};

const REGISTRO_TIPOS = ["CREA", "CAU"];
const VINCULO_TIPOS = ["Projeto", "Execução", "Projeto e Execução"];
function novoResponsavelTecnico() {
  return { id: Date.now() + Math.random(), vinculo: "Projeto", nome: "", cpf: "", registroTipo: "CREA", registroNumero: "", ccm: "", art: "", carteiraAnexada: false, artAnexada: false };
}

/* ============================================================
   DEPENDÊNCIAS ENTRE PROCESSOS
   ============================================================ */
function processoBloqueado(processo, todosProcessos) {
  if (!processo.dependeDeId) return null;
  const dep = todosProcessos.find((p) => p.id === processo.dependeDeId);
  if (!dep) return null;
  return STATUS_CONFIG[dep.statusAtual].final ? null : dep;
}
function mesLabel(iso) {
  if (!iso) return null;
  const [y, m] = iso.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}
const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_NOMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/* ============================================================
   DADOS DE EXEMPLO (mock)
   ============================================================ */
const hoje = new Date();
const d = (offsetDays) => { const dt = new Date(hoje); dt.setDate(dt.getDate() + offsetDays); return dt.toISOString().slice(0, 10); };

function baseProcesso(p) {
  return {
    id: p.id, cliente: p.cliente, unidade: p.unidade, cidade: p.cidade, uf: p.uf,
    assunto: p.assunto, tipo: p.tipo || "Processo", numero: p.numero || "-",
    statusAtual: p.statusAtual || "aguardando", prestador: p.prestador || "-", tecnico: p.tecnico || "-",
    dataInicio: p.dataInicio || null, dataPrevisaoAnaliseChecklist: p.dataPrevisaoAnaliseChecklist || null,
    dataPrevistaProtocolo: p.dataPrevistaProtocolo || null,
    dataProtocolo: p.dataProtocolo || null, dataPrevisaoOrgao: p.dataPrevisaoOrgao || null,
    dataExigenciaRecebida: p.dataExigenciaRecebida || null, dataExigenciaPrazoLimite: p.dataExigenciaPrazoLimite || null,
    dataAtendimentoTecnico: p.dataAtendimentoTecnico || null, dataAtendimentoExigencia: p.dataAtendimentoExigencia || null,
    dataConclusao: p.dataConclusao || null,
    dataPrevistaVistoria: p.dataPrevistaVistoria || null, dataPrevisaoEntrega: p.dataPrevisaoEntrega || null,
    vistoriaNecessaria: p.vistoriaNecessaria !== undefined ? p.vistoriaNecessaria : null, numeroProtocolo: p.numeroProtocolo || "-",
    cobrancas: p.cobrancas || [], pendenciaCliente: p.pendenciaCliente || { ativa: false, descricao: "" },
    ultimaAtualizacao: p.ultimaAtualizacao || d(0),
    site: p.site || "-", login: p.login || "-", senha: p.senha || "-",
    checklist: p.checklist || { itens: [] },
    documentos: p.documentos || { itens: [] },
    responsaveisTecnicos: p.responsaveisTecnicos || [],
    parametrosUrbanisticos: p.parametrosUrbanisticos || emptyParametrosUrbanisticos(),
    enquadramentos: p.enquadramentos || emptyEnquadramentos(),
    dependeDeId: p.dependeDeId || null,
    dependeDeOutros: p.dependeDeOutros || false, dependeDeOutrosDescricao: p.dependeDeOutrosDescricao || "",
    numeroContrato: p.numeroContrato || "-",
    parcelasContrato: p.parcelasContrato || [],
    atualizacoes: p.atualizacoes || [],
  };
}

const MOCK_PROCESSOS = [];

/* ============================================================
   CONVERSÃO BANCO ↔ APP — o banco usa snake_case (padrão do
   Postgres), o app usa camelCase. Essas funções traduzem nos
   dois sentidos, em um único lugar.
   ============================================================ */
function rowToProcesso(r) {
  return baseProcesso({
    id: r.id, cliente: r.cliente, unidade: r.unidade, cidade: r.cidade, uf: r.uf,
    assunto: r.assunto, tipo: r.tipo, numero: r.numero, tecnico: r.tecnico,
    statusAtual: r.status_atual, prestador: r.prestador,
    numeroContrato: r.numero_contrato,
    dataInicio: r.data_inicio, dataPrevisaoAnaliseChecklist: r.data_previsao_analise_checklist,
    dataPrevistaProtocolo: r.data_prevista_protocolo, dataProtocolo: r.data_protocolo,
    dataPrevisaoOrgao: r.data_previsao_orgao,
    dataExigenciaRecebida: r.data_exigencia_recebida, dataExigenciaPrazoLimite: r.data_exigencia_prazo_limite,
    dataAtendimentoTecnico: r.data_atendimento_tecnico, dataAtendimentoExigencia: r.data_atendimento_exigencia,
    dataConclusao: r.data_conclusao, dataPrevistaVistoria: r.data_prevista_vistoria, dataPrevisaoEntrega: r.data_previsao_entrega,
    vistoriaNecessaria: r.vistoria_necessaria, numeroProtocolo: r.numero_protocolo,
    ultimaAtualizacao: r.ultima_atualizacao,
    site: r.site, login: r.login, senha: r.senha,
    dependeDeId: r.depende_de_id, dependeDeOutros: r.depende_de_outros, dependeDeOutrosDescricao: r.depende_de_outros_descricao,
    checklist: (r.checklist && r.checklist.itens) ? r.checklist : undefined,
    documentos: (r.documentos && r.documentos.itens) ? r.documentos : undefined,
    responsaveisTecnicos: r.responsaveis_tecnicos || [],
    parametrosUrbanisticos: (r.parametros_urbanisticos && Object.keys(r.parametros_urbanisticos).length) ? r.parametros_urbanisticos : undefined,
    enquadramentos: (r.enquadramentos && Object.keys(r.enquadramentos).length) ? r.enquadramentos : undefined,
    cobrancas: r.cobrancas || [],
    pendenciaCliente: r.pendencia_cliente || { ativa: false, descricao: "" },
    parcelasContrato: r.parcelas_contrato || [],
    atualizacoes: r.atualizacoes || [],
  });
}
function processoToRow(p) {
  return {
    id: p.id, cliente: p.cliente, unidade: p.unidade, cidade: p.cidade, uf: p.uf,
    assunto: p.assunto, tipo: p.tipo, numero: p.numero, tecnico: p.tecnico,
    status_atual: p.statusAtual, prestador: p.prestador,
    numero_contrato: p.numeroContrato,
    data_inicio: p.dataInicio || null, data_previsao_analise_checklist: p.dataPrevisaoAnaliseChecklist || null,
    data_prevista_protocolo: p.dataPrevistaProtocolo || null, data_protocolo: p.dataProtocolo || null,
    data_previsao_orgao: p.dataPrevisaoOrgao || null,
    data_exigencia_recebida: p.dataExigenciaRecebida || null, data_exigencia_prazo_limite: p.dataExigenciaPrazoLimite || null,
    data_atendimento_tecnico: p.dataAtendimentoTecnico || null, data_atendimento_exigencia: p.dataAtendimentoExigencia || null,
    data_conclusao: p.dataConclusao || null, data_prevista_vistoria: p.dataPrevistaVistoria || null, data_previsao_entrega: p.dataPrevisaoEntrega || null,
    vistoria_necessaria: p.vistoriaNecessaria, numero_protocolo: p.numeroProtocolo,
    ultima_atualizacao: p.ultimaAtualizacao || null,
    site: p.site, login: p.login, senha: p.senha,
    depende_de_id: p.dependeDeId, depende_de_outros: p.dependeDeOutros, depende_de_outros_descricao: p.dependeDeOutrosDescricao,
    checklist: p.checklist, documentos: p.documentos,
    responsaveis_tecnicos: p.responsaveisTecnicos,
    parametros_urbanisticos: p.parametrosUrbanisticos,
    enquadramentos: p.enquadramentos,
    cobrancas: p.cobrancas,
    pendencia_cliente: p.pendenciaCliente,
    parcelas_contrato: p.parcelasContrato,
    atualizacoes: p.atualizacoes,
  };
}
function rowToContrato(r) {
  return {
    id: r.id, proposta: r.proposta, cliente: r.cliente, unidade: r.unidade, codigoLoja: r.codigo_loja,
    servico: r.servico, tarefa: r.tarefa, tecnico: r.tecnico, coordenador: r.coordenador, tipo: r.tipo,
    dataSLA: r.data_sla, dataSLAServico: r.data_sla_servico,
    statusContrato: r.status_contrato, statusServico: r.status_servico, statusParcela: r.status_parcela,
    observacao: r.observacao,
  };
}
function contratoToRow(c) {
  return {
    id: c.id, proposta: c.proposta, cliente: c.cliente, unidade: c.unidade, codigo_loja: c.codigoLoja,
    servico: c.servico, tarefa: c.tarefa, tecnico: c.tecnico, coordenador: c.coordenador, tipo: c.tipo,
    data_sla: c.dataSLA || null, data_sla_servico: c.dataSLAServico || null,
    status_contrato: c.statusContrato, status_servico: c.statusServico, status_parcela: c.statusParcela,
    observacao: c.observacao,
  };
}
function rowToAgendaItem(r) {
  return { id: r.id, data: r.data, titulo: r.titulo, tipo: r.tipo, tecnico: r.tecnico, descricao: r.descricao };
}
function rowToEvento(r) {
  return { id: r.id, titulo: r.titulo, tipo: r.tipo, data: r.data, tecnicosObrigatorios: r.tecnicos_obrigatorios || [], presencas: r.presencas || {} };
}
function eventoToRow(e) {
  return { titulo: e.titulo, tipo: e.tipo, data: e.data, tecnicos_obrigatorios: e.tecnicosObrigatorios, presencas: e.presencas };
}

/* Chama o backend seguro (Edge Function) que cria/lista/remove acessos.
   Usa o token da sessão atual — nunca a chave secreta. */
async function callAdminUsers(action, payload) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  return resp.json();
}


/* ============================================================
   HELPERS
   ============================================================ */
function diasRestantes(proc) {
  if (!proc.dataPrevisaoOrgao) return null;
  return Math.round((new Date(proc.dataPrevisaoOrgao) - hoje) / 86400000);
}
function diasSemAtualizacao(proc) {
  if (!proc.ultimaAtualizacao) return null;
  return Math.round((hoje - new Date(proc.ultimaAtualizacao)) / 86400000);
}
function prazoInfo(dias) {
  if (dias === null) return { label: "—", fg: COLORS.steel, bg: "rgba(255,255,255,0.05)" };
  if (dias < 0) return { label: `Vencido (${Math.abs(dias)}d)`, fg: "#ffb3ac", bg: COLORS.overdueDim };
  if (dias <= 5) return { label: `${dias}d restantes`, fg: COLORS.red, bg: COLORS.redDim };
  if (dias <= 15) return { label: `${dias}d restantes`, fg: COLORS.orange, bg: COLORS.orangeDim };
  if (dias <= 30) return { label: `${dias}d restantes`, fg: COLORS.yellow, bg: COLORS.yellowDim };
  return { label: `${dias}d restantes`, fg: COLORS.green, bg: COLORS.greenDim };
}
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, dd] = iso.split("-");
  return `${dd}/${m}/${y}`;
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${fmtDate(iso.slice(0, 10))} às ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function checklistProgress(checklist) {
  const itens = (checklist && checklist.itens) || [];
  const aplicaveis = itens.filter((it) => it.status !== "N/A");
  if (aplicaveis.length === 0) return 100;
  const ok = aplicaveis.filter((it) => it.status === "Temos").length;
  return Math.round((ok / aplicaveis.length) * 100);
}
function csvEscape(v) {
  const s = (v === null || v === undefined) ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}
function downloadCSV(filename, rows) {
  const content = rows.map((r) => r.map(csvEscape).join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function fmtBytes(n) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* Monta a lista de pendências que bloqueiam um protocolo de qualidade */
function pendenciasProtocolo(processo) {
  const pendencias = [];
  (processo.documentos.itens || []).forEach((it) => {
    if (it.status === "Pendente") pendencias.push(`Documento pendente: ${it.nome}`);
    if (it.validade && new Date(it.validade) < hoje) pendencias.push(`Documento com validade vencida: ${it.nome} (venceu em ${fmtDate(it.validade)})`);
  });
  (processo.checklist.itens || []).forEach((it) => {
    if (it.status === "Não temos") pendencias.push(`Checklist: item faltando — ${it.item}`);
  });
  if (processo.responsaveisTecnicos.length === 0) pendencias.push("Nenhum responsável técnico cadastrado.");
  processo.responsaveisTecnicos.forEach((r) => {
    if (!r.nome || !r.registroNumero || !r.art) pendencias.push(`Dados incompletos do responsável técnico "${r.nome || "sem nome"}".`);
    if (!r.carteiraAnexada) pendencias.push(`Carteira profissional não anexada — ${r.nome || "responsável sem nome"}.`);
    if (!r.artAnexada) pendencias.push(`ART/RRT não anexada — ${r.nome || "responsável sem nome"}.`);
  });
  Object.entries(processo.enquadramentos).forEach(([k, v]) => {
    if (v.aplica && !v.obs) pendencias.push(`Enquadramento "${ENQUADRAMENTOS_LABELS[k]}" aplicável sem observação/anexo registrado.`);
  });
  if (processo.pendenciaCliente.ativa) pendencias.push(`Pendência do cliente em aberto: ${processo.pendenciaCliente.descricao || "sem descrição"}.`);
  return pendencias;
}

function gerarRelatorioHTML(processo) {
  const docPct = documentosProgress(processo.documentos);
  const chkPct = checklistProgress(processo.checklist);
  const pendencias = pendenciasProtocolo(processo);
  const pronto = pendencias.length === 0;
  const linhaDoc = (it) => `<tr><td>${it.nome}</td><td>${it.descricao || ""}</td><td>${it.status}</td><td>${fmtDate(it.validade)}</td><td>${it.observacao || ""}</td></tr>`;
  const linhaChk = (it) => `<tr><td>${it.item}</td><td>${it.status}</td></tr>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório — ${processo.assunto}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:900px;margin:0 auto;}
    h1{font-size:20px;border-bottom:3px solid #e1483d;padding-bottom:10px;}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#333;margin-top:26px;border-left:4px solid #16283d;padding-left:8px;}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
    td,th{border:1px solid #ccc;padding:6px 8px;text-align:left;}
    th{background:#f0f0f0;}
    .badge{display:inline-block;padding:3px 10px;border-radius:3px;font-size:11px;font-weight:bold;margin-right:6px;}
    .ok{background:#dff5e8;color:#117a45;} .warn{background:#fdece9;color:#a3261b;}
    .pend{margin:4px 0;font-size:12.5px;} .meta{font-size:12px;color:#555;margin-top:4px;}
  </style></head><body>
  <h1>Relatório de conformidade — ${processo.assunto}</h1>
  <div class="meta">${processo.cliente} — ${rotuloUnidade(processo.unidade, codigoUnidadeGlobal(processo.cliente, processo.unidade))} · ${processo.cidade}/${processo.uf} · ${processo.tipo === "Serviço Técnico" ? "Serviço" : "Processo"} nº ${processo.numero}</div>
  <div class="meta">Gerado em ${fmtDate(new Date().toISOString().slice(0,10))}</div>
  <p style="margin-top:16px;">
    <span class="badge ${pronto ? "ok" : "warn"}">${pronto ? "Pronto para protocolo" : `${pendencias.length} pendência(s) para protocolo`}</span>
    <span class="badge ${docPct === 100 ? "ok" : "warn"}">Documentos ${docPct}%</span>
    <span class="badge ${chkPct === 100 ? "ok" : "warn"}">Checklist técnico ${chkPct}%</span>
  </p>
  ${pendencias.length > 0 ? `<h2>Pendências identificadas</h2>${pendencias.map((p) => `<div class="pend">• ${p}</div>`).join("")}` : ""}
  <h2>Prazos das etapas</h2>
  <table><tr><th>Etapa</th><th>Previsto</th><th>Realizado</th><th>Situação</th></tr>
    <tr><td>Protocolo</td><td>${fmtDate(processo.dataPrevistaProtocolo)}</td><td>${fmtDate(processo.dataProtocolo)}</td><td>${calcularPrazo(processo.dataPrevistaProtocolo, processo.dataProtocolo) ? labelPrazo(calcularPrazo(processo.dataPrevistaProtocolo, processo.dataProtocolo)) : "—"}</td></tr>
    <tr><td>Atendimento de exigência</td><td>${fmtDate(processo.dataExigenciaPrazoLimite)}</td><td>${fmtDate(processo.dataAtendimentoExigencia)}</td><td>${calcularPrazo(processo.dataExigenciaPrazoLimite, processo.dataAtendimentoExigencia) ? labelPrazo(calcularPrazo(processo.dataExigenciaPrazoLimite, processo.dataAtendimentoExigencia)) : "—"}</td></tr>
    <tr><td>Conclusão</td><td>${fmtDate(processo.dataPrevisaoOrgao)}</td><td>${fmtDate(processo.dataConclusao)}</td><td>${calcularPrazo(processo.dataPrevisaoOrgao, processo.dataConclusao) ? labelPrazo(calcularPrazo(processo.dataPrevisaoOrgao, processo.dataConclusao)) : "—"}</td></tr>
  </table>
  <h2>Documentos recebidos / obtidos</h2>
  <table><tr><th>Documento</th><th>Descrição</th><th>Status</th><th>Validade</th><th>Observação</th></tr>${(processo.documentos.itens || []).map(linhaDoc).join("") || `<tr><td colspan="5">Nenhum documento registrado ainda.</td></tr>`}</table>
  <h2>Checklist</h2>
  <table><tr><th>Item exigido</th><th>Status</th></tr>${(processo.checklist.itens || []).map(linhaChk).join("") || `<tr><td colspan="2">Nenhum item de checklist registrado ainda.</td></tr>`}</table>
  </body></html>`;
}
function imprimirRelatorio(processo) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(gerarRelatorioHTML(processo));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

/* ============================================================
   ATOMS
   ============================================================ */
/* ============================================================
   ORDENAÇÃO DE TABELAS — clicar no título da coluna ordena a
   listagem (1º clique crescente, 2º decrescente, 3º volta ao
   padrão). Usada em todas as telas com tabela.
   ============================================================ */
function useOrdenacao(campoInicial = null, dirInicial = "asc") {
  const [ordem, setOrdem] = useState({ campo: campoInicial, dir: dirInicial });
  const ordenarPor = (campo) => setOrdem((o) => {
    if (o.campo !== campo) return { campo, dir: "asc" };
    if (o.dir === "asc") return { campo, dir: "desc" };
    return { campo: null, dir: "asc" };
  });
  return [ordem, ordenarPor];
}

function ordenarLista(lista, ordem, acessores = {}) {
  if (!ordem || !ordem.campo) return lista;
  const get = acessores[ordem.campo] || ((x) => x[ordem.campo]);
  const mult = ordem.dir === "asc" ? 1 : -1;
  const vazio = (v) => v === null || v === undefined || v === "" || v === "-" || v === "—";
  return [...lista].sort((a, b) => {
    const va = get(a), vb = get(b);
    if (vazio(va) && vazio(vb)) return 0;
    if (vazio(va)) return 1;
    if (vazio(vb)) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mult;
    if (va instanceof Date && vb instanceof Date) return (va - vb) * mult;
    return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * mult;
  });
}

/* Cabeçalho de coluna clicável. `campo` nulo = coluna não ordenável
   (checkbox, ações etc.), renderizada sem interação. */
function Th({ campo, ordem, ordenarPor, children, style }) {
  const base = {
    textAlign: "left", padding: "10px 16px", fontSize: 10.5, color: COLORS.steel,
    textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${COLORS.border}`,
    whiteSpace: "nowrap", ...style,
  };
  if (!campo) return <th style={base}>{children}</th>;
  const ativo = ordem && ordem.campo === campo;
  const Icone = !ativo ? ArrowUpDown : ordem.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th style={{ ...base, cursor: "pointer", userSelect: "none", color: ativo ? COLORS.ice : COLORS.steel }}
      onClick={() => ordenarPor(campo)} title="Clique para ordenar">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
        {children}
        <Icone size={11} color={ativo ? COLORS.red : COLORS.steel} style={{ opacity: ativo ? 1 : 0.45, flexShrink: 0 }} />
      </span>
    </th>
  );
}

/* ============================================================
   RASCUNHO GLOBAL — nada é gravado no banco enquanto o usuário
   não clicar em "Salvar alterações". Cada tela/pop-up registra
   aqui quantas alterações tem pendentes e como aplicá-las; a
   barra fixa no rodapé salva ou descarta tudo de uma vez.
   ============================================================ */
const RascunhoContext = React.createContext(null);
function useRascunho() { return React.useContext(RascunhoContext); }

function useRascunhoGlobal() {
  const [itens, setItens] = useState({});
  const [sinalDescarte, setSinalDescarte] = useState(0);
  const [salvoEm, setSalvoEm] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const registrar = React.useCallback((chave, qtd, aplicar) => {
    setItens((m) => {
      if (!qtd) {
        if (!(chave in m)) return m;
        const n = { ...m }; delete n[chave]; return n;
      }
      return { ...m, [chave]: { qtd, aplicar } };
    });
  }, []);

  const salvarTudo = React.useCallback(async () => {
    setSalvando(true);
    const atuais = Object.values(itens);
    for (const it of atuais) { try { await it.aplicar(); } catch (e) { console.error("Erro ao salvar alterações:", e); } }
    setItens({});
    setSalvando(false);
    setSalvoEm(new Date());
  }, [itens]);

  const descartarTudo = React.useCallback(() => { setItens({}); setSinalDescarte((v) => v + 1); }, []);

  const total = Object.values(itens).reduce((s, i) => s + i.qtd, 0);
  return { registrar, salvarTudo, descartarTudo, total, sinalDescarte, salvoEm, salvando };
}

/* Botão padrão de salvar, usado dentro dos pop-ups e no rodapé
   das telas que têm campos editáveis. */
function BotaoSalvar({ pendentes, onSalvar, onDescartar, salvando, compacto }) {
  const ativo = pendentes > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {ativo && onDescartar && (
        <button onClick={onDescartar} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: compacto ? "7px 12px" : "9px 16px", fontSize: 12.5, cursor: "pointer" }}>
          <RotateCcw size={13} /> Descartar
        </button>
      )}
      <button onClick={ativo ? onSalvar : undefined} disabled={!ativo || salvando} style={{
        display: "flex", alignItems: "center", gap: 7,
        background: ativo ? COLORS.green : "rgba(255,255,255,0.06)", border: "none",
        color: ativo ? "#0a1420" : COLORS.steel, borderRadius: 7,
        padding: compacto ? "7px 14px" : "9px 18px", fontSize: 12.5, fontWeight: 700,
        cursor: ativo && !salvando ? "pointer" : "default", fontFamily: "'Oswald', sans-serif",
        letterSpacing: "0.02em", textTransform: "uppercase",
      }}>
        <Save size={14} /> {salvando ? "Salvando..." : ativo ? `Salvar alterações (${pendentes})` : "Salvar alterações"}
      </button>
    </div>
  );
}

/* Barra fixa no rodapé — aparece em QUALQUER tela assim que
   existir alguma alteração ainda não gravada. */
function BarraRascunhoGlobal() {
  const r = useRascunho();
  if (!r) return null;
  if (r.total === 0) {
    if (!r.salvoEm) return null;
    return (
      <div style={{ position: "fixed", right: 22, bottom: 18, zIndex: 70, background: COLORS.greenDim, border: `1px solid ${COLORS.green}55`, color: COLORS.green, borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
        <CheckCircle2 size={14} /> Alterações salvas às {r.salvoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    );
  }
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 70, background: COLORS.panelAlt, borderTop: `1px solid ${COLORS.orange}66`, padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, boxShadow: "0 -8px 24px rgba(0,0,0,0.35)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, color: COLORS.ice }}>
        <AlertTriangle size={15} color={COLORS.orange} />
        <b>{r.total}</b> alteração(ões) ainda não salva(s)
        <span style={{ fontSize: 11.5, color: COLORS.steel }}>— nada foi gravado no banco de dados ainda.</span>
      </div>
      <BotaoSalvar pendentes={r.total} onSalvar={r.salvarTudo} onDescartar={r.descartarTudo} salvando={r.salvando} compacto />
    </div>
  );
}

/* Rótulo da unidade com o código da unidade na frente
   ("ANP - AV. NILO PEÇANHA"), como no filtro de referência. */
let CODIGOS_UNIDADE = {};
function codigoUnidadeGlobal(cliente, unidade) { return CODIGOS_UNIDADE[`${cliente}|${unidade}`] || ""; }
function rotuloUnidade(unidade, codigo) {
  const c = (codigo || "").trim();
  return c && c !== "-" ? `${c} - ${unidade}` : unidade;
}
function mapaCodigosUnidade(contratos) {
  const m = {};
  (contratos || []).forEach((c) => {
    const cod = (c.codigoLoja || "").trim();
    if (cod && cod !== "-") m[`${c.cliente}|${c.unidade}`] = cod;
  });
  return m;
}

function Pill({ children, fg, bg, stamp }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: stamp ? "3px 10px" : "3px 9px", borderRadius: stamp ? 3 : 999,
      fontSize: 11, fontWeight: 700, letterSpacing: stamp ? "0.06em" : "0.02em",
      textTransform: stamp ? "uppercase" : "none", color: fg, background: bg,
      border: stamp ? `1px solid ${fg}55` : "1px solid transparent",
      fontFamily: stamp ? "'Oswald', sans-serif" : "'Inter', sans-serif", whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function KpiCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", flex: 1, minWidth: 140, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -10, top: -10, opacity: 0.08 }}><Icon size={64} color={accent} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${accent}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={13} color={accent} />
        </div>
        <span style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, fontWeight: 600, color: COLORS.ice, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.steel, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8,
      padding: "8px 10px", color: COLORS.steelLight, fontSize: 12.5, fontFamily: "'Inter', sans-serif",
    }}>
      {placeholder && <option value="Todos">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* ============================================================
   FILTER BAR (global — usada no Dashboard e em Processos)
   ============================================================ */
/* ============================================================
   FILTRO LATERAL — painel que abre pela direita, um campo por
   grupo. Cada campo é um multi-seleção com busca, "chips" do que
   já está escolhido, "Selecionar todos" e contador. A seleção
   vale na hora (não precisa clicar em aplicar).

   Grupos podem depender uns dos outros: a lista de Unidades só
   fica disponível depois que um Cliente é escolhido, e carrega
   apenas as unidades daquele cliente (`habilitado` + `options`
   já filtradas por quem chama).
   ============================================================ */
function CampoMultiSelecao({ grupo }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    function fora(e) { if (ref.current && !ref.current.contains(e.target)) { setAberto(false); setBusca(""); } }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const exibir = grupo.labelFor || ((v) => v);
  const bloqueado = grupo.habilitado === false;
  const opcoes = bloqueado ? [] : (grupo.options || []);
  const selecionados = grupo.selected || [];
  const filtradas = busca
    ? opcoes.filter((o) => String(exibir(o)).toLowerCase().includes(busca.toLowerCase()))
    : opcoes;

  const alternar = (opt) => grupo.onApply(selecionados.includes(opt) ? selecionados.filter((x) => x !== opt) : [...selecionados, opt]);

  const placeholder = bloqueado
    ? (grupo.mensagemBloqueio || "Selecione antes o filtro anterior...")
    : `Buscar e selecionar ${grupo.label.toLowerCase()}...`;

  return (
    <div style={{ marginBottom: 18 }} ref={ref}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <label style={{ fontSize: 12.5, color: COLORS.ice, fontWeight: 600 }}>{grupo.label}:</label>
        <button disabled={bloqueado || opcoes.length === 0} onClick={() => grupo.onApply(opcoes.slice())}
          style={{ background: "none", border: "none", cursor: bloqueado || opcoes.length === 0 ? "default" : "pointer", color: bloqueado || opcoes.length === 0 ? COLORS.steel : COLORS.red, fontSize: 11, fontWeight: 600, padding: 0 }}>
          Selecionar todos
        </button>
      </div>

      <div onClick={() => !bloqueado && setAberto(true)} style={{
        position: "relative", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
        background: bloqueado ? "rgba(255,255,255,0.03)" : COLORS.panel,
        border: `1px solid ${selecionados.length ? COLORS.red + "77" : COLORS.border}`,
        borderRadius: 7, padding: "6px 34px 6px 8px", minHeight: 38, cursor: bloqueado ? "not-allowed" : "text",
      }}>
        {selecionados.map((v) => (
          <span key={v} style={{ display: "flex", alignItems: "center", gap: 5, background: COLORS.redDim, color: COLORS.red, borderRadius: 5, padding: "2px 5px 2px 8px", fontSize: 11, fontWeight: 600, maxWidth: "100%" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exibir(v)}</span>
            <button onClick={(e) => { e.stopPropagation(); alternar(v); }} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.red, display: "flex", padding: 0 }}><X size={11} /></button>
          </span>
        ))}
        <input value={busca} onChange={(e) => { setBusca(e.target.value); setAberto(true); }} disabled={bloqueado}
          placeholder={selecionados.length ? "" : placeholder}
          style={{ flex: "1 1 90px", minWidth: 60, background: "transparent", border: "none", outline: "none", color: COLORS.ice, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }} />
        <div style={{ position: "absolute", right: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 4 }}>
          {selecionados.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); grupo.onApply([]); }} title="Limpar" style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel, display: "flex", padding: 0 }}><X size={14} /></button>
          )}
          <ChevronDown size={14} color={COLORS.steel} />
        </div>

        {aberto && !bloqueado && (
          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 5, background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 7, maxHeight: 230, overflowY: "auto", boxShadow: "0 12px 28px rgba(0,0,0,0.5)" }}>
            {filtradas.length === 0 && <div style={{ padding: 12, fontSize: 12, color: COLORS.steel }}>Nenhuma opção encontrada.</div>}
            {filtradas.map((opt) => {
              const marcado = selecionados.includes(opt);
              return (
                <div key={opt} className="row-hover" onClick={(e) => { e.stopPropagation(); alternar(opt); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", background: marcado ? COLORS.redDim : "transparent" }}>
                  <input type="checkbox" readOnly checked={marcado} style={{ pointerEvents: "none" }} />
                  <span style={{ fontSize: 12.5, color: marcado ? COLORS.red : COLORS.ice, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exibir(opt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ fontSize: 10.5, color: COLORS.steel, marginTop: 4 }}>
        {bloqueado ? (grupo.mensagemBloqueio || "Indisponível até escolher o filtro anterior.") : `${selecionados.length} selecionado(s) de ${opcoes.length}`}
      </div>
    </div>
  );
}

function BotaoFiltroPopup({ grupos }) {
  const [open, setOpen] = useState(false);
  const totalAtivos = grupos.reduce((s, g) => s + (g.selected ? g.selected.length : 0), 0);
  const limparTudo = () => grupos.forEach((g) => g.onApply([]));

  return (
    <div style={{ display: "inline-block" }}>
      <button onClick={() => setOpen(true)} style={{
        display: "flex", alignItems: "center", gap: 7, background: COLORS.panel, border: `1px solid ${totalAtivos ? COLORS.red + "77" : COLORS.border}`,
        borderRadius: 8, padding: "8px 14px", color: totalAtivos ? COLORS.ice : COLORS.steelLight, fontSize: 12.5, cursor: "pointer", fontFamily: "'Inter', sans-serif",
      }}>
        <Filter size={13} /> Filtro
        {totalAtivos > 0 && <span style={{ background: COLORS.red, color: "#fff", borderRadius: 999, minWidth: 18, height: 18, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{totalAtivos}</span>}
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 65 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,16,0.55)" }} onClick={() => setOpen(false)} />
          <aside style={{
            position: "absolute", top: 0, right: 0, bottom: 0, width: "min(470px, 94vw)",
            background: COLORS.panelAlt, borderLeft: `1px solid ${COLORS.borderStrong}`,
            padding: "20px 22px 30px", overflowY: "auto", boxShadow: "-14px 0 34px rgba(0,0,0,0.45)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ice }}>Filtro:</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel }}><X size={18} /></button>
            </div>
            {grupos.map((g) => <CampoMultiSelecao key={g.label} grupo={g} />)}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
              <button onClick={limparTudo} style={{ background: "transparent", border: "none", color: COLORS.steel, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Limpar todos os filtros</button>
              <button onClick={() => setOpen(false)} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 22px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                Fechar
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function FilterBar({ processos, filtros, setFiltros, codigosUnidade }) {
  const clientes = useMemo(() => Array.from(new Set(processos.map((p) => p.cliente))).sort(), [processos]);
  /* Unidades só carregam depois que um cliente é escolhido — e apenas as daquele cliente. */
  const unidades = useMemo(() => {
    if (!filtros.cliente.length) return [];
    const base = processos.filter((p) => filtros.cliente.includes(p.cliente));
    return Array.from(new Set(base.map((p) => p.unidade))).sort();
  }, [processos, filtros.cliente]);
  const assuntos = useMemo(() => Array.from(new Set(processos.map((p) => p.assunto))).sort(), [processos]);
  const rotuloUn = (u) => {
    const cli = filtros.cliente[0];
    return rotuloUnidade(u, (codigosUnidade || {})[`${cli}|${u}`] || Object.entries(codigosUnidade || {}).find(([k]) => k.endsWith(`|${u}`))?.[1]);
  };

  const set = (k) => (arr) => setFiltros((f) => ({ ...f, [k]: arr, ...(k === "cliente" ? { unidade: [] } : {}) }));
  const algumFiltroAtivo = filtros.cliente.length || filtros.unidade.length || filtros.assunto.length || filtros.responsavel.length;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
      <BotaoFiltroPopup grupos={[
        { label: "Clientes", options: clientes, selected: filtros.cliente, onApply: set("cliente") },
        { label: "Unidades do cliente", options: unidades, selected: filtros.unidade, onApply: set("unidade"), labelFor: rotuloUn,
          habilitado: filtros.cliente.length > 0, mensagemBloqueio: "Escolha um cliente para carregar as unidades." },
        { label: "Tipos de serviço", options: assuntos, selected: filtros.assunto, onApply: set("assunto") },
        { label: "Responsabilidade", options: RESPONSAVEIS, selected: filtros.responsavel, onApply: set("responsavel"), labelFor: rotuloResponsavel },
      ]} />
      {algumFiltroAtivo > 0 && (
        <button onClick={() => setFiltros({ cliente: [], unidade: [], assunto: [], responsavel: [] })}
          style={{ background: "transparent", border: "none", color: COLORS.red, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}

function applyFiltros(processos, filtros) {
  return processos.filter((p) => {
    if (filtros.cliente.length && !filtros.cliente.includes(p.cliente)) return false;
    if (filtros.unidade.length && !filtros.unidade.includes(p.unidade)) return false;
    if (filtros.assunto.length && !filtros.assunto.includes(p.assunto)) return false;
    if (filtros.responsavel.length && !filtros.responsavel.includes(STATUS_CONFIG[p.statusAtual].responsavel)) return false;
    return true;
  });
}

/* ============================================================
   NEW PROCESS MODAL
   ============================================================ */
function NewProcessModal({ onClose, onSave, processos, isAdmin }) {
  const [form, setForm] = useState({
    cliente: "", unidade: "", cidade: "", uf: "", assunto: "", tipo: "Processo",
    numero: "", statusAtual: "aguardando", dataProtocolo: "", dataPrevisaoOrgao: "",
    dataAtendimentoExigencia: "", pendenciaClienteDescricao: "",
    site: "", login: "", senha: "", prestador: "Interno",
    numeroContrato: "", dependeDeId: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const field = (label, key, placeholder, type = "text") => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</label>
      <input type={type} value={form[key]} onChange={set(key)} placeholder={placeholder}
        style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none" }} />
    </div>
  );
  const selectField = (label, key, options, getLabel) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</label>
      <select value={form[key]} onChange={set(key)} style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none" }}>
        {options.map((o) => <option key={o} value={o}>{getLabel ? getLabel(o) : o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,16,0.7)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "88vh", overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 19, fontWeight: 600, color: COLORS.ice, textTransform: "uppercase", letterSpacing: "0.03em" }}>Novo processo</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel }}><X size={20} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {field("Cliente", "cliente", "Ex: Atacado Boreal")}
          {field("Unidade", "unidade", "Ex: Loja Centro")}
          {field("Cidade", "cidade", "Ex: São Paulo")}
          {field("UF", "uf", "Ex: SP")}
          <div style={{ gridColumn: "1 / -1" }}>{field("Assunto / Serviço", "assunto", "Ex: Aprovação de Projeto - Prefeitura (Obra Nova)")}</div>
          {selectField("Tipo de serviço", "tipo", CONTRATO_TIPO_OPTIONS)}
          {field("Nº do processo", "numero", "Ex: 1101.2025/0001")}
          <div style={{ gridColumn: "1 / -1" }}>{selectField("Status atual (responsabilidade)", "statusAtual", STATUS_KEYS, (k) => `${statusLabel(k, form.tipo)} — ${rotuloResponsavel(STATUS_CONFIG[k].responsavel)}`)}</div>
          {field("Data de protocolo", "dataProtocolo", "", "date")}
          {field("Previsão de análise do órgão", "dataPrevisaoOrgao", "", "date")}
          {field("Data de atendimento de exigência", "dataAtendimentoExigencia", "", "date")}
          {field("Pendência do cliente (se houver)", "pendenciaClienteDescricao", "Ex: aguardando envio de documento X")}
          {field("Site do órgão", "site", "portal.orgao.gov.br")}
          {field("Prestador responsável", "prestador", "Interno / nome")}
          {field("Login", "login", "usuário do portal")}
          {field("Senha", "senha", "senha do portal", "password")}
          {field("Nº do contrato", "numeroContrato", "Ex: CT-2026-0001")}
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Depende da conclusão de outro processo? (opcional)</label>
              <select value={form.dependeDeId} onChange={(e) => setForm((f) => ({ ...f, dependeDeId: e.target.value }))}
                style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none" }}>
                <option value="">Nenhuma dependência</option>
                {processos.filter((p) => !STATUS_CONFIG[p.statusAtual].final).map((p) => (
                  <option key={p.id} value={p.id}>{p.cliente} — {p.assunto}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => {
            if (!form.cliente || !form.assunto) return;
            const pendenciaCliente = form.pendenciaClienteDescricao ? { ativa: true, descricao: form.pendenciaClienteDescricao } : { ativa: false, descricao: "" };
            onSave(baseProcesso({
              ...form, id: Date.now(), pendenciaCliente, ultimaAtualizacao: new Date().toISOString().slice(0, 10),
              dependeDeId: form.dependeDeId || null,
            }));
            onClose();
          }} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Salvar processo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CHECKLIST TAB
   ============================================================ */
/* ============================================================
   DOCUMENTOS E CHECKLIST — aba unificada. Cada linha combina o
   status do documento (Recebido/Obtido/Pendente) com o status no
   checklist (Temos/Não temos/N/A) na mesma tabela.
   ============================================================ */
function DocumentosChecklistTab({ processo, onUpdate }) {
  const docs = processo.documentos.itens || [];
  const chkAll = processo.checklist.itens || [];
  const norm = (s) => (s || "").trim().toLowerCase();

  const chkPorNome = {};
  chkAll.forEach((c) => { chkPorNome[norm(c.item)] = c; });
  const idsChkUsados = new Set();
  const linhas = docs.map((d) => {
    const match = chkPorNome[norm(d.nome)];
    if (match) idsChkUsados.add(match.id);
    return { key: `doc-${d.id}`, docId: d.id, chkId: match ? match.id : null, nome: d.nome, descricao: d.descricao, statusDoc: d.status, statusChk: match ? match.status : null, validade: d.validade, observacao: d.observacao };
  });
  chkAll.filter((c) => !idsChkUsados.has(c.id)).forEach((c) => {
    linhas.push({ key: `chk-${c.id}`, docId: null, chkId: c.id, nome: c.item, descricao: "", statusDoc: null, statusChk: c.status, validade: null, observacao: "" });
  });

  const progDoc = documentosProgress(processo.documentos);
  const progChk = checklistProgress(processo.checklist);

  const [novo, setNovo] = useState({ nome: "", descricao: "", statusDoc: "Pendente", statusChk: "Não temos", validade: "", observacao: "" });

  const STATUS_DOC_OPCOES = ["Recebido", "Obtido", "Pendente"];
  const STATUS_CHK_OPCOES = ["nao_rastrear", "Temos", "Não temos", "N/A"];
  const corStatusDoc = (s) => (s === "Pendente" ? COLORS.orange : COLORS.green);
  const STATUS_CHK_CFG = { "Temos": { cor: COLORS.green, icon: CheckCircle2 }, "Não temos": { cor: COLORS.red, icon: XCircle }, "N/A": { cor: COLORS.steel, icon: MinusCircle } };

  const adicionar = () => {
    if (!novo.nome.trim()) return;
    const nomeFinal = novo.nome.trim();
    const docItem = { id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nome: nomeFinal, descricao: novo.descricao.trim(), status: novo.statusDoc, validade: novo.validade || null, observacao: novo.observacao.trim(), criadoEm: hojeISOStr() };
    let checklist = processo.checklist;
    if (novo.statusChk !== "nao_rastrear") {
      const jaExiste = chkAll.some((c) => norm(c.item) === norm(nomeFinal));
      if (!jaExiste) checklist = { itens: [...chkAll, { id: `chk-doc-${docItem.id}`, item: nomeFinal, status: novo.statusChk }] };
    }
    onUpdate({ ...processo, documentos: { itens: [...docs, docItem] }, checklist });
    setNovo({ nome: "", descricao: "", statusDoc: "Pendente", statusChk: "Não temos", validade: "", observacao: "" });
  };
  const patchDoc = (docId, fields) => onUpdate({ ...processo, documentos: { itens: docs.map((d) => (d.id === docId ? { ...d, ...fields } : d)) } });
  const patchChk = (chkId, fields) => onUpdate({ ...processo, checklist: { itens: chkAll.map((c) => (c.id === chkId ? { ...c, ...fields } : c)) } });
  const criarChecklistParaLinha = (linha) => onUpdate({ ...processo, checklist: { itens: [...chkAll, { id: `chk-doc-${linha.docId || Date.now()}`, item: linha.nome, status: "Não temos" }] } });
  const removerLinha = (linha) => {
    let documentos = processo.documentos, checklist = processo.checklist;
    if (linha.docId) documentos = { itens: docs.filter((d) => d.id !== linha.docId) };
    if (linha.chkId) checklist = { itens: chkAll.filter((c) => c.id !== linha.chkId) };
    onUpdate({ ...processo, documentos, checklist });
  };

  const thStyle = { textAlign: "left", padding: "8px 10px", fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 10px", fontSize: 12, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}`, verticalAlign: "top" };

  return (
    <div>
      <p style={{ fontSize: 12, color: COLORS.steel, lineHeight: 1.6, marginBottom: 16 }}>
        Registre aqui cada documento recebido do cliente ou obtido junto ao órgão, e marque de uma vez se ele também está no checklist de exigências.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 24, marginBottom: 16 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em" }}>Recebidos/obtidos</div>
          <div style={{ fontSize: 18, color: progDoc === 100 ? COLORS.green : COLORS.ice, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>{progDoc}%</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em" }}>Conformidade checklist</div>
          <div style={{ fontSize: 18, color: progChk === 100 ? COLORS.green : COLORS.ice, fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>{progChk}%</div>
        </div>
      </div>

      <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, marginBottom: 10 }}>Adicionar item</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.8fr 0.8fr", gap: 8, marginBottom: 8 }}>
          <input placeholder="Nome do documento/item" value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }} />
          <input placeholder="Descrição" value={novo.descricao} onChange={(e) => setNovo((n) => ({ ...n, descricao: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }} />
          <select value={novo.statusDoc} onChange={(e) => setNovo((n) => ({ ...n, statusDoc: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }}>
            {STATUS_DOC_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={novo.statusChk} onChange={(e) => setNovo((n) => ({ ...n, statusChk: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }}>
            <option value="nao_rastrear">Não rastrear no checklist</option>
            <option value="Temos">Checklist: Temos</option>
            <option value="Não temos">Checklist: Não temos</option>
            <option value="N/A">Checklist: N/A</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "0.6fr 1fr auto", gap: 8 }}>
          <input type="date" value={novo.validade} onChange={(e) => setNovo((n) => ({ ...n, validade: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }} />
          <input placeholder="Observação" value={novo.observacao} onChange={(e) => setNovo((n) => ({ ...n, observacao: e.target.value }))} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12 }} />
          <button onClick={adicionar} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
            <Plus size={13} /> Adicionar
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
        <table>
          <thead><tr>
            <th style={thStyle}>Nome</th><th style={thStyle}>Descrição</th><th style={thStyle}>Status documento</th>
            <th style={thStyle}>Checklist</th><th style={thStyle}>Validade</th><th style={thStyle}>Observação</th><th style={thStyle}></th>
          </tr></thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.key}>
                <td style={{ ...tdStyle, color: COLORS.ice, fontWeight: 600 }}>{linha.nome}</td>
                <td style={tdStyle}>{linha.descricao || "—"}</td>
                <td style={tdStyle}>
                  {linha.docId ? (
                    <CampoComConfirmacao tipo="select" valor={linha.statusDoc} opcoes={STATUS_DOC_OPCOES} onConfirmar={(v) => patchDoc(linha.docId, { status: v })} corTexto={corStatusDoc(linha.statusDoc)} largura={120} />
                  ) : <span style={{ color: COLORS.steel }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {linha.chkId ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {Object.entries(STATUS_CHK_CFG).map(([s, cfg]) => (
                        <button key={s} onClick={() => patchChk(linha.chkId, { status: s })} title={s} style={{
                          width: 24, height: 24, borderRadius: 5, border: `1px solid ${linha.statusChk === s ? cfg.cor : COLORS.border}`,
                          background: linha.statusChk === s ? `${cfg.cor}22` : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
                        }}><cfg.icon size={13} color={linha.statusChk === s ? cfg.cor : COLORS.steel} /></button>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => criarChecklistParaLinha(linha)} style={{ background: "transparent", border: `1px dashed ${COLORS.border}`, color: COLORS.steel, borderRadius: 5, padding: "4px 8px", fontSize: 10.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                      + Checklist
                    </button>
                  )}
                </td>
                <td style={tdStyle}>{linha.validade ? <span style={{ color: new Date(linha.validade) < hoje ? COLORS.red : COLORS.steelLight }}>{fmtDate(linha.validade)}</span> : "—"}</td>
                <td style={tdStyle}>{linha.observacao || "—"}</td>
                <td style={tdStyle}>
                  <button onClick={() => removerLinha(linha)} title="Remover" style={{ width: 24, height: 24, borderRadius: 5, border: `1px solid ${COLORS.red}55`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Trash2 size={11} color={COLORS.red} />
                  </button>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum documento ou item de checklist registrado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ============================================================
   PARÂMETROS URBANÍSTICOS TAB
   ============================================================ */
function ParametrosUrbanisticosTab({ processo, onUpdate }) {
  const set = (k) => (e) => onUpdate({ ...processo, parametrosUrbanisticos: { ...processo.parametrosUrbanisticos, [k]: e.target.value } });
  return (
    <div>
      <div style={{ fontSize: 11.5, color: COLORS.steel, marginBottom: 16, lineHeight: 1.5 }}>
        Quadro de uso e ocupação do solo do projeto — preencha conforme o memorial/quadro técnico elaborado para este serviço.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {PARAM_URB_FIELDS.map(([k, label]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</label>
            <input value={processo.parametrosUrbanisticos[k]} onChange={set(k)}
              style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12.5 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   RELATÓRIO TAB — visão consolidada de qualidade do protocolo
   ============================================================ */
function RelatorioTab({ processo }) {
  const pendencias = pendenciasProtocolo(processo);
  const pronto = pendencias.length === 0;
  const docPct = documentosProgress(processo.documentos);
  const chkPct = checklistProgress(processo.checklist);

  const exportarCSV = () => {
    const rows = [["Categoria", "Item", "Status", "Detalhe"]];
    (processo.documentos.itens || []).forEach((it) => {
      rows.push(["Documento", it.nome, it.status, [it.descricao, it.validade ? `Validade: ${fmtDate(it.validade)}` : "", it.observacao].filter(Boolean).join(" · ")]);
    });
    (processo.checklist.itens || []).forEach((it) => {
      rows.push(["Checklist", it.item, it.status, ""]);
    });
    downloadCSV(`relatorio_${processo.cliente}_${processo.numero}.csv`.replace(/[^\w.-]+/g, "_"), rows);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160, background: pronto ? COLORS.greenDim : COLORS.orangeDim, border: `1px solid ${pronto ? COLORS.green : COLORS.orange}55`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10.5, color: pronto ? COLORS.green : COLORS.orange, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Status do protocolo</div>
          <div style={{ fontSize: 15, color: COLORS.ice, fontWeight: 700, fontFamily: "'Oswald', sans-serif", marginTop: 4 }}>{pronto ? "Pronto para protocolar" : `${pendencias.length} pendência(s)`}</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Documentos</div>
          <div style={{ fontSize: 20, color: COLORS.ice, fontWeight: 700, fontFamily: "'Oswald', sans-serif", marginTop: 4 }}>{docPct}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 140, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Checklist técnico</div>
          <div style={{ fontSize: 20, color: COLORS.ice, fontWeight: 700, fontFamily: "'Oswald', sans-serif", marginTop: 4 }}>{chkPct}%</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <button onClick={() => imprimirRelatorio(processo)} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          Imprimir / salvar PDF
        </button>
        <button onClick={exportarCSV} style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.steelLight, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Pendências identificadas</div>
      {pendencias.length === 0 ? (
        <div style={{ fontSize: 12.5, color: COLORS.green, padding: "8px 0" }}>Nenhuma pendência — documentos, checklist técnico e responsáveis técnicos completos.</div>
      ) : pendencias.map((p, i) => (
        <div key={i} style={{ fontSize: 12.5, color: COLORS.steelLight, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>• {p}</div>
      ))}
    </div>
  );
}

/* ============================================================
   ATUALIZAÇÕES TAB (por processo)
   ============================================================ */
/* ============================================================
   STATUS DE SERVIÇO — só leitura. Lista, do mais recente para o
   mais antigo, TODAS as ocorrências registradas no serviço
   (início, análise, protocolo, cobrança, exigências, tratativas
   com o cliente, reuniões, conclusão etc.). O registro em si é
   feito pelo botão "Registrar ocorrência", no topo do pop-up.
   ============================================================ */
function StatusServicoTab({ processo, onUpdate, onRegistrar, onEditar, onExcluir }) {
  const [confirmExcluir, setConfirmExcluir] = useState(null);
  const toggleRelatorio = (id) => {
    onUpdate({ ...processo, atualizacoes: processo.atualizacoes.map((a) => (a.id === id ? { ...a, incluirRelatorio: a.incluirRelatorio === false ? true : false } : a)) });
  };
  const ocorrencias = [...(processo.atualizacoes || [])].sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11.5, color: COLORS.steel }}>
          {ocorrencias.length} ocorrência(s) registrada(s) neste serviço.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onRegistrar} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <ClipboardList size={13} /> Registrar ocorrência
          </button>
          <button onClick={() => imprimirStatusServico(processo)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {ocorrencias.length === 0 && (
        <div style={{ fontSize: 12.5, color: COLORS.steel, textAlign: "center", padding: 30, border: `1px dashed ${COLORS.border}`, borderRadius: 8 }}>
          Nenhuma ocorrência registrada ainda. Use "Registrar ocorrência" para lançar o início, o protocolo, uma exigência, uma tratativa com o cliente, uma reunião ou a conclusão.
        </div>
      )}

      {ocorrencias.map((a) => (
        <div key={a.id} className="row-hover" style={{ display: "flex", gap: 12, padding: "11px 6px", borderBottom: `1px solid ${COLORS.border}`, borderRadius: 6 }}>
          <div style={{ width: 74, flexShrink: 0, fontSize: 11.5, color: COLORS.steel, fontFamily: "monospace" }}>{fmtDate(a.data)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3, flexWrap: "wrap" }}>
              <Pill fg={COLORS.steelLight} bg="rgba(255,255,255,0.06)">{a.tipo}</Pill>
              <span style={{ fontSize: 10.5, color: COLORS.steel }}>resp.: {rotuloResponsavel(a.responsavel)}</span>
              {a.dataPrevistaRetorno && <span style={{ fontSize: 10.5, color: COLORS.orange }}>· retorno previsto: {fmtDate(a.dataPrevistaRetorno)}</span>}
              {a.naAgenda && <span style={{ fontSize: 10.5, color: COLORS.blue }}>· na agenda</span>}
              {a.editadaEm && <span style={{ fontSize: 10.5, color: COLORS.steel, fontStyle: "italic" }}>· editada em {fmtDate(a.editadaEm)}</span>}
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.ice, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{a.descricao}</div>
            {a.resumoCampos && <div style={{ fontSize: 11, color: COLORS.steel, marginTop: 4, fontStyle: "italic" }}>{a.resumoCampos}</div>}
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
            <label title="Marcar para aparecer no Relatório de Status" style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={a.incluirRelatorio !== false} onChange={() => toggleRelatorio(a.id)} />
              <span style={{ fontSize: 10, color: COLORS.steel, whiteSpace: "nowrap" }}>Relatório</span>
            </label>
            <button onClick={() => onEditar(a)} title="Editar esta ocorrência"
              style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Pencil size={12} color={COLORS.steelLight} />
            </button>
            <button onClick={() => setConfirmExcluir(a)} title="Excluir esta ocorrência"
              style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Trash2 size={12} color={COLORS.red} />
            </button>
          </div>
        </div>
      ))}

      {confirmExcluir && (
        <ConfirmarExclusaoModal titulo="Excluir ocorrência"
          mensagem={`Excluir a ocorrência "${confirmExcluir.tipo}" de ${fmtDate(confirmExcluir.data)}? O texto e o registro somem do Status de Serviço. As datas e o status que essa ocorrência já aplicou ao processo continuam como estão — se precisar, ajuste na aba "Visão geral".`}
          onCancelar={() => setConfirmExcluir(null)}
          onConfirmar={() => { onExcluir(confirmExcluir); setConfirmExcluir(null); }} />
      )}
    </div>
  );
}

/* ============================================================
   PROCESS DETAIL MODAL (Visão geral / Checklist / Atualizações)
   ============================================================ */
/* ============================================================
   REGISTRAR OCORRÊNCIA — substitui o antigo "próximo passo".
   Tudo o que acontece no processo/serviço é lançado aqui: o tipo
   escolhido define quais datas o formulário pede e para qual
   status o serviço avança (quando for o caso). Além das datas,
   toda ocorrência tem descrição livre, data do registro,
   previsão de retorno, responsável e vínculo com a agenda.
   ============================================================ */
function hojeISOStr() { return new Date().toISOString().slice(0, 10); }

const OCORRENCIA_TIPOS = [
  {
    id: "inicio", label: "Início do serviço", statusDestino: "iniciado",
    campos: [
      { key: "dataInicio", label: "Data de início", type: "date", padrao: "hoje" },
      { key: "dataPrevisaoAnaliseChecklist", label: "Previsão de conclusão da análise documental / checklist", type: "date" },
    ],
  },
  {
    id: "analise", label: "Análise documental / checklist concluída", statusDestino: "em_montagem",
    campos: [
      { key: "dataPrevistaProtocolo", label: "Data prevista de protocolo", type: "date", soProcesso: true },
      { key: "dataPrevistaVistoria", label: "Data prevista de vistoria", type: "date", soTecnico: true },
    ],
  },
  {
    id: "protocolo", label: "Protocolo do processo", statusDestino: "protocolado", soProcesso: true,
    campos: [
      { key: "dataProtocolo", label: "Data de protocolo", type: "date", padrao: "hoje" },
      { key: "numeroProtocolo", label: "Número do protocolo", type: "text" },
      { key: "dataPrevisaoOrgao", label: "Previsão de análise do órgão", type: "date" },
    ],
  },
  {
    id: "execucao", label: "Início da execução do serviço técnico", statusDestino: "protocolado", soTecnico: true,
    campos: [{ key: "dataPrevisaoOrgao", label: "Previsão de conclusão / entrega", type: "date" }],
  },
  { id: "tramitacao", label: "Tramitação / Movimentação processual", statusDestino: null, campos: [] },
  { id: "cobranca", label: "Cobrança de celeridade ao órgão", statusDestino: null, campos: [], registraCobranca: true },
  {
    id: "exigencia_recebida", label: "Exigência / Comunique-se recebido", statusDestino: "exigencia_primers",
    campos: [
      { key: "dataExigenciaRecebida", label: "Data de recebimento da exigência", type: "date", padrao: "hoje" },
      { key: "dataExigenciaPrazoLimite", label: "Prazo limite para atendimento", type: "date" },
    ],
  },
  { id: "exigencia_cliente", label: "Pendência repassada ao cliente", statusDestino: "exigencia_cliente", campos: [], pendenciaCliente: true },
  { id: "retorno_cliente", label: "Retorno do cliente", statusDestino: null, campos: [] },
  {
    id: "exigencia_atendida", label: "Exigência atendida", statusDestino: "exigencia_atendida",
    campos: [
      { key: "dataAtendimentoTecnico", label: "Data do atendimento técnico (esclarecimentos)", type: "date" },
      { key: "dataAtendimentoExigencia", label: "Data em que a exigência foi atendida", type: "date", padrao: "hoje" },
      { key: "dataPrevisaoOrgao", label: "Nova previsão de análise do órgão", type: "date" },
    ],
  },
  { id: "vistoria", label: "Vistoria", statusDestino: null, campos: [{ key: "dataPrevistaVistoria", label: "Data da vistoria", type: "date", padrao: "hoje" }] },
  { id: "reuniao", label: "Reunião / Atendimento", statusDestino: null, campos: [] },
  { id: "tratativa", label: "Tratativa com o cliente", statusDestino: null, campos: [] },
  { id: "suspensao", label: "Suspensão do serviço", statusDestino: "suspenso", campos: [] },
  {
    id: "conclusao", label: "Conclusão / Deferimento", statusDestino: "concluido",
    campos: [{ key: "dataConclusao", label: "Data de conclusão", type: "date", padrao: "hoje" }],
  },
  {
    id: "indeferimento", label: "Indeferimento", statusDestino: "indeferido",
    campos: [{ key: "dataConclusao", label: "Data do indeferimento", type: "date", padrao: "hoje" }],
  },
  { id: "outro", label: "Outro", statusDestino: null, campos: [] },
];

function tiposOcorrenciaDisponiveis(processo) {
  const tecnico = processo.tipo === "Serviço Técnico";
  return OCORRENCIA_TIPOS.filter((t) => (tecnico ? !t.soProcesso : !t.soTecnico));
}

/* Sugere o tipo mais provável a partir de onde o serviço está. */
function tipoOcorrenciaSugerido(processo) {
  const tecnico = processo.tipo === "Serviço Técnico";
  switch (processo.statusAtual) {
    case "aguardando": return "inicio";
    case "iniciado": return "analise";
    case "em_montagem": return tecnico ? "execucao" : "protocolo";
    case "protocolado":
    case "aguardando_orgao":
    case "exigencia_atendida": return "tramitacao";
    case "exigencia_primers": return "exigencia_atendida";
    case "exigencia_cliente": return "retorno_cliente";
    default: return "tramitacao";
  }
}

function camposDoTipo(tipoCfg, processo) {
  const tecnico = processo.tipo === "Serviço Técnico";
  return (tipoCfg.campos || []).filter((c) => (tecnico ? !c.soProcesso : !c.soTecnico));
}

function RegistrarOcorrenciaModal({ processo, onClose, onSalvar, tipoInicial, emEdicao }) {
  const disponiveis = tiposOcorrenciaDisponiveis(processo);
  const editando = !!emEdicao;
  const [tipoId, setTipoId] = useState(
    editando ? (emEdicao.tipoOcorrencia || "outro") : (tipoInicial || tipoOcorrenciaSugerido(processo))
  );
  const tipoCfg = disponiveis.find((t) => t.id === tipoId) || disponiveis[0];
  const campos = camposDoTipo(tipoCfg, processo);

  const [valores, setValores] = useState(editando ? { ...(emEdicao.camposAplicados || {}) } : {});
  const [descricao, setDescricao] = useState(editando ? (emEdicao.descricao || "") : "");
  const [dataRegistro, setDataRegistro] = useState(editando ? (emEdicao.data || hojeISOStr()) : hojeISOStr());
  const [previsaoRetorno, setPrevisaoRetorno] = useState(editando ? (emEdicao.dataPrevistaRetorno || "") : "");
  const [responsavel, setResponsavel] = useState(editando ? (emEdicao.responsavel || "Primers") : "Primers");
  const [incluirRelatorio, setIncluirRelatorio] = useState(editando ? emEdicao.incluirRelatorio !== false : true);
  const [criarAgenda, setCriarAgenda] = useState(!editando);
  /* Na edição, o padrão é NÃO mexer no processo — a pessoa está só
     corrigindo o texto ou a data do registro. Se marcar a opção, as
     datas e o status daquele tipo são reaplicados. */
  const [reaplicar, setReaplicar] = useState(!editando);
  const [tipoTocado, setTipoTocado] = useState(false);

  /* Ao trocar o tipo, recarrega os campos daquele tipo com o que já
     existe no processo (ou o padrão de hoje). Na primeira montagem
     em modo edição, mantém o que foi gravado na ocorrência. */
  useEffect(() => {
    if (editando && !tipoTocado) return;
    const iniciais = {};
    camposDoTipo(tipoCfg, processo).forEach((c) => {
      iniciais[c.key] = processo[c.key] || (c.padrao === "hoje" ? hojeISOStr() : "");
    });
    setValores(iniciais);
  }, [tipoId]); // eslint-disable-line

  const trocarTipo = (novo) => { setTipoTocado(true); setTipoId(novo); if (editando) setReaplicar(true); };

  const registrar = () => {
    if (!descricao.trim()) return;
    const resumo = campos
      .filter((c) => valores[c.key])
      .map((c) => `${c.label}: ${c.type === "date" ? fmtDate(valores[c.key]) : valores[c.key]}`)
      .join(" · ");
    const camposAplicados = {};
    campos.forEach((c) => { if (valores[c.key]) camposAplicados[c.key] = valores[c.key]; });
    const ocorrencia = {
      id: editando ? emEdicao.id : `oc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tipoOcorrencia: tipoCfg.id,
      tipo: tipoCfg.label,
      data: dataRegistro,
      descricao: descricao.trim(),
      responsavel,
      dataPrevistaRetorno: previsaoRetorno || "",
      incluirRelatorio,
      resumoCampos: resumo,
      camposAplicados,
      naAgenda: editando ? (emEdicao.naAgenda || !!(criarAgenda && previsaoRetorno)) : !!(criarAgenda && previsaoRetorno),
      ...(editando ? { editadaEm: hojeISOStr() } : {}),
    };

    const camposProcesso = {};
    if (!editando || reaplicar) {
      Object.assign(camposProcesso, camposAplicados);
      if (tipoCfg.statusDestino) camposProcesso.statusAtual = tipoCfg.statusDestino;
      if (tipoCfg.pendenciaCliente) {
        camposProcesso.pendenciaCliente = { ativa: true, descricao: descricao.trim(), previsaoRetorno: previsaoRetorno || "" };
      }
      if (tipoCfg.id === "retorno_cliente") {
        camposProcesso.pendenciaCliente = { ...(processo.pendenciaCliente || {}), ativa: false };
      }
    }

    const agenda = (criarAgenda && previsaoRetorno) ? {
      data: previsaoRetorno,
      titulo: `${processo.cliente} — ${tipoCfg.label}`,
      tipo: tipoCfg.id === "reuniao" ? "Reunião" : "Tarefa",
      tecnico: processo.tecnico && processo.tecnico !== "-" ? processo.tecnico : "",
      descricao: `${processo.assunto} (${processo.unidade}) — ${descricao.trim()}`,
    } : null;
    const cobranca = (tipoCfg.registraCobranca && !editando) ? { id: ocorrencia.id, data: dataRegistro, nota: descricao.trim() } : null;
    onSalvar(ocorrencia, camposProcesso, agenda, cobranca, editando);
    onClose();
  };

  const labelCampo = { fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", display: "block", marginBottom: 4, fontWeight: 600 };
  const inputBase = { width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 12.5, fontFamily: "'Inter', sans-serif", outline: "none" };

  return (
    <ModalShell title={editando ? "Editar ocorrência" : "Registrar ocorrência"} onClose={onClose} maxWidth={620}>
      <div style={{ fontSize: 11.5, color: COLORS.steel, marginBottom: 14 }}>
        {processo.cliente} · {processo.unidade} — {processo.assunto}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelCampo}>Tipo de ocorrência</label>
        <select value={tipoId} onChange={(e) => trocarTipo(e.target.value)} style={inputBase}>
          {disponiveis.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        {tipoCfg.statusDestino && (!editando || reaplicar) && (
          <div style={{ fontSize: 11, color: COLORS.orange, marginTop: 5 }}>
            Ao salvar, o serviço passa para: <b>{statusLabel(tipoCfg.statusDestino, processo.tipo)}</b>
          </div>
        )}
      </div>

      {editando && (
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 7, padding: "10px 12px", marginBottom: 14 }}>
          <input type="checkbox" checked={reaplicar} onChange={(e) => setReaplicar(e.target.checked)} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 12, color: COLORS.steelLight, lineHeight: 1.5 }}>
            Reaplicar as datas e o status deste tipo ao processo.
            <br />
            <span style={{ fontSize: 11, color: COLORS.steel }}>
              Deixe desmarcado se você só quer corrigir o texto, a data do registro ou o responsável — assim o processo não é alterado.
            </span>
          </span>
        </label>
      )}

      {campos.length > 0 && (
        <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700, marginBottom: 10 }}>Dados desta etapa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {campos.map((c) => (
              <div key={c.key} style={{ gridColumn: campos.length === 1 ? "1 / -1" : "auto" }}>
                <label style={labelCampo}>{c.label}</label>
                <input type={c.type} value={valores[c.key] || ""} onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
                  style={{ ...inputBase, background: COLORS.panel }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelCampo}>O que aconteceu <span style={{ color: COLORS.red }}>*</span></label>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4}
          placeholder="Descreva a ocorrência: o que foi feito, o que o órgão ou o cliente respondeu, o que ficou combinado..."
          style={{ ...inputBase, resize: "vertical", lineHeight: 1.5 }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <div>
          <label style={labelCampo}>Data do registro</label>
          <input type="date" value={dataRegistro} onChange={(e) => setDataRegistro(e.target.value)} style={inputBase} />
        </div>
        <div>
          <label style={labelCampo}>Previsão de retorno</label>
          <input type="date" value={previsaoRetorno} onChange={(e) => setPrevisaoRetorno(e.target.value)} style={inputBase} />
        </div>
        <div>
          <label style={labelCampo}>Responsável</label>
          <select value={responsavel} onChange={(e) => setResponsavel(e.target.value)} style={inputBase}>
            {["Primers", "Cliente", "Órgão"].map((r) => <option key={r} value={r}>{rotuloResponsavel(r)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={incluirRelatorio} onChange={(e) => setIncluirRelatorio(e.target.checked)} />
          <span style={{ fontSize: 12, color: COLORS.steelLight }}>Incluir no Relatório de Status enviado ao cliente</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: previsaoRetorno ? "pointer" : "default", opacity: previsaoRetorno ? 1 : 0.5 }}>
          <input type="checkbox" disabled={!previsaoRetorno} checked={criarAgenda && !!previsaoRetorno} onChange={(e) => setCriarAgenda(e.target.checked)} />
          <span style={{ fontSize: 12, color: COLORS.steelLight }}>
            {editando ? "Criar um NOVO compromisso na agenda na data de previsão de retorno" : "Criar compromisso na agenda na data de previsão de retorno"}
            {!previsaoRetorno && <span style={{ color: COLORS.steel }}> (preencha a previsão de retorno)</span>}
            {editando && previsaoRetorno && <span style={{ color: COLORS.steel }}> — o compromisso antigo, se houver, continua na agenda</span>}
          </span>
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={registrar} disabled={!descricao.trim()} style={{
          background: descricao.trim() ? COLORS.red : "rgba(255,255,255,0.06)", border: "none",
          color: descricao.trim() ? "#fff" : COLORS.steel, borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700,
          cursor: descricao.trim() ? "pointer" : "default", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase",
        }}>
          {editando ? "Salvar ocorrência" : "Registrar ocorrência"}
        </button>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   LINHA DO TEMPO — eventos do serviço, do início à conclusão
   ============================================================ */
/* Compara data prevista x data realizada de uma etapa, para destacar
   se foi concluída adiantada, no prazo ou atrasada. */
function calcularPrazo(previsto, realizado) {
  if (!previsto || !realizado) return null;
  const diffDias = Math.round((new Date(realizado) - new Date(previsto)) / 86400000);
  if (diffDias < 0) return { status: "adiantado", dias: Math.abs(diffDias) };
  if (diffDias > 0) return { status: "atrasado", dias: diffDias };
  return { status: "no_prazo", dias: 0 };
}
function labelPrazo(p) {
  if (!p) return null;
  if (p.status === "adiantado") return `Adiantado (${p.dias}d)`;
  if (p.status === "atrasado") return `Atrasado (${p.dias}d)`;
  return "No prazo";
}
function corPrazo(p) {
  if (!p) return COLORS.steel;
  if (p.status === "adiantado") return COLORS.green;
  if (p.status === "atrasado") return COLORS.red;
  return COLORS.blue;
}

function eventosLinhaDoTempo(processo) {
  const eventos = [];
  const push = (data, label, cor, prazo) => { if (data) eventos.push({ data, label, cor, prazo: prazo || null }); };
  const tecnico = processo.tipo === "Serviço Técnico";
  push(processo.dataInicio, "Serviço iniciado", COLORS.blue);
  push(processo.dataPrevisaoAnaliseChecklist, "Previsão de conclusão da análise / checklist", COLORS.steel);
  if (tecnico) {
    if (processo.vistoriaNecessaria) push(processo.dataPrevistaVistoria, "Data prevista de vistoria", COLORS.steel);
  } else {
    push(processo.dataPrevistaProtocolo, "Data prevista de protocolo", COLORS.steel);
  }
  push(processo.dataProtocolo, `Protocolado junto ao órgão${processo.numeroProtocolo && processo.numeroProtocolo !== "-" ? ` (nº ${processo.numeroProtocolo})` : ""}`,
    COLORS.blue, calcularPrazo(processo.dataPrevistaProtocolo, processo.dataProtocolo));
  push(processo.dataPrevisaoOrgao, tecnico ? "Previsão de conclusão / entrega" : "Previsão de análise do órgão", COLORS.steel);
  push(processo.dataExigenciaRecebida, tecnico ? "Pendência registrada" : "Comunique-se / Exigência recebida", COLORS.orange);
  push(processo.dataExigenciaPrazoLimite, "Prazo limite para atendimento", COLORS.red);
  push(processo.dataAtendimentoTecnico, "Atendimento técnico realizado", COLORS.blue);
  push(processo.dataAtendimentoExigencia, "Exigência atendida", COLORS.green, calcularPrazo(processo.dataExigenciaPrazoLimite, processo.dataAtendimentoExigencia));
  if (processo.dependeDeId) push(processo.dataInicio, "Dependência de outro processo registrada", COLORS.steel);
  if (processo.pendenciaCliente && processo.pendenciaCliente.ativa) {
    push(processo.ultimaAtualizacao || processo.dataInicio, `Pendência do cliente em aberto: ${processo.pendenciaCliente.descricao || "sem descrição"}${processo.pendenciaCliente.previsaoRetorno ? ` (previsão de retorno: ${fmtDate(processo.pendenciaCliente.previsaoRetorno)})` : ""}`, COLORS.orange);
  }
  (processo.documentos?.itens || []).forEach((doc) => {
    if (doc.criadoEm && processo.dataProtocolo && doc.criadoEm > processo.dataProtocolo) {
      push(doc.criadoEm, `Documento incluído após o protocolo: ${doc.nome}`, COLORS.orange);
    }
  });
  (processo.cobrancas || []).forEach((c) => push(c.data, "Cobrança de celeridade ao órgão", COLORS.orange));
  (processo.atualizacoes || []).forEach((a) => push(a.data, `${a.tipo}: ${a.descricao}`, COLORS.steelLight));
  push(processo.dataConclusao, "Concluído / Deferido", COLORS.green, calcularPrazo(processo.dataPrevisaoOrgao, processo.dataConclusao));
  return eventos.filter((e) => e.data).sort((a, b) => a.data.localeCompare(b.data));
}

function LinhaDoTempoTab({ processo }) {
  const eventos = eventosLinhaDoTempo(processo);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Linha do tempo do serviço</div>
        <button onClick={() => imprimirLinhaDoTempo(processo)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "7px 12px", fontSize: 12, cursor: "pointer" }}>
          <Download size={13} /> Exportar linha do tempo
        </button>
      </div>
      {eventos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: COLORS.steel, textAlign: "center", padding: 30 }}>Nenhum evento registrado ainda — inicie o serviço para começar a linha do tempo.</div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 2, background: COLORS.border }} />
          {eventos.map((e, i) => (
            <div key={i} style={{ position: "relative", paddingBottom: 20 }}>
              <div style={{ position: "absolute", left: -22, top: 2, width: 11, height: 11, borderRadius: "50%", background: e.cor, border: `2px solid ${COLORS.panel}` }} />
              <div style={{ fontSize: 11, color: COLORS.steel, fontFamily: "monospace" }}>{fmtDate(e.data)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12.5, color: COLORS.ice, lineHeight: 1.4 }}>{e.label}</div>
                {e.prazo && <Pill fg={corPrazo(e.prazo)} bg={`${corPrazo(e.prazo)}22`}>{labelPrazo(e.prazo)}</Pill>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   EXPORTAÇÕES ELEGANTES — Status de Serviço e Linha do Tempo
   ============================================================ */
function printBrandCSS() {
  return `
  * { box-sizing: border-box; }
  body{font-family:'Segoe UI', Arial, Helvetica, sans-serif;color:#16283d;margin:0;background:#fff;}
  .brand{background:${COLORS.bg};padding:26px 40px;border-bottom:5px solid ${COLORS.red};}
  .brand-row{display:flex;align-items:center;gap:10px;min-height:40px;}
  .brand-name{font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:22px;color:${COLORS.red};letter-spacing:0.02em;}
  .brand-title{color:#eef2f6;font-size:16px;margin-top:16px;font-weight:600;}
  .brand-meta{color:#b7c2cf;font-size:12px;margin-top:4px;}
  .content{padding:30px 40px;}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:${COLORS.bg};margin:26px 0 10px;border-left:4px solid ${COLORS.red};padding-left:9px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th{background:${COLORS.bg};color:#eef2f6;padding:9px 10px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;}
  td{padding:9px 10px;border-bottom:1px solid #e6e9ed;}
  tr:nth-child(even) td{background:#f7f9fb;}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-top:10px;}
  .kv{font-size:12px;color:#5b6675;} .kv b{display:block;color:#16283d;font-size:13.5px;font-weight:600;margin-top:2px;}
  .footer{padding:18px 40px;color:#8493a6;font-size:10.5px;border-top:1px solid #e6e9ed;margin-top:20px;}
`;
}
function brandHeader(title, subtitle) {
  const logoHtml = LOGO_BASE64
    ? `<img src="${LOGO_BASE64}" style="max-height:44px;max-width:200px;object-fit:contain;" />`
    : `<span class="brand-name">CONTROLE DE PROCESSOS E SERVIÇOS</span>`;
  return `<div class="brand">
    <div class="brand-row">${logoHtml}</div>
    <div class="brand-title">${title}</div>
    ${subtitle ? `<div class="brand-meta">${subtitle}</div>` : ""}
  </div>`;
}
function abrirEImprimir(html) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function gerarStatusServicoHTML(processo) {
  const status = STATUS_CONFIG[processo.statusAtual];
  const atualizacoes = processo.atualizacoes.filter((a) => a.incluirRelatorio !== false).sort((a, b) => b.data.localeCompare(a.data));
  const linhas = atualizacoes.map((a) => `<tr><td>${fmtDate(a.data)}</td><td>${a.tipo}</td><td>${rotuloResponsavel(a.responsavel)}</td><td>${a.descricao}</td></tr>`).join("");
  const prazoProtocolo = calcularPrazo(processo.dataPrevistaProtocolo, processo.dataProtocolo);
  const prazoConclusao = calcularPrazo(processo.dataPrevisaoOrgao, processo.dataConclusao);
  const badgePrazo = (p) => p ? ` <span class="badge" style="background:${corPrazo(p)}22;color:${corPrazo(p)};">${labelPrazo(p)}</span>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Status de Serviço — ${processo.assunto}</title><style>${printBrandCSS()}</style></head><body>
  ${brandHeader("Status de Serviço", `${processo.cliente} — ${rotuloUnidade(processo.unidade, codigoUnidadeGlobal(processo.cliente, processo.unidade))} · Gerado em ${fmtDate(hojeISOStr())}`)}
  <div class="content">
    <div class="grid">
      <div class="kv">Código da unidade<b>${codigoUnidadeGlobal(processo.cliente, processo.unidade) || "—"}</b></div>
      <div class="kv">Serviço<b>${processo.assunto}</b></div>
      <div class="kv">Tipo<b>${processo.tipo}</b></div>
      <div class="kv">Status atual<b><span class="badge" style="background:${status.bg};color:${status.fg}">${statusLabel(processo.statusAtual, processo.tipo)}</span></b></div>
      <div class="kv">Nº do processo<b>${processo.numero}</b></div>
      <div class="kv">Data de protocolo<b>${fmtDate(processo.dataProtocolo)}${badgePrazo(prazoProtocolo)}</b></div>
      <div class="kv">Nº do protocolo<b>${processo.numeroProtocolo && processo.numeroProtocolo !== "-" ? processo.numeroProtocolo : "—"}</b></div>
      <div class="kv">Previsão de análise do órgão<b>${fmtDate(processo.dataPrevisaoOrgao)}</b></div>
      <div class="kv">Data de conclusão<b>${fmtDate(processo.dataConclusao)}${badgePrazo(prazoConclusao)}</b></div>
    </div>
    ${processo.pendenciaCliente && processo.pendenciaCliente.ativa ? `<h2>Pendência do cliente</h2><p style="font-size:13px;color:#a3261b;">${processo.pendenciaCliente.descricao || "Pendência registrada sem descrição."}${processo.pendenciaCliente.previsaoRetorno ? ` — Previsão de retorno: <b>${fmtDate(processo.pendenciaCliente.previsaoRetorno)}</b>` : ""}</p>` : ""}
    <h2>Ocorrências registradas</h2>
    <table><tr><th>Data</th><th>Tipo</th><th>Responsável</th><th>Descrição</th></tr>${linhas || `<tr><td colspan="4">Nenhuma ocorrência registrada.</td></tr>`}</table>
  </div>
  <div class="footer">Controle de Processos e Serviços</div>
  </body></html>`;
}
function imprimirStatusServico(processo) { abrirEImprimir(gerarStatusServicoHTML(processo)); }

function gerarLinhaDoTempoHTML(processo) {
  const eventos = eventosLinhaDoTempo(processo);
  const itens = eventos.map((e) => `
    <div style="display:flex;gap:16px;margin-bottom:18px;">
      <div style="width:90px;flex-shrink:0;font-size:11.5px;color:#5b6675;font-weight:600;padding-top:2px;">${fmtDate(e.data)}</div>
      <div style="flex-shrink:0;padding-top:3px;"><div style="width:11px;height:11px;border-radius:50%;background:${e.cor};"></div></div>
      <div style="font-size:13px;color:#16283d;line-height:1.5;">${e.label}${e.prazo ? ` <span class="badge" style="background:${corPrazo(e.prazo)}22;color:${corPrazo(e.prazo)};margin-left:6px;">${labelPrazo(e.prazo)}</span>` : ""}</div>
    </div>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Linha do Tempo — ${processo.assunto}</title><style>${printBrandCSS()}</style></head><body>
  ${brandHeader("Linha do Tempo do Serviço", `${processo.cliente} — ${processo.unidade} · ${processo.assunto}`)}
  <div class="content">${itens || `<p>Nenhum evento registrado ainda.</p>`}</div>
  <div class="footer">Controle de Processos e Serviços</div>
  </body></html>`;
}
function imprimirLinhaDoTempo(processo) { abrirEImprimir(gerarLinhaDoTempoHTML(processo)); }

function gerarStatusServicoGeralHTML(processos, tituloCliente) {
  const linhas = processos.map((p) => {
    const st = STATUS_CONFIG[p.statusAtual];
    const ultima = [...p.atualizacoes].filter((a) => a.incluirRelatorio !== false).sort((a, b) => b.data.localeCompare(a.data))[0];
    return `<tr><td>${p.cliente}</td><td>${codigoUnidadeGlobal(p.cliente, p.unidade) || "—"}</td><td>${p.unidade}</td><td>${p.assunto}</td><td>${p.tipo}</td>
      <td><span class="badge" style="background:${st.bg};color:${st.fg}">${statusLabel(p.statusAtual, p.tipo)}</span></td>
      <td>${fmtDate(p.ultimaAtualizacao)}</td><td>${ultima ? ultima.descricao : "—"}</td></tr>`;
  }).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Status de Serviço${tituloCliente ? " — " + tituloCliente : ""}</title><style>${printBrandCSS()}</style></head><body>
  ${brandHeader("Status de Serviço", `${tituloCliente || "Todos os clientes"} · Gerado em ${fmtDate(hojeISOStr())} · ${processos.length} serviço(s)`)}
  <div class="content">
    <table><tr><th>Cliente</th><th>Cód. unidade</th><th>Unidade</th><th>Serviço</th><th>Tipo</th><th>Status</th><th>Última atualização</th><th>Última mensagem</th></tr>
    ${linhas || `<tr><td colspan="8">Nenhum serviço encontrado.</td></tr>`}</table>
  </div>
  <div class="footer">Controle de Processos e Serviços</div>
  </body></html>`;
}
function imprimirStatusServicoGeral(processos, tituloCliente) { abrirEImprimir(gerarStatusServicoGeralHTML(processos, tituloCliente)); }

function gerarRankingHTML(linhas, chaveMes) {
  const [ano, mes] = chaveMes.split("-");
  const tituloMes = `${MESES_NOMES[parseInt(mes, 10) - 1]} de ${ano}`;
  const corPctHTML = (v) => v === null ? "#8493a6" : v >= 80 ? "#117a45" : v >= 50 ? "#a35a1b" : "#a3261b";
  const bgPctHTML = (v) => v === null ? "#f0f0f0" : v >= 80 ? "#dff5e8" : v >= 50 ? "#fdeee0" : "#fdece9";
  const linhasHTML = linhas.map((l) => `<tr>
    <td>${l.tecnico}</td>
    <td>${l.totalPlanejado}</td>
    <td>${l.concluidos}</td>
    <td>${l.pctMetas === null ? "<span style=\"color:#8493a6;\">Sem metas</span>" : `<span class="badge" style="background:${bgPctHTML(l.pctMetas)};color:${corPctHTML(l.pctMetas)};">${l.pctMetas}%</span>`}</td>
    <td style="${l.retrabalhos > 0 ? "color:#a3261b;font-weight:bold;" : ""}">${l.retrabalhos}</td>
    <td>${l.totalEventos}</td>
    <td>${l.presentes}</td>
    <td>${l.pctTreinamentos === null ? "<span style=\"color:#8493a6;\">Sem eventos</span>" : `<span class="badge" style="background:${bgPctHTML(l.pctTreinamentos)};color:${corPctHTML(l.pctTreinamentos)};">${l.pctTreinamentos}%</span>`}</td>
  </tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ranking de Técnicos — ${tituloMes}</title><style>${printBrandCSS()}</style></head><body>
  ${brandHeader("Ranking de Técnicos", `${tituloMes} · Gerado em ${fmtDate(hojeISOStr())}`)}
  <div class="content">
    <table><tr>
      <th>Técnico</th><th>Metas do mês</th><th>Concluídas</th><th>% Metas atingidas</th>
      <th>Retrabalhos (exigências)</th><th>Eventos obrigatórios</th><th>Presenças</th><th>% Participação</th>
    </tr>${linhasHTML || `<tr><td colspan="8">Nenhum técnico cadastrado.</td></tr>`}</table>
    <p style="font-size:11px;color:#5b6675;margin-top:16px;line-height:1.6;">
      "Metas do mês" considera os serviços com Data SLA no mês, por técnico. "Concluídas" conta os que já têm o processo correspondente como Concluído/Deferido.
      "Retrabalhos" conta quantos processos daquele técnico receberam exigência no mês. Os 3 indicadores são apresentados separados — a ponderação final fica a critério do RH.
    </p>
  </div>
  <div class="footer">Controle de Processos e Serviços</div>
  </body></html>`;
}
function imprimirRanking(linhas, chaveMes) { abrirEImprimir(gerarRankingHTML(linhas, chaveMes)); }

function DetailModal({ processo, processos, contratos, onClose, onUpdate, onOpenProcesso, codigoUnidade, pendentes, onSalvar, onDescartar, salvando }) {
  const [tab, setTab] = useState("geral");
  const [showSenha, setShowSenha] = useState(false);
  const [showOcorrencia, setShowOcorrencia] = useState(false);
  const [ocorrenciaEmEdicao, setOcorrenciaEmEdicao] = useState(null);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const status = STATUS_CONFIG[processo.statusAtual];
  const prazo = prazoInfo(diasRestantes(processo));
  const parado = diasSemAtualizacao(processo);
  const bloqueadoPor = processoBloqueado(processo, processos);
  const parcelasDoServico = useMemo(() => (contratos || []).filter((c) => c.proposta === processo.numeroContrato && c.cliente === processo.cliente && c.unidade === processo.unidade && c.servico === processo.assunto), [contratos, processo]);
  const temParcelaFinal = parcelasDoServico.length === 0 || parcelasDoServico.some((c) => /deferiment|entrega|obten/i.test(c.tarefa || ""));
  const iniciado = processo.statusAtual !== "aguardando";

  const patch = (fields) => onUpdate({ ...processo, ...fields });

  /* Uma ocorrência entra no rascunho junto com os campos do processo
     que ela altera; só vai para o banco no "Salvar alterações". */
  const aplicarOcorrencia = (ocorrencia, camposProcesso, agenda, cobranca, editando) => {
    const lista = processo.atualizacoes || [];
    const novasAtualizacoes = editando
      ? lista.map((a) => (a.id === ocorrencia.id ? ocorrencia : a))
      : [ocorrencia, ...lista];
    const novo = {
      ...processo,
      ...camposProcesso,
      ultimaAtualizacao: novasAtualizacoes.reduce((max, a) => (String(a.data || "") > max ? a.data : max), ""),
      atualizacoes: novasAtualizacoes,
    };
    if (!novo.ultimaAtualizacao) novo.ultimaAtualizacao = processo.ultimaAtualizacao;
    if (cobranca) novo.cobrancas = [cobranca, ...(processo.cobrancas || [])];
    /* O compromisso de agenda fica no rascunho junto com o resto — só é
       criado de verdade quando o usuário clicar em "Salvar alterações". */
    if (agenda) novo.__agendaPendente = [...(processo.__agendaPendente || []), agenda];
    onUpdate(novo);
  };

  /* Excluir uma ocorrência remove o registro do histórico. As datas e o
     status que ela já aplicou ao processo continuam como estão — quem
     apagou pode corrigi-los na aba "Visão geral". Se a ocorrência era
     uma cobrança, a cobrança correspondente também sai; e se ela ainda
     tinha um compromisso de agenda só no rascunho, ele é descartado. */
  const excluirOcorrencia = (ocorrencia) => {
    const restantes = (processo.atualizacoes || []).filter((a) => a.id !== ocorrencia.id);
    const tituloAgenda = `${processo.cliente} — ${ocorrencia.tipo}`;
    const novo = {
      ...processo,
      atualizacoes: restantes,
      cobrancas: (processo.cobrancas || []).filter((c) => c.id !== ocorrencia.id),
      __agendaPendente: (processo.__agendaPendente || []).filter(
        (item) => !(item.titulo === tituloAgenda && item.data === ocorrencia.dataPrevistaRetorno)
      ),
    };
    if (!novo.__agendaPendente.length) delete novo.__agendaPendente;
    novo.ultimaAtualizacao = restantes.reduce((max, a) => (String(a.data || "") > max ? a.data : max), "") || processo.dataInicio || processo.ultimaAtualizacao;
    onUpdate(novo);
  };

  const abrirEdicaoOcorrencia = (a) => { setOcorrenciaEmEdicao(a); setShowOcorrencia(true); };
  const fecharOcorrencia = () => { setShowOcorrencia(false); setOcorrenciaEmEdicao(null); };

  const fechar = () => { if (pendentes > 0) setConfirmarSaida(true); else onClose(); };

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 12, color: COLORS.steel }}>{label}</span>
      <span style={{ fontSize: 13, color: COLORS.ice, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(5,10,16,0.7)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 860, maxHeight: "92vh", background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* HEADER — resumo visível sempre, sem precisar trocar de aba */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em" }}>{processo.cliente} · {rotuloUnidade(processo.unidade, codigoUnidade)}</div>
              <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: COLORS.ice, fontWeight: 600, marginTop: 3 }}>{processo.assunto}</h2>
            </div>
            <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel }}><X size={20} /></button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select value={processo.statusAtual} onChange={(e) => patch({ statusAtual: e.target.value })}
              style={{ background: status.bg, color: status.fg, border: `1px solid ${status.fg}55`, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em" }}>
              {STATUS_KEYS.map((k) => <option key={k} value={k} style={{ background: COLORS.panel, color: COLORS.ice }}>{statusLabel(k, processo.tipo)}</option>)}
            </select>
            <Pill fg={COLORS.steelLight} bg="rgba(255,255,255,0.06)">{processo.tipo}</Pill>
            {iniciado && <Pill fg={prazo.fg} bg={prazo.bg}>{prazo.label}</Pill>}
            {iniciado && parado !== null && <Pill fg={parado > 15 ? COLORS.red : COLORS.steel} bg={parado > 15 ? COLORS.redDim : "rgba(255,255,255,0.05)"}>{parado > 15 ? `Parado há ${parado}d` : `Atualizado há ${parado}d`}</Pill>}
            {iniciado && <Pill fg={checklistProgress(processo.checklist) === 100 ? COLORS.green : COLORS.steelLight} bg="rgba(255,255,255,0.06)">Checklist {checklistProgress(processo.checklist)}%</Pill>}
            {iniciado && <Pill fg={documentosProgress(processo.documentos) === 100 ? COLORS.green : COLORS.steelLight} bg="rgba(255,255,255,0.06)">Documentos {documentosProgress(processo.documentos)}%</Pill>}
            {processo.pendenciaCliente.ativa && <Pill fg={COLORS.yellow} bg={COLORS.yellowDim}>Pendência do cliente</Pill>}
            {bloqueadoPor && <Pill fg={COLORS.red} bg={COLORS.redDim}>Bloqueado por outro processo</Pill>}
          </div>

          {iniciado && (
            <div style={{ display: "flex", gap: 4, marginTop: 14, flexWrap: "wrap" }}>
              {[
                ["geral", "Visão geral", Building2],
                ["documentos", "Documentos e Checklist", FileStack],
                ["linhadotempo", "Linha do tempo", Timer],
                ["atualizacoes", `Status de Serviço (${processo.atualizacoes.length})`, History],
                ["relatorio", "Relatório", Download],
              ].map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  display: "flex", alignItems: "center", gap: 6, background: tab === id ? COLORS.redDim : "transparent",
                  color: tab === id ? COLORS.red : COLORS.steelLight, border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 12.5, fontWeight: tab === id ? 700 : 500, cursor: "pointer",
                }}><Icon size={13} />{label}</button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px" }}>
            <span style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", fontWeight: 700 }}>Registrar ocorrência:</span>
            <button onClick={() => { setOcorrenciaEmEdicao(null); setShowOcorrencia(true); }} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
              <ClipboardList size={14} /> Nova ocorrência
            </button>
            <span style={{ fontSize: 11, color: COLORS.steel, fontStyle: "italic", flex: 1, minWidth: 200 }}>
              Início, análise, protocolo, cobrança, exigências, tratativas, reuniões, conclusão — tudo é lançado aqui e aparece em Status de Serviço.
            </span>
            {!temParcelaFinal && !status.final && iniciado && (
              <span style={{ fontSize: 10.5, color: COLORS.orange }}>
                Atenção: este serviço não tem tarefa de Deferimento/Entrega/Obtenção cadastrada.
              </span>
            )}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
          {!iniciado && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <Clock size={34} color={COLORS.steel} style={{ marginBottom: 14 }} />
              <div style={{ fontSize: 15, color: COLORS.ice, fontFamily: "'Oswald', sans-serif", fontWeight: 600, marginBottom: 6 }}>Este serviço ainda não foi iniciado</div>
              <div style={{ fontSize: 12.5, color: COLORS.steel, marginBottom: 20, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                Registre a ocorrência de "Início do serviço" para lançar a data de início e a previsão de conclusão da análise documental / checklist. Documentos, Checklist, Linha do tempo e Status de Serviço ficam disponíveis depois disso.
              </div>
              <button onClick={() => { setOcorrenciaEmEdicao(null); setShowOcorrencia(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: COLORS.red, border: "none", color: "#fff", borderRadius: 8, padding: "11px 24px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
                <ClipboardList size={15} /> Registrar início do serviço
              </button>
              <div style={{ marginTop: 24, textAlign: "left", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
                <Row label="Cliente / Unidade" value={`${processo.cliente} — ${processo.unidade}`} />
                <Row label="Código da unidade" value={codigoUnidade || "—"} />
                <Row label="Tipo de serviço" value={processo.tipo} />
                <Row label="Técnico" value={processo.tecnico} />
                <Row label="Contrato vinculado" value={processo.numeroContrato} />
              </div>
            </div>
          )}

          {iniciado && tab === "geral" && (
            <div>
              <Row label="Cliente" value={processo.cliente} />
              <Row label="Código da unidade" value={codigoUnidade || "—"} />
              <Row label="Unidade" value={processo.unidade} />
              <Row label="Serviço" value={processo.assunto} />
              <Row label="Tipo de serviço" value={processo.tipo} />
              <Row label="Técnico" value={processo.tecnico} />

              <RowEditavel label="Data de início" tipo="date" valor={processo.dataInicio} onConfirmar={(v) => patch({ dataInicio: v })} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 12, color: COLORS.steel }}>Vistoria necessária?</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[[true, "Sim"], [false, "Não"]].map(([v, l]) => (
                    <button key={l} onClick={() => patch({ vistoriaNecessaria: v })} style={{
                      fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 12px", cursor: "pointer",
                      background: processo.vistoriaNecessaria === v ? COLORS.redDim : "transparent",
                      color: processo.vistoriaNecessaria === v ? COLORS.red : COLORS.steel,
                      border: `1px solid ${processo.vistoriaNecessaria === v ? COLORS.red + "55" : COLORS.border}`,
                    }}>{l}</button>
                  ))}
                </div>
              </div>
              {processo.vistoriaNecessaria && <RowEditavel label="Data de vistoria" tipo="date" valor={processo.dataPrevistaVistoria} onConfirmar={(v) => patch({ dataPrevistaVistoria: v })} />}

              {processo.tipo === "Serviço Técnico" ? (
                <RowEditavel label="Previsão de conclusão / entrega" tipo="date" valor={processo.dataPrevisaoOrgao} onConfirmar={(v) => patch({ dataPrevisaoOrgao: v })} />
              ) : (
                <>
                  <RowEditavel label="Nº do processo" tipo="text" valor={processo.numero === "-" ? "" : processo.numero} onConfirmar={(v) => patch({ numero: v })} />
                  <RowEditavel label="Previsão de análise/checklist" tipo="date" valor={processo.dataPrevisaoAnaliseChecklist} onConfirmar={(v) => patch({ dataPrevisaoAnaliseChecklist: v })} />
                  <RowEditavel label="Data prevista de protocolo" tipo="date" valor={processo.dataPrevistaProtocolo} onConfirmar={(v) => patch({ dataPrevistaProtocolo: v })} />
                  <RowEditavel label="Data de protocolo" tipo="date" valor={processo.dataProtocolo} onConfirmar={(v) => patch({ dataProtocolo: v })} />
                  <RowEditavel label="Nº do protocolo" tipo="text" valor={processo.numeroProtocolo === "-" ? "" : processo.numeroProtocolo} onConfirmar={(v) => patch({ numeroProtocolo: v })} />
                  <RowEditavel label="Previsão de análise do órgão / conclusão" tipo="date" valor={processo.dataPrevisaoOrgao} onConfirmar={(v) => patch({ dataPrevisaoOrgao: v })} />
                  <RowEditavel label="Exigência recebida" tipo="date" valor={processo.dataExigenciaRecebida} onConfirmar={(v) => patch({ dataExigenciaRecebida: v })} />
                  <RowEditavel label="Prazo limite para atendimento" tipo="date" valor={processo.dataExigenciaPrazoLimite} onConfirmar={(v) => patch({ dataExigenciaPrazoLimite: v })} />
                  <RowEditavel label="Atendimento técnico" tipo="date" valor={processo.dataAtendimentoTecnico} onConfirmar={(v) => patch({ dataAtendimentoTecnico: v })} />
                  <RowEditavel label="Exigência atendida" tipo="date" valor={processo.dataAtendimentoExigencia} onConfirmar={(v) => patch({ dataAtendimentoExigencia: v })} />
                </>
              )}

              <RowEditavel label="Data de conclusão" tipo="date" valor={processo.dataConclusao} onConfirmar={(v) => patch({ dataConclusao: v })} />
              <RowEditavel label="Prestador / Fornecedor" tipo="text" valor={processo.prestador === "-" ? "" : processo.prestador} onConfirmar={(v) => patch({ prestador: v })} />

              <Row label="Site do órgão" value={processo.site || "—"} />
              <Row label="Login" value={processo.login || "—"} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 12, color: COLORS.steel }}>Senha</span>
                <button onClick={() => setShowSenha((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: processo.senha && processo.senha !== "-" ? "pointer" : "default", color: COLORS.ice, fontSize: 13, fontFamily: showSenha ? "'Inter', sans-serif" : "monospace" }}>
                  {processo.senha && processo.senha !== "-" ? (showSenha ? processo.senha : "••••••••••") : "—"}
                  {processo.senha && processo.senha !== "-" && (showSenha ? <EyeOff size={14} color={COLORS.steel} /> : <Eye size={14} color={COLORS.steel} />)}
                </button>
              </div>

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Cobranças de celeridade</div>
                <button onClick={() => { setOcorrenciaEmEdicao(null); setShowOcorrencia(true); }} style={{ display: "flex", alignItems: "center", gap: 5, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>
                  <Plus size={12} /> Registrar cobrança
                </button>
              </div>
              {processo.cobrancas.length === 0 ? (
                <div style={{ fontSize: 12, color: COLORS.steel, padding: "10px 0" }}>Nenhuma cobrança registrada. Use "Registrar ocorrência" com o tipo "Cobrança de celeridade ao órgão".</div>
              ) : processo.cobrancas.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: COLORS.steelLight, padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>{fmtDate(c.data)} — {c.nota}</div>
              ))}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 8 }}>Pendência do cliente</div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={processo.pendenciaCliente.ativa} onChange={(e) => patch({ pendenciaCliente: { ...processo.pendenciaCliente, ativa: e.target.checked } })} />
                  <span style={{ fontSize: 12.5, color: COLORS.ice }}>Há pendência aberta do cliente</span>
                </label>
                {processo.pendenciaCliente.ativa && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <CampoComConfirmacao tipo="text" valor={processo.pendenciaCliente.descricao} placeholder="Descreva a pendência..." largura="100%"
                      onConfirmar={(v) => patch({ pendenciaCliente: { ...processo.pendenciaCliente, descricao: v } })} />
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11.5, color: COLORS.steel, flexShrink: 0 }}>Previsão de retorno</span>
                      <CampoComConfirmacao tipo="date" valor={processo.pendenciaCliente.previsaoRetorno || ""}
                        onConfirmar={(v) => patch({ pendenciaCliente: { ...processo.pendenciaCliente, previsaoRetorno: v } })} />
                    </div>
                  </div>
                )}
              </div>

              {processo.tipo !== "Serviço Técnico" && (
                <>
                  <div style={{ marginTop: 20, fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, marginBottom: 8 }}>Dependência de outro processo</div>
                  <select value={processo.dependeDeOutros ? "outros" : (processo.dependeDeId || "")} onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === "outros") { patch({ dependeDeId: null, dependeDeOutros: true }); return; }
                    const novoId = valor || null;
                    const procDependente = novoId ? processos.find((p) => p.id === novoId) : null;
                    const itensAtuais = processo.checklist.itens || [];
                    const jaTemItem = itensAtuais.some((it) => it.item.startsWith("Depende da conclusão de:"));
                    const checklist = (procDependente && !jaTemItem)
                      ? { itens: [...itensAtuais, { id: `chk-dep-${Date.now()}`, item: `Depende da conclusão de: ${procDependente.cliente} — ${procDependente.assunto}`, status: "Não temos" }] }
                      : processo.checklist;
                    patch({ dependeDeId: novoId, dependeDeOutros: false, checklist });
                  }}
                    style={{ width: "100%", background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "7px 9px", color: COLORS.ice, fontSize: 12.5 }}>
                    <option value="">Nenhuma dependência</option>
                    {processos.filter((p) => p.id !== processo.id && p.unidade === processo.unidade).map((p) => <option key={p.id} value={p.id}>{p.cliente} — {p.assunto}</option>)}
                    <option value="outros">Outros</option>
                  </select>
                  {processo.dependeDeOutros && (
                    <RowEditavel label="Descreva a dependência" tipo="text" valor={processo.dependeDeOutrosDescricao} largura="100%" onConfirmar={(v) => patch({ dependeDeOutrosDescricao: v })} />
                  )}
                  {bloqueadoPor && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, background: COLORS.redDim, border: `1px solid ${COLORS.red}55`, borderRadius: 8, padding: "9px 12px" }}>
                      <div style={{ fontSize: 12, color: COLORS.red }}>Bloqueado até a conclusão de: <b>{bloqueadoPor.assunto}</b> ({bloqueadoPor.cliente})</div>
                      {onOpenProcesso && <button onClick={() => onOpenProcesso(bloqueadoPor)} style={{ background: "transparent", border: "none", color: COLORS.red, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Abrir</button>}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {iniciado && tab === "documentos" && <DocumentosChecklistTab processo={processo} onUpdate={onUpdate} />}
          {iniciado && tab === "linhadotempo" && <LinhaDoTempoTab processo={processo} />}
          {iniciado && tab === "atualizacoes" && (
            <StatusServicoTab processo={processo} onUpdate={onUpdate}
              onRegistrar={() => { setOcorrenciaEmEdicao(null); setShowOcorrencia(true); }}
              onEditar={abrirEdicaoOcorrencia} onExcluir={excluirOcorrencia} />
          )}
          {iniciado && tab === "relatorio" && <RelatorioTab processo={processo} />}
        </div>

        {/* RODAPÉ — nada é gravado enquanto não clicar em Salvar */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, background: pendentes > 0 ? COLORS.orangeDim : COLORS.panelAlt, padding: "11px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: pendentes > 0 ? COLORS.orange : COLORS.steel, display: "flex", alignItems: "center", gap: 7 }}>
            {pendentes > 0
              ? <><AlertTriangle size={14} /> {pendentes} alteração(ões) neste serviço ainda não salva(s)</>
              : <><CheckCircle2 size={14} /> Sem alterações pendentes neste serviço</>}
          </div>
          <BotaoSalvar pendentes={pendentes} onSalvar={onSalvar} onDescartar={onDescartar} salvando={salvando} compacto />
        </div>
      </div>

      {showOcorrencia && (
        <RegistrarOcorrenciaModal key={ocorrenciaEmEdicao ? ocorrenciaEmEdicao.id : "nova"}
          processo={processo} emEdicao={ocorrenciaEmEdicao}
          onClose={fecharOcorrencia} onSalvar={aplicarOcorrencia} />
      )}
      {confirmarSaida && (
        <ConfirmarExclusaoModal titulo="Fechar sem salvar?"
          mensagem={`Há ${pendentes} alteração(ões) não salva(s) neste serviço. Se fechar agora, elas serão perdidas.`}
          onCancelar={() => setConfirmarSaida(false)}
          onConfirmar={() => { setConfirmarSaida(false); if (onDescartar) onDescartar(); onClose(); }} />
      )}
    </div>
  );
}

/* ============================================================
   IMPORT CSV MODAL
   ============================================================ */
function ImportModal({ onClose, onImport }) {
  const [status, setStatus] = useState(null);
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      Papa.parse(ev.target.result, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          const mapped = res.data.map((row) => baseProcesso({
            id: Date.now() + Math.random(),
            cliente: row["Cliente"] || "", unidade: row["Unidade"] || "", cidade: row["Cidade"] || "", uf: row["UF"] || "",
            assunto: row["Assunto / Serviço"] || row["Assunto"] || "", tipo: row["Tipo / Serviço"] || "Processo",
            numero: row["Nº Processo / Documento"] || "-", statusAtual: "protocolado",
            dataProtocolo: row["Data prot. / emissão"] || null, dataPrevisaoOrgao: row["Data conclusão prevista"] || null,
            site: row["Site"] || "-", login: row["Login"] || "-", senha: row["Senha"] || "-", prestador: row["Prestador"] || "-",
          })).filter((r) => r.cliente);
          setStatus({ ok: true, count: mapped.length, data: mapped });
        },
        error: () => setStatus({ ok: false }),
      });
    };
    reader.readAsText(file, "UTF-8");
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,16,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 12, width: "100%", maxWidth: 480, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: COLORS.ice, fontWeight: 600, textTransform: "uppercase" }}>Importar planilha (CSV)</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 12.5, color: COLORS.steel, lineHeight: 1.6, marginBottom: 16 }}>
          Exporte sua planilha como <b style={{ color: COLORS.steelLight }}>CSV</b> mantendo os cabeçalhos originais e envie o arquivo abaixo. Os processos importados entram como "Protocolado — aguardando análise"; ajuste o status depois, se necessário.
        </p>
        <input type="file" accept=".csv" onChange={handleFile} style={{ color: COLORS.steelLight, fontSize: 12.5 }} />
        {status && status.ok && <div style={{ marginTop: 14, fontSize: 13, color: COLORS.green }}>{status.count} processo(s) reconhecido(s).</div>}
        {status && !status.ok && <div style={{ marginTop: 14, fontSize: 13, color: COLORS.red }}>Não foi possível ler esse arquivo.</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button disabled={!status || !status.ok} onClick={() => { onImport(status.data); onClose(); }}
            style={{ background: status && status.ok ? COLORS.red : COLORS.grayDim, border: "none", color: status && status.ok ? "#fff" : COLORS.steel, borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: status && status.ok ? "pointer" : "default", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Confirmar importação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PÁGINA: ATUALIZAÇÕES (feed global + exportação)
   ============================================================ */
/* ============================================================
   AGENDA SEMANAL — prazos do Controle de Processos + itens
   avulsos cadastrados manualmente (reuniões, tarefas, lembretes)
   ============================================================ */
const AGENDA_TIPO_OPTIONS = ["Reunião", "Tarefa", "Lembrete", "Outro"];
const AGENDA_TIPO_COLOR = { "Reunião": COLORS.blue, "Tarefa": COLORS.orange, "Lembrete": COLORS.yellow, "Outro": COLORS.steelLight };

function AgendaItemModal({ dataInicial, onClose, onSave }) {
  const [f, setF] = useState({ data: dataInicial || new Date().toISOString().slice(0, 10), titulo: "", tipo: "Reunião", tecnico: "", descricao: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <ModalShell title="Novo item da agenda" onClose={onClose} maxWidth={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ModalField label="Data"><input type="date" value={f.data} onChange={set("data")} style={modalInputStyle} /></ModalField>
        <ModalField label="Título"><input value={f.titulo} onChange={set("titulo")} placeholder="Ex: Reunião com cliente X" style={modalInputStyle} /></ModalField>
        <ModalField label="Tipo">
          <select value={f.tipo} onChange={set("tipo")} style={modalInputStyle}>
            {AGENDA_TIPO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        <ModalField label="Técnico (opcional)">
          <select value={f.tecnico} onChange={set("tecnico")} style={modalInputStyle}>
            <option value="">Não atribuído</option>
            {TECNICOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        <ModalField label="Descrição (opcional)"><input value={f.descricao} onChange={set("descricao")} placeholder="Detalhes, participantes, local..." style={modalInputStyle} /></ModalField>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => {
          if (!f.titulo.trim()) return;
          onSave({ id: `agenda-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, data: f.data, titulo: f.titulo.trim(), tipo: f.tipo, tecnico: f.tecnico, descricao: f.descricao.trim() });
          onClose();
        }} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          Salvar item
        </button>
      </div>
    </ModalShell>
  );
}

function compromissosDoProcesso(p) {
  const tecnico = p.tipo === "Serviço Técnico";
  const lista = [];
  if (p.dataPrevisaoAnaliseChecklist) lista.push({ data: p.dataPrevisaoAnaliseChecklist, label: "Previsão de análise/checklist" });
  if (p.dataPrevistaProtocolo) lista.push({ data: p.dataPrevistaProtocolo, label: tecnico ? "Previsão de vistoria" : "Previsão de protocolo" });
  if (p.dataPrevisaoOrgao) lista.push({ data: p.dataPrevisaoOrgao, label: tecnico ? "Previsão de entrega" : "Previsão de análise do órgão" });
  if (p.dataExigenciaPrazoLimite) lista.push({ data: p.dataExigenciaPrazoLimite, label: "Prazo limite da exigência" });
  if (p.pendenciaCliente && p.pendenciaCliente.ativa && p.pendenciaCliente.previsaoRetorno) lista.push({ data: p.pendenciaCliente.previsaoRetorno, label: "Previsão de retorno — pendência do cliente" });
  /* Ocorrências com "naAgenda" já viraram compromisso de verdade na agenda —
     não repetimos aqui para não aparecer duas vezes no mesmo dia. */
  (p.atualizacoes || []).forEach((a) => { if (a.dataPrevistaRetorno && !a.naAgenda) lista.push({ data: a.dataPrevistaRetorno, label: `Retorno previsto: ${a.tipo}` }); });
  return lista;
}

function AgendaSemanal({ processos, agendaItens, onOpenProcesso, onAddItem, onRemoveItem }) {
  const [showModal, setShowModal] = useState(null); // data (iso) do dia clicado, ou null
  const [tecnicoAtivo, setTecnicoAtivo] = useState("Todos");
  const [modoView, setModoView] = useState("semana"); // dia | semana | mes
  const [dataRef, setDataRef] = useState(new Date());

  const nomesDia = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const nomesMes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const isoDia = (d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt.toISOString().slice(0, 10); };
  const hojeRef = new Date();
  const hojeIso = isoDia(hojeRef);
  const diaDaSemanaIndex = (d) => { const x = d.getDay(); return x === 0 ? 6 : x - 1; }; // Seg=0..Dom=6
  const inicioSemana = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() - diaDaSemanaIndex(dt)); dt.setHours(0, 0, 0, 0); return dt; };

  const processosFiltrados = tecnicoAtivo === "Todos" ? processos : processos.filter((p) => p.tecnico === tecnicoAtivo);
  const itensFiltrados = tecnicoAtivo === "Todos" ? agendaItens : agendaItens.filter((a) => !a.tecnico || a.tecnico === tecnicoAtivo);

  const compromissosPorDia = {};
  processosFiltrados.forEach((p) => {
    compromissosDoProcesso(p).forEach((c) => {
      if (!compromissosPorDia[c.data]) compromissosPorDia[c.data] = [];
      compromissosPorDia[c.data].push({ processo: p, label: c.label });
    });
  });

  let diasExibir = [];
  let tituloPeriodo = "";
  if (modoView === "dia") {
    diasExibir = [new Date(dataRef)];
    tituloPeriodo = `${nomesDia[diaDaSemanaIndex(dataRef)]}, ${String(dataRef.getDate()).padStart(2, "0")}/${String(dataRef.getMonth() + 1).padStart(2, "0")}/${dataRef.getFullYear()}`;
  } else if (modoView === "semana") {
    const seg = inicioSemana(dataRef);
    diasExibir = Array.from({ length: 7 }, (_, i) => { const d = new Date(seg); d.setDate(seg.getDate() + i); return d; });
    const fim = diasExibir[6];
    tituloPeriodo = `${String(diasExibir[0].getDate()).padStart(2, "0")}/${String(diasExibir[0].getMonth() + 1).padStart(2, "0")} – ${String(fim.getDate()).padStart(2, "0")}/${String(fim.getMonth() + 1).padStart(2, "0")}/${fim.getFullYear()}`;
  } else {
    const primeiroDiaMes = new Date(dataRef.getFullYear(), dataRef.getMonth(), 1);
    const ultimoDiaMes = new Date(dataRef.getFullYear(), dataRef.getMonth() + 1, 0);
    const inicioGrade = inicioSemana(primeiroDiaMes);
    const fimGrade = new Date(ultimoDiaMes);
    fimGrade.setDate(ultimoDiaMes.getDate() + (6 - diaDaSemanaIndex(ultimoDiaMes)));
    const totalDias = Math.round((fimGrade - inicioGrade) / 86400000) + 1;
    diasExibir = Array.from({ length: totalDias }, (_, i) => { const d = new Date(inicioGrade); d.setDate(inicioGrade.getDate() + i); return d; });
    tituloPeriodo = `${nomesMes[dataRef.getMonth()]} de ${dataRef.getFullYear()}`;
  }

  const navegar = (direcao) => {
    const nova = new Date(dataRef);
    if (modoView === "dia") nova.setDate(nova.getDate() + direcao);
    else if (modoView === "semana") nova.setDate(nova.getDate() + direcao * 7);
    else nova.setMonth(nova.getMonth() + direcao);
    setDataRef(nova);
  };

  const dias = diasExibir.map((d) => {
    const iso = isoDia(d);
    return {
      data: d, iso, dentroDoMes: modoView !== "mes" || d.getMonth() === dataRef.getMonth(),
      processosDia: compromissosPorDia[iso] || [],
      itensDia: itensFiltrados.filter((a) => a.data === iso),
    };
  });

  const alturaCelula = modoView === "mes" ? 82 : 140;
  const colunas = modoView === "dia" ? "1fr" : "repeat(7, minmax(100px, 1fr))";

  const botaoNav = (onClick, children, title) => (
    <button onClick={onClick} title={title} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
      {children}
    </button>
  );

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
          <Clock size={13} /> Agenda — {tituloPeriodo}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["Todos", ...TECNICOS_OPTIONS].map((t) => (
              <button key={t} onClick={() => setTecnicoAtivo(t)} style={{
                background: tecnicoAtivo === t ? COLORS.redDim : "transparent", color: tecnicoAtivo === t ? COLORS.red : COLORS.steelLight,
                border: `1px solid ${tecnicoAtivo === t ? COLORS.red + "55" : COLORS.border}`, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, fontWeight: tecnicoAtivo === t ? 700 : 500, cursor: "pointer",
              }}>{t}</button>
            ))}
          </div>
          <button onClick={() => setShowModal(hojeIso)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 6, padding: "5px 10px", fontSize: 11.5, cursor: "pointer" }}>
            <Plus size={12} /> Novo item
          </button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {[["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]].map(([id, label]) => (
            <button key={id} onClick={() => setModoView(id)} style={{
              background: modoView === id ? COLORS.redDim : "transparent", color: modoView === id ? COLORS.red : COLORS.steelLight,
              border: `1px solid ${modoView === id ? COLORS.red + "55" : COLORS.border}`, borderRadius: 6, padding: "5px 14px", fontSize: 11.5, fontWeight: modoView === id ? 700 : 500, cursor: "pointer",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {botaoNav(() => navegar(-1), <ChevronLeft size={14} color={COLORS.steelLight} />, "Período anterior")}
          <button onClick={() => setDataRef(new Date())} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 11.5, color: COLORS.steelLight, cursor: "pointer" }}>Hoje</button>
          {botaoNav(() => navegar(1), <ChevronRight size={14} color={COLORS.steelLight} />, "Próximo período")}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: colunas, gap: 8, overflowX: "auto" }}>
        {dias.map(({ data, iso, dentroDoMes, processosDia, itensDia }) => (
          <div key={iso} onClick={modoView === "mes" ? () => { setDataRef(new Date(data)); setModoView("dia"); } : undefined} style={{
            background: iso === hojeIso ? COLORS.redDim : COLORS.panelAlt,
            border: `1px solid ${iso === hojeIso ? COLORS.red + "55" : COLORS.border}`, borderRadius: 8, padding: modoView === "mes" ? 7 : 10,
            minHeight: alturaCelula, display: "flex", flexDirection: "column", opacity: dentroDoMes ? 1 : 0.4,
            cursor: modoView === "mes" ? "pointer" : "default",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                {modoView !== "mes" && <div style={{ fontSize: 10.5, color: iso === hojeIso ? COLORS.red : COLORS.steel, textTransform: "uppercase", fontWeight: 700, marginBottom: 2 }}>{nomesDia[diaDaSemanaIndex(data)]}</div>}
                <div style={{ fontSize: modoView === "mes" ? 12 : 15, color: COLORS.ice, fontFamily: "'Oswald', sans-serif", fontWeight: 600, marginBottom: modoView === "mes" ? 2 : 6 }}>
                  {String(data.getDate()).padStart(2, "0")}{modoView !== "mes" ? `/${String(data.getMonth() + 1).padStart(2, "0")}` : ""}
                </div>
              </div>
              {modoView !== "mes" && (
                <button onClick={(e) => { e.stopPropagation(); setShowModal(iso); }} title="Adicionar item neste dia"
                  style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 5, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  <Plus size={11} color={COLORS.steel} />
                </button>
              )}
            </div>

            {modoView === "mes" ? (
              (processosDia.length + itensDia.length) > 0 && (
                <div style={{ fontSize: 9.5, color: COLORS.steelLight, marginTop: 2, lineHeight: 1.5 }}>
                  {processosDia.length > 0 && <div>{processosDia.length} prazo(s)</div>}
                  {itensDia.length > 0 && <div>{itensDia.length} item(ns)</div>}
                </div>
              )
            ) : (
              <>
                {processosDia.slice(0, modoView === "dia" ? 8 : 2).map((c, ci) => (
                  <div key={ci} onClick={() => onOpenProcesso(c.processo)} style={{ fontSize: 10.5, color: COLORS.steelLight, marginBottom: 5, cursor: "pointer", lineHeight: 1.4 }}>
                    <div style={{ fontWeight: 600, color: COLORS.ice }}>{c.processo.cliente}</div>
                    <div>{c.processo.assunto}</div>
                    <div style={{ fontSize: 9.5, color: COLORS.steel }}>{c.label}</div>
                  </div>
                ))}
                {modoView !== "dia" && processosDia.length > 2 && <div style={{ fontSize: 10, color: COLORS.steel, marginBottom: 4 }}>+{processosDia.length - 2} processo(s)</div>}

                {itensDia.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: AGENDA_TIPO_COLOR[a.tipo] || COLORS.steelLight, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10.5, color: COLORS.ice, fontWeight: 600, lineHeight: 1.3 }}>{a.titulo}</div>
                      <div style={{ fontSize: 9.5, color: COLORS.steel }}>{a.tipo}{a.tecnico ? ` · ${a.tecnico}` : ""}{a.descricao ? ` · ${a.descricao}` : ""}</div>
                    </div>
                    <button onClick={() => onRemoveItem(a.id)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                      <X size={10} color={COLORS.steel} />
                    </button>
                  </div>
                ))}

                {processosDia.length === 0 && itensDia.length === 0 && <div style={{ fontSize: 10.5, color: COLORS.steel }}>—</div>}
              </>
            )}
          </div>
        ))}
      </div>
      {showModal && <AgendaItemModal dataInicial={showModal} onClose={() => setShowModal(null)} onSave={onAddItem} />}
    </div>
  );
}


function AtualizacoesPage({ processos, onOpenProcesso, codigosUnidade }) {
  const [filtroCliente, setFiltroCliente] = useState([]);
  const [filtroUnidade, setFiltroUnidade] = useState([]);
  const [filtroTecnico, setFiltroTecnico] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const clientes = useMemo(() => Array.from(new Set(processos.map((p) => p.cliente))).sort(), [processos]);
  const unidades = useMemo(() => {
    if (!filtroCliente.length) return [];
    return Array.from(new Set(processos.filter((p) => filtroCliente.includes(p.cliente)).map((p) => p.unidade))).sort();
  }, [processos, filtroCliente]);
  const rotuloUn = (u) => rotuloUnidade(u, (codigosUnidade || {})[`${filtroCliente[0]}|${u}`]);

  const processosFiltrados = useMemo(() => processos.filter((p) => {
    if (filtroCliente.length && !filtroCliente.includes(p.cliente)) return false;
    if (filtroUnidade.length && !filtroUnidade.includes(p.unidade)) return false;
    if (filtroTecnico.length && !filtroTecnico.includes(p.tecnico)) return false;
    return true;
  }), [processos, filtroCliente, filtroUnidade, filtroTecnico]);

  const [ordem, ordenarPor] = useOrdenacao("data", "desc");
  const feed = useMemo(() => {
    const items = [];
    processosFiltrados.forEach((p) => {
      p.atualizacoes.forEach((a) => {
        if (a.incluirRelatorio === false) return;
        if (filtroTipo.length && !filtroTipo.includes(a.tipo)) return;
        items.push({ ...a, processo: p });
      });
    });
    const base = items.sort((a, b) => new Date(b.data) - new Date(a.data));
    return ordenarLista(base, ordem, {
      cliente: (a) => a.processo.cliente,
      unidade: (a) => a.processo.unidade,
      servico: (a) => a.processo.assunto,
      tecnico: (a) => a.processo.tecnico,
    });
  }, [processosFiltrados, filtroTipo, ordem]);
  const paginado = useMemo(() => paginate(feed, page, pageSize), [feed, page, pageSize]);

  const exportarCSV = () => {
    const rows = [["Cliente", "Código da unidade", "Unidade", "Assunto", "Status atual", "Responsável", "Data protocolo", "Previsão órgão", "Última atualização", "Última mensagem"]];
    processosFiltrados.forEach((p) => {
      const ultima = p.atualizacoes[0];
      rows.push([
        p.cliente, (codigosUnidade || {})[`${p.cliente}|${p.unidade}`] || "", p.unidade, p.assunto, statusLabel(p.statusAtual, p.tipo), rotuloResponsavel(STATUS_CONFIG[p.statusAtual].responsavel),
        fmtDate(p.dataProtocolo), fmtDate(p.dataPrevisaoOrgao), fmtDate(p.ultimaAtualizacao), ultima ? ultima.descricao : "",
      ]);
    });
    downloadCSV("situacao_processos.csv", rows);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <BotaoFiltroPopup grupos={[
            { label: "Clientes", options: clientes, selected: filtroCliente, onApply: (v) => { setFiltroCliente(v); setFiltroUnidade([]); setPage(1); } },
            { label: "Unidades do cliente", options: unidades, selected: filtroUnidade, onApply: (v) => { setFiltroUnidade(v); setPage(1); }, labelFor: rotuloUn,
              habilitado: filtroCliente.length > 0, mensagemBloqueio: "Escolha um cliente para carregar as unidades." },
            { label: "Técnicos", options: TECNICOS_OPTIONS, selected: filtroTecnico, onApply: (v) => { setFiltroTecnico(v); setPage(1); } },
            { label: "Tipos de atualização", options: ATUALIZACAO_TIPOS, selected: filtroTipo, onApply: (v) => { setFiltroTipo(v); setPage(1); } },
          ]} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => imprimirStatusServicoGeral(processosFiltrados, filtroCliente.length === 1 ? filtroCliente[0] : null)}
            style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <Download size={13} /> Exportar para o cliente
          </button>
          <button onClick={exportarCSV} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "8px 14px", fontSize: 12.5, cursor: "pointer" }}>
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "4px 0" }}>
        <table style={{ tableLayout: "fixed" }}><thead><tr>
          <Th campo="data" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 18px", width: 110 }}>Data</Th>
          <Th campo="cliente" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 8px" }}>Cliente</Th>
          <Th campo="unidade" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 8px" }}>Unidade</Th>
          <Th campo="servico" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 8px" }}>Serviço</Th>
          <Th campo="tipo" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 8px" }}>Tipo de ocorrência</Th>
          <Th campo="tecnico" ordem={ordem} ordenarPor={ordenarPor} style={{ padding: "9px 18px", width: 130 }}>Técnico</Th>
        </tr></thead></table>
        {feed.length === 0 && <div style={{ padding: 30, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhuma ocorrência encontrada com esses filtros.</div>}
        {paginado.map((a) => (
          <div key={a.id} className="row-hover" onClick={() => onOpenProcesso(a.processo)} style={{ display: "flex", gap: 14, padding: "12px 18px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }}>
            <div style={{ width: 78, flexShrink: 0, fontSize: 11.5, color: COLORS.steel, fontFamily: "monospace" }}>{fmtDate(a.data)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.ice }}>{a.processo.cliente}</span>
                <span style={{ fontSize: 11.5, color: COLORS.steel }}>{rotuloUnidade(a.processo.unidade, (codigosUnidade || {})[`${a.processo.cliente}|${a.processo.unidade}`])}</span>
                <Pill fg={COLORS.steelLight} bg="rgba(255,255,255,0.06)">{a.tipo}</Pill>
                <span style={{ fontSize: 10.5, color: COLORS.steel }}>resp.: {rotuloResponsavel(a.responsavel)}</span>{a.dataPrevistaRetorno && <span style={{ fontSize: 10.5, color: COLORS.orange }}>· retorno previsto: {fmtDate(a.dataPrevistaRetorno)}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.steel, marginBottom: 3 }}>{a.processo.assunto} · técnico: {a.processo.tecnico}</div>
              <div style={{ fontSize: 12.5, color: COLORS.steelLight, lineHeight: 1.5 }}>{a.descricao}</div>
            </div>
            <ChevronRight size={15} color={COLORS.steel} style={{ flexShrink: 0, marginTop: 2 }} />
          </div>
        ))}
        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={feed.length} />
      </div>
    </div>
  );
}

/* ============================================================
   CONTRATOS — página financeira/comercial alimentada por upload
   de planilha (ex: planejamento-financeiro), independente dos
   processos de produção
   ============================================================ */
const CONTRATO_HEADER_MAP = {
  proposta: ["Proposta"],
  cliente: ["Cliente"],
  unidade: ["Unidade"],
  codigoLoja: ["Código Loja", "Codigo Loja", "Código  Loja", "Código da Unidade", "Codigo da Unidade", "Código Unidade", "Codigo Unidade"],
  servico: ["Serviço", "Servico"],
  tarefa: ["Tarefa"],
  tecnico: ["Técnico", "Tecnico"],
  coordenador: ["Coordenador"],
  dataSLA: ["Data SLA"],
  dataSLAServico: ["Data SLA Serviço", "Data SLA Servico"],
  statusContrato: ["Status do Contrato"],
  statusServico: ["Status do Serviço", "Status do Servico"],
  statusParcela: ["Status da Parcela"],
  observacao: ["Observação", "Observacao"],
};

function findHeaderIndex(headerRow, aliases) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  for (const alias of aliases) {
    const idx = headerRow.findIndex((h) => norm(h) === norm(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function excelDateToISO(v) {
  if (v === null || v === undefined || v === "" || v === "-") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const str = String(v).trim();
  const m1 = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`;
  return null;
}

function parseContratosSheet(rows) {
  if (!rows || rows.length < 2) return [];
  const header = rows[0];
  const cols = {};
  Object.entries(CONTRATO_HEADER_MAP).forEach(([key, aliases]) => { cols[key] = findHeaderIndex(header, aliases); });
  const get = (row, key) => (cols[key] !== -1 ? row[cols[key]] : undefined);
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const cliente = get(row, "cliente");
    if (!cliente || String(cliente).trim() === "") continue;
    out.push({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      proposta: String(get(row, "proposta") ?? "-").trim() || "-",
      cliente: String(cliente).trim(),
      unidade: String(get(row, "unidade") ?? "-").trim() || "-",
      codigoLoja: String(get(row, "codigoLoja") ?? "-").trim() || "-",
      servico: String(get(row, "servico") ?? "-").trim() || "-",
      tarefa: String(get(row, "tarefa") ?? "-").trim() || "-",
      tecnico: String(get(row, "tecnico") ?? "-").trim() || "-",
      coordenador: String(get(row, "coordenador") ?? "-").trim() || "-",
      tipo: classifyTipoServico(get(row, "servico")),
      dataSLA: excelDateToISO(get(row, "dataSLA")),
      dataSLAServico: excelDateToISO(get(row, "dataSLAServico")),
      statusContrato: String(get(row, "statusContrato") ?? "-").trim() || "-",
      statusServico: String(get(row, "statusServico") ?? "-").trim() || "-",
      statusParcela: normalizeStatusParcela(get(row, "statusParcela")),
      observacao: String(get(row, "observacao") ?? "").trim(),
    });
  }
  return out;
}

/* Situação operacional de cada tarefa/etapa de um serviço.
   Nada aqui tem relação com valores — só com o andamento. */
const STATUS_PARCELA_OPTIONS = ["Pendente", "Em andamento", "Concluído", "Suspenso"];
function normalizeStatusParcela(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (s === "em progresso" || s === "em andamento" || s === "andamento") return "Em andamento";
  if (s === "suspenso") return "Suspenso";
  if (s === "concluído" || s === "concluido" || s === "entregue"
    || s === "invoice" || s === "faturado" || s === "pago"
    || s === "concluído / não faturado" || s === "concluido / nao faturado") return "Concluído";
  return "Pendente";
}
const CONTRATO_TIPO_OPTIONS = ["Processo", "Serviço Técnico"];
const TECNICOS_OPTIONS = ["Felipe Moura", "Janayna"];

/* ============================================================
   VÍNCULO CONTRATOS → PROCESSOS
   Cada linha da planilha é uma parcela/tarefa de um serviço.
   Agrupamos por proposta+cliente+unidade+serviço para formar (ou
   atualizar) um processo em Produção, com data e atualizações
   derivadas — assim Processos, Atualizações e os Dashboards
   passam a refletir automaticamente o que foi importado.
   ============================================================ */
function classifyTipoServico(servico) {
  const s = (servico || "").toLowerCase();
  const tecnico = ["art/rrt", "art ", " art", "rrt", "atestado", "manifestação técnica", "manifestacao tecnica",
    "as built", "as-built", "vistoria", "memorial", "relatório de análises", "relatorio de analises",
    "transferência de responsabilidade", "transferencia de responsabilidade"];
  return tecnico.some((k) => s.includes(k)) ? "Serviço Técnico" : "Processo";
}

function mapContratoStatus(statusContrato, statusServico) {
  const c = (statusContrato || "").trim();
  const s = (statusServico || "").trim();
  if (/conclu[ií]do/i.test(c)) return "concluido";
  if (/cancelado/i.test(c)) return "cancelado";
  if (/suspenso/i.test(c) || /suspenso/i.test(s)) return "suspenso";
  if (s === "Distribuido") return "em_montagem";
  if (s === "Faturar") return "protocolado";
  if (s === "Pendente") return "em_montagem";
  if (s === "Em Andamento") return "protocolado";
  if (/pendente/i.test(c)) return "em_montagem";
  return "protocolado";
}

function minDate(dates) { const v = dates.filter(Boolean).sort(); return v[0] || null; }
function maxDate(dates) { const v = dates.filter(Boolean).sort(); return v[v.length - 1] || null; }

function tarefaParaTipoAtualizacao(tarefa) {
  const t = (tarefa || "").toLowerCase();
  if (t.includes("protocolo")) return "Tramitação / Movimentação processual";
  if (t.includes("deferimento") || t.includes("obtenção") || t.includes("entrega")) return "Tramitação / Movimentação processual";
  if (t.includes("exigência") || t.includes("exigencia") || t.includes("nec")) return "Comunique-se / Exigência recebida";
  if (t.includes("sinal") || t.includes("contratação")) return "Reunião / Alinhamento com cliente";
  return "Outro";
}

/* Ao importar uma nova planilha, concilia com os contratos já
   existentes: atualiza a linha correspondente (mesma proposta +
   cliente + unidade + serviço + tarefa) em vez de duplicar, e
   mantém tudo que já estava cadastrado e não veio na nova planilha. */
function mergeImportedContratos(existentes, novasLinhas) {
  const chave = (c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}|${c.tarefa}`;
  const out = [...existentes];
  novasLinhas.forEach((nova) => {
    const idx = out.findIndex((c) => chave(c) === chave(nova));
    if (idx !== -1) out[idx] = { ...out[idx], ...nova, id: out[idx].id };
    else out.push(nova);
  });
  return out;
}

/* Confere se todo grupo de contrato (proposta+cliente+unidade+serviço)
   tem um processo correspondente em Controle de Processos — e cria
   automaticamente os que estiverem faltando, persistindo no banco.
   Roda sempre que os dados carregam ou um contrato é adicionado, para
   que as duas telas nunca fiquem fora de sincronia. */
async function reconciliarProcessos(contratosCompletos, processosAtuais) {
  const grupos = grupoContratos(contratosCompletos);
  const faltantes = [];
  Object.values(grupos).forEach((parcelas) => {
    const ref = parcelas[0];
    const existe = processosAtuais.some((p) => p.numeroContrato === ref.proposta && p.cliente === ref.cliente && p.unidade === ref.unidade && p.assunto === ref.servico);
    if (!existe) faltantes.push(ref);
  });
  if (faltantes.length === 0) return processosAtuais;

  let resultado = processosAtuais;
  for (const ref of faltantes) {
    const novo = baseProcesso({
      cliente: ref.cliente, unidade: ref.unidade, cidade: "", uf: "",
      assunto: ref.servico, tipo: ref.tipo || classifyTipoServico(ref.servico), numero: "-",
      statusAtual: "aguardando", tecnico: TECNICOS_OPTIONS.includes(ref.tecnico) ? ref.tecnico : "-",
      numeroContrato: ref.proposta,
    });
    const { id, ...campos } = processoToRow(novo);
    const { data, error } = await supabase.from("processos").insert(campos).select().single();
    if (error) { console.error("Não foi possível criar o processo automaticamente:", error, ref); continue; }
    resultado = [rowToProcesso(data), ...resultado];
  }
  return resultado;
}

function grupoContratos(rows) {
  const map = {};
  rows.forEach((r) => {
    const key = `${r.proposta}|${r.cliente}|${r.unidade}|${r.servico}`;
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
}

function mergeContratosIntoProcessos(processosAtuais, novasLinhas) {
  const grupos = grupoContratos(novasLinhas);
  let processos = [...processosAtuais];

  Object.values(grupos).forEach((parcelas) => {
    const ref = parcelas[0];
    const idxExistente = processos.findIndex((p) => p.numeroContrato === ref.proposta && p.cliente === ref.cliente && p.unidade === ref.unidade && p.assunto === ref.servico);
    const hojeISO = new Date().toISOString().slice(0, 10);

    if (idxExistente !== -1) {
      // Processo já existe e pode estar em andamento manualmente — a reimportação só
      // atualiza o vínculo com o contrato (tipo, técnico, tarefas), nunca mexe no status
      // operacional, nas datas ou nas atualizações já registradas manualmente.
      const atual = processos[idxExistente];
      processos[idxExistente] = {
        ...atual,
        tipo: ref.tipo || atual.tipo,
        tecnico: TECNICOS_OPTIONS.includes(ref.tecnico) ? ref.tecnico : atual.tecnico,
        numeroContrato: ref.proposta,
        parcelasContrato: parcelas,
      };
    } else {
      processos = [baseProcesso({
        id: `contrato-${ref.proposta}-${ref.servico}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        cliente: ref.cliente, unidade: ref.unidade, cidade: "", uf: "",
        assunto: ref.servico, tipo: ref.tipo || classifyTipoServico(ref.servico), numero: "-",
        statusAtual: "aguardando", prestador: "-", tecnico: TECNICOS_OPTIONS.includes(ref.tecnico) ? ref.tecnico : "-",
        numeroContrato: ref.proposta,
        parcelasContrato: parcelas, ultimaAtualizacao: hojeISO,
      }), ...processos];
    }
  });

  return processos;
}

/* Sincroniza a situação das tarefas em Serviços contratados conforme o
   processo avança:
   - Ao sair de "aguardando": a tarefa de Sinal/abertura (se pendente) conclui
     na hora; as demais tarefas pendentes desse serviço entram em "Em andamento".
   - Ao chegar em "protocolado": a tarefa de Protocolo conclui.
   - Ao chegar em "concluido": todas as tarefas desse serviço concluem.
   Comparação por cliente/unidade/serviço normalizados (sem diferenciar
   maiúsculas/espaços), para não depender do número do contrato bater exato. */
function sincronizarParcelasComProcesso(processo, contratosAtuais) {
  const norm = (s) => (s || "").trim().toLowerCase();
  const doServico = (c) => norm(c.cliente) === norm(processo.cliente) && norm(c.unidade) === norm(processo.unidade) && norm(c.servico) === norm(processo.assunto);
  return contratosAtuais.map((c) => {
    if (!doServico(c)) return c;
    if (processo.statusAtual === "aguardando") return c;
    if (processo.statusAtual === "concluido") {
      return c.statusParcela === "Concluído" ? c : { ...c, statusParcela: "Concluído" };
    }
    if (c.statusParcela === "Pendente") {
      return { ...c, statusParcela: /sinal/i.test(c.tarefa || "") ? "Concluído" : "Em andamento" };
    }
    if (processo.statusAtual === "protocolado" && c.statusParcela === "Em andamento" && /protocolo/i.test(c.tarefa || "")) {
      return { ...c, statusParcela: "Concluído" };
    }
    return c;
  });
}

/* O técnico (e o tipo) só podem ser alterados na tela de Contratos —
   qualquer edição ali reflete automaticamente no processo vinculado. */
function sincronizarTecnicoTipoProcesso(contrato, processosAtuais) {
  return processosAtuais.map((p) => {
    if (p.numeroContrato === contrato.proposta && p.cliente === contrato.cliente && p.unidade === contrato.unidade && p.assunto === contrato.servico) {
      return { ...p, tecnico: TECNICOS_OPTIONS.includes(contrato.tecnico) ? contrato.tecnico : p.tecnico, tipo: contrato.tipo || p.tipo };
    }
    return p;
  });
}

const STATUS_PARCELA_COLOR = {
  "Pendente": { fg: COLORS.steel, bg: "rgba(255,255,255,0.06)" },
  "Em andamento": { fg: COLORS.blue, bg: COLORS.blueDim },
  "Concluído": { fg: COLORS.green, bg: COLORS.greenDim },
  "Suspenso": { fg: COLORS.orange, bg: COLORS.orangeDim },
};
function statusParcelaStyle(s) { return STATUS_PARCELA_COLOR[s] || { fg: COLORS.steelLight, bg: "rgba(255,255,255,0.06)" }; }
const STATUS_CONTRATO_COLOR = {
  "Em Andamento": { fg: COLORS.blue, bg: COLORS.blueDim },
  "Pendente": { fg: COLORS.steel, bg: "rgba(255,255,255,0.06)" },
  "Suspenso": { fg: COLORS.orange, bg: COLORS.orangeDim },
  "Concluído": { fg: COLORS.green, bg: COLORS.greenDim },
  "Cancelado": { fg: COLORS.overdue, bg: COLORS.overdueDim },
};
function statusContratoStyle(s) { return STATUS_CONTRATO_COLOR[s] || { fg: COLORS.steelLight, bg: "rgba(255,255,255,0.06)" }; }

/* ============================================================
   PAGINAÇÃO — reutilizada em todas as listagens (clientes,
   unidades, contratos, processos, atualizações)
   ============================================================ */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
function paginate(items, page, pageSize) {
  if (pageSize === "todas") return items;
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
function Pagination({ page, setPage, pageSize, setPageSize, totalItems }) {
  const totalPages = pageSize === "todas" ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (pageSize === "todas" ? 1 : (page - 1) * pageSize + 1);
  const to = pageSize === "todas" ? totalItems : Math.min(page * pageSize, totalItems);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", flexWrap: "wrap", gap: 10, borderTop: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 11.5, color: COLORS.steel }}>{totalItems === 0 ? "Nenhum registro" : `${from}–${to} de ${totalItems}`}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11.5, color: COLORS.steel }}>Linhas por página</span>
          <select value={pageSize} onChange={(e) => { setPageSize(e.target.value === "todas" ? "todas" : Number(e.target.value)); setPage(1); }}
            style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 8px", color: COLORS.steelLight, fontSize: 12 }}>
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            <option value="todas">Todas</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: page <= 1 ? "default" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={14} color={COLORS.steelLight} />
          </button>
          <span style={{ fontSize: 11.5, color: COLORS.steelLight, minWidth: 90, textAlign: "center" }}>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: page >= totalPages ? "default" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>
            <ChevronRight size={14} color={COLORS.steelLight} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   IMPORTAR NOVOS CLIENTES / CONTRATOS — página dedicada
   (único lugar onde a planilha de contratos é enviada)
   ============================================================ */
function ImportarClientesContratosPage({ onImport }) {
  const [status, setStatus] = useState(null);
  const [confirmado, setConfirmado] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setConfirmado(false);
    const isCSV = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let rows;
        if (isCSV) {
          const parsed = Papa.parse(ev.target.result, { skipEmptyLines: true });
          rows = parsed.data;
        } else {
          const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
          const sheetName = wb.SheetNames.find((n) => /planejamento|contrato|financeiro/i.test(n)) || wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
        }
        const contratos = parseContratosSheet(rows);
        const clientesNovos = new Set(contratos.map((c) => c.cliente)).size;
        const unidadesNovas = new Set(contratos.map((c) => `${c.cliente}|${c.unidade}`)).size;
        const servicosNovos = new Set(contratos.map((c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}`)).size;
        const propostasNovas = new Set(contratos.map((c) => c.proposta)).size;
        setStatus({ ok: true, count: contratos.length, clientesNovos, unidadesNovas, servicosNovos, propostasNovas, data: contratos, fileName: file.name });
      } catch (err) {
        setStatus({ ok: false });
      }
    };
    if (isCSV) reader.readAsText(file, "UTF-8");
    else reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24 }}>
        <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 6 }}>Importar planilha</div>
        <p style={{ fontSize: 12.5, color: COLORS.steel, lineHeight: 1.6, marginBottom: 18 }}>
          Envie a mesma planilha de sempre (.xlsx). O sistema lê Proposta, Cliente, Unidade, Serviço, Tarefa, Técnico, Coordenador, datas e status —
          e <b style={{ color: COLORS.steelLight }}>ignora automaticamente qualquer coluna de valor</b> (Honorários, Valor Faturamento, Porcentagem, Data de Faturamento),
          que pode continuar existindo no arquivo sem problema.
          Os clientes, unidades e serviços são adicionados aos já existentes, e os processos e atualizações correspondentes são criados ou atualizados automaticamente.
        </p>
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: `1.5px dashed ${COLORS.border}`,
          borderRadius: 10, padding: "28px 16px", cursor: "pointer", background: COLORS.panelAlt,
        }}>
          <Upload size={22} color={COLORS.steel} />
          <span style={{ fontSize: 13, color: COLORS.steelLight, fontWeight: 600 }}>Clique para selecionar o arquivo</span>
          <span style={{ fontSize: 11, color: COLORS.steel }}>.xlsx, .xls ou .csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {status && status.ok && (
          <div style={{ marginTop: 18, background: COLORS.greenDim, border: `1px solid ${COLORS.green}55`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 13, color: COLORS.green, fontWeight: 700, marginBottom: 4 }}>{status.fileName} lido com sucesso</div>
            <div style={{ fontSize: 12.5, color: COLORS.steelLight, lineHeight: 1.6 }}>
              {status.count} tarefa(s) · {status.servicosNovos} serviço(s) · {status.propostasNovas} contrato(s) · {status.clientesNovos} cliente(s) · {status.unidadesNovas} unidade(s) reconhecida(s).
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.steel, marginTop: 6 }}>Colunas de valor encontradas no arquivo foram ignoradas.</div>
          </div>
        )}
        {status && !status.ok && (
          <div style={{ marginTop: 18, fontSize: 13, color: COLORS.red }}>Não foi possível ler esse arquivo. Verifique se é um .xlsx ou .csv válido com os cabeçalhos esperados.</div>
        )}
        {confirmado && <div style={{ marginTop: 14, fontSize: 13, color: COLORS.green }}>Importação concluída — dados disponíveis em Clientes, Unidades, Serviços contratados, Processos e Atualizações.</div>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button disabled={!status || !status.ok} onClick={() => { onImport(status.data); setConfirmado(true); setStatus(null); }}
            style={{ background: status && status.ok ? COLORS.red : COLORS.grayDim, border: "none", color: status && status.ok ? "#fff" : COLORS.steel, borderRadius: 7, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: status && status.ok ? "pointer" : "default", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
            Confirmar importação
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CLIENTES — listagem agregada a partir dos contratos importados
   ============================================================ */
/* ============================================================
   CADASTRO MANUAL — cliente / unidade / contrato
   (alternativa à importação de planilha)
   ============================================================ */
function novaLinhaContrato(f) {
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    proposta: f.proposta || "-", cliente: f.cliente, unidade: f.unidade || "-", codigoLoja: f.codigoLoja || "-",
    servico: f.servico || "-", tarefa: f.tarefa || "-", tecnico: f.tecnico || "-", coordenador: f.coordenador || "-",
    tipo: f.tipo || classifyTipoServico(f.servico),
    dataSLA: f.dataSLA || null, dataSLAServico: null,
    statusContrato: f.statusContrato || "Em Andamento", statusServico: f.statusServico || "Em Andamento",
    statusParcela: f.statusParcela || "Pendente", observacao: f.observacao || "",
  };
}

/* ============================================================
   LOGIN — autenticação real via Supabase (sem senha no código)
   ============================================================ */
/* ============================================================
   GERENCIAR ACESSOS — só o administrador vê esta tela. Cria e
   remove logins chamando o backend seguro (Edge Function), que
   guarda a chave secreta do lado do servidor.
   ============================================================ */
/* ============================================================
   TREINAMENTOS E COMISSÕES TÉCNICAS — só administrador cria
   eventos e marca presença. Alimenta o pilar 3 do Ranking.
   ============================================================ */
function NovoEventoModal({ onClose, onSave }) {
  const [f, setF] = useState({ titulo: "", tipo: "Treinamento", data: hojeISOStr(), tecnicosObrigatorios: [] });
  const toggleTecnico = (t) => setF((s) => ({ ...s, tecnicosObrigatorios: s.tecnicosObrigatorios.includes(t) ? s.tecnicosObrigatorios.filter((x) => x !== t) : [...s.tecnicosObrigatorios, t] }));
  return (
    <ModalShell title="Novo treinamento / comissão" onClose={onClose} maxWidth={440}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ModalField label="Título"><input value={f.titulo} onChange={(e) => setF((s) => ({ ...s, titulo: e.target.value }))} placeholder="Ex: Atualização NBR 12345" style={modalInputStyle} /></ModalField>
        <ModalField label="Tipo">
          <select value={f.tipo} onChange={(e) => setF((s) => ({ ...s, tipo: e.target.value }))} style={modalInputStyle}>
            <option value="Treinamento">Treinamento</option>
            <option value="Comissão Técnica">Comissão Técnica</option>
          </select>
        </ModalField>
        <ModalField label="Data"><input type="date" value={f.data} onChange={(e) => setF((s) => ({ ...s, data: e.target.value }))} style={modalInputStyle} /></ModalField>
        <ModalField label="Obrigatório para">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {TECNICOS_OPTIONS.map((t) => (
              <label key={t} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={f.tecnicosObrigatorios.includes(t)} onChange={() => toggleTecnico(t)} />
                <span style={{ fontSize: 12.5, color: COLORS.ice }}>{t}</span>
              </label>
            ))}
          </div>
        </ModalField>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => { if (!f.titulo.trim() || f.tecnicosObrigatorios.length === 0) return; onSave({ ...f, titulo: f.titulo.trim(), presencas: {} }); onClose(); }}
          style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          Salvar evento
        </button>
      </div>
    </ModalShell>
  );
}

function TreinamentosPage({ eventos, onAddEvento, onExcluirEventos, edits, onEdit }) {
  const [showNovo, setShowNovo] = useState(false);
  const [selecionados, setSelecionados] = useState(new Set());
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const rascunho = useRascunho();
  const ordenados = useMemo(() => [...eventos].sort((a, b) => b.data.localeCompare(a.data)), [eventos]);
  const presencasDe = (ev) => (edits && edits[ev.id] && edits[ev.id].presencas) ? edits[ev.id].presencas : ev.presencas;
  const pendentesAqui = Object.keys(edits || {}).length;

  const toggleSel = (id) => setSelecionados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <BotaoSalvar pendentes={pendentesAqui} onSalvar={rascunho ? rascunho.salvarTudo : undefined} onDescartar={rascunho ? rascunho.descartarTudo : undefined} salvando={rascunho ? rascunho.salvando : false} compacto />
        <button onClick={() => setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          <Plus size={15} /> Novo treinamento / comissão
        </button>
      </div>
      <BarraSelecaoExclusao contagem={selecionados.size} rotulo="evento(s)" onLimpar={() => setSelecionados(new Set())} onExcluir={() => setConfirmExcluir(true)} />

      {ordenados.length === 0 && <div style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>Nenhum treinamento ou comissão cadastrado ainda.</div>}
      {ordenados.map((ev) => (
        <div key={ev.id} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <input type="checkbox" checked={selecionados.has(ev.id)} onChange={() => toggleSel(ev.id)} style={{ marginTop: 3 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: COLORS.ice }}>{ev.titulo}</div>
                <div style={{ fontSize: 11.5, color: COLORS.steel, marginTop: 2 }}>{ev.tipo} · {fmtDate(ev.data)}</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingLeft: 26 }}>
            {ev.tecnicosObrigatorios.map((t) => {
              const pres = presencasDe(ev);
              return (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!pres[t]} onChange={(e) => onEdit(ev.id, "presencas", { ...pres, [t]: e.target.checked })} />
                  <span style={{ fontSize: 12.5, color: COLORS.ice }}>{t}</span>
                  <Pill fg={pres[t] ? COLORS.green : COLORS.steel} bg={pres[t] ? COLORS.greenDim : "rgba(255,255,255,0.06)"}>{pres[t] ? "Presente" : "Ausente"}</Pill>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {showNovo && <NovoEventoModal onClose={() => setShowNovo(false)} onSave={onAddEvento} />}
      {confirmExcluir && (
        <ConfirmarExclusaoModal titulo="Excluir eventos" onCancelar={() => setConfirmExcluir(false)}
          mensagem={`Excluir ${selecionados.size} evento(s) selecionado(s)? Isso afeta o cálculo do Ranking de Técnicos para os meses correspondentes. Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirEventos(eventos.filter((e) => selecionados.has(e.id))); setSelecionados(new Set()); setConfirmExcluir(false); }} />
      )}
    </div>
  );
}

/* ============================================================
   RANKING DE TÉCNICOS — 3 pilares separados: metas do
   planejamento mensal, retrabalho (exigências) e participação em
   treinamentos/comissões. Exporta em CSV para o RH.
   ============================================================ */
function RankingTecnicosPage({ contratos, processos, eventos }) {
  const hojeRef = new Date();
  const [ano, setAno] = useState(String(hojeRef.getFullYear()));
  const [mes, setMes] = useState(String(hojeRef.getMonth() + 1));

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(contratos.map((c) => (c.dataSLA ? c.dataSLA.slice(0, 4) : null)).filter(Boolean));
    anos.add(String(hojeRef.getFullYear()));
    return Array.from(anos).sort();
  }, [contratos]); // eslint-disable-line

  const chaveMes = `${ano}-${String(mes).padStart(2, "0")}`;

  const linhas = useMemo(() => TECNICOS_OPTIONS.map((tecnico) => {
    const contratosDoMes = contratos.filter((c) => c.tecnico === tecnico && c.dataSLA && c.dataSLA.slice(0, 7) === chaveMes);
    const grupos = {};
    contratosDoMes.forEach((c) => { grupos[`${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}`] = c; });
    const totalPlanejado = Object.keys(grupos).length;
    let concluidos = 0;
    Object.values(grupos).forEach((c) => {
      const proc = processos.find((p) => p.numeroContrato === c.proposta && p.cliente === c.cliente && p.unidade === c.unidade && p.assunto === c.servico);
      if (proc && proc.statusAtual === "concluido") concluidos++;
    });
    const pctMetas = totalPlanejado === 0 ? null : Math.round((concluidos / totalPlanejado) * 100);

    const retrabalhos = processos.filter((p) => p.tecnico === tecnico && p.dataExigenciaRecebida && p.dataExigenciaRecebida.slice(0, 7) === chaveMes).length;

    const eventosDoMes = eventos.filter((e) => e.tecnicosObrigatorios.includes(tecnico) && e.data.slice(0, 7) === chaveMes);
    const presentes = eventosDoMes.filter((e) => e.presencas[tecnico]).length;
    const pctTreinamentos = eventosDoMes.length === 0 ? null : Math.round((presentes / eventosDoMes.length) * 100);

    return { tecnico, totalPlanejado, concluidos, pctMetas, retrabalhos, totalEventos: eventosDoMes.length, presentes, pctTreinamentos };
  }), [contratos, processos, eventos, chaveMes]);

  const exportarCSV = () => {
    const rows = [["Técnico", "Metas planejadas", "Metas concluídas", "% Metas atingidas", "Retrabalhos (exigências)", "Eventos obrigatórios", "Presenças", "% Participação treinamentos/comissões"]];
    linhas.forEach((l) => rows.push([
      l.tecnico, l.totalPlanejado, l.concluidos, l.pctMetas === null ? "—" : `${l.pctMetas}%`,
      l.retrabalhos, l.totalEventos, l.presentes, l.pctTreinamentos === null ? "—" : `${l.pctTreinamentos}%`,
    ]));
    downloadCSV(`ranking_tecnicos_${chaveMes}.csv`, rows);
  };

  const corPct = (v) => v === null ? COLORS.steel : v >= 80 ? COLORS.green : v >= 50 ? COLORS.orange : COLORS.red;
  const [ordem, ordenarPor] = useOrdenacao();

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Select value={ano} onChange={setAno} options={anosDisponiveis} />
          <select value={mes} onChange={(e) => setMes(e.target.value)} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", color: COLORS.steelLight, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>
            {MESES_NOMES.map((nome, i) => <option key={nome} value={String(i + 1)}>{nome}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => imprimirRanking(linhas, chaveMes)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 12.5, cursor: "pointer" }}>
            <Download size={14} /> Exportar PDF
          </button>
          <button onClick={exportarCSV} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <Download size={14} /> Exportar CSV para o RH
          </button>
        </div>
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>
              <Th campo="tecnico" ordem={ordem} ordenarPor={ordenarPor}>Técnico</Th>
              <Th campo="totalPlanejado" ordem={ordem} ordenarPor={ordenarPor}>Metas do mês</Th>
              <Th campo="concluidos" ordem={ordem} ordenarPor={ordenarPor}>Concluídas</Th>
              <Th campo="pctMetas" ordem={ordem} ordenarPor={ordenarPor}>% Metas atingidas</Th>
              <Th campo="retrabalhos" ordem={ordem} ordenarPor={ordenarPor}>Retrabalhos (exigências)</Th>
              <Th campo="totalEventos" ordem={ordem} ordenarPor={ordenarPor}>Eventos obrigatórios</Th>
              <Th campo="presentes" ordem={ordem} ordenarPor={ordenarPor}>Presenças</Th>
              <Th campo="pctTreinamentos" ordem={ordem} ordenarPor={ordenarPor}>% Participação</Th>
            </tr></thead>
            <tbody>
              {ordenarLista(linhas, ordem).map((l) => (
                <tr key={l.tecnico} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, color: COLORS.ice }}>{l.tecnico}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.steelLight }}>{l.totalPlanejado}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.steelLight }}>{l.concluidos}</td>
                  <td style={{ padding: "12px 16px" }}>{l.pctMetas === null ? <span style={{ color: COLORS.steel, fontSize: 12.5 }}>Sem metas</span> : <Pill fg={corPct(l.pctMetas)} bg={`${corPct(l.pctMetas)}22`}>{l.pctMetas}%</Pill>}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: l.retrabalhos > 0 ? COLORS.red : COLORS.steelLight, fontWeight: l.retrabalhos > 0 ? 700 : 400 }}>{l.retrabalhos}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.steelLight }}>{l.totalEventos}</td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.steelLight }}>{l.presentes}</td>
                  <td style={{ padding: "12px 16px" }}>{l.pctTreinamentos === null ? <span style={{ color: COLORS.steel, fontSize: 12.5 }}>Sem eventos</span> : <Pill fg={corPct(l.pctTreinamentos)} bg={`${corPct(l.pctTreinamentos)}22`}>{l.pctTreinamentos}%</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 14, fontSize: 11.5, color: COLORS.steel, lineHeight: 1.6 }}>
        "Metas do mês" considera os serviços com Data SLA no mês selecionado, por técnico (tela de Contratos). "Concluídas" conta os que já têm o processo correspondente como Concluído/Deferido em Controle de Processos.
        "Retrabalhos" conta quantos processos daquele técnico receberam exigência no mês, esteja ou não esse processo no planejamento do mês. Os 3 números são mostrados separados — a ponderação final fica a critério do RH.
      </div>
    </div>
  );
}

/* ============================================================
   MÉTRICAS DE USO — quais telas são mais e menos usadas pela
   equipe, para orientar prioridades de evolução do sistema.
   ============================================================ */
const TELA_LABELS = {
  "dashboard-processos": "Dashboard · Processos / Serviços",
  "dashboard-servicos": "Planejamento de Serviços",
  "clientes": "Clientes",
  "unidades": "Unidades de clientes",
  "contratos": "Serviços contratados",
  "importar-contratos": "Importar novos clientes/serviços",
  "processos": "Controle de Processos e Serviços",
  "atualizacoes": "Relatório de Status",
  "treinamentos": "Treinamentos e Comissões",
  "ranking": "Ranking de Técnicos",
  "acessos": "Área do Administrador",
};

function MetricasUsoPage() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [periodo, setPeriodo] = useState("30");

  useEffect(() => {
    setCarregando(true);
    supabase.from("eventos_uso").select("tela, usuario_nome, criado_em").order("criado_em", { ascending: false }).limit(20000)
      .then(({ data, error }) => { if (!error && data) setEventos(data); setCarregando(false); });
  }, []);

  const eventosFiltrados = useMemo(() => {
    if (periodo === "todos") return eventos;
    const limite = new Date();
    limite.setDate(limite.getDate() - parseInt(periodo, 10));
    return eventos.filter((e) => new Date(e.criado_em) >= limite);
  }, [eventos, periodo]);

  const porTela = useMemo(() => {
    const map = {};
    eventosFiltrados.forEach((e) => { map[e.tela] = (map[e.tela] || 0) + 1; });
    return Object.entries(map).map(([tela, qtd]) => ({ tela: TELA_LABELS[tela] || tela, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [eventosFiltrados]);

  const porUsuario = useMemo(() => {
    const map = {};
    eventosFiltrados.forEach((e) => { const nome = e.usuario_nome || "—"; map[nome] = (map[nome] || 0) + 1; });
    return Object.entries(map).map(([nome, qtd]) => ({ nome, qtd })).sort((a, b) => b.qtd - a.qtd);
  }, [eventosFiltrados]);

  const maxQtd = porTela.length ? porTela[0].qtd : 1;

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", color: COLORS.steelLight, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="todos">Todo o período</option>
        </select>
        <span style={{ fontSize: 11.5, color: COLORS.steel }}>{eventosFiltrados.length} acesso(s) registrado(s)</span>
      </div>

      {carregando ? (
        <div style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Carregando...</div>
      ) : porTela.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
          Nenhum acesso registrado ainda neste período. As métricas começam a aparecer conforme o sistema é usado a partir de agora.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, alignItems: "start" }}>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 16 }}>Telas mais e menos usadas</div>
            {porTela.map((t) => (
              <div key={t.tela} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span style={{ color: COLORS.ice }}>{t.tela}</span>
                  <span style={{ color: COLORS.steelLight, fontWeight: 700 }}>{t.qtd}</span>
                </div>
                <div style={{ height: 7, background: COLORS.panelAlt, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(t.qtd / maxQtd) * 100}%`, background: COLORS.red, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 16 }}>Acessos por pessoa</div>
            {porUsuario.map((u) => (
              <div key={u.nome} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12.5 }}>
                <span style={{ color: COLORS.ice }}>{u.nome}</span>
                <span style={{ color: COLORS.steelLight, fontWeight: 700 }}>{u.qtd}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, fontSize: 11, color: COLORS.steel, lineHeight: 1.6 }}>
        Cada vez que alguém abre uma tela do sistema, isso é contado aqui. Serve para você ver o que a equipe mais usa (e o que quase nunca é acessado) na hora de priorizar melhorias futuras.
      </div>
    </div>
  );
}

function GerenciarAcessosPage({ usuarioLogado, logoBase64, onLogoAtualizado }) {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ usuario: "", senha: "", nome: "", role: "operacional" });
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    const resp = await callAdminUsers("list");
    if (resp.error) setErro(resp.error); else setUsuarios(resp.usuarios || []);
    setCarregando(false);
  };
  useEffect(() => { carregar(); }, []);

  const criar = async () => {
    if (!form.usuario.trim() || !form.senha || !form.nome.trim()) { setErro("Preencha usuário, senha e nome."); return; }
    setSalvando(true); setErro("");
    const resp = await callAdminUsers("create", { usuario: form.usuario.trim().toLowerCase(), senha: form.senha, nome: form.nome.trim(), role: form.role });
    setSalvando(false);
    if (resp.error) { setErro(resp.error); return; }
    setForm({ usuario: "", senha: "", nome: "", role: "operacional" });
    carregar();
  };

  const remover = async (u) => {
    if (!window.confirm(`Remover o acesso de "${u.nome}" (${u.usuario})? Essa ação não pode ser desfeita.`)) return;
    const resp = await callAdminUsers("delete", { id: u.id });
    if (resp.error) setErro(resp.error); else carregar();
  };

  return (
    <div>
      <PersonalizacaoSection logoBase64={logoBase64} onLogoAtualizado={onLogoAtualizado} />
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, marginBottom: 20, maxWidth: 560 }}>
        <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 14 }}>Novo acesso</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <ModalField label="Usuário (login)">
            <input value={form.usuario} onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value }))} placeholder="ex: janayna" style={modalInputStyle} />
          </ModalField>
          <ModalField label="Senha">
            <input type="password" value={form.senha} onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))} placeholder="mínimo 6 caracteres" style={modalInputStyle} />
          </ModalField>
          <ModalField label="Nome">
            <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="ex: Janayna" style={modalInputStyle} />
          </ModalField>
          <ModalField label="Papel">
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={modalInputStyle}>
              <option value="operacional">Operacional</option>
              <option value="admin">Administrador</option>
            </select>
          </ModalField>
        </div>
        {erro && <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 10 }}>{erro}</div>}
        <button onClick={criar} disabled={salvando} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: salvando ? "default" : "pointer", opacity: salvando ? 0.7 : 1, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {salvando ? "Criando..." : "Criar acesso"}
        </button>
      </div>

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, padding: "14px 18px 10px" }}>Acessos cadastrados</div>
        <table>
          <thead><tr>{["Usuário", "Nome", "Papel", ""].map((h, i) => (
            <th key={h} style={{ textAlign: "left", padding: "8px 18px", fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                <td style={{ padding: "10px 18px", fontSize: 13, fontFamily: "monospace", color: COLORS.steelLight }}>{u.usuario}</td>
                <td style={{ padding: "10px 18px", fontSize: 13, color: COLORS.ice, fontWeight: 600 }}>{u.nome}</td>
                <td style={{ padding: "10px 18px" }}><Pill fg={u.role === "admin" ? COLORS.red : COLORS.steelLight} bg={u.role === "admin" ? COLORS.redDim : "rgba(255,255,255,0.06)"}>{u.role === "admin" ? "Administrador" : "Operacional"}</Pill></td>
                <td style={{ padding: "10px 18px", textAlign: "right" }}>
                  {u.id !== usuarioLogado.id && (
                    <button onClick={() => remover(u)} style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 6, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <Trash2 size={12} color={COLORS.red} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!carregando && usuarios.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum acesso encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 30, marginBottom: 14, fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Métricas de uso do sistema</div>
      <MetricasUsoPage />
    </div>
  );
}

/* ============================================================
   SELETOR DE COR ESTILO EXCEL — grade de amostras (Cores do tema
   + Cores padrão) com opção "Mais cores..." para escolha livre.
   ============================================================ */
function ColorSwatchPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function aoClicarFora(e) { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCustomOpen(false); } }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const coresTema = ["#FFFFFF", "#000000", "#8493a6", "#0a1420", "#4a90d9", "#e1483d", "#f2894b", "#3ecf8e", "#8e5fd9", "#2fb8c6"];
  const coresPadrao = ["#c0392b", "#e1483d", "#f2894b", "#e8c547", "#8ce08c", "#3ecf8e", "#5bc8f2", "#4a90d9", "#2a4d8f", "#8e5fd9"];

  const swatch = (cor) => (
    <button key={cor} onClick={() => { onChange(cor); setOpen(false); setCustomOpen(false); }} title={cor}
      style={{ width: 22, height: 22, borderRadius: 4, background: cor, border: value.toLowerCase() === cor.toLowerCase() ? `2px solid ${COLORS.ice}` : "1px solid rgba(255,255,255,0.15)", cursor: "pointer", padding: 0 }} />
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", height: 36, border: `1px solid ${COLORS.border}`, borderRadius: 6, background: COLORS.panelAlt, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: "0 8px" }}>
        <span style={{ width: 18, height: 18, borderRadius: 3, background: value, border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: COLORS.steelLight, fontFamily: "monospace" }}>{value}</span>
        <ChevronDown size={12} color={COLORS.steel} style={{ marginLeft: "auto" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 40, background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 8, padding: 12, width: 210, boxShadow: "0 12px 28px rgba(0,0,0,0.45)" }}>
          <div style={{ fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Cores do tema</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginBottom: 12 }}>{coresTema.map(swatch)}</div>
          <div style={{ fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Cores padrão</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginBottom: 10 }}>{coresPadrao.map(swatch)}</div>
          {!customOpen ? (
            <button onClick={() => setCustomOpen(true)} style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", borderTop: `1px solid ${COLORS.border}`, paddingTop: 8, color: COLORS.steelLight, fontSize: 11.5, cursor: "pointer" }}>
              Mais cores...
            </button>
          ) : (
            <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 8 }}>
              <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", height: 32, border: "none", background: "transparent", cursor: "pointer" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PersonalizacaoSection({ logoBase64, onLogoAtualizado }) {
  const [corPrimaria, setCorPrimaria] = useState(COLORS.red);
  const [corFundo, setCorFundo] = useState(COLORS.bg);
  const [corPainel, setCorPainel] = useState(COLORS.panel);
  const [nomeEmpresa, setNomeEmpresa] = useState(NOME_RESPONSAVEL);
  const [salvandoLogo, setSalvandoLogo] = useState(false);
  const [salvandoCores, setSalvandoCores] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msg, setMsg] = useState("");

  const enviarLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/gif", "image/png"].includes(file.type)) { setMsg("Envie um arquivo JPEG, JPG ou GIF."); return; }
    setSalvandoLogo(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      const { error } = await supabase.from("configuracoes").update({ logo_base64: base64 }).eq("id", 1);
      setSalvandoLogo(false);
      if (error) { setMsg("Erro ao salvar o logo: " + error.message); return; }
      onLogoAtualizado(base64);
      setMsg("Logo atualizado.");
    };
    reader.readAsDataURL(file);
  };
  const removerLogo = async () => {
    setSalvandoLogo(true);
    const { error } = await supabase.from("configuracoes").update({ logo_base64: null }).eq("id", 1);
    setSalvandoLogo(false);
    if (!error) { onLogoAtualizado(null); setMsg("Logo removido."); }
  };
  /* Nome e cores ficam como rascunho até o clique em "Salvar alterações". */
  const originais = useRef({ nome: NOME_RESPONSAVEL, primaria: COLORS.red, fundo: COLORS.bg, painel: COLORS.panel });
  const pendentes =
    (nomeEmpresa.trim() !== originais.current.nome ? 1 : 0) +
    (corPrimaria !== originais.current.primaria ? 1 : 0) +
    (corFundo !== originais.current.fundo ? 1 : 0) +
    (corPainel !== originais.current.painel ? 1 : 0);

  const descartar = () => {
    setNomeEmpresa(originais.current.nome);
    setCorPrimaria(originais.current.primaria);
    setCorFundo(originais.current.fundo);
    setCorPainel(originais.current.painel);
    setMsg("");
  };

  const salvarTudo = async () => {
    const valor = nomeEmpresa.trim() || "Primers";
    setSalvandoNome(true); setSalvandoCores(true);
    const { error } = await supabase.from("configuracoes")
      .update({ nome_empresa: valor, cor_primaria: corPrimaria, cor_fundo: corFundo, cor_painel: corPainel })
      .eq("id", 1);
    setSalvandoNome(false); setSalvandoCores(false);
    if (error) { setMsg("Erro ao salvar: " + error.message); return; }
    NOME_RESPONSAVEL = valor;
    aplicarTema({ cor_primaria: corPrimaria, cor_fundo: corFundo, cor_painel: corPainel });
    originais.current = { nome: valor, primaria: corPrimaria, fundo: corFundo, painel: corPainel };
    setMsg("Alterações salvas — recarregue a página (F5) para ver aplicado em 100% do sistema.");
  };

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, marginBottom: 20, maxWidth: 560 }}>
      <div style={{ fontSize: 11.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, marginBottom: 14 }}>Personalização — logo, nome e cores</div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: COLORS.steelLight, marginBottom: 8 }}>Logo do sistema (JPEG, JPG ou GIF)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 90, height: 60, background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            {logoBase64 ? <img src={logoBase64} alt="Logo atual" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: COLORS.steel }}>Sem logo</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: COLORS.red, color: "#fff", borderRadius: 7, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase", width: "fit-content" }}>
              <Upload size={13} /> {salvandoLogo ? "Enviando..." : "Enviar logo"}
              <input type="file" accept="image/jpeg,image/jpg,image/gif,image/png" onChange={enviarLogo} disabled={salvandoLogo} style={{ display: "none" }} />
            </label>
            {logoBase64 && <button onClick={removerLogo} disabled={salvandoLogo} style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, color: COLORS.red, borderRadius: 6, padding: "6px 12px", fontSize: 11.5, cursor: "pointer" }}>Remover logo</button>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: COLORS.steelLight, marginBottom: 8 }}>Nome da empresa / responsável</div>
        <div style={{ fontSize: 11, color: COLORS.steel, marginBottom: 8, lineHeight: 1.5 }}>
          Usado em todo o sistema onde antes aparecia "Primers" — como rótulo de responsabilidade nos status, filtros, dashboards e documentos exportados. Não tem relação com o título fixo "CONTROLE DE PROCESSOS E SERVIÇOS" do menu.
        </div>
        <input value={nomeEmpresa} onChange={(e) => setNomeEmpresa(e.target.value)} placeholder="Ex: Sua Empresa, Grupo XYZ..."
          style={{ width: "100%", background: COLORS.panelAlt, border: `1px solid ${nomeEmpresa.trim() !== originais.current.nome ? COLORS.orange + "99" : COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 12.5 }} />
      </div>

      <div>
        <div style={{ fontSize: 12, color: COLORS.steelLight, marginBottom: 8 }}>Cores da interface (até 3 cores)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <ModalField label="Cor de destaque">
            <ColorSwatchPicker value={corPrimaria} onChange={setCorPrimaria} />
          </ModalField>
          <ModalField label="Cor de fundo">
            <ColorSwatchPicker value={corFundo} onChange={setCorFundo} />
          </ModalField>
          <ModalField label="Cor dos painéis">
            <ColorSwatchPicker value={corPainel} onChange={setCorPainel} />
          </ModalField>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: pendentes > 0 ? COLORS.orange : COLORS.steel }}>
          {pendentes > 0 ? `${pendentes} alteração(ões) ainda não salva(s)` : "Sem alterações pendentes"}
        </div>
        <BotaoSalvar pendentes={pendentes} onSalvar={salvarTudo} onDescartar={descartar} salvando={salvandoNome || salvandoCores} compacto />
      </div>

      {msg && <div style={{ marginTop: 12, fontSize: 12, color: COLORS.steelLight }}>{msg}</div>}
    </div>
  );
}

function LoginScreen({ onLogin, logoBase64 }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const entrar = async () => {
    if (!SUPABASE_CONFIGURADO) { setErro("O sistema ainda não está conectado ao banco de dados (Partes 5 e 6 do guia). Complete essas partes e tente de novo."); return; }
    if (!usuario.trim() || !senha) { setErro("Preencha usuário e senha."); return; }
    setCarregando(true);
    setErro("");
    const emailInterno = `${usuario.trim().toLowerCase()}@controle.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailInterno, password: senha });
    if (error || !data.user) {
      setCarregando(false);
      setErro("Login ou senha inválidos.");
      return;
    }
    const { data: perfil, error: perfilErro } = await supabase.from("profiles").select("id, usuario, nome, role").eq("id", data.user.id).single();
    setCarregando(false);
    if (perfilErro || !perfil) { setErro("Login sem perfil cadastrado. Fale com o administrador."); return; }
    onLogin(perfil);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 16 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap'); * { box-sizing: border-box; } ::placeholder { color: ${COLORS.steel}; opacity: 0.7; }`}</style>
      <div style={{ width: "100%", maxWidth: 360, background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 12, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {logoBase64 && <img src={logoBase64} alt="Logo" style={{ maxHeight: 100, maxWidth: 230, objectFit: "contain", marginBottom: 10 }} />}
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 18, color: COLORS.ice, letterSpacing: "0.02em", textTransform: "uppercase" }}>Controle de Processos e Serviços</div>
          <div style={{ fontSize: 10.5, color: COLORS.steel, letterSpacing: "0.06em", marginTop: 4 }}>Acesso restrito</div>
        </div>

        {!SUPABASE_CONFIGURADO && (
          <div style={{ background: COLORS.yellowDim, border: `1px solid ${COLORS.yellow}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 20, fontSize: 11.5, color: COLORS.yellow, lineHeight: 1.5 }}>
            Backend ainda não conectado. Complete as Partes 5 e 6 do guia (criar o Supabase e colar a URL/chave no início deste arquivo) para poder entrar.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ModalField label="Usuário">
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="felipe ou janayna" style={modalInputStyle} autoFocus />
          </ModalField>
          <ModalField label="Senha">
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && entrar()} placeholder="••••••" style={modalInputStyle} />

          </ModalField>
          {erro && <div style={{ fontSize: 12, color: COLORS.red }}>{erro}</div>}
          <button onClick={entrar} disabled={carregando} style={{ marginTop: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "11px 18px", fontSize: 13, fontWeight: 700, cursor: carregando ? "default" : "pointer", opacity: carregando ? 0.7 : 1, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: COLORS.steel, marginTop: 20, lineHeight: 1.5 }}>
          Acesso restrito ao Controle de Processos e Serviços.
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, onClose, onBack, maxWidth = 460, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,10,16,0.7)", backdropFilter: "blur(2px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={onClose}>
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.borderStrong}`, borderRadius: 12, width: "100%", maxWidth, maxHeight: "88vh", overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onBack && (
              <button onClick={onBack} title="Voltar" style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <ChevronLeft size={15} color={COLORS.steelLight} />
              </button>
            )}
            <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, color: COLORS.ice, textTransform: "uppercase", letterSpacing: "0.03em" }}>{title}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.steel }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function ModalField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
const modalInputStyle = { background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "8px 10px", color: COLORS.ice, fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none", width: "100%" };

function NovoClienteModal({ onClose, onSave }) {
  const [cliente, setCliente] = useState("");
  return (
    <ModalShell title="Novo cliente" onClose={onClose}>
      <ModalField label="Nome do cliente">
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ex: Atacado Boreal" style={modalInputStyle} />
      </ModalField>
      <p style={{ fontSize: 11.5, color: COLORS.steel, marginTop: 10, lineHeight: 1.5 }}>
        O cliente entra na listagem sem contrato vinculado ainda. Cadastre um contrato depois (em Contratos) para registrar serviços e valores.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => { if (!cliente.trim()) return; onSave(novaLinhaContrato({ cliente: cliente.trim(), servico: "Cadastro manual (sem contrato ainda)", statusContrato: "-", statusServico: "-", statusParcela: "Pendente" })); onClose(); }}
          style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          Salvar cliente
        </button>
      </div>
    </ModalShell>
  );
}

function NovaUnidadeModal({ onClose, onSave, clientesExistentes }) {
  const [cliente, setCliente] = useState("");
  const [unidade, setUnidade] = useState("");
  return (
    <ModalShell title="Nova unidade" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ModalField label="Cliente">
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Digite ou escolha um cliente existente" list="clientes-existentes" style={modalInputStyle} />
          <datalist id="clientes-existentes">{clientesExistentes.map((c) => <option key={c} value={c} />)}</datalist>
        </ModalField>
        <ModalField label="Unidade">
          <input value={unidade} onChange={(e) => setUnidade(e.target.value)} placeholder="Ex: Loja Centro" style={modalInputStyle} />
        </ModalField>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => { if (!cliente.trim() || !unidade.trim()) return; onSave(novaLinhaContrato({ cliente: cliente.trim(), unidade: unidade.trim(), servico: "Cadastro manual (sem contrato ainda)", statusContrato: "-", statusServico: "-", statusParcela: "Pendente" })); onClose(); }}
          style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          Salvar unidade
        </button>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   IDs de referência para clientes e unidades — calculados de
   forma estável a partir dos nomes (sem precisar de tabelas novas
   no banco). O contrato já tem seu próprio ID real (a Proposta).
   ============================================================ */
function computarIdsClientes(contratos) {
  const nomes = Array.from(new Set(contratos.map((c) => c.cliente))).sort();
  const mapa = {};
  nomes.forEach((n, i) => { mapa[n] = `CLI-${String(i + 1).padStart(4, "0")}`; });
  return mapa;
}
function computarIdsUnidades(contratos) {
  const chaves = Array.from(new Set(contratos.map((c) => `${c.cliente}|${c.unidade}`))).sort();
  const mapa = {};
  chaves.forEach((k, i) => { mapa[k] = `UNI-${String(i + 1).padStart(4, "0")}`; });
  return mapa;
}

/* ============================================================
   CAMPO COM CONFIRMAÇÃO — usado em Data SLA, Status da parcela e
   Técnico: a edição fica pendente até clicar no "OK" (não aplica
   sozinho a cada tecla/seleção).
   ============================================================ */
/* ============================================================
   BARRA DE SELEÇÃO E EXCLUSÃO EM MASSA — checkbox por linha +
   barra flutuante "N selecionado(s) · Excluir" com confirmação.
   ============================================================ */
function BarraSelecaoExclusao({ contagem, onLimpar, onExcluir, rotulo }) {
  if (!contagem) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: COLORS.redDim, border: `1px solid ${COLORS.red}55`, borderRadius: 8, padding: "9px 14px", marginBottom: 14 }}>
      <span style={{ fontSize: 12.5, color: COLORS.ice, fontWeight: 600 }}>{contagem} {rotulo || "item(ns)"} selecionado(s)</span>
      <button onClick={onLimpar} style={{ background: "transparent", border: "none", color: COLORS.steelLight, fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Limpar seleção</button>
      <button onClick={onExcluir} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
        <Trash2 size={13} /> Excluir selecionados
      </button>
    </div>
  );
}
function ConfirmarExclusaoModal({ titulo, mensagem, onCancelar, onConfirmar }) {
  return (
    <ModalShell title={titulo} onClose={onCancelar} maxWidth={420}>
      <p style={{ fontSize: 13, color: COLORS.steelLight, lineHeight: 1.6 }}>{mensagem}</p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
        <button onClick={onCancelar} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={onConfirmar} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Excluir</button>
      </div>
    </ModalShell>
  );
}

/* Campo editável em modo rascunho: a alteração entra na fila de
   "alterações não salvas" na hora (datas e listas ao escolher,
   texto ao sair do campo) e só vai para o banco no clique em
   "Salvar alterações". A borda laranja marca o que está pendente. */
function CampoComConfirmacao({ tipo, valor, opcoes, onConfirmar, corTexto, largura, placeholder }) {
  const [pendente, setPendente] = useState(valor);
  const [original] = useState(valor);
  useEffect(() => { setPendente(valor); }, [valor]);
  const mudou = String(pendente ?? "") !== String(original ?? "");
  const estiloBase = {
    background: mudou ? COLORS.orangeDim : COLORS.panelAlt,
    border: `1px solid ${mudou ? COLORS.orange + "99" : COLORS.border}`,
    borderRadius: 6, padding: "5px 7px", color: corTexto || COLORS.ice, fontSize: 12, width: largura, outline: "none",
  };
  const aplicar = (v) => onConfirmar(tipo === "number" ? (parseFloat(v) || 0) : v);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {tipo === "date" && <input type="date" value={pendente || ""} onChange={(e) => { setPendente(e.target.value); aplicar(e.target.value); }} style={estiloBase} />}
      {(tipo === "text" || tipo === "number") && (
        <input type={tipo} value={pendente ?? ""} placeholder={placeholder} style={estiloBase}
          onChange={(e) => setPendente(e.target.value)}
          onBlur={(e) => aplicar(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
      )}
      {tipo === "select" && (
        <select value={pendente} onChange={(e) => { setPendente(e.target.value); aplicar(e.target.value); }} style={estiloBase}>
          {opcoes.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}

/* Linha "rótulo à esquerda / campo à direita" editável com botão de
   confirmação — usada na Visão Geral do processo. Componente de
   módulo de verdade (nunca declarar componentes dentro de outros!). */
/* Campo de edição em modo rascunho: a alteração aparece destacada
   em laranja e só vai para o banco quando o usuário clicar em
   "Salvar alterações". */
function CampoRascunho({ tipo, valor, opcoes, onChange, corTexto, largura, placeholder, pendente }) {
  const estilo = {
    background: pendente ? COLORS.orangeDim : COLORS.panelAlt,
    border: `1px solid ${pendente ? COLORS.orange + "99" : COLORS.border}`,
    borderRadius: 6, padding: "6px 8px", color: corTexto || COLORS.ice, fontSize: 12,
    width: typeof largura === "number" ? largura : (largura || "100%"),
    fontFamily: "'Inter', sans-serif", outline: "none",
  };
  if (tipo === "select") {
    return (
      <select value={valor === null || valor === undefined ? "" : valor} onChange={(e) => onChange(e.target.value)} style={estilo}>
        {(opcoes || []).map((o) => <option key={o} value={o}>{o === "" ? "—" : o}</option>)}
      </select>
    );
  }
  return <input type={tipo === "number" ? "number" : tipo} value={valor === null || valor === undefined ? "" : valor}
    placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={estilo} />;
}

function RowEditavel({ label, tipo, valor, onConfirmar, largura }) {
  const [pendente, setPendente] = useState(valor || "");
  useEffect(() => { setPendente(valor || ""); }, [valor]);
  const mudou = pendente !== (valor || "");
  const confirmar = () => onConfirmar(tipo === "text" ? (pendente.trim() || "-") : (pendente || null));
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.border}`, gap: 10 }}>
      <span style={{ fontSize: 12, color: COLORS.steel, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type={tipo === "date" ? "date" : "text"} value={pendente} onChange={(e) => setPendente(e.target.value)}
          placeholder={tipo === "date" ? "" : "Preencher..."}
          style={{ background: "transparent", border: "none", borderBottom: `1px dashed ${COLORS.border}`, color: COLORS.ice, fontSize: 13, textAlign: "right", padding: "2px 0", width: largura || (tipo === "date" ? 130 : 160) }} />
        {mudou && (
          <button onClick={confirmar} title="Confirmar alteração" style={{ background: COLORS.green, border: "none", borderRadius: 5, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <CheckCircle2 size={12} color="#0a1420" />
          </button>
        )}
      </div>
    </div>
  );
}

function ContratoFormModal({ title, submitLabel, initial, onClose, onSubmit, clientesExistentes }) {
  const [f, setF] = useState({
    proposta: "", cliente: "", unidade: "", codigoLoja: "", servico: "", tarefa: "", tecnico: "", coordenador: "",
    tipo: "Processo", dataSLA: "", statusParcela: "Pendente", observacao: "",
    ...initial,
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const field = (label, key, placeholder, type = "text", extra) => (
    <ModalField label={label}><input type={type} value={f[key]} onChange={set(key)} placeholder={placeholder} style={modalInputStyle} {...extra} /></ModalField>
  );

  return (
    <ModalShell title={title} onClose={onClose} maxWidth={640}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {field("Proposta", "proposta", "Ex: PC-05200-08-26")}
        <ModalField label="Cliente">
          <input value={f.cliente} onChange={set("cliente")} placeholder="Digite ou escolha um cliente existente" list="clientes-existentes-contrato" style={modalInputStyle} />
          <datalist id="clientes-existentes-contrato">{clientesExistentes.map((c) => <option key={c} value={c} />)}</datalist>
        </ModalField>
        {field("Unidade", "unidade", "Ex: Loja Centro")}
        {field("Código da unidade", "codigoLoja", "Ex: 22577")}
        <div style={{ gridColumn: "1 / -1" }}>{field("Serviço", "servico", "Ex: Aprovação de Publicidade junto a Prefeitura")}</div>
        {field("Tarefa / parcela", "tarefa", "Ex: Sinal, Protocolo, Deferimento, Entrega")}
        <ModalField label="Tipo">
          <select value={f.tipo} onChange={set("tipo")} style={modalInputStyle}>
            {CONTRATO_TIPO_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        <ModalField label="Técnico">
          <select value={TECNICOS_OPTIONS.includes(f.tecnico) ? f.tecnico : ""} onChange={set("tecnico")} style={modalInputStyle}>
            <option value="">Selecionar...</option>
            {TECNICOS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        {field("Coordenador", "coordenador", "Nome do coordenador")}
        {field("Data SLA", "dataSLA", "", "date")}
        <ModalField label="Situação da tarefa">
          <select value={f.statusParcela} onChange={set("statusParcela")} style={modalInputStyle}>
            {STATUS_PARCELA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </ModalField>
        <div style={{ gridColumn: "1 / -1" }}>{field("Observação", "observacao", "Opcional")}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
        <button onClick={() => {
          if (!f.cliente.trim() || !f.servico.trim()) return;
          onSubmit({
            proposta: f.proposta.trim(), cliente: f.cliente.trim(), unidade: f.unidade.trim(), codigoLoja: f.codigoLoja.trim(),
            servico: f.servico.trim(), tarefa: f.tarefa.trim(), tecnico: f.tecnico.trim(), coordenador: f.coordenador.trim(), tipo: f.tipo,
            dataSLA: f.dataSLA || null,
            statusParcela: f.statusParcela, observacao: f.observacao.trim(),
          });
          onClose();
        }} style={{ background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.03em", textTransform: "uppercase" }}>
          {submitLabel}
        </button>
      </div>
    </ModalShell>
  );
}

/* ============================================================
   POP-UPS ENCADEADOS: Cliente → Unidades → Contratos → Serviços
   ============================================================ */
function ClienteUnidadesModal({ cliente, contratos, idsUnidades, onClose, onOpenUnidade }) {
  const unidades = useMemo(() => {
    const map = {};
    contratos.filter((c) => c.cliente === cliente).forEach((c) => {
      if (!map[c.unidade]) map[c.unidade] = { unidade: c.unidade, servicos: new Set(), propostas: new Set() };
      map[c.unidade].servicos.add(c.servico);
      map[c.unidade].propostas.add(c.proposta);
    });
    return Object.values(map).sort((a, b) => a.unidade.localeCompare(b.unidade));
  }, [contratos, cliente]);

  return (
    <ModalShell title={`Unidades — ${cliente}`} onClose={onClose} maxWidth={560}>
      {unidades.map((u) => (
        <div key={u.unidade} className="row-hover" onClick={() => onOpenUnidade(u.unidade)}
          style={{ cursor: "pointer", padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ice }}>{u.unidade}</div>
            <div style={{ fontSize: 10.5, color: COLORS.steel, fontFamily: "monospace", marginTop: 2 }}>{idsUnidades[`${cliente}|${u.unidade}`]}</div>
          </div>
          <div style={{ fontSize: 11.5, color: COLORS.steelLight, whiteSpace: "nowrap" }}>{u.propostas.size} contrato(s) · {u.servicos.size} serviço(s)</div>
          <ChevronRight size={16} color={COLORS.steel} style={{ flexShrink: 0 }} />
        </div>
      ))}
      {unidades.length === 0 && <div style={{ padding: 20, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhuma unidade encontrada para este cliente.</div>}
    </ModalShell>
  );
}

function UnidadeContratosModal({ cliente, unidade, contratos, onClose, onBack, onOpenContrato }) {
  const propostas = useMemo(() => {
    const map = {};
    contratos.filter((c) => c.cliente === cliente && c.unidade === unidade).forEach((c) => {
      if (!map[c.proposta]) map[c.proposta] = { proposta: c.proposta, servicos: new Set(), statusContrato: c.statusContrato };
      map[c.proposta].servicos.add(c.servico);
      map[c.proposta].statusContrato = c.statusContrato || map[c.proposta].statusContrato;
    });
    return Object.values(map);
  }, [contratos, cliente, unidade]);

  return (
    <ModalShell title={`Contratos — ${cliente} · ${unidade}`} onClose={onClose} onBack={onBack} maxWidth={560}>
      {propostas.map((p) => {
        const sc = statusContratoStyle(p.statusContrato);
        return (
          <div key={p.proposta} className="row-hover" onClick={() => onOpenContrato(p.proposta)}
            style={{ cursor: "pointer", padding: "12px 14px", border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ice, fontFamily: "monospace" }}>{p.proposta}</div>
              <div style={{ fontSize: 11.5, color: COLORS.steel, marginTop: 3 }}>{p.servicos.size} serviço(s)</div>
            </div>
            <Pill fg={sc.fg} bg={sc.bg}>{p.statusContrato}</Pill>
            <ChevronRight size={16} color={COLORS.steel} style={{ flexShrink: 0 }} />
          </div>
        );
      })}
      {propostas.length === 0 && <div style={{ padding: 20, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum contrato encontrado para esta unidade.</div>}
    </ModalShell>
  );
}

/* ============================================================
   POP-UP DE UM ÚNICO SERVIÇO — aberto ao clicar numa linha na
   tela de Contratos: mostra só as tarefas/parcelas daquele
   serviço específico, sem o restante do contrato.
   ============================================================ */
function ServicoUnicoModal({ proposta, cliente, unidade, servico, contratos, processos, onDeleteContrato, onExcluirContratos, onAddContrato, clientesExistentes, onClose, onBack, edits, onEdit, codigoUnidade }) {
  const [servicoParaTarefa, setServicoParaTarefa] = useState(false);
  const [confirmDeleteTarefa, setConfirmDeleteTarefa] = useState(null);
  const [confirmDeleteServico, setConfirmDeleteServico] = useState(false);
  const rascunho = useRascunho();

  const val = (c, campo) => (edits && edits[c.id] && campo in edits[c.id]) ? edits[c.id][campo] : c[campo];
  const pend = (c, campo) => !!(edits && edits[c.id] && campo in edits[c.id]);

  const tarefas = contratos.filter((c) => c.proposta === proposta && c.cliente === cliente && c.unidade === unidade && c.servico === servico);
  const pendentesAqui = tarefas.reduce((s, t) => s + ((edits && edits[t.id]) ? Object.keys(edits[t.id]).length : 0), 0);
  const tecnico = tarefas[0] ? val(tarefas[0], "tecnico") : "-";
  const tipo = tarefas[0]?.tipo || "Processo";
  const proc = (processos || []).find((p) => p.numeroContrato === proposta && p.cliente === cliente && p.unidade === unidade && p.assunto === servico);
  const stProc = proc ? STATUS_CONFIG[proc.statusAtual] : null;
  const concluidas = tarefas.filter((t) => val(t, "statusParcela") === "Concluído").length;

  const campoTarefa = { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: COLORS.ice, width: "100%" };
  const labelTarefa = { fontSize: 9.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", display: "block", marginBottom: 4 };

  return (
    <ModalShell title={servico} onClose={onClose} onBack={onBack} maxWidth={880}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cliente} · {rotuloUnidade(unidade, codigoUnidade)} · Contrato {proposta}</div>
          <div style={{ fontSize: 12.5, color: COLORS.steelLight, marginTop: 3 }}>
            Técnico: <b style={{ color: COLORS.ice }}>{tecnico}</b> ·
            {" "}Tarefas: <Pill fg={concluidas === tarefas.length ? COLORS.green : COLORS.blue} bg={concluidas === tarefas.length ? COLORS.greenDim : COLORS.blueDim}>{concluidas}/{tarefas.length} concluída(s)</Pill>
            {stProc && <> · Status atual: <Pill fg={stProc.fg} bg={stProc.bg}>{statusLabel(proc.statusAtual, proc.tipo)}</Pill></>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CampoComConfirmacao tipo="select" valor={tipo} opcoes={CONTRATO_TIPO_OPTIONS}
            onConfirmar={(novoTipo) => tarefas.forEach((t) => onUpdateContrato(t.id, { tipo: novoTipo }))} largura={130} />
          <button onClick={() => setConfirmDeleteServico(true)} title="Excluir este serviço (todas as tarefas)"
            style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Trash2 size={13} color={COLORS.red} />
          </button>
        </div>
      </div>

      <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ice }}>Tarefas / Etapas</div>
          <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 700 }}>{tarefas.length} tarefa(s) · {concluidas} concluída(s)</div>
        </div>
        {tarefas.map((t, i) => {
          const sp = statusParcelaStyle(val(t, "statusParcela"));
          return (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "0.4fr 1.6fr 1fr 1.2fr 1.4fr 0.4fr", gap: 8, alignItems: "end", marginBottom: 12 }}>
              <div><label style={labelTarefa}>Nº</label><input value={i + 1} readOnly style={{ ...campoTarefa, color: COLORS.steel }} /></div>
              <div><label style={labelTarefa}>Descrição</label><CampoRascunho tipo="text" valor={val(t, "tarefa")} onChange={(v) => onEdit(t.id, "tarefa", v)} pendente={pend(t, "tarefa")} /></div>
              <div><label style={labelTarefa}>Data SLA</label><CampoRascunho tipo="date" valor={val(t, "dataSLA")} onChange={(v) => onEdit(t.id, "dataSLA", v)} pendente={pend(t, "dataSLA")} /></div>
              <div><label style={labelTarefa}>Situação</label><CampoRascunho tipo="select" valor={val(t, "statusParcela")} opcoes={STATUS_PARCELA_OPTIONS} onChange={(v) => onEdit(t.id, "statusParcela", v)} corTexto={sp.fg} pendente={pend(t, "statusParcela")} /></div>
              <div><label style={labelTarefa}>Observação</label><CampoRascunho tipo="text" valor={val(t, "observacao") || ""} onChange={(v) => onEdit(t.id, "observacao", v)} placeholder="—" pendente={pend(t, "observacao")} /></div>
              <button onClick={() => setConfirmDeleteTarefa(t)} title="Excluir esta tarefa"
                style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 5, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Trash2 size={11} color={COLORS.red} />
              </button>
            </div>
          );
        })}
        <button onClick={() => setServicoParaTarefa(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${COLORS.border}`, color: COLORS.steel, borderRadius: 6, padding: "7px 12px", fontSize: 11.5, cursor: "pointer", marginTop: 4 }}>
          <Plus size={12} /> Adicionar tarefa
        </button>
      </div>

      {servicoParaTarefa && (
        <ContratoFormModal title={`Adicionar tarefa — ${servico}`} submitLabel="Adicionar tarefa"
          initial={{ proposta, cliente, unidade, codigoLoja: codigoUnidade || "", tipo, servico, tecnico, tarefa: "", dataSLA: "", statusParcela: "Pendente", observacao: "" }}
          onSubmit={(fields) => onAddContrato(novaLinhaContrato(fields))} onClose={() => setServicoParaTarefa(false)} clientesExistentes={clientesExistentes} />
      )}
      {confirmDeleteTarefa && (
        <ConfirmarExclusaoModal titulo="Excluir tarefa" onCancelar={() => setConfirmDeleteTarefa(null)}
          mensagem={`Remover a tarefa "${confirmDeleteTarefa.tarefa}" (${servico})? Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onDeleteContrato(confirmDeleteTarefa.id); setConfirmDeleteTarefa(null); }} />
      )}
      {confirmDeleteServico && (
        <ConfirmarExclusaoModal titulo="Excluir serviço" onCancelar={() => setConfirmDeleteServico(false)}
          mensagem={`Excluir o serviço "${servico}" e todas as suas ${tarefas.length} tarefa(s)? Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirContratos(tarefas); setConfirmDeleteServico(false); onClose(); }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${COLORS.border}`, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: pendentesAqui > 0 ? COLORS.orange : COLORS.steel }}>
          {pendentesAqui > 0 ? `${pendentesAqui} alteração(ões) ainda não salva(s)` : "Sem alterações pendentes"}
        </div>
        <BotaoSalvar pendentes={pendentesAqui} onSalvar={rascunho ? rascunho.salvarTudo : undefined} onDescartar={rascunho ? rascunho.descartarTudo : undefined} salvando={rascunho ? rascunho.salvando : false} compacto />
      </div>
    </ModalShell>
  );
}

function ContratoDetalheCompletoModal({ proposta, cliente, unidade, contratos, processos, onDeleteContrato, onExcluirContratos, onAddContrato, clientesExistentes, onClose, onBack, edits, onEdit, codigoUnidade }) {
  const [showAdicionarServico, setShowAdicionarServico] = useState(false);
  const [servicoParaTarefa, setServicoParaTarefa] = useState(null); // grupo de serviço, ou null
  const [expandido, setExpandido] = useState(null); // nome do serviço expandido, ou null
  const [confirmDeleteServico, setConfirmDeleteServico] = useState(null); // grupo de serviço
  const [confirmDeleteTarefa, setConfirmDeleteTarefa] = useState(null); // linha (contrato)

  const rascunho = useRascunho();
  const [ordem, ordenarPor] = useOrdenacao();
  const val = (c, campo) => (edits && edits[c.id] && campo in edits[c.id]) ? edits[c.id][campo] : c[campo];
  const pend = (c, campo) => !!(edits && edits[c.id] && campo in edits[c.id]);

  const linhas = contratos.filter((c) => c.proposta === proposta && c.cliente === cliente && c.unidade === unidade);
  const pendentesAqui = linhas.reduce((s, t) => s + ((edits && edits[t.id]) ? Object.keys(edits[t.id]).length : 0), 0);

  const servicosAgrupados = useMemo(() => {
    const map = {};
    linhas.forEach((l) => {
      if (!map[l.servico]) map[l.servico] = { servico: l.servico, tecnico: l.tecnico, tipo: l.tipo, tarefas: [] };
      map[l.servico].tarefas.push(l);
    });
    return ordenarLista(Object.values(map), ordem, {
      tarefas: (g) => g.tarefas.length,
      status: (g) => {
        const p = (processos || []).find((x) => x.numeroContrato === proposta && x.cliente === cliente && x.unidade === unidade && x.assunto === g.servico);
        return p ? statusLabel(p.statusAtual, p.tipo) : "";
      },
    });
  }, [linhas, ordem]); // eslint-disable-line

  const processoDoServico = (servico) => (processos || []).find((p) => p.numeroContrato === proposta && p.cliente === cliente && p.unidade === unidade && p.assunto === servico);

  const totalServicos = servicosAgrupados.length;
  const totalTarefas = linhas.length;
  const tarefasConcluidas = linhas.filter((l) => val(l, "statusParcela") === "Concluído").length;

  const thStyle = { textAlign: "left", padding: "9px 12px", fontSize: 10, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg };
  const tdStyle = { padding: "11px 12px", fontSize: 12.5, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}` };
  const campoTarefa = { background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: COLORS.ice, width: "100%" };
  const labelTarefa = { fontSize: 9.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.03em", display: "block", marginBottom: 4 };

  return (
    <ModalShell title={`Contrato ${proposta}`} onClose={onClose} onBack={onBack} maxWidth={960}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em" }}>{cliente} · {rotuloUnidade(unidade, codigoUnidade)}</div>
          <div style={{ fontSize: 12.5, color: COLORS.steelLight, marginTop: 3 }}>Serviços: <b style={{ color: COLORS.ice }}>{totalServicos}</b> · Tarefas: <b style={{ color: COLORS.ice }}>{totalTarefas}</b> · Concluídas: <b style={{ color: COLORS.green }}>{tarefasConcluidas}</b></div>
        </div>
        <button onClick={() => setShowAdicionarServico(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          <Plus size={13} /> Adicionar serviço
        </button>
      </div>

      <div style={{ overflowX: "auto", border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
        <table>
          <thead><tr>
            <Th campo="servico" ordem={ordem} ordenarPor={ordenarPor} style={thStyle}>Serviço</Th>
            <Th campo="tipo" ordem={ordem} ordenarPor={ordenarPor} style={thStyle}>Tipo</Th>
            <Th campo="tecnico" ordem={ordem} ordenarPor={ordenarPor} style={thStyle}>Técnico</Th>
            <Th campo="tarefas" ordem={ordem} ordenarPor={ordenarPor} style={thStyle}>Tarefas</Th>
            <Th campo="status" ordem={ordem} ordenarPor={ordenarPor} style={thStyle}>Status atual</Th>
            <Th style={thStyle}>Ações</Th>
          </tr></thead>
          <tbody>
            {servicosAgrupados.map((g) => {
              const concluidasG = g.tarefas.filter((t) => val(t, "statusParcela") === "Concluído").length;
              const proc = processoDoServico(g.servico);
              const stProc = proc ? STATUS_CONFIG[proc.statusAtual] : null;
              const aberto = expandido === g.servico;
              return (
                <React.Fragment key={g.servico}>
                  <tr className="row-hover" onClick={() => setExpandido(aberto ? null : g.servico)}
                    style={{ cursor: "pointer", background: aberto ? COLORS.redDim : "transparent" }}>
                    <td style={{ ...tdStyle, color: COLORS.ice, fontWeight: 600 }}>{g.servico}</td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <CampoRascunho tipo="select" valor={val(g.tarefas[0], "tipo") || "Processo"} opcoes={CONTRATO_TIPO_OPTIONS}
                        onChange={(novoTipo) => g.tarefas.forEach((t) => onEdit(t.id, "tipo", novoTipo))} largura={120} pendente={pend(g.tarefas[0], "tipo")} />
                    </td>
                    <td style={tdStyle}>{g.tecnico && g.tecnico !== "-" ? g.tecnico : "—"}</td>
                    <td style={tdStyle}>
                      <Pill fg={concluidasG === g.tarefas.length ? COLORS.green : COLORS.blue} bg={concluidasG === g.tarefas.length ? COLORS.greenDim : COLORS.blueDim}>
                        {concluidasG}/{g.tarefas.length} concluída(s)
                      </Pill>
                    </td>
                    <td style={tdStyle}>{stProc ? <Pill fg={stProc.fg} bg={stProc.bg}>{statusLabel(proc.statusAtual, proc.tipo)}</Pill> : "—"}</td>
                    <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setExpandido(aberto ? null : g.servico)} title="Ver tarefas"
                          style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Pencil size={12} color={COLORS.steelLight} />
                        </button>
                        <button onClick={() => setConfirmDeleteServico(g)} title="Excluir este serviço (todas as tarefas)"
                          style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                          <Trash2 size={12} color={COLORS.red} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {aberto && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: `1px solid ${COLORS.border}` }}>
                        <div style={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.red}4d`, borderRadius: 8, padding: 16, margin: "0 10px 12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ice }}>Tarefas — {g.servico}</div>
                            <div style={{ fontSize: 11, color: COLORS.green, fontWeight: 700 }}>{g.tarefas.length} tarefa(s) · {concluidasG} concluída(s)</div>
                          </div>
                          {g.tarefas.map((t, i) => {
                            const sp = statusParcelaStyle(val(t, "statusParcela"));
                            return (
                              <div key={t.id} style={{ display: "grid", gridTemplateColumns: "0.4fr 1.6fr 1fr 1.2fr 1.4fr 0.4fr", gap: 8, alignItems: "end", marginBottom: 12 }}>
                                <div><label style={labelTarefa}>Nº</label><input value={i + 1} readOnly style={{ ...campoTarefa, color: COLORS.steel }} /></div>
                                <div><label style={labelTarefa}>Descrição</label><CampoRascunho tipo="text" valor={val(t, "tarefa")} onChange={(v) => onEdit(t.id, "tarefa", v)} pendente={pend(t, "tarefa")} /></div>
                                <div><label style={labelTarefa}>Data SLA</label><CampoRascunho tipo="date" valor={val(t, "dataSLA")} onChange={(v) => onEdit(t.id, "dataSLA", v)} pendente={pend(t, "dataSLA")} /></div>
                                <div><label style={labelTarefa}>Situação</label><CampoRascunho tipo="select" valor={val(t, "statusParcela")} opcoes={STATUS_PARCELA_OPTIONS} onChange={(v) => onEdit(t.id, "statusParcela", v)} corTexto={sp.fg} pendente={pend(t, "statusParcela")} /></div>
                                <div><label style={labelTarefa}>Observação</label><CampoRascunho tipo="text" valor={val(t, "observacao") || ""} onChange={(v) => onEdit(t.id, "observacao", v)} placeholder="—" pendente={pend(t, "observacao")} /></div>
                                <button onClick={() => setConfirmDeleteTarefa(t)} title="Excluir esta tarefa"
                                  style={{ background: "transparent", border: `1px solid ${COLORS.red}55`, borderRadius: 5, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                  <Trash2 size={11} color={COLORS.red} />
                                </button>
                              </div>
                            );
                          })}
                          <button onClick={() => setServicoParaTarefa(g)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${COLORS.border}`, color: COLORS.steel, borderRadius: 6, padding: "7px 12px", fontSize: 11.5, cursor: "pointer", marginTop: 4 }}>
                            <Plus size={12} /> Adicionar tarefa
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {servicosAgrupados.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum serviço neste contrato ainda.</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: pendentesAqui > 0 ? COLORS.orange : COLORS.steel }}>
          {pendentesAqui > 0 ? `${pendentesAqui} alteração(ões) ainda não salva(s)` : "Sem alterações pendentes"}
        </div>
        <div style={{ fontSize: 13, color: COLORS.steelLight }}>
          Total do contrato: <b style={{ color: COLORS.ice, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{totalServicos} serviço(s)</b> · <b style={{ color: COLORS.ice, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{totalTarefas} tarefa(s)</b>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
        <BotaoSalvar pendentes={pendentesAqui} onSalvar={rascunho ? rascunho.salvarTudo : undefined} onDescartar={rascunho ? rascunho.descartarTudo : undefined} salvando={rascunho ? rascunho.salvando : false} compacto />
      </div>

      {showAdicionarServico && (
        <ContratoFormModal title={`Adicionar serviço — contrato ${proposta}`} submitLabel="Adicionar serviço"
          initial={{ proposta, cliente, unidade, codigoLoja: codigoUnidade || "", tipo: "Processo", servico: "", tarefa: "", dataSLA: "", statusParcela: "Pendente", observacao: "" }}
          onSubmit={(fields) => onAddContrato(novaLinhaContrato(fields))} onClose={() => setShowAdicionarServico(false)} clientesExistentes={clientesExistentes} />
      )}
      {servicoParaTarefa && (
        <ContratoFormModal title={`Adicionar tarefa — ${servicoParaTarefa.servico}`} submitLabel="Adicionar tarefa"
          initial={{ proposta, cliente, unidade, tipo: servicoParaTarefa.tipo || "Processo", servico: servicoParaTarefa.servico, tecnico: servicoParaTarefa.tecnico, tarefa: "", dataSLA: "", statusParcela: "Pendente", observacao: "" }}
          onSubmit={(fields) => onAddContrato(novaLinhaContrato(fields))} onClose={() => setServicoParaTarefa(null)} clientesExistentes={clientesExistentes} />
      )}
      {confirmDeleteServico && (
        <ConfirmarExclusaoModal titulo="Excluir serviço" onCancelar={() => setConfirmDeleteServico(null)}
          mensagem={`Excluir o serviço "${confirmDeleteServico.servico}" e todas as suas ${confirmDeleteServico.tarefas.length} tarefa(s)? Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirContratos(confirmDeleteServico.tarefas); setConfirmDeleteServico(null); if (expandido === confirmDeleteServico.servico) setExpandido(null); }} />
      )}
      {confirmDeleteTarefa && (
        <ConfirmarExclusaoModal titulo="Excluir tarefa" onCancelar={() => setConfirmDeleteTarefa(null)}
          mensagem={`Remover a tarefa "${confirmDeleteTarefa.tarefa}" (${confirmDeleteTarefa.servico})? Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onDeleteContrato(confirmDeleteTarefa.id); setConfirmDeleteTarefa(null); }} />
      )}
    </ModalShell>
  );
}


function ClientesPage({ contratos, onAddContrato, isAdmin, onOpenCliente, onExcluirClientes }) {
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtroStatus, setFiltroStatus] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  const idsClientes = useMemo(() => computarIdsClientes(contratos), [contratos]);
  const statusOpcoes = useMemo(() => Array.from(new Set(contratos.map((c) => c.statusContrato))).filter(Boolean).sort(), [contratos]);

  const clientes = useMemo(() => {
    const map = {};
    contratos.forEach((c) => {
      if (!map[c.cliente]) map[c.cliente] = { cliente: c.cliente, unidades: new Set(), propostas: new Set(), status: new Set() };
      const m = map[c.cliente];
      m.unidades.add(c.unidade);
      m.propostas.add(c.proposta);
      if (c.statusContrato) m.status.add(c.statusContrato);
    });
    return Object.values(map).map((m) => ({ cliente: m.cliente, unidades: m.unidades.size, propostas: m.propostas.size, status: m.status })).sort((a, b) => a.cliente.localeCompare(b.cliente));
  }, [contratos]);

  const [ordem, ordenarPor] = useOrdenacao();
  const filtrados = useMemo(() => {
    const base = clientes.filter((c) => {
      if (busca && !c.cliente.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroStatus.length && ![...c.status].some((s) => filtroStatus.includes(s))) return false;
      return true;
    });
    return ordenarLista(base, ordem, { id: (c) => idsClientes[c.cliente] });
  }, [clientes, busca, filtroStatus, ordem, idsClientes]);
  const paginados = useMemo(() => paginate(filtrados, page, pageSize), [filtrados, page, pageSize]);
  const [showNovo, setShowNovo] = useState(false);

  const toggleSel = (nome) => setSelecionados((s) => { const n = new Set(s); n.has(nome) ? n.delete(nome) : n.add(nome); return n; });
  const todosPaginaSelecionados = paginados.length > 0 && paginados.every((c) => selecionados.has(c.cliente));
  const toggleTodosPagina = () => setSelecionados((s) => {
    const n = new Set(s);
    if (todosPaginaSelecionados) paginados.forEach((c) => n.delete(c.cliente)); else paginados.forEach((c) => n.add(c.cliente));
    return n;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", width: 260 }}>
            <Search size={14} color={COLORS.steel} />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Buscar cliente..."
              style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ice, fontSize: 13, width: "100%" }} />
          </div>
          <BotaoFiltroPopup grupos={[{ label: "Status do contrato", options: statusOpcoes, selected: filtroStatus, onApply: (v) => { setFiltroStatus(v); setPage(1); } }]} />
        </div>
        {isAdmin && (
          <button onClick={() => setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <Plus size={15} /> Novo cliente
          </button>
        )}
      </div>
      {isAdmin && <BarraSelecaoExclusao contagem={selecionados.size} rotulo="cliente(s)" onLimpar={() => setSelecionados(new Set())} onExcluir={() => setConfirmExcluir(true)} />}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>
              {isAdmin && <Th ordem={ordem} ordenarPor={ordenarPor}><input type="checkbox" checked={todosPaginaSelecionados} onChange={toggleTodosPagina} /></Th>}
              <Th campo="id" ordem={ordem} ordenarPor={ordenarPor}>ID</Th>
              <Th campo="cliente" ordem={ordem} ordenarPor={ordenarPor}>Cliente</Th>
              <Th campo="unidades" ordem={ordem} ordenarPor={ordenarPor}>Unidades</Th>
              <Th campo="propostas" ordem={ordem} ordenarPor={ordenarPor}>Contratos</Th>
              <Th ordem={ordem} ordenarPor={ordenarPor}>{""}</Th>
            </tr></thead>
            <tbody>
              {paginados.map((c) => (
                <tr key={c.cliente} className="row-hover" style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }} onClick={() => onOpenCliente(c.cliente)}>
                  {isAdmin && <td style={{ padding: "11px 16px" }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selecionados.has(c.cliente)} onChange={() => toggleSel(c.cliente)} /></td>}
                  <td style={{ padding: "11px 16px", fontSize: 11, color: COLORS.steel, fontFamily: "monospace" }}>{idsClientes[c.cliente]}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: COLORS.ice, display: "flex", alignItems: "center", gap: 6 }}><Building2 size={12} color={COLORS.steel} />{c.cliente}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.steelLight }}>{c.unidades}</td>
                  <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.steelLight }}>{c.propostas}</td>
                  <td style={{ padding: "11px 16px" }}><ChevronRight size={15} color={COLORS.steel} /></td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum cliente encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={filtrados.length} />
      </div>
      {confirmExcluir && (
        <ConfirmarExclusaoModal titulo="Excluir clientes" onCancelar={() => setConfirmExcluir(false)}
          mensagem={`Excluir ${selecionados.size} cliente(s) selecionado(s)? Isso remove também todas as unidades, contratos, serviços e processos vinculados a eles. Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirClientes(Array.from(selecionados)); setSelecionados(new Set()); setConfirmExcluir(false); }} />
      )}
      {showNovo && isAdmin && <NovoClienteModal onClose={() => setShowNovo(false)} onSave={onAddContrato} />}
    </div>
  );
}

/* ============================================================
   UNIDADES DE CLIENTES — listagem agregada por cliente + unidade
   ============================================================ */
function UnidadesPage({ contratos, onAddContrato, onOpenUnidade, isAdmin, onExcluirUnidades }) {
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtroStatus, setFiltroStatus] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  const idsUnidades = useMemo(() => computarIdsUnidades(contratos), [contratos]);
  const statusOpcoes = useMemo(() => Array.from(new Set(contratos.map((c) => c.statusContrato))).filter(Boolean).sort(), [contratos]);

  const unidades = useMemo(() => {
    const map = {};
    contratos.forEach((c) => {
      const key = `${c.cliente}|${c.unidade}`;
      if (!map[key]) map[key] = { cliente: c.cliente, unidade: c.unidade, codigoUnidade: "", servicos: new Set(), statusContrato: c.statusContrato };
      const m = map[key];
      m.servicos.add(c.servico);
      if (!m.codigoUnidade && c.codigoLoja && c.codigoLoja !== "-") m.codigoUnidade = c.codigoLoja;
      m.statusContrato = c.statusContrato || m.statusContrato;
    });
    return Object.values(map).map((m) => ({ cliente: m.cliente, unidade: m.unidade, codigoUnidade: m.codigoUnidade, servicos: m.servicos.size, statusContrato: m.statusContrato })).sort((a, b) => a.cliente.localeCompare(b.cliente) || a.unidade.localeCompare(b.unidade));
  }, [contratos]);

  const [ordem, ordenarPor] = useOrdenacao();
  const filtrados = useMemo(() => {
    const base = unidades.filter((u) => {
      if (busca && !`${u.cliente} ${u.unidade} ${u.codigoUnidade}`.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroStatus.length && !filtroStatus.includes(u.statusContrato)) return false;
      return true;
    });
    return ordenarLista(base, ordem, { id: (u) => idsUnidades[`${u.cliente}|${u.unidade}`] });
  }, [unidades, busca, filtroStatus, ordem, idsUnidades]);
  const paginados = useMemo(() => paginate(filtrados, page, pageSize), [filtrados, page, pageSize]);
  const clientesExistentes = useMemo(() => Array.from(new Set(contratos.map((c) => c.cliente))).sort(), [contratos]);
  const [showNovo, setShowNovo] = useState(false);

  const chave = (u) => `${u.cliente}|${u.unidade}`;
  const toggleSel = (k) => setSelecionados((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const todosPaginaSelecionados = paginados.length > 0 && paginados.every((u) => selecionados.has(chave(u)));
  const toggleTodosPagina = () => setSelecionados((s) => {
    const n = new Set(s);
    if (todosPaginaSelecionados) paginados.forEach((u) => n.delete(chave(u))); else paginados.forEach((u) => n.add(chave(u)));
    return n;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", width: 280 }}>
            <Search size={14} color={COLORS.steel} />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Buscar cliente, unidade ou código..."
              style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ice, fontSize: 13, width: "100%" }} />
          </div>
          <BotaoFiltroPopup grupos={[{ label: "Status do contrato", options: statusOpcoes, selected: filtroStatus, onApply: (v) => { setFiltroStatus(v); setPage(1); } }]} />
        </div>
        <button onClick={() => setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
          <Plus size={15} /> Nova unidade
        </button>
      </div>
      {isAdmin && <BarraSelecaoExclusao contagem={selecionados.size} rotulo="unidade(s)" onLimpar={() => setSelecionados(new Set())} onExcluir={() => setConfirmExcluir(true)} />}
      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>
              {isAdmin && <Th ordem={ordem} ordenarPor={ordenarPor}><input type="checkbox" checked={todosPaginaSelecionados} onChange={toggleTodosPagina} /></Th>}
              <Th campo="id" ordem={ordem} ordenarPor={ordenarPor}>ID</Th>
              <Th campo="cliente" ordem={ordem} ordenarPor={ordenarPor}>Cliente</Th>
              <Th campo="codigoUnidade" ordem={ordem} ordenarPor={ordenarPor}>Código da unidade</Th>
              <Th campo="unidade" ordem={ordem} ordenarPor={ordenarPor}>Unidade</Th>
              <Th campo="servicos" ordem={ordem} ordenarPor={ordenarPor}>Serviços</Th>
              <Th campo="statusContrato" ordem={ordem} ordenarPor={ordenarPor}>Status do contrato</Th>
              <Th ordem={ordem} ordenarPor={ordenarPor}>{""}</Th>
            </tr></thead>
            <tbody>
              {paginados.map((u, i) => {
                const sc = statusContratoStyle(u.statusContrato);
                return (
                  <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer" }} onClick={() => onOpenUnidade(u.cliente, u.unidade)}>
                    {isAdmin && <td style={{ padding: "11px 16px" }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selecionados.has(chave(u))} onChange={() => toggleSel(chave(u))} /></td>}
                    <td style={{ padding: "11px 16px", fontSize: 11, color: COLORS.steel, fontFamily: "monospace" }}>{idsUnidades[`${u.cliente}|${u.unidade}`]}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: COLORS.ice }}>{u.cliente}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12.5, color: COLORS.steel, fontFamily: "monospace" }}>{u.codigoUnidade || "—"}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.steelLight }}>{u.unidade}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, color: COLORS.steelLight }}>{u.servicos}</td>
                    <td style={{ padding: "11px 16px" }}><Pill fg={sc.fg} bg={sc.bg}>{u.statusContrato}</Pill></td>
                    <td style={{ padding: "11px 16px" }}><ChevronRight size={15} color={COLORS.steel} /></td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhuma unidade encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={filtrados.length} />
      </div>
      {confirmExcluir && (
        <ConfirmarExclusaoModal titulo="Excluir unidades" onCancelar={() => setConfirmExcluir(false)}
          mensagem={`Excluir ${selecionados.size} unidade(s) selecionada(s)? Isso remove também todos os contratos, serviços e processos vinculados a elas. Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirUnidades(Array.from(selecionados)); setSelecionados(new Set()); setConfirmExcluir(false); }} />
      )}
      {showNovo && <NovaUnidadeModal onClose={() => setShowNovo(false)} onSave={onAddContrato} clientesExistentes={clientesExistentes} />}
    </div>
  );
}

/* ============================================================
   PLANEJAMENTO DE SERVIÇOS — tela única, dividida em duas
   colunas: à esquerda o panorama do ano inteiro (quantidade de
   tarefas por mês e por situação), à direita o foco no mês
   selecionado (concluídas x não concluídas). Os mesmos filtros
   (cliente, unidade, contrato, serviço, ano, mês) valem para os
   dois lados. Nenhum valor financeiro entra aqui — só quantidade.
   ============================================================ */
function PlanejamentoServicosPage({ contratos, onOpenContrato }) {
  const hojeRef = new Date();
  const [ano, setAno] = useState(String(hojeRef.getFullYear()));
  const [mes, setMes] = useState(String(hojeRef.getMonth() + 1));
  const [filtroCliente, setFiltroCliente] = useState([]);
  const [filtroUnidade, setFiltroUnidade] = useState([]);
  const [filtroContrato, setFiltroContrato] = useState([]);
  const [filtroServico, setFiltroServico] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const anosDisponiveis = useMemo(() => {
    const anos = new Set(contratos.map((c) => (c.dataSLA ? c.dataSLA.slice(0, 4) : null)).filter(Boolean));
    anos.add(String(hojeRef.getFullYear()));
    return Array.from(anos).sort();
  }, [contratos]); // eslint-disable-line
  useEffect(() => { if (!anosDisponiveis.includes(ano)) setAno(anosDisponiveis[anosDisponiveis.length - 1]); }, [anosDisponiveis]); // eslint-disable-line

  const clientes = useMemo(() => Array.from(new Set(contratos.map((c) => c.cliente))).sort(), [contratos]);
  const unidades = useMemo(() => {
    if (!filtroCliente.length) return [];
    const base = contratos.filter((c) => filtroCliente.includes(c.cliente));
    return Array.from(new Set(base.map((c) => c.unidade))).sort();
  }, [contratos, filtroCliente]);
  const codigosUnidade = useMemo(() => mapaCodigosUnidade(contratos), [contratos]);
  const rotuloUn = (u) => rotuloUnidade(u, codigosUnidade[`${filtroCliente[0]}|${u}`]);
  const contratosOpts = useMemo(() => Array.from(new Set(contratos.map((c) => c.proposta))).sort(), [contratos]);
  const servicos = useMemo(() => Array.from(new Set(contratos.map((c) => c.servico))).sort(), [contratos]);

  const aplicarFiltrosComuns = (lista) => lista.filter((c) => {
    if (filtroCliente.length && !filtroCliente.includes(c.cliente)) return false;
    if (filtroUnidade.length && !filtroUnidade.includes(c.unidade)) return false;
    if (filtroContrato.length && !filtroContrato.includes(c.proposta)) return false;
    if (filtroServico.length && !filtroServico.includes(c.servico)) return false;
    return true;
  });

  const doAno = useMemo(() => aplicarFiltrosComuns(contratos.filter((c) => c.dataSLA && c.dataSLA.slice(0, 4) === ano)),
    [contratos, ano, filtroCliente, filtroUnidade, filtroContrato, filtroServico]); // eslint-disable-line
  const doMesTodos = useMemo(() => doAno.filter((c) => c.dataSLA && String(parseInt(c.dataSLA.slice(5, 7), 10)) === mes), [doAno, mes]);
  const doMes = useMemo(() => doMesTodos.filter((c) => c.statusParcela !== "Suspenso"), [doMesTodos]);

  const contaServicos = (lista) => new Set(lista.map((c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}`)).size;

  // ---- Lado esquerdo: ano inteiro, todas as situações ----
  const totalTarefasAno = doAno.length;
  const totalServicosAno = contaServicos(doAno);
  const totalConcluidasAno = doAno.filter((c) => c.statusParcela === "Concluído").length;
  const totalAndamentoAno = doAno.filter((c) => c.statusParcela === "Em andamento").length;
  const totalPendentesAno = doAno.filter((c) => c.statusParcela === "Pendente").length;

  const chartDataAno = useMemo(() => {
    const map = {};
    for (let m = 1; m <= 12; m++) map[m] = { label: MESES_ABREV[m - 1], "Pendente": 0, "Em andamento": 0, "Concluído": 0, "Suspenso": 0 };
    doAno.forEach((c) => {
      const m = parseInt(c.dataSLA.slice(5, 7), 10);
      if (!map[m]) return;
      map[m][c.statusParcela] = (map[m][c.statusParcela] || 0) + 1;
    });
    return Object.values(map);
  }, [doAno]);

  // ---- Lado direito: mês selecionado (suspensos ficam de fora) ----
  const concluidasMes = doMes.filter((c) => c.statusParcela === "Concluído").length;
  const naoConcluidasMes = doMes.length - concluidasMes;
  const pctConcluidoMes = doMes.length === 0 ? 0 : Math.round((concluidasMes / doMes.length) * 100);
  const pieDataMes = [
    { name: "Concluído", value: concluidasMes },
    { name: "Não concluído", value: naoConcluidasMes },
  ].filter((d) => d.value > 0);
  const PIE_COLORS = { "Concluído": COLORS.green, "Não concluído": COLORS.orange };

  const [ordemMes, ordenarMesPor] = useOrdenacao();
  const ordenadosMes = useMemo(() => {
    const base = [...doMes].sort((a, b) => (a.dataSLA || "").localeCompare(b.dataSLA || ""));
    return ordenarLista(base, ordemMes, { codigoUnidade: (c) => c.codigoLoja });
  }, [doMes, ordemMes]);
  const paginadosMes = useMemo(() => paginate(ordenadosMes, page, pageSize), [ordenadosMes, page, pageSize]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        <BotaoFiltroPopup grupos={[
          { label: "Clientes", options: clientes, selected: filtroCliente, onApply: (v) => { setFiltroCliente(v); setFiltroUnidade([]); setPage(1); } },
          { label: "Unidades do cliente", options: unidades, selected: filtroUnidade, onApply: (v) => { setFiltroUnidade(v); setPage(1); }, labelFor: rotuloUn,
            habilitado: filtroCliente.length > 0, mensagemBloqueio: "Escolha um cliente para carregar as unidades." },
          { label: "Contratos", options: contratosOpts, selected: filtroContrato, onApply: (v) => { setFiltroContrato(v); setPage(1); } },
          { label: "Serviços", options: servicos, selected: filtroServico, onApply: (v) => { setFiltroServico(v); setPage(1); } },
        ]} />
        <Select value={ano} onChange={(v) => { setAno(v); setPage(1); }} options={anosDisponiveis} />
        <select value={mes} onChange={(e) => { setMes(e.target.value); setPage(1); }} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", color: COLORS.steelLight, fontSize: 12.5, fontFamily: "'Inter', sans-serif" }}>
          {MESES_NOMES.map((nome, i) => <option key={nome} value={String(i + 1)}>{nome}</option>)}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>

        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ice, textTransform: "uppercase", letterSpacing: "0.02em" }}>Planejamento de Serviços</div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: COLORS.steel, background: "rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: 999 }}>{ano}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <KpiCard icon={Layers} label="Serviços planejados" value={totalServicosAno} accent={COLORS.blue} sub={`${totalTarefasAno} tarefa(s) no ano ${ano}`} />
            <KpiCard icon={CheckCircle2} label="Tarefas concluídas" value={totalConcluidasAno} accent={COLORS.green} sub="etapas já finalizadas" />
            <KpiCard icon={Clock} label="Em andamento" value={totalAndamentoAno} accent={COLORS.blue} sub="etapas em execução" />
            <KpiCard icon={AlertTriangle} label="Pendentes" value={totalPendentesAno} accent={COLORS.orange} sub="ainda não iniciadas" />
          </div>
          <div style={{ background: COLORS.panelAlt, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Quantidade de tarefas por mês — todas as situações</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartDataAno} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: COLORS.steelLight, fontSize: 10.5 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                <YAxis tick={{ fill: COLORS.steel, fontSize: 10 }} axisLine={{ stroke: COLORS.border }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Legend wrapperStyle={{ fontSize: 10, color: COLORS.steelLight }} />
                <Bar dataKey="Pendente" stackId="a" fill={COLORS.steel} />
                <Bar dataKey="Em andamento" stackId="a" fill={COLORS.blue} />
                <Bar dataKey="Concluído" stackId="a" fill={COLORS.green} />
                <Bar dataKey="Suspenso" stackId="a" fill={COLORS.orange} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ice, textTransform: "uppercase", letterSpacing: "0.02em" }}>Planejamento do mês</div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: COLORS.steel, background: "rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: 999 }}>{MESES_NOMES[parseInt(mes, 10) - 1]}/{ano}</div>
          </div>
          <div style={{ fontSize: 10.5, color: COLORS.steel, marginBottom: 12 }}>Serviços suspensos não entram nesta comparação — consulte-os no painel ao lado ou em Serviços contratados.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            <KpiCard icon={Layers} label="Tarefas do mês" value={doMes.length} accent={COLORS.blue} sub={`${contaServicos(doMes)} serviço(s)`} />
            <KpiCard icon={CheckCircle2} label="Concluído" value={`${pctConcluidoMes}%`} accent={COLORS.green} sub={`${concluidasMes} de ${doMes.length} tarefa(s)`} />
          </div>
          <div style={{ background: COLORS.panelAlt, borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 12 }}>Concluído x não concluído</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieDataMes} dataKey="value" nameKey="name" innerRadius={48} outerRadius={74} paddingAngle={3}>
                  {pieDataMes.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10.5, color: COLORS.steelLight }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: COLORS.panelAlt, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead><tr>
                  <Th campo="cliente" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Cliente</Th>
                  <Th campo="codigoUnidade" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Cód.</Th>
                  <Th campo="unidade" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Unidade</Th>
                  <Th campo="servico" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Serviço</Th>
                  <Th campo="tarefa" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Tarefa</Th>
                  <Th campo="statusParcela" ordem={ordemMes} ordenarPor={ordenarMesPor} style={{ padding: "8px 12px", fontSize: 10 }}>Situação</Th>
                </tr></thead>
                <tbody>
                  {paginadosMes.map((c) => {
                    const sp = statusParcelaStyle(c.statusParcela);
                    return (
                      <tr key={c.id} className="row-hover" style={{ cursor: onOpenContrato ? "pointer" : "default", borderBottom: `1px solid ${COLORS.border}` }} onClick={() => onOpenContrato && onOpenContrato(c.cliente, c.unidade, c.proposta)}>
                        <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: COLORS.ice }}>{c.cliente}</td>
                        <td style={{ padding: "8px 12px", fontSize: 11, color: COLORS.steel, fontFamily: "monospace" }}>{c.codigoLoja && c.codigoLoja !== "-" ? c.codigoLoja : "—"}</td>
                        <td style={{ padding: "8px 12px", fontSize: 11.5, color: COLORS.steelLight }}>{c.unidade}</td>
                        <td style={{ padding: "8px 12px", fontSize: 11.5, color: COLORS.steelLight, maxWidth: 160 }}>{c.servico}</td>
                        <td style={{ padding: "8px 12px", fontSize: 11.5, color: COLORS.steel, maxWidth: 120 }}>{c.tarefa}</td>
                        <td style={{ padding: "8px 12px" }}><Pill fg={sp.fg} bg={sp.bg}>{c.statusParcela}</Pill></td>
                      </tr>
                    );
                  })}
                  {doMes.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: COLORS.steel, fontSize: 12.5 }}>Nenhum serviço neste mês.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={ordenadosMes.length} />
          </div>
        </div>

      </div>
    </div>
  );
}

/* ============================================================
   SERVIÇOS CONTRATADOS — listagem completa no nível da tarefa/
   etapa de cada serviço. Substitui a antiga tela de Contratos:
   mesmo conteúdo, sem nenhuma coluna de valor — o que se mede
   aqui é quantidade de serviços, de tarefas e a situação delas.
   ============================================================ */
function ServicosContratadosPage({ contratos, processos, onAddContrato, onExcluirContratos, isAdmin, onOpenContrato, onOpenServico, edits, onEdit }) {
  const [filtroCliente, setFiltroCliente] = useState([]);
  const [filtroUnidade, setFiltroUnidade] = useState([]);
  const [filtroStatusContrato, setFiltroStatusContrato] = useState([]);
  const [filtroStatusParcela, setFiltroStatusParcela] = useState([]);
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formModal, setFormModal] = useState(null);
  const [selecionados, setSelecionados] = useState(new Set());
  const [confirmExcluir, setConfirmExcluir] = useState(false);

  const clientes = useMemo(() => Array.from(new Set(contratos.map((c) => c.cliente))).sort(), [contratos]);
  const unidades = useMemo(() => {
    if (!filtroCliente.length) return [];
    const base = contratos.filter((c) => filtroCliente.includes(c.cliente));
    return Array.from(new Set(base.map((c) => c.unidade))).sort();
  }, [contratos, filtroCliente]);
  const codigosUnidade = useMemo(() => mapaCodigosUnidade(contratos), [contratos]);
  const rotuloUn = (u) => rotuloUnidade(u, codigosUnidade[`${filtroCliente[0]}|${u}`]);
  const statusContratoOpts = useMemo(() => Array.from(new Set(contratos.map((c) => c.statusContrato))).filter(Boolean).sort(), [contratos]);

  const [ordem, ordenarPor] = useOrdenacao();
  const val = (c, campo) => (edits && edits[c.id] && campo in edits[c.id]) ? edits[c.id][campo] : c[campo];
  const pend = (c, campo) => !!(edits && edits[c.id] && campo in edits[c.id]);

  const filtrados = useMemo(() => {
    const base = contratos.filter((c) => {
      if (filtroCliente.length && !filtroCliente.includes(c.cliente)) return false;
      if (filtroUnidade.length && !filtroUnidade.includes(c.unidade)) return false;
      if (filtroStatusContrato.length && !filtroStatusContrato.includes(c.statusContrato)) return false;
      if (filtroStatusParcela.length && !filtroStatusParcela.includes(val(c, "statusParcela"))) return false;
      if (busca) {
        const q = busca.toLowerCase();
        const hay = `${c.cliente} ${c.unidade} ${c.codigoLoja} ${c.servico} ${c.proposta}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return ordenarLista(base, ordem, {
      codigoUnidade: (c) => c.codigoLoja,
      tecnico: (c) => val(c, "tecnico"),
      dataSLA: (c) => val(c, "dataSLA"),
      statusParcela: (c) => val(c, "statusParcela"),
      inicio: (c) => { const p = (processos || []).find((x) => x.numeroContrato === c.proposta && x.cliente === c.cliente && x.unidade === c.unidade && x.assunto === c.servico); return p ? p.dataInicio : null; },
      conclusao: (c) => { const p = (processos || []).find((x) => x.numeroContrato === c.proposta && x.cliente === c.cliente && x.unidade === c.unidade && x.assunto === c.servico); return p ? p.dataConclusao : null; },
    });
  }, [contratos, filtroCliente, filtroUnidade, filtroStatusContrato, filtroStatusParcela, busca, ordem, edits, processos]); // eslint-disable-line

  const totalPropostas = useMemo(() => new Set(filtrados.map((c) => c.proposta)).size, [filtrados]);
  const totalClientes = useMemo(() => new Set(filtrados.map((c) => c.cliente)).size, [filtrados]);
  const totalServicos = useMemo(() => new Set(filtrados.map((c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}`)).size, [filtrados]);
  const paginados = useMemo(() => paginate(filtrados, page, pageSize), [filtrados, page, pageSize]);

  const qtdConcluidas = filtrados.filter((c) => val(c, "statusParcela") === "Concluído").length;
  const qtdEmAndamento = filtrados.filter((c) => val(c, "statusParcela") === "Em andamento").length;
  const qtdPendentes = filtrados.filter((c) => val(c, "statusParcela") === "Pendente").length;
  const qtdSuspensas = filtrados.filter((c) => val(c, "statusParcela") === "Suspenso").length;
  const pctConcluido = filtrados.length === 0 ? 0 : Math.round((qtdConcluidas / filtrados.length) * 100);
  const pieSituacao = [
    { name: "Concluído", value: qtdConcluidas },
    { name: "Em andamento", value: qtdEmAndamento },
    { name: "Pendente", value: qtdPendentes },
    { name: "Suspenso", value: qtdSuspensas },
  ].filter((d) => d.value > 0);

  const porServicoSituacao = useMemo(() => {
    const map = {};
    filtrados.forEach((c) => {
      if (!map[c.servico]) map[c.servico] = { servico: c.servico, "Concluído": 0, "Em andamento": 0, "Pendente": 0, "Suspenso": 0 };
      const st = val(c, "statusParcela");
      map[c.servico][st] = (map[c.servico][st] || 0) + 1;
    });
    return Object.values(map)
      .sort((a, b) => (b["Concluído"] + b["Em andamento"] + b["Pendente"] + b["Suspenso"]) - (a["Concluído"] + a["Em andamento"] + a["Pendente"] + a["Suspenso"]))
      .slice(0, 10);
  }, [filtrados]);

  const exportar = () => {
    const rows = [["Proposta", "Cliente", "Código da unidade", "Unidade", "Serviço", "Tarefa", "Tipo", "Técnico", "Coordenador", "Data SLA", "Status Serviço", "Situação da tarefa", "Observação"]];
    filtrados.forEach((c) => rows.push([c.proposta, c.cliente, c.codigoLoja, c.unidade, c.servico, c.tarefa, c.tipo, val(c, "tecnico"), c.coordenador, fmtDate(val(c, "dataSLA")), c.statusServico, val(c, "statusParcela"), c.observacao]));
    downloadCSV("servicos_contratados.csv", rows);
  };

  const abrirNovo = () => setFormModal({
    title: "Novo serviço contratado", submitLabel: "Salvar serviço", initial: {},
    onSubmit: (fields) => onAddContrato(novaLinhaContrato(fields)),
  });

  const processoDoServico = (c) => (processos || []).find((p) => p.numeroContrato === c.proposta && p.cliente === c.cliente && p.unidade === c.unidade && p.assunto === c.servico);

  const toggleSel = (id) => setSelecionados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const todosPaginaSelecionados = paginados.length > 0 && paginados.every((c) => selecionados.has(c.id));
  const toggleTodosPagina = () => setSelecionados((s) => {
    const n = new Set(s);
    if (todosPaginaSelecionados) paginados.forEach((c) => n.delete(c.id)); else paginados.forEach((c) => n.add(c.id));
    return n;
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <KpiCard icon={FileSignature} label="Contratos" value={totalPropostas} accent={COLORS.blue} sub={`${filtrados.length} tarefa(s) no filtro atual`} />
        <KpiCard icon={Building2} label="Clientes" value={totalClientes} accent={COLORS.steelLight} sub="clientes no filtro atual" />
        <KpiCard icon={Layers} label="Serviços" value={totalServicos} accent={COLORS.green} sub="serviços distintos contratados" />
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <KpiCard icon={CheckCircle2} label="Tarefas concluídas" value={qtdConcluidas} accent={COLORS.green} sub={`${pctConcluido}% do total do filtro`} />
        <KpiCard icon={Timer} label="Em andamento" value={qtdEmAndamento} accent={COLORS.blue} sub="ainda em execução" />
        <KpiCard icon={Clock} label="Pendentes" value={qtdPendentes} accent={COLORS.steel} sub="ainda não iniciadas" />
        <KpiCard icon={MinusCircle} label="Suspensas" value={qtdSuspensas} accent={COLORS.orange} sub="tarefas suspensas" />
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>Situação das tarefas</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieSituacao} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}>
                {pieSituacao.map((d, i) => <Cell key={i} fill={statusParcelaStyle(d.name).fg} />)}
              </Pie>
              <Tooltip contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 10.5, color: COLORS.steelLight }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: "2 1 380px", background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>Quantidade de tarefas por serviço — por situação</div>
          <ResponsiveContainer width="100%" height={Math.max(220, porServicoSituacao.length * 46)}>
            <BarChart data={porServicoSituacao} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: COLORS.steel, fontSize: 10.5 }} axisLine={{ stroke: COLORS.border }} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="servico" width={190} tick={{ fill: COLORS.steelLight, fontSize: 10.5 }} axisLine={{ stroke: COLORS.border }} tickLine={false}
                tickFormatter={(v) => (v && v.length > 26 ? `${v.slice(0, 24)}…` : v)} />
              <Tooltip contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 10.5, color: COLORS.steelLight }} />
              <Bar dataKey="Concluído" stackId="a" fill={COLORS.green} />
              <Bar dataKey="Em andamento" stackId="a" fill={COLORS.blue} />
              <Bar dataKey="Pendente" stackId="a" fill={COLORS.steel} />
              <Bar dataKey="Suspenso" stackId="a" fill={COLORS.orange} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px" }}>
            <Search size={14} color={COLORS.steel} />
            <input value={busca} onChange={(e) => { setBusca(e.target.value); setPage(1); }} placeholder="Buscar cliente, unidade, serviço ou proposta..."
              style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ice, fontSize: 13, width: 260 }} />
          </div>
          <BotaoFiltroPopup grupos={[
            { label: "Clientes", options: clientes, selected: filtroCliente, onApply: (v) => { setFiltroCliente(v); setFiltroUnidade([]); setPage(1); } },
            { label: "Unidades do cliente", options: unidades, selected: filtroUnidade, onApply: (v) => { setFiltroUnidade(v); setPage(1); }, labelFor: rotuloUn,
              habilitado: filtroCliente.length > 0, mensagemBloqueio: "Escolha um cliente para carregar as unidades." },
            { label: "Status do contrato", options: statusContratoOpts, selected: filtroStatusContrato, onApply: (v) => { setFiltroStatusContrato(v); setPage(1); } },
            { label: "Situação da tarefa", options: STATUS_PARCELA_OPTIONS, selected: filtroStatusParcela, onApply: (v) => { setFiltroStatusParcela(v); setPage(1); } },
          ]} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={exportar} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.steelLight, borderRadius: 7, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={abrirNovo} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <Plus size={15} /> Novo serviço
          </button>
        </div>
      </div>

      {isAdmin && <BarraSelecaoExclusao contagem={selecionados.size} rotulo="tarefa(s)" onLimpar={() => setSelecionados(new Set())} onExcluir={() => setConfirmExcluir(true)} />}

      <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr>
              {isAdmin && <Th ordem={ordem} ordenarPor={ordenarPor}><input type="checkbox" checked={todosPaginaSelecionados} onChange={toggleTodosPagina} /></Th>}
              <Th campo="proposta" ordem={ordem} ordenarPor={ordenarPor}>Proposta</Th>
              <Th campo="cliente" ordem={ordem} ordenarPor={ordenarPor}>Cliente</Th>
              <Th campo="codigoUnidade" ordem={ordem} ordenarPor={ordenarPor}>Código da unidade</Th>
              <Th campo="unidade" ordem={ordem} ordenarPor={ordenarPor}>Unidade</Th>
              <Th campo="servico" ordem={ordem} ordenarPor={ordenarPor}>Serviço</Th>
              <Th campo="tarefa" ordem={ordem} ordenarPor={ordenarPor}>Tarefa</Th>
              <Th campo="tipo" ordem={ordem} ordenarPor={ordenarPor}>Tipo</Th>
              <Th campo="tecnico" ordem={ordem} ordenarPor={ordenarPor}>Técnico</Th>
              <Th campo="dataSLA" ordem={ordem} ordenarPor={ordenarPor}>Data SLA</Th>
              <Th campo="statusParcela" ordem={ordem} ordenarPor={ordenarPor}>Situação da tarefa</Th>
              <Th campo="inicio" ordem={ordem} ordenarPor={ordenarPor}>Início</Th>
              <Th campo="conclusao" ordem={ordem} ordenarPor={ordenarPor}>Conclusão</Th>
              <Th ordem={ordem} ordenarPor={ordenarPor}>Ações</Th>
            </tr></thead>
            <tbody>
              {paginados.map((c) => {
                const sp = statusParcelaStyle(val(c, "statusParcela"));
                const proc = processoDoServico(c);
                return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    {isAdmin && <td style={{ padding: "10px 16px" }}><input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggleSel(c.id)} /></td>}
                    <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.steel, fontFamily: "monospace" }}>{c.proposta}</td>
                    <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: COLORS.ice }}>{c.cliente}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.steel, fontFamily: "monospace" }}>{c.codigoLoja && c.codigoLoja !== "-" ? c.codigoLoja : "—"}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12.5, color: COLORS.steelLight }}>{c.unidade}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12.5, color: COLORS.steelLight, maxWidth: 220 }}>{c.servico}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.steel }}>{c.tarefa}</td>
                    <td style={{ padding: "10px 16px", fontSize: 11.5, color: COLORS.steel, whiteSpace: "nowrap" }}>{c.tipo || "Processo"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <CampoRascunho tipo="select" valor={TECNICOS_OPTIONS.includes(val(c, "tecnico")) ? val(c, "tecnico") : ""} opcoes={["", ...TECNICOS_OPTIONS]}
                        onChange={(v) => onEdit(c.id, "tecnico", v)} largura={110} pendente={pend(c, "tecnico")} />
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <CampoRascunho tipo="date" valor={val(c, "dataSLA")} onChange={(v) => onEdit(c.id, "dataSLA", v)} largura={130} pendente={pend(c, "dataSLA")} />
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <CampoRascunho tipo="select" valor={val(c, "statusParcela")} opcoes={STATUS_PARCELA_OPTIONS}
                        onChange={(v) => onEdit(c.id, "statusParcela", v)} corTexto={sp.fg} largura={150} pendente={pend(c, "statusParcela")} />
                    </td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.steel, whiteSpace: "nowrap" }}>{proc ? fmtDate(proc.dataInicio) : "—"}</td>
                    <td style={{ padding: "10px 16px", fontSize: 12, color: COLORS.steel, whiteSpace: "nowrap" }}>{proc ? fmtDate(proc.dataConclusao) : "—"}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <button onClick={() => onOpenServico(c.cliente, c.unidade, c.proposta, c.servico)} title="Abrir este serviço"
                        style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <FileSignature size={13} color={COLORS.steelLight} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={14} style={{ padding: 40, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>
                  Nenhum serviço cadastrado ainda. Use "Importar novos clientes/serviços" no menu Clientes.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} totalItems={filtrados.length} />
      </div>
      {formModal && <ContratoFormModal title={formModal.title} submitLabel={formModal.submitLabel} initial={formModal.initial} onSubmit={formModal.onSubmit} onClose={() => setFormModal(null)} clientesExistentes={clientes} />}
      {confirmExcluir && (
        <ConfirmarExclusaoModal titulo="Excluir tarefas" onCancelar={() => setConfirmExcluir(false)}
          mensagem={`Excluir ${selecionados.size} tarefa(s) selecionada(s)? Se for a última tarefa de um serviço, o processo correspondente em Controle de Processos também será removido. Esta ação não pode ser desfeita.`}
          onConfirmar={() => { onExcluirContratos(contratos.filter((c) => selecionados.has(c.id))); setSelecionados(new Set()); setConfirmExcluir(false); }} />
      )}
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
function ControleProcessos({ usuarioLogado, onLogout, logoBase64, onLogoAtualizado }) {
  const isAdmin = usuarioLogado.role === "admin";
  const [processos, setProcessos] = useState(MOCK_PROCESSOS);
  const [tab, setTab] = useState("dashboard-processos");
  useEffect(() => {
    if (!SUPABASE_CONFIGURADO) return;
    supabase.from("eventos_uso").insert({ usuario_nome: usuarioLogado.nome, tela: tab }).then(() => {});
  }, [tab]); // eslint-disable-line
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [clientesOpen, setClientesOpen] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({ cliente: [], unidade: [], assunto: [], responsavel: [] });
  const [selected, setSelected] = useState(null);
  const [popupStack, setPopupStack] = useState([]);
  const popupAtual = popupStack[popupStack.length - 1] || null;
  const abrirPopupCliente = (cliente) => setPopupStack([{ type: "cliente", cliente }]);
  const abrirPopupUnidade = (cliente, unidade) => setPopupStack((s) => [...s, { type: "unidade", cliente, unidade }]);
  const abrirPopupContrato = (cliente, unidade, proposta) => setPopupStack((s) => [...s, { type: "contrato", cliente, unidade, proposta }]);
  const abrirPopupServico = (cliente, unidade, proposta, servico) => setPopupStack((s) => [...s, { type: "servico", cliente, unidade, proposta, servico }]);
  const fecharPopups = () => setPopupStack([]);
  const voltarPopup = () => setPopupStack((s) => s.slice(0, -1));
  const [showNew, setShowNew] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [agendaItens, setAgendaItens] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [carregandoDados, setCarregandoDados] = useState(true);

  /* ---------- RASCUNHO: nada vai para o banco sem "Salvar alterações" ---------- */
  const rascunho = useRascunhoGlobal();
  const [rascunhoProcessos, setRascunhoProcessos] = useState({});   // id -> processo modificado
  const [rascunhoContratos, setRascunhoContratos] = useState({});   // id -> { campo: valor }
  const [rascunhoEventos, setRascunhoEventos] = useState({});       // id -> { campo: valor }

  const codigosUnidade = useMemo(() => mapaCodigosUnidade(contratos), [contratos]);
  useEffect(() => { CODIGOS_UNIDADE = codigosUnidade; }, [codigosUnidade]);
  const codigoDaUnidade = (cliente, unidade) => codigosUnidade[`${cliente}|${unidade}`] || "";

  /* Conta quantos campos de topo mudaram entre o registro original e o rascunho. */
  const contarDiferencas = (orig, novo) => {
    if (!orig) return 1;
    let n = 0;
    Object.keys(novo).forEach((k) => {
      const a = orig[k], b = novo[k];
      const iguais = (typeof a === "object" || typeof b === "object") ? JSON.stringify(a) === JSON.stringify(b) : a === b;
      if (!iguais) n++;
    });
    return n;
  };
  const pendentesDoProcesso = (id) => {
    const novo = rascunhoProcessos[id];
    if (!novo) return 0;
    return contarDiferencas(processos.find((p) => p.id === id), novo);
  };
  const editarProcessoRascunho = (novo) => setRascunhoProcessos((m) => ({ ...m, [novo.id]: novo }));
  const descartarProcessoRascunho = (id) => setRascunhoProcessos((m) => { const n = { ...m }; delete n[id]; return n; });
  const editarContratoRascunho = (id, campo, valor) => setRascunhoContratos((m) => {
    const orig = contratos.find((c) => c.id === id) || {};
    const atual = { ...(m[id] || {}) };
    if (String(orig[campo] ?? "") === String(valor ?? "")) delete atual[campo]; else atual[campo] = valor;
    const n = { ...m };
    if (Object.keys(atual).length) n[id] = atual; else delete n[id];
    return n;
  });
  const editarEventoRascunho = (id, campo, valor) => setRascunhoEventos((m) => ({ ...m, [id]: { ...(m[id] || {}), [campo]: valor } }));

  useEffect(() => { setRascunhoProcessos({}); setRascunhoContratos({}); setRascunhoEventos({}); }, [rascunho.sinalDescarte]);

  // Carrega tudo do banco de dados assim que a tela abre
  useEffect(() => {
    let ativo = true;
    async function carregar() {
      const [rp, rc, ra, re] = await Promise.all([
        supabase.from("processos").select("*").order("created_at", { ascending: false }),
        supabase.from("contratos").select("*").order("created_at", { ascending: false }),
        supabase.from("agenda_itens").select("*").order("data"),
        supabase.from("eventos_capacitacao").select("*").order("data", { ascending: false }),
      ]);
      if (!ativo) return;
      const processosCarregados = (!rp.error && rp.data) ? rp.data.map(rowToProcesso) : [];
      const contratosCarregados = (!rc.error && rc.data) ? rc.data.map(rowToContrato) : [];
      if (rp.error) console.error("Erro ao carregar processos:", rp.error);
      if (rc.error) console.error("Erro ao carregar contratos:", rc.error);
      setContratos(contratosCarregados);
      const processosReconciliados = await reconciliarProcessos(contratosCarregados, processosCarregados);
      if (ativo) setProcessos(processosReconciliados);
      if (!ra.error && ra.data) setAgendaItens(ra.data.map(rowToAgendaItem));
      if (!re.error && re.data) setEventos(re.data.map(rowToEvento));
      setCarregandoDados(false);
    }
    carregar();
    return () => { ativo = false; };
  }, []);

  const addAgendaItem = async (item) => {
    const { id, ...campos } = item;
    const { data, error } = await supabase.from("agenda_itens").insert(campos).select().single();
    if (!error && data) setAgendaItens((prev) => [...prev, rowToAgendaItem(data)]);
  };
  const removeAgendaItem = async (id) => {
    setAgendaItens((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("agenda_itens").delete().eq("id", id);
  };
  const updateContrato = (id, fields) => {
    setContratos((prev) => {
      let next = prev.map((c) => (c.id === id ? { ...c, ...fields } : c));
      // Propagação automática: concluir a tarefa de Sinal ou Protocolo ativa
      // as demais tarefas suspensas do mesmo serviço (passam a "Em andamento").
      if (fields.statusParcela === "Concluído") {
        const atualizado = next.find((c) => c.id === id);
        if (atualizado && /sinal|protocolo/i.test(atualizado.tarefa || "")) {
          const irmas = next.filter((c) => c.id !== id && c.proposta === atualizado.proposta && c.cliente === atualizado.cliente && c.unidade === atualizado.unidade && c.servico === atualizado.servico && c.statusParcela === "Suspenso");
          if (irmas.length) {
            const idsIrmas = irmas.map((c) => c.id);
            next = next.map((c) => (idsIrmas.includes(c.id) ? { ...c, statusParcela: "Em andamento" } : c));
            idsIrmas.forEach((idIrma) => supabase.from("contratos").update({ status_parcela: "Em andamento" }).eq("id", idIrma).then(() => {}));
          }
        }
      }
      if (fields.tecnico !== undefined || fields.tipo !== undefined) {
        const atualizado = next.find((c) => c.id === id);
        if (atualizado) setProcessos((pprev) => {
          const sincronizados = sincronizarTecnicoTipoProcesso(atualizado, pprev);
          sincronizados.forEach((p, i) => { if (p !== pprev[i]) supabase.from("processos").update({ tecnico: p.tecnico, tipo: p.tipo }).eq("id", p.id).then(() => {}); });
          return sincronizados;
        });
      }
      return next;
    });
    supabase.from("contratos").update(contratoToRow({ id, ...fields })).eq("id", id).then(() => {});
  };
  const deleteContrato = (id) => {
    setContratos((prev) => prev.filter((c) => c.id !== id));
    supabase.from("contratos").delete().eq("id", id).then(() => {});
  };
  // Exclusão em cascata: remove as linhas de contrato selecionadas e, para
  // qualquer grupo (proposta+cliente+unidade+serviço) que ficar sem nenhuma
  // parcela remanescente, remove também o processo correspondente.
  const excluirContratosEmCascata = async (contratosParaRemover) => {
    if (!contratosParaRemover.length) return;
    const idsRemover = new Set(contratosParaRemover.map((c) => c.id));
    const restantes = contratos.filter((c) => !idsRemover.has(c.id));
    setContratos(restantes);
    await supabase.from("contratos").delete().in("id", Array.from(idsRemover));

    const chaveGrupo = (c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}`;
    const gruposAfetados = new Set(contratosParaRemover.map(chaveGrupo));
    const gruposAindaExistem = new Set(restantes.map(chaveGrupo));
    const processosParaRemover = [];
    gruposAfetados.forEach((chave) => {
      if (gruposAindaExistem.has(chave)) return;
      const [proposta, cliente, unidade, servico] = chave.split("|");
      const proc = processos.find((p) => p.numeroContrato === proposta && p.cliente === cliente && p.unidade === unidade && p.assunto === servico);
      if (proc) processosParaRemover.push(proc);
    });
    if (processosParaRemover.length) {
      const idsProc = processosParaRemover.map((p) => p.id);
      setProcessos((prev) => prev.filter((p) => !idsProc.includes(p.id)));
      await supabase.from("processos").delete().in("id", idsProc);
    }
  };
  const excluirProcessosSelecionados = async (lista) => {
    if (!lista.length) return;
    const ids = lista.map((p) => p.id);
    setProcessos((prev) => prev.filter((p) => !ids.includes(p.id)));
    await supabase.from("processos").delete().in("id", ids);
  };
  const excluirClientes = (nomesClientes) => excluirContratosEmCascata(contratos.filter((c) => nomesClientes.includes(c.cliente)));
  const excluirUnidades = (chavesUnidades) => excluirContratosEmCascata(contratos.filter((c) => chavesUnidades.includes(`${c.cliente}|${c.unidade}`)));

  const addEvento = async (evento) => {
    const { data, error } = await supabase.from("eventos_capacitacao").insert(eventoToRow(evento)).select().single();
    if (error) { console.error("Erro ao criar evento:", error); return; }
    setEventos((prev) => [rowToEvento(data), ...prev]);
  };
  const updateEvento = (id, fields) => {
    setEventos((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
    supabase.from("eventos_capacitacao").update(eventoToRow({ ...eventos.find((e) => e.id === id), ...fields })).eq("id", id).then(() => {});
  };
  const excluirEventos = async (lista) => {
    if (!lista.length) return;
    const ids = lista.map((e) => e.id);
    setEventos((prev) => prev.filter((e) => !ids.includes(e.id)));
    await supabase.from("eventos_capacitacao").delete().in("id", ids);
  };

  const addContratoManual = async (row, vincularProcesso) => {
    const { id, ...campos } = row;
    const { data, error } = await supabase.from("contratos").insert(contratoToRow(campos)).select().single();
    if (error) console.error("Erro ao salvar contrato:", error);
    const salvo = (!error && data) ? rowToContrato(data) : row;
    const contratosAtualizados = [salvo, ...contratos];
    setContratos(contratosAtualizados);
    if (vincularProcesso) {
      const processosAtualizados = await reconciliarProcessos(contratosAtualizados, processos);
      setProcessos(processosAtualizados);
    }
  };

  const [processosPage, setProcessosPage] = useState(1);
  const [processosSelecionados, setProcessosSelecionados] = useState(new Set());
  const [confirmExcluirProcessos, setConfirmExcluirProcessos] = useState(false);
  const [processosPageSize, setProcessosPageSize] = useState(10);
  useEffect(() => { setProcessosPage(1); }, [busca, filtros]);
  const isDashboard = tab === "dashboard-processos" || tab === "dashboard-financeiro";
  const isClientes = tab === "clientes" || tab === "unidades" || tab === "contratos" || tab === "importar-contratos" || tab === "financeiro";
  const updateProcesso = (novo) => {
    setProcessos((prev) => prev.map((p) => (p.id === novo.id ? novo : p)));
    supabase.from("processos").update(processoToRow(novo)).eq("id", novo.id).then(() => {});
    // Mantém as parcelas em Contratos sincronizadas com o andamento do processo
    // (roda em toda atualização, não só nas transições, para também corrigir
    // sozinho registros antigos que ficaram desatualizados).
    if (novo.statusAtual !== "aguardando") {
      setContratos((prev) => {
        const sincronizados = sincronizarParcelasComProcesso(novo, prev);
        sincronizados.forEach((c, i) => { if (c !== prev[i]) supabase.from("contratos").update({ status_parcela: c.statusParcela }).eq("id", c.id).then(() => {}); });
        return sincronizados;
      });
    }
  };
  /* Registra no rascunho global quantas alterações estão pendentes em
     cada área e como aplicá-las no banco quando o usuário salvar. */
  useEffect(() => {
    const total = Object.keys(rascunhoProcessos).reduce((s, id) => s + pendentesDoProcesso(id), 0);
    rascunho.registrar("processos", total, async () => {
      for (const p of Object.values(rascunhoProcessos)) await gravarProcessoComAgenda(p);
      setRascunhoProcessos({});
    });
  }, [rascunhoProcessos, processos]); // eslint-disable-line
  useEffect(() => {
    const total = Object.values(rascunhoContratos).reduce((s, f) => s + Object.keys(f).length, 0);
    rascunho.registrar("contratos", total, async () => {
      Object.entries(rascunhoContratos).forEach(([id, campos]) => updateContrato(id, campos));
      setRascunhoContratos({});
    });
  }, [rascunhoContratos]); // eslint-disable-line
  useEffect(() => {
    const total = Object.values(rascunhoEventos).reduce((s, f) => s + Object.keys(f).length, 0);
    rascunho.registrar("eventos", total, async () => {
      Object.entries(rascunhoEventos).forEach(([id, campos]) => updateEvento(id, campos));
      setRascunhoEventos({});
    });
  }, [rascunhoEventos]); // eslint-disable-line

  /* Grava o processo e, junto, os compromissos de agenda que as
     ocorrências registradas pediram para criar. */
  const gravarProcessoComAgenda = async (p) => {
    const { __agendaPendente, ...limpo } = p;
    updateProcesso(limpo);
    for (const item of (__agendaPendente || [])) await addAgendaItem(item);
  };

  /* Salva só o que pertence a um processo (botão dentro do pop-up). */
  const salvarProcessoRascunho = async (id) => {
    const novo = rascunhoProcessos[id];
    if (novo) await gravarProcessoComAgenda(novo);
    descartarProcessoRascunho(id);
  };

  // Concilia uma planilha importada com o que já está salvo no banco:
  // atualiza as linhas que já existem, cria as que são novas.
  const importarContratosPersistindo = async (rows) => {
    const chave = (c) => `${c.proposta}|${c.cliente}|${c.unidade}|${c.servico}|${c.tarefa}`;
    const existentesPorChave = {};
    contratos.forEach((c) => { existentesPorChave[chave(c)] = c; });

    const salvos = [];
    for (const nova of rows) {
      const existente = existentesPorChave[chave(nova)];
      const { id, ...campos } = contratoToRow(nova);
      if (existente) {
        const { data, error } = await supabase.from("contratos").update(campos).eq("id", existente.id).select().single();
        if (error) console.error("Erro ao atualizar contrato importado:", error, nova);
        salvos.push(data ? rowToContrato(data) : { ...existente, ...nova, id: existente.id });
      } else {
        const { data, error } = await supabase.from("contratos").insert(campos).select().single();
        if (error) console.error("Erro ao importar contrato:", error, nova);
        salvos.push(data ? rowToContrato(data) : nova);
      }
    }
    const chavesNovas = new Set(salvos.map(chave));
    const contratosAtualizados = [...contratos.filter((c) => !chavesNovas.has(chave(c))), ...salvos];
    setContratos(contratosAtualizados);
    const processosAtualizados = await reconciliarProcessos(contratosAtualizados, processos);
    setProcessos(processosAtualizados);
  };

  const filtrados = useMemo(() => applyFiltros(processos, filtros), [processos, filtros]);
  const [ordemProc, ordenarProcPor] = useOrdenacao();
  const buscados = useMemo(() => {
    const base = !busca ? filtrados : filtrados.filter((p) => {
      const q = busca.toLowerCase();
      const cod = codigosUnidade[`${p.cliente}|${p.unidade}`] || "";
      return `${p.cliente} ${p.unidade} ${cod} ${p.assunto} ${p.numero}`.toLowerCase().includes(q);
    });
    return ordenarLista(base, ordemProc, {
      codigoUnidade: (p) => codigosUnidade[`${p.cliente}|${p.unidade}`] || "",
      status: (p) => statusLabel(p.statusAtual, p.tipo),
      prazo: (p) => { const d = diasRestantes(p); return d === null ? null : d; },
      atualizacao: (p) => diasSemAtualizacao(p),
    });
  }, [filtrados, busca, ordemProc, codigosUnidade]);

  // KPIs (sobre o conjunto filtrado)
  const total = filtrados.length;
  const comPrimers = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].responsavel === "Primers").length;
  const comCliente = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].responsavel === "Cliente").length;
  const comOrgao = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].responsavel === "Órgão").length;
  const vencidos = filtrados.filter((p) => { const dr = diasRestantes(p); return dr !== null && dr < 0 && !STATUS_CONFIG[p.statusAtual].final; }).length;

  const administrativos = filtrados.filter((p) => p.tipo === "Processo").length;
  const tecnicos = filtrados.filter((p) => p.tipo === "Serviço Técnico").length;
  const emAnalise = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].grupo === "analise").length;
  const emExigencia = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].grupo === "exigencia").length;
  const aguardandoInicio = filtrados.filter((p) => p.statusAtual === "aguardando").length;
  const concluidos = filtrados.filter((p) => p.statusAtual === "concluido").length;
  const indeferidos = filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].grupo === "indeferido").length;

  const porTecnico = useMemo(() => {
    const map = {};
    TECNICOS_OPTIONS.forEach((t) => { map[t] = { tecnico: t, total: 0, concluidos: 0, emAndamento: 0, emExigencia: 0 }; });
    filtrados.forEach((p) => {
      const chave = TECNICOS_OPTIONS.includes(p.tecnico) ? p.tecnico : "Sem técnico";
      if (!map[chave]) map[chave] = { tecnico: chave, total: 0, concluidos: 0, emAndamento: 0, emExigencia: 0 };
      map[chave].total++;
      if (p.statusAtual === "concluido") map[chave].concluidos++;
      else if (STATUS_CONFIG[p.statusAtual].grupo === "exigencia") map[chave].emExigencia++;
      else if (p.statusAtual !== "aguardando") map[chave].emAndamento++;
    });
    return Object.values(map).filter((t) => t.total > 0);
  }, [filtrados]);

  const [ordemBloq, ordenarBloqPor] = useOrdenacao();
  const [ordemUrg, ordenarUrgPor] = useOrdenacao();
  const bloqueados = useMemo(() => ordenarLista(
    filtrados.map((p) => ({ p, bloqueio: processoBloqueado(p, processos) })).filter((x) => x.bloqueio),
    ordemBloq,
    { assunto: (x) => x.p.assunto, cliente: (x) => x.p.cliente, dep: (x) => x.bloqueio.assunto, statusDep: (x) => statusLabel(x.bloqueio.statusAtual, x.bloqueio.tipo) }
  ), [filtrados, processos, ordemBloq]);

  // Gráfico 1: por cliente OU por unidade (se um cliente estiver selecionado)
  const porClienteOuUnidade = useMemo(() => {
    const agruparPor = filtros.cliente.length === 1 ? "unidade" : "cliente";
    const map = {};
    filtrados.forEach((p) => { map[p[agruparPor]] = (map[p[agruparPor]] || 0) + 1; });
    return { label: agruparPor === "unidade" ? "Processos por unidade" : "Processos por cliente", data: Object.entries(map).map(([k, qtd]) => ({ k, qtd })).sort((a, b) => b.qtd - a.qtd) };
  }, [filtrados, filtros.cliente]);

  // Gráfico 2: por responsável
  const porResponsavel = useMemo(() => {
    return RESPONSAVEIS.map((r) => ({ name: r, value: filtrados.filter((p) => STATUS_CONFIG[p.statusAtual].responsavel === r).length })).filter((r) => r.value > 0);
  }, [filtrados]);
  const RESP_COLOR = { Primers: COLORS.orange, Cliente: COLORS.yellow, Órgão: COLORS.blue, Finalizado: COLORS.green };

  // Gráfico 3: por tipo de serviço (assunto)
  const porAssunto = useMemo(() => {
    const map = {};
    filtrados.forEach((p) => { map[p.assunto] = (map[p.assunto] || 0) + 1; });
    return Object.entries(map).map(([assunto, qtd]) => ({ assunto, qtd })).sort((a, b) => b.qtd - a.qtd).slice(0, 8);
  }, [filtrados]);

  const urgentes = useMemo(() => {
    const base = filtrados.filter((p) => !STATUS_CONFIG[p.statusAtual].final)
      .map((p) => ({ ...p, dr: diasRestantes(p) })).filter((p) => p.dr !== null)
      .sort((a, b) => a.dr - b.dr).slice(0, 6);
    return ordenarLista(base, ordemUrg, { status: (p) => statusLabel(p.statusAtual, p.tipo) });
  }, [filtrados, ordemUrg]);

  return (
    <RascunhoContext.Provider value={rascunho}>
    <div style={{ fontFamily: "'Inter', sans-serif", background: COLORS.bg, minHeight: "100vh", width: "100%", color: COLORS.ice, display: "flex", flexDirection: "column", position: "relative", paddingBottom: rascunho.total > 0 ? 58 : 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: ${COLORS.steel}; opacity: 0.7; }
        .blueprint-bg { background-image: linear-gradient(${COLORS.border} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border} 1px, transparent 1px); background-size: 42px 42px; }
        .nav-item { transition: background .15s, color .15s; cursor: pointer; }
        .row-hover:hover { background: ${COLORS.panelSoft} !important; }
        table { border-collapse: collapse; width: 100%; }
        th { position: sticky; top: 0; background: ${COLORS.panelAlt}; z-index: 1; }
        select option { background: ${COLORS.panel}; }
      `}</style>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      {/* SIDEBAR */}
      <aside style={{ width: 230, background: COLORS.panel, borderRight: `1px solid ${COLORS.border}`, padding: "22px 16px", flexShrink: 0 }}>
        <div style={{ marginBottom: 22 }}>
          {logoBase64 && <img src={logoBase64} alt="Logo" style={{ maxHeight: 80, maxWidth: 190, objectFit: "contain", marginBottom: 8, display: "block" }} />}
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15, color: COLORS.ice, letterSpacing: "0.02em", textTransform: "uppercase" }}>Controle de Processos e Serviços</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div className="nav-item" onClick={() => setClientesOpen((o) => !o)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 7,
            background: isClientes ? COLORS.redDim : "transparent", color: isClientes ? COLORS.red : COLORS.steelLight,
            fontSize: 13.5, fontWeight: isClientes ? 700 : 500,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Building2 size={16} />Clientes</span>
            {clientesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {clientesOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: 14, marginBottom: 4 }}>
              {[
                { id: "clientes", label: "Clientes", icon: Building2 },
                { id: "unidades", label: "Unidades de clientes", icon: FileStack },
                { id: "contratos", label: "Serviços contratados", icon: FileSignature },
                ...(isAdmin ? [{ id: "importar-contratos", label: "Importar novos clientes/serviços", icon: Upload }] : []),
              ].map((item) => (
                <div key={item.id} className="nav-item" onClick={() => setTab(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7,
                  background: tab === item.id ? COLORS.redDim : "transparent", color: tab === item.id ? COLORS.red : COLORS.steel,
                  fontSize: 12.5, fontWeight: tab === item.id ? 700 : 500, borderLeft: `2px solid ${tab === item.id ? COLORS.red : COLORS.border}`,
                }}><item.icon size={13} />{item.label}</div>
              ))}
            </div>
          )}

          <div className="nav-item" onClick={() => setDashboardOpen((o) => !o)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", borderRadius: 7,
            background: isDashboard ? COLORS.redDim : "transparent", color: isDashboard ? COLORS.red : COLORS.steelLight,
            fontSize: 13.5, fontWeight: isDashboard ? 700 : 500,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}><LayoutDashboard size={16} />Dashboard</span>
            {dashboardOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          {dashboardOpen && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginLeft: 14, marginBottom: 4 }}>
              {[
                { id: "dashboard-processos", label: "Processos / Serviços", icon: FileStack },
                { id: "dashboard-servicos", label: "Planejamento de Serviços", icon: Layers },
              ].map((item) => (
                <div key={item.id} className="nav-item" onClick={() => setTab(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", borderRadius: 7,
                  background: tab === item.id ? COLORS.redDim : "transparent", color: tab === item.id ? COLORS.red : COLORS.steel,
                  fontSize: 12.5, fontWeight: tab === item.id ? 700 : 500, borderLeft: `2px solid ${tab === item.id ? COLORS.red : COLORS.border}`,
                }}><item.icon size={13} />{item.label}</div>
              ))}
            </div>
          )}
          {[
            { id: "processos", label: "Controle de Processos e Serviços", icon: ListChecks },
            { id: "atualizacoes", label: "Relatório de Status", icon: History },
            ...(isAdmin ? [
              { id: "treinamentos", label: "Treinamentos e Comissões", icon: ClipboardCheck },
              { id: "ranking", label: "Ranking de Técnicos", icon: Timer },
              { id: "acessos", label: "Área do Administrador", icon: Users },
            ] : []),
          ].map((item) => (
            <div key={item.id} className="nav-item" onClick={() => setTab(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 7,
              background: tab === item.id ? COLORS.redDim : "transparent", color: tab === item.id ? COLORS.red : COLORS.steelLight,
              fontSize: 13.5, fontWeight: tab === item.id ? 700 : 500,
            }}><item.icon size={16} />{item.label}</div>
          ))}
        </nav>
        <div style={{ marginTop: 32, padding: "12px 12px", background: COLORS.panelAlt, borderRadius: 8, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ fontSize: 12.5, color: COLORS.ice, fontWeight: 700 }}>{usuarioLogado.nome}</div>
            <div style={{ fontSize: 10.5, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.04em" }}>{isAdmin ? "Administrador" : "Operacional"}</div>
          </div>
          <button onClick={onLogout} title="Sair" style={{ background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <LogOut size={13} color={COLORS.steel} />
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="blueprint-bg" style={{ flex: 1, minWidth: 0, padding: "22px 28px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 600, color: COLORS.ice, textTransform: "uppercase", letterSpacing: "0.02em" }}>
              {tab === "dashboard-processos" && "Dashboard · Processos / Serviços"}
              {tab === "dashboard-servicos" && "Dashboard · Planejamento de Serviços"}
              {tab === "clientes" && "Clientes"}
              {tab === "unidades" && "Unidades de clientes"}
              {tab === "contratos" && "Serviços contratados"}
              {tab === "importar-contratos" && "Importar novos clientes/serviços"}
              {tab === "processos" && "Controle de Processos e Serviços"}
              {tab === "atualizacoes" && "Relatório de Status"}
              {tab === "acessos" && "Área do Administrador"}
              {tab === "treinamentos" && "Treinamentos e Comissões"}
              {tab === "ranking" && "Ranking de Técnicos"}
            </h1>
            <p style={{ fontSize: 12.5, color: COLORS.steel, marginTop: 2 }}>
              {tab === "dashboard-processos" && `${total} de ${processos.length} processos totais no filtro atual`}
              {tab === "dashboard-servicos" && "Quantidade de serviços e tarefas: panorama do ano lado a lado com o mês selecionado"}
              {tab === "clientes" && "Clientes reconhecidos a partir dos serviços importados"}
              {tab === "unidades" && "Unidades reconhecidas a partir dos serviços importados"}
              {tab === "contratos" && `${contratos.length} tarefa(s) de serviço cadastrada(s)`}
              {tab === "importar-contratos" && "Envie a planilha para atualizar clientes, unidades e serviços (valores são ignorados)"}
              {tab === "processos" && `${buscados.length} de ${processos.length} processo(s)`}
              {tab === "atualizacoes" && "Ocorrências marcadas para aparecer no relatório, registradas em Controle de Processos e Serviços"}
              {tab === "acessos" && "Gerenciar acessos, personalizar o logo e as cores do sistema"}
              {tab === "treinamentos" && "Cadastre eventos e marque a presença de cada técnico"}
              {tab === "ranking" && "Metas, retrabalho e participação em treinamentos, por técnico e por mês"}
            </p>
          </div>
          {(tab === "processos" || tab === "dashboard-processos") && (
            <div style={{ display: "flex", gap: 10 }}>
              {tab === "processos" && (
                <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: COLORS.red, border: "none", color: "#fff", borderRadius: 7, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em", textTransform: "uppercase" }}>
                  <Plus size={15} /> Novo processo
                </button>
              )}
            </div>
          )}
        </div>

        {(tab === "dashboard-processos" || tab === "processos") && <FilterBar processos={processos} filtros={filtros} setFiltros={setFiltros} codigosUnidade={codigosUnidade} />}

        {tab === "dashboard-processos" && (
          <>
            <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
              <KpiCard icon={FileStack} label="Total (filtro atual)" value={total} accent={COLORS.blue} sub={`${processos.length} no total geral`} />
              <KpiCard icon={Clock} label={`Com a ${NOME_RESPONSAVEL}`} value={comPrimers} accent={COLORS.orange} sub="nossa responsabilidade" />
              <KpiCard icon={Timer} label="Com o cliente" value={comCliente} accent={COLORS.yellow} sub="aguardando retorno" />
              <KpiCard icon={Building2} label="Com o órgão" value={comOrgao} accent={COLORS.blue} sub="aguardando análise" />
              <KpiCard icon={AlertTriangle} label="Vencidos" value={vencidos} accent={COLORS.red} sub="prazo já expirado" />
            </div>
            <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <KpiCard icon={ListChecks} label="Processo" value={administrativos} accent={COLORS.steelLight} sub="processos administrativos" />
              <KpiCard icon={Wrench} label="Serviço Técnico" value={tecnicos} accent={COLORS.steelLight} sub="serviços técnicos" />
              <KpiCard icon={Clock} label="Aguardando início" value={aguardandoInicio} accent={COLORS.steel} sub="importados, ainda não iniciados" />
              <KpiCard icon={Search} label="Em análise" value={emAnalise} accent={COLORS.blue} sub="protocolado / aguardando órgão" />
              <KpiCard icon={AlertTriangle} label="Em exigência" value={emExigencia} accent={COLORS.orange} sub={`${NOME_RESPONSAVEL} ou cliente`} />
              <KpiCard icon={CheckCircle2} label="Concluídos / Deferidos" value={concluidos} accent={COLORS.green} sub="finalizados com sucesso" />
              <KpiCard icon={XCircle} label="Indeferidos" value={indeferidos} accent={COLORS.overdue} sub="negados pelo órgão" />
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>Por técnico</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {porTecnico.map((t) => (
                  <div key={t.tecnico} style={{ flex: "1 1 200px", background: COLORS.panelAlt, borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ice, marginBottom: 8 }}>{t.tecnico}</div>
                    <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                      <div><div style={{ color: COLORS.steel, fontSize: 10 }}>Total</div><div style={{ color: COLORS.ice, fontWeight: 700, fontSize: 16 }}>{t.total}</div></div>
                      <div><div style={{ color: COLORS.steel, fontSize: 10 }}>Em andamento</div><div style={{ color: COLORS.blue, fontWeight: 700, fontSize: 16 }}>{t.emAndamento}</div></div>
                      <div><div style={{ color: COLORS.steel, fontSize: 10 }}>Exigência</div><div style={{ color: COLORS.orange, fontWeight: 700, fontSize: 16 }}>{t.emExigencia}</div></div>
                      <div><div style={{ color: COLORS.steel, fontSize: 10 }}>Concluídos</div><div style={{ color: COLORS.green, fontWeight: 700, fontSize: 16 }}>{t.concluidos}</div></div>
                    </div>
                  </div>
                ))}
                {porTecnico.length === 0 && <div style={{ fontSize: 12, color: COLORS.steel }}>Nenhum processo com técnico indicado no filtro atual.</div>}
              </div>
            </div>

            <AgendaSemanal processos={filtrados} agendaItens={agendaItens} onOpenProcesso={(p) => setSelected(p)} onAddItem={addAgendaItem} onRemoveItem={removeAgendaItem} />

            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 380px", background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>{porClienteOuUnidade.label}</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={porClienteOuUnidade.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: COLORS.steel, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="k" width={140} tick={{ fill: COLORS.steelLight, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                    <Tooltip contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} labelStyle={{ color: COLORS.ice }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="qtd" fill={COLORS.red} radius={[0, 3, 3, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: "1 1 260px", background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>Por responsabilidade</div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={porResponsavel} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={3}>
                      {porResponsavel.map((entry, i) => <Cell key={i} fill={RESP_COLOR[entry.name]} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, rotuloResponsavel(name)]} contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} />
                    <Legend formatter={(value) => rotuloResponsavel(value)} wrapperStyle={{ fontSize: 11, color: COLORS.steelLight }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: 14 }}>Por tipo de serviço</div>
              <ResponsiveContainer width="100%" height={Math.max(160, porAssunto.length * 34)}>
                <BarChart data={porAssunto} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill: COLORS.steel, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="assunto" width={260} tick={{ fill: COLORS.steelLight, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                  <Tooltip contentStyle={{ background: COLORS.panelAlt, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12 }} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="qtd" fill={COLORS.blue} radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {bloqueados.length > 0 && (
              <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "6px 0 4px", marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, padding: "12px 18px 10px", display: "flex", alignItems: "center", gap: 7 }}>
                  <Lock size={13} /> Bloqueados por dependência de outro processo
                </div>
                <table>
                  <thead><tr>
                    <Th campo="assunto" ordem={ordemBloq} ordenarPor={ordenarBloqPor} style={{ padding: "8px 18px" }}>Processo</Th>
                    <Th campo="cliente" ordem={ordemBloq} ordenarPor={ordenarBloqPor} style={{ padding: "8px 18px" }}>Cliente</Th>
                    <Th campo="dep" ordem={ordemBloq} ordenarPor={ordenarBloqPor} style={{ padding: "8px 18px" }}>Depende da conclusão de</Th>
                    <Th campo="statusDep" ordem={ordemBloq} ordenarPor={ordenarBloqPor} style={{ padding: "8px 18px" }}>Status da dependência</Th>
                  </tr></thead>
                  <tbody>
                    {bloqueados.map(({ p, bloqueio }) => {
                      const stB = STATUS_CONFIG[bloqueio.statusAtual];
                      return (
                        <tr key={p.id} className="row-hover" style={{ cursor: "pointer" }} onClick={() => setSelected(p)}>
                          <td style={{ padding: "10px 18px", fontSize: 13, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}` }}>{p.assunto}</td>
                          <td style={{ padding: "10px 18px", fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}>{p.cliente}</td>
                          <td style={{ padding: "10px 18px", fontSize: 13, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}` }}>{bloqueio.assunto}</td>
                          <td style={{ padding: "10px 18px", borderBottom: `1px solid ${COLORS.border}` }}><Pill fg={stB.fg} bg={stB.bg}>{statusLabel(bloqueio.statusAtual, bloqueio.tipo)}</Pill></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "6px 0 4px" }}>
              <div style={{ fontSize: 12, color: COLORS.steel, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, padding: "12px 18px 10px" }}>Mais urgentes</div>
              <table>
                <thead><tr>
                  <Th campo="cliente" ordem={ordemUrg} ordenarPor={ordenarUrgPor} style={{ padding: "8px 18px" }}>Cliente</Th>
                  <Th campo="assunto" ordem={ordemUrg} ordenarPor={ordenarUrgPor} style={{ padding: "8px 18px" }}>Assunto</Th>
                  <Th campo="status" ordem={ordemUrg} ordenarPor={ordenarUrgPor} style={{ padding: "8px 18px" }}>Status</Th>
                  <Th campo="dr" ordem={ordemUrg} ordenarPor={ordenarUrgPor} style={{ padding: "8px 18px" }}>Prazo</Th>
                  <Th campo="tecnico" ordem={ordemUrg} ordenarPor={ordenarUrgPor} style={{ padding: "8px 18px" }}>Técnico</Th>
                </tr></thead>
                <tbody>
                  {urgentes.map((p) => {
                    const st = STATUS_CONFIG[p.statusAtual]; const prazo = prazoInfo(p.dr);
                    return (
                      <tr key={p.id} className="row-hover" style={{ cursor: "pointer" }} onClick={() => setSelected(p)}>
                        <td style={{ padding: "10px 18px", fontSize: 13, borderBottom: `1px solid ${COLORS.border}` }}>{p.cliente}</td>
                        <td style={{ padding: "10px 18px", fontSize: 13, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}` }}>{p.assunto}</td>
                        <td style={{ padding: "10px 18px", borderBottom: `1px solid ${COLORS.border}` }}><Pill fg={st.fg} bg={st.bg}>{statusLabel(p.statusAtual, p.tipo)}</Pill></td>
                        <td style={{ padding: "10px 18px", borderBottom: `1px solid ${COLORS.border}` }}><Pill fg={prazo.fg} bg={prazo.bg}>{prazo.label}</Pill></td>
                        <td style={{ padding: "10px 18px", fontSize: 13, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}` }}>{p.tecnico || "—"}</td>
                      </tr>
                    );
                  })}
                  {urgentes.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum processo com prazo em aberto.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "dashboard-servicos" && <PlanejamentoServicosPage contratos={contratos} onOpenContrato={abrirPopupContrato} />}

        {tab === "processos" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 16, maxWidth: 420 }}>
              <Search size={14} color={COLORS.steel} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente, unidade, código, assunto ou nº do processo..."
                style={{ background: "transparent", border: "none", outline: "none", color: COLORS.ice, fontSize: 13, width: "100%" }} />
            </div>
            {isAdmin && <BarraSelecaoExclusao contagem={processosSelecionados.size} rotulo="processo(s)" onLimpar={() => setProcessosSelecionados(new Set())} onExcluir={() => setConfirmExcluirProcessos(true)} />}
            <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead><tr>{[isAdmin ? <input key="all" type="checkbox"
                    checked={paginate(buscados, processosPage, processosPageSize).length > 0 && paginate(buscados, processosPage, processosPageSize).every((p) => processosSelecionados.has(p.id))}
                    onChange={() => setProcessosSelecionados((s) => {
                      const pagina = paginate(buscados, processosPage, processosPageSize);
                      const todos = pagina.length > 0 && pagina.every((p) => s.has(p.id));
                      const n = new Set(s);
                      if (todos) pagina.forEach((p) => n.delete(p.id)); else pagina.forEach((p) => n.add(p.id));
                      return n;
                    })} /> : ""].map((h, i) => <Th key={i} ordem={ordemProc} ordenarPor={ordenarProcPor}>{h}</Th>)}
                    <Th campo="cliente" ordem={ordemProc} ordenarPor={ordenarProcPor}>Cliente</Th>
                    <Th campo="codigoUnidade" ordem={ordemProc} ordenarPor={ordenarProcPor}>Cód. unidade</Th>
                    <Th campo="unidade" ordem={ordemProc} ordenarPor={ordenarProcPor}>Unidade</Th>
                    <Th campo="assunto" ordem={ordemProc} ordenarPor={ordenarProcPor}>Assunto</Th>
                    <Th campo="tipo" ordem={ordemProc} ordenarPor={ordenarProcPor}>Tipo</Th>
                    <Th campo="tecnico" ordem={ordemProc} ordenarPor={ordenarProcPor}>Técnico</Th>
                    <Th campo="numero" ordem={ordemProc} ordenarPor={ordenarProcPor}>Nº processo</Th>
                    <Th campo="status" ordem={ordemProc} ordenarPor={ordenarProcPor}>Status</Th>
                    <Th campo="dataProtocolo" ordem={ordemProc} ordenarPor={ordenarProcPor}>Protocolo</Th>
                    <Th campo="dataPrevisaoOrgao" ordem={ordemProc} ordenarPor={ordenarProcPor}>Previsão órgão</Th>
                    <Th campo="prazo" ordem={ordemProc} ordenarPor={ordenarProcPor}>Prazo</Th>
                    <Th campo="atualizacao" ordem={ordemProc} ordenarPor={ordenarProcPor}>Atualização</Th>
                    <Th ordem={ordemProc} ordenarPor={ordenarProcPor}>{""}</Th>
                  </tr></thead>
                  <tbody>
                    {paginate(buscados, processosPage, processosPageSize).map((p) => {
                      const st = STATUS_CONFIG[p.statusAtual]; const dr = diasRestantes(p); const prazo = prazoInfo(dr); const ds = diasSemAtualizacao(p);
                      const bloqueio = processoBloqueado(p, processos);
                      const aguardandoInicioRow = p.statusAtual === "aguardando";
                      return (
                        <tr key={p.id} className="row-hover" style={{ cursor: "pointer" }} onClick={() => setSelected(p)}>
                          {isAdmin && <td style={{ padding: "11px 16px", borderBottom: `1px solid ${COLORS.border}` }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={processosSelecionados.has(p.id)} onChange={() => setProcessosSelecionados((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                          </td>}
                          <td style={{ padding: "11px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.ice, display: "flex", alignItems: "center", gap: 6 }}><Building2 size={12} color={COLORS.steel} />{p.cliente}</div>
                          </td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}`, fontFamily: "monospace" }}>{codigosUnidade[`${p.cliente}|${p.unidade}`] || "—"}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12.5, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}` }}>{p.unidade}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12.5, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}`, maxWidth: 220 }}>
                            {p.assunto}{bloqueio && <Lock size={11} color={COLORS.red} style={{ marginLeft: 6, verticalAlign: "middle" }} />}
                          </td>
                          <td style={{ padding: "11px 16px", fontSize: 11.5, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" }}>{p.tipo}</td>
                          <td style={{ padding: "11px 16px", fontSize: 11.5, color: COLORS.steelLight, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" }}>{p.tecnico}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}`, fontFamily: "monospace" }}>{p.numero}</td>
                          <td style={{ padding: "11px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Pill fg={st.fg} bg={st.bg} stamp>{statusLabel(p.statusAtual, p.tipo)}</Pill>
                              {aguardandoInicioRow && <span title="Lembrete: iniciar serviço" style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.red, display: "inline-block" }} />}
                            </div>
                          </td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}` }}>{fmtDate(p.dataProtocolo)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: COLORS.steel, borderBottom: `1px solid ${COLORS.border}` }}>{fmtDate(p.dataPrevisaoOrgao)}</td>
                          <td style={{ padding: "11px 16px", borderBottom: `1px solid ${COLORS.border}` }}><Pill fg={prazo.fg} bg={prazo.bg}>{prazo.label}</Pill></td>
                          <td style={{ padding: "11px 16px", fontSize: 12, borderBottom: `1px solid ${COLORS.border}`, color: ds !== null && ds > 15 ? COLORS.red : COLORS.steel }}>{ds !== null ? `há ${ds}d` : "—"}</td>
                          <td style={{ padding: "11px 16px", borderBottom: `1px solid ${COLORS.border}` }}><ChevronRight size={15} color={COLORS.steel} /></td>
                        </tr>
                      );
                    })}
                    {buscados.length === 0 && <tr><td colSpan={14} style={{ padding: 30, textAlign: "center", color: COLORS.steel, fontSize: 13 }}>Nenhum processo encontrado com esses filtros.</td></tr>}
                  </tbody>
                </table>
              </div>
              <Pagination page={processosPage} setPage={setProcessosPage} pageSize={processosPageSize} setPageSize={setProcessosPageSize} totalItems={buscados.length} />
            </div>
            {confirmExcluirProcessos && (
              <ConfirmarExclusaoModal titulo="Excluir processos" onCancelar={() => setConfirmExcluirProcessos(false)}
                mensagem={`Excluir ${processosSelecionados.size} processo(s) selecionado(s) do Controle de Processos? Isso não remove o(s) serviço(s) correspondente(s) em Serviços contratados. Esta ação não pode ser desfeita.`}
                onConfirmar={() => { excluirProcessosSelecionados(processos.filter((p) => processosSelecionados.has(p.id))); setProcessosSelecionados(new Set()); setConfirmExcluirProcessos(false); }} />
            )}
          </>
        )}

        {tab === "clientes" && <ClientesPage contratos={contratos} onAddContrato={(row) => addContratoManual(row, false)} isAdmin={isAdmin} onOpenCliente={abrirPopupCliente} onExcluirClientes={excluirClientes} />}
        {tab === "unidades" && <UnidadesPage contratos={contratos} onAddContrato={(row) => addContratoManual(row, false)} onOpenUnidade={abrirPopupUnidade} isAdmin={isAdmin} onExcluirUnidades={excluirUnidades} />}
        {tab === "contratos" && <ServicosContratadosPage contratos={contratos} processos={processos} onAddContrato={(row) => addContratoManual(row, true)} onExcluirContratos={excluirContratosEmCascata} isAdmin={isAdmin} onOpenContrato={abrirPopupContrato} onOpenServico={abrirPopupServico} edits={rascunhoContratos} onEdit={editarContratoRascunho} />}
        {tab === "importar-contratos" && isAdmin && <ImportarClientesContratosPage onImport={importarContratosPersistindo} />}

        {tab === "atualizacoes" && <AtualizacoesPage processos={processos} onOpenProcesso={(p) => setSelected(p)} codigosUnidade={codigosUnidade} />}
        {tab === "acessos" && isAdmin && <GerenciarAcessosPage usuarioLogado={usuarioLogado} logoBase64={logoBase64} onLogoAtualizado={onLogoAtualizado} />}
        {tab === "treinamentos" && isAdmin && <TreinamentosPage eventos={eventos} onAddEvento={addEvento} onExcluirEventos={excluirEventos} edits={rascunhoEventos} onEdit={editarEventoRascunho} />}
        {tab === "ranking" && isAdmin && <RankingTecnicosPage contratos={contratos} processos={processos} eventos={eventos} />}
      </main>
      </div>

      <footer style={{ borderTop: `1px solid ${COLORS.border}`, background: COLORS.panel, padding: "10px 28px", textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: COLORS.steelLight, fontWeight: 600 }}>Supervisor - {NOME_RESPONSAVEL}</div>
        <div style={{ fontSize: 10.5, color: COLORS.steel, marginTop: 2, letterSpacing: "0.03em" }}>Controle de Processos e Serviços</div>
      </footer>

      {selected && (() => {
        const base = processos.find((p) => p.id === selected.id) || selected;
        const atual = rascunhoProcessos[selected.id] || base;
        return (
          <DetailModal
            processo={atual}
            processos={processos}
            contratos={contratos}
            codigoUnidade={codigoDaUnidade(atual.cliente, atual.unidade)}
            onClose={() => setSelected(null)}
            onUpdate={editarProcessoRascunho}
            onOpenProcesso={(p) => setSelected(p)}
            pendentes={pendentesDoProcesso(selected.id)}
            onSalvar={() => salvarProcessoRascunho(selected.id)}
            onDescartar={() => descartarProcessoRascunho(selected.id)}
            salvando={rascunho.salvando}
          />
        );
      })()}

      {popupAtual?.type === "cliente" && (
        <ClienteUnidadesModal cliente={popupAtual.cliente} contratos={contratos} idsUnidades={computarIdsUnidades(contratos)}
          onClose={fecharPopups} onOpenUnidade={(u) => abrirPopupUnidade(popupAtual.cliente, u)} />
      )}
      {popupAtual?.type === "unidade" && (
        <UnidadeContratosModal cliente={popupAtual.cliente} unidade={popupAtual.unidade} contratos={contratos}
          onClose={fecharPopups} onBack={popupStack.length > 1 ? voltarPopup : null}
          onOpenContrato={(p) => abrirPopupContrato(popupAtual.cliente, popupAtual.unidade, p)} />
      )}
      {popupAtual?.type === "contrato" && (
        <ContratoDetalheCompletoModal proposta={popupAtual.proposta} cliente={popupAtual.cliente} unidade={popupAtual.unidade}
          contratos={contratos} processos={processos} onDeleteContrato={deleteContrato} onExcluirContratos={excluirContratosEmCascata}
          onAddContrato={(row) => addContratoManual(row, true)}
          clientesExistentes={Array.from(new Set(contratos.map((c) => c.cliente))).sort()}
          edits={rascunhoContratos} onEdit={editarContratoRascunho}
          codigoUnidade={codigoDaUnidade(popupAtual.cliente, popupAtual.unidade)}
          onClose={fecharPopups} onBack={popupStack.length > 1 ? voltarPopup : null} />
      )}
      {popupAtual?.type === "servico" && (
        <ServicoUnicoModal proposta={popupAtual.proposta} cliente={popupAtual.cliente} unidade={popupAtual.unidade} servico={popupAtual.servico}
          contratos={contratos} processos={processos} onDeleteContrato={deleteContrato} onExcluirContratos={excluirContratosEmCascata}
          onAddContrato={(row) => addContratoManual(row, true)}
          clientesExistentes={Array.from(new Set(contratos.map((c) => c.cliente))).sort()}
          edits={rascunhoContratos} onEdit={editarContratoRascunho}
          codigoUnidade={codigoDaUnidade(popupAtual.cliente, popupAtual.unidade)}
          onClose={fecharPopups} onBack={popupStack.length > 1 ? voltarPopup : null} />
      )}
      {showNew && <NewProcessModal processos={processos} onClose={() => setShowNew(false)} onSave={async (p) => {
        const { id, ...campos } = processoToRow(p);
        const { data } = await supabase.from("processos").insert(campos).select().single();
        setProcessos((prev) => [data ? rowToProcesso(data) : p, ...prev]);
      }} isAdmin={isAdmin} />}
      <BarraRascunhoGlobal />
    </div>
    </RascunhoContext.Provider>
  );
}

/* ============================================================
   APP — controla a autenticação (protótipo de testes internos)
   ============================================================ */
export default function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [logoBase64, setLogoBase64] = useState(null);
  const [, forcarAtualizacaoTema] = useState(0);

  useEffect(() => {
    if (!SUPABASE_CONFIGURADO) return;
    supabase.from("configuracoes").select("*").eq("id", 1).single().then(({ data }) => {
      if (data) {
        aplicarTema(data);
        setLogoBase64(data.logo_base64 || null);
        forcarAtualizacaoTema((v) => v + 1);
      }
    });
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURADO) { setVerificandoSessao(false); return; }
    let ativo = true;
    async function carregarPerfilDaSessao(userId) {
      const { data: perfil } = await supabase.from("profiles").select("id, usuario, nome, role").eq("id", userId).single();
      if (ativo) setUsuarioLogado(perfil || null);
    }
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) carregarPerfilDaSessao(data.session.user.id);
      if (ativo) setVerificandoSessao(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) { setUsuarioLogado(null); return; }
      carregarPerfilDaSessao(session.user.id);
    });
    return () => { ativo = false; listener.subscription.unsubscribe(); };
  }, []);

  const sair = async () => { await supabase.auth.signOut(); setUsuarioLogado(null); };
  const atualizarLogo = (novoLogo) => { LOGO_BASE64 = novoLogo; setLogoBase64(novoLogo); };

  if (verificandoSessao) {
    return <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.steel, fontFamily: "'Inter', sans-serif", fontSize: 13 }}>Carregando...</div>;
  }
  if (!usuarioLogado) return <LoginScreen onLogin={setUsuarioLogado} logoBase64={logoBase64} />;
  return <ControleProcessos usuarioLogado={usuarioLogado} onLogout={sair} logoBase64={logoBase64} onLogoAtualizado={atualizarLogo} />;
}
