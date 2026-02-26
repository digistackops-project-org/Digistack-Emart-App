import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ToastContainer } from 'react-toastify';

// Mocks
jest.mock('../services/cartApi', () => ({
  cartService: {
    getCart: jest.fn(),
    getCartSummary: jest.fn(),
    addItem: jest.fn(),
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
    clearCart: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const { cartService } = require('../services/cartApi');

// Import components after mocks
import Header from '../components/layout/Header';
import CartSidebar from '../components/cart/CartSidebar';
import Dashboard from '../components/home/Dashboard';

const mockCartSummary = { total_items: 3, total_price: 99.97 };
const mockCart = {
  user_id: 'user-123',
  items: [
    { item_id: 'i1', product_id: 'b1', product_name: 'Clean Code', category: 'books', price: 35.0, quantity: 1 },
    { item_id: 'i2', product_id: 'c1', product_name: 'React Course', category: 'courses', price: 49.99, quantity: 1 },
  ],
  total_items: 2,
  total_price: 84.99,
};

const renderWithRouter = (component) =>
  render(
    <MemoryRouter>
      {component}
      <ToastContainer />
    </MemoryRouter>
  );

// Set up localStorage with user data
beforeEach(() => {
  localStorage.setItem('emart_user', JSON.stringify({ name: 'John Doe', email: 'john@test.com' }));
  localStorage.setItem('emart_token', 'mock-jwt-token');
  jest.clearAllMocks();
  cartService.getCartSummary.mockResolvedValue({ data: { data: mockCartSummary } });
  cartService.getCart.mockResolvedValue({ data: { data: mockCart } });
});

afterEach(() => {
  localStorage.clear();
});

// ============================================================
// HEADER TESTS
// ============================================================
describe('Header Component', () => {
  it('renders the Emart logo', async () => {
    renderWithRouter(<Header />);
    expect(screen.getByText('Emart')).toBeInTheDocument();
  });

  it('displays username from localStorage', async () => {
    renderWithRouter(<Header />);
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });
  });

  it('displays user avatar with first letter of name', async () => {
    renderWithRouter(<Header />);
    await waitFor(() => {
      expect(screen.getByTestId('user-avatar')).toHaveTextContent('J');
    });
  });

  it('renders all 3 navigation buttons', async () => {
    renderWithRouter(<Header />);
    expect(screen.getByTestId('books-btn')).toBeInTheDocument();
    expect(screen.getByTestId('courses-btn')).toBeInTheDocument();
    expect(screen.getByTestId('software-btn')).toBeInTheDocument();
  });

  it('renders cart button', async () => {
    renderWithRouter(<Header />);
    expect(screen.getByTestId('cart-btn')).toBeInTheDocument();
  });

  it('shows cart badge with item count when cart has items', async () => {
    renderWithRouter(<Header />);
    await waitFor(() => {
      expect(screen.getByTestId('cart-badge')).toHaveTextContent('3');
    });
  });

  it('does NOT show badge when cart is empty', async () => {
    cartService.getCartSummary.mockResolvedValue({
      data: { data: { total_items: 0, total_price: 0 } },
    });
    renderWithRouter(<Header />);
    await waitFor(() => {
      expect(screen.queryByTestId('cart-badge')).not.toBeInTheDocument();
    });
  });

  it('renders logout button', () => {
    renderWithRouter(<Header />);
    expect(screen.getByTestId('logout-btn')).toBeInTheDocument();
  });
});

// ============================================================
// CART SIDEBAR TESTS
// ============================================================
describe('CartSidebar Component', () => {
  const onClose = jest.fn();
  const onCartUpdate = jest.fn();

  it('is hidden when isOpen is false', () => {
    renderWithRouter(<CartSidebar isOpen={false} onClose={onClose} onCartUpdate={onCartUpdate} />);
    expect(screen.queryByTestId('cart-overlay')).not.toBeInTheDocument();
    const sidebar = screen.getByTestId('cart-sidebar');
    expect(sidebar).not.toHaveClass('open');
  });

  it('shows cart items when open', async () => {
    await act(async () => {
      renderWithRouter(<CartSidebar isOpen={true} onClose={onClose} onCartUpdate={onCartUpdate} />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('cart-items')).toBeInTheDocument();
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
      expect(screen.getByText('React Course')).toBeInTheDocument();
    });
  });

  it('shows empty state when cart has no items', async () => {
    cartService.getCart.mockResolvedValue({
      data: { data: { items: [], total_items: 0, total_price: 0 } },
    });
    await act(async () => {
      renderWithRouter(<CartSidebar isOpen={true} onClose={onClose} onCartUpdate={onCartUpdate} />);
    });
    await waitFor(() => {
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
    });
  });

  it('calls onClose when overlay is clicked', async () => {
    await act(async () => {
      renderWithRouter(<CartSidebar isOpen={true} onClose={onClose} onCartUpdate={onCartUpdate} />);
    });
    await waitFor(() => screen.getByTestId('cart-overlay'));
    fireEvent.click(screen.getByTestId('cart-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('removes item when remove button is clicked', async () => {
    cartService.removeItem.mockResolvedValue({
      data: { data: { items: [], total_items: 0, total_price: 0 } },
    });
    await act(async () => {
      renderWithRouter(<CartSidebar isOpen={true} onClose={onClose} onCartUpdate={onCartUpdate} />);
    });
    await waitFor(() => screen.getByTestId('remove-item-i1'));
    fireEvent.click(screen.getByTestId('remove-item-i1'));
    await waitFor(() => {
      expect(cartService.removeItem).toHaveBeenCalledWith('i1');
    });
  });

  it('shows correct category badges', async () => {
    await act(async () => {
      renderWithRouter(<CartSidebar isOpen={true} onClose={onClose} onCartUpdate={onCartUpdate} />);
    });
    await waitFor(() => {
      expect(screen.getByText('books')).toBeInTheDocument();
      expect(screen.getByText('courses')).toBeInTheDocument();
    });
  });
});

// ============================================================
// DASHBOARD TESTS
// ============================================================
describe('Dashboard Component', () => {
  it('renders welcome message with username', async () => {
    renderWithRouter(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('welcome-heading')).toHaveTextContent('John Doe');
    });
  });

  it('renders all 3 service cards', async () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByTestId('service-card-books')).toBeInTheDocument();
    expect(screen.getByTestId('service-card-courses')).toBeInTheDocument();
    expect(screen.getByTestId('service-card-software')).toBeInTheDocument();
  });

  it('renders service card buttons', async () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByTestId('books-card-btn')).toHaveTextContent('Browse Books');
    expect(screen.getByTestId('courses-card-btn')).toHaveTextContent('Browse Courses');
    expect(screen.getByTestId('software-card-btn')).toHaveTextContent('Browse Software');
  });

  it('renders the header with all nav elements', async () => {
    renderWithRouter(<Dashboard />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('books-btn')).toBeInTheDocument();
    expect(screen.getByTestId('courses-btn')).toBeInTheDocument();
    expect(screen.getByTestId('software-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cart-btn')).toBeInTheDocument();
  });
});
