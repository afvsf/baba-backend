const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 conexão postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== CRIAR TABELAS =====
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jogadores (
      id TEXT PRIMARY KEY,
      nome TEXT,
      apelido TEXT,
      posicao TEXT,
      telefone TEXT,
      tipo TEXT,
      dataCadastro DATE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS registros (
      id SERIAL PRIMARY KEY,
      data TEXT,
      jogadorId TEXT,
      gols INTEGER,
      cartoes INTEGER,
      obs TEXT,
      pagamento TEXT
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensalidades (
      id SERIAL PRIMARY KEY,
      mes TEXT,
      jogadorId TEXT,
      data DATE
    );
  `);

await pool.query(`
  CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    data TEXT,
    descricao TEXT,
    valor REAL
  );
`);

  console.log("✅ Banco PostgreSQL pronto");
}

initDB();

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
  const { data, descricao, valor } = req.body;

  db.prepare(`
    INSERT INTO gastos (data, descricao, valor)
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

// DELETE jogador
app.delete('/jogadores/:id', (req, res) => {
  const { id } = req.params;

  db.prepare("DELETE FROM jogadores WHERE id = ?").run(id);

  res.sendStatus(200);
});


// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando PostgreSQL");
});


