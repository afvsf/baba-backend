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
      valor REAL,
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

// UPDATE jogador
app.put('/jogadores/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {
    await pool.query(`
      UPDATE jogadores
      SET nome=$1, apelido=$2, posicao=$3, telefone=$4, tipo=$5, dataCadastro=$6
      WHERE id=$7
    `, [nome, apelido, posicao, telefone, tipo, dataCadastro, id]);

    res.sendStatus(200);
  } catch (err) {
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

    const formatado = rows.map(r => ({
      ...r,
      dataFormatada: r.data
        ? r.data.toISOString().split('T')[0].split('-').reverse().join('/')
        : null
    }));

    res.json(formatado);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/mensalidades', async (req, res) => {
  let { mes, jogadorId, valor, data } = req.body;

  try {

    // 🔥 GARANTIR DATA SEM TIMEZONE
    if(data){
      data = data.split('T')[0]; // mantém só YYYY-MM-DD
    } else {
      data = new Date().toISOString().split('T')[0];
    }

    // 🔥 VALOR PADRÃO
    valor = Number(valor || 20);

    // 🔥 VERIFICAR SE JÁ EXISTE
    const existe = await pool.query(
      `SELECT id FROM mensalidades WHERE mes = $1 AND jogadorId = $2`,
      [mes, jogadorId]
    );

    if (existe.rows.length === 0) {

      await pool.query(`
        INSERT INTO mensalidades (mes, jogadorId, valor, data)
        VALUES ($1,$2,$3,$4)
      `, [mes, jogadorId, valor, data]);

    } else {

      // 🔥 SE JÁ EXISTE → ATUALIZA (MUITO IMPORTANTE)
      await pool.query(`
        UPDATE mensalidades
        SET valor = $1, data = $2
        WHERE mes = $3 AND jogadorId = $4
      `, [valor, data, mes, jogadorId]);

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
