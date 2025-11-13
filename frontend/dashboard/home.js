// frontend/dashboard/home.js (Corrigido para o Deploy)

async function carregarDashboard() {
    // 1. CORREÇÃO: Usar o nome correto da chave do token
    const token = localStorage.getItem('genius_token'); 
    
    // 2. CORREÇÃO: Usar a variável global API_BASE_URL (carregada via global_config.js)
    if (typeof API_BASE_URL === 'undefined') {
        console.error('Erro de Configuração: API_BASE_URL não está definida.');
        return;
    }
    const API_URL = API_BASE_URL; // Usa a URL do Render

    if (!token) {
        console.error('Erro de autenticação: Token não encontrado. Redirecionando...');
        // Redirecionamento de segurança caso o roteador falhe
        window.location.href = '../login/login.html'; 
        return;
    }

    try {
        const [estatisticasRes, atividadeRes] = await Promise.all([
            fetch(`${API_URL}/api/estatisticas`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            }),
            fetch(`${API_URL}/api/atividade-semana`, {
                headers: { 'Authorization': `Bearer ${token}` },
                cache: 'no-cache' 
            })
        ]);

        if (!estatisticasRes.ok) {
            console.error(`Falha ao buscar estatísticas: ${estatisticasRes.status}`);
            // Se for 401 ou 403, forçar logout/login
            if (estatisticasRes.status === 401 || estatisticasRes.status === 403) {
                 window.location.href = '../login/login.html'; 
            }
            return;
        }
        if (!atividadeRes.ok) {
            console.error(`Falha ao buscar atividade da semana: ${atividadeRes.status}`);
            return;
        }

        const estatisticas = await estatisticasRes.json();
        const atividade = await atividadeRes.json();

        atualizarCards(estatisticas);
        renderizarGraficoPizza(estatisticas);
        renderizarGraficoBarras(atividade);

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}


function atualizarCards(data) {
    const elDisponiveis = document.getElementById('count-disponiveis');
    const elEmprestados = document.getElementById('count-emprestados');
    const elDesativados = document.getElementById('count-desativados');
    
    // Sua lógica de preenchimento dos cards
    if (elDisponiveis) elDisponiveis.textContent = data.disponiveis || 0;
    if (elEmprestados) elEmprestados.textContent = data.emprestados || 0;
    if (elDesativados) elDesativados.textContent = data.desativados || 0;
}


function renderizarGraficoPizza(data) {
    // Código do gráfico de Pizza (Mantido sem alterações)
    const ctx = document.getElementById('pieChartStatus');
    if (!ctx) return;

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus) {
        chartStatus.destroy();
    }

    // Nota: O gráfico de pizza está exibindo 4 categorias, incluindo "Total Cadastrados". 
    // Certifique-se de que é essa a intenção visual, pois normalmente gráficos de pizza/rosca mostram partes de um todo (Disponíveis + Emprestados + Indisponíveis = Total).
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: [
                'Total Cadastrados',
                'Disponíveis',
                'Emprestados',
                'Indisponíveis'
            ],
            datasets: [{
                label: 'Status dos Notebooks',
                data: [
                    data.totalCadastrados,
                    data.disponiveis,
                    data.emprestados,
                    data.desativados
                ],
                backgroundColor: [
                    '#4A90E2',
                    '#2ecc71',
                    '#f39c12',
                    '#e74c3c'
                ],
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Poppins'
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${context.raw}`;
                        }
                    }
                }
            }
        }
    });
}


function renderizarGraficoBarras(data) {
    // Código do gráfico de Barras (Mantido sem alterações)
    const ctx = document.getElementById('barChartSemana');
    if (!ctx) return;

    let chartStatus = Chart.getChart(ctx);
    if (chartStatus) {
        chartStatus.destroy();
    }

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels, 
            datasets: [{
                label: 'Empréstimos por Dia',
                data: data.data, 
                backgroundColor: '#4A90E2',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return ` Empréstimos: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0 
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// 3. CORREÇÃO: Chamar a função principal após o script ser carregado.
carregarDashboard();