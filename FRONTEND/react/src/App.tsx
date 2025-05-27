// App.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Importa para rotas
import TaskForm from './components/TaskForm'; // Caminho ajustado (agora também para edição)
import CustomNavbar from './components/Navbar'; // Importa o novo Navbar
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

  const fetchTasks = async () => {
    setLoadingTasks(true);
    setErrorTasks(null);
    try {
      const response = await axios.get<Task[]>(
        'http://localhost:8000/tarefas/'
      );
      setTasks(response.data);
    } catch (err: any) {
      setErrorTasks(`Erro ao carregar tarefas: ${err.message}`);
      console.error('Erro ao carregar tarefas:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Função para recarregar a lista após a criação/edição de uma tarefa
  const handleTaskAdded = () => {
    fetchTasks();
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
      setTaskToEdit(taskFound); // Define a tarefa a ser editada
      setShowEditModal(true);   // Abre o modal de edição
    } else {
      console.warn(`Tarefa com ID ${taskId} não encontrada para edição.`);
      alert("Tarefa não encontrada para edição. Tente recarregar a página.");
    }
  };

  // Função para fechar o modal de edição
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setTaskToEdit(null); // Limpa a tarefa a ser editada
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
      try {
        await axios.delete(`http://localhost:8000/tarefas/${taskId}`);
        fetchTasks();
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
    <Router> {/* Envolve todo o aplicativo com o Router */}
      <CustomNavbar
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
      <div className="container mt-4">
        <div className="row">
          <div className="col-md-8 offset-md-2">

            <Routes> {/* Define as rotas do aplicativo */}
              <Route path="/" element={ // Rota para listar tarefas (página inicial)
                <>
                  <h3>Tarefas Cadastradas</h3>
                  {loadingTasks ? (
                    <div className="alert alert-info" role="alert">
                      Carregando tarefas...
                    </div>
                  ) : errorTasks ? (
                    <div className="alert alert-danger" role="alert">
                      {errorTasks}
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
                                className="btn btn-outline-primary btn-sm me-2"
                                onClick={() => handleViewTask(task)}
                                title="Visualizar"
                              >
                                👁️{' '}
                                <span className="d-none d-md-inline">Visualizar</span>
                              </button>

                              <button
                                className="btn btn-outline-warning btn-sm me-2"
                                onClick={() => handleEditTask(task.id)}
                                title="Editar"
                              >
                                ✏️ <span className="d-none d-md-inline">Editar</span>
                              </button>

                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Excluir"
                              >
                                🗑️ <span className="d-none d-md-inline">Excluir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              } />
              <Route path="/adicionar-tarefa" element={ // Rota para adicionar tarefa
                <>
                  <TaskForm onTaskAdded={handleTaskAdded} currentUser={currentUser} />
                  <hr className="my-4" />
                </>
              } />
              {/* Opcional: Se você tinha uma rota de dashboard, pode adicioná-la aqui */}
              {/* <Route path="/dashboard" element={<Dashboard currentUser={currentUser} />} /> */}
            </Routes>

            {/* Modal de Visualização de Tarefa (mantém fora das rotas para ser global) */}
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

                  {/* Exibir quem fez a tarefa */}
                  {taskToView.user_id && ( // Só mostra se o user_id existir na tarefa
                    <p>
                      <strong>Criado por:</strong>{' '}
                      {getUsernameById(taskToView.user_id)} {/* Usa a função para pegar o nome */}
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
                                <small className="text-muted">
                                  ({new Date(comment.data).toLocaleDateString()}):
                                </small>
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

            {/* Modal de Edição de Tarefa (Adicionado aqui, fora das rotas) */}
            {taskToEdit && ( // Só renderiza se houver uma tarefa para editar
              <Modal
                show={showEditModal}
                onHide={handleCloseEditModal}
                size="lg" // Pode ser 'sm', 'md', 'lg', 'xl'
                centered // Centraliza o modal na tela
              >
                <Modal.Header closeButton>
                  <Modal.Title>Editar Tarefa</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  {/* Reutiliza o TaskForm, passando a tarefa para edição */}
                  <TaskForm
                    taskToEdit={taskToEdit} // Passa a tarefa a ser editada
                    onTaskUpdated={() => { // Callback para quando a tarefa for atualizada
                      fetchTasks(); // Recarrega a lista de tarefas
                      handleCloseEditModal(); // Fecha o modal após a atualização
                    }}
                    onClose={handleCloseEditModal} // Passa o método para fechar o modal
                    currentUser={currentUser} // Passa o currentUser, mesmo na edição
                  />
                </Modal.Body>
                {/* Modal.Footer não é necessário aqui, pois o formulário tem os botões */}
              </Modal>
            )}
          </div> {/* Fecha a div col-md-8 offset-md-2 */}
        </div> {/* Fecha a div row */}
      </div> {/* Fecha a div container mt-4 */}
    </Router>
  );
}

export default App;