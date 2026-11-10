// Teste de carga do chatbot — Projeto Nuvem 2026
// Uso (normalmente via rodar_cenario.sh):
//   k6 run -e URL=http://... -e SENHA=... -e VUS=4 -e ITERACOES=4 carga.js   (4 usuários × 4 perguntas)
// Aquecimento (tempo fixo): k6 run -e URL=... -e SENHA=... -e VUS=2 -e DURACAO=30s carga.js
// Preenchimento do histórico (uma vez só):
//   k6 run -e URL=http://... -e SENHA=... -e VUS=16 -e ITERACOES=3 carga.js
//
// Cada usuário virtual (VU) faz login uma vez como alunoNN e depois envia perguntas
// em sequência, com 1 s de pausa entre elas (modelo "fechado": N usuários sempre ativos).

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import exec from 'k6/execution';

const URL = __ENV.URL;
const SENHA = __ENV.SENHA;

// Perguntas FIXAS: as mesmas em todos os cenários e repetições
const PERGUNTAS = [
  'Qual a frequência mínima para ser aprovado?',
  'Quantas vagas o curso oferece?',
  'O estágio é obrigatório?',
  'Quais disciplinas tem no 3º período?',
  'Como funciona a recuperação paralela?',
  'Qual a duração do curso?',
  'O que se estuda em Segurança Ofensiva?',
  'Onde são as aulas?',
];

// Métricas próprias (em milissegundos)
const latencia = new Trend('latencia_chat', true);   // tempo total visto pelo usuário
const prefill = new Trend('tempo_prefill', true);    // modelo lendo o prompt
const geracao = new Trend('tempo_geracao', true);    // modelo escrevendo a resposta
const fila = new Trend('tempo_fila_e_rede', true);   // o resto: espera na fila + rede + banco
const sucesso = new Rate('sucesso_chat');

// Modo medição e preenchimento (ITERACOES definido): cada usuário envia exatamente ITERACOES perguntas.
// Modo aquecimento (sem ITERACOES): N usuários por um tempo fixo (DURACAO).
const passo = __ENV.ITERACOES
  ? { executor: 'per-vu-iterations', vus: Number(__ENV.VUS || 1), iterations: Number(__ENV.ITERACOES), maxDuration: '60m' }
  : {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 1),
      duration: __ENV.DURACAO || '3m',
      gracefulStop: '25m', // perguntas iniciadas antes do fim terminam e são contadas (deve ser > timeout)
    };

export const options = {
  scenarios: { passo },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max', 'count'],
};

let token = null; // cada VU guarda o seu próprio token

function login() {
  const usuario = 'aluno' + String(exec.vu.idInTest).padStart(2, '0');
  const res = http.post(`${URL}/api/login`, JSON.stringify({ username: usuario, password: SENHA }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login' },
  });
  if (res.status !== 200) throw new Error(`login de ${usuario} falhou: ${res.status}`);
  return res.json('token');
}

export default function () {
  if (!token) token = login();

  const i = (exec.vu.iterationInScenario + exec.vu.idInTest) % PERGUNTAS.length;
  const res = http.post(`${URL}/api/chat`, JSON.stringify({ message: PERGUNTAS[i] }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    timeout: '1200s', // alto de propósito: saturação deve aparecer como latência, não como erro
    tags: { name: 'chat' },
  });

  const ok = check(res, { 'status 200': (r) => r.status === 200 });
  sucesso.add(ok);
  if (ok) {
    const b = res.json();
    latencia.add(res.timings.duration);
    prefill.add(b.prompt_ms);
    geracao.add(b.generate_ms);
    fila.add(Math.max(0, res.timings.duration - b.prompt_ms - b.generate_ms));
  }
  sleep(1);
}
