// EM: frontend/notebooks/cadastrar-notebook.js
// [VERSÃO ATUALIZADA COM VALIDAÇÃO E CORREÇÕES]

// Função auxiliar para alertas (usa showCustomAlert se disponível, senão usa alert)
const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

function initNotebookForm() {
    const editNotebookId = sessionStorage.getItem('editNotebookId');
    const form = document.getElementById('form-cadastrar-notebook');

    if (form) {
        setupFormExtras(); // Adiciona validações e limites
        setupNotebookSubmit(form, editNotebookId); 
        
        if (editNotebookId) {
            loadNotebookDataForEdit(editNotebookId);
        }
    } else {
        console.error('Formulário de notebook não encontrado no DOM.');
    }
}

// NOVO: Função para configurar validações e limites
function setupFormExtras() {
    const anoAquisicaoInput = document.getElementById('ano_aquisicao');
    if (anoAquisicaoInput) {
        // Define o ano máximo como o ano atual
        const currentYear = new Date().getFullYear();
        anoAquisicaoInput.max = currentYear;

        // Garante que o input só aceite números inteiros de 4 dígitos (ano)
        anoAquisicaoInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) {
                value = value.substring(0, 4);
            }
            e.target.value = value;
        });
    }
}


async function loadNotebookDataForEdit(notebookId) {
    const token = localStorage.getItem('token');

    if (!token) {
        showAlert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.', 'error');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/notebooks/${notebookId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Falha ao buscar dados do notebook.');

        const notebook = await response.json();

        // Preenche os campos
        document.getElementById('tombamento').value = notebook.tombamento;
        document.getElementById('numero_serie').value = notebook.numero_serie;
        document.getElementById('marca').value = notebook.marca;
        document.getElementById('modelo').value = notebook.modelo;
        document.getElementById('ano_aquisicao').value = notebook.ano_aquisicao;

        // Atualiza a interface para Edição
        const titleElement = document.querySelector('.form-wrapper-notebook h2');
        const submitButton = document.querySelector('.btn-submit-notebook');
        if (titleElement) titleElement.textContent = 'Editar Notebook';
        if (submitButton) submitButton.textContent = 'Salvar Alterações';

    } catch (error) {
        console.error(error);
        showAlert('Erro ao Carregar', 'Erro ao carregar dados do notebook para edição.', 'error');
    }
}

function setupNotebookSubmit(form, editNotebookId) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');

        if (!token) {
            showAlert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.', 'error');
            return;
        }

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());

        // VALIDAÇÃO DE DADOS 
        const anoAquisicao = parseInt(dados.ano_aquisicao);
        const currentYear = new Date().getFullYear();
        if (isNaN(anoAquisicao) || anoAquisicao < 2010 || anoAquisicao > currentYear) {
            showAlert('Erro de Validação', `O Ano de Aquisição deve ser um ano válido entre 2010 e ${currentYear}.`, 'error');
            return;
        }


        // O seletor usa a classe CORRIGIDA no HTML
        const submitButton = form.querySelector('.btn-submit-notebook');
        if (!submitButton) {
            console.error('Botão de submit não encontrado.');
            return;
        }
        
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            let response;
            let url = 'http://localhost:3000/notebooks';
            let method = 'POST'; 

            if (editNotebookId) {
                url = `http://localhost:3000/notebooks/${editNotebookId}`;
                method = 'PUT';
            }

            response = await fetch(url, {
                method: method,
                headers: {
                    // JSON.stringify exige o header 'Content-Type': 'application/json'
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Erro ao salvar notebook.');
            }


            if (editNotebookId) {
                showAlert('Sucesso!', 'Notebook atualizado com sucesso!', 'success');
                sessionStorage.removeItem('editNotebookId'); 
                window.location.hash = '#notebooks_buscar'; 
            } else {
                showAlert('Sucesso!', 'Notebook cadastrado com sucesso!', 'success');
                form.reset();
            }

        } catch (error) {
            console.error('Erro no submit:', error);
            showAlert('Erro ao Salvar', error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = editNotebookId ? 'Salvar Alterações' : 'Cadastrar';
        }
    });
}


setTimeout(initNotebookForm, 0);