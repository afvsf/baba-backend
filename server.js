const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = new Database('baba.db');;


// Jogadores
app.get('/jogadores', (req, res) => {
  const rows = db.prepare("SELECT * FROM jogadores").all();
  res.json(rows);
});

app.post('/jogadores', (req, res) => {
  const { id, nome, tipo } = req.body;

  db.prepare(`
    INSERT INTO jogadores (id, nome, tipo)
    VALUES (?, ?, ?)
  `).run(id, nome, tipo);

  res.sendStatus(200);
});

// Registrar participação
app.post('/registro', (req, res) => {
  const { data, jogadorId, gols, cartoes, obs } = req.body;

  db.prepare(`
    INSERT INTO registros (data, jogadorId, gols, cartoes, obs)
    VALUES (?, ?, ?, ?, ?)
  `).run(data, jogadorId, gols, cartoes, obs);

  res.sendStatus(200);
});

// Buscar registros
app.get('/registros', (req,res)=>{
  db.all('SELECT * FROM registros', [], (err,rows)=>{
    res.json(rows);
  });
});

// Mensalidades
app.post('/mensalidade', (req, res) => {
  const { mes, jogadorId } = req.body;

  db.prepare(`
    INSERT INTO mensalidades (mes, jogadorId)
    VALUES (?, ?)
  `).run(mes, jogadorId);

  res.sendStatus(200);
});

app.get('/mensalidades', (req,res)=>{
  db.all('SELECT * FROM mensalidades', [], (err,rows)=>{
    res.json(rows);
  });
});

// Gastos
app.post('/gasto', (req, res) => {
  const { data, desc, valor } = req.body;

  db.prepare(`
    INSERT INTO gastos (data, desc, valor)
    VALUES (?, ?, ?)
  `).run(data, desc, valor);

  res.sendStatus(200);
});

app.get('/gastos', (req,res)=>{
  db.all('SELECT * FROM gastos', [], (err,rows)=>{
    res.json(rows);
  });
});

// ===== START =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>{
  console.log("Servidor rodando");
});

