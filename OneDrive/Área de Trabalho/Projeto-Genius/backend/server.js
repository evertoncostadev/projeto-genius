// backend/server.js
require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

// 🚨 Verificação Crítica de Segurança (Resolvendo Erro 1B)
if (!process.env.JWT_SECRET) {
    console.error("ERRO CRÍTICO: JWT_SECRET não configurado no arquivo .env!");
    process.exit(1); 
}

const db = require('./db_conexao');
const EmailService = require('./services/emailService');
const { autenticarToken, apenasAdmin } = require('./middlewares/authMiddleware');

// Importando as Rotas MVC
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const notebookRoutes = require('./routes/notebookRoutes');
const emprestimoRoutes = require('./routes/emprestimoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 🚨 ROTA BLINDADA DE ARQUIVOS (Resolvendo Erro 1A)
app.get('/uploads/:filename', autenticarToken, apenasAdmin, (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: 'Arquivo não encontrado.' });
    }
});

// Registrando as Rotas
app.use('/', authRoutes);
app.use('/', usuarioRoutes);
app.use('/', notebookRoutes);
app.use('/', emprestimoRoutes);
app.use('/', dashboardRoutes);

// Tratamento de erros de upload global
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('Formato de arquivo inválido')) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

// 🚀 ROBÔ DE VERIFICAÇÃO DE ATRASOS (Com Delay Antibloqueio)
cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Verificando empréstimos atrasados...');
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
            
            // Delay de 2 segundos para o Gmail não bloquear a conta por Spam (Resolvendo Erro 4B)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (error) { console.error('[CRON Erro]:', error.message); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`🚀 Servidor protegido rodando na porta ${PORT}`); });
