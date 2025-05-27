import { useState, useEffect } from 'react';
import axios from 'axios';
import TaskForm from './component/TaskForm'; // Importe o novo componente
import type{ Task } from './types/interfaces';
import './App.css'

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  // Função para buscar as tarefas
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

  // Chama fetchTasks na montagem do componente e quando uma tarefa é adicionada
  useEffect(() => {
    fetchTasks();
  }, []); // O array vazio significa que ele roda uma vez na montagem

  // Esta função será passada para TaskForm para recarregar a lista após a criação
  const handleTaskAdded = () => {
    fetchTasks(); // Recarrega a lista de tarefas
  };

  return (
    <div className="app-container">
      <h1>Minha Lista de Tarefas</h1>

      <TaskForm onTaskAdded={handleTaskAdded} />

      <hr className="divider" />

      <h3>Tarefas Cadastradas</h3>
      {loadingTasks ? (
        <p>Carregando tarefas...</p>
      ) : errorTasks ? (
        <p className="error-message">{errorTasks}</p>
      ) : tasks.length === 0 ? (
        <p>
          Nenhuma tarefa cadastrada ainda. Adicione uma usando o formulário
          acima!
        </p>
      ) : (
        <ul className="tasks-list">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="task-item"
            >
              <h4>
                {task.titulo}<span className={`status-${task.status.replace(/\s+/g, '-')}`}>{task.status}</span>
              </h4>
              <hr/>
              <p><strong>Descrição: </strong>{task.descricao}</p>
              <p>Criado em:
              {new Date(task.data_criacao).toLocaleDateString()} às {new Date(task.data_criacao).toLocaleTimeString()}</p>
              {task.tags && task.tags.length > 0 && (
                <p>Tags: <span className="task-tags">{task.tags.join(', ')}</span></p>
              )}
              {task.comentarios && task.comentarios.length > 0 && (
                <div className="task-comments">
                  <h5>Comentários:</h5>
                  <ul className="comments-sub-list">
                    {task.comentarios.map((comment, idx) => (
                      <li key={idx}>
                        <strong>{comment.autor}</strong> ({new Date(comment.data).toLocaleDateString()}):{' '}
                        {comment.comentario}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
