// Em: frontend/notebooks/cadastrar-notebook.js
// [VERSÃO ATUALIZADA COM TOKEN, MODAIS E FEEDBACK DE LOADING]

function initNotebookForm() {
    const editNotebookId = sessionStorage.getItem('editNotebookId');
    const form = document.getElementById('form-cadastrar-notebook');

    if (form) {
        setupNotebookSubmit(form, editNotebookId); 
        
        if (editNotebookId) {
            loadNotebookDataForEdit(editNotebookId);
        }
    } else {
        console.error('Formulário de notebook não encontrado no DOM.');
    }
}

async function loadNotebookDataForEdit(notebookId) {
    const token = localStorage.getItem('token');
    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

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

        document.getElementById('tombamento').value = notebook.tombamento;
        document.getElementById('numero_serie').value = notebook.numero_serie;
        document.getElementById('marca').value = notebook.marca;
        document.getElementById('modelo').value = notebook.modelo;
        document.getElementById('ano_aquisicao').value = notebook.ano_aquisicao;

        document.querySelector('.form-wrapper-notebook h2').textContent = 'Editar Notebook';
        document.querySelector('.btn-submit-notebook').textContent = 'Salvar Alterações';

    } catch (error) {
        console.error(error);
        showAlert('Erro ao Carregar', 'Erro ao carregar dados do notebook para edição.', 'error');
    }
}

function setupNotebookSubmit(form, editNotebookId) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const token = localStorage.getItem('token');
        const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

        if (!token) {
            showAlert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.', 'error');
            return;
        }

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());

        console.log('Enviando notebook:', dados);
        
        const submitButton = form.querySelector('.btn-submit-notebook');
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