// Gera docs/slides/ESCOPO_E_ATIVIDADES.pptx a partir da estrutura do docs/ESCOPO_E_ATIVIDADES.md.
// Foco: o aluno opera o gerador de carga, faz 3 repetições de A, coleta, destrói A, sobe B, faz 3 repetições de B,
// coleta, e usa analisar.py + gerar_planilha.py. Uso: node ESCOPO_E_ATIVIDADES_build.js [saida.pptx]
const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/Users/emadruga/.claude/skills/synced/3f5d83c0-3bb0-4d93-b615-b8ef3be279d1_3ba42faf-0040-41c3-bc36-163639119ffc/pptx/scripts/apply_theme.js");

const OUT = process.argv[2] || "ESCOPO_E_ATIVIDADES.pptx";
const HEX = { ink: "1B2635", orange: "E8820C", teal: "137C77", light: "F3F5F7", white: "FFFFFF", gray: "5B6573", line: "D5DAE0", tealLight: "E3F2F1", orangeLight: "FDF0E1" };
const THEME = {
  name: "Projeto Nuvem 2026",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: { dk1: HEX.ink, lt1: HEX.white, dk2: HEX.gray, lt2: HEX.light, accent1: HEX.orange, accent2: HEX.teal, accent3: HEX.tealLight, accent4: HEX.orangeLight, accent5: HEX.line, accent6: "2B6CB0", hlink: HEX.teal, folHlink: HEX.gray },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.title = "Projeto Nuvem 2026 — O teste de carga, passo a passo";
pres.author = "Cloud Systems Architecture";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "CAPA",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.3, w: 8.8, h: 1.7, fontSize: 38, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.2, w: 8.8, h: 1.6, fontSize: 17, color: C.background2, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTEUDO",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 28, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Projeto Nuvem 2026 · Escopo e atividades", options: { x: 0.5, y: 5.22, w: 6, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" },
});

// ---------- utilidades ----------
let n = 0;
const nm = (p) => `${p}-${++n}`;
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, fontSize: 15, color: C.text1, margin: 0, valign: "top", objectName: nm("txt") }, o));
const box = (s, o) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ rectRadius: 0.08, line: { color: HEX.line, width: 0.75 }, fill: { color: C.background2 }, objectName: nm("card") }, o));
const circ = (s, x, y, d, label, fill, fs) => s.addText(label, { isTextBox: true, shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill || C.accent1 }, color: C.background1, bold: true, fontSize: fs || 16, align: "center", valign: "middle", margin: 0, objectName: nm("num") });
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: Object.assign({ bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 }, o) }));
const HD = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
const tabela = (s, rows, o) => s.addTable(rows, Object.assign({ color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, valign: "middle", margin: [0, 0.06, 0, 0.06], objectName: nm("tabela") }, o));
function node(s, x, y, w, h, label, fill, o) {
  s.addText(label, Object.assign({ isTextBox: true, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y, w, h, fill: { color: fill }, color: C.background1, bold: true, fontSize: 13, align: "center", valign: "middle", margin: 0.04, objectName: nm("node") }, o));
}
function arrow(s, x1, y1, x2, y2, color, width) {
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipV: (y2 < y1) !== (x2 < x1), flipH: x2 < x1, line: { color: color || HEX.gray, width: width || 1.5, endArrowType: "triangle" }, objectName: nm("seta") });
}
// caixa escura com código (Courier New)
function code(s, x, y, w, h, titulo, texto, fs) {
  box(s, { x, y, w, h, fill: { color: C.text1 }, line: { color: HEX.ink } });
  let top = y + 0.12;
  if (titulo) { T(s, titulo, { x: x + 0.18, y: top, w: w - 0.36, h: 0.3, fontSize: 12, bold: true, color: C.accent1 }); top += 0.36; }
  T(s, texto, { x: x + 0.18, y: top, w: w - 0.36, h: y + h - top - 0.1, fontSize: fs || 11, fontFace: "Courier New", color: C.background1 });
}
function add(sec, title) {
  const s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: sec });
  s.addText(title, { placeholder: "title" });
  return s;
}
// lista numerada à esquerda, com caixa lateral opcional
function stepSlide(sec, title, steps, side, notes) {
  const s = add(sec, title);
  const h = Math.min(0.6, 3.75 / steps.length);
  steps.forEach((t, i) => {
    const y = 1.25 + i * h;
    circ(s, 0.5, y + (h - 0.36) / 2, 0.36, String(i + 1), C.accent2, 14);
    T(s, t, { x: 1.0, y, w: side ? 5.2 : 8.5, h, fontSize: 14, valign: "middle" });
  });
  if (side) {
    box(s, { x: 6.5, y: 1.25, w: 3.0, h: 3.75, fill: { color: side[2] ? C.accent3 : C.accent4 }, line: { color: side[2] ? HEX.tealLight : HEX.orangeLight } });
    T(s, side[0], { x: 6.7, y: 1.4, w: 2.6, h: 0.4, fontSize: 16, bold: true, color: side[2] ? C.accent2 : C.accent1 });
    T(s, side[1], { x: 6.7, y: 1.9, w: 2.6, h: 3.0, fontSize: 13 });
  }
  s.addNotes(notes);
  return s;
}

// =====================================================================================
// ABERTURA
// =====================================================================================
pres.addSection({ title: "Abertura" });
let s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Abertura" });
s.addText("Projeto Nuvem 2026: o teste de carga, passo a passo", { placeholder: "title" });
s.addText("Cloud Systems Architecture · AWS Academy Learner Lab\nChatbot Gemma 2 em duas arquiteturas AWS: A (monolito) × B (ALB + 2 EC2)", { placeholder: "body" });
s.addNotes("Esta apresentação segue o docs/ESCOPO_E_ATIVIDADES.md. O foco é o trabalho do aluno: operar o gerador de carga, fazer 3 repetições em A e em B, coletar os resultados e gerar a planilha final. Os comandos completos estão no QUICKSTART.md.");

// ---------- A pergunta ----------
s = add("Abertura", "A pergunta que você vai responder");
box(s, { x: 0.5, y: 1.3, w: 9.0, h: 1.35, fill: { color: C.text1 }, line: { color: HEX.ink } });
T(s, "Qual arquitetura entrega o menor tempo de resposta ao usuário final, de forma mais consistente?", { x: 0.8, y: 1.42, w: 8.4, h: 1.1, fontSize: 22, bold: true, color: C.background1, valign: "middle", fontFace: "Cambria" });
[["Rápida", "tempo de resposta típico (p50) e pior caso razoável (p95)"], ["Consistente", "pouca variação entre respostas (desvio, CV, p95 perto do p50)"], ["Com dados", "medidos por você, com o mesmo teste em A e em B"]].forEach(([h, d], i) => {
  const x = 0.5 + i * 3.1;
  box(s, { x, y: 3.0, w: 2.8, h: 1.9 });
  circ(s, x + 0.2, 3.2, 0.5, String(i + 1), i === 2 ? C.accent2 : C.accent1);
  T(s, h, { x: x + 0.85, y: 3.25, w: 1.8, h: 0.4, fontSize: 17, bold: true, valign: "middle" });
  T(s, d, { x: x + 0.2, y: 3.85, w: 2.4, h: 0.95, fontSize: 14, color: C.text2 });
});
s.addNotes("Não é um projeto de programação nem de IA: é uma decisão de arquitetura baseada em dados. O projeto é individual: cada aluno usa o próprio Learner Lab, e todos os recursos levam o nome do aluno como prefixo (ex.: maria-silva-web-1).");

// ---------- Arquiteturas ----------
s = add("Abertura", "As duas arquiteturas comparadas");
T(s, "A — Monolito", { x: 0.5, y: 1.25, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
node(s, 0.5, 1.85, 1.3, 0.6, "Usuário", C.text2);
arrow(s, 1.8, 2.15, 2.6, 2.15);
node(s, 2.6, 1.85, 2.6, 0.6, "1 EC2 (backend + Ollama + Gemma)", C.accent1);
arrow(s, 5.2, 2.15, 6.0, 2.15);
node(s, 6.0, 1.85, 1.3, 0.6, "RDS", C.accent2);
T(s, "B — Balanceada", { x: 0.5, y: 2.85, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
node(s, 0.5, 3.75, 1.3, 0.6, "Usuário", C.text2);
arrow(s, 1.8, 4.05, 2.4, 4.05);
node(s, 2.4, 3.75, 0.9, 0.6, "ALB", C.text1);
arrow(s, 3.3, 3.95, 3.9, 3.6);
arrow(s, 3.3, 4.15, 3.9, 4.5);
node(s, 3.9, 3.3, 2.1, 0.6, "EC2 · us-east-1a", C.accent1);
node(s, 3.9, 4.2, 2.1, 0.6, "EC2 · us-east-1b", C.accent1);
arrow(s, 6.0, 3.6, 6.6, 3.95);
arrow(s, 6.0, 4.5, 6.6, 4.15);
node(s, 6.6, 3.75, 0.9, 0.6, "RDS", C.accent2);
box(s, { x: 7.75, y: 1.25, w: 1.75, h: 3.75, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
T(s, [{ text: "Igual em A e B", options: { bold: true, breakLine: true } }, { text: "mesma app, mesmo m5.large, mesmo RDS, mesmo S3, mesmo teste", options: { fontSize: 13 } }], { x: 7.9, y: 1.4, w: 1.45, h: 3.4, fontSize: 14, color: C.text1, paraSpaceAfter: 6 });
s.addNotes("A diferença entre A e B é só a camada de computação: o ALB e a segunda EC2 em outra zona. O banco e a base de conhecimento ficam na camada base, criada uma vez.");

// ---------- O seu papel ----------
s = add("Abertura", "O seu papel: operar o teste de carga");
box(s, { x: 0.5, y: 1.25, w: 4.3, h: 3.4, fill: { color: C.background2 } });
T(s, "O Terraform entrega pronto", { x: 0.75, y: 1.4, w: 3.9, h: 0.4, fontSize: 17, bold: true, color: C.text2 });
T(s, bullets(["A camada base: RDS, S3, security groups", "As EC2 do chatbot, já com Ollama e Gemma 2 carregados", "Em B, o ALB e o Target Group", "A aplicação (app/) e os scripts (loadtest/)"]), { x: 0.75, y: 1.9, w: 3.85, h: 2.7, fontSize: 14, color: C.text1 });
box(s, { x: 5.2, y: 1.25, w: 4.3, h: 3.4, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
T(s, "Você faz", { x: 5.45, y: 1.4, w: 3.9, h: 0.4, fontSize: 17, bold: true, color: C.accent1 });
T(s, bullets(["Criar e preparar o gerador de carga", "Rodar 3 repetições em A e 3 em B", "Ligar o vmstat no servidor a cada repetição", "Coletar resultados e prints antes de cada destroy", "Gerar a planilha, analisar e concluir"]), { x: 5.45, y: 1.9, w: 3.85, h: 2.7, fontSize: 14, color: C.text1 });
T(s, "Cada sessão de teste tem dois lados: um componente no servidor web (vmstat) e outro no gerador de carga (k6).", { x: 0.5, y: 4.75, w: 9.0, h: 0.4, fontSize: 13, color: C.text2, italic: true });
s.addNotes("O código está pronto e validado. O trabalho do aluno é o de um arquiteto de nuvem: criar a instância do gerador, aprender a montar uma sessão de teste de carga, medir, interpretar e decidir.");

// ---------- O roteiro ----------
s = add("Abertura", "O roteiro do projeto");
{
  const linhas = [
    ["Sessão 1", "4 h no Learner Lab", ["Base + gerador", "Subir A + piloto", "3 repetições de A", "Coletar A", "Destruir A"]],
    ["Sessão 2", "4 h no Learner Lab", ["Religar gerador", "Subir B", "3 repetições de B", "Coletar B", "Destruir B"]],
    ["Em casa", "seu computador", ["analisar.py", "Gerar planilha", "5 gráficos", "Relatório PDF", "Limpeza final"]],
  ];
  linhas.forEach(([rot, sub, passos], r) => {
    const y = 1.3 + r * 1.1;
    T(s, rot, { x: 0.5, y: y + 0.05, w: 1.5, h: 0.4, fontSize: 16, bold: true, color: r < 2 ? C.accent1 : C.accent2 });
    T(s, sub, { x: 0.5, y: y + 0.45, w: 1.5, h: 0.35, fontSize: 11, color: C.text2 });
    passos.forEach((p, i) => {
      const destroy = /^Destruir|Limpeza/.test(p);
      const fill = destroy ? C.text1 : (r < 2 ? C.accent1 : C.accent2);
      s.addText(p, { isTextBox: true, shape: i === 0 ? pres.shapes.PENTAGON : pres.shapes.CHEVRON, x: 2.05 + i * 1.5, y, w: 1.55, h: 0.8, fill: { color: fill }, color: C.background1, bold: true, fontSize: 11, align: "center", valign: "middle", margin: [0, 0.18, 0, 0.18], objectName: nm("etapa") });
    });
  });
  T(s, "Base (RDS, histórico, S3) e gerador sobrevivem entre as sessões; só a camada compute é criada e destruída. A Etapa 0 (preparação do seu computador) vem antes de tudo.", { x: 0.5, y: 4.6, w: 9.0, h: 0.5, fontSize: 13, color: C.text2, italic: true });
}
s.addNotes("Os blocos escuros são os destroy: só acontecem depois da coleta. As sessões 1 e 2 são longas porque o teste de carga leva tempo: reserve até cerca de 40 minutos por repetição.");

// =====================================================================================
// PREPARAÇÃO
// =====================================================================================
pres.addSection({ title: "Preparação" });
s = add("Preparação", "Etapa 0 — Preparar o seu computador");
box(s, { x: 0.5, y: 1.25, w: 4.3, h: 2.65 });
T(s, "Instalar (0.1–0.5)", { x: 0.75, y: 1.38, w: 3.9, h: 0.4, fontSize: 16, bold: true, color: C.accent2 });
T(s, bullets(["Terraform (≥ 1.5)", "AWS CLI v2", "Python 3 + openpyxl", "Cliente SSH (ssh e scp)", "Git"]), { x: 0.75, y: 1.85, w: 3.9, h: 2.0, fontSize: 14 });
box(s, { x: 5.2, y: 1.25, w: 4.3, h: 2.65 });
T(s, "Configurar (0.6–0.9)", { x: 5.45, y: 1.38, w: 3.9, h: 0.4, fontSize: 16, bold: true, color: C.accent2 });
T(s, bullets(["git clone do projeto", "Credenciais do Learner Lab (a cada sessão!)", "labsuser.pem com permissão restrita", "Nos .tfvars: o seu IP /32 e uma seed_password"]), { x: 5.45, y: 1.85, w: 3.9, h: 2.0, fontSize: 14 });
code(s, 0.5, 4.05, 9.0, 0.95, null, "aws sts get-caller-identity      →  \"Arn\": \".../voclabs/user1234567=Maria_Silva\"", 12);
T(s, "Teste final (0.10): o seu nome no Arn vira o prefixo de tudo", { x: 0.68, y: 4.62, w: 8.6, h: 0.3, fontSize: 12, color: C.accent1, bold: true });
s.addNotes("Etapa feita em casa ou em aula, sem gastar sessão do Learner Lab. O passo a passo de cada item, para Linux, Windows 11 e macOS, está na Etapa 0 do ESCOPO_E_ATIVIDADES.md, com a tabela de erros do get-caller-identity. O k6 e o tmux não vão no seu computador: vão no gerador de carga.");

// =====================================================================================
// SESSÃO 1 — ARQUITETURA A
// =====================================================================================
pres.addSection({ title: "Sessão 1 — Arquitetura A" });
stepSlide("Sessão 1 — Arquitetura A", "Sessão 1 — Subir a base e a Arquitetura A", [
  "terraform apply em terraform/base (uma vez no projeto)",
  "Conferir o prefixo: terraform output prefixo",
  "Criar o gerador de carga (próximo slide)",
  "terraform apply -var-file=a.tfvars em compute; esperar 200",
  "Teste de fumaça no navegador (aluno01) e histórico",
  "Piloto com 1 usuário: medir o S",
], ["Antes de medir", "Escreva as suas hipóteses e a tabela de previsão (1, 4 e 16 usuários, A e B) a partir do S. Previsão errada não é problema; dado inventado é.", true],
"Os comandos estão no QUICKSTART, seções 3.1 a 3.5. A previsão precisa ser escrita antes das repetições: ela vale porque não foi ajustada ao resultado.");

// ---------- Gerador ----------
s = add("Sessão 1 — Arquitetura A", "O gerador de carga: a instância que você cria");
tabela(s, [
  [HD("Campo"), HD("Valor")],
  ["Name", "<prefixo>-gerador-carga"],
  ["AMI", "Amazon Linux 2023 (x86)"],
  ["Tipo", "t3.small"],
  ["Key pair", "vockey"],
  ["Rede", "VPC default · us-east-1a · IP público"],
  ["Security group", "<prefixo>-gerador-sg (SSH do My IP)"],
  ["Disco", "8 GiB gp3 (o padrão)"],
], { x: 0.5, y: 1.2, w: 4.6, colW: [1.4, 3.2], fontSize: 12, rowH: 0.42 });
code(s, 5.4, 1.2, 4.1, 2.1, "No seu computador e depois no gerador", "scp -i labsuser.pem -r loadtest \\\n  ec2-user@<IP-GERADOR>:~/\nssh -i labsuser.pem ec2-user@<IP-GERADOR>\nsudo dnf install -y \\\n  https://dl.k6.io/rpm/repo.rpm\nsudo dnf install -y k6 tmux", 10);
box(s, { x: 5.4, y: 3.45, w: 4.1, h: 1.15, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
T(s, [{ text: "tmux: ", options: { bold: true } }, { text: "tmux new -s teste · Ctrl+B, D para sair · tmux attach -t teste para voltar. Se o SSH cair, o teste continua." }], { x: 5.6, y: 3.55, w: 3.7, h: 0.95, fontSize: 12 });
T(s, "Criado à mão no console (como no Módulo 4), não pelo Terraform. Fica de pé entre as sessões: na sessão nova, religue e copie o IP novo.", { x: 0.5, y: 4.7, w: 9.0, h: 0.45, fontSize: 12, color: C.text2, italic: true });
s.addNotes("Detalhes de cada campo: ESCOPO_E_ATIVIDADES.md, seção Gerador de carga, e QUICKSTART 3.2. Não abrir a porta 80 no gerador: ele só faz requisições. Conferir com k6 version e tmux -V.");

// ---------- Mecânica: dois lados ----------
s = add("Sessão 1 — Arquitetura A", "Uma sessão de teste tem dois lados");
{
  // seu computador
  box(s, { x: 0.5, y: 1.25, w: 2.1, h: 3.0 });
  T(s, "Seu computador", { x: 0.6, y: 1.35, w: 1.9, h: 0.35, fontSize: 14, bold: true, align: "center" });
  node(s, 0.7, 1.95, 1.7, 0.55, "Terminal 1", C.text2);
  node(s, 0.7, 3.25, 1.7, 0.55, "Terminal 2", C.text2);
  // gerador
  box(s, { x: 3.3, y: 1.25, w: 2.9, h: 1.55, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
  T(s, "Gerador de carga", { x: 3.4, y: 1.33, w: 2.7, h: 0.3, fontSize: 14, bold: true, color: C.accent1, align: "center" });
  T(s, "você cria pelo console", { x: 3.4, y: 1.62, w: 2.7, h: 0.25, fontSize: 11, color: C.text2, align: "center" });
  node(s, 3.5, 1.95, 2.5, 0.55, "tmux: rodar_cenario.sh (k6)", C.accent1, { fontSize: 12 });
  // servidor
  box(s, { x: 6.9, y: 1.25, w: 2.6, h: 3.0, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
  T(s, "EC2 do chatbot", { x: 7.0, y: 1.33, w: 2.4, h: 0.3, fontSize: 14, bold: true, color: C.accent2, align: "center" });
  T(s, "o Terraform cria, já pronta", { x: 7.0, y: 1.62, w: 2.4, h: 0.25, fontSize: 11, color: C.text2, align: "center" });
  node(s, 7.1, 1.95, 2.2, 0.55, "Ollama + Gemma 2", C.accent2, { fontSize: 12 });
  node(s, 7.1, 3.25, 2.2, 0.55, "tmux: vmstat -t 5", C.accent2, { fontSize: 12 });
  // setas
  arrow(s, 2.4, 2.22, 3.5, 2.22);
  T(s, "ssh", { x: 2.6, y: 1.92, w: 0.7, h: 0.25, fontSize: 11, color: C.text2, align: "center" });
  arrow(s, 6.0, 2.22, 7.1, 2.22, HEX.orange, 3);
  T(s, "perguntas (HTTP)", { x: 5.95, y: 2.35, w: 1.2, h: 0.4, fontSize: 10, color: C.accent1, align: "center", bold: true });
  arrow(s, 2.4, 3.52, 7.1, 3.52);
  T(s, "ssh", { x: 4.4, y: 3.22, w: 0.7, h: 0.25, fontSize: 11, color: C.text2, align: "center" });
  // o que produz
  T(s, [{ text: "Produz: ", options: { bold: true } }, { text: "resultados/A_r1/vus1.csv, vus4.csv, vus16.csv" }], { x: 3.3, y: 2.9, w: 2.9, h: 0.3, fontSize: 11, color: C.text1 });
  T(s, [{ text: "Produz: ", options: { bold: true } }, { text: "cpu_A_r1.txt" }], { x: 7.0, y: 3.88, w: 2.4, h: 0.3, fontSize: 11, color: C.text1 });
  T(s, "O gerador fica fora da arquitetura medida: gerar a carga não disputa CPU com o Gemma. Os dois lados rodam dentro do tmux, para sobreviver a uma queda do SSH.", { x: 0.5, y: 4.45, w: 9.0, h: 0.6, fontSize: 13, color: C.text2, italic: true });
}
s.addNotes("Este é o centro do projeto: aprender a montar uma sessão de teste de carga. Um terminal controla a carga (no gerador), outro observa o servidor (vmstat na EC2 do chatbot). Dica: no Mac ou no Linux, um tmux local com 4 painéis deixa os terminais na mesma tela (Ctrl+B % e Ctrl+B \").");

// ---------- Uma repetição por dentro ----------
s = add("Sessão 1 — Arquitetura A", "O que uma repetição faz");
{
  const blocos = [
    ["Aquecimento", "2 usuários · 30 s\ndescartado", C.text2, 1.7],
    ["Passo 1", "1 usuário\n× 16 perguntas", C.accent1, 2.0],
    ["Passo 2", "4 usuários\n× 4 perguntas", C.accent1, 2.0],
    ["Passo 3", "16 usuários\n× 1 pergunta", C.accent1, 2.0],
  ];
  let x = 0.5;
  blocos.forEach(([h, d, cor, w], i) => {
    if (i > 0) { T(s, "pausa\n30 s", { x, y: 1.55, w: 0.4, h: 0.6, fontSize: 9, color: C.text2, align: "center", valign: "middle" }); x += 0.43; }
    box(s, { x, y: 1.3, w, h: 1.15, fill: { color: cor }, line: { color: HEX.white } });
    T(s, h, { x: x + 0.1, y: 1.38, w: w - 0.2, h: 0.35, fontSize: 15, bold: true, color: C.background1, align: "center" });
    T(s, d, { x: x + 0.1, y: 1.75, w: w - 0.2, h: 0.65, fontSize: 12, color: C.background1, align: "center" });
    if (i > 0) T(s, "16 respostas", { x, y: 2.5, w, h: 0.3, fontSize: 12, bold: true, color: C.accent1, align: "center" });
    x += w;
  });
  const stats = [["16", "respostas por passo, em todos os passos"], ["3", "passos: 1, 4 e 16 usuários simultâneos"], ["~40 min", "reserve por repetição (depende da arquitetura)"], ["3 × 2", "repetições: 3 em A e 3 em B"]];
  stats.forEach(([v, d], i) => {
    const xx = 0.5 + i * 2.3;
    box(s, { x: xx, y: 3.1, w: 2.1, h: 1.55 });
    T(s, v, { x: xx + 0.1, y: 3.2, w: 1.9, h: 0.65, fontSize: 30, bold: true, color: C.accent2, align: "center", valign: "middle", fontFace: "Cambria" });
    T(s, d, { x: xx + 0.15, y: 3.9, w: 1.8, h: 0.7, fontSize: 12, color: C.text2, align: "center" });
  });
  T(s, "Tudo isso é um único comando no gerador: ./rodar_cenario.sh A 1 http://<IP-EC2-A>", { x: 0.5, y: 4.78, w: 9.0, h: 0.35, fontSize: 13, color: C.text1, bold: true });
}
s.addNotes("O n fixo (16 respostas por passo) dá a mesma precisão estatística a todos os passos. A análise junta as 3 repetições: 48 respostas por passo. A pausa entre passos deixa a fila do servidor esvaziar.");

// ---------- A ordem de cada repetição ----------
s = add("Sessão 1 — Arquitetura A", "A ordem de cada repetição (repita 3 vezes)");
{
  const passos = [
    ["Servidor primeiro: ligar o vmstat", "na EC2 do chatbot, dentro do tmux", "vmstat -t 5 | tee cpu_A_r1.txt"],
    ["Depois, a carga", "no gerador, dentro do tmux", "export SENHA=<seed_password>\n./rodar_cenario.sh A 1 http://<IP-EC2-A>"],
    ["Anotar no diário de bordo", "horários de início e fim, anomalias", null],
    ["Ao ver \"== Fim\", parar o vmstat", "Ctrl+C no terminal da EC2", null],
  ];
  let y = 1.22;
  passos.forEach(([h, d, c], i) => {
    const alt = c ? 0.92 : 0.55;
    circ(s, 0.5, y + 0.05, 0.42, String(i + 1), i < 2 ? C.accent1 : C.accent2, 15);
    T(s, h, { x: 1.1, y, w: 3.4, h: 0.32, fontSize: 15, bold: true });
    T(s, d, { x: 1.1, y: y + 0.3, w: 3.4, h: 0.28, fontSize: 12, color: C.text2 });
    if (c) code(s, 4.6, y, 4.9, alt - 0.1, null, c, 11);
    y += alt + 0.08;
  });
  box(s, { x: 4.6, y: 3.3, w: 4.9, h: 1.15, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
  T(s, [{ text: "Repetição 2 e 3: ", options: { bold: true } }, { text: "troque o 1 do comando por 2 e 3, e o r1 do arquivo por r2 e r3." }], { x: 4.8, y: 3.4, w: 4.5, h: 0.95, fontSize: 13, valign: "middle" });
  T(s, "Durante as medições, não use a página do chatbot: as suas perguntas entram na fila e contaminam o teste.", { x: 0.5, y: 4.65, w: 9.0, h: 0.45, fontSize: 13, color: C.text2, italic: true });
}
s.addNotes("O vmstat é ligado antes da carga para o arquivo mostrar a CPU ociosa no começo. O rodar_cenario.sh imprime os horários de cada passo: use-os no diário de bordo e nos prints do CloudWatch. Comandos completos: QUICKSTART 3.6.");

// ---------- Coletar A ----------
s = add("Sessão 1 — Arquitetura A", "Coletar os resultados de A, antes do destroy");
code(s, 0.5, 1.2, 9.0, 1.45, "No seu computador, na pasta do projeto", "scp -i labsuser.pem -r ec2-user@<IP-GERADOR>:~/loadtest/resultados loadtest/\nscp -i labsuser.pem \"ec2-user@<IP-EC2-A>:~/cpu_A_*.txt\" loadtest/resultados/\ncd terraform/compute && terraform output configuracao > ../../loadtest/resultados/configuracao_A.txt", 10.5);
[["Do gerador", "A_r1, A_r2, A_r3, cada uma com vus1.csv, vus4.csv e vus16.csv", C.accent1, C.accent4, HEX.orangeLight],
 ["Da EC2 do chatbot", "cpu_A_r1.txt, cpu_A_r2.txt e cpu_A_r3.txt (vmstat)", C.accent2, C.accent3, HEX.tealLight],
 ["Do Terraform", "configuracao_A.txt, a saída de terraform output configuracao", C.text2, C.background2, HEX.line]].forEach(([h, d, cor, fill, ln], i) => {
  const x = 0.5 + i * 3.05;
  box(s, { x, y: 2.85, w: 2.9, h: 1.55, fill: { color: fill }, line: { color: ln } });
  T(s, h, { x: x + 0.2, y: 2.97, w: 2.5, h: 0.35, fontSize: 15, bold: true, color: cor });
  T(s, d, { x: x + 0.2, y: 3.38, w: 2.5, h: 0.95, fontSize: 13 });
});
T(s, "Confira em loadtest/resultados/ antes de seguir: depois do destroy, o vmstat e a EC2 não existem mais.", { x: 0.5, y: 4.6, w: 9.0, h: 0.45, fontSize: 13, color: C.accent1, bold: true });
s.addNotes("As aspas em \"ec2-user@...:~/cpu_A_*.txt\" são necessárias: sem elas, o terminal tenta expandir o * no seu computador. O terraform output só funciona na pasta compute em que foi feito o apply. Detalhes: ESCOPO, seção Coletar os resultados; QUICKSTART 3.7.");

// ---------- CloudWatch ----------
s = add("Sessão 1 — Arquitetura A", "Prints do CloudWatch");
tabela(s, [
  [HD("Serviço"), HD("Métrica"), HD("Estatística"), HD("Cenário")],
  ["RDS", "CPUUtilization", "Average", "A e B"],
  ["RDS", "DatabaseConnections", "Maximum", "A e B"],
  ["ALB", "TargetResponseTime", "Average", "só B"],
  ["ALB", "RequestCountPerTarget", "Sum", "só B"],
  ["ALB", "HTTPCode_ELB_5XX_Count", "Sum", "só B"],
], { x: 0.5, y: 1.25, w: 5.3, colW: [0.8, 2.4, 1.15, 0.95], fontSize: 12, rowH: 0.45 });
{
  const p = ["CloudWatch → Metrics → All metrics", "RDS → Per-Database Metrics (ou ApplicationELB)", "Statistic da tabela; Period = 1 minute", "Custom → Absolute: início e fim da repetição", "Captura: Win+Shift+S · Cmd+Shift+4 · Shift+PrtSc"];
  p.forEach((t, i) => {
    const y = 1.25 + i * 0.56;
    circ(s, 6.1, y + 0.08, 0.34, String(i + 1), C.accent2, 12);
    T(s, t, { x: 6.55, y, w: 2.95, h: 0.5, fontSize: 12, valign: "middle" });
  });
}
T(s, "Um print por métrica, de uma repetição representativa de cada arquitetura. Os horários vêm do diário de bordo.", { x: 0.5, y: 4.4, w: 9.0, h: 0.6, fontSize: 13, color: C.text2, italic: true });
s.addNotes("Atalho para o RDS: console → RDS → o seu banco → aba Monitoring. No ALB, RequestCountPerTarget fica em Per AppELB, per TG Metrics. Nomeie os arquivos pelo conteúdo (ex.: A_r2_rds_cpu.png) numa pasta prints/.");

// ---------- Destruir A ----------
s = add("Sessão 1 — Arquitetura A", "Destruir a Arquitetura A: só depois de tudo isto");
{
  const checks = ["As 3 repetições de A concluídas", "CSVs do gerador e vmstat copiados", "configuracao_A.txt salvo", "Prints do CloudWatch salvos"];
  checks.forEach((t, i) => {
    const y = 1.3 + i * 0.7;
    circ(s, 0.5, y, 0.48, "✓", C.accent2, 18);
    T(s, t, { x: 1.15, y, w: 3.6, h: 0.48, fontSize: 15, valign: "middle" });
  });
  arrow(s, 4.8, 2.35, 5.3, 2.35, HEX.orange, 3);
  code(s, 5.4, 1.3, 4.1, 1.35, "Em terraform/compute", "terraform destroy -var-file=a.tfvars", 12);
  box(s, { x: 5.4, y: 2.85, w: 4.1, h: 1.35, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
  T(s, [{ text: "Somente compute. ", options: { bold: true } }, { text: "Não destrua a base (RDS, histórico, S3) nem o gerador: os dois seguem para a Sessão 2." }], { x: 5.6, y: 2.95, w: 3.7, h: 1.15, fontSize: 13, valign: "middle" });
  T(s, "Faltou uma repetição depois do destroy? Será preciso subir A de novo.", { x: 0.5, y: 4.45, w: 9.0, h: 0.45, fontSize: 13, color: C.accent1, bold: true });
}
s.addNotes("Este é o erro mais comum de quem lê a lista com pressa: destruir A antes de terminar as repetições ou antes de copiar o vmstat. O destroy de A fica no fim da Sessão 1, nunca no começo. QUICKSTART 3.8.");

// =====================================================================================
// SESSÃO 2 — ARQUITETURA B
// =====================================================================================
pres.addSection({ title: "Sessão 2 — Arquitetura B" });
stepSlide("Sessão 2 — Arquitetura B", "Sessão 2 — Retomar e subir a Arquitetura B", [
  "Renovar as credenciais do Learner Lab",
  "Religar o gerador: copiar o IP novo; atualizar o My IP do SG se mudou de rede",
  "terraform apply -var-file=b.tfvars em compute",
  "Esperar os 2 alvos healthy no Target Group <prefixo>-tg",
  "Verificar o balanceamento: o campo servidor: alterna entre as EC2",
], ["Já está lá", "A base, o histórico no RDS e o gerador (com scripts, k6 e tmux) continuam da Sessão 1. Não refaça o preenchimento do histórico.", true],
"QUICKSTART 4.1 e 4.2. O print do Target Group com os dois alvos healthy e o print do balanceamento vão no relatório, parte 2.");

// ---------- Repetições de B ----------
s = add("Sessão 2 — Arquitetura B", "As 3 repetições de B: agora com 3 terminais");
{
  const cols = [
    ["Terminal 1 · gerador", "export SENHA=<seed_password>\n./rodar_cenario.sh B 1 \\\n  http://<DNS-DO-ALB>"],
    ["Terminal 2 · web-1", "vmstat -t 5 | tee \\\n  cpu_B_r1_ec2-1.txt"],
    ["Terminal 3 · web-2", "vmstat -t 5 | tee \\\n  cpu_B_r1_ec2-2.txt"],
  ];
  const ws = [3.7, 2.55, 2.55], xs = [0.5, 4.3, 6.95];
  cols.forEach(([h, c], i) => code(s, xs[i], 1.25, ws[i], 1.7, h, c, 11));
  T(s, "Ordem igual à de A: primeiro os dois vmstat, depois a carga; Ctrl+C nos dois ao ver \"== Fim\".", { x: 0.5, y: 3.1, w: 9.0, h: 0.4, fontSize: 13, bold: true });
  box(s, { x: 0.5, y: 3.6, w: 9.0, h: 1.2, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
  T(s, "Mesmo protocolo de A", { x: 0.7, y: 3.7, w: 8.6, h: 0.35, fontSize: 15, bold: true, color: C.accent2 });
  T(s, "Mesma rampa (1, 4 e 16 usuários), mesmo n = 16 por passo, mesmo gerador, mesmo RDS, mesmo m5.large. Só a arquitetura muda; a URL agora é a do ALB.", { x: 0.7, y: 4.07, w: 8.6, h: 0.65, fontSize: 13 });
}
s.addNotes("QUICKSTART 4.3. Em B, um vmstat em cada EC2: o gráfico de CPU do relatório mostra se as duas trabalharam por igual. Opcional, depois das 3 repetições: teste de falha (QUICKSTART 4.4).");

// ---------- Coletar e destruir B ----------
s = add("Sessão 2 — Arquitetura B", "Coletar os resultados de B e destruir B");
code(s, 0.5, 1.2, 9.0, 1.75, "No seu computador, na pasta do projeto", "scp -i labsuser.pem -r ec2-user@<IP-GERADOR>:~/loadtest/resultados loadtest/\nscp -i labsuser.pem \"ec2-user@<IP-EC2-B1>:~/cpu_B_*.txt\" loadtest/resultados/\nscp -i labsuser.pem \"ec2-user@<IP-EC2-B2>:~/cpu_B_*.txt\" loadtest/resultados/\ncd terraform/compute && terraform output configuracao > ../../loadtest/resultados/configuracao_B.txt", 10.5);
box(s, { x: 0.5, y: 3.15, w: 4.4, h: 1.5 });
T(s, "Antes do destroy, confira", { x: 0.7, y: 3.25, w: 4.0, h: 0.35, fontSize: 15, bold: true, color: C.accent2 });
T(s, bullets(["B_r1, B_r2, B_r3 e 6 arquivos cpu_B_r*", "configuracao_B.txt", "Prints do CloudWatch: RDS e ALB"]), { x: 0.7, y: 3.65, w: 4.0, h: 0.95, fontSize: 13 });
code(s, 5.1, 3.15, 4.4, 1.5, "Depois, em terraform/compute", "terraform destroy -var-file=b.tfvars", 12);
T(s, "A base e o gerador só saem na limpeza final, depois da análise.", { x: 0.5, y: 4.75, w: 9.0, h: 0.35, fontSize: 13, color: C.text2, italic: true });
s.addNotes("QUICKSTART 4.5. A pasta resultados/ agora tem A e B: é o que o analisar.py precisa.");

// =====================================================================================
// ANÁLISE E RELATÓRIO
// =====================================================================================
pres.addSection({ title: "Análise e relatório" });
s = add("Análise e relatório", "Os scripts de análise e a planilha final");
{
  const fl = [["resultados/", "CSVs de A e B", C.text2], ["analisar.py", null, C.accent1], ["tabela.csv", "uma linha por passo", C.text2], ["gerar_planilha.py", null, C.accent1], ["resultados.xlsx", "abas e gráficos", C.accent2]];
  fl.forEach(([h, d, cor], i) => {
    const x = 0.5 + i * 1.86;
    node(s, x, 1.2, 1.55, 0.62, d ? [{ text: h, options: { bold: true, breakLine: true, fontSize: 12 } }, { text: d, options: { bold: false, fontSize: 10 } }] : h, cor, { fontSize: 13 });
    if (i < fl.length - 1) arrow(s, x + 1.55, 1.51, x + 1.86, 1.51);
  });
  tabela(s, [
    [HD("Parte"), HD("Onde"), HD("O que mostra")],
    ["P1", "abas A_rep1 … B_rep3", "os passos de cada repetição"],
    ["P2", "Agregado: tabelas A e B", "as 3 repetições juntas (n = 48), com a decomposição"],
    ["P3", "Agregado: gráficos", "p50, p95 e vazão × usuários"],
    ["P4", "Agregado: razões A ÷ B", "quantas vezes B é melhor que A"],
    ["P5", "Agregado: p95 mín. e máx.", "A e B se sobrepõem? Só sem sobreposição há diferença"],
  ], { x: 0.5, y: 2.1, w: 9.0, colW: [0.8, 3.0, 5.2], fontSize: 12, rowH: 0.4 });
  T(s, "cd loadtest  ·  python3 analisar.py  ·  python3 gerar_planilha.py   (Windows: python)", { x: 0.5, y: 4.7, w: 9.0, h: 0.35, fontSize: 12, fontFace: "Courier New", color: C.text2 });
}
s.addNotes("Precisa do openpyxl (Etapa 0.3). A planilha abre no Excel ou no LibreOffice Calc, já na aba Agregado. O que discutir em cada parte está na seção 4.5 do ESCOPO_E_ATIVIDADES.md.");

// ---------- 5 gráficos ----------
s = add("Análise e relatório", "Os 5 gráficos do relatório");
[["p50 × usuários", "pronto na planilha (P3)", true], ["p95 × usuários", "pronto na planilha (P3): o gráfico central", true], ["Vazão × usuários", "pronto na planilha (P3): o sistema saturou?", true], ["Decomposição", "você monta: fila, prefill e geração com 1, 4 e 16 usuários (de P2)", false], ["CPU no tempo", "você monta: vmstat de uma repetição de A e uma de B", false]].forEach(([h, d, pronto], i) => {
  const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3;
  const w = row === 0 ? 2.85 : 4.4, x = 0.5 + col * (w + 0.225), y = 1.25 + row * 1.85;
  box(s, { x, y, w, h: 1.5, fill: { color: pronto ? C.accent3 : C.accent4 }, line: { color: pronto ? HEX.tealLight : HEX.orangeLight } });
  circ(s, x + 0.2, y + 0.2, 0.45, String(i + 1), pronto ? C.accent2 : C.accent1);
  T(s, h, { x: x + 0.8, y: y + 0.2, w: w - 0.9, h: 0.45, fontSize: 15, bold: true, valign: "middle" });
  T(s, d, { x: x + 0.2, y: y + 0.75, w: w - 0.4, h: 0.65, fontSize: 13, color: C.text2 });
});
T(s, "Depois, compare cada passo com a previsão escrita antes de medir.", { x: 0.5, y: 4.75, w: 9.0, h: 0.35, fontSize: 13, color: C.text2, italic: true });
s.addNotes("Verde: vem pronto da planilha. Laranja: o aluno monta no Excel ou no LibreOffice. Gráficos com título, eixos com unidade e legenda de A e B.");

// ---------- Relatório ----------
s = add("Análise e relatório", "O relatório final (PDF)");
["Objetivo e hipóteses (escritas antes), S e previsão", "Arquiteturas: diagramas, recursos, custo/hora", "Método: o que foi fixado, rampa, repetições, durações", "Resultados na ordem da planilha (P1–P5), 5 gráficos, CloudWatch", "Discussão de cada parte da planilha; previsão × medido; custo", "Limitações e conclusão: a resposta direta", "Apêndices: diário de bordo e evidência de limpeza"].forEach((t, i) => {
  const y = 1.2 + i * 0.54;
  circ(s, 0.5, y + 0.06, 0.4, String(i + 1), C.accent2, 14);
  T(s, t, { x: 1.05, y, w: 5.2, h: 0.52, fontSize: 13, valign: "middle" });
});
box(s, { x: 6.5, y: 1.25, w: 3.0, h: 3.75, fill: { color: C.text1 }, line: { color: HEX.ink } });
T(s, "Um único PDF", { x: 6.7, y: 1.4, w: 2.6, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
T(s, [{ text: "<prefixo>-servnuvem-2026-2-relatorio-final.pdf", options: { fontFace: "Courier New", fontSize: 11, breakLine: true } }, { text: " ", options: { breakLine: true, fontSize: 6 } }, { text: "Na Atividade da Sala Virtual. A pasta resultados/ vai à parte.", options: { fontSize: 13 } }], { x: 6.7, y: 1.9, w: 2.6, h: 3.0, color: C.background1 });
s.addNotes("Estrutura completa, imagens de cada parte e perguntas de discussão: seção 4.5 do ESCOPO_E_ATIVIDADES.md. Toda imagem tem número, legenda e é citada no texto; tabelas e saídas de comando entram como texto.");

// ---------- Entregas e limpeza ----------
s = add("Análise e relatório", "O que você entrega e a limpeza final");
tabela(s, [
  [HD("#"), HD("Entrega"), HD("Pronta quando")],
  ["1", "Hipóteses e previsão (com o S do piloto)", "Sessão 1, antes das repetições"],
  ["2", "Diário de bordo", "Ao longo das sessões"],
  ["3", "resultados/ e output configuracao de A e B", "Fim de cada sessão"],
  ["4", "Prints do CloudWatch", "Fim de cada sessão"],
  ["5", "Relatório final em PDF", "Fim do projeto"],
  ["6", "Evidência de limpeza", "Fim do projeto"],
], { x: 0.5, y: 1.25, w: 5.9, colW: [0.4, 3.3, 2.2], fontSize: 12, rowH: 0.5 });
box(s, { x: 6.7, y: 1.25, w: 2.8, h: 3.5, fill: { color: C.text1 }, line: { color: HEX.ink } });
T(s, "Limpeza final", { x: 6.9, y: 1.4, w: 2.4, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
T(s, bullets(["destroy em compute", "depois destroy em base", "encerrar o gerador e apagar o SG dele", "print do console sem recursos com o seu prefixo"]), { x: 6.9, y: 1.9, w: 2.4, h: 2.8, fontSize: 13, color: C.background1 });
s.addNotes("As entregas 1 a 4 nascem durante as sessões: quem não registra na hora não consegue reconstruir depois. Recurso esquecido consome o crédito do Learner Lab.");

// ---------- Regras ----------
s = add("Análise e relatório", "Regras do jogo");
[["Comparação justa", "Só a arquitetura muda: mesma app, m5.large, RDS, gerador, perguntas, rampa e 3 repetições."],
 ["Medição limpa", "Teste só a partir do gerador na AWS, nunca do seu computador. Nada de chat ou banco durante uma repetição."],
 ["Dados honestos", "Resultados e conclusões vêm das suas medições. Repetição descartada é registrada com o motivo."],
 ["Segurança", "Nunca faça commit de labsuser.pem, credenciais ou terraform.tfstate. Porta 22 só para o seu IP."],
 ["Learner Lab", "Sessão de 4 h, credenciais novas a cada sessão, crédito limitado: sempre destroy ao terminar."]].forEach(([h, d], i) => {
  const y = 1.2 + i * 0.77;
  circ(s, 0.5, y + 0.1, 0.45, "!", i < 3 ? C.accent1 : C.accent2);
  T(s, h, { x: 1.15, y: y + 0.02, w: 2.2, h: 0.6, fontSize: 15, bold: true, valign: "middle" });
  T(s, d, { x: 3.4, y: y + 0.02, w: 6.1, h: 0.6, fontSize: 14, color: C.text2, valign: "middle" });
});
s.addNotes("Critérios de validade de uma repetição: PLANO_TESTE_DE_CARGA.md, seção 7. Extras opcionais (B1, teste de falha, mais EC2): seção 6 do ESCOPO, só se o professor pedir.");

// ---------- Fechamento ----------
pres.addSection({ title: "Fechamento" });
s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Fechamento" });
s.addText("Por onde começar", { placeholder: "title" });
s.addText("docs/ESCOPO_E_ATIVIDADES.md: as etapas, a mecânica do teste e o relatório (4.5)\ndocs/QUICKSTART.md: os comandos, passo a passo\ndocs/PLANO_TESTE_DE_CARGA.md: o método\ndocs/ARCH_A_vs_ARCH_B.md: a infraestrutura e o porquê", { placeholder: "body" });
s.addNotes("Próximo passo imediato: Etapa 0, a preparação. No fim, a decisão de arquitetura é de vocês, com dados.");

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("ok", OUT);
})();
