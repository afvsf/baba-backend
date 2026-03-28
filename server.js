const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 CONEXÃO POSTGRES (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== INIT DB =====
async function initDB() {

  // 🔥 recria tudo (use só enquanto estiver em desenvolvimento)
  await pool.query(`DROP TABLE IF EXISTS gastos;`);
  await pool.query(`DROP TABLE IF EXISTS mensalidades;`);
  await pool.query(`DROP TABLE IF EXISTS registros;`);
  await pool.query(`DROP TABLE IF EXISTS jogadores;`);

  await pool.query(`
    CREATE TABLE jogadores (
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
    CREATE TABLE registros (
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
    CREATE TABLE mensalidades (
      id SERIAL PRIMARY KEY,
      mes TEXT,
      jogadorId TEXT,
      valor REAL,
      data DATE DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE gastos (
      id SERIAL PRIMARY KEY,
      data TEXT,
      descricao TEXT,
      valor REAL
    );
  `);

  console.log("✅ Banco PostgreSQL pronto");
}

initDB();


// =============================
// 👤 JOGADORES
// =============================

app.get('/jogadores', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM jogadores ORDER BY nome");
    res.json(rows);
  } catch (err) {
    console.error(err);
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
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/jogadores/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM jogadores WHERE id = $1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});


// =============================
// ⚽ REGISTROS
// =============================

app.get('/registros', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM registros");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

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


// =============================
// 💰 MENSALIDADES (PRO)
// =============================

app.get('/mensalidades', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM mensalidades");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/mensalidades', async (req, res) => {
  const { mes, jogadorId, valor, data } = req.body;

  try {
    const existe = await pool.query(
      `SELECT id FROM mensalidades WHERE mes = $1 AND jogadorId = $2`,
      [mes, jogadorId]
    );

    if (existe.rows.length === 0) {
      await pool.query(`
        INSERT INTO mensalidades (mes, jogadorId, valor, data)
        VALUES ($1,$2,$3,$4)
      `, [
        mes,
        jogadorId,
        valor || 20,
        data || new Date().toISOString().slice(0,10)
      ]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});


// =============================
// 💸 GASTOS
// =============================

app.get('/gastos', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM gastos");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

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


// =============================
// 🚀 START
// =============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("🚀 Servidor rodando PostgreSQL");
});
