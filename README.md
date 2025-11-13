# 📚 Documentação do Projeto GENIUS

Este repositório contém o sistema **GENIUS** para gerenciamento de usuários e empréstimo de notebooks, dividido em módulos de Back-end (Node.js) e Front-end (Vanilla JS + Estilos).

---

## 💻 1. Estrutura do Back-end (Node.js)

O Back-end é responsável pela **API**, **conexão com o banco de dados**, **autenticação** e **armazenamento de arquivos** (documentos do usuário).

### 📁 Estrutura de Diretórios

| Pasta/Arquivo | Responsabilidade Principal |
| :--- | :--- |
| `backend/` | Pasta raiz do servidor. |
| `models/` | Define os modelos de dados (schemas do DB). |
| `uploads/` | Armazenamento de arquivos estáticos (Declarações, Termos, etc.). |
| `db.js` | Configuração da conexão com o Banco de Dados. |
| `server.js` | Inicialização do servidor Node/Express. |
| `package.json` | Lista de dependências e scripts de execução. |

### 🛠️ Tecnologias Chave

* **Node.js & Express:** Servidor e framework principal.
* **MongoDB (ou similar):** Banco de Dados para persistência de dados.
* **JWT:** Sistema de autenticação.
* **Multer:** Middleware crucial para o **upload de documentos** (`multipart/form-data`).

---

## 🎨 2. Estrutura do Front-end (Vanilla JS)

O Front-end é a interface de usuário (Dashboard) construída com HTML e Vanilla JavaScript, organizada em módulos para cada seção do sistema.

### 📚 Bibliotecas de Estilo

Para a interface moderna de painel (`dashboard`), o projeto utiliza:

* **Bootstrap:** Usado para estilização, componentes e *layout* responsivo.
* **JavaScript Puro (Vanilla JS):** Toda a lógica de requisições (`fetch`), validações de formulário e manipulação do DOM.

### 📁 Estrutura de Diretórios

O código é dividido por módulos de funcionalidade (login, usuários, notebooks, empréstimos):
