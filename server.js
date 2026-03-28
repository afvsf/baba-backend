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

// ===== INIT DB =====
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
      data DATE DEFAULT NOW()
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
app.get('/jogadores', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM jogadores");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/jogadores', async (req, res) => {
  const { id, nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {
    await pool.query(`
      INSERT INTO jogadores (id, nome, apelido, posicao, telefone, tipo, dataCadastro)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [id, nome, apelido, posicao, telefone, tipo, dataCadastro]);

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// DELETE jogador
app.delete('/jogadores/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM jogadores WHERE id = $1", [id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


// ===== REGISTROS =====
app.post('/registro', async (req, res) => {
  const { data, jogadorId, gols, cartoes, obs, pagamento } = req.body;

  try {
    await pool.query(`
      INSERT INTO registros (data, jogadorId, gols, cartoes, obs, pagamento)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [data, jogadorId, gols, cartoes, obs, pagamento]);

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/registros', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM registros");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


// ===== MENSALIDADES =====
app.post('/mensalidades', async (req, res) => {
  const { mes, jogadorId, valor, data } = req.body;

  try {
    const existe = await pool.query(
      `SELECT * FROM mensalidades WHERE mes = $1 AND jogadorId = $2`,
      [mes, jogadorId]
    );

    if (existe.rows.length === 0) {
  await pool.query(
  `INSERT INTO mensalidades (mes, jogadorId, valor, data)
   VALUES ($1, $2, $3, $4)`,
  [
    mes,
    jogadorId,
    valor || 20,
    data || new Date().toISOString().slice(0,10) // 🔥 CORREÇÃO
  ]
);

 res.sendStatus(200); // ✅ agora fora do IF
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

app.get('/mensalidades', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM mensalidades");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


// ===== GASTOS =====
app.post('/gasto', async (req, res) => {
  const { data, descricao, valor } = req.body;

  try {
    await pool.query(`
      INSERT INTO gastos (data, descricao, valor)
      VALUES ($1,$2,$3)
    `, [data, descricao, valor]);

    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/gastos', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM gastos");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});


// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando PostgreSQL");
});
