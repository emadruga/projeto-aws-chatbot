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
pres.title = "Projeto Nuvem 2026 — Escopo e atividades do aluno";
pres.author = "Cloud Systems Architecture";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "CAPA",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.5, w: 8.8, h: 1.5, fontSize: 40, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.2, w: 8.8, h: 1.2, fontSize: 18, color: C.background2, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTEUDO",
  background: { color: C.background1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 30, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Projeto Nuvem 2026 · Escopo e atividades", options: { x: 0.5, y: 5.22, w: 6, h: 0.3, fontSize: 10, color: C.text2, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.22, w: 0.5, h: 0.3, fontSize: 10, color: C.text2, align: "right" },
});

let n = 0;
const nm = (p) => `${p}-${++n}`;
const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, fontSize: 15, color: C.text1, margin: 0, valign: "top", objectName: nm("txt") }, o));
const box = (s, o) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, Object.assign({ rectRadius: 0.08, line: { color: HEX.line, width: 0.75 }, fill: { color: C.background2 }, objectName: nm("card") }, o));
const circ = (s, x, y, d, label, fill) => s.addText(label, { isTextBox: true, shape: pres.shapes.OVAL, x, y, w: d, h: d, fill: { color: fill || C.accent1 }, color: C.background1, bold: true, fontSize: 16, align: "center", valign: "middle", margin: 0, objectName: nm("num") });
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: Object.assign({ bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 }, o) }));

function add(sec, title) {
  const s = pres.addSlide({ masterName: "CONTEUDO", sectionTitle: sec });
  s.addText(title, { placeholder: "title" });
  return s;
}

// ---------- 1. Capa ----------
pres.addSection({ title: "Abertura" });
let s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Abertura" });
s.addText("Projeto Nuvem 2026: escopo e atividades do aluno", { placeholder: "title" });
s.addText("Cloud Systems Architecture · AWS Academy Learner Lab\nChatbot Gemma em duas arquiteturas AWS", { placeholder: "body" });
s.addNotes("Abertura. Esta apresentação diz o que o projeto cobre, o que cada aluno faz em cada etapa e o que entrega. Os comandos estão no QUICKSTART.");

// ---------- 2. A pergunta ----------
s = add("Abertura", "A pergunta que você vai responder");
box(s, { x: 0.5, y: 1.3, w: 9.0, h: 1.35, fill: { color: C.text1 }, line: { color: HEX.ink } });
T(s, "Qual arquitetura entrega o menor tempo de resposta ao usuário final, de forma mais consistente?", { x: 0.8, y: 1.42, w: 8.4, h: 1.1, fontSize: 22, bold: true, color: C.background1, valign: "middle", fontFace: "Cambria" });
const crit = [["Rápida", "tempo de resposta típico (p50) e pior caso razoável (p95)"], ["Consistente", "pouca variação entre respostas (desvio, CV, p95 perto do p50)"], ["Com dados", "medidos por você, com o mesmo teste em A e em B"]];
crit.forEach(([h, d], i) => {
  const x = 0.5 + i * 3.1;
  box(s, { x, y: 3.0, w: 2.8, h: 1.9 });
  circ(s, x + 0.2, 3.2, 0.5, String(i + 1), i === 2 ? C.accent2 : C.accent1);
  T(s, h, { x: x + 0.85, y: 3.25, w: 1.8, h: 0.4, fontSize: 17, bold: true, valign: "middle" });
  T(s, d, { x: x + 0.2, y: 3.85, w: 2.4, h: 0.95, fontSize: 14, color: C.text2 });
});
s.addNotes("Não é um projeto de programação nem de IA: é uma decisão de arquitetura baseada em dados. O projeto é individual: cada aluno usa o próprio Learner Lab.");

// ---------- 3. Arquiteturas ----------
s = add("Abertura", "As duas arquiteturas comparadas");
function node(s, x, y, w, label, fill, color) {
  s.addText(label, { isTextBox: true, shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y, w, h: 0.6, fill: { color: fill }, color: color || C.background1, bold: true, fontSize: 14, align: "center", valign: "middle", margin: 0, objectName: nm("node") });
}
function arrow(s, x1, y1, x2, y2) { s.addShape(pres.shapes.LINE, { x: x1, y: y1, w: x2 - x1, h: y2 - y1, flipV: y2 < y1, line: { color: HEX.gray, width: 1.5, endArrowType: "triangle" }, objectName: nm("arrow") }); }
// A
T(s, "A — Monolito", { x: 0.5, y: 1.25, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
node(s, 0.5, 1.85, 1.3, "Usuário", C.text2);
arrow(s, 1.8, 2.15, 2.6, 2.15);
node(s, 2.6, 1.85, 2.6, "1 EC2 (backend + Ollama + Gemma)", C.accent1);
arrow(s, 5.2, 2.15, 6.0, 2.15);
node(s, 6.0, 1.85, 1.3, "RDS", C.accent2);
// B
T(s, "B — Balanceada", { x: 0.5, y: 2.85, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
node(s, 0.5, 3.75, 1.3, "Usuário", C.text2);
arrow(s, 1.8, 4.05, 2.4, 4.05);
node(s, 2.4, 3.75, 0.9, "ALB", C.text1);
arrow(s, 3.3, 3.95, 3.9, 3.6);
arrow(s, 3.3, 4.15, 3.9, 4.5);
node(s, 3.9, 3.3, 2.1, "EC2 · us-east-1a", C.accent1);
node(s, 3.9, 4.2, 2.1, "EC2 · us-east-1b", C.accent1);
arrow(s, 6.0, 3.6, 6.6, 3.95);
arrow(s, 6.0, 4.5, 6.6, 4.15);
node(s, 6.6, 3.75, 0.9, "RDS", C.accent2);
box(s, { x: 7.75, y: 1.25, w: 1.75, h: 3.75, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
T(s, [{ text: "Igual em A e B", options: { bold: true, breakLine: true } }, { text: "mesma app, mesmo m5.large, mesmo RDS, mesmo S3, mesmo teste", options: { fontSize: 13 } }], { x: 7.9, y: 1.4, w: 1.45, h: 3.4, fontSize: 14, color: C.text1, paraSpaceAfter: 6 });
s.addNotes("A diferença entre A e B é só a camada de computação: o ALB e a segunda EC2 em outra zona. O banco e a base de conhecimento ficam na camada base, criada uma vez.");

// ---------- 4. Escopo ----------
pres.addSection({ title: "Escopo" });
s = add("Escopo", "O que está dentro e o que está fora");
box(s, { x: 0.5, y: 1.25, w: 4.4, h: 3.75, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
T(s, "Dentro do escopo", { x: 0.75, y: 1.4, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent2 });
T(s, bullets(["EC2, ALB, RDS, S3, IAM e VPC default", "Terraform em 2 camadas: base (dados) e compute (EC2 + ALB)", "Teste de carga com k6, de uma EC2 na AWS", "p50, p95, desvio, CV, vazão, erros e decomposição da latência", "Relatório com hipóteses, método e conclusão"]), { x: 0.75, y: 1.9, w: 3.95, h: 3.0, fontSize: 14 });
box(s, { x: 5.1, y: 1.25, w: 4.4, h: 3.75, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
T(s, "Fora do escopo", { x: 5.35, y: 1.4, w: 4, h: 0.4, fontSize: 18, bold: true, color: C.accent1 });
T(s, bullets(["Programar a aplicação (app/ já vem pronto)", "Treinar ou ajustar o modelo de IA", "SageMaker, Bedrock, NAT, Auto Scaling, Secrets Manager", "HTTPS, domínio próprio", "Mudar app, modelo ou parâmetros do teste"]), { x: 5.35, y: 1.9, w: 3.95, h: 3.0, fontSize: 14 });
s.addNotes("O que está fora não é proibido por capricho: mudar a aplicação ou os parâmetros do teste quebra a comparação justa entre A e B.");

// ---------- 5. Pronto x seu ----------
s = add("Escopo", "O que já vem pronto e o que é trabalho seu");
const rows = [
  [{ text: "Já vem pronto", options: { bold: true, color: C.background1, fill: { color: C.text2 } } }, { text: "É trabalho seu", options: { bold: true, color: C.background1, fill: { color: C.accent1 } } }],
  ["Backend Flask e página de chat (app/)", "Configurar e provisionar A e B com Terraform"],
  ["Código Terraform (terraform/)", "Criar e preparar o gerador de carga"],
  ["Scripts de carga e análise (loadtest/)", "Escrever hipóteses e previsões antes de medir"],
  ["Base de conhecimento (bases/)", "Executar as medições e manter o diário de bordo"],
  ["Guias (docs/)", "Montar os gráficos, interpretar e concluir"],
  ["", "Destruir todos os recursos no fim"],
];
s.addTable(rows, { x: 0.5, y: 1.3, w: 9.0, colW: [4.5, 4.5], fontSize: 14, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.48, valign: "middle", margin: [0, 8, 0, 8], objectName: "tabela-pronto" });
s.addNotes("O código está pronto e validado. O trabalho do aluno é o de um arquiteto de nuvem: provisionar, medir, interpretar e decidir.");

// ---------- 6. Roteiro ----------
pres.addSection({ title: "Atividades" });
s = add("Atividades", "O roteiro em 5 etapas");
const etapas = [["0", "Preparação", "seu computador · 1 aula"], ["1", "Sessão 1", "base e A · 4 h"], ["2", "Sessão 2", "B · 4 h"], ["3", "Análise", "planilha e 5 gráficos · 1 a 2 aulas"], ["4", "Relatório", "PDF e limpeza final · 1 aula"]];
s.addShape(pres.shapes.LINE, { x: 0.95, y: 2.25, w: 8.1, h: 0, line: { color: HEX.line, width: 2 }, objectName: "linha-tempo" });
etapas.forEach(([k, h, d], i) => {
  const x = 0.5 + i * 1.85;
  circ(s, x + 0.45, 1.8, 0.9, k, i === 1 || i === 2 ? C.accent1 : C.accent2);
  T(s, h, { x, y: 2.9, w: 1.8, h: 0.4, fontSize: 17, bold: true, align: "center" });
  T(s, d, { x, y: 3.35, w: 1.8, h: 0.8, fontSize: 13, color: C.text2, align: "center" });
});
T(s, "A camada base, o gerador de carga e o histórico no RDS sobrevivem entre as sessões; só a camada compute é criada e destruída.", { x: 0.5, y: 4.4, w: 9.0, h: 0.6, fontSize: 14, color: C.text2, italic: true });
s.addNotes("As sessões 1 e 2 são longas porque o teste de carga leva tempo. Planejem cada sessão do começo ao fim: o Learner Lab dura 4 horas.");

// ---------- 7. Etapa 0 ----------
function stepSlide(sec, title, steps, side, notes) {
  const s = add(sec, title);
  const h = Math.min(0.62, 3.7 / steps.length);
  steps.forEach((t, i) => {
    const y = 1.25 + i * h;
    circ(s, 0.5, y + (h - 0.36) / 2, 0.36, String(i + 1), C.accent2);
    T(s, t, { x: 1.0, y, w: side ? 5.2 : 8.5, h, fontSize: 14, valign: "middle" });
  });
  if (side) {
    box(s, { x: 6.5, y: 1.25, w: 3.0, h: 3.75, fill: { color: C.accent4 }, line: { color: HEX.orangeLight } });
    T(s, side[0], { x: 6.7, y: 1.4, w: 2.6, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
    T(s, side[1], { x: 6.7, y: 1.9, w: 2.6, h: 3.0, fontSize: 14 });
  }
  s.addNotes(notes);
  return s;
}
stepSlide("Atividades", "Etapa 0 — Preparação", [
  "Instalar Terraform, AWS CLI, Python + openpyxl, SSH e Git (próximo slide)",
  "git clone do projeto",
  "Credenciais do Learner Lab no arquivo credentials (a cada sessão)",
  "Testar: aws sts get-caller-identity mostra o seu nome no Arn",
  "Baixar a labsuser.pem e ajustar a permissão",
  "Nos .tfvars: o seu IP em ssh_cidr (/32) e uma seed_password sua",
], ["Seu nome nos recursos", "O prefixo vem do Arn do get-caller-identity, depois do \"=\": user1234567=Maria_Silva vira maria-silva. Tudo leva esse prefixo: maria-silva-web-1, maria-silva-alb... No console, procure pelo seu nome."], "Etapa feita em casa ou em aula, sem gastar sessão do Learner Lab. O passo a passo de cada item, para Linux, Windows 11 e macOS, está na Etapa 0 do ESCOPO_E_ATIVIDADES.md. Se o get-caller-identity der erro, a tabela de erros está na Etapa 0.10.");

// ---------- 7b. Instalação por sistema ----------
s = add("Atividades", "Etapa 0 — Instalação por sistema");
{
  const HD = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
  const K = (t) => ({ text: t, options: { fontFace: "Courier New", fontSize: 9 } });
  const inst = [
    [HD("Ferramenta"), HD("Linux (Ubuntu/Debian)"), HD("Windows 11 (PowerShell)"), HD("macOS (Homebrew)")],
    ["Terraform", K("sudo snap install terraform --classic"), K("winget install --id Hashicorp.Terraform -e"), K("brew install hashicorp/tap/terraform")],
    ["AWS CLI v2", K("sudo snap install aws-cli --classic"), K("winget install --id Amazon.AWSCLI -e"), K("brew install awscli")],
    ["Python 3", K("sudo apt install -y python3"), K("winget install --id Python.Python.3.12 -e"), K("brew install python")],
    ["openpyxl", K("sudo apt install -y python3-openpyxl"), K("python -m pip install openpyxl"), K("python3 -m pip install --user --break-system-packages openpyxl")],
    ["SSH", K("sudo apt install -y openssh-client"), "já vem no Windows 11", "já vem no macOS"],
    ["Git", K("sudo apt install -y git"), K("winget install --id Git.Git -e"), K("brew install git")],
  ];
  s.addTable(inst, { x: 0.5, y: 1.2, w: 9.0, colW: [1.2, 2.5, 2.6, 2.7], fontSize: 11, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.44, valign: "middle", margin: [0, 5, 0, 5], objectName: "tabela-instalacao" });
  T(s, "Linux e macOS bloqueiam o pip puro (externally-managed-environment): por isso os comandos acima. No Windows, feche e reabra o PowerShell depois de instalar.", { x: 0.5, y: 4.45, w: 9.0, h: 0.6, fontSize: 12, color: C.text2, italic: true });
  s.addNotes("Conferir tudo com a tabela da Etapa 0.10 do ESCOPO: terraform version, aws --version, python3 --version, import openpyxl, ssh -V, git --version.");
}

// ---------- 8. Etapa 1 ----------
stepSlide("Atividades", "Etapa 1 — Sessão 1: base e Arquitetura A", [
  "terraform apply em base (uma vez no projeto)",
  "Criar o gerador <prefixo>-gerador-carga; instalar k6 e tmux (próximo slide)",
  "terraform apply -var-file=a.tfvars; esperar a URL responder 200",
  "Teste de fumaça no navegador e preenchimento do histórico",
  "Piloto com 1 usuário: medir o S",
  "Escrever hipóteses e previsão (próximo slide)",
  "3 repetições de A, com vmstat na EC2, dentro do tmux",
  "Prints do CloudWatch, copiar resultados/, destroy de A (só compute)",
], null, "Os passos 6 e 7 não podem trocar de ordem: a previsão vale porque foi escrita antes da medição.");

// ---------- 8b. Gerador de carga ----------
s = add("Atividades", "O gerador de carga");
{
  const HD = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
  const ger = [
    [HD("Campo"), HD("Valor")],
    ["Name", "<prefixo>-gerador-carga"],
    ["AMI", "Amazon Linux 2023 (x86)"],
    ["Tipo", "t3.small"],
    ["Key pair", "vockey"],
    ["Rede", "VPC default · us-east-1a · IP público"],
    ["Security group", "<prefixo>-gerador-sg (SSH do My IP)"],
    ["Disco", "8 GiB gp3 (o padrão)"],
  ];
  s.addTable(ger, { x: 0.5, y: 1.2, w: 4.6, colW: [1.4, 3.2], fontSize: 11, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.42, valign: "middle", margin: [0, 6, 0, 6], objectName: "tabela-gerador" });
  box(s, { x: 5.4, y: 1.2, w: 4.1, h: 3.4, fill: { color: C.text1 }, line: { color: HEX.ink } });
  T(s, "No gerador (ssh ec2-user@<IP>)", { x: 5.6, y: 1.32, w: 3.7, h: 0.35, fontSize: 13, bold: true, color: C.accent1 });
  T(s, "sudo dnf install -y \\\n  https://dl.k6.io/rpm/repo.rpm\nsudo dnf install -y k6 tmux\nk6 version\ntmux -V", { x: 5.6, y: 1.75, w: 3.7, h: 1.6, fontSize: 12, fontFace: "Courier New", color: C.background1 });
  T(s, [{ text: "tmux: ", options: { bold: true } }, { text: "tmux new -s teste · Ctrl+B, D para sair · tmux attach -t teste para voltar" }], { x: 5.6, y: 3.45, w: 3.7, h: 1.0, fontSize: 12, color: C.background2 });
  T(s, "Criado à mão no console (Módulo 4), não pelo Terraform. Fica de pé entre as sessões; na sessão nova, religue e copie o IP novo.", { x: 0.5, y: 4.65, w: 9.0, h: 0.45, fontSize: 12, color: C.text2, italic: true });
  s.addNotes("Detalhes de cada campo: ESCOPO_E_ATIVIDADES.md, seção Gerador de carga. O tmux mantém o teste rodando se o SSH cair: uma repetição dura de 30 a 60 min.");
}

// ---------- 9. Hipóteses ----------
s = add("Atividades", "Antes de medir: hipóteses e previsão");
T(s, [{ text: "Escreva hipóteses próprias, com números aproximados:", options: { bold: true, breakLine: true } }].concat(bullets(["Como a latência de A muda com mais usuários? Onde está o gargalo?", "Como B se compara a A com poucos e com muitos usuários?", "O ALB tem custo perceptível?", "O RDS pode virar gargalo?"])), { x: 0.5, y: 1.3, w: 4.6, h: 2.9, fontSize: 14, paraSpaceAfter: 6 });
const prev = [
  [{ text: "Usuários", options: { bold: true, color: C.background1, fill: { color: C.text1 } } }, { text: "Previsão A (1 EC2)", options: { bold: true, color: C.background1, fill: { color: C.text1 } } }, { text: "Previsão B (2 EC2)", options: { bold: true, color: C.background1, fill: { color: C.text1 } } }],
  ["1", "", ""], ["4", "", ""], ["16", "", ""],
];
s.addTable(prev, { x: 5.4, y: 1.3, w: 4.1, colW: [1.1, 1.5, 1.5], fontSize: 14, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.5, align: "center", valign: "middle", objectName: "tabela-previsao" });
T(s, "Monte o seu modelo a partir do S e justifique em 3 a 5 linhas. Escolha um critério de \"aceitável\" (ex.: p95 até 60 s).", { x: 5.4, y: 3.5, w: 4.1, h: 0.9, fontSize: 13, color: C.text2 });
box(s, { x: 0.5, y: 4.35, w: 9.0, h: 0.65, fill: { color: C.accent3 }, line: { color: HEX.tealLight } });
T(s, "Previsão errada não é problema: explicar onde e por que errou faz parte do relatório. Dado inventado é.", { x: 0.7, y: 4.4, w: 8.6, h: 0.55, fontSize: 14, bold: true, color: C.accent2, valign: "middle" });
s.addNotes("A tabela fica em branco de propósito: cada aluno monta o próprio modelo.");

// ---------- 10. Etapa 2 ----------
stepSlide("Atividades", "Etapa 2 — Sessão 2: Arquitetura B", [
  "Renovar as credenciais; religar o gerador",
  "terraform apply -var-file=b.tfvars; esperar 2 alvos healthy",
  "Verificar o balanceamento: o campo servidor: alterna",
  "3 repetições com o mesmo protocolo de A; um vmstat por EC2",
  "Prints do CloudWatch (ALB e RDS) e cópia dos resultados",
  "Opcional: teste de falha (parar uma EC2 durante a carga)",
  "terraform destroy -var-file=b.tfvars",
], ["Mesmo protocolo", "Mesma rampa (1, 4 e 16 usuários), mesmo n = 16 por passo, mesmo gerador, mesmo RDS, mesmo tipo de EC2. Só a arquitetura muda."], "A base e o histórico continuam da sessão 1: não refaça o preenchimento.");

// ---------- 11. Análise ----------
s = add("Atividades", "Etapa 3 — Análise com a planilha");
T(s, "cd loadtest\npython3 analisar.py        → resultados/tabela.csv\npython3 gerar_planilha.py  → resultados/resultados.xlsx", { x: 0.5, y: 1.2, w: 9.0, h: 0.85, fontSize: 13, fontFace: "Courier New", color: C.text2 });
{
  const HD = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
  const partes = [
    [HD("Parte"), HD("Onde"), HD("O que mostra")],
    ["P1", "abas A_rep1 … B_rep3", "os passos de cada repetição"],
    ["P2", "Agregado: tabelas A e B", "as 3 repetições juntas, com a decomposição"],
    ["P3", "Agregado: gráficos", "p50, p95 e vazão × usuários"],
    ["P4", "Agregado: razões A ÷ B", "quantas vezes B é melhor que A"],
    ["P5", "Agregado: p95 mín. e máx.", "A e B se sobrepõem? Só sem sobreposição há diferença"],
  ];
  s.addTable(partes, { x: 0.5, y: 2.2, w: 9.0, colW: [0.8, 3.0, 5.2], fontSize: 13, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.42, valign: "middle", margin: [0, 6, 0, 6], objectName: "tabela-planilha" });
}
s.addNotes("Windows: python no lugar de python3. A planilha abre no Excel ou no LibreOffice Calc. O que discutir em cada parte está na seção 4.5 do ESCOPO_E_ATIVIDADES.md.");

// ---------- 11b. Os 5 gráficos ----------
s = add("Atividades", "Os 5 gráficos do relatório");
const graf = [["p50 × usuários", "pronto na planilha (P3)", true], ["p95 × usuários", "pronto na planilha (P3): o gráfico central", true], ["Vazão × usuários", "pronto na planilha (P3): o sistema saturou?", true], ["Decomposição", "você monta: fila, prefill e geração com 1, 4 e 16 usuários (de P2)", false], ["CPU no tempo", "você monta: vmstat de uma repetição de A e uma de B", false]];
graf.forEach(([h, d, pronto], i) => {
  const row = i < 3 ? 0 : 1, col = i < 3 ? i : i - 3;
  const w = row === 0 ? 2.85 : 4.4, x = 0.5 + col * (w + 0.225), y = 1.25 + row * 1.85;
  box(s, { x, y, w, h: 1.5, fill: { color: pronto ? C.accent3 : C.accent4 }, line: { color: pronto ? HEX.tealLight : HEX.orangeLight } });
  circ(s, x + 0.2, y + 0.2, 0.45, String(i + 1), pronto ? C.accent2 : C.accent1);
  T(s, h, { x: x + 0.8, y: y + 0.2, w: w - 0.9, h: 0.45, fontSize: 15, bold: true, valign: "middle" });
  T(s, d, { x: x + 0.2, y: y + 0.75, w: w - 0.4, h: 0.65, fontSize: 13, color: C.text2 });
});
T(s, "Depois, comparar cada passo com a previsão escrita antes de medir.", { x: 0.5, y: 4.75, w: 9.0, h: 0.35, fontSize: 13, color: C.text2, italic: true });
s.addNotes("Verde: vem pronto da planilha. Laranja: o aluno monta no Excel ou no LibreOffice. Gráficos com título, eixos com unidade e legenda de A e B.");

// ---------- 12. Relatório ----------
s = add("Atividades", "Etapa 4 — Relatório final (PDF) e limpeza");
const secs = ["Objetivo e hipóteses (escritas antes), S e previsão", "Arquiteturas: diagramas, recursos, custo/hora", "Método: o que foi fixado, rampa, repetições, durações", "Resultados na ordem da planilha (P1–P5), 5 gráficos, CloudWatch", "Discussão de cada parte da planilha; previsão × medido; custo", "Limitações e conclusão: a resposta direta", "Apêndices: diário de bordo e evidência de limpeza"];
secs.forEach((t, i) => {
  const y = 1.2 + i * 0.54;
  circ(s, 0.5, y + 0.06, 0.4, String(i + 1), C.accent2);
  T(s, t, { x: 1.05, y, w: 5.2, h: 0.52, fontSize: 13, valign: "middle" });
});
box(s, { x: 6.5, y: 1.25, w: 3.0, h: 3.75, fill: { color: C.text1 }, line: { color: HEX.ink } });
T(s, "Limpeza final", { x: 6.7, y: 1.4, w: 2.6, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
T(s, bullets(["destroy em compute", "depois destroy em base", "encerrar o gerador e apagar o SG dele", "print do console sem recursos com o seu prefixo"]), { x: 6.7, y: 1.9, w: 2.6, h: 3.0, fontSize: 14, color: C.background1 });
s.addNotes("Um único PDF: <prefixo>-servnuvem-2026-2-relatorio-final.pdf, na Atividade da Sala Virtual. Estrutura completa, imagens de cada parte e perguntas de discussão: seção 4.5 do ESCOPO_E_ATIVIDADES.md. Recurso esquecido consome o crédito do Learner Lab.");

// ---------- 13. Entregas ----------
pres.addSection({ title: "Entregas e regras" });
s = add("Entregas e regras", "O que você entrega");
const H = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
const ent = [
  [H("#"), H("Entrega"), H("Pronta quando")],
  ["1", "Hipóteses e tabela de previsão (com o S do piloto)", "Sessão 1, antes das repetições"],
  ["2", "Diário de bordo: horários, durações, anomalias, descartes", "Ao longo das sessões"],
  ["3", "resultados/ (CSVs, vmstat, tabela.csv, resultados.xlsx) e output configuracao", "Fim de cada sessão"],
  ["4", "Prints do CloudWatch (RDS em A e B; ALB em B)", "Fim de cada sessão"],
  ["5", "Relatório final em PDF, com a análise da planilha e os 5 gráficos", "Fim do projeto"],
  ["6", "Evidência de limpeza (print do console)", "Fim do projeto"],
];
s.addTable(ent, { x: 0.5, y: 1.25, w: 9.0, colW: [0.5, 5.6, 2.9], fontSize: 13, color: C.text1, border: { type: "solid", color: HEX.line, pt: 0.75 }, rowH: 0.47, valign: "middle", margin: [0, 6, 0, 6], objectName: "tabela-entregas" });
T(s, "Prazos e forma de envio: conforme o ambiente da disciplina.", { x: 0.5, y: 4.75, w: 9.0, h: 0.35, fontSize: 13, color: C.text2, italic: true });
s.addNotes("As entregas 1 a 4 nascem durante as sessões: quem não registra na hora não consegue reconstruir depois.");

// ---------- 14. Regras ----------
s = add("Entregas e regras", "Regras do jogo");
const regras = [
  ["Comparação justa", "Só a arquitetura muda: mesma app, m5.large, RDS, gerador, perguntas, rampa e 3 repetições."],
  ["Medição limpa", "Teste só a partir do gerador na AWS. Nada de usar o chat ou consultar o banco durante uma repetição."],
  ["Dados honestos", "Resultados e conclusões vêm das suas medições. Repetição descartada é registrada com o motivo."],
  ["Segurança", "Nunca faça commit de labsuser.pem, credenciais ou terraform.tfstate. Porta 22 só para o seu IP."],
  ["Learner Lab", "Sessão de 4 h, credenciais novas a cada sessão, crédito limitado: sempre destroy ao terminar."],
];
regras.forEach(([h, d], i) => {
  const y = 1.2 + i * 0.77;
  circ(s, 0.5, y + 0.1, 0.45, "!", i < 3 ? C.accent1 : C.accent2);
  T(s, h, { x: 1.15, y: y + 0.02, w: 2.2, h: 0.6, fontSize: 15, bold: true, valign: "middle" });
  T(s, d, { x: 3.4, y: y + 0.02, w: 6.1, h: 0.6, fontSize: 14, color: C.text2, valign: "middle" });
});
s.addNotes("Critérios de validade de uma repetição: PLANO_TESTE_DE_CARGA.md, seção 7.");

// ---------- 15. Extras ----------
s = add("Entregas e regras", "Extras opcionais (só se o professor pedir)");
const extras = [["B1", "ALB + 1 EC2 (b1.tfvars): isola o custo do balanceador"], ["Teste de falha", "parar uma EC2 de B durante a carga e observar a disponibilidade"], ["Mais EC2", "-var instance_count=4, com a sua previsão escrita antes"]];
extras.forEach(([h, d], i) => {
  const x = 0.5 + i * 3.1;
  box(s, { x, y: 1.4, w: 2.8, h: 1.9 });
  T(s, h, { x: x + 0.2, y: 1.6, w: 2.4, h: 0.5, fontSize: 20, bold: true, color: C.accent1 });
  T(s, d, { x: x + 0.2, y: 2.2, w: 2.4, h: 1.6, fontSize: 14 });
});
T(s, "Cada extra segue as mesmas regras: previsão antes, mesmo protocolo, registro no diário.", { x: 0.5, y: 3.6, w: 9.0, h: 0.5, fontSize: 14, color: C.text2, italic: true });
s.addNotes("Os extras não substituem A e B: só depois do núcleo completo.");

// ---------- 16. Fechamento ----------
pres.addSection({ title: "Fechamento" });
s = pres.addSlide({ masterName: "CAPA", sectionTitle: "Fechamento" });
s.addText("Por onde começar", { placeholder: "title" });
s.addText("docs/ESCOPO_E_ATIVIDADES.md: este conteúdo, com checklists e o relatório (4.5)\ndocs/QUICKSTART.md: os comandos, passo a passo\ndocs/PLANO_TESTE_DE_CARGA.md: o método e o relatório\ndocs/ARCH_A_vs_ARCH_B.md: a infraestrutura e o porquê", { placeholder: "body" });
s.addNotes("Próximo passo imediato: Etapa 0, a preparação. No fim, a decisão de arquitetura é de vocês, com dados.");

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("ok", OUT);
})();
