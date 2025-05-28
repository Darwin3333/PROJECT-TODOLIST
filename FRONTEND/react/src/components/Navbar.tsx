// src/components/Navbar.tsx
import { Link } from 'react-router-dom'; // Se estiver usando react-router-dom para navegação
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import type { User } from '../types/interfaces'; // Importe a interface de usuário

// Define as props para o Navbar
interface CustomNavbarProps {
  currentUser: User | null; // O usuário atualmente logado
  onLogin: (user: User) => void; // Função para simular o login
  onLogout: () => void; // Função para simular o logout
}

const CustomNavbar = ({ currentUser, onLogin, onLogout } : CustomNavbarProps) => {
  // Usuários de teste
  const testUsers: User[] = [
    { id: '1', username: 'Matheus', password: 'matheus' },
    { id: '2', username: 'Bruno', password: 'bruno' },
  ];

  // Função para simular o login, passando o objeto User completo
  const handleSelectUser = (selectedUser: User) => {
    onLogin(selectedUser);
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container>
        <Navbar.Brand as={Link} to="/">Gerenciador de Tarefas</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Listar Tarefas</Nav.Link>
            <Nav.Link as={Link} to="/adicionar-tarefa">Adicionar Tarefas</Nav.Link>
            <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            
          </Nav>
          <Nav>
            {currentUser ? (
              <NavDropdown title={`Olá, ${currentUser.username}`} id="basic-nav-dropdown" align="end">
                <NavDropdown.Item onClick={onLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <NavDropdown title="Login" id="basic-nav-dropdown" align="end">
                {/* Mapeia os usuários de teste e usa handleSelectUser */}
                {testUsers.map((user) => (
                  <NavDropdown.Item key={user.id} onClick={() => handleSelectUser(user)}>
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