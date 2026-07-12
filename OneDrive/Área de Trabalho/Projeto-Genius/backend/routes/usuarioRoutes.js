// backend/routes/usuarioRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db_conexao');
const bcrypt = require('bcrypt');
const fs = require('fs');
const Usuario = require('../models/Usuario');
const Emprestimo = require('../models/Emprestimo');
const upload = require('../middlewares/uploadMiddleware');
const { autenticarToken, apenasAdmin } = require('../middlewares/authMiddleware');

router.get('/usuarios', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.id, u.nome, u.email, u.tipo_conta, u.ativo, u.matricula, u.cpf, u.curso, u.periodo, u.status_aprovacao, u.foto_perfil,
            EXISTS(SELECT 1 FROM emprestimos e WHERE e.usuario_id = u.id AND e.status = 'ativo') as tem_emprestimo
            FROM usuarios u 
            ORDER BY 
                EXISTS(SELECT 1 FROM emprestimos e WHERE e.usuario_id = u.id AND e.status = 'ativo') DESC,
                CASE WHEN u.status_aprovacao = 'pendente' THEN 1 ELSE 2 END ASC,
                u.id DESC
        `);
        const usuariosFiltrados = rows.filter(user => user.id !== 1);
        res.status(200).json(usuariosFiltrados);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/api/usuarios/:id/perfil', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const userQuery = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
        if (userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const usuario = userQuery.rows[0];
        delete usuario.senha; 

        const empQuery = await db.query(`
            SELECT e.*, n.tombamento, n.numero_serie 
            FROM emprestimos e 
            JOIN notebooks n ON e.notebook_id = n.id 
            WHERE e.usuario_id = $1 ORDER BY e.data_emprestimo DESC
        `, [userId]);
        
        const ativo = empQuery.rows.find(emp => emp.status === 'ativo');
        const historico = empQuery.rows.filter(emp => emp.status === 'encerrado');

        res.status(200).json({ usuario, ativo, historico });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.post('/usuarios', autenticarToken, apenasAdmin, upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'termo', maxCount: 1 }]), async (req, res) => {
    try {
        const { email, cpf, matricula, senha } = req.body;
        const usuarioExistente = await db.query("SELECT id, email, cpf, matricula FROM usuarios WHERE email = $1 OR cpf = $2 OR matricula = $3", [email, cpf, matricula]);
        if (usuarioExistente.rows.length > 0) return res.status(409).json({ message: 'Dados em uso (Email, CPF ou Matrícula).' });

        const senhaHash = await bcrypt.hash(senha, 10);
        const dadosParaCadastro = { ...req.body, senha: senhaHash, status_aprovacao: 'pendente' };
        
        const novoUsuario = await Usuario.create(dadosParaCadastro);

        if (req.files) {
            const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
            const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;
            if (fotoPath || termoPath) {
                await db.query("UPDATE usuarios SET foto_perfil = COALESCE($1, foto_perfil), arquivo_termo = COALESCE($2, arquivo_termo) WHERE id = $3", [fotoPath, termoPath, novoUsuario.id]);
            }
        }
        res.status(201).json({ message: 'Criado com sucesso!' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/usuarios/:id', autenticarToken, apenasAdmin, upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'termo', maxCount: 1 }]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const usuarioAntigo = await Usuario.findById(userId);
        await Usuario.update(userId, { ...req.body }); 
        
        if (req.files) {
            const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
            const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;
            if (fotoPath || termoPath) {
                await db.query("UPDATE usuarios SET foto_perfil = COALESCE($1, foto_perfil), arquivo_termo = COALESCE($2, arquivo_termo) WHERE id = $3", [fotoPath, termoPath, userId]);
                if (fotoPath && usuarioAntigo.foto_perfil) try { fs.unlinkSync(usuarioAntigo.foto_perfil); } catch(e){}
                if (termoPath && usuarioAntigo.arquivo_termo) try { fs.unlinkSync(usuarioAntigo.arquivo_termo); } catch(e){}
            }
        }
        res.status(200).json({ message: 'Atualizado!' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.delete('/usuarios/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id); 
        if (userId === 1) return res.status(403).json({ message: 'Proibido.' });
        
        const empAtivo = await Emprestimo.findActiveByUsuario(userId); 
        if (empAtivo) return res.status(403).json({ message: 'Possui empréstimo.' });
        
        const usuarioAntigo = await Usuario.findById(userId);
        await db.query("DELETE FROM emprestimos WHERE usuario_id = $1", [userId]);
        await Usuario.delete(userId);
        
        if (usuarioAntigo) {
            if (usuarioAntigo.foto_perfil) try { fs.unlinkSync(usuarioAntigo.foto_perfil); } catch(e){}
            if (usuarioAntigo.arquivo_termo) try { fs.unlinkSync(usuarioAntigo.arquivo_termo); } catch(e){}
        }
        res.status(200).json({ message: 'Deletado.' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// CORREÇÃO DO ERRO 1: A rota agora tem /api/ no começo!
router.patch('/api/usuarios/:id/status', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const usuario = await Usuario.findById(userId); 
        if (usuario.ativo === true) {
            const empAtivo = await Emprestimo.findActiveByUsuario(userId); 
            if (empAtivo) return res.status(403).json({ message: 'Possui empréstimo ativo.' });
        }
        await Usuario.updateStatus(userId, !usuario.ativo); 
        res.status(200).json({ message: 'Status atualizado.' });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.patch('/api/usuarios/:id/aprovar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        await db.query("UPDATE usuarios SET status_aprovacao = 'aprovado', ativo = true WHERE id = $1", [parseInt(req.params.id)]);
        res.status(200).json({ message: 'Aprovado!' });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.delete('/api/usuarios/:id/recusar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const pendente = await Usuario.findById(userId);
        await db.query("DELETE FROM usuarios WHERE id = $1 AND status_aprovacao = 'pendente'", [userId]);
        
        if (pendente) {
            if (pendente.foto_perfil) try { fs.unlinkSync(pendente.foto_perfil); } catch(e){}
            if (pendente.arquivo_termo) try { fs.unlinkSync(pendente.arquivo_termo); } catch(e){}
        }
        res.status(200).json({ message: 'Recusado.' });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.get('/usuarios/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const usuario = await Usuario.findById(parseInt(req.params.id)); 
        res.status(200).json(usuario);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

module.exports = router;
