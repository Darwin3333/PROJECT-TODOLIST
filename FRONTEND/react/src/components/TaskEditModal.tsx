// src/components/TaskEditModal.tsx
import Modal from 'react-bootstrap/Modal';
import TaskForm from './TaskForm'; // Importa o TaskForm que já criamos/temos
import type { Task, User } from '../types/interfaces'; // Ajuste o caminho se necessário

interface TaskEditModalProps {
  show: boolean;
  taskToEdit: Task | null;
  onHide: () => void;
  onTaskUpdated: () => void; // Callback para quando a tarefa for atualizada com sucesso
  currentUser: User | null; // Necessário para o TaskForm
}

const TaskEditModal = ({show, taskToEdit, onHide, onTaskUpdated, currentUser} : TaskEditModalProps) => {
  if (!taskToEdit) {
    return null; // Não renderiza nada se não houver tarefa para editar
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        {/* O título "Editar Tarefa" já é renderizado dentro do TaskForm */}
        {/* Se preferir um título fixo aqui, pode adicionar: <Modal.Title>Editar Tarefa</Modal.Title> */}
      </Modal.Header>
      <Modal.Body>
        <TaskForm
          taskToEdit={taskToEdit}
          onTaskUpdated={onTaskUpdated} // Passa o callback para o TaskForm
          onClose={onHide} // Passa a função de fechar para o TaskForm (para o botão Cancelar)
          currentUser={currentUser}
        />
      </Modal.Body>
      {/* O TaskForm já tem seus próprios botões de "Salvar Alterações" e "Cancelar".
        Portanto, geralmente não precisamos de um Modal.Footer com botões aqui,
        a menos que você queira uma estrutura de botões diferente especificamente para o modal.
      */}
      {/* <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar (Alternativo)
        </Button>
      </Modal.Footer> */}
    </Modal>
  );
};

export default TaskEditModal;
