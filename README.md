TodoList 📝

O TodoList é um aplicativo web completo para gerenciamento de tarefas. Ele permite que usuários se autentiquem e, a partir daí, possam criar, visualizar, atualizar e deletar suas próprias tarefas. O sistema também conta com um recurso de comentários, permitindo a interação entre usuários nas tarefas.

Um dos principais diferenciais é o dashboard interativo que, utilizando Redis, exibe métricas em tempo real sobre a produtividade, como a quantidade total de tarefas criadas, as tags mais utilizadas e um balanço de tarefas concluídas vs. em andamento. 

✨ Funcionalidades

    Autenticação de Usuários: Sistema de login para acesso seguro e personalizado.

    CRUD de Tarefas: Crie, visualize, edite e delete tarefas de forma intuitiva.

    Sistema de Comentários: Adicione comentários em tarefas para colaboração.

    Dashboard com Métricas em Tempo Real:

        Contagem total de tarefas criadas por status.

        Contagem total de tarefas criadas no dia.

        Ranking de tags mais utilizadas.

        Taxa de conclusão semanal.

        Tempo médio de conclusão de tarefas.

        Relaçao de tarefas concluidas por dia, dos ultimnos 7 dias.

🛠️ Tecnologias Utilizadas

Este projeto foi construído utilizando uma stack moderna e performática:

    Frontend:

        React (com Vite)

        TypeScript

        Bootstrap para estilização.

        Axios para as requisições HTTP.

    Backend:

        Python

        FastAPI para a construção da API.

        Pydantic para validação de dados.

    Banco de Dados:

        MongoDB como banco de dados principal (NoSQL).

        Redis para cache e armazenamento das métricas do dashboard.

🚀 Começando

Para rodar este projeto localmente, siga os passos abaixo.
Pré-requisitos

Antes de começar, certifique-se de que você tem os seguintes softwares instalados:

    Git

    Python 3.9+

    Node.js (com npm)

    MongoDB Server

    Redis Server

Instalação

    Clone o repositório:

    git clone URL_DO_SEU_REPOSITORIO_GIT]](https://github.com/Darwin3333/PROJECT-TODOLIST.git)
    cd PROJECT-TODOLIST

    Configuração do Backend:

        Navegue até a pasta do backend:

        cd backend

        Crie e ative um ambiente virtual:

        # Windows
        python -m venv venv
        .\\venv\\Scripts\\activate

        # macOS / Linux
        python3 -m venv venv
        source venv/bin/activate

        Instale as dependências Python:

        pip install -r requirements.txt

    Configuração do Frontend:

        Em outro terminal, navegue até a pasta do frontend:

        cd frontend

        Instale as dependências do Node.js:

        npm install

🏃‍♀️ Rodando a Aplicação

    Inicie os serviços de banco de dados:

        Certifique-se de que os servidores do MongoDB e do Redis estão em execução.

    Inicie o Backend (FastAPI):

        No terminal, dentro da pasta BACKEND/ e com o ambiente virtual ativado, execute:

        uvicorn main:app --reload

        A API estará disponível em http://localhost:8000. A documentação interativa (Swagger UI) pode ser acessada em http://localhost:8000/docs.

    Inicie o Frontend (React):

        No terminal, dentro da pasta frontend/, execute:

        npm run dev

        O aplicativo estará disponível em http://localhost:5173.
