// frontend/login/redefinir-senha.js

// Pega o "?token=xxxx" lá da barra de endereços do navegador
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

// Se a pessoa abrir a tela direto, sem token, bloqueia
if (!token) {
    alert('Acesso negado. Nenhum token de segurança foi fornecido na URL.');
    window.location.href = 'login.html';
}

document.getElementById('form-redefinir').addEventListener('submit', async (e) => {
    e.preventDefault();

    const senha1 = document.getElementById('senha1').value;
    const senha2 = document.getElementById('senha2').value;
    const btn = document.getElementById('btn-salvar-nova');

    if (senha1 !== senha2) {
        alert('As senhas não coincidem. Digite novamente.');
        return;
    }

    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
        const res = await fetch('http://localhost:3000/api/resetar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, novaSenha: senha1 })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Senha redefinida com sucesso! Você já pode fazer o login.');
            window.location.href = 'login.html'; // Manda pro login
        } else {
            alert(data.message); // Exibe "Link expirado" etc
        }
    } catch (err) {
        alert('Erro ao comunicar com o servidor.');
    } finally {
        btn.textContent = 'Salvar Nova Senha';
        btn.disabled = false;
    }
});