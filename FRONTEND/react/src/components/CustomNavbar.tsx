// src/components/CustomNavbar.tsx
import { Link } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import type { User } from '../types/interfaces'; // Importa a interface User ATUALIZADA

interface CustomNavbarProps {
  currentUser: User | null;
  onLogin: (user: User) => void;
  onLogout: () => void;
}

const CustomNavbar = ({ currentUser, onLogin, onLogout } : CustomNavbarProps) => {
  // Usuários de teste ATUALIZADOS para a nova interface User
  // Usando UUIDs placeholder para id_user.
  // Em um cenário real, esses IDs viriam do backend após o cadastro dos usuários.
  // O campo 'password' não faz parte do objeto User que é armazenado no estado do frontend.
  // A data_criacao é opcional na interface User; adicione se for usá-la aqui.
  const testUsers: User[] = [
  { id_user: 'a1b9f8e7-5c3d-4e2a-8f6b-9c1d0a7e4f2a', username: 'Matheus' },
  { id_user: 'c3d8e2f1-9a7b-4d6c-8a1e-0f5b3c9d7e4b', username: 'Bruno' },
  ];


  const handleSelectUser = (selectedUser: User) => {
    // selectedUser já está no formato correto da nova interface User
    onLogin(selectedUser);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <i className="bi bi-check2-square me-2"></i> {/* Ícone Opcional */}
          Gerenciador de Tarefas
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              <i className="bi bi-list-task me-1"></i> {/* Ícone Opcional */}
              Listar Tarefas
            </Nav.Link>
            {currentUser && ( // Mostra "Adicionar Tarefas" e "Dashboard" apenas se logado
              <>
                <Nav.Link as={Link} to="/adicionar-tarefa">
                  <i className="bi bi-plus-circle me-1"></i> {/* Ícone Opcional */}
                  Adicionar Tarefa
                </Nav.Link>
                <Nav.Link as={Link} to="/dashboard">
                  <i className="bi bi-bar-chart-line me-1"></i> {/* Ícone Opcional */}
                  Dashboard
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {currentUser ? (
              <NavDropdown 
                title={
                  <>
                    <i className="bi bi-person-circle me-1"></i> {/* Ícone Opcional */}
                    Olá, {currentUser.username}
                  </>
                } 
                id="user-nav-dropdown" 
                align="end"
              >
                <NavDropdown.Item onClick={onLogout}>
                  <i className="bi bi-box-arrow-right me-2"></i> {/* Ícone Opcional */}
                  Logout
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              <NavDropdown 
                title={
                  <>
                    <i className="bi bi-box-arrow-in-right me-1"></i> {/* Ícone Opcional */}
                    Login (Teste)
                  </>
                } 
                id="login-nav-dropdown" 
                align="end"
              >
                {testUsers.map((user) => (
                  <NavDropdown.Item key={user.id_user} onClick={() => handleSelectUser(user)}>
                    Entrar como {user.username}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default CustomNavbar;