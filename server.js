const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = new Database('baba.db');

// ===== CRIAR TABELAS =====
db.prepare(`
CREATE TABLE IF NOT EXISTS jogadores (
  id TEXT,
  nome TEXT,
  apelido TEXT,
  posicao TEXT,
  telefone TEXT,
  tipo TEXT,
  dataCadastro TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS registros (
  data TEXT,
  jogadorId TEXT,
  gols INTEGER,
  cartoes INTEGER,
  obs TEXT,
  pagamento TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS mensalidades (
  mes TEXT,
  jogadorId TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS gastos (
  data TEXT,
  desc TEXT,
  valor REAL
)
`).run();

// ===== JOGADORES =====
app.get('/jogadores', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM jogadores").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/jogadores', (req, res) => {
  const { id, nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  db.prepare(`
    INSERT INTO jogadores (id, nome, apelido, posicao, telefone, tipo, dataCadastro)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, nome, apelido, posicao, telefone, tipo, dataCadastro);

  res.sendStatus(200);
});

// ===== REGISTROS =====
app.post('/registro', (req, res) => {
  const { data, jogadorId, gols, cartoes, obs, pagamento } = req.body;

  db.prepare(`
    INSERT INTO registros (data, jogadorId, gols, cartoes, obs, pagamento)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(data, jogadorId, gols, cartoes, obs, pagamento);

  res.sendStatus(200);
});

app.get('/registros', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM registros").all();
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar registros' });
  }
});

// ===== MENSALIDADES =====
app.post('/mensalidades', (req, res) => {
  const { mes, jogadorId } = req.body;

  const existe = db.prepare(`
    SELECT * FROM mensalidades WHERE mes = ? AND jogadorId = ?
  `).get(mes, jogadorId);

  if(!existe){
    db.prepare(`
      INSERT INTO mensalidades (mes, jogadorId)
      VALUES (?, ?)
    `).run(mes, jogadorId);
  }

  res.sendStatus(200);
});

app.get('/mensalidades', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM mensalidades").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ===== GASTOS =====
app.post('/gasto', (req, res) => {
  const { data, desc, valor } = req.body;

  db.prepare(`
    INSERT INTO gastos (data, desc, valor)
    VALUES (?, ?, ?)
  `).run(data, desc, valor);

  res.sendStatus(200);
});

app.get('/gastos', (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM gastos").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando");
});
