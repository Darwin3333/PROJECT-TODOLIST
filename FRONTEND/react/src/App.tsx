// App.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Importa para rotas
import TaskForm from './component/TaskForm'; // Caminho ajustado
import CustomNavbar from './component/Navbar'; // Importa o novo Navbar
import type { Task, User } from './types/interfaces';
import './App.css';

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const [showViewModal, setShowViewModal] = useState<boolean>(false);
  const [taskToView, setTaskToView] = useState<Task | null>(null);

  // Estado para o usuário atualmente logado
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Função para simular o login, recebendo o objeto User
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    alert(`Usuário ${user.username} logado!`);
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
    console.log('Editar tarefa:', taskId);
    // Lógica para carregar dados da tarefa em um formulário de edição (próximo passo)
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
            <h1 className="text-center mb-4">Minha Lista de Tarefas</h1>

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
                  <TaskForm onTaskAdded={handleTaskAdded} />
                  <hr className="my-4" />
                </>
              } />
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
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;