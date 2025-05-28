// App.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TaskForm from './components/TaskForm';
import CustomNavbar from './components/Navbar';
// IMPORTAR TaskSearch
import TaskSearch from './components/TaskSearch'; // <--- NOVA IMPORTAÇÃO
import type { Task, User } from './types/interfaces';
import './App.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

   // Estados para o Modal de Edição
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null); // Armazena a tarefa a ser editada

  // Estado para o usuário atualmente logado
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // NOVO ESTADO: Armazenar os filtros de pesquisa atuais
  const [currentSearchFilters, setCurrentSearchFilters] = useState<{ status?: string; date?: string; tag?: string }>({});


  const userMap: { [key: string]: string } = {
    '1': 'Matheus',
    '2': 'Bruno',
    // Adicione outros usuários de teste conforme necessário
  }

  // Função para simular o login, recebendo o objeto User
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    alert(`Usuário ${user.username} logado!`);
  };

  const getUsernameById = (userId: string | undefined): string => {
    if (!userId) return 'Desconhecido';
    return userMap[userId] || `Usuário ID: ${userId}`; // Retorna o nome ou o ID se não encontrar no mapa
  };

  // Função para simular o logout
  const handleLogout = () => {
    setCurrentUser(null);
    alert('Logout realizado!');
  };

  // MUDANÇA AQUI: fetchTasks agora pode receber filtros
  const fetchTasks = async (filters: { status?: string; date?: string; tag?: string } = {}) => {
    setLoadingTasks(true);
    setErrorTasks(null);
    try {
      let url = 'http://localhost:8000/tarefas/';
      let params: any = {};

      if (Object.keys(filters).length > 0) {
        url = 'http://localhost:8000/tarefas/buscar/';
        params = filters; // Se houver filtros, usa a rota de busca e os parâmetros
      }

      const response = await axios.get<Task[]>(url, { params });
      setTasks(response.data);
      // Se a busca retornar 404 por nenhum resultado, a requisição irá para o catch
      // Mas se o backend retornar [], isso será tratado aqui
    } catch (err: any) {
      // Melhorar o tratamento de erros para a busca
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 404 && Object.keys(filters).length > 0) {
            // Se for 404 na busca e houver filtros, significa "nenhum resultado"
            setTasks([]); // Limpa a lista de tarefas
            setErrorTasks("Nenhuma tarefa encontrada com os critérios fornecidos.");
        } else if (err.response.status === 400 && Object.keys(filters).length === 0) {
            // Se for 400 na busca sem filtros, significa que o backend exigiu filtros
            // (se você manter a HTTPException para "Forneça ao menos um critério")
            setErrorTasks(`Erro de busca: ${err.response.data.detail || err.message}`);
            setTasks([]);
        } else {
            setErrorTasks(`Erro ao carregar tarefas: ${err.response.data.detail || err.message}`);
            console.error('Erro ao carregar tarefas:', err);
        }
      } else {
        setErrorTasks(`Erro desconhecido ao carregar tarefas: ${err.message}`);
        console.error('Erro ao carregar tarefas:', err);
      }
    } finally {
      setLoadingTasks(false);
    }
  };

  // MUDANÇA AQUI: Dispara fetchTasks com os filtros ao montar
  useEffect(() => {
    fetchTasks(currentSearchFilters); // Carrega com os filtros iniciais (vazios)
  }, [currentSearchFilters]); // Recarrega quando os filtros de busca mudam

  // NOVO: Função para lidar com a submissão da pesquisa
  const handleSearchSubmit = (filters: { status?: string; date?: string; tag?: string }) => {
    setCurrentSearchFilters(filters); // Atualiza os filtros, o useEffect acima fará a busca
  };

  // NOVO: Função para limpar a pesquisa
  const handleClearSearch = () => {
    setCurrentSearchFilters({}); // Limpa os filtros, o useEffect acima fará a busca completa
    setErrorTasks(null); // Limpa mensagens de erro de busca
  };

  const handleTaskAdded = () => {
    fetchTasks({}); // Recarrega todas as tarefas após adicionar/atualizar
  };

  const handleViewTask = (task: Task) => {
    setTaskToView(task);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setTaskToView(null);
  };

  const handleEditTask = (taskId: string) => {
    const taskFound = tasks.find(task => task.id === taskId);
    if (taskFound) {
      setTaskToEdit(taskFound);
      setShowEditModal(true);
    } else {
      console.warn(`Tarefa com ID ${taskId} não encontrada para edição.`);
      alert("Tarefa não encontrada para edição. Tente recarregar a página.");
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setTaskToEdit(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await axios.delete(`http://localhost:8000/tarefas/${taskId}`);
        fetchTasks({}); // Recarrega todas as tarefas após a exclusão
      } catch (err: any) {
        setErrorTasks(`Erro ao excluir tarefa: ${err.message}`);
        console.error('Erro ao excluir tarefa:', err);
      }
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-warning text-dark';
      case 'em andamento':
        return 'bg-primary';
      case 'concluída':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  return (
    <Router>
      <CustomNavbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <div className="container mt-4">
        <div className="row">
          <div className="col-md-8 offset-md-2">

            <Routes>
              <Route path="/" element={
                <>
                  <TaskSearch onSearch={handleSearchSubmit} onClear={handleClearSearch} />

                  <h3>Tarefas Cadastradas</h3>
                  {loadingTasks ? (
                    <div className="alert alert-info" role="alert">
                      Carregando tarefas...
                    </div>
                  ) : errorTasks ? (
                    <div className="alert alert-danger" role="alert">
                      {errorTasks}
                    </div>
                  ) : tasks.length === 0 && Object.keys(currentSearchFilters).length > 0 ? (
                    <div className="alert alert-light" role="alert">
                      Nenhuma tarefa encontrada com os critérios fornecidos.
                    </div>
                  ) : tasks.length === 0 ? (
                    <div className="alert alert-light" role="alert">
                      Nenhuma tarefa cadastrada ainda. Adicione uma usando o formulário
                      acima!
                    </div>
                  ) : (
                    <div>
                      {tasks.map((task) => (
                        <div key={task.id} className="card mb-3">
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h5 className="card-title mb-0">{task.titulo}</h5>
                              <span
                                className={`badge ${getStatusBadgeClass(task.status)}`}
                              >
                                {task.status}
                              </span>
                            </div>
                            <p
                              className="card-text text-truncate"
                              style={{ maxWidth: '100%' }}
                            >
                              {task.descricao}
                            </p>
                            <p className="card-text">
                              <small className="text-muted">
                                Criado em:{' '}
                                {new Date(task.data_criacao).toLocaleDateString()}
                              </small>
                            </p>
                            <div className="mt-3 d-flex justify-content-end">
                              <button
                                className="btn btn-outline-info btn-sm me-2"
                                onClick={() => handleViewTask(task)}
                                title="Visualizar"
                              >
                                {' '}
                                <span className="d-none d-md-inline">Visualizar</span>
                              </button>
                              <button
                                className="btn btn-outline-warning btn-sm me-2"
                                onClick={() => handleEditTask(task.id)}
                                title="Editar"
                              >
                                <span className="d-none d-md-inline">Editar</span>
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Excluir"
                              >
                                <span className="d-none d-md-inline">Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              } />
              <Route path="/adicionar-tarefa" element={
                <>
                  <TaskForm onTaskAdded={handleTaskAdded} currentUser={currentUser} />
                  <hr className="my-4" />
                </>
              } />
            </Routes>

            {/* Modal de Visualização de Tarefa */}
            {taskToView && (
              <Modal
                show={showViewModal}
                onHide={handleCloseViewModal}
                size="lg"
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title>{taskToView.titulo}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p>
                    <strong>Descrição Completa:</strong>
                  </p>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{taskToView.descricao}</p>
                  <hr />
                  <p>
                    <strong>Status:</strong>{' '}
                    <span
                      className={`badge ${getStatusBadgeClass(
                        taskToView.status
                      )}`}
                    >
                      {taskToView.status}
                    </span>
                  </p>
                  <p>
                    <strong>Data de Criação:</strong>{' '}
                    {new Date(taskToView.data_criacao).toLocaleDateString()} às{' '}
                    {new Date(taskToView.data_criacao).toLocaleTimeString()}
                  </p>

                  {taskToView.user_id && (
                    <p>
                      <strong>Criado por:</strong>{' '}
                      {getUsernameById(taskToView.user_id)}
                    </p>
                  )}

                  {taskToView.tags && taskToView.tags.length > 0 && (
                    <div className="mt-3">
                      <h6>Tags:</h6>
                      {taskToView.tags.map((tag) => (
                        <span key={tag} className="badge bg-secondary me-1">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {taskToView.comentarios &&
                    taskToView.comentarios.length > 0 && (
                      <div className="mt-3">
                        <h6>Comentários:</h6>
                        <ul className="list-unstyled">
                          {taskToView.comentarios.map((comment, idx) => (
                            <li
                              key={idx}
                              className="mb-2 p-2 bg-light border rounded"
                            >
                              <p className="mb-0">
                                <strong>{comment.autor}</strong>{' '}
                                        {/* <--- MUDANÇA AQUI: Adicione uma verificação para comment.data */}
                                {comment.data ? ( // Se comment.data existe, então tente formatar a data
                                  <small className="text-muted">
                                    ({new Date(comment.data).toLocaleDateString()}):
                                  </small>
                                  ) : (
                                  <small className="text-muted"> (Data desconhecida):</small> // Opcional: fallback de texto
                                  )}
                                      </p>
                              <p className="mb-0">{comment.comentario}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={handleCloseViewModal}>
                    Fechar
                  </Button>
                </Modal.Footer>
              </Modal>
            )}

            {/* Modal de Edição de Tarefa */}
            {/* O Modal.Header não tem Modal.Title porque o TaskForm agora cuida disso */}
            {taskToEdit && (
              <Modal
                show={showEditModal}
                onHide={handleCloseEditModal}
                size="lg"
                centered
              >
                <Modal.Header closeButton>
                  {/* Título será renderizado pelo TaskForm */}
                </Modal.Header>
                <Modal.Body>
                  <TaskForm
                    taskToEdit={taskToEdit}
                    onTaskUpdated={() => {
                      fetchTasks(); // Recarrega a lista
                      handleCloseEditModal(); // Fecha o modal
                    }}
                    onClose={handleCloseEditModal}
                    currentUser={currentUser}
                  />
                </Modal.Body>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;