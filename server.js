const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// 🔥 CAPTURA ERROS GLOBAIS
process.on('uncaughtException', err => {
  console.error('❌ Erro não tratado:', err);
});

process.on('unhandledRejection', err => {
  console.error('❌ Promise rejeitada:', err);
});

const app = express();

// 🔥 CORS LIBERADO (GitHub Pages + testes)
app.use(cors({
  origin: '*'
}));

app.use(express.json());

// ===== FORMATAR DATA =====
function formatarData(data){
  if(!data) return null;

  if(data.includes('T')){
    return data.split('T')[0];
  }

  if(data.includes('/')){
    const [dia, mes, ano] = data.split('/');
    return `${ano}-${mes}-${dia}`;
  }

  return data;
}

// ===== CONEXÃO POSTGRES =====
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===== INIT DB + MIGRATION =====
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
      gols INTEGER DEFAULT 0,
      cartao_amarelo INTEGER DEFAULT 0,
      cartao_azul INTEGER DEFAULT 0,
      cartao_vermelho INTEGER DEFAULT 0,
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

  console.log("✅ Banco OK + Migration aplicada");
}

app.get('/', (req, res) => {
  res.send('API OK 🚀');
});

// =============================
// 👤 JOGADORES
// =============================

app.get('/jogadores', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM jogadores ORDER BY nome");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/jogadores', async (req, res) => {
  let { id, nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {
    dataCadastro = formatarData(dataCadastro);

    await pool.query(`
      INSERT INTO jogadores (id, nome, apelido, posicao, telefone, tipo, dataCadastro)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
    `, [id, nome, apelido, posicao, telefone, tipo, dataCadastro]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/jogadores/:id', async (req, res) => {
  const { id } = req.params;
  let { nome, apelido, posicao, telefone, tipo, dataCadastro } = req.body;

  try {
    dataCadastro = formatarData(dataCadastro);

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

app.delete('/jogadores/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM jogadores WHERE id = $1", [req.params.id]);
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

    // 🔥 VERIFICA SE JÁ EXISTE
    const existe = await pool.query(
      `SELECT id FROM registros WHERE data = $1 AND jogadorId = $2`,
      [data, jogadorId]
    );

    if (existe.rows.length > 0) {

      // 🔄 UPDATE AUTOMÁTICO
      await pool.query(`
        UPDATE registros
        SET 
          gols = $1,
          cartao_amarelo = $2,
          cartao_azul = $3,
          cartao_vermelho = $4,
          obs = $5
        WHERE data = $6 AND jogadorId = $7
      `, [
        gols,
        cartao_amarelo,
        cartao_azul,
        cartao_vermelho,
        obs,
        data,
        jogadorId
      ]);

      return res.json({ mensagem: "♻️ Atualizado com sucesso" });
    }

    // 🆕 INSERT NORMAL
    await pool.query(`
      INSERT INTO registros (data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento]);

    res.json({ mensagem: "✅ Registrado com sucesso" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

app.put('/registro/:id', async (req, res) => {
  const { id } = req.params;

  let { data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs } = req.body;

  try {
    data = formatarData(data);

    await pool.query(`
      UPDATE registros
      SET data=$1, jogadorId=$2, gols=$3,
          cartao_amarelo=$4, cartao_azul=$5, cartao_vermelho=$6, obs=$7
      WHERE id=$8
    `, [
      data,
      jogadorId,
      gols || 0,
      cartao_amarelo || 0,
      cartao_azul || 0,
      cartao_vermelho || 0,
      obs,
      id
    ]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/registro/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM registros WHERE id = $1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// =============================
// 💰 MENSALIDADES
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
  let { mes, jogadorId, valor, data } = req.body;

  try {
    data = formatarData(data) || new Date().toISOString().split('T')[0];
    valor = Number(valor || 20);

    await pool.query(`
      INSERT INTO mensalidades (mes, jogadorId, valor, data)
      VALUES ($1,$2,$3,$4)
    `, [mes, jogadorId, valor, data]);

    res.sendStatus(200);

  } catch (err) {
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
// 🚀 START SERVER (CORRETO)
// =============================

async function startServer() {
  try {

    const PORT = process.env.PORT || 3000;

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log("🚀 Servidor rodando na porta " + PORT);
    });

    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;

    // 🔥 NÃO BLOQUEIA START
    initDB().then(() => {
      console.log("✅ Banco pronto");
    }).catch(err => {
      console.error("❌ Erro DB:", err);
    });

  } catch (err) {
    console.error("❌ ERRO AO INICIAR:", err);
  }
}

startServer();
