export interface CommentPayload {
  autor: string;
  comentario: string;
  data?: string; // A data será gerada no backend, mas o modelo a espera
}

export interface TaskPayload {
  titulo: string;
  descricao: string;
  status: 'pendente' | 'em andamento' | 'concluída';
  tags: string[];
  comentarios: CommentPayload[];
  user_id?: string
  
}

export interface Task extends TaskPayload {
    id: string;
    data_criacao: string;
    data_atualizacao?: string;

}


export interface TagInputProps {
  tags: string[]; // Um array das tags atuais
  onAddTag: (tag: string) => void; // Função para adicionar uma nova tag
  onRemoveTag: (tag: string) => void; // Função para remover uma tag existente
}

export interface CommentInputProps {
  comments: CommentPayload[]; // Um array dos comentários atuais
  onAddComment: (comment: CommentPayload) => void; // Função para adicionar um novo comentário
  onRemoveComment: (index: number) => void; // Função para remover um comentário por índice
}

// Nova interface para o usuário
export interface User {
    id: string;
    username: string;
    password: string
}