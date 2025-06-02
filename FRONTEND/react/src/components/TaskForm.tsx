// src/components/TaskForm.tsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from 'react-bootstrap';
import type {
  CommentForPayload,
  TaskToCreatePayload,
  TaskToUpdatePayload,
  User,
  Task,
  CommentForDisplay,
} from '../types/interfaces';
// REMOVA A LINHA: import './TaskForm.css'; (se ainda existir)

export interface TaskFormProps {
  onTaskAdded?: () => void;
  onTaskUpdated?: () => void;
  onClose?: () => void;
  currentUser: User | null;
  taskToEdit?: Task | null;
}

const TaskForm = ({ onTaskAdded, onTaskUpdated, onClose, currentUser, taskToEdit } : TaskFormProps ) => {
  const [titulo, setTitulo] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');
  const [status, setStatus] = useState<TaskToCreatePayload['status']>('pendente');
  const [currentTag, setCurrentTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [currentCommentText, setCurrentCommentText] = useState<string>('');
  const [comments, setComments] = useState<CommentForPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitulo(taskToEdit.titulo);
      setDescricao(taskToEdit.descricao);
      setStatus(taskToEdit.status);
      setTags(taskToEdit.tags || []);
      const commentsFromTask: CommentForPayload[] = (taskToEdit.comentarios || []).map(
        (comment: CommentForDisplay) => ({
          id_comentario: comment.id_comentario,
          id_autor: comment.id_autor,
          comentario: comment.comentario,
          data: comment.data, // Preserva data original (string ISO)
        })
      );
      setComments(commentsFromTask);
      setError(null);
      setSuccess(null);
    } else {
      setTitulo('');
      setDescricao('');
      setStatus('pendente');
      setTags([]);
      setComments([]);
      setCurrentTag('');
      setCurrentCommentText('');
      setError(null);
      setSuccess(null);
    }
  }, [taskToEdit]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleAddComment = () => {
    if (!currentUser || !currentUser.id_user) {
      setError("Você precisa estar logado para adicionar um comentário.");
      return;
    }
    if (currentCommentText.trim()) {
      const newComment: CommentForPayload = {
        id_autor: currentUser.id_user,
        comentario: currentCommentText.trim(),
      };
      setComments([...comments, newComment]);
      setCurrentCommentText('');
      setError(null);
    } else {
      setError("O comentário não pode ser vazio.");
    }
  };

  const handleRemoveComment = (indexToRemove: number) => {
    setComments(comments.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!currentUser || !currentUser.id_user) {
      setError("Por favor, faça login para realizar esta ação.");
      setLoading(false);
      return;
    }

    try {
      let response;
      if (taskToEdit) {
        // Modo Edição: PUT
        const updatePayload: TaskToUpdatePayload = {
          // Enviamos todos os campos que podem ser alterados.
          // O backend pode ter lógica para lidar com campos não alterados se o modelo Pydantic for flexível.
          titulo: titulo,
          descricao: descricao,
          status: status,
          tags: tags,
          comentarios: comments, // comments já está como CommentForPayload[]
        };
        response = await axios.put(
          `http://localhost:8000/tarefas/${taskToEdit.id}`, // taskToEdit.id é o UUID
          updatePayload,
          { // Adiciona o params para enviar solicitante_id_user
            params: {
              solicitante_id_user: currentUser.id_user // <-- MUDANÇA AQUI
            }
          }
        );
        setSuccess(`Tarefa "${response.data.titulo}" atualizada!`);
        if (onTaskUpdated) onTaskUpdated();
      } else {
        // Modo Criação: POST
        const createPayload: TaskToCreatePayload = {
          titulo,
          descricao,
          status,
          tags,
          // Para criar, backend espera comentários sem id_comentario e sem data pré-definida
          comentarios: comments.map(c => ({ 
            id_autor: c.id_autor,
            comentario: c.comentario,
          })),
          user_id: currentUser.id_user,
        };
        response = await axios.post('http://localhost:8000/tarefas/', createPayload);
        setSuccess(`Tarefa "${response.data.titulo}" criada!`);
        if (onTaskAdded) onTaskAdded();
        // Limpa campos somente na criação bem-sucedida
        setTitulo('');
        setDescricao('');
        setStatus('pendente');
        setTags([]);
        setCurrentTag('');
        setComments([]);
        setCurrentCommentText('');
      }

      if (taskToEdit && onClose) { // Fecha o modal de edição após sucesso
        setTimeout(() => onClose(), 1500); 
      }

    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        if (err.response.status === 403) { // Erro de permissão do backend
          setError("Permissão negada: Você não é o dono desta tarefa ou não pode realizar esta ação.");
        } else {
          setError(`Erro: ${err.response.data.detail || err.message}`);
        }
      } else {
        setError(`Erro desconhecido: ${err.message}`);
      }
      console.error("Erro no handleSubmit do TaskForm:", err);
    } finally {
      setLoading(false);
    }
  };

  // O JSX do formulário permanece o mesmo da última versão (com classes Bootstrap)
  // Apenas certifique-se que os imports e props estão corretos.
  return (
    <div className="p-3 p-md-4 border rounded bg-light shadow-sm">
      <h3 className="mb-4 text-center">{taskToEdit ? 'Editar Tarefa' : 'Adicionar Nova Tarefa'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="titulo" className="form-label fw-bold">Título:</label>
          <input
            type="text"
            id="titulo"
            className="form-control"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="descricao" className="form-label fw-bold">Descrição:</label>
          <textarea
            id="descricao"
            className="form-control"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            rows={3}
          ></textarea>
        </div>

        <div className="mb-3">
          <label htmlFor="status" className="form-label fw-bold">Status:</label>
          <select
            id="status"
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskToCreatePayload['status'])}
          >
            <option value="pendente">Pendente</option>
            <option value="em andamento">Em Andamento</option>
            <option value="concluída">Concluída</option>
          </select>
        </div>

        <div className="mb-3 p-3 border rounded bg-white">
          <label htmlFor="tagInput" className="form-label fw-bold">Tags:</label>
          <div className="input-group mb-2">
            <input
              type="text"
              id="tagInput"
              className="form-control"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              placeholder="Ex: Urgente, Estudo"
            />
            <Button variant="outline-secondary" type="button" onClick={handleAddTag}>
              Adicionar Tag
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {tags.map((tag, index) => (
                <span key={index} className="badge rounded-pill bg-secondary d-flex align-items-center p-2">
                  {tag}
                  <Button variant="close" size="sm" onClick={() => handleRemoveTag(tag)} aria-label="Remover tag" className="ms-1"></Button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 p-3 border rounded bg-white">
          <label htmlFor="commentText" className="form-label fw-bold">Comentários:</label>
          <div className="input-group mb-2">
            <textarea
              id="commentText"
              className="form-control"
              value={currentCommentText}
              onChange={(e) => setCurrentCommentText(e.target.value)}
              placeholder="Seu comentário..."
              rows={2}
            ></textarea>
            <Button variant="outline-secondary" type="button" onClick={handleAddComment} disabled={!currentUser}>
              Adicionar Comentário
            </Button>
          </div>
          {comments.length > 0 && (
            <div className="mt-2">
              <h6 className="mb-2">Comentários Adicionados:</h6>
              <ul className="list-group list-group-flush">
                {comments.map((comment, index) => (
                  <li key={comment.id_comentario || index} className="list-group-item d-flex justify-content-between align-items-start px-0 py-2">
                    <div className="me-auto">
                      <strong className="d-block">
                        {comment.id_autor === currentUser?.id_user 
                          ? currentUser?.username 
                          : `Autor (${comment.id_autor.substring(0,6)}...)`
                        }
                      </strong>
                      <p className="mb-0 ms-2" style={{whiteSpace: 'pre-wrap'}}>{comment.comentario}</p>
                    </div>
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={() => handleRemoveComment(index)} title="Remover comentário">
                      <i className="bi bi-x-circle fs-5"></i>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="d-flex justify-content-end mt-4">
          {taskToEdit && onClose && (
            <Button variant="light" type="button" onClick={onClose} className="me-2 border">
              Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            variant={taskToEdit ? "success" : "primary"} 
            disabled={loading || !currentUser}
            className="px-4 py-2"
          >
            {loading ? (taskToEdit ? 'Salvando...' : 'Adicionando...') : (taskToEdit ? 'Salvar Alterações' : 'Adicionar Tarefa')}
          </Button>
        </div>
      </form>
      {error && <p className="mt-3 alert alert-danger">{error}</p>}
      {success && <p className="mt-3 alert alert-success">{success}</p>}
    </div>
  );
};

export default TaskForm;