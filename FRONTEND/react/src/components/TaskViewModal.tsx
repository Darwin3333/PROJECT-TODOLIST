// src/components/TaskViewModal.tsx
import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import type { Task, CommentForDisplay, User } from '../types/interfaces';

interface TaskViewModalProps {
  show: boolean;
  task: Task | null;
  onHide: () => void;
  getUsernameById: (userId: string | undefined) => string;
  getStatusBadgeClass: (status: string) => string;
  currentUser: User | null;
  onPostNewComment: (taskId: string, commentText: string) => Promise<boolean>;
}

const TaskViewModal: React.FC<TaskViewModalProps> = ({
  show,
  task,
  onHide,
  getUsernameById,
  getStatusBadgeClass,
  currentUser,
  onPostNewComment,
}) => {
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] =
    useState<boolean>(false);

  useEffect(() => {
    if (show) {
      setNewCommentText('');
      setIsSubmittingComment(false);
    }
  }, [show, task]);

  if (!task) {
    return null;
  }

  const getCommentAuthorName = (authorId: string | undefined) =>
    getUsernameById(authorId);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !task) return;
    if (!currentUser) {
      alert('Você precisa estar autenticado para comentar.');
      return;
    }

    setIsSubmittingComment(true);
    const success = await onPostNewComment(task.id, newCommentText);
    setIsSubmittingComment(false);

    if (success) {
      setNewCommentText('');
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      backdrop={isSubmittingComment ? 'static' : true}
    >
      <Modal.Header closeButton={!isSubmittingComment}>
        <Modal.Title>{task.titulo}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>Descrição Completa:</strong>
        </p>
        <p style={{ whiteSpace: 'pre-wrap' }}>{task.descricao}</p>
        <hr />
        <div className="row mb-3">
          <div className="col-md-6">
            <p className="mb-1">
              <strong>Status:</strong>{' '}
              <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
              </span>
            </p>
            {task.user_id && (
              <p className="mb-1">
                <strong>Criado por:</strong> {getUsernameById(task.user_id)}
              </p>
            )}
          </div>
          <div className="col-md-6">
            <p className="mb-1">
              <strong>Data de Criação:</strong>{' '}
              {new Date(task.data_criacao).toLocaleDateString('pt-BR')} às{' '}
              {new Date(task.data_criacao).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="mb-0">
              <strong>Última Atualização:</strong>{' '}
              {new Date(task.data_atualizacao).toLocaleDateString('pt-BR')} às{' '}
              {new Date(task.data_atualizacao).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="mb-3">
            <h6>
              <i className="bi bi-tags-fill me-1"></i>Tags:
            </h6>
            {task.tags.map((tag) => (
              <span key={tag} className="badge bg-secondary me-1 mb-1 p-2">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mb-3">
          <h6>
            <i className="bi bi-chat-dots-fill me-1"></i>
            Comentários ({task.comentarios.length})
          </h6>
          {task.comentarios && task.comentarios.length > 0 ? (
            <ul
              className="list-unstyled mt-2"
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                paddingRight: '10px',
              }}
            >
              {task.comentarios.map((comment: CommentForDisplay) => (
                <li
                  key={comment.id_comentario}
                  className="mb-2 p-2 bg-light border rounded"
                >
                  <p className="mb-0">
                    <strong>{getCommentAuthorName(comment.id_autor)}</strong>{' '}
                    {comment.data ? (
                      <small className="text-muted">
                        ({new Date(comment.data).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(comment.data).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        ):
                      </small>
                    ) : (
                      <small className="text-muted">
                        {' '}
                        (Data não disponível):
                      </small>
                    )}
                  </p>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {comment.comentario}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted small fst-italic">
              Nenhum comentário ainda.
            </p>
          )}
        </div>

        <hr />

        {currentUser && (
          <div className="mt-3">
            <h6>
              <i className="bi bi-chat-plus-fill me-1"></i>Adicionar um
              comentário
            </h6>
            <Form onSubmit={handleCommentSubmit}>
              <Form.Group className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder={`Comentar como ${currentUser.username}...`}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  required
                  disabled={isSubmittingComment}
                />
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                disabled={isSubmittingComment || !newCommentText.trim()}
              >
                {isSubmittingComment ? (
                  <>
                    {' '}
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                    ></span>{' '}
                    Enviando...{' '}
                  </>
                ) : (
                  <>
                    {' '}
                    <i className="bi bi-send-fill me-1"></i> Enviar Comentário{' '}
                  </>
                )}
              </Button>
            </Form>
          </div>
        )}
        {!currentUser && (
          <p className="text-muted small mt-3 fst-italic">
            Você precisa estar autenticado para adicionar comentários.
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={isSubmittingComment}
        >
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TaskViewModal;
