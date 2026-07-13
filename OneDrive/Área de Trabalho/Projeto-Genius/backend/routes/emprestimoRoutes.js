// backend/routes/emprestimoRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db_conexao');
const bcrypt = require('bcrypt');
const Emprestimo = require('../models/Emprestimo');
const Notebook = require('../models/Notebook');
const Usuario = require('../models/Usuario');
const EmailService = require('../services/emailService');
const { autenticarToken, apenasAdmin } = require('../middlewares/authMiddleware');

router.get('/api/emprestimo-dados', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const ativos = await db.query("SELECT usuario_id FROM emprestimos WHERE status = 'ativo'");
        const userSet = new Set(ativos.rows.map(e => e.usuario_id));
        const usuarios = (await Usuario.findAlunosAtivos()).filter(u => !userSet.has(u.id));
        const notebooks = (await Notebook.findAll()).filter(n => n.status === 'disponivel').map(n => ({ id: n.id, tombamento: n.tombamento, numero_serie: n.numero_serie }));
        res.status(200).json({ usuarios, notebooks });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.post('/emprestimos', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const { usuarioId, notebookId, senha_aluno, ...outrosDados } = req.body;
        
        const usuario = (await db.query("SELECT * FROM usuarios WHERE id = $1", [parseInt(usuarioId)])).rows[0];
        if (!usuario || !usuario.ativo || usuario.tipo_conta !== 'comum') return res.status(400).json({ message: 'Utilizador inválido.' });

        const senhaValida = await bcrypt.compare(senha_aluno, usuario.senha);
        if (!senhaValida) return res.status(401).json({ message: 'Senha do aluno incorreta! Empréstimo não autorizado.' });
        
        if (await Emprestimo.findActiveByUsuario(parseInt(usuarioId))) return res.status(409).json({ message: 'Já possui empréstimo ativo.' });
        
        // 🚨 RESOLUÇÃO DO PONTO 2: Atualização Atómica (Bloqueia Race Condition)
        // O sistema tenta reservar a máquina no banco. Se 2 pessoas clicarem juntas, só 1 consegue.
        const updateNotebook = await db.query(
            "UPDATE notebooks SET status = 'emprestado' WHERE id = $1 AND status = 'disponivel' RETURNING *",
            [parseInt(notebookId)]
        );

        if (updateNotebook.rows.length === 0) {
            return res.status(409).json({ message: 'Este notebook já foi emprestado ou está indisponível neste exato momento!' });
        }
        
        // Só cria o histórico se a reserva da máquina tiver dado certo
        const notebookReservado = updateNotebook.rows[0];
        const novoEmp = await Emprestimo.create({ usuarioId, notebookId, ...outrosDados }); 
        
        EmailService.enviarConfirmacaoEmprestimo(usuario, notebookReservado, novoEmp);
        res.status(201).json({ message: 'Sucesso' });
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});

router.get('/emprestimos', autenticarToken, apenasAdmin, async (req, res) => {
    try { res.status(200).json(await Emprestimo.findAllPopulado(req.query.status)); } 
    catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.patch('/emprestimos/:id/encerrar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const empId = parseInt(req.params.id);
        const empEncerrado = await Emprestimo.encerrar(empId, req.body.observacoesDevolucao); 
        await Notebook.updateStatus(empEncerrado.notebook_id, 'disponivel'); 
        const u = await Usuario.findById(empEncerrado.usuario_id);
        const n = await Notebook.findById(empEncerrado.notebook_id);
        EmailService.enviarConfirmacaoDevolucao(u, n, req.body.observacoesDevolucao);
        res.status(200).json({ message: 'Devolução registrada.' });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.delete('/emprestimos/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const empId = parseInt(req.params.id);
        const emp = await Emprestimo.findById(empId); 
        if (emp.status === 'ativo') await Notebook.updateStatus(emp.notebook_id, 'disponivel'); 
        await Emprestimo.delete(empId); 
        res.status(200).json({ message: 'Excluído.' });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

module.exports = router;
