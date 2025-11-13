📚 README.md: Documentação do Projeto GENIUSEste repositório contém o sistema GENIUS para gerenciamento de usuários e empréstimo de notebooks, dividido em módulos de Back-end (Node.js) e Front-end (Vanilla JS + Estilos).💻 1. Estrutura do Back-end (Node.js)O Back-end é responsável pela API, conexão com o banco de dados, autenticação e armazenamento de arquivos (documentos do usuário).📁 Estrutura de DiretóriosPasta/ArquivoResponsabilidade Principalbackend/Pasta raiz do servidor.models/Define os modelos de dados (schemas do DB).uploads/Armazenamento de arquivos estáticos (Declarações, Termos, etc.).db.jsConfiguração da conexão com o Banco de Dados.server.jsInicialização do servidor Node/Express.package.jsonLista de dependências e scripts de execução.🛠️ Tecnologias ChaveNode.js & Express: Servidor e framework principal.MongoDB (ou similar): Banco de Dados para persistência de dados.JWT: Sistema de autenticação.Multer: Middleware crucial para o upload de documentos (multipart/form-data) no cadastro de usuários.🎨 2. Estrutura do Front-end (Vanilla JS)O Front-end é a interface de usuário (Dashboard) construída com HTML e Vanilla JavaScript, organizada em módulos para cada seção do sistema.📚 Bibliotecas de EstiloPara a interface moderna de painel (dashboard), o projeto utiliza:Bootstrap: Usado para estilização, componentes e layout responsivo.JavaScript Puro (Vanilla JS): Toda a lógica de requisições (fetch), validações de formulário e manipulação do DOM.📁 Estrutura de DiretóriosO código é dividido por módulos de funcionalidade (login, usuários, notebooks, empréstimos):/frontend
├── ajuda/                # Seção de Ajuda (HTML, CSS, JS)
├── dashboard/            # Layout principal (Header, Sidebar, Home)
├── emprestimos/          # Lógica para Empréstimo de Equipamentos
│   ├── buscar-emprestimos.js
│   └── cadastrar-emprestimo.js
├── login/                # Tela de Autenticação
├── notebooks/            # Cadastro e Busca de Notebooks
├── usuarios/             # Cadastro e Busca de Usuários
│   └── usuarios.js       # Funções de validação, formatação e submissão (CORRIGIDO)
└── README.md
✅ Correção Importante no Front-endA função de envio de formulário (setupFormSubmit) em frontend/usuarios/usuarios.js foi corrigida para garantir o envio correto de arquivos junto com os dados (utilizando FormData) para a API, essencial para o cadastro de documentos.🚀 3. Como Começar⚙️ 3.1. ConfiguraçãoCrie e preencha o arquivo .env na pasta backend/ com suas variáveis de ambiente (Ex: porta, segredo JWT, URL do DB).🏃 3.2. Instalação e Execução (Backend)Execute os comandos no seu terminal, dentro da pasta backend/:Bash# Navega para a pasta do servidor
cd backend/

# Instala as dependências
npm install

# Inicia o servidor
npm start
# A API estará acessível em http://localhost:3000
🌐 3.3. Acesso (Frontend)O Front-end é acessado diretamente no navegador:Abra o arquivo frontend/login/login.html no seu navegador.Certifique-se de que a API (http://localhost:3000) esteja rodando antes de tentar fazer login.
