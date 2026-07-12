// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../db_conexao');
const upload = require('../middlewares/uploadMiddleware');
const EmailService = require('../services/emailService');
const { autenticarToken } = require('../middlewares/authMiddleware');

router.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ message: 'Email e senha são obrigatórios.' });

        const userQuery = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        if (userQuery.rows.length === 0) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        
        const usuario = userQuery.rows[0];
        if (!usuario.ativo) return res.status(401).json({ message: 'Esta conta está inativa.' });
        if (usuario.tipo_conta !== 'admin') return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });

        const senhaValida = await bcrypt.compare(senha, usuario.senha) || (senha === usuario.senha);
        if (!senhaValida) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nome: usuario.nome, tipo_conta: usuario.tipo_conta },
            process.env.JWT_SECRET, { expiresIn: '8h' } // Aumentei o tempo de sessão do admin para não cair toda hora
        );

        res.status(200).json({ message: 'Login liberado', token: token, usuario: { nome: usuario.nome } });
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});

router.post('/api/esqueci-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const userQuery = await db.query("SELECT * FROM usuarios WHERE email = $1 AND ativo = true", [email]);
        if (userQuery.rows.length === 0) return res.status(404).json({ message: 'E-mail não encontrado ou conta inativa.' });
        
        const usuario = userQuery.rows[0];
        const tokenReset = crypto.randomBytes(32).toString('hex');
        const expiracao = Date.now() + 3600000; 

        await db.query("UPDATE usuarios SET reset_senha_token = $1, reset_senha_expiracao = $2 WHERE id = $3", [tokenReset, expiracao, usuario.id]);
        const linkReset = `http://localhost:3000/portal/redefinir-senha.html?token=${tokenReset}`;
        await EmailService.enviarRecuperacaoSenha(usuario.email, usuario.nome.split(' ')[0], linkReset);

        res.status(200).json({ message: 'Um link de recuperação foi enviado!' });
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});

router.post('/api/resetar-senha', async (req, res) => {
    try {
        const { token, novaSenha } = req.body;
        const userQuery = await db.query("SELECT id, reset_senha_expiracao FROM usuarios WHERE reset_senha_token = $1", [token]);
        if (userQuery.rows.length === 0) return res.status(400).json({ message: 'Link inválido ou utilizado.' });

        const usuario = userQuery.rows[0];
        if (Date.now() > usuario.reset_senha_expiracao) return res.status(400).json({ message: 'Este link expirou.' });

        const senhaHash = await bcrypt.hash(novaSenha, 10);
        await db.query("UPDATE usuarios SET senha = $1, reset_senha_token = NULL, reset_senha_expiracao = NULL WHERE id = $2", [senhaHash, usuario.id]);
        res.status(200).json({ message: 'Sua senha foi redefinida com sucesso!' });
    } catch (error) { res.status(500).json({ message: 'Erro interno.' }); }
});

router.post('/api/cadastro-publico', upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'termo', maxCount: 1 }]), async (req, res) => {
    try {
        const { nome, email, cpf, data_nascimento, sexo, matricula, curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, senha } = req.body;

        const nascimento = new Date(data_nascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        if (hoje.getMonth() < nascimento.getMonth() || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())) idade--;
        if (idade < 18) return res.status(400).json({ message: 'Apenas maiores de 18 anos.' });
        if (!senha || senha.length < 6) return res.status(400).json({ message: 'Mínimo 6 caracteres.' });

        const existe = await db.query("SELECT id, email, cpf, matricula FROM usuarios WHERE email = $1 OR cpf = $2 OR matricula = $3", [email, cpf, matricula]);
        if (existe.rows.length > 0) {
            const conflito = existe.rows[0];
            if (conflito.email === email) return res.status(409).json({ message: 'E-mail já cadastrado.' });
            if (conflito.cpf === cpf) return res.status(409).json({ message: 'CPF já cadastrado.' });
            if (conflito.matricula === matricula) return res.status(409).json({ message: 'Matrícula já cadastrada.' });
        }

        const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
        const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;
        const senhaHash = await bcrypt.hash(senha, 10);

        const query = `
            INSERT INTO usuarios (
                nome, email, senha, tipo_conta, ativo, cpf, data_nascimento, sexo, matricula, 
                curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, 
                status_aprovacao, foto_perfil, arquivo_termo
            ) VALUES ($1, $2, $3, 'comum', false, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'pendente', $18, $19) RETURNING id;
        `;
        await db.query(query, [nome, email, senhaHash, cpf, data_nascimento, sexo, matricula, curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, fotoPath, termoPath]);
        res.status(201).json({ message: 'Cadastro enviado!' });
    } catch (error) { res.status(500).json({ message: 'Erro no cadastro.' }); }
});

router.post('/api/verificar-duplicidade', async (req, res) => {
    try {
        const { cpf, email, matricula } = req.body;
        let query = "", values = [];
        if (cpf) { query = "SELECT id FROM usuarios WHERE cpf = $1"; values = [cpf]; } 
        else if (email) { query = "SELECT id FROM usuarios WHERE email = $1"; values = [email]; } 
        else if (matricula) { query = "SELECT id FROM usuarios WHERE matricula = $1"; values = [matricula]; } 
        else { return res.status(400).json({ message: 'Envie algo.' }); }

        const result = await db.query(query, values);
        if (result.rows.length > 0) return res.status(409).json({ emUso: true });
        res.status(200).json({ emUso: false });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.get('/api/me', autenticarToken, async (req, res) => {
    try {
        const adminId = req.user.id;
        const userQuery = await db.query("SELECT nome, email, cpf, telefone, tipo_conta FROM usuarios WHERE id = $1", [adminId]);
        res.status(200).json(userQuery.rows[0]);
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.patch('/api/me/senha', autenticarToken, async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const userQuery = await db.query("SELECT senha FROM usuarios WHERE id = $1", [req.user.id]);
        const senhaBanco = userQuery.rows[0].senha;
        const senhaValida = await bcrypt.compare(senhaAtual, senhaBanco) || (senhaAtual === senhaBanco);
        
        if (!senhaValida) return res.status(401).json({ message: 'Senha atual incorreta.' });

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [novaSenhaHash, req.user.id]);
        res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error) { res.status(500).json({ message: 'Erro.' }); }
});

router.get('/criar-admin-mestre', async (req, res) => {
    try {
        const query = `INSERT INTO usuarios (nome, email, senha, tipo_conta, ativo, cpf) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET tipo_conta = 'admin', ativo = true RETURNING *;`;
        await db.query(query, ['Everton Admin', 'admin@admin.com', '123', 'admin', true, '11122233344']);
        res.send("<h1>Usuário Admin pronto!</h1>");
    } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;