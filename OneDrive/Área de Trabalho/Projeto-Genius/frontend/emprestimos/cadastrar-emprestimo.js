// frontend/emprestimos/cadastrar-emprestimo.js

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
            
        } catch (error) {
            console.error(error);
            showAlert('Erro ao Carregar', 'Erro ao carregar usuários e notebooks disponíveis.', 'error');
        }
    }

    function filtrarLista(lista, termo, ...propriedades) {
        if (!termo) return [];
        termo = termo.toLowerCase().trim(); 
        
        const resultados = lista.filter(item => 
            propriedades.some(prop => 
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
        // Atualizado aqui para buscar por 'tombamento' e 'numero_serie'
        const filtrados = filtrarLista(listaNotebooks, termo, 'tombamento', 'numero_serie');
        exibirResultados(resultsNotebook, filtrados, hiddenNotebookId, searchNotebook, 'tombamento', 'numero_serie');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.searchable-select')) {
            resultsUsuario.classList.remove('visible');
            resultsNotebook.classList.remove('visible');
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
        
        // Bloqueia a devolução para datas anteriores a hoje
        if (dataDevolucaoEl) {
            dataDevolucaoEl.min = hojeFormatado;
            if (!dataDevolucaoEl.value) dataDevolucaoEl.value = hojeFormatado; 
        }
        if (horaDevolucaoEl && !horaDevolucaoEl.value) horaDevolucaoEl.value = horaDevolucaoFixa;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) return showAlert('Erro de Autenticação', 'Sua sessão expirou.', 'error');

        // 1. Atualiza o horário de saída para o exato momento do clique
        preencherCamposDataHora();

        const formData = new FormData(form);
        const dados = Object.fromEntries(formData.entries());
        dados.acessorios = formData.getAll('acessorios');
        // A senha do aluno (dados.senha_aluno) já é capturada automaticamente pelo FormData!

        // 2. Validação rigorosa de Data/Hora (Devolução deve ser APÓS o empréstimo)
        const dataHoraEmp = new Date(`${dados.dataEmprestimo}T${dados.horaEmprestimo}`);
        const dataHoraDev = new Date(`${dados.dataDevolucao}T${dados.horaDevolucao}`);

        if (dataHoraDev <= dataHoraEmp) {
            showAlert('Data Inválida!', 'O momento da devolução deve ser maior que o momento atual do empréstimo.', 'error');
            return;
        }

        const submitButton = form.querySelector('.btn-submit');
        submitButton.disabled = true;
        submitButton.textContent = 'Salvando e Validando Assinatura...';

        try {
            const response = await fetch('http://localhost:3000/emprestimos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dados) // Aqui a senha do aluno vai pro backend
            });

            const result = await response.json();
            if (!response.ok) {
                // Se a senha estiver errada, o backend vai lançar um erro 401 e vai cair aqui!
                throw new Error(result.message || 'Erro ao salvar.');
            }

            showAlert('Sucesso!', 'Empréstimo registrado com a assinatura digital do aluno!', 'success');
            form.reset();
            
            // Limpa as caixas de busca e a senha
            searchUsuario.value = '';
            searchNotebook.value = '';
            hiddenUsuarioId.value = '';
            hiddenNotebookId.value = '';
            document.getElementById('senha_aluno').value = ''; 

            fetchDadosParaForm();
            preencherCamposDataHora();

        } catch (error) {
            console.error('Erro no submit:', error);
            // Exibe a mensagem exata do erro (ex: "Senha do aluno incorreta!")
            showAlert('Erro de Validação', error.message, 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar Empréstimo';
        }
    });

    fetchDadosParaForm();
    preencherCamposDataHora();
}

setTimeout(initEmprestimoForm, 0);