const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = new sqlite3.Database('./baba.db');


// Jogadores
app.get('/jogadores', (req,res)=>{
  db.all('SELECT * FROM jogadores', [], (err,rows)=>{
    res.json(rows);
  });
});

app.post('/jogadores', (req,res)=>{
  const {id,nome,tipo} = req.body;
  db.run('INSERT INTO jogadores VALUES (?,?,?)',[id,nome,tipo]);
  res.json({ok:true});
});

// Registrar participação
app.post('/registro', (req,res)=>{
  const {data,jogadorId,gols,cartoes,obs} = req.body;
  db.run(
    'INSERT INTO registros (data,jogadorId,gols,cartoes,obs) VALUES (?,?,?,?,?)',
    [data,jogadorId,gols,cartoes,obs]
  );
  res.json({ok:true});
});

// Buscar registros
app.get('/registros', (req,res)=>{
  db.all('SELECT * FROM registros', [], (err,rows)=>{
    res.json(rows);
  });
});

// Mensalidades
app.post('/mensalidade', (req,res)=>{
  const {mes,jogadorId} = req.body;
  db.run('INSERT INTO mensalidades (mes,jogadorId) VALUES (?,?)',[mes,jogadorId]);
  res.json({ok:true});
});

app.get('/mensalidades', (req,res)=>{
  db.all('SELECT * FROM mensalidades', [], (err,rows)=>{
    res.json(rows);
  });
});

// Gastos
app.post('/gasto', (req,res)=>{
  const {data,desc,valor} = req.body;
  db.run('INSERT INTO gastos (data,desc,valor) VALUES (?,?,?)',[data,desc,valor]);
  res.json({ok:true});
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

