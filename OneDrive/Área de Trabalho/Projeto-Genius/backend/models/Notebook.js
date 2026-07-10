// backend/models/Notebook.js
const db = require('../db_conexao'); // <-- Importa a conexão SQL

class Notebook {
    
    /**
     * Cria um novo notebook no banco de dados.
     * @param {object} dados - { tombamento, numero_serie, ano_aquisicao }
     * @returns {Promise<object>} - O notebook criado.
     */
    static async create(dados) {
        const { tombamento, numero_serie, ano_aquisicao } = dados;

        // Validação (sem marca e modelo)
        if (!tombamento || !numero_serie) {
            throw new Error("Campos obrigatórios (tombamento, n/s) não foram preenchidos.");
        }

        const query = `
            INSERT INTO notebooks (tombamento, numero_serie, ano_aquisicao, status)
            VALUES ($1, $2, $3, 'disponivel')
            RETURNING *; 
        `;
        const valores = [tombamento, numero_serie, ano_aquisicao];

        try {
            const { rows } = await db.query(query, valores);
            console.log(`[Notebook.create] Notebook ${tombamento} cadastrado no DB.`);
            return rows[0]; // Retorna o notebook criado pelo banco
        } catch (error) {
            console.error("[ERRO EM Notebook.create]:", error.message);
            // Trata erros comuns do banco (ex: UNIQUE constraint)
            if (error.code === '23505') { // Código de violação de unicidade
                if (error.constraint === 'notebooks_tombamento_key') {
                    throw new Error("Este número de Tombamento já está cadastrado.");
                }
                if (error.constraint === 'notebooks_numero_serie_key') {
                    throw new Error("Este Número de Série já está cadastrado.");
                }
            }
            throw error; // Lança o erro para o server.js pegar
        }
    }

    /**
     * Busca todos os notebooks do banco.
     * @returns {Promise<Array<object>>} - Um array de notebooks.
     */
    static async findAll() {
        try {
            const { rows } = await db.query('SELECT * FROM notebooks ORDER BY id ASC');
            return rows;
        } catch (error) {
            console.error("[ERRO EM Notebook.findAll]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um notebook pelo ID.
     * @param {number} id - O ID do notebook.
     * @returns {Promise<object>} - O notebook (ou undefined).
     */
    static async findById(id) {
         try {
            const { rows } = await db.query('SELECT * FROM notebooks WHERE id = $1', [id]);
            return rows[0]; // Retorna o notebook ou undefined
        } catch (error) {
            console.error("[ERRO EM Notebook.findById]:", error.message);
            throw error;
        }
    }
    
    /**
     * Atualiza os dados de um notebook.
     * @param {number} id - O ID do notebook a ser atualizado.
     * @param {object} dados - { tombamento, numero_serie, ano_aquisicao }
     * @returns {Promise<object>} - O notebook atualizado.
     */
    static async update(id, dados) {
        // Removido marca e modelo daqui:
        const { tombamento, numero_serie, ano_aquisicao } = dados;
        
        // A query NUNCA toca na coluna "status". E agora também não toca em marca e modelo.
        const query = `
            UPDATE notebooks 
            SET tombamento = $1, numero_serie = $2, ano_aquisicao = $3
            WHERE id = $4
            RETURNING *;
        `;
        // Removido marca e modelo dos valores também:
        const valores = [tombamento, numero_serie, ano_aquisicao, id];
        
        try {
            const { rows } = await db.query(query, valores);
            if (rows.length === 0) {
                throw new Error("Notebook não encontrado para atualização.");
            }
            return rows[0];
        } catch (error) {
             console.error("[ERRO EM Notebook.update]:", error.message);
            // Trata erros comuns do banco (ex: UNIQUE constraint)
            if (error.code === '23505') { 
                if (error.constraint === 'notebooks_tombamento_key') {
                    throw new Error("Este número de Tombamento já pertence a outro notebook.");
                }
                if (error.constraint === 'notebooks_numero_serie_key') {
                    throw new Error("Este Número de Série já pertence a outro notebook.");
                }
            }
            throw error;
        }
    }

    /**
     * Atualiza apenas o status de um notebook.
     * @param {number} id - O ID do notebook.
     * @param {string} status - O novo status ('disponivel', 'desativado', 'emprestado').
     * @returns {Promise<object>} - O notebook atualizado.
     */
    static async updateStatus(id, status) {
        try {
            const { rows } = await db.query(
                'UPDATE notebooks SET status = $1 WHERE id = $2 RETURNING *',
                [status, id]
            );
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Notebook.updateStatus]:", error.message);
            throw error;
        }
    }

    /**
     * Deleta um notebook do banco.
     * @param {number} id - O ID do notebook a ser deletado.
     * @returns {Promise<object>} - O notebook que foi deletado.
     */
    static async delete(id) {
        try {
            const { rows } = await db.query('DELETE FROM notebooks WHERE id = $1 RETURNING *', [id]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Notebook.delete]:", error.message);
            throw error;
        }
    }
}

module.exports = Notebook;