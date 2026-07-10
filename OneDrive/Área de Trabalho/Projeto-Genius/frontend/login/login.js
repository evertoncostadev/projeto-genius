// frontend/login/login.js (Código Atualizado e Corrigido)

document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    const messageEl = document.getElementById('message');
    const submitBtn = document.querySelector('.submit-btn');

    messageEl.textContent = '';
    messageEl.className = 'message';
    submitBtn.textContent = 'Carregando...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Email ou senha incorretos.');
        }

        messageEl.textContent = 'Login bem-sucedido! Redirecionando...';
        messageEl.classList.add('success');
        
        localStorage.setItem('token', data.token);

        if(data.usuario && data.usuario.nome) {
            localStorage.setItem('usuarioNome', data.usuario.nome);
        }

        setTimeout(() => {
            window.location.href = '/dashboard/dashboard.html#home'; 
        }, 1000); 

    } catch (error) {
        messageEl.textContent = error.message;
        messageEl.classList.add('error');
    } finally {
        // Restaura o botão caso dê erro
        if (!messageEl.classList.contains('success')) {
            submitBtn.textContent = 'Entrar';
            submitBtn.disabled = false;
        }
    }
});

// ==========================================
// LÓGICA DO "ESQUECI MINHA SENHA"
// ==========================================

const linkEsqueci = document.getElementById('link-esqueci-senha');
const modalEsqueci = document.getElementById('modal-esqueci-senha');
const formRecuperar = document.getElementById('form-recuperar-senha');
const btnCancelar = document.getElementById('btn-cancelar-recuperacao');

// Abre o modal
if(linkEsqueci) {
    linkEsqueci.addEventListener('click', (e) => {
        e.preventDefault();
        modalEsqueci.style.display = 'flex';
    });
}

// Fecha o modal
if(btnCancelar) {
    btnCancelar.addEventListener('click', () => {
        modalEsqueci.style.display = 'none';
        formRecuperar.reset();
    });
}

// Dispara a requisição para enviar o link
if(formRecuperar) {
    formRecuperar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email-recuperacao').value;
        const btnEnviar = document.getElementById('btn-enviar-recuperacao');
        
        btnEnviar.textContent = 'Enviando...';
        btnEnviar.disabled = true;

        try {
            const response = await fetch('http://localhost:3000/api/esqueci-senha', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Sucesso! Verifique sua caixa de entrada (e a pasta de Spam) para acessar o link de redefinição.');
                modalEsqueci.style.display = 'none';
                formRecuperar.reset();
            } else {
                alert(data.message || 'Não foi possível enviar o link.');
            }
        } catch (error) {
            alert('Erro de conexão. Verifique se o servidor está rodando.');
        } finally {
            btnEnviar.textContent = 'Enviar Link';
            btnEnviar.disabled = false;
        }
    });
}