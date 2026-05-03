const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// 🔥 CAPTURA ERROS GLOBAIS
process.on('uncaughtException', err => {
  console.error('❌ Erro não tratado:', err);
});

process.on('unhandledRejection', err => {
  console.error('❌ Promise rejeitada:', err);
});

const app = express();

// 🔥 CORS LIBERADO (GitHub Pages + local)
app.use(cors({
  origin: [
    'https://afvsf.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// 🔥 LIMITE MAIOR (resolve 413)
app.use(express.json({ limit: '10mb' }));

const SECRET = 'baba_super_secreto_123';

// 🔐 LOGIN
app.post('/login', async (req,res)=>{

  const { usuario, senha } = req.body;

  // 👉 usuário fixo (pode evoluir depois)
  const usuarioPadrao = 'admin';
  const senhaHash = await bcrypt.hash('123456', 10);

  if(usuario !== usuarioPadrao){
    return res.status(401).json({erro:'Usuário inválido'});
  }

  const senhaOk = await bcrypt.compare(senha, senhaHash);

  if(!senhaOk){
    return res.status(401).json({erro:'Senha inválida'});
  }

  const token = jwt.sign({usuario}, SECRET, {expiresIn:'8h'});

  res.json({token});
});

 // 👉 FUNÇÃO VERIFICAR O TOKEN
function verificarToken(req,res,next){

  const auth = req.headers.authorization;

  if(!auth){
    return res.status(401).json({erro:'Sem token'});
  }

  const token = auth.split(' ')[1];

  try{
    jwt.verify(token, SECRET);
    next();
  }catch{
    res.status(401).json({erro:'Token inválido'});
  }
}

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
    dataCadastro DATE,
    foto TEXT,
    aceitou_regulamento BOOLEAN
    
  );
`);

 await pool.query(`
    ALTER TABLE jogadores
    ADD COLUMN IF NOT EXISTS aceitou_regulamento BOOLEAN DEFAULT false;
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

// 1. Remove default antigo (0 ou 1)
await pool.query(`
  ALTER TABLE registros
  ALTER COLUMN confirmado DROP DEFAULT;
`);

// 2. Converte para boolean
await pool.query(`
  ALTER TABLE registros
  ALTER COLUMN confirmado TYPE BOOLEAN
  USING (confirmado = 1);
`);

// 3. Define novo default
await pool.query(`
  ALTER TABLE registros
  ALTER COLUMN confirmado SET DEFAULT false;
`);

  // 🔥 INDEX ÚNICO (ANTI DUPLICAÇÃO)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS unico_registro
    ON registros (data, jogadorId);
  `);

    await pool.query(`
  CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    data_baba DATE
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

app.get('/config', async (req,res)=>{

  const { rows } = await pool.query('SELECT * FROM config LIMIT 1');

  if(rows.length === 0){
    return res.json({ data_baba: null });
  }

  res.json(rows[0]);
});

app.put('/config', verificarToken, async (req,res)=>{

  const { data_baba } = req.body;

  const { rows } = await pool.query('SELECT * FROM config LIMIT 1');

  if(rows.length === 0){

    await pool.query(`
      INSERT INTO config (data_baba)
      VALUES ($1)
    `,[data_baba]);

  }else{

    await pool.query(`
      UPDATE config
      SET data_baba = $1
      WHERE id = $2
    `,[data_baba, rows[0].id]);
  }

  res.json({ok:true});
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
  let { id, nome, apelido, posicao, telefone, tipo, dataCadastro, foto } = req.body;

  try {
    dataCadastro = formatarData(dataCadastro);

    await pool.query(`
      INSERT INTO jogadores (id, nome, apelido, posicao, telefone, tipo, dataCadastro, foto)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [id, nome, apelido, posicao, telefone, tipo, dataCadastro, foto]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/jogadores/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  let { nome, apelido, posicao, telefone, tipo, dataCadastro, foto } = req.body;

  try {
    dataCadastro = formatarData(dataCadastro);

    await pool.query(`
      UPDATE jogadores
      SET nome=$1, apelido=$2, posicao=$3, telefone=$4, tipo=$5, dataCadastro=$6, foto=$7
      WHERE id=$8
    `, [nome, apelido, posicao, telefone, tipo, dataCadastro, foto, id]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/jogadores/:id', verificarToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM jogadores WHERE id = $1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/aceitar-regulamento/:id', async (req,res)=>{

  const { id } = req.params;

  try{
    await pool.query(`
      UPDATE jogadores
      SET aceitou_regulamento = true
      WHERE id = $1
    `,[id]);

    res.json({ok:true});

  }catch(err){
    res.status(500).json({erro:err.message});
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
  let { data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento, confirmado } = req.body;

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
          obs = $5,
          confirmado = $6
        WHERE data = $7 AND jogadorId = $8
      `, [
        gols,
        cartao_amarelo,
        cartao_azul,
        cartao_vermelho,
        obs,
        confirmado,
        data,
        jogadorId  
        
      ]);

      return res.json({ mensagem: "♻️ Atualizado com sucesso" });
    }

    // 🆕 INSERT NORMAL
    await pool.query(`
      INSERT INTO registros (data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento, confirmado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, pagamento, confirmado ]);

    res.json({ mensagem: "✅ Registrado com sucesso" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

app.put('/registro/:id', verificarToken, async (req, res) => {
  const { id } = req.params;

  let { data, jogadorId, gols, cartao_amarelo, cartao_azul, cartao_vermelho, obs, confirmado } = req.body;

  try {
    data = formatarData(data);

    await pool.query(`
      UPDATE registros
      SET data=$1, jogadorId=$2, gols=$3,
          cartao_amarelo=$4, cartao_azul=$5, confirmado=$6, cartao_vermelho=$7, obs=$8
      WHERE id=$9
    `, [
      data,
      jogadorId,
      gols || 0,
      cartao_amarelo || 0,
      cartao_azul || 0,
      cartao_vermelho || 0,
      confirmado || 0,
      obs,
      id
    ]);

    res.sendStatus(200);

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/registro/:id', verificarToken, async (req, res) => {
  try {
    await pool.query("DELETE FROM registros WHERE id = $1", [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.put('/registros/confirmar/:id', verificarToken, async (req, res) => {

  const { id } = req.params;

  try{
    await pool.query(`
      UPDATE registros
      SET confirmado = true
      WHERE id = $1
    `,[id]);

    res.json({ok:true});

  }catch(err){
    res.status(500).json({erro: err.message});
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

app.post('/mensalidades', verificarToken, async (req, res) => {
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

app.post('/gastos', verificarToken, async (req, res) => {
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

app.put('/gastos/:id', verificarToken, async (req, res) => {

  const { id } = req.params;
  const { data, descricao, valor } = req.body;

  try{
    const result = await pool.query(`
      UPDATE gastos
      SET data = $1,
          descricao = $2,
          valor = $3
      WHERE id = $4
      RETURNING *
    `,[data, descricao, valor, id]);

    res.json(result.rows[0]);

  }catch(err){
    console.error(err);
    res.status(500).json({erro:'Erro ao atualizar gasto'});
  }
});

app.delete('/gastos/:id', verificarToken, async (req, res) => {

  const { id } = req.params;

  try{
    await pool.query(`
      DELETE FROM gastos WHERE id = $1
    `,[id]);

    res.json({ok:true});

  }catch(err){
    console.error(err);
    res.status(500).json({erro:'Erro ao excluir gasto'});
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
