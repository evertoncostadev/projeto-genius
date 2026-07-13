// backend/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Paleta de Cores Atualizada (Cores de Fundo mais fortes para destacar)
const colors = {
    bgPage: '#273746',     // Cinza mais escuro para o fundo externo (destaca o cartão branco)
    bgCard: '#ffffff',     // Fundo do cartão (Branco)
    navy: '#2c3a4b',       // Azul Escuro Marinho
    
    blue: '#38bdf8',       // Azul Principal
    blueLight: '#e0f2fe',  // Fundo da caixa Azul
    blueBorder: '#bae6fd', // Borda da caixa Azul
    
    green: '#10b981',      // Verde Principal
    greenLight: '#dcfce7', // Fundo da caixa Verde
    greenBorder: '#bbf7d0',// Borda da caixa Verde
    
    red: '#ef4444',        // Vermelho Principal
    redLight: '#fee2e2',   // Fundo da caixa Vermelha
    redBorder: '#fecaca',  // Borda da caixa Vermelha
    
    textDark: '#334155',
    textLight: '#64748b',
    border: '#cbd5e1'
};

class EmailService {
    
    // 1. E-mail de Confirmação de Retirada (Azul)
    static async enviarConfirmacaoEmprestimo(usuario, notebook, emprestimo) {
        const dataDevolucao = new Date(emprestimo.data_devolucao_prevista).toLocaleString('pt-BR');
        const primeiroNome = usuario.nome.split(' ')[0];
        const numSerie = notebook.numero_serie || 'Não informado';
        
        const mailOptions = {
            from: `"Projeto GENIUS" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '💻 Confirmação de Empréstimo - GENIUS',
            html: `
                <div style="background-color: ${colors.bgPage}; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: ${colors.bgCard}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
                        
                        <div style="background-color: ${colors.navy}; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">EMPRÉSTIMO APROVADO</h1>
                        </div>
                        
                        <div style="padding: 35px; color: ${colors.textDark};">
                            <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${primeiroNome}</strong>!</p>
                            <p style="line-height: 1.6;">O seu empréstimo foi registado com sucesso no sistema GENIUS. Abaixo estão os detalhes do equipamento que está sob a sua responsabilidade.</p>
                            
                            <!-- CAIXA COM FUNDO AZUL CLARO PARA DESTACAR -->
                            <div style="background-color: ${colors.blueLight}; border: 1px solid ${colors.blueBorder}; border-left: 4px solid ${colors.blue}; padding: 20px; border-radius: 6px; margin: 25px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Tombamento:</strong> ${notebook.tombamento}</p>
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nº de Série:</strong> ${numSerie}</p>
                                <p style="margin: 0; font-size: 15px;"><strong>Data Limite:</strong> <span style="color: ${colors.red}; font-weight: bold;">${dataDevolucao}</span></p>
                            </div>

                            <h3 style="color: ${colors.navy}; font-size: 16px; margin-bottom: 10px;">Regras de Uso:</h3>
                            <ul style="line-height: 1.6; color: ${colors.textLight}; padding-left: 20px; margin-top: 0;">
                                <li>Devolva o equipamento pontualmente para evitar penalidades.</li>
                                <li>O notebook e os acessórios devem ser devolvidos no mesmo estado em que foram entregues.</li>
                                <li>Em caso de defeito ou roubo, comunique a coordenação imediatamente.</li>
                            </ul>
                        </div>

                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid ${colors.border};">
                            <p style="margin: 0; color: ${colors.textLight}; font-size: 13px;">Este é um e-mail automático do <strong>Projeto GENIUS</strong>. Por favor, não responda.</p>
                        </div>
                        
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar confirmação:', error);
        }
    }

    // 2. E-mail de Cobrança de Atraso (Vermelho)
    static async enviarCobrancaAtraso(usuario, notebook, emprestimo) {
        const primeiroNome = usuario.nome.split(' ')[0];
        const numSerie = notebook.numero_serie || 'Não informado';

        const mailOptions = {
            from: `"Projeto GENIUS" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '⚠️ URGENTE: Atraso na Devolução do Notebook',
            html: `
                <div style="background-color: ${colors.bgPage}; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: ${colors.bgCard}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(239,68,68,0.15);">
                        
                        <div style="background-color: ${colors.red}; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">AVISO DE ATRASO</h1>
                        </div>
                        
                        <div style="padding: 35px; color: ${colors.textDark};">
                            <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${primeiroNome}</strong>.</p>
                            <p style="line-height: 1.6;">Consta em nosso sistema que o prazo de devolução do notebook que está com você <strong>expirou</strong>.</p>
                            
                            <!-- CAIXA COM FUNDO VERMELHO CLARO PARA DESTACAR -->
                            <div style="background-color: ${colors.redLight}; border: 1px solid ${colors.redBorder}; border-left: 4px solid ${colors.red}; padding: 20px; border-radius: 6px; margin: 25px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Tombamento:</strong> ${notebook.tombamento}</p>
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nº de Série:</strong> ${numSerie}</p>
                                <p style="margin: 0; font-size: 15px;"><strong>Status:</strong> <span style="color: ${colors.red}; font-weight: bold;">ATRASADO</span></p>
                            </div>

                            <p style="line-height: 1.6;">Por favor, <strong>dirija-se imediatamente à coordenação</strong> para efetuar a devolução do equipamento.</p>
                            <p style="line-height: 1.6; color: ${colors.textLight};">O não cumprimento das regras de devolução pode acarretar bloqueio de novos empréstimos ou outras sanções administrativas.</p>
                        </div>

                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid ${colors.border};">
                            <p style="margin: 0; color: ${colors.textLight}; font-size: 13px;">Equipe <strong>Projeto GENIUS</strong></p>
                        </div>
                        
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar cobrança:', error);
        }
    }

    // 3. E-mail de Confirmação de Devolução / Recibo (Verde)
    static async enviarConfirmacaoDevolucao(usuario, notebook, observacoes) {
        const dataDevolucaoReal = new Date().toLocaleString('pt-BR');
        const obsFormatada = observacoes ? observacoes : 'Equipamento devolvido sem ressalvas.';
        const primeiroNome = usuario.nome.split(' ')[0];
        const numSerie = notebook.numero_serie || 'Não informado';
        
        const mailOptions = {
            from: `"Projeto GENIUS" <${process.env.EMAIL_USER}>`,
            to: usuario.email,
            subject: '✅ Recibo de Devolução - GENIUS',
            html: `
                <div style="background-color: ${colors.bgPage}; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: ${colors.bgCard}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(16,185,129,0.15);">
                        
                        <div style="background-color: ${colors.green}; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">DEVOLUÇÃO CONFIRMADA</h1>
                        </div>
                        
                        <div style="padding: 35px; color: ${colors.textDark};">
                            <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${primeiroNome}</strong>!</p>
                            <p style="line-height: 1.6;">Confirmamos o recebimento do equipamento. Muito obrigado por zelar pelo nosso patrimônio!</p>
                            
                            <!-- CAIXA COM FUNDO VERDE CLARO PARA DESTACAR -->
                            <div style="background-color: ${colors.greenLight}; border: 1px solid ${colors.greenBorder}; border-left: 4px solid ${colors.green}; padding: 20px; border-radius: 6px; margin: 25px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Tombamento:</strong> ${notebook.tombamento}</p>
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Nº de Série:</strong> ${numSerie}</p>
                                <p style="margin: 0 0 10px 0; font-size: 15px;"><strong>Data da Devolução:</strong> ${dataDevolucaoReal}</p>
                                <p style="margin: 0; font-size: 15px;"><strong>Observações:</strong> ${obsFormatada}</p>
                            </div>
                        </div>

                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid ${colors.border};">
                            <p style="margin: 0; color: ${colors.textLight}; font-size: 13px;">Equipe <strong>Projeto GENIUS</strong></p>
                        </div>
                        
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar confirmação de devolução:', error);
        }
    }

    // 4. E-mail de Recuperação de Senha (Azul Escuro)
    static async enviarRecuperacaoSenha(email, nome, linkReset) {
        const mailOptions = {
            from: `"Projeto GENIUS" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Redefinição de Senha - GENIUS',
            html: `
                <div style="background-color: ${colors.bgPage}; padding: 40px 20px; font-family: 'Segoe UI', Arial, sans-serif;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: ${colors.bgCard}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
                        
                        <div style="background-color: ${colors.navy}; padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">RECUPERAÇÃO DE SENHA</h1>
                        </div>
                        
                        <div style="padding: 35px; color: ${colors.textDark};">
                            <p style="font-size: 16px; margin-top: 0;">Olá, <strong>${nome}</strong>.</p>
                            <p style="line-height: 1.6;">Recebemos um pedido para redefinir a senha da sua conta no sistema GENIUS.</p>
                            
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${linkReset}" style="background-color: ${colors.blue}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Criar Nova Senha</a>
                            </div>
                            
                            <div style="background-color: ${colors.blueLight}; border: 1px solid ${colors.blueBorder}; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
                                <p style="font-size: 13px; color: ${colors.textLight}; margin-top: 0; margin-bottom: 5px;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
                                <p style="font-size: 12px; color: ${colors.blue}; word-break: break-all; margin: 0;">${linkReset}</p>
                            </div>

                            <p style="color: ${colors.red}; font-size: 13px; margin-top: 25px; text-align: center;"><em>Este link é válido por apenas 1 hora. Se não solicitou essa alteração, ignore este e-mail.</em></p>
                        </div>

                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid ${colors.border};">
                            <p style="margin: 0; color: ${colors.textLight}; font-size: 13px;">Equipe <strong>Projeto GENIUS</strong></p>
                        </div>
                        
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (error) {
            console.error('[E-mail Erro] Falha ao enviar link:', error);
            throw error; 
        }
    }
}

module.exports = EmailService;
