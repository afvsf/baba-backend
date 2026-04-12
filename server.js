const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors({
  origin: '*'
}));

function formatarData(data){
  if(!data) return null;

  // remove timezone
  if(data.includes('T')){
    return data.split('T')[0];
  }

  // converte dd/mm/yyyy → yyyy-mm-dd
  if(data.includes('/')){
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  return data;
}

// 🔥 CONEXÃO POSTGRES (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== INIT DB + MIGRATION =====
async function initDB() {
 
  // 👤 JOGADORES
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

  // ⚽ REGISTROS (estrutura base)
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

  // 🔥 MIGRATION AUTOMÁTICA (cartões novos)
  await pool.query(`
    ALTER TABLE registros 
    ADD COLUMN IF NOT EXISTS cartao_amarelo INTEGER DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE registros 
    ADD COLUMN IF NOT EXISTS cartao_azul INTEGER DEFAULT 0;
  `);

  await pool.query(`
    ALTER TABLE registros 
    ADD COLUMN IF NOT EXISTS cartao_vermelho INTEGER DEFAULT 0;
  `);

  // 💰 MENSALIDADES
  await pool.query(`
    CREATE TABLE IF NOT EXISTS mensalidades (
      id SERIAL PRIMARY KEY,
      mes TEXT,
      jogadorId TEXT,
      valor REAL,
      data DATE
    );
  `);

  // 💸 GASTOS
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gastos (
      id SERIAL PRIMARY KEY,
      data TEXT,
      descricao TEXT,
      valor REAL
    );
  `);

  console.log("✅ Banco atualizado (migration OK)");
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
  let { id, nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {

    // 🔥 CORREÇÃO DATA
    if(dataCadastro){
      dataCadastro = formatarData(dataCadastro);
    }

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
  let { nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {

    // 🔥 CORREÇÃO DATA
    if(dataCadastro){
      dataCadastro = formatarData(dataCadastro);
    }

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
  let { data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento } = req.body;

  try {

    data = formatarData(data);

    await pool.query(`
      INSERT INTO registros (data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/registro/:id', async (req, res) => {
  const { id } = req.params;

  let {
    data,
    jogadorId,
    gols,
    cartao_amarelo,
    cartao_azul,
    cartao_vermelho,
    obs
  } = req.body;

  try {

    data = formatarData(data);

    await pool.query(`
      UPDATE registros
      SET 
        data = $1,
        jogadorId = $2,
        gols = $3,
        cartao_amarelo = $4,
        cartao_azul = $5,
        cartao_vermelho = $6,
        obs = $7
      WHERE id = $8
    `, [
      data,
      jogadorId,
      gols,
      cartao_amarelo,
      cartao_azul,
      cartao_vermelho,
      obs,
      id
    ]);

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
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
        : null,
      dataISO: r.data
        ? r.data.toISOString().split('T')[0]
        : null
    }));

    res.json(formatado);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});;

app.post('/mensalidades', async (req, res) => {
  let { mes, jogadorId, valor, data } = req.body;

  try {

    data = formatarData(data);

    if(!data){
      const hoje = new Date();
      data = hoje.toISOString().split('T')[0];
    }

    valor = Number(valor || 20);

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

app.post('/gasto', async (req, res) => {
  let { data, descricao, valor } = req.body;

  try {

    data = formatarData(data);
    valor = Number(valor);

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
  console.log("Servidor rodando");
});
