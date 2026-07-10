// backend/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configuração do "carteiro" (usando Gmail como exemplo)
const transporter = nodemailer.createTransport({
    service: 'gmail', // Se usar Outlook, Yahoo, etc., mude aqui.
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

class EmailService {
    
    // 1. E-mail de Confirmação de Retirada
    static async enviarConfirmacaoEmprestimo(usuario, notebook, emprestimo) {
        const dataDevolucao = new Date(emprestimo.data_devolucao_prevista).toLocaleString('pt-BR');
        
        const mailOptions = {
            from: `"Projeto Genius" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: 'Confirmação de Empréstimo de Notebook - GENIUS',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #2c3a4b; text-align: center;">Olá, ${usuario.nome}!</h2>
                    <p>Seu empréstimo foi registrado com sucesso em nosso sistema.</p>
                    
                    <div style="background-color: #f4f6f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #4A90E2;">Detalhes do Equipamento</h3>
                        <p><strong>Notebook:</strong> ${notebook.modelo}</p>
                        <p><strong>Tombamento:</strong> ${notebook.tombamento}</p>
                        <p><strong>Data Limite para Devolução:</strong> <strong style="color: #e74c3c;">${dataDevolucao}</strong></p>
                    </div>

                    <h3 style="color: #2c3a4b;">Regras de Uso:</h3>
                    <ul>
                        <li>Devolva o equipamento pontualmente para evitar penalidades.</li>
                        <li>O notebook e os acessórios devem ser devolvidos no mesmo estado em que foram entregues.</li>
                        <li>Em caso de defeito ou roubo, comunique a coordenação imediatamente.</li>
                    </ul>
                    
                    <p style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #888;">
                        Atenciosamente,<br><strong>Equipe Projeto Genius</strong>
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[E-mail] Confirmação enviada para ${usuario.email}`);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar confirmação:', error);
        }
    }

    // 2. E-mail de Cobrança de Atraso
    static async enviarCobrancaAtraso(usuario, notebook, emprestimo) {
        const mailOptions = {
            from: `"Projeto Genius" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '⚠️ URGENTE: Atraso na Devolução do Notebook',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e74c3c; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #e74c3c; text-align: center;">Aviso de Atraso!</h2>
                    <p>Olá, <strong>${usuario.nome}</strong>.</p>
                    <p>Consta em nosso sistema que o prazo de devolução do notebook que está com você expirou.</p>
                    
                    <div style="background-color: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #e74c3c;">
                        <p><strong>Notebook:</strong> ${notebook.modelo} (Tomb: ${notebook.tombamento})</p>
                        <p><strong>Status:</strong> <span style="color: #e74c3c; font-weight: bold;">ATRASADO</span></p>
                    </div>

                    <p>Por favor, <strong>dirija-se imediatamente ao setor responsável</strong> para efetuar a devolução do equipamento.</p>
                    <p>O não cumprimento das regras de devolução pode acarretar em bloqueio de novos empréstimos.</p>
                    
                    <p style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #888;">
                        Atenciosamente,<br><strong>Equipe Projeto Genius</strong>
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[E-mail] Cobrança de atraso enviada para ${usuario.email}`);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar cobrança:', error);
        }
    }

    // 3. E-mail de Confirmação de Devolução (Recibo)
    static async enviarConfirmacaoDevolucao(usuario, notebook, observacoes) {
        const dataDevolucaoReal = new Date().toLocaleString('pt-BR');
        const obsFormatada = observacoes ? observacoes : 'Equipamento devolvido sem ressalvas.';
        
        const mailOptions = {
            from: `"Projeto Genius" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '✅ Confirmação de Devolução - GENIUS',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #2ecc71; text-align: center;">Devolução Confirmada!</h2>
                    <p>Olá, <strong>${usuario.nome}</strong>!</p>
                    <p>Confirmamos o recebimento do equipamento emprestado. Muito obrigado por utilizar o sistema Genius e por zelar pelo nosso patrimônio!</p>
                    
                    <div style="background-color: #f4f6f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2ecc71;">
                        <h3 style="margin-top: 0; color: #2c3a4b;">Detalhes do Recibo</h3>
                        <p><strong>Notebook:</strong> ${notebook.modelo}</p>
                        <p><strong>Tombamento:</strong> ${notebook.tombamento}</p>
                        <p><strong>Data da Devolução:</strong> ${dataDevolucaoReal}</p>
                        <p><strong>Observações da Devolução:</strong> ${obsFormatada}</p>
                    </div>

                    <p style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #888;">
                        Atenciosamente,<br><strong>Equipe Projeto Genius</strong>
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[E-mail] Confirmação de devolução enviada para ${usuario.email}`);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar confirmação de devolução:', error);
        }
    }

    // 4. E-mail de Recuperação de Senha (LINK)
    static async enviarRecuperacaoSenha(email, nome, linkReset) {
        const mailOptions = {
            from: `"Projeto Genius" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Redefinição de Senha - GENIUS',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #2c3a4b; text-align: center;">Redefinição de Senha</h2>
                    <p>Olá, <strong>${nome}</strong>.</p>
                    <p>Recebemos um pedido para redefinir a senha da sua conta administrativa no sistema Genius.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${linkReset}" style="background-color: #3498db; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 1.1rem; display: inline-block;">Redefinir Minha Senha</a>
                    </div>
                    
                    <p style="font-size: 0.9rem; color: #666;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                    <p style="font-size: 0.8rem; color: #3498db; word-break: break-all;">${linkReset}</p>

                    <p style="color: #e74c3c; font-size: 0.9rem;"><em>Este link é válido por apenas 1 hora. Se você não solicitou essa alteração, apenas ignore este e-mail.</em></p>
                    
                    <p style="text-align: center; margin-top: 30px; font-size: 0.9em; color: #888;">
                        Atenciosamente,<br><strong>Equipe Projeto Genius</strong>
                    </p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[E-mail] Link de recuperação enviado para ${email}`);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar link:', error);
            throw error; 
        }
    }
}

module.exports = EmailService;