// backend/server.js

require('dotenv').config(); 
const cron = require('node-cron');
const EmailService = require('./services/emailService');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer'); 
const fs = require('fs');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const db = require('./db_conexao');
const Usuario = require('./models/Usuario');
const Notebook = require('./models/Notebook');
const Emprestimo = require('./models/Emprestimo'); 

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// --- CONFIGURAÇÃO DE UPLOAD DE ARQUIVOS ---
// =============================================

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (permitidos.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de arquivo inválido. Envie apenas JPG, PNG ou PDF.'));
        }
    }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================
// --- AUTENTICAÇÃO E AUTORIZAÇÃO ---
// =============================================

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_muito_segura_123';

const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user;
        next();
    });
};

const apenasAdmin = (req, res, next) => {
    if (req.user && req.user.tipo_conta !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }
    next();
};

// =============================================
// --- ROTAS DO PERFIL DA EQUIPE (ADMIN LOGADO) ---
// =============================================

app.get('/api/me', autenticarToken, async (req, res) => {
    try {
        const adminId = req.user.id;
        const userQuery = await db.query("SELECT nome, email, cpf, telefone, tipo_conta FROM usuarios WHERE id = $1", [adminId]);
        if(userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.status(200).json(userQuery.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar perfil do admin.' });
    }
});

app.patch('/api/me/senha', autenticarToken, async (req, res) => {
    try {
        const { senhaAtual, novaSenha } = req.body;
        const adminId = req.user.id;

        const userQuery = await db.query("SELECT senha FROM usuarios WHERE id = $1", [adminId]);
        if(userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        const senhaBanco = userQuery.rows[0].senha;
        const senhaValida = await bcrypt.compare(senhaAtual, senhaBanco) || (senhaAtual === senhaBanco);
        
        if (!senhaValida) return res.status(401).json({ message: 'A senha atual está incorreta.' });

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);
        await db.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [novaSenhaHash, adminId]);

        res.status(200).json({ message: 'Senha alterada com sucesso! Use a nova senha no próximo login.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao alterar a senha.' });
    }
});

// =============================================
// --- ROTAS DA API DE USUÁRIOS ---
// =============================================

app.get('/usuarios', autenticarToken, apenasAdmin, async (req, res) => {
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
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.get('/usuarios/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const usuario = await Usuario.findById(userId); 
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        const { senha, ...usuarioLimpo } = usuario;
        res.status(200).json(usuarioLimpo);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.get('/api/usuarios/:id/perfil', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        const userQuery = await db.query("SELECT * FROM usuarios WHERE id = $1", [userId]);
        if (userQuery.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        const usuario = userQuery.rows[0];
        delete usuario.senha; 

        const empQuery = await db.query(`
            SELECT e.*, n.tombamento 
            FROM emprestimos e 
            JOIN notebooks n ON e.notebook_id = n.id 
            WHERE e.usuario_id = $1 
            ORDER BY e.data_emprestimo DESC
        `, [userId]);
        
        const emprestimos = empQuery.rows;
        const ativo = emprestimos.find(emp => emp.status === 'ativo');
        const historico = emprestimos.filter(emp => emp.status === 'encerrado');

        res.status(200).json({ usuario, ativo, historico });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar perfil.' });
    }
});

// Verifica Duplicidade de CPF, E-mail e MATRÍCULA
app.post('/api/verificar-duplicidade', async (req, res) => {
    try {
        const { cpf, email, matricula } = req.body;
        let query = "";
        let values = [];
        
        if (cpf) {
            query = "SELECT id FROM usuarios WHERE cpf = $1";
            values = [cpf];
        } else if (email) {
            query = "SELECT id FROM usuarios WHERE email = $1";
            values = [email];
        } else if (matricula) {
            query = "SELECT id FROM usuarios WHERE matricula = $1";
            values = [matricula];
        } else {
            return res.status(400).json({ message: 'Envie CPF, E-mail ou Matrícula.' });
        }

        const result = await db.query(query, values);
        if (result.rows.length > 0) {
            return res.status(409).json({ emUso: true });
        }
        res.status(200).json({ emUso: false });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao verificar banco de dados.' });
    }
});

app.post('/api/cadastro-publico', upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'termo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { nome, email, cpf, data_nascimento, sexo, matricula, curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, senha } = req.body;

        const nascimento = new Date(data_nascimento);
        const hoje = new Date();
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        if (hoje.getMonth() < nascimento.getMonth() || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        if (idade < 18) {
            return res.status(400).json({ message: 'Apenas maiores de 18 anos podem participar do projeto.' });
        }

        if (!senha || senha.length < 6) return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });

        // Validação Múltipla de Conflitos: CPF, E-mail e Matrícula
        const existe = await db.query("SELECT id, email, cpf, matricula FROM usuarios WHERE email = $1 OR cpf = $2 OR matricula = $3", [email, cpf, matricula]);
        if (existe.rows.length > 0) {
            const conflito = existe.rows[0];
            if (conflito.email === email) return res.status(409).json({ message: 'Este E-mail já está cadastrado.' });
            if (conflito.cpf === cpf) return res.status(409).json({ message: 'Este CPF já está cadastrado.' });
            if (conflito.matricula === matricula) return res.status(409).json({ message: 'Esta Matrícula já está cadastrada.' });
        }

        const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
        const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;

        const senhaHash = await bcrypt.hash(senha, 10);

        const query = `
            INSERT INTO usuarios (
                nome, email, senha, tipo_conta, ativo, cpf, data_nascimento, sexo, matricula, 
                curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, 
                status_aprovacao, foto_perfil, arquivo_termo
            ) VALUES (
                $1, $2, $3, 'comum', false, $4, $5, $6, $7, 
                $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 
                'pendente', $18, $19
            ) RETURNING id, nome, email;
        `;
        
        const values = [nome, email, senhaHash, cpf, data_nascimento, sexo, matricula, curso, periodo, turno, cep, rua, numero_end, bairro, cidade, uf, telefone, fotoPath, termoPath];

        await db.query(query, values);
        res.status(201).json({ message: 'Cadastro enviado para aprovação com sucesso!' });

    } catch (error) {
        console.error("Erro no cadastro público:", error);
        res.status(500).json({ message: 'Erro ao processar o cadastro.' });
    }
});

app.get('/api/usuarios/pendentes', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const pendentes = await db.query("SELECT * FROM usuarios WHERE status_aprovacao = 'pendente'");
        res.status(200).json(pendentes.rows);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pendentes.' });
    }
});

app.patch('/api/usuarios/:id/aprovar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        await db.query("UPDATE usuarios SET status_aprovacao = 'aprovado', ativo = true WHERE id = $1", [userId]);
        res.status(200).json({ message: 'Usuário aprovado com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao aprovar.' });
    }
});

app.delete('/api/usuarios/:id/recusar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const pendente = await Usuario.findById(userId);
        
        await db.query("DELETE FROM usuarios WHERE id = $1 AND status_aprovacao = 'pendente'", [userId]);
        
        if (pendente) {
            if (pendente.foto_perfil) try { fs.unlinkSync(pendente.foto_perfil); } catch(e){}
            if (pendente.arquivo_termo) try { fs.unlinkSync(pendente.arquivo_termo); } catch(e){}
        }

        res.status(200).json({ message: 'Cadastro recusado e removido.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao recusar.' });
    }
});

app.post('/usuarios', autenticarToken, apenasAdmin, upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'termo', maxCount: 1 }
]), async (req, res) => {
    try {
        const { email, cpf, matricula, data_nascimento, senha } = req.body;

        if (data_nascimento) {
            const nascimento = new Date(data_nascimento);
            const hoje = new Date();
            let idade = hoje.getFullYear() - nascimento.getFullYear();
            const m = hoje.getMonth() - nascimento.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
                idade--;
            }
            if (idade < 18) return res.status(400).json({ message: 'Apenas maiores de 18 anos.' });
        }

        if (!senha || senha.length < 6) {
            return res.status(400).json({ message: 'A senha é obrigatória e deve ter no mínimo 6 caracteres.' });
        }

        const usuarioExistente = await db.query("SELECT id, email, cpf, matricula FROM usuarios WHERE email = $1 OR cpf = $2 OR matricula = $3", [email, cpf, matricula]);
        if (usuarioExistente.rows.length > 0) {
            const conflito = usuarioExistente.rows[0];
            if (conflito.email === email) return res.status(409).json({ message: 'E-mail já cadastrado.' });
            if (conflito.cpf === cpf) return res.status(409).json({ message: 'CPF já cadastrado.' });
            if (conflito.matricula === matricula) return res.status(409).json({ message: 'Matrícula já cadastrada.' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const dadosParaCadastro = { ...req.body, senha: senhaHash, status_aprovacao: 'pendente' };
        delete dadosParaCadastro.tipo_conta; 
        delete dadosParaCadastro.confirma_senha;

        const novoUsuario = await Usuario.create(dadosParaCadastro);

        if (req.files) {
            const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
            const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;

            if (fotoPath || termoPath) {
                await db.query(
                    "UPDATE usuarios SET foto_perfil = COALESCE($1, foto_perfil), arquivo_termo = COALESCE($2, arquivo_termo) WHERE id = $3",
                    [fotoPath, termoPath, novoUsuario.id]
                );
            }
        }

        const { senha: s, ...usuarioLimpo } = novoUsuario;
        res.status(201).json({ message: 'Usuário criado com sucesso (Aguardando Aprovação)!', usuario: usuarioLimpo });

    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.put('/usuarios/:id', autenticarToken, apenasAdmin, upload.fields([
    { name: 'foto', maxCount: 1 },
    { name: 'termo', maxCount: 1 }
]), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const dadosAtualizacao = { ...req.body };
        delete dadosAtualizacao.tipo_conta;

        const usuarioAntigo = await Usuario.findById(userId);

        const usuarioAtualizado = await Usuario.update(userId, dadosAtualizacao); 
        if (!usuarioAtualizado) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        if (req.files) {
            const fotoPath = req.files['foto'] ? req.files['foto'][0].path : null;
            const termoPath = req.files['termo'] ? req.files['termo'][0].path : null;

            if (fotoPath || termoPath) {
                await db.query(
                    "UPDATE usuarios SET foto_perfil = COALESCE($1, foto_perfil), arquivo_termo = COALESCE($2, arquivo_termo) WHERE id = $3",
                    [fotoPath, termoPath, userId]
                );

                if (fotoPath && usuarioAntigo.foto_perfil) try { fs.unlinkSync(usuarioAntigo.foto_perfil); } catch(e){}
                if (termoPath && usuarioAntigo.arquivo_termo) try { fs.unlinkSync(usuarioAntigo.arquivo_termo); } catch(e){}
            }
        }

        const { senha, ...usuarioLimpo } = usuarioAtualizado;
        res.status(200).json({ message: 'Atualizado com sucesso!', usuario: usuarioLimpo });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

app.delete('/usuarios/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id); 
        if (userId === 1) return res.status(403).json({ message: 'Não excluir o admin principal.' });
        
        const emprestimoAtivo = await Emprestimo.findActiveByUsuario(userId); 
        if (emprestimoAtivo) return res.status(403).json({ message: 'Usuário possui empréstimo ativo. Realize a devolução primeiro.' });
        
        const usuarioAntigo = await Usuario.findById(userId);

        await db.query("DELETE FROM emprestimos WHERE usuario_id = $1", [userId]);

        const usuarioRemovido = await Usuario.delete(userId);
        if (!usuarioRemovido) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        if (usuarioAntigo) {
            if (usuarioAntigo.foto_perfil) try { fs.unlinkSync(usuarioAntigo.foto_perfil); } catch(e){}
            if (usuarioAntigo.arquivo_termo) try { fs.unlinkSync(usuarioAntigo.arquivo_termo); } catch(e){}
        }

        res.status(200).json({ message: 'Usuário deletado.' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

app.patch('/usuarios/:id/status', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (userId === 1) return res.status(403).json({ message: 'Não desativar o admin principal.' });
        
        const usuario = await Usuario.findById(userId); 
        if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado.' });
        
        const novoStatusSeria = !usuario.ativo; 
        if (novoStatusSeria === false) { 
            const emprestimoAtivo = await Emprestimo.findActiveByUsuario(userId); 
            if (emprestimoAtivo) return res.status(403).json({ message: 'Usuário possui empréstimo ativo.' });
        }
        const usuarioAtualizado = await Usuario.updateStatus(userId, novoStatusSeria); 
        const { senha, ...usuarioLimpo } = usuarioAtualizado;
        
        res.status(200).json({ message: `Status atualizado.`, usuario: usuarioLimpo });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

// =============================================
// --- ROTAS DA API DE NOTEBOOKS ---
// =============================================

app.post('/notebooks', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const novoNotebook = await Notebook.create(req.body); 
        res.status(201).json({ message: 'Notebook cadastrado com sucesso!', notebook: novoNotebook });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Erro interno.' });
    }
});

app.get('/notebooks', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebooks = await Notebook.findAll(); 
        res.status(200).json(notebooks);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notebooks.' });
    }
});

app.get('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 
        if (!notebook) return res.status(404).json({ message: 'Notebook não encontrado.' });
        res.status(200).json(notebook);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

app.put('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);

        const notebookAntigo = await Notebook.findById(notebookId);
        if (!notebookAntigo) {
            return res.status(404).json({ message: 'Notebook não encontrado.' });
        }

        const dadosAtualizacao = {
            ...req.body,
            status: notebookAntigo.status 
        };

        const notebookAtualizado = await Notebook.update(notebookId, dadosAtualizacao); 
        res.status(200).json({ message: 'Notebook atualizado!', notebook: notebookAtualizado });
    } catch (error) {
        res.status(400).json({ message: error.message || 'Erro interno.' });
    }
});

app.delete('/notebooks/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 
        if (!notebook) return res.status(404).json({ message: 'Notebook não encontrado.' });
        if (notebook.status === 'emprestado') return res.status(403).json({ message: 'Notebook está emprestado.' });
        await Notebook.delete(notebookId); 
        res.status(200).json({ message: 'Notebook deletado.' });
    } catch (error) {
        if (error.code === '23503') return res.status(403).json({ message: 'Notebook vinculado a histórico.' });
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

app.patch('/notebooks/:id/status', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 
        if (!notebook) return res.status(404).json({ message: 'Notebook não encontrado.' });
        if (notebook.status === 'emprestado') return res.status(403).json({ message: 'Notebook está emprestado.' });
        
        const novoStatus = (notebook.status === 'disponivel') ? 'desativado' : 'disponivel';
        const notebookAtualizado = await Notebook.updateStatus(notebookId, novoStatus); 
        res.status(200).json({ message: `Notebook ${novoStatus}!`, notebook: notebookAtualizado });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno.' });
    }
});

// =============================================
// --- ROTAS DA API DE EMPRÉSTIMOS ---
// =============================================

app.get('/api/emprestimo-dados', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const emprestimosAtivos = await db.query("SELECT usuario_id FROM emprestimos WHERE status = 'ativo'");
        const usuariosComEmprestimoAtivo = new Set(emprestimosAtivos.rows.map(emp => emp.usuario_id));
        const usuariosAtivos = (await Usuario.findAlunosAtivos()) 
            .filter(user => !usuariosComEmprestimoAtivo.has(user.id));
        
        const notebooksDisponiveis = (await Notebook.findAll()) 
            .filter(note => note.status === 'disponivel')
            .map(note => ({ id: note.id, tombamento: note.tombamento, numero_serie: note.numero_serie }));
            
        res.status(200).json({ usuarios: usuariosAtivos, notebooks: notebooksDisponiveis });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar dados.' });
    }
});

app.post('/emprestimos', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const { usuarioId, notebookId, senha_aluno, ...outrosDados } = req.body;
        
        const userQuery = await db.query("SELECT * FROM usuarios WHERE id = $1", [parseInt(usuarioId)]);
        const usuario = userQuery.rows[0];
        
        if (!usuario || !usuario.ativo || usuario.tipo_conta !== 'comum') {
            return res.status(400).json({ message: 'Usuário inválido ou inativo.' });
        }

        if (!senha_aluno) {
            return res.status(400).json({ message: 'A senha do aluno é obrigatória para confirmar o empréstimo.' });
        }
        const senhaValida = await bcrypt.compare(senha_aluno, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Senha do aluno incorreta! O empréstimo não foi autorizado.' });
        }
        
        const notebook = await Notebook.findById(parseInt(notebookId)); 
        if (!notebook || notebook.status !== 'disponivel') return res.status(400).json({ message: 'Notebook indisponível.' });
        
        const emprestimoAtivoExistente = await Emprestimo.findActiveByUsuario(parseInt(usuarioId)); 
        if (emprestimoAtivoExistente) return res.status(409).json({ message: 'Usuário já possui empréstimo ativo.' });
        
        const novoEmprestimo = await Emprestimo.create({ usuarioId, notebookId, ...outrosDados }); 
        await Notebook.updateStatus(notebook.id, 'emprestado'); 

        EmailService.enviarConfirmacaoEmprestimo(usuario, notebook, novoEmprestimo);

        res.status(201).json({ message: 'Empréstimo registrado e Assinado Digitalmente!', emprestimo: novoEmprestimo });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao processar o empréstimo.' });
    }
});

app.get('/emprestimos', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const lista = await Emprestimo.findAllPopulado(req.query.status); 
        res.status(200).json(lista);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar empréstimos.' });
    }
});

app.patch('/emprestimos/:id/encerrar', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const emprestimoId = parseInt(req.params.id);
        const obsDevolucao = req.body.observacoesDevolucao;

        const emprestimoEncerrado = await Emprestimo.encerrar(emprestimoId, obsDevolucao); 
        await Notebook.updateStatus(emprestimoEncerrado.notebook_id, 'disponivel'); 

        const usuario = await Usuario.findById(emprestimoEncerrado.usuario_id);
        const notebook = await Notebook.findById(emprestimoEncerrado.notebook_id);

        EmailService.enviarConfirmacaoDevolucao(usuario, notebook, obsDevolucao);

        res.status(200).json({ message: 'Devolução registrada e recibo enviado!', notebookStatus: 'disponivel' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao encerrar empréstimo.' });
    }
});

app.delete('/emprestimos/:id', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const empId = parseInt(req.params.id);
        const emprestimo = await Emprestimo.findById(empId); 
        if (!emprestimo) return res.status(404).json({ message: 'Empréstimo não encontrado.' });
        
        if (emprestimo.status === 'ativo') await Notebook.updateStatus(emprestimo.notebook_id, 'disponivel'); 
        await Emprestimo.delete(empId); 
        res.status(200).json({ message: 'Empréstimo excluído.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
});

// =============================================
// --- ROTAS DE ESTATÍSTICAS E LOGIN ---
// =============================================

// Rota 1: Estatísticas do Patrimônio (Para os 4 cards do topo)
app.get('/api/estatisticas', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const notebooks = await Notebook.findAll(); 
        let disponiveis = 0, emprestados = 0, desativados = 0; 

        notebooks.forEach(n => {
            if (n.status === 'disponivel') disponiveis++;
            else if (n.status === 'emprestado') emprestados++;
            else if (n.status === 'desativado') desativados++;
        });
        
        res.status(200).json({ 
            totalCadastrados: notebooks.length, 
            disponiveis, 
            emprestados, 
            desativados 
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
});

// Rota 2: Dashboard Operacional (Avisos e Próximas Devoluções)
app.get('/api/dashboard-operacional', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        // 1. Cadastros Pendentes
        const pendentesRes = await db.query("SELECT COUNT(*) FROM usuarios WHERE status_aprovacao = 'pendente'");
        
        // 2. Empréstimos Atrasados (Corrigido para fuso do Brasil)
        const atrasadosRes = await db.query("SELECT COUNT(*) FROM emprestimos WHERE status = 'ativo' AND data_devolucao_prevista < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')");
        
        // 3. Próximas Devoluções (Lista com os 5 próximos a devolver, que ainda estão no prazo - Corrigido para fuso do Brasil)
        const proximasRes = await db.query(`
            SELECT e.id, e.data_devolucao_prevista, u.nome, n.tombamento
            FROM emprestimos e
            JOIN usuarios u ON e.usuario_id = u.id
            JOIN notebooks n ON e.notebook_id = n.id
            WHERE e.status = 'ativo' AND e.data_devolucao_prevista >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
            ORDER BY e.data_devolucao_prevista ASC
            LIMIT 5
        `);

        res.status(200).json({
            pendentes: parseInt(pendentesRes.rows[0].count),
            atrasados: parseInt(atrasadosRes.rows[0].count),
            proximasDevolucoes: proximasRes.rows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao carregar dados operacionais.' });
    }
});

app.get('/api/atividade-semana', autenticarToken, apenasAdmin, async (req, res) => {
    try {
        const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
        const data = [0, 0, 0, 0, 0]; 
        const atividadeDoBanco = await Emprestimo.getAtividadeSemana(); 
        atividadeDoBanco.forEach(item => {
            const diaIndex = parseInt(item.dia_semana) - 1;
            if (diaIndex >= 0 && diaIndex < 5) data[diaIndex] = parseInt(item.contagem);
        });
        res.status(200).json({ labels, data });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno.' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        
        if (!email || !senha) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        const userQuery = await db.query("SELECT * FROM usuarios WHERE email = $1", [email]);
        
        if (userQuery.rows.length === 0) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }
        
        const usuario = userQuery.rows[0];

        if (!usuario.ativo) return res.status(401).json({ message: 'Esta conta está inativa.' });
        if (usuario.tipo_conta !== 'admin') return res.status(403).json({ message: 'Acesso negado. Apenas administradores.' });

        const senhaValida = await bcrypt.compare(senha, usuario.senha) || (senha === usuario.senha);
        
        if (!senhaValida) {
            return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
        }

        const token = jwt.sign(
            { id: usuario.id, email: usuario.email, nome: usuario.nome, tipo_conta: usuario.tipo_conta },
            JWT_SECRET, { expiresIn: '1h' }
        );

        res.status(200).json({ message: 'Login liberado', token: token, usuario: { nome: usuario.nome } });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

app.post('/api/esqueci-senha', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'O E-mail é obrigatório.' });

        const userQuery = await db.query("SELECT * FROM usuarios WHERE email = $1 AND ativo = true", [email]);
        if (userQuery.rows.length === 0) return res.status(404).json({ message: 'E-mail não encontrado ou conta inativa.' });
        
        const usuario = userQuery.rows[0];

        const tokenReset = crypto.randomBytes(32).toString('hex');
        const expiracao = Date.now() + 3600000; 

        await db.query("UPDATE usuarios SET reset_senha_token = $1, reset_senha_expiracao = $2 WHERE id = $3", [tokenReset, expiracao, usuario.id]);

        const linkReset = `http://localhost:3000/portal/redefinir-senha.html?token=${tokenReset}`;

        await EmailService.enviarRecuperacaoSenha(usuario.email, usuario.nome.split(' ')[0], linkReset);

        res.status(200).json({ message: 'Um link de recuperação foi enviado para o seu e-mail!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao solicitar recuperação.' });
    }
});

app.post('/api/resetar-senha', async (req, res) => {
    try {
        const { token, novaSenha } = req.body;
        if (!token || !novaSenha) return res.status(400).json({ message: 'Dados inválidos.' });

        const userQuery = await db.query("SELECT id, reset_senha_expiracao FROM usuarios WHERE reset_senha_token = $1", [token]);
        
        if (userQuery.rows.length === 0) {
            return res.status(400).json({ message: 'Link inválido ou já utilizado.' });
        }

        const usuario = userQuery.rows[0];

        if (Date.now() > usuario.reset_senha_expiracao) {
            return res.status(400).json({ message: 'Este link expirou. Por favor, solicite um novo.' });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 10);

        await db.query("UPDATE usuarios SET senha = $1, reset_senha_token = NULL, reset_senha_expiracao = NULL WHERE id = $2", [senhaHash, usuario.id]);

        res.status(200).json({ message: 'Sua senha foi redefinida com sucesso!' });
    } catch (error) {
        res.status(500).json({ message: 'Erro interno ao redefinir a senha.' });
    }
});

app.get('/criar-admin-mestre', async (req, res) => {
    try {
        const query = `INSERT INTO usuarios (nome, email, senha, tipo_conta, ativo, cpf) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET tipo_conta = 'admin', ativo = true RETURNING *;`;
        await db.query(query, ['Everton Admin', 'admin@admin.com', '123', 'admin', true, '11122233344']);
        res.send("<h1>Usuário Admin pronto!</h1>");
    } catch (err) { res.status(500).send(err.message); }
});

// Tratamento de erros globais (Ex: Multer rejeitando upload malicioso)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message.includes('Formato de arquivo inválido')) {
        return res.status(400).json({ message: err.message });
    }
    next(err);
});

// =============================================
// --- ROBÔ DE VERIFICAÇÃO DE ATRASOS (CRON) ---
// =============================================

cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Verificando empréstimos atrasados...');
    try {
        const query = `
            SELECT e.*, u.nome, u.email, n.tombamento 
            FROM emprestimos e
            JOIN usuarios u ON e.usuario_id = u.id
            JOIN notebooks n ON e.notebook_id = n.id
            WHERE e.status = 'ativo' 
              AND e.data_devolucao_prevista < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
              AND e.notificacao_atraso_enviada = false
        `;
        
        const atrasados = await db.query(query);

        for (const emp of atrasados.rows) {
            const usuario = { nome: emp.nome, email: emp.email };
            
            const notebook = { tombamento: emp.tombamento };
            
            await EmailService.enviarCobrancaAtraso(usuario, notebook, emp);
            await db.query('UPDATE emprestimos SET notificacao_atraso_enviada = true WHERE id = $1', [emp.id]);
        }
        
        if (atrasados.rows.length > 0) {
            console.log(`[CRON] ${atrasados.rows.length} e-mails de cobrança enviados com sucesso.`);
        }
    } catch (error) {
        console.error('[CRON Erro] Falha ao verificar atrasos:', error.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor rodando na porta ${PORT}`); });