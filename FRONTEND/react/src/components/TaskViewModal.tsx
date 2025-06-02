// src/components/TaskViewModal.tsx
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import type { Task, CommentForDisplay, User } from '../types/interfaces'; // Ajuste o caminho se necessário

interface TaskViewModalProps {
  show: boolean;
  task: Task | null;
  onHide: () => void;
  getUsernameById: (userId: string | undefined) => string; // Para exibir nome do criador da tarefa
  // getUsernameByAuthorId: (authorId: string | undefined) => string; // Se for diferente para autores de comentário
  getStatusBadgeClass: (status: string) => string;
  currentUser: User | null;
}

const TaskViewModal = ({
  show,
  task,
  onHide,
  getUsernameById,
  // getUsernameByAuthorId, // Descomente e use se a lógica para nome de autor de comentário for diferente
  getStatusBadgeClass,
} : TaskViewModalProps) => {
  if (!task) {
    return null; // Não renderiza nada se não houver tarefa para visualizar
  }

  // Função para formatar username do autor do comentário (pode ser a mesma getUsernameById)
  // Se o ID do autor do comentário e o ID do usuário da tarefa usam o mesmo mapa/lógica:
  const getCommentAuthorName = (authorId: string | undefined) => getUsernameById(authorId);


  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{task.titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>Descrição Completa:</strong>
        </p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{task.descricao}</p>
        <hr />
        <div className="row">
          <div className="col-md-6">
            <p>
              <strong>Status:</strong>{' '}
              <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </p>
            {task.user_id && (
              <p>
                <strong>Criado por:</strong> {getUsernameById(task.user_id)}
              </p>
            )}
          </div>
          <div className="col-md-6">
            <p>
              <strong>Data de Criação:</strong>{' '}
              {new Date(task.data_criacao).toLocaleDateString()} às{' '}
              {new Date(task.data_criacao).toLocaleTimeString()}
            </p>
            <p>
              <strong>Última Atualização:</strong>{' '}
              {new Date(task.data_atualizacao).toLocaleDateString()} às{' '}
              {new Date(task.data_atualizacao).toLocaleTimeString()}
            </p>
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="mt-3">
            <h6>Tags:</h6>
            {task.tags.map((tag) => (
              <span key={tag} className="badge bg-secondary me-1 mb-1">
                {tag}
              </span>
            ))}
          </div>
        )}

        {task.comentarios && task.comentarios.length > 0 && (
          <div className="mt-3">
            <h6>Comentários:</h6>
            <ul className="list-unstyled">
              {task.comentarios.map((comment: CommentForDisplay) => (
                <li
                  key={comment.id_comentario} // Usar o ID único do comentário
                  className="mb-2 p-2 bg-light border rounded"
                >
                  <p className="mb-0">
                    <strong>{getCommentAuthorName(comment.id_autor)}</strong>{' '}
                    {comment.data ? (
                      <small className="text-muted">
                        ({new Date(comment.data).toLocaleDateString()} às {new Date(comment.data).toLocaleTimeString()}):
                      </small>
                    ) : (
                      <small className="text-muted"> (Data não disponível):</small>
                    )}
                  </p>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{comment.comentario}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskViewModal;
