// src/components/TaskForm.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import type{ CommentPayload, TaskPayload, User, Task} from '../types/interfaces';
import './TaskForm.css';

export interface TaskFormProps {
  onTaskAdded?: () => void; // Opcional, pois na edição usaremos onTaskUpdated
  onTaskUpdated?: () => void; // NOVO: Callback para quando a tarefa for atualizada
  onClose?: () => void; // NOVO: Para fechar o modal, se TaskForm estiver dentro de um
  currentUser: User | null;
  taskToEdit?: Task | null; // NOVO: A tarefa a ser editada (opcional)
}
const TaskForm = ({ onTaskAdded, onTaskUpdated, onClose, currentUser, taskToEdit } : TaskFormProps) => {
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [status, setStatus] = useState<TaskPayload['status']>('pendente');

  // Estados para Tags
  const [currentTag, setCurrentTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);

  // Estados para Comentários
  const [commentAutor, setCommentAutor] = useState<string>('');
  const [currentCommentText, setCurrentCommentText] = useState<string>('');
  const [comments, setComments] = useState<CommentPayload[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitulo(taskToEdit.titulo);
      setDescricao(taskToEdit.descricao);
      setStatus(taskToEdit.status);
      setTags(taskToEdit.tags || []); // Garante que tags é um array
      setComments(taskToEdit.comentarios || []); // Garante que comments é um array
      setError(null);
      setSuccess(null);
    } else {
      // Limpa o formulário se não estiver em modo edição (para nova tarefa)
      setTitulo('');
      setDescricao('');
      setStatus('pendente');
      setTags([]);
      setComments([]);
      setCommentAutor('');
      setCurrentCommentText('');
      setError(null);
      setSuccess(null);
    }
  }, [taskToEdit]); // Dependência: executa quando taskToEdit muda

  // Função para adicionar uma tag
  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      // Garante que não é vazio e não é duplicado
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  // Função para remover uma tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // Função para adicionar um comentário
  const handleAddComment = () => {
    if (commentAutor.trim() && currentCommentText.trim()) {
      const newComment: CommentPayload = {
        autor: commentAutor.trim(),
        comentario: currentCommentText.trim(),
        data: new Date().toISOString(), // Data formatada para a UI, o backend vai gerar a dele
      };
      setComments([...comments, newComment]);
      setCommentAutor('');
      setCurrentCommentText('');
    }
  };

  // Função para remover um comentário
  const handleRemoveComment = (indexToRemove: number) => {
    setComments(comments.filter((_, index) => index !== indexToRemove));
  };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Se estiver criando e não houver usuário logado
    if (!taskToEdit && !currentUser) {
      setError("Por favor, faça login para criar uma tarefa.");
      setLoading(false);
      return;
    }

    const taskData: TaskPayload = {
      titulo,
      descricao,
      status,
      tags,
      comentarios: comments,
      user_id: currentUser?.id // user_id só é necessário na criação, mas pode ser enviado na atualização
    };

    try {
      let response;
      if (taskToEdit) {
        // Modo Edição: Faz um PUT
        response = await axios.put(
          `http://localhost:8000/tarefas/${taskToEdit.id}`,
          taskData // Envia todos os campos, mesmo que nem todos sejam atualizáveis no backend
        );
        setSuccess(
          `Tarefa "${response.data.titulo}" (ID: ${response.data.id}) atualizada com sucesso!`
        );
        if (onTaskUpdated) {
          onTaskUpdated(); // Chama o callback de atualização
        }
      } else {
        // Modo Criação: Faz um POST
        response = await axios.post(
          'http://localhost:8000/tarefas/',
          taskData
        );
        setSuccess(
          `Tarefa "${response.data.titulo}" (ID: ${response.data.id}) criada com sucesso!`
        );
        if (onTaskAdded) {
          onTaskAdded(); // Chama o callback de adição
        }
      }

      // Limpa o formulário APENAS se estiver no modo de criação ou se o modal for fechado
      if (!taskToEdit) { // Limpa apenas se for criação
        setTitulo('');
        setDescricao('');
        setStatus('pendente');
        setTags([]);
        setCurrentTag('');
        setComments([]);
        setCommentAutor('');
        setCurrentCommentText('');
      }

      // Opcional: fechar o modal automaticamente após um sucesso na edição
      if (taskToEdit && onClose) {
          setTimeout(() => onClose(), 1500); // Fecha após 1.5s
      }

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(
          `Erro ao ${taskToEdit ? 'atualizar' : 'criar'} tarefa: ${err.response.data.detail || err.message}`
        );
      } else {
        setError(`Erro desconhecido: ${err.message}`);
      }
      console.error(`Erro na ${taskToEdit ? 'atualização' : 'criação'} da tarefa:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='task-form-container'
    >
      <h2>{taskToEdit ? `Editar Tarefa: ${taskToEdit.titulo}` : 'Adicionar Nova Tarefa'}</h2>
      <form onSubmit={handleSubmit}>
        {/* Campos Título, Descrição, Status - permanecem os mesmos */}
        <div className='form-group'>
          <label htmlFor="titulo">Título:</label>
          <input
            type="text"
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div className='form-group'>
          <label htmlFor="descricao">Descrição:</label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
          ></textarea>
        </div>

        <div className='form-group'>
          <label htmlFor="status">Status:</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskPayload['status'])}
          >
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>

        {/* Campo para Tags */}
        <div className="tags-section">
          <label htmlFor="tagInput">Adicionar Tags:</label>
          <div className="tag-input-group">
            <input
              type="text"
              id="tagInput"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="Ex: Urgente, Estudo"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="add-tag-button"
            >
              Adicionar Tag
            </button>
          </div>

          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag-item">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="remove-tag-button"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Campo para Comentários */}
        <div className="comments-section"
        >
          <label>Adicionar Comentários:</label>
          <div className="comment-input-group">
            <input
              type="text"
              value={commentAutor}
              onChange={(e) => setCommentAutor(e.target.value)}
              placeholder="Seu nome"
            />
            <textarea
              value={currentCommentText}
              onChange={(e) => setCurrentCommentText(e.target.value)}
              placeholder="Seu comentário..."
              rows={2}
            ></textarea>
            <button
              type="button"
              onClick={handleAddComment}
              className="add-comment-button"
            >
              Adicionar Comentário
            </button>
          </div>

          {comments.length > 0 && (
            <div className="comments-list-container">
              <h5>Comentários Adicionados:</h5>
              <ul className="comments-list">
                {comments.map((comment, index) => (
                  <li key={index} className="comment-item">
                    <div>
                      <strong>{comment.autor}</strong>: {comment.comentario}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveComment(index)}
                      className="remove-comment-button"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="submit-button"
        >
          {loading ? (taskToEdit ? 'Atualizando...' : 'Adicionando...') : (taskToEdit ? 'Salvar Alterações' : 'Adicionar Tarefa')}
        </button>

        {taskToEdit && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary ms-2"
            >
              Cancelar
            </button>
        )}
      </form>
      {error && <p className="error-message">{error}</p>}
      {success && (
        <p className="success-message">{success}</p>
      )}
    </div>
  );
};

export default TaskForm;
