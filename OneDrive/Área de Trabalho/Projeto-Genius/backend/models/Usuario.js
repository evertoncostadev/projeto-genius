// Em: backend/models/Usuario.js
const bcrypt = require('bcrypt');
const db = require('../db_conexao'); // <-- Importa a conexão SQL

class Usuario {

    // O Constructor não é mais necessário,
    // pois os dados vêm direto do banco.
    
    /**
     * Valida a senha (agora um método estático).
     * @param {string} senhaFornecida - Senha em texto plano.
     * @param {string} senhaHash - Hash armazenado no banco.
     * @returns {Promise<boolean>}
     */
    static async validarSenha(senhaFornecida, senhaHash) {
        return await bcrypt.compare(senhaFornecida, senhaHash);
    }

    /**
     * Cria um novo usuário no banco.
     * @param {object} dados - Os dados do usuário.
     * @returns {Promise<object>} - O usuário criado.
     */
    static async create(dados) {
        let senhaParaSalvar = dados.senha;
        const tipoConta = dados.tipo_conta || 'comum'; 

        if (tipoConta === 'comum' && !dados.senha) {
            senhaParaSalvar = '123456';
        }
        
        if (!senhaParaSalvar) {
             throw new Error("A senha é obrigatória para este tipo de conta.");
        }

        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(senhaParaSalvar, salt);
        
        // Campos que vão para o banco (sem 'id', 'declaracaoPath', 'termoPath')
        const {
            nome, email, data_nascimento, cpf, sexo, matricula, curso, periodo, turno,
            cep, rua, numero_end, bairro, cidade, uf, complemento, telefone
        } = dados;

        const query = `
            INSERT INTO usuarios (
                nome, email, senha, tipo_conta, ativo, data_nascimento, cpf, sexo, 
                matricula, curso, periodo, turno, cep, rua, numero_end, bairro, 
                cidade, uf, complemento, telefone
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
                $14, $15, $16, $17, $18, $19, $20
            ) RETURNING *; 
        `;
        
        const valores = [
            nome, email, senhaHash, tipoConta, true, data_nascimento, cpf, sexo,
            matricula, curso, periodo, turno, cep, rua, numero_end, bairro,
            cidade, uf, complemento, telefone
        ];

        try {
            const { rows } = await db.query(query, valores);
            return rows[0]; // Retorna o usuário criado
        } catch (error) {
            console.error("[ERRO EM Usuario.create]:", error.message);
            if (error.code === '23505') { // Violação de unicidade
                 if (error.constraint.includes('email')) {
                    throw new Error("Este email já está cadastrado.");
                }
                if (error.constraint.includes('cpf')) {
                    throw new Error("Este CPF já está cadastrado.");
                }
                if (error.constraint.includes('matricula')) {
                    throw new Error("Esta Matrícula já está cadastrada.");
                }
            }
            throw error;
        }
    }

    /**
     * Atualiza um usuário no banco.
     * @param {number} id - O ID do usuário.
     * @param {object} dados - Os dados a serem atualizados.
     * @returns {Promise<object>} - O usuário atualizado.
     */
    static async update(id, dados) {
        // Campos que podem ser atualizados (note: 'senha' e 'id' não estão aqui)
        const {
            nome, email, data_nascimento, cpf, sexo, matricula, curso, periodo, turno,
            cep, rua, numero_end, bairro, cidade, uf, complemento, telefone
        } = dados;

        const query = `
            UPDATE usuarios SET
                nome = $1, email = $2, data_nascimento = $3, cpf = $4, sexo = $5,
                matricula = $6, curso = $7, periodo = $8, turno = $9, cep = $10,
                rua = $11, numero_end = $12, bairro = $13, cidade = $14, uf = $15,
                complemento = $16, telefone = $17
            WHERE id = $18
            RETURNING *;
        `;
        
        const valores = [
            nome, email, data_nascimento, cpf, sexo, matricula, curso, periodo, turno,
            cep, rua, numero_end, bairro, cidade, uf, complemento, telefone,
            id // O ID é o último parâmetro ($18)
        ];
        
        try {
            const { rows } = await db.query(query, valores);
            if (rows.length === 0) {
                throw new Error("Usuário não encontrado para atualização.");
            }
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.update]:", error.message);
            if (error.code === '23505') { // Violação de unicidade
                 if (error.constraint.includes('email')) {
                    throw new Error("Este email já pertence a outro usuário.");
                }
                if (error.constraint.includes('cpf')) {
                    throw new Error("Este CPF já pertence a outro usuário.");
                }
                if (error.constraint.includes('matricula')) {
                    throw new Error("Esta Matrícula já pertence a outro usuário.");
                }
            }
            throw error;
        }
    }

    /**
     * Atualiza o status (ativo/inativo) de um usuário.
     * @param {number} id - O ID do usuário.
     * @param {boolean} ativo - O novo status.
     * @returns {Promise<object>} - O usuário atualizado.
     */
    static async updateStatus(id, ativo) {
        try {
            const { rows } = await db.query(
                'UPDATE usuarios SET ativo = $1 WHERE id = $2 RETURNING *',
                [ativo, id]
            );
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.updateStatus]:", error.message);
            throw error;
        }
    }

    /**
     * Deleta um usuário do banco.
     * @param {number} id - O ID do usuário.
     * @returns {Promise<object>} - O usuário deletado.
     */
    static async delete(id) {
        try {
            const { rows } = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.delete]:", error.message);
            throw error;
        }
    }

    // --- Métodos de Busca ---
    
    /**
     * Busca todos os usuários (para a lista de admin, por exemplo).
     * @returns {Promise<Array<object>>}
     */
    static async findAll() {
        try {
            // Não retorna a senha na lista
            const { rows } = await db.query("SELECT id, nome, email, tipo_conta, ativo, matricula, cpf, curso FROM usuarios ORDER BY nome ASC");
            return rows;
        } catch (error) {
            console.error("[ERRO EM Usuario.findAll]:", error.message);
            throw error;
        }
    }
    
    /**
     * Busca usuários 'comuns' e 'ativos' (para o formulário de empréstimo).
     * @returns {Promise<Array<object>>}
     */
    static async findAlunosAtivos() {
         try {
            const { rows } = await db.query(
                "SELECT id, nome, cpf FROM usuarios WHERE tipo_conta = 'comum' AND ativo = true ORDER BY nome ASC"
            );
            return rows;
        } catch (error) {
            console.error("[ERRO EM Usuario.findAlunosAtivos]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um usuário pelo email (para login).
     * @param {string} email 
     * @returns {Promise<object>}
     */
    static async findByEmail(email) {
        try {
            // Retorna todos os campos (incluindo senha) para o login
            const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.findByEmail]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um usuário pelo ID.
     * @param {number} id 
     * @returns {Promise<object>}
     */
    static async findById(id) {
        try {
            const { rows } = await db.query('SELECT * FROM usuarios WHERE id = $1', [id]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.findById]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um usuário pelo CPF (para validação).
     * @param {string} cpf 
     * @returns {Promise<object>}
     */
    static async findByCpf(cpf) {
         try {
            const { rows } = await db.query('SELECT id FROM usuarios WHERE cpf = $1', [cpf]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.findByCpf]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um usuário pela Matrícula (para validação).
     * @param {string} matricula 
     * @returns {Promise<object>}
     */
    static async findByMatricula(matricula) {
         try {
            const { rows } = await db.query('SELECT id FROM usuarios WHERE matricula = $1', [matricula]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Usuario.findByMatricula]:", error.message);
            throw error;
        }
    }
}

module.exports = Usuario;