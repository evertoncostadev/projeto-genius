// backend/server.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');

const db = require('./db_conexao');
const Usuario = require('./models/Usuario');
const Notebook = require('./models/Notebook');
const Emprestimo = require('./models/Emprestimo'); 

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));
const JWT_SECRET = 'sua_chave_secreta_muito_segura_123';

const autenticarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) {
        return res.status(401).json({ message: 'Token de autenticação não fornecido.' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido.' });
        }
        req.user = user;
        next();
    });
};

// =============================================
// --- ROTAS DA API DE USUÁRIOS  ---
// =============================================

app.get('/usuarios', autenticarToken, async (req, res) => {
    try {
        const usuarios = await Usuario.findAll();
        const usuariosFiltrados = usuarios.filter(user => user.tipo_conta === 'admin' && user.id !== 1);

        res.status(200).json(usuariosFiltrados);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});


app.get('/usuarios/:id', autenticarToken, async (req, res) => {
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

app.post('/usuarios', autenticarToken, async (req, res) => {
    try {
        
        const novoUsuario = await Usuario.create(req.body);
        
        const { senha, ...usuarioLimpo } = novoUsuario;
        res.status(201).json({ message: 'Usuário criado com sucesso!', usuario: usuarioLimpo });

    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.put('/usuarios/:id', autenticarToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        const usuarioAtualizado = await Usuario.update(userId, req.body); 

        if (!usuarioAtualizado) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const { senha, ...usuarioLimpo } = usuarioAtualizado;
        
        res.status(200).json({ 
            message: 'Usuário atualizado com sucesso!',
            usuario: usuarioLimpo 
        });

    } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
       
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.delete('/usuarios/:id', autenticarToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id); 
        
        if (userId === 1) { 
             return res.status(403).json({ message: 'Não é permitido excluir o administrador principal.' });
        }

      
        const emprestimoAtivo = await Emprestimo.findActiveByUsuario(userId); 
        if (emprestimoAtivo) {
            return res.status(403).json({ 
                message: 'Não é permitido excluir um usuário que possui um empréstimo ativo. Encerre o empréstimo primeiro.' 
            });
        }
        

        const usuarioRemovido = await Usuario.delete(userId);
        
        if (!usuarioRemovido) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        res.status(200).json({ message: 'Usuário deletado com sucesso.' });
    
    } catch (error) {

        if (error.code === '23503') {
             return res.status(403).json({ message: 'Não é permitido excluir este usuário, pois ele está vinculado a empréstimos no histórico.' });
        }
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.patch('/usuarios/:id/status', autenticarToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (userId === 1) { 
            return res.status(403).json({ message: 'Não é permitido desativar o administrador principal.' });
        }
        
        const usuario = await Usuario.findById(userId); 
        if (!usuario) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        const novoStatusSeria = !usuario.ativo; 

        if (novoStatusSeria === false) { 
            const emprestimoAtivo = await Emprestimo.findActiveByUsuario(userId); 
            if (emprestimoAtivo) {
                return res.status(403).json({ 
                    message: 'Não é permitido desativar um usuário que possui um empréstimo ativo. Encerre o empréstimo primeiro.' 
                });
            }
        }

   
        const usuarioAtualizado = await Usuario.updateStatus(userId, novoStatusSeria); 
        
        const novoStatus = usuarioAtualizado.ativo ? "ativado" : "desativado";
        const { senha, ...usuarioLimpo } = usuarioAtualizado;
        
        res.status(200).json({ 
            message: `Usuário ${novoStatus} com sucesso.`,
            usuario: usuarioLimpo
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

// =============================================
// --- ROTAS DA API DE NOTEBOOKS  ---
// =============================================

app.post('/notebooks', autenticarToken, async (req, res) => {
    try {

        const novoNotebook = await Notebook.create(req.body); 
        
        res.status(201).json({ 
            message: 'Notebook cadastrado com sucesso!', 
            notebook: novoNotebook 
        });
    } catch (error) {

        res.status(400).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.get('/notebooks', autenticarToken, async (req, res) => {
    try {
        const notebooks = await Notebook.findAll(); 
        res.status(200).json(notebooks);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.get('/notebooks/:id', autenticarToken, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 
        if (!notebook) {
            return res.status(404).json({ message: 'Notebook não encontrado.' });
        }
        res.status(200).json(notebook);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

app.put('/notebooks/:id', autenticarToken, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const dadosAtualizados = req.body;

        const notebookAtualizado = await Notebook.update(notebookId, dadosAtualizados); 

        if (!notebookAtualizado) {
             return res.status(404).json({ message: 'Notebook não encontrado.' });
        }
        
        res.status(200).json({ 
            message: 'Notebook atualizado com sucesso!', 
            notebook: notebookAtualizado 
        });
    } catch (error) {
       
        res.status(400).json({ message: error.message || 'Erro interno no servidor.' });
    }
});


app.delete('/notebooks/:id', autenticarToken, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 

        if (!notebook) {
            return res.status(404).json({ message: 'Notebook não encontrado.' });
        }
        if (notebook.status === 'emprestado') {
            return res.status(403).json({ message: 'Não é permitido excluir um notebook que está atualmente emprestado.' });
        }
        
        await Notebook.delete(notebookId); 
        res.status(200).json({ message: 'Notebook deletado com sucesso.' });
    
    } catch (error) {

        if (error.code === '23503') { 
             return res.status(403).json({ message: 'Não é permitido excluir este notebook, pois ele está vinculado a empréstimos no histórico.' });
        }
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});


app.patch('/notebooks/:id/status', autenticarToken, async (req, res) => {
    try {
        const notebookId = parseInt(req.params.id);
        const notebook = await Notebook.findById(notebookId); 

        if (!notebook) {
            return res.status(404).json({ message: 'Notebook não encontrado.' });
        }
        
        const statusAtual = notebook.status;
        if (statusAtual === 'emprestado') {
            return res.status(403).json({ message: 'Não é possível alterar o status de um notebook emprestado.' });
        }
        
        const novoStatus = (statusAtual === 'disponivel') ? 'desativado' : 'disponivel';
        const notebookAtualizado = await Notebook.updateStatus(notebookId, novoStatus); 
        
        res.status(200).json({ 
            message: `Notebook ${novoStatus} com sucesso.`,
            notebook: notebookAtualizado
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Erro interno no servidor.' });
    }
});

// =============================================
// --- ROTAS DA API DE EMPRÉSTIMOS ---
// =============================================

// GET /api/emprestimo-dados (Dados p/ formulário)
app.get('/api/emprestimo-dados', autenticarToken, async (req, res) => {
    try {
        const emprestimosAtivos = await db.query("SELECT usuario_id FROM emprestimos WHERE status = 'ativo'");
        const usuariosComEmprestimoAtivo = new Set(emprestimosAtivos.rows.map(emp => emp.usuario_id));

        const usuariosAtivos = (await Usuario.findAlunosAtivos()) 
            .filter(user => !usuariosComEmprestimoAtivo.has(user.id));

        const notebooksDisponiveis = (await Notebook.findAll()) 
            .filter(note => note.status === 'disponivel')
            .map(note => ({ id: note.id, tombamento: note.tombamento, modelo: note.modelo }));

        res.status(200).json({
            usuarios: usuariosAtivos,
            notebooks: notebooksDisponiveis
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar dados para empréstimo.' });
    }
});

app.post('/emprestimos', autenticarToken, async (req, res) => {
    try {
        const { usuarioId, notebookId } = req.body;
        
        const usuario = await Usuario.findById(parseInt(usuarioId)); 
        if (!usuario || usuario.ativo === false || usuario.tipo_conta !== 'comum') {
            return res.status(400).json({ message: 'Usuário inválido, desativado ou não é um aluno.' });
        }

        const notebook = await Notebook.findById(parseInt(notebookId)); 
        if (!notebook || notebook.status !== 'disponivel') {
            return res.status(400).json({ message: 'Notebook inválido ou não está disponível.' });
        }

        const emprestimoAtivoExistente = await Emprestimo.findActiveByUsuario(parseInt(usuarioId)); 
        if (emprestimoAtivoExistente) {
            return res.status(409).json({ 
                message: 'Este usuário já possui um empréstimo ativo. Não é permitido retirar outro notebook.' 
            });
        }

        const novoEmprestimo = await Emprestimo.create(req.body); 
        
        await Notebook.updateStatus(notebook.id, 'emprestado'); 

        res.status(201).json({
            message: 'Empréstimo registrado com sucesso!',
            emprestimo: novoEmprestimo
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


app.get('/emprestimos', autenticarToken, async (req, res) => {
    try {
        const { status } = req.query;
        const emprestimosPopulado = await Emprestimo.findAllPopulado(status); 

        res.status(200).json(emprestimosPopulado);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno ao buscar empréstimos.' });
    }
});


app.patch('/emprestimos/:id/encerrar', autenticarToken, async (req, res) => {
    try {
        const emprestimoId = parseInt(req.params.id);
        const { observacoesDevolucao } = req.body; 


        const emprestimoEncerrado = await Emprestimo.encerrar(emprestimoId, observacoesDevolucao); 
        

        await Notebook.updateStatus(emprestimoEncerrado.notebook_id, 'disponivel'); 
        
        console.log(`[Dar Baixa] Empréstimo ${emprestimoId} encerrado. Notebook ${emprestimoEncerrado.notebook_id} está 'disponivel'.`);

        res.status(200).json({ 
            message: 'Baixa registrada com sucesso!',
            notebookStatus: 'disponivel'
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({ message: error.message || 'Erro interno ao dar baixa no empréstimo.' });
    }
});

app.delete('/emprestimos/:id', autenticarToken, async (req, res) => {
    try {
        const emprestimoId = parseInt(req.params.id);
        const emprestimo = await Emprestimo.findById(emprestimoId); 

        if (!emprestimo) {
            return res.status(404).json({ message: 'Empréstimo não encontrado.' });
        }

        if (emprestimo.status === 'ativo') {
            await Notebook.updateStatus(emprestimo.notebook_id, 'disponivel'); 
            console.log(`[DELETE Emprestimo] Notebook ${emprestimo.notebook_id} devolvido ao status 'disponivel'.`);
        }

        await Emprestimo.delete(emprestimoId); 

        res.status(200).json({ 
            message: 'Empréstimo excluído com sucesso.'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro interno ao excluir o empréstimo.' });
    }
});

// =============================================
// --- ROTAS DE ESTATÍSTICAS E LOGIN ---
// =============================================

app.get('/api/estatisticas', autenticarToken, async (req, res) => {
    try {
        // Busca os dados do banco
        const notebooks = await Notebook.findAll(); 
        const usuarios = await Usuario.findAll(); 

        let disponiveis = 0;
        let emprestados = 0;
        let desativados = 0; 

        notebooks.forEach(notebook => {
            switch (notebook.status) {
                case 'disponivel':
                    disponiveis++;
                    break;
                case 'emprestado':
                    emprestados++;
                    break;
                case 'desativado': 
                    desativados++;
                    break;
            }
        });
        
        const totalCadastrados = notebooks.length;
        const totalAlunos = usuarios.filter(u => u.tipo_conta === 'comum' && u.ativo).length;
        const totalAdmins = usuarios.filter(u => u.tipo_conta === 'admin' && u.ativo).length;

        res.status(200).json({
            totalCadastrados, 
            disponiveis,
            emprestados,
            desativados,
            totalAlunos,
            totalAdmins
        });

    } catch (error) {
        console.error("Erro ao gerar estatísticas:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

app.get('/api/atividade-semana', autenticarToken, async (req, res) => {
    try {
        const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
        const data = [0, 0, 0, 0, 0]; 

        const atividadeDoBanco = await Emprestimo.getAtividadeSemana(); 

        atividadeDoBanco.forEach(item => {
            const diaIndex = parseInt(item.dia_semana) - 1;
            if (diaIndex >= 0 && diaIndex < 5) {
                data[diaIndex] = parseInt(item.contagem);
            }
        });

        res.status(200).json({ labels, data });

    } catch (error) {
        console.error("Erro ao gerar atividade da semana:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});


app.post('/api/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }
        

        const usuario = await Usuario.findByEmail(email);
        

        if (!usuario || !usuario.ativo) {
            return res.status(401).json({ message: 'Email ou senha incorretos.' });
        }

        const senhaCorreta = await Usuario.validarSenha(senha, usuario.senha); 
        if (!senhaCorreta) {
            return res.status(401).json({ message: 'Email ou senha incorretos.' });
        }

        if (usuario.tipo_conta !== 'admin') {
            return res.status(403).json({ 
                message: 'Acesso negado. Este usuário não tem permissão para acessar o painel.' 
            });
        }
 
        const token = jwt.sign(
            { 
                id: usuario.id, 
                email: usuario.email, 
                nome: usuario.nome,
                tipo_conta: usuario.tipo_conta
            },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(200).json({ 
            message: 'Login bem-sucedido', 
            token: token,
            usuario: { nome: usuario.nome } 
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});