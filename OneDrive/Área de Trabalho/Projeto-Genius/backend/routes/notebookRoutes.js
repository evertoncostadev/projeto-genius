// backend/routes/notebookRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db_conexao');
const Notebook = require('../models/Notebook');
const { autenticarToken, apenasAdmin } = require('../middlewares/authMiddleware');

router.post('/notebooks', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const novoNotebook = await Notebook.create(req.body); 
        res.status(201).json({ message: 'Notebook cadastrado com sucesso!', notebook: novoNotebook });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/notebooks', autenticarToken, apenasAdmin, async (req, res) => {
    try { res.status(200).json(await Notebook.findAll()); } 
    catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.get('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try { res.status(200).json(await Notebook.findById(parseInt(req.params.id))); } 
    catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/api/notebooks/:id/historico', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const noteQuery = await db.query("SELECT * FROM notebooks WHERE id = $1", [notebookId]);
        if (noteQuery.rows.length === 0) return res.status(404).json({ message: 'Não encontrado.' });
        
        const empQuery = await db.query(`
            SELECT e.*, u.nome as nome_aluno, u.matricula 
            FROM emprestimos e JOIN usuarios u ON e.usuario_id = u.id 
            WHERE e.notebook_id = $1 ORDER BY e.data_emprestimo DESC
        `, [notebookId]);
        
        res.status(200).json({ notebook: noteQuery.rows[0], ativo: empQuery.rows.find(e => e.status === 'ativo'), historico: empQuery.rows });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.put('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const nAntigo = await Notebook.findById(notebookId);
        await Notebook.update(notebookId, { ...req.body, status: nAntigo.status }); 
        res.status(200).json({ message: 'Notebook atualizado!' });
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const nId = parseInt(req.params.id);
        const n = await Notebook.findById(nId); 
        if (n.status === 'emprestado') return res.status(403).json({ message: 'Notebook está emprestado.' });
        await Notebook.delete(nId); 
        res.status(200).json({ message: 'Deletado.' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.patch('/notebooks/:id/status', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const nId = parseInt(req.params.id);
        const n = await Notebook.findById(nId); 
        if (n.status === 'emprestado') return res.status(403).json({ message: 'Notebook está emprestado.' });
        await Notebook.updateStatus(nId, (n.status === 'disponivel') ? 'desativado' : 'disponivel'); 
        res.status(200).json({ message: `Status alterado!` });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
