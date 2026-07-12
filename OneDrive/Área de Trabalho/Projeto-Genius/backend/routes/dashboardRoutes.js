// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db_conexao');
const Notebook = require('../models/Notebook');
const Emprestimo = require('../models/Emprestimo');
const { autenticarToken, apenasAdmin } = require('../middlewares/authMiddleware');

router.get('/api/estatisticas', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebooks = await Notebook.findAll(); 
        let disponiveis = 0, emprestados = 0, desativados = 0; 
        notebooks.forEach(n => {
            if (n.status === 'disponivel') disponiveis++;
            else if (n.status === 'emprestado') emprestados++;
            else if (n.status === 'desativado') desativados++;
        });
        res.status(200).json({ totalCadastrados: notebooks.length, disponiveis, emprestados, desativados });
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});

router.get('/api/dashboard-operacional', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const pendentesRes = await db.query("SELECT COUNT(*) FROM usuarios WHERE status_aprovacao = 'pendente'");
        const atrasadosRes = await db.query("SELECT COUNT(*) FROM emprestimos WHERE status = 'ativo' AND data_devolucao_prevista < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')");
        const proximasRes = await db.query(`
            SELECT e.id, e.data_devolucao_prevista, u.nome, n.tombamento,
                   (e.data_devolucao_prevista < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')) AS is_atrasado
            FROM emprestimos e JOIN usuarios u ON e.usuario_id = u.id JOIN notebooks n ON e.notebook_id = n.id
            WHERE e.status = 'ativo' ORDER BY e.data_devolucao_prevista ASC LIMIT 5
        `);
        res.status(200).json({ pendentes: parseInt(pendentesRes.rows[0].count), atrasados: parseInt(atrasadosRes.rows[0].count), proximasDevolucoes: proximasRes.rows });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.get('/api/atividade-semana', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const data = [0, 0, 0, 0, 0]; 
        const atividadeDoBanco = await Emprestimo.getAtividadeSemana(); 
        atividadeDoBanco.forEach(item => {
            const diaIndex = parseInt(item.dia_semana) - 1;
            if (diaIndex >= 0 && diaIndex < 5) data[diaIndex] = parseInt(item.contagem);
        });
        res.status(200).json({ labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], data });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

module.exports = router;
