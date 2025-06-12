// src/components/TaskEditModal.tsx
import Modal from 'react-bootstrap/Modal';
import TaskForm from './TaskForm';
import type { Task, User } from '../types/interfaces';

interface TaskEditModalProps {
  show: boolean;
  taskToEdit: Task | null;
  onHide: () => void;
  onTaskUpdated: () => void;
  currentUser: User | null;
}

const TaskEditModal = ({
  show,
  taskToEdit,
  onHide,
  onTaskUpdated,
  currentUser,
}: TaskEditModalProps) => {
  if (!taskToEdit) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton></Modal.Header>
      <Modal.Body>
        <TaskForm
          taskToEdit={taskToEdit}
          onTaskUpdated={onTaskUpdated}
          onClose={onHide}
          currentUser={currentUser}
        />
      </Modal.Body>
    </Modal>
  );
};

export default TaskEditModal;
