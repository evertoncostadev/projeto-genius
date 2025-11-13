// Em: frontend/emprestimos/cadastrar-emprestimo.js

function initEmprestimoForm() {
    const form = document.getElementById('form-cadastrar-emprestimo');
    if (!form) {
        console.error('Formulário de empréstimo não encontrado');
        return;
    }

    const searchUsuario = document.getElementById('search-usuario');
    const resultsUsuario = document.getElementById('results-usuario');
    const hiddenUsuarioId = document.getElementById('usuarioId');
    let listaUsuarios = [];

    const searchNotebook = document.getElementById('search-notebook');
    const resultsNotebook = document.getElementById('results-notebook');
    const hiddenNotebookId = document.getElementById('notebookId');
    let listaNotebooks = [];

    const showAlert = typeof showCustomAlert === 'function' ? showCustomAlert : alert;

    async function fetchDadosParaForm() {
        const token = localStorage.getItem('token');
        if (!token) return showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error');

        try {
            const response = await fetch('http://localhost:3000/api/emprestimo-dados', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao buscar dados.');
            
            const data = await response.json();
            
            listaUsuarios = data.usuarios;
            listaNotebooks = data.notebooks;
            
            console.log(`Dados carregados: ${listaUsuarios.length} usuários, ${listaNotebooks.length} notebooks.`);

        } catch (error) {
            console.error(error);
            showAlert('Erro ao Carregar', 'Erro ao carregar usuários e notebooks disponíveis.', 'error');
        }
    }

    function filtrarLista(lista, termo, ...propriediedades) {
        if (!termo) return [];
        termo = termo.toLowerCase().trim(); 
        
        const resultados = lista.filter(item => 
            propriediedades.some(prop => 
                String(item[prop] || '').toLowerCase().includes(termo)
            )
        );
        return resultados.slice(0, 10); 
    }

    function exibirResultados(elementResults, listaFiltrada, hiddenInput, searchInput, propPrincipal, propSecundaria) {
        elementResults.innerHTML = '';
        if (listaFiltrada.length === 0) {
            elementResults.classList.remove('visible');
            return;
        }
        
        listaFiltrada.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `${item[propPrincipal]} <small>(${(item[propSecundaria] || '')})</small>`;
            div.onclick = () => {
                searchInput.value = `${item[propPrincipal]} (${item[propSecundaria]})`;
                hiddenInput.value = item.id;
                elementResults.classList.remove('visible');
            };
            elementResults.appendChild(div);
        });
        elementResults.classList.add('visible');
    }

    searchUsuario.addEventListener('input', () => {
        const termo = searchUsuario.value;
        const filtrados = filtrarLista(listaUsuarios, termo, 'nome', 'cpf');
        exibirResultados(resultsUsuario, filtrados, hiddenUsuarioId, searchUsuario, 'nome', 'cpf');
    });

    searchNotebook.addEventListener('input', () => {
        const termo = searchNotebook.value;
        const filtrados = filtrarLista(listaNotebooks, termo, 'tombamento', 'modelo');
        exibirResultados(resultsNotebook, filtrados, hiddenNotebookId, searchNotebook, 'tombamento', 'modelo');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-select')) {
            resultsUsuario.classList.remove('visible');
            resultsNotebook.classList.remove('visible');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error');

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());

        const acessorios = formData.getAll('acessorios');
        dados.acessorios = acessorios;

        console.log('Enviando Empréstimo:', dados);
        
        const submitButton = form.querySelector('.btn-submit');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando...';

        try {
            const response = await fetch('http://localhost:3000/emprestimos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Erro ao salvar.');
            }

            showAlert('Sucesso!', 'Empréstimo cadastrado com sucesso!', 'success');
            form.reset();
            
            fetchDadosParaForm();
            preencherCamposDataHora();

        } catch (error) {
            console.error('Erro no submit:', error);
            showAlert('Erro ao Salvar', error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar Empréstimo';
        }
    });

    function preencherCamposDataHora() {
        const agora = new Date();

        const ano = agora.getFullYear();
        const mes = String(agora.getMonth() + 1).padStart(2, '0'); 
        const dia = String(agora.getDate()).padStart(2, '0');
        const hojeFormatado = `${ano}-${mes}-${dia}`;

        const hora = String(agora.getHours()).padStart(2, '0');
        const minuto = String(agora.getMinutes()).padStart(2, '0');
        const horaAgoraFormatada = `${hora}:${minuto}`;
        
        const horaDevolucaoFixa = '17:00';

        const dataEmprestimoEl = document.getElementById('dataEmprestimo');
        const horaEmprestimoEl = document.getElementById('horaEmprestimo');
        const dataDevolucaoEl = document.getElementById('dataDevolucao');
        const horaDevolucaoEl = document.getElementById('horaDevolucao');

        if (dataEmprestimoEl) dataEmprestimoEl.value = hojeFormatado;
        if (horaEmprestimoEl) horaEmprestimoEl.value = horaAgoraFormatada;
        if (dataDevolucaoEl) dataDevolucaoEl.value = hojeFormatado; 
        if (horaDevolucaoEl) horaDevolucaoEl.value = horaDevolucaoFixa;
    }

    fetchDadosParaForm();
    preencherCamposDataHora();
}

setTimeout(initEmprestimoForm, 0);