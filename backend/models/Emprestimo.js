// Em: backend/models/Emprestimo.js
const db = require('../db_conexao'); // <-- Importa a conexão SQL

class Emprestimo {

    /**
     * Cria um novo empréstimo no banco.
     * @param {object} dados - Dados do formulário.
     * @returns {Promise<object>} - O empréstimo criado.
     */
    static async create(dados) {
        const { usuarioId, notebookId, dataEmprestimo, dataDevolucao, obs, acessorios } = dados;
        
        // Converte a data do formulário
        const dataEmprestimoCompleta = `${dataEmprestimo}T${dados.horaEmprestimo}:00`;
        const dataDevolucaoCompleta = `${dataDevolucao}T${dados.horaDevolucao}:00`;
        
        // Converte o array de acessórios em string (ex: "fonte,mouse")
        const acessoriosString = (acessorios && Array.isArray(acessorios)) ? acessorios.join(',') : '';

        const query = `
            INSERT INTO emprestimos (
                usuario_id, notebook_id, data_emprestimo, data_devolucao_prevista, 
                observacoes_emprestimo, acessorios, status
            ) VALUES ($1, $2, $3, $4, $5, $6, 'ativo')
            RETURNING *;
        `;
        
        const valores = [
            parseInt(usuarioId),
            parseInt(notebookId),
            dataEmprestimoCompleta,
            dataDevolucaoCompleta,
            obs,
            acessoriosString
        ];

        try {
            const { rows } = await db.query(query, valores);
            console.log(`[Emprestimo.create] Empréstimo ${rows[0].id} criado para o usuário ${usuarioId}.`);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Emprestimo.create]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um empréstimo pelo ID.
     * @param {number} id 
     * @returns {Promise<object>}
     */
    static async findById(id) {
        try {
            const { rows } = await db.query('SELECT * FROM emprestimos WHERE id = $1', [id]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Emprestimo.findById]:", error.message);
            throw error;
        }
    }

    /**
     * Busca um empréstimo ATIVO de um usuário específico.
     * @param {number} usuarioId 
     * @returns {Promise<object>}
     */
    static async findActiveByUsuario(usuarioId) {
        try {
            const { rows } = await db.query(
                'SELECT * FROM emprestimos WHERE usuario_id = $1 AND status = $2', 
                [usuarioId, 'ativo']
            );
            return rows[0]; // Retorna o empréstimo ativo, ou undefined
        } catch (error) {
            console.error("[ERRO EM Emprestimo.findActiveByUsuario]:", error.message);
            throw error;
        }
    }

    /**
     * Lista todos os empréstimos (para as tabelas de 'ativos' e 'histórico').
     * Esta função já "popula" os dados do usuário e notebook usando JOIN.
     * @param {string} status - 'ativo' ou 'encerrado'.
     * @returns {Promise<Array<object>>}
     */
    static async findAllPopulado(status) {
        let query = `
            SELECT 
                e.id, e.status, e.data_emprestimo, e.data_devolucao_prevista, 
                e.data_devolucao_real, e.observacoes_emprestimo, e.observacoes_devolucao, e.acessorios,
                u.nome AS usuario_nome, u.cpf AS usuario_cpf,
                n.tombamento AS notebook_tombamento, n.modelo AS notebook_modelo
            FROM emprestimos e
            LEFT JOIN usuarios u ON e.usuario_id = u.id
            LEFT JOIN notebooks n ON e.notebook_id = n.id
        `;
        
        const valores = [];
        
        if (status) {
            query += ' WHERE e.status = $1';
            valores.push(status);
        }
        
        // Ordena por data
        if (status === 'encerrado') {
            query += ' ORDER BY e.data_devolucao_real DESC';
        } else {
            query += ' ORDER BY e.data_emprestimo DESC';
        }

        try {
            const { rows } = await db.query(query, valores);
            // Transforma os dados para o formato que o frontend espera
            return rows.map(row => ({
                id: row.id,
                status: row.status,
                dataEmprestimo: row.data_emprestimo,
                dataDevolucaoPrevista: row.data_devolucao_prevista,
                dataDevolucaoReal: row.data_devolucao_real,
                observacoes: row.observacoes_emprestimo, // Nome antigo
                observacoesDevolucao: row.observacoes_devolucao,
                // Converte a string "fonte,mouse" de volta para array ['fonte', 'mouse']
                acessorios: row.acessorios ? row.acessorios.split(',') : [],
                usuario: {
                    nome: row.usuario_nome || 'Usuário Deletado',
                    cpf: row.usuario_cpf || 'N/A'
                },
                notebook: {
                    tombamento: row.notebook_tombamento || 'Notebook Deletado',
                    modelo: row.notebook_modelo || 'N/A'
                }
            }));
        } catch (error) {
            console.error("[ERRO EM Emprestimo.findAllPopulado]:", error.message);
            throw error;
        }
    }

    /**
     * Encerra um empréstimo (muda o status e salva data/obs de devolução).
     * @param {number} id - O ID do empréstimo.
     * @param {string} observacoesDevolucao - Observações da devolução.
     * @returns {Promise<object>} - O empréstimo atualizado.
     */
    static async encerrar(id, observacoesDevolucao) {
        const query = `
            UPDATE emprestimos 
            SET status = 'encerrado', 
                data_devolucao_real = NOW(), 
                observacoes_devolucao = $1
            WHERE id = $2 AND status = 'ativo'
            RETURNING *;
        `;
        
        try {
            const { rows } = await db.query(query, [observacoesDevolucao, id]);
            if (rows.length === 0) {
                throw new Error("Empréstimo não encontrado ou já estava encerrado.");
            }
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Emprestimo.encerrar]:", error.message);
            throw error;
        }
    }
    
    /**
     * Deleta um empréstimo do banco.
     * @param {number} id - O ID do empréstimo.
     * @returns {Promise<object>} - O empréstimo deletado.
     */
    static async delete(id) {
        try {
            const { rows } = await db.query('DELETE FROM emprestimos WHERE id = $1 RETURNING *', [id]);
            return rows[0];
        } catch (error) {
            console.error("[ERRO EM Emprestimo.delete]:", error.message);
            throw error;
        }
    }
    
    // --- Funções para Estatísticas ---

    /**
     * Conta os empréstimos da semana (Seg-Sex).
     * @returns {Promise<Array<object>>}
     */
    static async getAtividadeSemana() {
        // Esta query é complexa. Ela pega o dia da semana (ISO: 1=Seg, 7=Dom)
        // e conta os empréstimos dos últimos 7 dias que caíram entre Seg(1) e Sex(5).
        const query = `
            SELECT 
                EXTRACT(ISODOW FROM data_emprestimo) AS dia_semana, 
                COUNT(id) AS contagem
            FROM emprestimos
            WHERE data_emprestimo >= (CURRENT_DATE - INTERVAL '7 days')
              AND EXTRACT(ISODOW FROM data_emprestimo) BETWEEN 1 AND 5
            GROUP BY dia_semana
            ORDER BY dia_semana;
        `;
        try {
            const { rows } = await db.query(query);
            return rows;
        } catch (error) {
             console.error("[ERRO EM Emprestimo.getAtividadeSemana]:", error.message);
            throw error;
        }
    }
}

module.exports = Emprestimo;