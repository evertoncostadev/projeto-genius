// backend/server.js
require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit'); // Nova biblioteca

if (!process.env.JWT_SECRET) {
    console.error("ERRO CRÍTICO: JWT_SECRET não configurado no ficheiro .env!");
    process.exit(1); 
}

const db = require('./db_conexao');
const EmailService = require('./services/emailService');
const { autenticarToken, apenasAdmin } = require('./middlewares/authMiddleware');

const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const notebookRoutes = require('./routes/notebookRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 🚨 RESOLUÇÃO DO PONTO 1: Proteção contra Força Bruta (Brute Force/DDoS)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Limite de 10 tentativas por IP
    message: { message: 'Muitas tentativas de acesso. Por segurança, aguarde 15 minutos para tentar novamente.' }
});

// Aplica o escudo apenas nas rotas de autenticação
app.use('/api/login', loginLimiter);
app.use('/api/esqueci-senha', loginLimiter);


// 🚨 RESOLUÇÃO DO PONTO 4: Rota de ficheiros blindada contra Directory Traversal
app.get('/uploads/:filename', autenticarToken, apenasAdmin, (req, res) => {
    // path.basename() arranca qualquer tentativa de "../" do nome do ficheiro
    const safeFilename = path.basename(req.params.filename); 
    const filePath = path.join(__dirname, 'uploads', safeFilename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Ficheiro não encontrado.' });
    }
});

// Registar Rotas
app.use('/', authRoutes);
app.use('/', usuarioRoutes);
app.use('/', notebookRoutes);
app.use('/', emprestimoRoutes);
app.use('/', dashboardRoutes);

app.use((err, req, res, next) => {
    if (err.message && err.message.includes('Formato de arquivo inválido')) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

// Cron Job (Robô de e-mails com delay antibloqueio)
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] A verificar empréstimos atrasados...');
    try {
        const query = `
            SELECT e.*, u.nome, u.email, n.tombamento 
            FROM emprestimos e JOIN usuarios u ON e.usuario_id = u.id JOIN notebooks n ON e.notebook_id = n.id
            WHERE e.status = 'ativo' AND e.data_devolucao_prevista < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') AND e.notificacao_atraso_enviada = false
        `;
        const atrasados = await db.query(query);

        for (const emp of atrasados.rows) {
            const usuario = { nome: emp.nome, email: emp.email };
            const notebook = { tombamento: emp.tombamento };
            
            await EmailService.enviarCobrancaAtraso(usuario, notebook, emp);
            await db.query('UPDATE emprestimos SET notificacao_atraso_enviada = true WHERE id = $1', [emp.id]);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) { console.error('[CRON Erro]:', error.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Servidor protegido a correr na porta ${PORT}`); });
